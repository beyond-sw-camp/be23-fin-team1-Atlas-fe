<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '거버넌스 / 벤더 KPI',
    title: '벤더 KPI 대시보드',
    subtitle: '협력사별 납기, 품질, ESG, 대응 속도를 단일 KPI 시트로 비교합니다.',
    metrics: [
      { label: '평균 KPI 점수', value: '76.4', meta: '전체 협력사', tone: 'nominal' },
      { label: '기준 미달', value: '3개사', meta: '70점 이하', tone: 'critical' },
      { label: '개선 추세', value: '5개사', meta: '월간 상승', tone: 'warning' },
      { label: '평가 주기', value: '월', meta: '자동 산정', tone: 'info' },
    ],
    chartTitle: '협력사별 KPI 비교',
    chartChip: '이번 달 기준',
    tableTitle: 'KPI 상세 데이터',
    tableHead: ['협력사', '구분', '납기 준수', '품질 점수', 'ESG 점수', '가격 경쟁', '대응 속도', '종합 점수', '추이'],
    trendTitle: '월별 KPI 추이',
    distributionTitle: '점수 분포',
    exportLabel: '보고서 내보내기',
    windowLabel: '기간 설정',
  },
  en: {
    eyebrow: 'Governance / Vendor KPI',
    title: 'Vendor KPI Dashboard',
    subtitle: 'Compare supplier OTD, quality, ESG, and response performance in one operating sheet.',
    metrics: [
      { label: 'AVG KPI SCORE', value: '76.4', meta: 'ALL SUPPLIERS', tone: 'nominal' },
      { label: 'UNDER TARGET', value: '3', meta: 'BELOW 70', tone: 'critical' },
      { label: 'IMPROVING', value: '5', meta: 'MONTHLY RISE', tone: 'warning' },
      { label: 'CYCLE', value: 'MONTHLY', meta: 'AUTO CALCULATED', tone: 'info' },
    ],
    chartTitle: 'Supplier KPI Comparison',
    chartChip: 'Current month',
    tableTitle: 'KPI Detail Data',
    tableHead: ['SUPPLIER', 'TIER', 'OTD', 'QUALITY', 'ESG', 'PRICE', 'RESPONSE', 'TOTAL', 'TREND'],
    trendTitle: 'Monthly KPI Trend',
    distributionTitle: 'Score Distribution',
    exportLabel: 'EXPORT REPORT',
    windowLabel: 'SET WINDOW',
  },
}

const rows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['한국식품(주)', '1차', '71%', '62', '58', '82', '55', '66', '↓ -4'],
        ['글로벌푸드', '1차', '84%', '78', '72', '76', '80', '78', '↑ +1'],
        ['CJ물류', '1차', '93%', '91', '85', '88', '92', '90', '↑ +3'],
        ['농협유통', '2차', '68%', '58', '64', '70', '62', '64', '↓ -6'],
        ['대한농산', '2차', '81%', '74', '55', '78', '71', '72', '→ 0'],
        ['(주)청정원', '2차', '96%', '94', '91', '85', '94', '92', '↑ +5'],
      ]
    : [
        ['KOREA FOODS', 'T1', '71%', '62', '58', '82', '55', '66', 'DOWN -4'],
        ['GLOBAL FOODS', 'T1', '84%', '78', '72', '76', '80', '78', 'UP +1'],
        ['CJ LOGISTICS', 'T1', '93%', '91', '85', '88', '92', '90', 'UP +3'],
        ['NH DISTRIBUTION', 'T2', '68%', '58', '64', '70', '62', '64', 'DOWN -6'],
        ['DAEHAN AGRI', 'T2', '81%', '74', '55', '78', '71', '72', 'FLAT'],
        ['CHEONGJEONGWON', 'T2', '96%', '94', '91', '85', '94', '92', 'UP +5'],
      ],
)

const sparkRows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['한국식품(주)', '66pt'],
        ['글로벌푸드', '78pt'],
        ['CJ물류', '90pt'],
        ['농협유통', '64pt'],
        ['(주)청정원', '92pt'],
      ]
    : [
        ['KOREA FOODS', '66pt'],
        ['GLOBAL FOODS', '78pt'],
        ['CJ LOGISTICS', '90pt'],
        ['NH DISTRIBUTION', '64pt'],
        ['CHEONGJEONGWON', '92pt'],
      ],
)

