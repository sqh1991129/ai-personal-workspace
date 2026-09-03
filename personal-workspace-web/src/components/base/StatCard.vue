<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string
  value: string
  unit?: string
  delta?: string
  /** down = 语义上的「变差」（如 token 上涨），只影响配色 */
  deltaTone?: 'up' | 'down'
  /** 迷你折线的顶点，viewBox 固定 0 0 100 34 */
  points: number[]
}

const props = withDefaults(defineProps<Props>(), {
  unit: '',
  delta: '',
  deltaTone: 'up'
})

// polygon 需要闭合到底边，polyline 只画线；两者共用同一组顶点
const polyline = computed<string>(() => props.points.map((y, index) => `${(index * 100) / (props.points.length - 1)},${y}`).join(' '))
const polygon = computed<string>(() => `${polyline.value} 100,34 0,34`)
</script>

<template>
  <article class="card stat">
    <p class="stat__label">{{ label }}</p>
    <p class="stat__value">
      {{ value }}<span v-if="unit" class="muted text-sm">{{ unit }}</span>
      <span v-if="delta" class="stat__delta" :class="{ 'stat__delta--down': deltaTone === 'down' }">{{ delta }}</span>
    </p>
    <svg class="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polygon :points="polygon" />
      <polyline :points="polyline" />
    </svg>
  </article>
</template>
