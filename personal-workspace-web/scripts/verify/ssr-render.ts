/**
 * 真实组件 SSR 渲染核对：用真实 App.vue / 路由 / store 渲染五张页面，
 * 只断言结构与「没有插值残留」，不做像素级比对。
 */
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '@/App.vue'
import { routes } from '@/router/routes'
import { applyAuthGuards } from '@/router/guards'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import { installDomShim } from './dom-shim.mjs'
import { eq, finish, ok } from './assert.mjs'
import type { Pinia } from 'pinia'
import type { AuthSession } from '@/types/auth'

const isMockEnv = process.env.VUE_APP_MOCK_AUTH === 'true'
async function render(path: string, authenticated: boolean, seed?: (pinia: Pinia) => Promise<void> | void): Promise<string> {
  installDomShim()
  const pinia = createPinia()
  setActivePinia(pinia)
  // 每次渲染都是全新 pinia，要造数据必须在同一次 render 内 seed，否则改动会落到上一个实例上
  if (seed) {
    await seed(pinia)
  }
  const router = createRouter({ history: createMemoryHistory(), routes })
  applyAuthGuards(router)
  if (authenticated) {
    const issuedAt = Date.now()
    const session: AuthSession = {
      token: 'server.jwt.value',
      issuedAt,
      expiresAt: issuedAt + 30 * 60 * 1000,
      user: { id: '7', username: 'admin@example.com', displayName: 'quanhu', roles: [] }
    }
    useAuthStore(pinia).startSession(session, false)
  }
  const app = createSSRApp(App)
  app.use(pinia).use(router)
  await router.push(path).catch(() => undefined)
  await router.isReady()
  // 抽屉等 <Teleport> 内容不进主字符串，会被 server-renderer 收进 ctx.teleports
  const ctx: { teleports?: Record<string, string> } = {}
  const html = await renderToString(app, ctx)
  return html + Object.values(ctx.teleports ?? {}).join('')
}

/** 插值没被求值、或对象被 String() 掉时最常见的四种残留 */
function assertNoGarbage(name: string, html: string): void {
  for (const marker of ['{{', '[object Object]', 'undefined', 'NaN']) {
    ok(`${name} 无「${marker}」残留`, !html.includes(marker))
  }
}

