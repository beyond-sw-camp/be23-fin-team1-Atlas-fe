<script setup lang="ts">
import type { ScreenTheme } from '../../types'
import { UI_COPY } from '../../config/appCopy'
import { useAtlasNavigationStore } from '../../stores/navigation'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { useAtlasUiStore } from '../../stores/ui'
import { useAtlasChatStore } from '../../stores/chat'
import { useAtlasNotificationStore } from '../../stores/notification'

const navigation = useAtlasNavigationStore()
const preferences = useAtlasPreferencesStore()
const ui = useAtlasUiStore()
const chat = useAtlasChatStore()
const notificationStore = useAtlasNotificationStore()

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  preferences.setLanguage(target.value === 'en' ? 'en' : 'ko')
}


function toggleTheme() {
  preferences.setTheme(preferences.theme === 'dark' ? ('light' as ScreenTheme) : ('dark' as ScreenTheme))
}

function handleNotificationClick() {
  navigation.openNotifications()
  // As a UX choice, clicking the bell could clear the badge optimistically or wait for the API
  notificationStore.unreadCount = 0 
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
      <span v-if="notificationStore.unreadCount > 0" class="app-topbar__badge app-topbar__badge--warn">
        {{ notificationStore.unreadCount }} ALERTS
      </span>
    </div>
    <div class="app-topbar__actions">
      <label class="app-language-select">
        <select :value="preferences.language" @change="handleLanguageChange">
          <option value="ko">한국어</option>
          <option value="en">EN</option>
        </select>
      </label>
  <span class="app-topbar__badge app-topbar__badge--neutral">
  {{ navigation.organizationLabel }}
</span>

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
      <button 
        :class="['app-icon-button', { 'app-icon-button--badge': notificationStore.unreadCount > 0 }]" 
        type="button" 
        @click="handleNotificationClick"
      >
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
