// 知识库模块的假数据，与 demo/assets/prototype.js 的 KB_DATA 与 knowledge.html 表格行同源。
import type { DocumentChunk, DocumentStatus, KbDocument, RecallHit } from '@/types/knowledge'

export const MOCK_KB_IDS = ['kb-arch', 'kb-product', 'kb-personal', 'kb-code'] as const

type RawDoc = [name: string, type: KbDocument['type'], sizeLabel: string, chunkCount: number, status: DocumentStatus, updatedAtLabel: string]

interface RawKb {
  name: string
  description: string
  /** 库整体状态，对应原型侧栏行尾的 pill */
  status: KbDocument['status'] | 'syncing'
  docs: RawDoc[]
}

const rawDoc = (name: string, type: RawDoc[1], sizeLabel: string, chunkCount: number, status: DocumentStatus, updatedAtLabel: string): RawDoc =>
  [name, type, sizeLabel, chunkCount, status, updatedAtLabel]

export const MOCK_KNOWLEDGE_BASES: Record<string, RawKb> = {
  'kb-arch': {
    name: '架构决策库',
    description: 'ADR、技术选型记录、接口约定。回答技术方案类问题时优先召回。',
    status: 'ready',
    docs: [
      rawDoc('ADR-001 采用 Vue CLI 5 而非 Vite.docx', 'DOCX', '48 KB', 12, 'ready', '2 小时前'),
      rawDoc('AGENTS.md 前端约束汇编.md', 'MD', '9 KB', 7, 'ready', '5 小时前'),
      rawDoc('后端接口约定 v0.md', 'MD', '14 KB', 18, 'indexing', '今天 09:12'),
      rawDoc('请求层时序图（外链）', 'URL', '—', 3, 'ready', '昨天 21:40'),
      rawDoc('风险清单 R1-R7.pdf', 'PDF', '860 KB', 26, 'failed', '昨天 18:05')
    ]
  },
  'kb-product': {
    name: '产品与需求',
    description: 'PRD、原型说明、用户反馈。回答需求背景类问题时召回。',
    status: 'ready',
    docs: [
      rawDoc('个人 AI 工作台 PRD v0.3.md', 'MD', '32 KB', 41, 'ready', '3 天前'),
      rawDoc('对话模块需求拆解.docx', 'DOCX', '120 KB', 23, 'ready', '3 天前'),
      rawDoc('知识库模块需求拆解.docx', 'DOCX', '98 KB', 19, 'pending', '1 天前'),
      rawDoc('用户反馈精选（2026-08）.pdf', 'PDF', '1.4 MB', 57, 'ready', '1 周前')
    ]
  },
  'kb-personal': {
    name: '个人笔记',
    description: '日常纪要、读书卡片、待办复盘。仅本地向量库，不参与联网检索。',
    status: 'syncing',
    docs: [
      rawDoc('周复盘模板.md', 'MD', '4 KB', 5, 'ready', '今天 08:30'),
      rawDoc('2026-08 月度回顾.md', 'MD', '18 KB', 22, 'ready', '8 月 31 日'),
      rawDoc('读书笔记：思考的快慢.md', 'MD', '26 KB', 31, 'pending', '8 月 26 日')
    ]
  },
  'kb-code': {
    name: '代码片段库',
    description: '常用脚手架、组件片段、排障命令。开启后可在对话里 @引用。',
    status: 'indexing',
    docs: [
      rawDoc('Vue3 组合式 API 片段.md', 'MD', '11 KB', 28, 'ready', '4 小时前'),
      rawDoc('axios 拦截器模板.ts.txt', 'TXT', '3 KB', 4, 'ready', '昨天 22:10'),
      rawDoc('Nginx 反向代理配置片段.md', 'MD', '6 KB', 9, 'indexing', '今天 10:02')
    ]
  }
}

function toDocument(kbId: string, index: number, raw: RawDoc): KbDocument {
  return {
    id: `${kbId}-doc-${index + 1}`,
    name: raw[0],
    type: raw[1],
    sizeLabel: raw[2],
    chunkCount: raw[3],
    status: raw[4],
    updatedAtLabel: raw[5],
    embeddingModel: raw[4] === 'ready' ? 'bge-m3' : '—',
    citedTimes: raw[4] === 'ready' ? 7 : 0,
    citedSessions: raw[4] === 'ready' ? 3 : 0
  }
}

export const MOCK_DOCUMENTS: Record<string, KbDocument[]> = Object.fromEntries(
  Object.entries(MOCK_KNOWLEDGE_BASES).map(([kbId, kb]) => [kbId, kb.docs.map((raw, index) => toDocument(kbId, index, raw))])
)

