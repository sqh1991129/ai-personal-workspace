<script setup>
import { watchEffect } from 'vue'
import { useAppStore } from '@/stores/app'

const appTitle = process.env.VUE_APP_TITLE || '个人 AI 工作台'
const appStore = useAppStore()

watchEffect(() => {
  document.documentElement.dataset.theme = appStore.theme
})
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__bar">
      <RouterLink class="app-shell__brand" :to="{ name: 'home' }">
        <span class="app-shell__mark">WS</span>
        <span>{{ appTitle }}</span>
      </RouterLink>
      <button type="button" class="app-shell__theme" @click="appStore.toggleTheme()">
        {{ appStore.isDark ? '切换到浅色' : '切换到深色' }}
      </button>
    </header>
    <main class="app-shell__content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.app-shell__bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.app-shell__brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text);
  font-weight: 600;
}

.app-shell__brand:hover {
  text-decoration: none;
}

.app-shell__mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: #ffffff;
  font-size: 12px;
}

.app-shell__theme {
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text);
  font-size: 13px;
}

.app-shell__content {
  flex: 1;
  padding: var(--space-4);
}
</style>
