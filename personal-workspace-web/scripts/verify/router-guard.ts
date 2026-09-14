/**
 * 路由表与登录守卫核对：真实 routes + 真实 guards + 真实 auth store，跑在 memory history 上。
 * 额外覆盖「expiresAt 来自 JWT exp」后的过期清理行为，以及请求层 401 上报后的清态 + 跳登录页。
 */
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { login } from '@/api/auth'
import http from '@/api/http'
import { checkHealth } from '@/api/workspace'
import { routes } from '@/router/routes'
import { applyAuthGuards, applyUnauthorizedRedirect, SESSION_EXPIRED_MESSAGE } from '@/router/guards'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { resolveSafeRedirect } from '@/utils/redirect'
import { installDomShim } from './dom-shim.mjs'
import { eq, finish, ok } from './assert.mjs'
import type { AuthSession } from '@/types/auth'

function session(ttlMs: number, token = 'server.jwt.value'): AuthSession {
  const issuedAt = Date.now()
  return {
    token,
    issuedAt,
    expiresAt: ttlMs === 0 ? null : issuedAt + ttlMs,
    user: { id: '7', username: 'admin@example.com', displayName: 'admin@example.com', roles: [] }
  }
}

/** 让真实请求层跑起来但绝不碰网络：所有响应都是 401。 */
function installAlways401Adapter(): void {
  const raw = http as unknown as { defaults: { adapter: (config: Record<string, unknown>) => Promise<unknown> } }
  raw.defaults.adapter = async (config) => {
    const error = new Error('Request failed with status code 401') as Error & Record<string, unknown>
    error.isAxiosError = true
    error.config = config
    error.response = { status: 401, data: { code: 401, message: '令牌已过期' }, headers: {}, config }
    throw error
  }
}

/** 跳转是异步的，让出一个宏任务等导航与守卫跑完。 */
async function settle(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
}

