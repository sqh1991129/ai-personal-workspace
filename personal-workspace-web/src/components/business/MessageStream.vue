<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import MessageItem from '@/components/business/MessageItem.vue'
import { useToastStore } from '@/stores/toast'
import type { ChatCitation, ChatMessage } from '@/types/chat'

interface Props {
  messages: ChatMessage[]
  streaming: boolean
  loading: boolean
  temperature: number
  userInitial: string
  /** 流式失败的摘要，非空时在消息流顶部提示 */
  error: string
  /** 后端能力缺口说明，非空时常驻在消息流顶部（issue R21：页面上要看得清哪些没对接） */
  capabilityNotice?: string
}

const props = withDefaults(defineProps<Props>(), {
  capabilityNotice: ''
})

const emit = defineEmits<{
  regenerate: [message: ChatMessage]
  openCitation: [citation: ChatCitation]
}>()

const toastStore = useToastStore()
const scroller = useTemplateRef<HTMLElement>('scroller')
const onlyMine = shallowRef(false)

const visibleMessages = computed<ChatMessage[]>(() =>
  onlyMine.value ? props.messages.filter((message) => message.role === 'user') : props.messages
)
const isEmpty = computed<boolean>(() => props.messages.length === 0 && !props.streaming)

// 后端不回模型标识，也不能把参数说成「已生效」，所以这里只陈述接口事实，不给示例提示词
const emptyHint =
  '回答由后端 POST /api/v1/chat/streamChat 生成，接口不返回模型标识；' +
  '每轮只发送问题文本，不带历史上下文、不引用知识库。草稿只存在于当前浏览器。'

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
      <span class="pill pill--accent pill--no-dot">后端 streamChat</span>
      <span>温度 {{ temperature.toFixed(1) }}（本地）</span>
      <span class="pill pill--no-dot">参数不下发后端</span>
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
    <p v-if="capabilityNotice" class="thread__notice thread__notice--info" role="status">{{ capabilityNotice }}</p>

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
          <p class="muted text-sm">{{ emptyHint }}</p>
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

.thread__notice--info {
  border-top-color: var(--color-info);
  background: var(--color-info-soft);
  color: var(--color-info);
}
</style>
