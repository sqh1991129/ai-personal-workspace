import { API_BASE_URL } from '@/api/http'
import { KB_PATH } from '@/api/knowledge'
import { useToastStore } from '@/stores/toast'

/**
 * 上传入口。后端还没有上传端点，所以这里只点名待对接的接口，
 * 不再演「上传 → 解析 → 分片 → 向量化 → 已索引」的本地假进度（issue R21）：
 * 进度、耗时和「已完成索引」的提示全是编的，只会让人以为后台已经接好了。
 */
export function useUploadQueue() {
  const toastStore = useToastStore()

  function enqueue(fileName: string): void {
    toastStore.notify(`「${fileName}」未上传：待后端实现 POST ${API_BASE_URL}${KB_PATH}/{kbId}/documents`)
  }

  return { enqueue }
}
