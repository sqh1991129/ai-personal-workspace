# personal-workspace-web 项目分析

> 分析基准：commit `4246f4f`（main）· 分析日期：2026-09-01 · 环境：Node v25.7.0 / npm 11.10.1
>
> **一句话结论**：项目基于 Vue CLI 5 生成的 Vue 3 脚手架。**P0 基建已于 2026-09-01 完成**（路由 / 状态 / 请求层 / 环境变量 / 开发代理 / 主题令牌 / 404 页 / source map 关闭 / 脏数据清理），当前可直接进入业务开发；剩余缺口为 UI 组件库、测试、CI（见第 10 节）。

---

## 1. 项目定位与仓库形态

- Git 仓库根不在本目录，而在上一层 `personal-workspace/`，本目录 `personal-workspace-web/` 是其中的前端子项目。
- 仓库当前结构（monorepo 雏形，无 workspace 工具管理）：
  - `personal-workspace-web/`：前端（本项目，Vue 3 + Vue CLI 5）
  - `personal-workspace-app/index.py`：后端占位，**空文件**，无任何代码与依赖声明
- 远端：`git@github.com:sqh1991129/ai-personal-workspace.git`，分支 `main`，工作区干净。
- 项目意图（来自被冲突标记覆盖的 README 原文）：**个人 AI 工作台**。
- 包管理：npm（存在 `package-lock.json`，lockfileVersion 3，无 pnpm/yarn 锁文件）。

---

## 2. 技术栈清单

| 层面 | 选型 | 实际安装版本 | 说明 |
| --- | --- | --- | --- |
| UI 框架 | Vue 3 | 3.5.42 | Composition API 可用，现有代码为 Options API |
| SFC 编译 | @vue/compiler-sfc | 3.5.42 | 随 vue 安装 |
| 构建工具链 | @vue/cli-service | 5.0.9 | 命令 `vue-cli-service serve/build/lint` |
| 打包器 | webpack | 5.110.2 | 由 cli-service 内置，无手写 webpack config |
| Dev Server | webpack-dev-server | 4.15.2 | 默认端口 8080 |
| JS 编译 | @vue/cli-plugin-babel + babel-loader | 5.0.9 / 8.4.1 | preset 内含 core-js polyfill 注入 |
| Polyfill | core-js | 3.50.0 | usage 模式，依赖 browserslist |
| CSS 处理 | postcss | 8.5.26 | 自动前缀，无 postcss.config.js |
| HTML 模板 | html-webpack-plugin | 5.6.8 | 读取 `public/index.html` |
| Lint | eslint + eslint-plugin-vue + eslint-webpack-plugin + @typescript-eslint | 7.32.0 / 8.7.1 / 3.2.0 / 5.62.0 | env 已补 `browser`、`es2021`、`vue/setup-compiler-macros`；解析器 `vue-eslint-parser` + `@typescript-eslint/parser` |
| 语言 | TypeScript | 5.4.5 | `tsconfig.json`（`strict` + `noUnusedLocals`），`src/**` 全量 `.ts`；仅 `vue.config.js`/`babel.config.js`/`demo/**` 保留 JS |
| TS 转译 | ts-loader | 9.6.2 | `transpileOnly` + `appendTsSuffixTo: [/\.vue$/]`，配在 `vue.config.js` 的 `rule('ts')`；**未使用 @vue/cli-plugin-typescript**（见 11 节） |
| TS 检查 | vue-tsc | 1.8.27 | `npm run type-check`，已串进 `npm run build` |
| 样式语言 | 纯 CSS | — | **无 sass/less/stylus** |
| 路由 | vue-router | 4.6.4 | `src/router/index.ts`，history 模式 + 懒加载 + 文档标题（`RouteMeta` 已做类型增强） |
| 状态管理 | pinia | 2.3.1 | `src/stores/app.ts`（主题、侧栏），主题写入 localStorage |
| HTTP 客户端 | axios | 1.20.0 | `src/api/http.ts` 统一实例，含超时/请求 ID/错误归一化 + 类型守卫 |
| 组件库 | 缺失 | — | 无 element-plus / ant-design-vue 等 |
| 单元测试 | 缺失 | — | 无 jest / vitest / @vue/test-utils |
| CI/CD | 缺失 | — | 无 .github/workflows、无 Dockerfile、无部署脚本 |
| 环境变量 | dotenv（cli-service 内置） | — | `.env.development` / `.env.production`，键为 `VUE_APP_*` |

---

## 3. 目录结构（P0 改造前基线）

```text
personal-workspace/                     # Git 仓库根
├── personal-workspace-app/
│   └── index.py                        # 后端占位（空文件）
└── personal-workspace-web/             # 本分析对象
    ├── package.json                    # 依赖 + scripts + eslintConfig + browserslist
    ├── package-lock.json               # npm lockfile v3
    ├── vue.config.js                   # 仅 { transpileDependencies: true }
    ├── babel.config.js                 # @vue/cli-plugin-babel/preset
    ├── jsconfig.json                   # IDE 侧 @ -> src 路径映射（target es5）
    ├── .gitignore                      # node_modules / dist / .env*.local / 编辑器文件
    ├── README.md                       # 默认脚手架说明 + 未解决的合并冲突标记
    ├── public/
    │   ├── index.html                  # HTML 模板（含残留字符串 "sdfds"）
    │   └── favicon.ico
    └── src/
        ├── main.js                     # createApp(App).mount('#app')
        ├── App.vue                     # 根组件，引入 HelloWorld
        ├── components/
        │   └── HelloWorld.vue          # 脚手架示例组件（文档链接页）
        └── assets/
            └── logo.png                # 脚手架默认 Vue logo
```

结构性事实：`src` 下只有 4 个文件，**没有** `views/`、`router/`、`store/`、`api/`、`styles/`、`utils/`、`composables/` 等分层。（P0 后的结构见第 10 节。）

---

## 4. 构建与运行链路

### 4.1 命令

| 命令 | 实际执行 | 用途 |
| --- | --- | --- |
| `npm run serve` | `vue-cli-service serve` | 本地开发，默认 http://localhost:8080 |
| `npm run build` | `vue-cli-service build` | 生产构建到 `dist/` |
| `npm run lint` | `vue-cli-service lint` | ESLint 检查（默认带 --fix 行为） |

### 4.2 配置现状与生效的默认值（P0 改造前）

- `vue.config.js` 通过 `defineConfig` 包装，只声明了 `transpileDependencies: true`，其余全部走 vue-cli 默认值。
- 因此当前生效的隐含配置：`publicPath: '/'`、`outputDir: 'dist'`、`assetsDir: ''`、`runtimeCompiler: false`（不能用字符串模板运行时编译）、`productionSourceMap: true`、`devServer.port: 8080`、`devServer.proxy` 未配置。
- 无 `postcss.config.js`、无 `.browserslistrc`（browserslist 内联在 package.json：`> 1%`、`last 2 versions`、`not dead`、`not ie 11`）。
- 因 browserslist 全部支持 ES module，构建只产出单套 bundle（无 legacy 差异加载），日志已验证。

### 4.3 实测结果（本次分析真实执行）

- `npm run lint`：**通过**，输出 `No lint errors found`。
- `npm run build`：**通过**，编译耗时 7587ms，产物：
  - `dist/js/chunk-vendors.*.js` 105.29 KiB（gzip 37.65 KiB）
  - `dist/js/app.*.js` 13.99 KiB（gzip 8.85 KiB）
  - `dist/css/app.*.css` 0.33 KiB
  - 同时产出 `.js.map`（印证 `productionSourceMap` 默认 true，公开部署建议显式关闭）
- 参考体量：vendors 约 105 KiB 是"只有 Vue 运行时"的地板价；引入组件库后需重点关注首包，优先按需引入。
- 注意：ESLint 已接入 webpack 链路，后续 serve/build 阶段出现 lint error 会直接导致构建失败。

---

## 5. 代码风格与现有约定

- 单文件组件（SFC）三段式：`<template>` / `<script>` / `<style>`；`HelloWorld.vue` 使用 `<style scoped>`，`App.vue` 使用全局样式。
- 组件写法为 **Options API**（`export default { name, components, props }`），不是 `<script setup>`。
- 组件名 PascalCase、一个文件一个组件、目录无 `index.js` 聚合导出。
- 路径别名 `@/` → `src/`：运行时由 vue-cli 内置提供（`resolve.alias`），类型侧由 `tsconfig.json` 的 `paths` 提供（两处需保持一致）；`resolve.extensions` 另需包含 `.ts`，见 `vue.config.js`。
- ESLint 规则集：`plugin:vue/vue3-essential` + `eslint:recommended`，外加 `overrides`（`*.ts`/`*.tsx`/`*.vue`）里的 `@typescript-eslint` 规则：禁 `any`、强制 `import type`、替换版 `no-unused-vars`，并关掉 TS 下会误报的 `no-undef`/`no-unused-vars`。
  仍未强制属性命名顺序、未限制 `v-html`、未限制组件复杂度（`eslint-plugin-vue` 的强规则集与 Prettier 留给 P4）。
- 共享类型放 `src/types/`；`process.env.VUE_APP_*` 在 `src/types/env.d.ts` 里声明，新增变量三处同步（`.env.*`、`env.d.ts`、README 变量表）。
- 无 Prettier、无 `.editorconfig`、无 git hooks（husky/lint-staged）、无 commit message 规范。
- 若后续引入 `eslint-plugin-vue@9` + Prettier，需先把 ESLint 从 7.32 升级到 8.x，否则 peer 依赖不兼容。

---

## 6. 现存问题与风险（按优先级 · 含 P0 处理结果）

1. ✅ **已处理** · README.md 含未解决的合并冲突标记（`<<<<<<< HEAD` / `=======` / `>>>>>>> 905e4f6...`），已重写为真实项目说明。
2. ✅ **已处理** · `public/index.html` 残留 `<div id="app">sdfds</div>`、`lang=""`、默认包名标题；现为 `lang="zh-CN"` + `VUE_APP_TITLE` 驱动的标题。
3. ✅ **已处理** · 无路由；已引入 vue-router 4，含首页与 404 视图。
4. ✅ **已处理** · 无状态管理；已引入 pinia，落地 `src/stores/app.ts`（主题 + 侧栏折叠）。
5. ✅ **已处理（前端侧）** · 无请求层与环境配置；已引入 axios 统一实例、`.env.*`、devServer `/api` 代理。**仍缺后端接口契约**（`index.py` 依旧为空）。
6. **P1 · AI 流式响应方案未定**：需为 SSE / fetch stream 预留统一封装，不能把流式逻辑散进组件。
7. **P2 · 无 UI 体系**：未选定组件库与设计令牌（颜色/间距/暗色主题），后补会引发全站返工。
8. **P2 · 无测试、无 CI**：目前唯一"通过"信号是构建成功，无法保证重构安全。
9. ⚠️ **部分处理** · 已补 404 页面与主题令牌；原 `jsconfig.json` 的 `target: es5` 与 browserslist（`not ie 11`）不一致，已随 TS 迁移删除该文件、由 `tsconfig.json`（`target: esnext`）取代（R11 关闭）。仍未声明 `engines`，无品牌资源（`favicon.ico` 仍是 Vue 默认）。
10. ✅ **已处理**（2026-09-02） · 语言层无类型约束；已全量迁移到 TypeScript 5.4，详见第 11 节。

---

## 7. 后续开发的目标架构建议

### 7.1 推荐目录结构（新增部分，不推翻现有约定）

```text
src/
├── main.ts                     # 装配 router / pinia / 全局样式
├── App.vue                     # 仅保留 <router-view> + 全局布局壳
├── router/
│   └── index.ts                # 路由表，视图组件一律 () => import() 懒加载
├── stores/                     # pinia：conversation / user / settings / ui
├── api/                        # 唯一的后端调用出口
│   ├── http.ts                 # axios 实例 + 拦截器 + baseURL 取自 env
│   └── chat.ts                 # 含 SSE 流式封装
├── types/                      # 共享类型与 process.env 声明（迁移 TS 时新增）
├── views/                      # 路由级页面（懒加载入口）
├── components/
│   ├── base/                   # 通用无业务 UI 原子件
│   └── business/               # 带业务语义的可复用块
├── composables/                # useXxx()：跨组件逻辑与 API 编排
├── styles/                     # tokens.css / reset.css / 主题变量
├── utils/                      # 纯函数工具，禁止依赖 Vue 实例
├── constants/                  # 枚举、模型清单、快捷键等
└── assets/                     # 图片/字体
.env.development / .env.production
vue.config.js                   # 增加 devServer.proxy、productionSourceMap:false
```

### 7.2 选型建议

