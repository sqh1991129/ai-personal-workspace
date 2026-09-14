import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'

export const API_BASE_URL: string = process.env.VUE_APP_API_BASE || '/api'

const REQUEST_TIMEOUT: number = Number(process.env.VUE_APP_API_TIMEOUT) || 15000

const REQUEST_ID_HEADER = 'X-Request-Id'

const AUTH_HEADER = 'Authorization'

// 请求层不反向依赖 store：会话变化时由 stores/auth.ts 显式把 token 交给这里。
// 后端接管登录后，所有 /api 请求都会自动带上 Bearer token，业务代码无需改动。
let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token && token.length > 0 ? token : null
}

/**
 * 少数端点走不了 axios（流式响应要自己读 ReadableStream），请求头在这里复用同一份 token，
 * 避免「一处登录两处鉴权」。只给头，不给实例：调用方仍然是 src/api 下的领域模块。
 */
export function authHeaders(): Record<string, string> {
  return authToken ? { [AUTH_HEADER]: `Bearer ${authToken}` } : {}
}

/** token 过期/无效时后端返回的标准状态码（FastAPI 的 HTTPException(401)）。 */
export const HTTP_UNAUTHORIZED = 401

/** 后端还没有这个路由（路由未注册时的 404），页面上要把它翻译成「某端点待对接」。 */
export const HTTP_NOT_FOUND = 404

export interface UnauthorizedContext {
  /** 请求的相对路径（不含 baseURL），供装配处区分登录端点 */
  url: string
}

export type UnauthorizedHandler = (context: UnauthorizedContext) => void

// 请求层同样不反向依赖 store 与 router：它只上报「哪个端点回了 401」，
// 清会话与跳转由 src/router/guards.ts 的 applyUnauthorizedRedirect() 装配。
let unauthorizedHandler: UnauthorizedHandler | null = null

/** 传 null 可注销（测试用）。handler 只做不抛错的副作用，异常会顶掉原始的 401 错误。 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

/** 非 axios 通道拿到的 401 也走同一套装配，避免「普通接口会踢回登录页、流式接口不会」。 */
export function notifyUnauthorized(url: string): void {
  unauthorizedHandler?.({ url })
}

export const API_ERROR_CODES = ['CANCELED', 'TIMEOUT', 'NETWORK', 'HTTP_ERROR', 'BUSINESS_ERROR', 'UNKNOWN'] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && (API_ERROR_CODES as readonly string[]).includes(value)
}

export interface ApiErrorOptions {
  status?: number
  code?: ApiErrorCode
  requestId?: string
  detail?: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly requestId: string
  readonly detail: unknown

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status ?? 0
    this.code = options.code ?? 'UNKNOWN'
    this.requestId = options.requestId ?? ''
    this.detail = options.detail ?? null
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export interface RequestOptions {
  signal?: AbortSignal
}

interface BackendErrorPayload {
  message?: string
  error?: string
  code?: string
  trace_id?: string
}

/**
 * 后端统一响应报文，见 personal-workspace-app/core/base_response.py 与 docs/默认模块.md。
 * 成功码由 core/error_codes.py 的 ErrorCodes.SUCCESS 决定，是 **0**（不是 HTTP 的 200）。
 */
export interface ApiEnvelope<T> {
  /** 业务状态码，0 表示成功；非 0 时 message 已是可直接展示中文文案 */
  code?: number
  message?: string
  data?: T
  /** 全链路追踪 ID */
  trace_id?: string
  timestamp?: number
}

/** 后端 ErrorCodes.SUCCESS.code（error_codes.py 里写成 000000，即十进制 0）。 */
export const API_SUCCESS_CODE = 0

/** 后端返回体一律先按未知处理，再用这种守卫收窄（AGENTS.md 的 TypeScript 约定）。 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** 只认「code 是数字」这一特征：后端没按 BaseResponse 返回时宁可判为不是信封，也不误拆。 */
export function isApiEnvelope(value: unknown): value is ApiEnvelope<unknown> {
  return isRecord(value) && typeof value.code === 'number'
}

/**
 * 拆 BaseResponse 信封。HTTP 200 但 code != 0 同样是失败（后端用 BaseResponse.failure 表达），
 * 归一化成 BUSINESS_ERROR，调用方仍然只 catch ApiError。
 * data 由 unknown → T 是边界断言：具体契约由各领域模块的 Raw* 类型收敛（AGENTS.md 约定）。
 */
export function unwrapEnvelope<T>(payload: unknown, fallbackMessage: string): T {
  if (!isApiEnvelope(payload)) {
    throw new ApiError(`${fallbackMessage}：响应不是约定的 BaseResponse 报文`, { code: 'UNKNOWN', detail: payload })
  }
  if (payload.code !== API_SUCCESS_CODE) {
    throw new ApiError(payload.message || fallbackMessage, {
      status: payload.code,
      code: 'BUSINESS_ERROR',
      requestId: payload.trace_id,
      detail: payload
    })
  }
  return payload.data as T
}

/**
 * 兜底翻译裸 HTTPValidationError：后端全局异常处理器目前会把参数校验错误包成
 * HTTP 200 + code 40000（走 unwrapEnvelope 的 BUSINESS_ERROR 分支），正常不会走到这里。
 * 留着是为了代理层/网关直接返回 422，或后端漏挂 handler 时用户仍能看到字段级原因。
 */
function readValidationMessage(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.detail)) {
    return ''
  }
  const items = payload.detail.reduce<string[]>((acc, entry) => {
    if (!isRecord(entry) || typeof entry.msg !== 'string') {
      return acc
    }
    // loc 形如 ["body","password"]，首段是位置标签，去掉后才是字段名
    const field = Array.isArray(entry.loc)
      ? entry.loc.filter((part): part is string => typeof part === 'string').slice(1).join('.')
      : ''
    acc.push(field ? `${field} ${entry.msg}` : entry.msg)
    return acc
  }, [])
  return items.length > 0 ? `参数校验失败：${items.join('；')}` : ''
}

