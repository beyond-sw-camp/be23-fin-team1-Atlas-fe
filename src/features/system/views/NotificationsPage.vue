<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { NotificationDto } from '../../../services/notification'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasNotificationStore } from '../../../stores/notification'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasSessionStore } from '../../../stores/session'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
const notificationStore = useAtlasNotificationStore()
const session = useAtlasSessionStore()

const searchQuery = ref('')
const activeTab = ref('ALL')
const pageSize = 20

const CONTENT = {
  ko: {
    eyebrow: '시스템 / 알림',
    title: '알림 센터',
    subtitle: '리스크 이벤트, 시스템 메시지, 운영 알림을 확인하고 읽음 상태를 관리합니다.',
    search: '제목, 메시지, 유형 검색...',
    readAll: '전체 읽음',
    tableTitle: '알림 목록',
    preferencesTitle: '개인 알림 설정',
    preferencesEyebrow: 'PREFERENCES',
    preferencesDescription: '카테고리별 알림 수신 여부는 서버에 저장되며, 꺼진 알림은 발행되지 않습니다.',
    preferencesEmpty: '표시할 알림 설정이 없습니다.',
    preferencesLoading: '알림 설정을 불러오는 중입니다.',
    enabled: 'ON',
    disabled: 'OFF',
    empty: '표시할 알림이 없습니다.',
    loading: '알림 목록을 불러오는 중입니다.',
    retry: '다시 불러오기',
    total: '전체 알림',
    unread: '미읽음',
    pageCount: '현재 페이지',
    columns: ['수신 시각', '유형', '내용', '상태', '작업'],
    tabs: [
      { key: 'ALL', label: '전체' },
      { key: 'UNREAD', label: '미읽음' },
      { key: 'RISK', label: '리스크' },
      { key: 'SYSTEM', label: '시스템' },
    ],
    actions: {
      read: '읽음',
      delete: '삭제',
    },
    readStatus: {
      read: '읽음',
      unread: '미읽음',
    },
  },
  en: {
    eyebrow: 'System / Notifications',
    title: 'Notification Center',
    subtitle: 'Review risk events, system messages, and operational notifications.',
    search: 'Search title, message, type...',
    readAll: 'Mark all read',
    tableTitle: 'Notification List',
    preferencesTitle: 'Notification Preferences',
    preferencesEyebrow: 'PREFERENCES',
    preferencesDescription: 'Category preferences are stored on the server. Disabled notifications are not published.',
    preferencesEmpty: 'No notification preferences to display.',
    preferencesLoading: 'Loading notification preferences.',
    enabled: 'ON',
    disabled: 'OFF',
    empty: 'No notifications to display.',
    loading: 'Loading notifications.',
    retry: 'Retry',
    total: 'Total',
    unread: 'Unread',
    pageCount: 'This Page',
    columns: ['Received', 'Type', 'Content', 'Status', 'Action'],
    tabs: [
      { key: 'ALL', label: 'ALL' },
      { key: 'UNREAD', label: 'UNREAD' },
      { key: 'RISK', label: 'RISK' },
      { key: 'SYSTEM', label: 'SYSTEM' },
    ],
    actions: {
      read: 'READ',
      delete: 'DELETE',
    },
    readStatus: {
      read: 'Read',
      unread: 'Unread',
    },
  },
}

const content = computed(() => CONTENT[preferences.language])
const notifications = computed(() => notificationStore.notifications)
const currentPageLabel = computed(() => notificationStore.currentPage + 1)
const totalPagesLabel = computed(() => Math.max(notificationStore.totalPages, 1))

const metrics = computed(() => [
  {
    label: content.value.total,
    value: notificationStore.totalElements.toLocaleString(),
    meta: '',
  },
  {
    label: content.value.unread,
    value: notificationStore.unreadCount.toLocaleString(),
    meta: '',
  },
  {
    label: content.value.pageCount,
    value: notifications.value.length.toLocaleString(),
    meta: '',
  },
])

const visiblePreferences = computed(() => {
  if (session.userRole !== 'ADMIN') return notificationStore.preferences

  return notificationStore.preferences.filter((preference) => (
    preference.category === 'SYSTEM' || preference.category === 'CHAT'
  ))
})

