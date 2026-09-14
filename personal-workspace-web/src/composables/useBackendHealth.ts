import { computed, onScopeDispose, shallowRef } from 'vue'
import { API_BASE_URL, isApiError } from '@/api/http'
import { checkHealth, classifyHealth, HEALTH_PATH } from '@/api/workspace'
import type { HealthOutcome } from '@/api/workspace'
import type { StatusState } from '@/types/ui'

/**
 * 后端连通性探测：状态与副作用都收在这里，视图只消费投影。
 * 卸载时必须 abort（skill 的 composables 约定），重复点击也会取消上一次请求。
 *
 * 两个投影互不替代：state 表示「传输层通不通」（有没有拿到 HTTP 响应），
 * outcome 表示「后端 status 字段判出来的正常 / 异常」，异常原因取后端 message。
 */
export function useBackendHealth() {
  const state = shallowRef<StatusState>('idle')
  const outcome = shallowRef<HealthOutcome | null>(null)
  let controller: AbortController | null = null
  let seq = 0

  const healthPath = `${API_BASE_URL}${HEALTH_PATH}`
  const isChecking = computed<boolean>(() => state.value === 'checking')
  /** 还没发起检测时为空串，视图据此决定要不要显示状态标记 */
  const outcomeLabel = computed<string>(() => {
    const current = outcome.value
    if (current === null) {
      return ''
    }
    return current.normal ? '正常' : '异常'
  })
  const outcomeClass = computed<string>(() => {
    const current = outcome.value
    if (current === null) {
      return ''
    }
    return current.normal ? 'pill--success' : 'pill--danger'
  })
  /** 只有异常才有文案要展示；正常不回显原始响应 */
  const reason = computed<string>(() => {
    const current = outcome.value
    if (current === null || current.normal) {
      return ''
    }
    return current.reason
  })

  async function probe(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    const signal = controller.signal
    const requestSeq = ++seq
    state.value = 'checking'

    try {
      const data = await checkHealth({ signal })
      if (requestSeq !== seq) {
        return
      }
      state.value = 'online'
      outcome.value = classifyHealth(data)
    } catch (error) {
      // 被新一次检测或卸载取消的旧请求不能改写状态，否则会把新请求的「检测中」擦成别的值
      if (requestSeq !== seq) {
        return
      }
      const code = isApiError(error) ? error.code : 'UNKNOWN'
      if (code !== 'CANCELED') {
        const message = error instanceof Error ? error.message : String(error)
        state.value = 'offline'
        outcome.value = { status: '', normal: false, reason: message || '后端未返回异常原因' }
      }
    } finally {
      if (requestSeq === seq) {
        controller = null
      }
    }
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  return {
    state,
    outcome,
    outcomeLabel,
    outcomeClass,
    reason,
    healthPath,
    isChecking,
    probe
  }
}
