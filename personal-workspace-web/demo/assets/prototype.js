/* ==========================================================================
 * 个人 AI 工作台 · 原型交互脚本（零依赖，纯原生 JS）
 * 只做三件事：
 *  1. 外壳行为：主题、侧栏折叠、图标注入、跨页保持状态（这就是「模块可交换」的契约）。
 *  2. 模块内演示：对话流式输出、知识库上传/索引/召回，全部用假数据，不请求后端。
 *  3. 状态持久化：localStorage 可用时记忆，file:// 被禁用时退化为内存 + URL 参数。
 * 落地到 Vue 时，本文件的每个 initXxx() 大致对应一个 composable（useTheme / useChat …）。
 * ========================================================================== */
(function () {
  'use strict'

  /* ---------------- 图标：data-icon -> 内联 SVG ---------------- */
  var ICONS = {
    grid: '<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
    chat: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/>',
    book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5A1.5 1.5 0 0 0 20 18.5z"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 10l2.5 2.5L16 7"/><path d="M8 16h8"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
    moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    send: '<path d="M6 12l14-7-5.5 14-3-6z"/>',
    stop: '<rect x="7.5" y="7.5" width="9" height="9" rx="1.5"/>',
    paperclip: '<path d="M20 11.5l-8 8a4.5 4.5 0 0 1-6.5-6.5l8.5-8.5a3 3 0 0 1 4.5 4.5l-8.5 8.5a1.5 1.5 0 0 1-2.5-2l8-8"/>',
    spark: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z"/>',
    copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 5H6a1 1 0 0 0-1 1v9"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v5h-5"/>',
    thumbUp: '<path d="M7 21V10l4.5-7a2 2 0 0 1 2 2.5L12.5 9H19a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7z"/><path d="M7 10H3v11h4"/>',
    thumbDown: '<path d="M17 3v11l-4.5 7a2 2 0 0 1-2-2.5L11.5 15H5a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.2 4H17z"/><path d="M17 14h4V3h-4"/>',
    file: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"/><path d="M14 3v4h4"/>',
    upload: '<path d="M12 16V4"/><path d="M7.5 8.5L12 4l4.5 4.5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>',
    more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    warning: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
    db: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    link: '<path d="M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-5.6-5.6L11.5 7"/><path d="M14 11a4 4 0 0 0-6-.5l-2 2A4 4 0 0 0 9.6 18.1l1.9-1.6"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 1.8"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    flask: '<path d="M9 3v6L4.5 17A2 2 0 0 0 6.3 20h11.4a2 2 0 0 0 1.8-3L15 9V3"/><path d="M8 3h8M6.8 14h10.4"/>',
    eye: '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    bolt: '<path d="M13 3L5.5 13.5H11l-1 7.5L18.5 10H13z"/>'
  }

  function icon(name, extraClass) {
    return '<span class="icon' + (extraClass ? ' ' + extraClass : '') + '" aria-hidden="true"><svg viewBox="0 0 24 24">' +
      (ICONS[name] || '') + '</svg></span>'
  }

  function mountIcons(root) {
    var nodes = (root || document).querySelectorAll('[data-icon]')
    Array.prototype.forEach.call(nodes, function (node) {
      if (node.dataset.iconDone === '1') return
      paint(node, node.dataset.icon)
    })
  }

  /* 把图标画进节点：.icon 节点直接放 <svg>，按钮类节点包一层 .icon 以复用尺寸与描边样式 */
  function paint(node, name) {
    if (!node) return
    node.dataset.iconDone = '1'
    node.dataset.icon = name
    var svg = '<svg viewBox="0 0 24 24">' + (ICONS[name] || '') + '</svg>'
    if (node.classList.contains('icon') || /\bicon--/.test(node.className)) {
      node.classList.add('icon')
      node.innerHTML = svg
      return
    }
    var size = node.classList.contains('icon-btn') || node.classList.contains('btn') ? 'icon icon--sm' : 'icon'
    node.innerHTML = '<span class="' + size + '" aria-hidden="true">' + svg + '</span>'
  }

  /* ---------------- 状态存储（file:// 下可能不可用） ---------------- */
  var memory = {}
  var store = {
    get: function (key) {
      try {
        var value = window.localStorage.getItem(key)
        return value === null ? memory[key] || '' : value
      } catch (error) {
        return memory[key] || ''
      }
    },
    set: function (key, value) {
      memory[key] = value
      try {
        window.localStorage.setItem(key, value)
      } catch (error) {
        /* 忽略：原型状态仅在当前页面生命周期内保留 */
      }
    }
  }

  /* ---------------- 主题 + 跨页保持一致 ---------------- */
  function currentTheme() {
    var fromUrl = new URLSearchParams(window.location.search).get('theme')
    if (fromUrl === 'light' || fromUrl === 'dark') return fromUrl
    var saved = store.get('ws-demo-theme')
    return saved === 'dark' ? 'dark' : 'light'
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme
    var toggle = document.querySelector('[data-role="theme-toggle"]')
    if (toggle) {
      toggle.setAttribute('aria-label', theme === 'dark' ? '切换到浅色' : '切换到深色')
      toggle.title = toggle.getAttribute('aria-label')
      paint(toggle, theme === 'dark' ? 'sun' : 'moon')
    }
    /* 同目录页面之间跳转时把主题写进查询串：file:// 禁用 localStorage 时也能保持一致。
       注意要先剥掉上一次写入的查询串，否则第二次切换就匹配不到、改不动了。 */
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (link) {
      var href = link.getAttribute('href')
      if (!href) return
      var hashIndex = href.indexOf('#')
      var hash = hashIndex > -1 ? href.slice(hashIndex) : ''
      var base = (hashIndex > -1 ? href.slice(0, hashIndex) : href).split('?')[0]
      if (!/^[a-z0-9_.-]+\.html$/i.test(base)) return
      link.setAttribute('href', base + '?theme=' + theme + hash)
    })
  }

  function initTheme() {
    applyTheme(currentTheme())
    var toggle = document.querySelector('[data-role="theme-toggle"]')
    if (toggle) {
      toggle.addEventListener('click', function () {
        var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
        store.set('ws-demo-theme', next)
        applyTheme(next)
        toast('已切换' + (next === 'dark' ? '深色' : '浅色') + '主题（对应 dataset.theme）')
      })
    }
  }

  /* ---------------- 侧栏折叠 + 布局切换 ---------------- */
  function initShell() {
    var sidebar = document.querySelector('.sidebar')
    var collapse = document.querySelector('[data-role="sidebar-toggle"]')
    if (sidebar && collapse) {
      if (store.get('ws-demo-sidebar') === 'collapsed') sidebar.classList.add('is-collapsed')
      collapse.addEventListener('click', function () {
        sidebar.classList.toggle('is-collapsed')
        store.set('ws-demo-sidebar', sidebar.classList.contains('is-collapsed') ? 'collapsed' : 'expanded')
      })
    }

    var moduleEl = document.querySelector('[data-module]')
    var switcher = document.querySelector('[data-role="layout-switch"]')
    if (moduleEl && switcher) {
      var savedLayout = store.get('ws-demo-layout-' + moduleEl.dataset.module)
      if (savedLayout) moduleEl.dataset.layout = savedLayout
      switcher.addEventListener('click', function (event) {
        var button = event.target.closest('button[data-layout]')
        if (!button) return
        setLayout(moduleEl, switcher, button.dataset.layout)
      })
      setLayout(moduleEl, switcher, moduleEl.dataset.layout || 'three-col')
    }

    /* 面板收起按钮：与顶部分段控件共用同一份布局状态 */
    var closePanel = document.querySelector('[data-role="panel-close"]')
    if (closePanel && moduleEl && switcher) {
      closePanel.addEventListener('click', function () {
        setLayout(moduleEl, switcher, 'two-col')
        toast('已收起右侧面板，可在顶栏切回三栏')
      })
    }

    var search = document.querySelector('[data-role="global-search"]')
    document.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (search) search.focus()
      }
    })
  }

  /* ---------------- 布局状态与 Toast ---------------- */
  function setLayout(moduleEl, switcher, layout) {
    moduleEl.dataset.layout = layout
    store.set('ws-demo-layout-' + moduleEl.dataset.module, layout)
    if (switcher) {
      Array.prototype.forEach.call(switcher.querySelectorAll('button'), function (item) {
        item.setAttribute('aria-selected', String(item.dataset.layout === layout))
      })
    }
  }

  function toast(message) {
    var layer = document.querySelector('.toast-layer')
    if (!layer) {
      layer = document.createElement('div')
      layer.className = 'toast-layer'
      layer.setAttribute('aria-live', 'polite')
      document.body.appendChild(layer)
    }
    var item = document.createElement('div')
    item.className = 'toast'
    item.innerHTML = icon('bolt', 'icon--sm') + '<span></span>'
    item.querySelector('span').textContent = message
    layer.appendChild(item)
    window.setTimeout(function () {
      item.remove()
    }, 2400)
  }

  /* ---------------- 小工具 ---------------- */
  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]
    })
  }

  function clockLabel() {
    var now = new Date()
    function pad(value) {
      return value < 10 ? '0' + value : String(value)
    }
    return pad(now.getHours()) + ':' + pad(now.getMinutes())
  }

  function textareaGrow(node, max) {
    node.style.height = 'auto'
    node.style.height = Math.min(node.scrollHeight, max || 180) + 'px'
  }

  /* ==========================================================================
   * 对话模块
   * ========================================================================== */
  var chatTimers = []

  function clearChatTimers() {
    chatTimers.forEach(function (id) {
      window.clearTimeout(id)
    })
    chatTimers = []
  }

  function draftFor(question) {
    var text = String(question)
    if (/代码|函数|脚本|接口|示例|python|js/i.test(text)) {
      return {
        html: '<p>可以。下面是一段最小可运行示例，已按本仓库的 axios 封装习惯改写：</p>' +
          '<div class="codeblock"><div class="codeblock__bar"><span>JAVASCRIPT</span>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-action="copy-code">复制</button></div>' +
          '<pre><code><span class="tok-com">// src/api/workspace.js</span>\n' +
          '<span class="tok-key">import</span> http <span class="tok-key">from</span> <span class="tok-str">\'./http\'</span>\n\n' +
          '<span class="tok-key">export function</span> chatCompletion(payload) {\n' +
          '  <span class="tok-key">return</span> http.post(<span class="tok-str">\'/chat/completions\'</span>, payload)\n' +
          '}</span></code></pre></div>' +
          '<p>要点：<span class="inline-code">http.js</span> 统一处理超时与错误归一化，组件里不要直接引入 axios。</p>',
        cites: [['前端基建说明.md', '§2 请求层'], ['API 约定.md', '/chat/completions']],
        think: '先判断意图偏代码生成 → 取「前端基建」知识库分片 → 校验 axios 封装约定 → 输出最小示例并附来源。'
      }
    }
    return {
      html: '<p>我把你的问题拆成三步来回答：</p><ol>' +
        '<li><strong>结论先行</strong>：当前基建已就绪，可以直接按「对话 + 知识库」两条主线开发业务功能。</li>' +
        '<li><strong>关键约束</strong>：SFC 一律 <span class="inline-code">&lt;script setup&gt;</span>；后端调用只走 <span class="inline-code">src/api/</span>；颜色只用 <span class="inline-code">global.css</span> 的令牌。</li>' +
        '<li><strong>下一步</strong>：先落 <span class="inline-code">views/ChatView.vue</span> 与 <span class="inline-code">stores/chat.js</span>，把流式响应封装成 <span class="inline-code">useChatStream()</span>。</li>' +
        '</ol><h4>需要注意的边界</h4><p>后端 <span class="inline-code">personal-workspace-app</span> 还没有接口，联调前先用本地 mock；健康检查报 ECONNREFUSED 属预期。</p>',
      cites: [['AGENTS.md', '技术栈约束'], ['PROJECT_ANALYSIS.md', '风险清单 R3'], ['知识库/架构决策.md', 'ADR-004']],
      think: '识别为方案咨询 → 检索 AGENTS.md 与架构决策记录 → 汇总为结论/约束/行动三段式回答。'
    }
  }

  function userBubble(text) {
    return '<article class="msg msg--user"><div class="avatar avatar--lg">我</div>' +
      '<div class="msg__col"><div class="bubble"><p>' + escapeHtml(text) + '</p></div>' +
      '<div class="msg__meta"><span>刚刚</span><span>·</span><span>已发送到当前会话</span></div></div></article>'
  }

  function assistantShell() {
    return '<article class="msg msg--assistant" data-role="streaming">' +
      '<div class="avatar avatar--lg">' + icon('spark', 'icon--sm') + '</div>' +
      '<div class="msg__col"><div class="bubble"><div data-role="stream-body"></div></div>' +
      '<div class="msg__meta"><span>WS-14B · 本地</span><span class="dots"><i></i><i></i><i></i></span></div>' +
      '<div class="msg__actions"></div></div></article>'
  }

  function finishMessage(article, draft) {
    var body = article.querySelector('[data-role="stream-body"]')
    var cites = draft.cites.map(function (item, index) {
      return '<button class="cite" type="button" data-action="open-cite" title="在知识库中定位原文"><sup>' +
        (index + 1) + '</sup>' + escapeHtml(item[0]) + ' · ' + escapeHtml(item[1]) + '</button>'
    }).join('')
    body.innerHTML =
      '<details class="think"' + (draft.thinkVisible ? ' open' : '') + '><summary>' + icon('flask', 'icon--sm') +
      ' 思考过程 · ' + draft.thinkSeconds + 's</summary><p>' + escapeHtml(draft.think) + '</p></details>' +
      draft.html + '<div class="cites">' + cites + '</div>'
    article.querySelector('.dots').outerHTML = '<span>' + draft.tokens + ' tokens · ' + draft.ms + 'ms</span>'
    article.querySelector('.msg__actions').innerHTML =
      '<button class="icon-btn" type="button" data-action="copy-answer" title="复制回答">' + icon('copy', 'icon--sm') + '</button>' +
      '<button class="icon-btn" type="button" data-action="regenerate" title="重新生成">' + icon('refresh', 'icon--sm') + '</button>' +
      '<button class="icon-btn" type="button" data-action="feedback" title="有帮助">' + icon('thumbUp', 'icon--sm') + '</button>' +
      '<button class="icon-btn" type="button" data-action="feedback" title="待改进">' + icon('thumbDown', 'icon--sm') + '</button>'
    delete article.dataset.streaming
    mountIcons(article)
  }

  function streamAnswer(thread, draft) {
    var article = document.createElement('div')
    article.innerHTML = assistantShell()
    var node = article.firstElementChild
    thread.appendChild(node)
    node.dataset.streaming = '1'
    var body = node.querySelector('[data-role="stream-body"]')
    var pieces = draft.html.match(/<[^>]+>|[^<]+/g) || []
    var index = 0
    var buffer = ''
    function step() {
      if (!node.dataset.streaming) return
      var taken = 0
      while (index < pieces.length && taken < 3) {
        buffer += pieces[index]
        index += 1
        taken += 1
      }
      body.innerHTML = buffer + '<span class="stream-caret"></span>'
      thread.scrollTop = thread.scrollHeight
      if (index < pieces.length) {
        chatTimers.push(window.setTimeout(step, 90))
      } else {
        draft.thinkSeconds = draft.thinkSeconds || 3
        draft.tokens = 412
        draft.ms = 1180
        finishMessage(node, draft)
        setSending(false)
      }
    }
    chatTimers.push(window.setTimeout(step, 260))
  }

  /* 停止生成：保留已吐出的部分，落一个「已停止」态，而不是把答案补全 */
  function stopStream(node) {
    if (!node) return
    clearChatTimers()
    delete node.dataset.streaming
    var caret = node.querySelector('.stream-caret')
    if (caret) caret.remove()
    var dots = node.querySelector('.dots')
    if (dots) dots.outerHTML = '<span>已停止 · 保留已生成内容</span>'
    var actions = node.querySelector('.msg__actions')
    if (actions && !actions.children.length) {
      actions.innerHTML = '<button class="btn btn--sm" type="button" data-action="regenerate">' +
        icon('refresh', 'icon--sm') + '继续生成</button>'
    }
    setSending(false)
  }

  function setSending(isSending) {
    var button = document.querySelector('[data-role="send"]')
    if (!button) return
    button.classList.toggle('is-stop', isSending)
    button.title = isSending ? '停止生成' : '发送（Enter）'
    paint(button, isSending ? 'stop' : 'send')
  }

  /* 开关类按钮的统一反馈：同步 aria-pressed 与行内状态标记 */
  function applyToggle(toggle) {
    var on = toggle.getAttribute('aria-pressed') !== 'true'
    toggle.setAttribute('aria-pressed', String(on))
    var pill = toggle.querySelector('.pill')
    if (pill) {
      pill.className = on ? 'pill pill--success' : 'pill'
      pill.textContent = on ? '已选' : '未选'
    }
    toast(toggle.dataset.label + '：' + (on ? '已开启' : '已关闭'))
  }

  function initChat() {
    var moduleEl = document.querySelector('[data-module="chat"]')
    if (!moduleEl) return
    var thread = moduleEl.querySelector('[data-role="thread-inner"]')
    var scroller = moduleEl.querySelector('[data-role="thread-scroll"]')
    var input = moduleEl.querySelector('[data-role="composer-input"]')
    var form = moduleEl.querySelector('[data-role="composer"]')
    var counter = moduleEl.querySelector('[data-role="char-count"]')
    var lastQuestion = ''

    /* 提示词回填（总览页 → 对话页）：优先读 URL 参数，file:// 禁用存储时同样可用 */
    var prefilled = new URLSearchParams(window.location.search).get('prompt') || store.get('ws-demo-prompt')
    if (prefilled) {
      input.value = prefilled
      store.set('ws-demo-prompt', '')
      textareaGrow(input)
    }

    function send(text) {
      var question = String(text || '').trim()
      if (!question) return
      lastQuestion = question
      /* 只清当前消息流里的空状态，别把隐藏的 thread-template 一起删掉 */
      var empty = thread.querySelector('[data-role="empty-thread"]')
      if (empty) empty.remove()
      thread.insertAdjacentHTML('beforeend', userBubble(question))
      input.value = ''
      textareaGrow(input)
      if (counter) counter.textContent = '0'
      scroller.scrollTop = scroller.scrollHeight
      setSending(true)
      var draft = draftFor(question)
      draft.thinkSeconds = 2
      window.setTimeout(function () {
        streamAnswer(thread, draft)
      }, 420)
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault()
      var streaming = moduleEl.querySelector('[data-streaming]')
      if (streaming) {
        stopStream(streaming)
        toast('已停止生成，可在气泡下方继续')
        return
      }
      send(input.value)
    })

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        send(input.value)
      }
    })

    input.addEventListener('input', function () {
      textareaGrow(input)
      if (counter) counter.textContent = String(input.value.length)
    })

    moduleEl.addEventListener('click', function (event) {
      var suggestion = event.target.closest('[data-action="use-suggestion"]')
      if (suggestion) {
        send(suggestion.dataset.prompt)
        return
      }
      if (event.target.closest('[data-action="copy-answer"], [data-action="copy-code"]')) {
        toast('已复制到剪贴板（原型内为模拟行为）')
        return
      }
      if (event.target.closest('[data-action="regenerate"]')) {
        var streaming = moduleEl.querySelector('[data-streaming]')
        if (streaming) return
        setSending(true)
        streamAnswer(thread, draftFor(lastQuestion || input.value || '重新生成'))
        toast('已按当前上下文重新生成')
        return
      }
      if (event.target.closest('[data-action="feedback"]')) {
        event.target.closest('.icon-btn').classList.add('is-active')
        toast('感谢反馈，将用于会话质量评估')
        return
      }
      if (event.target.closest('[data-action="open-cite"]')) {
        window.location.href = withTheme('knowledge.html') + '#doc-detail'
        return
      }
      var session = event.target.closest('[data-action="open-session"]')
      if (session) {
        Array.prototype.forEach.call(moduleEl.querySelectorAll('[data-action="open-session"]'), function (item) {
          item.classList.toggle('is-active', item === session)
        })
        toast('已切换到会话：' + session.querySelector('.row__title').textContent)
      }
      var toggle = event.target.closest('[data-action="toggle"]')
      if (toggle) {
        applyToggle(toggle)
      }
    })

    var newChat = moduleEl.querySelector('[data-action="new-chat"]')
    if (newChat) {
      newChat.addEventListener('click', function () {
        clearChatTimers()
        thread.innerHTML = moduleEl.querySelector('[data-role="thread-template"]').innerHTML
        mountIcons(thread)
        input.value = ''
        textareaGrow(input)
        setSending(false)
        toast('已新建会话，模型参数沿用当前配置')
      })
    }

    /* 跨页搜索框过滤会话列表 */
    var filter = moduleEl.querySelector('[data-role="session-filter"]')
    if (filter) {
      filter.addEventListener('input', function () {
        var keyword = filter.value.trim().toLowerCase()
        Array.prototype.forEach.call(moduleEl.querySelectorAll('[data-action="open-session"]'), function (row) {
          var hit = row.querySelector('.row__title').textContent.toLowerCase().indexOf(keyword) > -1
          row.hidden = Boolean(keyword) && !hit
        })
      })
    }

    mountIcons(thread)
  }

  function withTheme(page) {
    return page + '?theme=' + (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  }

  /* 跨页带着提问文本跳转：URL 是可靠的传递通道，localStorage 只当缓存用 */
  function goChatWithPrompt(text) {
    store.set('ws-demo-prompt', text)
    window.location.href = withTheme('chat.html') + '&prompt=' + encodeURIComponent(text)
  }

  /* ==========================================================================
   * 知识库模块
   * ========================================================================== */
  var KB_DATA = {
    'kb-arch': {
      name: '架构决策库',
      desc: 'ADR、技术选型记录、接口约定。回答技术方案类问题时优先召回。',
      docs: [
        ['ADR-001 采用 Vue CLI 5 而非 Vite.docx', 'DOCX', '48 KB', '12', 'ready', '2 小时前'],
        ['AGENTS.md 前端约束汇编.md', 'MD', '9 KB', '7', 'ready', '5 小时前'],
        ['后端接口约定 v0.md', 'MD', '14 KB', '18', 'indexing', '今天 09:12'],
        ['请求层时序图（外链）', 'URL', '—', '3', 'ready', '昨天 21:40'],
        ['风险清单 R1-R7.pdf', 'PDF', '860 KB', '26', 'failed', '昨天 18:05']
      ]
    },
    'kb-product': {
      name: '产品与需求',
      desc: 'PRD、原型说明、用户反馈。回答需求背景类问题时召回。',
      docs: [
        ['个人 AI 工作台 PRD v0.3.md', 'MD', '32 KB', '41', 'ready', '3 天前'],
        ['对话模块需求拆解.docx', 'DOCX', '120 KB', '23', 'ready', '3 天前'],
        ['知识库模块需求拆解.docx', 'DOCX', '98 KB', '19', 'pending', '1 天前'],
        ['用户反馈精选（2026-08）.pdf', 'PDF', '1.4 MB', '57', 'ready', '1 周前']
      ]
    },
    'kb-personal': {
      name: '个人笔记',
      desc: '日常纪要、读书卡片、待办复盘。仅本地向量库，不参与联网检索。',
      docs: [
        ['周复盘模板.md', 'MD', '4 KB', '5', 'ready', '今天 08:30'],
        ['2026-08 月度回顾.md', 'MD', '18 KB', '22', 'ready', '8 月 31 日'],
        ['读书笔记：思考的快慢.md', 'MD', '26 KB', '31', 'pending', '8 月 26 日']
      ]
    },
    'kb-code': {
      name: '代码片段库',
      desc: '常用脚手架、组件片段、排障命令。开启后可在对话里 @引用。',
      docs: [
        ['Vue3 组合式 API 片段.md', 'MD', '11 KB', '28', 'ready', '4 小时前'],
        ['axios 拦截器模板.ts.txt', 'TXT', '3 KB', '4', 'ready', '昨天 22:10'],
        ['Nginx 反向代理配置片段.md', 'MD', '6 KB', '9', 'indexing', '今天 10:02']
      ]
    }
  }

  var STATUS_TEXT = {
    ready: ['pill--success', '已索引'],
    indexing: ['pill--info', '索引中'],
    pending: ['pill--warning', '排队中'],
    failed: ['pill--danger', '解析失败']
  }

  function initKnowledge() {
    var moduleEl = document.querySelector('[data-module="knowledge"]')
    if (!moduleEl) return
    var list = moduleEl.querySelector('[data-role="doc-list"]')
    /* 抽屉与遮罩挂在 body 上（不在 [data-module] 内），因此事件委托要覆盖这三块 */
    var drawer = document.querySelector('[data-role="doc-drawer"]')
    var scrim = document.querySelector('[data-role="scrim"]')

    function rowHtml(doc, selected) {
      var status = STATUS_TEXT[doc[4]] || STATUS_TEXT.pending
      return '<button class="doc-row' + (selected ? ' is-selected' : '') + '" type="button" data-action="open-doc"' +
        ' data-name="' + escapeHtml(doc[0]) + '" data-type="' + doc[1] + '" data-status="' + doc[4] + '">' +
        '<span class="doc-name"><span class="file-type file-type--' + doc[1].toLowerCase() + '">' + doc[1] + '</span>' +
        '<span>' + escapeHtml(doc[0]) + '</span></span>' +
        '<span class="muted">' + doc[2] + '</span>' +
        '<span class="muted">' + doc[3] + ' 片</span>' +
        '<span><span class="pill ' + status[0] + '">' + status[1] + '</span></span>' +
        '<span class="muted">' + doc[5] + '</span>' +
        '<span class="muted">' + (doc[4] === 'ready' ? 'bge-m3' : '—') + '</span>' +
        '<span class="muted" data-action="more">' + icon('more', 'icon--sm') + '</span></button>'
    }

    function renderKb(key) {
      var kb = KB_DATA[key]
      if (!kb) return
      moduleEl.querySelector('[data-role="kb-name"]').textContent = kb.name
      moduleEl.querySelector('[data-role="kb-desc"]').textContent = kb.desc
      var ready = kb.docs.filter(function (doc) { return doc[4] === 'ready' }).length
      var chunks = kb.docs.reduce(function (sum, doc) { return sum + Number(doc[3]) }, 0)
      moduleEl.querySelector('[data-role="kb-doc-count"]').textContent = String(kb.docs.length)
      moduleEl.querySelector('[data-role="kb-chunk-count"]').textContent = String(chunks)
      moduleEl.querySelector('[data-role="kb-ready-count"]').textContent = ready + '/' + kb.docs.length
      list.innerHTML = kb.docs.map(function (doc, index) { return rowHtml(doc, index === 0) }).join('')
      mountIcons(list)
      filterDocs()
    }

    function filterDocs() {
      var keyword = (moduleEl.querySelector('[data-role="doc-search"]').value || '').trim().toLowerCase()
      var status = moduleEl.querySelector('[data-role="status-filter"]').getAttribute('data-value') || 'all'
      Array.prototype.forEach.call(list.querySelectorAll('.doc-row'), function (row) {
        var hitName = row.dataset.name.toLowerCase().indexOf(keyword) > -1
        var hitStatus = status === 'all' || row.dataset.status === status
        row.hidden = !(hitName && hitStatus)
      })
      moduleEl.querySelector('[data-role="doc-empty"]').hidden =
        !Array.prototype.some.call(list.querySelectorAll('.doc-row'), function (row) { return !row.hidden })
    }

    function openDrawer(row) {
      /* 抽屉挂在 body 上，节点要从 drawer 里取，不能用 moduleEl 查 */
      drawer.querySelector('[data-role="drawer-name"]').textContent = row.dataset.name
      var status = STATUS_TEXT[row.dataset.status] || STATUS_TEXT.pending
      var pill = drawer.querySelector('[data-role="drawer-status"]')
      pill.className = 'pill ' + status[0]
      pill.textContent = status[1]
      drawer.querySelector('[data-role="drawer-type"]').textContent = row.dataset.type + ' · 分片 512/64'
      drawer.classList.add('is-open')
      scrim.classList.add('is-open')
    }

    function closeDrawer() {
      drawer.classList.remove('is-open')
      scrim.classList.remove('is-open')
    }

    function onKnowledgeClick(event) {
      if (!event.target.closest('[data-module="knowledge"], [data-role="doc-drawer"], [data-role="scrim"]')) return
      var kbRow = event.target.closest('[data-action="open-kb"]')
      if (kbRow) {
        Array.prototype.forEach.call(moduleEl.querySelectorAll('[data-action="open-kb"]'), function (item) {
          item.classList.toggle('is-active', item === kbRow)
        })
        renderKb(kbRow.dataset.kb)
        return
      }
      if (event.target.closest('[data-action="more"]')) {
        toast('更多操作菜单（原型未实现）：重命名 / 移动 / 导出 / 删除')
        return
      }
      var docRow = event.target.closest('[data-action="open-doc"]')
      if (docRow) {
        Array.prototype.forEach.call(list.querySelectorAll('.doc-row'), function (item) {
          item.classList.toggle('is-selected', item === docRow)
        })
        openDrawer(docRow)
        return
      }
      if (event.target.closest('[data-action="close-drawer"]') || event.target.closest('[data-role="scrim"]')) {
        closeDrawer()
        return
      }
      var tab = event.target.closest('[data-role="status-tab"]')
      if (tab) {
        tab.parentNode.querySelectorAll('[data-role="status-tab"]').forEach(function (item) {
          item.setAttribute('aria-selected', String(item === tab))
        })
        moduleEl.querySelector('[data-role="status-filter"]').setAttribute('data-value', tab.dataset.value)
        filterDocs()
        return
      }
      if (event.target.closest('[data-action="reindex"]')) {
        var selected = list.querySelector('.doc-row.is-selected')
        toast('已提交重建索引任务：' + (selected ? selected.dataset.name : '当前知识库'))
        return
      }
      if (event.target.closest('[data-action="recall"]')) {
        runRecall()
        return
      }
      if (event.target.closest('[data-action="upload"]') || event.target.closest('[data-role="dropzone"]')) {
        simulateUpload('新上传文档-' + Date.now().toString().slice(-4) + '.md')
        return
      }
      if (event.target.closest('[data-action="new-kb"]')) {
        toast('原型未实现新建表单，落地时走 Dialog + POST /api/kb')
        return
      }
      if (event.target.closest('[data-action="preview"]')) {
        toast('原型未内嵌原文预览，落地时走 iframe 或文档查看组件')
        return
      }
      if (event.target.closest('[data-action="delete-doc"]')) {
        var target = list.querySelector('.doc-row.is-selected')
        if (target) {
          toast('已标记删除：' + target.dataset.name + '（原型不真正移除行）')
        }
        return
      }
      if (event.target.closest('[data-action="toggle"]')) {
        applyToggle(event.target.closest('[data-action="toggle"]'))
      }
    }
    document.addEventListener('click', onKnowledgeClick)

    function runRecall() {
      var query = moduleEl.querySelector('[data-role="recall-input"]').value.trim() || '对话模块的流式响应怎么做？'
      var box = moduleEl.querySelector('[data-role="recall-results"]')
      var hits = [
        { score: 0.92, doc: 'ADR-001 采用 Vue CLI 5 而非 Vite', chunk: '第 4 / 12 片', text: '对话接口统一走 <mark>SSE 流式</mark>，前端用 fetch + ReadableStream 解析增量，超时上限沿用 15s。' },
        { score: 0.81, doc: '后端接口约定 v0', chunk: '第 2 / 18 片', text: '<mark>/chat/completions</mark> 返回 delta 数组，末包携带 usage 与 citations，用于渲染引用来源。' },
        { score: 0.63, doc: 'AGENTS.md 前端约束汇编', chunk: '第 1 / 7 片', text: '组件不得直接 import axios，只经 <mark>src/api/http.js</mark>；流式逻辑下沉到 composables/useChatStream.js。' }
      ]
      box.innerHTML =
        '<p class="text-xs muted">检索语句：<span class="inline-code">' + escapeHtml(query) +
        '</span> · 向量模型 bge-m3 · Top-K 3 · 阈值 0.55 · 耗时 118ms</p>' +
        hits.map(function (hit) {
          return '<div class="recall__hit"><header><b>' + escapeHtml(hit.doc) + '</b>' +
            '<span class="chip">' + hit.chunk + '</span>' +
            '<span class="recall__score">' + hit.score.toFixed(2) + '</span></header>' +
            '<div class="meter"><div class="meter__fill" style="width:' + Math.round(hit.score * 100) + '%"></div></div>' +
            '<p>' + hit.text + '</p></div>'
        }).join('')
      toast('已召回 ' + hits.length + ' 个分片（模拟结果）')
    }

    /* 上传 → 解析 → 分片 → 向量化的队列演示 */
    function simulateUpload(fileName) {
      var queue = moduleEl.querySelector('[data-role="upload-queue"]')
      var item = document.createElement('div')
      item.className = 'uploader__item'
      item.innerHTML = '<span class="file-type">NEW</span><div class="row__main">' +
        '<span class="row__title"></span><div class="meter" style="margin-top:6px">' +
        '<div class="meter__fill meter__fill--info" style="width:4%"></div></div></div>' +
        '<span class="pill pill--info">上传中</span>'
      item.querySelector('.row__title').textContent = fileName
      queue.appendChild(item)
      var fill = item.querySelector('.meter__fill')
      var pill = item.querySelector('.pill')
      var stages = [['32%', '解析中', 'pill--info'], ['68%', '分片中', 'pill--info'], ['92%', '向量化', 'pill--warning'], ['100%', '已索引', 'pill--success']]
      var step = 0
      function next() {
        if (step >= stages.length) {
          list.insertAdjacentHTML('afterbegin', rowHtml([fileName, 'MD', '12 KB', '16', 'ready', '刚刚'], false))
          mountIcons(list)
          queue.removeChild(item)
          filterDocs()
          toast(fileName + ' 已完成索引，可被对话引用')
          return
        }
        fill.style.width = stages[step][0]
        pill.className = 'pill ' + stages[step][2]
        pill.textContent = stages[step][1]
        step += 1
        chatTimers.push(window.setTimeout(next, 800))
      }
      chatTimers.push(window.setTimeout(next, 600))
    }

    var dropzone = moduleEl.querySelector('[data-role="dropzone"]')
    dropzone.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        simulateUpload('键盘上传.md')
      }
    })
    ;['dragover', 'dragenter'].forEach(function (name) {
      dropzone.addEventListener(name, function (event) {
        event.preventDefault()
        dropzone.classList.add('is-over')
      })
    })
    ;['dragleave', 'drop'].forEach(function (name) {
      dropzone.addEventListener(name, function (event) {
        event.preventDefault()
        dropzone.classList.remove('is-over')
        if (name === 'drop') simulateUpload('拖拽文件.md')
      })
    })

    moduleEl.querySelector('[data-role="doc-search"]').addEventListener('input', filterDocs)
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeDrawer()
    })

    /* 默认知识库的表格行直接写在 knowledge.html 里（无 JS 也能看懂结构）；
       切换知识库时才用 KB_DATA 重新渲染，两份数据需保持一致。 */
  }

  /* ==========================================================================
   * 总览页
   * ========================================================================== */
  function initOverview() {
    var askbox = document.querySelector('[data-role="askbox"]')
    if (!askbox) return
    var input = askbox.querySelector('textarea')
    askbox.addEventListener('submit', function (event) {
      event.preventDefault()
      var text = input.value.trim()
      if (!text) return
      goChatWithPrompt(text)
    })
    input.addEventListener('input', function () {
      textareaGrow(input, 160)
    })
    Array.prototype.forEach.call(document.querySelectorAll('[data-action="fill-prompt"]'), function (button) {
      button.addEventListener('click', function () {
        goChatWithPrompt(button.dataset.prompt)
      })
    })
  }

  /* 便于导出示例图与自检：
     ?state=drawer  打开知识库分片抽屉
     ?state=empty   展示对话新会话空状态
     ?state=latest  消息流滚到最后一条（含「已停止」「失败」两种状态样例） */
  function initDemoState() {
    var state = new URLSearchParams(window.location.search).get('state')
    if (!state) return
    var moduleEl = document.querySelector('[data-module]')
    if (!moduleEl) return
    if (state === 'drawer' && moduleEl.dataset.module === 'knowledge') {
      var row = moduleEl.querySelector('.doc-row')
      if (row) row.click()
    }
    if (state === 'empty' && moduleEl.dataset.module === 'chat') {
      var newChat = moduleEl.querySelector('[data-action="new-chat"]')
      if (newChat) newChat.click()
    }
    if (state === 'latest' && moduleEl.dataset.module === 'chat') {
      var scroller = moduleEl.querySelector('[data-role="thread-scroll"]')
      if (scroller) {
        scroller.style.scrollBehavior = 'auto'
        scroller.scrollTop = scroller.scrollHeight
      }
    }
  }

  /* ---------------- 启动 ---------------- */
  function boot() {
    mountIcons(document)
    initTheme()
    initShell()
    initOverview()
    initChat()
    initKnowledge()
    initDemoState()
    document.body.dataset.ready = '1'
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }

  window.WS = { toast: toast, icon: icon, escapeHtml: escapeHtml }
})()
