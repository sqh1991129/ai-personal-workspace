# 个人 AI 工作台 · 前端（personal-workspace-web）

Vue 3 + TypeScript 单页应用。前端基建（路由 / 状态管理 / 请求层 / 环境变量 / 开发代理 / 主题令牌 / 登录鉴权）已就绪，业务功能待开发。

## 快速开始

```bash
npm install
npm run serve         # 开发服务器 http://localhost:8080
npm run type-check    # vue-tsc 类型检查
npm run build         # 先类型检查，再生产构建，产物在 dist/
npm run lint          # ESLint 检查（含 .ts / .vue）
npm run verify        # 零依赖一次性核对脚本（接口契约 / 路由守卫 / 五页 SSR 结构）
```

## 技术栈

Vue 3.5 · TypeScript 5.4（`strict`，`vue-tsc` 检查，`ts-loader` 转译）· Vue CLI 5（webpack 5）· vue-router 4 · pinia 2 · axios 1 · ESLint 7（`plugin:vue/vue3-essential` + `@typescript-eslint` 5）· 纯 CSS + CSS 变量主题令牌。

`src/**` 全部为 `.ts` / `<script setup lang="ts">`；只有 `vue.config.js`、`babel.config.js`（Vue CLI 5 不支持 `vue.config.ts`）
和零依赖的 `demo/` 原型保持 JavaScript。约定与禁止项见 `AGENTS.md`。

## 环境变量

| 变量 | 说明 | 开发默认值 |
| --- | --- | --- |
| `VUE_APP_TITLE` | 页面标题与顶栏品牌文案 | `个人 AI 工作台` |
| `VUE_APP_API_BASE` | 请求层 baseURL | `/api` |
| `VUE_APP_API_TIMEOUT` | 请求超时（毫秒） | `15000` |
| `VUE_APP_DEV_PORT` | 开发服务器端口 | `8080` |
| `VUE_APP_API_PROXY_TARGET` | 开发代理转发目标（后端地址） | `http://127.0.0.1:8000` |
| `VUE_APP_MOCK_AUTH` | 登录是否走本地演示账号（`true` / `false`） | 开发 `true`（admin / admin，后端登录待修见 issue R20）；生产 `false` 走真实后端 |

- `.env.development` / `.env.production` 随仓库提交，只放非敏感默认值。
- 个人覆盖写入 `.env.development.local`（已被 `.gitignore` 忽略），不要改动提交版的值。
- 前端读取的 `VUE_APP_*` 在 `src/types/env.d.ts` 里声明，新增变量需同步这三处。

## 目录结构

```text
src/
├── main.ts                 # 装配 pinia + router + 三层全局样式
├── App.vue                 # 外壳：侧栏 + 顶栏 + RouterView（meta.layout=blank 时不套壳）
├── router/                 # routes.ts（路由表与 meta）· guards.ts（登录守卫）· index.ts（装配 + 标题）
├── stores/                 # app.ts（主题/侧栏/列数布局）· auth.ts（会话）· chat.ts · knowledge.ts · toast.ts
├── api/                    # http.ts（实例/拦截器/ApiError）· auth.ts · chat.ts（流式）· knowledge.ts · workspace.ts
├── composables/            # useLogin / useLogout / useChatStream / useRetrieval / useUploadQueue / useBackendHealth
├── types/                  # 共享类型：ui.ts、auth.ts、chat.ts、knowledge.ts 与 env.d.ts
├── utils/                  # 纯函数：authSession · redirect · richtext（行内标记）· fileType
├── constants/              # auth · chat · knowledge · icons（图标表）· app · backendApi（接口对接登记表）
├── views/                  # LoginView / HomeView（总览）· ChatView · KnowledgeView · NotFoundView
├── components/base/        # 无业务依赖：AppIcon · TextField · StatusPill · InlineText · AppDrawer
├── components/business/    # 外壳（AppSidebar/AppTopbar/UserMenu/ThemeToggle/ToastLayer）
│                           # 总览（BackendContractCard 后端接口对接进度）
│                           # 对话（SessionList/MessageStream/MessageItem/ChatComposer/ChatParamsPanel）
│                           # 知识库（KbList/DocumentTable/UploadDropzone/ChunkList/RecallTester）
│                           # 登录（LoginForm 表单 · LoginHero 左侧项目背景插画）
├── styles/                 # global.css（令牌+基础）· primitives.css（外壳与原子）· modules.css（三个模块）
└── ../scripts/verify/      # 零依赖一次性核对脚本（npm run verify），见下文「验证」
```

