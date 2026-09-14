<script setup lang="ts">
import { computed } from 'vue'
import { CONTRACT_STATUS_LABELS, contractStatusOf } from '@/constants/backendApi'
import type { BackendApiEntry, ContractStatus } from '@/constants/backendApi'

interface Props {
  entries: BackendApiEntry[]
}

const props = defineProps<Props>()

interface Row {
  entry: BackendApiEntry
  status: ContractStatus
  statusLabel: string
  statusClass: string
}

const STATUS_PILL_CLASS: Record<ContractStatus, string> = {
  connected: 'pill--success',
  blocked: 'pill--warning',
  'await-backend': 'pill--danger',
  'await-frontend': 'pill--info'
}

// 一行一接口：状态从登记表派生，组件本身不判断后端实现情况
const rows = computed<Row[]>(() =>
  props.entries.map((entry) => {
    const status = contractStatusOf(entry)
    return { entry, status, statusLabel: CONTRACT_STATUS_LABELS[status], statusClass: STATUS_PILL_CLASS[status] }
  })
)

const pendingTotal = computed<number>(() =>
  rows.value.filter((row) => row.status === 'await-backend' || row.status === 'await-frontend').length
)
const connectedTotal = computed<number>(() =>
  rows.value.filter((row) => row.status === 'connected' || row.status === 'blocked').length
)
const docMissingTotal = computed<number>(() => rows.value.filter((row) => !row.entry.inDoc).length)
</script>

<template>
  <article class="card">
    <div class="card__head">
      <h3>后端接口对接进度</h3>
      <span class="pill pill--danger">{{ pendingTotal }} 项待对接</span>
    </div>
    <p class="card__hint">
      共 {{ rows.length }} 个接口，前端已调用 {{ connectedTotal }} 个；{{ docMissingTotal }} 个还没有写进
      <code>docs/默认模块.md</code>。页面不再展示假数据，未对接的能力会直接点名端点。
    </p>
    <table class="api-table">
      <caption class="sr-only">接口、对应功能与对接状态</caption>
      <thead>
        <tr>
          <th scope="col">接口</th>
          <th scope="col">界面能力</th>
          <th scope="col">状态</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="`${row.entry.verb} ${row.entry.path}`">
          <td>
            <code>{{ row.entry.verb }} {{ row.entry.path }}</code>
          </td>
          <td>
            <span class="api-table__feature">{{ row.entry.feature }}</span>
            <small v-if="row.entry.calledBy" class="api-table__caller">{{ row.entry.calledBy }}</small>
            <small v-else class="api-table__caller">前端尚未调用</small>
          </td>
          <td>
            <span class="pill" :class="row.statusClass">{{ row.statusLabel }}</span>
            <small v-if="row.entry.note" class="api-table__note">{{ row.entry.note }}</small>
          </td>
        </tr>
      </tbody>
    </table>
  </article>
</template>

<style scoped>
.api-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.api-table th {
  padding: 0 0 6px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-muted);
  font-size: var(--font-xs);
  font-weight: 600;
  text-align: left;
}

.api-table td {
  padding: 8px 8px 8px 0;
  border-bottom: 1px solid var(--color-border);
  vertical-align: top;
}

.api-table tr:last-child td {
  border-bottom: none;
}

.api-table code {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  font-size: var(--font-xs);
  word-break: break-all;
}

.api-table__feature,
.api-table__caller,
.api-table__note {
  display: block;
}

.api-table__caller,
.api-table__note {
  margin-top: 2px;
  color: var(--color-muted);
  font-size: var(--font-xs);
  line-height: 1.5;
}

.api-table td .pill {
  margin-top: 1px;
}
</style>
