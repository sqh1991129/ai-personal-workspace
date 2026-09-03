import http, { ApiError, type RequestOptions } from '@/api/http'
import {
  DEFAULT_EMBEDDING_MODEL,
  MOCK_CHUNKS,
  MOCK_KNOWLEDGE_BASES,
  MOCK_DOCUMENTS,
  MOCK_RECALL_HITS
} from '@/constants/knowledge'
import type { DocumentChunk, KbDocument, KbSummary, RecallParams, RecallResult } from '@/types/knowledge'

export const KB_PATH = '/kb'

export const IS_MOCK_KNOWLEDGE: boolean = process.env.VUE_APP_MOCK_API === 'true'

export const RETRIEVAL_LATENCY_MS = 240

function kbPath(kbId: string, suffix = ''): string {
  return `${KB_PATH}/${kbId}${suffix}`
}

function chunkLatency(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let timer = 0
    const cancel = () => {
      window.clearTimeout(timer)
      reject(new ApiError('请求已取消', { code: 'CANCELED' }))
    }
    if (signal?.aborted) {
      cancel()
      return
    }
    timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', cancel)
      resolve()
    }, ms)
    signal?.addEventListener('abort', cancel, { once: true })
  })
}

/** 后端返回体按「未知」处理：只取确定存在的字段，缺失时用假数据兜底 */
function countChunks(docs: KbDocument[]): number {
  return docs.reduce((sum, doc) => sum + doc.chunkCount, 0)
}

export async function fetchKbSummaries(options: RequestOptions = {}): Promise<KbSummary[]> {
  if (IS_MOCK_KNOWLEDGE) {
    return Object.entries(MOCK_KNOWLEDGE_BASES).map(([id, kb]) => {
      const docs = MOCK_DOCUMENTS[id] ?? []
      return {
        id,
        name: kb.name,
        description: kb.description,
        documentCount: docs.length,
        chunkCount: countChunks(docs),
        status: kb.status
      }
    })
  }
  const raw = await http.get<unknown>(KB_PATH, { signal: options.signal })
  const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []
  return list.map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `kb-${index + 1}`,
    name: typeof item.name === 'string' ? item.name : '未命名知识库',
    description: typeof item.description === 'string' ? item.description : '',
    documentCount: Number(item.documentCount) || 0,
    chunkCount: Number(item.chunkCount) || 0,
    status: 'ready'
  }))
}

export async function fetchDocuments(kbId: string, options: RequestOptions = {}): Promise<KbDocument[]> {
  if (IS_MOCK_KNOWLEDGE) {
    return (MOCK_DOCUMENTS[kbId] ?? []).map((doc) => ({ ...doc }))
  }
  const raw = await http.get<unknown>(kbPath(kbId, '/documents'), { signal: options.signal })
  const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []
  return list.map((item, index) => ({
    id: typeof item.id === 'string' ? item.id : `${kbId}-doc-${index + 1}`,
    name: typeof item.name === 'string' ? item.name : '未命名文档',
    type: 'MD',
    sizeLabel: typeof item.sizeLabel === 'string' ? item.sizeLabel : '—',
    chunkCount: Number(item.chunkCount) || 0,
    status: 'pending',
    updatedAtLabel: '',
    embeddingModel: DEFAULT_EMBEDDING_MODEL
  }))
}

export async function fetchChunks(documentId: string, options: RequestOptions = {}): Promise<DocumentChunk[]> {
  if (IS_MOCK_KNOWLEDGE) {
    return MOCK_CHUNKS.map((chunk) => ({ ...chunk }))
  }
  const raw = await http.get<unknown>(`/documents/${documentId}/chunks`, { signal: options.signal })
  const list = Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []
  return list.map((item, index) => ({
    index: Number(item.index) || index + 1,
    totalChunks: Number(item.totalChunks) || list.length,
    rangeLabel: typeof item.rangeLabel === 'string' ? item.rangeLabel : '',
    hitRate: Number(item.hitRate) || 0,
    text: typeof item.text === 'string' ? item.text : ''
  }))
}

/** 召回测试：假数据返回固定 3 条命中，真实分支 POST /api/kb/{id}/retrieve */
export async function retrieve(
  kbId: string,
  query: string,
  params: RecallParams,
  options: RequestOptions = {}
): Promise<RecallResult> {
  if (IS_MOCK_KNOWLEDGE) {
    await chunkLatency(RETRIEVAL_LATENCY_MS, options.signal)
    const hits = MOCK_RECALL_HITS.slice(0, params.topK).filter((hit) => hit.score >= params.scoreThreshold)
    return {
      query,
      elapsedMs: 118,
      embeddingModel: DEFAULT_EMBEDDING_MODEL,
      hits: hits.map((hit) => ({ ...hit, segments: hit.segments.map((segment) => ({ ...segment })) }))
    }
  }
  const raw = await http.post<Record<string, unknown>>(kbPath(kbId, '/retrieve'), { query, ...params }, { signal: options.signal })
  const list = Array.isArray(raw.hits) ? (raw.hits as Array<Record<string, unknown>>) : []
  return {
    query,
    elapsedMs: Number(raw.elapsedMs) || 0,
    embeddingModel: DEFAULT_EMBEDDING_MODEL,
    hits: list.map((item) => ({
      docName: typeof item.docName === 'string' ? item.docName : '',
      chunkLabel: typeof item.chunkLabel === 'string' ? item.chunkLabel : '',
      score: Number(item.score) || 0,
      segments: [{ text: typeof item.text === 'string' ? item.text : '', marked: false }]
    }))
  }
}

export function reindexDocument(kbId: string, documentId: string, options: RequestOptions = {}): Promise<void> {
  if (IS_MOCK_KNOWLEDGE) {
    return Promise.resolve()
  }
  return http.post<void>(kbPath(kbId, `/documents/${documentId}/reindex`), undefined, { signal: options.signal })
}

export function removeDocument(kbId: string, documentId: string, options: RequestOptions = {}): Promise<void> {
  if (IS_MOCK_KNOWLEDGE) {
    return Promise.resolve()
  }
  return http.delete<void>(kbPath(kbId, `/documents/${documentId}`), { signal: options.signal })
}
