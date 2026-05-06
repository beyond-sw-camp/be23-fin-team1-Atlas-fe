<script setup lang="ts">
/**
 * ChatAvatar — 원형 아바타 공통 컴포넌트
 * 이미지가 있으면 표시, 없으면 기본 프로필 아이콘(person) 표시
 * 크기: sm(28px), md(40px), lg(48px)
 */
defineProps<{
  /** 프로필 이미지 URL */
  imageUrl?: string | null
  /** 이름 (alt 속성용) */
  name?: string
  /** 아바타 크기 */
  size?: 'sm' | 'md' | 'lg'
}>()
</script>

<template>
  <div :class="['chat-avatar', `chat-avatar--${size || 'md'}`]">
    <img
      v-if="imageUrl"
      :src="imageUrl"
      :alt="name || '프로필'"
      class="chat-avatar__image"
    />
    <span
      v-else
      class="chat-avatar__default"
    >
      <span class="material-symbols-outlined">person</span>
    </span>
  </div>
</template>
