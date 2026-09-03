// 知识库模块的数据契约：库 / 文档 / 分片 / 召回命中。
// 索引状态机与原型一致：排队中 → 解析中 → 分片中 → 向量化 → 已索引，任一环节失败进入解析失败。
export type DocumentStatus = 'pending' | 'parsing' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'failed'

export type FileType = 'PDF' | 'DOCX' | 'MD' | 'TXT' | 'URL' | 'NEW'

export interface KbSummary {
  id: string
  name: string
  description: string
  documentCount: number
  chunkCount: number
  status: DocumentStatus | 'syncing'
}

export interface KbDocument {
  id: string
  name: string
  type: FileType
  sizeLabel: string
  chunkCount: number
  status: DocumentStatus
  updatedAtLabel: string
  embeddingModel: string
  /** 对话里被引用的次数，抽屉「被引用次数」一行用 */
  citedTimes?: number
  citedSessions?: number
}

export interface DocumentChunk {
  index: number
  totalChunks: number
  rangeLabel: string
  hitRate: number
  text: string
}

/** 命中文本的一段：marked = true 时高亮显示（对应原型的 <mark>） */
export interface RecallSegment {
  text: string
  marked: boolean
}

export interface RecallHit {
  docName: string
  chunkLabel: string
  score: number
  /** 分段描述而非 HTML 字符串，渲染时不使用 v-html */
  segments: RecallSegment[]
}

export interface RecallParams {
  topK: number
  scoreThreshold: number
  hybrid: boolean
  rerank: boolean
}

export interface RecallResult {
  query: string
  elapsedMs: number
  embeddingModel: string
  hits: RecallHit[]
}

export interface UploadTask {
  id: string
  fileName: string
  progress: number
  status: DocumentStatus
}
