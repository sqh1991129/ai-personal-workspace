import axios from 'axios'

export const API_BASE_URL = process.env.VUE_APP_API_BASE || '/api'

const REQUEST_TIMEOUT = Number(process.env.VUE_APP_API_TIMEOUT) || 15000

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status || 0
    this.code = options.code || 'UNKNOWN'
    this.requestId = options.requestId || ''
    this.detail = options.detail || null
  }
}

function createRequestId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: { 'Content-Type': 'application/json' }
})

http.interceptors.request.use((config) => {
  config.headers['X-Request-Id'] = createRequestId()
  return config
})

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const requestId = error.config && error.config.headers ? error.config.headers['X-Request-Id'] : ''

    if (axios.isCancel(error)) {
      return Promise.reject(new ApiError('请求已取消', { code: 'CANCELED', requestId }))
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new ApiError(`请求超时（${REQUEST_TIMEOUT}ms）`, { code: 'TIMEOUT', requestId }))
    }

    const response = error.response
    if (!response) {
      return Promise.reject(new ApiError(`无法连接后端服务（${API_BASE_URL}）`, { code: 'NETWORK', requestId }))
    }

    const payload = response.data
    const fallback = `后端返回 HTTP ${response.status}`
    const message = (payload && (payload.message || payload.error)) || fallback

    return Promise.reject(new ApiError(message, {
      status: response.status,
      code: (payload && payload.code) || 'HTTP_ERROR',
      requestId,
      detail: payload
    }))
  }
)

export default http
