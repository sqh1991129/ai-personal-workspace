import { defineStore } from 'pinia'
import { fetchChunks, fetchKbSummaries, fetchDocuments, removeDocument, reindexDocument } from '@/api/knowledge'
import {
  MOCK_KB_IDS,
  MOCK_KNOWLEDGE_BASES,
  UPLOAD_FIRST_STEP_MS,
  UPLOAD_STAGES,
  UPLOAD_STEP_MS
} from '@/constants/knowledge'
import type { DocumentChunk, DocumentStatus, KbDocument, KbSummary, UploadTask } from '@/types/knowledge'

export interface KnowledgeState {
  libraries: KbSummary[]
  activeKbId: string
  documentsByKb: Record<string, KbDocument[]>
  /** 抽屉：当前打开的文档 id，null = 关闭 */
  activeDocumentId: string | null
  activeDocumentChunks: DocumentChunk[]
  uploadTasks: UploadTask[]
  /** 最近一次完成索引的文件名，供视图层提示（避免 store 依赖 toast store） */
  lastIndexedFile: string
  /** 本地新增（模拟上传完成）的文档，按库归集 */
  addedDocuments: Record<string, KbDocument[]>
  statusFilter: 'all' | DocumentStatus
  keyword: string
  loadingLibraries: boolean
  loadingDocuments: boolean
  loadingChunks: boolean
  listError: string
}

let uploadSeq = 0

function nextUploadId(): string {
  uploadSeq += 1
  return `upload-${uploadSeq}`
}

