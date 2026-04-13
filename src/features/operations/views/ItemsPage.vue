<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 품목 관리',
    title: '품목 관리',
    subtitle: 'SKU, 재고 임계치, 재발주 지점을 운영 테이블로 관리합니다.',
    metrics: [
      { label: '총 품목', value: '482', meta: '등록 SKU', tone: 'nominal' },
      { label: '재고 부족', value: '14', meta: '임계치 이하', tone: 'critical' },
      { label: '발주 대기', value: '28', meta: '재발주 필요', tone: 'warning' },
      { label: '금일 입고', value: '1,240', meta: '단위', tone: 'info' },
    ],
    tabs: ['전체', '곡류', '채소', '육류', '가공품', '부족 재고'],
    searchPlaceholder: '품목명, SKU 코드 검색...',
    tableTitle: '품목 목록',
    exportLabel: '내보내기',
    bulkLabel: '일괄 등록',
    createLabel: '품목 등록',
    columns: ['SKU 코드', '품목명', '카테고리', '단위', '현재고', '안전재고', '재발주점', '주 협력사', '상태'],
  },
  en: {
    eyebrow: 'Supply Chain Ops / Items',
    title: 'Items',
    subtitle: 'Operate SKUs, stock thresholds, and reorder points in a single inventory table.',
    metrics: [
      { label: 'TOTAL ITEMS', value: '482', meta: 'REGISTERED SKUS', tone: 'nominal' },
      { label: 'LOW STOCK', value: '14', meta: 'BELOW THRESHOLD', tone: 'critical' },
      { label: 'REORDER QUEUE', value: '28', meta: 'PO REQUIRED', tone: 'warning' },
      { label: 'INBOUND TODAY', value: '1,240', meta: 'UNITS', tone: 'info' },
    ],
    tabs: ['ALL', 'GRAINS', 'VEGETABLES', 'MEAT', 'PROCESSED', 'LOW STOCK'],
    searchPlaceholder: 'Search item name or SKU...',
    tableTitle: 'Item Inventory',
    exportLabel: 'EXPORT',
    bulkLabel: 'BULK UPLOAD',
    createLabel: 'ADD ITEM',
    columns: ['SKU', 'ITEM', 'CATEGORY', 'UNIT', 'STOCK', 'SAFETY', 'REORDER', 'SUPPLIER', 'STATUS'],
  },
}

const ITEMS = {
  ko: [
    ['SKU-0001', '쌀 (백미)', '곡류', 'kg', '1,200', '2,000', '2,500', '한국식품', '부족'],
    ['SKU-0002', '밀가루 (중력분)', '곡류', 'kg', '3,800', '2,000', '2,500', '한국식품', '정상'],
    ['SKU-0003', '배추', '채소', '포기', '420', '800', '1,000', '대한농산', '부족'],
    ['SKU-0004', '무', '채소', '개', '1,100', '800', '1,000', '대한농산', '정상'],
    ['SKU-0005', '돼지고기 (삼겹)', '육류', 'kg', '680', '500', '700', '농협유통', '주의'],
    ['SKU-0006', '닭고기', '육류', 'kg', '1,420', '800', '1,000', '농협유통', '정상'],
    ['SKU-0007', '식용유', '가공품', 'L', '340', '500', '600', '(주)청정원', '부족'],
    ['SKU-0008', '간장', '가공품', 'L', '920', '400', '500', '(주)청정원', '정상'],
  ],
  en: [
    ['SKU-0001', 'Rice (White)', 'GRAINS', 'kg', '1,200', '2,000', '2,500', 'KOREA FOODS', 'LOW'],
    ['SKU-0002', 'Flour (Medium)', 'GRAINS', 'kg', '3,800', '2,000', '2,500', 'KOREA FOODS', 'OK'],
    ['SKU-0003', 'Cabbage', 'VEGETABLES', 'head', '420', '800', '1,000', 'DAEHAN AGRI', 'LOW'],
    ['SKU-0004', 'Radish', 'VEGETABLES', 'unit', '1,100', '800', '1,000', 'DAEHAN AGRI', 'OK'],
    ['SKU-0005', 'Pork Belly', 'MEAT', 'kg', '680', '500', '700', 'NH DISTRIBUTION', 'WARN'],
    ['SKU-0006', 'Chicken', 'MEAT', 'kg', '1,420', '800', '1,000', 'NH DISTRIBUTION', 'OK'],
    ['SKU-0007', 'Cooking Oil', 'PROCESSED', 'L', '340', '500', '600', 'CHEONGJEONGWON', 'LOW'],
    ['SKU-0008', 'Soy Sauce', 'PROCESSED', 'L', '920', '400', '500', 'CHEONGJEONGWON', 'OK'],
  ],
}

const content = computed(() => CONTENT[preferences.language])
const rows = computed(() => ITEMS[preferences.language])
const search = ref('')
const activeTab = ref<string>(content.value.tabs[0])

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const category = activeTab.value

  return rows.value.filter((row) => {
    const textMatch = !query || row.some((cell) => cell.toLowerCase().includes(query))
    if (!textMatch) return false
    if (category === '전체' || category === 'ALL') return true
    if (category === '부족 재고' || category === 'LOW STOCK') return row[8] === '부족' || row[8] === 'LOW'
    return row[2] === category
  })
})

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'items-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'items-bulk', label: content.value.bulkLabel, tone: 'secondary' },
    { key: 'items-create', label: content.value.createLabel, tone: 'primary' },
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
        <button class="page-button page-button--secondary" type="button">{{ content.bulkLabel }}</button>
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
        <div>
          <div class="page-panel__eyebrow">INVENTORY</div>
          <h3>{{ content.tableTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>
      <div class="page-table terminal-page__table is-nine-cols">
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
