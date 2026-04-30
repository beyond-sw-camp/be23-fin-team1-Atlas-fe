<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { ApiError } from '../../../services/http'
import {
  getKafkaEventLogs,
  type EventLogSearchResponse,
} from '../../../services/kafkaMonitoring'

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
const search = ref('')
const activeTab = ref('')
const eventLogs = ref<EventLogSearchResponse[]>([])
const eventLogPage = ref(0)
const eventLogTotalPages = ref(0)
const eventLogTotalElements = ref(0)
const eventLogPageSize = ref(10)
const isLoadingEventLogs = ref(false)
const isInitialEventLogsLoading = ref(true)
const eventLogsErrorMessage = ref('')

const auditTabs = computed(() => content.value.tabs)

const selectedStatus = computed(() => {
  return undefined
})

const metrics = computed(() => {
  return content.value.metrics
})

function formatAuditDateTime(value?: string | null) {
  if (!value) return '-'
  return value.length >= 19 ? value.substring(0, 19).replace('T', ' ') : value
}

function formatAuditStatus(value: EventLogSearchResponse['status']) {
  if (preferences.language === 'ko') {
    return value === 'PUBLISHED' ? '성공' : '실패'
  }

  return value
}

function buildAuditDetail(log: EventLogSearchResponse) {
  return [
    log.aggregatePublicId,
    log.lastError,
  ].filter(Boolean).join(' / ') || '-'
}

const fallbackRows = computed(() => ROWS[preferences.language])

const esRows = computed(() => {
  return eventLogs.value.map((log) => [
    formatAuditDateTime(log.publishedAt ?? log.createdAt),
    'SYSTEM',
    log.eventType || '-',
    log.topic || String(log.aggregateType ?? '-'),
    buildAuditDetail(log),
    'internal',
    formatAuditStatus(log.status),
  ])
})

const visibleRows = computed(() => {
  const sourceRows = [
    ...esRows.value,
    ...fallbackRows.value,
  ]
  const query = search.value.trim().toLowerCase()

  return sourceRows.filter((row) => {
    return !query || row.some((cell) => cell.toLowerCase().includes(query))
  })
})


async function fetchAuditLogs() {
  isLoadingEventLogs.value = true
  eventLogsErrorMessage.value = ''

  try {
    const response = await getKafkaEventLogs({
      keyword: search.value.trim() || undefined,
      status: selectedStatus.value,
      page: eventLogPage.value,
      size: eventLogPageSize.value,
    })

    eventLogs.value = response.content
    eventLogTotalPages.value = response.totalPages ?? 0
    eventLogTotalElements.value = response.totalElements ?? 0
    eventLogPage.value = response.page ?? response.number ?? eventLogPage.value
    eventLogPageSize.value = response.size ?? eventLogPageSize.value
    isInitialEventLogsLoading.value = false
  } catch (error) {
    eventLogs.value = []
    eventLogTotalPages.value = 0
    eventLogTotalElements.value = 0
    eventLogsErrorMessage.value =
      error instanceof ApiError
        ? error.message
        : preferences.language === 'ko'
          ? '감사 로그를 불러오지 못했습니다.'
          : 'Failed to load audit logs.'
    isInitialEventLogsLoading.value = false
  } finally {
    isLoadingEventLogs.value = false
  }
}

async function searchAuditLogs() {
  eventLogPage.value = 0
  await fetchAuditLogs()
}

async function handleTabSelect(tab: string) {
  activeTab.value = tab
  await searchAuditLogs()
}

async function goToPreviousPage() {
  if (isLoadingEventLogs.value || eventLogPage.value <= 0) return
  eventLogPage.value -= 1
  await fetchAuditLogs()
}

async function goToNextPage() {
  if (isLoadingEventLogs.value || eventLogPage.value >= eventLogTotalPages.value - 1) return
  eventLogPage.value += 1
  await fetchAuditLogs()
}

watchEffect(() => {
  if (!auditTabs.value.includes(activeTab.value)) {
    activeTab.value = auditTabs.value[0]
  }

  header.setActions([
    { key: 'audit-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'audit-refresh', label: content.value.refreshLabel, tone: 'secondary' },
  ])
})

onMounted(() => {
  void fetchAuditLogs()
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
        <button class="page-button page-button--secondary" type="button" @click="fetchAuditLogs">{{ content.refreshLabel }}</button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search">
        <span>⌕</span>
        <input
          v-model="search"
          :placeholder="content.searchPlaceholder"
          type="text"
          @keydown.enter.prevent="searchAuditLogs"
        />
      </label>
      <div class="terminal-page__tabs">
        <button
          v-for="tab in auditTabs"
          :key="tab"
          :class="['terminal-page__tab', { 'is-active': activeTab === tab }]"
          type="button"
          @click="handleTabSelect(tab)"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <article class="page-panel">
      <div class="page-panel__head">
        <div><div class="page-panel__eyebrow">AUDIT</div><h3>{{ content.tableTitle }}</h3></div>
        <span class="page-panel__chip">{{ visibleRows.length }}</span>
      </div>
      <div v-if="false && isInitialEventLogsLoading" class="login-hint">
        {{ preferences.language === 'ko' ? '감사 로그를 불러오는 중입니다.' : 'Loading audit logs...' }}
      </div>

      <div v-if="eventLogsErrorMessage" class="login-error">
        {{ eventLogsErrorMessage }}
      </div>

      <div v-if="visibleRows.length === 0" class="login-hint">
        {{ preferences.language === 'ko' ? '감사 로그가 없습니다.' : 'No audit logs found.' }}
      </div>

      <div v-else class="page-table terminal-page__table is-seven-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        <div v-for="row in visibleRows" :key="`${row[0]}-${row[2]}`" class="page-table__row">
          <span v-for="cell in row" :key="cell">{{ cell }}</span>
        </div>
      </div>

      <div v-if="!eventLogsErrorMessage && eventLogTotalPages > 1" class="risk-rules-pagination">
        <button
          class="page-button page-button--secondary risk-rules-pagination__button"
          type="button"
          :disabled="eventLogPage === 0 || isLoadingEventLogs"
          @click="goToPreviousPage"
        >
          &lt;
        </button>

        <span class="risk-rules-pagination__status">
          {{ eventLogPage + 1 }} / {{ eventLogTotalPages }}
        </span>

        <button
          class="page-button page-button--secondary risk-rules-pagination__button"
          type="button"
          :disabled="eventLogPage >= eventLogTotalPages - 1 || isLoadingEventLogs"
          @click="goToNextPage"
        >
          &gt;
        </button>
      </div>
    </article>
  </section>
</template>
