<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'

interface Props {
  title?: string
  category?: string
  poem?: string[]
}

defineProps<Props>()
</script>

<template>
  <div class="poetry-card panel panel--elevated" style="margin-top: 8px; margin-bottom: 8px;">
    <div class="panel__header" style="display: flex; align-items: center; gap: 8px;">
      <AppIcon name="spark" size="sm" style="color: var(--color-primary);" />
      <span style="font-weight: 500;">{{ title || '无题' }}</span>
      <span v-if="category" class="pill pill--sm">{{ category }}</span>
    </div>
    <div class="panel__body" style="font-style: italic; color: var(--text-color-secondary); line-height: 1.8;">
      <p v-for="(line, idx) in poem" :key="idx" style="margin: 4px 0;">
        {{ line }}
      </p>
      <p v-if="!poem || poem.length === 0" class="muted text-sm">正在构思中...</p>
    </div>
  </div>
</template>
