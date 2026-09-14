/**
 * 接口契约核对（docs/默认模块.md · users 域）。
 * 用假 adapter 接管**真实** axios 实例，所以 baseURL 拼接、body 序列化、请求/响应拦截器、
 * 信封拆解与错误翻译全部走线上代码。
 * 跑两遍：VUE_APP_MOCK_AUTH=false 校验真接口，=true 校验演示登录与真接口的失败形态一致。
 */
import { createPinia, setActivePinia } from 'pinia'
import http, { ApiError, isApiEnvelope, isApiError, unwrapEnvelope, setAuthToken, setUnauthorizedHandler, API_SUCCESS_CODE, API_BASE_URL } from '@/api/http'
import { IS_MOCK_AUTH, login, logout, USER_LOGIN_PATH } from '@/api/auth'
import { checkHealth, classifyHealth, HEALTH_PATH } from '@/api/workspace'
import {
  CHAT_SESSIONS_PATH,
  CHAT_STREAM_PATH,
  readChatStreamFrame,
  streamCompletion,
  type CompletionUsage
} from '@/api/chat'
import { KB_PATH } from '@/api/knowledge'
import { BACKEND_API_ENTRIES, contractStatusOf } from '@/constants/backendApi'
import { MOCK_CREDENTIALS } from '@/constants/auth'
import { useAuthStore } from '@/stores/auth'
import { installDomShim } from './dom-shim.mjs'
import { eq, finish, ok } from './assert.mjs'
import type { LoginPayload } from '@/types/auth'

interface Seen { url?: string; baseURL?: string; method?: string; data?: unknown; headers: Record<string, unknown> }
const seen: Seen[] = []
let nextResponse: { status: number; data: unknown } = { status: 200, data: null }

function installAdapter(): void {
  const raw = http as unknown as { defaults: { adapter: (config: Seen) => Promise<unknown> } }
  raw.defaults.adapter = async (config: Seen) => {
    seen.push({
      url: config.url,
      baseURL: config.baseURL,
      method: config.method,
      // axios 的 transformRequest 已把 body 序列化到 config.data，adapter 拿到的就是它
      data: config.data === undefined ? null : JSON.parse(String(config.data)),
      headers: config.headers
    })
    const { status, data } = nextResponse
    if (status >= 400) {
      const err = new Error(`Request failed with status code ${status}`) as Error & Record<string, unknown>
      err.isAxiosError = true
      err.config = config
      err.response = { status, data, headers: {}, config }
      throw err
    }
    return { data, status, statusText: 'OK', headers: {}, config }
  }
}

/** 造一个结构合法的 JWT（只签 exp 等声明，不做验签——前端也不验）。 */
function fakeJwt(userId: string, name: string, email: string, expSeconds: number): string {
  const seg = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString('base64url')
  return `${seg({ alg: 'HS256', typ: 'JWT' })}.${seg({ user_id: userId, user_name: name, user_email: email, exp: expSeconds })}.signature`
}

function envelope(data: unknown, code = API_SUCCESS_CODE, message = '成功', traceId = 'trace-ok'): Record<string, unknown> {
  return { code, message, data, trace_id: traceId, timestamp: Math.floor(Date.now() / 1000) }
}

