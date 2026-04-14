<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import LoginGate from '../components/auth/LoginGate.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopbar from '../components/layout/AppTopbar.vue'
import ChatPanel from '../components/chat/ChatPanel.vue'
import AppToastContainer from '../components/layout/AppToastContainer.vue'
import { useAtlasHeaderStore } from '../stores/header'
import { useAtlasNavigationStore } from '../stores/navigation'
import { useAtlasPreferencesStore } from '../stores/preferences'
import { useAtlasSessionStore } from '../stores/session'
import { useAtlasUiStore } from '../stores/ui'
import { useAtlasToastStore } from '../stores/toast'
import { useNotificationStomp } from '../composables/useNotificationStomp'

const route = useRoute()
const header = useAtlasHeaderStore()
const navigation = useAtlasNavigationStore()
const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()
const ui = useAtlasUiStore()

// We pass a default dummy user to establish the WS connection.
const { connect, disconnect } = useNotificationStomp('user-001')

// Connect to WebSocket when authenticated
watch(() => session.isAuthenticated, (isAuth) => {
  if (isAuth) {
    connect()
  } else {
    disconnect()
  }
}, { immediate: true })

onMounted(() => {
  window.addEventListener('resize', ui.syncViewportLayout)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', ui.syncViewportLayout)
  disconnect()
})
</script>

<template>
  <div
    :class="['app-shell', `theme-${preferences.theme}`, { 'is-mobile-sidebar-open': ui.mobileSidebarOpen }, ...preferences.screenClasses]"
    :style="preferences.screenVars"
  >
    <LoginGate v-if="!session.isAuthenticated" />
    <template v-else>
      <AppTopbar />
      <AppSidebar />
      <main class="app-main">
        <div v-if="!route.meta.hidePageHead" class="app-main__head">
          <div class="app-main__head-row">
            <h1>{{ navigation.pageLabel }}</h1>
            <div v-if="header.actions.length" class="app-main__head-actions">
              <button
                v-for="action in header.actions"
                :key="action.key"
                :class="['page-button', action.tone === 'secondary' ? 'page-button--secondary' : 'page-button--primary']"
                type="button"
                @click="action.onClick?.()"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
          <p>{{ navigation.pageSubtitle }}</p>
        </div>
        <RouterView :key="route.fullPath" />
      </main>
      <ChatPanel />
      <AppToastContainer />
    </template>
  </div>
</template>
