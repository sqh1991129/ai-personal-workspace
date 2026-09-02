# 个人 AI 工作台 · 网站原型（demo/）

零依赖的静态 HTML 原型，覆盖**对话模块**与**知识库模块**两条主线，供后续 Vue 开发直接对照落地。
所有数据均为假数据，页面不发起任何网络请求，双击任意 `.html` 即可离线查看。

## 目录

```text
demo/
├── index.html          # 工作台总览：统一提问入口、今日指标、站点地图、令牌速览
├── chat.html           # 对话模块：会话列表 / 消息流 / 参数面板 / 输入区
├── knowledge.html      # 知识库模块：库列表 / 文档表格 / 上传队列 / 分片抽屉 / 召回测试
├── assets/
│   ├── tokens.css      # 设计令牌（上半段与 src/styles/global.css 同源）
│   ├── prototype.css   # 外壳与通用组件（侧栏、顶栏、按钮、卡片、状态标记…）
│   ├── modules.css     # 三个模块各自的样式
│   └── prototype.js    # 主题、图标、布局切换与模块内交互（原生 JS，无框架）
├── shots/              # 导出示例图（1440×900，浅色 / 深色各一套）
└── README.md
```

## 示例图

| 页面 | 浅色 | 深色 |
| --- | --- | --- |
| 总览 | `shots/index-light.png` | `shots/index-dark.png` |
| 对话 | `shots/chat-light.png` | `shots/chat-dark.png` |
| 知识库 | `shots/knowledge-light.png` | `shots/knowledge-dark.png` |

重新导出（需本机 Chrome）：

```bash
cd demo
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --user-data-dir=/tmp/ws-shot --window-size=1440,900 \
  --virtual-time-budget=3500 --screenshot=shots/chat-dark.png \
  "file://$PWD/chat.html?theme=dark"
```

## 可交换（模块可搬移）的设计约定

1. **外壳与模块解耦**：三个页面共用同一份 `.shell / .sidebar / .topbar / .page` 结构，模块内容只写在
   `<section class="module" data-module="chat|knowledge">` 里。把任意模块整段搬到另一个页面即可复用，
   落地时对应 `src/App.vue`（外壳）+ `src/views/*View.vue`（模块）。
2. **布局可切换**：顶栏「三栏 / 两栏 / 专注」直接改 `data-layout`，CSS 用属性选择器控制列数，
   对话与知识库共用同一套开关（`setLayout()`）。
3. **主题可切换**：沿用 `document.documentElement.dataset.theme`，令牌只出现在 `tokens.css`，
   组件里不写死色值；跨页通过 `?theme=dark` 传递，`localStorage` 可用时额外记忆。
4. **状态与样式解耦**：交互一律挂在 `data-role`（结构锚点）与 `data-action`（行为）上，
   样式只认 `class`。改视觉不会碰逻辑，反之亦然。
5. **图标集中管理**：HTML 里只写 `<span data-icon="chat">`，`prototype.js` 的 `ICONS` 表统一注入，
   新增图标只需加一条。

## 页面内可交互项（自检清单）

- 总览：输入提问 → 回车跳转对话页并回填；快捷入口 chip 同理；主题切换即时生效。
- 对话：输入消息 → 模拟流式输出（光标 + 逐段渲染）→ 自动补出思考过程、引用来源与操作按钮；
  生成中再按一次发送 = 停止并保留部分内容；重新生成 / 复制 / 点赞点踩 / 新建会话 / 会话筛选 / 布局切换均可点。
- 知识库：左侧切换知识库重渲染表格；点击行打开分片抽屉；状态标签页 + 关键词搜索过滤；
  点击或拖拽上传区触发「上传 → 解析 → 分片 → 向量化 → 已索引」进度；召回测试输出带相似度条的命中分片。

## 与现有工程的对应关系

| 原型区域 | 建议落点 | 状态来源 | 接口（待后端实现） |
| --- | --- | --- | --- |
| 外壳 / 侧栏 / 主题 | `src/App.vue` | `src/stores/app.js` | — |
| 总览指标与快捷提问 | `src/views/HomeView.vue`（演进） | `src/stores/app.js` | `GET /api/summary` |
| 会话列表 | `src/components/business/SessionList.vue` | `src/stores/chat.js` | `GET /api/chat/sessions` |
| 消息流 / 消息气泡 | `src/components/business/MessageStream.vue`、`MessageItem.vue` | `src/stores/chat.js` | `POST /api/chat/completions`（SSE） |
| 输入区（附件 / 知识库 / 深度思考） | `src/components/business/ChatComposer.vue` | 组件内 state + `stores/chat.js` | — |
| 参数面板 | `src/components/business/ChatParamsPanel.vue` | `stores/chat.js` | — |
| 知识库列表 / 文档表格 | `src/views/KnowledgeView.vue`、`business/KbList.vue` | `src/stores/knowledge.js` | `GET /api/kb`、`GET /api/kb/{id}/documents` |
| 分片详情抽屉 | `src/components/base/Drawer.vue`、`business/ChunkList.vue` | 组件内 state | `GET /api/documents/{id}/chunks` |
| 召回测试 | `src/components/business/RecallTester.vue` | `composables/useRetrieval.js` | `POST /api/kb/{id}/retrieve` |
| 索引状态标记 | `src/components/base/StatusPill.vue`（已存在） | props | — |

## 落地注意事项

- 令牌扩展（`--color-surface-sunken`、`--radius-lg`、`--shadow-*`、`--header-h` 等）目前只在 `demo/assets/tokens.css`，
  正式开发时按需并入 `src/styles/global.css`，并同步 `docs/PROJECT_ANALYSIS.md` 与 `docs/project-profile.json`。
- 原型未引入任何 UI 组件库、图标库、字体 CDN，符合仓库「尚未引入需先确认」的约定。
- `demo/` 不参与 `npm run serve` / `npm run build`，也不在 ESLint 的 `src` 范围内；如需线上预览，
  可后续在 `vue.config.js` 里加 `devServer.static` 或把原型转成 Vue 视图，二选一即可，不要长期双份维护。
- 对话与知识库的假数据在 `prototype.js` 的 `KB_DATA` / `draftFor()` 里，其中默认知识库「架构决策库」的行数据
  与 `knowledge.html` 中手写的表格行需保持一致（首屏故意保留静态行，便于无 JS 时阅读结构）。
- 导出示例图可用状态参数：`chat.html?state=empty`（新会话空状态）、`knowledge.html?state=drawer`（分片抽屉）。
