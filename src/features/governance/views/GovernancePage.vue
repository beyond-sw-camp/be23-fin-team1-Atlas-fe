<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    title: 'GOVERNANCE_HUB',
    subtitle: '컴플라이언스 모니터링과 감사 이력을 하나의 허브로 운영합니다.',
    ratingLabel: 'GLOBAL_COMPLIANCE_RATING',
    ratingValue: '98.42%',
    ratingState: 'NOMINAL_STATE',
    registryTitle: '인증 레지스트리',
    registryChip: 'ACTIVE',
    registry: [
      ['ISO-9001:2015', 'ACTIVE', '표준 품질 인증 번들', 'EXP: 2027-11-12'],
      ['GDP_COMPLIANCE', 'ACTIVE', '제약 운송 및 취급 기준', 'EXP: 2027-03-16'],
      ['TAPA_FSR', 'RENEWAL_PENDING', '시설 보안 요건', 'DUE: 2026-11-15'],
    ],
    auditTitle: '실시간 감사 로그',
    auditSystem: 'SYSTEM_ONLINE_ID_882',
    auditRows: [
      ['14:22:31', 'HUB_ERP_SYNC_02', 'TEMP_VALIDATION_LOG', 'LOW', 'RESOLVED'],
      ['13:58:12', 'FLEET_UNIT_339', 'ROUTE_DEVIANCE_DETECTION', 'CRITICAL', 'ESCALATED'],
      ['12:45:00', 'INBOUND_LOG6', 'CERT_EXPIRATION_ALERT', 'MEDIUM', 'PENDING'],
      ['12:30:55', 'USER_ADMIN_ROOT', 'SYSTEM_ACCESS_GENERATED', 'LOW', 'OK'],
    ],
    snapshotTitle: '지역 스냅샷',
    snapshotRegion: 'EU_CENTRAL_ZONE',
    snapshotNode: 'FRANKFURT_TERMINAL_7',
    snapshotMeta: '2024-02-26 / 12:00 UTC',
    snapshotAlert: 'WAREHOUSE_OSLO_04 SECURITY_BREACH_DETECTED.SECTOR_B',
  },
  en: {
    title: 'GOVERNANCE_HUB',
    subtitle: 'Operate compliance monitoring and audit history in a single governance hub.',
    ratingLabel: 'GLOBAL_COMPLIANCE_RATING',
    ratingValue: '98.42%',
    ratingState: 'NOMINAL_STATE',
    registryTitle: 'CERTIFICATION_REGISTRY',
    registryChip: 'ACTIVE',
    registry: [
      ['ISO-9001:2015', 'ACTIVE', 'Standard quality assurance bundle', 'EXP: 2027-11-12'],
      ['GDP_COMPLIANCE', 'ACTIVE', 'Pharmaceutical transport and handling control', 'EXP: 2027-03-16'],
      ['TAPA_FSR', 'RENEWAL_PENDING', 'Facility security requirements', 'DUE: 2026-11-15'],
    ],
    auditTitle: 'LIVE_AUDIT_LOG',
    auditSystem: 'SYSTEM_ONLINE_ID_882',
    auditRows: [
      ['14:22:31', 'HUB_ERP_SYNC_02', 'TEMP_VALIDATION_LOG', 'LOW', 'RESOLVED'],
      ['13:58:12', 'FLEET_UNIT_339', 'ROUTE_DEVIANCE_DETECTION', 'CRITICAL', 'ESCALATED'],
      ['12:45:00', 'INBOUND_LOG6', 'CERT_EXPIRATION_ALERT', 'MEDIUM', 'PENDING'],
      ['12:30:55', 'USER_ADMIN_ROOT', 'SYSTEM_ACCESS_GENERATED', 'LOW', 'OK'],
    ],
    snapshotTitle: 'REGIONAL SNAPSHOT',
    snapshotRegion: 'EU_CENTRAL_ZONE',
    snapshotNode: 'FRANKFURT_TERMINAL_7',
    snapshotMeta: '2024-02-26 / 12:00 UTC',
    snapshotAlert: 'WAREHOUSE_OSLO_04 SECURITY_BREACH_DETECTED.SECTOR_B',
  },
}