| 能力 | 建议 | 理由 | 落地方式 |
| --- | --- | --- | --- |
| 路由 | vue-router@4 | Vue 3 官方配套 | `vue add router`（@vue/cli-plugin-router 5.0.x）或 `npm i vue-router@4` 后手工建 `src/router/index.ts` |
| 状态 | pinia@2 | Vue 3 推荐、无 mutation 冗余 | `npm i pinia`，无官方 CLI 插件，需手工装配 |
| 请求 | axios@1 | 拦截器/取消/超时成熟 | `npm i axios`，实例统一放 `src/api/http.ts` |
| 流式 | 自研 fetch + ReadableStream | 原生 EventSource 不支持 POST 与自定义 header，AI 接口通常需要 | 封装在 `src/api/`，经 composable 暴露给视图 |
| UI 库 | element-plus@2（或坚持自研） | 生态成熟、中文文档全 | webpack5 下按需引入用 unplugin-vue-components 的 webpack 版；关注首包 |
| 样式 | sass + CSS 变量令牌 | 主题/暗色切换成本最低 | `npm i -D sass`，`styles/tokens.css` 定义 `--color-*` |
| 测试 | vitest + @vue/test-utils@2 | 与 webpack 主链路解耦，接入成本低于改造 jest | 新增 `vitest.config.js`，不动 build 链路 |
| 规范 | prettier + eslint-plugin-vue@9 + husky/lint-staged | 现有规则集过弱，多人协作会漂移 | 前置条件：ESLint 升级到 8.x |
| 类型 | **已引入 TypeScript 5.4**（2026-09-02，原建议为「暂不引入」） | 业务代码即将铺开，类型契约越早定越省成本 | 未走 @vue/cli-plugin-typescript（peer 冲突），改用 ts-loader + vue-tsc，详见第 11 节 |
| 部署 | Nginx 静态托管 `dist/` | SPA 需 fallback 到 index.html | 后续补 CI 构建与发布脚本 |

### 7.3 分期路线

- **P0 基建**：清理 README 冲突与 index.html 残留 → 接入 router + pinia + axios + `.env` + devServer 代理 → 关闭生产 source map。
- **P1 骨架**：布局壳（侧栏/头部/主题令牌）→ 路由级视图清单 → 加载态与错误页。
- **P2 主流程**：会话列表 + 对话页 + 消息渲染（Markdown/代码块）→ 打通后端聊天接口。
- **P3 体验**：流式打字机输出、中断/重试、消息持久化、长列表虚拟化、快捷键。
- **P4 工程化收尾**：单元测试 + 收紧 lint 规则 + CI 构建产物 + 前后端接口契约文档。

---

## 8. 后续任务开发约定（执行时按此自检）

**分支与提交**
- 新功能分支使用 `codex/<task-slug>` 前缀；`main` 只接受可构建的提交。
- 提交前必须通过 `npm run lint`、`npm run type-check` 与 `npm run build`。

**代码放置规则**
- 后端地址、模型 ID、开关等只允许来自 `process.env.VUE_APP_*`，禁止组件内硬编码。
- 网络调用只出现在 `src/api/**`；组件通过 `src/composables/**` 使用，不直接 import axios。
- `views/*` 路由组件必须懒加载；`components/base/*` 不允许依赖 store 与 api。
- 新依赖必须写明用途，并同步更新本文档第 2 节表格与 `docs/project-profile.json`。

**每个任务的交付清单**
1. 需求 → 影响的文件/模块清单；
2. 实现代码（遵循第 5 节风格，`src/**` 一律 TypeScript）；
3. 自检证据：lint 通过、build 通过、手动验证路径描述；
4. 文档更新：本文档 + `docs/project-profile.json`，必要时新增接口契约文档。

---

## 9. 快速上手命令

```bash
cd personal-workspace-web
npm install                 # 已存在 node_modules（574 个包目录 / 191 MB）
npm run serve               # http://localhost:8080
npm run type-check          # vue-tsc 类型检查
npm run build               # 先类型检查，再构建，产物在 dist/
npm run lint                # ESLint 检查（含 .ts/.tsx/.vue）
```

分析过程产生的 `dist/` 属于构建产物，已在 `.gitignore` 中，不会进入版本库。

---

## 10. P0 基建落地记录（2026-09-01）

### 10.1 变更清单

**新增依赖**：`vue-router@4.6.4`、`pinia@2.3.1`、`axios@1.20.0`（共新增 14 个包）。

**新增文件**

| 文件 | 作用 |
| --- | --- |
| `src/router/index.js` | 路由表（`/` → HomeView，`/:pathMatch(.*)*` → NotFoundView）、`afterEach` 设置文档标题 |
| `src/stores/app.js` | pinia store：`theme`（localStorage 持久化 + 跟随系统）、`sidebarCollapsed` |
| `src/api/http.js` | axios 实例：`baseURL`/超时取自 env、注入 `X-Request-Id`、响应解包、错误归一化为 `ApiError`（`CANCELED`/`TIMEOUT`/`NETWORK`/`HTTP_ERROR`） |
| `src/api/workspace.js` | 领域接口出口，当前提供 `checkHealth()`，支持 `AbortSignal` |
| `src/views/HomeView.vue` | 首页：基建清单 + 后端连通性探测（含取消与失败态） |
| `src/views/NotFoundView.vue` | 404 页 |
| `src/components/base/StatusPill.vue` | 无业务依赖的状态标签（`base` 分层首例） |
| `src/styles/global.css` | CSS 变量设计令牌 + 明暗双主题 + 基础样式重置 |
| `.env.development` / `.env.production` | `VUE_APP_TITLE` / `VUE_APP_API_BASE` / `VUE_APP_API_TIMEOUT` / `VUE_APP_DEV_PORT` / `VUE_APP_API_PROXY_TARGET` |
| `AGENTS.md` | 开发与协作约定（目录职责、env 策略、验证基线、分支规范） |

**修改文件**：`package.json`（依赖 + eslint env）、`vue.config.js`（`productionSourceMap: false`、`pages` 标题、`devServer.port/proxy`）、`public/index.html`、`src/main.js`（装配 pinia + router + 全局样式）、`src/App.vue`（改为布局壳）、`README.md`（重写）。

**删除文件**：`src/components/HelloWorld.vue`（脚手架示例，已无引用）。`src/assets/logo.png` 保留但已无引用，待替换为真实品牌资源。

**代码风格变更**：新代码统一 `<script setup>` + Composition API，`App.vue`/`HomeView.vue`/`NotFoundView.vue`/`StatusPill.vue` 已全部转为此风格；第 5 节描述的 Options API 现状仅作为历史记录保留。

### 10.2 当前 src 结构

```text
src/
├── main.ts
├── App.vue
├── router/index.ts
├── stores/app.ts
├── api/http.ts
├── api/workspace.ts
├── types/ui.ts            # 共享联合类型（StatusState）
├── types/env.d.ts         # process.env 的 VUE_APP_* 声明
├── views/HomeView.vue
├── views/NotFoundView.vue
├── components/base/StatusPill.vue
├── styles/global.css
└── assets/logo.png          # 未引用，待替换
```

> 该小节记录的是 P0 完成时的形态；其中的 `.js` 路径已于 2026-09-02 全部改为 `.ts`（见第 11 节）。

### 10.3 静态原型（2026-09-02 新增 `demo/`）

`demo/` 是**零依赖静态 HTML 原型**，不参与 `npm run serve` / `npm run build`，也不在 ESLint 的 `src` 范围内，
用于在写业务代码之前冻结「对话」与「知识库」两个模块的布局、状态与交互口径。

```text
demo/
├── index.html          # 工作台总览（统一提问入口、指标、站点地图、令牌速览）
├── chat.html           # 对话模块（会话列表 / 消息流 / 参数面板 / 输入区）
├── knowledge.html      # 知识库模块（库列表 / 文档表格 / 上传队列 / 分片抽屉 / 召回测试）
├── assets/
│   ├── tokens.css      # 设计令牌（上半段与 src/styles/global.css 同源）
│   ├── prototype.css   # 外壳与通用组件
│   ├── modules.css     # 三个模块各自样式
│   └── prototype.js    # 主题 / 图标 / 布局切换 / 模块内交互（原生 JS）
├── shots/              # 1440×900 示例图（浅/深双主题 + 空状态、停止/失败、抽屉等状态图）
└── README.md           # 原型说明与「区域 → 代码落点」对照表
```

与 P1/P2 路线图的关系：原型已给出 `views/ChatView.vue`、`views/KnowledgeView.vue`、
`components/business/{SessionList,MessageStream,ChatComposer,ChatParamsPanel,KbList,ChunkList,RecallTester}.vue`
的切分建议，以及 `POST /api/chat/completions`（SSE）、`GET /api/kb/{id}/documents`、
`POST /api/kb/{id}/retrieve` 等待实现接口的字段口径；扩展令牌清单见 `demo/assets/tokens.css` 下半段，
正式开发时并入 `src/styles/global.css`（对应 P1「主题令牌扩展」）。

### 10.4 验证证据

- `npm run lint`：**0 error**（先遇到两个真实坑，见 10.4，已修）。
- `npm run build`：**成功**，编译 9036ms；产物 `chunk-vendors` 196.45 KiB（gzip 70.22）、`index` 11.08 KiB（gzip 5.14）、懒加载 chunk `745` 0.72 KiB（NotFoundView，证明代码分割生效）、`index.css` 3.96 KiB；**`.map` 文件数为 0**，`productionSourceMap: false` 生效。
- 产物 HTML：`<html lang="zh-CN">`、`<title>个人 AI 工作台</title>`、无 `sdfds` 残留。
- 开发服务器（临时启动验证，已关闭）：`GET /` → 200；`GET /api/health` → 500 `Proxy error ... ECONNREFUSED`，证明 `/api` 代理规则已生效且指向 `http://127.0.0.1:8000`（后端未启动属预期）。
- 无头浏览器渲染：页面正常挂载，顶栏品牌、主题切换按钮、两张卡片、状态标签（待命）均正确显示，说明 pinia/router/env 注入链路可用。

### 10.5 落地过程中的工程坑（后续注意）

1. ESLint 7 不识别 `env: es2022`，会直接报 `Environment key "es2022" is unknown`；本项目使用 `es2021`。升级到 ESLint 8 后才可用 `es2022`。
2. `eslint-plugin-vue@8` 不会自动声明 `<script setup>` 编译器宏，需显式加 `"vue/setup-compiler-macros": true`，否则 `defineProps` 触发 `no-undef`。升级到 `eslint-plugin-vue@9` 后该 env 已内置，需移除以免告警。
3. 依赖体积影响：vendors 从 105.29 KiB 增至 196.45 KiB（gzip 37.65 → 70.22 KiB），增量为 router + pinia + axios。引入 UI 组件库前需先确认按需引入方案。

### 10.6 剩余缺口（下一步）

- **P1 骨架**：侧栏 + 内容区布局壳（`sidebarCollapsed` 已在 store 中，尚无消费方）、真实品牌资源与 favicon、把 `assets/logo.png` 换成产品标识。
- **P1/P2**：UI 组件库选型确认（element-plus 或自研）、会话与对话视图、Markdown/代码块渲染、后端接口契约（`personal-workspace-app` 需要真实 `/api/health` 与聊天接口）。
- **P2 流式**：AI 对话的 SSE / fetch-stream 封装，放 `src/api/`，经 `src/composables/` 暴露。
- **P4 工程化**：vitest + @vue/test-utils、CI（lint + type-check + build）、`engines` 声明、可选 Prettier（需先升 ESLint 8）。

---

## 11. TypeScript 迁移记录（2026-09-02）

按 `AGENTS.md` 的选型确认流程，把项目规范从「Vue 3.5 + JavaScript」改为「Vue 3.5 + TypeScript」，并把现存代码全量迁完，不留双语并存。

### 11.1 变更清单

**新增依赖（dev）**：`typescript@5.4.5`、`vue-tsc@1.8.27`、`ts-loader@9.6.2`、`@types/node@18.19.x`、`@typescript-eslint/parser@5.62.0`、`@typescript-eslint/eslint-plugin@5.62.0`。
**移除依赖（dev）**：`@babel/eslint-parser`（解析器已换成 `@typescript-eslint/parser`）。
**依赖版本收紧**：`vue` 从 `^3.2.13` 提到 `^3.5.0`（实际安装一直是 3.5.42）——`withDefaults(defineProps<T>())` 引用导入类型需要 Vue 3.3+，声明过宽会让新机器装出不支持写法的版本。

**重命名**：`src/main.js`、`src/router/index.js`、`src/stores/app.js`、`src/api/http.js`、`src/api/workspace.js` → 同名 `.ts`。
**新增**：`tsconfig.json`、`src/types/ui.ts`、`src/types/env.d.ts`。
**删除**：`jsconfig.json`（被 `tsconfig.json` 取代；同时消掉 issue R11「target es5 与 browserslist 不一致」）。
**改写**：4 个 SFC 全部加 `lang="ts"`，`StatusPill.vue` 的 props 从运行时声明改为 `withDefaults(defineProps<Props>(), ...)`，`HomeView.vue` 的 `catch (error)` 走 `isApiError` 类型守卫。

**脚本变更**（`package.json`）

