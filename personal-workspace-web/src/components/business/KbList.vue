<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
import { INDEX_SERVICE } from '@/constants/knowledge'
import type { KbSummary } from '@/types/knowledge'

interface Props {
  libraries: KbSummary[]
  activeId: string
  loading: boolean
}

defineProps<Props>()

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
      <div class="index-card">
        <div class="cluster index-card__row">
          <span class="text-sm">队列</span>
          <span class="pill pill--info pill--no-dot">{{ INDEX_SERVICE.queueLabel }}</span>
        </div>
        <div class="meter"><div class="meter__fill meter__fill--info" :style="{ width: INDEX_SERVICE.progressPercent + '%' }" /></div>
        <dl class="kv">
          <dt>向量模型</dt><dd>{{ INDEX_SERVICE.embeddingModel }}</dd>
          <dt>分片</dt><dd>{{ INDEX_SERVICE.chunkShape }}</dd>
          <dt>磁盘</dt><dd>{{ INDEX_SERVICE.diskLabel }}</dd>
        </dl>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 原型这里是内联 style 的 card，这里换成类名，避免在模板里写 style */
.index-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.index-card__row {
  justify-content: space-between;
}
</style>
