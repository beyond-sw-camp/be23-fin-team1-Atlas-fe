<script setup lang="ts">
/**
 * ChatRoomList — 참여 중인 채팅방 목록
 * 검색 필터 + 채팅방 아이템 렌더링 + 채팅방 생성
 */
import { ref, computed } from 'vue'
import type { ChatRoom } from '../../types/chat'
import ChatRoomItem from './ChatRoomItem.vue'
import { useAtlasChatStore } from '../../stores/chat'

const props = defineProps<{
  rooms: ChatRoom[]
}>()

const emit = defineEmits<{
  selectRoom: [roomPublicId: string]
}>()

const chatStore = useAtlasChatStore()

const searchQuery = ref('')
const isCreatingRoom = ref(false)
const newRoomName = ref('')
const selectedUsers = ref<string[]>([])

const filteredRooms = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return props.rooms
  return props.rooms.filter((room) => room.roomName && room.roomName.toLowerCase().includes(q))
})

async function handleCreateRoom() {
  const name = newRoomName.value.trim()
  if (!name) return
  
  // 선택된 유저로 방 생성
  const newRoomId = await chatStore.createRoom(name, selectedUsers.value)
  isCreatingRoom.value = false
  newRoomName.value = ''
  selectedUsers.value = []
  
  if (newRoomId) {
    emit('selectRoom', newRoomId)
  }
}
</script>

<template>
  <div class="chat-room-list">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px; padding: 0 16px; margin-top: 16px;">
      <div class="chat-room-list__search" style="flex: 1; margin: 0;">
        <span class="material-symbols-outlined">search</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="채팅방 검색..."
        />
      </div>
      <button 
        class="chat-room-list__create-btn" 
        style="background: transparent; border: 1px solid var(--color-outline, #474747); color: inherit; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 0;"
        @click="isCreatingRoom = !isCreatingRoom" 
        title="채팅방 생성">
        <span class="material-symbols-outlined">{{ isCreatingRoom ? 'close' : 'add' }}</span>
      </button>
    </div>

    <div v-if="isCreatingRoom" style="padding: 0 16px 16px; border-bottom: 1px solid var(--color-surface-container-low, #1E1E1E);">
      <input
        v-model="newRoomName"
        type="text"
        placeholder="새 채팅방 이름"
        style="width: 100%; padding: 8px 0; margin-bottom: 8px; background: transparent; border: none; border-bottom: 2px solid var(--color-outline, #474747); color: inherit; outline: none;"
        @keyup.enter="handleCreateRoom"
      />
      <div style="max-height: 120px; overflow-y: auto; margin-bottom: 16px; font-size: 0.875rem;">
        <label v-for="user in chatStore.availableUsers" :key="user.userPublicId" style="display: block; padding: 4px 0; cursor: pointer; color: var(--color-on-surface, #FFFFFF);">
          <input type="checkbox" :value="user.userPublicId" v-model="selectedUsers" style="margin-right: 8px;" />
          {{ user.displayName }}
        </label>
      </div>
      <button 
        @click="handleCreateRoom" 
        style="width: 100%; padding: 8px; background: var(--color-primary, #FFFFFF); color: var(--color-on-primary, #121212); border: none; cursor: pointer; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
        생성
      </button>
    </div>

    <div class="chat-room-list__items" v-if="!isCreatingRoom">
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
