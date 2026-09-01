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
| Lint | eslint + eslint-plugin-vue + eslint-webpack-plugin | 7.32.0 / 8.7.1 / 3.2.0 | env 已补 `browser`、`es2021`、`vue/setup-compiler-macros` |
| 语言 | JavaScript | — | **无 TypeScript**，无 tsconfig |
| 样式语言 | 纯 CSS | — | **无 sass/less/stylus** |
| 路由 | vue-router | 4.6.4 | `src/router/index.js`，history 模式 + 懒加载 + 文档标题 |
| 状态管理 | pinia | 2.3.1 | `src/stores/app.js`（主题、侧栏），主题写入 localStorage |
| HTTP 客户端 | axios | 1.20.0 | `src/api/http.js` 统一实例，含超时/请求 ID/错误归一化 |
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
- 路径别名 `@/` → `src/`：运行时由 vue-cli 内置提供，IDE 跳转由 `jsconfig.json` 的 `paths` 提供（两处需保持一致）。
- ESLint 规则集：`plugin:vue/vue3-essential` + `eslint:recommended`，`rules` 为空对象，即**无团队自定义约束**（未强制属性命名顺序、未限制 `v-html`、未限制组件复杂度）。
- 无 Prettier、无 `.editorconfig`、无 git hooks（husky/lint-staged）、无 commit message 规范。
- 若后续引入 `eslint-plugin-vue@9` + Prettier，需先把 ESLint 从 7.32 升级到 8.x，否则 peer 依赖不兼容。

---

## 6. 现存问题与风险（按优先级 · 含 P0 处理结果）

1. ✅ **已处理** · README.md 含未解决的合并冲突标记（`<<<<<<< HEAD` / `=======` / `>>>>>>> 905e4f6...`），已重写为真实项目说明。
2. ✅ **已处理** · `public/index.html` 残留 `<div id="app">sdfds</div>`、`lang=""`、默认包名标题；现为 `lang="zh-CN"` + `VUE_APP_TITLE` 驱动的标题。
3. ✅ **已处理** · 无路由；已引入 vue-router 4，含首页与 404 视图。
4. ✅ **已处理** · 无状态管理；已引入 pinia，落地 `src/stores/app.js`（主题 + 侧栏折叠）。
5. ✅ **已处理（前端侧）** · 无请求层与环境配置；已引入 axios 统一实例、`.env.*`、devServer `/api` 代理。**仍缺后端接口契约**（`index.py` 依旧为空）。
6. **P1 · AI 流式响应方案未定**：需为 SSE / fetch stream 预留统一封装，不能把流式逻辑散进组件。
7. **P2 · 无 UI 体系**：未选定组件库与设计令牌（颜色/间距/暗色主题），后补会引发全站返工。
8. **P2 · 无测试、无 CI**：目前唯一"通过"信号是构建成功，无法保证重构安全。
9. ⚠️ **部分处理** · 已补 404 页面与主题令牌；仍未声明 `engines`，`jsconfig.json` 的 `target: es5` 与 browserslist（`not ie 11`）不一致，无品牌资源（`favicon.ico` 仍是 Vue 默认）。

---

## 7. 后续开发的目标架构建议

### 7.1 推荐目录结构（新增部分，不推翻现有约定）

