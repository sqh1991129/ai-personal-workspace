# AGENTS.md — personal-workspace-web

本文件适用于 `personal-workspace-web/` 子树（Git 仓库根在上一层 `personal-workspace/`）。

## 开工前必读

1. `docs/PROJECT_ANALYSIS.md`：技术栈事实、风险清单、分期路线图。
2. `docs/project-profile.json`：结构化档案（依赖版本、配置、issue 状态）。改动依赖或目录结构后必须同步这两个文件。
3. 注意 Git 仓库根包含同级目录 `personal-workspace-app/`（后端占位），不要把它的前端改动混进来。

## 命令

```bash
npm run serve        # 开发服务器，默认 8080（VUE_APP_DEV_PORT 可覆盖）
npm run type-check   # vue-tsc --noEmit，全量类型检查
npm run build        # 先跑 type-check，再生产构建到 dist/
npm run lint         # ESLint 检查，覆盖 .ts/.tsx/.vue/.js 与根配置（serve/build 阶段也会执行）
npm run verify       # 一次性核对脚本（接口契约 / 路由守卫 / 五页 SSR 结构），零依赖，非测试框架
```

交付前必须 `npm run lint`、`npm run type-check`、`npm run build` 与 `npm run verify` 均通过。ESLint 错误会导致 serve/build 失败，类型错误会导致 build 失败，都不要绕过、不要临时降级为 warning。

## 技术栈约束

- Vue 3.5 + **TypeScript 5.4**（`tsconfig.json`，`strict: true`）。`src/**` 一律 `.ts` / `<script setup lang="ts">`，**不要再新增 `.js` 业务代码**。
- 例外（必须保持 `.js`）：`vue.config.js`、`babel.config.js` 与 `demo/**`。
  - 前两者：Vue CLI 5 只加载 `vue.config.{js,cjs,mjs}`，不支持 `vue.config.ts`。
  - `demo/`：零依赖静态原型，没有构建步骤，不能引入 TS。
- TS 转译走 `ts-loader`（`transpileOnly` + `appendTsSuffixTo: [/\.vue$/]`，见 `vue.config.js` 的 `rule('ts')`），
  **不要**改用 `@babel/preset-typescript`：SFC 脚本块传给 Babel 的 `filename` 仍是 `X.vue`，基于扩展名的探测会失效。
- **不要**引入 `@vue/cli-plugin-typescript`：它的 `cache-loader` peer 仍指向 webpack 4，装上需要仓库级 `legacy-peer-deps`。
- 构建链是 Vue CLI 5 / webpack 5，不要引入只支持 Vite 的插件（测试框架例外，见下）。
- 新代码统一 SFC + `<script setup lang="ts">` + Composition API；样式按「令牌 → 设计系统层 → 组件 scoped」三层放置，见下文「样式分层」。
- 不要新增需要 ESLint 8 的 lint 依赖（如 `eslint-plugin-vue@9`、Prettier 集成），除非同一任务里一并升级 ESLint 并验证。
  TypeScript 侧只用 `@typescript-eslint@5`（支持 ESLint 7），规则集中在 `package.json` 的 `eslintConfig.overrides`。
- 主题切换依赖 `document.documentElement.dataset.theme`，新增颜色只能加令牌变量，不要写死色值。

## TypeScript 约定

- 跨组件/跨层复用的类型放 `src/types/`（`ui.ts` 等）；纯类型导入一律写成 `import type`（已由 lint 强制）。
- 禁止 `any`（`@typescript-eslint/no-explicit-any: error`）。确需逃逸时用 `unknown` + 类型守卫，参考
  `src/api/http.ts` 的 `isApiError` / `isApiErrorCode`；万不得已才用 `as unknown as`，且必须带注释说明契约。
- 后端返回体先按“未知”处理：`src/api/*.ts` 里用可选字段 + 索引签名描述，契约稳定后再收紧。
- `tsconfig.json` 开了 `noUnusedLocals` / `noUnusedParameters`，未使用变量会直接导致 build 失败。
- axios 实例的响应已被拦截器解包，对外类型是 `HttpClient`（返回 `Promise<T>`），不要按 `AxiosInstance` 使用。

