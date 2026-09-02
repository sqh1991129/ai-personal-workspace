export {}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      BASE_URL: string
      VUE_APP_TITLE?: string
      VUE_APP_API_BASE?: string
      VUE_APP_API_TIMEOUT?: string
      VUE_APP_DEV_PORT?: string
      VUE_APP_API_PROXY_TARGET?: string
    }
  }
}
