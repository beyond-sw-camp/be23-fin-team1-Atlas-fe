import { apiClient } from './http'
import type { SpringPage } from '../types'

export interface NotificationDto {
  publicId: string
  recipientUserPublicId: string
  notificationType: string
  eventType?: string
  title: string
  message: string
  deepLinkUrl?: string
  referencePublicId?: string
  readYn: boolean
  createdAt: string
}

export interface NotificationQueryParams {
  page?: number
  size?: number
}

export interface NotificationPreferenceDto {
  category: string
  label: string
  description: string
  userConfigurable: boolean
  enabled: boolean
  displayOrder: number
}

export async function getNotifications(
  params: NotificationQueryParams = {},
): Promise<SpringPage<NotificationDto>> {
  const response = await apiClient.get<SpringPage<NotificationDto>>('/api/control/notifications', {
    params: {
      page: params.page ?? 0,
      size: params.size ?? 20,
    },
  })
  return response.data
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await apiClient.get<number>('/api/control/notifications/unread-count')
  return response.data
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

export async function getNotificationPreferences(): Promise<NotificationPreferenceDto[]> {
  const response = await apiClient.get<NotificationPreferenceDto[]>('/api/control/notifications/preferences')
  return response.data
}

export async function updateNotificationPreference(category: string, enabled: boolean): Promise<void> {
  await apiClient.patch(`/api/control/notifications/preferences/${category}`, { enabled })
}