```text
src/
├── main.js                     # 装配 router / pinia / 全局样式
├── App.vue                     # 仅保留 <router-view> + 全局布局壳
├── router/
│   └── index.js                # 路由表，视图组件一律 () => import() 懒加载
├── stores/                     # pinia：conversation / user / settings / ui
├── api/                        # 唯一的后端调用出口
│   ├── http.js                 # axios 实例 + 拦截器 + baseURL 取自 env
│   └── chat.js                 # 含 SSE 流式封装
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
| 路由 | vue-router@4 | Vue 3 官方配套 | `vue add router`（@vue/cli-plugin-router 5.0.x）或 `npm i vue-router@4` 后手工建 `src/router/index.js` |
| 状态 | pinia@2 | Vue 3 推荐、无 mutation 冗余 | `npm i pinia`，无官方 CLI 插件，需手工装配 |
| 请求 | axios@1 | 拦截器/取消/超时成熟 | `npm i axios`，实例统一放 `src/api/http.js` |
| 流式 | 自研 fetch + ReadableStream | 原生 EventSource 不支持 POST 与自定义 header，AI 接口通常需要 | 封装在 `src/api/`，经 composable 暴露给视图 |
| UI 库 | element-plus@2（或坚持自研） | 生态成熟、中文文档全 | webpack5 下按需引入用 unplugin-vue-components 的 webpack 版；关注首包 |
| 样式 | sass + CSS 变量令牌 | 主题/暗色切换成本最低 | `npm i -D sass`，`styles/tokens.css` 定义 `--color-*` |
| 测试 | vitest + @vue/test-utils@2 | 与 webpack 主链路解耦，接入成本低于改造 jest | 新增 `vitest.config.js`，不动 build 链路 |
| 规范 | prettier + eslint-plugin-vue@9 + husky/lint-staged | 现有规则集过弱，多人协作会漂移 | 前置条件：ESLint 升级到 8.x |
| 类型 | 暂不引入 TypeScript | 当前 0 业务代码，先补功能 | 需要时再上 @vue/cli-plugin-typescript 5.0.x |
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
- 提交前必须通过 `npm run lint` 与 `npm run build`。

**代码放置规则**
- 后端地址、模型 ID、开关等只允许来自 `process.env.VUE_APP_*`，禁止组件内硬编码。
- 网络调用只出现在 `src/api/**`；组件通过 `src/composables/**` 使用，不直接 import axios。
- `views/*` 路由组件必须懒加载；`components/base/*` 不允许依赖 store 与 api。
- 新依赖必须写明用途，并同步更新本文档第 2 节表格与 `docs/project-profile.json`。

**每个任务的交付清单**
1. 需求 → 影响的文件/模块清单；
2. 实现代码（遵循第 5 节风格）；
3. 自检证据：lint 通过、build 通过、手动验证路径描述；
4. 文档更新：本文档 + `docs/project-profile.json`，必要时新增接口契约文档。

---

## 9. 快速上手命令

```bash
cd personal-workspace-web
npm install                 # 已存在 node_modules（574 个包目录 / 191 MB）
npm run serve               # http://localhost:8080
npm run build               # 产物在 dist/
npm run lint                # ESLint 检查
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
├── main.js
├── App.vue
├── router/index.js
├── stores/app.js
├── api/http.js
├── api/workspace.js
├── views/HomeView.vue
├── views/NotFoundView.vue
├── components/base/StatusPill.vue
├── styles/global.css
└── assets/logo.png          # 未引用，待替换
```

### 10.3 验证证据

- `npm run lint`：**0 error**（先遇到两个真实坑，见 10.4，已修）。
- `npm run build`：**成功**，编译 9036ms；产物 `chunk-vendors` 196.45 KiB（gzip 70.22）、`index` 11.08 KiB（gzip 5.14）、懒加载 chunk `745` 0.72 KiB（NotFoundView，证明代码分割生效）、`index.css` 3.96 KiB；**`.map` 文件数为 0**，`productionSourceMap: false` 生效。
- 产物 HTML：`<html lang="zh-CN">`、`<title>个人 AI 工作台</title>`、无 `sdfds` 残留。
- 开发服务器（临时启动验证，已关闭）：`GET /` → 200；`GET /api/health` → 500 `Proxy error ... ECONNREFUSED`，证明 `/api` 代理规则已生效且指向 `http://127.0.0.1:8000`（后端未启动属预期）。
- 无头浏览器渲染：页面正常挂载，顶栏品牌、主题切换按钮、两张卡片、状态标签（待命）均正确显示，说明 pinia/router/env 注入链路可用。

### 10.4 落地过程中的两个工程坑（后续注意）

1. ESLint 7 不识别 `env: es2022`，会直接报 `Environment key "es2022" is unknown`；本项目使用 `es2021`。升级到 ESLint 8 后才可用 `es2022`。
2. `eslint-plugin-vue@8` 不会自动声明 `<script setup>` 编译器宏，需显式加 `"vue/setup-compiler-macros": true`，否则 `defineProps` 触发 `no-undef`。升级到 `eslint-plugin-vue@9` 后该 env 已内置，需移除以免告警。
3. 依赖体积影响：vendors 从 105.29 KiB 增至 196.45 KiB（gzip 37.65 → 70.22 KiB），增量为 router + pinia + axios。引入 UI 组件库前需先确认按需引入方案。

### 10.5 剩余缺口（下一步）

- **P1 骨架**：侧栏 + 内容区布局壳（`sidebarCollapsed` 已在 store 中，尚无消费方）、真实品牌资源与 favicon、把 `assets/logo.png` 换成产品标识。
- **P1/P2**：UI 组件库选型确认（element-plus 或自研）、会话与对话视图、Markdown/代码块渲染、后端接口契约（`personal-workspace-app` 需要真实 `/api/health` 与聊天接口）。
- **P2 流式**：AI 对话的 SSE / fetch-stream 封装，放 `src/api/`，经 `src/composables/` 暴露。
- **P4 工程化**：vitest + @vue/test-utils、CI（lint + build）、`engines` 声明、可选 Prettier（需先升 ESLint 8）、`jsconfig.json` target 与 browserslist 对齐。
