<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '@/components/business/AppSidebar.vue'
import AppTopbar from '@/components/business/AppTopbar.vue'
import ToastLayer from '@/components/business/ToastLayer.vue'
import { useAppStore } from '@/stores/app'
import type { ModuleName } from '@/types/ui'

const route = useRoute()
const appStore = useAppStore()

// 登录页要整屏，不套侧栏 + 顶栏外壳
const isBlankLayout = computed<boolean>(() => route.meta.layout === 'blank')
const pageTitle = computed<string>(() => route.meta.title ?? '')
const viewPath = computed<string>(() => route.meta.viewPath ?? '')
const activeModule = computed<ModuleName | null>(() => route.meta.module ?? null)
const isPadded = computed<boolean>(() => route.meta.padded === true)

watchEffect(() => {
  document.documentElement.dataset.theme = appStore.theme
})
</script>

<template>
  <RouterView v-if="isBlankLayout" />
  <div v-else class="shell">
    <AppSidebar />
    <div class="main">
      <AppTopbar :title="pageTitle" :view-path="viewPath" :module="activeModule" />
      <main class="page" :class="{ 'page--padded': isPadded }">
        <RouterView />
      </main>
    </div>
  </div>
  <ToastLayer />
</template>
