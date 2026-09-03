// 对话模块的假数据，与 demo/chat.html 首屏 + prototype.js 的 draftFor() 同源。
// 后端 /api/chat/* 就绪后由 src/api/chat.ts 切换（沿用 VUE_APP_MOCK_AUTH 的思路）。
import type { ChatDraft, ChatMessage, ChatSession } from '@/types/chat'

export const NEW_SESSION_ID = 'sess-new'

/** 原型侧栏的 7 个会话（分组标签 + 行尾时间 + 副标题） */
export const MOCK_SESSIONS: ChatSession[] = [
  {
    id: 'sess-1',
    title: '流式接口与停止生成',
    groupLabel: '今天',
    timeLabel: '10:24',
    summary: '12 条消息 · 引用 3 来源',
    icon: 'chat',
    messageCount: 12
  },
  {
    id: 'sess-2',
    title: '知识库分片策略评审',
    groupLabel: '今天',
    timeLabel: '09:05',
    summary: '8 条消息',
    icon: 'chat',
    messageCount: 8
  },
  {
    id: 'sess-3',
    title: '把 AGENTS.md 压成一页清单',
    groupLabel: '今天',
    timeLabel: '08:41',
    summary: '5 条消息',
    icon: 'bolt',
    messageCount: 5
  },
  {
    id: 'sess-4',
    title: 'Vue Router 标题与埋点方案',
    groupLabel: '昨天',
    timeLabel: '21:36',
    summary: '14 条消息',
    icon: 'chat',
    messageCount: 14
  },
  {
    id: 'sess-5',
    title: '周报草稿：前端基建进展',
    groupLabel: '昨天',
    timeLabel: '20:12',
    summary: '21 条消息',
    icon: 'chat',
    messageCount: 21
  },
  {
    id: 'sess-6',
    title: 'RAG 召回率偏低排查',
    groupLabel: '7 天内',
    timeLabel: '8 月 29 日',
    summary: '6 条消息',
    icon: 'chat',
    messageCount: 6
  },
  {
    id: 'sess-7',
    title: '本地模型量化选型',
    groupLabel: '7 天内',
    timeLabel: '8 月 27 日',
    summary: '9 条消息',
    icon: 'chat',
    messageCount: 9
  }
]

export const SESSION_GROUP_ORDER = ['今天', '昨天', '7 天内'] as const

/** 空会话引导，对应原型 .empty-thread 里的四条 suggestion */
export const SUGGESTIONS: Array<{ title: string; note: string; prompt: string }> = [
  {
    title: '整理提交前检查清单',
    note: '读取 AGENTS.md → 输出 lint / build / 文档同步三步',
    prompt: '帮我把 AGENTS.md 的约束整理成一页可执行的提交前检查清单'
  },
  { title: '技术选型对比', note: '引用架构决策库，给出结论与理由', prompt: '对比 SSE 与 WebSocket 在个人工作台的取舍，给出推荐' },
  { title: '本周知识摘要', note: '跨 4 个知识库做归纳', prompt: '总结本周知识库新增文档，按主题聚类并标注待办' },
  { title: '补测试用例思路', note: '覆盖取消、错误、增量拼接', prompt: '为 useChatStream 写一组 vitest 用例思路' }
]

/** 每 tick 吐出一个片段：4 字符 / 55ms ≈ 70 字符每秒，接近本地 14B 模型的观感 */
export const STREAM_TICK_MS = 55

export const STREAM_CHUNK_SIZE = 4

/** 非段落块（列表 / 标题 / 代码块）整块到达，间隔比吐字略长 */
export const STREAM_BLOCK_GAP_MS = 170

const SSE_CODE = [
  'export function useChatStream() {',
  '  const controller = new AbortController()',
  '',
  '  async function send(payload, onDelta) {',
  "    const res = await fetch('/api/chat/completions', {",
  "      method: 'POST',",
    "      headers: { 'Content-Type': 'application/json' },",
  '      body: JSON.stringify({ ...payload, stream: true }),',
  '      signal: controller.signal',
  '    })',
  '    // 逐行解析 data: {...}，累加到当前 assistant 消息',
  '  }',
  '',
  '  onScopeDispose(() => controller.abort())',
  '  return { send, abort: () => controller.abort() }',
  '}'
].join('\n')

