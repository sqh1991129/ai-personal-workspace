<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ChatComposer from '@/components/business/ChatComposer.vue'
import ChatParamsPanel from '@/components/business/ChatParamsPanel.vue'
import MessageStream from '@/components/business/MessageStream.vue'
import SessionList from '@/components/business/SessionList.vue'
import { NEW_SESSION_ID } from '@/constants/chat'
import { useChatStream } from '@/composables/useChatStream'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import type { ChatCitation, ChatMessage } from '@/types/chat'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const chatStore = useChatStore()
const { isStreaming, errorMessage, send, stop, regenerate } = useChatStream()

const draftText = shallowRef(typeof route.query.q === 'string' ? route.query.q : '')

const layout = computed(() => appStore.layouts.chat)
const showPanel = computed<boolean>(() => layout.value === 'three-col')
const userInitial = computed<string>(() => (authStore.currentUser?.displayName ?? '我').slice(0, 1))

/** 已对接 ≠ 全能力：把后端做不到的事写在页面上，而不是让参数看起来生效（issue R21） */
const capabilityNotice =
  '对话已对接后端 POST /api/v1/chat/streamChat：每轮只发送问题文本，不带历史上下文、不引用知识库、不返回 token 统计；' +
  '会话列表与历史消息的后端接口尚未提供。'

onMounted(async () => {
  await chatStore.loadSessions()
  if (chatStore.activeSessionId !== NEW_SESSION_ID && !chatStore.messagesBySession[chatStore.activeSessionId]) {
    await chatStore.openSession(chatStore.activeSessionId)
  }
})

async function openSession(sessionId: string): Promise<void> {
  await chatStore.openSession(sessionId)
}

function createSession(): void {
  chatStore.newSession()
  draftText.value = ''
}

function onSend(text: string): void {
  draftText.value = ''
  send(text)
}

/** 引用来源点击 → 跳到知识库定位原文（原型 title 提示的语义） */
function openCitation(citation: ChatCitation): void {
  void router.push({ name: 'knowledge', query: { doc: citation.doc } })
}

function onRegenerate(message: ChatMessage): void {
  regenerate(message)
}
</script>

<template>
  <section class="module" data-module="chat" :data-layout="layout" aria-label="对话模块">
    <SessionList
      :groups="chatStore.groupedSessions"
      :active-id="chatStore.activeSessionId"
      :filter="chatStore.sessionFilter"
      :loading="chatStore.loadingSessions"
      :error="chatStore.listError"
      @open="openSession"
      @create="createSession"
      @update:filter="chatStore.setSessionFilter"
    />

    <MessageStream
      :messages="chatStore.activeMessages"
      :streaming="isStreaming"
      :loading="chatStore.loadingMessages"
      :temperature="chatStore.params.temperature"
      :user-initial="userInitial"
      :error="errorMessage"
      :capability-notice="capabilityNotice"
      @regenerate="onRegenerate"
      @open-citation="openCitation"
    >
      <template #composer>
        <ChatComposer :streaming="isStreaming" :initial-text="draftText" @send="onSend" @stop="stop" />
      </template>
    </MessageStream>

    <ChatParamsPanel v-if="showPanel" />
  </section>
</template>
