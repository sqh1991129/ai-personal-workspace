// 对话模块的数据契约。后端未实现（docs issue R10），这里按前端渲染需要的形状定义，
// 流式落地后再按 SSE 的 delta/usage/citations 结构收紧（见 demo/chat.html 的接口约定段）。
import type { IconName } from '@/constants/icons'

/** 消息正文块：结构化描述，避免对假数据/后端文本使用 v-html */
export type MessageBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string; filename: string; code: string }

export type ChatRole = 'user' | 'assistant'

/** 原型要求这三种状态可区分：生成中 / 已停止 / 失败（demo/chat.html 第二条回答） */
export type MessageStatus = 'streaming' | 'done' | 'stopped' | 'failed'

export interface ChatCitation {
  doc: string
  locator: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  blocks: MessageBlock[]
  status: MessageStatus
  /** 深度思考过程，assistant 消息可选 */
  think?: { seconds: number; text: string }
  citations: ChatCitation[]
  tokens?: number
  elapsedMs?: number
  /** status = 'stopped' 时已生成的 token 数，用于「38 / 260 tokens」标注 */
  stoppedTokens?: number
  error?: string
  timeLabel: string
}

export interface ChatSession {
  id: string
  title: string
  /** 侧栏分组标签，原型为「今天 / 昨天 / 7 天内」 */
  groupLabel: string
  /** 行尾时间，如 10:24 或 8 月 29 日 */
  timeLabel: string
  /** 行副标题，如「12 条消息 · 引用 3 来源」 */
  summary: string
  icon: IconName
  messageCount: number
}

export interface ChatParams {
  modelId: string
  temperature: number
  maxOutputTokens: number
  systemPrompt: string
  topK: number
  scoreThreshold: number
  reranker: string
  /** 参与召回的知识库 id，来自 stores/knowledge.ts */
  selectedKbIds: string[]
}

export interface ChatDraft {
  blocks: MessageBlock[]
  think: string
  thinkSeconds: number
  citations: ChatCitation[]
  tokens: number
  elapsedMs: number
}
