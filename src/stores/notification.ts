import { defineStore } from 'pinia'
import { ref } from 'vue'
import { NotificationDto, getUnreadNotificationCount, getNotifications } from '../services/notification'
import { useAtlasToastStore } from './toast'

export const useAtlasNotificationStore = defineStore('atlasNotification', () => {
  const unreadCount = ref(0)
  const notifications = ref<NotificationDto[]>([])
  
  async function fetchUnreadCount() {
    try {
      const count = await getUnreadNotificationCount()
      unreadCount.value = count
    } catch (e) {
      console.error('Failed to fetch unread notification count', e)
    }
  }

  async function fetchRecentNotifications() {
    try {
      const data = await getNotifications()
      notifications.value = data
    } catch (e) {
      console.error('Failed to fetch notifications', e)
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

  return {
    unreadCount,
    notifications,
    fetchUnreadCount,
    fetchRecentNotifications,
    handleIncomingNotification,
  }
})

