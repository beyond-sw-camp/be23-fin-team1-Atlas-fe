import { apiClient } from './http'
import type { ChatRoom, ChatMessageDto, ChatParticipant, MarkAsReadRequest } from '../types/chat'

export const chatService = {
  async createRoom(roomName: string, creatorPublicId: string, participantIds: string[]) {
    const response = await apiClient.post<ChatRoom>('/api/control/chats/rooms', {
      roomName,
      creatorPublicId,
      participantIds,
    })
    return response.data
  },

  async getRooms(userPublicId: string, keyword: string = '', size: number = 10) {
    const response = await apiClient.get<{ content: ChatRoom[] }>('/api/control/chats/rooms', {
      params: { userPublicId, keyword, size },
    })
    return response.data
  },

  async markAsRead(roomPublicId: string, data: MarkAsReadRequest) {
    const response = await apiClient.patch(
      `/api/control/chats/rooms/${roomPublicId}/read`,
      data
    )
    return response.data
  },

  async inviteParticipants(roomPublicId: string, inviterPublicId: string, targetUserPublicIds: string[]) {
    const response = await apiClient.post(
      `/api/control/chats/rooms/${roomPublicId}/participants`,
      {
        inviterPublicId,
        targetUserPublicIds,
      }
    )
    return response.data
  },

  async leaveRoom(roomPublicId: string, userPublicId: string) {
    const response = await apiClient.delete(`/api/control/chats/rooms/${roomPublicId}/participants`, {
      params: { userPublicId },
    })
    return response.data
  },

  async searchParticipants(roomPublicId: string, keyword: string, size: number = 10) {
    const response = await apiClient.get<{ content: ChatParticipant[] }>(
      `/api/control/chats/rooms/${roomPublicId}/participants/search`,
      { params: { keyword, size } }
    )
    return response.data
  },

  async getMessages(roomPublicId: string, cursor?: string, size: number = 50) {
    const response = await apiClient.get<{ content: ChatMessageDto[] }>(
      `/api/control/chats/rooms/${roomPublicId}/messages`,
      { params: { cursor, size } }
    )
    return response.data
  },

  async searchMessages(roomPublicId: string, keyword: string, size: number = 20) {
    const response = await apiClient.get<{ content: ChatMessageDto[] }>(
      `/api/control/chats/rooms/${roomPublicId}/messages/search`,
      { params: { keyword, size } }
    )
    return response.data
  },

  async updateMessage(messagePublicId: string, messageBody: string) {
    const response = await apiClient.put(`/api/control/chats/messages/${messagePublicId}`, {
      messageBody,
    })
    return response.data
  },

  async deleteMessage(messagePublicId: string) {
    const response = await apiClient.delete(`/api/control/chats/messages/${messagePublicId}`)
    return response.data
  },
}
