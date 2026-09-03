import HomeView from '@/views/HomeView.vue'
import { HOME_ROUTE_NAME, LOGIN_ROUTE_NAME, LOGIN_ROUTE_PATH } from '@/constants/auth'
import type { RouteRecordRaw } from 'vue-router'
import type { ModuleName } from '@/types/ui'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    /** 未登录访问受保护路由时跳登录页；默认不要求登录（目前仅登录页自身） */
    requiresAuth?: boolean
    /** blank = 不套 App.vue 的外壳（侧栏 + 顶栏），登录页需要整屏 */
    layout?: 'shell' | 'blank'
    /** 顶栏副标题展示的视图路径，与原型 topbar__title p 对齐 */
    viewPath?: string
    /** 该页所属模块，决定 .module[data-module] 与列数开关；缺省则顶栏不显示切换 */
    module?: ModuleName
    /** 内容区是否加内边距（总览加，满屏模块不加） */
    padded?: boolean
  }
}

// 拆成独立模块：路由表与守卫都不依赖 history 实例，便于在无浏览器环境下按真实配置校验。
export const routes: RouteRecordRaw[] = [
  {
    path: LOGIN_ROUTE_PATH,
    name: LOGIN_ROUTE_NAME,
    component: () => import('@/views/LoginView.vue'),
    meta: { title: '登录', layout: 'blank' }
  },
  {
    path: '/',
    name: HOME_ROUTE_NAME,
    component: HomeView,
    meta: { title: '工作台', requiresAuth: true, viewPath: 'views/HomeView.vue', module: 'home', padded: true }
  },
  {
    path: '/chat',
    name: 'chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { title: '对话', requiresAuth: true, viewPath: 'views/ChatView.vue', module: 'chat' }
  },
  {
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('@/views/KnowledgeView.vue'),
    meta: { title: '知识库', requiresAuth: true, viewPath: 'views/KnowledgeView.vue', module: 'knowledge' }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    // 未登录时不暴露路由是否存在，统一先过登录页
    meta: { title: '页面不存在', requiresAuth: true, viewPath: 'views/NotFoundView.vue', padded: true }
  }
]
