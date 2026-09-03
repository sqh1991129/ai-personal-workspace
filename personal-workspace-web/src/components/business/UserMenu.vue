<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { APP_VERSION } from '@/constants/app'
import { useLogout } from '@/composables/useLogout'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const { isPending, errorMessage, logout } = useLogout()

const displayName = computed<string>(() => authStore.currentUser?.displayName ?? '未登录')
const initial = computed<string>(() => displayName.value.slice(0, 1).toUpperCase() || 'WS')
const metaLabel = computed<string>(() => `本地部署 · v${APP_VERSION}`)
const logoutTitle = computed<string>(() => (isPending.value ? '退出中…' : '退出登录'))
</script>

<template>
  <div class="profile">
    <span class="avatar" aria-hidden="true">{{ initial }}</span>
    <span class="profile__meta">
      <span class="row__title">{{ displayName }}</span>
      <span class="row__meta">{{ metaLabel }}</span>
    </span>
    <button class="icon-btn" type="button" :disabled="isPending" :title="logoutTitle" aria-label="退出登录" @click="logout">
      <AppIcon name="logout" size="sm" />
    </button>
    <p v-if="errorMessage" class="profile__error" role="alert">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.profile {
  position: relative;
}

.profile__error {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-xs);
}

.profile .icon-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
