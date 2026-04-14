<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { BaseModal, useModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { updateLotStatus, updateLotQuality } from '../../../services/lot'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / Lot & 출하 관리',
    title: 'Lot / 출하 관리',
    subtitle: 'Lot 이력과 검수, 출하 상태를 단일 운영 화면에서 추적합니다.',
    metrics: [
      { label: '활성 Lot', value: '142', meta: '추적 중', tone: 'nominal' },
      { label: '품질 보류', value: '3', meta: '검수 대기', tone: 'critical' },
      { label: '금일 출하', value: '28', meta: '건', tone: 'info' },
      { label: '금일 입고', value: '41', meta: '건', tone: 'nominal' },
    ],
    tabs: ['전체', '입고', '출하', '품질 보류', '폐기'],
    searchPlaceholder: 'Lot 번호, 품목, 협력사 검색...',
    tableTitle: 'Lot 이력',
    timelineTitle: 'LOT-2024-0812 추적',
    qualityTitle: '검수 결과 요약',
    exportLabel: '내보내기',
    createLabel: 'Lot 등록',
    columns: ['Lot 번호', '품목명', '협력사', '수량', '입고일', '유통기한', '검수 결과', '상태', '상세'],
    detailLabel: '상세보기',
  },
  en: {
    eyebrow: 'Supply Chain Ops / Lot & Shipment',
    title: 'Lots',
    subtitle: 'Track lot history, inspection, and outbound state in one operating console.',
    metrics: [
      { label: 'ACTIVE LOTS', value: '142', meta: 'TRACKED', tone: 'nominal' },
      { label: 'QUALITY HOLD', value: '3', meta: 'AWAITING REVIEW', tone: 'critical' },
      { label: 'OUTBOUND TODAY', value: '28', meta: 'CASES', tone: 'info' },
      { label: 'INBOUND TODAY', value: '41', meta: 'CASES', tone: 'nominal' },
    ],
    tabs: ['ALL', 'INBOUND', 'OUTBOUND', 'QUALITY HOLD', 'DISPOSAL'],
    searchPlaceholder: 'Search lot, item, or supplier...',
    tableTitle: 'Lot Timeline',
    timelineTitle: 'LOT-2024-0812 TRACE',
    qualityTitle: 'Inspection Summary',
    exportLabel: 'EXPORT',
    createLabel: 'ADD LOT',
    columns: ['LOT', 'ITEM', 'SUPPLIER', 'QTY', 'INBOUND', 'EXPIRY', 'INSPECTION', 'STATUS', 'VIEW'],
    detailLabel: 'VIEW',
  },
}

const LOTS = {
  ko: [
    ['LOT-2024-0816', '쌀 (백미)', '한국식품', '1,200kg', '04-07', '2025-03', '합격', '입고'],
    ['LOT-2024-0815', '배추', '대한농산', '420포기', '04-07', '04-14', '진행 중', '입고'],
    ['LOT-2024-0814', '돼지고기', '농협유통', '680kg', '04-06', '04-10', '합격', '출하'],
    ['LOT-2024-0813', '식용유', '(주)청정원', '340L', '04-06', '2025-10', '합격', '보관'],
    ['LOT-2024-0812', '과일류 (사과)', 'FMK 식자재', '220kg', '04-05', '04-12', '불합격', '품질 보류'],
    ['LOT-2024-0810', '고추', 'FMK 식자재', '88kg', '04-04', '04-20', '불합격', '폐기'],
  ],
  en: [
    ['LOT-2024-0816', 'Rice (White)', 'KOREA FOODS', '1,200kg', '04-07', '2025-03', 'PASS', 'INBOUND'],
    ['LOT-2024-0815', 'Cabbage', 'DAEHAN AGRI', '420 heads', '04-07', '04-14', 'IN REVIEW', 'INBOUND'],
    ['LOT-2024-0814', 'Pork', 'NH DISTRIBUTION', '680kg', '04-06', '04-10', 'PASS', 'OUTBOUND'],
    ['LOT-2024-0813', 'Cooking Oil', 'CHEONGJEONGWON', '340L', '04-06', '2025-10', 'PASS', 'STORED'],
    ['LOT-2024-0812', 'Apples', 'FMK FOODS', '220kg', '04-05', '04-12', 'FAIL', 'QUALITY HOLD'],
    ['LOT-2024-0810', 'Pepper', 'FMK FOODS', '88kg', '04-04', '04-20', 'FAIL', 'DISPOSAL'],
  ],
}

