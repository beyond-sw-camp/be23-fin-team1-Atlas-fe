<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseModal } from '../../shared'
import {
  getReturnHistories,
  updateReturnStatus,
  inspectReturnItem,
  type ReturnRequestResponseDto,
  type ReturnStatusHistoryResponseDto,
  type QcStatus,
  type QcGrade,
  type DisposalReason,
} from '../../../services/return'
import { uploadAttachment } from '../../../services/file'
import { useAtlasDialogStore } from '../../../stores/dialog'

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
const dialog = useAtlasDialogStore()
const isLoading = ref(false)
const isUpdating = ref(false)
const reasonText = ref('')
const expandedHistoryIds = ref<Set<number>>(new Set())

// QC 검수 관련
const qcResults = ref<Record<number, { qcStatus: QcStatus; qcGrade: QcGrade; action: 'RESTOCK' | 'DISPOSE'; description: string }>>({})
const isInspecting = ref(false)

// 폐기 증빙 관련
const disposalReason = ref<DisposalReason>('DAMAGED')
const disposalProofFile = ref<File | null>(null)
const disposalProofUploaded = ref(false)
const isUploadingProof = ref(false)

const myOrgPublicId = window.sessionStorage.getItem('atlas-organization-public-id') ?? ''

const isTargetOrg = computed(() => {
  if (!props.targetReturn) return false
  return props.targetReturn.targetOrganizationPublicId === myOrgPublicId
})

const isRequestOrg = computed(() => {
  if (!props.targetReturn) return false
  return props.targetReturn.requestOrganizationPublicId === myOrgPublicId
})

const resType = computed(() => props.targetReturn?.resolutionType || 'RETURN')

const canChangeStatus = computed(() => {
  if (!props.targetReturn) return false
  const st = props.targetReturn.returnStatus
  const rt = resType.value

  // 공통: REQUESTED → 대상조직(공급사)이 승인/반려
  if (st === 'REQUESTED') return isTargetOrg.value

  // APPROVED: DISPOSAL → 요청조직이 폐기처리, 나머지 → 요청조직이 회수시작
  if (st === 'APPROVED') return isRequestOrg.value

  // IN_TRANSIT / RECEIVED: 대상조직(공급사)
  if (st === 'IN_TRANSIT' || st === 'RECEIVED') return isTargetOrg.value

  // INSPECTING: 대상조직(공급사)이 검수 결과 입력
  if (st === 'INSPECTING') return isTargetOrg.value

  // RESHIPPED (EXCHANGE 전용): 요청조직이 수령확인
  if (st === 'RESHIPPED' && rt === 'EXCHANGE') return isRequestOrg.value

  // DISPOSED (DISPOSAL 전용): 대상조직이 최종확인
  if (st === 'DISPOSED' && rt === 'DISPOSAL') return isTargetOrg.value

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
        actInspect: '검수 시작',
        actComplete: '처리 완료',
        actReship: '교체품 출하',
        actConfirmExchange: '교체품 수령 확인',
        actDispose: '폐기 처리',
        actConfirmDisposal: '최종 확인',
        resolutionLabel: '처리 방식',
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
        // QC 검수
        qcTitle: 'QC 검수 결과 입력',
        qcStatus: '검수 결과',
        qcGrade: '등급',
        qcAction: '처리',
        qcDesc: '비고',
        qcSubmit: '검수 결과 저장',
        qcPass: '합격',
        qcFail: '불합격',
        qcGradeA: 'A급 (정상)',
        qcGradeB: 'B급 (수선필요)',
        qcGradeDef: '불량 (파손)',
        qcRestock: '재입고',
        qcDispose: '폐기',
        // 폐기 증빙
        disposalTitle: '폐기 증빙',
        disposalReason: '폐기 사유',
        disposalReasonExpired: '유통기한 만료',
        disposalReasonDamaged: '파손',
        disposalReasonContaminated: '오염',
        disposalReasonOther: '기타',
        disposalProof: '증빙 사진',
        disposalUpload: '사진 업로드',
        disposalUploaded: '업로드 완료',
        disposalRequired: '폐기 증빙 사진을 첨부해야 폐기 처리가 가능합니다.',
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
        actInspect: 'Start Inspection',
        actComplete: 'Complete',
        actReship: 'Ship Replacement',
        actConfirmExchange: 'Confirm Receipt',
        actDispose: 'Mark Disposed',
        actConfirmDisposal: 'Final Confirm',
        resolutionLabel: 'Resolution',
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
        // QC
        qcTitle: 'QC Inspection Results',
        qcStatus: 'Result',
        qcGrade: 'Grade',
        qcAction: 'Action',
        qcDesc: 'Note',
        qcSubmit: 'Save Inspection',
        qcPass: 'Pass',
        qcFail: 'Fail',
        qcGradeA: 'A (Normal)',
        qcGradeB: 'B (Refurb)',
        qcGradeDef: 'Defective',
        qcRestock: 'Restock',
        qcDispose: 'Dispose',
        // Disposal
        disposalTitle: 'Disposal Proof',
        disposalReason: 'Reason',
        disposalReasonExpired: 'Expired',
        disposalReasonDamaged: 'Damaged',
        disposalReasonContaminated: 'Contaminated',
        disposalReasonOther: 'Other',
        disposalProof: 'Proof Photo',
        disposalUpload: 'Upload Photo',
        disposalUploaded: 'Uploaded',
        disposalRequired: 'Disposal proof photo is required to proceed.',
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
    INSPECTING: '검수 중',
    RESHIPPED: '교체품 발송',
    DISPOSED: '폐기 완료',
    COMPLETED: '처리 완료',
  }

  return labels[status] ?? status
}

