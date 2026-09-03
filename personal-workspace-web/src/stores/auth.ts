import { defineStore } from 'pinia'
import { setAuthToken } from '@/api/http'
import { clearStoredSession, isSessionExpired, readStoredSession, writeStoredSession } from '@/utils/authSession'
import type { AuthSession, AuthUser } from '@/types/auth'

export interface AuthState {
  session: AuthSession | null
}

/** 冷启动时恢复「记住我」的会话；已过期的直接丢弃，避免带着脏 token 进页面 */
function restoreSession(): AuthSession | null {
  const stored = readStoredSession()
  if (!stored) {
    return null
  }
  if (isSessionExpired(stored)) {
    clearStoredSession()
    return null
  }
  return stored
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const session = restoreSession()
    // 刷新后恢复会话时同步 token，否则后续请求会带着空凭证
    setAuthToken(session?.token ?? null)
    return { session }
  },
  getters: {
    // 过期判断走 pruneExpiredSession()，这里只反映内存态，避免 getter 缓存住 Date.now() 的结果
    isAuthenticated: (state): boolean => state.session !== null,
    currentUser: (state): AuthUser | null => state.session?.user ?? null
  },
  actions: {
    startSession(session: AuthSession, remember: boolean): void {
      this.session = session
      setAuthToken(session.token)
      if (remember) {
        writeStoredSession(session)
        return
      }
      clearStoredSession()
    },
    /** 未勾选「记住我」时会话只活在内存里，刷新即失效 */
    clearSession(): void {
      this.session = null
      setAuthToken(null)
      clearStoredSession()
    },
    pruneExpiredSession(): void {
      if (this.session && isSessionExpired(this.session)) {
        this.clearSession()
      }
    }
  }
})
