// 跨层复用的认证契约：api/auth.ts、stores/auth.ts、composables/useLogin.ts 与登录视图都依赖这里。
// 后端尚未实现（docs/PROJECT_ANALYSIS.md R10），因此对外只暴露归一化后的稳定结构，
// 原始响应体描述见 src/api/auth.ts 的 RawSession。

export interface AuthUser {
  id: string
  username: string
  displayName: string
  roles: string[]
}

export interface AuthSession {
  user: AuthUser
  token: string
  issuedAt: number
  /** 后端未给出过期时间时为 null，此时本地不做过期判断 */
  expiresAt: number | null
}

export interface LoginPayload {
  username: string
  password: string
  /** 仅影响前端是否把会话写入 localStorage，真实后端接管后应改为服务端签发长效 token */
  remember: boolean
}
