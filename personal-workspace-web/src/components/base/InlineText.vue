<script setup lang="ts">
import { computed } from 'vue'
import { parseInlineRuns } from '@/utils/richtext'
import type { InlineRun } from '@/utils/richtext'

interface Props {
  /** 支持 **加粗** 与 `行内代码` 两种标记，解析为结构化片段后渲染 */
  text: string
}

const props = defineProps<Props>()

// 说明：<template v-for> 上的 :key 会被编译器提升到 fragment，直接引用数组下标
// 会被 noUnusedLocals 判为未使用，因此把下标物化成数据字段再引用。
const runs = computed<Array<{ run: InlineRun; key: number }>>(() =>
  parseInlineRuns(props.text).map((run, key) => ({ run, key }))
)
</script>

<template>
  <template v-for="entry in runs" :key="entry.key">
    <strong v-if="entry.run.tone === 'strong'">{{ entry.run.text }}</strong>
    <code v-else-if="entry.run.tone === 'code'" class="inline-code">{{ entry.run.text }}</code>
    <template v-else>{{ entry.run.text }}</template>
  </template>
</template>
