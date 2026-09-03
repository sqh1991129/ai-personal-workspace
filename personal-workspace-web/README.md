# 个人 AI 工作台 · 前端（personal-workspace-web）

Vue 3 + TypeScript 单页应用。前端基建（路由 / 状态管理 / 请求层 / 环境变量 / 开发代理 / 主题令牌 / 登录鉴权）已就绪，业务功能待开发。

## 快速开始

```bash
npm install
npm run serve         # 开发服务器 http://localhost:8080
npm run type-check    # vue-tsc 类型检查
npm run build         # 先类型检查，再生产构建，产物在 dist/
npm run lint          # ESLint 检查（含 .ts / .vue）
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
| `VUE_APP_MOCK_AUTH` | 登录是否走本地假数据（`true` / `false`） | 开发 `true`，生产 `false` |
| `VUE_APP_MOCK_API` | 对话与知识库是否走本地假数据（含假流式、假索引队列） | 开发与生产均 `true`，后端就绪后置 `false` |

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
├── constants/              # auth · chat · knowledge · icons（图标表）· app
├── views/                  # LoginView / HomeView（总览）· ChatView · KnowledgeView · NotFoundView
├── components/base/        # 无业务依赖：AppIcon · TextField · StatusPill · InlineText · StatCard · AppDrawer
├── components/business/    # 外壳（AppSidebar/AppTopbar/UserMenu/ThemeToggle/ToastLayer）
│                           # 对话（SessionList/MessageStream/MessageItem/ChatComposer/ChatParamsPanel）
│                           # 知识库（KbList/DocumentTable/UploadDropzone/ChunkList/RecallTester）
└── styles/                 # global.css（令牌+基础）· primitives.css（外壳与原子）· modules.css（三个模块）
```

根目录另有 `tsconfig.json`（`strict` + `@/*` 别名，与 webpack alias 对齐）。

## 登录与鉴权

- 未登录访问任何受保护路由（`meta.requiresAuth`）都会跳到 `/login`，并把原地址放进 `?redirect=`，登录成功后回跳。
- 后端 `/auth/*` 尚未实现，开发环境默认 `VUE_APP_MOCK_AUTH=true`，演示账号 **admin / admin**（约 600ms 假延迟）。
  失败时 mock 抛出的错误与真实后端经请求层归一化后同形（HTTP 401），所以切换只改环境变量，不动业务代码。
- 勾选「记住我」才会把会话写入 `localStorage['workspace.session']`；不勾选时只存内存，刷新即回到登录页。
- 登录后所有 `/api` 请求自动带上 `Authorization: Bearer <token>`（由 `src/stores/auth.ts` 同步给 `src/api/http.ts`）。
- 接真实后端：`.env.*` 里把 `VUE_APP_MOCK_AUTH` 置为 `false`，并按 `src/api/auth.ts` 的 `RawSession`
  对齐字段（`token` / `user.username` / `expiresIn`），必要时在 `normalizeSession()` 里收敛契约。

人工核对路径：`npm run serve` → 访问 `/` 应跳到 `/login` → 用 admin/admin 登录 → 回到工作台总览，
侧栏底部显示当前账号（退出按钮在头像右侧）→ 依次点侧栏「对话」「知识库」核对三栏/两栏与抽屉 →
退出后刷新 `/` 仍被拦在登录页。

## 页面与模块

路由：`/`（总览）· `/chat`（对话）· `/knowledge`（知识库）· `/login` · `/:pathMatch(.*)*`（404）。
全部受保护路由都在外壳内（侧栏 + 顶栏），登录页为整屏 `blank` 布局。

### 外壳

- 侧栏可折叠、列数布局（三栏 / 两栏 / 专注）与主题都持久化在 `localStorage`，键为
  `workspace.theme`、`workspace.sidebar-collapsed`、`workspace.layout.<module>`。
- 顶栏搜索：对话页筛选会话，知识库页筛选文档名；总览页回车后带关键词跳到对话页；`⌘K` / `Ctrl+K` 聚焦。

### 对话（`src/views/ChatView.vue`）

- 流式：`src/api/chat.ts` 的 `streamCompletion()` 以事件回调（think / block / text / citations / usage）驱动，
  mock 分支按定时器逐段吐字，真实分支按 SSE 帧逐行解析，两者调用顺序一致，store 不感知当前是假数据还是真接口。
- 三态可区分：生成中（发送按钮变红色方块 + 尾部光标）、已停止（保留部分内容并标注 tokens）、失败（danger 描边 + 重试）。
- 卸载或重复提交会 `abort` 上一次流（`src/composables/useChatStream.ts` 的 `onScopeDispose`），取消不计为失败。
- 假数据在 `src/constants/chat.ts`，与 `demo/chat.html` 首屏逐句对应；参数面板读写 `src/stores/chat.ts`。

### 知识库（`src/views/KnowledgeView.vue`）

- 库列表 / 文档表格 / 状态筛选 / 关键词搜索 / 分片抽屉 / 召回测试均已落地，假数据在 `src/constants/knowledge.ts`。
- 上传队列为真异步模拟：`排队中 → 解析中 → 分片中 → 向量化 → 已索引`，完成后自动入表并提示；
  定时器持有在 store 内（离开页面继续索引），完成提示由 `useUploadQueue` 负责。
- 对话里点击引用来源会跳到 `/knowledge?doc=<文档名>` 并自动打开对应分片抽屉。
- 接真实后端：`VUE_APP_MOCK_API=false`，并按 `src/api/knowledge.ts` 的注释对齐 `GET /api/kb`、
  `GET /api/kb/{id}/documents`、`GET /api/documents/{id}/chunks`、`POST /api/kb/{id}/retrieve`。

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

后端 `personal-workspace-app` 目前只有一个空的 `index.py`，尚未提供接口。首页「后端连通性」卡片出现代理错误（`ECONNREFUSED`）属预期结果。
