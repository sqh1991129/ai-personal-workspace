<script setup lang="ts">
import { computed } from 'vue'
import LoginForm from '@/components/business/LoginForm.vue'
import ThemeToggle from '@/components/business/ThemeToggle.vue'
import { IS_MOCK_AUTH } from '@/api/auth'
import { DEFAULT_REDIRECT_PATH, MOCK_CREDENTIALS } from '@/constants/auth'
import { useLogin } from '@/composables/useLogin'
import type { LoginPayload } from '@/types/auth'

interface Highlight {
  icon: 'chat' | 'book' | 'task'
  title: string
  note: string
}

const appTitle: string = process.env.VUE_APP_TITLE || '个人 AI 工作台'

const highlights: Highlight[] = [
  { icon: 'chat', title: '对话', note: '会话列表、流式回答与引用来源' },
  { icon: 'book', title: '知识库', note: '文档索引、分片详情与召回测试' },
  { icon: 'task', title: '任务自动化', note: '定时任务与主动跟进（规划中）' }
]

const { isPending, errorMessage, redirectTarget, submit } = useLogin()

const mockUsername = computed<string>(() => (IS_MOCK_AUTH ? MOCK_CREDENTIALS.username : ''))
const mockPassword = computed<string>(() => (IS_MOCK_AUTH ? MOCK_CREDENTIALS.password : ''))
const isReturning = computed<boolean>(() => redirectTarget.value !== DEFAULT_REDIRECT_PATH)

function onFormSubmit(payload: LoginPayload): void {
  void submit(payload)
}
</script>

<template>
  <section class="login">
    <aside class="login__intro">
      <header class="login__brand">
        <span class="login__mark">WS</span>
        <span>{{ appTitle }}</span>
      </header>
      <h1 class="login__slogan">把日常对话、资料检索和重复劳动，收进同一个工作台。</h1>
      <p class="login__desc">本地部署的个人 AI 工作台，数据与偏好只保存在你自己的浏览器和服务器上。</p>
      <ul class="login__highlights">
        <li v-for="item in highlights" :key="item.icon">
          <span class="login__highlight-icon" aria-hidden="true">
            <span class="icon">
              <svg v-if="item.icon === 'chat'" viewBox="0 0 24 24">
                <path d="M20 15a2 2 0 0 1-2 2H8l-4 3V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z" />
                <path d="M8 9h8M8 12.5h5" />
              </svg>
              <svg v-else-if="item.icon === 'book'" viewBox="0 0 24 24">
                <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
                <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5A1.5 1.5 0 0 0 20 18.5z" />
              </svg>
              <svg v-else viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
                <path d="M8 10l2.5 2.5L16 7" />
                <path d="M8 16h8" />
              </svg>
            </span>
          </span>
          <span class="login__highlight-text">
            <strong>{{ item.title }}</strong>
            <small>{{ item.note }}</small>
          </span>
        </li>
      </ul>
    </aside>

    <div class="login__stage">
      <div class="login__stage-head">
        <span class="login__stage-label">未登录</span>
        <ThemeToggle />
      </div>

      <div class="login__card">
        <h2 class="login__card-title">登录工作台</h2>
        <p class="login__card-desc">
          <template v-if="isReturning">登录后返回 <code>{{ redirectTarget }}</code></template>
          <template v-else>请输入账号密码继续访问工作台。</template>
        </p>
        <LoginForm
          :pending="isPending"
          :error-message="errorMessage"
          :mock-username="mockUsername"
          :mock-password="mockPassword"
          @submit="onFormSubmit"
        />
      </div>

      <p class="login__foot">
        登录态仅保存在本浏览器；后端接口就绪后把 <code>VUE_APP_MOCK_AUTH</code> 置为 <code>false</code> 即走真实鉴权。
      </p>
    </div>
  </section>
</template>

<style scoped>
.login {
  display: grid;
  grid-template-columns: 1.05fr minmax(360px, 460px);
  gap: var(--space-5);
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: var(--space-5) var(--space-4);
}

.login__intro {
  display: grid;
  gap: var(--space-3);
  max-width: 520px;
  justify-self: end;
}

.login__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-weight: 600;
}

.login__mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: 12px;
  letter-spacing: 0.02em;
}

.login__slogan {
  margin: 0;
  font-size: var(--font-2xl);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.35;
}

.login__desc {
  margin: 0;
  color: var(--color-muted);
}

.login__highlights {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.login__highlights li {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.login__highlight-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: var(--color-accent-soft);
  color: var(--color-accent);
}

.login__highlight-text {
  display: grid;
  gap: 2px;
}

.login__highlight-text strong {
  font-size: var(--font-sm);
}

.login__highlight-text small {
  color: var(--color-muted);
  font-size: var(--font-xs);
}

.login__stage {
  display: grid;
  gap: var(--space-3);
}

.login__stage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login__stage-label {
  padding: 2px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: var(--font-xs);
}

.login__card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-lg);
}

.login__card-title {
  margin: 0;
  font-size: var(--font-xl);
  font-weight: 600;
}

.login__card-desc {
  margin: 0 0 var(--space-2);
  color: var(--color-muted);
  font-size: var(--font-sm);
}

.login__card-desc code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

.login__foot {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-xs);
  text-align: center;
}

.login__foot code {
  padding: 1px 4px;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

@media (max-width: 900px) {
  .login {
    grid-template-columns: minmax(0, 460px);
    justify-items: center;
    padding: var(--space-4) var(--space-3) var(--space-5);
  }

  .login__intro {
    justify-self: stretch;
    max-width: 460px;
  }

  .login__stage {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .login *,
  .login *::before,
  .login *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