function formatReturnType(type: string): string {
  if (props.language !== 'ko') return type

  const labels: Record<string, string> = {
    DAMAGE: '파손',
    DEFECTIVE: '불량',
    SIMPLE_RETURN: '단순 반품',
  }

  return labels[type] ?? type
}

function formatResolutionType(type?: string): string {
  if (!type) return '-'
  if (props.language !== 'ko') return type

  const labels: Record<string, string> = {
    RETURN: '반납',
    EXCHANGE: '교체',
    DISPOSAL: '폐기',
  }

  return labels[type] ?? type
}

function getStatusTone(status: string): string {
  switch (status) {
    case 'REQUESTED':
      return 'warning'
    case 'APPROVED':
    case 'COMPLETED':
    case 'RESHIPPED':
      return 'nominal'
    case 'REJECTED':
    case 'DISPOSED':
      return 'critical'
    case 'IN_TRANSIT':
    case 'RECEIVED':
      return 'info'
    case 'INSPECTING':
      return 'warning'
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
  nextStatus: 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'INSPECTING' | 'RESHIPPED' | 'DISPOSED' | 'COMPLETED',
) {
  if (!props.targetReturn) return

  if (!reasonText.value.trim()) {
    await dialog.alert(content.value.reasonAlert)
    return
  }

  try {
    isUpdating.value = true
    await updateReturnStatus(props.targetReturn.publicId, {
      returnStatus: nextStatus,
      reason: reasonText.value.trim(),
    })

    // 출하 생성은 백엔드에서 상태 전이 시 자동 처리됨 (프론트에서 별도 호출 불필요)

    await loadHistories()
    reasonText.value = ''
    emit('statusChanged')
  } catch (error: any) {
    await dialog.alert(error.message || 'Status update failed.')
  } finally {
    isUpdating.value = false
  }
}

/** QC 검수 결과 제출 */
async function handleQcSubmit() {
  if (!props.targetReturn) return

  const items = props.targetReturn.items
  const results = qcResults.value

  // 모든 품목에 대해 QC 결과가 입력되었는지 확인
  const missingItems = items.filter(item => !results[item.id])
  if (missingItems.length > 0) {
    await dialog.alert(
      props.language === 'ko'
        ? '모든 품목의 검수 결과를 입력해주세요.'
        : 'Please enter inspection results for all items.',
    )
    return
  }

  try {
    isInspecting.value = true
    for (const item of items) {
      const result = results[item.id]
      if (!result) continue
      await inspectReturnItem(props.targetReturn.publicId, item.id, {
        qcStatus: result.qcStatus,
        qcGrade: result.qcGrade,
        action: result.action,
        description: result.description || undefined,
      })
    }
    await dialog.alert(
      props.language === 'ko' ? '검수 결과가 저장되었습니다.' : 'Inspection results saved.',
    )
    emit('statusChanged')
  } catch (error: any) {
    await dialog.alert(error.message || 'Failed to save inspection results.')
  } finally {
    isInspecting.value = false
  }
}

/** QC 결과 초기화 */
function initQcResults() {
  if (!props.targetReturn) return
  const results: typeof qcResults.value = {}
  for (const item of props.targetReturn.items) {
    results[item.id] = {
      qcStatus: item.qcStatus || 'PENDING',
      qcGrade: item.qcGrade || 'A',
      action: 'RESTOCK',
      description: '',
    }
  }
  qcResults.value = results
}

/** 폐기 증빙 사진 업로드 */
async function handleDisposalProofUpload() {
  if (!disposalProofFile.value || !props.targetReturn) return

  try {
    isUploadingProof.value = true
    await uploadAttachment(disposalProofFile.value, 'RETURN_DISPOSAL', props.targetReturn.publicId)
    disposalProofUploaded.value = true
    await dialog.alert(
      props.language === 'ko' ? '폐기 증빙 사진이 업로드되었습니다.' : 'Disposal proof photo uploaded.',
    )
  } catch (error: any) {
    await dialog.alert(error.message || 'Failed to upload disposal proof.')
  } finally {
    isUploadingProof.value = false
  }
}

function onDisposalFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    disposalProofFile.value = input.files[0]
    disposalProofUploaded.value = false
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
            <span class="info-card__label">{{ content.resolutionLabel }}</span>
            <span :class="['resolution-chip', `resolution-chip--${(targetReturn.resolutionType || 'RETURN').toLowerCase()}`]">
              {{ formatResolutionType(targetReturn.resolutionType) }}
            </span>
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
          <!-- 공통: REQUESTED → 승인/반려 -->
          <template v-if="targetReturn.returnStatus === 'REQUESTED'">
            <button class="btn btn-approve" type="button" :disabled="isUpdating" @click="doUpdateStatus('APPROVED')">
              {{ content.actApprove }}
            </button>
            <button class="btn btn-reject" type="button" :disabled="isUpdating" @click="doUpdateStatus('REJECTED')">
              {{ content.actReject }}
            </button>
          </template>

          <!-- APPROVED: 유형별 분기 -->
          <template v-if="targetReturn.returnStatus === 'APPROVED'">
            <!-- DISPOSAL: 폐기 처리 (증빙 첨부 필수) -->
            <button
              v-if="resType === 'DISPOSAL'"
              class="btn btn-reject"
              type="button"
              :disabled="isUpdating || !disposalProofUploaded"
              @click="doUpdateStatus('DISPOSED')"
            >
              {{ content.actDispose }}
            </button>
            <!-- RETURN / EXCHANGE: 회수 시작 -->
            <button v-else class="btn btn-primary" type="button" :disabled="isUpdating" @click="doUpdateStatus('IN_TRANSIT')">
              {{ content.actTransit }}
            </button>
          </template>

          <!-- IN_TRANSIT: 입고 확인 (RETURN / EXCHANGE 공통) -->
          <template v-if="targetReturn.returnStatus === 'IN_TRANSIT'">
            <button class="btn btn-primary" type="button" :disabled="isUpdating" @click="doUpdateStatus('RECEIVED')">
              {{ content.actReceive }}
            </button>
          </template>

          <!-- RECEIVED: 검수 시작 (RETURN / EXCHANGE) -->
          <template v-if="targetReturn.returnStatus === 'RECEIVED'">
            <button class="btn btn-primary" type="button" :disabled="isUpdating" @click="doUpdateStatus('INSPECTING'); initQcResults()">
              {{ content.actInspect }}
            </button>
          </template>

          <!-- INSPECTING: QC 검수 완료 후 분기 -->
          <template v-if="targetReturn.returnStatus === 'INSPECTING'">
            <!-- EXCHANGE: 교체품 출하 -->
            <button v-if="resType === 'EXCHANGE'" class="btn btn-primary" type="button" :disabled="isUpdating" @click="doUpdateStatus('RESHIPPED')">
              {{ content.actReship }}
            </button>
            <!-- RETURN: 처리 완료 -->
            <button v-else class="btn btn-success" type="button" :disabled="isUpdating" @click="doUpdateStatus('COMPLETED')">
              {{ content.actComplete }}
            </button>
          </template>

          <!-- RESHIPPED (EXCHANGE 전용): 교체품 수령 확인 -->
          <template v-if="targetReturn.returnStatus === 'RESHIPPED'">
            <button class="btn btn-success" type="button" :disabled="isUpdating" @click="doUpdateStatus('COMPLETED')">
              {{ content.actConfirmExchange }}
            </button>
          </template>

          <!-- DISPOSED (DISPOSAL 전용): 최종 확인 -->
          <template v-if="targetReturn.returnStatus === 'DISPOSED'">
            <button class="btn btn-success" type="button" :disabled="isUpdating" @click="doUpdateStatus('COMPLETED')">
              {{ content.actConfirmDisposal }}
            </button>
          </template>
        </div>
      </div>

      <!-- QC 검수 결과 입력 (INSPECTING 상태일 때만 표시) -->
      <div
        v-if="targetReturn.returnStatus === 'INSPECTING' && canChangeStatus"
        class="info-card"
      >
        <div class="info-card__eyebrow">{{ content.qcTitle }}</div>
        <div v-for="item in targetReturn.items" :key="'qc-' + item.id" class="qc-item">
          <div class="qc-item__name">{{ item.itemName || shortId(item.itemPublicId) }} ({{ item.returnQty }} {{ item.unit }})</div>
          <div class="qc-item__fields" v-if="qcResults[item.id]">
            <label class="qc-field">
              <span>{{ content.qcStatus }}</span>
              <select v-model="qcResults[item.id].qcStatus">
                <option value="PASS">{{ content.qcPass }}</option>
                <option value="FAIL">{{ content.qcFail }}</option>
              </select>
            </label>
            <label class="qc-field">
              <span>{{ content.qcGrade }}</span>
              <select v-model="qcResults[item.id].qcGrade">
                <option value="A">{{ content.qcGradeA }}</option>
                <option value="B">{{ content.qcGradeB }}</option>
                <option value="DEFECTIVE">{{ content.qcGradeDef }}</option>
              </select>
            </label>
            <label class="qc-field">
              <span>{{ content.qcAction }}</span>
              <select v-model="qcResults[item.id].action">
                <option value="RESTOCK">{{ content.qcRestock }}</option>
                <option value="DISPOSE">{{ content.qcDispose }}</option>
              </select>
            </label>
            <label class="qc-field qc-field--wide">
              <span>{{ content.qcDesc }}</span>
              <input v-model="qcResults[item.id].description" type="text" placeholder="..." />
            </label>
          </div>
        </div>
        <div class="qc-actions">
          <button class="btn btn-primary" type="button" :disabled="isInspecting" @click="handleQcSubmit">
            {{ content.qcSubmit }}
          </button>
        </div>
      </div>

      <!-- 폐기 증빙 (DISPOSAL + APPROVED 상태일 때 표시) -->
      <div
        v-if="targetReturn.returnStatus === 'APPROVED' && resType === 'DISPOSAL' && canChangeStatus"
        class="info-card"
      >
        <div class="info-card__eyebrow">{{ content.disposalTitle }}</div>
        <div class="disposal-form">
          <label class="disposal-field">
            <span>{{ content.disposalReason }}</span>
            <select v-model="disposalReason">
              <option value="EXPIRED">{{ content.disposalReasonExpired }}</option>
              <option value="DAMAGED">{{ content.disposalReasonDamaged }}</option>
              <option value="CONTAMINATED">{{ content.disposalReasonContaminated }}</option>
              <option value="OTHER">{{ content.disposalReasonOther }}</option>
            </select>
          </label>
          <label class="disposal-field">
            <span>{{ content.disposalProof }}</span>
            <div class="disposal-upload-row">
              <input type="file" accept="image/*" @change="onDisposalFileChange" />
              <button
                class="btn btn-primary"
                type="button"
                :disabled="!disposalProofFile || isUploadingProof || disposalProofUploaded"
                @click="handleDisposalProofUpload"
              >
                {{ disposalProofUploaded ? content.disposalUploaded : content.disposalUpload }}
              </button>
            </div>
          </label>
          <p v-if="!disposalProofUploaded" class="disposal-required">
            {{ content.disposalRequired }}
          </p>
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

/* QC 검수 UI */
.qc-item {
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container);
  padding: 12px;
  margin-bottom: 8px;
}

.qc-item__name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-on-surface);
  margin-bottom: 8px;
}

.qc-item__fields {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
}

.qc-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qc-field span {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
}

.qc-field select,
.qc-field input {
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  color: var(--color-on-surface);
  padding: 6px 8px;
  font-size: 0.8rem;
  font-family: inherit;
  outline: none;
}

.qc-field select:focus,
.qc-field input:focus {
  border-color: var(--color-primary);
}

.qc-field--wide {
  grid-column: 1 / -1;
}

.qc-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

/* 폐기 증빙 UI */
.disposal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.disposal-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.disposal-field span {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant);
}

.disposal-field select {
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  color: var(--color-on-surface);
  padding: 6px 8px;
  font-size: 0.8rem;
  font-family: inherit;
  outline: none;
}

.disposal-upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.disposal-upload-row input[type="file"] {
  font-size: 0.8rem;
  color: var(--color-on-surface-variant);
}

.disposal-required {
  margin: 0;
  padding: 6px 8px;
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  font-size: 0.75rem;
  color: #f59e0b;
}
</style>
