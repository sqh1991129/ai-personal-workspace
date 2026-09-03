import { defineStore } from 'pinia'

/** 一条轻提示，对应原型 prototype.js 的 toast() */
export interface ToastItem {
  id: number
  message: string
}

const TOAST_TTL_MS = 2600

let nextId = 1

export const useToastStore = defineStore('toast', {
  state: () => ({
    items: [] as ToastItem[]
  }),
  actions: {
    notify(message: string): void {
      const id = nextId++
      this.items.push({ id, message })
      // 只保留最近 3 条，避免连点把屏幕堆满
      if (this.items.length > 3) {
        this.items.shift()
      }
      window.setTimeout(() => this.dismiss(id), TOAST_TTL_MS)
    },
    dismiss(id: number): void {
      this.items = this.items.filter((item) => item.id !== id)
    }
  }
})
