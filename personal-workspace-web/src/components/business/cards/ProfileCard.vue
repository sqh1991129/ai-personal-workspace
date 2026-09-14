<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'

interface ProfileItem {
  label: string
  value: string
}

interface Props {
  title?: string
  badge?: string
  items?: ProfileItem[]
}

defineProps<Props>()
</script>

<template>
  <div class="panel panel--elevated" style="margin: 16px 0; border-top: 4px solid var(--color-primary);">
    <div class="panel__header" style="display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <AppIcon name="spark" size="md" style="color: var(--color-primary);" />
        <h3 style="margin: 0; font-size: 16px;">{{ title || '智能助手' }}</h3>
      </div>
      <span v-if="badge" class="pill pill--primary pill--sm">{{ badge }}</span>
    </div>
    <div class="panel__body">
      <dl style="margin: 0; display: grid; gap: 12px; grid-template-columns: 80px 1fr;">
        <template v-for="item in items" :key="item.label">
          <dt style="color: var(--text-color-secondary); font-size: 13px;">{{ item.label }}</dt>
          <dd style="margin: 0; font-size: 14px; font-weight: 500; line-height: 1.5;">{{ item.value }}</dd>
        </template>
      </dl>
    </div>
  </div>
</template>
