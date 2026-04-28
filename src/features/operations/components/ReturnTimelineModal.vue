<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseModal } from '../../shared'
import {
  getReturnHistories,
  updateReturnStatus,
  type ReturnRequestResponseDto,
  type ReturnStatusHistoryResponseDto,
} from '../../../services/return'

const props = defineProps<{
  isOpen: boolean
  targetReturn: ReturnRequestResponseDto | null
  language: 'ko' | 'en'
  orgNameMap?: Record<string, string>
}>()

const emit = defineEmits<{
  close: []
  statusChanged: []
}>()

const histories = ref<ReturnStatusHistoryResponseDto[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const reasonText = ref('')
const expandedHistoryIds = ref<Set<number>>(new Set())

const myOrgPublicId = window.sessionStorage.getItem('atlas-organization-public-id') ?? ''

const isTargetOrg = computed(() => {
  if (!props.targetReturn) return false
  return props.targetReturn.targetOrganizationPublicId === myOrgPublicId
})

const isRequestOrg = computed(() => {
  if (!props.targetReturn) return false
  return props.targetReturn.requestOrganizationPublicId === myOrgPublicId
})

const canChangeStatus = computed(() => {
  if (!props.targetReturn) return false

  if (props.targetReturn.returnStatus === 'REQUESTED') {
    return isTargetOrg.value
  }

  if (props.targetReturn.returnStatus === 'APPROVED') {
    return isRequestOrg.value
  }

  if (
    props.targetReturn.returnStatus === 'IN_TRANSIT' ||
    props.targetReturn.returnStatus === 'RECEIVED'
  ) {
    return isTargetOrg.value
  }

  return false
})

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '반품 상태 이력',
        desc: '선택한 반품 요청의 상태 변경 이력을 확인하고 상태를 변경합니다.',
        currentStatus: '현재 상태',
        returnInfo: '반품 정보',
        returnType: '반품 유형',
        reqOrg: '요청 조직',
        targetOrg: '대상 조직',
        sourceShipment: '원본 출하',
        returnShipment: '반품 출하',
        reason: '반품 사유',
        timeline: '상태 변경 이력',
        empty: '이력이 없습니다.',
        loading: '이력을 불러오는 중입니다.',
        actApprove: '승인',
        actReject: '반려',
        actTransit: '회수 중 처리',
        actReceive: '입고 완료 처리',
        actComplete: '처리 완료',
        reasonPlaceholder: '상태 변경 사유를 입력하세요. 필수입니다.',
        reasonAlert: '상태 변경 사유를 입력해주세요.',
        close: '닫기',
        statusActions: '상태 변경',
        itemsTitle: '반품 품목 목록',
        item: '품목',
        qty: '수량',
        detail: '상세 사유',
        viewReason: '사유 보기',
        hideReason: '사유 닫기',
      }
    : {
        title: 'Return Audit Trail',
        desc: 'View status transitions and update the selected return request.',
        currentStatus: 'Current Status',
        returnInfo: 'Return Info',
        returnType: 'Return Type',
        reqOrg: 'Request Org',
        targetOrg: 'Target Org',
        sourceShipment: 'Source Shipment',
        returnShipment: 'Return Shipment',
        reason: 'Reason',
        timeline: 'Status History',
        empty: 'No history found.',
        loading: 'Loading histories...',
        actApprove: 'Approve',
        actReject: 'Reject',
        actTransit: 'In Transit',
        actReceive: 'Receive',
        actComplete: 'Complete',
        reasonPlaceholder: 'Enter reason for status change. Required.',
        reasonAlert: 'Reason is required to change status.',
        close: 'Close',
        statusActions: 'Status Actions',
        itemsTitle: 'Return Items',
        item: 'Item',
        qty: 'Qty',
        detail: 'Detail',
        viewReason: 'View Reason',
        hideReason: 'Hide Reason',
      }
})

