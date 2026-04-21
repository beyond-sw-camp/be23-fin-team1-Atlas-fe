<script setup lang="ts">
/**
 * ChatRoom — 채팅방 화면
 * 메시지 목록 (무한 스크롤 대비) + 입력 영역 + 초대 기능
 * 현재는 더미 데이터 기반, 추후 WebSocket 구독 추가 예정
 */
import { ref, computed, nextTick, watch } from 'vue'
import type { ChatMessageDto, ChatParticipant } from '../../types/chat'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import { useAtlasChatStore } from '../../stores/chat'

const props = defineProps<{
  roomName: string
  messages: ChatMessageDto[]
  currentUserPublicId: string
  isLoading: boolean
  /** 채팅방 참여자 목록 — 발신자 이름 조회용 */
  participants: ChatParticipant[]
}>()

const emit = defineEmits<{
  back: []
  send: [body: string]
  deleteMessage: [messagePublicId: string]
  sendReference: [refType: string, refCode: string, refTitle: string]
}>()

const chatStore = useAtlasChatStore()
const messagesContainer = ref<HTMLElement | null>(null)
const isInviting = ref(false)

const availableUsersToInvite = computed(() => {
  return chatStore.availableUsers.filter(
    (u) => 
      u.userPublicId !== props.currentUserPublicId &&
      !props.participants.some((p) => p.userPublicId === u.userPublicId)
  )
})

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

/** senderUserPublicId → displayName 변환 (participants + store.availableUsers 통합 조회) */
function getSenderName(senderPublicId: string | null | undefined): string {
  if (!senderPublicId) return ''
  const fromParticipants = props.participants.find((p) => p.userPublicId === senderPublicId)
  if (fromParticipants) return fromParticipants.displayName
  const fromStore = chatStore.availableUsers.find((u) => u.userPublicId === senderPublicId)
  return fromStore?.displayName ?? senderPublicId.slice(0, 8) + '...'
}

/** 시스템 메시지 본문의 publicId를 표시명으로 치환 */
function resolveSystemMessage(body: string): string {
  // publicId 패턴: 26자리 ULID (부분 매치)
  return body.replace(/01[A-Z0-9]{24}/g, (id) => getSenderName(id))
}

/** 업무 참조 카드 전송 핸들러 — ChatInput에서 3개 인자를 받아 상위로 전달 */
function handleSendReference(refType: string, refCode: string, refTitle: string) {
  emit('sendReference', refType, refCode, refTitle)
}

/** 메시지 삭제 핸들러 */
function handleDeleteMessage(messagePublicId: string) {
  emit('deleteMessage', messagePublicId)
}

/** 유저 초대 핸들러 */
function handleInviteUser(userPublicId: string) {
  chatStore.inviteUser(userPublicId)
  isInviting.value = false
}

/** 채팅방 나가기 핸들러 */
/** 채팅방 나가기 핸들러 */
function handleLeaveRoom() {
  if (confirm('정말로 이 채팅방에서 나가시겠습니까?\n나가면 채팅 목록에서 삭제됩니다.')) {
    chatStore.leaveRoom()
  }
}

const isEditingName = ref(false)
const editedRoomName = ref('')

function startEditingName() {
  editedRoomName.value = props.roomName
  isEditingName.value = true
}

async function handleRenameRoom() {
  const name = editedRoomName.value.trim()
  if (name && name !== props.roomName && chatStore.currentRoomPublicId) {
    await chatStore.renameRoom(chatStore.currentRoomPublicId, name)
  }
  isEditingName.value = false
}
</script>

