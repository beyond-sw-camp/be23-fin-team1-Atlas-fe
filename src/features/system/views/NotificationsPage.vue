<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '시스템 / 알림',
    title: '알림 센터',
    subtitle: '경보, 시스템 이벤트, 사용자 알림을 채널별로 추적합니다.',
    metrics: [
      { label: '미읽음', value: '5건', meta: '즉시 확인 필요', tone: 'critical' },
      { label: '오늘 수신', value: '24건', meta: '전체 채널', tone: 'nominal' },
      { label: 'WebSocket', value: '연결됨', meta: 'STOMP 활성', tone: 'info' },
      { label: '알림 채널', value: '3개', meta: '이메일, 앱, SMS', tone: 'nominal' },
    ],
    tabs: ['전체', '미읽음', '리스크', '시스템'],
    searchPlaceholder: '알림 내용, 유형 검색...',
    tableTitle: '알림 목록',
    channelsTitle: '알림 채널 설정',
    socketTitle: '실시간 연결 상태',
    readAllLabel: '전체 읽음',
    exportLabel: '내보내기',
    columns: ['수신 시각', '유형', '내용', '채널', '읽음', '심각도'],
  },
  en: {
    eyebrow: 'System / Notifications',
    title: 'Notification Center',
    subtitle: 'Track alerts, system events, and operator notifications across channels.',
    metrics: [
      { label: 'UNREAD', value: '5', meta: 'REQUIRES ATTENTION', tone: 'critical' },
      { label: 'TODAY', value: '24', meta: 'ALL CHANNELS', tone: 'nominal' },
      { label: 'WEBSOCKET', value: 'ONLINE', meta: 'STOMP ACTIVE', tone: 'info' },
      { label: 'CHANNELS', value: '3', meta: 'EMAIL, APP, SMS', tone: 'nominal' },
    ],
    tabs: ['ALL', 'UNREAD', 'RISK', 'SYSTEM'],
    searchPlaceholder: 'Search notification or type...',
    tableTitle: 'Notifications',
    channelsTitle: 'Alert Channels',
    socketTitle: 'Realtime Socket Status',
    readAllLabel: 'MARK ALL READ',
    exportLabel: 'EXPORT',
    columns: ['TIME', 'TYPE', 'CONTENT', 'CHANNEL', 'READ', 'SEVERITY'],
  },
}

const ROWS = {
  ko: [
    ['09:14:22', '리스크 이벤트', '한국식품 원자재 부족 임계치 도달', '앱+이메일', '미읽음', '긴급'],
    ['09:08:15', '리스크 이벤트', '글로벌푸드 부산항 통관 지연 +48h', '앱+SMS', '미읽음', '높음'],
    ['08:52:30', '품질 경보', 'LOT-0812 품질 기준 미달 — 검수 필요', '이메일', '미읽음', '높음'],
    ['08:31:00', 'ESG 알림', '대한농산 환경 기준 위반 감지', '앱', '미읽음', '보통'],
    ['07:22:05', '시스템', 'Kafka topic 처리량 증가 감지', '시스템', '읽음', '정보'],
  ],
  en: [
    ['09:14:22', 'RISK EVENT', 'Korea Foods raw material threshold reached', 'APP+EMAIL', 'UNREAD', 'CRITICAL'],
    ['09:08:15', 'RISK EVENT', 'Global Foods customs delay +48h at Busan port', 'APP+SMS', 'UNREAD', 'HIGH'],
    ['08:52:30', 'QUALITY', 'LOT-0812 quality threshold failed — review required', 'EMAIL', 'UNREAD', 'HIGH'],
    ['08:31:00', 'ESG ALERT', 'Daehan Agri environmental violation detected', 'APP', 'UNREAD', 'MEDIUM'],
    ['07:22:05', 'SYSTEM', 'Kafka topic throughput spike detected', 'SYSTEM', 'READ', 'INFO'],
  ],
}

const channels = reactive([
  { key: 'app', label: { ko: '앱 내 알림', en: 'In-app alerts' }, enabled: true },
  { key: 'email', label: { ko: '이메일 알림', en: 'Email alerts' }, enabled: true },
  { key: 'sms', label: { ko: 'SMS 긴급 알림', en: 'SMS critical alerts' }, enabled: true },
  { key: 'slack', label: { ko: 'Slack 연동', en: 'Slack integration' }, enabled: true },
])

const SOCKETS = [
  ['supplier_issue', '124'],
  ['shipment_delayed', '280'],
  ['quality_issue', '88'],
  ['esg_alert', '32'],
]

const content = computed(() => CONTENT[preferences.language])
const rows = computed(() => ROWS[preferences.language])
const localizedChannels = computed(() => channels.map((channel) => ({ ...channel, text: channel.label[preferences.language] })))
const search = ref('')
const activeTab = ref<string>(content.value.tabs[0])

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const tab = activeTab.value
  return rows.value.filter((row) => {
    const textMatch = !query || row.some((cell) => cell.toLowerCase().includes(query))
    if (!textMatch) return false
    if (tab === '전체' || tab === 'ALL') return true
    if (tab === '미읽음' || tab === 'UNREAD') return row[4] === '미읽음' || row[4] === 'UNREAD'
    if (tab === '리스크' || tab === 'RISK') return row[1] !== '시스템' && row[1] !== 'SYSTEM'
    return row[1] === '시스템' || row[1] === 'SYSTEM'
  })
})

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'notifications-read', label: content.value.readAllLabel, tone: 'secondary' },
    { key: 'notifications-export', label: content.value.exportLabel, tone: 'secondary' },
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
        <p class="terminal-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.readAllLabel }}</button>
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
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
            <div><div class="page-panel__eyebrow">QUEUE</div><h3>{{ content.tableTitle }}</h3></div>
            <span class="page-panel__chip">{{ filteredRows.length }}</span>
          </div>
          <div class="page-table terminal-page__table is-six-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>
            <div v-for="row in filteredRows" :key="`${row[0]}-${row[2]}`" class="page-table__row">
              <span v-for="cell in row" :key="cell">{{ cell }}</span>
            </div>
          </div>
        </article>
      </div>

      <aside class="terminal-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">CHANNELS</div><h3>{{ content.channelsTitle }}</h3></div>
          </div>
          <div class="page-feed">
            <div v-for="channel in localizedChannels" :key="channel.key" class="page-feed__item terminal-page__toggle-item">
              <strong class="page-feed__text">{{ channel.text }}</strong>
              <button :class="['risk-rules-toggle', { 'is-on': channel.enabled }]" type="button" @click="channel.enabled = !channel.enabled" />
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">SOCKET</div><h3>{{ content.socketTitle }}</h3></div>
          </div>
          <div class="page-feed">
            <div v-for="[topic, rate] in SOCKETS" :key="topic" class="page-feed__item">
              <span class="page-feed__label">{{ topic }}</span>
              <strong class="page-feed__text">{{ rate }} msg/min</strong>
              <span>LIVE</span>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>
</template>
