<script setup lang="ts">
import { computed } from 'vue'
import type { StatusState } from '@/types/ui'

interface Props {
  state: StatusState
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: ''
})

const labels: Record<StatusState, string> = {
  idle: '待命',
  checking: '检测中',
  online: '已连接',
  offline: '未连接'
}

const text = computed<string>(() => props.label || labels[props.state])
</script>

<template>
  <span class="status-pill" :class="`status-pill--${state}`">
    <i class="status-pill__dot" aria-hidden="true" />
    {{ text }}
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 2px 10px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-muted);
  background: var(--color-bg);
}

.status-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-muted);
}

.status-pill--online .status-pill__dot {
  background: var(--color-accent);
}

.status-pill--offline .status-pill__dot {
  background: var(--color-danger);
}

.status-pill--checking .status-pill__dot {
  background: var(--color-warning);
  animation: status-pulse 1s ease-in-out infinite;
}

@keyframes status-pulse {
  50% {
    opacity: 0.25;
  }
}
</style>

