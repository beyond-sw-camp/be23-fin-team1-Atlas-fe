<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { ScreenTheme } from '../../types'
import { getMyInfo, getUserDetailByPublicId } from '../../services/user'
import { useAtlasNavigationStore } from '../../stores/navigation'
import { useAtlasChatStore } from '../../stores/chat'
import { useAtlasNotificationStore } from '../../stores/notification'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { useAtlasSessionStore } from '../../stores/session'
import { useAtlasSidebarBadgesStore } from '../../stores/sidebarBadges'
import { useAtlasUiStore } from '../../stores/ui'
import { PROFILE_IMAGE_UPDATED_EVENT } from '../../utils/profileImageEvents'

const navigation = useAtlasNavigationStore()
const chatStore = useAtlasChatStore()
const notificationStore = useAtlasNotificationStore()
const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()
const sidebarBadges = useAtlasSidebarBadgesStore()
const ui = useAtlasUiStore()
const sidebarProfileThumbPath = ref('')
const sidebarUserFirstName = ref('')
const sidebarUserMiddleName = ref('')
const sidebarUserLastName = ref('')
const sidebarUserRole = ref('')

type SidebarBadgeItem = {
  key: string
  badge?: string | number | null
  badgeTone?: string | null
}

function toggleTheme() {
  preferences.setTheme(preferences.theme === 'dark' ? ('light' as ScreenTheme) : ('dark' as ScreenTheme))
}

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  preferences.setLanguage(target.value === 'en' ? 'en' : 'ko')
}

function handleSidebarNavigate(navigate: () => void) {
  navigate()
  ui.closeMobileSidebar()
}

function handleMobileChatClick() {
  ui.closeMobileSidebar()
  chatStore.togglePanel()
}

function formatNotificationBadge(count: number) {
  if (count <= 0) return ''
  return count > 99 ? '99+' : String(count)
}

function getSidebarBadge(item: SidebarBadgeItem) {
  if (item.key === 'notificationsCenter') {
    return formatNotificationBadge(notificationStore.unreadCount)
  }

  if (sidebarBadges.isDynamicBadgeKey(item.key)) {
    return sidebarBadges.getBadge(item.key)
  }

  return item.badge
}

function getSidebarBadgeTone(item: SidebarBadgeItem) {
  if (item.key === 'notificationsCenter') {
    return 'crit'
  }

  if (sidebarBadges.isDynamicBadgeKey(item.key)) {
    return sidebarBadges.getBadgeTone(item.key)
  }

  return item.badgeTone
}

function buildSidebarUserName() {
  const firstName = sidebarUserFirstName.value.trim()
  const middleName = sidebarUserMiddleName.value.trim()
  const lastName = sidebarUserLastName.value.trim()

  const parts = preferences.language === 'en'
    ? [firstName, middleName, lastName]
    : [lastName, middleName, firstName]

  const name = parts.filter(Boolean).join(' ')
  return name || navigation.sidebarOperator.name[preferences.language]
}

function clearSidebarUserProfile() {
  sidebarProfileThumbPath.value = ''
  sidebarUserFirstName.value = ''
  sidebarUserMiddleName.value = ''
  sidebarUserLastName.value = ''
  sidebarUserRole.value = ''
}

async function loadSidebarProfile() {
  if (!session.isAuthenticated || !session.userPublicId) {
    clearSidebarUserProfile()
    return
  }

  try {
    const myInfo = await getMyInfo()
    const detail = await getUserDetailByPublicId(myInfo.userPublicId)

    sidebarProfileThumbPath.value = detail.profileImageThumbPath ?? myInfo.profileImageThumbPath ?? ''
    sidebarUserFirstName.value = detail.firstName ?? myInfo.firstName ?? ''
    sidebarUserMiddleName.value = detail.middleName ?? myInfo.middleName ?? ''
    sidebarUserLastName.value = detail.lastName ?? myInfo.lastName ?? ''
    sidebarUserRole.value = detail.userRole ?? myInfo.role ?? session.userRole
  } catch {
    clearSidebarUserProfile()
  }
}

onMounted(() => {
  loadSidebarProfile()
  window.addEventListener(PROFILE_IMAGE_UPDATED_EVENT, loadSidebarProfile)
})

watch(
  [() => session.isAuthenticated, () => session.userPublicId],
  () => {
    loadSidebarProfile()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener(PROFILE_IMAGE_UPDATED_EVENT, loadSidebarProfile)
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
            :alt="buildSidebarUserName()"
            class="app-sidebar__avatar-image"
          />
          <span v-else class="material-symbols-outlined app-sidebar__avatar-icon">person</span>
        </span>
        <span class="app-sidebar__user-copy">
          <span class="app-sidebar__user-name">{{ buildSidebarUserName() }}</span>
          <span class="app-sidebar__user-role">
            {{ sidebarUserRole || navigation.sidebarOperator.role[preferences.language] }}
          </span>
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
            <span
              v-if="getSidebarBadge(item)"
              :class="[
                'app-nav-item__badge',
                getSidebarBadgeTone(item) ? `is-${getSidebarBadgeTone(item)}` : '',
              ]"
            >
              {{ getSidebarBadge(item) }}
            </span>
          </button>
        </RouterLink>
      </div>
    </nav>

    <div class="app-sidebar__mobile-tools">
      <button class="app-icon-button" type="button" @click="toggleTheme">
        <span class="material-symbols-outlined">contrast</span>
      </button>
      <button
        :class="['app-icon-button', { 'app-icon-button--badge': chatStore.totalUnreadCount > 0 }]"
        type="button"
        @click="handleMobileChatClick"
      >
        <span class="material-symbols-outlined">chat_bubble</span>
      </button>
      <button class="app-icon-button" type="button" @click="navigation.openSettings">
        <span class="material-symbols-outlined">settings</span>
      </button>
      <label class="app-language-select app-language-select--sidebar">
        <select
          id="app-language-sidebar"
          name="app-language-sidebar"
          :value="preferences.language"
          @change="handleLanguageChange"
        >
          <option value="ko">KO</option>
          <option value="en">EN</option>
        </select>
      </label>
    </div>
  </aside>
</template>
