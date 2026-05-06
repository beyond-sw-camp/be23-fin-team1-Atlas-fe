<script setup lang="ts">
/**
 * ChatEmojiPicker — 이모지 피커 패널
 * 순수 유니코드 기반 (외부 의존성 없음)
 */
import { computed, ref } from 'vue'

const emit = defineEmits<{
  select: [emoji: string]
  close: []
}>()

const activeCategory = ref(0)

const emojiLabelMap = computed(() => ({
  smileys: '표정',
  gestures: '손동작',
  hearts: '하트',
  animals: '동물',
  food: '음식',
  activities: '활동',
  travel: '여행',
  objects: '사물',
}))

const categories = computed(() => [
  { icon: '😀', label: emojiLabelMap.value.smileys, emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','😐','😑','😶','🫡','😏','😒','🙄','😬','😮‍💨','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥴','😵','🤯','🥳','🥸','😎','🤓','🧐'] },
  { icon: '👋', label: emojiLabelMap.value.gestures, emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤝','🙏'] },
  { icon: '❤️', label: emojiLabelMap.value.hearts, emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','♥️','💌','💋','😻','❣️'] },
  { icon: '🐶', label: emojiLabelMap.value.animals, emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞'] },
  { icon: '🍕', label: emojiLabelMap.value.food, emojis: ['🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🍕','🍔','🍟','🌭','🍿','🧂','🥚','🍳','🧈','🥞'] },
  { icon: '⚽', label: emojiLabelMap.value.activities, emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂'] },
  { icon: '✈️', label: emojiLabelMap.value.travel, emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🛴','🚲','🛵','🏍️','✈️','🚀','🛸','🚁','🛶','⛵','🚤','🛳️','⛴️','🚢','🗼','🏰','🗽','⛩️','🕌','🛕','⛪','🕍'] },
  { icon: '💡', label: emojiLabelMap.value.objects, emojis: ['💡','🔦','🕯️','📱','💻','⌨️','🖥️','🖨️','🖱️','💾','💿','📀','📷','📹','🎥','📞','☎️','📺','📻','🎙️','🎧','🎤','🎵','🎶','🎹','🥁','🎸','🪗','🎺','🎻','🪕','🎷'] },
])

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