const LOT_TIMELINES = {
  ko: {
    'LOT-2024-0816': [
      ['발주 등록', '04-01 09:20'],
      ['협력사 출하', '04-03 07:40'],
      ['물류센터 입고', '04-04 15:10'],
      ['검수 완료', '04-05 08:20'],
    ],
    'LOT-2024-0815': [
      ['발주 등록', '04-02 11:10'],
      ['협력사 출하', '04-05 06:50'],
      ['물류센터 입고', '04-07 14:10'],
      ['정밀 검수 진행 중', '04-07 16:30'],
    ],
    'LOT-2024-0814': [
      ['발주 등록', '04-01 08:30'],
      ['입고 확인', '04-04 10:20'],
      ['검수 완료', '04-05 09:00'],
      ['출하 시작', '04-06 08:30'],
    ],
    'LOT-2024-0813': [
      ['발주 등록', '04-01 14:00'],
      ['입고 완료', '04-04 10:10'],
      ['검수 통과', '04-05 09:10'],
      ['냉장 보관 전환', '04-06 07:50'],
    ],
    'LOT-2024-0812': [
      ['발주 등록', '04-02 10:00'],
      ['출하 시작', '04-04 08:30'],
      ['부산 물류센터 입고', '04-05 14:20'],
      ['초기 검수 이상 감지', '04-05 16:00'],
      ['정밀 검수 불합격', '04-06 09:00'],
      ['출하 보류 처리', '04-06 11:00'],
    ],
    'LOT-2024-0810': [
      ['발주 등록', '04-01 07:50'],
      ['입고 완료', '04-04 09:40'],
      ['검수 불합격', '04-05 13:10'],
      ['폐기 승인', '04-06 08:00'],
    ],
  },
  en: {
    'LOT-2024-0816': [
      ['PO REGISTERED', '04-01 09:20'],
      ['SUPPLIER OUTBOUND', '04-03 07:40'],
      ['HUB INBOUND', '04-04 15:10'],
      ['INSPECTION CLEARED', '04-05 08:20'],
    ],
    'LOT-2024-0815': [
      ['PO REGISTERED', '04-02 11:10'],
      ['SUPPLIER OUTBOUND', '04-05 06:50'],
      ['HUB INBOUND', '04-07 14:10'],
      ['LAB REVIEW ACTIVE', '04-07 16:30'],
    ],
    'LOT-2024-0814': [
      ['PO REGISTERED', '04-01 08:30'],
      ['INBOUND CONFIRMED', '04-04 10:20'],
      ['INSPECTION PASSED', '04-05 09:00'],
      ['OUTBOUND STARTED', '04-06 08:30'],
    ],
    'LOT-2024-0813': [
      ['PO REGISTERED', '04-01 14:00'],
      ['INBOUND COMPLETE', '04-04 10:10'],
      ['INSPECTION PASSED', '04-05 09:10'],
      ['COLD STORAGE SET', '04-06 07:50'],
    ],
    'LOT-2024-0812': [
      ['PO REGISTERED', '04-02 10:00'],
      ['OUTBOUND STARTED', '04-04 08:30'],
      ['BUSAN HUB INBOUND', '04-05 14:20'],
      ['INITIAL ANOMALY DETECTED', '04-05 16:00'],
      ['LAB INSPECTION FAILED', '04-06 09:00'],
      ['SHIPMENT BLOCKED', '04-06 11:00'],
    ],
    'LOT-2024-0810': [
      ['PO REGISTERED', '04-01 07:50'],
      ['INBOUND COMPLETE', '04-04 09:40'],
      ['INSPECTION FAILED', '04-05 13:10'],
      ['DISPOSAL APPROVED', '04-06 08:00'],
    ],
  },
}

const qualityRows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['합격', '87건', '74%'],
        ['조건부 합격', '9건', '8%'],
        ['불합격', '8건', '7%'],
        ['검수 중', '13건', '11%'],
      ]
    : [
        ['PASS', '87', '74%'],
        ['CONDITIONAL', '9', '8%'],
        ['FAIL', '8', '7%'],
        ['IN REVIEW', '13', '11%'],
      ],
)

const content = computed(() => CONTENT[preferences.language])
const rows = computed(() => LOTS[preferences.language])
const search = ref('')
const activeTab = ref<string>(content.value.tabs[0])
const { isOpen: traceOpen, payload: selectedLot, open: openTrace, close: closeTrace } = useModal<string[]>(false)

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

