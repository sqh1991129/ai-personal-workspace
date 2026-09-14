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

/** 后端 api/router.py 的 health_check 写死返回 status="ok"，只有这个值算正常。 */
export const HEALTHY_STATUS = 'ok'

export interface HealthOutcome {
  /** 后端 status 字段原文；没给就是空串 */
  status: string
  normal: boolean
  /** 异常时要给用户看的文案；正常时为空串（正常不需要回显原始响应） */
  reason: string
}

/**
 * 把健康检查响应判成「正常 / 异常」。纯函数，scripts/verify/api-contract.ts 直接对它打断言。
 * 后端返回体按「未知」处理：结构不对就判异常，不猜、也不静默当成功。
 */
export function classifyHealth(payload: unknown): HealthOutcome {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return { status: '', normal: false, reason: '响应不是对象，无法判定 status 字段' }
  }
  const record = payload as HealthPayload
  const status = typeof record.status === 'string' ? record.status.trim() : ''
  const message = typeof record.message === 'string' ? record.message.trim() : ''
  if (status.toLowerCase() === HEALTHY_STATUS) {
    return { status, normal: true, reason: '' }
  }
  return { status, normal: false, reason: message || `status=${status || '（缺失）'}，不是 ${HEALTHY_STATUS}` }
}

export function checkHealth(options: RequestOptions = {}): Promise<HealthPayload> {
  return http.get<HealthPayload>(HEALTH_PATH, { signal: options.signal })
}
