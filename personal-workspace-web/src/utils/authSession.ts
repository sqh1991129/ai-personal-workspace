// 会话的本地读写与过期判断：纯函数，不依赖 Vue 运行时（AGENTS.md 目录职责约定）。
import { SESSION_STORAGE_KEY } from '@/constants/auth'
import type { AuthSession } from '@/types/auth'

function isAuthUser(value: unknown): value is AuthSession['user'] {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const user = value as Record<string, unknown>
  return typeof user.username === 'string' && typeof user.displayName === 'string'
}

/** localStorage 里的内容可能被其它版本或人工改写，解析失败一律按“无会话”处理 */
function parseSession(raw: string): AuthSession | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }
    const candidate = parsed as Record<string, unknown>
    if (typeof candidate.token !== 'string' || typeof candidate.issuedAt !== 'number') {
      return null
    }
    if (!isAuthUser(candidate.user)) {
      return null
    }
    const expiresAt: number | null = typeof candidate.expiresAt === 'number' ? candidate.expiresAt : null
    const roles = Array.isArray(candidate.user.roles)
      ? candidate.user.roles.filter((role): role is string => typeof role === 'string')
      : []

    return {
      token: candidate.token,
      issuedAt: candidate.issuedAt,
      expiresAt,
      user: {
        id: typeof candidate.user.id === 'string' ? candidate.user.id : candidate.user.username,
        username: candidate.user.username,
        displayName: candidate.user.displayName,
        roles
      }
    }
  } catch {
    return null
  }
}

export function readStoredSession(): AuthSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    return raw ? parseSession(raw) : null
  } catch {
    // 隐私模式下读取 localStorage 可能抛错，按“无会话”处理
    return null
  }
}

export function writeStoredSession(session: AuthSession): void {
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    // 写入失败只丢失持久化，不影响本次会话
  }
}

export function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // 无法清理时忽略，内存态已经登出
  }
}

export function isSessionExpired(session: AuthSession, now: number = Date.now()): boolean {
  return session.expiresAt !== null && session.expiresAt <= now
}
