import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { title: '工作台' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: '页面不存在' }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

const appTitle = process.env.VUE_APP_TITLE || '个人 AI 工作台'

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${appTitle}` : appTitle
})

export default router
