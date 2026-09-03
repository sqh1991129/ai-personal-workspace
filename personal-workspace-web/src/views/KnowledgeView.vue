<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppIcon from '@/components/base/AppIcon.vue'
import AppDrawer from '@/components/base/AppDrawer.vue'
import ChunkList from '@/components/business/ChunkList.vue'
import DocumentTable from '@/components/business/DocumentTable.vue'
import KbList from '@/components/business/KbList.vue'
import RecallTester from '@/components/business/RecallTester.vue'
import UploadDropzone from '@/components/business/UploadDropzone.vue'
import { STATUS_PRESENTATION } from '@/constants/knowledge'
import { useAppStore } from '@/stores/app'
import { useKnowledgeStore } from '@/stores/knowledge'
import { useToastStore } from '@/stores/toast'
import type { DocumentStatus } from '@/types/knowledge'

const route = useRoute()
const appStore = useAppStore()
const knowledgeStore = useKnowledgeStore()
const toastStore = useToastStore()

const layout = computed(() => appStore.layouts.knowledge)
const metrics = computed(() => knowledgeStore.libraryMetrics)
const activeDocument = computed(() => knowledgeStore.activeDocument)
const drawerStatus = computed(() => {
  const status = activeDocument.value?.status
  return status ? STATUS_PRESENTATION[status] : null
})

onMounted(async () => {
  await knowledgeStore.load()
  await openFromQuery()
})

/** 对话里的引用来源点击后带 ?doc=文档名 过来，这里负责定位并打开抽屉 */
async function openFromQuery(): Promise<void> {
  const target = typeof route.query.doc === 'string' ? route.query.doc : ''
  if (!target) {
    return
  }
  const hit = knowledgeStore.visibleDocuments.find((doc) => doc.name.startsWith(target.slice(0, 12)))
  if (hit) {
    await knowledgeStore.openDocument(hit.id)
    toastStore.notify(`已定位到「${hit.name}」的索引分片`)
    return
  }
  toastStore.notify(`知识库中未找到「${target}」，可能尚未索引`)
}

watch(
  () => route.query.doc,
  () => {
    void openFromQuery()
  }
)

async function openLibrary(kbId: string): Promise<void> {
  await knowledgeStore.openLibrary(kbId)
}

async function openDocument(documentId: string): Promise<void> {
  await knowledgeStore.openDocument(documentId)
}

function createLibrary(): void {
  knowledgeStore.createLibrary(`我的知识库 · ${knowledgeStore.libraries.length + 1}`)
  toastStore.notify('已创建知识库（本地），上传文档后建立索引')
}

async function reindex(): Promise<void> {
  const doc = activeDocument.value
  if (!doc) {
    return
  }
  await knowledgeStore.reindex(doc.id)
  toastStore.notify(`${doc.name} 已重新排队索引`)
}

async function removeDoc(): Promise<void> {
  const doc = activeDocument.value
  if (!doc) {
    return
  }
  await knowledgeStore.removeDoc(doc.id)
  toastStore.notify(`已移除 ${doc.name}`)
}

function setStatusFilter(value: 'all' | DocumentStatus): void {
  knowledgeStore.setStatusFilter(value)
}
</script>