function toggleHistoryReason(id: number) {
  if (expandedHistoryIds.value.has(id)) {
    expandedHistoryIds.value.delete(id)
    return
  }

  expandedHistoryIds.value.add(id)
}

function getOrgName(publicId?: string): string {
  if (!publicId) return '-'
  if (props.orgNameMap?.[publicId]) return props.orgNameMap[publicId]
  return publicId.length > 12 ? `${publicId.slice(0, 12)}...` : publicId
}

function shortId(value?: string | null) {
  if (!value) return '-'
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
}

function formatStatus(status?: string): string {
  if (!status) return props.language === 'ko' ? '초기' : 'INITIAL'
  if (props.language !== 'ko') return status

  const labels: Record<string, string> = {
    REQUESTED: '요청됨',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
    IN_TRANSIT: '회수 중',
    RECEIVED: '입고 완료',
    COMPLETED: '처리 완료',
  }

  return labels[status] ?? status
}

function formatReturnType(type: string): string {
  if (props.language !== 'ko') return type

  const labels: Record<string, string> = {
    DAMAGE: '파손',
    DEFECTIVE: '불량',
    MISDELIVERY: '오배송',
    SIMPLE_RETURN: '단순 반품',
  }

  return labels[type] ?? type
}

function getStatusTone(status: string): string {
  switch (status) {
    case 'REQUESTED':
      return 'warning'
    case 'APPROVED':
    case 'COMPLETED':
      return 'nominal'
    case 'REJECTED':
      return 'critical'
    case 'IN_TRANSIT':
    case 'RECEIVED':
      return 'info'
    default:
      return ''
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'

  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${month}-${day} ${hours}:${minutes}`
}

async function loadHistories() {
  if (!props.targetReturn) return

  try {
    isLoading.value = true
    histories.value = await getReturnHistories(props.targetReturn.publicId)
  } catch (error) {
    console.warn('Failed to load return histories:', error)
    histories.value = []
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen || !props.targetReturn) return

    reasonText.value = ''
    expandedHistoryIds.value.clear()
    loadHistories()
  },
)

async function doUpdateStatus(
  nextStatus: 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED',
) {
  if (!props.targetReturn) return

  if (!reasonText.value.trim()) {
    alert(content.value.reasonAlert)
    return
  }

  try {
    isUpdating.value = true
    await updateReturnStatus(props.targetReturn.publicId, {
      returnStatus: nextStatus,
      reason: reasonText.value.trim(),
    })

    await loadHistories()
    reasonText.value = ''
    emit('statusChanged')
  } catch (error: any) {
    alert(error.message || 'Status update failed.')
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="isOpen"
    :title="targetReturn ? `${targetReturn.returnNumber} ${content.title}` : content.title"
    :description="content.desc"
    size="md"
    @update:model-value="emit('close')"
  >
    <div v-if="targetReturn" class="timeline-container">
      <div class="current-status-block">
        <div class="current-status-block__row">
          <span class="current-status-block__label">{{ content.currentStatus }}</span>
          <span :class="['status-badge', `is-${getStatusTone(targetReturn.returnStatus)}`]">
            {{ formatStatus(targetReturn.returnStatus) }}
          </span>
        </div>
      </div>

      <div class="info-card">
        <div class="info-card__eyebrow">{{ content.returnInfo }}</div>
        <div class="info-card__grid">
          <div class="info-card__item">
            <span class="info-card__label">{{ content.returnType }}</span>
            <span class="info-card__value">{{ formatReturnType(targetReturn.returnType) }}</span>
          </div>
          <div class="info-card__item">
            <span class="info-card__label">{{ content.sourceShipment }}</span>
            <span class="info-card__value">{{ shortId(targetReturn.sourceShipmentPublicId) }}</span>
          </div>
          <div class="info-card__item">
            <span class="info-card__label">{{ content.returnShipment }}</span>
            <span class="info-card__value">{{ shortId(targetReturn.returnShipmentPublicId) }}</span>
          </div>
          <div class="info-card__item">
            <span class="info-card__label">{{ content.reqOrg }}</span>
            <span class="info-card__value">
              {{ targetReturn.requestOrganizationName || getOrgName(targetReturn.requestOrganizationPublicId) }}
            </span>
          </div>
          <div class="info-card__item">
            <span class="info-card__label">{{ content.targetOrg }}</span>
            <span class="info-card__value">
              {{ targetReturn.targetOrganizationName || getOrgName(targetReturn.targetOrganizationPublicId) }}
            </span>
          </div>
          <div class="info-card__item info-card__item--full">
            <span class="info-card__label">{{ content.reason }}</span>
            <span class="info-card__value">{{ targetReturn.returnReason || '-' }}</span>
          </div>
        </div>
      </div>

      <div v-if="targetReturn.items && targetReturn.items.length > 0" class="info-card">
        <div class="info-card__eyebrow">{{ content.itemsTitle }}</div>
        <div class="items-list">
          <div class="items-list__row items-list__row--head">
            <span>{{ content.item }}</span>
            <span>{{ content.qty }}</span>
            <span>{{ content.detail }}</span>
          </div>
          <div v-for="item in targetReturn.items" :key="item.id" class="items-list__row">
            <span>{{ item.itemName || shortId(item.itemPublicId) }}</span>
            <span>{{ item.returnQty }} {{ item.unit }}</span>
            <span>{{ item.detailReason || '-' }}</span>
          </div>
        </div>
      </div>

      <div
        class="page-panel"
        style="background: var(--color-surface-container-lowest); border: 1px solid var(--color-surface-container-high); padding: 16px;"
      >
        <div class="page-panel__head" style="margin-bottom: 12px;">
          <div class="page-panel__eyebrow">{{ content.timeline }}</div>
        </div>

        <div class="page-feed">
          <div
            v-if="isLoading"
            style="text-align: center; padding: 16px; color: var(--color-on-surface-variant); font-style: italic;"
          >
            {{ content.loading }}
          </div>
          <div
            v-else-if="histories.length === 0"
            style="text-align: center; padding: 16px; color: var(--color-on-surface-variant); font-style: italic;"
          >
            {{ content.empty }}
          </div>

          <div v-for="history in histories" v-else :key="history.id" class="page-feed__item">
            <span class="page-feed__label">{{ formatDate(history.recordedAt) }}</span>
            <strong
              class="page-feed__text"
              :style="history.reason ? 'cursor: pointer; display: flex; align-items: center;' : 'display: flex; align-items: center;'"
              @click="history.reason && toggleHistoryReason(history.id)"
            >
              <span style="opacity: 0.5; margin-right: 4px;">
                [{{ formatStatus(history.beforeStatus) }}]
              </span>
              ->
              <span
                :class="{
                  'text-critical': history.afterStatus === 'REJECTED',
                  'text-nominal': history.afterStatus === 'COMPLETED' || history.afterStatus === 'APPROVED',
                }"
                style="margin-left: 4px;"
              >
                {{ formatStatus(history.afterStatus) }}
              </span>
              <span
                v-if="history.reason"
                style="font-size: 0.7rem; color: var(--color-primary); margin-left: auto;"
              >
                {{ expandedHistoryIds.has(history.id) ? content.hideReason : content.viewReason }}
              </span>
            </strong>
            <div v-if="history.reason && expandedHistoryIds.has(history.id)" class="page-feed__reason">
              "{{ history.reason }}"
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="canChangeStatus"
        class="action-block"
      >
        <div class="action-block__eyebrow">{{ content.statusActions }}</div>
        <textarea
          v-model="reasonText"
          :placeholder="content.reasonPlaceholder"
          rows="2"
          class="action-reason"
          :disabled="isUpdating"
        />

        <div class="action-buttons">
          <template v-if="targetReturn.returnStatus === 'REQUESTED'">
            <button class="btn btn-approve" type="button" :disabled="isUpdating" @click="doUpdateStatus('APPROVED')">
              {{ content.actApprove }}
            </button>
            <button class="btn btn-reject" type="button" :disabled="isUpdating" @click="doUpdateStatus('REJECTED')">
              {{ content.actReject }}
            </button>
          </template>
          <template v-if="targetReturn.returnStatus === 'APPROVED'">
            <button class="btn btn-primary" type="button" :disabled="isUpdating" @click="doUpdateStatus('IN_TRANSIT')">
              {{ content.actTransit }}
            </button>
          </template>
          <template v-if="targetReturn.returnStatus === 'IN_TRANSIT'">
            <button class="btn btn-primary" type="button" :disabled="isUpdating" @click="doUpdateStatus('RECEIVED')">
              {{ content.actReceive }}
            </button>
          </template>
          <template v-if="targetReturn.returnStatus === 'RECEIVED'">
            <button class="btn btn-success" type="button" :disabled="isUpdating" @click="doUpdateStatus('COMPLETED')">
              {{ content.actComplete }}
            </button>
          </template>
        </div>
      </div>

      <div class="return-timeline-modal__footer">
        <button class="page-button page-button--secondary" type="button" @click="emit('close')">
          {{ content.close }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;
}

.current-status-block {
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  padding: 16px;
}

.current-status-block__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-status-block__label {
  color: var(--color-on-surface-variant);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.status-badge {
  padding: 4px 16px;
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.status-badge.is-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.status-badge.is-nominal {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.status-badge.is-critical {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-badge.is-info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.info-card {
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  padding: 16px;
}

.info-card__eyebrow {
  margin-bottom: 12px;
  color: var(--color-on-surface-variant);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.info-card__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-card__item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-card__item--full {
  grid-column: 1 / -1;
}

.info-card__label {
  color: var(--color-on-surface-variant);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.info-card__value {
  color: var(--color-on-surface);
  font-size: 0.875rem;
}

.items-list {
  display: flex;
  flex-direction: column;
}

.items-list__row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr;
  gap: 8px;
  border-bottom: 1px solid var(--color-surface-container-high);
  padding: 8px 0;
  font-size: 0.8rem;
}

.items-list__row--head {
  color: var(--color-on-surface-variant);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.items-list__row:last-child {
  border-bottom: none;
}

.page-feed__item {
  margin-bottom: 8px;
  background: var(--color-surface-container);
  padding: 12px;
}

.page-feed__label {
  color: var(--color-on-surface-variant);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
}

.page-feed__text {
  display: block;
  margin-top: 4px;
  color: var(--color-on-surface);
  font-size: 0.875rem;
}

.page-feed__reason {
  margin-top: 6px;
  border-left: 2px solid var(--color-primary);
  background: var(--color-surface-container-lowest);
  color: var(--color-on-surface);
  padding: 8px;
  font-size: 0.8rem;
  font-style: italic;
}

.text-critical {
  color: #ef4444 !important;
  font-weight: 700;
}

.text-nominal {
  color: #10b981 !important;
  font-weight: 700;
}

.action-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  padding: 16px;
}

.action-block__eyebrow {
  color: var(--color-on-surface-variant);
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.action-reason {
  border: 1px solid var(--color-surface-container-high);
  outline: none;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  padding: 12px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.action-reason:focus {
  border-color: var(--color-primary);
}

.action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: opacity 0.2s;
}

.btn:hover {
  opacity: 0.8;
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-on-primary);
}

.btn-approve {
  background: #10b981;
  color: #fff;
}

.btn-reject {
  background: #ef4444;
  color: #fff;
}

.btn-success {
  background: #6366f1;
  color: #fff;
}

.return-timeline-modal__footer {
  display: flex;
  justify-content: flex-end;
}
</style>
