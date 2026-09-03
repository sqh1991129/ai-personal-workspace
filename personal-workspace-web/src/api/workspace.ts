import http, { type RequestOptions } from '@/api/http'

/** 接口来源：docs/默认模块.md 的 GET /api/v1/users/health（前缀由 VUE_APP_API_BASE 提供）。 */
export const HEALTH_PATH = '/v1/users/health'

/**
 * 该端点直接返回裸对象，不套 BaseResponse，所以这里不拆信封。
 * 除已知字段外仍保留索引签名，后端加字段不会让前端编译失败。
 */
export interface HealthPayload {
  status?: string
  message?: string
  [key: string]: unknown
}

export function checkHealth(options: RequestOptions = {}): Promise<HealthPayload> {
  return http.get<HealthPayload>(HEALTH_PATH, { signal: options.signal })
}