const filteredNotifications = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()

  return notifications.value.filter((notification) => {
    const haystack = [
      notification.domainType,
      notification.notificationType,
      notification.eventType,
      notification.title,
      notification.message,
      notification.referencePublicId,
    ].filter(Boolean).join(' ').toLowerCase()
    const matchesSearch = !query || haystack.includes(query)
    const matchesTab = activeTab.value === 'ALL'
      || (activeTab.value === 'UNREAD' && !notification.readYn)
      || (activeTab.value === 'RISK' && isRiskNotification(notification))
      || (activeTab.value === 'SYSTEM' && !isRiskNotification(notification))

    return matchesSearch && matchesTab
  })
})

const canMovePrevious = computed(() => notificationStore.currentPage > 0 && !notificationStore.isLoading)
const canMoveNext = computed(() => !notificationStore.isLoading && notificationStore.currentPage < notificationStore.totalPages - 1)

function isRiskNotification(notification: NotificationDto) {
  return notification.domainType === 'RISK'
    || notification.notificationType === 'RISK_ALERT'
    || notification.notificationType.includes('RISK')
}

function formatDomainType(type?: string) {
  if (!type) return '-'

  const labels: Record<string, string> = {
    ORDER: preferences.language === 'ko' ? '발주' : 'Order',
    SHIPMENT: preferences.language === 'ko' ? '출하' : 'Shipment',
    RETURN_REQUEST: preferences.language === 'ko' ? '반품' : 'Return Request',
    SUPPLIER: preferences.language === 'ko' ? '협력사' : 'Supplier',
    RISK: preferences.language === 'ko' ? '리스크' : 'Risk',
    SYSTEM: preferences.language === 'ko' ? '시스템' : 'System',
  }
  return labels[type] ?? type.replace(/_/g, ' ')
}

function notificationToneClass(type: string) {
  if (type === 'RISK_ALERT') return 'is-critical'
  if (type === 'WARNING') return 'is-warning'
  if (type === 'SUCCESS') return 'is-success'
  return 'is-info'
}

