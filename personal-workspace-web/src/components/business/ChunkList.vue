<script setup lang="ts">
import type { DocumentChunk } from '@/types/knowledge'

interface Props {
  chunks: DocumentChunk[]
  loading: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="chunk-list">
    <h3 class="card__title">分片预览</h3>
    <p v-if="loading" class="muted text-sm">加载分片…</p>
    <p v-else-if="chunks.length === 0" class="muted text-sm">后端尚未提供分片数据（GET /api/documents/{id}/chunks）。</p>
    <div v-for="chunk in chunks" v-else :key="chunk.index">
      <div class="chunk">
        <p class="chunk__index">
          <span class="chip pill--no-dot">第 {{ chunk.index }} 片</span>
          <span>{{ chunk.rangeLabel }} 字 · 命中率 {{ chunk.hitRate.toFixed(2) }}</span>
        </p>
        <p class="chunk__text">{{ chunk.text }}</p>
      </div>
    </div>
  </div>
</template>
