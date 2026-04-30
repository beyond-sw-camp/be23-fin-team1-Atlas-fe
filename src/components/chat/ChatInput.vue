<script setup lang="ts">
/**
 * ChatInput — 메시지 입력 영역
 * 레퍼런스: pill 형태 입력 + 이모지 버튼 + 원형 전송 버튼
 */
import { ref } from 'vue'
import ChatEmojiPicker from './ChatEmojiPicker.vue'
import { useAtlasChatStore } from '../../stores/chat'
import { useAtlasPreferencesStore } from '../../stores/preferences'

const chatStore = useAtlasChatStore()
const preferences = useAtlasPreferencesStore()

const emit = defineEmits<{
  send: [body: string]
  sendReference: [refType: string, refCode: string, refTitle: string]
}>()

const inputText = ref('')
const isMenuOpen = ref(false)
const isRefPickerOpen = ref(false)
const isEmojiPickerOpen = ref(false)

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
const referenceTypes = [
  { type: 'ORDER', icon: 'local_shipping', labelKey: 'order', code: 'PO-2026-0413', title: { ko: '발주서 참조', en: 'Purchase Order Reference' } },
  { type: 'RETURN_REQUEST', icon: 'assignment_return', labelKey: 'returnRequest', code: 'RT-2026-0098', title: { ko: '반품 처리 건', en: 'Return Handling Case' } },
  { type: 'RISK', icon: 'warning', labelKey: 'risk', code: 'RSK-2026-0015', title: { ko: '리스크 알림 건', en: 'Risk Alert Case' } },
  { type: 'RECOMMENDATION', icon: 'lightbulb', labelKey: 'recommendation', code: 'REC-2026-0007', title: { ko: '대응 권고안', en: 'Response Recommendation' } },
]

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

function handleMenuSelect(key: string) {
  if (key === 'reference') {
    // 카드 선택 서브메뉴 열기
    isRefPickerOpen.value = true
    return
  }

  // 파일/미디어: 아직 실제 업로드는 미구현, 동작 피드백만
  if (key === 'file') {
    alert(copy().filePending)
  } else if (key === 'media') {
    alert(copy().mediaPending)
  }

  closeMenu()
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
  <div class="chat-input-wrapper">
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
              @click="handleRefSelect(rt)"
            >
              <span class="material-symbols-outlined">{{ rt.icon }}</span>
              <div class="chat-input__menu-item-info">
                <strong>{{ getReferenceTypeLabel(rt.labelKey) }}</strong>
                <span>{{ rt.code }}</span>
              </div>
            </button>
          </div>
        </Transition>
      </div>

      <!-- 메시지 입력 (pill 형태) -->
      <div class="chat-input__field-wrapper">
        <input
          v-model="inputText"
          class="chat-input__field"
          type="text"
          :placeholder="copy().messagePlaceholder"
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