```ts
// 推荐
const healthState = ref<StatusState>('idle')
const props = withDefaults(defineProps<Props>(), { label: '' })
// 禁止
const healthState = ref('idle' as any)
```

## 目录职责

| 目录 | 职责 | 约束 |
| --- | --- | --- |
| `src/router/` | 路由表、导航守卫、文档标题 | 视图组件懒加载；新增页面在此登记 |
| `src/views/` | 路由级页面 | 只做编排，通用逻辑下沉 composables |
| `src/stores/` | pinia 跨视图状态 | 一个 store 一个领域，禁止存大体积业务数据缓存 |
| `src/api/` | 唯一的后端调用出口 | 组件不得直接 `import axios`，只经 `http.ts` 与领域模块 |
| `src/composables/` | 可复用逻辑与 API 编排 | 命名 `useXxx.ts`，需处理卸载时取消请求 |
| `src/types/` | 共享类型与 `process.env` 声明 | 只放类型，不放运行时代码；`env.d.ts` 改动需同步 `.env.*` 与 README |
| `src/components/base/` | 无业务依赖的通用组件 | 不得依赖 store 与 api |
| `src/components/business/` | 业务组件 | 允许依赖 store 与 composables |
| `src/styles/` | 三层全局样式 | 令牌集中在 `global.css` 的 `:root`；色值只允许出现在这里 |
| `src/utils/` `src/constants/` | 纯函数与常量 | 不得依赖 Vue 运行时 |
| `scripts/verify/` | 一次性核对脚本（`npm run verify`） | 零依赖、不装测试框架；不在 `tsconfig.include` 与 ESLint glob 内 |

## 样式分层

样式只有三层，新规则按“作用范围最大处优先、越具体越下沉”放置：

| 层 | 文件 | 放什么 | 约束 |
| --- | --- | --- | --- |
| 令牌与基础 | `src/styles/global.css` | CSS 变量（`:root` 与 `[data-theme]`）、reset、排版 | **全工程唯一允许出现色值字面量的文件** |
| 设计系统层 | `src/styles/primitives.css`（外壳/原子）、`src/styles/modules.css`（三个模块） | **跨组件共用**的类（经验值：≥3 处使用）：`.shell`/`.rail`/`.panel`/`.btn`/`.card`/`.module` 等 | 全局样式表，只写类选择器、不写组件私有状态；禁止出现色值，一律引用令牌 |
| 组件层 | 各 SFC 的 `<style scoped>` | 只服务该组件的样式（新增布局微调、原型内联 `style=` 的替代） | 组件专属样式**必须**放这里，不要塞回全局表 |

- 判定口径：**共用面广 → 全局表；只一个组件用 → scoped**。这是 2026-09-03 与用户确认后的正式口径，
  取代本文件早期的「样式一律 `<style scoped>`」表述（背景与代价见 `docs/PROJECT_ANALYSIS.md` 第 13.3 节、issue R17）。
- 新增组件时**优先复用设计系统层已有类名**，需要新类先确认它是否会被多处使用；只有单组件使用时才写进 scoped。
- 三张表都在 `src/main.ts` 里按 global → primitives → modules 顺序引入，不要改顺序（后者依赖前者同名类的覆盖关系）。
- 主题切换依赖 `document.documentElement.dataset.theme`：新增颜色只能加令牌变量，不要写死色值，也不要在全局表里补 `!important` 覆盖。

## 配置与密钥

- 后端地址、超时、标题等只从 `process.env.VUE_APP_*` 读取，禁止在组件里硬编码。
- 新增环境变量：同步更新 `.env.development`、`.env.production`、`src/types/env.d.ts`、`README.md` 的变量表。
- 只有非敏感默认值可以提交；密钥放 `.env.*.local`（已被忽略），且以 `VUE_APP_` 前缀才会注入前端代码。
- 开发代理在 `vue.config.js` 的 `devServer.proxy`，转发 `/api` 到 `VUE_APP_API_PROXY_TARGET`；生产环境需由 Nginx 等承担同等职责。

## 验证基线（当前）