export const useKnowledgeStore = defineStore('knowledge', {
  state: (): KnowledgeState => ({
    libraries: [],
    activeKbId: MOCK_KB_IDS[0],
    documentsByKb: {},
    activeDocumentId: null,
    activeDocumentChunks: [],
    uploadTasks: [],
    lastIndexedFile: '',
    addedDocuments: {},
    statusFilter: 'all',
    keyword: '',
    loadingLibraries: false,
    loadingDocuments: false,
    loadingChunks: false,
    listError: ''
  }),
  getters: {
    activeLibrary: (state): KbSummary | null => state.libraries.find((kb) => kb.id === state.activeKbId) ?? null,
    /** 原型语义：后端描述字段尚未稳定时用本地常量兜底 */
    activeLibraryDescription: (state): string =>
      state.libraries.find((kb) => kb.id === state.activeKbId)?.description ??
      MOCK_KNOWLEDGE_BASES[state.activeKbId]?.description ??
      '',
    activeDocuments: (state): KbDocument[] => {
      const stored = state.documentsByKb[state.activeKbId] ?? []
      const added = state.addedDocuments[state.activeKbId] ?? []
      return [...added, ...stored]
    },
    visibleDocuments(): KbDocument[] {
      const keyword = this.keyword.trim().toLowerCase()
      return this.activeDocuments.filter((doc) => {
        const matchKeyword = keyword.length === 0 || doc.name.toLowerCase().includes(keyword)
        const matchStatus = this.statusFilter === 'all' || doc.status === this.statusFilter
        return matchKeyword && matchStatus
      })
    },
    activeDocument(state): KbDocument | null {
      const all = Object.values(state.documentsByKb).flat().concat(Object.values(state.addedDocuments).flat())
      return all.find((doc) => doc.id === state.activeDocumentId) ?? null
    },
    libraryMetrics(): { documentCount: number; chunkCount: number; readyLabel: string } {
      const docs = this.activeDocuments
      return {
        documentCount: docs.length,
        chunkCount: docs.reduce((sum, doc) => sum + doc.chunkCount, 0),
        readyLabel: `${docs.filter((doc) => doc.status === 'ready').length}/${docs.length}`
      }
    }
  },
  actions: {
    async load(signal?: AbortSignal): Promise<void> {
      await Promise.all([this.loadLibraries(signal), this.openLibrary(this.activeKbId, signal)])
    },
    async loadLibraries(signal?: AbortSignal): Promise<void> {
      if (this.libraries.length > 0 || this.loadingLibraries) {
        return
      }
      this.loadingLibraries = true
      this.listError = ''
      try {
        this.libraries = await fetchKbSummaries({ signal })
      } catch (error) {
        this.listError = describeError(error)
      } finally {
        this.loadingLibraries = false
      }
    },
    async openLibrary(kbId: string, signal?: AbortSignal): Promise<void> {
      this.activeKbId = kbId
      this.statusFilter = 'all'
      this.keyword = ''
      this.activeDocumentId = null
      if (this.documentsByKb[kbId]) {
        return
      }
      this.loadingDocuments = true
      try {
        this.documentsByKb[kbId] = await fetchDocuments(kbId, { signal })
      } catch (error) {
        this.documentsByKb[kbId] = []
        this.listError = describeError(error)
      } finally {
        this.loadingDocuments = false
      }
    },
    setStatusFilter(status: KnowledgeState['statusFilter']): void {
      this.statusFilter = status
    },
    setKeyword(keyword: string): void {
      this.keyword = keyword
    },
    async openDocument(documentId: string, signal?: AbortSignal): Promise<void> {
      this.activeDocumentId = documentId
      this.loadingChunks = true
      try {
        this.activeDocumentChunks = await fetchChunks(documentId, { signal })
      } catch (error) {
        this.activeDocumentChunks = []
        this.listError = describeError(error)
      } finally {
        this.loadingChunks = false
      }
    },
    closeDocument(): void {
      this.activeDocumentId = null
      this.activeDocumentChunks = []
    },
    /** 模拟上传：排队 → 解析 → 分片 → 向量化 → 已索引，然后入表 */
    simulateUpload(fileName: string): string {
      const taskId = nextUploadId()
      this.uploadTasks = [...this.uploadTasks, { id: taskId, fileName, progress: 4, status: 'pending' }]
      this.advanceUpload(taskId, 0, UPLOAD_FIRST_STEP_MS)
      return taskId
    },
    /**
     * 定时器持有在 store 里：离开页面后队列继续推进（与原型的「后台索引」语义一致），
     * 回调只写 store 状态，不捕获组件实例，因此不会造成卸载泄漏。
     */
    advanceUpload(taskId: string, stage: number, delayMs: number): void {
      window.setTimeout(() => {
        const task = this.uploadTasks.find((item) => item.id === taskId)
        if (!task) {
          return
        }
        if (stage >= UPLOAD_STAGES.length) {
          this.finishUpload(task)
          return
        }
        task.progress = UPLOAD_STAGES[stage].progress
        task.status = UPLOAD_STAGES[stage].status
        this.advanceUpload(taskId, stage + 1, UPLOAD_STEP_MS)
      }, delayMs)
    },
    finishUpload(task: UploadTask): void {
      const kbId = this.activeKbId
      const document: KbDocument = {
        id: `${kbId}-doc-new-${task.id}`,
        name: task.fileName,
        type: 'MD',
        sizeLabel: '12 KB',
        chunkCount: 16,
        status: 'ready',
        updatedAtLabel: '刚刚',
        embeddingModel: 'bge-m3',
        citedTimes: 0,
        citedSessions: 0
      }
      this.uploadTasks = this.uploadTasks.filter((item) => item.id !== task.id)
      this.addedDocuments = { ...this.addedDocuments, [kbId]: [document, ...(this.addedDocuments[kbId] ?? [])] }
      this.lastIndexedFile = task.fileName
    },
    async reindex(documentId: string, signal?: AbortSignal): Promise<void> {
      const kbId = this.activeKbId
      await reindexDocument(kbId, documentId, { signal })
      const docs = this.documentsByKb[kbId] ?? []
      this.documentsByKb[kbId] = docs.map((doc) => (doc.id === documentId ? { ...doc, status: 'indexing' } : doc))
    },
    async removeDoc(documentId: string, signal?: AbortSignal): Promise<void> {
      const kbId = this.activeKbId
      try {
        await removeDocument(kbId, documentId, { signal })
      } catch (error) {
        this.listError = describeError(error)
      }
      this.documentsByKb = { ...this.documentsByKb, [kbId]: (this.documentsByKb[kbId] ?? []).filter((doc) => doc.id !== documentId) }
      this.addedDocuments = { ...this.addedDocuments, [kbId]: (this.addedDocuments[kbId] ?? []).filter((doc) => doc.id !== documentId) }
      if (this.activeDocumentId === documentId) {
        this.closeDocument()
      }
    },
    createLibrary(name: string): void {
      const id = `kb-custom-${this.libraries.length + 1}`
      this.libraries = [
        ...this.libraries,
        { id, name, description: '本地新建的知识库，等待上传文档后建立索引。', documentCount: 0, chunkCount: 0, status: 'pending' }
      ]
      this.documentsByKb = { ...this.documentsByKb, [id]: [] }
      this.activeKbId = id
    }
  }
})

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
