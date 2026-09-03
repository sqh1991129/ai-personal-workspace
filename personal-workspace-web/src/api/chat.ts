import http, { ApiError, type RequestOptions } from '@/api/http'
import {
  draftFor,
  MOCK_SESSIONS,
  STREAM_BLOCK_GAP_MS,
  STREAM_CHUNK_SIZE,
  STREAM_TICK_MS,
  seededMessages
} from '@/constants/chat'
import type { ChatCitation, ChatMessage, ChatSession } from '@/types/chat'
import type { MessageBlock } from '@/types/chat'

export const CHAT_SESSIONS_PATH = '/chat/sessions'

export const CHAT_COMPLETIONS_PATH = '/chat/completions'

/** 对话/知识库统一走假数据开关，与鉴权的 VUE_APP_MOCK_AUTH 分开，便于逐域切真 */
export const IS_MOCK_CHAT: boolean = process.env.VUE_APP_MOCK_API === 'true'

export interface CompletionRequest {
  sessionId: string
  question: string
  kbIds: string[]
  deepThink: boolean
}

/**
 * 流式回调：与后端 SSE 的帧一一对应。
 * mock 分支按定时器逐段吐字，真实分支逐行解析 data: {...}，两者的调用顺序完全一致，
 * 因此 stores/chat.ts 不需要知道当前是假数据还是真接口。
 */
export interface CompletionEvents {
  onThink?(think: { seconds: number; text: string }): void
  onBlock?(block: MessageBlock): void
  /** 追加到当前段落正文，用于逐字/逐段渲染 */
  onAppendText?(text: string): void
  onCitations?(citations: ChatCitation[]): void
  onUsage?(usage: { tokens: number; elapsedMs: number }): void
}

function chatPath(sessionId: string, suffix = ''): string {
  return `${CHAT_SESSIONS_PATH}/${sessionId}${suffix}`
}

interface RawSession {
  id?: string
  title?: string
  [key: string]: unknown
}

// 响应体按「未知」处理：可选字段 + 索引签名，契约稳定后再收紧（AGENTS.md 约定）。
interface RawMessage {
  id?: string
  role?: string
  content?: string
  [key: string]: unknown
}

function normalizeSessionList(raw: unknown, fallback: ChatSession[]): ChatSession[] {
  if (!Array.isArray(raw)) {
    return fallback
  }
  const items = raw as RawSession[]
  if (items.length === 0) {
    return fallback
  }
  return items.map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `sess-${index + 1}`,
    title: typeof item.title === 'string' ? item.title : '未命名会话',
    groupLabel: '最近',
    timeLabel: '',
    summary: '',
    icon: 'chat' as const,
    messageCount: 0
  }))
}

export async function fetchSessions(options: RequestOptions = {}): Promise<ChatSession[]> {
  if (IS_MOCK_CHAT) {
    return MOCK_SESSIONS.map((session) => ({ ...session }))
  }
  const raw = await http.get<unknown>(CHAT_SESSIONS_PATH, { signal: options.signal })
  return normalizeSessionList(raw, MOCK_SESSIONS)
}

export async function fetchMessages(sessionId: string, options: RequestOptions = {}): Promise<ChatMessage[]> {
  if (IS_MOCK_CHAT) {
    return seededMessages(sessionId).map((message) => ({ ...message, blocks: [...message.blocks], citations: [...message.citations] }))
  }
  const raw = await http.get<unknown[]>(chatPath(sessionId, '/messages'), { signal: options.signal })
  return (raw as RawMessage[]).map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `msg-${index + 1}`,
    role: item.role === 'assistant' ? 'assistant' : 'user',
    status: 'done' as const,
    citations: [],
    timeLabel: '',
    blocks: typeof item.content === 'string' ? [{ kind: 'paragraph' as const, text: item.content }] : []
  }))
}

