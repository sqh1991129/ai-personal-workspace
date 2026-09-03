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

export const API_ERROR_CODES = ['CANCELED', 'TIMEOUT', 'NETWORK', 'HTTP_ERROR', 'UNKNOWN'] as const

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

    const payload = response.data ?? null
    const fallback = `后端返回 HTTP ${response.status}`
    const message = payload?.message || payload?.error || fallback
    const rawCode: unknown = payload?.code

    return Promise.reject(new ApiError(message, {
      status: response.status,
      code: isApiErrorCode(rawCode) ? rawCode : 'HTTP_ERROR',
      requestId,
      detail: payload
    }))
  }
)

const http = instance as unknown as HttpClient

export default http
