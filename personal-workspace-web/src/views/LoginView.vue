<script setup lang="ts">
import { computed } from 'vue'
import LoginHero from '@/components/business/LoginHero.vue'
import LoginForm from '@/components/business/LoginForm.vue'
import ThemeToggle from '@/components/business/ThemeToggle.vue'
import { IS_MOCK_AUTH, USER_LOGIN_PATH } from '@/api/auth'
import { API_BASE_URL } from '@/api/http'
import { DEFAULT_REDIRECT_PATH, MOCK_CREDENTIALS } from '@/constants/auth'
import { useLogin } from '@/composables/useLogin'
import type { LoginPayload } from '@/types/auth'

const appTitle: string = process.env.VUE_APP_TITLE || '个人 AI 工作台'

/** 页脚把真实端点写出来，便于确认当前确实走的是后端而不是本地假数据 */
const loginEndpoint: string = `${API_BASE_URL}${USER_LOGIN_PATH}`

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
      <LoginHero />
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
        <template v-if="IS_MOCK_AUTH">
          登录态仅保存在本浏览器；演示模式下把 <code>VUE_APP_MOCK_AUTH</code> 置为 <code>false</code> 即走真实鉴权。
        </template>
        <template v-else>
          登录请求发往 <code>{{ loginEndpoint }}</code>；登录态仅保存在本浏览器。
        </template>
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
  gap: var(--space-4);
  align-content: center;
  max-width: 620px;
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
    max-width: 520px;
  }

  .login__brand {
    justify-content: center;
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
