<script setup lang="ts">
import { computed } from 'vue'
import { ICON_PATHS } from '@/constants/icons'
import type { IconName } from '@/constants/icons'

interface Props {
  name: IconName
  /** sm = 15px 用于按钮/行内，lg = 22px 用于空状态与拖拽区，默认 18px */
  size?: 'sm' | 'md' | 'lg'
  /** 装饰性图标（旁边已有文字）保持 true，符合无障碍要求 */
  decorative?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  decorative: true,
  label: ''
})

// 图标路径来自 src/constants/icons.ts 的静态常量表，不含任何用户输入，因此 v-html 是安全的。
const markup = computed<string>(() => ICON_PATHS[props.name])
const sizeClass = computed<string>(() => (props.size === 'md' ? 'icon' : `icon icon--${props.size}`))
</script>

<template>
  <span :class="sizeClass" :aria-hidden="decorative ? 'true' : undefined" :aria-label="decorative ? undefined : label" role="img">
    <svg viewBox="0 0 24 24" v-html="markup" />
  </span>
</template>
