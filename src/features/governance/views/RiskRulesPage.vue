<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { ApiError } from '../../../services/http'
import {
  getKafkaEventRules,
  getKafkaSubscriptions,
  updateKafkaEventRuleEnabled,
  type KafkaEventSummaryResponse,
  type KafkaSubscriptionStatusResponse,
} from '../../../services/kafkaMonitoring'
import { useAtlasToastStore } from '../../../stores/toast'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
const toast = useAtlasToastStore()
const KAFKA_SUBSCRIPTIONS_POLL_INTERVAL_MS = 10 * 60 * 1000

const CONTENT = {
  ko: {
    title: '리스크 규칙 관리',
    eyebrow: '시스템 / 리스크 규칙',
    metricLabels: {
      active: { label: '활성 규칙', meta: '적용 중', tone: 'nominal' },
      disabled: { label: '비활성', meta: '검토 대상', tone: 'warning' },
      triggered: { label: '총 발동 횟수', meta: '누적 이벤트', tone: 'info' },
      topics: { label: 'Kafka 토픽', meta: '구독 현황', tone: 'nominal' },
    },
    searchPlaceholder: '규칙명, 이벤트 유형 검색...',
    tabs: ['전체', '활성', '비활성'],
    rulesTitle: '리스크 규칙 목록',
    topicTitle: 'Kafka 토픽 구독 현황',
    exportLabel: '내보내기',
    createLabel: '규칙 추가',
    columns: ['규칙 ID', '규칙 명', 'Kafka 토픽', '조건', '임계값', '발동 횟수', '활성화', '중요도'],
    topicColumns: ['토픽 이름', '파티션', '커밋 오프셋', '메시지/h', '브로커 연결', '컨슈머 구독'],
    loadingRules: '리스크 규칙 목록을 불러오는 중입니다.',
    loadingTopics: 'Kafka 구독 현황을 불러오는 중입니다.',
    emptyRules: '등록된 리스크 규칙이 없습니다.',
    emptyTopics: '표시할 Kafka 구독 정보가 없습니다.',
    loadError: '리스크 규칙 데이터를 불러오지 못했습니다.',
    toggleError: '규칙 활성화 상태를 변경하지 못했습니다.',
    emptyRulesHint: '필터를 변경하거나 새 규칙을 추가해 주세요.',
    emptyTopicsHint: '구독이 시작되면 Kafka 토픽 현황이 이 영역에 표시됩니다.',
    loadErrorHint: '잠시 후 다시 시도해 주세요.',
    subscribed: '구독 중',
    connected: '연결됨',
    disconnected: '미연결',
    notSubscribed: '미구독',
    unknown: '-',
    pageStatus: (current: number, total: number) => `${current} / ${total}`,
  },
  en: {
    title: 'Risk Rules Control',
    eyebrow: 'System / Risk Rules',
    metricLabels: {
      active: { label: 'ACTIVE RULES', meta: 'ENFORCED', tone: 'nominal' },
      disabled: { label: 'DISABLED', meta: 'REVIEW TARGET', tone: 'warning' },
      triggered: { label: 'TOTAL TRIGGERED', meta: 'CUMULATIVE EVENTS', tone: 'info' },
      topics: { label: 'KAFKA TOPICS', meta: 'SUBSCRIPTION STATUS', tone: 'nominal' },
    },
    searchPlaceholder: 'Search rule name or event type...',
    tabs: ['ALL', 'ACTIVE', 'DISABLED'],
    rulesTitle: 'RISK RULES',
    topicTitle: 'KAFKA TOPIC SUBSCRIPTIONS',
    exportLabel: 'EXPORT',
    createLabel: 'ADD RULE',
    columns: ['RULE ID', 'RULE NAME', 'KAFKA TOPIC', 'CONDITION', 'THRESHOLD', 'TRIGGERED', 'ACTIVE', 'IMPORTANCE'],
    topicColumns: ['TOPIC NAME', 'PARTITIONS', 'COMMITTED OFFSET', 'MSG/H', 'BROKER', 'CONSUMER'],
    loadingRules: 'Loading risk rules...',
    loadingTopics: 'Loading Kafka subscriptions...',
    emptyRules: 'No risk rules found.',
    emptyTopics: 'No Kafka subscriptions found.',
    loadError: 'Failed to load risk rule data.',
    toggleError: 'Failed to update rule status.',
    emptyRulesHint: 'Change the filter or add a new rule.',
    emptyTopicsHint: 'Kafka topic subscriptions will appear here once available.',
    loadErrorHint: 'Please try again in a moment.',
    subscribed: 'SUBSCRIBED',
    connected: 'CONNECTED',
    disconnected: 'DISCONNECTED',
    notSubscribed: 'NOT SUBSCRIBED',
    unknown: '-',
    pageStatus: (current: number, total: number) => `${current} / ${total}`,
  },
}