- `npm run lint`：0 error。
- `npm run type-check`：0 error（`vue-tsc --noEmit`）。
- `npm run build`：成功且无 webpack 告警（2026-09-07 删净 mock 后实测）；`dist/js/chunk-vendors.*.js` 207.41 KiB
  （gzip 74.00）、入口 `index.*.js` 48.47 KiB（gzip 17.25，删 mock 前是 56.93）+ `runtime.*.js` 4.79 KiB、
  `css/index.*.css` 30.77 KiB（gzip 5.94），无 `.map` 产物（`productionSourceMap: false`）。
  体积阈值与 `runtimeChunk: 'single'` 的取舍见 `vue.config.js` 注释。
- `npm run verify` 需要 **Node ≥ 18.18**（脚本入口用 `node --import`）。本机默认 `node` 是 v15，会直接报
  `node: bad option: --import` 并让全部轮次「没有产出结果」；跑前先切到较新的 Node（如 `~/.nvm/versions/node/*/bin`）。
- 页面渲染与接口契约正确性由 `npm run verify` 覆盖（`scripts/verify/`，已随仓库提交：**六轮合计 318 条** =
  源码扫描(无业务假数据) 1 + 契约(真登录 + 真流式) 83 + 守卫 42 + SSR(真登录) 76 + 契约(演示登录) 40 + SSR(演示登录) 76）。
  第 1 轮是 `grep` 扫描：`src/**` 与 `scripts/verify/**` 里再出现 `VUE_APP_MOCK_API` / `MOCK_SESSIONS` /
  `streamWithMock` 之类的业务假数据标识就直接失败。
  改 `src/views/**`、`src/components/**`、`src/stores/**`、`src/api/**`、`src/router/**` 后必须重跑，
  不要只信 lint。上一版脚本放在 `/tmp` 被系统清理过一次，所以 2026-09-04 起入库（issue R18 仍是「不引入测试框架」）。
- **不得再引入 mock 数据层**（2026-09-07 第三次反馈后确认，取代此前「保留假数据但默认关开关」的方案）。
  工程内不允许存在任何没有后端来源的业务数字 / 文案 / 模型名 / 进度：会话、消息、知识库、文档、分片、召回命中、
  索引指标全部只有后端一条路径，接口没通时页面点名端点。要演示满屏效果请改 `scripts/verify/` 里的 fixture，不要改 `src/**`。
  唯一例外是登录的 `VUE_APP_MOCK_AUTH`（后端 R20 未修好前保留 admin / admin 演示账号）。
- 端点清单的唯一事实来源是 `src/constants/backendApi.ts`，**新增 / 改名 / 删除任何 `src/api/*` 端点常量时同步它**，
  `npm run verify` 会断言两者一致并盯住条目总数（15）与待对接数（12）。
  404 由请求层翻译成「后端未实现 METHOD /path，该功能待对接」，store 存进 `listError`，视图空态原样显示。
- 后端调用失败**不得回退本地状态**：响应结构不对就抛 `ApiError(code: 'UNKNOWN')`；删除 / 重建索引 / 新建库失败时
  保留原样并报错，后端没给的量（token 用量、模型名、引用来源、向量维度）在界面上留空而不是编一个数。
  后端没有对应字段的控件（模型下拉、上下文占用、附件 / 知识库 / 深度思考 / 联网开关）**直接删除**，
  不要用 `disabled` 留着——禁用态仍会让人以为功能只是暂时没点。
- 负向验证过：在 `.ts` 里放 `any`/未使用变量，`npm run lint` 与 `npm run build` 都会失败（证明 TS 文件确实进了规则与 webpack 链路）。
- 登录的真接口链路已按 `docs/默认模块.md` 写完（`POST /api/v1/users/userLogin`），但**开发默认仍是 mock**
  （`.env.development` `VUE_APP_MOCK_AUTH=true`，账号 admin / admin；`.env.production` 为 `false`）。
  原因是后端登录不校验口令等阻断级缺陷（issue R20），修好后只改 env，业务代码不动。
  响应统一套 `BaseResponse` 信封，拆信封只用 `src/api/http.ts` 的 `unwrapEnvelope()`，**不要**在响应拦截器里全局拆
  （`/api/v1/users/health` 返回裸对象，对话/知识库将来也不一定套信封）。
