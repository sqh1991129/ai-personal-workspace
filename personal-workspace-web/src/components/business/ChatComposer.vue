<script setup lang="ts">
import { computed, nextTick, shallowRef, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'

interface Props {
  /** 流式进行中：发送按钮变成「停止」方块，与原型一致 */
  streaming: boolean
  /** 从总览页带过来的草稿提问 */
  initialText?: string
}

const props = withDefaults(defineProps<Props>(), {
  initialText: ''
})

const emit = defineEmits<{
  send: [text: string]
  stop: []
}>()

const textarea = useTemplateRef<HTMLTextAreaElement>('input')
const text = shallowRef(props.initialText)

const charCount = computed<number>(() => text.value.length)
const canSend = computed<boolean>(() => text.value.trim().length > 0 && !props.streaming)
const sendTitle = computed<string>(() => (props.streaming ? '停止生成' : '发送（Enter）'))
const placeholder = '输入问题，Enter 发送 / Shift+Enter 换行 —— 后端只接收这段文本'

watch(
  () => props.initialText,
  (value) => {
    if (value) {
      text.value = value
      void nextTick(grow)
    }
  }
)

// 输入区随内容长高，上限交给 CSS 的 max-height
function grow(): void {
  const node = textarea.value
  if (!node) {
    return
  }
  node.style.height = 'auto'
  node.style.height = `${Math.min(node.scrollHeight, 200)}px`
}

function submit(): void {
  if (props.streaming) {
    emit('stop')
    return
  }
  const value = text.value.trim()
  if (!value) {
    return
  }
  emit('send', value)
  text.value = ''
  void nextTick(grow)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <form class="composer" @submit.prevent="submit">
    <div class="composer__box">
      <textarea
        ref="input"
        rows="1"
        :placeholder="placeholder"
        aria-label="消息输入"
        :value="text"
        @input="text = ($event.target as HTMLTextAreaElement).value; grow()"
        @keydown="onKeydown"
      />
      <div class="composer__tools">
        <span class="topbar__spacer" />
        <span class="text-xs muted">{{ charCount }} 字符</span>
        <button
          class="send-btn"
          :class="{ 'is-stop': streaming }"
          type="submit"
          :title="sendTitle"
          :aria-label="streaming ? '停止生成' : '发送'"
          :disabled="!streaming && !canSend"
        >
          <AppIcon :name="streaming ? 'stop' : 'send'" size="sm" />
        </button>
      </div>
    </div>
    <p class="composer__tip">
      <AppIcon name="warning" size="sm" />
      {{ streaming ? '生成中，再次点击发送按钮可停止并保留部分内容。' : '后端只接收问题文本，附件、知识库检索、深度思考与联网均未对接。' }}
    </p>
  </form>
</template>
