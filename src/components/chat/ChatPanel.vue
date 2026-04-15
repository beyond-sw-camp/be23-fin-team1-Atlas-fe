<script setup lang="ts">
/**
 * ChatPanel — 플로팅 채팅 패널 (최상위 컨테이너)
 * 패널 열림/닫힘 제어 + 내부 뷰(목록 ↔ 채팅방) 전환
 * 위치: 화면 우하단 고정 (position: fixed)
 */
import { useAtlasChatStore } from '../../stores/chat'
import ChatRoomList from './ChatRoomList.vue'
import ChatRoom from './ChatRoom.vue'

const chat = useAtlasChatStore()

/** 업무 참조 카드 전송 핸들러 — ChatRoom에서 3개 인자를 받아 store 액션 호출 */
function handleSendReference(refType: string, refCode: string, refTitle: string) {
  chat.sendReferenceMessage(refType, refCode, refTitle)
}
</script>

<template>
  <Transition name="chat-panel">
    <div v-if="chat.isPanelOpen" class="chat-panel">
      <!-- 패널 헤더 (목록 뷰에서만 표시) -->
      <div v-if="chat.currentView === 'list'" class="chat-panel__header">
        <div class="chat-panel__header-left">
          <span class="material-symbols-outlined">forum</span>
          <span class="chat-panel__title">MESSAGES</span>
        </div>
        <div class="chat-panel__header-actions">
          <button class="chat-panel__close" type="button" @click="chat.closePanel()">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <!-- 목록 뷰 -->
      <ChatRoomList
        v-if="chat.currentView === 'list'"
        :rooms="chat.rooms"
        @select-room="chat.openRoom($event)"
      />

      <!-- 채팅방 뷰 -->
      <ChatRoom
        v-else-if="chat.currentView === 'room' && chat.currentRoom"
        :room-name="chat.currentRoom.name"
        :messages="chat.messages"
        :current-user-public-id="chat.currentUserPublicId"
        :is-loading="chat.isLoadingMessages"
        :participants="chat.currentRoom.participants"
        @back="chat.backToList()"
        @send="chat.sendMessage($event)"
        @delete-message="chat.deleteMessage($event)"
        @send-reference="handleSendReference"
      />
    </div>
  </Transition>
</template>
