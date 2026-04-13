<script setup lang="ts">
/**
 * ChatMessage — 메시지 버블 단건 렌더링
 * 메시지 유형(TEXT, SYSTEM, REFERENCE, FILE 등)에 따라 분기 처리
 * 내 메시지 hover 시 삭제 버튼 표시 → '[삭제된 메시지입니다.]'로 치환
 */
import type { ChatMessageDto } from '../../types/chat'
import ChatReferenceCard from './ChatReferenceCard.vue'

const props = defineProps<{
  message: ChatMessageDto
  /** 현재 로그인 사용자의 publicId (내 메시지 판별용) */
  currentUserPublicId: string
}>()

const emit = defineEmits<{
  delete: [messagePublicId: string]
}>()

const isMine = props.message.senderUserPublicId === props.currentUserPublicId
const isSystem =
  props.message.messageType === 'SYSTEM' ||
  props.message.messageType === 'SYSTEM_JOIN' ||
  props.message.messageType === 'SYSTEM_LEAVE'

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function handleDelete() {
  emit('delete', props.message.publicId)
}
</script>

<template>
  <!-- 시스템 메시지 -->
  <div v-if="isSystem" class="chat-msg chat-msg--system">
    <span class="chat-msg__system-text">{{ message.messageBody }}</span>
  </div>

  <!-- 삭제된 메시지 -->
  <div v-else-if="message.isDeleted" :class="['chat-msg', isMine ? 'chat-msg--mine' : 'chat-msg--other']">
    <span v-if="!isMine" class="chat-msg__time chat-msg__time--left">{{ formatTime(message.sentAt) }}</span>
    <div class="chat-msg__bubble chat-msg__bubble--deleted">
      <p class="chat-msg__body chat-msg__body--deleted">{{ message.messageBody }}</p>
    </div>
    <span v-if="isMine" class="chat-msg__time chat-msg__time--right">{{ formatTime(message.sentAt) }}</span>
  </div>

  <!-- 일반 메시지 -->
  <div v-else :class="['chat-msg', isMine ? 'chat-msg--mine' : 'chat-msg--other']">
    <span v-if="!isMine" class="chat-msg__time chat-msg__time--left">{{ formatTime(message.sentAt) }}</span>

    <div class="chat-msg__bubble-wrap">
      <div class="chat-msg__bubble">
        <p class="chat-msg__body">{{ message.messageBody }}</p>

        <!-- 업무 참조 카드 -->
        <ChatReferenceCard
          v-if="message.referenceType"
          :reference-type="message.referenceType"
          :reference-code="message.referenceCode"
          :reference-title="message.referenceTitle"
        />

        <!-- 첨부 파일 표시 -->
        <div v-if="message.attachmentPublicIds?.length" class="chat-msg__attachments">
          <span class="material-symbols-outlined">attach_file</span>
          <span>{{ message.attachmentPublicIds.length }}건 첨부</span>
        </div>

        <!-- 수정됨 표기 -->
        <span v-if="message.editedAt" class="chat-msg__edited">(수정됨)</span>
      </div>

      <!-- 내 메시지에만 삭제 버튼 (hover 시 표시) -->
      <button
        v-if="isMine"
        class="chat-msg__delete"
        type="button"
        title="메시지 삭제"
        @click="handleDelete"
      >
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>

    <span v-if="isMine" class="chat-msg__time chat-msg__time--right">{{ formatTime(message.sentAt) }}</span>
  </div>
</template>
