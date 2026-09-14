import { defineStore } from 'pinia'
import { fetchChunks, fetchKbSummaries, fetchDocuments, removeDocument, reindexDocument } from '@/api/knowledge'
import type { DocumentChunk, DocumentStatus, KbDocument, KbSummary } from '@/types/knowledge'

export interface KnowledgeState {
  libraries: KbSummary[]
  /** 空字符串 = 还没有选中库（后端没有库，就不预设一个假的） */
  activeKbId: string
  documentsByKb: Record<string, KbDocument[]>
  /** 抽屉：当前打开的文档 id，null = 关闭 */
  activeDocumentId: string | null
  activeDocumentChunks: DocumentChunk[]
  statusFilter: 'all' | DocumentStatus
  keyword: string
  loadingLibraries: boolean
  loadingDocuments: boolean
  loadingChunks: boolean
  listError: string
}

export const useKnowledgeStore = defineStore('knowledge', {
  state: (): KnowledgeState => ({
    libraries: [],
    activeKbId: '',
    documentsByKb: {},
    activeDocumentId: null,
    activeDocumentChunks: [],
    statusFilter: 'all',
    keyword: '',
    loadingLibraries: false,
    loadingDocuments: false,
    loadingChunks: false,
    listError: ''
  }),
  getters: {
    activeLibrary: (state): KbSummary | null => state.libraries.find((kb) => kb.id === state.activeKbId) ?? null,
    activeLibraryDescription: (state): string =>
      state.libraries.find((kb) => kb.id === state.activeKbId)?.description ?? '',
    activeDocuments: (state): KbDocument[] => state.documentsByKb[state.activeKbId] ?? [],
    visibleDocuments(): KbDocument[] {
      const keyword = this.keyword.trim().toLowerCase()
      return this.activeDocuments.filter((doc) => {
        const matchKeyword = keyword.length === 0 || doc.name.toLowerCase().includes(keyword)
        const matchStatus = this.statusFilter === 'all' || doc.status === this.statusFilter
        return matchKeyword && matchStatus
      })
    },
    activeDocument(state): KbDocument | null {
      const all = Object.values(state.documentsByKb).flat()
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
      await this.loadLibraries(signal)
      // 库列表拉不到就不继续开库：否则会再打一个 GET /api/kb//documents
      if (!this.activeKbId) {
        return
      }
      await this.openLibrary(this.activeKbId, signal)
    },
    async loadLibraries(signal?: AbortSignal): Promise<void> {
      if (this.libraries.length > 0 || this.loadingLibraries) {
        return
      }
      this.loadingLibraries = true
      this.listError = ''
      try {
        this.libraries = await fetchKbSummaries({ signal })
        if (!this.activeKbId && this.libraries.length > 0) {
          this.activeKbId = this.libraries[0].id
        }
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
      if (!kbId || this.documentsByKb[kbId]) {
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
    /** 返回 false = 后端没成功，调用方（视图）就不该弹「已排队」这类成功提示 */
    async reindex(documentId: string, signal?: AbortSignal): Promise<boolean> {
      const kbId = this.activeKbId
      try {
        await reindexDocument(kbId, documentId, { signal })
      } catch (error) {
        this.listError = describeError(error)
        // 后端没成功就不改本地状态：界面显示「索引中」而后端什么都不知道，是骗人
        return false
      }
      const docs = this.documentsByKb[kbId] ?? []
      this.documentsByKb[kbId] = docs.map((doc) => (doc.id === documentId ? { ...doc, status: 'indexing' } : doc))
      return true
    },
    async removeDoc(documentId: string, signal?: AbortSignal): Promise<boolean> {
      const kbId = this.activeKbId
      try {
        await removeDocument(kbId, documentId, { signal })
      } catch (error) {
        this.listError = describeError(error)
        return false
      }
      this.documentsByKb = { ...this.documentsByKb, [kbId]: (this.documentsByKb[kbId] ?? []).filter((doc) => doc.id !== documentId) }
      if (this.activeDocumentId === documentId) {
        this.closeDocument()
      }
      return true
    },
  }
})

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
