<script setup lang="ts">
import { computed, onMounted, reactive, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/base/AppIcon.vue'
import InlineText from '@/components/base/InlineText.vue'
import StatCard from '@/components/base/StatCard.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { useBackendHealth } from '@/composables/useBackendHealth'
import { APP_VERSION } from '@/constants/app'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { IconName } from '@/constants/icons'

interface QuickPrompt {
  label: string
  prompt: string
}

interface ChecklistItem {
  id: string
  title: string
  meta: string
  done: boolean
}

interface ModuleEntry {
  routeName: string
  icon: IconName
  title: string
  note: string
}

const router = useRouter()
const authStore = useAuthStore()
const chatStore = useChatStore()
const knowledgeStore = useKnowledgeStore()
const { state: healthState, detail: healthDetail, healthPath, isChecking, probe } = useBackendHealth()

const draft = shallowRef('')
const useKb = shallowRef(true)
const deepThink = shallowRef(false)
const webSearch = shallowRef(false)

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: '生成检查清单', prompt: '帮我把 AGENTS.md 的约束整理成一页检查清单' },
  { label: '本周知识摘要', prompt: '总结本周知识库新增的文档，按主题聚类' },
  { label: '接口设计咨询', prompt: '对话模块的流式响应接口应该怎么设计？' }
]

// 勾选框需要逐项就地改写，因此用 reactive 数组（小列表，不涉及深拷贝开销）
const CHECKLIST = reactive<ChecklistItem[]>([
  { id: 'c1', title: '确认对话页三栏布局断点', meta: '前端 · 今天 18:00', done: true },
  { id: 'c2', title: '补全 VUE_APP_* 环境变量表', meta: '文档 · 已完成', done: true },
  { id: 'c3', title: '输出知识库原型稿', meta: 'demo/ 三个页面', done: true },
  { id: 'c4', title: '定义聊天消息数据契约', meta: 'src/types/chat.ts 已落地，待后端确认', done: true },
  { id: 'c5', title: '接入健康检查真实接口', meta: '等待后端 /api/health', done: false },
  { id: 'c6', title: '评估 vitest 基线用例', meta: '未开始', done: false }
])

const MODULE_ENTRIES: Array<ModuleEntry & { note: string }> = [
  { routeName: 'home', icon: 'grid', title: '工作台总览', note: '问候语、统一提问入口、今日指标、跨模块跳转。对应 views/HomeView.vue。' },
  { routeName: 'chat', icon: 'chat', title: '对话模块', note: '会话列表 / 消息流（流式、思考、代码块、引用来源）/ 参数面板 / 输入区，支持三栏↔两栏↔单栏。' },
  { routeName: 'knowledge', icon: 'book', title: '知识库模块', note: '知识库切换、文档表格与索引状态、上传队列、分片详情抽屉、召回测试面板。' }
]

const greeting = computed<string>(() => {
  const hour = new Date().getHours()
  if (hour < 6) {
    return '夜深了'
  }
  if (hour < 12) {
    return '早上好'
  }
  if (hour < 18) {
    return '下午好'
  }
  return '晚上好'
})

const userName = computed<string>(() => authStore.currentUser?.displayName ?? '朋友')

const documentTotal = computed<number>(() => knowledgeStore.libraries.reduce((sum, kb) => sum + kb.documentCount, 0))
const chunkTotal = computed<number>(() => knowledgeStore.libraries.reduce((sum, kb) => sum + kb.chunkCount, 0))
const indexedTotal = computed<number>(() =>
  knowledgeStore.libraries.reduce((sum, kb) => sum + (knowledgeStore.documentsByKb[kb.id] ?? []).filter((doc) => doc.status === 'ready').length, 0)
)
const indexedLabel = computed<string>(() => `${indexedTotal.value} / ${documentTotal.value}`)
const indexPercent = computed<number>(() =>
  documentTotal.value === 0 ? 0 : Math.round((indexedTotal.value / documentTotal.value) * 100)
)
const failedTotal = computed<number>(() =>
  knowledgeStore.libraries.reduce(
    (sum, kb) => sum + (knowledgeStore.documentsByKb[kb.id] ?? []).filter((doc) => doc.status === 'failed').length,
    0
  )
)
const recentSessions = computed(() => chatStore.sessions.slice(0, 4))
const checklistDone = computed<number>(() => CHECKLIST.filter((item) => item.done).length)
const summaryLine = computed<string>(
  () =>
    `本地模型 WS-14B 已加载 · ${knowledgeStore.libraries.length} 个知识库 / ${documentTotal.value} 篇文档 / ${chunkTotal.value} 个分片（${indexedTotal.value} 篇已完成索引） · 当前版本 v${APP_VERSION}`
)

