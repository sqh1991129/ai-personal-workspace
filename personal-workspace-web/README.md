# 个人 AI 工作台 · 前端（personal-workspace-web）

Vue 3 单页应用。前端基建（路由 / 状态管理 / 请求层 / 环境变量 / 开发代理 / 主题令牌）已就绪，业务功能待开发。

## 快速开始

```bash
npm install
npm run serve    # 开发服务器 http://localhost:8080
npm run build    # 生产构建，产物在 dist/
npm run lint     # ESLint 检查
```

## 技术栈

Vue 3.5 · Vue CLI 5（webpack 5）· vue-router 4 · pinia 2 · axios 1 · ESLint 7（`plugin:vue/vue3-essential`）· 纯 CSS + CSS 变量主题令牌。

## 环境变量

| 变量 | 说明 | 开发默认值 |
| --- | --- | --- |
| `VUE_APP_TITLE` | 页面标题与顶栏品牌文案 | `个人 AI 工作台` |
| `VUE_APP_API_BASE` | 请求层 baseURL | `/api` |
| `VUE_APP_API_TIMEOUT` | 请求超时（毫秒） | `15000` |
| `VUE_APP_DEV_PORT` | 开发服务器端口 | `8080` |
| `VUE_APP_API_PROXY_TARGET` | 开发代理转发目标（后端地址） | `http://127.0.0.1:8000` |

- `.env.development` / `.env.production` 随仓库提交，只放非敏感默认值。
- 个人覆盖写入 `.env.development.local`（已被 `.gitignore` 忽略），不要改动提交版的值。

## 目录结构

```text
src/
├── main.js                 # 装配 pinia + router + 全局样式
├── App.vue                 # 布局壳：顶栏、主题切换、RouterView
├── router/index.js         # 路由表 + 文档标题
├── stores/app.js           # 跨视图 UI 状态（主题、侧栏）
├── api/http.js             # axios 实例、拦截器、ApiError
├── api/workspace.js        # 领域接口（当前：健康检查）
├── views/                  # 路由级页面（HomeView / NotFoundView）
├── components/base/        # 无业务依赖的通用组件
└── styles/global.css       # 设计令牌与基础样式
```

## 文档

- `AGENTS.md`：开发与协作约定（新代码必读）。
- `docs/PROJECT_ANALYSIS.md`：完整技术栈分析、风险清单与分期路线图。
- `docs/project-profile.json`：结构化项目档案，供任务开发读取校验。

## 已知状态

后端 `personal-workspace-app` 目前只有一个空的 `index.py`，尚未提供接口。首页「后端连通性」卡片出现代理错误（`ECONNREFUSED`）属预期结果。
