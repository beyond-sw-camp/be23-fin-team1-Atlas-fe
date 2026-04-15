<script setup lang="ts">
/**
 * ChatMessage — 메시지 버블 단건 렌더링
 * - 발신자 이름 + 안읽음 수 + 삭제 기능
 * - 메타(시간+안읽음)는 버블 바로 옆에 밀착 배치
 */
import type { ChatMessageDto } from '../../types/chat'
import ChatReferenceCard from './ChatReferenceCard.vue'

const props = defineProps<{
  message: ChatMessageDto
  currentUserPublicId: string
  senderName?: string
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
    <div class="chat-msg__row">
      <span v-if="isMine" class="chat-msg__meta">
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </span>
      <div class="chat-msg__bubble chat-msg__bubble--deleted">
        <p class="chat-msg__body chat-msg__body--deleted">{{ message.messageBody }}</p>
      </div>
      <span v-if="!isMine" class="chat-msg__meta">
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </span>
    </div>
  </div>

  <!-- 일반 메시지 -->
  <div v-else :class="['chat-msg', isMine ? 'chat-msg--mine' : 'chat-msg--other']">
    <!-- 발신자 이름 (상대방 메시지에만 표시) -->
    <span v-if="!isMine && senderName" class="chat-msg__sender-name">{{ senderName }}</span>

    <div class="chat-msg__row">
      <!--
        내 메시지 삭제 버튼 — row 맨 왼쪽에 위치 (hover 시만 보임)
        메타와 버블 사이가 아니라 메타 왼쪽에 있으므로 간격에 영향 없음
      -->
      <button
        v-if="isMine"
        class="chat-msg__delete"
        type="button"
        title="메시지 삭제"
        @click="handleDelete"
      >
        <span class="material-symbols-outlined">delete</span>
      </button>

      <!-- 내 메시지: 메타(안읽음+시간) — 버블 바로 왼쪽 -->
      <span v-if="isMine" class="chat-msg__meta">
        <span v-if="message.unreadCount && message.unreadCount > 0" class="chat-msg__unread">{{ message.unreadCount }}</span>
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </span>

      <!-- 버블 본체 -->
      <div class="chat-msg__bubble">
        <p class="chat-msg__body">{{ message.messageBody }}</p>

        <ChatReferenceCard
          v-if="message.referenceType"
          :reference-type="message.referenceType"
          :reference-code="message.referenceCode"
          :reference-title="message.referenceTitle"
        />

        <div v-if="message.attachmentPublicIds?.length" class="chat-msg__attachments">
          <span class="material-symbols-outlined">attach_file</span>
          <span>{{ message.attachmentPublicIds.length }}건 첨부</span>
        </div>

        <span v-if="message.editedAt" class="chat-msg__edited">(수정됨)</span>
      </div>

      <!-- 상대 메시지: 메타(시간+안읽음) — 버블 바로 오른쪽 -->
      <span v-if="!isMine" class="chat-msg__meta">
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
        <span v-if="message.unreadCount && message.unreadCount > 0" class="chat-msg__unread">{{ message.unreadCount }}</span>
      </span>
    </div>
  </div>
</template>