<template>
  <div class="chat-room">
    <!-- 헤더 -->
    <div class="chat-room__header" style="position: relative;">
      <button class="chat-room__back" type="button" @click="$emit('back')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>
      <div 
        v-if="!isEditingName" 
        style="flex: 1; display: flex; align-items: center; overflow: hidden;"
      >
        <strong class="chat-room__title" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 8px;">
          {{ roomName }}
        </strong>
        <button
          type="button"
          @click="startEditingName"
          style="background: transparent; border: none; color: var(--color-on-surface-variant, #C6C6C6); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;"
          title="이름 변경"
        >
          <span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span>
        </button>
      </div>
      
      <div 
        v-else 
        style="flex: 1; display: flex; align-items: center; gap: 4px;"
      >
        <input 
          v-model="editedRoomName" 
          type="text" 
          @keyup.enter="handleRenameRoom" 
          @keyup.esc="isEditingName = false" 
          style="flex: 1; background: transparent; border: none; border-bottom: 1px solid var(--color-primary, #FFFFFF); color: inherit; outline: none; font-size: 1rem; font-weight: bold;" 
        />
        <button 
          @click="handleRenameRoom" 
          style="background: transparent; border: none; color: var(--color-primary, #FFFFFF); cursor: pointer; padding: 4px;"
        >
          <span class="material-symbols-outlined" style="font-size: 1.1rem;">check</span>
        </button>
        <button 
          @click="isEditingName = false" 
          style="background: transparent; border: none; color: var(--color-error, #FF5252); cursor: pointer; padding: 4px;"
        >
          <span class="material-symbols-outlined" style="font-size: 1.1rem;">close</span>
        </button>
      </div>
      
      <button 
        class="chat-room__leave-btn" 
        type="button" 
        style="background: transparent; border: none; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; margin-right: 4px;"
        @click="handleLeaveRoom"
        title="방 나가기">
        <span class="material-symbols-outlined">logout</span>
      </button>

      <button 
        class="chat-room__invite-btn" 
        type="button" 
        style="background: transparent; border: none; color: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px;"
        @click="isInviting = !isInviting"
        title="초대하기">
        <span class="material-symbols-outlined">person_add</span>
      </button>

      <!-- 초대 팝오버 -->
      <div v-if="isInviting" style="position: absolute; top: 100%; right: 16px; width: 200px; max-height: 250px; overflow-y: auto; background: var(--color-surface, #131313); border: 1px solid var(--color-outline-variant, #474747); z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <div style="padding: 8px; font-size: 0.75rem; font-weight: 600; color: var(--color-on-surface-variant, #C6C6C6); border-bottom: 1px solid var(--color-surface-container-high, #2A2A2A); text-transform: uppercase; letter-spacing: 0.05em;">
          초대 가능한 사용자
        </div>
        <div v-if="availableUsersToInvite.length === 0" style="padding: 12px; font-size: 0.875rem; text-align: center; color: var(--color-on-surface-variant, #C6C6C6);">
          모두 참여 중입니다.
        </div>
        <button
          v-for="user in availableUsersToInvite"
          :key="user.userPublicId"
          @click="handleInviteUser(user.userPublicId)"
          style="display: block; width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; border-bottom: 1px solid var(--color-surface-container-highest, #333333); color: var(--color-on-surface, #FFFFFF); cursor: pointer; font-size: 0.875rem;">
          {{ user.displayName }}
        </button>
      </div>
    </div>

    <!-- 메시지 목록 -->
    <div ref="messagesContainer" class="chat-room__messages" style="flex: 1; overflow-y: auto;">
      <div v-if="isLoading" class="chat-room__loading">
        <span>메시지 로딩 중...</span>
      </div>
      <template v-else>
        <ChatMessage
          v-for="msg in messages"
          :key="msg.publicId"
          :message="{
            ...msg,
            messageBody:
              msg.messageType === 'SYSTEM' ||
              msg.messageType === 'SYSTEM_JOIN' ||
              msg.messageType === 'SYSTEM_LEAVE'
                ? resolveSystemMessage(msg.messageBody)
                : msg.messageBody,
          }"
          :current-user-public-id="currentUserPublicId"
          :sender-name="getSenderName(msg.senderUserPublicId)"
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