const content = computed(() => CONTENT[preferences.language])
const search = ref('')
const selectedTab = ref<string>(content.value.tabs[0])
const rules = ref<KafkaEventSummaryResponse[]>([])
const subscriptions = ref<KafkaSubscriptionStatusResponse[]>([])
const currentPage = ref(0)
const totalPages = ref(0)
const pageSize = ref(10)
const totalRuleCount = ref(0)
const totalActiveRuleCount = ref(0)
const totalTriggeredRuleCount = ref(0)
const isLoadingRules = ref(false)
const isInitialRulesLoading = ref(true)
const isLoadingTopics = ref(false)
const isInitialTopicsLoading = ref(true)
const isTogglingRuleId = ref('')
const rulesErrorMessage = ref('')
const topicsErrorMessage = ref('')
let subscriptionsPollingTimer: ReturnType<typeof window.setInterval> | null = null

type DisplayRule = {
  id: string
  name: string
  topic: string
  condition: string
  threshold: string
  thresholdTone: 'warning' | 'critical'
  triggered: string
  active: boolean
  severity: string
  severityTone: 'warning' | 'error' | 'info'
  rowTone: 'warning' | 'critical' | 'nominal'
  eventType: string
}

function normalizeImportance(value: string | null | undefined) {
  return (value ?? '').trim().toUpperCase()
}

function resolveSeverityTone(importance: string): DisplayRule['severityTone'] {
  const normalized = normalizeImportance(importance)

  if (normalized.includes('CRITICAL') || normalized.includes('긴급')) {
    return 'error'
  }

  if (normalized.includes('HIGH') || normalized.includes('높음')) {
    return 'warning'
  }

  return 'info'
}

function resolveSeverityLabel(importance: string) {
  const normalized = normalizeImportance(importance)

  if (preferences.language === 'ko') {
    if (normalized.includes('CRITICAL') || normalized.includes('긴급')) return '최우선'
    if (normalized.includes('HIGH') || normalized.includes('높음') || normalized.includes('중요')) return '우선'
    return '일반'
  }

  if (normalized.includes('CRITICAL') || normalized.includes('긴급')) return 'CRITICAL'
  if (normalized.includes('HIGH') || normalized.includes('높음') || normalized.includes('중요')) return 'HIGH'
  return 'NORMAL'
}

function resolveRowTone(importance: string): DisplayRule['rowTone'] {
  const severityTone = resolveSeverityTone(importance)
  if (severityTone === 'error') return 'critical'
  if (severityTone === 'warning') return 'warning'
  return 'nominal'
}

function resolveThresholdTone(importance: string): DisplayRule['thresholdTone'] {
  return resolveSeverityTone(importance) === 'error' ? 'critical' : 'warning'
}

function formatTriggeredCount(value: number) {
  return preferences.language === 'ko' ? `${value}회` : String(value)
}

function formatMetricCount(value: number) {
  return preferences.language === 'ko' ? `${value}건` : String(value)
}

function formatTriggeredMetricCount(value: number) {
  return preferences.language === 'ko' ? `${value}회` : String(value)
}

function formatThreshold(value: string | number) {
  return String(value ?? content.value.unknown)
}

function toSafeNonNegativeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }

  return fallback
}

function normalizeKafkaStatus(status?: string | null) {
  return status?.trim().toUpperCase() ?? ''
}

function formatBrokerStatus(status?: string | null) {
  const normalized = normalizeKafkaStatus(status)

  if (normalized === 'CONNECTED') {
    return content.value.connected
  }

  if (!normalized) {
    return content.value.unknown
  }

  return status ?? content.value.unknown
}

function formatConsumerStatus(status?: string | null) {
  const normalized = normalizeKafkaStatus(status)

  if (normalized === 'SUBSCRIBED') {
    return content.value.subscribed
  }

  if (!normalized) {
    return content.value.unknown
  }

  return status ?? content.value.unknown
}

const metrics = computed(() => {
  const activeCount = totalActiveRuleCount.value
  const disabledCount = totalRuleCount.value - activeCount
  const triggeredCount = totalTriggeredRuleCount.value
  const topicCount = subscriptions.value.length

  return [
    {
      ...content.value.metricLabels.active,
      value: formatMetricCount(activeCount),
    },
    {
      ...content.value.metricLabels.disabled,
      value: formatMetricCount(disabledCount),
    },
    {
      ...content.value.metricLabels.triggered,
      value: formatTriggeredMetricCount(triggeredCount),
    },
    {
      ...content.value.metricLabels.topics,
      value: String(topicCount),
    },
  ]
})

