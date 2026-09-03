<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import InlineText from '@/components/base/InlineText.vue'
import { useToastStore } from '@/stores/toast'
import type { ChatCitation, ChatMessage } from '@/types/chat'
import type { IconName } from '@/constants/icons'
import type { MessageBlock } from '@/types/chat'

interface Props {
  message: ChatMessage
  /** 用户名，用于用户气泡的头像 */
  userInitial: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  regenerate: [message: ChatMessage]
  openCitation: [citation: ChatCitation]
}>()

const toastStore = useToastStore()

const feedback = shallowRef<'up' | 'down' | null>(null)
const thinkOpen = shallowRef(false)

const isUser = computed<boolean>(() => props.message.role === 'user')
const isStreaming = computed<boolean>(() => props.message.status === 'streaming')
const isStopped = computed<boolean>(() => props.message.status === 'stopped')
const isFailed = computed<boolean>(() => props.message.status === 'failed')
const avatarIcon = computed<IconName>(() => (isFailed.value ? 'warning' : 'spark'))

// 同 InlineText：把数组下标物化成字段，避免 :key 被提升到 fragment 后判为未使用
const renderBlocks = computed<Array<{ block: MessageBlock; key: number }>>(() =>
  props.message.blocks.map((block, key) => ({ block, key }))
)
const elapsedLabel = computed<string>(() => {
  const { tokens, elapsedMs } = props.message
  if (!tokens || !elapsedMs) {
    return isUser.value ? '已发送到当前会话' : ''
  }
  return `${tokens} tokens · ${(elapsedMs / 1000).toFixed(1)}s`
})
const attachmentLabel = computed<string>(() => (isUser.value && props.message.blocks.length > 0 ? '已附加：知识库 / 架构决策库' : ''))
const plainText = computed<string>(() =>
  props.message.blocks
    .map((block) => {
      if (block.kind === 'paragraph' || block.kind === 'heading') {
        return block.text
      }
      if (block.kind === 'code') {
        return block.code
      }
      return block.items.join('\n')
    })
    .join('\n')
)

async function copy(text: string, note: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    toastStore.notify(note)
  } catch {
    toastStore.notify('当前浏览器不允许写入剪贴板')
  }
}

function toggleFeedback(kind: 'up' | 'down'): void {
  feedback.value = feedback.value === kind ? null : kind
  toastStore.notify(kind === 'up' ? '已标记为有帮助' : '已标记为待改进')
}
</script>

<template>
  <article class="msg" :class="[isUser ? 'msg--user' : 'msg--assistant', { 'msg--error': isFailed }]">
    <div class="avatar avatar--lg">
      <span v-if="isUser">{{ userInitial }}</span>
      <AppIcon v-else :name="avatarIcon" size="sm" />
    </div>
    <div class="msg__col">
      <div class="bubble">
        <details v-if="message.think" class="think" :open="thinkOpen" @toggle="thinkOpen = ($event.target as HTMLDetailsElement).open">
          <summary><AppIcon name="flask" size="sm" /> 思考过程 · {{ message.think.seconds }}s</summary>
          <p>{{ message.think.text }}</p>
        </details>

        <template v-for="entry in renderBlocks" :key="entry.key">
          <p v-if="entry.block.kind === 'paragraph'"><InlineText :text="entry.block.text" /></p>
          <h4 v-else-if="entry.block.kind === 'heading'">{{ entry.block.text }}</h4>
          <component v-else-if="entry.block.kind === 'list'" :is="entry.block.ordered ? 'ol' : 'ul'">
            <li v-for="(item, itemKey) in entry.block.items" :key="itemKey"><InlineText :text="item" /></li>
          </component>
          <div v-else-if="entry.block.kind === 'code'" class="codeblock">
            <div class="codeblock__bar">
              <span>{{ entry.block.language }}<template v-if="entry.block.filename"> · {{ entry.block.filename }}</template></span>
              <button class="btn btn--ghost btn--sm" type="button" @click="copy(entry.block.code, '代码已复制')">复制</button>
            </div>
            <pre><code>{{ entry.block.code }}</code></pre>
          </div>
        </template>

        <p v-if="isStreaming" class="stream-caret" aria-hidden="true">▍</p>
        <p v-if="isStopped" class="muted text-sm">这条回答被手动停止 —— 可继续或重新生成。</p>
        <p v-if="isFailed && message.error" class="muted text-sm"><span class="inline-code">{{ message.error }}</span></p>

        <div v-if="message.citations.length" class="cites">
          <button
            v-for="(citation, index) in message.citations"
            :key="citation.doc + citation.locator"
            class="cite"
            type="button"
            title="在知识库中定位原文"
            @click="emit('openCitation', citation)"
          >
            <sup>{{ index + 1 }}</sup>{{ citation.doc }} · {{ citation.locator }}
          </button>
        </div>
      </div>

      <div class="msg__meta">
        <span>{{ message.timeLabel }}</span>
        <span v-if="elapsedLabel">·</span>
        <span>{{ elapsedLabel }}</span>
        <span v-if="isStopped" class="pill pill--warning pill--no-dot">已停止 · {{ message.stoppedTokens ?? 0 }} / {{ message.tokens ?? 0 }} tokens</span>
        <span v-if="isFailed" class="pill pill--danger pill--no-dot">请求失败</span>
        <span v-if="isStreaming" class="dots"><i /><i /><i /></span>
        <button v-if="isFailed" class="btn btn--sm" type="button" @click="emit('regenerate', message)">
          <AppIcon name="refresh" size="sm" />重试
        </button>
        <span v-if="attachmentLabel">·</span>
        <span>{{ attachmentLabel }}</span>

        <span v-if="!isUser && !isStreaming" class="msg__actions">
          <button class="icon-btn" type="button" title="复制回答" aria-label="复制回答" @click="copy(plainText, '回答已复制')">
            <AppIcon name="copy" size="sm" />
          </button>
          <button class="icon-btn" type="button" title="重新生成" aria-label="重新生成" @click="emit('regenerate', message)">
            <AppIcon name="refresh" size="sm" />
          </button>
          <button
            class="icon-btn"
            :class="{ 'is-active': feedback === 'up' }"
            type="button"
            title="有帮助"
            aria-label="有帮助"
            @click="toggleFeedback('up')"
          >
            <AppIcon name="thumbUp" size="sm" />
          </button>
          <button
            class="icon-btn"
            :class="{ 'is-active': feedback === 'down' }"
            type="button"
            title="待改进"
            aria-label="待改进"
            @click="toggleFeedback('down')"
          >
            <AppIcon name="thumbDown" size="sm" />
          </button>
        </span>
      </div>
    </div>
  </article>
</template>