| 脚本 | 现在执行 | 说明 |
| --- | --- | --- |
| `serve` | `vue-cli-service serve` | 不变，类型错误不阻塞热更（保证开发流畅） |
| `type-check` | `vue-tsc --noEmit` | 新增，唯一的全量类型检查入口 |
| `build` | `npm run type-check && vue-cli-service build` | 类型错误即构建失败，等价于官方插件 fork-ts-checker 的作用 |
| `lint` | `vue-cli-service lint "src/**/*.{ts,js,jsx,vue}" "*.js"` | 必须显式给 glob：插件的扩展名表来自 `hasPlugin('typescript')`，本项目没装该插件 |

### 11.2 为什么不用 `@vue/cli-plugin-typescript`

`@vue/cli-plugin-typescript@5.0.9` 的 `peerOptional cache-loader@^4.1.0` 仍要求 `webpack@^4`，在本项目（webpack 5）下 `npm install` 直接 ERESOLVE 失败，只能仓库级 `legacy-peer-deps` 才能装。为避免把「忽略 peer」变成全项目长期约束，改为手工接线，代价集中在 `vue.config.js` 的 `chainWebpack`：

1. `rule('ts')`：`test /\.tsx?$/`，`ts-loader`（`transpileOnly`、`appendTsSuffixTo: [/\.vue$/]`）→ `babel-loader`（loader 右→左执行，先脱类型再做 preset-env 降级）。
2. `resolve.extensions` 追加 `.ts`/`.tsx`，否则 `@/api/http` 这类无扩展名导入解析不到。
3. `config.plugin('eslint').tap(...)` 给 `lintOnSave` 的 eslint-webpack-plugin 补 `.ts`/`.tsx`，否则构建期只检查 `.js/.jsx/.vue`，`.ts` 会静默漏检。

`transpileOnly: true` 是有意为之：类型检查由 `vue-tsc` 单点负责，避免 ts-loader 与 vue-tsc 重复编译、重复报错。

### 11.3 迁移过程中踩到的两个坑

1. **`@babel/preset-typescript` 不能替代 ts-loader。** 最初的方案是把 preset-typescript 塞进 `babel.config.js`，`tsc` 与 `.ts` 文件都正常，但 `npm run build` 在 `App.vue?vue&type=script&lang=ts` 上报 `Missing initializer in const declaration`。
   原因：vue-loader 用「伪造文件名」`App.vue.ts` 去匹配 loader 规则，但传给 Babel 的 `filename` 仍是 `App.vue`，preset-typescript 的 `test: /\.ts$/` 扩展名探测因此失效。
   理论上 `allExtensions: true` 可以绕过，但那会让 TS 解析器作用到所有被转译的文件（`transpileDependencies: true` 下含全部 node_modules），存在误解析风险。改用 ts-loader 的 `appendTsSuffixTo`（按 `resourcePath` 判定）后没有这个问题。
2. **`no-undef` 在 TS 文件下会误报内建类型。** `Record<...>`、`Promise<T>` 会被判成未定义变量，`import type` 也会被基座 `no-unused-vars` 判成未使用。因此在 `overrides` 里对 `*.ts`/`*.tsx`/`*.vue` 关掉这两条基座规则，改用 `@typescript-eslint/no-unused-vars`。

### 11.4 验证证据

- `npm run type-check`：**0 error**（`vue-tsc --noEmit`，含 `.vue` 模板类型检查）。
- `npm run lint`：**0 error / 0 warning**（显式 glob 生效，`.ts` 与 `.vue` 均被 `@typescript-eslint` 规则覆盖）。
- `npm run build`：**成功**，编译约 10.4s；产物 `chunk-vendors` 197.16 KiB（gzip 70.40）、`index` 11.60 KiB（gzip 5.35）、懒加载 chunk `461` 0.72 KiB（NotFoundView）、`index.css` 3.96 KiB；**无 `.map` 产物**。相对 P0 基线（196.45 / 11.08 KiB）增量 < 1 KiB，来自首页新增的一行能力说明。
- **负向验证**（确认检查链路没有静默缩水）：
  - 在 `src/api/workspace.ts` 里加 `export const probeAny: any = 1` → `npm run lint` 与 `npm run build` 均**失败**并指名 `@typescript-eslint/no-explicit-any`。
  - 在 `StatusPill.vue` 的 `<script setup lang="ts">` 里加未使用变量 → `npm run lint` 报 `@typescript-eslint/no-unused-vars`（证明 `.vue` 也走了 TS 规则）。
- **运行时冒烟**（无头浏览器加载 `dist/`）：`<title>工作台 · 个人 AI 工作台</title>` 证明 router + `RouteMeta` 生效；`data-theme="light"` 证明 pinia store 的 `watchEffect` 生效；状态标签渲染为「待命」，证明 `withDefaults(defineProps<Props>())` + 导入类型在运行时正确；新增的「TypeScript / vue-tsc」能力行正常显示。

### 11.5 行为差异与遗留

- `ApiError.code` 现在是受限联合类型 `ApiErrorCode`。后端若返回白名单外的 `code`，之前会原样透传，现在归一化为 `'HTTP_ERROR'`，原值仍保留在 `ApiError.detail.code`。当前后端未实现（R10），不影响现有调用方。
- `StatusPill` 的 `state` 由 `string` 收紧为 `StatusState`，模板里原有的 `|| props.state` 兜底分支已删除（类型上不再可达）。
- 未引入 `parserOptions.project`，因此 `@typescript-eslint` 的**需要类型信息**的规则（如 `no-floating-promises`）暂不可用；`serve` 阶段不做类型检查，需要即时反馈可在 IDE 开 Volar/vue-tsc。
- `demo/` 仍是原生 JS 静态原型（无构建步骤），是「全量 TS」的显式例外。

---

## 12. 登录与鉴权落地记录（2026-09-03）

补齐 `demo/` 原型缺失的登录页，并把「未登录自动跳转」做成路由级约束。对应新增 issue **R15**（原 `absent.auth` 关闭）。

### 12.1 组件切分（按 vue-best-practices 的 component map 先设计后编码）

| 文件 | 单一职责 | 数据流 |
| --- | --- | --- |
| `src/views/LoginView.vue` | 路由级编排面：品牌区 + 表单区 + mock 提示 | 从 `useLogin()` 取只读投影，向 `LoginForm` 传 props |
| `src/components/business/LoginForm.vue` | 凭据表单：字段态 + 本地校验 + 提交 | `v-model` 内部字段；`props: pending/errorMessage/mock*`；`emit('submit', LoginPayload)` |
| `src/components/business/LoginHero.vue` | 左侧项目背景插画（纯 SVG，无文字节点） | 只有一个可选 `label` prop（无障碍描述）；不依赖 store 与 api |
| `src/components/base/TextField.vue` | 带标签/错误/密码可见性切换的输入原子件 | `defineModel<string>()` + props；不依赖 store 与 api |
| `src/components/business/ThemeToggle.vue` | 主题切换按钮（App 外壳与登录页共用） | 依赖 `stores/app.ts` |
| `src/components/business/UserMenu.vue` | 顶栏当前用户与退出入口 | 依赖 `stores/auth.ts` + `useLogout()` |
| `src/composables/useLogin.ts` | 登录编排：api → store → 回跳；卸载时取消请求 | 只暴露 `computed` 只读投影与 `submit()` |
| `src/composables/useLogout.ts` | 退出编排：先清本地再通知后端 | 同上 |
| `src/api/auth.ts` | 唯一出口：`login()` / `logout()`，mock 与真实请求同一签名 | 返回归一化 `AuthSession` |
| `src/stores/auth.ts` | 会话事实源（pinia，options 风格与 `stores/app.ts` 一致） | `startSession/clearSession/pruneExpiredSession` |
| `src/utils/authSession.ts` `src/utils/redirect.ts` | 纯函数：本地读写/过期判断、回跳白名单 | 不依赖 Vue 运行时 |

### 12.2 关键决策

- **mock 开关**：`VUE_APP_MOCK_AUTH`（开发 `true` / 生产 `false`）。`login()` 两条分支返回同一个 `AuthSession` 结构，
  失败时 mock 抛出的 `ApiError` 与真实后端经 `http.ts` 拦截器归一化后的结果同形（`status: 401` + `code: 'HTTP_ERROR'`），
  因此**没有**为鉴权扩宽 `ApiErrorCode` 联合类型。切真实接口只改 env。
- **守卫**：`router.beforeEach` 内 `useAuthStore()`（pinia 在 `main.ts` 中先于 router 安装，模块顶层取实例会拿到未激活的 pinia）。
  受保护路由由 `meta.requiresAuth` 声明，404 页同样受保护，避免未登录时探测路由是否存在。
- **布局**：`meta.layout: 'blank'` 让登录页不套 `App.vue` 的顶栏外壳；登录页需要整屏且自带主题开关。
- **会话持久化**：勾选「记住我」才写 `localStorage['workspace.session']`；未勾选只存内存，刷新即失效。
  读取时对脏数据/解析失败一律按「无会话」处理，过期会话在守卫里 `pruneExpiredSession()` 清理。
  > 为什么不在 getter 里直接判过期：pinia getter 是 `computed`，`Date.now()` 不是响应式源，会把结果缓存住。
- **token 注入**：`http.ts` 新增 `setAuthToken()`，请求拦截器据此加 `Authorization: Bearer …`。
  由 `stores/auth.ts` 单点同步，避免「store → api → store」的循环依赖，也让后端接管后所有请求自动带凭证。
- **回跳安全**：`meta` 拦截时把 `to.fullPath` 放进 `query.redirect`，登录成功后经 `resolveSafeRedirect()` 白名单校验
  （只放行站内绝对路径，挡掉 `//evil.com`、`/\evil.com`、绝对 URL 与指向 `/login` 自身的回环）。
- **令牌扩展**：`demo/assets/tokens.css` 下半段（`--color-surface-sunken`、`--color-accent-soft`、`--shadow-*`、
  `--radius-lg/pill`、`--font-*` 等）按原型 README 的约定并入 `src/styles/global.css`，并补 `:focus-visible` 焦点环、
  表单控件字体继承与 `.icon` 图标基元；组件内不写死色值。

### 12.3 与 vue-best-practices 的对应

- 反应式：基础类型用 `shallowRef`，表单这类「单状态对象」用 `reactive` 就地改，派生值全部 `computed`，getter 保持纯函数。
- SFC：`<script setup lang="ts">` 段序 script → template → style；`<style scoped>` 以类选择器为主；模板不做过滤/分支推导。
- 数据流：props down / events up，`defineProps<Props>()` + `defineEmits<{ submit: [LoginPayload] }>()` 显式契约，
  双向绑定用 Vue 3.4+ 的 `defineModel`；DOM 引用用 3.5 的 `useTemplateRef`。
- 组合式：登录/退出的状态与副作用从组件抽到 `useLogin`/`useLogout`，对外只给只读投影，卸载时 `onScopeDispose` 取消请求。
- 可选特性与性能项：本需求没有列表虚拟化、Teleport、KeepAlive 等诉求，未额外引入。

### 12.4 验证证据

- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功；登录页切成独立懒加载 chunk
  （`812.*.js` 9.42 KiB / gzip 3.76 KiB，`812.*.css` 6.57 KiB），`chunk-vendors` 200.66 KiB（gzip 71.67），无 `.map`。
- 逻辑断言 41 条全部通过（一次性脚本直接加载 `src` 下真实模块，非复刻）：
  回跳白名单 7 条、mock 登录与错误形态 7 条、store 记住我/恢复/过期/脏数据 11 条、请求层 token 与请求 ID 4 条、
  真实路由守卫 10 条（未登录拦截、带参回跳、404 保护、已登录访问 /login 回首页、过期清理、退出后再拦截）。
- 未做像素级视觉核对：本会话内无法批准启动开发服务器/无头浏览器。人工核对路径见 `README.md`「登录与鉴权」。

## 13. 原型整体迁移落地记录（2026-09-03）

登录页补齐后，把 `demo/` 的三个页面整体迁进 `src/`：外壳（侧栏 + 顶栏 + 列数布局）、工作台总览、对话模块、知识库模块。
落点严格按 `demo/README.md` 的对照表执行。

### 13.1 新增结构

| 层 | 文件 | 职责 |
| --- | --- | --- |
| 外壳 | `src/App.vue`、`components/business/AppSidebar.vue`、`AppTopbar.vue`、`UserMenu.vue`、`ToastLayer.vue` | 侧栏/顶栏/折叠/布局切换/全局搜索/退出 |
| 对话 | `types/chat.ts`、`constants/chat.ts`、`api/chat.ts`、`stores/chat.ts`、`composables/useChatStream.ts` | 会话列表、流式消息、参数面板、输入区 |
| 知识库 | `types/knowledge.ts`、`constants/knowledge.ts`、`api/knowledge.ts`、`stores/knowledge.ts`、`composables/useRetrieval.ts`、`useUploadQueue.ts` | 库列表、文档表格、上传队列、分片抽屉、召回测试 |
| 基元 | `components/base/AppIcon.vue`、`InlineText.vue`、`StatCard.vue`、`AppDrawer.vue`、`constants/icons.ts` | 图标注册表、行内标记、迷你折线、抽屉 |
| 视图 | `views/ChatView.vue`、`views/KnowledgeView.vue`，`views/HomeView.vue` 演进为总览 | 只做编排，状态来自 store |
| 样式 | `styles/primitives.css`、`styles/modules.css` | 由 `demo/assets/*.css` 逐字移植 |