const kafkaTopics = computed(() =>
  subscriptions.value.map((topic) => ({
    topic: topic.topic,
    partitions: topic.partitionCount,
    offset: String(topic.committedOffset ?? content.value.unknown),
    rate: String(topic.messagesPerHour ?? 0),
    brokerStatus: formatBrokerStatus(topic.brokerConnectionStatus),
    brokerTone:
      normalizeKafkaStatus(topic.brokerConnectionStatus) === 'CONNECTED'
        ? 'success'
        : 'error',
    consumerStatus: formatConsumerStatus(topic.consumerSubscriptionStatus),
    consumerTone:
      normalizeKafkaStatus(topic.consumerSubscriptionStatus) === 'SUBSCRIBED'
        ? 'success'
        : 'warning',
  })),
)

const displayRules = computed<DisplayRule[]>(() =>
  rules.value.map((rule) => ({
    id: rule.ruleId,
    name: rule.ruleName,
    topic: rule.topic,
    condition: rule.condition,
    threshold: formatThreshold(rule.threshold),
    thresholdTone: resolveThresholdTone(rule.importance),
    triggered: formatTriggeredCount(rule.triggeredCount ?? 0),
    active: rule.enabled,
    severity: resolveSeverityLabel(rule.importance),
    severityTone: resolveSeverityTone(rule.importance),
    rowTone: resolveRowTone(rule.importance),
    eventType: rule.eventType,
  })),
)

const filteredRules = computed(() => {
  const query = search.value.trim().toLowerCase()
  const activeTab = selectedTab.value
  let items = displayRules.value

  if (query) {
    items = items.filter(
      (rule) =>
        rule.name.toLowerCase().includes(query) ||
        rule.eventType.toLowerCase().includes(query),
    )
  }

  if (activeTab === '활성' || activeTab === 'ACTIVE') {
    return items.filter((rule) => rule.active)
  }

  if (activeTab === '비활성' || activeTab === 'DISABLED') {
    return items.filter((rule) => !rule.active)
  }

  return items
})

async function fetchRuleSummaryMetrics(
  currentPageContent: KafkaEventSummaryResponse[],
  pageCount: number,
  currentPageNumber: number,
  currentSize: number,
) {
  if (pageCount <= 1) {
    totalActiveRuleCount.value = currentPageContent.filter((rule) => rule.enabled).length
    totalTriggeredRuleCount.value = currentPageContent.reduce(
      (total, rule) => total + (rule.triggeredCount ?? 0),
      0,
    )
    return
  }

  const pageRequests = Array.from({ length: pageCount }, (_, pageIndex) => {
    if (pageIndex === currentPageNumber) {
      return Promise.resolve({
        content: currentPageContent,
        totalElements: totalRuleCount.value,
        totalPages: pageCount,
        size: currentSize,
        page: currentPageNumber,
        first: currentPageNumber === 0,
        last: currentPageNumber === pageCount - 1,
      })
    }

    return getKafkaEventRules({
      page: pageIndex,
      size: currentSize,
    })
  })

  const pageResults = await Promise.allSettled(pageRequests)

  let activeCount = 0
  let triggeredCount = 0

  for (const result of pageResults) {
    if (result.status !== 'fulfilled') {
      continue
    }

    for (const rule of result.value.content) {
      if (rule.enabled) {
        activeCount += 1
      }

      triggeredCount += rule.triggeredCount ?? 0
    }
  }

  totalActiveRuleCount.value = activeCount
  totalTriggeredRuleCount.value = triggeredCount
}

async function fetchRiskRulesData() {
  isLoadingRules.value = true
  rulesErrorMessage.value = ''

  try {
    const rulesResponse = await getKafkaEventRules({
      page: currentPage.value,
      size: pageSize.value,
    })

    const safePage = toSafeNonNegativeNumber(rulesResponse.page, 0)
    const safeTotalPages = toSafeNonNegativeNumber(rulesResponse.totalPages, 0)
    const safePageSize = toSafeNonNegativeNumber(rulesResponse.size, 10)
    const safeTotalElements = toSafeNonNegativeNumber(rulesResponse.totalElements, 0)

    rules.value = rulesResponse.content
    totalRuleCount.value = safeTotalElements
    totalPages.value = safeTotalPages
    currentPage.value = safePage
    pageSize.value = safePageSize
    isInitialRulesLoading.value = false
    void fetchRuleSummaryMetrics(
      rulesResponse.content,
      safeTotalPages,
      safePage,
      safePageSize,
    )
  } catch (error) {
    const reason = error
    const message =
      reason instanceof ApiError ? reason.message : content.value.loadError

    rules.value = []
    totalRuleCount.value = 0
    totalActiveRuleCount.value = 0
    totalTriggeredRuleCount.value = 0
    totalPages.value = 0
    currentPage.value = 0
    rulesErrorMessage.value = message
    isInitialRulesLoading.value = false
    toast.show(content.value.title, message, 'critical')
  } finally {
    isLoadingRules.value = false
  }
}

