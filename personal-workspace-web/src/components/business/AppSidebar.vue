<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/base/AppIcon.vue'
import UserMenu from '@/components/business/UserMenu.vue'
import { APP_MARK } from '@/constants/app'
import { useAppStore } from '@/stores/app'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { IconName } from '@/constants/icons'
import type { RouteRecordName } from 'vue-router'

interface NavEntry {
  routeName: RouteRecordName
  icon: IconName
  label: string
  count?: number
}

// 占位入口：原型里标注「本原型未包含，仅占位」，这里保持同样的不可点击语义（span + title）。
const SOON_ENTRIES: Array<{ icon: IconName; label: string; note: string }> = [
  { icon: 'task', label: '任务自动化', note: '规划中，当前版本未包含' },
  { icon: 'settings', label: '设置', note: '规划中，当前版本未包含' }
]

const appTitle: string = process.env.VUE_APP_TITLE || '个人 AI 工作台'

const route = useRoute()
const appStore = useAppStore()
const chatStore = useChatStore()
const knowledgeStore = useKnowledgeStore()

// 计数只在数据已加载时出现，避免首屏闪一个假的 0
const navEntries = computed<NavEntry[]>(() => [
  { routeName: 'home', icon: 'grid', label: '总览' },
  { routeName: 'chat', icon: 'chat', label: '对话', count: chatStore.sessions.length || undefined },
  { routeName: 'knowledge', icon: 'book', label: '知识库', count: knowledgeStore.libraries.length || undefined }
])

function isActive(name: RouteRecordName): boolean {
  return route.name === name
}
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': appStore.sidebarCollapsed }">
    <RouterLink class="sidebar__brand" :to="{ name: 'home' }">
      <span class="sidebar__mark">{{ APP_MARK }}</span>
      <span>{{ appTitle }}</span>
    </RouterLink>
    <nav class="sidebar__nav" aria-label="主导航">
      <RouterLink
        v-for="entry in navEntries"
        :key="String(entry.routeName)"
        class="nav-item"
        :class="{ 'is-active': isActive(entry.routeName) }"
        :to="{ name: entry.routeName }"
        :aria-current="isActive(entry.routeName) ? 'page' : undefined"
      >
        <AppIcon :name="entry.icon" />
        <span class="nav-item__text">{{ entry.label }}</span>
        <span v-if="entry.count" class="nav-item__count">{{ entry.count }}</span>
      </RouterLink>
      <p class="sidebar__label">规划中</p>
      <span v-for="soon in SOON_ENTRIES" :key="soon.label" class="nav-item is-soon" :title="soon.note">
        <AppIcon :name="soon.icon" />
        <span class="nav-item__text">{{ soon.label }}</span>
      </span>
    </nav>
    <div class="sidebar__foot">
      <UserMenu />
      <p class="text-xs muted">会话与偏好只保存在本浏览器；后端未就绪时走本地假数据。</p>
    </div>
  </aside>
</template>
