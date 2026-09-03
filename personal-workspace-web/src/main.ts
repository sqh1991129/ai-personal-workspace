import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import '@/styles/global.css'
// 通用组件层与模块层由 demo 原型逐字移植，组件只需渲染对应 DOM；
// 组件专属样式仍写在各 SFC 的 <style scoped> 里（见 AGENTS.md）。
import '@/styles/primitives.css'
import '@/styles/modules.css'

createApp(App)
  .use(createPinia())
  .use(router)
  .mount('#app')
