<script setup lang="ts">
import { shallowRef } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { useRetrieval } from '@/composables/useRetrieval'
import { useToastStore } from '@/stores/toast'

const retrieval = useRetrieval()
const toastStore = useToastStore()

const hybrid = shallowRef(true)
const rerank = shallowRef(true)

function meterTone(score: number): string {
  if (score >= 0.8) {
    return ''
  }
  return score >= 0.6 ? 'meter__fill--warning' : 'meter__fill--danger'
}

async function run(): Promise<void> {
  await retrieval.run()
  const result = retrieval.result.value
  toastStore.notify(result ? `已召回 ${result.hits.length} 个分片（模拟结果）` : '检索失败')
}
</script>

<template>
  <div class="recall">
    <div class="card__head recall__head">
      <h3><AppIcon name="flask" size="sm" /> 召回测试</h3>
      <span class="text-xs muted">调参用，结果不写入会话历史</span>
    </div>

    <div class="askbox__row">
      <input
        v-model="retrieval.query.value"
        class="input"
        type="search"
        aria-label="检索语句"
        placeholder="输入一句自然语言，测试知识库召回质量"
        @keyup.enter="run"
      />
      <button class="btn btn--primary" type="button" :disabled="retrieval.isPending.value" @click="run">
        <AppIcon name="search" size="sm" />{{ retrieval.isPending.value ? '检索中…' : '运行检索' }}
      </button>
    </div>

    <div class="cluster">
      <label class="field recall__field">
        <span class="field__label">Top-K</span>
        <input v-model.number="retrieval.topK.value" class="input" type="number" min="1" max="20" />
      </label>
      <label class="field recall__field">
        <span class="field__label">相似度阈值</span>
        <input v-model.number="retrieval.scoreThreshold.value" class="input" type="number" step="0.05" min="0" max="1" />
      </label>
      <button class="tool-toggle" type="button" :aria-pressed="hybrid ? 'true' : 'false'" @click="hybrid = !hybrid">
        <AppIcon name="db" size="sm" />向量 + BM25
      </button>
      <button class="tool-toggle" type="button" :aria-pressed="rerank ? 'true' : 'false'" @click="rerank = !rerank">
        <AppIcon name="bolt" size="sm" />bge-reranker
      </button>
    </div>

    <p v-if="retrieval.errorMessage.value" class="field__error" role="alert">{{ retrieval.errorMessage.value }}</p>

    <div v-if="retrieval.result.value" class="stack">
      <p class="text-xs muted">{{ retrieval.summary.value }}</p>
      <div v-for="hit in retrieval.result.value.hits" :key="hit.docName + hit.chunkLabel" class="recall__hit">
        <header>
          <b>{{ hit.docName }}</b>
          <span class="chip">{{ hit.chunkLabel }}</span>
          <span class="recall__score">{{ hit.score.toFixed(2) }}</span>
        </header>
        <div class="meter">
          <div class="meter__fill" :class="meterTone(hit.score)" :style="{ width: Math.round(hit.score * 100) + '%' }" />
        </div>
        <p>
          <template v-for="segment in hit.segments" :key="`${segment.marked ? 'm' : 'p'}-${segment.text}`">
            <mark v-if="segment.marked">{{ segment.text }}</mark>
            <template v-else>{{ segment.text }}</template>
          </template>
        </p>
      </div>
      <p v-if="retrieval.result.value.hits.length === 0" class="empty">阈值之上没有命中分片，试着调低阈值或换一种问法。</p>
    </div>
    <p v-else class="text-xs muted">点击「运行检索」查看当前库的召回质量。</p>
  </div>
</template>

<style scoped>
.recall__head {
  margin-bottom: 0;
}

/* 原型这里是内联 style="width:110px/130px"，改成类名以免模板里写样式 */
.recall__field {
  width: 110px;
}

.recall__field:last-of-type {
  width: 130px;
}

.field__error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-xs);
}
</style>
