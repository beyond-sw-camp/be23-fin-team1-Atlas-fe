<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '거버넌스 / 평가',
    title: '사후 평가 허브',
    subtitle: '권고안 적용 이후 회복 성과와 실행 품질을 월 단위로 평가합니다.',
    metrics: [
      { label: '평균 점수', value: '84.2', meta: '전월 대비 +3.1', tone: 'nominal' },
      { label: '평가 완료', value: '28건', meta: '이번 달 배치', tone: 'info' },
      { label: '재검토 필요', value: '4건', meta: '점수 70 미만', tone: 'warning' },
      { label: '미평가', value: '3건', meta: '데이터 동기화 대기', tone: 'critical' },
    ],
    trendTitle: '월별 평가 추이',
    trendMeta: '최근 12개월',
    tableTitle: '평가 상세',
    tableHead: ['권고안', '담당 조직', '회복 ETA', '비용 편차', '정시율', '종합 점수', '상태'],
    asideTitle: '평가 기준',
    factorsTitle: '영향 요인',
    exportLabel: '평가 내보내기',
    compareLabel: '기간 비교',
  },
  en: {
    eyebrow: 'Governance / Evaluation',
    title: 'Post-Action Evaluation Hub',
    subtitle: 'Evaluate recovery performance and execution quality after recommendation rollout.',
    metrics: [
      { label: 'AVG SCORE', value: '84.2', meta: '+3.1 VS PREV MONTH', tone: 'nominal' },
      { label: 'COMPLETED', value: '28', meta: 'THIS MONTH BATCH', tone: 'info' },
      { label: 'REVIEW NEEDED', value: '4', meta: 'SCORE BELOW 70', tone: 'warning' },
      { label: 'PENDING', value: '3', meta: 'SYNC WAITING', tone: 'critical' },
    ],
    trendTitle: 'Monthly Evaluation Trend',
    trendMeta: 'Last 12 months',
    tableTitle: 'Evaluation Detail',
    tableHead: ['RECOMMENDATION', 'OWNER', 'RECOVERY ETA', 'COST VAR', 'ON-TIME', 'TOTAL', 'STATUS'],
    asideTitle: 'Scoring Model',
    factorsTitle: 'Primary Factors',
    exportLabel: 'EXPORT',
    compareLabel: 'COMPARE WINDOW',
  },
}

const rows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['SUPPLIER_REROUTE_021', '메인 발주사', '18h', '+2.4%', '94%', '91', '완료'],
        ['SAFETY_STOCK_REALLOC_018', '플랫폼 관리자', '12h', '+1.2%', '88%', '84', '완료'],
        ['PORT_SWAP_PROTOCOL_004', '메인 발주사', '27h', '+4.8%', '74%', '68', '재검토'],
        ['CERT_RENEWAL_ESCALATION', '플랫폼 관리자', '09h', '+0.5%', '96%', '93', '완료'],
      ]
    : [
        ['SUPPLIER_REROUTE_021', 'MAIN BUYER', '18h', '+2.4%', '94%', '91', 'COMPLETED'],
        ['SAFETY_STOCK_REALLOC_018', 'PLATFORM ADMIN', '12h', '+1.2%', '88%', '84', 'COMPLETED'],
        ['PORT_SWAP_PROTOCOL_004', 'MAIN BUYER', '27h', '+4.8%', '74%', '68', 'REVIEW'],
        ['CERT_RENEWAL_ESCALATION', 'PLATFORM ADMIN', '09h', '+0.5%', '96%', '93', 'COMPLETED'],
      ],
)

