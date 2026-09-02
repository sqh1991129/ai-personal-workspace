import http, { type RequestOptions } from '@/api/http'

// 后端契约尚未定义（见 docs issue R10），这里只声明已知的稳定字段。
export interface HealthPayload {
  status?: string
  [key: string]: unknown
}

export function checkHealth(options: RequestOptions = {}): Promise<HealthPayload> {
  return http.get<HealthPayload>('/health', { signal: options.signal })
}

