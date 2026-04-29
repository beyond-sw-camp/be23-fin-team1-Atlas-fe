<script setup lang="ts">
/**
 * ChatRoomItem — 채팅방 목록 단건 아이템
 * Status Ribbon(좌측 4px 바) + 방이름 + 마지막 메시지 + 시간 + 안 읽은 수 + 📌 고정
 */
import type { ChatRoom } from '../../types/chat'

defineProps<{
  room: ChatRoom
}>()

defineEmits<{
  select: [roomPublicId: string]
  pin: [roomPublicId: string]
  unpin: [roomPublicId: string]
}>()

function formatRelativeTime(isoString?: string): string {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '방금'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}
</script>

<template>
  <button
    :class="['chat-room-item', { 'chat-room-item--unread': room.unreadCount > 0, 'chat-room-item--pinned': !!room.pinnedAt }]"
    type="button"
    @click="$emit('select', room.publicId)"
  >
    <div class="chat-room-item__ribbon" />
    <div class="chat-room-item__content">
      <div class="chat-room-item__head">
        <strong class="chat-room-item__name">{{ room.roomName || '이름 없음' }}</strong>
        <div class="chat-room-item__head-right">
          <button
            :class="['chat-room-item__pin-btn', { 'is-pinned': !!room.pinnedAt }]"
            type="button"
            :title="room.pinnedAt ? '고정 해제' : '고정'"
            @click.stop="room.pinnedAt ? $emit('unpin', room.publicId) : $emit('pin', room.publicId)"
          >
            <span class="material-symbols-outlined">push_pin</span>
          </button>
          <span class="chat-room-item__time">{{ formatRelativeTime(room.lastMessage?.sentAt) }}</span>
        </div>
      </div>
      <div class="chat-room-item__foot">
        <span class="chat-room-item__preview">{{ room.lastMessage?.messageBody ?? '' }}</span>
        <span v-if="room.unreadCount > 0" class="chat-room-item__badge">{{ room.unreadCount }}</span>
      </div>
    </div>
  </button>
</template>
