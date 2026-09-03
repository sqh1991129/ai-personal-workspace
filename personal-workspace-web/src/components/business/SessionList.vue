<script setup lang="ts">
import AppIcon from '@/components/base/AppIcon.vue'
import type { ChatSession } from '@/types/chat'

interface Props {
  groups: Array<{ label: string; items: ChatSession[] }>
  activeId: string
  filter: string
  loading: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  open: [sessionId: string]
  create: []
  'update:filter': [value: string]
}>()
</script>

<template>
  <aside class="rail" aria-label="会话列表">
    <div class="rail__head">
      <button class="btn btn--primary btn--block" type="button" @click="emit('create')">
        <AppIcon name="plus" size="sm" />新建会话
      </button>
      <label class="search">
        <AppIcon name="search" size="sm" />
        <input
          class="input"
          type="search"
          placeholder="筛选会话"
          aria-label="筛选会话"
          :value="filter"
          @input="emit('update:filter', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
    <div class="rail__body">
      <p v-if="loading" class="rail__label">加载会话…</p>
      <template v-for="group in groups" :key="group.label">
        <p class="rail__label">{{ group.label }}</p>
        <button
          v-for="session in group.items"
          :key="session.id"
          class="row"
          :class="{ 'is-active': session.id === activeId }"
          type="button"
          @click="emit('open', session.id)"
        >
          <AppIcon :name="session.icon" size="sm" />
          <span class="row__main">
            <span class="row__title">{{ session.title }}</span>
            <span class="row__meta">{{ session.summary }}</span>
          </span>
          <span class="nav-item__count">{{ session.timeLabel }}</span>
        </button>
      </template>
      <p v-if="!loading && groups.length === 0" class="empty">没有匹配的会话，换个关键词试试。</p>
    </div>
  </aside>
</template>