路由拆成 `router/routes.ts`（表与 `meta`）+ `router/guards.ts`（登录守卫）+ `router/index.ts`（装配与标题），
前两者不依赖 history 实例，可在无浏览器环境按真实配置校验。

### 13.2 关键决策

- **流式抽象**：`streamCompletion(request, events, options)` 以 `onThink / onBlock / onAppendText / onCitations / onUsage`
  事件驱动。mock 用定时器逐段吐字，真实分支按 SSE 帧逐行解析（`event:` / `data:`），顺序一致，
  因此 store 不需要知道当前是假数据还是真接口。取消统一抛 `ApiError(code: 'CANCELED')`，不覆盖已落好的 stopped 态。
- **不引入 v-html**：原型的回答是 HTML 字符串，迁移后改为结构化块（paragraph / heading / list / code）+
  `utils/richtext.ts` 解析 `**加粗**`、`` `行内代码` ``，召回命中用 `segments[{text, marked}]` 表达 `<mark>`。
  渲染侧全部走 `v-for` + 元素，避免注入面。
- **mock 粒度**：新增 `VUE_APP_MOCK_API` 管对话与知识库，与 `VUE_APP_MOCK_AUTH` 分开，便于逐域切真。
- **布局/侧栏/主题持久化**：`workspace.layout.<module>`、`workspace.sidebar-collapsed`，与既有 `workspace.theme` 一致。
- **上传队列**：定时器持有在 store（离开页面继续索引），完成提示由 `useUploadQueue` 通过 watch `lastIndexedFile` 发出，
  避免 store 依赖 toast store。
- **引用来源闭环**：`/chat` 点击 `.cite` → `/knowledge?doc=<名>` → 自动定位并打开分片抽屉。

### 13.3 样式分层：偏差已闭环（R17 已 resolved）

移植 demo 的设计系统层时，曾与本文件早期约定「样式用 `<style scoped>`」冲突：`.shell` / `.rail` / `.panel` / `.btn` /
`.card` / `.module` 等类被 10+ 组件共用，逐个 scoped 复制会双份维护且必然漂移。2026-09-03 经用户确认，
**选择修订 `AGENTS.md` 而不是把样式拆进各组件**，AGENTS.md 新增「样式分层」一节，口径固化为三层：

| 层 | 文件 | 放什么 | 约束 |
| --- | --- | --- | --- |
| 令牌与基础 | `src/styles/global.css` | 变量、reset、排版 | 全工程唯一允许出现色值字面量 |
| 设计系统层 | `src/styles/primitives.css`、`src/styles/modules.css` | 跨组件共用的类（经验值：≥3 处使用） | 只写类选择器，禁止色值 |
| 组件层 | 各 SFC `<style scoped>` | 单组件专属样式 | 不得回塞全局表 |

落地现状与此一致：组件专属样式共 12 个 SFC 带 `<style scoped>`（含本次为替换原型内联 `style=` 新增的 8 处），
`global.css` 之外的样式与 TS/Vue 文件里**硬编码色值为 0**（唯一的 `#ffffff` 已改为 `--color-on-danger`），
两个全局样式表只引用令牌变量。引入顺序 global → primitives → modules 固定在 `src/main.ts`，后者依赖前者的同名类覆盖关系。

### 13.4 构建体积

三个模块落地后入口从 224 KiB 涨到 304 KiB，触发 webpack 体积告警。处理方式不是关掉 hints：
`optimization.runtimeChunk: 'single'`（runtime 独立成 5.26 KiB chunk，业务变更不再让用户重下 runtime），
并把阈值调到当前实测之上（entry 400 KiB / 单文件 250 KiB），明显变大仍会告警。见 `vue.config.js` 注释。

### 13.5 验证证据

- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功且**无告警**。
- 一次性脚本直接加载 `src` 下真实模块（Node 25 原生类型剥离 + 自定义 loader 用 `@vue/compiler-sfc` 编译 SFC），共 185 条断言全部通过（分类见第 15.4 节，接口契约断言为本轮新增）：
  - 领域逻辑 72 条：行内标记与类型类映射、假流式逐段吐字与取消、chat store 分组/筛选/参数截断、
    `useChatStream` 发送/停止/重新生成、knowledge store 库切换/搜索/上传入表/抽屉、`useRetrieval` 调参联动。
  - 路由与守卫 26 条：真实路由表的 `meta`（layout / module / padded / requiresAuth）、未登录拦截与带参回跳、
    已登录访问 `/login` 回首页、过期会话清理与本地数据移除、回跳白名单 6 条。
  - 真实组件 SSR 渲染 57 条（41 条结构断言 + 16 条「无 `{{` / `[object Object]` / `undefined` / `NaN` 残留」反向断言）：登录页、外壳（侧栏/顶栏/搜索）、总览（问候/提问框/4 指标卡/最近会话/健康度/待办/连通性/模块入口）、
    对话（三栏标记、历史消息、失败气泡、停止标注、代码块、引用、思考、输入区、参数面板）、
    知识库（库列表、文档表格、状态标签、上传区、召回测试、抽屉、`file-type--*` 修饰类）、404 在壳内。
- 登录插画已做**离线位图核对**：把 `LoginHero.vue` 的 SVG 摘出、按明暗两套令牌取值内联成独立 `.svg`，用工作区自带的 LibreOffice（`soffice --convert-to png`）栅格化后逐项目检查（描边、层级、连接线是否被节点遮住）。
- 整页像素级核对仍未做：本会话无法批准启动开发服务器/无头浏览器（审批通道报错，且沙箱禁止监听端口）。人工路径见 `README.md`「页面与模块」。

### 13.6 本轮两项确认的处理（2026-09-03）

1. **样式分层口径（R17 → resolved）**：用户选择「修订 `AGENTS.md`」而不是把 `primitives.css` / `modules.css` 拆进各组件。
   `AGENTS.md` 新增「样式分层」一节，把判定口径（共用面广 → 全局表；单组件 → scoped）、引入顺序
   （global → primitives → modules，固定在 `src/main.ts`）与「色值只在 `global.css`」写成硬约束；
   同步更新了「目录职责」的 `src/styles/` 行、「验证基线」的构建体积数字，以及本档案的 `conventions.component` 与 `config.cssStrategy`。
   日后若要走全量 scoped，需要先修订该节并重新核对三页视觉，不要边写边混用两种口径。
2. **回归测试（R18 → 暂缓，仍 open）**：用户确认本期不引入测试框架。153 条断言继续以一次性脚本形式存在（未提交进仓库），
   因此**改动 `src/views/**`、`src/components/**`、`src/stores/**` 后必须手工重跑核对**，不能只依赖 lint + type-check + build。
   `AGENTS.md` 的「尚未引入（需要时先确认）」已加注暂缓结论，避免后续任务擅自安装 vitest。

---

## 14. 登录页左侧改为项目背景插画（2026-09-03）

用户反馈：左侧「把日常对话、资料检索和重复劳动，收进同一个工作台。」这类标语与三张卖点卡不符合预期，
要求换成**一张符合项目背景的图片**。

### 14.1 为什么是内联 SVG 而不是位图

| 方案 | 结论 | 原因 |
| --- | --- | --- |
| 位图（PNG/AI 生成图） | 未采用 | 主题切换需要两套导出；`src/assets` 走 webpack 资源链，一张装饰图直接进懒加载 chunk 的体积；明暗两版难以长期维护 |
| 内联 SVG 组件 | **采用** | 颜色全部取 `src/styles/global.css` 令牌（`var(--color-*)`），跟随 `data-theme` 自动切换；零新依赖；纯文本可 diff、可断言 |

符合 `AGENTS.md`「新增颜色只能加令牌变量，不要写死色值」与 vue-best-practices 的「一文件一组件 + `<script setup lang="ts">`」。

### 14.2 画面内容（对应本项目的三条主线）

`src/components/business/LoginHero.vue` 画的是一个工作台窗口，从左到右、从上到下依次是：
会话列表（首行高亮为当前会话）→ 用户气泡 + 带闪烁光标的流式回答气泡 → 两条引用来源 →
知识库面板（文档行 + 索引状态点 + 向量分片节点簇）→ 窗口下方虚线连接的「定时任务（规划中）」与「待办清单」两个节点。
即 `demo/` 三个页面（chat / knowledge / 自动化占位）的抽象缩影，而不是通用装饰图。

- 纯图形，**不含 `<text>` 节点**（避免中文文案在 SVG 里被字体度量撑破），无障碍描述走 `role="img"` + `aria-label`，默认值由 `withDefaults` 提供。
- 两处动效（光标闪烁、虚线流动）都在 `@media (prefers-reduced-motion: reduce)` 下关闭。
- 连接线必须画在两个节点**之后**，否则会被节点的不透明底色遮住（栅格化核对时发现并已修复）。

### 14.3 同时删除的内容

`src/views/LoginView.vue` 移除标语 `h1`、描述段落与 `highlights` 三卡数据（含其 `Highlight` 接口和全部 scoped 样式），
只保留品牌行（`WS` 角标 + `VUE_APP_TITLE`）与插画；`noUnusedLocals` 会因残留死代码直接 build 失败，因此一并清干净。

### 14.4 验证

- `npm run lint` / `npm run type-check` / `npm run build` 均 0 error、无告警；`LoginView` 懒加载 chunk 由 9.43 KiB 增至 17.22 KiB（gzip 4.86 KiB），仍是懒加载，不影响首屏。
- 一次性核对脚本新增 4 条登录页断言（插画存在、带无障碍描述、原标语与卖点卡不再出现、SVG 内无文字节点），总数 149 → **153**，全部通过。

---

## 15. 对接后端接口（2026-09-03）

依据 `docs/默认模块.md`（后端 `personal-workspace-app` 的 OpenAPI 经 widdershins 生成）把登录与健康检查从 mock 切到真实请求。

### 15.1 接口清单

| 端点 | 方法 | 请求体 | 响应 | 前端落点 |
| --- | --- | --- | --- | --- |
| `/api/v1/users/health` | GET | — | `{status, message}` 裸对象 | `src/api/workspace.ts` 的 `HEALTH_PATH` / `checkHealth()` |
| `/api/v1/users/userLogin` | POST | `UserLoginReq{userId, password}` | `BaseResponse<UserLoginRes{userId}>` | `src/api/auth.ts` 的 `USER_LOGIN_PATH` / `login()` |

`VUE_APP_API_BASE=/api` 是 axios 的 baseURL，所以模块内只写 `/v1/users/...`；开发环境由 `vue.config.js` 的
`devServer.proxy` 把 `/api` 转发到 `VUE_APP_API_PROXY_TARGET`（默认 `http://127.0.0.1:8000`），生产环境需 Nginx 承担同等职责。

### 15.2 BaseResponse 信封怎么拆

后端所有业务响应都套 `{code, message, data, trace_id, timestamp}`，而 `src/api/http.ts` 的响应拦截器只解到 `AxiosResponse.data`
（即整个信封）。处理方式是在请求层加通用工具、由领域模块显式选用，而不是在拦截器里全局拆——因为 `/users/health` 不套信封，
对话/知识库将来也不一定套，全局拆会误伤。

- `ApiEnvelope<T>` + `isApiEnvelope()`：只认「`code` 是数字」这一特征，不符合就当不是信封。
- `unwrapEnvelope<T>(payload, fallbackMessage)`：HTTP 200 但 `code !== 200` 也判失败，抛 `ApiError(code: 'BUSINESS_ERROR', status: code)`，
  并把 `trace_id` 落到 `ApiError.requestId`，报障时能和后端日志对齐。
- `API_ERROR_CODES` 增加 `BUSINESS_ERROR`；消费方仍只 `catch` `ApiError`，不需要感知信封结构。
- **后端把业务异常和参数校验异常都包成 HTTP 200 + 非 200 的 `code`**（见 `core/exception_handler.py`：业务码 40001、
  校验码 40000，文案后端已格式化好），所以前端主要靠 `unwrapEnvelope()` 报错，`ApiError.status` 存的是业务码。
- 裸 422 `HTTPValidationError` 只作为兜底（代理层/网关直接返回、或后端漏挂 handler 时）：`readValidationMessage()` 把它翻成
  「参数校验失败：password Field required」，`loc` 首段是位置标签（body/query），取字段名时去掉。

### 15.3 契约缺口与前端兜底（对应 issue R20）

`UserLoginRes` 只有一个 `userId`，没有 token / 有效期 / 角色，也没有登出端点。为了不动 auth store 与路由守卫的既有语义，
`src/api/auth.ts` 的 `toSession()` 做了三处兜底，都带注释标明是过渡实现：

