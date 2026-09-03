import { computed, watch } from 'vue'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useToastStore } from '@/stores/toast'

/**
 * 上传队列的编排：入队与阶段推进交给 store（离开页面仍继续索引），
 * 完成提示留在这里——toast 属于视图层副作用，watcher 随作用域销毁自动解绑。
 */
export function useUploadQueue() {
  const knowledgeStore = useKnowledgeStore()
  const toastStore = useToastStore()

  const hasTasks = computed<boolean>(() => knowledgeStore.uploadTasks.length > 0)

  watch(
    () => knowledgeStore.lastIndexedFile,
    (fileName) => {
      if (fileName) {
        toastStore.notify(`${fileName} 已完成索引，可被对话引用`)
      }
    }
  )

  function enqueue(fileName: string): void {
    knowledgeStore.simulateUpload(fileName)
  }

  return { hasTasks, enqueue }
}