/** 原型首屏 sess-1 的四条消息：正常回答 / 被停止的回答 / 失败气泡 */
const SEEDED_SESS_1: ChatMessage[] = [
  {
    id: 'msg-1-1',
    role: 'user',
    status: 'done',
    citations: [],
    timeLabel: '10:24',
    blocks: [{ kind: 'paragraph', text: '对话模块的流式响应接口应该怎么设计？前端要注意什么？' }]
  },
  {
    id: 'msg-1-2',
    role: 'assistant',
    status: 'done',
    timeLabel: '10:24',
    tokens: 412,
    elapsedMs: 1200,
    think: {
      seconds: 3.2,
      text: '先确认现有请求层约定（src/api/http.ts 统一超时与错误归一化）→ 判断流式不能用普通 axios 拦截器 → 检索 ADR-001 与接口约定 → 给出 SSE 方案与前端封装边界。'
    },
    citations: [
      { doc: 'ADR-001 采用 Vue CLI 5 而非 Vite', locator: '第 4 片' },
      { doc: '后端接口约定 v0.md', locator: '§3' },
      { doc: 'AGENTS.md', locator: '目录职责' }
    ],
    blocks: [
      { kind: 'paragraph', text: '结论：用 SSE（`text/event-stream`）+ fetch ReadableStream，不要用 axios 的 responseType:\'stream\'，浏览器端拿不到增量。' },
      { kind: 'heading', text: '接口约定' },
      {
        kind: 'list',
        ordered: false,
        items: [
          'POST `/api/chat/completions`，请求体带 `session_id`、`kb_ids`、`stream:true`。',
          '响应按包推送 `delta`，最后一包带 `usage` 与 `citations`，用于渲染 token 与引用来源。',
          '错误也走事件帧（`event: error`），前端统一降级为「重试」气泡。'
        ]
      },
      { kind: 'paragraph', text: '前端把这套逻辑收在 `composables/useChatStream.ts` 里，卸载时必须 abort：' },
      { kind: 'code', language: 'TYPESCRIPT', filename: 'src/composables/useChatStream.ts', code: SSE_CODE },
      { kind: 'paragraph', text: '另外三点容易漏：① 「停止生成」要保留已渲染内容而不是回滚；② 失败气泡与停止态视觉上必须可区分；③ 引用来源点击要能跳回知识库定位原文。' }
    ]
  },
  {
    id: 'msg-1-3',
    role: 'user',
    status: 'done',
    citations: [],
    timeLabel: '10:26',
    blocks: [{ kind: 'paragraph', text: '那「停止生成」和失败重试的 UI 状态怎么呈现？' }]
  },
  {
    id: 'msg-1-4',
    role: 'assistant',
    status: 'stopped',
    timeLabel: '10:27',
    stoppedTokens: 38,
    citations: [],
    tokens: 260,
    blocks: [
      { kind: 'paragraph', text: '三种状态要能被区分，右栏顶部就是当前状态说明：' },
      {
        kind: 'list',
        ordered: false,
        items: [
          '**生成中**：发送按钮变成红色方块「停止」，正文尾部保留光标 `▍`。',
          '**已停止**：保留已生成的部分，气泡下方标注「已停止 · 可继续或重新生成」。',
          '**失败**：气泡描边改为 danger，附一行错误摘要与「重试」按钮（见下一条示例）。'
        ]
      }
    ]
  },
  {
    id: 'msg-1-5',
    role: 'assistant',
    status: 'failed',
    timeLabel: '10:28',
    citations: [],
    error: 'ECONNREFUSED 127.0.0.1:8000 · 后端 personal-workspace-app 尚未提供 /api/chat/completions。开发期属预期结果。',
    blocks: [{ kind: 'paragraph', text: '**请求失败**，无法生成回答。' }]
  }
]

function seedPair(idPrefix: string, question: string, answer: string, timeLabel: string): ChatMessage[] {
  return [
    {
      id: `${idPrefix}-q`,
      role: 'user',
      status: 'done',
      citations: [],
      timeLabel,
      blocks: [{ kind: 'paragraph', text: question }]
    },
    {
      id: `${idPrefix}-a`,
      role: 'assistant',
      status: 'done',
      timeLabel,
      tokens: 168,
      elapsedMs: 940,
      citations: [],
      blocks: [{ kind: 'paragraph', text: answer }]
    }
  ]
}

