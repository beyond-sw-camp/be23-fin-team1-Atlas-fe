<script setup lang="ts">
/**
 * ChatReferenceCard — 업무 참조 카드 (메시지 내 인라인)
 * reference_type에 따라 좌측 리본 색상이 변경됨:
 *   ORDER → primary, RETURN_REQUEST → error
 */
import { useRouter } from 'vue-router'
import { useAtlasChatStore } from '../../stores/chat'

const props = defineProps<{
  referenceType: string
  referencePublicId?: string
  referenceCode?: string
  referenceTitle?: string
}>()

const router = useRouter()
const chatStore = useAtlasChatStore()

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
  const labels: Record<string, string> = {
    ORDER: '발주서',
    RETURN_REQUEST: '반품 요청',
    LOT: 'LOT 추적',
  }

  return labels[type] || '업무 참조'
}

function handleCardClick() {
  const detailKindByType: Record<string, string> = {
    ORDER: 'orders',
    RETURN_REQUEST: 'returns',
    SUB_PURCHASE_ORDER: 'sub-orders',
  }
  const kind = detailKindByType[props.referenceType]

  if (!kind || !props.referencePublicId) return

  // 클릭 시 채팅 패널을 잠시 숨기고 화면 이동
  chatStore.closePanel()

  router.push({
    name: 'operationDetail',
    params: { kind, publicId: props.referencePublicId },
  })
}
</script>

<template>
  <div
    :class="['chat-ref-card', getRibbonClass(referenceType)]"
    @click="handleCardClick"
    @keydown.enter.prevent="handleCardClick"
    @keydown.space.prevent="handleCardClick"
    role="button"
    tabindex="0"
  >
    <div class="chat-ref-card__header">
      <span class="chat-ref-card__type">{{ getTypeLabel(referenceType) }}</span>
      <span class="material-symbols-outlined chat-ref-card__link-icon">open_in_new</span>
    </div>
    <strong class="chat-ref-card__code">{{ referenceCode ?? '—' }}</strong>
    <p v-if="referenceTitle" class="chat-ref-card__title">{{ referenceTitle }}</p>
  </div>
</template>

<style scoped>
.chat-ref-card {
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.chat-ref-card:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.chat-ref-card:active {
  transform: translateY(0);
}
</style>
