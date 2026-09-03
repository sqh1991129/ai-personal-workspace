import { HOME_ROUTE_NAME, LOGIN_ROUTE_NAME } from '@/constants/auth'
import { useAuthStore } from '@/stores/auth'
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