function formatDateTime(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function loadNotifications(page = notificationStore.currentPage) {
  await Promise.all([
    notificationStore.fetchRecentNotifications(page, pageSize),
    notificationStore.fetchUnreadCount(),
  ])
}

function isPreferenceUpdating(category: string) {
  return notificationStore.updatingPreferenceCategories.includes(category)
}

async function handlePreferenceToggle(category: string, enabled: boolean) {
  await notificationStore.setPreferenceEnabled(category, enabled)
}

async function handleRead(notification: NotificationDto) {
  if (notification.readYn) return
  await notificationStore.readNotification(notification.publicId)
}

async function handleDelete(notification: NotificationDto) {
  await notificationStore.removeNotification(notification.publicId)

  const nextPage = notificationStore.notifications.length === 0 && notificationStore.currentPage > 0
    ? notificationStore.currentPage - 1
    : notificationStore.currentPage
  await loadNotifications(nextPage)
}

async function handleReadAll() {
  await notificationStore.readAllNotifications()
}

async function movePage(offset: number) {
  const nextPage = notificationStore.currentPage + offset
  if (nextPage < 0 || nextPage >= notificationStore.totalPages) return
  await loadNotifications(nextPage)
}

function syncHeaderActions() {
  header.setActions([
    {
      key: 'notifications-read-all',
      label: content.value.readAll,
      tone: 'secondary',
      onClick: handleReadAll,
    },
  ])
}

onMounted(async () => {
  syncHeaderActions()
  await Promise.all([
    loadNotifications(0),
    notificationStore.fetchPreferences(),
  ])
})

watch(() => preferences.language, () => {
  activeTab.value = content.value.tabs[0].key
  syncHeaderActions()
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen terminal-page notifications-page">
    <header class="terminal-page__header">
      <div>
        <p class="terminal-page__eyebrow">{{ content.eyebrow }}</p>
        <h1 class="terminal-page__title">{{ content.title }}</h1>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" class="page-metric">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span v-if="metric.meta" class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search">
        <span>⌕</span>
        <input v-model="searchQuery" :placeholder="content.search" type="search" />
      </label>

      <div class="terminal-page__tabs" role="tablist">
        <button
          v-for="tab in content.tabs"
          :key="tab.key"
          class="terminal-page__tab"
          :class="{ 'is-active': activeTab === tab.key }"
          type="button"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <article class="page-panel notifications-page__panel">
      <div class="page-panel__head">
        <div>
          <span class="page-panel__eyebrow">CONTROL</span>
          <h3>{{ content.tableTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ notificationStore.totalElements }}</span>
      </div>

      <div v-if="notificationStore.isLoading" class="notifications-page__state">
        {{ content.loading }}
      </div>
      <div v-else-if="notificationStore.errorMessage" class="notifications-page__state is-error">
        <strong>{{ notificationStore.errorMessage }}</strong>
        <button class="page-button page-button--secondary" type="button" @click="loadNotifications()">
          {{ content.retry }}
        </button>
      </div>
      <div v-else-if="filteredNotifications.length === 0" class="notifications-page__state">
        {{ content.empty }}
      </div>

      <div v-else class="page-table terminal-page__table notifications-page__table">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>

        <div
          v-for="notification in filteredNotifications"
          :key="notification.publicId"
          class="page-table__row"
          :class="{ 'is-unread': !notification.readYn }"
        >
          <span>{{ formatDateTime(notification.createdAt) }}</span>
          <span>
            <span class="page-panel__chip" :class="notificationToneClass(notification.notificationType)">
              {{ formatDomainType(notification.domainType) }}
            </span>
          </span>
          <span class="notifications-page__message">
            <strong>{{ notification.title }}</strong>
            <small>{{ notification.message }}</small>
          </span>
          <span>
            {{ notification.readYn ? content.readStatus.read : content.readStatus.unread }}
          </span>
          <span class="notifications-page__actions">
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="notification.readYn"
              @click="handleRead(notification)"
            >
              {{ content.actions.read }}
            </button>
            <button class="page-button page-button--secondary" type="button" @click="handleDelete(notification)">
              {{ content.actions.delete }}
            </button>
          </span>
        </div>
      </div>
    </article>

    <nav v-if="notificationStore.totalPages > 1" class="risk-rules-pagination" aria-label="notification pagination">
      <button
        class="page-button page-button--secondary risk-rules-pagination__button"
        type="button"
        :disabled="!canMovePrevious"
        @click="movePage(-1)"
      >
        &lt;
      </button>
      <span class="risk-rules-pagination__status">{{ currentPageLabel }} / {{ totalPagesLabel }}</span>
      <button
        class="page-button page-button--secondary risk-rules-pagination__button"
        type="button"
        :disabled="!canMoveNext"
        @click="movePage(1)"
      >
        &gt;
      </button>
    </nav>

    <article class="page-panel notifications-page__preferences">
      <div class="page-panel__head">
        <div>
          <span class="page-panel__eyebrow">{{ content.preferencesEyebrow }}</span>
          <h3>{{ content.preferencesTitle }}</h3>
          <p class="notifications-page__preferences-description">{{ content.preferencesDescription }}</p>
        </div>
        <span class="page-panel__chip">{{ visiblePreferences.length }}</span>
      </div>

      <div v-if="notificationStore.isLoadingPreferences" class="notifications-page__state">
        {{ content.preferencesLoading }}
      </div>
      <div v-else-if="notificationStore.preferencesErrorMessage" class="notifications-page__state is-error">
        <strong>{{ notificationStore.preferencesErrorMessage }}</strong>
        <button class="page-button page-button--secondary" type="button" @click="notificationStore.fetchPreferences()">
          {{ content.retry }}
        </button>
      </div>
      <div v-else-if="visiblePreferences.length === 0" class="notifications-page__state">
        {{ content.preferencesEmpty }}
      </div>

      <div v-else class="notifications-page__preference-list">
        <div
          v-for="preference in visiblePreferences"
          :key="preference.category"
          class="notifications-page__preference-item"
        >
          <div class="notifications-page__preference-copy">
            <strong>{{ preference.label }}</strong>
            <span>{{ preference.description }}</span>
            <small>{{ preference.category }}</small>
          </div>
          <div class="notifications-page__preference-control">
            <span class="notifications-page__preference-status">
              {{ preference.enabled ? content.enabled : content.disabled }}
            </span>
            <button
              class="risk-rules-toggle notifications-page__preference-toggle"
              :class="{ 'is-on': preference.enabled }"
              type="button"
              role="switch"
              :aria-checked="preference.enabled"
              :disabled="!preference.userConfigurable || isPreferenceUpdating(preference.category)"
              @click="handlePreferenceToggle(preference.category, !preference.enabled)"
            />
          </div>
        </div>
      </div>
    </article>
  </section>
</template>