/** 状态 → 文案与色调，对应 prototype.js 的 STATUS_TEXT */
export const STATUS_PRESENTATION: Record<DocumentStatus, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' }> = {
  pending: { label: '排队中', tone: 'warning' },
  parsing: { label: '解析中', tone: 'info' },
  chunking: { label: '分片中', tone: 'info' },
  embedding: { label: '向量化', tone: 'warning' },
  indexing: { label: '索引中', tone: 'info' },
  ready: { label: '已索引', tone: 'success' },
  failed: { label: '解析失败', tone: 'danger' }
}

export const DEFAULT_EMBEDDING_MODEL = 'bge-m3'

export const DEFAULT_RERANKER = 'bge-reranker'

export const INDEX_SERVICE = {
  queueLabel: '4 个任务',
  progressPercent: 62,
  embeddingModel: 'bge-m3',
  chunkShape: '512 / 64',
  diskLabel: '1.8 / 20 GB'
} as const

/** 上传队列的阶段，与 prototype.js 的 stages 一一对应 */
export const UPLOAD_STAGES: Array<{ progress: number; status: DocumentStatus }> = [
  { progress: 32, status: 'parsing' },
  { progress: 68, status: 'chunking' },
  { progress: 92, status: 'embedding' },
  { progress: 100, status: 'ready' }
]

export const UPLOAD_STEP_MS = 800

export const UPLOAD_FIRST_STEP_MS = 600

/** 抽屉里的分片预览，对应 knowledge.html 手写的三条 .chunk */
export const MOCK_CHUNKS: DocumentChunk[] = [
  {
    index: 1,
    totalChunks: 12,
    rangeLabel: '0–512 字',
    hitRate: 0.34,
    text: '本记录讨论构建链选型：Vue CLI 5（webpack 5）与 Vite 的取舍。结论是保留 Vue CLI，团队已有 webpack 配置经验，且 Vite 与 `@vue/cli-plugin-eslint` 的集成不成熟。'
  },
  {
    index: 4,
    totalChunks: 12,
    rangeLabel: '1,536–2,048 字',
    hitRate: 0.92,
    text: '对话接口统一走 SSE 流式，前端用 fetch + ReadableStream 解析增量，超时上限沿用 15s；不使用 axios 的 stream responseType。'
  },
  {
    index: 9,
    totalChunks: 12,
    rangeLabel: '3,584–4,096 字',
    hitRate: 0.51,
    text: '知识库检索参数默认 Top-K=3、阈值 0.55，可在会话参数面板按会话覆盖；系统级默认值来自环境变量 `VUE_APP_RETRIEVAL_TOPK`（待引入）。'
  }
]

/** 召回测试的命中结果，对应 prototype.js 的 runRecall() */
export const MOCK_RECALL_HITS: RecallHit[] = [
  {
    docName: 'ADR-001 采用 Vue CLI 5 而非 Vite',
    chunkLabel: '第 4 / 12 片',
    score: 0.92,
    segments: [
      { text: '对话接口统一走 ', marked: false },
      { text: 'SSE 流式', marked: true },
      { text: '，前端用 fetch + ReadableStream 解析增量，超时上限沿用 15s。', marked: false }
    ]
  },
  {
    docName: '后端接口约定 v0',
    chunkLabel: '第 2 / 18 片',
    score: 0.81,
    segments: [
      { text: '/chat/completions', marked: true },
      { text: ' 返回 delta 数组，末包携带 usage 与 citations，用于渲染引用来源。', marked: false }
    ]
  },
  {
    docName: 'AGENTS.md 前端约束汇编',
    chunkLabel: '第 1 / 7 片',
    score: 0.63,
    segments: [
      { text: '组件不得直接 import axios，只经 ', marked: false },
      { text: 'src/api/http.ts', marked: true },
      { text: '；流式逻辑下沉到 composables/useChatStream.ts。', marked: false }
    ]
  }
]

export const DEFAULT_RECALL_QUERY = '对话模块的流式响应怎么做？'

/** 原型侧栏「对话可引用」与参数面板里的引用来源 */
export const DEFAULT_SELECTED_KB_IDS = ['kb-arch', 'kb-code']

/** 库在对话参数面板里展示的代表类型（纯展示用的假数据） */
export const LIBRARY_REPRESENTATIVE_TYPE: Record<string, KbDocument['type']> = {
  'kb-arch': 'DOCX',
  'kb-product': 'DOCX',
  'kb-personal': 'MD',
  'kb-code': 'MD'
}
