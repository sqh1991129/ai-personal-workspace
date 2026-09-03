<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import TextField from '@/components/base/TextField.vue'
import type { LoginPayload } from '@/types/auth'

interface Props {
  pending?: boolean
  /** 服务端返回的失败原因（用户名密码错误、网络不可达等） */
  errorMessage?: string
  /** 非空时展示「填入演示账号」提示，仅 mock 模式使用 */
  mockUsername?: string
  mockPassword?: string
}

const props = withDefaults(defineProps<Props>(), {
  pending: false,
  errorMessage: '',
  mockUsername: '',
  mockPassword: ''
})

const emit = defineEmits<{ submit: [payload: LoginPayload] }>()

// 表单是典型的「单状态对象」，用 reactive 就地改字段，派生值全部走 computed
const form = reactive({ username: '', password: '', remember: true })
const submitted = shallowRef(false)

const hasMockHint = computed<boolean>(() => !!props.mockUsername && !!props.mockPassword)
const usernameError = computed<string>(() => (submitted.value && !form.username.trim() ? '请输入用户名' : ''))
const passwordError = computed<string>(() => (submitted.value && !form.password ? '请输入密码' : ''))
const canSubmit = computed<boolean>(() => !!form.username.trim() && !!form.password && !props.pending)
const submitText = computed<string>(() => (props.pending ? '登录中…' : '登录'))

function onSubmit(): void {
  submitted.value = true
  if (!canSubmit.value) {
    return
  }
  emit('submit', {
    username: form.username.trim(),
    password: form.password,
    remember: form.remember
  })
}

function fillMockCredentials(): void {
  form.username = props.mockUsername
  form.password = props.mockPassword
}
</script>

<template>
  <form class="login-form" novalidate @submit.prevent="onSubmit">
    <TextField
      v-model="form.username"
      name="username"
      label="用户名"
      autocomplete="username"
      placeholder="admin"
      autofocus
      required
      :disabled="pending"
      :error-message="usernameError"
    />
    <TextField
      v-model="form.password"
      name="password"
      label="密码"
      type="password"
      autocomplete="current-password"
      placeholder="请输入密码"
      required
      :disabled="pending"
      :error-message="passwordError"
    />

    <div class="login-form__options">
      <label class="login-form__remember">
        <input v-model="form.remember" type="checkbox" :disabled="pending" />
        <span>记住我</span>
      </label>
      <span class="login-form__note">未勾选时会话只保存在内存中</span>
    </div>

    <p v-if="errorMessage" class="login-form__error" role="alert">{{ errorMessage }}</p>

    <button type="submit" class="login-form__submit" :disabled="!canSubmit" :aria-busy="pending ? 'true' : undefined">
      {{ submitText }}
    </button>

    <p v-if="hasMockHint" class="login-form__mock">
      <span class="pill pill--info">演示模式</span>
      账号 <code>{{ mockUsername }}</code> / 密码 <code>{{ mockPassword }}</code>
      <button type="button" class="login-form__fill" @click="fillMockCredentials">一键填入</button>
    </p>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  gap: var(--space-3);
}

.login-form__options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.login-form__remember {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-sm);
}

.login-form__remember input {
  width: 15px;
  height: 15px;
  accent-color: var(--color-accent);
}

.login-form__note {
  color: var(--color-muted);
  font-size: var(--font-xs);
}

.login-form__error {
  margin: 0;
  padding: 8px 10px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-sm);
  background: var(--color-danger-soft);
  color: var(--color-danger);
  font-size: var(--font-sm);
}

.login-form__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-on-accent);
  font-size: var(--font-md);
  font-weight: 600;
  transition: background-color 0.15s ease, opacity 0.15s ease;
}

.login-form__submit:hover {
  background: var(--color-accent-hover);
}

.login-form__submit:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.login-form__mock {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-xs);
}

.login-form__mock code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
}

.login-form__fill {
  padding: 3px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-muted);
  font-size: var(--font-xs);
}

.login-form__fill:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  color: var(--color-muted);
  font-size: var(--font-xs);
  font-weight: 600;
  white-space: nowrap;
}

.pill--info {
  background: var(--color-info-soft);
  color: var(--color-info);
}
</style>
