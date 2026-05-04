<script setup lang="ts">
/**
 * ChatRoomItem — 채팅방 목록 단건 아이템
 * 1:1 채팅: 상대방 프로필 이미지 아바타
 * 그룹 채팅: 앞 4명 미니 아바타 그리드
 */
import type { ChatRoom } from '../../types/chat'
import ChatAvatar from './ChatAvatar.vue'
import { useAtlasPreferencesStore } from '../../stores/preferences'

defineProps<{
  room: ChatRoom
  currentUserPublicId: string
}>()

const preferences = useAtlasPreferencesStore()

defineEmits<{
  select: [roomPublicId: string]
  pin: [roomPublicId: string]
  unpin: [roomPublicId: string]
}>()

/** 채팅방 참여자 중 자신을 제외하고 최대 4명 추출 (프로필 이미지용) */
function getAvatarParticipants(room: ChatRoom, currentUserId: string) {
  if (!room.participants || room.participants.length === 0) {
    return [{ name: room.roomName || '?', imageUrl: undefined }]
  }
  const others = room.participants.filter(p => p.userPublicId !== currentUserId)
  if (others.length === 0) {
    return [{ name: room.roomName || '?', imageUrl: undefined }]
  }
  return others.slice(0, 4).map(p => ({
    name: p.displayName || '?',
    imageUrl: p.profileImageThumbPath || undefined,
  }))
}

/** 1:1 채팅인지 판별 (본인 제외 1명 이하) */
function isDirectChat(room: ChatRoom, currentUserId: string): boolean {
  if (!room.participants) return true
  const others = room.participants.filter(p => p.userPublicId !== currentUserId)
  return others.length <= 1
}

function getRoomTime(room: ChatRoom) {
  return room.lastMessage?.sentAt || room.lastMessageAt || room.createdAt
}

function getRoomPreview(room: ChatRoom) {
  return room.lastMessage?.messageBody || room.lastMessageText || ''
}

function formatTime(isoString?: string): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  return d.toLocaleTimeString(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}
</script>

<template>
  <div
    :class="['chat-room-item', { 'chat-room-item--unread': room.unreadCount > 0 }]"
    @click="$emit('select', room.publicId)"
  >
    <!-- 1:1 채팅: 단일 아바타 -->
    <ChatAvatar
      v-if="isDirectChat(room, currentUserPublicId)"
      :image-url="getAvatarParticipants(room, currentUserPublicId)[0]?.imageUrl"
      :name="getAvatarParticipants(room, currentUserPublicId)[0]?.name"
      size="lg"
    />

    <!-- 그룹 채팅: 미니 아바타 다중 그리드 -->
    <div
      v-else
      :class="['chat-room-item__group-avatars', `chat-room-item__group-avatars--${getAvatarParticipants(room, currentUserPublicId).length}`]"
    >
      <ChatAvatar
        v-for="(p, idx) in getAvatarParticipants(room, currentUserPublicId)"
        :key="idx"
        :image-url="p.imageUrl"
        :name="p.name"
        size="sm"
      />
    </div>

    <!-- 콘텐츠 -->
    <div class="chat-room-item__content">
      <div class="chat-room-item__head">
        <strong class="chat-room-item__name">
          {{ room.roomName || (preferences.language === 'ko' ? '이름 없음' : 'Untitled') }}
        </strong>
        <span class="chat-room-item__time">{{ formatTime(getRoomTime(room)) }}</span>
      </div>
      <div class="chat-room-item__foot">
        <span class="chat-room-item__preview">{{ getRoomPreview(room) }}</span>
        <!-- 안읽음 파란 도트 -->
        <span v-if="room.unreadCount > 0" class="chat-room-item__dot" />
      </div>
    </div>

    <!-- 고정 버튼 (hover 시만 노출) -->
    <button
      :class="['chat-room-item__pin-btn', { 'is-pinned': !!room.pinnedAt }]"
      type="button"
      :title="room.pinnedAt
        ? (preferences.language === 'ko' ? '고정 해제' : 'Unpin')
        : (preferences.language === 'ko' ? '고정' : 'Pin')"
      @click.stop="room.pinnedAt ? $emit('unpin', room.publicId) : $emit('pin', room.publicId)"
    >
      <span class="material-symbols-outlined">push_pin</span>
    </button>
  </div>
</template>
