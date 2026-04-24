<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { BaseModal } from '../../shared'
import { getReturnHistories, updateReturnStatus, type ReturnStatusHistoryResponseDto, type ReturnRequestResponseDto } from '../../../services/return'
import { getShipment, createShipment } from '../../../services/shipment'

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

// 사유 펼침 상태 관리
const expandedHistoryIds = ref<Set<string>>(new Set())

function toggleHistoryReason(id: string) {
  if (expandedHistoryIds.value.has(id)) {
    expandedHistoryIds.value.delete(id)
  } else {
    expandedHistoryIds.value.add(id)
  }
}

// 현재 로그인한 사용자의 조직 publicId
const myOrgPublicId = window.sessionStorage.getItem('atlas-organization-public-id') ?? ''

// 현재 사용자가 대상 조직(반품을 수신하는 측)인지 확인
const isTargetOrg = computed(() => {
  if (!props.targetReturn) return false
  return props.targetReturn.targetOrganizationPublicId === myOrgPublicId
})

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '반품 상태 이력',
        desc: '선택한 반품 항목의 상태 전환 및 감사 이력(Audit Trail)을 확인합니다.',
        currentStatus: '현재 상태',
        returnInfo: '반품 정보',
        returnNo: '반품 번호',
        returnType: '반품 유형',
        reqOrg: '요청 조직',
        targetOrg: '대상 조직',
        reason: '반품 사유',
        timeline: '상태 변경 이력',
        empty: '이력이 존재하지 않습니다.',
        actApprove: '승인',
        actReject: '반려',
        actTransit: '회수 중 처리',
        actReceive: '입고 완료 처리',
        actComplete: '처리 완료',
        reasonPlaceholder: '상태 변경 사유를 입력하세요 (필수)',
        reasonAlert: '상태 변경 사유를 반드시 입력해주세요.',
        chatBtn: '채팅으로 업무 공유',
        close: '닫기',
        statusActions: '상태 변경',
        itemsTitle: '반품 품목 목록',
      }
    : {
        title: 'Return Audit Trail',
        desc: 'View status transitions and audit trail for the selected return request.',
        currentStatus: 'Current Status',
        returnInfo: 'Return Info',
        returnNo: 'Return No.',
        returnType: 'Return Type',
        reqOrg: 'Request Org',
        targetOrg: 'Target Org',
        reason: 'Reason',
        timeline: 'Status History',
        empty: 'No history found.',
        actApprove: 'Approve',
        actReject: 'Reject',
        actTransit: 'In Transit',
        actReceive: 'Receive',
        actComplete: 'Complete',
        reasonPlaceholder: 'Enter reason for status change (Required)',
        reasonAlert: 'Reason is required to change status.',
        chatBtn: 'Share via Chat',
        close: 'Close',
        statusActions: 'Status Actions',
        itemsTitle: 'Return Items',
      }
})

// 상태 한글 매핑
function formatStatus(status: string): string {
  if (!status) return props.language === 'ko' ? '초기' : 'INITIAL'
  if (props.language !== 'ko') return status
  const map: Record<string, string> = {
    REQUESTED: '요청됨',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
    IN_TRANSIT: '회수 중',
    RECEIVED: '입고 완료',
    COMPLETED: '처리 완료'
  }
  return map[status] || status
}

// 조직명 조회 헬퍼
function getOrgName(publicId: string | undefined): string {
  if (!publicId) return '-'
  if (props.orgNameMap && props.orgNameMap[publicId]) {
    return props.orgNameMap[publicId]
  }
  return publicId.slice(0, 8) + '...'
}

// 반품 유형 한글 매핑
function formatReturnType(type: string): string {
  if (props.language !== 'ko') return type
  const map: Record<string, string> = {
    DAMAGE: '파손',
    DEFECTIVE: '불량',
    MISDELIVERY: '오배송',
    SIMPLE_RETURN: '단순 반품'
  }
  return map[type] || type
}

// 상태별 톤 색상 결정
function getStatusTone(status: string): string {
  switch (status) {
    case 'REQUESTED': return 'warning'
    case 'APPROVED': return 'nominal'
    case 'REJECTED': return 'critical'
    case 'IN_TRANSIT': return 'info'
    case 'RECEIVED': return 'info'
    case 'COMPLETED': return 'nominal'
    default: return ''
  }
}

