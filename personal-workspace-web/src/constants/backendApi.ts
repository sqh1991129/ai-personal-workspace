// 后端接口对接登记表：页面上「哪些功能还依赖后台对接」的唯一事实来源。
// 纯常量（src/constants 不得依赖 Vue 运行时）。path 含 VUE_APP_API_BASE 前缀，
// 由 scripts/verify/api-contract.ts 断言它与 src/api/* 导出的路径常量一致，防止两边漂移。
// 依据：docs/默认模块.md + 后端 personal-workspace-app 的 api/router.py 与 api/chat_router.py。

import { API_BASE_URL } from '@/api/http'

export type HttpVerb = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** 后端侧的实现状态。flawed = 路由存在但有阻断级缺陷，不能用。 */
export type BackendState = 'implemented' | 'flawed' | 'missing'

export type ContractStatus = 'connected' | 'blocked' | 'await-backend' | 'await-frontend'

export interface BackendApiEntry {
  verb: HttpVerb
  /** 前端当前实际请求的完整路径（模板段用 {param} 表示） */
  path: string
  /** 对应的界面能力，用用户能看懂的说法 */
  feature: string
  /** 前端调用点；空串 = 前端还没接这个端点 */
  calledBy: string
  backend: BackendState
  /** docs/默认模块.md 是否已定义该契约 */
  inDoc: boolean
  note?: string
}

export const BACKEND_API_ENTRIES: BackendApiEntry[] = [
  {
    verb: 'GET',
    path: `${API_BASE_URL}/v1/users/health`,
    feature: '后端连通性探测',
    calledBy: 'src/api/workspace.ts → 总览页「后端连通性」卡片',
    backend: 'implemented',
    inDoc: true
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/v1/users/userLogin`,
    feature: '登录换取 JWT',
    calledBy: 'src/api/auth.ts → loginWithServer()',
    backend: 'implemented',
    inDoc: true,
    note: '只要接口返回了token即视为正常，取消 Mock'
  },
  {
    verb: 'GET',
    path: `${API_BASE_URL}/v1/chat/sessions`,
    feature: '对话页会话列表',
    calledBy: 'src/api/chat.ts → fetchSessions()',
    backend: 'missing',
    inDoc: false,
    note: '后端 /api/v1/chat 下只有 simpleChat 与 streamChat；前端路径已按 /v1 预留，真发请求会拿到 404'
  },
  {
    verb: 'GET',
    path: `${API_BASE_URL}/v1/chat/{sessionId}/messages`,
    feature: '打开会话拉历史消息',
    calledBy: 'src/api/chat.ts → fetchMessages()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'DELETE',
    path: `${API_BASE_URL}/v1/chat/{sessionId}`,
    feature: '删除会话',
    calledBy: 'src/api/chat.ts → deleteSession()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/v1/chat/simpleChat`,
    feature: '非流式问答（后端已就绪）',
    calledBy: '',
    backend: 'implemented',
    inDoc: false,
    note: '裸对象 { resText } 不套 BaseResponse，且要 Bearer token；前端只用流式，暂未接这条'
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/v1/chat/streamChat`,
    feature: '发消息与流式回答',
    calledBy: 'src/api/chat.ts → streamCompletion()',
    backend: 'flawed',
    inDoc: false,
    note: '前端已按 { code, message, data, status } 帧对接；后端缺陷见 R23：请求体只有 text（不带历史/知识库/参数），链路挂了 JsonOutputParser 但模型未开 JSON 模式，且该路由未做鉴权'
  },
  {
    verb: 'GET',
    path: `${API_BASE_URL}/kb`,
    feature: '知识库列表',
    calledBy: 'src/api/knowledge.ts → fetchKbSummaries()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'GET',
    path: `${API_BASE_URL}/kb/{kbId}/documents`,
    feature: '文档列表与索引状态',
    calledBy: 'src/api/knowledge.ts → fetchDocuments()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'GET',
    path: `${API_BASE_URL}/documents/{documentId}/chunks`,
    feature: '分片详情抽屉',
    calledBy: 'src/api/knowledge.ts → fetchChunks()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/kb/{kbId}/retrieve`,
    feature: '召回测试',
    calledBy: 'src/api/knowledge.ts → retrieve()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/kb/{kbId}/documents/{documentId}/reindex`,
    feature: '文档重新解析',
    calledBy: 'src/api/knowledge.ts → reindexDocument()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'DELETE',
    path: `${API_BASE_URL}/kb/{kbId}/documents/{documentId}`,
    feature: '删除文档',
    calledBy: 'src/api/knowledge.ts → removeDocument()',
    backend: 'missing',
    inDoc: false
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/kb/{kbId}/documents`,
    feature: '上传文件并入库',
    calledBy: '',
    backend: 'missing',
    inDoc: false,
    note: '前端上传区只做文件选择，选中后直接提示待对接；不再有本地假进度（issue R21）'
  },
  {
    verb: 'POST',
    path: `${API_BASE_URL}/kb`,
    feature: '新建知识库',
    calledBy: '',
    backend: 'missing',
    inDoc: false,
    note: '「新建知识库」按钮只提示缺口，不在本地追加一条后端不认识的记录'
  }
]

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  connected: '已对接',
  blocked: '已对接 · 后端有缺陷',
  'await-backend': '前端就绪 · 待后端',
  'await-frontend': '后端已有 · 待前端接'
}

/** 状态由两个事实派生：前端有没有调用点、后端有没有可用实现。 */
export function contractStatusOf(entry: BackendApiEntry): ContractStatus {
  if (!entry.calledBy) {
    return 'await-frontend'
  }
  if (entry.backend === 'missing') {
    return 'await-backend'
  }
  return entry.backend === 'flawed' ? 'blocked' : 'connected'
}
