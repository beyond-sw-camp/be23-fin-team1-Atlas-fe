<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '시스템 / 감사 로그',
    title: '감사 로그',
    subtitle: '사용자, 시스템, 보안 이벤트를 감사 시계열 기준으로 추적합니다.',
    metrics: [
      { label: '오늘 이벤트', value: '1,429', meta: '전체 이벤트 유형', tone: 'nominal' },
      { label: '활성 사용자', value: '12', meta: '최근 24시간', tone: 'info' },
      { label: '중요 이벤트', value: '3', meta: '검토 필요', tone: 'critical' },
      { label: '실패 액션', value: '7', meta: '권한 거부 / 오류', tone: 'warning' },
    ],
    tabs: ['전체', '사용자', '시스템', '보안', '데이터 변경'],
    searchPlaceholder: '사용자, 액션, 리소스 검색...',
    tableTitle: '이벤트 로그',
    exportLabel: '내보내기',
    refreshLabel: '새로고침',
    columns: ['시각', '사용자', '액션', '모듈', '세부 내용', 'IP', '결과'],
  },
  en: {
    eyebrow: 'System / Audit Log',
    title: 'Audit Log',
    subtitle: 'Track user, system, and security events in a unified audit timeline.',
    metrics: [
      { label: 'EVENTS TODAY', value: '1,429', meta: 'ALL EVENT TYPES', tone: 'nominal' },
      { label: 'USERS ACTIVE', value: '12', meta: 'LAST 24H', tone: 'info' },
      { label: 'CRITICAL EVENTS', value: '3', meta: 'NEEDS REVIEW', tone: 'critical' },
      { label: 'FAILED ACTIONS', value: '7', meta: 'DENIED / ERROR', tone: 'warning' },
    ],
    tabs: ['ALL', 'USER ACTIONS', 'SYSTEM', 'SECURITY', 'DATA CHANGES'],
    searchPlaceholder: 'Search user, action, resource...',
    tableTitle: 'Event Log',
    exportLabel: 'EXPORT',
    refreshLabel: 'REFRESH',
    columns: ['TIME', 'USER', 'ACTION', 'MODULE', 'DETAILS', 'IP', 'RESULT'],
  },
}

const ROWS = {
  ko: [
    ['09:14:22', 'M. Reyes', '발주 승인', 'Orders', 'ORD-2024-9025 승인', '10.0.1.42', '성공'],
    ['09:12:44', 'SYSTEM', '자동 발주 생성', 'Forecast', '수요 모델 기반 8건 생성', 'internal', '성공'],
    ['09:11:30', 'J. Torres', '통관 상태 오버라이드', 'Customs', 'MV-EOS-4471 상태 강제 변경', '10.0.1.18', '표시됨'],
    ['09:10:05', 'A. Chen', '출하 삭제 시도', 'Shipments', '권한 부족으로 차단', '192.168.1.4', '거부'],
    ['09:08:22', 'M. Reyes', 'ETA 수정', 'Orders', 'ORD-2024-8841 ETA 변경', '10.0.1.42', '성공'],
  ],
  en: [
    ['09:14:22', 'M. Reyes', 'Approve Order', 'Orders', 'ORD-2024-9025 approved', '10.0.1.42', 'SUCCESS'],
    ['09:12:44', 'SYSTEM', 'Auto PO Generated', 'Forecast', '8 POs generated from demand model', 'internal', 'SUCCESS'],
    ['09:11:30', 'J. Torres', 'Override Customs', 'Customs', 'Forced status change on MV-EOS-4471', '10.0.1.18', 'FLAGGED'],
    ['09:10:05', 'A. Chen', 'Delete Shipment', 'Shipments', 'Blocked due to insufficient permissions', '192.168.1.4', 'DENIED'],
    ['09:08:22', 'M. Reyes', 'Edit ETA', 'Orders', 'ETA changed on ORD-2024-8841', '10.0.1.42', 'SUCCESS'],
  ],
}

const content = computed(() => CONTENT[preferences.language])
const rows = computed(() => ROWS[preferences.language])
const search = ref('')
const activeTab = ref<string>(content.value.tabs[0])

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  return rows.value.filter((row) => !query || row.some((cell) => cell.toLowerCase().includes(query)))
})

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'audit-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'audit-refresh', label: content.value.refreshLabel, tone: 'secondary' },
  ])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--secondary" type="button">{{ content.refreshLabel }}</button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search">
        <span>⌕</span>
        <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
      </label>
      <div class="terminal-page__tabs">
        <button
          v-for="tab in content.tabs"
          :key="tab"
          :class="['terminal-page__tab', { 'is-active': activeTab === tab }]"
          type="button"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <article class="page-panel">
      <div class="page-panel__head">
        <div><div class="page-panel__eyebrow">AUDIT</div><h3>{{ content.tableTitle }}</h3></div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>
      <div class="page-table terminal-page__table is-seven-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        <div v-for="row in filteredRows" :key="`${row[0]}-${row[2]}`" class="page-table__row">
          <span v-for="cell in row" :key="cell">{{ cell }}</span>
        </div>
      </div>
    </article>
  </section>
</template>