const SEELED_OTHERS: Record<string, ChatMessage[]> = {
  'sess-2': [
    ...seedPair('msg-2-1', '512/64 的分片粒度还合适吗？', '按当前 4 个库的统计，512 字 + 64 重叠能把召回率稳在 0.8 以上；超长 ADR 建议先按二级标题切，再做 512 滑窗。', '09:02'),
    ...seedPair('msg-2-2', '外链文档怎么入库？', 'URL 类型走抓取正文 → 去导航 → 分片，抓取失败降级为「仅索引元信息」，在文档表格里显示为解析失败并可重试。', '09:05')
  ],
  'sess-3': seedPair('msg-3-1', '把 AGENTS.md 压成一页清单', '三步：① `npm run lint` 与 `npm run type-check` 均 0 error；② `npm run build` 成功且无 `.map`；③ 同步 `docs/PROJECT_ANALYSIS.md` 与 `docs/project-profile.json`。', '08:41'),
  'sess-4': seedPair('msg-4-1', '路由标题能不能统一在守卫里设置？', '可以，`router.afterEach` 读 `to.meta.title` 拼接 `VUE_APP_TITLE` 即可，布局为 blank 的登录页同样生效。', '21:36'),
  'sess-5': seedPair('msg-5-1', '周报里前端基建这段帮我润色', '本周完成 TS 5.4 迁移与 vue-tsc 门禁，新增登录闭环与外壳三栏布局；风险是后端契约未定，接口联调仍在等待。', '20:12'),
  'sess-6': seedPair('msg-6-1', '召回率偏低，先查哪一环？', '顺序建议：先看分片是否越界（命中率分布），再看向量模型维度与阈值 0.55 是否过严，最后确认 BM25 与向量是否真的走了混合检索。', '8 月 29 日'),
  'sess-7': seedPair('msg-7-1', '14B 本地模型选哪种量化？', 'Q4_K_M 在 32k 上下文下首字延迟约 860ms，质量损失可接受；若只做检索增强回答，Q4_K_S 再省一档显存。', '8 月 27 日')
}

/** 会话 id → 历史消息。缺省返回空数组，用于新建会话的空状态 */
export function seededMessages(sessionId: string): ChatMessage[] {
  if (sessionId === 'sess-1') {
    return SEEDED_SESS_1.map((message) => ({ ...message, blocks: message.blocks }))
  }
  return SEELED_OTHERS[sessionId] ?? []
}

// 以下两段与 prototype.js 的 draftFor() 逐句对应：命中代码类关键词走示例代码，其余走三段式回答。
const CODE_DRAFT: ChatDraft = {
  thinkSeconds: 2.4,
  think: '先判断意图偏代码生成 → 取「前端基建」知识库分片 → 校验 axios 封装约定 → 输出最小示例并附来源。',
  tokens: 236,
  elapsedMs: 1180,
  citations: [
    { doc: '前端基建说明.md', locator: '§2 请求层' },
    { doc: 'API 约定.md', locator: '/chat/completions' }
  ],
  blocks: [
    { kind: 'paragraph', text: '可以。下面是一段最小可运行示例，已按本仓库的 axios 封装习惯改写：' },
    {
      kind: 'code',
      language: 'TYPESCRIPT',
      filename: 'src/api/workspace.ts',
      code: [
        "import http from './http'",
        '',
        'export function chatCompletion(payload: ChatRequest) {',
        "  return http.post('/chat/completions', payload)",
        '}'
      ].join('\n')
    },
    { kind: 'paragraph', text: '要点：`src/api/http.ts` 统一处理超时与错误归一化，组件里不要直接引入 axios。' }
  ]
}

const GENERIC_DRAFT: ChatDraft = {
  thinkSeconds: 1.9,
  think: '识别为方案咨询 → 检索 AGENTS.md 与架构决策记录 → 汇总为结论/约束/行动三段式回答。',
  tokens: 288,
  elapsedMs: 1420,
  citations: [
    { doc: 'AGENTS.md', locator: '技术栈约束' },
    { doc: 'PROJECT_ANALYSIS.md', locator: '风险清单 R3' },
    { doc: '知识库/架构决策.md', locator: 'ADR-004' }
  ],
  blocks: [
    { kind: 'paragraph', text: '我把你的问题拆成三步来回答：' },
    {
      kind: 'list',
      ordered: true,
      items: [
        '**结论先行**：当前基建已就绪，可以直接按「对话 + 知识库」两条主线开发业务功能。',
        '**关键约束**：SFC 一律 `<script setup>`；后端调用只走 `src/api/`；颜色只用 `global.css` 的令牌。',
        '**下一步**：先落 `views/ChatView.vue` 与 `stores/chat.ts`，把流式响应封装成 `useChatStream()`。'
      ]
    },
    { kind: 'heading', text: '需要注意的边界' },
    { kind: 'paragraph', text: '后端 `personal-workspace-app` 还没有接口，联调前先用本地 mock；健康检查报 ECONNREFUSED 属预期。' }
  ]
}

export function draftFor(question: string): ChatDraft {
  return /代码|函数|脚本|接口|示例|python|js/i.test(question) ? CODE_DRAFT : GENERIC_DRAFT
}