const traceTitle = computed(() => {
  if (!selectedLot.value) {
    return content.value.timelineTitle
  }

  return preferences.language === 'ko' ? `${selectedLot.value[0]} 추적` : `${selectedLot.value[0]} TRACE`
})

const traceRows = computed(() => {
  const lotId = selectedLot.value?.[0] ?? 'LOT-2024-0812'
  return LOT_TIMELINES[preferences.language][lotId as keyof (typeof LOT_TIMELINES)['ko']] ?? LOT_TIMELINES[preferences.language]['LOT-2024-0812']
})

function handleLotSelect(row: string[]) {
  openTrace(row)
}

function handleStatusUpdate(status: string) {
  if (!selectedLot.value) return
  const lotPublicId = selectedLot.value[0]
  updateLotStatus(lotPublicId, status).then(() => {
    alert(`Status updated to ${status}`)
  }).catch(e => {
    alert(`Failed to update status: ${e.message}`)
  })
}

function handleQualityUpdate(quality: string) {
  if (!selectedLot.value) return
  const lotPublicId = selectedLot.value[0]
  updateLotQuality(lotPublicId, quality).then(() => {
    alert(`Quality updated to ${quality}`)
  }).catch(e => {
    alert(`Failed to update quality: ${e.message}`)
  })
}

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'lots-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'lots-create', label: content.value.createLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page lots-page">
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

        <article class="page-panel lots-page__table-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">LOT TABLE</div>
              <h3>{{ content.tableTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredRows.length }}</span>
          </div>
          <div class="page-table terminal-page__table lots-page__table">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>
            <div v-for="row in filteredRows" :key="row[0]" class="page-table__row lots-page__row">
              <span v-for="cell in row" :key="cell">{{ cell }}</span>
              <span class="lots-page__action-cell">
                <button class="page-button page-button--secondary lots-page__detail-button" type="button" @click="handleLotSelect(row)">
                  {{ content.detailLabel }}
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <article class="page-panel lots-page__quality-panel">
      <div class="page-panel__head">
        <div><div class="page-panel__eyebrow">QUALITY</div><h3>{{ content.qualityTitle }}</h3></div>
      </div>
      <div class="page-feed">
        <div v-for="[label, value, width] in qualityRows" :key="label" class="page-feed__item">
          <span class="page-feed__label">{{ label }}</span>
          <strong class="page-feed__text">{{ value }}</strong>
          <div class="terminal-page__bar"><span :style="{ width }" /></div>
        </div>
      </div>
    </article>
  </section>

  <BaseModal
    v-model="traceOpen"
    :title="traceTitle"
    :description="preferences.language === 'ko' ? '선택한 Lot의 입고, 검수, 출하 이력을 시간 순서대로 확인합니다.' : 'Review inbound, inspection, and outbound events for the selected lot.'"
    size="sm"
    @close="closeTrace"
  >
    <div class="page-feed lots-page__trace-feed">
      <div v-for="[label, time] in traceRows" :key="`${time}-${label}`" class="page-feed__item">
        <span class="page-feed__label">{{ time }}</span>
        <strong class="page-feed__text">{{ label }}</strong>
      </div>
    </div>
    
    <div v-if="selectedLot" style="margin-top: 24px; display: flex; flex-direction: column; gap: 16px;">
      <div>
        <div style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 8px;">STATUS ACTION</div>
        <div style="display: flex; gap: 8px;">
          <button class="page-button page-button--secondary" type="button" @click="handleStatusUpdate('IN_PRODUCTION')">IN PRODUCTION</button>
          <button class="page-button page-button--secondary" type="button" @click="handleStatusUpdate('COMPLETED')">COMPLETED</button>
          <button class="page-button page-button--secondary" type="button" @click="handleStatusUpdate('SHIPPED')">SHIPPED</button>
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 8px;">QUALITY ACTION</div>
        <div style="display: flex; gap: 8px;">
          <button class="page-button page-button--secondary" style="border-color: var(--color-nominal)" type="button" @click="handleQualityUpdate('NORMAL')">PASS (NORMAL)</button>
          <button class="page-button page-button--secondary" style="border-color: var(--color-warning)" type="button" @click="handleQualityUpdate('HOLD')">HOLD</button>
          <button class="page-button page-button--secondary" style="border-color: var(--color-critical)" type="button" @click="handleQualityUpdate('DEFECTIVE')">DEFECTIVE</button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
