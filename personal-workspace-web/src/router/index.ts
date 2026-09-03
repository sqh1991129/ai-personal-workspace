import { createRouter, createWebHistory } from 'vue-router'
import { applyAuthGuards } from '@/router/guards'
import { routes } from '@/router/routes'

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

applyAuthGuards(router)

const appTitle = process.env.VUE_APP_TITLE || '个人 AI 工作台'

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${appTitle}` : appTitle
})

export default router