async function fetchKafkaSubscriptionsData() {
  isLoadingTopics.value = true
  topicsErrorMessage.value = ''

  try {
    subscriptions.value = await getKafkaSubscriptions()
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : content.value.loadError

    subscriptions.value = []
    topicsErrorMessage.value = message
    toast.show(content.value.title, message, 'critical')
  } finally {
    isLoadingTopics.value = false
    isInitialTopicsLoading.value = false
  }
}

function startKafkaSubscriptionsPolling() {
  if (subscriptionsPollingTimer) {
    window.clearInterval(subscriptionsPollingTimer)
  }

  subscriptionsPollingTimer = window.setInterval(() => {
    void fetchKafkaSubscriptionsData()
  }, KAFKA_SUBSCRIPTIONS_POLL_INTERVAL_MS)
}

async function goToPreviousPage() {
  if (isLoadingRules.value || currentPage.value <= 0) {
    return
  }

  currentPage.value -= 1
  await fetchRiskRulesData()
}

async function goToNextPage() {
  if (isLoadingRules.value || currentPage.value >= totalPages.value - 1) {
    return
  }

  currentPage.value += 1
  await fetchRiskRulesData()
}

async function handleToggleRule(ruleId: string, nextEnabled: boolean) {
  if (isTogglingRuleId.value) {
    return
  }

  const targetRule = rules.value.find((rule) => rule.ruleId === ruleId)
  if (!targetRule) {
    return
  }

  const previousEnabled = targetRule.enabled
  targetRule.enabled = nextEnabled
  isTogglingRuleId.value = ruleId

  try {
    await updateKafkaEventRuleEnabled(ruleId, nextEnabled)
    totalActiveRuleCount.value += nextEnabled ? 1 : -1
  } catch (error) {
    targetRule.enabled = previousEnabled

    const message =
      error instanceof ApiError ? error.message : content.value.toggleError

    toast.show(content.value.title, message, 'critical')
  } finally {
    isTogglingRuleId.value = ''
  }
}

watchEffect(() => {
  selectedTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'risk-rules-add', label: preferences.language === 'ko' ? '규칙 추가' : 'ADD RULE', tone: 'primary' },
  ])
})

onMounted(async () => {
  await Promise.all([
    fetchRiskRulesData(),
    fetchKafkaSubscriptionsData(),
  ])
  startKafkaSubscriptionsPolling()
})

onBeforeUnmount(() => {
  if (subscriptionsPollingTimer) {
    window.clearInterval(subscriptionsPollingTimer)
    subscriptionsPollingTimer = null
  }
  header.clearActions()
})
</script>