async function main(): Promise<void> {
  // —— 登录页 ——
  const login = await render('/login', false)
  ok('登录页渲染登录卡片', login.includes('登录工作台'))
  ok('登录页有用户名/密码输入', login.includes('autocomplete="username"') && login.includes('type="password"'))
  ok('未登录时不渲染外壳', !login.includes('sidebar__nav'))
  ok('左侧是插画', login.includes('login-hero') && login.includes('viewBox="0 0 560 424"'))
  ok('插画带无障碍描述', login.includes('个人 AI 工作台示意图'))
  ok('不再出现原标语与卖点卡', !login.includes('收进同一个工作台') && !login.includes('login__slogan') && !login.includes('login__highlights'))
  ok('插画为纯图形（无 text 节点）', !/login-hero[\s\S]*?<text/.test(login))
  eq('演示账号提示只在 mock 模式出现', login.includes('login-form__mock'), isMockEnv)
  eq('用户名占位符跟随模式（真接口模式下不写死 admin）', login.includes('placeholder="admin"'), isMockEnv)
  ok('页脚按模式说明请求去向',
    isMockEnv ? login.includes('演示模式下把') : login.includes('/api/v1/users/userLogin'))
  assertNoGarbage('登录页', login)

  // —— 总览 ——
  const home = await render('/', true)
  ok('外壳渲染侧栏与顶栏', home.includes('sidebar__nav') && home.includes('topbar__title'))
  ok('侧栏含模块导航', home.includes('nav-item__text'))
  ok('总览有提问框', home.includes('ov__hero') && home.includes('askbox__row'))
  ok('总览不再用示例提示词占满快捷入口', !home.includes('ov__quick') && !home.includes('生成检查清单'))
  ok('总览有后端连通性卡片', home.includes('status-pill') && home.includes('目标地址'))
  ok('连通性卡片检测按钮与状态标记位在位', home.includes('发起检测') && home.includes('health__note'))
  ok('连通性卡片不再回显后端响应原文', !home.includes('后端已响应'))
  ok('总览有后端接口对接进度卡', home.includes('后端接口对接进度') && home.includes('api-table'))
  ok('对接进度卡里列出具体端点', home.includes('GET /api/v1/chat/sessions') && home.includes('POST /api/v1/chat/streamChat'))
  ok('总览不再出现无来源的假指标与假待办',
    !home.includes('stat__value') && !home.includes('本地模型') && !home.includes('平均首字延迟') &&
    !home.includes('今日 token') && !home.includes('今日待办') && !home.includes('向量模型'))
  ok('总览有模块入口', home.includes('sitemap__item'))
  ok('侧栏底部显示当前用户', home.includes('quanhu'))
  assertNoGarbage('总览页', home)

  // —— 对话（造一条含各类块的消息，覆盖行内标记 / 代码块 / 引用 / 思考 / 失败 / 停止）——
  const chat = await render('/chat', true)
  ok('对话三栏骨架', chat.includes('rail__head') && chat.includes('thread__scroll') && chat.includes('panel__head'))
  ok('对话输入区', chat.includes('composer__box') && chat.includes('composer__tools'))
  ok('参数面板骨架', chat.includes('panel__section') && chat.includes('panel__head'))
  ok('标注 streamChat 已对接与能力缺口', chat.includes('对话已对接后端 POST /api/v1/chat/streamChat'))
  ok('不出现「演示数据」角标与示例横幅', !chat.includes('演示数据') && !chat.includes('rail__mock'))
  ok('不出现原型里的假模型名与假上下文窗口', !chat.includes('WS-14B') && !chat.includes('32k') && !chat.includes('bge-'))
  ok('不出现内置示例会话与提示卡片', !chat.includes('架构决策库') && !chat.includes('整理提交前检查清单'))
  ok('温度只作为本地设置展示', chat.includes('温度 0.7（本地）'))
  ok('参数面板标注不下发后端', chat.includes('参数不下发后端') && chat.includes('以下参数只保存在前端'))
  ok('输入区提示只发送文本', chat.includes('后端只接收问题文本'))
  ok('知识来源为空时点名端点而不是勾默认库', chat.includes('后端尚未提供知识库列表（GET /api/kb）'))
  const chatWithoutApi = await render('/chat', true, (pinia) => {
    const store = useChatStore(pinia)
    store.sessions = []
    store.listError = '后端未实现 GET /api/v1/chat/sessions，该功能待对接'
  })
  ok('会话列表拉不到时点名端点', chatWithoutApi.includes('后端未实现 GET /api/v1/chat/sessions'))
  const chatWithContent = await render('/chat', true, (pinia) => {
    const store = useChatStore(pinia)
    store.pushUserMessage('生成中光标 **加粗** 与 `code` 怎么渲染？')
    store.beginAssistantMessage()
    const id = String(store.streamingMessageId)
    store.setThink(id, { seconds: 2.4, text: '先确认请求层约定 → 给出 SSE 方案。' })
    store.pushBlock(id, { kind: 'paragraph', text: '结论：用 SSE（`text/event-stream`）。' })
    store.pushBlock(id, { kind: 'heading', text: '接口约定' })
    store.pushBlock(id, { kind: 'list', ordered: false, items: ['**生成中**：正文尾部保留光标 `▍`。'] })
    store.pushBlock(id, { kind: 'code', language: 'TYPESCRIPT', filename: 'src/api/chat.ts', code: 'onScopeDispose(() => controller.abort())' })
    store.setCitations(id, [{ doc: 'ADR-001 采用 Vue CLI 5 而非 Vite', locator: '第 4 片' }])
  })
  ok('历史消息渲染出气泡', chatWithContent.includes('thread__inner'))
  ok('代码块渲染出文件名', chatWithContent.includes('src/api/chat.ts'))
  ok('引用来源渲染', chatWithContent.includes('ADR-001'))
  ok('思考过程渲染', chatWithContent.includes('先确认请求层约定'))
  assertNoGarbage('对话页（含内容）', chatWithContent)

  // —— 知识库 ——
  const kb = await render('/knowledge', true)
  ok('知识库两栏骨架', kb.includes('rail__head') && kb.includes('table__head'))
  ok('召回测试区', kb.includes('recall__head'))
  ok('知识库头部', kb.includes('kb-head__top'))

  ok('隐藏索引服务假指标', !kb.includes('index-card__row'))
  ok('索引指标标注待后端', kb.includes('待后端提供'))
  ok('库列表为空时点名端点', kb.includes('后端尚未提供知识库列表（GET /api/kb）'))
  ok('检索结论标注为待对接', kb.includes('检索待对接'))
  ok('对话可引用标注为待对接', kb.includes('待对接</b>'))
  const kbFailed = await render('/knowledge', true, (pinia) => {
    const store = useKnowledgeStore(pinia)
    store.listError = '后端未实现 GET /api/kb，该功能待对接'
  })
  ok('知识库拉不到时点名端点', kbFailed.includes('后端未实现 GET /api/kb'))
  assertNoGarbage('知识库页（待对接态）', kbFailed)
  // 抽屉内容只能靠测试内联的 fixture 渲染（应用代码里已经没有示例文档了）
  const kbWithDrawer = await render('/knowledge', true, (pinia) => {
    const store = useKnowledgeStore(pinia)
    store.libraries = [{ id: 'kb-fixture', name: '渲染核对库', description: '仅用于本核对脚本', documentCount: 1, chunkCount: 2, status: 'ready' }]
    store.activeKbId = 'kb-fixture'
    store.documentsByKb = {
      'kb-fixture': [{
        id: 'doc-fixture',
        name: 'ADR-001 采用 Vue CLI 5 而非 Vite',
        type: 'MD',
        sizeLabel: '12 KB',
        chunkCount: 2,
        status: 'ready',
        updatedAtLabel: '刚刚',
        embeddingModel: 'fixture-embedding'
      }]
    }
    store.activeDocumentId = 'doc-fixture'
    store.activeDocumentChunks = [{ index: 1, totalChunks: 2, rangeLabel: '1–812', hitRate: 0.42, text: '请求层只经 src/api/http.ts 出口。' }]
  })
  ok('分片抽屉打开（Teleport 内容带 is-open）', kbWithDrawer.includes('is-open'))
  ok('抽屉标题是所选文档', kbWithDrawer.includes('ADR-001'))
  ok('向量模型显示后端字段', kbWithDrawer.includes('fixture-embedding'))
  ok('抽屉里出现分片信息', kbWithDrawer.includes('1–812'))
  ok('不再出现编造的分片参数与向量维度', !kbWithDrawer.includes('512/64') && !kbWithDrawer.includes('1024'))
  ok('被引用次数无来源时显示占位符', kbWithDrawer.includes('— 次 / —'))
  assertNoGarbage('知识库页（含抽屉）', kbWithDrawer)

  // —— 404 在外壳内 ——
  const notFound = await render('/definitely-not-a-route', true)
  ok('404 渲染在外壳内', notFound.includes('not-found__code') && notFound.includes('sidebar__nav'))
  assertNoGarbage('404 页', notFound)

  finish(`ssr-render(auth=${isMockEnv ? 'demo-login' : 'real'})`)
}

void main()
