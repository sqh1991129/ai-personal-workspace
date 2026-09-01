<script setup>
import { onBeforeUnmount, ref } from 'vue'
import StatusPill from '@/components/base/StatusPill.vue'
import { API_BASE_URL } from '@/api/http'
import { checkHealth } from '@/api/workspace'

const healthPath = `${API_BASE_URL}/health`

const capabilities = [
  { name: 'vue-router', note: '路由表 src/router/index.js，视图按懒加载拆分' },
  { name: 'pinia', note: '跨视图 UI 状态 src/stores/app.js（主题、侧栏）' },
  { name: 'axios', note: '统一实例 src/api/http.js，含超时与错误归一化' },
  { name: '环境变量', note: '.env.development / .env.production 提供 VUE_APP_*' },
  { name: '开发代理', note: `devServer 把 ${API_BASE_URL}/* 转发到本机后端` }
]

const healthState = ref('idle')
const healthDetail = ref('尚未发起检测')
let controller = null

function preview(payload) {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return text && text.length > 160 ? `${text.slice(0, 160)}…` : text || '空响应'
}

async function probeBackend() {
  if (controller) {
    controller.abort()
  }
  controller = new AbortController()
  healthState.value = 'checking'
  healthDetail.value = `正在请求 ${healthPath} …`
  try {
    const data = await checkHealth({ signal: controller.signal })
    healthState.value = 'online'
    healthDetail.value = `后端已响应：${preview(data)}`
  } catch (error) {
    if (error.code === 'CANCELED') {
      healthState.value = 'idle'
      healthDetail.value = '上一次检测已取消'
    } else if (error.code === 'HTTP_ERROR') {
      healthState.value = 'offline'
      healthDetail.value = `后端可达但接口未就绪：${error.message}`
    } else {
      healthState.value = 'offline'
      healthDetail.value = error.message
    }
  } finally {
    controller = null
  }
}

onBeforeUnmount(() => {
  if (controller) {
    controller.abort()
  }
})
</script>

<template>
  <section class="home">
    <header class="home__hero">
      <h1>个人 AI 工作台</h1>
      <p>前端基建（路由 / 状态 / 请求层 / 环境配置 / 代理）已就绪，可以开始按任务开发业务功能。</p>
    </header>

    <div class="home__grid">
      <article class="card">
        <h2>已接入基建</h2>
        <ul class="capability-list">
          <li v-for="item in capabilities" :key="item.name">
            <strong>{{ item.name }}</strong>
            <span>{{ item.note }}</span>
          </li>
        </ul>
      </article>

      <article class="card">
        <h2>
          后端连通性
          <StatusPill :state="healthState" />
        </h2>
        <p class="card__detail">{{ healthDetail }}</p>
        <p class="card__meta">目标地址：{{ healthPath }}</p>
        <button type="button" class="card__action" :disabled="healthState === 'checking'" @click="probeBackend">
          {{ healthState === 'checking' ? '检测中…' : '发起检测' }}
        </button>
        <p class="card__hint">
          后端 personal-workspace-app 尚未实现接口时，检测失败属预期结果。
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.home {
  max-width: 960px;
  margin: 0 auto;
}

.home__hero h1 {
  margin: 0 0 var(--space-2);
  font-size: 26px;
}

.home__hero p {
  margin: 0 0 var(--space-4);
  color: var(--color-muted);
}

.home__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--space-3);
}

.card {
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.card h2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
  font-size: 16px;
}

.capability-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--space-2);
}

.capability-list li {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 13px;
}

.capability-list strong {
  flex: none;
  width: 88px;
}

.capability-list span {
  color: var(--color-muted);
}

.card__detail {
  min-height: 40px;
  margin: 0 0 var(--space-2);
  font-size: 13px;
  line-height: 1.6;
}

.card__meta {
  margin: 0 0 var(--space-3);
  font-size: 12px;
  color: var(--color-muted);
}

.card__action {
  padding: 8px 18px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: #ffffff;
}

.card__action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.card__hint {
  margin: var(--space-3) 0 0;
  font-size: 12px;
  color: var(--color-muted);
}
</style>
