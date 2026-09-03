import { defineStore } from 'pinia'
import type { LayoutName, ModuleName } from '@/types/ui'

const THEME_STORAGE_KEY = 'workspace.theme'

const SIDEBAR_STORAGE_KEY = 'workspace.sidebar-collapsed'

const LAYOUT_STORAGE_PREFIX = 'workspace.layout.'

export const THEME_NAMES = ['light', 'dark'] as const

export type ThemeName = (typeof THEME_NAMES)[number]

export const LAYOUT_NAMES = ['three-col', 'two-col', 'one-col'] as const

/** 各模块的默认布局，与原型 HTML 里 data-layout 的初值一致 */
export const DEFAULT_LAYOUTS: Record<ModuleName, LayoutName> = {
  home: 'two-col',
  chat: 'three-col',
  knowledge: 'two-col'
}

function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value)
}

function isLayoutName(value: unknown): value is LayoutName {
  return typeof value === 'string' && (LAYOUT_NAMES as readonly string[]).includes(value)
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

function readStoredLayout(module: ModuleName): LayoutName | null {
  try {
    const stored = window.localStorage.getItem(LAYOUT_STORAGE_PREFIX + module)
    return isLayoutName(stored) ? stored : null
  } catch {
    return null
  }
}

function readStoredSidebarCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
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

function persist(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 写入失败时仅丢失持久化，不影响本次会话
  }
}

export interface AppState {
  theme: ThemeName
  sidebarCollapsed: boolean
  /** 模块 → 列数布局；对话与知识库共用同一套开关（原型 setLayout() 的等价物） */
  layouts: Record<ModuleName, LayoutName>
}

export const useAppStore = defineStore('app', {
  state: (): AppState => ({
    theme: resolveInitialTheme(),
    sidebarCollapsed: readStoredSidebarCollapsed(),
    layouts: {
      home: readStoredLayout('home') ?? DEFAULT_LAYOUTS.home,
      chat: readStoredLayout('chat') ?? DEFAULT_LAYOUTS.chat,
      knowledge: readStoredLayout('knowledge') ?? DEFAULT_LAYOUTS.knowledge
    }
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
      persist(THEME_STORAGE_KEY, theme)
    },
    toggleTheme(): void {
      this.setTheme(this.isDark ? 'light' : 'dark')
    },
    toggleSidebar(): void {
      this.setSidebarCollapsed(!this.sidebarCollapsed)
    },
    setSidebarCollapsed(collapsed: boolean): void {
      this.sidebarCollapsed = collapsed
      persist(SIDEBAR_STORAGE_KEY, String(collapsed))
    },
    /** 布局只接受该模块支持的列数，非法值直接忽略 */
    setLayout(module: ModuleName, layout: LayoutName): void {
      if (!isLayoutName(layout)) {
        return
      }
      this.layouts[module] = layout
      persist(LAYOUT_STORAGE_PREFIX + module, layout)
    }
  }
})
