<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import BackendContractCard from '@/components/business/BackendContractCard.vue'
import AppIcon from '@/components/base/AppIcon.vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { IS_MOCK_AUTH } from '@/api/auth'
import { useBackendHealth } from '@/composables/useBackendHealth'
import { APP_VERSION } from '@/constants/app'
import { BACKEND_API_ENTRIES, contractStatusOf } from '@/constants/backendApi'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeStore } from '@/stores/knowledge'
import type { IconName } from '@/constants/icons'

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
const {
  state: healthState,
  outcome: healthOutcome,
  outcomeLabel: healthLabel,
  outcomeClass: healthClass,
  reason: healthReason,
  healthPath,
  isChecking,
  probe
} = useBackendHealth()

const draft = shallowRef('')

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

// 首页不再放无来源的数字：接口进度取登记表，其余计数只在真有数据时才亮出来
const pendingApis = computed<number>(() =>
  BACKEND_API_ENTRIES.filter((entry) => {
    const status = contractStatusOf(entry)
    return status === 'await-backend' || status === 'await-frontend'
  }).length
)
const connectedApis = computed<number>(
  () => BACKEND_API_ENTRIES.filter((entry) => contractStatusOf(entry) === 'connected').length
)
const blockedApis = computed<number>(
  () => BACKEND_API_ENTRIES.filter((entry) => contractStatusOf(entry) === 'blocked').length
)

/**
 * 关掉假数据后列表为空，通常是接口没通而不是真的没有数据。
 * 把 store 记录的失败原因（404 已点名端点）显示出来，页面上就能直接看出缺哪个接口。
 */
const chatNotice = computed<string>(() =>
  chatStore.sessions.length > 0 || chatStore.loadingSessions ? '' : chatStore.listError
)
const kbNotice = computed<string>(() =>
  knowledgeStore.libraries.length > 0 || knowledgeStore.loadingLibraries ? '' : knowledgeStore.listError
)

const summaryLine = computed<string>(() => {
  const parts = [
    `v${APP_VERSION}`,
    `后端接口 ${connectedApis.value} / ${BACKEND_API_ENTRIES.length} 可用` +
      (blockedApis.value > 0 ? `（另 ${blockedApis.value} 项后端有缺陷）` : '') +
      `，${pendingApis.value} 项待对接`,
    `登录：${IS_MOCK_AUTH ? '演示模式（admin / admin）' : '真实后端'}`
  ]
  if (knowledgeStore.libraries.length > 0) {
    parts.push(
      `${knowledgeStore.libraries.length} 个知识库 / ${documentTotal.value} 篇文档 / ${chunkTotal.value} 个分片`
    )
  }
  return parts.join(' · ')
})

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
        <textarea id="ask" v-model="draft" rows="1" placeholder="输入问题，Enter 开始新会话（后端只接收这段文本）" />
        <div class="askbox__row">
          <span class="text-xs muted">知识库检索、深度思考与联网均未对接</span>
          <span class="topbar__spacer" />
          <span class="text-xs muted">Enter 开始新会话</span>
          <button class="send-btn" type="submit" title="发送" aria-label="发送"><AppIcon name="send" size="sm" /></button>
        </div>
      </form>
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
          <p v-if="recentSessions.length === 0" class="muted text-sm">{{ chatNotice || '加载中…' }}</p>
        </div>
      </article>

      <article class="card">
        <div class="card__head">
          <h3>知识库健康度</h3>
          <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'knowledge' }">进入知识库</RouterLink>
        </div>
        <div class="stack">
          <p v-if="kbNotice" class="card__detail">{{ kbNotice }}</p>
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
          </dl>
          <p class="card__hint">失败文档需在知识库页重新解析；「对话」引用它们时会降级为无来源回答。</p>
        </div>
      </article>

      <article class="card">
        <div class="card__head">
          <h3>后端连通性</h3>
          <StatusPill :state="healthState" />
        </div>
        <p class="card__meta">目标地址：{{ healthPath }}</p>
        <div class="cluster">
          <button class="btn btn--primary" type="button" :disabled="isChecking" @click="probe">
            {{ isChecking ? '检测中…' : '发起检测' }}
          </button>
          <span v-if="healthLabel" class="pill" :class="healthClass">{{ healthLabel }}</span>
        </div>
        <p v-if="healthReason" class="health__reason">{{ healthReason }}</p>
        <p v-else-if="healthOutcome === null" class="health__note">尚未发起检测</p>
      </article>
    </section>

    <section aria-label="后端接口对接进度">
      <BackendContractCard :entries="BACKEND_API_ENTRIES" />
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

.kv__danger {
  color: var(--color-danger);
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

/* 后端连通性卡片：正常不回显响应原文，只在异常时给出后端 message。两个类都只有这一处用 */
.health__reason,
.health__note {
  margin: var(--space-2) 0 0;
  font-size: var(--font-sm);
  line-height: 1.5;
  word-break: break-word;
}

.health__reason {
  color: var(--color-danger);
}

.health__note {
  color: var(--color-muted);
}
</style>
