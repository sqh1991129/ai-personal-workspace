import { defineStore } from 'pinia'
import { deleteSession, fetchMessages, fetchSessions, CHAT_COMPLETIONS_PATH } from '@/api/chat'
import { NEW_SESSION_ID, SESSION_GROUP_ORDER } from '@/constants/chat'
import { DEFAULT_SELECTED_KB_IDS } from '@/constants/knowledge'
import type { ChatCitation, ChatMessage, ChatParams, ChatSession } from '@/types/chat'
import type { MessageBlock } from '@/types/chat'

export interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string
  /** 会话 id → 消息列表。按需加载，切会话时才拉取 */
  messagesBySession: Record<string, ChatMessage[]>
  params: ChatParams
  loadingSessions: boolean
  loadingMessages: boolean
  /** 正在流式输出的消息 id，null 表示空闲 */
  streamingMessageId: string | null
  listError: string
  /** 会话筛选关键词，侧栏筛选框与顶栏全局搜索共用（原型 data-role="session-filter"） */
  sessionFilter: string
}

let messageSeq = 0

function nextMessageId(prefix: string): string {
  messageSeq += 1
  return `${prefix}-${messageSeq}`
}

function nowLabel(): string {
  const now = new Date()
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}

const DEFAULT_PARAMS: ChatParams = {
  modelId: 'WS-14B · 本地 GGUF（Q4_K_M）',
  temperature: 0.7,
  maxOutputTokens: 2048,
  systemPrompt: '你是个人工作台助手。回答用中文，先给结论再给步骤；引用知识库时必须标注来源文件名；不确定时明确说明，不要编造。',
  topK: 3,
  scoreThreshold: 0.55,
  reranker: 'bge-reranker',
  selectedKbIds: [...DEFAULT_SELECTED_KB_IDS]
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    sessions: [],
    activeSessionId: NEW_SESSION_ID,
    messagesBySession: {},
    params: { ...DEFAULT_PARAMS, selectedKbIds: [...DEFAULT_PARAMS.selectedKbIds] },
    loadingSessions: false,
    loadingMessages: false,
    streamingMessageId: null,
    listError: '',
    sessionFilter: ''
  }),
  getters: {
    activeMessages: (state): ChatMessage[] => state.messagesBySession[state.activeSessionId] ?? [],
    activeSession: (state): ChatSession | null =>
      state.sessions.find((session) => session.id === state.activeSessionId) ?? null,
    /** 按「今天 / 昨天 / 7 天内」分组，保留原型侧栏的分组顺序 */
    groupedSessions: (state): Array<{ label: string; items: ChatSession[] }> => {
      const keyword = state.sessionFilter.trim().toLowerCase()
      const matched = keyword.length === 0
        ? state.sessions
        : state.sessions.filter((session) => session.title.toLowerCase().includes(keyword))
      const labels = [
        ...SESSION_GROUP_ORDER,
        ...matched.map((session) => session.groupLabel).filter((label) => !SESSION_GROUP_ORDER.includes(label as (typeof SESSION_GROUP_ORDER)[number]))
      ]
      const seen = new Set<string>()
      return labels.reduce<Array<{ label: string; items: ChatSession[] }>>((groups, label) => {
        if (seen.has(label)) {
          return groups
        }
        seen.add(label)
        const items = matched.filter((session) => session.groupLabel === label)
        if (items.length > 0) {
          groups.push({ label, items })
        }
        return groups
      }, [])
    },
    isStreaming: (state): boolean => state.streamingMessageId !== null,
    /** 上下文占用：粗粒度估算，供参数面板的 meter 使用 */
    contextUsage: (state): { usedLabel: string; windowLabel: string; percent: number } => {
      const chars = Object.values(state.messagesBySession)
        .flat()
        .reduce((sum, message) => sum + message.blocks.reduce((inner, block) => inner + blockTextLength(block), 0), 0)
      const tokens = Math.round(chars / 2)
      const windowSize = 32_000
      return {
        usedLabel: tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens),
        windowLabel: `${windowSize / 1000}k`,
        percent: Math.min(100, Math.round((tokens / windowSize) * 100))
      }
    },
    completionPath: (): string => CHAT_COMPLETIONS_PATH
  },
  actions: {
    async loadSessions(signal?: AbortSignal): Promise<void> {
      if (this.sessions.length > 0 || this.loadingSessions) {
        return
      }
      this.loadingSessions = true
      this.listError = ''
      try {
        this.sessions = await fetchSessions({ signal })
      } catch (error) {
        this.listError = describeError(error)
      } finally {
        this.loadingSessions = false
      }
    },
    async openSession(sessionId: string, signal?: AbortSignal): Promise<void> {
      this.activeSessionId = sessionId
      if (this.messagesBySession[sessionId]) {
        return
      }
      this.loadingMessages = true
      try {
        this.messagesBySession[sessionId] = await fetchMessages(sessionId, { signal })
      } catch (error) {
        this.messagesBySession[sessionId] = []
        this.listError = describeError(error)
      } finally {
        this.loadingMessages = false
      }
    },
    newSession(): void {
      this.activeSessionId = NEW_SESSION_ID
      this.messagesBySession[NEW_SESSION_ID] = []
    },
    appendMessage(message: ChatMessage): void {
      const list = this.messagesBySession[this.activeSessionId] ?? []
      this.messagesBySession[this.activeSessionId] = [...list, message]
    },
    /** 用户消息入列，返回该条 id 以便「重新生成」定位上下文 */
    pushUserMessage(text: string): string {
      const message: ChatMessage = {
        id: nextMessageId('msg-user'),
        role: 'user',
        status: 'done',
        citations: [],
        timeLabel: nowLabel(),
        blocks: [{ kind: 'paragraph', text }]
      }
      this.appendMessage(message)
      return message.id
    },
    beginAssistantMessage(): string {
      const message: ChatMessage = {
        id: nextMessageId('msg-assistant'),
        role: 'assistant',
        status: 'streaming',
        citations: [],
        timeLabel: nowLabel(),
        blocks: []
      }
      this.appendMessage(message)
      this.streamingMessageId = message.id
      return message.id
    },
    /** 只在当前流式消息上生效，避免取消后仍写入旧会话 */
    updateStreaming(messageId: string, mutate: (message: ChatMessage) => void): void {
      const list = this.messagesBySession[this.activeSessionId]
      const target = list?.find((message) => message.id === messageId)
      if (!target) {
        return
      }
      mutate(target)
    },
    pushBlock(messageId: string, block: MessageBlock): void {
      this.updateStreaming(messageId, (message) => {
        message.blocks = [...message.blocks, block]
      })
    },
    appendText(messageId: string, text: string): void {
      this.updateStreaming(messageId, (message) => {
        const last = message.blocks[message.blocks.length - 1]
        if (last && last.kind === 'paragraph') {
          message.blocks = [...message.blocks.slice(0, -1), { kind: 'paragraph', text: last.text + text }]
          return
        }
        message.blocks = [...message.blocks, { kind: 'paragraph', text }]
      })
    },
    setThink(messageId: string, think: { seconds: number; text: string }): void {
      this.updateStreaming(messageId, (message) => {
        message.think = think
      })
    },
    setCitations(messageId: string, citations: ChatCitation[]): void {
      this.updateStreaming(messageId, (message) => {
        message.citations = citations
      })
    },
    completeMessage(messageId: string, usage: { tokens: number; elapsedMs: number }): void {
      this.updateStreaming(messageId, (message) => {
        message.status = 'done'
        message.tokens = usage.tokens
        message.elapsedMs = usage.elapsedMs
      })
      this.streamingMessageId = null
    },
    /** 停止生成：保留已渲染内容，标注 stopped */
    stopMessage(messageId: string): void {
      this.updateStreaming(messageId, (message) => {
        message.status = 'stopped'
        message.stoppedTokens = message.blocks.reduce((sum, block) => sum + blockTextLength(block), 0)
      })
      this.streamingMessageId = null
    },
    failMessage(messageId: string, error: string): void {
      this.updateStreaming(messageId, (message) => {
        message.status = 'failed'
        message.error = error
      })
      this.streamingMessageId = null
    },
    /** 重新生成：删掉指定 assistant 消息，由调用方重新发起 */
    dropMessage(messageId: string): void {
      const list = this.messagesBySession[this.activeSessionId] ?? []
      this.messagesBySession[this.activeSessionId] = list.filter((message) => message.id !== messageId)
    },
    setModel(modelId: string): void {
      this.params.modelId = modelId
    },
    setTemperature(temperature: number): void {
      this.params.temperature = temperature
    },
    setMaxOutputTokens(maxOutputTokens: number): void {
      this.params.maxOutputTokens = maxOutputTokens
    },
    setSystemPrompt(systemPrompt: string): void {
      this.params.systemPrompt = systemPrompt
    },
    setSessionFilter(keyword: string): void {
      this.sessionFilter = keyword
    },
    setTopK(topK: number): void {
      this.params.topK = Math.min(20, Math.max(1, Math.round(topK)))
    },
    setScoreThreshold(scoreThreshold: number): void {
      this.params.scoreThreshold = Math.min(1, Math.max(0, scoreThreshold))
    },
    toggleKnowledgeSource(kbId: string): void {
      this.params.selectedKbIds = this.params.selectedKbIds.includes(kbId)
        ? this.params.selectedKbIds.filter((id) => id !== kbId)
        : [...this.params.selectedKbIds, kbId]
    },
    async removeSession(sessionId: string, signal?: AbortSignal): Promise<void> {
      try {
        await deleteSession(sessionId, { signal })
      } catch (error) {
        this.listError = describeError(error)
      }
      this.sessions = this.sessions.filter((session) => session.id !== sessionId)
      if (this.activeSessionId === sessionId) {
        this.newSession()
      }
    }
  }
})

function blockTextLength(block: MessageBlock): number {
  switch (block.kind) {
    case 'paragraph':
      return block.text.length
    case 'heading':
      return block.text.length
    case 'list':
      return block.items.reduce((sum, item) => sum + item.length, 0)
    case 'code':
      return block.code.length
    default:
      return 0
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
