// 登录后回跳地址的白名单校验：纯函数，不依赖 Vue 运行时。
import { DEFAULT_REDIRECT_PATH, LOGIN_ROUTE_PATH } from '@/constants/auth'

/**
 * 只接受站内绝对路径，挡掉 `//evil.com`、`/\evil.com` 这类协议相对写法，
 * 以及指向登录页自身的地址（否则会和守卫互相打转）。
 */
export function resolveSafeRedirect(raw: unknown): string {
  if (typeof raw !== 'string' || raw.length === 0) {
    return DEFAULT_REDIRECT_PATH
  }
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return DEFAULT_REDIRECT_PATH
  }
  if (raw === LOGIN_ROUTE_PATH || raw.startsWith(`${LOGIN_ROUTE_PATH}?`) || raw.startsWith(`${LOGIN_ROUTE_PATH}#`)) {
    return DEFAULT_REDIRECT_PATH
  }
  return raw
}