根目录另有 `tsconfig.json`（`strict` + `@/*` 别名，与 webpack alias 对齐）。

## 登录与鉴权

- 未登录访问任何受保护路由（`meta.requiresAuth`）都会跳到 `/login`，并把原地址放进 `?redirect=`，登录成功后回跳。
- 登录页左侧是一张贴合项目背景的内联 SVG 插画（`src/components/business/LoginHero.vue`）：会话列表 → 流式回答与引用来源 → 知识库召回 → 规划中的自动化任务。颜色全部取 `src/styles/global.css` 的令牌变量，因此明暗主题自动切换；纯图形无文字节点，无障碍描述走 `aria-label`。
- 登录已对接真实后端：`POST {VUE_APP_API_BASE}/v1/users/userLogin`，请求体是文档里的 `UserLoginReq{userId, password}`
  （登录名走 `userId` 字段，`remember` 只影响前端本地持久化，不发给后端）。契约见 `docs/默认模块.md`。
  **真接口链路前端已写完**，但后端登录仍有阻断级缺陷（见下文 issue R20），所以 `.env.development` 暂时保持
  `VUE_APP_MOCK_AUTH=true`，`.env.production` 保持 `false`；后端修好后把开发这一项改成 `false` 即可，业务代码不动。
- 响应统一套 `BaseResponse{code, message, data, trace_id, timestamp}`，由 `src/api/http.ts` 的 `unwrapEnvelope()` 拆解。
  **成功码是 `0`（`ErrorCodes.SUCCESS`），不是 HTTP 的 200**，常量收在 `API_SUCCESS_CODE`。
  HTTP 200 但 `code != 0` 也算失败（`ApiError.code = 'BUSINESS_ERROR'`，`ApiError.status` 存业务码），
  `trace_id` 落到 `ApiError.requestId` 便于和后端日志对齐。后端的业务异常（100001）、参数校验（40000）与
  兜底系统异常（999999）都由全局处理器包成 HTTP 200 + 非 0 `code`，文案已在后端格式化好、前端原样透出；
  裸 422 `HTTPValidationError` 只做兜底翻译。
- `UserLoginRes{userId, token}`：`token` 是后端签发的 JWT，前端原样使用；缺失即视为契约破坏并报错，不留假登录态。
  有效期不单独下发，前端只解 JWT 的 `exp`（不验签）换算 `expiresAt` 供「记住我」本地清理；
  读不到 `exp`（不透明 token）时 `expiresAt = null`，即本地不判过期。
  后端用 PyJWT 签发，载荷是 `ensure_ascii=False` 的原始多字节 UTF-8（`user_name` 可能是中文），
  所以解 `exp` 时先按字节还原成 UTF-8 再 `JSON.parse`，不直接对 `atob()` 的 latin-1 结果动手。
- 响应体不含用户名与角色，`username` / `displayName` 回显提交值、`roles` 为空数组；
  文档没有登出端点，退出只清本地会话（缺口见 issue R20）。
- `VUE_APP_MOCK_AUTH=true` 时走本地演示：演示账号 **admin / admin**（约 600ms 假延迟），登录表单下方出现「演示模式 / 一键填入」提示，
  关闭时该提示自动隐藏。用户名输入框的占位符跟随同一个开关：mock 模式提示 `admin`，
  真接口模式是中性文案，不会写死 `admin` 误导用户。
- 勾选「记住我」才会把会话写入 `localStorage['workspace.session']`；不勾选时只存内存，刷新即回到登录页。
- 登录后所有 `/api` 请求自动带上 `Authorization: Bearer <token>`（由 `src/stores/auth.ts` 同步给 `src/api/http.ts`）。
- 页面停留期间 token 被服务端拒掉（HTTP 401）时，`src/api/http.ts` 的 `setUnauthorizedHandler()` 只上报「哪个端点回了 401」，
  由 `src/router/guards.ts` 的 `applyUnauthorizedRedirect()` 清会话 + 提示「登录状态已失效，请重新登录」+ 跳
  `/login?redirect=<当前地址>`，登录后原样回跳；并发多个 401 只处理一次。**登录端点自身的 401 不走这条路**，
  那是「用户名或密码错误」，交给登录表单的红色提示。请求层不 import store 与 router，装配在 `src/router/index.ts`。
  mock 模式不产生 401（过期由守卫的 `pruneExpiredSession()` 负责），所以这段只在真接口下生效。
