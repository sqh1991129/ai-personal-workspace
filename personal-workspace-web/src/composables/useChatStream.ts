import { computed, onScopeDispose, shallowRef } from 'vue'
import { isApiError } from '@/api/http'
import { streamCompletion } from '@/api/chat'
import { useChatStore } from '@/stores/chat'
import type { ChatMessage } from '@/types/chat'

function questionTextOf(message: ChatMessage | undefined): string {
  if (!message) {
    return ''
  }
  return message.blocks
    .filter((block) => block.kind === 'paragraph')
    .map((block) => (block.kind === 'paragraph' ? block.text : ''))
    .join('')
    .trim()
}

/**
 * 流式对话的编排：持有 AbortController，把 mock / SSE 的事件逐帧写进 stores/chat.ts。
 * 视图只消费 isStreaming / errorMessage；卸载时 onScopeDispose 必须 abort（原型 README 的同名约定）。
 */
export function useChatStream() {
  const chatStore = useChatStore()

  let controller: AbortController | null = null
  const activeMessageId = shallowRef<string | null>(null)
  const errorMessage = shallowRef('')

  const isStreaming = computed<boolean>(() => chatStore.isStreaming)

  /** withQuestion = true 时把提问也入列；「重新生成」复用原提问，不再重复入列 */
  async function answer(question: string, deepThink: boolean, withQuestion: boolean): Promise<void> {
    controller?.abort()
    errorMessage.value = ''
    if (withQuestion) {
      chatStore.pushUserMessage(question)
    }

    const messageId = chatStore.beginAssistantMessage()
    activeMessageId.value = messageId
    const abortController = new AbortController()
    controller = abortController

    try {
      await streamCompletion(
        {
          sessionId: chatStore.activeSessionId,
          question,
          kbIds: chatStore.params.selectedKbIds,
          deepThink
        },
        {
          onThink: (think) => chatStore.setThink(messageId, think),
          onBlock: (block) => chatStore.pushBlock(messageId, block),
          onAppendText: (text) => chatStore.appendText(messageId, text),
          onCitations: (citations) => chatStore.setCitations(messageId, citations),
          onUsage: (usage) => chatStore.completeMessage(messageId, usage)
        },
        { signal: abortController.signal }
      )
    } catch (error) {
      // 取消不是失败：stop() 已经把消息落成 stopped，这里不覆盖也不提示
      if (isApiError(error) && error.code === 'CANCELED') {
        return
      }
      errorMessage.value = error instanceof Error ? error.message : String(error)
      chatStore.failMessage(messageId, errorMessage.value)
    } finally {
      if (controller === abortController) {
        controller = null
      }
    }
  }

  function send(question: string, deepThink: boolean): void {
    void answer(question, deepThink, true)
  }

  /** 停止生成：保留已渲染部分并标注 stopped，对应原型的「已停止 · N tokens」 */
  function stop(): void {
    const messageId = activeMessageId.value
    if (messageId && chatStore.streamingMessageId === messageId) {
      chatStore.stopMessage(messageId)
    }
    controller?.abort()
    controller = null
  }

  /** 重新生成：往回找最近一条用户提问，删掉原回答后复用该提问 */
  function regenerate(message: ChatMessage): void {
    const messages = chatStore.activeMessages
    const index = messages.findIndex((item) => item.id === message.id)
    const before = index > 0 ? messages.slice(0, index) : []
    const lastQuestion = [...before].reverse().find((item) => item.role === 'user')
    const question = questionTextOf(lastQuestion)
    if (!question) {
      return
    }
    if (index >= 0) {
      chatStore.dropMessage(message.id)
    }
    void answer(question, message.think !== undefined, false)
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  return {
    isStreaming,
    errorMessage,
    send,
    stop,
    regenerate
  }
}
