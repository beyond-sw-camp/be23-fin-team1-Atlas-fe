<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    title: '리스크 규칙 관리',
    eyebrow: '시스템 / 리스크 규칙',
    metrics: [
      { label: '활성 규칙', value: '24건', meta: '적용 중', tone: 'nominal' },
      { label: '비활성', value: '6건', meta: '검토 대기', tone: 'warning' },
      { label: '오늘 발동', value: '12건', meta: '이벤트 생성', tone: 'info' },
      { label: 'Kafka 토픽', value: '5', meta: '구독 중', tone: 'nominal' },
    ],
    searchPlaceholder: '규칙명, 이벤트 유형 검색...',
    tabs: ['전체', '활성', '비활성'],
    rulesTitle: '리스크 규칙 목록',
    topicTitle: 'Kafka 토픽 구독 현황',
    exportLabel: '내보내기',
    createLabel: '규칙 추가',
    columns: ['규칙 ID', '규칙 명', 'Kafka 토픽', '조건', '임계값', '발동 횟수', '활성화', '심각도'],
    topicColumns: ['토픽 이름', '파티션', '오프셋', '메시지/h', '상태'],
  },
  en: {
    title: 'Risk Rules Control',
    eyebrow: 'System / Risk Rules',
    metrics: [
      { label: 'ACTIVE RULES', value: '24', meta: 'ENFORCED', tone: 'nominal' },
      { label: 'DISABLED', value: '6', meta: 'PENDING REVIEW', tone: 'warning' },
      { label: 'TRIGGERED TODAY', value: '12', meta: 'EVENTS EMITTED', tone: 'info' },
      { label: 'KAFKA TOPICS', value: '5', meta: 'SUBSCRIBED', tone: 'nominal' },
    ],
    searchPlaceholder: 'Search rule name or event type...',
    tabs: ['ALL', 'ACTIVE', 'DISABLED'],
    rulesTitle: 'RISK RULES',
    topicTitle: 'KAFKA TOPIC SUBSCRIPTIONS',
    exportLabel: 'EXPORT',
    createLabel: 'ADD RULE',
    columns: ['RULE ID', 'RULE NAME', 'KAFKA TOPIC', 'CONDITION', 'THRESHOLD', 'TRIGGERED', 'ACTIVE', 'SEVERITY'],
    topicColumns: ['TOPIC NAME', 'PARTITIONS', 'OFFSET', 'MSG/H', 'STATUS'],
  },
}

type Rule = {
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
}

const content = computed(() => CONTENT[preferences.language])
const search = ref('')
const selectedTab = ref<string>(content.value.tabs[0])
const rules = reactive<Rule[]>([
  {
    id: 'RUL-001',
    name: '납기 임계 초과 감지',
    topic: 'shipment_delayed',
    condition: '지연 시간 ≥',
    threshold: '24h',
    thresholdTone: 'warning',
    triggered: '18회',
    active: true,
    severity: '높음',
    severityTone: 'warning',
    rowTone: 'warning',
  },
  {
    id: 'RUL-002',
    name: '재고 부족 경보',
    topic: 'supplier_issue',
    condition: '재고율 ≤',
    threshold: '20%',
    thresholdTone: 'critical',
    triggered: '8회',
    active: true,
    severity: '긴급',
    severityTone: 'error',
    rowTone: 'critical',
  },
  {
    id: 'RUL-003',
    name: '품질 기준 미달 감지',
    topic: 'quality_issue',
    condition: '품질 점수 <',
    threshold: '70pt',
    thresholdTone: 'warning',
    triggered: '5회',
    active: true,
    severity: '높음',
    severityTone: 'warning',
    rowTone: 'warning',
  },
  {
    id: 'RUL-004',
    name: 'ESG 위반 알림',
    topic: 'esg_alert',
    condition: 'ESG 점수 <',
    threshold: '60pt',
    thresholdTone: 'warning',
    triggered: '3회',
    active: true,
    severity: '보통',
    severityTone: 'info',
    rowTone: 'nominal',
  },
  {
    id: 'RUL-005',
    name: '창고 용량 초과',
    topic: 'capacity_shortage',
    condition: '용량 ≥',
    threshold: '85%',
    thresholdTone: 'warning',
    triggered: '7회',
    active: true,
    severity: '보통',
    severityTone: 'info',
    rowTone: 'nominal',
  },
  {
    id: 'RUL-006',
    name: '연속 납기 실패 감지',
    topic: 'shipment_delayed',
    condition: '연속 실패 ≥',
    threshold: '3회',
    thresholdTone: 'critical',
    triggered: '2회',
    active: true,
    severity: '긴급',
    severityTone: 'error',
    rowTone: 'critical',
  },
  {
    id: 'RUL-007',
    name: '협력사 점수 급락 감지',
    topic: 'supplier_issue',
    condition: '점수 변화 ≥',
    threshold: '−10pt',
    thresholdTone: 'critical',
    triggered: '4회',
    active: true,
    severity: '높음',
    severityTone: 'warning',
    rowTone: 'warning',
  },
  {
    id: 'RUL-008',
    name: 'LOT 유통기한 만료 임박',
    topic: 'quality_issue',
    condition: '남은 일수 ≤',
    threshold: '7일',
    thresholdTone: 'warning',
    triggered: '12회',
    active: false,
    severity: '보통',
    severityTone: 'info',
    rowTone: 'nominal',
  },
])

