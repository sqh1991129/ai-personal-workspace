<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { Component } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import AppIcon from '@/components/base/AppIcon.vue'
import { useToastStore } from '@/stores/toast'
import type { ChatCitation, ChatMessage } from '@/types/chat'
import type { IconName } from '@/constants/icons'
import type { MessageBlock } from '@/types/chat'
import PoetryCard from '@/components/business/cards/PoetryCard.vue'
import ProfileCard from '@/components/business/cards/ProfileCard.vue'
import MetricCard from '@/components/business/cards/MetricCard.vue'
import GenericCard from '@/components/business/cards/GenericCard.vue'

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
  if (!elapsedMs) {
    return isUser.value ? '已发送到当前会话' : ''
  }
  const seconds = `${(elapsedMs / 1000).toFixed(1)}s`
  // 后端 streamChat 不回 token 用量，只有耗时是前端计时的真值（issue R21）
  return tokens ? `${tokens} tokens · ${seconds}` : `耗时 ${seconds}`
})
const stoppedLabel = computed<string>(() => `已停止 · 本地已生成 ${props.message.stoppedChars ?? 0} 字符`)
const plainText = computed<string>(() =>
  props.message.blocks
    .map((block) => {
      if (block.kind === 'paragraph' || block.kind === 'heading') {
        return block.text
      }
      if (block.kind === 'code') {
        return block.code
      }
      if (block.kind === 'component') {
        return JSON.stringify(block.props)
      }
      return block.items.join('\n')
    })
    .join('\n')
)

function renderMarkdown(text: string): string {
  // 基础 marked 配置
  const html = marked.parse(text, { breaks: true }) as string
  if (typeof window === 'undefined' || !DOMPurify.sanitize) {
    return html // SSR / Node bypass
  }
  return DOMPurify.sanitize(html)
}

function getComponent(name: string): string | Component {
  const registry: Record<string, Component> = {
    PoetryCard,
    ProfileCard,
    MetricCard,
    GenericCard
  }
  return registry[name] || 'div'
}

interface TextFragment {
  type: 'text'
  content: string
}

interface ComponentFragment {
  type: 'component'
  componentName: string
  props: Record<string, unknown>
}

type Fragment = TextFragment | ComponentFragment

function parseFragments(text: string): Fragment[] {
  const fragments: Fragment[] = []
  let current = 0

  while (current < text.length) {
    const backtickIdx = text.indexOf('```', current)
    const doubleBraceIdx = text.indexOf('{{', current)
    const singleBraceMatch = /(?:^|\n)\s*(\{\s*")/.exec(text.substring(current))
    const singleBraceIdx = singleBraceMatch ? current + singleBraceMatch.index + singleBraceMatch[0].indexOf('{') : -1

    const options = [backtickIdx, doubleBraceIdx, singleBraceIdx].filter(i => i !== -1)
    if (options.length === 0) {
      fragments.push({ type: 'text', content: text.substring(current) })
      break
    }

    const startIdx = Math.min(...options)
    if (startIdx > current) {
      fragments.push({ type: 'text', content: text.substring(current, startIdx) })
    }

    let block = ''
    let endIdx = -1

    if (startIdx === backtickIdx) {
      const end = text.indexOf('```', startIdx + 3)
      if (end !== -1) {
        endIdx = end + 2
        block = text.substring(startIdx, endIdx + 1)
      }
    } else if (startIdx === doubleBraceIdx) {
      const end = text.indexOf('}}', startIdx + 2)
      if (end !== -1) {
        endIdx = end + 1
        block = text.substring(startIdx, endIdx + 1)
      }
    } else if (startIdx === singleBraceIdx) {
      let depth = 0
      for (let i = startIdx; i < text.length; i++) {
        if (text[i] === '{') depth++
        if (text[i] === '}') {
          depth--
          if (depth === 0) {
            endIdx = i
            break
          }
        }
      }
      if (endIdx !== -1) {
        block = text.substring(startIdx, endIdx + 1)
      }
    }

    if (endIdx !== -1) {
      current = endIdx + 1
      let jsonString = block
      if (block.startsWith('```')) {
        jsonString = block.replace(/^```(?:json)?/, '').replace(/```$/, '').trim()
      } else if (block.startsWith('{{')) {
        jsonString = '{' + block.slice(2, -2) + '}'
      }

      try {
        const data = JSON.parse(jsonString)
        if (data && typeof data === 'object') {
          if (data.__ui_component) {
            fragments.push({ type: 'component', componentName: data.__ui_component, props: data.props || data })
            continue
          } else if (data.title && data.items) {
            fragments.push({ type: 'component', componentName: 'ProfileCard', props: data })
            continue
          } else if (data.title && data.main_value) {
            fragments.push({ type: 'component', componentName: 'MetricCard', props: data })
            continue
          } else {
            // 通用兜底：任何其他结构的 JSON 都用 GenericCard 渲染
            fragments.push({ type: 'component', componentName: 'GenericCard', props: { data } })
            continue
          }
        }
      } catch (e) {
        // Fallback to text
      }
      fragments.push({ type: 'text', content: block })
    } else {
      fragments.push({ type: 'text', content: text[startIdx] })
      current = startIdx + 1
    }
  }

  // 合并相邻的 text fragment
  return fragments.reduce((acc, curr) => {
    const last = acc[acc.length - 1]
    if (curr.type === 'text' && last && last.type === 'text') {
      last.content += curr.content
      return acc
    }
    acc.push(curr)
    return acc
  }, [] as Fragment[])
}

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
          <template v-if="entry.block.kind === 'paragraph'">
            <template v-for="frag in parseFragments(entry.block.text)">
              <div v-if="frag.type === 'text'" :key="frag.type + frag.content.length" class="markdown-body" v-html="renderMarkdown(frag.content)" />
              <component v-else-if="frag.type === 'component'" :key="frag.type + frag.componentName" :is="getComponent(frag.componentName)" v-bind="frag.props" />
            </template>
          </template>
          <component v-else-if="entry.block.kind === 'component'" :is="getComponent(entry.block.component)" v-bind="entry.block.props" />
          <h4 v-else-if="entry.block.kind === 'heading'">{{ entry.block.text }}</h4>
          <component v-else-if="entry.block.kind === 'list'" :is="entry.block.ordered ? 'ol' : 'ul'">
            <li v-for="(item, itemKey) in entry.block.items" :key="itemKey">{{ item }}</li>
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
        <span v-if="isStopped" class="pill pill--warning pill--no-dot">{{ stoppedLabel }}</span>
        <span v-if="isFailed" class="pill pill--danger pill--no-dot">请求失败</span>
        <span v-if="isStreaming" class="dots"><i /><i /><i /></span>
        <button v-if="isFailed" class="btn btn--sm" type="button" @click="emit('regenerate', message)">
          <AppIcon name="refresh" size="sm" />重试
        </button>
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