- 后端连通性探测走 `GET {VUE_APP_API_BASE}/v1/users/health`（该端点返回裸对象，不套 `BaseResponse`），
  总览页「后端连通性」卡片展示状态与响应摘要。
- **后端当前登录不可信**（不影响前端接线，见 `docs/project-profile.json` issue R20）：
  `domain/user.py` 的 `User` 模型没有 `password` 列，`user_login` 取到 `req.password` 后从未校验，
  命中 `email` 即签发合法 JWT（等于任意密码可登录）；另有 `timedelta` 位置参数把 30 分钟写成 30 天、
  `decode_token` 的 `AppException` 签名不匹配、`SECRET_KEY` 硬编码等。这些是**开发环境保持 mock 的直接原因**。

人工核对路径（默认 mock，无需后端）：`npm run serve` → 访问 `/` 应跳到 `/login?redirect=/` →
点「一键填入」或手工输 `admin` / `admin` → 登录成功回到工作台总览，侧栏底部显示当前账号（退出按钮在头像右侧）→
依次点侧栏「对话」「知识库」核对三栏/两栏与抽屉 → 退出后刷新 `/` 仍被拦在登录页。
输错密码约 600ms 后提示「用户名或密码错误」（与真接口的 `100001` 同一形态）。

切到真实后端：`.env.development` 置 `VUE_APP_MOCK_AUTH=false`，启动后端（`personal-workspace-app`，需要 Postgres）→
提交账号密码，Network 里应看到 `POST /api/v1/users/userLogin` 且请求体为 `{userId, password}` →
登录后续请求自动带 `Authorization: Bearer <JWT>` → 总览页点「检测」应命中 `GET /api/v1/users/health`。
后端未启动时登录会提示「无法连接后端服务（/api）」。

## 数据来源与待对接清单

工程内**已经没有业务假数据**（2026-09-07 全量删除，issue R21）：会话、消息、知识库、文档、分片、召回命中、
索引指标、模型名与 token 数都只有后端来源；接口没通时页面直接点名端点，避免出现「看着能用、其实没接」。

- 登记表：`src/constants/backendApi.ts` 是「哪些接口已对接 / 待后端 / 待前端接」的唯一事实来源，每条写清
  `verb` + `path` + 界面能力 + 前端调用点 + 后端实现状态 + 是否已写进 `docs/默认模块.md`。
  `npm run verify` 断言它与 `src/api/*` 导出的路径常量一致，防止清单漂移。
  当前 **15** 条：1 条真正可用（健康检查）、2 条已对接但后端有缺陷（登录 R20、流式问答 R23）、12 条待后端/待前端接。
- 展示位：总览页「后端接口对接进度」卡片（`src/components/business/BackendContractCard.vue`）逐条列出，
  状态用设计系统的 `.pill`：已对接 / 已对接 · 后端有缺陷 / 前端就绪 · 待后端 / 后端已有 · 待前端接。
- 未实现的后端路由：请求层把 404 翻译成「后端未实现 `GET /api/kb`，该功能待对接」（`src/api/http.ts`），
  store 记进 `listError`，对话页会话列表、知识库列表与文档表格的空态原样显示它，而不是含糊的「暂无数据」。
- 原先只有假数据模式下才有的指标（索引服务队列 / 向量模型 / 磁盘、「已启用检索」「对话可引用 = 是」）**整块删除**，
  页面固定标注「待后端提供」「检索待对接」。
- 对话页只有一条真接口 `POST /api/v1/chat/streamChat`，它**只接收问题文本**：模型、温度、系统提示词、知识库引用、
  多轮上下文都没有对应字段，所以页面上用一条常驻提示与右栏「后端未接收的参数」清单说清楚，
  而不是留着按了没反应的控件（细节见下文「对话」）。
- 上传区只做文件选择：选中文件后提示「待后端实现 `POST /api/kb/{kbId}/documents`」，不再编造进度与「已完成索引」。
- 界面上唯一剩下的演示标记是顶栏的「演示登录」角标（`VUE_APP_MOCK_AUTH=true`，admin / admin）。
  业务数据已经没有开关可关，也就不会再出现「以为关了、其实还开着」。
- ⚠️ `VUE_APP_MOCK_AUTH` 是**构建期**注入的：改完 `.env.development` 必须重启 `npm run serve`，热更新不会重新读取。

## 页面与模块

路由：`/`（总览）· `/chat`（对话）· `/knowledge`（知识库）· `/login` · `/:pathMatch(.*)*`（404）。
全部受保护路由都在外壳内（侧栏 + 顶栏），登录页为整屏 `blank` 布局。

