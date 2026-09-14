import { createRouter, createWebHistory } from 'vue-router'
import { applyAuthGuards, applyUnauthorizedRedirect } from '@/router/guards'
import { routes } from '@/router/routes'

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

applyAuthGuards(router)
// 进入路由时靠 beforeEach，停留期间 token 被服务端拒掉靠 401 上报，两者共同保证「没有登录态就回到登录页」
applyUnauthorizedRedirect(router)

const appTitle = process.env.VUE_APP_TITLE || '个人 AI 工作台'

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${appTitle}` : appTitle
})

export default router