// 响应拦截器已把 AxiosResponse 解包成 data，这里按真实对外契约重述签名，
// 避免调用方误以为拿到的是 AxiosResponse。
export interface HttpClient {
  get<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>
  delete<T>(url: string, config?: AxiosRequestConfig): Promise<T>
  request<T>(config: AxiosRequestConfig): Promise<T>
}

function createRequestId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

function readRequestId(error: AxiosError<BackendErrorPayload>): string {
  const headers = error.config?.headers as Record<string, unknown> | undefined
  const value = headers?.[REQUEST_ID_HEADER]
  return typeof value === 'string' ? value : ''
}

/**
 * 404 的文案必须点名端点：后端没实现的功能在页面上要能直接看出「是哪个接口没接」，
 * 而不是笼统一句 HTTP 404，否则使用者无从判断哪些功能还依赖后台对接。
 */
function readUnimplementedMessage(error: AxiosError<BackendErrorPayload>): string {
  const verb = String(error.config?.method ?? 'get').toUpperCase()
  const path = `${API_BASE_URL}${String(error.config?.url ?? '')}`
  return `后端未实现 ${verb} ${path}，该功能待对接`
}

const instance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
})

instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers[REQUEST_ID_HEADER] = createRequestId()
  if (authToken) {
    config.headers[AUTH_HEADER] = `Bearer ${authToken}`
  }
  return config
})

instance.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: unknown) => {
    const axiosError = error as AxiosError<BackendErrorPayload>
    const requestId = readRequestId(axiosError)

    if (axios.isCancel(error)) {
      return Promise.reject(new ApiError('请求已取消', { code: 'CANCELED', requestId }))
    }

    if (axiosError.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError(`请求超时（${REQUEST_TIMEOUT}ms）`, { code: 'TIMEOUT', requestId }))
    }

    const response = axiosError.response
    if (!response) {
      return Promise.reject(new ApiError(`无法连接后端服务（${API_BASE_URL}）`, { code: 'NETWORK', requestId }))
    }

    if (response.status === HTTP_UNAUTHORIZED) {
      unauthorizedHandler?.({ url: String(axiosError.config?.url ?? '') })
    }

    const payload = response.data ?? null
    const fallback = `后端返回 HTTP ${response.status}`
    const message = response.status === HTTP_NOT_FOUND
      ? readUnimplementedMessage(axiosError)
      : readValidationMessage(response.data) || payload?.message || payload?.error || fallback
    const rawCode: unknown = payload?.code
    // 后端回了 trace_id 就以它为准，方便和后端日志对齐；否则退回我们发出的 X-Request-Id

    return Promise.reject(new ApiError(message, {
      status: response.status,
      code: isApiErrorCode(rawCode) ? rawCode : 'HTTP_ERROR',
      requestId: payload?.trace_id || requestId,
      detail: payload
    }))
  }
)

const http = instance as unknown as HttpClient

export default http
