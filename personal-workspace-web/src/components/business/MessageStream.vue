<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import MessageItem from '@/components/business/MessageItem.vue'
import { SUGGESTIONS } from '@/constants/chat'
import { useToastStore } from '@/stores/toast'
import type { ChatCitation, ChatMessage } from '@/types/chat'

interface Props {
  messages: ChatMessage[]
  streaming: boolean
  loading: boolean
  modelLabel: string
  contextUsed: string
  contextWindow: string
  temperature: number
  kbCount: number
  userInitial: string
  /** 流式失败的摘要，非空时在消息流顶部提示 */
  error: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  regenerate: [message: ChatMessage]
  useSuggestion: [prompt: string]
  openCitation: [citation: ChatCitation]
}>()

const toastStore = useToastStore()
const scroller = useTemplateRef<HTMLElement>('scroller')
const onlyMine = shallowRef(false)

const visibleMessages = computed<ChatMessage[]>(() =>
  onlyMine.value ? props.messages.filter((message) => message.role === 'user') : props.messages
)
const isEmpty = computed<boolean>(() => props.messages.length === 0 && !props.streaming)

// 新内容与逐字追加都要跟着滚到底，nextTick 保证 DOM 已更新
watch(
  () => [props.messages.length, props.messages[props.messages.length - 1]?.blocks.length ?? 0, lastTextLength()],
  async () => {
    await nextTick()
    const node = scroller.value
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }
)

function lastTextLength(): number {
  const last = props.messages[props.messages.length - 1]
  if (!last) {
    return 0
  }
  return last.blocks.reduce((sum, block) => sum + (block.kind === 'paragraph' ? block.text.length : 0), 0)
}

function exportSession(): void {
  const payload = visibleMessages.value
    .map((message) => `[${message.timeLabel}] ${message.role === 'user' ? '我' : 'AI'}\n${message.blocks.map((block) => (block.kind === 'paragraph' || block.kind === 'heading' ? block.text : '')).join('\n')}`)
    .join('\n\n')
  if (!payload) {
    toastStore.notify('当前会话没有可导出的内容')
    return
  }
  void navigator.clipboard.writeText(payload).then(
    () => toastStore.notify(`已复制 ${visibleMessages.value.length} 条消息到剪贴板`),
    () => toastStore.notify('当前浏览器不允许写入剪贴板')
  )
}
</script>

<template>
  <div class="thread">
    <div class="thread__subbar">
      <span class="pill pill--accent pill--no-dot">{{ modelLabel }}</span>
      <span>上下文 {{ contextUsed }} / {{ contextWindow }}</span>
      <span>温度 {{ temperature.toFixed(1) }}</span>
      <span>知识库 {{ kbCount }} 个</span>
      <span class="topbar__spacer" />
      <button
        class="btn btn--ghost btn--sm"
        type="button"
        :aria-pressed="onlyMine ? 'true' : 'false'"
        @click="onlyMine = !onlyMine"
      >
        <AppIcon name="user" size="sm" />只看我的
      </button>
      <button class="btn btn--ghost btn--sm" type="button" @click="exportSession">
      <AppIcon name="file" size="sm" />导出
      </button>
    </div>

    <p v-if="error" class="thread__notice" role="alert">{{ error }}</p>

    <div ref="scroller" class="thread__scroll">
      <div class="thread__inner">
        <p v-if="loading" class="muted text-sm">加载历史消息…</p>
        <MessageItem
          v-for="message in visibleMessages"
          :key="message.id"
          :message="message"
          :user-initial="userInitial"
          @regenerate="emit('regenerate', $event)"
          @open-citation="emit('openCitation', $event)"
        />

        <div v-if="isEmpty" class="empty-thread">
          <span class="avatar avatar--lg"><AppIcon name="spark" /></span>
          <h3>新会话，从一句话开始</h3>
          <p class="muted text-sm">模型 {{ modelLabel.split(' ')[0] }}（本地）· 默认带上「架构决策库」。所有草稿只存在于当前浏览器。</p>
          <div class="suggestions">
            <button v-for="item in SUGGESTIONS" :key="item.title" type="button" @click="emit('useSuggestion', item.prompt)">
              <strong>{{ item.title }}</strong>
              <span>{{ item.note }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区由父视图注入：原型的 .composer 与消息流同属 .thread，拆成插槽可保持 DOM 一致 -->
    <slot name="composer" />
  </div>
</template>

<style scoped>
.thread__notice {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-danger);
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font-size: var(--font-sm);
}
</style>
