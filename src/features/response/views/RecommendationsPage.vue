<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    protocol: 'OPTIMIZATION_PROTOCOL_036',
    title: 'RECOMMENDATIONS_ENGINE',
    subtitle: '대체 공급 전략과 절감 추정치를 우선순위 기준으로 집계합니다.',
    metrics: [
      { label: '대기 중', value: '8', meta: '수용 결정 필요', tone: 'warning' },
      { label: '수용됨', value: '13', meta: '이번 달', tone: 'nominal' },
      { label: '거절됨', value: '3', meta: '이번 달', tone: 'critical' },
      { label: '수용률', value: '72%', meta: '누적', tone: 'info' },
    ],
    searchPlaceholder: '권고안, 협력사, 리스크 유형 검색...',
    tabs: ['전체', '대기', '수용됨', '거절됨'],
    savingsLabel: '예상 절감',
    savingsValue: '$1.24M',
    savingsMeta: '분기 효율 차이',
    criticalTitle: '시스템 경보',
    criticalBadge: '03_ALERTS',
    critical: [
      ['STOCK_OUT_RISK', 'TITANIUM_STRUCTURAL_BOLTS', '재고 가용성 6일 이하'],
      ['LOGISTIC_DELAY', 'CHASSIS_COMPONENT_SHIPMENT_A', '항만 체류 5일 지연'],
      ['SUPPLY_PIVOT', 'THERMAL_PASTE_TYPE_X', '즉시 소싱 대체 필요'],
    ],
    analysisTitle: '대체 소싱 분석',
    analysisChip: 'AI_RECOMMENDED_PATH',
    analysisRows: [
      ['AXL-900-P', 'StandardHeavy.Ind', 'APEX_LOGISTICS_MFG', '+12.4%', '-2 DAYS', '|||||||'],
      ['RED-XR-BLUE', 'GlobalFab_01', 'VERTEX_CHIP_CORP', '+5.2%', '-4 DAYS', '||||||'],
      ['CASE-L-BLK', 'Proto_Steel.Works', 'NULLALLOY_LIMITED', '+18.1%', '+0 DAYS', '||||'],
    ],
    mappingTitle: '효율 매핑',
    mapping: [
      ['Route Optimization Alpha', '88%'],
      ['Inventory Decoupling_7', '84%'],
      ['Supplier Consolidation', '82%'],
    ],
    overlayTitle: '라이브 네트워크 오버레이',
    overlayText: 'Pacific Corridor 에서 활성 이상 3건 감지',
    overlayActions: ['MAP SNAPSHOT', 'LAST 12H LOG'],
  },
  en: {
    protocol: 'OPTIMIZATION_PROTOCOL_036',
    title: 'RECOMMENDATIONS_ENGINE',
    subtitle: 'Aggregate alternate sourcing strategies and projected savings by execution priority.',
    metrics: [
      { label: 'PENDING', value: '8', meta: 'DECISION REQUIRED', tone: 'warning' },
      { label: 'ACCEPTED', value: '13', meta: 'THIS MONTH', tone: 'nominal' },
      { label: 'REJECTED', value: '3', meta: 'THIS MONTH', tone: 'critical' },
      { label: 'ACCEPTANCE', value: '72%', meta: 'CUMULATIVE', tone: 'info' },
    ],
    searchPlaceholder: 'Search recommendation, supplier, or risk type...',
    tabs: ['ALL', 'PENDING', 'ACCEPTED', 'REJECTED'],
    savingsLabel: 'AI_PROJECTED_SAVINGS',
    savingsValue: '$1.24M',
    savingsMeta: 'quarter efficiency delta',
    criticalTitle: 'SYSTEM_CRITICAL',
    criticalBadge: '03_ALERTS',
    critical: [
      ['STOCK_OUT_RISK', 'TITANIUM_STRUCTURAL_BOLTS', 'Inventory availability under 6 days'],
      ['LOGISTIC_DELAY', 'CHASSIS_COMPONENT_SHIPMENT_A', 'Port dwell exceeds 5-day delay'],
      ['SUPPLY_PIVOT', 'THERMAL_PASTE_TYPE_X', 'Immediate sourcing replacement required'],
    ],
    analysisTitle: 'SOURCING_ALTERNATIVES_ANALYSIS',
    analysisChip: 'AI_RECOMMENDED_PATH',
    analysisRows: [
      ['AXL-900-P', 'StandardHeavy.Ind', 'APEX_LOGISTICS_MFG', '+12.4%', '-2 DAYS', '|||||||'],
      ['RED-XR-BLUE', 'GlobalFab_01', 'VERTEX_CHIP_CORP', '+5.2%', '-4 DAYS', '||||||'],
      ['CASE-L-BLK', 'Proto_Steel.Works', 'NULLALLOY_LIMITED', '+18.1%', '+0 DAYS', '||||'],
    ],
    mappingTitle: 'EFFICIENCY_MAPPING',
    mapping: [
      ['Route Optimization Alpha', '88%'],
      ['Inventory Decoupling_7', '84%'],
      ['Supplier Consolidation', '82%'],
    ],
    overlayTitle: 'LIVE_NETWORK_OVERLAY',
    overlayText: '3 active anomalies detected in Pacific Corridor',
    overlayActions: ['MAP SNAPSHOT', 'LAST 12H LOG'],
  },
}

const content = computed(() => CONTENT[preferences.language])
const search = ref('')
const selectedTab = ref<string>(content.value.tabs[0])

const filteredAnalysisRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const activeTab = selectedTab.value
  const rows = content.value.analysisRows.filter((row) => row.some((item) => item.toLowerCase().includes(query)))

  if (activeTab === '대기' || activeTab === 'PENDING') {
    return rows.slice(0, 1)
  }

  if (activeTab === '수용됨' || activeTab === 'ACCEPTED') {
    return rows.slice(1, 3)
  }

  if (activeTab === '거절됨' || activeTab === 'REJECTED') {
    return rows.slice(2, 3)
  }

  return rows
})

watchEffect(() => {
  selectedTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'recommendations-export', label: preferences.language === 'ko' ? '스키마 내보내기' : 'EXPORT SCHEMA', tone: 'secondary' },
    { key: 'recommendations-execute', label: preferences.language === 'ko' ? '전체 변경 실행' : 'EXECUTE ALL CHANGES', tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen recommendations-page">
    <header class="recommendations-page__header">
      <div>
        <div class="recommendations-page__protocol">{{ content.protocol }}</div>
        <h2 class="recommendations-page__title">{{ content.title }}</h2>
        <p class="recommendations-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ preferences.language === 'ko' ? '스키마 내보내기' : 'EXPORT SCHEMA' }}</button>
        <button class="page-button page-button--primary" type="button">{{ preferences.language === 'ko' ? '전체 변경 실행' : 'EXECUTE ALL CHANGES' }}</button>
      </div>
    </header>

    <section class="recommendations-page__metrics">
      <article
        v-for="metric in content.metrics"
        :key="metric.label"
        :class="['recommendations-metric', `is-${metric.tone}`]"
      >
        <span class="recommendations-metric__label">{{ metric.label }}</span>
        <strong class="recommendations-metric__value">{{ metric.value }}</strong>
        <span class="recommendations-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="recommendations-page__filter">
      <label class="recommendations-page__search">
        <span>⌕</span>
        <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
      </label>
      <div class="recommendations-page__tabs">
        <button
          v-for="tab in content.tabs"
          :key="tab"
          :class="['recommendations-page__tab', { 'is-active': selectedTab === tab }]"
          type="button"
          @click="selectedTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <section class="recommendations-page__top">
      <article class="page-panel recommendations-page__savings">
        <span class="page-panel__eyebrow">{{ content.savingsLabel }}</span>
        <div class="recommendations-page__savings-chart">
          <div class="recommendations-page__bars">
            <span v-for="height in [24, 48, 72, 96, 120, 156, 196, 148, 104, 76, 54, 38]" :key="height" :style="{ height: `${height}px` }" />
          </div>
          <div class="recommendations-page__savings-copy">
            <strong>{{ content.savingsValue }}</strong>
            <span>{{ content.savingsMeta }}</span>
          </div>
        </div>
        <div class="recommendations-page__timeline">
          <span>JAN_24</span>
          <span>APR_24</span>
          <span>JUL_24</span>
          <span>OCT_24</span>
          <span>DEC_24</span>
        </div>
      </article>

      <article class="page-panel recommendations-page__critical">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">RISK ENGINE</div><h3>{{ content.criticalTitle }}</h3></div>
          <span class="page-panel__chip recommendations-page__alert-chip">{{ content.criticalBadge }}</span>
        </div>
        <div class="page-feed">
          <div v-for="[label, item, meta] in content.critical" :key="label" class="page-feed__item">
            <span class="page-feed__label">{{ label }}</span>
            <strong class="page-feed__text">{{ item }}</strong>
            <span class="recommendations-page__critical-meta">{{ meta }}</span>
          </div>
        </div>
      </article>
    </section>

    <article class="page-panel">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">DECISION TABLE</div>
          <h3>{{ content.analysisTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ content.analysisChip }}</span>
      </div>
      <div class="page-table">
        <div class="page-table__row page-table__row--head">
          <span>COMPONENT_SKU</span>
          <span>SUPPLIER_VENDOR</span>
          <span>PROPOSED_ALTERNATE</span>
          <span>COST_DELTA</span>
          <span>LEAD_TIME_DELTA</span>
          <span>RESILIENCY_INDEX</span>
        </div>
        <div v-for="[sku, vendor, alt, cost, lead, resiliency] in filteredAnalysisRows" :key="sku" class="page-table__row">
          <span>{{ sku }}</span>
          <span>{{ vendor }}</span>
          <span>{{ alt }}</span>
          <span>{{ cost }}</span>
          <span>{{ lead }}</span>
          <span class="recommendations-page__bars-text">{{ resiliency }}</span>
        </div>
      </div>
    </article>

    <section class="recommendations-page__bottom">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">EFFICIENCY</div><h3>{{ content.mappingTitle }}</h3></div>
        </div>
        <div class="recommendations-mapping-list">
          <div v-for="([label, score], index) in content.mapping" :key="label" class="recommendations-mapping-row">
            <span class="recommendations-mapping-row__index">{{ `${String(index + 1).padStart(3, '0')}` }}</span>
            <span>{{ label }}</span>
            <strong>{{ score }}</strong>
          </div>
        </div>
      </article>

      <article class="page-panel recommendations-page__overlay">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">NETWORK</div><h3>{{ content.overlayTitle }}</h3></div>
          <span class="page-panel__chip">LIVE</span>
        </div>
        <p>{{ content.overlayText }}</p>
        <div class="design-trigger-row">
          <button v-for="action in content.overlayActions" :key="action" class="page-button page-button--secondary" type="button">{{ action }}</button>
        </div>
      </article>
    </section>
  </section>
</template>
