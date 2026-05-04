<script setup lang="ts">
/**
 * ChatInput — 메시지 입력 영역
 * 레퍼런스: pill 형태 입력 + 이모지 버튼 + 원형 전송 버튼
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import ChatEmojiPicker from './ChatEmojiPicker.vue'
import { useAtlasChatStore } from '../../stores/chat'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { uploadAttachment } from '../../services/file'
import ChatReferenceSearchModal from './ChatReferenceSearchModal.vue'

const chatStore = useAtlasChatStore()
const preferences = useAtlasPreferencesStore()

const emit = defineEmits<{
  send: [body: string]
  sendReference: [refType: string, refPublicId: string, refCode: string, refTitle: string]
}>()

const inputText = ref('')
const inputWrapperRef = ref<HTMLElement | null>(null)
const isMenuOpen = ref(false)
const isRefPickerOpen = ref(false)
const isEmojiPickerOpen = ref(false)
const isSearchModalOpen = ref(false)
const selectedSearchType = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const mediaInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

const chatInputCopy = {
  ko: {
    file: '파일 첨부',
    media: '미디어 (이미지/동영상)',
    reference: '업무 참조 카드',
    filePending: '파일 첨부 기능은 file-service 연동 후 활성화됩니다.',
    mediaPending: '미디어 첨부 기능은 file-service 연동 후 활성화됩니다.',
    replyTo: (name: string) => `${name}에게 답장`,
    cancelReply: '답장 취소',
    attach: '첨부',
    messagePlaceholder: '메시지를 입력하세요...',
    emoji: '이모지',
    send: '전송',
    refTypes: {
      order: '발주서',
      returnRequest: '반품 요청',
      risk: '리스크 이벤트',
      recommendation: '권고안',
    },
  },
  en: {
    file: 'Attach File',
    media: 'Media (Image/Video)',
    reference: 'Work Reference Card',
    filePending: 'File attachments will be available after file-service integration.',
    mediaPending: 'Media attachments will be available after file-service integration.',
    replyTo: (name: string) => `Replying to ${name}`,
    cancelReply: 'Cancel Reply',
    attach: 'Attach',
    messagePlaceholder: 'Type your message...',
    emoji: 'Emoji',
    send: 'Send',
    refTypes: {
      order: 'Purchase Order',
      returnRequest: 'Return Request',
      risk: 'Risk Event',
      recommendation: 'Recommendation',
    },
  },
} as const

function copy() {
  return chatInputCopy[preferences.language]
}

function getReferenceTypeLabel(labelKey: string) {
  return copy().refTypes[labelKey as keyof typeof chatInputCopy.ko.refTypes] ?? labelKey
}

/** + 버튼 팝업 메뉴 항목 */
function getMenuItems() {
  const c = copy()
  return [
    { key: 'file', icon: 'description', label: c.file },
    { key: 'media', icon: 'image', label: c.media },
    { key: 'reference', icon: 'credit_card', label: c.reference },
  ]
}

/** 업무 참조 카드 유형 목록 */
const referenceTypes = ref([
  { type: 'ORDER', icon: 'receipt_long', title: { ko: '발주서', en: 'Purchase Order' } },
  { type: 'RETURN_REQUEST', icon: 'assignment_return', title: { ko: '반품 요청', en: 'Return Request' } },
])

function openSearchModal(type: string) {
  selectedSearchType.value = type
  isSearchModalOpen.value = true
  closeMenu()
}

function handleRefSelectFromModal(refType: string, refPublicId: string, refCode: string, refTitle: string) {
  emit('sendReference', refType, refPublicId, refCode, refTitle)
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  if (!isMenuOpen.value) {
    isRefPickerOpen.value = false
  }
  isEmojiPickerOpen.value = false
}

function closeMenu() {
  isMenuOpen.value = false
  isRefPickerOpen.value = false
}

function closeFloatingMenus() {
  closeMenu()
  isEmojiPickerOpen.value = false
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!isMenuOpen.value && !isRefPickerOpen.value && !isEmojiPickerOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (inputWrapperRef.value?.contains(target)) return
  closeFloatingMenus()
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
})

function handleMenuSelect(key: string) {
  if (key === 'reference') {
    // 카드 선택 서브메뉴 열기
    isRefPickerOpen.value = true
    return
  }

  if (key === 'file') {
    fileInput.value?.click()
  } else if (key === 'media') {
    mediaInput.value?.click()
  }

  closeMenu()
}

