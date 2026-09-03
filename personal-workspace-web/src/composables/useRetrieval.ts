import { computed, onScopeDispose, shallowRef } from 'vue'
import { isApiError } from '@/api/http'
import { retrieve } from '@/api/knowledge'
import { DEFAULT_RECALL_QUERY } from '@/constants/knowledge'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { RecallResult } from '@/types/knowledge'

/**
 * 召回测试：调参与结果都是本面板的临时状态，不入 store（原型 README 的落点约定），
 * 结果不写入会话历史，因此卸载时直接取消请求即可。
 */
export function useRetrieval() {
  const knowledgeStore = useKnowledgeStore()
  const chatStore = useChatStore()

  const query = shallowRef(DEFAULT_RECALL_QUERY)
  const result = shallowRef<RecallResult | null>(null)
  const pending = shallowRef(false)
  const errorMessage = shallowRef('')
  let controller: AbortController | null = null

  const topK = computed({
    get: (): number => chatStore.params.topK,
    set: (value: number) => chatStore.setTopK(value)
  })
  const scoreThreshold = computed({
    get: (): number => chatStore.params.scoreThreshold,
    set: (value: number) => chatStore.setScoreThreshold(value)
  })

  const hasResult = computed<boolean>(() => result.value !== null)
  const summary = computed<string>(() => {
    const current = result.value
    if (!current) {
      return ''
    }
    return `检索语句：${current.query} · 向量模型 ${current.embeddingModel} · Top-K ${topK.value} · 阈值 ${scoreThreshold.value.toFixed(2)} · 耗时 ${current.elapsedMs}ms`
  })

  async function run(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    pending.value = true
    errorMessage.value = ''
    const statement = query.value.trim() || DEFAULT_RECALL_QUERY

    try {
      result.value = await retrieve(
        knowledgeStore.activeKbId,
        statement,
        { topK: topK.value, scoreThreshold: scoreThreshold.value, hybrid: true, rerank: true },
        { signal: controller.signal }
      )
    } catch (error) {
      if (isApiError(error) && error.code === 'CANCELED') {
        return
      }
      errorMessage.value = error instanceof Error ? error.message : String(error)
    } finally {
      pending.value = false
    }
  }

  onScopeDispose(() => {
    controller?.abort()
    controller = null
  })

  return {
    query,
    topK,
    scoreThreshold,
    result,
    summary,
    hasResult,
    isPending: computed<boolean>(() => pending.value),
    errorMessage,
    run
  }
}
