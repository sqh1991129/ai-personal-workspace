import { defineStore } from 'pinia'

const THEME_STORAGE_KEY = 'workspace.theme'
const THEMES = ['light', 'dark']

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(stored) ? stored : ''
  } catch (error) {
    return ''
  }
}

function resolveInitialTheme() {
  const stored = readStoredTheme()
  if (stored) {
    return stored
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

function persistTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch (error) {
    return
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    theme: resolveInitialTheme(),
    sidebarCollapsed: false
  }),
  getters: {
    isDark: (state) => state.theme === 'dark'
  },
  actions: {
    setTheme(theme) {
      if (!THEMES.includes(theme)) {
        return
      }
      this.theme = theme
      persistTheme(theme)
    },
    toggleTheme() {
      this.setTheme(this.isDark ? 'light' : 'dark')
    },
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed
    }
  }
})