// 날짜 포맷터 (LOT 추적 이력과 동일)
function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

watch(() => props.isOpen, async (newVal) => {
  if (newVal && props.targetReturn) {
    reasonText.value = ''
    try {
      isLoading.value = true
      histories.value = await getReturnHistories(props.targetReturn.publicId)
    } catch(err) {
      console.warn('Failed to load histories:', err)
      histories.value = []
    } finally {
      isLoading.value = false
    }
  }
})

async function doUpdateStatus(nextStatus: 'APPROVED'|'REJECTED'|'IN_TRANSIT'|'RECEIVED'|'COMPLETED') {
  if (!props.targetReturn) return
  if (!reasonText.value.trim()) {
    alert(content.value.reasonAlert)
    return
  }

  isUpdating.value = true
  try {
    await updateReturnStatus(props.targetReturn.publicId, {
      returnStatus: nextStatus,
      reason: reasonText.value.trim()
    })
    
    // 승인 시 자동으로 회수용 출하(Shipment) 생성
    if (nextStatus === 'APPROVED' && props.targetReturn.sourceShipmentPublicId) {
      try {
        const originalShipment = await getShipment(props.targetReturn.sourceShipmentPublicId)
        
        let offsetDays = 3 // 기본값 3일
        if (originalShipment.departureEta && originalShipment.arrivalEta) {
          const diffMs = new Date(originalShipment.arrivalEta).getTime() - new Date(originalShipment.departureEta).getTime()
          const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
          if (days > 0) offsetDays = days
        }
        
        const now = new Date()
        const departureDate = new Date(now)
        const arrivalDate = new Date(now.getTime() + (offsetDays * 24 * 60 * 60 * 1000))
        
        const randomNum = Math.floor(1000 + Math.random() * 9000)
        const newShipmentNumber = `SHP-RT-${now.getFullYear()}-${randomNum}`
        
        await createShipment({
          shipmentNumber: newShipmentNumber,
          poId: originalShipment.poId,
          subPoId: originalShipment.subPoId,
          carrierName: originalShipment.carrierName || '',
          vehicleNo: '',
          trackingNo: '',
          originNodePublicId: originalShipment.destinationNodePublicId,
          destinationNodePublicId: originalShipment.originNodePublicId,
          departureEta: departureDate.toISOString().slice(0, 16),
          arrivalEta: arrivalDate.toISOString().slice(0, 16),
          temperatureRequired: originalShipment.temperatureRequired || false
        })
        
        if (props.language === 'ko') {
          alert(`반품 승인 완료. 회수용 출하(${newShipmentNumber})가 자동 생성되었습니다.`)
        }
      } catch (shipmentErr) {
        console.error('Failed to create return shipment automatically:', shipmentErr)
        // 출하 생성 실패 시에도 반품 승인은 이미 완료되었으므로 알림만 띄움
        alert(props.language === 'ko' ? '반품은 승인되었으나 자동 출하 생성에 실패했습니다.' : 'Approved, but failed to auto-create shipment.')
      }
    }

    histories.value = await getReturnHistories(props.targetReturn.publicId)
    reasonText.value = ''
    emit('statusChanged')
  } catch (err: any) {
    alert(err.message || 'Status update failed.')
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
    <div class="timeline-container" v-if="targetReturn">
      
      <!-- 현재 상태 블록 (LOT 추적 이력 스타일과 통일) -->
      <div class="current-status-block">
        <div class="current-status-block__row">
          <span class="current-status-block__label">{{ content.currentStatus }}</span>
          <span :class="['status-badge', `is-${getStatusTone(targetReturn.returnStatus)}`]">
            {{ formatStatus(targetReturn.returnStatus) }}
          </span>
        </div>
      </div>

      <!-- 반품 정보 요약 카드 -->
      <div class="info-card">
        <div class="info-card__eyebrow">{{ content.returnInfo }}</div>
        <div class="info-card__grid">
          <div class="info-card__item">
            <span class="info-card__label">{{ content.returnType }}</span>
            <span class="info-card__value">{{ formatReturnType(targetReturn.returnType) }}</span>
          </div>
          <div class="info-card__item">
            <span class="info-card__label">{{ content.reqOrg }}</span>
            <span class="info-card__value">{{ targetReturn.requestOrganizationName || getOrgName(targetReturn.requestOrganizationPublicId) }}</span>
          </div>
          <div class="info-card__item">
            <span class="info-card__label">{{ content.targetOrg }}</span>
            <span class="info-card__value">{{ targetReturn.targetOrganizationName || getOrgName(targetReturn.targetOrganizationPublicId) }}</span>
          </div>
          <div class="info-card__item info-card__item--full">
            <span class="info-card__label">{{ content.reason }}</span>
            <span class="info-card__value">{{ targetReturn.returnReason || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 반품 품목 목록 -->
      <div class="info-card" v-if="targetReturn.items && targetReturn.items.length > 0">
        <div class="info-card__eyebrow">{{ content.itemsTitle }}</div>
        <div class="items-list">
          <div class="items-list__row items-list__row--head">
            <span>{{ language === 'ko' ? '품목' : 'Item' }}</span>
            <span>{{ language === 'ko' ? '수량' : 'Qty' }}</span>
            <span>{{ language === 'ko' ? '상세 사유' : 'Detail' }}</span>
          </div>
          <div class="items-list__row" v-for="item in targetReturn.items" :key="item.id">
            <span>{{ item.itemName || item.itemPublicId?.slice(0, 8) }}</span>
            <span>{{ item.returnQty }} {{ item.unit }}</span>
            <span>{{ item.detailReason || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 타임라인 (LOT 추적 이력과 동일한 page-feed 스타일) -->
      <div class="page-panel" style="background: var(--color-surface-container-lowest); border: 1px solid var(--color-surface-container-high); padding: 16px;">
        <div class="page-panel__head" style="margin-bottom: 12px;">
          <div class="page-panel__eyebrow">{{ content.timeline }}</div>
        </div>
        
        <div class="page-feed">
          <div v-if="isLoading" style="text-align: center; padding: 16px; color: var(--color-on-surface-variant); font-style: italic;">Loading...</div>
          <div v-else-if="histories.length === 0" style="text-align: center; padding: 16px; color: var(--color-on-surface-variant); font-style: italic;">{{ content.empty }}</div>
          
          <div v-else v-for="h in histories" :key="h.id" class="page-feed__item">
            <span class="page-feed__label">{{ formatDate(h.recordedAt) }}</span>
            <strong 
              class="page-feed__text" 
              :style="h.reason ? 'cursor: pointer; display: flex; align-items: center;' : 'display: flex; align-items: center;'" 
              @click="h.reason && toggleHistoryReason(h.id)"
            >
              <span style="opacity: 0.5; margin-right: 4px;">[{{ formatStatus(h.beforeStatus) }}]</span>
              →
              <span :class="{'text-critical': h.afterStatus === 'REJECTED', 'text-nominal': h.afterStatus === 'COMPLETED' || h.afterStatus === 'APPROVED'}" style="margin-left: 4px;">
                {{ formatStatus(h.afterStatus) }}
              </span>
              <span v-if="h.reason" style="font-size: 0.7rem; color: var(--color-primary); margin-left: auto;">
                {{ expandedHistoryIds.has(h.id) ? '▲' : '▼' }} {{ language === 'ko' ? '사유 보기' : 'View Reason' }}
              </span>
            </strong>
            <div v-if="h.reason && expandedHistoryIds.has(h.id)" class="page-feed__reason">
              "{{ h.reason }}"
            </div>
          </div>
        </div>
      </div>

      <!-- 관리자 액션 블록 (대상 조직만 승인/반려 가능) -->
      <div class="action-block" v-if="targetReturn.returnStatus !== 'COMPLETED' && targetReturn.returnStatus !== 'REJECTED' && isTargetOrg">
        <div class="action-block__eyebrow">{{ content.statusActions }}</div>
        <textarea 
          v-model="reasonText" 
          :placeholder="content.reasonPlaceholder" 
          rows="2" 
          class="action-reason"
          :disabled="isUpdating"
        ></textarea>
        
        <div class="action-buttons">
          <template v-if="targetReturn.returnStatus === 'REQUESTED'">
            <button class="btn btn-approve" @click="doUpdateStatus('APPROVED')" :disabled="isUpdating">{{ content.actApprove }}</button>
            <button class="btn btn-reject" @click="doUpdateStatus('REJECTED')" :disabled="isUpdating">{{ content.actReject }}</button>
          </template>
          <template v-if="targetReturn.returnStatus === 'APPROVED'">
            <button class="btn btn-primary" @click="doUpdateStatus('IN_TRANSIT')" :disabled="isUpdating">{{ content.actTransit }}</button>
          </template>
          <template v-if="targetReturn.returnStatus === 'IN_TRANSIT'">
            <button class="btn btn-primary" @click="doUpdateStatus('RECEIVED')" :disabled="isUpdating">{{ content.actReceive }}</button>
          </template>
          <template v-if="targetReturn.returnStatus === 'RECEIVED'">
            <button class="btn btn-success" @click="doUpdateStatus('COMPLETED')" :disabled="isUpdating">{{ content.actComplete }}</button>
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

/* 현재 상태 블록 */
.current-status-block {
  padding: 16px;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-surface-container-high);
}

.current-status-block__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.current-status-block__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
}

.status-badge {
  font-size: 0.875rem;
  font-weight: 700;
  padding: 4px 16px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.status-badge.is-warning { color: #F59E0B; background: rgba(245, 158, 11, 0.1); }
.status-badge.is-nominal { color: #10B981; background: rgba(16, 185, 129, 0.1); }
.status-badge.is-critical { color: #EF4444; background: rgba(239, 68, 68, 0.1); }
.status-badge.is-info { color: #3B82F6; background: rgba(59, 130, 246, 0.1); }

/* 정보 카드 */
.info-card {
  padding: 16px;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-surface-container-high);
}

.info-card__eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-on-surface-variant);
  margin-bottom: 12px;
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
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
}

.info-card__value {
  font-size: 0.875rem;
  color: var(--color-on-surface);
}

/* 품목 리스트 */
.items-list {
  display: flex;
  flex-direction: column;
}

.items-list__row {
  display: grid;
  grid-template-columns: 2fr 1fr 2fr;
  gap: 8px;
  padding: 8px 0;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--color-surface-container-high);
}

.items-list__row--head {
  font-weight: 600;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
}

.items-list__row:last-child {
  border-bottom: none;
}

/* 타임라인 (LOT 추적 이력과 동일 스타일) */
.page-feed__item {
  padding: 12px;
  background: var(--color-surface-container);
  margin-bottom: 8px;
}

.page-feed__label {
  font-size: 0.7rem;
  color: var(--color-on-surface-variant);
  letter-spacing: 0.05em;
}

.page-feed__text {
  display: block;
  font-size: 0.875rem;
  color: var(--color-on-surface);
  margin-top: 4px;
}

.page-feed__reason {
  margin-top: 6px;
  font-size: 0.8rem;
  color: var(--color-on-surface);
  background: var(--color-surface-container-lowest);
  padding: 8px;
  font-style: italic;
  border-left: 2px solid var(--color-primary);
}

.page-feed__by {
  font-size: 0.7rem;
  color: var(--color-on-surface-variant);
  font-style: normal;
}

.text-critical { color: #EF4444 !important; font-weight: 700; }
.text-nominal { color: #10B981 !important; font-weight: 700; }

/* 액션 블록 */
.action-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
}

.action-block__eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-on-surface-variant);
}

.action-reason {
  font-family: inherit;
  font-size: 0.875rem;
  padding: 12px;
  background: var(--color-surface-container);
  border: 1px solid var(--color-surface-container-high);
  color: var(--color-on-surface);
  resize: vertical;
  outline: none;
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
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 8px 16px;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.btn:hover { opacity: 0.8; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: var(--color-primary); color: var(--color-on-primary); }
.btn-approve { background: #10B981; color: #fff; }
.btn-reject { background: #EF4444; color: #fff; }
.btn-success { background: #6366F1; color: #fff; }

/* 채팅 공유 버튼 */
.chat-action {
  display: flex;
  justify-content: center;
  padding-top: 8px;
  border-top: 1px dashed var(--color-surface-container-high);
}

.btn-chat {
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 10px 24px;
  cursor: pointer;
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container);
  color: var(--color-on-surface);
  transition: all 0.2s;
  letter-spacing: 0.03em;
}
.btn-chat:hover {
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-color: var(--color-primary);
}
</style>
