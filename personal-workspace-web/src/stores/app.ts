import { defineStore } from 'pinia'

const THEME_STORAGE_KEY = 'workspace.theme'

export const THEME_NAMES = ['light', 'dark'] as const

export type ThemeName = (typeof THEME_NAMES)[number]

export interface AppState {
  theme: ThemeName
  sidebarCollapsed: boolean
}

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value)
}

function readStoredTheme(): ThemeName | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeName(stored) ? stored : null
  } catch {
    // 隐私模式下读取 localStorage 可能抛错，按“无存储”处理
    return null
  }
}

function resolveInitialTheme(): ThemeName {
  const stored = readStoredTheme()
  if (stored) {
    return stored
  }
  const prefersDark = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function persistTheme(theme: ThemeName): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // 写入失败时仅丢失持久化，不影响本次会话
  }
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    theme: resolveInitialTheme(),
    sidebarCollapsed: false
  }),
  getters: {
    isDark: (state): boolean => state.theme === 'dark'
  },
  actions: {
    setTheme(theme: ThemeName): void {
      if (!isThemeName(theme)) {
        return
      }
      this.theme = theme
      persistTheme(theme)
    },
    toggleTheme(): void {
      this.setTheme(this.isDark ? 'light' : 'dark')
    },
    toggleSidebar(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed
    }
  }
})
