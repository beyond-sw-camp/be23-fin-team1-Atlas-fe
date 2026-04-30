<script setup lang="ts">
/**
 * ChatEmojiPicker — 이모지 피커 패널
 * 순수 유니코드 기반 (외부 의존성 없음)
 */
import { ref } from 'vue'

const emit = defineEmits<{
  select: [emoji: string]
  close: []
}>()

const activeCategory = ref(0)

const categories = [
  { icon: '😀', label: '표정', emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','🫡','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥸','😎','🤓','🧐'] },
  { icon: '👋', label: '손동작', emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤝','🙏'] },
  { icon: '❤️', label: '하트', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💋','😻','❣️'] },
  { icon: '🐶', label: '동물', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞'] },
  { icon: '🍕', label: '음식', emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🍕','🍔','🍟','🌭','🍿','🧂','🥚','🍳','🧈','🥞'] },
  { icon: '⚽', label: '활동', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂'] },
  { icon: '✈️', label: '여행', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛴','🚲','🛵','🏍️','✈️','🚀','🛸','🚁','🛶','⛵','🚤','🛳️','⛴️','🚢','🗼','🏰','🗽','⛩️','🕌','🛕','⛪','🕍'] },
  { icon: '💡', label: '사물', emojis: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📹','🎥','📞','☎️','📺','📻','🎙️','🎧','🎤','🎵','🎶','🎹','🥁','🎸','🪗','🎺','🎻','🪕','🎷'] },
]

function selectEmoji(emoji: string) {
  emit('select', emoji)
}

function handleOverlayClick() {
  emit('close')
}
</script>

<template>
  <!-- 오버레이 (피커 밖 클릭 시 닫기) -->
  <div class="chat-emoji-overlay" @click="handleOverlayClick" />

  <div class="chat-emoji-picker">
    <!-- 카테고리 탭 -->
    <div class="chat-emoji-picker__tabs">
      <button
        v-for="(cat, idx) in categories"
        :key="idx"
        :class="['chat-emoji-picker__tab', { 'is-active': activeCategory === idx }]"
        type="button"
        :title="cat.label"
        @click="activeCategory = idx"
      >
        {{ cat.icon }}
      </button>
    </div>

    <!-- 이모지 그리드 -->
    <div class="chat-emoji-picker__grid">
      <button
        v-for="emoji in categories[activeCategory].emojis"
        :key="emoji"
        class="chat-emoji-picker__emoji"
        type="button"
        @click="selectEmoji(emoji)"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>
