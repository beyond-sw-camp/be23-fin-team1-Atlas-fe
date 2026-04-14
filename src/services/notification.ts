import { apiClient } from './http'

export interface NotificationDto {
  publicId: string
  recipientUserPublicId: string
  notificationType: string
  title: string
  message: string
  deepLinkUrl?: string
  referencePublicId?: string
  readYn: boolean
  createdAt: string
}

export async function getNotifications(): Promise<NotificationDto[]> {
  const response = await apiClient.get<NotificationDto[]>('/api/control/notifications')
  return response.data
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<number>('/api/control/notifications/unread-count')
  return response.data // Note: backend might return `{ count: ... }`. Assuming raw number for now.
}

export async function markNotificationAsRead(publicId: string): Promise<void> {
  await apiClient.patch(`/api/control/notifications/${publicId}/read`)
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiClient.patch('/api/control/notifications/read-all')
}

export async function deleteNotification(publicId: string): Promise<void> {
  await apiClient.delete(`/api/control/notifications/${publicId}`)
}
