<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'

defineProps<{
  data: Record<string, unknown>
}>()

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val, null, 2)
  return String(val)
}
</script>

<template>
  <div class="panel panel--elevated" style="margin: 16px 0; border-top: 4px solid var(--color-border);">
    <div class="panel__header" style="display: flex; gap: 8px; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--color-border);">
      <AppIcon name="db" size="sm" style="color: var(--text-color-secondary);" />
      <h3 style="margin: 0; font-size: 14px; color: var(--text-color-secondary);">结构化数据 (通用展示)</h3>
    </div>
    <div class="panel__body" style="padding-top: 12px; overflow-x: auto;">
      <dl style="margin: 0; display: grid; gap: 12px; grid-template-columns: minmax(100px, max-content) 1fr;">
        <template v-for="(value, key) in data" :key="key">
          <dt style="color: var(--text-color-secondary); font-size: 13px; word-break: break-all;">
            {{ key }}
          </dt>
          <dd style="margin: 0; font-size: 14px;">
            <pre v-if="typeof value === 'object' && value !== null" style="margin: 0; font-size: 13px; background: var(--bg-color-soft); padding: 8px; border-radius: 4px;"><code>{{ formatValue(value) }}</code></pre>
            <span v-else style="line-height: 1.5; word-break: break-word;">{{ formatValue(value) }}</span>
          </dd>
        </template>
      </dl>
    </div>
  </div>
</template>
