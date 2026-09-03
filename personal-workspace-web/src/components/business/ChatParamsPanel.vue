<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { DEFAULT_RERANKER, LIBRARY_REPRESENTATIVE_TYPE } from '@/constants/knowledge'
import { useAppStore } from '@/stores/app'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { FileType, KbSummary } from '@/types/knowledge'
import { fileTypeClass } from '@/utils/fileType'

function representativeType(kbId: string): FileType {
  return LIBRARY_REPRESENTATIVE_TYPE[kbId] ?? 'MD'
}

const emit = defineEmits<{ close: [] }>()

const chatStore = useChatStore()
const knowledgeStore = useKnowledgeStore()
const appStore = useAppStore()

const MODEL_OPTIONS = [
  'WS-14B · 本地 GGUF（Q4_K_M）',
  'WS-7B · 本地（更快）',
  '云端兜底 · OpenAI 兼容接口'
]

const libraries = computed<KbSummary[]>(() => knowledgeStore.libraries)
const context = computed(() => chatStore.contextUsage)

function isSelected(kbId: string): boolean {
  return chatStore.params.selectedKbIds.includes(kbId)
}

/** 列数收到 two-col 时右侧面板隐藏，与原型 panel-close 的语义一致 */
function collapse(): void {
  appStore.setLayout('chat', 'two-col')
  emit('close')
}
</script>

<template>
  <aside class="panel" aria-label="会话参数">
    <div class="panel__head">
      <h2>会话参数</h2>
      <button class="icon-btn" type="button" title="收起右侧面板" aria-label="收起右侧面板" @click="collapse">
        <AppIcon name="close" size="sm" />
      </button>
    </div>
    <div class="panel__body">
      <div class="panel__section">
        <h3><AppIcon name="bolt" size="sm" />模型</h3>
        <label class="field">
          <span class="field__label">推理模型</span>
          <select class="select" :value="chatStore.params.modelId" @change="chatStore.setModel(($event.target as HTMLSelectElement).value)">
            <option v-for="option in MODEL_OPTIONS" :key="option" :value="option">{{ option }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field__label">温度 <span class="muted">{{ chatStore.params.temperature.toFixed(1) }}</span></span>
          <input
            class="slider"
            type="range"
            min="0"
            max="2"
            step="0.1"
            aria-label="温度"
            :value="chatStore.params.temperature"
            @input="chatStore.setTemperature(Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <label class="field">
          <span class="field__label">最大输出 token</span>
          <input
            class="input"
            type="number"
            min="128"
            max="8192"
            step="128"
            :value="chatStore.params.maxOutputTokens"
            @change="chatStore.setMaxOutputTokens(Number(($event.target as HTMLInputElement).value))"
          />
        </label>
      </div>

      <div class="panel__section">
        <h3><AppIcon name="book" size="sm" />知识来源</h3>
        <button
          v-for="library in libraries"
          :key="library.id"
          class="row"
          type="button"
          :aria-pressed="isSelected(library.id) ? 'true' : 'false'"
          @click="chatStore.toggleKnowledgeSource(library.id)"
        >
          <span :class="fileTypeClass(representativeType(library.id))">{{ representativeType(library.id) }}</span>
          <span class="row__main">
            <span class="row__title">{{ library.name }}</span>
            <span class="row__meta">{{ library.documentCount }} 篇 · {{ library.chunkCount }} 片</span>
          </span>
          <span class="pill" :class="isSelected(library.id) ? 'pill--success' : ''">{{ isSelected(library.id) ? '已选' : '未选' }}</span>
        </button>
        <div class="cluster">
          <span class="chip pill--no-dot pill--info">Top-K {{ chatStore.params.topK }}</span>
          <span class="chip pill--no-dot pill--info">阈值 {{ chatStore.params.scoreThreshold.toFixed(2) }}</span>
          <span class="chip pill--no-dot">重排 {{ DEFAULT_RERANKER }}</span>
        </div>
      </div>

      <div class="panel__section">
        <h3><AppIcon name="user" size="sm" />系统提示词</h3>
        <textarea
          class="textarea"
          rows="4"
          aria-label="系统提示词"
          :value="chatStore.params.systemPrompt"
          @input="chatStore.setSystemPrompt(($event.target as HTMLTextAreaElement).value)"
        />
      </div>

      <div class="panel__section">
        <h3><AppIcon name="db" size="sm" />上下文占用</h3>
        <div class="meter"><div class="meter__fill meter__fill--info" :style="{ width: context.percent + '%' }" /></div>
        <dl class="kv">
          <dt>系统提示词</dt><dd>{{ chatStore.params.systemPrompt.length }}</dd>
          <dt>历史消息</dt><dd>{{ context.usedLabel }}</dd>
          <dt>召回分片</dt><dd>{{ chatStore.params.selectedKbIds.length * 1024 }}</dd>
          <dt>剩余窗口</dt><dd>{{ context.windowLabel }}</dd>
        </dl>
        <p class="card__hint">超窗时策略：按轮次截断 + 保留最近一次引用来源，触发前给出提示条。</p>
      </div>

      <div class="panel__section">
        <h3><AppIcon name="trash" size="sm" />危险操作</h3>
        <button class="btn btn--danger btn--block" type="button" @click="chatStore.newSession()">清空并新建会话</button>
      </div>
    </div>
  </aside>
</template>
