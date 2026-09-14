import { computed, onScopeDispose, shallowRef } from 'vue'
import { isApiError } from '@/api/http'
import { retrieve } from '@/api/knowledge'
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

  const query = shallowRef('')
  const hybrid = shallowRef(true)
  const rerank = shallowRef(true)
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
  // 只拼后端真给回来的字段：没有向量模型名 / 没有耗时就整段省略，不用 0 或假名字占位
  const summary = computed<string>(() => {
    const current = result.value
    if (!current) {
      return ''
    }
    const parts = [`检索语句：${current.query}`, `Top-K ${topK.value}`, `阈值 ${scoreThreshold.value.toFixed(2)}`]
    if (current.embeddingModel) {
      parts.splice(1, 0, `向量模型 ${current.embeddingModel}`)
    }
    if (current.elapsedMs > 0) {
      parts.push(`耗时 ${current.elapsedMs}ms`)
    }
    return parts.join(' · ')
  })

  async function run(): Promise<void> {
    controller?.abort()
    controller = new AbortController()
    pending.value = true
    errorMessage.value = ''
    result.value = null
    const statement = query.value.trim()
    if (!statement) {
      errorMessage.value = '请先输入检索语句'
      pending.value = false
      return
    }
    const kbId = knowledgeStore.activeKbId
    if (!kbId) {
      errorMessage.value = '还没有选中知识库，先等后端提供 GET /api/kb 再测召回'
      pending.value = false
      return
    }
    try {
      result.value = await retrieve(
        kbId,
        statement,
        { topK: topK.value, scoreThreshold: scoreThreshold.value, hybrid: hybrid.value, rerank: rerank.value },
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
    hybrid,
    rerank,
    result,
    summary,
    hasResult,
    isPending: computed<boolean>(() => pending.value),
    errorMessage,
    run
  }
}
