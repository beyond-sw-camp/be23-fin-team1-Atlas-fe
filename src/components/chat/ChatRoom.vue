<script setup lang="ts">
/**
 * ChatRoom — 채팅방 화면
 * 레퍼런스: 깔끔한 헤더(←이름+아바타) + 더보기 메뉴 통합
 */
import { ref, computed, nextTick, watch, onMounted, onBeforeUnmount } from 'vue'
import type { ChatMessageDto, ChatParticipant } from '../../types/chat'
import ChatMessage from './ChatMessage.vue'
import ChatInput from './ChatInput.vue'
import ChatAvatar from './ChatAvatar.vue'
import { useAtlasChatStore } from '../../stores/chat'
import { useAtlasPreferencesStore } from '../../stores/preferences'

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
const preferences = useAtlasPreferencesStore()
const messagesContainer = ref<HTMLElement | null>(null)
const moreButtonRef = ref<HTMLElement | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const isMoreMenuOpen = ref(false)
const isInviting = ref(false)
const isShowingParticipants = ref(false)

const copy = computed(() => ({
  deleteConfirm: preferences.language === 'ko' ? '메시지를 삭제하시겠습니까?' : 'Delete this message?',
  leaveConfirm: preferences.language === 'ko'
    ? '정말로 이 채팅방에서 나가시겠습니까?\n나가면 채팅 목록에서 삭제됩니다.'
    : 'Leave this chat room?\nIt will be removed from your chat list.',
  rename: preferences.language === 'ko' ? '이름 변경' : 'Rename',
  invite: preferences.language === 'ko' ? '초대하기' : 'Invite',
  participants: preferences.language === 'ko' ? '참여자' : 'Participants',
  peopleCount: (count: number) => preferences.language === 'ko' ? `${count}명` : `${count}`,
  leave: preferences.language === 'ko' ? '나가기' : 'Leave',
  noParticipants: preferences.language === 'ko' ? '참여자 정보 없음' : 'No participant information.',
  me: preferences.language === 'ko' ? '나' : 'Me',
  availableUsers: preferences.language === 'ko' ? '초대 가능한 사용자' : 'Available Users',
  allJoined: preferences.language === 'ko' ? '모두 참여 중입니다.' : 'Everyone is already in this room.',
  loadingMessages: preferences.language === 'ko' ? '메시지 로딩 중...' : 'Loading messages...',
}))

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
  if (confirm(copy.value.deleteConfirm)) {
    emit('deleteMessage', messagePublicId)
  }
}

