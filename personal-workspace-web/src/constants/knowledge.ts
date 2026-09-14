// 知识库模块的纯常量：只做「状态 → 展示」的映射，不含任何库/文档/分片数据。
// 列表数据全部来自后端；后端未实现时页面点名端点（issue R21）。
import type { DocumentStatus } from '@/types/knowledge'

export const STATUS_PRESENTATION: Record<DocumentStatus, { label: string; tone: 'success' | 'info' | 'warning' | 'danger' }> = {
  pending: { label: '排队中', tone: 'warning' },
  parsing: { label: '解析中', tone: 'info' },
  chunking: { label: '分片中', tone: 'info' },
  embedding: { label: '向量化', tone: 'warning' },
  indexing: { label: '索引中', tone: 'info' },
  ready: { label: '已索引', tone: 'success' },
  failed: { label: '解析失败', tone: 'danger' }
}

/** 召回测试输入框的占位提示：只在用户没输入时显示，不作为默认检索语句 */
export const RECALL_QUERY_PLACEHOLDER = '输入一句自然语言，测试知识库召回质量'