### 外壳

- 侧栏可折叠、列数布局（三栏 / 两栏 / 专注）与主题都持久化在 `localStorage`，键为
  `workspace.theme`、`workspace.sidebar-collapsed`、`workspace.layout.<module>`。
- 顶栏搜索：对话页筛选会话，知识库页筛选文档名；总览页回车后带关键词跳到对话页；`⌘K` / `Ctrl+K` 聚焦。

### 总览（`src/views/HomeView.vue`）

- 只放有来源的内容：问候语、统一提问入口、最近会话、知识库健康度、后端连通性探测、后端接口对接进度卡。
- 原先写死的四张指标卡（今日对话 +12%、平均首字延迟 860ms、今日 token 1.24M）、六条「今日待办」与三条
  「快捷入口」示例提示词已全部移除。`src/components/base/StatCard.vue`（指标卡 + 迷你折线）与其 `.stat*` / `.spark`
  样式**按用户要求保留**，等后端提供真实指标接口时再接回首页；现在没有任何调用点（见 PROJECT_ANALYSIS 第 23 节）。
- 列表拉不到时不再显示「加载中…」或空白，而是显示请求层给出的「后端未实现 …，该功能待对接」。

### 对话（`src/views/ChatView.vue`）

真接口只有一条流式问答，其余对话能力都还在「待后端」，界面按这个事实展示。

- 已对接：`src/api/chat.ts` 的 `streamCompletion()` → `POST /api/v1/chat/streamChat`，请求体只有 `{ text }`
  （后端 `SimpleChatRequest` 只有这一个字段）。响应是 `text/event-stream`，帧格式
  `data: {"code":200,"message":"success","data":<chunk>,"status":"streaming"}`，结束帧 `data: null … "status":"finished"`；
  解析收在纯函数 `readChatStreamFrame()` 里，`npm run verify` 直接对它打断言。
- 这条链路的业务成功码是帧里的 **200**，和全局 `BaseResponse` 的 `0` 不是一回事，所以**不套** `unwrapEnvelope()`。
  后端另有 `POST /api/v1/chat/simpleChat`（裸对象 `{ resText }`，需要 Bearer token），前端暂未接。
- 后端不回思考过程、引用来源与 token 用量：`onThink` / `onCitations` 目前**没有生产者**，只保留回调与渲染等契约补齐；
  完成时只给 `tokens: null` 与前端计时的 `elapsedMs`。界面上「没有值就不显示」，停止生成标注的是本地字符数而非假 token 数。
- 不再假装参数生效：模型下拉、上下文占用条、附件 / 知识库 / 深度思考 / 联网四个开关**整体删除**（不是禁用），
  顶栏只留「后端 streamChat」与「温度 0.7（本地）」，右栏保留生成参数并配一条「后端未接收的参数」清单。
- 流式用 `fetch` 而不是 axios，因此鉴权头取自 `src/api/http.ts` 的 `authHeaders()`（与普通请求同一份 token），
  401 经 `notifyUnauthorized()` 复用同一套「会话失效 → 回登录页」装配。
- 会话列表 / 历史消息 / 删除会话后端仍未提供，路径按 `/api/v1/chat/...` 预留：真发请求拿到 404 会在侧栏点名端点，
  删除失败时不会本地假删除（`src/stores/chat.ts` 的 `removeSession()`）。
- 两种收尾方式已定死：没收到结束帧就断开（模型中途报错）按**失败**处理并提示「回答可能不完整」；
  用户点「停止」触发 abort，归一化成 `ApiError(code: 'CANCELED')`，保留已生成内容、不算失败。
- 三态可区分：生成中（发送按钮变红色方块 + 尾部光标）、已停止（保留部分内容 + 本地字符数）、失败（danger 描边 + 重试）。
- 卸载或重复提交会 `abort` 上一次流（`src/composables/useChatStream.ts` 的 `onScopeDispose`），取消不计为失败。
- `src/constants/chat.ts` 只剩 `NEW_SESSION_ID` 与侧栏分组顺序，示例会话与提示卡片已删除；
  参数面板读写 `src/stores/chat.ts`。

### 知识库（`src/views/KnowledgeView.vue`）

- 库列表 / 文档表格 / 状态筛选 / 关键词搜索 / 分片抽屉 / 召回测试的界面均已落地，但**工程内不内置任何库、文档、分片与
  召回命中**；`GET /api/kb` 等端点后端尚未实现，页面直接点名待对接。
