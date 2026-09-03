<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

const label = computed<string>(() => (appStore.isDark ? '切换到浅色' : '切换到深色'))
</script>

<template>
  <button type="button" class="icon-btn" :aria-label="label" :title="label" @click="appStore.toggleTheme()">
    <AppIcon :name="appStore.isDark ? 'sun' : 'moon'" size="sm" />
  </button>
</template>
