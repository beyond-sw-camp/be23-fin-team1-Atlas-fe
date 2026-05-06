<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAtlasSessionStore } from '../../stores/session'
import { getPurchaseOrders } from '../../services/purchaseOrder'
import { getReturnRequests } from '../../services/return'
import type { PurchaseOrderSummaryResponseDto } from '../../services/purchaseOrder'
import type { ReturnRequestResponseDto } from '../../services/return'

const props = defineProps<{
  isOpen: boolean
  referenceType: string // 'ORDER' | 'RETURN_REQUEST'
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select', refType: string, refPublicId: string, refCode: string, refTitle: string): void
}>()

const session = useAtlasSessionStore()
const isLoading = ref(false)
const keyword = ref('')

const orderList = ref<PurchaseOrderSummaryResponseDto[]>([])
const returnList = ref<ReturnRequestResponseDto[]>([])

const typeLabel = computed(() => {
  if (props.referenceType === 'ORDER') return '발주서 검색'
  if (props.referenceType === 'RETURN_REQUEST') return '반품 요청 검색'
  return ''
})

async function fetchList() {
  if (!props.referenceType) return
  isLoading.value = true
  try {
    if (props.referenceType === 'ORDER') {
      const viewType = session.organizationType === 'BUYER' ? 'BUYER' : 'SUPPLIER'
      const res = await getPurchaseOrders({ viewType, keyword: keyword.value, page: 0, size: 20 })
      orderList.value = res.content
    } else if (props.referenceType === 'RETURN_REQUEST') {
      const res = await getReturnRequests({ keyword: keyword.value, page: 0, size: 20 })
      returnList.value = res.content
    }
  } catch (error) {
    console.error('Failed to fetch reference list:', error)
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      keyword.value = ''
      orderList.value = []
      returnList.value = []
      fetchList()
    }
  }
)

function handleSearch() {
  fetchList()
}

function selectOrder(order: PurchaseOrderSummaryResponseDto) {
  emit('select', 'ORDER', order.poPublicId, order.poNumber, order.supplierName ? `${order.supplierName} 발주건` : '발주서')
  emit('close')
}

function selectReturn(ret: ReturnRequestResponseDto) {
  const reason = ret.returnReason || '반품 요청'
  emit('select', 'RETURN_REQUEST', ret.publicId, ret.returnNumber, reason)
  emit('close')
}
</script>

<template>
  <Transition name="chat-modal">
    <div v-if="isOpen" class="chat-ref-modal-overlay" @mousedown.self="$emit('close')">
      <div class="chat-ref-modal">
        <div class="chat-ref-modal__header">
          <h3>{{ typeLabel }}</h3>
          <button type="button" @click="$emit('close')" class="chat-ref-modal__close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div class="chat-ref-modal__search">
          <span class="material-symbols-outlined">search</span>
          <input
            v-model="keyword"
            type="text"
            placeholder="검색어 입력 후 Enter"
            @keydown.enter="handleSearch"
          />
        </div>

        <div class="chat-ref-modal__content">
          <div v-if="isLoading" class="chat-ref-modal__loading">
            <span class="material-symbols-outlined">autorenew</span>
          </div>

          <template v-else-if="referenceType === 'ORDER'">
            <div v-if="orderList.length === 0" class="chat-ref-modal__empty">
              결과가 없습니다.
            </div>
            <div
              v-for="order in orderList"
              :key="order.poPublicId"
              class="chat-ref-modal__item"
              @click="selectOrder(order)"
            >
              <div class="chat-ref-modal__item-code">{{ order.poNumber }}</div>
              <div class="chat-ref-modal__item-title">{{ order.supplierName }} | {{ order.totalAmount.toLocaleString() }} {{ order.currencyCode }}</div>
            </div>
          </template>

          <template v-else-if="referenceType === 'RETURN_REQUEST'">
            <div v-if="returnList.length === 0" class="chat-ref-modal__empty">
              결과가 없습니다.
            </div>
            <div
              v-for="ret in returnList"
              :key="ret.publicId"
              class="chat-ref-modal__item"
              @click="selectReturn(ret)"
            >
              <div class="chat-ref-modal__item-code">{{ ret.returnNumber }}</div>
              <div class="chat-ref-modal__item-title">{{ ret.requestOrganizationName }} - {{ ret.returnReason }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.chat-modal-enter-active,
.chat-modal-leave-active {
  transition: opacity 0.2s ease;
}
.chat-modal-enter-from,
.chat-modal-leave-to {
  opacity: 0;
}

.chat-ref-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-ref-modal {
  width: 90%;
  max-width: 400px;
  background-color: var(--chat-bg);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 80vh;
}

.chat-ref-modal__header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--chat-border);
}

.chat-ref-modal__header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--chat-text);
}

.chat-ref-modal__close {
  background: none;
  border: none;
  color: var(--chat-text-muted);
  cursor: pointer;
}

.chat-ref-modal__search {
  margin: 16px;
  padding: 8px 12px;
  background-color: var(--chat-surface);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--chat-border);
}

.chat-ref-modal__search .material-symbols-outlined {
  color: var(--chat-text-muted);
  font-size: 20px;
}

.chat-ref-modal__search input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--chat-text);
  outline: none;
}

.chat-ref-modal__content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.chat-ref-modal__loading,
.chat-ref-modal__empty {
  padding: 32px;
  text-align: center;
  color: var(--chat-text-muted);
}

.chat-ref-modal__loading .material-symbols-outlined {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.chat-ref-modal__item {
  padding: 12px;
  border: 1px solid var(--chat-border);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-ref-modal__item:hover {
  background-color: var(--chat-surface);
}

.chat-ref-modal__item-code {
  font-size: 12px;
  color: var(--chat-primary);
  font-weight: 600;
  margin-bottom: 4px;
}

.chat-ref-modal__item-title {
  font-size: 14px;
  color: var(--chat-text);
}
</style>
