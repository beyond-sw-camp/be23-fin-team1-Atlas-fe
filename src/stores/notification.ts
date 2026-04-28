import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  deleteNotification,
  getNotificationPreferences,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  updateNotificationPreference,
} from '../services/notification'
import type { NotificationDto, NotificationPreferenceDto } from '../services/notification'
import { useAtlasToastStore } from './toast'

const TOAST_EVENT_TYPES = new Set([
  'purchase-order.created',
  'purchase-order.updated',
  'purchase-order.confirmed',
  'purchase-order.accepted',
  'purchase-order.rejected',
  'purchase-order.cancelled',
  'sub-purchase-order.created',
  'sub-purchase-order.confirmed',
  'sub-purchase-order.rejected',
  'sub-purchase-order.cancelled',
  'shipment.created',
  'shipment.departed',
  'shipment.arrived',
  'shipment.completed',
  'shipment.delay-detected',
  'delivery-exception.created',
  'delivery-exception.delay',
  'delivery-exception.temperature-deviation',
  'delivery-exception.damaged',
  'logistics-node.capacity-status-changed',
  'inventory.shortage-detected',
  'lot.created',
  'lot.in-production',
  'lot.completed',
  'lot.hold',
  'lot.released',
  'lot.defective',
  'lot.expiration-imminent',
  'lot.quality-passed',
  'lot.quality-failed',
  'return-request.created',
  'return-request.approved',
  'return-request.rejected',
  'return-request.completed',
  'return-request.cancelled',
  'supplier-certificate.created',
  'supplier-certificate.approved',
  'supplier-certificate.rejected',
  'supplier-certificate.expiring',
  'supplier-certificate.expired',
  'supplier-certificate.revoked',
  'supplier.score-dropped',
  'supplier.esg-violated',
  'recommendation.requested',
  'recommendation.generated',
  'recommendation.failed',
  'recommendation.accepted',
  'recommendation.rejected',
])

function shouldShowToast(notification: NotificationDto) {
  if (!notification.eventType) return true
  return TOAST_EVENT_TYPES.has(notification.eventType)
}

export const useAtlasNotificationStore = defineStore('atlasNotification', () => {
  const unreadCount = ref(0)
  const notifications = ref<NotificationDto[]>([])
  const totalElements = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(0)
  const pageSize = ref(20)
  const isLoading = ref(false)
  const errorMessage = ref('')
  const preferences = ref<NotificationPreferenceDto[]>([])
  const isLoadingPreferences = ref(false)
  const preferencesErrorMessage = ref('')
  const updatingPreferenceCategories = ref<string[]>([])
  
  async function fetchUnreadCount() {
    try {
      const count = await getUnreadNotificationCount()
      unreadCount.value = count
    } catch (e) {
      console.error('Failed to fetch unread notification count', e)
    }
  }

  async function fetchRecentNotifications(page = currentPage.value, size = pageSize.value) {
    try {
      isLoading.value = true
      errorMessage.value = ''
      const data = await getNotifications({ page, size })
      notifications.value = data.content ?? []
      totalElements.value = data.totalElements ?? 0
      totalPages.value = data.totalPages ?? 0
      currentPage.value = data.number ?? data.page ?? page
      pageSize.value = data.size ?? size
    } catch (e) {
      errorMessage.value = '알림 목록을 불러오지 못했습니다.'
      console.error('Failed to fetch notifications', e)
    } finally {
      isLoading.value = false
    }
  }

  function handleIncomingNotification(notification: NotificationDto) {
    notifications.value.unshift(notification)
    if (!notification.readYn) {
      unreadCount.value++
    }

    if (!shouldShowToast(notification)) return

    // 토스트 알림 자동 표시
    const toast = useAtlasToastStore()
    const tone = notification.notificationType === 'RISK_ALERT' ? 'critical'
      : notification.notificationType === 'WARNING' ? 'warning'
      : notification.notificationType === 'SUCCESS' ? 'nominal'
      : 'info'
    toast.show(notification.title, notification.message, tone, 3000)
  }

  async function readNotification(publicId: string) {
    await markNotificationAsRead(publicId)
    const target = notifications.value.find((notification) => notification.publicId === publicId)

    if (target && !target.readYn) {
      target.readYn = true
      unreadCount.value = Math.max(unreadCount.value - 1, 0)
    }
  }

  async function readAllNotifications() {
    await markAllNotificationsAsRead()
    notifications.value = notifications.value.map((notification) => ({
      ...notification,
      readYn: true,
    }))
    unreadCount.value = 0
  }

  async function removeNotification(publicId: string) {
    await deleteNotification(publicId)
    const target = notifications.value.find((notification) => notification.publicId === publicId)
    notifications.value = notifications.value.filter((notification) => notification.publicId !== publicId)
    totalElements.value = Math.max(totalElements.value - 1, 0)

    if (target && !target.readYn) {
      unreadCount.value = Math.max(unreadCount.value - 1, 0)
    }
  }

  async function fetchPreferences() {
    try {
      isLoadingPreferences.value = true
      preferencesErrorMessage.value = ''
      const data = await getNotificationPreferences()
      preferences.value = [...data].sort((a, b) => a.displayOrder - b.displayOrder)
    } catch (e) {
      preferencesErrorMessage.value = '알림 설정을 불러오지 못했습니다.'
      console.error('Failed to fetch notification preferences', e)
    } finally {
      isLoadingPreferences.value = false
    }
  }

  async function setPreferenceEnabled(category: string, enabled: boolean) {
    const target = preferences.value.find((preference) => preference.category === category)
    if (!target || !target.userConfigurable) return

    const previousEnabled = target.enabled
    target.enabled = enabled
    updatingPreferenceCategories.value = [...updatingPreferenceCategories.value, category]

    try {
      await updateNotificationPreference(category, enabled)
    } catch (e) {
      target.enabled = previousEnabled
      preferencesErrorMessage.value = '알림 설정을 변경하지 못했습니다.'
      console.error('Failed to update notification preference', e)
    } finally {
      updatingPreferenceCategories.value = updatingPreferenceCategories.value.filter((item) => item !== category)
    }
  }

  return {
    unreadCount,
    notifications,
    totalElements,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    errorMessage,
    preferences,
    isLoadingPreferences,
    preferencesErrorMessage,
    updatingPreferenceCategories,
    fetchUnreadCount,
    fetchRecentNotifications,
    fetchPreferences,
    handleIncomingNotification,
    readNotification,
    readAllNotifications,
    removeNotification,
    setPreferenceEnabled,
  }
})
