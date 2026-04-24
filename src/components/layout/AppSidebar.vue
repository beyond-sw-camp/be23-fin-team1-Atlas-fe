<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { ScreenTheme } from '../../types'
import { getMyInfo } from '../../services/user'
import { useAtlasNavigationStore } from '../../stores/navigation'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { useAtlasSessionStore } from '../../stores/session'
import { useAtlasUiStore } from '../../stores/ui'
import { PROFILE_IMAGE_UPDATED_EVENT } from '../../utils/profileImageEvents'

const navigation = useAtlasNavigationStore()
const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()
const ui = useAtlasUiStore()
const sidebarProfileThumbPath = ref('')

function toggleTheme() {
  preferences.setTheme(preferences.theme === 'dark' ? ('light' as ScreenTheme) : ('dark' as ScreenTheme))
}

function handleSidebarNavigate(navigate: () => void) {
  navigate()
  ui.closeMobileSidebar()
}

async function loadSidebarProfileImage() {
  if (!session.isAuthenticated || !session.userPublicId) {
    sidebarProfileThumbPath.value = ''
    return
  }

  try {
    const response = await getMyInfo()
    sidebarProfileThumbPath.value = response.profileImageThumbPath ?? ''
  } catch {
    sidebarProfileThumbPath.value = ''
  }
}

onMounted(() => {
  loadSidebarProfileImage()
  window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, loadSidebarProfileImage)
})

watch(
  [() => session.isAuthenticated, () => session.userPublicId],
  () => {
    loadSidebarProfileImage()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, loadSidebarProfileImage)
})
</script>

<template>
  <button
    v-if="ui.mobileSidebarOpen"
    class="app-sidebar-backdrop"
    type="button"
    aria-label="Close navigation"
    @click="ui.closeMobileSidebar"
  />

  <aside :class="['app-sidebar', { 'is-open': ui.mobileSidebarOpen }]">
    <div class="app-sidebar__head">
      <button class="app-sidebar__user" type="button" @click="navigation.navigateToPage('profile')">
        <span class="app-sidebar__avatar">
          <img
            v-if="sidebarProfileThumbPath"
            :src="sidebarProfileThumbPath"
            :alt="navigation.sidebarOperator.name[preferences.language]"
            class="app-sidebar__avatar-image"
          />
          <template v-else>{{ navigation.sidebarOperator.initials }}</template>
        </span>
        <span class="app-sidebar__user-copy">
          <span class="app-sidebar__user-name">{{ navigation.sidebarOperator.name[preferences.language] }}</span>
          <span class="app-sidebar__user-role">{{ navigation.sidebarOperator.role[preferences.language] }}</span>
        </span>
      </button>
    </div>

    <nav class="app-sidebar__nav">
      <div v-for="group in navigation.groupedNavItems" :key="group.key" class="app-nav-group">
        <div class="app-nav-group__label">{{ group.label }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.key"
          :to="preferences.pageLocation(item.key)"
          custom
          v-slot="{ navigate, href }"
        >
          <button
            :class="['app-nav-item', { 'is-active': item.key === preferences.pageKey }]"
            type="button"
            :data-href="href"
            @click="handleSidebarNavigate(navigate)"
          >
            <span class="material-symbols-outlined">{{ item.icon }}</span>
            <span class="app-nav-item__body">
              <span class="app-nav-item__label">{{ item.displayLabel }}</span>
            </span>
            <span v-if="item.badge" :class="['app-nav-item__badge', item.badgeTone ? `is-${item.badgeTone}` : '']">
              {{ item.badge }}
            </span>
          </button>
        </RouterLink>
      </div>
    </nav>

    <div class="app-sidebar__mobile-tools">
      <button class="app-icon-button" type="button" @click="toggleTheme">
        <span class="material-symbols-outlined">contrast</span>
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
  </aside>
</template>
