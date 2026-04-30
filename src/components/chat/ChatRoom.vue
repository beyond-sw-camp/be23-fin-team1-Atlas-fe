<script setup lang="ts">
/**
 * ChatRoom — 채팅방 화면
 * 레퍼런스: 깔끔한 헤더(←이름+아바타) + 더보기 메뉴 통합
 */
import { ref, computed, nextTick, watch } from 'vue'
import type { ChatMessageDto, ChatParticipant } from '../../types/chat'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import ChatAvatar from './ChatAvatar.vue'
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
const isMoreMenuOpen = ref(false)
const isInviting = ref(false)
const isShowingParticipants = ref(false)

const availableUsersToInvite = computed(() => {
  return chatStore.availableUsers.filter(
    (u) => 
      u.userPublicId !== props.currentUserPublicId &&
      !props.participants.some((p) => p.userPublicId === u.userPublicId)
  )
})

/** 대표 아바타 정보 (헤더 우측) */
const headerAvatar = computed(() => {
  const other = props.participants.find(p => p.userPublicId !== props.currentUserPublicId)
  if (other) {
    return { imageUrl: other.profileImageThumbPath, name: other.displayName }
  }
  return { name: props.roomName, imageUrl: undefined }
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

/** 로딩 완료 시에도 스크롤 최하단 보장 */
watch(
  () => props.isLoading,
  async (newVal, oldVal) => {
    if (oldVal && !newVal) {
      await nextTick()
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
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

/** senderUserPublicId → 아바타 URL 변환 */
function getSenderAvatarUrl(senderPublicId: string | null | undefined): string | undefined {
  if (!senderPublicId) return undefined
  const fromParticipants = props.participants.find((p) => p.userPublicId === senderPublicId)
  if (fromParticipants?.profileImageThumbPath) return fromParticipants.profileImageThumbPath
  const fromStore = chatStore.availableUsers.find((u) => u.userPublicId === senderPublicId)
  return fromStore?.profileImageThumbPath || undefined
}

/** 시스템 메시지 본문의 publicId를 표시명으로 치환 */
function resolveSystemMessage(body: string): string {
  // publicId 패턴: 26자리 영문대소문자/숫자 조합
  return body.replace(/[0-9A-Za-z]{26}/g, (id) => getSenderName(id))
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
  isMoreMenuOpen.value = false
}

function toggleMoreMenu() {
  isMoreMenuOpen.value = !isMoreMenuOpen.value
  if (!isMoreMenuOpen.value) {
    isInviting.value = false
    isShowingParticipants.value = false
  }
}

async function showInvitePanel() {
  isInviting.value = true
  isShowingParticipants.value = false
  if (chatStore.availableUsers.length === 0) {
    await chatStore.fetchAvailableUsers()
  }
}

function showParticipantsPanel() {
  isShowingParticipants.value = true
  isInviting.value = false
}

/** 채팅방 나가기 핸들러 */
function handleLeaveRoom() {
  if (confirm('정말로 이 채팅방에서 나가시겠습니까?\n나가면 채팅 목록에서 삭제됩니다.')) {
    chatStore.leaveRoom()
    isMoreMenuOpen.value = false
  }
}

const isEditingName = ref(false)
const editedRoomName = ref('')

function startEditingName() {
  editedRoomName.value = props.roomName
  isEditingName.value = true
  isMoreMenuOpen.value = false
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
    <div class="chat-room__header">
      <button class="chat-room__back" type="button" @click="$emit('back')">
        <span class="material-symbols-outlined">arrow_back</span>
      </button>

      <!-- 방 이름 (일반 / 편집 모드) -->
      <div v-if="!isEditingName" class="chat-room__header-center">
        <strong class="chat-room__title">{{ roomName }}</strong>
      </div>
      <div v-else class="chat-room__header-edit">
        <input
          v-model="editedRoomName"
          type="text"
          class="chat-room__edit-input"
          @keyup.enter="handleRenameRoom"
          @keyup.esc="isEditingName = false"
        />
        <button class="chat-room__edit-confirm" @click="handleRenameRoom">
          <span class="material-symbols-outlined">check</span>
        </button>
        <button class="chat-room__edit-cancel" @click="isEditingName = false">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>

      <!-- 우측: 대표 아바타 + 더보기 -->
      <div class="chat-room__header-right">
        <ChatAvatar
          :image-url="headerAvatar.imageUrl"
          :name="headerAvatar.name"
          size="sm"
        />
        <button class="chat-room__more-btn" type="button" @click="toggleMoreMenu">
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      <!-- 더보기 드롭다운 메뉴 -->
      <Transition name="chat-menu">
        <div v-if="isMoreMenuOpen && !isInviting && !isShowingParticipants" class="chat-room__dropdown">
          <button class="chat-room__dropdown-item" @click="startEditingName">
            <span class="material-symbols-outlined">edit</span>
            <span>이름 변경</span>
          </button>
          <button class="chat-room__dropdown-item" @click="showInvitePanel">
            <span class="material-symbols-outlined">person_add</span>
            <span>초대하기</span>
          </button>
          <button class="chat-room__dropdown-item" @click="showParticipantsPanel">
            <span class="material-symbols-outlined">group</span>
            <span>참여자 ({{ participants.length }}명)</span>
          </button>
          <button class="chat-room__dropdown-item chat-room__dropdown-item--danger" @click="handleLeaveRoom">
            <span class="material-symbols-outlined">logout</span>
            <span>나가기</span>
          </button>
        </div>
      </Transition>

      <!-- 참여자 목록 패널 -->
      <div v-if="isMoreMenuOpen && isShowingParticipants" class="chat-room__dropdown">
        <div class="chat-room__dropdown-head">
          <button class="chat-room__dropdown-back" @click="isShowingParticipants = false">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <span>참여자 ({{ participants.length }}명)</span>
        </div>
        <div v-if="participants.length === 0" class="chat-room__dropdown-empty">
          참여자 정보 없음
        </div>
        <div v-for="p in participants" :key="p.userPublicId" class="chat-room__dropdown-user">
          <ChatAvatar :image-url="p.profileImageThumbPath" :name="p.displayName" size="sm" />
          <div class="chat-room__dropdown-user-info">
            <span>{{ p.displayName }}
              <span v-if="p.userPublicId === currentUserPublicId" class="chat-room__me-badge">(나)</span>
            </span>
            <span v-if="p.jobTitle" class="chat-room__dropdown-user-role">{{ p.jobTitle }}</span>
          </div>
        </div>
      </div>

      <!-- 초대 패널 -->
      <div v-if="isMoreMenuOpen && isInviting" class="chat-room__dropdown">
        <div class="chat-room__dropdown-head">
          <button class="chat-room__dropdown-back" @click="isInviting = false">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <span>초대 가능한 사용자</span>
        </div>
        <div v-if="availableUsersToInvite.length === 0" class="chat-room__dropdown-empty">
          모두 참여 중입니다.
        </div>
        <button
          v-for="user in availableUsersToInvite"
          :key="user.userPublicId"
          class="chat-room__dropdown-invite-btn"
          @click="handleInviteUser(user.userPublicId)"
        >
          <ChatAvatar :image-url="user.profileImageThumbPath" :name="user.displayName" size="sm" />
          <span>{{ user.displayName }}</span>
        </button>
      </div>
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
          :sender-avatar-url="getSenderAvatarUrl(msg.senderUserPublicId)"
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
