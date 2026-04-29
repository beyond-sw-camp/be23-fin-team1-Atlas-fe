<script setup lang="ts">
/**
 * ChatReferenceCard — 업무 참조 카드 (메시지 내 인라인)
 * reference_type에 따라 좌측 리본 색상이 변경됨:
 *   ORDER → primary, RETURN_REQUEST → error
 */
defineProps<{
  referenceType: string
  referenceCode?: string
  referenceTitle?: string
}>()

function getRibbonClass(type: string): string {
  switch (type) {
    case 'ORDER':
      return 'chat-ref-card--order'
    case 'RETURN_REQUEST':
      return 'chat-ref-card--return'
    case 'LOT':
      return 'chat-ref-card--lot'
    default:
      return ''
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'ORDER':
      return 'PURCHASE ORDER'
    case 'RETURN_REQUEST':
      return 'RETURN REQUEST'
    case 'LOT':
      return 'LOT TRACKING'
    default:
      return type
  }
}
</script>

<template>
  <div :class="['chat-ref-card', getRibbonClass(referenceType)]">
    <span class="chat-ref-card__type">{{ getTypeLabel(referenceType) }}</span>
    <strong class="chat-ref-card__code">{{ referenceCode ?? '—' }}</strong>
    <p v-if="referenceTitle" class="chat-ref-card__title">{{ referenceTitle }}</p>
  </div>
</template>