async function main(): Promise<void> {
  const { storage } = installDomShim()
  setActivePinia(createPinia())
  installAdapter()

  const payload: LoginPayload = { username: 'admin@example.com', password: 'admin', remember: true }
  const errorCodes = ['CANCELED', 'TIMEOUT', 'NETWORK', 'HTTP_ERROR', 'BUSINESS_ERROR', 'UNKNOWN']

  // —— 信封层（与 mock 开关无关）——
  eq('成功码是 0 而不是 200', API_SUCCESS_CODE, 0)
  ok('识别 BaseResponse 信封', isApiEnvelope(envelope({ userId: 1 })))
  ok('裸对象不算信封（health 就是这种）', !isApiEnvelope({ status: 'ok' }))
  ok('缺 code 不算信封', !isApiEnvelope({ message: '成功', data: {} }))
  eq('code 0 拆出 data', unwrapEnvelope(envelope({ userId: 7, token: 't' }), '登录失败'), { userId: 7, token: 't' })
  eq('code 0 且 data 为 null 也算成功', unwrapEnvelope(envelope(null), '操作'), null)
  const biz = await Promise.resolve<string>(
    (() => { try { unwrapEnvelope(envelope(null, 100001, '用户名或密码错误', 'trace-bad'), '登录失败'); return 'no-throw' } catch (e) { const err = e as ApiError; return `${err.code}|${err.status}|${err.message}|${err.requestId}` } })()
  )
  eq('非 0 业务码 → BUSINESS_ERROR/status/message/requestId', biz, 'BUSINESS_ERROR|100001|用户名或密码错误|trace-bad')
  const notEnvelope = (() => { try { unwrapEnvelope({ userId: 7 }, '登录失败'); return 'no-throw' } catch (e) { return (e as ApiError).code } })()
  eq('非信封 → UNKNOWN', notEnvelope, 'UNKNOWN')
  ok('错误码枚举含 BUSINESS_ERROR', errorCodes.includes('BUSINESS_ERROR'))

  eq('登录端点', USER_LOGIN_PATH, '/v1/users/userLogin')
  eq('健康检查端点', HEALTH_PATH, '/v1/users/health')

  // —— 连通性卡片的状态判定：只看后端 status，正常不回显响应，异常回显 message ——
  eq('status=ok → 正常且无异常文案',
    classifyHealth({ status: 'ok', message: 'Service is running healthy' }),
    { status: 'ok', normal: true, reason: '' })
  eq('status 非 ok → 异常取后端 message',
    classifyHealth({ status: 'degraded', message: '数据库连接失败' }),
    { status: 'degraded', normal: false, reason: '数据库连接失败' })
  ok('status 与 message 都缺失 → 兜底文案点名 status 缺失', classifyHealth({}).reason.includes('（缺失）'))
  ok('status 大小写不敏感', classifyHealth({ status: 'OK' }).normal === true)
  eq('响应不是对象 → 异常', classifyHealth('ok').normal, false)

  // —— 后端接口对接登记表：与 src/api/* 的路径常量对齐，防止页面上的「待对接」清单漂移 ——
  const exportedPaths = [USER_LOGIN_PATH, HEALTH_PATH, CHAT_SESSIONS_PATH, CHAT_STREAM_PATH, KB_PATH]
  ok('登记表条目路径都带 API_BASE 前缀', BACKEND_API_ENTRIES.every((entry) => entry.path.startsWith(API_BASE_URL)))
  eq('每个已导出的端点常量都进了登记表',
    exportedPaths.filter((path) => BACKEND_API_ENTRIES.some((entry) => entry.path.endsWith(path))).length,
    exportedPaths.length)
  eq('登记表条目总数（增删接口时同步更新）', BACKEND_API_ENTRIES.length, 15)
  eq('待对接项数',
    BACKEND_API_ENTRIES.filter((entry) => {
      const status = contractStatusOf(entry)
      return status === 'await-backend' || status === 'await-frontend'
    }).length,
    12)
  ok('后端已实现且前端在调用的端点不落在「待后端」',
    BACKEND_API_ENTRIES.every((entry) => entry.backend === 'missing' || contractStatusOf(entry) !== 'await-backend'))

  // —— 对话流式：后端 services/ChatStreamService.py 的帧格式 ——
  eq('流式端点已对齐后端', CHAT_STREAM_PATH, '/v1/chat/streamChat')
  eq('会话端点按 /v1 前缀预留', CHAT_SESSIONS_PATH, '/v1/chat/sessions')
  const chunkFrame = readChatStreamFrame('data: {"code":200,"message":"success","data":"第一段","status":"streaming"}\n\n')
  eq('文本帧 → 追加正文', `${chunkFrame.kind}|${chunkFrame.text}`, 'append|第一段')
  eq('结束帧（data 为 null）→ finish',
    readChatStreamFrame('data: {"code":200,"message":"success","data":null,"status":"finished"}\n\n').kind,
    'finish')
  eq('JsonOutputParser 的对象按 resText 取值',
    readChatStreamFrame('data: {"code":200,"message":"success","data":{"resText":"结论"},"status":"streaming"}\n\n').text,
    '结论')
  eq('未知结构原样序列化，不静默吞掉回答',
    readChatStreamFrame('data: {"code":200,"message":"success","data":{"foo":"bar"},"status":"streaming"}\n\n').text,
    '```json\n{\n  "foo": "bar"\n}\n```')
  const badFrame = readChatStreamFrame('data: {"code":500,"message":"模型解析失败","data":null,"status":"streaming"}\n\n')
  eq('非 200 帧 → error 并透出后端 message', `${badFrame.kind}|${badFrame.message}`, 'error|模型解析失败')
  eq('注释/心跳帧 → ignore', readChatStreamFrame(': keep-alive\n\n').kind, 'ignore')
  eq('坏 JSON 帧 → ignore', readChatStreamFrame('data: not-json\n\n').kind, 'ignore')
  eq('OpenAI 风格的 [DONE] 也认结束', readChatStreamFrame('data: [DONE]\n\n').kind, 'finish')

  // 真发一次：端点、请求体字段、鉴权头、逐帧落地顺序与异常收尾都必须和后端一致
  setAuthToken('stream.jwt.value')
  const chunkFrames = [
    'data: {"code":200,"message":"success","data":"你好，","status":"streaming"}\n\n',
    'data: {"code":200,"message":"success","data":{"resText":"我是后端"},"status":"streaming"}\n\n',
    'data: {"code":200,"message":"success","data":"","status":"streaming"}\n\n'
  ]
  const frames = chunkFrames.join('') + 'data: {"code":200,"message":"success","data":null,"status":"finished"}\n\n'
  let streamBody: unknown = null
  let streamHeaders: Record<string, string> = {}
  const realFetch = globalThis.fetch

  /** 把后端 ChatStreamService.py 吐的帧原样喂给前端；rejectWith 用于模拟 abort */
  function stubStream(text: string, rejectWith?: Error): void {
    let consumed = false
    globalThis.fetch = (async (_input: unknown, init: Record<string, unknown>) => {
      streamBody = init.body
      streamHeaders = init.headers as Record<string, string>
      if (rejectWith) {
        throw rejectWith
      }
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => {
              if (consumed) {
                return { done: true, value: undefined }
              }
              consumed = true
              return { done: false, value: new TextEncoder().encode(text) }
            }
          })
        }
      }
    }) as typeof globalThis.fetch
  }

  const question = '自我介绍'
  const appended: string[] = []
  const usages: CompletionUsage[] = []
  const thinks: unknown[] = []
  const citations: unknown[] = []
  stubStream(frames)
  await streamCompletion(question, {
    onThink: (think) => thinks.push(think),
    onAppendText: (text) => appended.push(text),
    onCitations: (item) => citations.push(item),
    onUsage: (usage) => usages.push(usage)
  })
  eq('流式请求体只有 text（后端 SimpleChatRequest）', JSON.parse(String(streamBody)), { text: '自我介绍' })
  eq('流式请求带上 Bearer token', streamHeaders.Authorization, 'Bearer stream.jwt.value')
  eq('空帧不写入气泡', appended.join(''), '你好，我是后端')
  eq('后端无用量统计 → tokens 为 null', usages.length === 1 && usages[0].tokens, null)
  ok('耗时由前端计时（真值）', usages.length === 1 && usages[0].elapsedMs >= 0)
  eq('后端不输出思考过程 → 前端不会自己冒出假 think', thinks.length, 0)
  eq('真接口不会凭空产出引用来源', citations.length, 0)

  stubStream(chunkFrames.join(''))
  const truncated = await streamCompletion(question, {}).catch((error: unknown) => error)
  ok('缺结束帧（模型中途报错断开）按失败处理',
    isApiError(truncated) && (truncated as ApiError).message.includes('结束帧'))

  const abort = new Error('signal is aborted without reason')
  abort.name = 'AbortError'
  stubStream('', abort)
  const canceled = await streamCompletion(question, {}).catch((error: unknown) => error)
  ok('abort 归一化为 CANCELED（停止生成不算失败）',
    isApiError(canceled) && (canceled as ApiError).code === 'CANCELED')

  globalThis.fetch = realFetch
  setAuthToken(null)

  if (IS_MOCK_AUTH) {
    const mockPayload: LoginPayload = { username: MOCK_CREDENTIALS.username, password: MOCK_CREDENTIALS.password, remember: false }
    const mock = await login(mockPayload)
    ok('mock 成功且 token 前缀标明来源', mock.token.startsWith('mock.'))
    eq('mock 用户名取演示账号', mock.user.username, MOCK_CREDENTIALS.username)
    ok('mock 有本地有效期', mock.expiresAt !== null && mock.expiresAt > Date.now())
    const fail = await login({ ...mockPayload, password: 'wrong' }).catch((e: unknown) => e)
    eq('mock 失败形态与真接口一致（BUSINESS_ERROR + 业务码）',
      `${(fail as ApiError).code}|${(fail as ApiError).status}|${(fail as ApiError).message}`,
      'BUSINESS_ERROR|100001|用户名或密码错误')
    const before = seen.length
    await logout()
    eq('mock 模式 logout 不发请求', seen.length, before)
    finish('api-contract(mock)')
    return
  }

  // —— 真接口：成功 ——
  const exp = Math.floor(Date.now() / 1000) + 1800
  const serverToken = fakeJwt('7', 'sunquanhu', 'admin@example.com', exp)
  nextResponse = { status: 200, data: envelope({ userId: 7, token: serverToken }) }
  const session = await login(payload)
  const req = seen[0]
  eq('请求地址 = baseURL + 端点', `${req.baseURL}${req.url}`, '/api/v1/users/userLogin')
  eq('请求方法', req.method, 'post')
  eq('请求体字段名以后端为准', Object.keys(req.data as object).sort(), ['password', 'userId'])
  eq('请求体内容（remember 不外发）', req.data, { userId: 'admin@example.com', password: 'admin' })
  ok('注入 X-Request-Id', typeof req.headers['X-Request-Id'] === 'string' && (req.headers['X-Request-Id'] as string).length > 0)
  eq('Content-Type 为 JSON', req.headers['Content-Type'], 'application/json')
  eq('直接用后端签发的 token，不再生成本地占位值', session.token, serverToken)
  eq('UserLoginRes.userId → user.id（数字转字符串）', session.user.id, '7')
  eq('username 回显提交值（响应体不含用户名）', session.user.username, 'admin@example.com')
  eq('displayName 同样回显', session.user.displayName, 'admin@example.com')
  eq('后端不给角色 → 空数组', session.user.roles, [])
  eq('expiresAt 取自 JWT 的 exp（秒 → 毫秒）', session.expiresAt, exp * 1000)
  ok('expiresAt 在未来约 30 分钟', session.expiresAt !== null && session.expiresAt - Date.now() > 1700_000 && session.expiresAt - Date.now() <= 1800_000)

  // —— 后端用 PyJWT（ensure_ascii=False）签发，载荷里是原始多字节 UTF-8 ——
  const utf8Exp = Math.floor(Date.now() / 1000) + 3600
  const utf8Token = fakeJwt('7', '孙全虎', 'admin@example.com', utf8Exp)
  const utf8Bytes = Buffer.from(utf8Token.split('.')[1] as string, 'base64url')
  ok('构造出的 JWT 载荷确实含 >0x7F 字节', utf8Bytes.some((byte: number) => byte > 0x7f))
  nextResponse = { status: 200, data: envelope({ userId: 7, token: utf8Token }) }
  const utf8Session = await login(payload)
  eq('载荷含中文时仍能解出 exp', utf8Session.expiresAt, utf8Exp * 1000)
  eq('载荷含中文时 token 原样透传', utf8Session.token, utf8Token)

  // —— token 注入与本地持久化 ——
  const authStore = useAuthStore()
  authStore.startSession(session, true)
  nextResponse = { status: 200, data: { status: 'ok', message: 'Service is running healthy' } }
  // 用长度算下标，别写死：前面每加一次请求，写死的 seen[1] 就会错位
  const healthIndex = seen.length
  const health = await checkHealth()
  eq('健康检查打到 /api/v1/users/health', `${seen[healthIndex].baseURL}${seen[healthIndex].url}`, '/api/v1/users/health')
  eq('健康检查是裸对象，不拆信封', health, { status: 'ok', message: 'Service is running healthy' })
  eq('后续请求自动带 Bearer <服务端 token>', seen[healthIndex].headers['Authorization'], `Bearer ${serverToken}`)
  eq('勾选记住我 → 写 localStorage', storage.has('workspace.session'), true)
  eq('未过期会话保持登录态', authStore.isAuthenticated, true)

  // —— 业务/系统/校验码都是 HTTP 200 + 非 0 code ——
  nextResponse = { status: 200, data: envelope(null, 100001, '用户名或密码错误', 'trace-bad') }
  const credErr = await login(payload).catch((e: unknown) => e)
  ok('凭据错误抛 ApiError', isApiError(credErr))
  eq('凭据错误 code', (credErr as ApiError).code, 'BUSINESS_ERROR')
  eq('凭据错误 message 原样透出', (credErr as ApiError).message, '用户名或密码错误')
  eq('凭据错误 status 存业务码', (credErr as ApiError).status, 100001)
  eq('trace_id 落到 requestId', (credErr as ApiError).requestId, 'trace-bad')

  nextResponse = { status: 200, data: envelope(null, 999999, '系统繁忙', 'trace-sys') }
  const sysErr = await login(payload).catch((e: unknown) => e)
  eq('系统码也是 BUSINESS_ERROR', (sysErr as ApiError).code, 'BUSINESS_ERROR')
  eq('系统码文案原样透出', (sysErr as ApiError).message, '系统繁忙')

  nextResponse = { status: 200, data: envelope(null, 40000, '参数校验失败: [password]: Field required', 'trace-val') }
  const valErr = await login(payload).catch((e: unknown) => e)
  eq('信封内校验错误也走 BUSINESS_ERROR', (valErr as ApiError).code, 'BUSINESS_ERROR')
  eq('信封内校验文案原样透出', (valErr as ApiError).message, '参数校验失败: [password]: Field required')

  // —— 契约破坏要报错，不能留假登录态 ——
  nextResponse = { status: 200, data: envelope({ userId: 7 }, 0, '成功', 't') }
  const noToken = await login(payload).catch((e: unknown) => e)
  eq('缺 token → UNKNOWN', (noToken as ApiError).code, 'UNKNOWN')
  eq('缺 token 的文案', (noToken as ApiError).message, '登录响应缺少 token')

  nextResponse = { status: 200, data: envelope({ userId: 7, token: 'opaque-token' }, 0, '成功', 't') }
  const opaque = await login(payload)
  eq('非三段式 token → 本地不判过期', opaque.expiresAt, null)
  eq('非 JWT 时 token 仍原样使用', opaque.token, 'opaque-token')

  nextResponse = { status: 200, data: envelope({ userId: 7, token: 'a.!!!not-base64!!!.c' }, 0, '成功', 't') }
  const broken = await login(payload)
  eq('payload 解不出来时降级为不过期而不是抛错', broken.expiresAt, null)

  // 载荷里有中文（user_name 是中文用户名）时，exp 仍要能读出来
  const cnExp = Math.floor(Date.now() / 1000) + 600
  nextResponse = { status: 200, data: envelope({ userId: 8, token: fakeJwt('8', '孙权虎', 'quanhu@example.com', cnExp) }, 0, '成功', 't') }
  const cn = await login(payload)
  eq('中文用户名不影响 exp 解析', cn.expiresAt, cnExp * 1000)

  // —— 兜底：网关直接返回裸 422 ——
  nextResponse = { status: 422, data: { detail: [{ loc: ['body', 'password'], msg: 'Field required', type: 'missing' }] } }
  const raw422 = await login(payload).catch((e: unknown) => e)
  eq('裸 422 保留 HTTP status', (raw422 as ApiError).status, 422)
  eq('裸 422 翻译成中文文案', (raw422 as ApiError).message, '参数校验失败：password Field required')

  // —— 会话失效上报：请求层只负责「谁回了 401」，清态与跳转见 router-guard ——
  const unauthorizedCalls: string[] = []
  setUnauthorizedHandler((context) => { unauthorizedCalls.push(context.url) })
  nextResponse = { status: 401, data: envelope(null, 401, '令牌已过期', 'trace-401') }
  const expired = await checkHealth().catch((e: unknown) => e)
  eq('401 仍归一化为 HTTP_ERROR', (expired as ApiError).code, 'HTTP_ERROR')
  eq('401 的 HTTP 状态码不被业务码覆盖', (expired as ApiError).status, 401)
  eq('401 上报一次并带端点路径', unauthorizedCalls, ['/v1/users/health'])
  nextResponse = { status: 403, data: envelope(null, 403, '无权限', 'trace-403') }
  await checkHealth().catch(() => undefined)
  eq('非 401 不上报', unauthorizedCalls.length, 1)
  nextResponse = { status: 401, data: envelope(null, 401, '用户名或密码错误', 'trace-login401') }
  await login(payload).catch(() => undefined)
  eq('登录端点的 401 同样上报（由装配处按端点过滤）', unauthorizedCalls, ['/v1/users/health', USER_LOGIN_PATH])
  setUnauthorizedHandler(null)
  nextResponse = { status: 401, data: envelope(null, 401, '令牌已过期', 't') }
  await checkHealth().catch(() => undefined)
  eq('注销 handler 后不再上报', unauthorizedCalls.length, 2)

  // —— 后端没有这条路由：文案必须点名端点，页面上才看得清是哪个功能没接 ——
  nextResponse = { status: 404, data: { detail: 'Not Found' } }
  const missingApi = await checkHealth().catch((e: unknown) => e)
  eq('404 归一化为 HTTP_ERROR', (missingApi as ApiError).code, 'HTTP_ERROR')
  eq('404 文案点名待对接端点', (missingApi as ApiError).message, `后端未实现 GET ${API_BASE_URL}${HEALTH_PATH}，该功能待对接`)
  nextResponse = { status: 200, data: { status: 'ok', message: 'Service is running healthy' } }

  // —— 登出 ——
  const before = seen.length
  await logout()
  eq('logout 不产生网络请求（文档无登出端点）', seen.length, before)
  eq('本地会话已清理', authStore.isAuthenticated, true)

  finish('api-contract')
}

void main()
