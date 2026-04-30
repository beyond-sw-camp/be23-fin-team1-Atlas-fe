<script setup lang="ts">
/**
 * ChatInput — 메시지 입력 영역
 * 레퍼런스: pill 형태 입력 + 이모지 버튼 + 원형 전송 버튼
 */
import { ref } from 'vue'
import ChatEmojiPicker from './ChatEmojiPicker.vue'
import { useAtlasChatStore } from '../../stores/chat'

const chatStore = useAtlasChatStore()

const emit = defineEmits<{
  send: [body: string]
  sendReference: [refType: string, refCode: string, refTitle: string]
}>()

const inputText = ref('')
const isMenuOpen = ref(false)
const isRefPickerOpen = ref(false)
const isEmojiPickerOpen = ref(false)

/** + 버튼 팝업 메뉴 항목 */
const menuItems = [
  { key: 'file', icon: 'description', label: '파일 첨부' },
  { key: 'media', icon: 'image', label: '미디어 (이미지/동영상)' },
  { key: 'reference', icon: 'credit_card', label: '업무 참조 카드' },
]

/** 업무 참조 카드 유형 목록 */
const referenceTypes = [
  { type: 'ORDER', icon: 'local_shipping', label: '발주서', code: 'PO-2026-0413', title: '발주서 참조' },
  { type: 'RETURN_REQUEST', icon: 'assignment_return', label: '반품 요청', code: 'RT-2026-0098', title: '반품 처리 건' },
  { type: 'RISK', icon: 'warning', label: '리스크 이벤트', code: 'RSK-2026-0015', title: '리스크 알림 건' },
  { type: 'RECOMMENDATION', icon: 'lightbulb', label: '권고안', code: 'REC-2026-0007', title: '대응 권고안' },
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
    alert('파일 첨부 기능은 file-service 연동 후 활성화됩니다.')
  } else if (key === 'media') {
    alert('미디어 첨부 기능은 file-service 연동 후 활성화됩니다.')
  }

  closeMenu()
}

function handleRefSelect(ref: { type: string; code: string; title: string }) {
  emit('sendReference', ref.type, ref.code, ref.title)
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
        <strong>{{ chatStore.replyTarget.senderDisplayName }}에게 답장</strong>
        <p>{{ chatStore.replyTarget.messageBody }}</p>
      </div>
      <button 
        class="chat-input__reply-close" 
        type="button" 
        title="답장 취소"
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

    <div class="chat-input">
      <!-- + 버튼 (첨부 메뉴 트리거) -->
      <div class="chat-input__menu-wrapper">
        <button
          :class="['chat-input__plus', { 'is-active': isMenuOpen }]"
          type="button"
          title="첨부"
          @click="toggleMenu"
        >
          <span class="material-symbols-outlined">add</span>
        </button>

        <!-- 팝업 메뉴 -->
        <Transition name="chat-menu">
          <div v-if="isMenuOpen && !isRefPickerOpen" class="chat-input__menu">
            <button
              v-for="item in menuItems"
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
              <span class="chat-input__menu-label">업무 참조 카드</span>
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
                <strong>{{ rt.label }}</strong>
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
          placeholder="Type your message..."
          @keydown="handleKeydown"
          @focus="closeMenu"
        />
      </div>

      <!-- 이모지 버튼 -->
      <button
        :class="['chat-input__emoji-btn', { 'is-active': isEmojiPickerOpen }]"
        type="button"
        title="이모지"
        @click="toggleEmojiPicker"
      >
        <span class="material-symbols-outlined">sentiment_satisfied</span>
      </button>

      <!-- 전송 버튼 (원형, 보라 그라데이션) -->
      <button class="chat-input__send" type="button" title="전송" @click="handleSend">
        <span class="material-symbols-outlined">send</span>
      </button>
    </div>
  </div>
</template>
