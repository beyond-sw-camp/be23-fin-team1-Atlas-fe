<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
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
import { useAtlasChatStore } from '../stores/chat'
import { useAtlasNotificationStore } from '../stores/notification'
import BaseModal from '../features/shared/components/BaseModal.vue'

// 현재 라우트 정보입니다.
const route = useRoute()

const routeViewKey = computed(() => {
  return route.path
})

// 화면 상단 헤더 액션에 쓰는 스토어입니다.
const header = useAtlasHeaderStore()

// 현재 페이지 제목을 보여줄 때 쓰는 스토어입니다.
const navigation = useAtlasNavigationStore()

// 테마와 화면 크기 변수에 쓰는 스토어입니다.
const preferences = useAtlasPreferencesStore()

// 로그인 상태와 강제 비밀번호 변경 상태를 읽는 세션 스토어입니다.
const session = useAtlasSessionStore()

// 모바일 사이드바 상태를 관리하는 UI 스토어입니다.
const ui = useAtlasUiStore()

// 채팅과 알림 연결을 담당하는 스토어입니다.
const chatStore = useAtlasChatStore()

// 알림 배지와 목록 상태입니다.
const notificationStore = useAtlasNotificationStore()

// 로그인 상태와 강제 비밀번호 변경 상태를 함께 감시합니다.
// 강제 비밀번호 변경 중에는 일반 앱 화면을 쓰지 않으므로 채팅 연결도 열지 않습니다.
watch(
  [() => session.isAuthenticated, () => session.passwordChangeRequired],
  ([isAuth, mustChangePassword]) => {
    // 로그인되어 있고, 강제 비밀번호 변경 상태가 아닐 때만 연결합니다.
    if (isAuth && !mustChangePassword) {
      notificationStore.fetchUnreadCount()
      chatStore.connectStomp()
      chatStore.fetchRooms()
    } else {
      // 로그아웃 상태이거나 비밀번호 변경 전용 화면이면 연결을 끊습니다.
      chatStore.disconnectStomp()
    }
  },
  { immediate: true },
)

// 창 크기가 바뀌면 모바일 레이아웃 상태를 다시 맞춥니다.
onMounted(() => {
  window.addEventListener('resize', ui.syncViewportLayout)
})

// 레이아웃을 떠날 때 리스너와 채팅 연결을 정리합니다.
onBeforeUnmount(() => {
  window.removeEventListener('resize', ui.syncViewportLayout)
  chatStore.disconnectStomp()
})
</script>

<template>
  <div
    :class="[
      'app-shell',
      `theme-${preferences.theme}`,
      { 'is-mobile-sidebar-open': ui.mobileSidebarOpen },
      ...preferences.screenClasses,
    ]"
    :style="preferences.screenVars"
  >
    <!-- 로그인 전에는 기존 로그인 화면을 보여줍니다. -->
    <LoginGate v-if="!session.isAuthenticated" />

    <!-- 로그인은 되었지만 강제 비밀번호 변경 상태면
         로그인 화면처럼 단순한 화면만 보여줍니다. -->
    <RouterView
      v-else-if="session.passwordChangeRequired"
      :key="routeViewKey"
    />

    <!-- 일반 로그인 상태에서는 기존 앱 셸을 그대로 보여줍니다. -->
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
                :class="[
                  'page-button',
                  action.tone === 'secondary'
                    ? 'page-button--secondary'
                    : 'page-button--primary',
                ]"
                type="button"
                @click="action.onClick?.()"
              >
                {{ action.label }}
              </button>
            </div>
          </div>
        </div>

        <RouterView :key="routeViewKey" />
      </main>

      <ChatPanel />
      <AppToastContainer />
    </template>
<BaseModal
  v-model="session.sessionNoticeModalOpen"
  :title="session.sessionNoticeTitle"
  :description="session.sessionNoticeMessage"
  :close-on-backdrop="false"
  :close-on-escape="false"
  hide-eyebrow
  hide-dividers
  hide-close-button
  size="sm"
  @close="session.closeSessionNoticeModal"
>
  <template #footer>
    <button
      class="page-button page-button--primary"
      type="button"
      @click="session.closeSessionNoticeModal"
    >
      {{ preferences.language === 'ko' ? '확인' : 'OK' }}
    </button>
  </template>
</BaseModal>
  </div>
</template>