- **业务成功码是 `0`，不是 HTTP 200**（后端 `ErrorCodes.SUCCESS`）。判断成功只用 `API_SUCCESS_CODE`，
  不要在任何组件或 store 里裸写 `code === 200` / `code === 0`；后端把业务异常、参数校验、兜底系统异常都包成
  HTTP 200 + 非 0 `code`（100001 / 40000 / 999999），一律经 `unwrapEnvelope()` 变成 `ApiError(code: 'BUSINESS_ERROR')`。
- 会话 `token` 用后端 `UserLoginRes.token` 原样值，**不要**在前端自造；`expiresAt` 由 `readJwtExpiresAt()` 读 JWT 的 `exp` 得到
  （只解不验），读不到就是 `null` = 本地不判过期。前端不验签、不从 JWT 取用户名字段（那不在文档契约里）。
- 「没有登录态就回到登录页」有两条互补链路，改动别只改一条：进入路由时靠 `src/router/guards.ts` 的 `beforeEach`；
  页面停留期间 token 被服务端拒掉靠 `src/api/http.ts` 的 `setUnauthorizedHandler()` 上报 401，由
  `src/router/guards.ts` 的 `applyUnauthorizedRedirect()` 清会话 + 跳转（装配点 `src/router/index.ts`）。
  **请求层不得 import store 与 router**，
  只上报端点路径；登录端点的 401 是口令错误，由登录表单处理，不要接进这条链路。
- 首页「后端连通性」卡片打 `GET /api/v1/users/health`：后端未启动时返回 `ECONNREFUSED` 代理错误属预期，不要为此改前端代码。

## 对话流式契约（唯一已对接的业务端点）

- `POST /api/v1/chat/streamChat` 的请求体**只有 `text`**（后端 `SimpleChatRequest`）；会话列表 / 历史消息 /
  删除会话 / 知识库后端都没有，前端路径按 `/v1` 预留，真发请求就是 404「待对接」。
- 帧里的成功码是 **200**（`ChatStreamService.py` 自拼 `{"code":200,…}`），与全局 `API_SUCCESS_CODE = 0` 无关，
  **不要**对这条链路用 `unwrapEnvelope()`；解析只走 `src/api/chat.ts` 的纯函数 `readChatStreamFrame()`（帧 → append/finish/error/ignore）。
- 流式用 `fetch` 不走 axios，所以鉴权头只能取 `src/api/http.ts` 的 `authHeaders()`，401 上报只能调
  `notifyUnauthorized(url)`；请求层照旧不得 import store 与 router。
- 后端不返回 think / citations / usage：`onThink` / `onCitations` 目前没有生产者，只为契约补齐保留，
  **不要拿它们演假数据**；`CompletionUsage.tokens` 为 `null` 时界面必须隐藏用量而不是显示 0。
  模型名与上下文窗口同理：后端不返回就不写死在页面上，也不要在前端估算（原先的 `contextUsage` getter 已删除）。
- 收尾的两种情况不能混：没收到结束帧就断开 = 失败（`HTTP_ERROR`，提示回答可能不完整）；
  fetch 抛的 `AbortError` 必须归一化成 `ApiError(code: 'CANCELED')`，否则用户点「停止生成」会被画成红色失败气泡。

## 分支与提交

- 新分支使用 `codex/<task-slug>` 前缀；`main` 只接受可构建的提交。
- 不要提交 `dist/`、`node_modules/`、`.env.*.local`。
- 一个任务一个可验证闭环：改动 + 自检证据（lint / type-check / build 结果）+ 文档同步。

## 尚未引入（需要时先确认）

UI 组件库、Sass、单元测试（建议 vitest + @vue/test-utils）、CI、Prettier、i18n。引入前请先与用户确认选型，并同步 `docs/` 两份档案。

> 单元测试已于 2026-09-03 确认**暂缓**（不引入框架，回归仍靠一次性脚本）；需要时再重新提选型，不要擅自安装。

> TypeScript 已于 2026-09-02 引入（含 `vue-tsc` 与 `@typescript-eslint@5`），不再需要确认；新增 TS 相关工具链仍需先对齐本文件。