<template>
  <section class="app-screen risk-rules-page">
    <header class="risk-rules-page__header">
      <div class="risk-rules-page__headline">
        <div class="risk-rules-page__headline-copy">
          <div class="risk-rules-page__eyebrow">{{ content.eyebrow }}</div>
          <h2 class="risk-rules-page__title">{{ content.title }}</h2>
        </div>
        <button class="page-button page-button--primary risk-rules-page__create-button" type="button">
          {{ content.createLabel }}
        </button>
      </div>
    </header>

    <section class="risk-rules-page__metrics">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        :class="['risk-rules-metric', `is-${metric.tone}`]"
      >
        <span class="risk-rules-metric__label">{{ metric.label }}</span>
        <strong class="risk-rules-metric__value">{{ metric.value }}</strong>
        <span class="risk-rules-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="risk-rules-page__filter">
      <label class="risk-rules-page__search">
        <span>⌕</span>
        <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
      </label>
      <div class="risk-rules-page__tabs">
        <button
          v-for="tab in content.tabs"
          :key="tab"
          :class="['risk-rules-page__tab', { 'is-active': selectedTab === tab }]"
          type="button"
          @click="selectedTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <article class="risk-rules-sheet">
      <div class="risk-rules-sheet__head">
        <span class="risk-rules-sheet__title">{{ content.rulesTitle }}</span>
        <span class="risk-rules-sheet__count">{{ search.trim() || selectedTab !== content.tabs[0] ? filteredRules.length : totalRuleCount }}</span>
      </div>
      <div v-if="isInitialRulesLoading" class="risk-rules-empty-state">
        <strong>{{ content.loadingRules }}</strong>
      </div>
      <div v-else-if="rulesErrorMessage" class="risk-rules-empty-state is-error">
        <strong>{{ rulesErrorMessage }}</strong>
        <span>{{ content.loadErrorHint }}</span>
      </div>
      <div v-else-if="filteredRules.length === 0" class="risk-rules-empty-state">
        <strong>{{ content.emptyRules }}</strong>
        <span>{{ content.emptyRulesHint }}</span>
      </div>
      <div v-else class="risk-rules-table-shell">
        <div class="risk-rules-table">
        <div class="risk-rules-table__row risk-rules-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        <div
          v-for="rule in filteredRules"
          :key="rule.id"
          :class="['risk-rules-table__row', `is-${rule.rowTone}`]"
        >
          <span class="risk-rules-table__code">{{ rule.id }}</span>
          <span class="risk-rules-table__primary risk-rules-table__primary--wide">{{ rule.name }}</span>
          <span class="risk-rules-table__topic"><i class="risk-rules-chip risk-rules-chip--topic">{{ rule.topic }}</i></span>
          <span class="risk-rules-table__condition">{{ rule.condition }}</span>
          <span :class="['risk-rules-table__threshold', 'risk-rules-table__threshold--wide', `is-${rule.thresholdTone}`]">{{ rule.threshold }}</span>
          <span>{{ rule.triggered }}</span>
          <span>
            <button
              :class="['risk-rules-toggle', { 'is-on': rule.active }]"
              type="button"
              :disabled="isTogglingRuleId === rule.id"
              @click="handleToggleRule(rule.id, !rule.active)"
            />
          </span>
          <span>
            <i :class="['risk-rules-chip', `is-${rule.severityTone}`]">{{ rule.severity }}</i>
          </span>
        </div>
      </div>
      </div>
    </article>
    <div v-if="!rulesErrorMessage && totalPages > 1" class="risk-rules-pagination">
      <button
        class="page-button page-button--secondary risk-rules-pagination__button"
        type="button"
        :disabled="currentPage === 0 || isLoadingRules"
        @click="goToPreviousPage"
      >
        &lt;
      </button>
      <span class="risk-rules-pagination__status">
        {{ content.pageStatus(currentPage + 1, totalPages) }}
      </span>
      <button
        class="page-button page-button--secondary risk-rules-pagination__button"
        type="button"
        :disabled="currentPage >= totalPages - 1 || isLoadingRules"
        @click="goToNextPage"
      >
        &gt;
      </button>
    </div>

    <article class="risk-rules-sheet">
      <div class="risk-rules-sheet__head">
        <span class="risk-rules-sheet__title">{{ content.topicTitle }}</span>
      </div>
      <div v-if="isInitialTopicsLoading" class="risk-rules-empty-state">
        <strong>{{ content.loadingTopics }}</strong>
      </div>
      <div v-else-if="topicsErrorMessage" class="risk-rules-empty-state is-error">
        <strong>{{ topicsErrorMessage }}</strong>
        <span>{{ content.loadErrorHint }}</span>
      </div>
      <div v-else-if="kafkaTopics.length === 0" class="risk-rules-empty-state">
        <strong>{{ content.emptyTopics }}</strong>
        <span>{{ content.emptyTopicsHint }}</span>
      </div>
      <div v-else class="risk-rules-table risk-rules-table--topics">
        <div class="risk-rules-table__row risk-rules-table__row--head">
          <span v-for="column in content.topicColumns" :key="column">{{ column }}</span>
        </div>
        <div v-for="topic in kafkaTopics" :key="topic.topic" class="risk-rules-table__row is-nominal">
          <span class="risk-rules-table__primary risk-rules-table__primary--wide">{{ topic.topic }}</span>
          <span>{{ topic.partitions }}</span>
          <span class="risk-rules-table__code">{{ topic.offset }}</span>
          <span>{{ topic.rate }}</span>
          <span><i :class="['risk-rules-chip', `is-${topic.brokerTone}`]">{{ topic.brokerStatus }}</i></span>
          <span><i :class="['risk-rules-chip', `is-${topic.consumerTone}`]">{{ topic.consumerStatus }}</i></span>
        </div>
      </div>
    </article>
  </section>
</template>
