<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect, onMounted } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { getExpiringCertificates } from '../../../services/certificate'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '문서 / 인증',
    title: '인증서 관리',
    subtitle: '협력사 인증서 유효성과 갱신 상태를 중앙에서 관리합니다.',
    metrics: [
      { label: '유효 인증서', value: '84', meta: '활성', tone: 'nominal' },
      { label: '만료 임박', value: '6', meta: '30일 이내', tone: 'critical' },
      { label: '갱신 필요', value: '4', meta: '만료됨', tone: 'warning' },
      { label: '협력사 수', value: '18', meta: '등록 업체', tone: 'info' },
    ],
    tabs: ['전체', '유효', '만료 임박', '만료됨'],
    searchPlaceholder: '협력사, 인증 유형 검색...',
    tableTitle: '인증서 목록',
    exportLabel: '내보내기',
    createLabel: '인증서 등록',
    columns: ['인증서 ID', '협력사', '인증 유형', '발급 기관', '발급일', '만료일', '남은 일수', '상태'],
  },
  en: {
    eyebrow: 'Documents / Certificates',
    title: 'Certificates',
    subtitle: 'Manage supplier certificate validity and renewal status from one control point.',
    metrics: [
      { label: 'VALID CERTS', value: '84', meta: 'ACTIVE', tone: 'nominal' },
      { label: 'EXPIRING SOON', value: '6', meta: 'WITHIN 30 DAYS', tone: 'critical' },
      { label: 'RENEWAL NEEDED', value: '4', meta: 'ALREADY EXPIRED', tone: 'warning' },
      { label: 'SUPPLIERS', value: '18', meta: 'REGISTERED', tone: 'info' },
    ],
    tabs: ['ALL', 'VALID', 'EXPIRING SOON', 'EXPIRED'],
    searchPlaceholder: 'Search supplier or certificate type...',
    tableTitle: 'Certificate Registry',
    exportLabel: 'EXPORT',
    createLabel: 'ADD CERTIFICATE',
    columns: ['CERT ID', 'SUPPLIER', 'TYPE', 'ISSUER', 'ISSUED', 'EXPIRES', 'DAYS LEFT', 'STATUS'],
  },
}

const ROWS = {
  ko: [
    ['CRT-0041', '한국식품(주)', 'ISO 22000', '한국인정원', '2023-04', '2026-04', '+365일', '유효'],
    ['CRT-0040', '한국식품(주)', 'HACCP', '식약처', '2022-08', '2024-05', '+28일', '만료 임박'],
    ['CRT-0039', '글로벌푸드', 'ISO 9001', 'KR인증', '2023-01', '2026-01', '+270일', '유효'],
    ['CRT-0038', '글로벌푸드', 'ESG 인증', '한국ESG원', '2023-06', '2024-06', '+60일', '만료 임박'],
    ['CRT-0036', '농협유통', 'HACCP', '식약처', '2021-09', '2024-03', '만료', '만료됨'],
  ],
  en: [
    ['CRT-0041', 'KOREA FOODS', 'ISO 22000', 'KOR ACCREDITATION', '2023-04', '2026-04', '+365D', 'VALID'],
    ['CRT-0040', 'KOREA FOODS', 'HACCP', 'MFDS', '2022-08', '2024-05', '+28D', 'EXPIRING'],
    ['CRT-0039', 'GLOBAL FOODS', 'ISO 9001', 'KR CERT', '2023-01', '2026-01', '+270D', 'VALID'],
    ['CRT-0038', 'GLOBAL FOODS', 'ESG CERT', 'KOREA ESG', '2023-06', '2024-06', '+60D', 'EXPIRING'],
    ['CRT-0036', 'NH DISTRIBUTION', 'HACCP', 'MFDS', '2021-09', '2024-03', 'EXPIRED', 'EXPIRED'],
  ],
}

const rows = computed(() => ROWS[preferences.language])
const search = ref('')
const activeTab = ref<string>(CONTENT[preferences.language].tabs[0])
const expiringCount = ref<number | null>(null) // null means loading or fallback to default

const content = computed(() => {
  const base = CONTENT[preferences.language]
  return {
    ...base,
    metrics: base.metrics.map(m => {
      if ((m.label === '만료 임박' || m.label === 'EXPIRING SOON') && expiringCount.value !== null) {
        return { ...m, value: String(expiringCount.value) }
      }
      return m
    })
  }
})

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const status = activeTab.value
  return rows.value.filter((row) => {
    const textMatch = !query || row.some((cell) => cell.toLowerCase().includes(query))
    if (!textMatch) return false
    if (status === '전체' || status === 'ALL') return true
    return row[7] === status
  })
})

onMounted(async () => {
  try {
    const expiring = await getExpiringCertificates()
    expiringCount.value = expiring.length || 6 // Fallback to dummy if empty or mocked
  } catch (e) {
    console.error('Failed to fetch expiring certs:', e)
  }
})

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'cert-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'cert-create', label: content.value.createLabel, tone: 'primary' },
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
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.createLabel }}</button>
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
        <div><div class="page-panel__eyebrow">CERTS</div><h3>{{ content.tableTitle }}</h3></div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>
      <div class="page-table terminal-page__table is-eight-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        <div v-for="row in filteredRows" :key="row[0]" class="page-table__row">
          <span v-for="cell in row" :key="cell">{{ cell }}</span>
        </div>
      </div>
    </article>
  </section>
</template>