/** 메시지 답장 핸들러 */
function handleReplyMessage(message: ChatMessageDto, senderDisplayName: string) {
  chatStore.setReplyTarget(message, senderDisplayName)
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

function closeMoreMenu() {
  isMoreMenuOpen.value = false
  isInviting.value = false
  isShowingParticipants.value = false
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isMoreMenuOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (moreButtonRef.value?.contains(target)) return
  if (dropdownRef.value?.contains(target)) return
  closeMoreMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})

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
  if (confirm(copy.value.leaveConfirm)) {
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

function sanitizeNamePart(value?: string | null) {
  return String(value || '').replace(/null|undefined/gi, '').trim()
}

function getInviteUserDisplayName(user: ChatParticipant) {
  const firstName = sanitizeNamePart(user.firstName)
  const middleName = sanitizeNamePart(user.middleName)
  const lastName = sanitizeNamePart(user.lastName)

  if (preferences.language === 'ko') {
    const koreanName = `${lastName}${middleName}${firstName}`.trim()
    if (koreanName) return koreanName
  } else {
    const englishName = [firstName, middleName, lastName].filter(Boolean).join(' ')
    if (englishName) return englishName
  }

  return user.displayName || (preferences.language === 'ko' ? '이름 없음' : 'Unknown')
}

function getInviteUserMeta(user: ChatParticipant) {
  const organizationName = preferences.language === 'ko'
    ? sanitizeNamePart(user.organizationName) || sanitizeNamePart(user.organizationEnglishName)
    : sanitizeNamePart(user.organizationEnglishName) || sanitizeNamePart(user.organizationName)
  const jobTitle = sanitizeNamePart(user.jobTitle)
  return [organizationName, jobTitle].filter(Boolean).join(' | ')
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
        <button ref="moreButtonRef" class="chat-room__more-btn" type="button" @click="toggleMoreMenu">
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </div>

      <!-- 더보기 드롭다운 메뉴 -->
      <Transition name="chat-menu">
        <div v-if="isMoreMenuOpen && !isInviting && !isShowingParticipants" ref="dropdownRef" class="chat-room__dropdown">
          <button class="chat-room__dropdown-item" @click="startEditingName">
            <span class="material-symbols-outlined">edit</span>
            <span>{{ copy.rename }}</span>
          </button>
          <button class="chat-room__dropdown-item" @click="showInvitePanel">
            <span class="material-symbols-outlined">person_add</span>
            <span>{{ copy.invite }}</span>
          </button>
          <button class="chat-room__dropdown-item" @click="showParticipantsPanel">
            <span class="material-symbols-outlined">group</span>
            <span>{{ copy.participants }} ({{ copy.peopleCount(participants.length) }})</span>
          </button>
          <button class="chat-room__dropdown-item chat-room__dropdown-item--danger" @click="handleLeaveRoom">
            <span class="material-symbols-outlined">logout</span>
            <span>{{ copy.leave }}</span>
          </button>
        </div>
      </Transition>

      <!-- 참여자 목록 패널 -->
      <div v-if="isMoreMenuOpen && isShowingParticipants" ref="dropdownRef" class="chat-room__dropdown">
        <div class="chat-room__dropdown-head">
          <button class="chat-room__dropdown-back" @click="isShowingParticipants = false">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <span>{{ copy.participants }} ({{ copy.peopleCount(participants.length) }})</span>
        </div>
        <div v-if="participants.length === 0" class="chat-room__dropdown-empty">
          {{ copy.noParticipants }}
        </div>
        <div v-for="p in participants" :key="p.userPublicId" class="chat-room__dropdown-user">
          <ChatAvatar :image-url="p.profileImageThumbPath" :name="p.displayName" size="sm" />
          <div class="chat-room__dropdown-user-info">
            <span>{{ p.displayName }}
              <span v-if="p.userPublicId === currentUserPublicId" class="chat-room__me-badge">({{ copy.me }})</span>
            </span>
            <span v-if="p.jobTitle" class="chat-room__dropdown-user-role">{{ p.jobTitle }}</span>
          </div>
        </div>
      </div>

      <!-- 초대 패널 -->
      <div v-if="isMoreMenuOpen && isInviting" ref="dropdownRef" class="chat-room__dropdown">
        <div class="chat-room__dropdown-head">
          <button class="chat-room__dropdown-back" @click="isInviting = false">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <span>{{ copy.availableUsers }}</span>
        </div>
        <div v-if="availableUsersToInvite.length === 0" class="chat-room__dropdown-empty">
          {{ copy.allJoined }}
        </div>
        <button
          v-for="user in availableUsersToInvite"
          :key="user.userPublicId"
          class="chat-room__dropdown-invite-btn"
          @click="handleInviteUser(user.userPublicId)"
        >
          <ChatAvatar :image-url="user.profileImageThumbPath" :name="getInviteUserDisplayName(user)" size="sm" />
          <span class="chat-room__dropdown-user-info">
            <span>{{ getInviteUserDisplayName(user) }}</span>
            <span v-if="getInviteUserMeta(user)" class="chat-room__dropdown-user-role">{{ getInviteUserMeta(user) }}</span>
          </span>
        </button>
      </div>
    </div>

    <!-- 메시지 목록 -->
    <div ref="messagesContainer" class="chat-room__messages">
      <div v-if="isLoading" class="chat-room__loading">
        <span>{{ copy.loadingMessages }}</span>
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
          @reply="handleReplyMessage"
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
