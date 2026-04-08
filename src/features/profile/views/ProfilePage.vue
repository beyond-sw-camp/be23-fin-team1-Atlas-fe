<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from 'vue'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasSessionStore } from '../../../stores/session'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()

const identity = [
  ['User Public ID', 'USR_01HX7ATLASADMIN4P9C8'],
  ['User ID', '1'],
  ['Login ID', 'admin'],
  ['Full Name', '시스템 관리자 / System Administrator'],
  ['Last Sign-In', '2026-04-07 15:42 KST'],
  ['Password Changed', '2026-04-05 09:14 KST'],
]

const contact = [
  ['Email', 'admin@atlas.com'],
  ['Phone', '010-9999-9999'],
  ['Job Title', '시스템관리자 / System Admin'],
  ['Session Policy', 'JWT + role claim + organizationPublicId claim'],
]

const orgRows = [
  ['Organization Public ID', 'ORG_01HX7ATLASADMIN4P9C8'],
  ['Organization Type', 'ADMIN'],
  ['Organization Name', '아틀라스 관리조직'],
  ['Business No', 'N/A'],
  ['Contact Owner', '시스템 관리자 / admin@atlas.com / 010-9999-9999'],
]

const history = [
  ['Success / 15:42 KST', 'IP 10.10.2.44 · Mozilla/5.0 (Macintosh; Intel Mac OS X) · failureReason = null'],
  ['Success / 09:11 KST', 'IP 10.10.2.21 · Chrome 135 · token issued with role + organizationPublicId'],
  ['Failure / 08:58 KST', 'IP 10.10.2.21 · failureReason = INVALID_PASSWORD'],
  ['Security', 'Last password rotation tracked by passwordChangedAt and login history correlation'],
]

watchEffect(() => {
  header.setActions([
    { key: 'profile-notification-policy', label: resolveDefaultCopy('NOTIFICATION_POLICY', preferences.language), tone: 'secondary' },
    { key: 'profile-edit-profile', label: resolveDefaultCopy('EDIT_PROFILE', preferences.language), tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen profile-page">
    <section class="profile-summary">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Identity', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Operator Snapshot', preferences.language) }}</h3></div>
          <span class="page-panel__chip">{{ resolveDefaultCopy('ADMIN', preferences.language) }}</span>
        </div>
        <div class="profile-kv">
          <div v-for="[label, value] in identity" :key="label" class="profile-kv__row"><span>{{ resolveDefaultCopy(label, preferences.language) }}</span><strong>{{ resolveDefaultCopy(value, preferences.language) }}</strong></div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Contact & Credentials', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Access Details', preferences.language) }}</h3></div>
          <span class="page-panel__chip">{{ resolveDefaultCopy('ACTIVE', preferences.language) }}</span>
        </div>
        <div class="profile-kv">
          <div v-for="[label, value] in contact" :key="label" class="profile-kv__row"><span>{{ resolveDefaultCopy(label, preferences.language) }}</span><strong>{{ resolveDefaultCopy(value, preferences.language) }}</strong></div>
        </div>
      </article>
    </section>

    <section class="page-metrics">
      <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Recommendation Adoption', preferences.language) }}</span><strong class="page-metric__value">84.2%</strong><span class="page-metric__meta">{{ resolveDefaultCopy('+6.4% QoQ', preferences.language) }}</span></article>
      <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Recovery Success Rate', preferences.language) }}</span><strong class="page-metric__value">91.8%</strong><span class="page-metric__meta">{{ resolveDefaultCopy('ETA restored in 42h avg', preferences.language) }}</span></article>
      <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Open Governance Reviews', preferences.language) }}</span><strong class="page-metric__value">07</strong><span class="page-metric__meta">{{ resolveDefaultCopy('2 overdue escalations', preferences.language) }}</span></article>
      <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Active Collaboration Rooms', preferences.language) }}</span><strong class="page-metric__value">13</strong><span class="page-metric__meta">{{ resolveDefaultCopy('5 critical channels pinned', preferences.language) }}</span></article>
    </section>

    <section class="page-panels">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Organization Context', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Auth Organization Entity', preferences.language) }}</h3></div>
          <span class="page-panel__chip">{{ resolveDefaultCopy('ORG_ADMIN', preferences.language) }}</span>
        </div>
        <div class="profile-kv">
          <div v-for="[label, value] in orgRows" :key="label" class="profile-kv__row"><span>{{ resolveDefaultCopy(label, preferences.language) }}</span><strong>{{ resolveDefaultCopy(value, preferences.language) }}</strong></div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Login History', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Auth Access Trace', preferences.language) }}</h3></div>
          <span class="page-panel__chip">{{ resolveDefaultCopy('LOGIN_HISTORY', preferences.language) }}</span>
        </div>
        <div class="page-feed">
          <div v-for="[label, text] in history" :key="label" class="page-feed__item">
            <span class="page-feed__label">{{ resolveDefaultCopy(label, preferences.language) }}</span>
            <strong class="page-feed__text">{{ resolveDefaultCopy(text, preferences.language) }}</strong>
          </div>
        </div>
        <button class="page-button page-button--danger" type="button" @click="session.signOut">{{ resolveDefaultCopy('SIGN_OUT', preferences.language) }}</button>
      </article>
    </section>
  </section>
</template>
