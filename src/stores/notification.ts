import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../services/notification'
import type { NotificationDto } from '../services/notification'
import { useAtlasToastStore } from './toast'

export const useAtlasNotificationStore = defineStore('atlasNotification', () => {
  const unreadCount = ref(0)
  const notifications = ref<NotificationDto[]>([])
  const totalElements = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(0)
  const pageSize = ref(20)
  const isLoading = ref(false)
  const errorMessage = ref('')
  
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

  return {
    unreadCount,
    notifications,
    totalElements,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    errorMessage,
    fetchUnreadCount,
    fetchRecentNotifications,
    handleIncomingNotification,
    readNotification,
    readAllNotifications,
    removeNotification,
  }
})
