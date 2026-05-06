<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    protocol: '최적화 프로토콜 036',
    title: '권고안 엔진',
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
    savingsValue: '124만 원',
    savingsMeta: '분기 효율 차이',
    criticalTitle: '시스템 경보',
    criticalBadge: '경보 3건',
    critical: [
      ['재고 부족 위험', '티타늄 구조 볼트', '재고 가용성 6일 이하'],
      ['물류 지연', '섀시 부품 출하', '항만 체류 5일 지연'],
      ['공급 전환', '열전도 페이스트 X', '즉시 소싱 대체 필요'],
    ],
    analysisTitle: '대체 소싱 분석',
    analysisChip: 'AI 권고 경로',
    analysisRows: [
      ['AXL-900-P', '표준중공업', '에이펙스 물류 제조', '+12.4%', '2일 단축', '|||||||'],
      ['RED-XR-BLUE', '글로벌팹 1공장', '버텍스 칩', '+5.2%', '4일 단축', '||||||'],
      ['CASE-L-BLK', '프로토스틸', '널알로이', '+18.1%', '변동 없음', '||||'],
    ],
    mappingTitle: '효율 매핑',
    mapping: [
      ['경로 최적화 알파', '88%'],
      ['재고 분리 전략 7', '84%'],
      ['협력사 통합', '82%'],
    ],
    overlayTitle: '라이브 네트워크 오버레이',
    overlayText: '태평양 회랑에서 활성 이상 3건 감지',
    overlayActions: ['지도 스냅샷', '최근 12시간 로그'],
  },
}

const content = computed(() => CONTENT.ko)
const search = ref('')
const selectedTab = ref<string>(content.value.tabs[0])

const filteredAnalysisRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const activeTab = selectedTab.value
  const rows = content.value.analysisRows.filter((row) => row.some((item) => item.toLowerCase().includes(query)))

  if (activeTab === '대기') {
    return rows.slice(0, 1)
  }

  if (activeTab === '수용됨') {
    return rows.slice(1, 3)
  }

  if (activeTab === '거절됨') {
    return rows.slice(2, 3)
  }

  return rows
})

watchEffect(() => {
  selectedTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'recommendations-export', label: '스키마 내보내기', tone: 'secondary' },
    { key: 'recommendations-execute', label: '전체 변경 실행', tone: 'primary' },
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
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ '스키마 내보내기' }}</button>
        <button class="page-button page-button--primary" type="button">{{ '전체 변경 실행' }}</button>
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
          <span>1월</span>
          <span>4월</span>
          <span>7월</span>
          <span>10월</span>
          <span>12월</span>
        </div>
      </article>

      <article class="page-panel recommendations-page__critical">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">리스크 엔진</div><h3>{{ content.criticalTitle }}</h3></div>
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
          <div class="page-panel__eyebrow">의사결정 테이블</div>
          <h3>{{ content.analysisTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ content.analysisChip }}</span>
      </div>
      <div class="page-table">
        <div class="page-table__row page-table__row--head">
          <span>품목 코드</span>
          <span>현재 협력사</span>
          <span>대체 협력사</span>
          <span>비용 차이</span>
          <span>납기 차이</span>
          <span>회복 지수</span>
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
          <div><div class="page-panel__eyebrow">효율</div><h3>{{ content.mappingTitle }}</h3></div>
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
          <div><div class="page-panel__eyebrow">네트워크</div><h3>{{ content.overlayTitle }}</h3></div>
          <span class="page-panel__chip">실시간</span>
        </div>
        <p>{{ content.overlayText }}</p>
        <div class="design-trigger-row">
          <button v-for="action in content.overlayActions" :key="action" class="page-button page-button--secondary" type="button">{{ action }}</button>
        </div>
      </article>
    </section>
  </section>
</template>
