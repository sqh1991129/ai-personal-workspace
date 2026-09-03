<script setup lang="ts">
import InlineText from '@/components/base/InlineText.vue'
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
    <div v-for="chunk in chunks" v-else :key="chunk.index">
      <div class="chunk">
        <p class="chunk__index">
          <span class="chip pill--no-dot">第 {{ chunk.index }} 片</span>
          <span>{{ chunk.rangeLabel }} 字 · 命中率 {{ chunk.hitRate.toFixed(2) }}</span>
        </p>
        <p class="chunk__text"><InlineText :text="chunk.text" /></p>
      </div>
    </div>
  </div>
</template>
