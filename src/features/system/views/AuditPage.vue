<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { ApiError } from '../../../services/http'
import {
  getKafkaEventLogs,
  type EventLogSearchResponse,
} from '../../../services/kafkaMonitoring'

const header = useAtlasHeaderStore()
const CONTENT = {
  ko: {
    eyebrow: '시스템 / 감사 로그',
    title: '감사 로그',
    subtitle: 'Kafka 이벤트 발행 히스토리를 감사 시계열 기준으로 추적합니다.',
    metrics: [
      { key: 'total', label: '전체 이벤트', meta: 'Kafka 발행 히스토리', tone: 'nominal' },
      { key: 'published', label: '발행 성공', meta: 'PUBLISHED', tone: 'info' },
      { key: 'failed', label: '발행 실패', meta: 'FAILED', tone: 'critical' },
      { key: 'topics', label: '토픽 수', meta: '현재 페이지 기준', tone: 'warning' },
    ],
    tabs: ['전체', '성공', '실패'],
    searchPlaceholder: '이벤트 ID, 토픽, 타입, aggregate 검색...',
    tableTitle: 'Kafka 이벤트 발행 히스토리',
    exportLabel: '내보내기',
    refreshLabel: '새로고침',
    columns: ['발행 시각', '상태', '토픽', '이벤트 타입', 'Aggregate', '이벤트 ID', '오류'],
  },
}

const content = computed(() => CONTENT.ko)
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
  if (activeTab.value === '성공') return 'PUBLISHED'
  if (activeTab.value === '실패') return 'FAILED'
  return undefined
})

const metrics = computed(() => {
  const publishedCount = eventLogs.value.filter((log) => log.status === 'PUBLISHED').length
  const failedCount = eventLogs.value.filter((log) => log.status === 'FAILED').length
  const topicCount = new Set(eventLogs.value.map((log) => log.topic).filter(Boolean)).size

  return content.value.metrics.map((metric) => {
    if (metric.key === 'total') {
      return { ...metric, value: eventLogTotalElements.value.toLocaleString('ko-KR') }
    }
    if (metric.key === 'published') {
      return { ...metric, value: publishedCount.toLocaleString('ko-KR') }
    }
    if (metric.key === 'failed') {
      return { ...metric, value: failedCount.toLocaleString('ko-KR') }
    }
    return { ...metric, value: topicCount.toLocaleString('ko-KR') }
  })
})

function formatAuditDateTime(value?: string | null) {
  if (!value) return '-'
  return value.length >= 19 ? value.substring(0, 19).replace('T', ' ') : value
}

function formatAuditStatus(value: EventLogSearchResponse['status']) {
  return value === 'PUBLISHED' ? '발행 성공' : '발행 실패'
}

function formatAggregate(log: EventLogSearchResponse) {
  if (log.aggregateType && log.aggregatePublicId) {
    return `${log.aggregateType} / ${log.aggregatePublicId}`
  }

  return log.aggregateType || log.aggregatePublicId || '-'
}

const visibleRows = computed(() => {
  return eventLogs.value.map((log) => [
    formatAuditDateTime(log.publishedAt ?? log.createdAt),
    formatAuditStatus(log.status),
    log.topic || '-',
    log.eventType || '-',
    formatAggregate(log),
    log.eventId || '-',
    log.lastError || '-',
  ])
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
        : '감사 로그를 불러오지 못했습니다.'
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
        {{ '감사 로그를 불러오는 중입니다.' }}
      </div>

      <div v-if="eventLogsErrorMessage" class="login-error">
        {{ eventLogsErrorMessage }}
      </div>

      <div class="page-table terminal-page__table is-seven-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        <div v-if="visibleRows.length === 0" class="terminal-page__table-message">
          {{ 'Kafka 이벤트 발행 히스토리가 없습니다.' }}
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