| 字段 | 兜底 | 后端补齐后怎么改 |
| --- | --- | --- |
| `token` | `createLocalToken('local', username)` 本地占位 | 直接取服务端 token，删掉占位分支 |
| `expiresAt` | `null`（本地不判过期，「记住我」会长期有效） | 用服务端 `expiresIn` 算出毫秒时间戳 |
| `user.roles` | `[]`（当前 UI 不消费） | 取服务端角色数组 |
| 登出 | `logout()` 不发请求，只由 `stores/auth.ts` 清本地 | 补 `POST /api/v1/users/userLogout` 请求 |

另有几处**后端侧**问题，前端无法绕过，已记进 R20（均为 2026-09-03 读 `personal-workspace-app` 现状所得，
该目录不属于前端工程，未做任何改动）：

1. `services/userService.py` 把 `str` 型 `req.userId` 回填进声明为 `int` 的 `UserLoginRes.userId`，
   非数字登录名（例如 `admin`）会在 pydantic 校验处失败变成 500。
2. `exception_handler.py` 调的是 `BaseResponse.fail(...)`，而 `core/base_response.py` 只定义了 `failure(...)` → 异常处理器自身抛错。
3. `AppException.__init__(self, message)` 只收 message，`userService.py` 却按 `AppException(code=40001, message=...)` 调用；
   且 `super().__init__(self.code, ...)` 在 `self.code` 赋值之前。
4. `UserLoginRes(userId=user.userId)` 取的是 ORM 上不存在的字段（`domain/user.py` 只有 `id`/`username`/`email`）。
5. 新增的 `core/JWT.py` 尚未接线且自身不可导入（`decode_token` 的 `except` 无函数体）；`timedelta(ACCESS_TOKEN_EXPIRE_MINUTES)`
   把分钟当成了天，`datetime.now(timezone)` 传的是模块而非时区对象，`SECRET_KEY` 也硬编码在源码里。
6. 文档把 `/users/health` 的返回写成 `null`，实现实际返回 `{status, message}`——前端按实现写类型。

### 15.4 验证（185 条断言）

- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功且无告警（入口 `index.*.js` 55.66 → 56.37 KiB，
  信封工具进了入口 chunk；`LoginView` 懒加载 chunk 不变）。
- 断言总数 153 → **185**：领域逻辑 72 + 路由表与守卫 26 + 真实组件 SSR 渲染 57 + **真实接口契约 30**。
- 契约脚本用一个假 axios adapter 接管**真实** axios 实例，因此 baseURL 拼接、请求体序列化、请求/响应拦截器、
  信封拆解与错误翻译全部走线上代码，覆盖：URL 为 `/api/v1/users/userLogin`、请求体只有 `userId`/`password`（不含 `remember`）、
  `X-Request-Id` 注入、登录后续请求自动带 `Bearer`、`code=40001` → `BUSINESS_ERROR` 且 message 原样透出、
  `code=40000` 校验信封同样走 BUSINESS_ERROR、非信封 → `UNKNOWN`、兜底裸 422 → 中文校验文案、`logout()` 不产生请求。
- SSR 脚本另加两条环境相关断言：演示账号提示（`.login-form__mock`）与页脚的请求去向说明都随 `VUE_APP_MOCK_AUTH` 切换，两种取值下各 57 条全过。
- **未能做真实联调**：沙箱禁止监听端口且审批通道故障，无法向 `127.0.0.1:8000` 发真请求。人工核对路径见 `README.md`。

### 15.5 默认值变更

`.env.development` 的 `VUE_APP_MOCK_AUTH` 由 `true` 改为 `false`（对接即生效）。后端未启动或需要 admin/admin 演示时改回 `true`，
业务代码不需要动。`VUE_APP_MOCK_API`（对话/知识库）仍为 `true`，等那两个域的契约到位再切。

> **本节记录的是 2026-09-03 的契约**。后端当天之后又改了成功码与响应字段，2026-09-04 重新对接见第 16 节；
> 两处冲突（成功码 200 → 0、无 token → 有 token）以第 16 节为准。

---

## 16. 接口文档更新后重新对接（2026-09-04）

`docs/默认模块.md` 于 2026-09-04 更新，与第 15 节依据的版本有两处**破坏性差异**，同时后端把 JWT 接上了。

### 16.1 契约差异

| 项 | 2026-09-03 版 | 2026-09-04 版（现行） | 前端影响 |
| --- | --- | --- | --- |
| 成功判定 | `code: 200` / `message: "success"` | **`code: 0`** / `message: "成功"` | `unwrapEnvelope()` 原来硬编码 `!== 200`，会把每次成功登录判成失败 |
| `UserLoginRes` | 只有 `userId` | `userId` + **`token`（必填）** | 会话不再用本地占位 token，直接用服务端签发的 JWT |
| 业务码 | 猜测 40001 | `ErrorCodes` 枚举：成功 `0`、凭据 `100001`、校验 `40000`、系统 `999999` | 全部仍是 **HTTP 200 + 非 0 code**，前端映射不变，只换数值 |
| 兜底系统异常 | HTTP 500 | HTTP **200** + `code 999999` | 走 BUSINESS_ERROR 分支，用户能看到「系统繁忙」而不是网络错误 |

成功码抽成 `src/api/http.ts` 的 `API_SUCCESS_CODE`（不再散落字面量），`unwrapEnvelope()` 只跟这一个常量比较。

### 16.2 token 与有效期

后端 `create_access_token()` 签的是 HS256 JWT，载荷为 `CurrentUser{user_id,user_name,user_email}` + `exp`。
`UserLoginRes` 里没有 `expiresIn`，但 `exp` 是 RFC 7519 的注册声明，所以 `src/api/auth.ts` 新增 `readJwtExpiresAt()`：
只解 JWT 第二段读 `exp` 换算 `expiresAt`，**不验签**（真过期仍由后端拒绝，前端只是决定「记住我」何时本地清理）。
解不出（不是三段式 / base64url 失败 / 无 `exp`）就返回 `null`，语义等同「后端没给有效期」→ 本地不判过期。
这样第 15.3 节里 `expiresAt = null` 的兜底就只在异常情况下生效，勾选「记住我」不会带着死 token 进页面。

另外两条口径：

- `token` 缺失视为**契约被破坏**，直接抛 `ApiError('登录响应缺少 token', code: 'UNKNOWN')`。
  宁可登录失败，也不要留下一个「已登录但每个请求都会 401」的状态。
- `username` / `displayName` 仍回显提交值：响应体里没有用户名（`user_name` 在 JWT 载荷里，但那是后端内部结构，
  文档没写就不读，避免把前端绑到未承诺的字段上）。

### 16.3 mock 与真接口对齐

`ErrorCodes.USER_PASSWORD_ERROR = 100001`，所以 mock 分支的失败形态从猜的 `401/HTTP_ERROR` → `100001/BUSINESS_ERROR`，
与真接口经 `unwrapEnvelope()` 后的结果同形；`createLocalToken` 改名 `createMockToken`，只服务 mock。

### 16.4 核对脚本改为随仓库提交（重要）

第 13/15 节里的断言脚本一直放在 `/tmp`（`docs/project-profile.json` 记的是 `committed: false`），
2026-09-04 系统清理临时目录后**整套脚本丢失**，正好撞上 R18 一直担心的那个风险。
本次重新对接时按 AGENTS.md「改 `src/api/**` 必须重跑核对」的要求重建，并落进仓库：

```text
scripts/verify/
├── run.sh            # 入口：npm run verify
├── register.mjs      # 注册 ESM loader
├── loaders.mjs       # @/ 别名 + SFC 编译（@vue/compiler-sfc）+ typescript 剥类型
├── dom-shim.mjs      # SSR 用的最小浏览器垫片（不引入 jsdom）
├── assert.mjs        # ok / eq / finish
├── api-contract.ts   # 接口契约：真接口 51 条 + mock 模式 16 条
├── router-guard.ts   # 路由表与登录守卫 32 条
└── ssr-render.ts     # 五页 SSR 结构 51 条
```

- 零新依赖，只用工程里已有的 `@vue/compiler-sfc`、`typescript`、`@vue/server-renderer`、`pinia`、`vue-router`。
- **不是测试框架**：没有 watch、没有覆盖率、不进 `npm run build`，R18「暂缓引入 vitest」的结论不变。
- 这三个 `.ts` 不在 `tsconfig.json` 的 `include`（只覆盖 `src/**`）也不在 ESLint 的 glob 内，
  所以 `type-check` / `lint` 不检查它们，正确性由 `npm run verify` 自己保证。
- `run.sh` 跑 5 轮：真接口模式 3 套 + mock 模式复跑 2 套（登录页文案与演示提示随 `VUE_APP_MOCK_AUTH` 变化）。

### 16.5 验证

- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功且无告警（入口 56.63 KiB / gzip 21.44 KiB，vendors 207.41 KiB）。
- `npm run verify`：真接口模式 **134** 条（契约 51 + 守卫 32 + SSR 51）+ mock 模式复跑 **67** 条（契约 16 + SSR 51），共 201 次断言全部通过。
- 契约脚本覆盖：成功码为 0、`code 0` 且 `data: null` 也算成功、非 0 码 → BUSINESS_ERROR（100001 / 40000 / 999999 三种）、
  `trace_id → requestId`、请求体只有 `userId`/`password`、**服务端 token 原样使用**、`expiresAt` 取自 JWT `exp`、
  缺 token 报错、非 JWT token 降级为不过期、payload 损坏不抛错、**载荷含中文用户名时 exp 仍能解出**（`atob` 只给 latin-1，需按 UTF-8 还原）、裸 422 兜底翻译、`logout()` 不发请求、
  health 不拆信封、登录后自动带 `Bearer <JWT>`、过期 JWT 会话被守卫踢回登录页。
- 仍未做真实联调：沙箱禁止监听端口且审批通道故障，无法向 `127.0.0.1:8000` 发真请求。
- 补漏：上面「载荷含中文用户名时 exp 仍能解出」原先是**假覆盖**——`fakeJwt()` 造的第二段是纯 ASCII，根本没走到多字节分支。
  现已用 `ensure_ascii=False` 生成含原始 UTF-8 字节的载荷并断言 `exp` 解出正确；
  顺带把该块之后的 `seen[1]` 硬下标换成按 `seen.length` 计算，避免多加一次请求就让后续断言错位（这次就是这么被撞红的）。
- UI 收尾：`LoginForm.vue` 残留了 mock 时代写死的 `placeholder="admin"`，而默认已是真接口模式（且后端按 `User.email` 匹配，
  填 `admin` 只会拿到 100001）。占位符改为由 `LoginView.vue` 按 `IS_MOCK_AUTH` 下发的 `usernamePlaceholder` prop，并补了随模式切换的 SSR 断言。

### 16.6 后端本轮新暴露的问题（issue R20 已更新）

第 15.3 节列的四处里，`BaseResponse.fail` 与 `AppException` 签名两处后端已自行修好，token 也已经签发。剩下的：

0. **【阻断级】登录根本不校验密码。** `domain/user.py` 的 `User` 模型没有 `password` 列，
   `services/userService.py::user_login` 取到 `req.password` 后从头到尾没用过——只要 `email` 命中就用
   `create_access_token()` 签发合法 JWT。也就是说**任何已知邮箱 + 任意密码都能登录**，
   `ErrorCodes.USER_PASSWORD_ERROR(100001)` 只在「查不到用户」时抛出。
   这条不修，前端接的鉴权只是形式上完整；接入任何真实数据前必须补口令哈希（bcrypt/argon2）与比对。
1. `create_access_token()` 默认分支写的是 `timedelta(ACCESS_TOKEN_EXPIRE_MINUTES)`，位置参数是 **days**，
   所以 token 实际有效期是 30 **天**而不是 30 分钟；前端读 `exp` 后会跟着记住 30 天。
2. `decode_token()` 里 `AppException(code="1000", message=...)` 与新签名 `AppException(error_code: ErrorCodes)` 不匹配，
   且码是字符串；token 过期/无效路径一跑就 TypeError。
3. `SECRET_KEY` 硬编码在 `core/JWT.py` 源码里，应挪到 `.env`（`Settings` 已有 env_file）。
4. `ErrorCodes.SUCCESS = (000000, ...)` 是合法 Python（值等于 0，全零字面量有特例），但极易被误读成八进制，建议写 `0`。
5. `VerificationException` 里 `super().__init__(code=4001, ...)` 把枚举码丢了，恒定返回 4001。
6. `user_info()` 没有路由装饰器（不会被注册），且 `Depends(decode_token)` 的签名与 FastAPI 的 token 依赖不兼容。
7. 登录名匹配的是 `User.email`，但请求字段与文档都叫「用户名」——用户输 `admin` 会拿到 100001。
8. 文档 `POST /userLogin` 仍列 422 `HTTPValidationError`，实现已改成 HTTP 200 + code 40000；`/users/health` 文档仍写 `null`。

---

## 17. 登录页对照 demo 复核与 mock 默认值回调（2026-09-07）

需求原文：按 `vue-best-practices` 规范、参照 `demo/` 原型补齐缺失的登录页，未登录自动跳转，登录先用 mock
（admin / admin）承担、真实请求后补。

