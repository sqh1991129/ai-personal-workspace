<script setup lang="ts">
import { shallowRef } from 'vue'
import AppIcon from '@/components/base/AppIcon.vue'
import { useUploadQueue } from '@/composables/useUploadQueue'

const { enqueue } = useUploadQueue()

const isOver = shallowRef(false)
const input = shallowRef<HTMLInputElement | null>(null)

/** 文件名一律取用户真正选中的文件，不再用固定样例名假装上传了一个文档。 */
function pickFiles(files: FileList | null): void {
  if (!files || files.length === 0) {
    return
  }
  Array.from(files).forEach((file) => enqueue(file.name))
}

function onDrop(event: DragEvent): void {
  isOver.value = false
  pickFiles(event.dataTransfer?.files ?? null)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    input.value?.click()
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
      aria-label="选择要上传的文档"
      @click="input?.click()"
      @keydown="onKeydown"
      @dragover.prevent="isOver = true"
      @dragenter.prevent="isOver = true"
      @dragleave.prevent="isOver = false"
      @drop.prevent="onDrop"
    >
      <AppIcon name="upload" size="lg" />
      <strong>拖拽文件到此处，或点击选择文件</strong>
      <span class="text-xs">上传接口待后端实现（POST /api/kb/{kbId}/documents），选择文件只会提示，不会真的上传</span>
    </div>
    <input ref="input" class="visually-hidden" type="file" multiple @change="pickFiles(($event.target as HTMLInputElement).files)" />
  </div>
</template>
