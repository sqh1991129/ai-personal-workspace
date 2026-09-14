import { USER_LOGIN_PATH } from '@/api/auth'
import { setUnauthorizedHandler } from '@/api/http'
import { HOME_ROUTE_NAME, LOGIN_ROUTE_NAME } from '@/constants/auth'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import type { Router } from 'vue-router'

/**
 * 登录守卫：未登录访问受保护路由 → 跳登录页并带 redirect；已登录访问登录页 → 回首页。
 * 在守卫内部取 store：pinia 在 main.ts 里先于 router 安装，模块顶层取会拿到未激活的实例。
 */
export function applyAuthGuards(router: Router): void {
  router.beforeEach((to) => {
    const authStore = useAuthStore()
    // 过期判断不能放进 getter：computed 会把 Date.now() 的结果缓存住
    authStore.pruneExpiredSession()

    if (to.meta.requiresAuth === true && !authStore.isAuthenticated) {
      return { name: LOGIN_ROUTE_NAME, query: { redirect: to.fullPath } }
    }
    if (to.name === LOGIN_ROUTE_NAME && authStore.isAuthenticated) {
      return { name: HOME_ROUTE_NAME }
    }
    return true
  })
}

/** 会话被服务端判失效时的提示，和「未登录」的登录页文案区分开 */
export const SESSION_EXPIRED_MESSAGE = '登录状态已失效，请重新登录'

/**
 * 401 的兜底跳转。beforeEach 只在「进入路由」时校验登录态，token 在页面停留期间被服务端拒掉时
 * 没有任何东西会把用户带回登录页，他只会反复看到报错。这里接住请求层上报的 401：
 * 清本地会话（连带清 Bearer）→ 提示一句 → 跳 /login 并带上当前地址，登录后原样回跳。
 *
 * 登录端点自身的 401 不算会话失效：那是「用户名或密码错误」，归登录表单的错误提示。
 */
export function applyUnauthorizedRedirect(router: Router): void {
  // 一个页面里可能并发多个请求同时 401，只让第一个负责跳转与提示
  let isHandling = false

  setUnauthorizedHandler((context) => {
    if (context.url.includes(USER_LOGIN_PATH)) {
      return
    }
    const authStore = useAuthStore()
    authStore.clearSession()

    const current = router.currentRoute.value
    if (isHandling || current.name === LOGIN_ROUTE_NAME) {
      return
    }
    isHandling = true
    useToastStore().notify(SESSION_EXPIRED_MESSAGE)
    void router
      .replace({ name: LOGIN_ROUTE_NAME, query: { redirect: current.fullPath } })
      .finally(() => {
        isHandling = false
      })
  })
}
