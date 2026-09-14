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
 * 切换只改环境变量，业务代码不需要动：开发默认 true（admin / admin 本地假数据，
 * 因为后端登录还没修好 issue R20），生产默认 false 走真实后端。
 * 值取自 src/constants/app.ts 的单一事实源，外壳组件读同一个开关不必引入整个 auth 模块。
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
 * UserLoginRes.userId：文档写 integer，后端实现可能回填字符串，两种都接住。
 */
function readUserId(data: unknown): string {
  return isRecord(data) ? asString(data.userId) : ''
}

function readToken(data: unknown): string {
  return isRecord(data) ? asString(data.token) : ''
}

/** mock 分支专用：真后端的 token 直接取 UserLoginRes.token。 */
function createMockToken(username: string): string {
  return `mock.${username}.${Date.now().toString(36)}`
}

/**
 * 只读 JWT 的 exp（RFC 7519 注册声明）换算本地过期时间，供「记住我」的过期清理用；
 * 前端不校验签名，真过期仍由后端拒绝。解不出（不是三段式 / base64url 失败 / 无 exp）返回 null，
 * 语义等同「后端没给有效期」：本地不做过期判断。
 */
function readJwtExpiresAt(token: string): number | null {
  const segment = token.split('.')[1]
  if (!segment) {
    return null
  }
  try {
    // atob 只给 latin-1 字节串；载荷里有中文用户名时要先还原成 UTF-8 再 JSON.parse
    const binary = atob(segment.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))))
    const claim = isRecord(parsed) ? parsed.exp : undefined
    return typeof claim === 'number' ? claim * 1000 : null
  } catch {
    return null
  }
}

/**
 * UserLoginRes 只有 userId 与 token，没有用户名与角色：username / displayName 用提交时的登录名回显，
 * roles 留空数组（当前 UI 不消费）。
 */
function toSession(data: unknown, payload: LoginPayload): AuthSession {
  const token = readToken(data)
  if (!token) {
    // 文档把 token 标成必填，拿不到就是契约被破坏；宁可报错也不要留一个必然失败的「已登录」态
    throw new ApiError('登录响应缺少 token', { code: 'UNKNOWN', detail: data })
  }

  return {
    token,
    issuedAt: Date.now(),
    expiresAt: readJwtExpiresAt(token),
    user: {
      id: readUserId(data) || payload.username,
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
    // 抛错形态对齐真实后端：全局处理器把业务异常包成 HTTP 200 + code 100001（ErrorCodes.USER_PASSWORD_ERROR），
    // 避免 mock 与真接口之间出现行为漂移。
    throw new ApiError('用户名或密码错误', { status: 100001, code: 'BUSINESS_ERROR' })
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

async function loginWithServer(payload: LoginPayload, options: RequestOptions): Promise<AuthSession> {
  // 后端字段名是 userId（语义即登录名），remember 是前端本地的持久化开关，不发给后端。
  const body: UserLoginReq = { userId: payload.username, password: payload.password }
  const envelope = await http.post<unknown>(
    USER_LOGIN_PATH,
    body,
    { signal: options.signal }
  )
  // HTTP 200 但 code != 0 也在这里抛 BUSINESS_ERROR（业务码 100001 / 校验码 40000 / 系统码 999999 都是这种形态）
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
