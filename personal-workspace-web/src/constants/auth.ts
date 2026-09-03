// 认证相关的常量与纯函数（不依赖 Vue 运行时，见 AGENTS.md 目录职责表）。

export const SESSION_STORAGE_KEY = 'workspace.session'

export const LOGIN_ROUTE_NAME = 'login'

export const LOGIN_ROUTE_PATH = '/login'

export const HOME_ROUTE_NAME = 'home'

/** 登录后回跳的默认落点，避免 open redirect 时没有可信目标 */
export const DEFAULT_REDIRECT_PATH = '/'

// 后端接口就绪前的演示账号；真实请求由 VUE_APP_MOCK_AUTH=false 切换（见 src/api/auth.ts）。
export const MOCK_CREDENTIALS = {
  username: 'admin',
  password: 'admin'
} as const

/** 让 mock 有可感知的网络延迟，便于观察按钮的 loading 态 */
export const MOCK_LATENCY_MS = 600

export const MOCK_SESSION_TTL_MS = 8 * 60 * 60 * 1000

export const MOCK_USER_ID = 'usr_mock_admin'

export const MOCK_USER_ROLE = 'owner'