const distributions = computed(() =>
  preferences.language === 'ko'
    ? [
        ['90점 이상', '1개사', '14%'],
        ['80–89점', '2개사', '28%'],
        ['70–79점', '2개사', '28%'],
        ['70점 미만', '2개사', '28%'],
      ]
    : [
        ['90+', '1 supplier', '14%'],
        ['80–89', '2 suppliers', '28%'],
        ['70–79', '2 suppliers', '28%'],
        ['Below 70', '2 suppliers', '28%'],
      ],
)

const content = computed(() => CONTENT.ko)

watchEffect(() => {
  header.setActions([
    { key: 'vendor-kpi-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'vendor-kpi-window', label: content.value.windowLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen vendor-kpi-page">
    <header class="vendor-kpi-page__header">
      <div>
        <div class="vendor-kpi-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="vendor-kpi-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.windowLabel }}</button>
      </div>
    </header>

    <section class="page-metrics vendor-kpi-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="vendor-kpi-page__content">
      <div class="vendor-kpi-page__main">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">CHART</div>
              <h3>{{ content.chartTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ content.chartChip }}</span>
          </div>
          <svg viewBox="0 0 640 210" class="vendor-kpi-page__chart" aria-hidden="true">
            <line x1="30" y1="20" x2="630" y2="20" />
            <line x1="30" y1="55" x2="630" y2="55" />
            <line x1="30" y1="90" x2="630" y2="90" />
            <line x1="30" y1="125" x2="630" y2="125" />
            <line x1="30" y1="160" x2="630" y2="160" />
            <line x1="30" y1="90" x2="630" y2="90" class="is-target" />
            <rect x="40" y="110" width="14" height="50" class="is-critical" />
            <rect x="56" y="120" width="14" height="40" class="is-critical light" />
            <rect x="72" y="125" width="14" height="35" class="is-critical soft" />
            <rect x="130" y="62" width="14" height="98" class="is-warning" />
            <rect x="146" y="78" width="14" height="82" class="is-warning light" />
            <rect x="162" y="88" width="14" height="72" class="is-warning soft" />
            <rect x="220" y="38" width="14" height="122" class="is-good" />
            <rect x="236" y="41" width="14" height="119" class="is-good light" />
            <rect x="252" y="53" width="14" height="107" class="is-good soft" />
            <rect x="310" y="115" width="14" height="45" class="is-critical" />
            <rect x="326" y="125" width="14" height="35" class="is-critical light" />
            <rect x="342" y="111" width="14" height="49" class="is-critical soft" />
            <rect x="400" y="69" width="14" height="91" class="is-warning" />
            <rect x="416" y="84" width="14" height="76" class="is-warning light" />
            <rect x="432" y="128" width="14" height="32" class="is-critical soft" />
            <rect x="490" y="28" width="14" height="132" class="is-good" />
            <rect x="506" y="31" width="14" height="129" class="is-good light" />
            <rect x="522" y="38" width="14" height="122" class="is-good soft" />
            <rect x="580" y="74" width="14" height="86" class="is-warning" />
            <rect x="596" y="80" width="14" height="80" class="is-warning light" />
            <rect x="612" y="117" width="14" height="43" class="is-warning soft" />
          </svg>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">TABLE</div>
              <h3>{{ content.tableTitle }}</h3>
            </div>
          </div>
          <div class="page-table vendor-kpi-page__table">
            <div class="page-table__row page-table__row--head">
              <span v-for="head in content.tableHead" :key="head">{{ head }}</span>
            </div>
            <div v-for="row in rows" :key="row[0]" class="page-table__row">
              <span v-for="cell in row" :key="cell">{{ cell }}</span>
            </div>
          </div>
        </article>
      </div>

      <aside class="vendor-kpi-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">TREND</div>
              <h3>{{ content.trendTitle }}</h3>
            </div>
          </div>
          <div class="page-feed">
            <div v-for="[label, value] in sparkRows" :key="label" class="page-feed__item vendor-kpi-page__spark">
              <div>
                <span class="page-feed__label">{{ label }}</span>
                <strong class="page-feed__text">{{ value }}</strong>
              </div>
              <svg viewBox="0 0 160 24" aria-hidden="true">
                <polyline points="0,18 32,20 64,16 96,18 128,14 160,12" />
              </svg>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">DISTRIBUTION</div>
              <h3>{{ content.distributionTitle }}</h3>
            </div>
          </div>
          <div class="page-feed">
            <div v-for="[label, count, width] in distributions" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ count }}</strong>
              <div class="vendor-kpi-page__bar">
                <span :style="{ width }" />
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>
</template>
