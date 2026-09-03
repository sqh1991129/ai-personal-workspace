import { computed, onScopeDispose, shallowRef } from 'vue'
import { API_BASE_URL, isApiError } from '@/api/http'
import { checkHealth } from '@/api/workspace'
import type { StatusState } from '@/types/ui'

function preview(payload: unknown): string {
  if (payload === null || payload === undefined) {
    return '空响应'
  }
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return text.length > 160 ? `${text.slice(0, 160)}…` : text || '空响应'
}

/**
 * 后端连通性探测：状态与副作用都收在这里，视图只消费投影。
 * 卸载时必须 abort（skill 的 composables 约定），重复点击也会取消上一次请求。
 */
export function useBackendHealth() {
  const state = shallowRef<StatusState>('idle')
  const detail = shallowRef('尚未发起检测')
  let controller: AbortController | null = null

  const healthPath = `${API_BASE_URL}/health`
  const isChecking = computed<boolean>(() => state.value === 'checking')

  async function probe(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    state.value = 'checking'
    detail.value = `正在请求 ${healthPath} …`
    const signal = controller.signal

    try {
      const data = await checkHealth({ signal })
      state.value = 'online'
      detail.value = `后端已响应：${preview(data)}`
    } catch (error) {
      const code = isApiError(error) ? error.code : 'UNKNOWN'
      const message = error instanceof Error ? error.message : String(error)
      if (code === 'CANCELED') {
        state.value = 'idle'
        detail.value = '上一次检测已取消'
      } else if (code === 'HTTP_ERROR') {
        state.value = 'offline'
        detail.value = `后端可达但接口未就绪：${message}`
      } else {
        state.value = 'offline'
        detail.value = message
      }
    } finally {
      controller = null
    }
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  return {
    state,
    detail,
    healthPath,
    isChecking,
    probe
  }
}
