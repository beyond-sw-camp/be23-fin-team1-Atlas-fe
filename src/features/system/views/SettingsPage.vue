<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '시스템 / 설정',
    title: '시스템 설정',
    tabs: ['조직', '알림', '사용자', 'API 키', '고급'],
    resetLabel: '초기화',
    saveLabel: '저장',
    inviteLabel: '사용자 초대',
    keyLabel: '키 생성',
    exportLabel: '전체 데이터 내보내기',
    resetDangerLabel: '설정 초기화',
  },
  en: {
    eyebrow: 'System / Settings',
    title: 'System Settings',
    tabs: ['Organization', 'Notifications', 'Users', 'API Keys', 'Advanced'],
    resetLabel: 'RESET',
    saveLabel: 'SAVE CHANGES',
    inviteLabel: 'INVITE USER',
    keyLabel: 'GENERATE KEY',
    exportLabel: 'EXPORT ALL DATA',
    resetDangerLabel: 'RESET SETTINGS',
  },
}

const content = computed(() => CONTENT[preferences.language])
const activeTab = ref<string>(content.value.tabs[0])

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'settings-reset', label: content.value.resetLabel, tone: 'secondary' },
    { key: 'settings-save', label: content.value.saveLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})

const organization = reactive({
  name: 'Atlas SCM Platform',
  industry: 'Electronics Manufacturing',
  country: 'Korea',
  email: 'ops@atlas-scm.io',
  timezone: 'Asia/Seoul (UTC+9)',
  currency: 'KRW',
  fiscalYear: 'January 1',
  units: 'Metric',
})

const notifications = reactive([
  { labelKo: '지연 알림 메일', labelEn: 'Delay alert emails', on: true },
  { labelKo: '통관 홀드 SMS', labelEn: 'Customs hold SMS', on: true },
  { labelKo: 'Slack 채널 알림', labelEn: 'Slack notifications', on: false },
  { labelKo: '일일 요약 리포트', labelEn: 'Daily digest report', on: true },
])

const users = computed(() =>
  preferences.language === 'ko'
    ? [
        ['김운영', 'ops@atlas-scm.io', '관리자', '방금 전', '활성'],
        ['박분석', 'analyst@atlas-scm.io', '분석가', '2시간 전', '활성'],
        ['이협력', 'supplier@atlas-scm.io', '협력사', '1일 전', '잠금'],
      ]
    : [
        ['KIM OPS', 'ops@atlas-scm.io', 'ADMIN', 'JUST NOW', 'ACTIVE'],
        ['PARK ANALYST', 'analyst@atlas-scm.io', 'ANALYST', '2H AGO', 'ACTIVE'],
        ['LEE SUPPLIER', 'supplier@atlas-scm.io', 'SUPPLIER', '1D AGO', 'LOCKED'],
      ],
)

const keys = [
  ['ERP Connector', 'atl_live_••••••••••1a9f', '2026-02-21', 'READ/WRITE', 'ACTIVE'],
  ['Analytics Export', 'atl_live_••••••••••5d2c', '2026-03-12', 'READ', 'ACTIVE'],
  ['Legacy Bridge', 'atl_test_••••••••••8f11', '2025-12-05', 'FULL', 'REVOKED'],
]
</script>

