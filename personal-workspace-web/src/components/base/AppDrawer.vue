<script setup lang="ts">
import { onMounted, onScopeDispose } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import type { IconName } from '@/constants/icons'

interface Props {
  open: boolean
  title: string
  icon?: IconName
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'file',
  label: '详情抽屉'
})

const emit = defineEmits<{ close: [] }>()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onScopeDispose(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="scrim" :class="{ 'is-open': open }" @click="emit('close')" />
    <aside class="drawer" :class="{ 'is-open': open }" :aria-label="label" :aria-hidden="open ? undefined : 'true'">
      <div class="drawer__head">
        <h2><AppIcon :name="icon" size="sm" /><span>{{ title }}</span></h2>
        <button class="icon-btn" type="button" title="关闭" aria-label="关闭" @click="emit('close')">
          <AppIcon name="close" size="sm" />
        </button>
      </div>
      <div class="drawer__body stack">
        <slot />
      </div>
    </aside>
  </Teleport>
</template>
