import http, { type RequestOptions } from '@/api/http'
import type { DocumentChunk, DocumentStatus, KbDocument, KbSummary, RecallParams, RecallResult } from '@/types/knowledge'
import { fileTypeOf } from '@/utils/fileType'

/**
 * 知识库唯一的后端出口。后端目前没有任何 /api/kb 路由（issue R21），
 * 所以这里的请求都会失败，由 store 把错误文案显示到界面上——这是预期行为，
 * 不要在这里加兜底假数据：页面必须能区分「库里真的没文档」和「前端在演」。
 */
export const KB_PATH = '/kb'

const DOCUMENT_STATUSES: readonly DocumentStatus[] = ['pending', 'parsing', 'chunking', 'embedding', 'indexing', 'ready', 'failed']

function kbPath(kbId: string, suffix = ''): string {
  return `${KB_PATH}/${kbId}${suffix}`
}

/** 状态字段后端还没定义，取值只能是状态机里的一个，否则退回排队中。 */
function normalizeStatus(value: unknown): DocumentStatus {
  return DOCUMENT_STATUSES.includes(value as DocumentStatus) ? (value as DocumentStatus) : 'pending'
}

/** 响应体按「未知」处理：只取确定存在的字段，缺失就留空，不做文案兜底。 */
function readString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function readNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toList(raw: unknown): Array<Record<string, unknown>> {
  return Array.isArray(raw) ? (raw as Array<Record<string, unknown>>) : []
}

export async function fetchKbSummaries(options: RequestOptions = {}): Promise<KbSummary[]> {
  const raw = await http.get<unknown>(KB_PATH, { signal: options.signal })
  return toList(raw).map((item, index) => ({
    id: readString(item.id) || `kb-${index + 1}`,
    name: readString(item.name) || '未命名知识库',
    description: readString(item.description),
    documentCount: readNumber(item.documentCount),
    chunkCount: readNumber(item.chunkCount),
    status: normalizeStatus(item.status)
  }))
}

export async function fetchDocuments(kbId: string, options: RequestOptions = {}): Promise<KbDocument[]> {
  const raw = await http.get<unknown>(kbPath(kbId, '/documents'), { signal: options.signal })
  return toList(raw).map((item, index) => {
    const name = readString(item.name) || '未命名文档'
    return {
      id: readString(item.id) || `${kbId}-doc-${index + 1}`,
      name,
      type: fileTypeOf(name),
      sizeLabel: readString(item.sizeLabel) || '—',
      chunkCount: readNumber(item.chunkCount),
      status: normalizeStatus(item.status),
      updatedAtLabel: readString(item.updatedAtLabel),
      embeddingModel: readString(item.embeddingModel)
    }
  })
}

export async function fetchChunks(documentId: string, options: RequestOptions = {}): Promise<DocumentChunk[]> {
  const raw = await http.get<unknown>(`/documents/${documentId}/chunks`, { signal: options.signal })
  const list = toList(raw)
  return list.map((item, index) => ({
    index: readNumber(item.index) || index + 1,
    totalChunks: readNumber(item.totalChunks) || list.length,
    rangeLabel: readString(item.rangeLabel),
    hitRate: readNumber(item.hitRate),
    text: readString(item.text)
  }))
}

/** 召回测试：POST /api/kb/{id}/retrieve，命中文本按单段返回，未实现时报错给视图。 */
export async function retrieve(
  kbId: string,
  query: string,
  params: RecallParams,
  options: RequestOptions = {}
): Promise<RecallResult> {
  const raw = await http.post<Record<string, unknown>>(kbPath(kbId, '/retrieve'), { query, ...params }, { signal: options.signal })
  const hits = Array.isArray(raw.hits) ? (raw.hits as Array<Record<string, unknown>>) : []
  return {
    query,
    elapsedMs: readNumber(raw.elapsedMs),
    embeddingModel: readString(raw.embeddingModel),
    hits: hits.map((item) => ({
      docName: readString(item.docName),
      chunkLabel: readString(item.chunkLabel),
      score: readNumber(item.score),
      segments: [{ text: readString(item.text), marked: item.marked === true }]
    }))
  }
}

export function reindexDocument(kbId: string, documentId: string, options: RequestOptions = {}): Promise<void> {
  return http.post<void>(kbPath(kbId, `/documents/${documentId}/reindex`), undefined, { signal: options.signal })
}

export function removeDocument(kbId: string, documentId: string, options: RequestOptions = {}): Promise<void> {
  return http.delete<void>(kbPath(kbId, `/documents/${documentId}`), { signal: options.signal })
}
