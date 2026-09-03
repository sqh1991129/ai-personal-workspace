<script setup lang="ts">
import { computed, onMounted, onScopeDispose, useTemplateRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/base/AppIcon.vue'
import ThemeToggle from '@/components/business/ThemeToggle.vue'
import { useAppStore } from '@/stores/app'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { LayoutName, ModuleName } from '@/types/ui'

interface Props {
  title: string
  /** 顶栏副标题，展示该页面对应的视图文件，与原型一致 */
  viewPath: string
  /** null = 该页不提供列数切换（总览） */
  module: ModuleName | null
}

const props = defineProps<Props>()

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const chatStore = useChatStore()
const knowledgeStore = useKnowledgeStore()

const LAYOUT_LABELS: Record<LayoutName, string> = {
  'three-col': '三栏',
  'two-col': '两栏',
  'one-col': '专注'
}

const layoutOptions = computed<LayoutName[]>(() => {
  if (props.module === 'chat') {
    return ['three-col', 'two-col', 'one-col']
  }
  if (props.module === 'knowledge') {
    return ['two-col', 'one-col']
  }
  return []
})

const currentLayout = computed<LayoutName | null>(() => (props.module ? appStore.layouts[props.module] : null))

const search = useTemplateRef<HTMLInputElement>('search')

const keyword = computed<string>(() => (props.module === 'knowledge' ? knowledgeStore.keyword : chatStore.sessionFilter))

function onSearch(value: string): void {
  if (props.module === 'knowledge') {
    knowledgeStore.setKeyword(value)
    return
  }
  chatStore.setSessionFilter(value)
}

function submitSearch(): void {
  // 总览页的搜索语义是「找会话」，因此带着关键词跳到对话页的筛选框
  if (props.module === null) {
    void router.push({ name: 'chat' })
  }
}

function onGlobalKeydown(event: KeyboardEvent): void {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    search.value?.focus()
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onScopeDispose(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})

// 换页时把搜索框同步为该页当前的筛选值，避免带着上一页的关键词
watch(
  () => route.name,
  () => {
    if (search.value) {
      search.value.value = keyword.value
    }
  }
)
</script>

<template>
  <header class="topbar">
    <button
      class="icon-btn"
      type="button"
      :title="appStore.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'"
      :aria-label="appStore.sidebarCollapsed ? '展开侧栏' : '折叠侧栏'"
      :aria-expanded="appStore.sidebarCollapsed ? 'false' : 'true'"
      @click="appStore.toggleSidebar()"
    >
      <AppIcon name="panel" />
    </button>
    <div class="topbar__title">
      <h1>{{ title }}</h1>
      <p>{{ viewPath }}</p>
    </div>
    <span class="topbar__spacer" />
    <div v-if="module" class="segmented" role="tablist" aria-label="布局切换">
      <button
        v-for="option in layoutOptions"
        :key="option"
        type="button"
        role="tab"
        :aria-selected="currentLayout === option ? 'true' : 'false'"
        @click="module && appStore.setLayout(module, option)"
      >
        {{ LAYOUT_LABELS[option] }}
      </button>
    </div>
    <label class="search" style="width: 200px">
      <AppIcon name="search" size="sm" />
      <input
        ref="search"
        class="input"
        type="search"
        :placeholder="module === 'knowledge' ? '搜索文档名' : '搜索会话'"
        :aria-label="module === 'knowledge' ? '搜索文档' : '搜索会话'"
        :value="keyword"
        @input="onSearch(($event.target as HTMLInputElement).value)"
        @change="onSearch(($event.target as HTMLInputElement).value)"
        @keyup.enter="submitSearch"
      />
      <kbd class="kbd">⌘K</kbd>
    </label>
    <ThemeToggle />
  </header>
</template>
