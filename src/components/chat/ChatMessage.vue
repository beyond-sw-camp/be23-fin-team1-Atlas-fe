<script setup lang="ts">
/**
 * ChatMessage — 메시지 버블 단건 렌더링
 * 레퍼런스: 둥근 말풍선 + 보라-파랑 그라데이션(발신) + 좌측 아바타(수신)
 */
import type { ChatMessageDto } from '../../types/chat'
import ChatReferenceCard from './ChatReferenceCard.vue'
import ChatAvatar from './ChatAvatar.vue'

const props = defineProps<{
  message: ChatMessageDto
  currentUserPublicId: string
  senderName?: string
  senderAvatarUrl?: string
}>()

const emit = defineEmits<{
  delete: [messagePublicId: string]
  reply: [message: ChatMessageDto, senderDisplayName: string]
}>()

const isMine = props.message.senderUserPublicId === props.currentUserPublicId
const isSystem =
  props.message.messageType === 'SYSTEM' ||
  props.message.messageType === 'SYSTEM_JOIN' ||
  props.message.messageType === 'SYSTEM_LEAVE'

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function handleDelete() {
  emit('delete', props.message.publicId)
}

function handleReply() {
  emit('reply', props.message, props.senderName || '알 수 없음')
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
      <!-- 상대방 아바타 -->
      <ChatAvatar
        v-if="!isMine"
        :image-url="senderAvatarUrl"
        :name="senderName"
        size="sm"
        class="chat-msg__avatar"
      />
      <div class="chat-msg__col">
        <div class="chat-msg__bubble chat-msg__bubble--deleted">
          <p class="chat-msg__body chat-msg__body--deleted">{{ message.messageBody }}</p>
        </div>
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </div>
    </div>
  </div>

  <!-- 일반 메시지 -->
  <div v-else :class="['chat-msg', isMine ? 'chat-msg--mine' : 'chat-msg--other']">
    <div class="chat-msg__row">
      <!-- 상대방 아바타 (좌측) -->
      <ChatAvatar
        v-if="!isMine"
        :image-url="senderAvatarUrl"
        :name="senderName"
        size="sm"
        class="chat-msg__avatar"
      />

      <div class="chat-msg__col">
        <!-- 발신자 이름 (상대방 메시지에만 표시) -->
        <span v-if="!isMine && senderName" class="chat-msg__sender-name">{{ senderName }}</span>

        <div class="chat-msg__bubble-row">
          <!--
            내 메시지 삭제 버튼 — hover 시만 보임
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

          <!-- 답장 버튼 (삭제 버튼과 같은 맥락, 모든 일반 메시지에 노출) -->
          <button
            v-if="!message.isDeleted"
            class="chat-msg__reply"
            type="button"
            title="답장"
            @click="handleReply"
          >
            <span class="material-symbols-outlined">reply</span>
          </button>

          <!-- 내 메시지: 안읽음 수 (버블 왼쪽) -->
          <span v-if="isMine && message.unreadCount && message.unreadCount > 0" class="chat-msg__unread">
            {{ message.unreadCount }}
          </span>

          <!-- 버블 본체 -->
          <div class="chat-msg__bubble">
            <!-- 답장 원본 메시지 미리보기 -->
            <div v-if="message.parentMessagePublicId" class="chat-msg__reply-preview">
              <span class="chat-msg__reply-icon material-symbols-outlined">reply</span>
              <div class="chat-msg__reply-content">
                <strong class="chat-msg__reply-sender">
                  {{ message.parentSenderDisplayName || '알 수 없는 사용자' }}에게 답장
                </strong>
                <p class="chat-msg__reply-body">{{ message.parentMessageBody || '내용을 불러올 수 없습니다.' }}</p>
              </div>
            </div>

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

          <!-- 상대 메시지: 안읽음 수 (버블 오른쪽) -->
          <span v-if="!isMine && message.unreadCount && message.unreadCount > 0" class="chat-msg__unread">
            {{ message.unreadCount }}
          </span>
        </div>

        <!-- 시간 표시 (버블 아래) -->
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </div>
    </div>
  </div>
</template>
