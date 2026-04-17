<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { BaseModal } from '../../shared'
import { getReturnHistories, updateReturnStatus, type ReturnStatusHistoryResponseDto, type ReturnRequestResponseDto } from '../../../services/return'

const props = defineProps<{
  isOpen: boolean
  targetReturn: ReturnRequestResponseDto | null
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  statusChanged: []
}>()

const histories = ref<ReturnStatusHistoryResponseDto[]>([])
const isLoading = ref(false)
const isUpdating = ref(false)
const reasonText = ref('')

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '반품 상태 및 이력',
        desc: '선택한 반품 항목의 상태 전환 및 감사 이력(Audit Trail)을 확인합니다.',
        currentStatus: '현재 상태',
        empty: '이력이 존재하지 않습니다.',
        actApprove: '승인 (Approve)',
        actReject: '반려 (Reject)',
        actTransit: '회수 중 (In Transit)',
        actReceive: '입고 (Receive)',
        actComplete: '완료 (Complete)',
        reasonPlaceholder: '상태 변경 사유를 입력하세요 (필수)',
        reasonAlert: '상태 변경 사유를 반드시 입력해주세요.',
        close: '닫기'
      }
    : {
        title: 'Return Status & Audit Trail',
        desc: 'View status transitions and audit trail for the selected return request.',
        currentStatus: 'Current Status',
        empty: 'No history found.',
        actApprove: 'Approve',
        actReject: 'Reject',
        actTransit: 'In Transit',
        actReceive: 'Receive',
        actComplete: 'Complete',
        reasonPlaceholder: 'Enter reason for status change (Required)',
        reasonAlert: 'Reason is required to change status.',
        close: 'CLOSE'
      }
})

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

const currentStatusMap: Record<string, string> = {
  REQUESTED: '요청됨',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
  IN_TRANSIT: '회수 중',
  RECEIVED: '입고 완료',
  COMPLETED: '처리 완료'
}

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
    histories.value = await getReturnHistories(props.targetReturn.publicId)
    reasonText.value = ''
    emit('statusChanged') // Notify parent to refresh list
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
    :title="content.title"
    :description="content.desc"
    size="md"
    @update:model-value="emit('close')"
  >
    <div class="timeline-container" v-if="targetReturn">
      
      <!-- 현재 상태 블록 -->
      <div class="current-status">
        <span class="label">{{ content.currentStatus }}</span>
        <div class="status-badge" :class="targetReturn.returnStatus.toLowerCase()">
          {{ currentStatusMap[targetReturn.returnStatus] || targetReturn.returnStatus }}
        </div>
      </div>

      <!-- 타임라인 -->
      <div class="timeline">
        <div v-if="isLoading" class="timeline-loading">Loading...</div>
        <div v-else-if="histories.length === 0" class="timeline-empty">{{ content.empty }}</div>
        <div v-else class="timeline-item" v-for="h in histories" :key="h.id">
          <div class="timeline-item__dot"></div>
          <div class="timeline-item__content">
            <div class="timeline-item__header">
              <span class="status-from">{{ currentStatusMap[h.beforeStatus] || h.beforeStatus }}</span>
              <span class="arrow">&rarr;</span>
              <span class="status-to">{{ currentStatusMap[h.afterStatus] || h.afterStatus }}</span>
            </div>
            <div class="timeline-item__meta">
              <span>{{ new Date(h.recordedAt).toLocaleString() }}</span>
              <span>by {{ h.recordedBy }}</span>
            </div>
            <div class="timeline-item__reason" v-if="h.reason">
              "{{ h.reason }}"
            </div>
          </div>
        </div>
      </div>

      <!-- 관리자 액션 블록 -->
      <div class="action-block" v-if="targetReturn.returnStatus !== 'COMPLETED' && targetReturn.returnStatus !== 'REJECTED'">
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

    </div>
  </BaseModal>
</template>

<style scoped>
.timeline-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 16px;
}

.current-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: var(--color-surface-container-lowest);
  border: 1px solid var(--color-surface-container-high);
}

.current-status .label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface-variant);
  text-transform: uppercase;
}

.status-badge {
  font-size: 0.875rem;
  font-weight: 600;
  padding: 4px 12px;
  background: var(--color-surface-container);
  color: var(--color-on-surface);
}
.status-badge.approved { color: #10B981; background: rgba(16, 185, 129, 0.1); }
.status-badge.in_transit { color: #3B82F6; background: rgba(59, 130, 246, 0.1); }
.status-badge.received { color: #8B5CF6; background: rgba(139, 92, 246, 0.1); }
.status-badge.completed { color: #6366F1; background: rgba(99, 102, 241, 0.1); }
.status-badge.rejected { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

.timeline {
  display: flex;
  flex-direction: column;
  position: relative;
  border-left: 2px solid var(--color-surface-container-high);
  margin-left: 8px;
  padding-left: 24px;
  gap: 16px;
}

.timeline-item {
  position: relative;
}

.timeline-item__dot {
  position: absolute;
  left: -31px;
  top: 4px;
  width: 12px;
  height: 12px;
  background: var(--color-primary);
  border: 2px solid var(--color-surface);
}

.timeline-item__content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-item__header {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface);
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrow {
  color: var(--color-on-surface-variant);
}

.timeline-item__meta {
  font-size: 0.75rem;
  color: var(--color-on-surface-variant);
  display: flex;
  gap: 8px;
}

.timeline-item__reason {
  margin-top: 4px;
  font-size: 0.875rem;
  color: var(--color-on-surface);
  background: var(--color-surface-container);
  padding: 8px;
  font-style: italic;
  border-left: 2px solid var(--color-primary);
}

.action-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-surface-container-high);
}

.action-reason {
  font-family: inherit;
  font-size: 0.875rem;
  padding: 12px;
  background: var(--color-surface-container-lowest);
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
  font-size: 0.875rem;
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
</style>
