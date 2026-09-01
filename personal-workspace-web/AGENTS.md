# AGENTS.md — personal-workspace-web

本文件适用于 `personal-workspace-web/` 子树（Git 仓库根在上一层 `personal-workspace/`）。

## 开工前必读

1. `docs/PROJECT_ANALYSIS.md`：技术栈事实、风险清单、分期路线图。
2. `docs/project-profile.json`：结构化档案（依赖版本、配置、issue 状态）。改动依赖或目录结构后必须同步这两个文件。
3. 注意 Git 仓库根包含同级目录 `personal-workspace-app/`（后端占位），不要把它的前端改动混进来。

## 命令

```bash
npm run serve    # 开发服务器，默认 8080（VUE_APP_DEV_PORT 可覆盖）
npm run build    # 生产构建到 dist/
npm run lint     # ESLint 检查（serve/build 阶段也会执行）
```

交付前必须 `npm run lint` 与 `npm run build` 均通过。ESLint 错误会导致 serve/build 失败，不要绕过。

## 技术栈约束

- Vue 3.5 + JavaScript，**未引入 TypeScript**；不要单独给部分文件加 TS。
- 构建链是 Vue CLI 5 / webpack 5，不要引入只支持 Vite 的插件（测试框架例外，见下）。
- 新代码统一 SFC + `<script setup>` + Composition API；样式用 `<style scoped>` + `src/styles/global.css` 的 CSS 变量令牌。
- 不要新增需要 ESLint 8 的 lint 依赖（如 `eslint-plugin-vue@9`、Prettier 集成），除非同一任务里一并升级 ESLint 并验证。
- 主题切换依赖 `document.documentElement.dataset.theme`，新增颜色只能加令牌变量，不要写死色值。

## 目录职责

| 目录 | 职责 | 约束 |
| --- | --- | --- |
| `src/router/` | 路由表、导航守卫、文档标题 | 视图组件懒加载；新增页面在此登记 |
| `src/views/` | 路由级页面 | 只做编排，通用逻辑下沉 composables |
| `src/stores/` | pinia 跨视图状态 | 一个 store 一个领域，禁止存大体积业务数据缓存 |
| `src/api/` | 唯一的后端调用出口 | 组件不得直接 `import axios`，只经 `http.js` 与领域模块 |
| `src/composables/` | 可复用逻辑与 API 编排 | 命名 `useXxx.js`，需处理卸载时取消请求 |
| `src/components/base/` | 无业务依赖的通用组件 | 不得依赖 store 与 api |
| `src/components/business/` | 业务组件 | 允许依赖 store 与 composables |
| `src/styles/` | 令牌与基础样式 | 令牌集中在 `global.css` 的 `:root` |
| `src/utils/` `src/constants/` | 纯函数与常量 | 不得依赖 Vue 运行时 |

## 配置与密钥

- 后端地址、超时、标题等只从 `process.env.VUE_APP_*` 读取，禁止在组件里硬编码。
- 新增环境变量：同步更新 `.env.development`、`.env.production`、`README.md` 的变量表。
- 只有非敏感默认值可以提交；密钥放 `.env.*.local`（已被忽略），且以 `VUE_APP_` 前缀才会注入前端代码。
- 开发代理在 `vue.config.js` 的 `devServer.proxy`，转发 `/api` 到 `VUE_APP_API_PROXY_TARGET`；生产环境需由 Nginx 等承担同等职责。

## 验证基线（当前）

- `npm run lint`：0 error。
- `npm run build`：成功；`dist/js/chunk-vendors.*.js` 约 196 KiB（gzip 约 70 KiB），无 `.map` 产物（`productionSourceMap: false`）。
- 首页「后端连通性」卡片：后端未实现时返回 `ECONNREFUSED` 代理错误属预期，不要为此改前端代码。

## 分支与提交

- 新分支使用 `codex/<task-slug>` 前缀；`main` 只接受可构建的提交。
- 不要提交 `dist/`、`node_modules/`、`.env.*.local`。
- 一个任务一个可验证闭环：改动 + 自检证据（lint/build 结果）+ 文档同步。

## 尚未引入（需要时先确认）

UI 组件库、Sass、单元测试（建议 vitest + @vue/test-utils）、CI、Prettier、TypeScript、i18n。引入前请先与用户确认选型，并同步 `docs/` 两份档案。
