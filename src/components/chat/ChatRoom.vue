<script setup lang="ts">
/**
 * ChatRoom — 채팅방 화면
 * 메시지 목록 (무한 스크롤 대비) + 입력 영역
 * 현재는 더미 데이터 기반, 추후 WebSocket 구독 추가 예정
 */
import { ref, nextTick, watch } from 'vue'
import type { ChatMessageDto } from '../../types/chat'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'

const props = defineProps<{
  roomName: string
  messages: ChatMessageDto[]
  currentUserPublicId: string
  isLoading: boolean
}>()

const emit = defineEmits<{
  back: []
  send: [body: string]
  deleteMessage: [messagePublicId: string]
  sendReference: [refType: string, refCode: string, refTitle: string]
}>()

const messagesContainer = ref<HTMLElement | null>(null)

/** 메시지 목록 변경 시 스크롤을 최하단으로 이동 */
watch(
  () => props.messages.length,
  async () => {
    await nextTick()
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  },
)

/** 업무 참조 카드 전송 핸들러 — ChatInput에서 3개 인자를 받아 상위로 전달 */
function handleSendReference(refType: string, refCode: string, refTitle: string) {
  emit('sendReference', refType, refCode, refTitle)
}

/** 메시지 삭제 핸들러 */
function handleDeleteMessage(messagePublicId: string) {
  emit('deleteMessage', messagePublicId)
}
</script>

<template>
  <div class="chat-room">
    <!-- 헤더 -->
    <div class="chat-room__header">
      <button class="chat-room__back" type="button" @click="$emit('back')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <strong class="chat-room__title">{{ roomName }}</strong>
      <span class="chat-room__label">CHAT ROOM</span>
    </div>

    <!-- 메시지 목록 -->
    <div ref="messagesContainer" class="chat-room__messages">
      <div v-if="isLoading" class="chat-room__loading">
        <span>메시지 로딩 중...</span>
      </div>
      <template v-else>
        <ChatMessage
          v-for="msg in messages"
          :key="msg.publicId"
          :message="msg"
          :current-user-public-id="currentUserPublicId"
          @delete="handleDeleteMessage"
        />
      </template>
    </div>

    <!-- 입력 영역 -->
    <ChatInput
      @send="emit('send', $event)"
      @send-reference="handleSendReference"
    />
  </div>
</template>
