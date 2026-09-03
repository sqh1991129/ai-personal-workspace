<script setup lang="ts">
import { shallowRef } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { STATUS_PRESENTATION } from '@/constants/knowledge'
import { useUploadQueue } from '@/composables/useUploadQueue'
import { useKnowledgeStore } from '@/stores/knowledge'

const knowledgeStore = useKnowledgeStore()
const { hasTasks, enqueue } = useUploadQueue()

const isOver = shallowRef(false)
/** 原型没有真实文件通道，这里用固定文件名模拟，避免引入 input 造成的假上传承诺 */
const SAMPLE_NAMES = ['拖拽文件.md', '键盘上传.md', '点击上传.md']
let sampleIndex = 0

function nextSampleName(): string {
  const name = SAMPLE_NAMES[sampleIndex % SAMPLE_NAMES.length]
  sampleIndex += 1
  return name
}

function onDrop(): void {
  isOver.value = false
  enqueue(nextSampleName())
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    enqueue('键盘上传.md')
  }
}
</script>

<template>
  <div>
    <div
      class="dropzone"
      :class="{ 'is-over': isOver }"
      tabindex="0"
      role="button"
      aria-label="上传文档（点击模拟）"
      @click="enqueue(nextSampleName())"
      @keydown="onKeydown"
      @dragover.prevent="isOver = true"
      @dragenter.prevent="isOver = true"
      @dragleave.prevent="isOver = false"
      @drop.prevent="onDrop"
    >
      <AppIcon name="upload" size="lg" />
      <strong>拖拽文件到此处，或点击模拟上传</strong>
      <span class="text-xs">支持 PDF / DOCX / MD / TXT / URL，单文件 ≤ 50 MB · 上传后自动解析 → 分片 → 向量化</span>
    </div>

    <div v-if="hasTasks" class="uploader" aria-live="polite">
      <div v-for="task in knowledgeStore.uploadTasks" :key="task.id" class="uploader__item">
        <span class="file-type">NEW</span>
        <div class="row__main">
          <span class="row__title">{{ task.fileName }}</span>
          <div class="uploader__meter"><div class="meter__fill meter__fill--info" :style="{ width: task.progress + '%' }" /></div>
        </div>
        <span class="pill" :class="`pill--${STATUS_PRESENTATION[task.status].tone}`">{{ STATUS_PRESENTATION[task.status].label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 原型这里是内联 style="margin-top:6px"，改成类名以免模板里写样式 */
.uploader__meter {
  height: 6px;
  margin-top: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-surface-sunken);
  overflow: hidden;
}
</style>
