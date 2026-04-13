<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 협력사 관리',
    title: '협력사 관리',
    subtitle: '국가, 품목군, 납기, 품질 기준으로 협력사 포트폴리오를 운영합니다.',
    metrics: [
      { label: '총 협력사', value: '48', meta: '22개 국가', tone: 'nominal' },
      { label: '위험 협력사', value: '7', meta: '성과 이슈', tone: 'warning' },
      { label: '평균 납기 준수', value: '88%', meta: '최근 90일', tone: 'info' },
      { label: '평균 리드타임', value: '18일', meta: '글로벌 평균', tone: 'nominal' },
    ],
    tabs: ['전체', '활성', '위험', '검토 중'],
    searchPlaceholder: '협력사명, 국가, 품목군 검색...',
    exportLabel: '내보내기',
    createLabel: '협력사 등록',
    tableTitle: '협력사 레지스트리',
    columns: ['ID', '협력사', '국가', '카테고리', '리드타임', '납기율', '품질 점수', '발주 수', '누적 금액', '상태'],
    topTitle: '상위 성과 협력사',
    riskTitle: '주의 필요',
    regionTitle: '권역별 지출',
  },
  en: {
    eyebrow: 'Supply Chain Ops / Suppliers',
    title: 'Supplier Directory',
    subtitle: 'Operate supplier portfolio by country, category, lead time, and quality performance.',
    metrics: [
      { label: 'TOTAL SUPPLIERS', value: '48', meta: '22 COUNTRIES', tone: 'nominal' },
      { label: 'AT RISK', value: '7', meta: 'PERFORMANCE ISSUES', tone: 'warning' },
      { label: 'ON-TIME RATE', value: '88%', meta: 'ROLLING 90 DAYS', tone: 'info' },
      { label: 'AVG LEAD TIME', value: '18d', meta: 'GLOBAL AVG', tone: 'nominal' },
    ],
    tabs: ['ALL', 'ACTIVE', 'AT RISK', 'UNDER REVIEW'],
    searchPlaceholder: 'Search supplier, country, or category...',
    exportLabel: 'EXPORT',
    createLabel: 'ADD SUPPLIER',
    tableTitle: 'Supplier Registry',
    columns: ['ID', 'SUPPLIER', 'COUNTRY', 'CATEGORY', 'LEAD', 'ON-TIME', 'QUALITY', 'OPEN PO', 'SPEND', 'STATUS'],
    topTitle: 'Top Performers',
    riskTitle: 'Needs Attention',
    regionTitle: 'Spend by Region',
  },
}

const ROWS = {
  ko: [
    ['SUP-001', '실링크', '대만', '반도체', '28일', '71%', '62', '4', '₩42억', '위험'],
    ['SUP-002', '헬릭스 GmbH', '독일', '원자재', '18일', '78%', '74', '6', '₩18억', '위험'],
    ['SUP-003', '토레이', '일본', '복합재', '22일', '96%', '94', '3', '₩21억', '활성'],
    ['SUP-004', 'SKF Nordic', '스웨덴', '베어링', '12일', '98%', '97', '2', '₩6억', '활성'],
    ['SUP-005', '폭스콘', '대만', '전자', '35일', '91%', '88', '12', '₩89억', '활성'],
    ['SUP-006', '파커', '미국', '유압', '14일', '82%', '79', '5', '₩9억', '검토'],
  ],
  en: [
    ['SUP-001', 'SiLink Corp', 'Taiwan', 'Semiconductors', '28d', '71%', '62', '4', '$4.2M', 'AT RISK'],
    ['SUP-002', 'Helix GmbH', 'Germany', 'Raw Materials', '18d', '78%', '74', '6', '$1.8M', 'AT RISK'],
    ['SUP-003', 'Toray Industries', 'Japan', 'Composites', '22d', '96%', '94', '3', '$2.1M', 'ACTIVE'],
    ['SUP-004', 'SKF Nordic', 'Sweden', 'Bearings', '12d', '98%', '97', '2', '$0.6M', 'ACTIVE'],
    ['SUP-005', 'Foxconn', 'Taiwan', 'Electronics', '35d', '91%', '88', '12', '$8.9M', 'ACTIVE'],
    ['SUP-006', 'Parker', 'USA', 'Hydraulics', '14d', '82%', '79', '5', '$0.9M', 'UNDER REVIEW'],
  ],
}

const TOP_ROWS = {
  ko: [
    ['SKF Nordic', '스웨덴 · 베어링', '98%'],
    ['토레이', '일본 · 복합재', '96%'],
    ['폭스콘', '대만 · 전자', '91%'],
  ],
  en: [
    ['SKF Nordic', 'Sweden · Bearings', '98%'],
    ['Toray', 'Japan · Composites', '96%'],
    ['Foxconn', 'Taiwan · Electronics', '91%'],
  ],
}

const RISK_ROWS = {
  ko: [
    ['실링크', '전력 이슈로 생산량 -15%'],
    ['헬릭스 GmbH', '통관 지연으로 ETA 변동'],
    ['파커', '품질 편차 재검토 필요'],
  ],
  en: [
    ['SiLink', 'Output dropped 15% after power disruption'],
    ['Helix GmbH', 'Customs delay impacting ETA'],
    ['Parker', 'Quality variance requires review'],
  ],
}

const REGION_ROWS = {
  ko: [
    ['아시아 태평양', '₩142억', '100%'],
    ['유럽', '₩88억', '62%'],
    ['북미', '₩41억', '29%'],
  ],
  en: [
    ['Asia Pacific', '$14.2M', '100%'],
    ['Europe', '$8.8M', '62%'],
    ['North America', '$4.1M', '29%'],
  ],
}

const content = computed(() => CONTENT[preferences.language])
const rows = computed(() => ROWS[preferences.language])
const topRows = computed(() => TOP_ROWS[preferences.language])
const riskRows = computed(() => RISK_ROWS[preferences.language])
const regionRows = computed(() => REGION_ROWS[preferences.language])
const search = ref('')
const activeTab = ref<string>('ALL')

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const tab = activeTab.value
  return rows.value.filter((row) => {
    const matchesQuery = !query || row.some((cell) => cell.toLowerCase().includes(query))
    if (!matchesQuery) return false
    if (tab === '전체' || tab === 'ALL') return true
    if (tab === '활성' || tab === 'ACTIVE') return row[9] === '활성' || row[9] === 'ACTIVE'
    if (tab === '위험' || tab === 'AT RISK') return row[9] === '위험' || row[9] === 'AT RISK'
    return row[9] === '검토' || row[9] === 'UNDER REVIEW'
  })
})
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
            <div><div class="page-panel__eyebrow">SUPPLIER</div><h3>{{ content.tableTitle }}</h3></div>
            <span class="page-panel__chip">{{ filteredRows.length }}</span>
          </div>
          <div class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>
            <div v-for="row in filteredRows" :key="row[0]" class="page-table__row">
              <span v-for="cell in row" :key="cell">{{ cell }}</span>
            </div>
          </div>
        </article>
      </div>

      <aside class="terminal-page__aside">
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">TOP</div><h3>{{ content.topTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[name, meta, value] in topRows" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ meta }}</span>
              <strong class="page-feed__text">{{ name }}</strong>
              <span>{{ value }}</span>
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">WATCH</div><h3>{{ content.riskTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[name, reason] in riskRows" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ name }}</span>
              <strong class="page-feed__text">{{ reason }}</strong>
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">REGION</div><h3>{{ content.regionTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[label, value, width] in regionRows" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ value }}</strong>
              <div class="terminal-page__bar"><span :style="{ width }" /></div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>
</template>
