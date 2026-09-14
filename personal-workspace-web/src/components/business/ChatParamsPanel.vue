<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { useAppStore } from '@/stores/app'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { KbSummary } from '@/types/knowledge'

const emit = defineEmits<{ close: [] }>()

const chatStore = useChatStore()
const knowledgeStore = useKnowledgeStore()
const appStore = useAppStore()

const libraries = computed<KbSummary[]>(() => knowledgeStore.libraries)

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
      <p class="panel__notice">
        后端 POST /api/v1/chat/streamChat 只接收问题文本，以下参数只保存在前端、暂不下发
        （见总览页「后端接口对接进度」）。
      </p>

      <div class="panel__section">
        <h3><AppIcon name="bolt" size="sm" />生成参数</h3>
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
        <p class="card__hint">推理模型由后端决定，接口不返回模型标识，前端不放下拉框。</p>
      </div>

      <div class="panel__section">
        <h3><AppIcon name="book" size="sm" />知识来源</h3>
        <p v-if="libraries.length === 0" class="empty">后端尚未提供知识库列表（GET /api/kb），暂无可勾选的来源。</p>
        <button
          v-for="library in libraries"
          :key="library.id"
          class="row"
          type="button"
          :aria-pressed="isSelected(library.id) ? 'true' : 'false'"
          @click="chatStore.toggleKnowledgeSource(library.id)"
        >
          <span class="row__main">
            <span class="row__title">{{ library.name }}</span>
            <span class="row__meta">{{ library.documentCount }} 篇 · {{ library.chunkCount }} 片</span>
          </span>
          <span class="pill" :class="isSelected(library.id) ? 'pill--success' : ''">{{ isSelected(library.id) ? '已选' : '未选' }}</span>
        </button>
        <div class="cluster">
          <span class="chip pill--no-dot pill--info">Top-K {{ chatStore.params.topK }}</span>
          <span class="chip pill--no-dot pill--info">阈值 {{ chatStore.params.scoreThreshold.toFixed(2) }}</span>
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
        <h3><AppIcon name="warning" size="sm" />后端未接收的参数</h3>
        <p class="card__hint">推理模型、温度、最大输出 token：接口没有对应字段。</p>
        <p class="card__hint">系统提示词：后端写死在提示模板里，前端改动无效。</p>
        <p class="card__hint">知识库引用与 Top-K 召回：后端尚未接入检索。</p>
        <p class="card__hint">多轮上下文：每轮只发送当前这一句问题。</p>
      </div>

      <div class="panel__section">
        <h3><AppIcon name="trash" size="sm" />危险操作</h3>
        <button class="btn btn--danger btn--block" type="button" @click="chatStore.newSession()">清空并新建会话</button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.panel__notice {
  margin: 0 0 var(--space-3);
  padding: var(--space-2);
  border: 1px solid var(--color-info);
  border-radius: var(--radius-sm);
  background: var(--color-info-soft);
  color: var(--color-info);
  font-size: var(--font-xs);
  line-height: 1.5;
}
</style>
