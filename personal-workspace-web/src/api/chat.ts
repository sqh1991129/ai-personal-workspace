import http, { API_BASE_URL, ApiError, HTTP_UNAUTHORIZED, authHeaders, isRecord, notifyUnauthorized, type RequestOptions } from '@/api/http'
import type { ChatCitation, ChatMessage, ChatSession } from '@/types/chat'
import type { MessageBlock } from '@/types/chat'

/**
 * 后端只挂了两个对话端点（personal-workspace-app/api/chat_router.py）：
 *   POST /api/v1/chat/streamChat  → text/event-stream，前端流式回答用这条
 *   POST /api/v1/chat/simpleChat  → 裸对象 { resText }，需要 Bearer token，前端暂未使用
 * 会话列表 / 历史消息 / 删除会话后端都没有，路径按 /v1 前缀预留，真发请求会拿到 404「待对接」。
 */
export const CHAT_SESSIONS_PATH = '/v1/chat/sessions'

export const CHAT_STREAM_PATH = '/v1/chat/streamChat'

/** 后端 streamChat 的请求体契约：只有 text 一个字段（request/simple_chat_req.py）。 */
interface SimpleChatBody {
  text: string
}

export interface CompletionUsage {
  /** 后端不返回 token 统计时为 null，页面据此隐藏「N tokens」而不是编一个数 */
  tokens: number | null
  /** 端到端耗时由前端计时，是真实测量值 */
  elapsedMs: number
}

/**
 * 流式回调：与后端 SSE 的帧一一对应，store 不感知帧格式。
 * onThink / onCitations 目前没有任何生产者——后端 streamChat 不输出思考过程与引用来源，
 * 回调与对应的渲染保留给契约补齐（docs/默认模块.md），不要拿它们演假数据。
 */
export interface CompletionEvents {
  onThink?(think: { seconds: number; text: string }): void
  onBlock?(block: MessageBlock): void
  /** 追加到当前段落正文，用于逐字/逐段渲染 */
  onAppendText?(text: string): void
  /** 整体替换当前段落正文，用于处理累积返回的全量数据 */
  onReplaceText?(text: string): void
  /** 整体替换当前消息内容为一个前端原生组件 */
  onComponent?(component: string, props: Record<string, unknown>): void
  onCitations?(citations: ChatCitation[]): void
  onUsage?(usage: CompletionUsage): void
}

function chatPath(sessionId: string, suffix = ''): string {
  return `${CHAT_SESSIONS_PATH}/${sessionId}${suffix}`
}

/** 后端字段类型不稳定，取值一律走这个守卫，不用 any。 */
function readStringField(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value : ''
}

/** 后端 data 字段类型不稳定（str 或 JsonOutputParser 的对象），这里统一抽成可展示的文本。 */
const CHAT_STREAM_TEXT_FIELDS = ['resText', 'content', 'text', 'answer', 'delta'] as const

/** streamChat 的帧内业务成功码是 200，与全局 BaseResponse 的 0 不同，不能复用 unwrapEnvelope。 */
const CHAT_STREAM_SUCCESS_CODE = 200

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

/**
 * 真接口分支的响应一律先按未知处理：结构不对就报错，
 * 绝不退回假数据（否则页面上分不清「后端返回空列表」和「前端偷偷塞了示例会话」）。
 */
function normalizeSessionList(raw: unknown): ChatSession[] {
  if (!Array.isArray(raw)) {
    throw new ApiError('会话列表响应不是数组，接口契约待后端确认', { code: 'UNKNOWN', detail: raw })
  }
  const items = raw as RawSession[]
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
  const raw = await http.get<unknown>(CHAT_SESSIONS_PATH, { signal: options.signal })
  return normalizeSessionList(raw)
}

export async function fetchMessages(sessionId: string, options: RequestOptions = {}): Promise<ChatMessage[]> {
  const raw = await http.get<unknown[]>(chatPath(sessionId, '/messages'), { signal: options.signal })
  if (!Array.isArray(raw)) {
    throw new ApiError('历史消息响应不是数组，接口契约待后端确认', { code: 'UNKNOWN', detail: raw })
  }
  return (raw as RawMessage[]).map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `msg-${index + 1}`,
    role: item.role === 'assistant' ? 'assistant' : 'user',
    status: 'done' as const,
    citations: [],
    timeLabel: '',
    blocks: typeof item.content === 'string' ? [{ kind: 'paragraph' as const, text: item.content }] : []
  }))
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

/** 后端帧格式与前端事件的中间层：store 只需要知道「追加 / 替换 / 组件 / 结束 / 出错 / 忽略」。 */
export interface ChatStreamFrame {
  kind: 'append' | 'replace' | 'component' | 'finish' | 'error' | 'ignore'
  text: string
  message: string
}

const IGNORED_FRAME: ChatStreamFrame = { kind: 'ignore', text: '', message: '' }
const FINISHED_FRAME: ChatStreamFrame = { kind: 'finish', text: '', message: '' }

