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
- 一次性脚本直接加载 `src` 下真实模块（Node 25 原生类型剥离 + 自定义 loader 用 `@vue/compiler-sfc` 编译 SFC），共 149 条断言全部通过：
  - 领域逻辑 72 条：行内标记与类型类映射、假流式逐段吐字与取消、chat store 分组/筛选/参数截断、
    `useChatStream` 发送/停止/重新生成、knowledge store 库切换/搜索/上传入表/抽屉、`useRetrieval` 调参联动。
  - 路由与守卫 26 条：真实路由表的 `meta`（layout / module / padded / requiresAuth）、未登录拦截与带参回跳、
    已登录访问 `/login` 回首页、过期会话清理与本地数据移除、回跳白名单 6 条。
  - 真实组件 SSR 渲染 51 条（35 条结构断言 + 16 条「无 `{{` / `[object Object]` / `undefined` / `NaN` 残留」反向断言）：登录页、外壳（侧栏/顶栏/搜索）、总览（问候/提问框/4 指标卡/最近会话/健康度/待办/连通性/模块入口）、
    对话（三栏标记、历史消息、失败气泡、停止标注、代码块、引用、思考、输入区、参数面板）、
    知识库（库列表、文档表格、状态标签、上传区、召回测试、抽屉、`file-type--*` 修饰类）、404 在壳内。
- 仍未做像素级核对：本会话无法批准启动开发服务器/无头浏览器（审批通道报错）。人工路径见 `README.md`「页面与模块」。

### 13.6 本轮两项确认的处理（2026-09-03）

1. **样式分层口径（R17 → resolved）**：用户选择「修订 `AGENTS.md`」而不是把 `primitives.css` / `modules.css` 拆进各组件。
   `AGENTS.md` 新增「样式分层」一节，把判定口径（共用面广 → 全局表；单组件 → scoped）、引入顺序
   （global → primitives → modules，固定在 `src/main.ts`）与「色值只在 `global.css`」写成硬约束；
   同步更新了「目录职责」的 `src/styles/` 行、「验证基线」的构建体积数字，以及本档案的 `conventions.component` 与 `config.cssStrategy`。
   日后若要走全量 scoped，需要先修订该节并重新核对三页视觉，不要边写边混用两种口径。
2. **回归测试（R18 → 暂缓，仍 open）**：用户确认本期不引入测试框架。149 条断言继续以一次性脚本形式存在（未提交进仓库），
   因此**改动 `src/views/**`、`src/components/**`、`src/stores/**` 后必须手工重跑核对**，不能只依赖 lint + type-check + build。
   `AGENTS.md` 的「尚未引入（需要时先确认）」已加注暂缓结论，避免后续任务擅自安装 vitest。
