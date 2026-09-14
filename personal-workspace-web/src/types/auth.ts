// 跨层复用的认证契约：api/auth.ts、stores/auth.ts、composables/useLogin.ts 与登录视图都依赖这里。
// 这里是「归一化后的稳定结构」，与后端 UserLoginRes 的原始字段解耦：
// 后端只给 userId + token（见 docs/默认模块.md），映射发生在 src/api/auth.ts 的 toSession()。

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
  /** 服务端 token 未给出有效期（或不是能读出 exp 的 JWT）时为 null，此时本地不做过期判断 */
  expiresAt: number | null
}

export interface LoginPayload {
  username: string
  password: string
  /** 仅决定前端是否把会话写入 localStorage，不发给后端（后端 UserLoginReq 没有这个字段） */
  remember: boolean
}