async function main(): Promise<void> {
  const { storage } = installDomShim()
  setActivePinia(createPinia())
  const router = createRouter({ history: createMemoryHistory(), routes })
  applyAuthGuards(router)
  const authStore = useAuthStore()

  const table = router.getRoutes()
  eq('路由条数', table.length, 5)
  eq('登录页为 blank 布局', table.find((r) => r.name === 'login')?.meta.layout, 'blank')
  eq('外壳页不声明 blank', table.find((r) => r.name === 'chat')?.meta.layout, undefined)
  eq('总览带 module 供顶栏取布局', table.find((r) => r.name === 'home')?.meta.module, 'home')
  eq('对话 module', table.find((r) => r.name === 'chat')?.meta.module, 'chat')
  eq('知识库 module', table.find((r) => r.name === 'knowledge')?.meta.module, 'knowledge')
  eq('总览内容区加边距', table.find((r) => r.name === 'home')?.meta.padded, true)
  eq('对话内容区不加边距', table.find((r) => r.name === 'chat')?.meta.padded, undefined)
  eq('404 也要登录', table.find((r) => r.name === 'not-found')?.meta.requiresAuth, true)

  for (const [path, expected] of [
    ['/', '/login?redirect=/'],
    ['/chat', '/login?redirect=/chat'],
    ['/knowledge', '/login?redirect=/knowledge'],
    ['/whatever', '/login?redirect=/whatever']
  ] as Array<[string, string]>) {
    await router.push(path)
    eq(`未登录访问 ${path} 跳登录页并带 redirect`, router.currentRoute.value.fullPath, expected)
  }

  authStore.startSession(session(60_000), false)
  eq('登录态建立', authStore.isAuthenticated, true)
  await router.push('/login')
  eq('已登录访问登录页回首页', router.currentRoute.value.path, '/')
  await router.push('/chat')
  eq('已登录可进对话', router.currentRoute.value.path, '/chat')
  await router.push('/knowledge')
  eq('已登录可进知识库', router.currentRoute.value.path, '/knowledge')
  eq('未勾选记住我 → 不落本地存储', storage.has('workspace.session'), false)

  // 真后端签发的 JWT 有效期：未勾选记住我时只活在内存里
  authStore.startSession(session(30 * 60 * 1000), true)
  eq('勾选记住我 → 落本地存储', storage.has('workspace.session'), true)
  eq('存进去的就是服务端 token', JSON.parse(String(storage.get('workspace.session'))).token, 'server.jwt.value')

  // JWT 已过期（后端 exp 30 分钟）→ 本地要踢掉，不能带着死 token 进页面
  authStore.startSession(session(-1000), true)
  await router.push('/chat')
  eq('会话过期后被踢回登录页', router.currentRoute.value.fullPath, '/login?redirect=/chat')
  eq('过期会话已清理', useAuthStore().isAuthenticated, false)
  eq('记住我的过期数据已从本地清除', storage.has('workspace.session'), false)

  // expiresAt 为 null（后端换了不透明 token，读不到 exp）→ 本地不判过期
  authStore.startSession(session(0), 'opaque-token')
  await router.push('/chat')
  eq('无有效期时会话保持可用', router.currentRoute.value.path, '/chat')
  ok('无有效期时不被误判过期', authStore.isAuthenticated)

  authStore.clearSession()
  // 换一个未访问过的路径：重复导航会被 vue-router 直接短路，守卫不会重跑
  await router.push('/knowledge')
  eq('登出后重新被拦', router.currentRoute.value.fullPath, '/login?redirect=/knowledge')

  // —— 会话在服务端失效（请求回 401）：清态 + 提示 + 跳登录页 ——
  installAlways401Adapter()
  applyUnauthorizedRedirect(router)
  const toastStore = useToastStore()

  authStore.startSession(session(60_000), true)
  await router.push('/chat')
  eq('装配 401 处理后仍能进受保护页', router.currentRoute.value.path, '/chat')
  await checkHealth().catch(() => undefined)
  await settle()
  eq('401 后内存会话已清空', authStore.isAuthenticated, false)
  eq('记住我的本地会话已清除', storage.has('workspace.session'), false)
  eq('401 后回到登录页并带 redirect', router.currentRoute.value.fullPath, '/login?redirect=/chat')
  eq('提示一条会话失效', toastStore.items.map((item) => item.message), [SESSION_EXPIRED_MESSAGE])

  // 已在登录页时重复 401：不再重复跳转，也不堆提示
  await checkHealth().catch(() => undefined)
  await settle()
  eq('重复 401 不叠加提示', toastStore.items.length, 1)
  eq('重复 401 仍停在登录页', router.currentRoute.value.path, '/login')

  // 登录端点的 401 属于「口令错误」，交给表单，不能当成会话失效
  authStore.startSession(session(60_000), false)
  await router.push('/knowledge')
  await login({ username: 'admin@example.com', password: 'bad', remember: false }).catch(() => undefined)
  await settle()
  eq('登录端点的 401 不清会话', authStore.isAuthenticated, true)
  eq('登录端点的 401 不跳转', router.currentRoute.value.path, '/knowledge')
  eq('登录端点的 401 不提示会话失效', toastStore.items.length, 1)

  eq('回跳白名单：站内路径放行', resolveSafeRedirect('/knowledge'), '/knowledge')
  eq('回跳白名单：协议相对地址拦截', resolveSafeRedirect('//evil.com'), '/')
  eq('回跳白名单：反斜杠变体拦截', resolveSafeRedirect('/\\evil.com'), '/')
  eq('回跳白名单：绝对 URL 拦截', resolveSafeRedirect('https://evil.com/x'), '/')
  eq('回跳白名单：登录页自身拦截', resolveSafeRedirect('/login?redirect=/chat'), '/')
  eq('回跳白名单：非字符串兜底', resolveSafeRedirect(undefined), '/')

  finish('router-guard')
}

void main()