const content = computed(() => CONTENT[preferences.language])

watchEffect(() => {
  header.setActions([
    { key: 'governance-init-audit', label: preferences.language === 'ko' ? '감사 시작' : 'INITIALIZE AUDIT', tone: 'primary' },
    { key: 'governance-export-registry', label: preferences.language === 'ko' ? '레지스트리 내보내기' : 'EXPORT_REGISTRY', tone: 'secondary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen governance-page">
    <header class="governance-page__header">
      <div>
        <h2 class="governance-page__title">{{ content.title }}</h2>
        <p class="governance-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--primary" type="button">{{ preferences.language === 'ko' ? '감사 시작' : 'INITIALIZE_AUDIT' }}</button>
        <button class="page-button page-button--secondary" type="button">{{ preferences.language === 'ko' ? '레지스트리 내보내기' : 'EXPORT_REGISTRY' }}</button>
      </div>
    </header>

    <section class="governance-page__top">
      <article class="page-panel governance-page__chart">
        <span class="page-panel__eyebrow">{{ content.ratingLabel }}</span>
        <div class="governance-page__headline">
          <strong>{{ content.ratingValue }}</strong>
          <span class="page-panel__chip">{{ content.ratingState }}</span>
        </div>
        <div class="governance-page__bars">
          <span v-for="height in [132, 148, 141, 152, 144, 156, 146, 150, 159, 145, 151, 162]" :key="height" :style="{ height: `${height}px` }" />
        </div>
      </article>

      <article class="page-panel governance-page__registry">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">REGISTRY</div><h3>{{ content.registryTitle }}</h3></div>
          <span class="page-panel__chip">{{ content.registryChip }}</span>
        </div>
        <div class="page-feed">
          <div v-for="[label, state, text, meta] in content.registry" :key="label" class="page-feed__item">
            <span class="page-feed__label">{{ label }}</span>
            <strong :class="['page-feed__text', 'governance-page__state', state === 'RENEWAL_PENDING' ? 'is-pending' : 'is-active']">{{ state }}</strong>
            <span>{{ text }}</span>
            <span class="governance-page__meta">{{ meta }}</span>
          </div>
        </div>
        <button class="page-button page-button--secondary" type="button">
          {{ preferences.language === 'ko' ? '전체 인증 보기' : 'VIEW_ALL_CERTIFICATES' }}
        </button>
      </article>
    </section>

    <section class="governance-page__bottom">
      <article class="page-panel governance-page__audit">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">AUDIT</div><h3>{{ content.auditTitle }}</h3></div>
          <div class="governance-page__live">
            <span class="governance-page__live-dot" />
            <span>{{ content.auditSystem }}</span>
          </div>
        </div>
        <div class="page-table">
          <div class="page-table__row page-table__row--head">
            <span>TIMESTAMP</span>
            <span>ENTITY</span>
            <span>EVENT_TYPE</span>
            <span>RISK_LEVEL</span>
            <span>STATUS</span>
          </div>
          <div v-for="[time, entity, eventType, risk, status] in content.auditRows" :key="`${time}-${entity}`" class="page-table__row">
            <span>{{ time }}</span>
            <span>{{ entity }}</span>
            <span>{{ eventType }}</span>
            <span>{{ risk }}</span>
            <span>{{ status }}</span>
          </div>
        </div>
      </article>

      <article class="page-panel governance-page__snapshot">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">MAP SNAPSHOT</div><h3>{{ content.snapshotTitle }}</h3></div>
          <span class="page-panel__chip">LIVE</span>
        </div>
        <div class="governance-page__snapshot-map" />
        <div class="governance-page__snapshot-copy">
          <strong>{{ content.snapshotRegion }}</strong>
          <span>{{ content.snapshotNode }}</span>
          <em>{{ content.snapshotMeta }}</em>
          <p>{{ content.snapshotAlert }}</p>
        </div>
      </article>
    </section>
  </section>
</template>