const kafkaTopics = computed(() =>
  preferences.language === 'ko'
    ? [
        { topic: 'supplier_issue', partitions: 3, offset: '0x00F4A2', rate: '124', status: '구독 중' },
        { topic: 'shipment_delayed', partitions: 3, offset: '0x00E8B1', rate: '280', status: '구독 중' },
        { topic: 'quality_issue', partitions: 2, offset: '0x007C33', rate: '88', status: '구독 중' },
        { topic: 'esg_alert', partitions: 2, offset: '0x002A10', rate: '32', status: '구독 중' },
        { topic: 'capacity_shortage', partitions: 2, offset: '0x004B88', rate: '56', status: '구독 중' },
      ]
    : [
        { topic: 'supplier_issue', partitions: 3, offset: '0x00F4A2', rate: '124', status: 'SUBSCRIBED' },
        { topic: 'shipment_delayed', partitions: 3, offset: '0x00E8B1', rate: '280', status: 'SUBSCRIBED' },
        { topic: 'quality_issue', partitions: 2, offset: '0x007C33', rate: '88', status: 'SUBSCRIBED' },
        { topic: 'esg_alert', partitions: 2, offset: '0x002A10', rate: '32', status: 'SUBSCRIBED' },
        { topic: 'capacity_shortage', partitions: 2, offset: '0x004B88', rate: '56', status: 'SUBSCRIBED' },
      ],
)

const filteredRules = computed(() => {
  const query = search.value.trim().toLowerCase()
  const activeTab = selectedTab.value
  let items = rules

  if (query) {
    items = items.filter((rule) => rule.name.toLowerCase().includes(query) || rule.topic.toLowerCase().includes(query))
  }

  if (activeTab === '활성' || activeTab === 'ACTIVE') {
    return items.filter((rule) => rule.active)
  }

  if (activeTab === '비활성' || activeTab === 'DISABLED') {
    return items.filter((rule) => !rule.active)
  }

  return items
})

watchEffect(() => {
  selectedTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'risk-rules-export', label: preferences.language === 'ko' ? '내보내기' : 'EXPORT', tone: 'secondary' },
    { key: 'risk-rules-add', label: preferences.language === 'ko' ? '규칙 추가' : 'ADD RULE', tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen risk-rules-page">
    <header class="risk-rules-page__header">
      <div>
        <div class="risk-rules-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="risk-rules-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.createLabel }}</button>
      </div>
    </header>

    <section class="risk-rules-page__metrics">
      <article
        v-for="metric in content.metrics"
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
        <span class="risk-rules-sheet__count">{{ filteredRules.length }}</span>
      </div>
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
          <span class="risk-rules-table__primary">{{ rule.name }}</span>
          <span><i class="risk-rules-chip">{{ rule.topic }}</i></span>
          <span>{{ rule.condition }}</span>
          <span :class="['risk-rules-table__threshold', `is-${rule.thresholdTone}`]">{{ rule.threshold }}</span>
          <span>{{ rule.triggered }}</span>
          <span>
            <button :class="['risk-rules-toggle', { 'is-on': rule.active }]" type="button" @click="rule.active = !rule.active" />
          </span>
          <span>
            <i :class="['risk-rules-chip', `is-${rule.severityTone}`]">{{ rule.severity }}</i>
          </span>
        </div>
      </div>
    </article>

    <article class="risk-rules-sheet">
      <div class="risk-rules-sheet__head">
        <span class="risk-rules-sheet__title">{{ content.topicTitle }}</span>
      </div>
      <div class="risk-rules-table risk-rules-table--topics">
        <div class="risk-rules-table__row risk-rules-table__row--head">
          <span v-for="column in content.topicColumns" :key="column">{{ column }}</span>
        </div>
        <div v-for="topic in kafkaTopics" :key="topic.topic" class="risk-rules-table__row is-nominal">
          <span class="risk-rules-table__primary">{{ topic.topic }}</span>
          <span>{{ topic.partitions }}</span>
          <span class="risk-rules-table__code">{{ topic.offset }}</span>
          <span>{{ topic.rate }}</span>
          <span><i class="risk-rules-chip is-success">{{ topic.status }}</i></span>
        </div>
      </div>
    </article>
  </section>
</template>
