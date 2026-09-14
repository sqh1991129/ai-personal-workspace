// 对话模块的数据契约。后端目前只有 POST /api/v1/chat/streamChat（帧里只带文本，
// 没有 think / citations / usage），所以 think、citations、tokens 这几个字段
// 现在恒为空，界面上按「有没有值」决定是否展示（issue R21）。
import type { IconName } from '@/constants/icons'

/** 消息正文块：结构化描述，避免对假数据/后端文本使用 v-html */
export type MessageBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; language: string; filename: string; code: string }
  | { kind: 'component'; component: string; props: Record<string, unknown> }

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
  /** status = 'stopped' 时本地按已渲染块统计的字符数（后端不返回 token 用量，不冒充 token 数） */
  stoppedChars?: number
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
  temperature: number
  maxOutputTokens: number
  systemPrompt: string
  topK: number
  scoreThreshold: number
  /** 参与召回的知识库 id，来自 stores/knowledge.ts */
  selectedKbIds: string[]
}