### 17.1 先核对现状，避免重复实现

登录页与守卫在第 13/15/16 节（issue R15 / R16）已经落地，本轮**不重写**：

- 路由与整屏布局：`src/router/routes.ts` 的 `/login`（`meta.layout='blank'`，`App.vue` 据此不套侧栏 + 顶栏）；
  四个受保护路由都带 `meta.requiresAuth`，含 404 通配（未登录时不暴露路由是否存在）。
- 自动跳转：`src/router/guards.ts` 的 `beforeEach` → 未登录跳 `/login?redirect=<fullPath>`，已登录访问登录页回首页，
  会话过期由 `pruneExpiredSession()` 拦在守卫里（不放进 getter，避免 `computed` 缓存 `Date.now()`）。
- 组件与逻辑分层：`src/views/LoginView.vue`（编排）+ `LoginForm.vue`（表单）+ `LoginHero.vue`（demo 令牌风格的
  内联 SVG 插画）+ `src/components/base/TextField.vue`（含密码显隐）；编排在 `src/composables/useLogin.ts`，
  会话在 `src/stores/auth.ts`，回跳白名单在 `src/utils/redirect.ts`。
- 视觉复用 demo 令牌：登录页只引用 `src/styles/global.css` 的变量，明暗主题自动跟随，无硬编码色值。
- 真接口链路也已经写完（`src/api/auth.ts` 的 `loginWithServer()`），mock 与真接口返回同一个 `AuthSession` 结构。

### 17.2 本轮改动

1. **开发默认回到 mock**：`.env.development` 的 `VUE_APP_MOCK_AUTH` 由 `false` 改回 `true`。
   第 15.5 节曾把它改成 `false` 表示「对接即生效」，但 16.6 / R20 记录后端登录存在阻断级缺陷
   （`User` 无 `password` 列、`user_login` 从不校验口令），实际开箱用 `admin / admin` 登不进去，
   与「先 mock、真请求后补」的诉求相反。现在：开发 `true`（本地假数据，无需后端与 Postgres），
   **生产保持 `false`**（真接口 ready），后端修好 R20 后只改这一个 env 值。`VUE_APP_MOCK_API` 不动。
2. **样式分层纠偏**：`src/components/business/LoginForm.vue` 的 `<style scoped>` 里重复定义了设计系统层的
   `.pill` / `.pill--info`（同一份声明已在 `src/styles/primitives.css:604`），按 AGENTS.md「优先复用设计系统层
   已有类名、scoped 只放组件专属样式」删掉重复块。模板仍用全局 `class="pill pill--info"`，渲染结果不变
   （scoped 选择器权重更高但声明值一致；全局的 `.pill::before` 圆点本来也不受影响）。
   全工程只有这一处组件重复了 `.pill`。
3. 文档同步：`README.md`（环境变量表、「登录与鉴权」、人工核对路径拆成 mock 与真接口两条）、`AGENTS.md`
   （验证基线的 mock 默认值、build 体积实测值、`verify` 需要 Node ≥ 18.18）、本文件与 `project-profile.json`。

### 17.3 规范对照（逐条落到代码位置）

`vue-best-practices` 的四份核心参考（`references/reactivity.md` / `sfc.md` / `component-data-flow.md` /
`composables.md`）与第 5 节自检清单：

- **Reactivity**：表单是「单状态对象」→ `reactive({ username, password, remember })` 就地改字段；
  原始值用 `shallowRef`（`submitted`、`useLogin` 的 `pending` / `errorMessage`、`TextField` 的 `revealed`）；
  派生全部走 `computed`（`canSubmit`、`submitText`、`usernameError` / `passwordError`、`hasMockHint`、
  `redirectTarget`、`loginEndpoint`），computed getter 保持纯函数。
- **SFC**：三张组件都是 `<script setup lang="ts">` → `template` → `style scoped` 顺序；模板不做推导，
  条件与派生在脚本里（如 `LoginView` 的 `isReturning` / `usernamePlaceholder` 决定文案与占位符）。
- **数据流**：props down / emits up —— `LoginForm` 收 `pending`、`errorMessage`、`usernamePlaceholder`、
  `mockUsername`、`mockPassword`，只 `emit('submit', LoginPayload)`；`TextField` 用 `defineModel<string>()`
  作双向契约。`base/` 组件不依赖 store 与 api。
- **Composables**：请求编排、取消与回跳都在 `useLogin()`（`AbortController` + `onScopeDispose`，
  `CANCELED` 不算失败不提示），视图只消费只读投影。
- **组件边界**：路由级视图保持「编排面」，插画 / 表单 / 输入框各自成组件，无需再拆。
- **按需原则**：没有引入 `Transition` / `Teleport` / `KeepAlive` / 指令 / 虚拟列表等（skill 第 3、4 节：
  需求没到就不加）。

AGENTS.md 侧：无 `any`、`import type` 统一、禁裸写 `code === 0/200`（成功码只在 `API_SUCCESS_CODE`）、
`token` 用服务端原样值、环境变量驱动 mock、路由组件懒加载、未新增 `.js` 业务代码、色值只在 `global.css`。

### 17.4 验证证据

- `npm run lint` 0 error；`npm run type-check` 0 error；`npm run build` 成功且无告警
  （vendors 207.41 KiB / gzip 73.91，入口 56.70 KiB / gzip 21.06，`runtime` 4.79 KiB）。
- `npm run verify` 五轮全绿，合计 **201** 条：契约 51（真接口）+ 守卫 32 + SSR 51 + 契约(mock) 16 + SSR(mock) 51。
  其中 mock 分支直接断言 `admin / admin` 登录成功（`token` 前缀 `mock.`、`expiresAt > now`）与
  错误口令的失败形态和真接口一致（`BUSINESS_ERROR|100001|用户名或密码错误`）；
  守卫断言覆盖 `/`、`/chat`、`/knowledge`、任意 404 路径未登录都跳 `/login?redirect=…`、过期与登出后被踢回。
- 踩坑记录：`scripts/verify/run.sh` 用 `node --import`，本机默认 `node` 是 v15.1.0，会报
  `node: bad option: --import` 并让 5 轮全部「没有产出结果」——不是断言失败，是 Node 版本过低。
  已切 Node 25 复跑，并在 README / AGENTS.md 标注最低版本。

### 17.5 仍未做（需确认后再动）

1. **401 自动失效处理**：~~等确认~~ → 用户已确认「需要」，实现见第 18 节。
   （另两项——生产环境 mock 默认值、登录页再出一版视觉——用户明确回复「不需要」，保持现状。）
2. **浏览器目检**：沙箱禁止监听端口且审批通道被拒，无法起 `npm run serve` 截图核对 `/login` 首屏与
   明暗两态；结构层由 SSR 断言覆盖，像素层待人工确认。
3. **演示账号只在 mock 有效**：真接口按 `User.email` 匹配登录名，填 `admin` 会拿到 100001（见 R20 第 7 条）。

---

## 18. 会话失效（401）自动回到登录页（2026-09-07）

第 17.5 节第 1 项经用户确认后落地。

### 18.1 为什么 beforeEach 不够

守卫只在**导航发生时**判断登录态。用户停在 `/chat` 上，token 在服务端过期或被拒（真接口返回 HTTP 401）时
不会触发任何导航，结果是页面还在、身份已死：每次操作都报错，且没有任何东西把他带回登录页。
所以「没有登录态就回到登录页」需要两条互补链路，缺一有条缝。

### 18.2 分层：请求层只上报，守卫才行动

`src/api/http.ts` 顶部已有约定「请求层不反向依赖 store」。401 处理如果直接在拦截器里 `useAuthStore()` + `router.push()`，
就等于把这条线破掉（还会引入 `http → stores → http` 的环）。因此：

- `src/api/http.ts`：新增 `HTTP_UNAUTHORIZED`、`UnauthorizedContext{url}`、`setUnauthorizedHandler()`。
  响应拦截器在拿到 `response.status === 401` 时同步调用已注册的 handler，把**请求相对路径**交出去，
  然后照旧 reject `ApiError{status:401, code:'HTTP_ERROR'}` —— 上报不改变错误的传播，调用方仍然只 catch `ApiError`。
- `src/router/guards.ts`：新增 `applyUnauthorizedRedirect(router)` 与文案常量 `SESSION_EXPIRED_MESSAGE`。
  它才是行动者：`authStore.clearSession()`（连带清 Bearer 与 `localStorage`）→ `toast.notify('登录状态已失效，请重新登录')`
  → `router.replace({name:'login', query:{redirect: 当前 fullPath}})`，登录后由既有的回跳白名单把他送回原页。
- `src/router/index.ts`：装配点，`applyAuthGuards(router)` 之后调用一次。

三个边界是这套接口的全部复杂度：

1. **登录端点的 401 不算会话失效**：那是口令错误，`useLogin` 已经在表单里显示红色提示；
   若把它接进来，用户输错一次密码就被「踢出」并看到过期文案。按 `USER_LOGIN_PATH` 过滤掉。
2. **并发去重**：一个页面同时发多个请求、一起 401 时，只让第一个负责跳转与提示（`isHandling` 标志 +
   `replace().finally()` 复位），否则 toast 会叠三层。已经在登录页也不再跳第二次。
3. **顺序**：清会话在判断「是否已在登录页」之前，保证无论从哪个页面触发，脏 token 一定先落地清掉。

mock 模式不会产生 401（假数据的过期由守卫的 `pruneExpiredSession()` 负责），所以这段只在真接口下生效；
注册本身无副作用，不需要按开关分支。

### 18.3 规范对照

`vue-best-practices` 侧：这条链路没有引入组件状态，属于「跨层副作用装配」，因此放在 `router/` 与 `api/`，
不进 store（skill 的 `composables.md` / `state-management.md` 口径：能被守卫承接的一次性副作用不做成响应式状态）；
`SESSION_EXPIRED_MESSAGE` 走文案常量导出，视图与脚本共用同一个事实来源。
AGENTS.md 侧：`src/api/` 仍是唯一后端出口、请求层不 import store/router、无 `any`（handler 签名与
`UnauthorizedContext` 都是显式类型）、`import type` 统一、不在拦截器里拆信封的既有约束不变。

### 18.4 验证证据

断言总数 201 → **217**（`npm run verify` 五轮全绿）：

- 契约 51 → **57**：401 仍归一化为 `HTTP_ERROR` 且 `status` 不被业务码覆盖；上报一次并带端点路径；
  403 不上报；登录端点的 401 也上报（证明过滤发生在装配处而非请求层）；`setUnauthorizedHandler(null)` 后不再上报。
- 守卫 32 → **42**：跑真实 `applyUnauthorizedRedirect` + 真实请求层（假 adapter 恒返 401）——
  停在 `/chat` 时收到 401 → 内存会话清空、`workspace.session` 被删、落到 `/login?redirect=/chat`、toast 恰好一条；
  已在登录页重复 401 不叠加提示也不重复跳转；登录端点 401 时会话与路由都不动。
- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功无告警
  （入口 56.70 → 57.13 KiB / gzip 21.25，即本机制的净成本；vendors 不变 207.41 KiB）。
- 目检仍受阻（沙箱禁止监听端口、审批通道被拒）。人工验证需要真接口：登录后把 token 改坏或等其过期，
  在页面上触发任意 `/api` 请求，应看到提示并被带回 `/login?redirect=<原地址>`。

---

## 19. 页面去假数据：把「哪些功能还没接后端」变成界面信息（2026-09-07）

用户诉求原话：「去除页面中的 mock 数据吧，不然不知道哪些功能要对接后台」。

### 19.1 决策：关开关 + 让未对接可见，而不是删掉假数据代码

两条路：① 物理删除 `src/constants/chat.ts` / `knowledge.ts` 的假数据与两条 mock 分支；② 保留代码、把默认值关掉，
同时让「没接后端」在界面上如实显形。选 ②，理由：

- `demo/` 原型仍是视觉事实来源，假数据是唯一能还原「满屏效果」的手段（`npm run verify` 的 SSR 两轮也依赖它）。
- ①删掉的是一百多条断言正在保护的分支，收益只有「更干净」，代价是回归面与原型对照能力。
- 用户真正要的不是删代码，而是**判断力**：打开页面能看出哪些功能还没接。这靠可见性解决，不靠删文件。

因此 `.env.development` 与 `.env.production` 的 `VUE_APP_MOCK_API` 都置 `false`；登录侧的
`VUE_APP_MOCK_AUTH` 保持开发 `true`（后端 R20 阻断级缺陷未修），两个开关互不影响。

### 19.2 三层可见性

1. **登记表（唯一事实来源）**：`src/constants/backendApi.ts` 15 条，每条 = `verb` + `path` + 界面能力 +
   前端调用点 + 后端实现状态（`implemented` / `flawed` / `missing`）+ 是否已进 `docs/默认模块.md`。
   状态由 `contractStatusOf()` 派生成四类：已对接 / 已对接 · 后端有缺陷 / 前端就绪 · 待后端 / 后端已有 · 待前端接。
