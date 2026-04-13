<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import ControlTowerMapPanel from './ControlTowerMapPanel.vue'
import { controlTowerPage } from '../pages/controlTower'
import { BaseModal, ConfirmModal, StructuredPage, useModal } from '../../shared'

const {
  isOpen: orchestrationOpen,
  open: openOrchestration,
  close: closeOrchestration,
} = useModal()
const {
  isOpen: exportOpen,
  payload: exportFormat,
  open: openExport,
  close: closeExport,
  setPayload: setExportFormat,
} = useModal<'csv' | 'json'>(false, 'csv')
const preferences = useAtlasPreferencesStore()
const language = computed(() => preferences.language)
const router = useRouter()

function handleAction(label: string) {
  if (label === 'OPEN_ORCHESTRATION') {
    openOrchestration()
  }

  if (label === 'RISK_SETTINGS') {
    router.push({ name: 'riskRules', query: preferences.buildQuery() })
  }

  if (label === 'EXPORT_DATA') {
    openExport('csv')
  }
}

function handleConfirm() {
  closeOrchestration()
}

function handleExportFormat(format: 'csv' | 'json') {
  setExportFormat(format)
}

function closeExportModal() {
  closeExport()
}
</script>

<template>
  <StructuredPage :page="controlTowerPage" :on-action="handleAction">
    <template #panels-prefix>
      <ControlTowerMapPanel />
    </template>
  </StructuredPage>

  <ConfirmModal
    v-model="orchestrationOpen"
    :title="resolveDefaultCopy('Open Orchestration', language)"
    :description="resolveDefaultCopy('샘플 모달이다. 이후 실제 오케스트레이션 실행 플로우를 이 자리에 연결하면 된다.', language)"
    :confirm-label="resolveDefaultCopy('실행', language)"
    :cancel-label="resolveDefaultCopy('닫기', language)"
    size="sm"
    @confirm="handleConfirm"
  >
    <p>{{ resolveDefaultCopy('현재 영향 주문, 리스크 이벤트, 복구 ETA를 기준으로 제안 액션을 검토하는 샘플 단계다.', language) }}</p>
    <p>{{ resolveDefaultCopy('실제 연결 시에는 워크플로우 실행 API 호출 또는 상세 패널 이동을 붙이면 된다.', language) }}</p>
  </ConfirmModal>

  <BaseModal
    v-model="exportOpen"
    :title="resolveDefaultCopy('Export Control Tower Data', language)"
    :description="resolveDefaultCopy('샘플 데이터 내보내기 모달이다. 실제 연결 시 파일 다운로드 API 또는 백엔드 export job을 붙이면 된다.', language)"
    size="sm"
    @close="closeExportModal"
  >
    <div class="modal-option-list">
      <button
        :class="['modal-option-card', exportFormat === 'csv' ? 'is-active' : '']"
        type="button"
        @click="handleExportFormat('csv')"
      >
        <strong>{{ resolveDefaultCopy('CSV Export', language) }}</strong>
        <span>{{ resolveDefaultCopy('운영 테이블, KPI, 이벤트 큐를 CSV 묶음으로 저장', language) }}</span>
      </button>
      <button
        :class="['modal-option-card', exportFormat === 'json' ? 'is-active' : '']"
        type="button"
        @click="handleExportFormat('json')"
      >
        <strong>{{ resolveDefaultCopy('JSON Snapshot', language) }}</strong>
        <span>{{ resolveDefaultCopy('현재 화면 상태와 리스크 노드를 JSON 스냅샷으로 저장', language) }}</span>
      </button>
    </div>

    <template #footer>
      <button class="page-button page-button--secondary" type="button" @click="closeExportModal">{{ resolveDefaultCopy('닫기', language) }}</button>
      <button class="page-button page-button--primary" type="button" @click="closeExportModal">
        {{ exportFormat === 'json' ? resolveDefaultCopy('JSON 내보내기', language) : resolveDefaultCopy('CSV 내보내기', language) }}
      </button>
    </template>
  </BaseModal>
</template>