<template>
  <section class="app-screen settings-page">
    <header class="settings-page__header">
      <div>
        <div class="settings-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="settings-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.resetLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.saveLabel }}</button>
      </div>
    </header>

    <nav class="settings-page__tabs" aria-label="settings tabs">
      <button
        v-for="tab in content.tabs"
        :key="tab"
        :class="['settings-page__tab', { 'is-active': activeTab === tab }]"
        type="button"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </nav>

    <section v-if="activeTab === content.tabs[0]" class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">ORG</div><h3>{{ preferences.language === 'ko' ? '회사 정보' : 'Company Details' }}</h3></div>
          </div>
          <div class="settings-form">
            <label><span>{{ preferences.language === 'ko' ? '조직명' : 'Organization Name' }}</span><input v-model="organization.name" type="text" /></label>
            <label><span>{{ preferences.language === 'ko' ? '산업군' : 'Industry Vertical' }}</span><input v-model="organization.industry" type="text" /></label>
            <label><span>{{ preferences.language === 'ko' ? '법인 국가' : 'Country of Incorporation' }}</span><input v-model="organization.country" type="text" /></label>
            <label><span>{{ preferences.language === 'ko' ? '대표 이메일' : 'Primary Contact Email' }}</span><input v-model="organization.email" type="email" /></label>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">REGION</div><h3>{{ preferences.language === 'ko' ? '지역 설정' : 'Regional Settings' }}</h3></div>
          </div>
          <div class="settings-form">
            <label><span>{{ preferences.language === 'ko' ? '기본 타임존' : 'Default Timezone' }}</span><input v-model="organization.timezone" type="text" /></label>
            <label><span>{{ preferences.language === 'ko' ? '기본 통화' : 'Default Currency' }}</span><input v-model="organization.currency" type="text" /></label>
            <label><span>{{ preferences.language === 'ko' ? '회계연도 시작' : 'Fiscal Year Start' }}</span><input v-model="organization.fiscalYear" type="text" /></label>
            <label><span>{{ preferences.language === 'ko' ? '단위 체계' : 'Unit of Measure' }}</span><input v-model="organization.units" type="text" /></label>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === content.tabs[1]" class="settings-page__panel">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">ALERTS</div><h3>{{ preferences.language === 'ko' ? '알림 채널' : 'Alert Channels' }}</h3></div>
        </div>
        <div class="settings-toggle-list">
          <div v-for="item in notifications" :key="item.labelEn" class="settings-toggle-row">
            <span>{{ preferences.language === 'ko' ? item.labelKo : item.labelEn }}</span>
            <button :class="['settings-toggle', { 'is-on': item.on }]" type="button" @click="item.on = !item.on">
              <span />
            </button>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === content.tabs[2]" class="settings-page__panel">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">USERS</div><h3>{{ preferences.language === 'ko' ? '운영 사용자' : 'User Directory' }}</h3></div>
          <button class="page-button page-button--primary" type="button">{{ content.inviteLabel }}</button>
        </div>
        <div class="page-table settings-page__table">
          <div class="page-table__row page-table__row--head">
            <span>{{ preferences.language === 'ko' ? '이름' : 'NAME' }}</span>
            <span>EMAIL</span>
            <span>{{ preferences.language === 'ko' ? '역할' : 'ROLE' }}</span>
            <span>{{ preferences.language === 'ko' ? '최근 활동' : 'LAST ACTIVE' }}</span>
            <span>{{ preferences.language === 'ko' ? '상태' : 'STATUS' }}</span>
          </div>
          <div v-for="row in users" :key="row[1]" class="page-table__row">
            <span v-for="cell in row" :key="cell">{{ cell }}</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === content.tabs[3]" class="settings-page__panel">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">API</div><h3>{{ preferences.language === 'ko' ? 'API 키 관리' : 'API Key Management' }}</h3></div>
          <button class="page-button page-button--primary" type="button">{{ content.keyLabel }}</button>
        </div>
        <div class="page-table settings-page__table">
          <div class="page-table__row page-table__row--head">
            <span>{{ preferences.language === 'ko' ? '키 이름' : 'KEY NAME' }}</span>
            <span>{{ preferences.language === 'ko' ? '토큰' : 'TOKEN' }}</span>
            <span>{{ preferences.language === 'ko' ? '생성일' : 'CREATED' }}</span>
            <span>{{ preferences.language === 'ko' ? '권한' : 'PERMISSIONS' }}</span>
            <span>{{ preferences.language === 'ko' ? '상태' : 'STATUS' }}</span>
          </div>
          <div v-for="row in keys" :key="row[0]" class="page-table__row">
            <span v-for="cell in row" :key="cell">{{ cell }}</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">SYSTEM</div><h3>{{ preferences.language === 'ko' ? '고급 구성' : 'Advanced Configuration' }}</h3></div>
          </div>
          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ preferences.language === 'ko' ? '보존 기간' : 'RETENTION' }}</span>
              <strong class="page-feed__text">365 {{ preferences.language === 'ko' ? '일' : 'DAYS' }}</strong>
              <span>{{ preferences.language === 'ko' ? '감사 로그 장기 보관 기간' : 'Audit archive retention window' }}</span>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ preferences.language === 'ko' ? '세션 타임아웃' : 'SESSION TIMEOUT' }}</span>
              <strong class="page-feed__text">30 {{ preferences.language === 'ko' ? '분' : 'MINUTES' }}</strong>
              <span>{{ preferences.language === 'ko' ? '운영 콘솔 미사용 시 자동 종료' : 'Auto-expire inactive operator sessions' }}</span>
            </div>
          </div>
        </article>
        <article class="page-panel settings-page__danger">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">DANGER</div><h3>{{ preferences.language === 'ko' ? '위험 구역' : 'Danger Zone' }}</h3></div>
          </div>
          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.exportLabel }}</span>
              <strong class="page-feed__text">{{ preferences.language === 'ko' ? '전 조직 데이터 JSON 번들' : 'Full organization JSON bundle' }}</strong>
              <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.resetDangerLabel }}</span>
              <strong class="page-feed__text">{{ preferences.language === 'ko' ? '기본값으로 되돌리기' : 'Revert all settings to defaults' }}</strong>
              <button class="page-button page-button--danger" type="button">{{ content.resetDangerLabel }}</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