/** 后端 data 既可能是文本块，也可能是 JsonOutputParser 的对象，这里统一抽成可展示文本并判断是追加还是替换。 */
function chunkToFrameData(data: unknown): ChatStreamFrame {
  let parsedData = data
  if (typeof data === 'string') {
    // 后端有时会把结构化对象再次 JSON.stringify 后塞入 data 字段
    if (data.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(data)
        if (isRecord(parsed)) {
          parsedData = parsed
        }
      } catch {
        // 忽略解析失败，按普通字符串处理
      }
    }
  }

  if (typeof parsedData === 'string') {
    return { kind: 'append', text: parsedData, message: '' }
  }
  if (typeof parsedData === 'number') {
    return { kind: 'append', text: String(parsedData), message: '' }
  }
  if (!isRecord(parsedData)) {
    return IGNORED_FRAME
  }
  
  if (typeof parsedData.__ui_component === 'string') {
    // 拦截卡片组件标记，不把它当文本处理
    return { kind: 'component', text: JSON.stringify(parsedData), message: '' }
  }

  const preferred = CHAT_STREAM_TEXT_FIELDS.map((field) => parsedData[field]).find(
    (value): value is string => typeof value === 'string' && value.length > 0
  )
  if (preferred) {
    return { kind: 'append', text: preferred, message: '' }
  }
  // 已知文本字段一个都没有：说明这是一个纯结构化数据累积。格式化为方便观看的 JSON 代码块，并标记为整体替换
  if (Object.keys(parsedData).length > 0) {
    return { kind: 'replace', text: '```json\n' + JSON.stringify(parsedData, null, 2) + '\n```', message: '' }
  }
  return IGNORED_FRAME
}

/**
 * 后端帧格式（services/ChatStreamService.py::chat_stream）：
 *   data: {"code":200,"message":"success","data":<chunk>,"status":"streaming"}
 *   data: {"code":200,"message":"success","data":null,"status":"finished"}
 * 帧里的 code 是 200，与全局 BaseResponse 的成功码 0 不是一回事，所以不复用 unwrapEnvelope。
 * 纯函数，scripts/verify/api-contract.ts 直接对它打断言。
 */
export function readChatStreamFrame(frame: string): ChatStreamFrame {
  const event = parseSseFrame(frame)
  if (!event) {
    return IGNORED_FRAME
  }
  if (event.data === '[DONE]') {
    return FINISHED_FRAME
  }
  let payload: unknown
  try {
    payload = JSON.parse(event.data)
  } catch {
    // 注释帧 / 心跳：后端目前不发，遇到也不该把乱码写进气泡
    return IGNORED_FRAME
  }
  if (typeof payload === 'string') {
    return { kind: 'append', text: payload, message: '' }
  }
  if (!isRecord(payload)) {
    return IGNORED_FRAME
  }
  const code = typeof payload.code === 'number' ? payload.code : null
  if (event.event === 'error' || (code !== null && code !== CHAT_STREAM_SUCCESS_CODE)) {
    return { kind: 'error', text: '', message: readStringField(payload, 'message') || '模型返回错误' }
  }
  if (readStringField(payload, 'status') === 'finished' || payload.data === null) {
    return FINISHED_FRAME
  }
  return chunkToFrameData(payload.data)
}

/** fetch 被 AbortController 中断时抛的是 DOMException('AbortError')，归一化成和 axios 一样的 CANCELED。 */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}

/**
 * POST + fetch ReadableStream 逐帧解析后端 streamChat。
 * 后端只接收 text 字段，也不回 token 统计，因此 usage 的 tokens 恒为 null、elapsedMs 由前端计时。
 */
export async function streamCompletion(
  question: string,
  events: CompletionEvents,
  options: RequestOptions = {}
): Promise<void> {
  const body: SimpleChatBody = { text: question }
  const startedAt = Date.now()
  let finished = false
  try {
    const response = await fetch(`${API_BASE_URL}${CHAT_STREAM_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
      signal: options.signal
    })
    if (response.status === HTTP_UNAUTHORIZED) {
      // 后端给 streamChat 补上鉴权之后，这里要和 axios 通道一样把用户踢回登录页
      notifyUnauthorized(CHAT_STREAM_PATH)
      throw new ApiError('登录状态已失效，请重新登录', { status: HTTP_UNAUTHORIZED, code: 'HTTP_ERROR' })
    }
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
        const parsed = readChatStreamFrame(frame)
        if (parsed.kind === 'error') {
          throw new ApiError(parsed.message, { status: response.status, code: 'HTTP_ERROR' })
        }
        if (parsed.kind === 'append') {
          events.onAppendText?.(parsed.text)
        }
        if (parsed.kind === 'replace') {
          events.onReplaceText?.(parsed.text)
        }
        if (parsed.kind === 'component') {
          try {
            const data = JSON.parse(parsed.text)
            events.onComponent?.(data.__ui_component, data.props || {})
          } catch {
            // 解析异常则忽略
          }
        }
        if (parsed.kind === 'finish') {
          finished = true
        }
      }
    }
  } catch (error) {
    if (isAbortError(error)) {
      // 「停止生成」不是失败：stores/chat.ts 已经把消息落成 stopped，这里不能覆盖成报错
      throw new ApiError('请求已取消', { code: 'CANCELED' })
    }
    throw error
  }

  if (!finished) {
    // 后端模型报错时会直接断开连接；没收到结束帧就说明回答不完整，不能当成功收尾
    throw new ApiError('流式响应在结束帧之前断开，回答可能不完整', { code: 'HTTP_ERROR' })
  }
  events.onUsage?.({ tokens: null, elapsedMs: Date.now() - startedAt })
}

/** 后端没有删除会话的端点，请求会失败并把「待对接」暴露给调用方。 */
export function deleteSession(sessionId: string, options: RequestOptions = {}): Promise<void> {
  return http.delete<void>(chatPath(sessionId), { signal: options.signal })
}
