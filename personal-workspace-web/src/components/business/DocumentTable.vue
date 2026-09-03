<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { STATUS_PRESENTATION } from '@/constants/knowledge'
import { fileTypeClass } from '@/utils/fileType'
import type { DocumentStatus, KbDocument } from '@/types/knowledge'

interface Props {
  documents: KbDocument[]
  activeDocumentId: string | null
  statusFilter: 'all' | DocumentStatus
  loading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  open: [documentId: string]
  'update:statusFilter': [value: 'all' | DocumentStatus]
}>()

const TABS: Array<{ value: 'all' | DocumentStatus; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'ready', label: '已索引' },
  { value: 'indexing', label: '索引中' },
  { value: 'pending', label: '排队中' },
  { value: 'failed', label: '失败' }
]

const filterLabel = computed<string>(() =>
  props.statusFilter === 'all' ? '全部状态' : STATUS_PRESENTATION[props.statusFilter].label
)
</script>

<template>
  <div class="card">
    <div class="card__head">
      <div class="segmented" role="tablist" aria-label="按索引状态筛选">
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          role="tab"
          :aria-selected="statusFilter === tab.value ? 'true' : 'false'"
          @click="emit('update:statusFilter', tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <span class="topbar__spacer" />
      <span class="chip pill--no-dot">
        <AppIcon name="filter" size="sm" />{{ filterLabel }}
      </span>
    </div>

    <div class="table">
      <div class="table__head">
        <span>文档</span><span>大小</span><span>分片</span><span>索引状态</span><span>更新时间</span><span>向量模型</span><span />
      </div>
      <div>
        <button
          v-for="doc in documents"
          :key="doc.id"
          class="doc-row"
          :class="{ 'is-selected': doc.id === activeDocumentId }"
          type="button"
          @click="emit('open', doc.id)"
        >
          <span class="doc-name"><span :class="fileTypeClass(doc.type)">{{ doc.type }}</span><span>{{ doc.name }}</span></span>
          <span class="muted">{{ doc.sizeLabel }}</span>
          <span class="muted">{{ doc.chunkCount }} 片</span>
          <span>
            <span class="pill" :class="`pill--${STATUS_PRESENTATION[doc.status].tone}`">{{ STATUS_PRESENTATION[doc.status].label }}</span>
          </span>
          <span class="muted">{{ doc.updatedAtLabel }}</span>
          <span class="muted">{{ doc.embeddingModel }}</span>
          <span class="muted"><AppIcon name="more" size="sm" /></span>
        </button>
      </div>
      <p v-if="loading" class="empty">加载文档…</p>
      <p v-else-if="documents.length === 0" class="empty">
        <AppIcon name="search" />没有匹配的文档，试试更换关键词或状态筛选。
      </p>
    </div>
    <p class="card__hint">
      状态机：<code>排队中 → 解析中 → 分片中 → 向量化 → 已索引</code>，任一环节失败进入 <code>解析失败</code> 并可重试。表格行点击即打开右侧详情抽屉。
    </p>
  </div>
</template>