const scoringBlocks = computed(() =>
  preferences.language === 'ko'
    ? [
        ['회복 속도', '35%', '실행 후 ETA 회복 시간'],
        ['비용 안정성', '25%', '권고안 적용 후 비용 편차'],
        ['정시 이행', '25%', '복구 완료 이후 OTD 회복률'],
        ['협업 품질', '15%', '운영자/협력사 조치 이행률'],
      ]
    : [
        ['RECOVERY SPEED', '35%', 'Time to stabilize ETA after execution'],
        ['COST STABILITY', '25%', 'Variance after recommendation rollout'],
        ['ON-TIME EXECUTION', '25%', 'Recovered OTD after mitigation'],
        ['COLLABORATION QUALITY', '15%', 'Operator and supplier action completion'],
      ],
)

const factorRows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['항만 혼잡도', '높음', '유럽 구간 2주 연속 증가'],
        ['대체 공급처 준비도', '보통', 'Lot 인증 문서 보완 필요'],
        ['안전 재고 반영률', '양호', '기준 대비 96% 적용'],
      ]
    : [
        ['PORT CONGESTION', 'HIGH', 'EU corridor rising for 2 weeks'],
        ['ALT SUPPLIER READINESS', 'MEDIUM', 'Cert docs need completion'],
        ['SAFETY STOCK COVERAGE', 'GOOD', 'Applied at 96% of target'],
      ],
)

const content = computed(() => CONTENT.ko)

watchEffect(() => {
  header.setActions([
    { key: 'evaluation-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'evaluation-compare', label: content.value.compareLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen evaluation-page">
    <header class="evaluation-page__header">
      <div>
        <div class="evaluation-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="evaluation-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.compareLabel }}</button>
      </div>
    </header>

    <section class="page-metrics evaluation-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="evaluation-page__content">
      <article class="page-panel evaluation-page__trend">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">TREND</div>
            <h3>{{ content.trendTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.trendMeta }}</span>
        </div>
        <svg viewBox="0 0 640 220" class="evaluation-page__chart" aria-hidden="true">
          <line x1="24" y1="24" x2="616" y2="24" />
          <line x1="24" y1="72" x2="616" y2="72" />
          <line x1="24" y1="120" x2="616" y2="120" />
          <line x1="24" y1="168" x2="616" y2="168" />
          <line x1="24" y1="196" x2="616" y2="196" class="is-baseline" />
          <polyline points="24,154 78,149 132,142 186,148 240,136 294,124 348,126 402,116 456,102 510,92 564,80 616,66" class="is-area" />
          <polyline points="24,154 78,149 132,142 186,148 240,136 294,124 348,126 402,116 456,102 510,92 564,80 616,66" class="is-line" />
          <circle v-for="point in [[24,154],[78,149],[132,142],[186,148],[240,136],[294,124],[348,126],[402,116],[456,102],[510,92],[564,80],[616,66]]" :key="point[0]" :cx="point[0]" :cy="point[1]" r="3.5" />
        </svg>
        <div class="evaluation-page__months">
          <span v-for="month in ['05','06','07','08','09','10','11','12','01','02','03','04']" :key="month">{{ month }}</span>
        </div>
      </article>

      <article class="page-panel evaluation-page__table">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">DETAIL</div>
            <h3>{{ content.tableTitle }}</h3>
          </div>
        </div>
        <div class="page-table evaluation-page__table-grid">
          <div class="page-table__row page-table__row--head">
            <span v-for="head in content.tableHead" :key="head">{{ head }}</span>
          </div>
          <div v-for="row in rows" :key="row[0]" class="page-table__row">
            <span v-for="cell in row" :key="cell">{{ cell }}</span>
          </div>
        </div>
      </article>

      <aside class="evaluation-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">MODEL</div>
              <h3>{{ content.asideTitle }}</h3>
            </div>
          </div>
          <div class="page-feed">
            <div v-for="[label, weight, text] in scoringBlocks" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ weight }}</strong>
              <span>{{ text }}</span>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">FACTORS</div>
              <h3>{{ content.factorsTitle }}</h3>
            </div>
          </div>
          <div class="page-feed">
            <div v-for="[label, state, text] in factorRows" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ state }}</strong>
              <span>{{ text }}</span>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>
</template>