2. **展示位**：`src/components/business/BackendContractCard.vue` 在总览页逐条渲染，头部给「N 项待对接」pill。
3. **运行时报错说人话**：`src/api/http.ts` 对 404 生成「后端未实现 `GET /api/kb`，该功能待对接」
   （`HTTP_NOT_FOUND` + `readUnimplementedMessage()`，仍归一化为 `HTTP_ERROR` 且保留 `status`）。
   store 把它存进 `listError`——此前 `listError` **没有任何视图渲染**，空列表只会显示「没有匹配的会话」，
   现在 `SessionList` / `KbList` / `DocumentTable` 的空态都优先显示它。

顺带清掉的假象：

- 总览页四张写死的指标卡（今日对话 +12%、平均首字延迟 860ms、今日 token 1.24M、知识库文档 +2）与六条「今日待办」
  （其中「接入健康检查真实接口 /api/health」本身就已过时）；`summaryLine` 的「本地模型 WS-14B 已加载」；
  知识库健康度卡里的「向量模型 bge-m3」。
- 知识库页「已启用检索」「对话可引用 = 是」两处结论，以及侧栏「索引服务」的队列 / 分片 / 磁盘假指标
  （`INDEX_SERVICE`）——现在只在假数据模式下出现，真实模式改标注「待后端提供」「检索待对接」。
- 上传区不再演「上传→解析→分片→向量化→已索引」的假进度，也不再编造文件名（`nextSampleName()`）：
  真实模式下 `useUploadQueue.enqueue()` 直接提示待对接端点并入队被拒。

### 19.3 规范对照

- `vue-best-practices`：新卡片是纯展示组件，props in（`entries`）+ `computed` 派生行与统计，无 emits、无 store 依赖；
  状态判定留在常量层纯函数 `contractStatusOf()`，组件不夹业务判断（`component-data-flow.md` / `composables.md` 口径）；
  `reality` 与视图分离，视图只投影。三个既有组件只加一个可选 prop（`error` / `mockData`），沿用
  `withDefaults` + 模板内派生，不新增响应式状态（`reactivity.md`）。
- `AGENTS.md`：登记表放 `src/constants/`（纯常量，不依赖 Vue 运行时）；`.api-table` 只有这一个组件用 →
  写进 SFC 的 `<style scoped>`，共用类继续用设计系统的 `.card` / `.pill` / `.empty`，无新增色值；
  端点常量仍只在 `src/api/*`；`components/base/` 未引入 store/api 依赖。
- 新增约束已写入 `AGENTS.md`：**页面不得出现没有后端来源的业务数字**，且增删端点必须同步登记表
  （`verify` 断言条目总数 15、待对接 13，漏改会红）。

### 19.4 验证证据

断言 217 → **293**，五轮扩成六轮（`scripts/verify/run.sh` 的 `run()` 增加第三个参数 `MOCK_API`）：

| 轮次 | 条数 |
| --- | --- |
| 契约（真接口鉴权） | 64 |
| 路由与守卫 | 42 |
| SSR（真接口鉴权 / 假数据） | 55 |
| 契约（mock 鉴权） | 21 |
| SSR（mock 鉴权 / 假数据） | 55 |
| SSR（mock 鉴权 / **真实数据模式**） | 56 |

- 契约轮新增：404 归一化 `HTTP_ERROR` 且文案点名端点；登记表与 `src/api/*` 五个路径常量逐条对齐、
  条目总数与待对接数固定值、后端已实现的端点不得落在「待后端」。
- 新增第六轮的意义：SSR 第一次跑在「页面默认状态」下，断言假指标整块消失、
  「检索待对接」「待后端提供」出现、`listError` 能在页面上看到端点名。
- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功无告警，
  入口 57.13 → 56.13 KiB、`css/index` 31.95 → 31.67 KiB（删掉假卡片与其样式）。

### 19.5 遗留（新登记 issue）

- **R21（P1）**：前端为对话/知识库自定义的端点与后端不一致——前端缺 `/v1` 前缀（`/api/chat/sessions` vs
  后端 `POST /api/v1/chat/simpleChat`、`/api/v1/chat/streamChat`），后端这两个也还没进 `docs/默认模块.md`，
  知识库与上传后端完全没有。这就是登记表现在如实反映的状态，对接前先定契约。
- **R22（P3）**：`src/components/base/StatCard.vue` 因假指标移除而无人引用，删除请求被审批通道拒绝，需人工清理
  （其配套 `.stat` / `.spark` / `.mini-list` / `.checklist` / `.tick` 规则已从 `src/styles/modules.css` 移除）。
- 浏览器目检仍不可用（沙箱禁止监听端口、审批通道故障），与 16.5、18.4 同一情况。

---

## 20. 对话线对齐后端真实契约（2026-09-07）

用户裁决：R21 **先做对话**，知识库「暂时还没有」后端 → 本轮只动 `chat`，`knowledge` 的待对接状态原样保留。

### 20.1 后端事实（读码得到，不靠猜）

前缀 `settings.API_V1_STR = "/api/v1"`，`__main__.py` 把 `api_v1_chat_router` 也挂在它下面；开发代理把 `/api`
转发到 `VUE_APP_API_PROXY_TARGET`，所以前端 `API_BASE_URL="/api"` + `/v1/chat/...` 才拼得对。

| 端点 | 鉴权 | 请求体 | 响应 |
| --- | --- | --- | --- |
| `POST /api/v1/chat/streamChat` | **无**（`chatStreamEndpoint` 没挂依赖） | `{ text }` | `text/event-stream` |
| `POST /api/v1/chat/simpleChat` | `Depends(get_current_user_info)`，读 `Authorization: Bearer` | `{ text }` | 裸对象 `{ resText }`，**不套 BaseResponse** |

流式帧（`services/ChatStreamService.py::chat_stream`）逐块：

```text
data: {"code":200,"message":"success","data":<chunk>,"status":"streaming"}\n\n
data: {"code":200,"message":"success","data":null,"status":"finished"}\n\n
```

- 帧里的 `code` 是 **200**，与全局限定的业务成功码 `0` 不是一回事 → 这条链路**不能**复用 `unwrapEnvelope()`。
- 没有 `event:` 行，也没有 `think` / `citations` / `usage` / `delta` 字段；`data` 的类型还不稳定
  （挂了 `JsonOutputParser()`，块可能是对象而不是文本）。
- 会话列表、历史消息、删除会话、知识库：后端**完全没有**路由。

### 20.2 请求层改动（`src/api/chat.ts`）

- `CHAT_COMPLETIONS_PATH` → **`CHAT_STREAM_PATH = '/v1/chat/streamChat'`**；`CHAT_SESSIONS_PATH` 补 `/v1`，
  历史消息与删除会话随之变成 `/v1/chat/{sessionId}/messages`、`/v1/chat/{sessionId}`（仍待后端，至少 404 文案点名的端点是真路径）。
- 请求体从 `{ ...request, stream: true }` 改为 `{ text: request.question }`（`SimpleChatBody` 类型锁死，多余字段不再外发）。
- 新增**纯函数** `readChatStreamFrame()`：帧 → `append | finish | error | ignore` 四态，把后端形状差异挡在 api 层，
  store 与视图完全不感知。`data` 是字符串直接追加；是对象时按 `resText|content|text|answer|delta` 取第一个非空字符串，
  都没有就 `JSON.stringify` —— 宁可难看也不静默吞掉模型的回答。
- 用 `fetch` 而不是 axios，所以 `src/api/http.ts` 补两个出口给非 axios 通道复用：
  `authHeaders()`（同一份 Bearer token）与 `notifyUnauthorized(url)`（同一套 401 装配）。请求层依旧不 import store/router。
- 结束时的 `usage` 为 `{ tokens: null, elapsedMs: 前端计时 }`；`CompletionUsage.tokens: number | null` 是新增契约。
- 真接口分支不再回退假数据：`normalizeSessionList()` 收到非数组直接抛 `UNKNOWN`，
  `stores/chat.ts` 的 `removeSession()` 删除失败时保留本地行 —— 静默塞示例数据会让人分不清「后端没数据」和「前端在演」。
- 两种收尾方式分开处理：没收到 `status:"finished"` 就断开（模型中途报错时后端直接掐连接）算**失败**，
  提示「回答可能不完整」；`fetch` 被 `AbortController` 中断抛的是 `DOMException('AbortError')`，
  必须归一化成 `ApiError(code: 'CANCELED')`，否则「停止生成」会显示成红色失败气泡（假数据分支本来就是 CANCELED）。

### 20.3 界面诚实化（承接第 19 节原则）

后端只收一句文本，那么「看起来生效」的控件就必须让位：

| 位置 | 真实模式（默认） | 假数据模式 |
| --- | --- | --- |
| 顶栏模型位 | 「模型由后端指定」 | `WS-14B · 本地 GGUF…` |
| 顶栏芯片 | 「参数不下发后端」 | 上下文 / 温度 / 知识库计数 |
| 消息流顶部 | 常驻提示：只发文本，不带历史/引用/用量 | 无 |
| 输入区四个开关 | 禁用 + 标题「后端 streamChat 未接收该参数，待对接」 | 可点（影响假输出） |
| 右栏参数面板 | 「后端未接收的参数」清单 | 模型 / 知识来源 / 系统提示词 / 上下文占用 |
| 回答底部 | `耗时 3.4s` | `1234 tokens · 3.4s` |
| 停止标注 | `本地已生成 N 字符`（字段由 `stoppedTokens` 改名 `stoppedChars`） | 同左 |

### 20.4 规范对照

- `<script setup lang="ts">` + `withDefaults(defineProps<Props>(), …)`；新增 props 全部可选带默认值，SSR 断言不受影响。
- 禁 `any`：帧解析用 `unknown` + `isRecord()` / `readStringField()` / `CHAT_STREAM_TEXT_FIELDS` 守卫收窄。
- 后端调用仍只经 `src/api/`；`src/utils`、`src/constants` 未引入 Vue 运行时；`.panel__notice`、`.thread__notice--info`
  这类单组件样式留在 `<style scoped>`，且只引用 `global.css` 的令牌变量，未新增色值。
- 登记表 `src/constants/backendApi.ts` 同步：合并重复的 completions 条目，条目 15 → **14**、待对接 13 → **11**，
  `streamChat` 由「后端已有 · 待前端接」变为「已对接 · 后端有缺陷」（`backend: 'flawed'`）。

### 20.5 验证证据

断言 293 → **386**，六轮扩成七轮（新增第 4 轮：`VUE_APP_MOCK_API=false` 的契约轮，`streamWithBackend` 只有这一轮会执行）：

| 轮次 | 条数 |
| --- | --- |
| 契约（真接口鉴权 / 假数据） | 64 |
| 路由与守卫 | 42 |
| SSR（真接口鉴权 / 假数据） | 57 |
| 契约（真接口鉴权 / **真流式**） | 83 |
| 契约（mock 鉴权） | 21 |
| SSR（mock 鉴权 / 假数据） | 57 |
| SSR（mock 鉴权 / **真实数据模式**） | 62 |

- 帧解析 9 条：文本帧 / 结束帧 / 对象取 `resText` / 未知结构序列化 / 非 200 转 error / 注释帧与坏 JSON 忽略 / `[DONE]` 收尾。
- 真发一次流式：给 `globalThis.fetch` 打桩喂后端原样帧序列，断言端点、`{ text }` 唯一字段、`Authorization` 头、
  逐帧拼接结果、`tokens === null`；再断言勾了深度思考也**不会**冒出 think/citations 回调（真后端给不了）。
- 收尾两条：缺结束帧的响应必须以失败收（错误文案含「结束帧」）；`AbortError` 归一化为 `code === 'CANCELED'`。
- SSR 第 7 轮新增 6 条：真实模式必须出现「对话已对接后端 POST /api/v1/chat/streamChat」，
  且**不得**出现 `32k` / `温度 0.7` / `WS-14B`；假数据模式反向断言它们仍在。
- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功无告警：入口 56.57 KiB、
  `css/index` 31.67 KiB、vendors 207.41 KiB（gzip 74.00 KiB）。

### 20.6 遗留

- **R21 部分闭环**：对话已按后端真实契约对接；知识库与上传仍是「前端就绪 · 待后端」，路径也还缺 `/v1`（用户明确暂不做）。
- **R23（新，后端侧）**：`streamChat` 三处缺陷 —— ① 未挂鉴权（`simpleChat` 有）；② 链路 `prompt | llm | JsonOutputParser()`
  但模型未开 JSON 模式，普通中文回答大概率解析失败；③ `ChatService.py` 注释里残留**硬编码 API key**（需轮换并移出仓库历史）。
  另外 `simpleChat` 用同步 `chain.invoke()` 会阻塞事件循环，`CheckouToken.py` 沿用 `AppException(code=…, message=…)` 旧签名（同 R20）。
- **R22**：`src/components/base/StatCard.vue` 仍无人引用，删除需人工执行。
- 浏览器目检仍不可用（沙箱禁止监听端口），与 16.5、18.4、19.4 同一情况。

