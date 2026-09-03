import http, { ApiError, type RequestOptions } from '@/api/http'
import {
  MOCK_CREDENTIALS,
  MOCK_LATENCY_MS,
  MOCK_SESSION_TTL_MS,
  MOCK_USER_ID,
  MOCK_USER_ROLE
} from '@/constants/auth'
import type { AuthSession, LoginPayload } from '@/types/auth'

export const AUTH_LOGIN_PATH = '/auth/login'

export const AUTH_LOGOUT_PATH = '/auth/logout'

/**
 * 后端 personal-workspace-app 尚未提供 /auth/* 接口，默认由 .env.* 决定走假数据还是真请求。
 * 换成真实后端只需把 VUE_APP_MOCK_AUTH 置为 false，业务代码不需要改。
 */
export const IS_MOCK_AUTH: boolean = process.env.VUE_APP_MOCK_AUTH === 'true'

// 响应体按“未知”处理：可选字段 + 索引签名，契约稳定后再收紧（AGENTS.md 约定）。
interface RawUser {
  id?: string | number
  username?: string
  displayName?: string
  name?: string
  roles?: unknown
  [key: string]: unknown
}

interface RawSession {
  token?: string
  accessToken?: string
  user?: RawUser
  /** 有效期秒数，字段名以后端为准 */
  expiresIn?: number
  [key: string]: unknown
}

function asString(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  return typeof value === 'number' ? String(value) : ''
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizeSession(raw: RawSession, fallbackUsername: string): AuthSession {
  const issuedAt = Date.now()
  const user = raw.user ?? {}
  const username = asString(user.username) || fallbackUsername

  return {
    token: asString(raw.token) || asString(raw.accessToken),
    issuedAt,
    expiresAt: typeof raw.expiresIn === 'number' ? issuedAt + raw.expiresIn * 1000 : null,
    user: {
      id: asString(user.id) || username,
      username,
      displayName: asString(user.displayName) || asString(user.name) || username,
      roles: asStringList(user.roles)
    }
  }
}

function createMockToken(username: string): string {
  return `mock.${username}.${Date.now().toString(36)}`
}

/** 让 mock 具备可感知的延迟，并且能被 AbortSignal 取消，行为与 axios 请求一致 */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
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

async function loginWithMock(payload: LoginPayload, options: RequestOptions): Promise<AuthSession> {
  await wait(MOCK_LATENCY_MS, options.signal)

  const matched = payload.username === MOCK_CREDENTIALS.username &&
    payload.password === MOCK_CREDENTIALS.password
  if (!matched) {
    // 抛错形态与真实后端经 http.ts 拦截器归一化后的结果保持一致，避免切换时行为漂移。
    throw new ApiError('用户名或密码错误', { status: 401, code: 'HTTP_ERROR' })
  }

  const issuedAt = Date.now()
  return {
    token: createMockToken(payload.username),
    issuedAt,
    expiresAt: issuedAt + MOCK_SESSION_TTL_MS,
    user: {
      id: MOCK_USER_ID,
      username: MOCK_CREDENTIALS.username,
      displayName: MOCK_CREDENTIALS.username,
      roles: [MOCK_USER_ROLE]
    }
  }
}

export function login(payload: LoginPayload, options: RequestOptions = {}): Promise<AuthSession> {
  if (IS_MOCK_AUTH) {
    return loginWithMock(payload, options)
  }
  // remember 是前端本地的持久化开关，不发给后端。
  return http
    .post<RawSession>(AUTH_LOGIN_PATH, { username: payload.username, password: payload.password }, {
      signal: options.signal
    })
    .then((raw) => normalizeSession(raw, payload.username))
}

export async function logout(options: RequestOptions = {}): Promise<void> {
  if (IS_MOCK_AUTH) {
    return
  }
  await http.post<void>(AUTH_LOGOUT_PATH, undefined, { signal: options.signal })
}
