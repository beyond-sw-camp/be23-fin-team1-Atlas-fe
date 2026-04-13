<script setup lang="ts">
/**
 * ChatRoomList — 참여 중인 채팅방 목록
 * 검색 필터 + 채팅방 아이템 렌더링
 */
import { ref, computed } from 'vue'
import type { ChatRoom } from '../../types/chat'
import ChatRoomItem from './ChatRoomItem.vue'

const props = defineProps<{
  rooms: ChatRoom[]
}>()

const emit = defineEmits<{
  selectRoom: [roomPublicId: string]
}>()

const searchQuery = ref('')

const filteredRooms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.rooms
  return props.rooms.filter((room) => room.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="chat-room-list">
    <div class="chat-room-list__search">
      <span class="material-symbols-outlined">search</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="채팅방 검색..."
      />
    </div>
    <div class="chat-room-list__items">
      <ChatRoomItem
        v-for="room in filteredRooms"
        :key="room.publicId"
        :room="room"
        @select="emit('selectRoom', $event)"
      />
      <div v-if="filteredRooms.length === 0" class="chat-room-list__empty">
        <span class="material-symbols-outlined">forum</span>
        <p>채팅방이 없습니다.</p>
      </div>
    </div>
  </div>
</template>