- 上传走真实的文件选择（拖拽或点选，文件名取用户自己的文件），队列面板与假进度已删除，选中后只提示待对接端点。
- 点击引用来源会跳到 `/knowledge?doc=<文档名>` 并自动定位分片抽屉；后端不返回引用时不会出现来源芯片。
- 接真实后端要先定契约：`src/api/knowledge.ts` 用的 `GET /api/kb`、`GET /api/kb/{id}/documents`、
  `GET /api/documents/{id}/chunks`、`POST /api/kb/{id}/retrieve` 后端均未实现，且都缺 `/v1` 前缀（见登记表与 issue R21）。

### 样式分层

- `global.css`：令牌与基础样式，**只有这里允许出现色值**（唯一一层，新增颜色先加变量）。
- `primitives.css` / `modules.css`：由 `demo/assets/prototype.css`、`modules.css` 逐字移植的设计系统层，
  只放被多个组件共用的类，组件只渲染对应 DOM；组件专属样式写在各 SFC 的 `<style scoped>` 里。
- 新增颜色一律加令牌变量，不要写死；主题依赖 `document.documentElement.dataset.theme`。
- 三层口径（放哪一层怎么判断、引入顺序）已作为正式约定写入 `AGENTS.md` 的「样式分层」一节（2026-09-03 确认）。

## 界面原型

`demo/` 是零依赖静态 HTML 原型（**对话模块** + **知识库模块** + 工作台总览），不参与 `serve` / `build`。
原型已于 2026-09-03 整体迁移进 `src/`（见 `demo/README.md` 的对照表状态列），此处仅作视觉与交互的事实来源保留。
双击 `demo/index.html` 即可离线浏览，明暗主题、三栏/两栏布局、流式输出与召回测试均可交互；
`demo/shots/` 是 1440×900 示例图，`demo/README.md` 给出「原型区域 → 建议代码落点」对照表。

## 文档

- `AGENTS.md`：开发与协作约定（新代码必读）。
- `demo/README.md`：界面原型说明与模块落地对照表。
- `docs/PROJECT_ANALYSIS.md`：完整技术栈分析、风险清单与分期路线图。
- `docs/project-profile.json`：结构化项目档案，供任务开发读取校验。

## 已知状态

登录与健康检查已对接后端 `personal-workspace-app` 的 users 域接口（`docs/默认模块.md`）；
对话只有一条流式问答（`POST /api/v1/chat/streamChat`）可用，会话列表与历史消息、知识库全部端点后端尚未实现。
开发环境登录仍是演示模式（`VUE_APP_MOCK_AUTH=true`，admin / admin），等后端修好 R20 后改成 `false`。
后端未启动时，首页「后端连通性」卡片出现代理错误（`ECONNREFUSED`）属预期结果。

## 验证

`npm run verify` 跑 `scripts/verify/` 下的一次性核对脚本：先扫一遍源码确认业务假数据没有以开关或常量的形式回流，
再用假 axios adapter 接管真实请求层校验接口契约、给 `fetch` 打桩校验流式帧与真实请求体、
真实路由表 + 守卫校验跳转、真实 SFC 走 SSR 校验五张页面的结构。
共 **318** 次断言，六轮：
源码扫描(无业务假数据) 1 + 契约(真登录 + 真流式) 83 + 守卫 42 + SSR(真登录) 76 + 契约(演示登录) 40 + SSR(演示登录) 76。
SSR 里带内容的两处（对话消息流、知识库抽屉）用脚本内联的 fixture 填充——应用代码已经不生产示例数据，
断言只负责「后端真给回来时界面渲染得对」，同时反向断言 `WS-14B`、`架构决策库`、`1024`、`512/64` 这类编造值不再出现。

- 零新依赖（只用工程里已有的 `@vue/compiler-sfc` / `typescript` / `@vue/server-renderer`），**不是测试框架**：
  没有 watch、没有覆盖率、不进 `npm run build`。
- 这些 `.ts` 不在 `tsconfig.json` 的 `include`（只覆盖 `src/**`）也不在 ESLint 的 glob 内，
  所以 `type-check` / `lint` 不检查它们，正确性由 `npm run verify` 自己保证。
- 改动 `src/api/**`、`src/stores/**`、`src/router/**`、`src/views/**`、`src/components/**` 后必须重跑。
- 脚本入口用 `node --import`，需要 **Node ≥ 18.18**；Node 过旧会报 `node: bad option: --import`，
  表现为 5 轮全部「没有产出结果」。
