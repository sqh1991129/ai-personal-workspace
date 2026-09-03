<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()
</script>

<template>
  <div class="toast-layer" aria-live="polite">
    <div v-for="item in toastStore.items" :key="item.id" class="toast">
      {{ item.message }}
      <button class="icon-btn" type="button" title="关闭提示" aria-label="关闭提示" @click="toastStore.dismiss(item.id)">
        <AppIcon name="close" size="sm" />
      </button>
    </div>
  </div>
</template>
