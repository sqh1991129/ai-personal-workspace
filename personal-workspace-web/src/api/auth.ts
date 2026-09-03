import http, { ApiError, isRecord, unwrapEnvelope, type RequestOptions } from '@/api/http'
import {
  MOCK_CREDENTIALS,
  MOCK_LATENCY_MS,
  MOCK_SESSION_TTL_MS,
  MOCK_USER_ID,
  MOCK_USER_ROLE
} from '@/constants/auth'
import type { AuthSession, LoginPayload } from '@/types/auth'

/**
 * 接口契约来源：docs/默认模块.md（由后端 personal-workspace-app 的 OpenAPI 生成）。
 * 完整地址是 POST {VUE_APP_API_BASE}/v1/users/userLogin；开发环境由 vue.config.js 的
 * devServer.proxy 把 /api 转发到 VUE_APP_API_PROXY_TARGET 指向的 FastAPI 服务。
 */
export const USER_LOGIN_PATH = '/v1/users/userLogin'

/**
 * 默认走真实后端；置 true 回到本地假数据（admin / admin）方便没有后端时演示。
 * 切换只改环境变量，业务代码不需要动。
 */
export const IS_MOCK_AUTH: boolean = process.env.VUE_APP_MOCK_AUTH === 'true'

/** 请求体即文档里的 UserLoginReq：登录名走 userId 字段，不是前端内部的 username。 */
interface UserLoginReq {
  userId: string
  password: string
}

function asString(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  return typeof value === 'number' ? String(value) : ''
}

/**
 * UserLoginRes 只声明了一个 userId（文档写 integer，后端实现把请求里的字符串原样回填，
 * 所以两种类型都要接住）。除此之外后端不发 token、不发角色、不发有效期。
 */
function readUserId(data: unknown): string {
  return isRecord(data) ? asString(data.userId) : ''
}

/** mock 与真后端都用它兜底 token：后端签发真 token 前，请求层的 Bearer 只能带本地占位值。 */
function createLocalToken(kind: 'mock' | 'local', username: string): string {
  return `${kind}.${username}.${Date.now().toString(36)}`
}

/**
 * 把后端响应补齐成前端会话。后端没给有效期，expiresAt 置 null 表示本地不做过期判断
 * （utils/authSession.ts 与 stores/auth.ts 已按这个语义实现）。
 * username / displayName 用提交时的登录名回显，因为 UserLoginRes 里没有用户名字段。
 */
function toSession(data: unknown, payload: LoginPayload): AuthSession {
  const id = readUserId(data) || payload.username

  return {
    token: createLocalToken('local', payload.username),
    issuedAt: Date.now(),
    expiresAt: null,
    user: {
      id,
      username: payload.username,
      displayName: payload.username,
      roles: []
    }
  }
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
    // 抛错形态对齐真实后端：全局处理器把业务异常包成 HTTP 200 + code 40001，经 unwrapEnvelope 后就是这个样子，
    // 避免 mock 与真接口之间出现行为漂移。
    throw new ApiError('用户名或密码错误', { status: 40001, code: 'BUSINESS_ERROR' })
  }

  const issuedAt = Date.now()
  return {
    token: createLocalToken('mock', payload.username),
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

async function loginWithServer(payload: LoginPayload, options: RequestOptions): Promise<AuthSession> {
  // 后端字段名是 userId（语义即登录名），remember 是前端本地的持久化开关，不发给后端。
  const body: UserLoginReq = { userId: payload.username, password: payload.password }
  const envelope = await http.post<unknown>(
    USER_LOGIN_PATH,
    body,
    { signal: options.signal }
  )
  // HTTP 200 但 code != 200 也在这里抛 BUSINESS_ERROR
  return toSession(unwrapEnvelope<unknown>(envelope, '登录失败'), payload)
}

export function login(payload: LoginPayload, options: RequestOptions = {}): Promise<AuthSession> {
  if (IS_MOCK_AUTH) {
    return loginWithMock(payload, options)
  }
  return loginWithServer(payload, options)
}

/**
 * 接口文档目前只有 /users/health 与 /users/userLogin，没有登出端点，后端也不签发服务端 token，
 * 因此退出只需由 stores/auth.ts 清掉本地会话。后端补上登出接口后，在这里改成真实请求即可。
 */
export async function logout(): Promise<void> {
  return Promise.resolve()
}