<template>
  <section class="module" data-module="knowledge" :data-layout="layout" aria-label="知识库模块">
    <KbList
      :libraries="knowledgeStore.libraries"
      :active-id="knowledgeStore.activeKbId"
      :loading="knowledgeStore.loadingLibraries"
      @open="openLibrary"
      @create="createLibrary"
    />

    <div class="kb-main">
      <div class="kb-head">
        <div class="kb-head__top">
          <h2>{{ knowledgeStore.activeLibrary?.name ?? '知识库' }}</h2>
          <span class="pill pill--success">已启用检索</span>
          <span class="topbar__spacer" />
          <button class="btn btn--sm" type="button" @click="reindex">
            <AppIcon name="refresh" size="sm" />重建索引
          </button>
          <button class="btn btn--sm" type="button" @click="toastStore.notify('请选择或拖拽文件到上传区')">
            <AppIcon name="upload" size="sm" />上传文档
          </button>
          <button class="icon-btn" type="button" title="更多操作" aria-label="更多操作" @click="toastStore.notify('更多操作待后端接口就绪')">
            <AppIcon name="more" size="sm" />
          </button>
        </div>
        <p class="muted text-sm kb-head__desc">{{ knowledgeStore.activeLibraryDescription }}</p>
        <div class="kb-metrics">
          <span>文档 <b>{{ metrics.documentCount }}</b></span>
          <span>分片 <b>{{ metrics.chunkCount }}</b></span>
          <span>已索引 <b>{{ metrics.readyLabel }}</b></span>
          <span>最近更新 <b>{{ knowledgeStore.visibleDocuments[0]?.updatedAtLabel ?? '—' }}</b></span>
          <span>对话可引用 <b>是</b></span>
        </div>
      </div>

      <div class="kb-body">
        <div class="stack">
          <UploadDropzone />

          <DocumentTable
            :documents="knowledgeStore.visibleDocuments"
            :active-document-id="knowledgeStore.activeDocumentId"
            :status-filter="knowledgeStore.statusFilter"
            :loading="knowledgeStore.loadingDocuments"
            @open="openDocument"
            @update:status-filter="setStatusFilter"
          />

          <RecallTester />
        </div>
      </div>
    </div>

    <AppDrawer
      :open="knowledgeStore.activeDocumentId !== null"
      :title="activeDocument?.name ?? '文档详情'"
      label="文档详情抽屉"
      @close="knowledgeStore.closeDocument()"
    >
      <div class="cluster">
        <span v-if="drawerStatus" class="pill" :class="`pill--${drawerStatus.tone}`">{{ drawerStatus.label }}</span>
        <span class="chip pill--no-dot">{{ activeDocument?.type ?? '—' }} · 分片 512/64</span>
        <span class="chip pill--no-dot pill--info">对话可引用</span>
      </div>
      <dl class="kv">
        <dt>来源</dt><dd>本地文件</dd>
        <dt>大小</dt><dd>{{ activeDocument?.sizeLabel ?? '—' }}</dd>
        <dt>分片数</dt><dd>{{ activeDocument?.chunkCount ?? '—' }}</dd>
        <dt>向量模型</dt><dd>{{ activeDocument?.embeddingModel ?? '—' }} · 1024 维</dd>
        <dt>更新时间</dt><dd>{{ activeDocument?.updatedAtLabel ?? '—' }}</dd>
        <dt>被引用次数</dt><dd>{{ activeDocument?.citedTimes ?? 0 }} 次 / {{ activeDocument?.citedSessions ?? 0 }} 个会话</dd>
      </dl>
      <div class="cluster">
        <button class="btn btn--sm" type="button" @click="toastStore.notify('原文预览待后端 /documents/{id}/preview 就绪')">
          <AppIcon name="eye" size="sm" />预览原文
        </button>
        <button class="btn btn--sm" type="button" @click="reindex">
          <AppIcon name="refresh" size="sm" />重新索引
        </button>
        <button class="btn btn--danger btn--sm" type="button" @click="removeDoc">
          <AppIcon name="trash" size="sm" />移除
        </button>
      </div>
      <div class="divider" />
      <ChunkList :chunks="knowledgeStore.activeDocumentChunks" :loading="knowledgeStore.loadingChunks" />
      <p class="card__hint">
        抽屉内容对应接口 <code>GET /api/documents/{id}/chunks?page=1</code>；长文档按需分页，不要一次拉全部向量。
      </p>
    </AppDrawer>
  </section>
</template>

<style scoped>
/* 原型这里是内联 style="margin:0"，改成类名以免模板里写样式 */
.kb-head__desc {
  margin: 0;
}
</style>
