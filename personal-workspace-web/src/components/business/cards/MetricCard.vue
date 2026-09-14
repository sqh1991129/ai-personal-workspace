<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'

interface Props {
  title?: string
  main_value?: string
  sub_value?: string
  trend?: 'up' | 'down' | 'neutral'
}

defineProps<Props>()
</script>

<template>
  <div class="panel panel--elevated" style="margin: 16px 0; border-left: 4px solid var(--color-primary);">
    <div class="panel__header" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px;">
      <h3 style="margin: 0; font-size: 14px; color: var(--text-color-secondary);">{{ title || '核心指标' }}</h3>
      <AppIcon :name="trend === 'up' ? 'spark' : trend === 'down' ? 'thumbDown' : 'panel'" size="sm" style="color: var(--color-primary);" />
    </div>
    <div class="panel__body" style="padding-top: 0;">
      <div style="font-size: 32px; font-weight: 600; line-height: 1.2; margin-bottom: 4px; color: var(--text-color);">
        {{ main_value }}
      </div>
      <div v-if="sub_value" style="font-size: 13px; color: var(--text-color-secondary);">
        {{ sub_value }}
      </div>
    </div>
  </div>
</template>