async function onFileChange(event: Event, isImage: boolean = false) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length === 0) return

  const roomPublicId = chatStore.currentRoomPublicId
  if (!roomPublicId) return

  isUploading.value = true
  try {
    if (isImage) {
      // 이미지: 한 메시지에 그리드로 묶어서 전송
      const tempRefId = `TMPCHAT${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
      const res = await uploadAttachment(files, 'CHAT_MESSAGE', tempRefId)
      if (res.attachmentPublicId) {
        const messageBody = files.length > 1
          ? `${files[0].name} 외 ${files.length - 1}건`
          : files[0].name
        chatStore.sendFileMessage(res.attachmentPublicId, true, messageBody)
      }
    } else {
      // 파일: 카카오톡 스타일 1개 = 1메시지
      for (const file of files) {
        const tempRefId = `TMPCHAT${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`
        const res = await uploadAttachment(file, 'CHAT_MESSAGE', tempRefId)
        if (res.attachmentPublicId) {
          chatStore.sendFileMessage(res.attachmentPublicId, false, file.name)
        }
      }
    }
  } catch (error) {
    console.error('File upload failed:', error)
    alert('파일 업로드에 실패했습니다.')
  } finally {
    isUploading.value = false
    target.value = ''
  }
}

function handleRefSelect(ref: { type: string; code: string; title: Record<'ko' | 'en', string> }) {
  emit('sendReference', ref.type, ref.code, ref.title[preferences.language])
  closeMenu()
}

function toggleEmojiPicker() {
  isEmojiPickerOpen.value = !isEmojiPickerOpen.value
  isMenuOpen.value = false
  isRefPickerOpen.value = false
}

function handleEmojiSelect(emoji: string) {
  inputText.value += emoji
}

function handleEmojiClose() {
  isEmojiPickerOpen.value = false
}

function handleSend() {
  if (!inputText.value.trim()) return
  emit('send', inputText.value)
  inputText.value = ''
  isEmojiPickerOpen.value = false
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div ref="inputWrapperRef" class="chat-input-wrapper">
    <!-- 숨겨진 다중 파일/미디어 입력 -->
    <input type="file" ref="fileInput" multiple style="display: none" @change="(e) => onFileChange(e, false)" />
    <input type="file" ref="mediaInput" accept="image/*,video/*" multiple style="display: none" @change="(e) => onFileChange(e, true)" />

    <!-- 답장 프리뷰 바 (입력창 상단) -->
    <div v-if="chatStore.replyTarget" class="chat-input__reply-bar">
      <span class="chat-input__reply-icon material-symbols-outlined">reply</span>
      <div class="chat-input__reply-info">
        <strong>{{ copy().replyTo(chatStore.replyTarget.senderDisplayName) }}</strong>
        <p>{{ chatStore.replyTarget.messageBody }}</p>
      </div>
      <button 
        class="chat-input__reply-close" 
        type="button" 
        :title="copy().cancelReply"
        @click="chatStore.clearReplyTarget()"
      >
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    <!-- 이모지 피커 (입력 영역 위에 표시) -->
    <ChatEmojiPicker
      v-if="isEmojiPickerOpen"
      @select="handleEmojiSelect"
      @close="handleEmojiClose"
    />

    <div :class="['chat-input', { 'chat-input--has-reply': chatStore.replyTarget }]">
      <!-- + 버튼 (첨부 메뉴 트리거) -->
      <div class="chat-input__menu-wrapper">
        <button
          :class="['chat-input__plus', { 'is-active': isMenuOpen }]"
          type="button"
          :title="copy().attach"
          @click="toggleMenu"
        >
          <span class="material-symbols-outlined">add</span>
        </button>

        <!-- 팝업 메뉴 -->
        <Transition name="chat-menu">
          <div v-if="isMenuOpen && !isRefPickerOpen" class="chat-input__menu">
            <button
              v-for="item in getMenuItems()"
              :key="item.key"
              class="chat-input__menu-item"
              type="button"
              @click="handleMenuSelect(item.key)"
            >
              <span class="material-symbols-outlined">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
            </button>
          </div>
        </Transition>

        <!-- 업무 참조 카드 서브메뉴 -->
        <Transition name="chat-menu">
          <div v-if="isRefPickerOpen" class="chat-input__menu chat-input__menu--ref">
            <div class="chat-input__menu-head">
              <button class="chat-input__menu-back" type="button" @click="isRefPickerOpen = false">
                <span class="material-symbols-outlined">arrow_back</span>
              </button>
              <span class="chat-input__menu-label">{{ copy().reference }}</span>
            </div>
            <button
              v-for="rt in referenceTypes"
              :key="rt.type"
              class="chat-input__menu-item"
              type="button"
              @click="openSearchModal(rt.type)"
            >
              <span class="material-symbols-outlined">{{ rt.icon }}</span>
              <span>{{ rt.title[preferences.language] }} 검색</span>
            </button>
          </div>
        </Transition>
      </div>

      <ChatReferenceSearchModal
        :is-open="isSearchModalOpen"
        :reference-type="selectedSearchType"
        @close="isSearchModalOpen = false"
        @select="handleRefSelectFromModal"
      />

      <!-- 메시지 입력 (pill 형태) -->
      <div class="chat-input__field-wrapper">
        <input
          v-model="inputText"
          class="chat-input__field"
          type="text"
          :placeholder="isUploading ? '업로드 중...' : copy().messagePlaceholder"
          :disabled="isUploading"
          @keydown="handleKeydown"
          @focus="closeMenu"
        />
      </div>

      <!-- 이모지 버튼 -->
      <button
        :class="['chat-input__emoji-btn', { 'is-active': isEmojiPickerOpen }]"
        type="button"
        :title="copy().emoji"
        @click="toggleEmojiPicker"
      >
        <span class="material-symbols-outlined">sentiment_satisfied</span>
      </button>

      <!-- 전송 버튼 (원형, 보라 그라데이션) -->
      <button class="chat-input__send" type="button" :title="copy().send" @click="handleSend">
        <span class="material-symbols-outlined">send</span>
      </button>
    </div>
  </div>
</template>