function sliceText(text: string): string[] {
  const pieces: string[] = []
  for (let cursor = 0; cursor < text.length; cursor += STREAM_CHUNK_SIZE) {
    pieces.push(text.slice(cursor, cursor + STREAM_CHUNK_SIZE))
  }
  return pieces
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let timer = 0
    const cancel = () => {
      window.clearTimeout(timer)
      reject(new ApiError('请求已取消', { code: 'CANCELED' }))
    }
    if (signal?.aborted) {
      cancel()
      return
    }
    timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }, ms)
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

/** 假流式：按 STREAM_TICK_MS 逐段吐字，行为（可取消、末帧 usage）对齐真实 SSE */
async function streamWithMock(request: CompletionRequest, events: CompletionEvents, options: RequestOptions): Promise<void> {
  const draft = draftFor(request.question)
  if (request.deepThink) {
    events.onThink?.({ seconds: draft.thinkSeconds, text: draft.think })
    await delay(STREAM_BLOCK_GAP_MS, options.signal)
  }

  for (const block of draft.blocks) {
    if (block.kind === 'paragraph') {
      events.onBlock?.({ kind: 'paragraph', text: '' })
      for (const piece of sliceText(block.text)) {
        await delay(STREAM_TICK_MS, options.signal)
        events.onAppendText?.(piece)
      }
      continue
    }
    await delay(STREAM_BLOCK_GAP_MS, options.signal)
    events.onBlock?.(block)
  }

  await delay(STREAM_BLOCK_GAP_MS, options.signal)
  events.onCitations?.(draft.citations.map((citation) => ({ ...citation })))
  events.onUsage?.({ tokens: draft.tokens, elapsedMs: draft.elapsedMs })
}

interface SseEvent {
  event: string
  data: string
}

function parseSseFrame(frame: string): SseEvent | null {
  let event = 'message'
  const dataLines: string[] = []
  for (const line of frame.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim())
    }
  }
  if (dataLines.length === 0) {
    return null
  }
  return { event, data: dataLines.join('\n') }
}

function readString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** 真实分支：POST + fetch ReadableStream 逐行解析，与 demo/chat.html 的接口约定一致 */
async function streamWithBackend(request: CompletionRequest, events: CompletionEvents, options: RequestOptions): Promise<void> {
  const response = await fetch(`${process.env.VUE_APP_API_BASE}${CHAT_COMPLETIONS_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...request, stream: true }),
    signal: options.signal
  })
  if (!response.ok || !response.body) {
    throw new ApiError(`流式响应异常（${response.status}）`, { status: response.status, code: 'HTTP_ERROR' })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    let boundary = buffer.indexOf('\n\n')
    while (boundary >= 0) {
      const frame = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')
      const parsed = parseSseFrame(frame)
      if (!parsed) {
        continue
      }
      const payload: unknown = JSON.parse(parsed.data)
      const record = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : {}
      if (parsed.event === 'error') {
        throw new ApiError(readString(record.message) ?? '模型返回错误', { code: 'HTTP_ERROR' })
      }
      const delta = readString(record.delta)
      if (delta) {
        events.onAppendText?.(delta)
      }
      const think = readString(record.think)
      if (think) {
        events.onThink?.({ seconds: Number(record.thinkSeconds) || 0, text: think })
      }
      if (Array.isArray(record.citations)) {
        events.onCitations?.(record.citations as ChatCitation[])
      }
      if (record.usage !== undefined) {
        events.onUsage?.({ tokens: Number(record.usage) || 0, elapsedMs: Number(record.elapsedMs) || 0 })
      }
    }
  }
}

export function streamCompletion(
  request: CompletionRequest,
  events: CompletionEvents,
  options: RequestOptions = {}
): Promise<void> {
  return IS_MOCK_CHAT ? streamWithMock(request, events, options) : streamWithBackend(request, events, options)
}

export function deleteSession(sessionId: string, options: RequestOptions = {}): Promise<void> {
  if (IS_MOCK_CHAT) {
    return Promise.resolve()
  }
  return http.delete<void>(chatPath(sessionId), { signal: options.signal })
}