onMounted(async () => {
  await Promise.all([chatStore.loadSessions(), knowledgeStore.load()])
})

function ask(): void {
  const question = draft.value.trim()
  if (!question) {
    return
  }
  void router.push({ name: 'chat', query: { q: question } })
}

function fillPrompt(prompt: string): void {
  draft.value = prompt
}

function toggleChecklist(item: ChecklistItem): void {
  item.done = !item.done
}

function goModule(routeName: string): void {
  void router.push({ name: routeName })
}
</script>

<template>
  <div class="ov">
    <section class="ov__hero">
      <h2>{{ greeting }}，{{ userName }}</h2>
      <p>{{ summaryLine }}</p>
      <form class="askbox" @submit.prevent="ask">
        <label class="field__label" for="ask">向工作台提问</label>
        <textarea id="ask" v-model="draft" rows="1" placeholder="例如：把这周的知识库新增文档整理成摘要，并给出下一步计划" />
        <div class="askbox__row">
          <div class="cluster">
            <button class="tool-toggle" type="button" :aria-pressed="useKb ? 'true' : 'false'" @click="useKb = !useKb">
              <AppIcon name="book" size="sm" />知识库
            </button>
            <button class="tool-toggle" type="button" :aria-pressed="deepThink ? 'true' : 'false'" @click="deepThink = !deepThink">
              <AppIcon name="flask" size="sm" />深度思考
            </button>
            <button class="tool-toggle" type="button" :aria-pressed="webSearch ? 'true' : 'false'" @click="webSearch = !webSearch">
              <AppIcon name="link" size="sm" />联网
            </button>
          </div>
          <span class="topbar__spacer" />
          <span class="text-xs muted">Enter 开始新会话</span>
          <button class="send-btn" type="submit" title="发送" aria-label="发送"><AppIcon name="send" size="sm" /></button>
        </div>
      </form>
      <div class="cluster ov__quick">
        <span class="text-xs muted">快捷入口</span>
        <button
          v-for="item in QUICK_PROMPTS"
          :key="item.label"
          class="chip chip--clickable"
          type="button"
          @click="fillPrompt(item.prompt)"
        >
          {{ item.label }}
        </button>
      </div>
    </section>

    <section class="ov__grid" aria-label="今日概览">
      <StatCard label="今日对话" :value="String(chatStore.sessions.length)" delta="+12%" :points="[28, 24, 26, 18, 20, 12, 15, 8, 10]" />
      <StatCard label="知识库文档" :value="String(documentTotal)" delta="+2" :points="[30, 28, 22, 20, 12, 14]" />
      <StatCard label="平均首字延迟" value="860" unit="ms" delta="-8%" :points="[10, 14, 12, 20, 24, 26]" />
      <StatCard label="今日 token" value="1.24" unit="M" delta="+31%" delta-tone="down" :points="[26, 24, 26, 16, 18, 6]" />
    </section>

    <section class="ov__grid" aria-label="工作区">
      <article class="card">
        <div class="card__head">
          <h3>最近会话</h3>
          <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'chat' }">进入对话</RouterLink>
        </div>
        <div class="stack stack--tight">
          <RouterLink v-for="session in recentSessions" :key="session.id" class="row" :to="{ name: 'chat' }">
            <AppIcon name="chat" size="sm" />
            <span class="row__main">
              <span class="row__title">{{ session.title }}</span>
              <span class="row__meta">{{ session.summary }} · {{ session.timeLabel }}</span>
            </span>
            <span v-if="session.id === chatStore.activeSessionId" class="pill pill--success">活跃</span>
          </RouterLink>
          <p v-if="recentSessions.length === 0" class="muted text-sm">加载会话中…</p>
        </div>
      </article>

      <article class="card">
        <div class="card__head">
          <h3>知识库健康度</h3>
          <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'knowledge' }">进入知识库</RouterLink>
        </div>
        <div class="stack">
          <div>
            <div class="cluster cluster--between">
              <span class="text-sm">索引完成率</span>
              <span class="text-sm muted">{{ indexedLabel }}</span>
            </div>
            <div class="meter"><div class="meter__fill" :style="{ width: indexPercent + '%' }" /></div>
          </div>
          <dl class="kv">
            <dt>知识库</dt><dd>{{ knowledgeStore.libraries.length }} 个</dd>
            <dt>解析失败</dt><dd class="kv__danger">{{ failedTotal }} 篇</dd>
            <dt>向量模型</dt><dd>bge-m3</dd>
          </dl>
          <p class="card__hint">失败文档需在知识库页重新解析；「对话」引用它们时会降级为无来源回答。</p>
        </div>
      </article>

      <article class="card">
        <div class="card__head">
          <h3>今日待办</h3>
          <span class="pill pill--no-dot">{{ checklistDone }} / {{ CHECKLIST.length }}</span>
        </div>
        <ul class="mini-list checklist">
          <li v-for="item in CHECKLIST" :key="item.id">
            <button class="tick" :class="{ 'is-done': item.done }" type="button" :aria-pressed="item.done ? 'true' : 'false'" :aria-label="`标记${item.title}`" @click="toggleChecklist(item)">
              <AppIcon name="check" size="sm" />
            </button>
            <span class="row__main">
              <span class="row__title">{{ item.title }}</span>
              <span class="row__meta">{{ item.meta }}</span>
            </span>
          </li>
        </ul>
      </article>

      <article class="card">
        <div class="card__head">
          <h3>后端连通性</h3>
          <StatusPill :state="healthState" />
        </div>
        <p class="card__detail"><InlineText :text="healthDetail" /></p>
        <p class="card__meta">目标地址：{{ healthPath }}</p>
        <button class="btn btn--primary" type="button" :disabled="isChecking" @click="probe">
          {{ isChecking ? '检测中…' : '发起检测' }}
        </button>
        <p class="card__hint">后端 personal-workspace-app 尚未实现接口时，返回 <code>ECONNREFUSED</code> 属预期结果。</p>
      </article>
    </section>

    <div class="section-title">
      <h2>模块入口</h2>
      <span class="text-xs muted">三个视图共用同一外壳，可任意顺序浏览</span>
    </div>
    <div class="sitemap">
      <button
        v-for="entry in MODULE_ENTRIES"
        :key="entry.routeName"
        class="sitemap__item"
        type="button"
        @click="goModule(entry.routeName)"
      >
        <h3><AppIcon :name="entry.icon" />{{ entry.title }}</h3>
        <p>{{ entry.note }}</p>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 原型用内联 style 收紧间距，这里换成类名，避免在模板里写样式 */
.stack--tight {
  gap: var(--space-1);
}

.cluster--between {
  justify-content: space-between;
}

.ov__quick {
  margin-top: var(--space-3);
}

.kv__danger {
  color: var(--color-danger);
}

.tick {
  border: none;
  background: transparent;
  padding: 0;
}

.sitemap__item {
  text-align: left;
}

.card__detail {
  min-height: 40px;
  margin: 0 0 var(--space-2);
  font-size: var(--font-sm);
}

.card__meta {
  margin: 0 0 var(--space-3);
  color: var(--color-muted);
  font-size: var(--font-xs);
}
</style>
