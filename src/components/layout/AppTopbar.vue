<script setup lang="ts">
import { ORGANIZATION_LABELS } from '../../config/navigation'
import type { OrganizationType, ScreenTheme } from '../../types'
import { ORGANIZATION_I18N, UI_COPY } from '../../config/appCopy'
import { useAtlasNavigationStore } from '../../stores/navigation'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { useAtlasUiStore } from '../../stores/ui'
import { useAtlasChatStore } from '../../stores/chat'

const navigation = useAtlasNavigationStore()
const preferences = useAtlasPreferencesStore()
const ui = useAtlasUiStore()
const chat = useAtlasChatStore()

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  preferences.setLanguage(target.value === 'en' ? 'en' : 'ko')
}

function handleOrganizationChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  if (target.value === 'mainBuyer' || target.value === 'supplier' || target.value === 'admin') {
    preferences.setOrganization(target.value as OrganizationType)
  }
}

function toggleTheme() {
  preferences.setTheme(preferences.theme === 'dark' ? ('light' as ScreenTheme) : ('dark' as ScreenTheme))
}
</script>

<template>
  <header class="app-topbar">
    <div class="app-branding">
      <button class="app-icon-button app-mobile-menu-button" type="button" @click="ui.toggleMobileSidebar">
        <span class="material-symbols-outlined">{{ ui.mobileSidebarOpen ? 'close' : 'menu' }}</span>
      </button>
      <strong class="app-brand">ATLAS</strong>
      <span class="app-topbar__badge app-topbar__badge--neutral">CONTROL TERMINAL</span>
      <span class="app-topbar__badge app-topbar__badge--warn">3 ALERTS</span>
    </div>
    <div class="app-topbar__actions">
      <label class="app-language-select">
        <select :value="preferences.language" @change="handleLanguageChange">
          <option value="ko">한국어</option>
          <option value="en">EN</option>
        </select>
      </label>
      <label class="app-org-select">
        <select :value="preferences.organization" @change="handleOrganizationChange">
          <option v-for="(label, key) in ORGANIZATION_LABELS" :key="key" :value="key">
            {{ ORGANIZATION_I18N[key as OrganizationType][preferences.language] }}
          </option>
        </select>
      </label>
      <label class="app-search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" :placeholder="UI_COPY.searchPlaceholder[preferences.language]" />
      </label>
      <button class="app-icon-button" type="button" @click="toggleTheme">
        <span class="material-symbols-outlined">contrast</span>
      </button>
      <button
        :class="['app-icon-button', { 'app-icon-button--badge': chat.totalUnreadCount > 0 }]"
        type="button"
        @click="chat.togglePanel()"
      >
        <span class="material-symbols-outlined">chat_bubble</span>
      </button>
      <button class="app-icon-button app-icon-button--badge" type="button" @click="navigation.openNotifications">
        <span class="material-symbols-outlined">notifications</span>
      </button>
      <button class="app-icon-button" type="button" @click="navigation.openSettings">
        <span class="material-symbols-outlined">settings</span>
      </button>
      <button class="app-icon-button app-profile-button" type="button" @click="navigation.navigateToPage('profile')">
        <span class="material-symbols-outlined">account_circle</span>
      </button>
    </div>
  </header>
</template>
