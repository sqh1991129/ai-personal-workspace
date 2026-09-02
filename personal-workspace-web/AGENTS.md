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
```

交付前必须 `npm run lint`、`npm run type-check` 与 `npm run build` 均通过。ESLint 错误会导致 serve/build 失败，类型错误会导致 build 失败，都不要绕过、不要临时降级为 warning。

## 技术栈约束

- Vue 3.5 + **TypeScript 5.4**（`tsconfig.json`，`strict: true`）。`src/**` 一律 `.ts` / `<script setup lang="ts">`，**不要再新增 `.js` 业务代码**。
- 例外（必须保持 `.js`）：`vue.config.js`、`babel.config.js` 与 `demo/**`。
  - 前两者：Vue CLI 5 只加载 `vue.config.{js,cjs,mjs}`，不支持 `vue.config.ts`。
  - `demo/`：零依赖静态原型，没有构建步骤，不能引入 TS。
- TS 转译走 `ts-loader`（`transpileOnly` + `appendTsSuffixTo: [/\.vue$/]`，见 `vue.config.js` 的 `rule('ts')`），
  **不要**改用 `@babel/preset-typescript`：SFC 脚本块传给 Babel 的 `filename` 仍是 `X.vue`，基于扩展名的探测会失效。
- **不要**引入 `@vue/cli-plugin-typescript`：它的 `cache-loader` peer 仍指向 webpack 4，装上需要仓库级 `legacy-peer-deps`。
- 构建链是 Vue CLI 5 / webpack 5，不要引入只支持 Vite 的插件（测试框架例外，见下）。
- 新代码统一 SFC + `<script setup lang="ts">` + Composition API；样式用 `<style scoped>` + `src/styles/global.css` 的 CSS 变量令牌。
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
| `src/styles/` | 令牌与基础样式 | 令牌集中在 `global.css` 的 `:root` |
| `src/utils/` `src/constants/` | 纯函数与常量 | 不得依赖 Vue 运行时 |

## 配置与密钥

- 后端地址、超时、标题等只从 `process.env.VUE_APP_*` 读取，禁止在组件里硬编码。
- 新增环境变量：同步更新 `.env.development`、`.env.production`、`src/types/env.d.ts`、`README.md` 的变量表。
- 只有非敏感默认值可以提交；密钥放 `.env.*.local`（已被忽略），且以 `VUE_APP_` 前缀才会注入前端代码。
- 开发代理在 `vue.config.js` 的 `devServer.proxy`，转发 `/api` 到 `VUE_APP_API_PROXY_TARGET`；生产环境需由 Nginx 等承担同等职责。

## 验证基线（当前）

- `npm run lint`：0 error。
- `npm run type-check`：0 error（`vue-tsc --noEmit`）。
- `npm run build`：成功；`dist/js/chunk-vendors.*.js` 约 197 KiB（gzip 约 70 KiB），无 `.map` 产物（`productionSourceMap: false`）。
- 负向验证过：在 `.ts` 里放 `any`/未使用变量，`npm run lint` 与 `npm run build` 都会失败（证明 TS 文件确实进了规则与 webpack 链路）。
- 首页「后端连通性」卡片：后端未实现时返回 `ECONNREFUSED` 代理错误属预期，不要为此改前端代码。

## 分支与提交

- 新分支使用 `codex/<task-slug>` 前缀；`main` 只接受可构建的提交。
- 不要提交 `dist/`、`node_modules/`、`.env.*.local`。
- 一个任务一个可验证闭环：改动 + 自检证据（lint / type-check / build 结果）+ 文档同步。

## 尚未引入（需要时先确认）

UI 组件库、Sass、单元测试（建议 vitest + @vue/test-utils）、CI、Prettier、i18n。引入前请先与用户确认选型，并同步 `docs/` 两份档案。

> TypeScript 已于 2026-09-02 引入（含 `vue-tsc` 与 `@typescript-eslint@5`），不再需要确认；新增 TS 相关工具链仍需先对齐本文件。