---

## 21. 「历史记录里怎么还有示例会话」——演示模式必须自报家门（2026-09-07）

### 21.1 现象与根因

用户截图里对话左栏仍是 `流式接口与停止生成 / 12 条消息 · 引用 3 来源` 等 7 条会话，顶栏写着 `views/ChatView.vue`。

- 顶栏那行副标题来自路由 `meta.viewPath`（`src/router/routes.ts`），说明这是**真实 Vue 应用**，不是 `demo/` 静态原型。
- 代码里这些标题只存在于 `src/constants/chat.ts` 的 `MOCK_SESSIONS`，唯一出口是
  `src/api/chat.ts` 的 `fetchSessions()` 在 `IS_MOCK_CHAT === true` 时的分支；store、组件都没有第二份假列表。
- 仓库里 `.env.development` 已是 `VUE_APP_MOCK_API=false`，也没有 `.env.development.local` 覆盖。
- 结论：`VUE_APP_*` 由 webpack 在**启动时**注入，Vue CLI 不会因 `.env` 变更热重启，
  所以那个 dev server 是改开关之前起的，跑的还是旧的字面量。→ **重启 `npm run serve` 即可**。

### 21.2 处理：不靠口头解释，把状态做到界面上

「改环境变量 + 重启」这种约定迟早还会有人踩，所以补了显性标识（issue R21 的延续）：

- 顶角标：`src/components/business/AppTopbar.vue` 按 `IS_MOCK_API` / `IS_MOCK_AUTH` 渲染
  `演示数据` / `演示登录` 两枚 `.pill--warning`，`title` 里写清是哪个开关、要不要重启。
- 列表横幅：`.rail__mock`（新增在 `src/styles/primitives.css`，只引用令牌变量），
  会话栏与知识库栏顶部各一条，文案直接点名「真实数据要等后端提供 `GET /api/v1/chat/sessions` / `GET /api/kb`」。
  两个组件都靠已有的 `mockData` prop 驱动，视图层从 `IS_MOCK_CHAT` / `IS_MOCK_KNOWLEDGE` 下发。
- README「数据来源与待对接清单」补了重启提醒；`src/constants/app.ts` 里写明这两个开关是构建期注入。

### 21.3 顺带踩到并量化的坑：常量间接引用会打断 DCE

一开始把三个域内开关改成 `export const IS_MOCK_CHAT = IS_MOCK_API`（值来自 `src/constants/app.ts`），
看起来是「单一事实源」的正确姿势，结果入口从 **56.93 KiB 涨到 66.60 KiB（+9.7 KiB）**：
webpack 不再把跨模块的布尔折叠成字面量，`if (IS_MOCK_CHAT)` 的假数据分支（`MOCK_SESSIONS`、
`streamWithMock`、假知识库数据）就摇不掉，全部进了产物。

- 处理：`src/api/{chat,knowledge,auth}.ts` 恢复成**就地**写 `process.env.VUE_APP_MOCK_* === 'true'`；
  `src/constants/app.ts` 里保留两份只给外壳展示用，并在注释里写死这个取舍与实测数字，防止后人「顺手统一」。
- 口径修正：单一事实源指的是**运行时状态**（会话、store），不是「同一个 env 变量只能出现一次」。
  构建期常量必须留在被折叠的地方。

### 21.4 验证证据

断言 386 → **391**（SSR 三轮各 +1/+1/+1，覆盖角标与横幅的「有 / 无」两向断言）：

| 轮次 | 条数 |
| --- | --- |
| 契约（真接口鉴权 / 假数据） | 64 |
| 路由与守卫 | 42 |
| SSR（真接口鉴权 / 假数据） | 59 |
| 契约（真接口 / **真流式**） | 83 |
| 契约（mock 鉴权） | 21 |
| SSR（mock 鉴权 / 假数据） | 59 |
| SSR（mock 鉴权 / **真实数据模式**） | 63 |

- 假数据模式：断言顶栏出现「演示数据」、会话栏出现 `rail__mock` 与「下面是本地示例会话」。
- 真实模式：反向断言两者都不出现（生产构建里这两个字符串会被整段折叠掉，产物里搜不到）。
- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功无告警：
  入口 56.57 → 56.93 KiB（gzip 20.94）、`css/index` 31.67 → 32.02 KiB（新增 `.rail__mock`）。

## 22. mock 数据层彻底删除（2026-09-07，第三次反馈）

### 22.1 为什么推翻第 19 节的方案

第 19 节的决策是「假数据代码留着，只是默认关开关」，理由是「对照 demo 原型还要看满屏效果」。
用户随后两次反馈推翻了它：

1. 第 21 节：`VUE_APP_MOCK_API` 是构建期注入，dev server 不重启就还是旧值，界面上「关掉了」和「没关掉」长得一样。
2. 本轮：截图里空会话区仍然挂着 `模型 WS-14B（本地）· 默认带上「架构决策库」` 与四张示例提示卡，
   用户的要求变成一句话——「去除 mock 数据」。

结论：**只要假数据还在仓库里，就一定会有人在页面上见到它**（开关忘了关、重启没做、别人拉代码直接开 mock）。
一个都没有后端的字段被编成数字放在页面上，代价是每次都要重新解释一遍哪些是真的。所以这次连代码一起删。

### 22.2 删除清单

| 位置 | 删掉的东西 |
| --- | --- |
| 开关 | `VUE_APP_MOCK_API`（两张 `.env` + `src/types/env.d.ts`）、`IS_MOCK_API`、`IS_MOCK_CHAT`、`IS_MOCK_KNOWLEDGE` |
| `src/constants/chat.ts` | `MOCK_SESSIONS` / `SEEDED_MESSAGES` / `draftFor()` / `CODE_DRAFT` / `GENERIC_DRAFT` / `SUGGESTIONS`，只剩 `NEW_SESSION_ID` 与分组顺序 |
| `src/constants/knowledge.ts` | `MOCK_KB_IDS` / `MOCK_KNOWLEDGE_BASES` / `MOCK_DOCUMENTS` / `MOCK_CHUNKS` / `MOCK_RECALL_HITS` / `INDEX_SERVICE` / `UPLOAD_*` / `DEFAULT_EMBEDDING_MODEL` / `DEFAULT_RERANKER` / `DEFAULT_SELECTED_KB_IDS` / `LIBRARY_REPRESENTATIVE_TYPE` |
| `src/api/chat.ts` | `streamWithMock()` / `sliceText()` / `delay()`、`CompletionRequest`（连带 `deepThink`）、sessions/messages/delete 的 mock 分支 |
| `src/api/knowledge.ts` | `chunkLatency()` / `RETRIEVAL_LATENCY_MS` 与全部 mock 分支；`type` 改为按文件名后缀派生（`fileTypeOf()`），`embeddingModel` 不再编 `bge-m3` |
| `src/stores/chat.ts` | `DEFAULT_PARAMS.modelId`（`WS-14B · 本地 GGUF`）、`reranker`（`bge-reranker`）、`selectedKbIds` 的默认勾选、`contextUsage` getter（32k 窗口）、`setModel()` |
| `src/stores/knowledge.ts` | 上传状态机 `simulateUpload` / `advanceUpload` / `finishUpload` / `uploadTasks` / `addedDocuments` / `lastIndexedFile`、`createLibrary()` 本地建库、`activeKbId` 的默认假库 |
| `src/components/*` | 附件 / 知识库 / 深度思考 / 联网四个死开关；模型下拉；上下文占用条与 `召回分片 × 1024`；空会话区的四张示例卡；`.rail__mock` 横幅与「演示数据」角标；索引服务假指标卡；抽屉的「分片 512/64」「· 1024 维」「来源：本地文件」 |
| `src/views/HomeView.vue` | `QUICK_PROMPTS` 三条示例提示词与「快捷入口」行、提问框的三个无效开关 |
| 类型 | `ChatDraft`、`UploadTask`、`ChatParams.modelId` / `.reranker` |
| 样式 | `.rail__mock`、`.suggestions*`、`.uploader*`、`.chip--clickable:hover`（都只服务已删除的结构） |

保留的只有登录侧的 `VUE_APP_MOCK_AUTH`（admin / admin，后端 R20 未修）与顶栏那枚「演示登录」角标。

### 22.3 顺带修正的三处「不只是删」的行为

1. **失败不再回退本地状态**：`reindex()` / `removeDoc()` 原来无论后端成败都改本地列表，现在返回布尔，
   失败只报错、视图不弹成功 toast；新建知识库不再本地追加一条后端不认识的记录。
2. **上传改为真选文件**：拖拽/点击走真实 `<input type="file">`，提示里出现的是用户自己的文件名，
   不再有 `拖拽文件.md` / `键盘上传.md` 这种编造的名字。
3. **召回测试不再预置语句**：`DEFAULT_RECALL_QUERY` 变成纯 placeholder，没输入就提示「请先输入检索语句」；
   `hybrid` / `rerank` 两个开关原先是假的（`useRetrieval` 里写死 `true`），现在真的进请求体。

### 22.4 防回退

`scripts/verify/run.sh` 增加第 1 轮源码扫描：`src/**` 与 `scripts/verify/**` 里再出现
`VUE_APP_MOCK_API` / `IS_MOCK_*` / `MOCK_SESSIONS` 等标识，或 `SUGGESTIONS` / `INDEX_SERVICE` / `streamWithMock`
这类已经删掉的符号，直接判失败。SSR 轮次同时加了反向断言：页面里搜不到 `WS-14B`、`架构决策库`、
`整理提交前检查清单`、`1024`、`512/64`。

需要「有内容」才能验证渲染的轮次，改为在 `scripts/verify/ssr-render.ts` 里内联 fixture
（`store.libraries` / `documentsByKb` / `activeDocumentChunks` 直接赋值），演示数据只活在测试里。

### 22.5 验证证据

断言 391（七轮）→ **318（六轮）**。少了两轮 mock 轮次，但每一轮都更严格：

| 轮次 | 条数 |
| --- | --- |
| 源码扫描（无业务假数据） | 1 |
| 契约（真登录 + 真流式） | 83 |
| 路由与守卫 | 42 |
| SSR（真登录） | 76 |
| 契约（演示登录） | 40 |
| SSR（演示登录） | 76 |

- `npm run lint` 0 error、`npm run type-check` 0 error、`npm run build` 成功无告警。
- 入口 `js/index.*.js` 56.93 → **48.47 KiB**（gzip 20.94 → **17.25**，-8.46 KiB / -3.69 KiB gzip）：
  第 21.3 节那个「常量折叠保 DCE」的顾虑随开关一起消失，假数据分支现在是唯一路径都被删了。
- `css/index.*.css` 32.02 → 30.77 KiB（gzip 6.10 → 5.94），来自删掉的 `.rail__mock` / `.suggestions` / `.uploader`。
- 登记表 14 → **15** 条（新增 `POST /api/kb` 建库缺口），待对接 11 → **12**。

### 22.6 遗留

- R21：知识库仍无后端，页面全部空态点名端点；对话线只有一条 `streamChat`。
- ~~R22~~：`src/components/base/StatCard.vue` 改为**保留**，理由与配套样式回补见第 23 节。
- R23：后端 streamChat 的缺陷清单不变；本轮没有改后端。

## 23. StatCard 与指标卡样式的去留（2026-09-07）

第 22 节把 mock 删干净之后，`src/components/base/StatCard.vue` 成了零引用文件，建议按 R22 直接删。
用户的要求是「这个页面样式保留」，于是改判为**保留组件 + 回补样式**：

- 回补 `.stat__value` / `.stat__delta` / `.stat__delta--down` / `.stat__label` / `.spark` /
  `.spark polyline` / `.spark polygon` 七条规则到 `src/styles/modules.css` 的总览段（紧跟 `.ov__grid`，
  位置与 `demo/assets/modules.css` 一致）。逐字照搬原型，色值全走令牌变量，符合样式分层口径。
  原型里裸 `.stat` 本来就没有规则（容器由 `.card` 负责），这里也不补，保持 1:1。
- `.mini-list` / `.checklist` / `.tick` 不回补：它们服务的是六条写死的「今日待办」，
  那是内容不是样式，保留样式等于给下一次放假数据留门。
- **组件仍然不接回首页**：四个数字（今日对话 +12%、平均首字延迟 860ms、今日 token 1.24M、知识库文档 +2）
  后端一个都不返回。组件留着等真实的指标接口，不是留着演数据。
- 顺手修了组件自身的缺陷：`points` 改成可选（默认 `[]`），空数组时整个 `<svg>` 不渲染
  （原来会画出一个 `polygon = " 100,34 0,34"` 的畸形三角形）；只有一个点时 x 取 0
  （原来是 `(index * 100) / (points.length - 1)` → 除以 0 → `NaN` 坐标）。

代价与边界：`css/index` 会比第 22.5 节记的 30.77 KiB 略增（约 +0.4 KiB 未压缩）；
一个没有调用点的组件留在 `components/base/` 里，`npm run verify` 不会渲染它，正确性只能靠下次接指标时一并覆盖。
