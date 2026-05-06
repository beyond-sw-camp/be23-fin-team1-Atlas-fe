<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '거버넌스 / 수용률 현황',
    title: '권고안 수용률 현황',
    subtitle: '권고안 채택률, 거절 사유, 긴급도별 반영 수준을 월간 기준으로 비교합니다.',
    metrics: [
      { label: '전체 수용률', value: '72%', meta: '누적 기준', tone: 'nominal' },
      { label: '총 권고안', value: '189건', meta: '누적 발행', tone: 'info' },
      { label: '수용됨', value: '136건', meta: '처리 완료', tone: 'nominal' },
      { label: '거절됨', value: '53건', meta: '미적용', tone: 'critical' },
    ],
    trendTitle: '월별 수용률 추이',
    trendMeta: '최근 12개월',
    tableTitle: '협력사별 수용률',
    tableHead: ['협력사', '구분', '총 권고', '수용', '거절', '수용률', '주요 거절 사유'],
    urgencyTitle: '긴급도별 수용률',
    reasonsTitle: '거절 주요 사유',
    exportLabel: '보고서',
    periodLabel: '기간 선택',
  },
  en: {
    eyebrow: 'Governance / Acceptance',
    title: 'Recommendation Acceptance',
    subtitle: 'Compare adoption rate, rejection reasons, and urgency-level acceptance month over month.',
    metrics: [
      { label: 'TOTAL ACCEPTANCE', value: '72%', meta: 'CUMULATIVE', tone: 'nominal' },
      { label: 'TOTAL RECOMMENDATIONS', value: '189', meta: 'ISSUED', tone: 'info' },
      { label: 'ACCEPTED', value: '136', meta: 'COMPLETED', tone: 'nominal' },
      { label: 'REJECTED', value: '53', meta: 'NOT APPLIED', tone: 'critical' },
    ],
    trendTitle: 'Monthly Acceptance Trend',
    trendMeta: 'Last 12 months',
    tableTitle: 'Supplier Acceptance Rate',
    tableHead: ['SUPPLIER', 'TIER', 'TOTAL', 'ACCEPTED', 'REJECTED', 'RATE', 'PRIMARY REJECT REASON'],
    urgencyTitle: 'Acceptance by Urgency',
    reasonsTitle: 'Top Reject Reasons',
    exportLabel: 'REPORT',
    periodLabel: 'SELECT WINDOW',
  },
}

const rows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['(주)청정원', '2차', '18', '17', '1', '94%', '비용 초과 1건'],
        ['CJ물류', '1차', '22', '19', '3', '86%', '일정 충돌'],
        ['글로벌푸드', '1차', '31', '21', '10', '68%', '비용 부담, 내부 승인 지연'],
        ['대한농산', '2차', '14', '10', '4', '71%', '기술적 실행 불가'],
        ['한국식품(주)', '1차', '38', '17', '21', '45%', '비용, 기술 부족, 자체 계획 우선'],
      ]
    : [
        ['CHEONGJEONGWON', 'T2', '18', '17', '1', '94%', 'Cost overrun'],
        ['CJ LOGISTICS', 'T1', '22', '19', '3', '86%', 'Schedule conflict'],
        ['GLOBAL FOODS', 'T1', '31', '21', '10', '68%', 'Cost and approval delay'],
        ['DAEHAN AGRI', 'T2', '14', '10', '4', '71%', 'Technical infeasibility'],
        ['KOREA FOODS', 'T1', '38', '17', '21', '45%', 'Cost, technical limit, own plan'],
      ],
)

const urgencyRows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['긴급', '88%', '22 / 25'],
        ['높음', '74%', '55 / 74'],
        ['보통', '62%', '44 / 71'],
        ['낮음', '79%', '15 / 19'],
      ]
    : [
        ['CRITICAL', '88%', '22 / 25'],
        ['HIGH', '74%', '55 / 74'],
        ['MEDIUM', '62%', '44 / 71'],
        ['LOW', '79%', '15 / 19'],
      ],
)

const rejectRows = computed(() =>
  preferences.language === 'ko'
    ? [
        ['비용 부담', '18건', '90%'],
        ['기술적 실행 불가', '14건', '70%'],
        ['내부 승인 지연', '11건', '55%'],
        ['자체 계획 우선', '6건', '30%'],
      ]
    : [
        ['COST BURDEN', '18', '90%'],
        ['TECHNICAL LIMIT', '14', '70%'],
        ['APPROVAL DELAY', '11', '55%'],
        ['OWN ROADMAP FIRST', '6', '30%'],
      ],
)

const content = computed(() => CONTENT.ko)

watchEffect(() => {
  header.setActions([
    { key: 'acceptance-report', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'acceptance-period', label: content.value.periodLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen acceptance-page">
    <header class="acceptance-page__header">
      <div>
        <div class="acceptance-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="acceptance-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.periodLabel }}</button>
      </div>
    </header>

    <section class="page-metrics acceptance-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="acceptance-page__content">
      <div class="acceptance-page__main">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">TREND</div>
              <h3>{{ content.trendTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ content.trendMeta }}</span>
          </div>
          <svg viewBox="0 0 600 110" class="acceptance-page__chart" aria-hidden="true">
            <line x1="0" y1="10" x2="600" y2="10" />
            <line x1="0" y1="35" x2="600" y2="35" />
            <line x1="0" y1="60" x2="600" y2="60" />
            <line x1="0" y1="85" x2="600" y2="85" />
            <line x1="0" y1="30" x2="600" y2="30" class="is-target" />
            <polygon points="0,75 55,70 109,65 164,72 218,60 273,55 327,58 382,50 436,45 491,38 545,30 600,22 600,85 0,85" class="is-area" />
            <polyline points="0,75 55,70 109,65 164,72 218,60 273,55 327,58 382,50 436,45 491,38 545,30 600,22" class="is-line" />
          </svg>
          <div class="acceptance-page__months">
            <span v-for="month in ['5월','6월','7월','8월','9월','10월','11월','12월','1월','2월','3월','4월']" :key="month">{{ month }}</span>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">SUPPLIERS</div>
              <h3>{{ content.tableTitle }}</h3>
            </div>
          </div>
          <div class="page-table acceptance-page__table">
            <div class="page-table__row page-table__row--head">
              <span v-for="head in content.tableHead" :key="head">{{ head }}</span>
            </div>
            <div v-for="row in rows" :key="row[0]" class="page-table__row">
              <span v-for="cell in row" :key="cell">{{ cell }}</span>
            </div>
          </div>
        </article>
      </div>

      <aside class="acceptance-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">URGENCY</div>
              <h3>{{ content.urgencyTitle }}</h3>
            </div>
          </div>
          <div class="page-feed">
            <div v-for="[label, rate, count] in urgencyRows" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ rate }}</strong>
              <span>{{ count }}</span>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">REJECT</div>
              <h3>{{ content.reasonsTitle }}</h3>
            </div>
          </div>
          <div class="page-feed">
            <div v-for="[label, count, width] in rejectRows" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ count }}</strong>
              <div class="acceptance-page__bar"><span :style="{ width }" /></div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>
</template>
