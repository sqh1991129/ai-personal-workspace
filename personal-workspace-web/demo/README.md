# 个人 AI 工作台 · 网站原型（demo/）

零依赖的静态 HTML 原型，覆盖**对话模块**与**知识库模块**两条主线，供后续 Vue 开发直接对照落地。
所有数据均为假数据，页面不发起任何网络请求，双击任意 `.html` 即可离线查看。

> **2026-09-03 状态**：三个页面已整体迁移进 `src/`（外壳 + 总览 + 对话 + 知识库 + 登录页）。
> 本目录自此只作为**视觉与交互的事实来源**保留，功能改动请落在 `src/` 下，不要双份维护。
> 下方对照表的「建议落点」已全部标注落地情况。

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
| 外壳 / 侧栏 / 主题 | `src/App.vue` + `components/business/AppSidebar.vue`、`AppTopbar.vue` | `src/stores/app.ts` | — （已落地）|
| 总览指标与快捷提问 | `src/views/HomeView.vue` | `stores/chat.ts`、`stores/knowledge.ts` | `GET /api/summary`（暂用假数据）|
| 会话列表 | `src/components/business/SessionList.vue` | `src/stores/chat.ts` | `GET /api/chat/sessions`（已落地，暂由 mock 提供）|
| 消息流 / 消息气泡 | `src/components/business/MessageStream.vue`、`MessageItem.vue` | `src/stores/chat.ts` | `POST /api/chat/completions`（SSE，已按事件回调抽象）|
| 输入区（附件 / 知识库 / 深度思考） | `src/components/business/ChatComposer.vue` | 组件内 state + `stores/chat.ts` | — （已落地）|
| 参数面板 | `src/components/business/ChatParamsPanel.vue` | `stores/chat.ts` | — （已落地）|
| 知识库列表 / 文档表格 | `src/views/KnowledgeView.vue`、`business/KbList.vue`、`business/DocumentTable.vue` | `src/stores/knowledge.ts` | `GET /api/kb`、`GET /api/kb/{id}/documents`（已落地，暂由 mock 提供）|
| 分片详情抽屉 | `src/components/base/AppDrawer.vue`、`business/ChunkList.vue` | `src/stores/knowledge.ts` | `GET /api/documents/{id}/chunks`（已落地，暂由 mock 提供）|
| 召回测试 | `src/components/business/RecallTester.vue` | `composables/useRetrieval.ts` | `POST /api/kb/{id}/retrieve`（已落地，暂由 mock 提供）|
| 索引状态标记 | `src/components/base/StatusPill.vue` + `business/DocumentTable.vue` 的状态标签 | props / constants | — |
| 登录页（**原型缺失**，2026-09-03 按本原型令牌与组件风格补齐） | `src/views/LoginView.vue` + `components/business/LoginForm.vue` | `src/stores/auth.ts` | `POST /api/auth/login`（暂由 `VUE_APP_MOCK_AUTH` 的假数据承担，账号 admin / admin） |

## 落地注意事项

- 令牌扩展（`--color-surface-sunken`、`--radius-lg`、`--shadow-*`、`--header-h` 等）**已并入** `src/styles/global.css`，
  并补齐 `--color-overlay`、`--color-user-bubble`、`--color-on-danger`、`--sidebar-w`、`--rail-w`、`--panel-w` 等布局令牌。
  正式工程里只允许 `global.css` 出现色值，组件一律引用令牌。
- 原型未引入任何 UI 组件库、图标库、字体 CDN，符合仓库「尚未引入需先确认」的约定。
- `demo/` 不参与 `npm run serve` / `npm run build`，也不在 ESLint 的 `src` 范围内。原型已转成 Vue 视图，
  因此**不再需要** `devServer.static`；本目录保留用于对照与回归截图。
- 对话与知识库的假数据在 `prototype.js` 的 `KB_DATA` / `draftFor()` 里，其中默认知识库「架构决策库」的行数据
  与 `knowledge.html` 中手写的表格行需保持一致（首屏故意保留静态行，便于无 JS 时阅读结构）。
- 导出示例图可用状态参数：`chat.html?state=empty`（新会话空状态）、`knowledge.html?state=drawer`（分片抽屉）。
