<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
import type { KbSummary } from '@/types/knowledge'

interface Props {
  libraries: KbSummary[]
  activeId: string
  loading: boolean
  /** 列表拉取失败的原因（后端未实现时已点名端点） */
  error?: string
}

withDefaults(defineProps<Props>(), {
  error: ''
})

const emit = defineEmits<{
  open: [kbId: string]
  create: []
}>()

const LIBRARY_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  ready: { label: '可用', tone: 'pill--success' },
  syncing: { label: '待同步', tone: 'pill--warning' },
  indexing: { label: '索引中', tone: 'pill--info' },
  pending: { label: '排队中', tone: 'pill--warning' }
}

function statusLabel(status: KbSummary['status']): { label: string; tone: string } {
  return LIBRARY_STATUS_LABELS[status] ?? { label: '未知', tone: '' }
}
</script>

<template>
  <aside class="rail" aria-label="知识库列表">
    <div class="rail__head">
      <button class="btn btn--primary btn--block" type="button" @click="emit('create')">
        <AppIcon name="plus" size="sm" />新建知识库
      </button>
      <label class="search">
        <AppIcon name="search" size="sm" />
        <input class="input" type="search" placeholder="搜索知识库" aria-label="搜索知识库" />
      </label>
    </div>
    <div class="rail__body">
      <p v-if="loading" class="rail__label">加载知识库…</p>
      <p v-if="!loading && (error || libraries.length === 0)" class="empty">
        {{ error || '后端尚未提供知识库列表（GET /api/kb），这里不会有数据。' }}
      </p>
      <button
        v-for="library in libraries"
        :key="library.id"
        class="row"
        :class="{ 'is-active': library.id === activeId }"
        type="button"
        @click="emit('open', library.id)"
      >
        <AppIcon name="book" size="sm" />
        <span class="row__main">
          <span class="row__title">{{ library.name }}</span>
          <span class="row__meta">{{ library.documentCount }} 篇 · {{ library.chunkCount }} 片</span>
        </span>
        <span class="pill" :class="statusLabel(library.status).tone">{{ statusLabel(library.status).label }}</span>
      </button>

      <p class="rail__label">索引服务</p>
      <p class="empty">索引服务指标（队列 / 向量模型 / 磁盘）待后端提供</p>
    </div>
  </aside>
</template>
