<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  createDeliveryException,
  createShipment,
  createShipmentLotMapping,
  getDeliveryExceptions,
  getEtaProjections,
  getShipment,
  getShipmentEta,
  getShipmentLotMappings,
  getShipmentStatusHistories,
  getShipments,
  trackShipment,
  type CreateDeliveryExceptionRequestDto,
  type CreateShipmentLotMappingRequestDto,
  type CreateShipmentRequestDto,
  type DeliveryExceptionResponseDto,
  type EtaProjectionResponseDto,
  type ShipmentEtaResponseDto,
  type ShipmentListResponseDto,
  type ShipmentLotMappingResponseDto,
  type ShipmentResponseDto,
  type ShipmentStatusHistoryResponseDto,
  type TrackShipmentRequestDto,
} from '../../../services/shipment'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 출하',
    title: '출하',
    subtitle: '출하 목록, 상세, ETA, 상태 이력, 추적, 예외를 한 화면에서 관리합니다.',
    buttons: {
      openCreate: '출하 등록',
      closeCreate: '등록 닫기',
      submitCreate: '출하 저장',
      submittingCreate: '저장 중...',
      select: '선택',
      openTrack: '출하 추적 등록',
      closeTrack: '추적 닫기',
      submitTrack: '추적 저장',
      submittingTrack: '저장 중...',
      openException: '예외 등록',
      closeException: '예외 닫기',
      submitException: '예외 저장',
      submittingException: '저장 중...',
      openLotMap: 'LOT 연결',
      closeLotMap: 'LOT 연결 닫기',
      submitLotMap: 'LOT 연결 저장',
      submittingLotMap: '저장 중...',
    },
    panels: {
      createEyebrow: '등록',
      createTitle: '신규 출하 등록',
      listEyebrow: '출하',
      listTitle: '출하 목록',
      detailEyebrow: '상세',
      detailTitle: '출하 요약',
      etaEyebrow: 'ETA',
      etaTitle: '도착 예정 정보',
      historyEyebrow: '상태 이력',
      historyTitle: '출하 이력',
      trackEyebrow: '추적',
      trackTitle: '출하 추적 등록',
      etaProjectionEyebrow: 'ETA 예측',
      etaProjectionTitle: 'ETA 예측 이력',
      exceptionEyebrow: '예외',
      exceptionTitle: '배송 예외 등록',
      exceptionsEyebrow: '예외 목록',
      exceptionsTitle: '배송 예외 목록',
      lotMapEyebrow: 'LOT 연결',
      lotMapTitle: '출하-LOT 연결',
      lotMappingsEyebrow: '연결 LOT',
      lotMappingsTitle: '연결된 LOT 목록',
    },
    fields: {
      shipmentNumber: '출하 번호',
      poId: '발주 ID',
      subPoId: '하위 발주 ID',
      carrierName: '운송사',
      vehicleNo: '차량 번호',
      trackingNo: '운송장 번호',
      originNodePublicId: '출발 거점 ID',
      destinationNodePublicId: '도착 거점 ID',
      departureEta: '출발 예정 시각',
      arrivalEta: '도착 예정 시각',
      temperatureRequired: '온도 관리 필요',
      status: '상태',
      eta: 'ETA',
      action: '동작',
      selectedShipment: '선택한 출하',
      estimatedArrival: '예상 도착 시각',
      delayMinutes: '지연 분',
      delayed: '지연 여부',
      nodePublicId: '거점 Public ID',
      checkpointType: '체크포인트 유형',
      checkpointStatus: '체크포인트 상태',
      plannedAt: '예정 시각',
      actualAt: '실제 시각',
      note: '비고',
      exceptionType: '예외 유형',
      severity: '심각도',
      detectedAt: '감지 시각',
      lotPublicId: 'LOT Public ID',
      shippedQty: '출하 수량',
    },
    placeholders: {
      checkpointType: '유형 선택',
      checkpointStatus: '상태 선택',
      exceptionType: '예외 유형 선택',
      severity: '심각도 선택',
    },
    messages: {
      loadShipmentsFail: '출하 목록을 불러오지 못했습니다.',
      loadDetailFail: '출하 상세를 불러오지 못했습니다.',
      createFail: '출하 등록에 실패했습니다.',
      trackFail: '출하 추적 등록에 실패했습니다.',
      exceptionFail: '배송 예외 등록에 실패했습니다.',
      lotMapFail: 'LOT 연결 등록에 실패했습니다.',
      emptyShipments: '출하 데이터가 없습니다.',
      loadingDetail: '출하 상세를 불러오는 중입니다.',
      emptyHistory: '출하 이력이 없습니다.',
    },
    states: {
      yes: '예',
      no: '아니오',
      resolved: '해결',
      open: '미해결',
    },
    units: {
      minutes: '분',
    },
  },
  en: {
    eyebrow: 'SUPPLY CHAIN OPS / SHIPMENTS',
    title: 'Shipments',
    subtitle: 'Manage shipment list, detail, ETA, history, tracking, and exceptions.',
    buttons: {
      openCreate: 'ADD SHIPMENT',
      closeCreate: 'CLOSE FORM',
      submitCreate: 'SAVE SHIPMENT',
      submittingCreate: 'Saving...',
      select: 'SELECT',
      openTrack: 'TRACK SHIPMENT',
      closeTrack: 'CLOSE TRACK',
      submitTrack: 'SAVE TRACK',
      submittingTrack: 'Saving...',
      openException: 'ADD EXCEPTION',
      closeException: 'CLOSE EXCEPTION',
      submitException: 'SAVE EXCEPTION',
      submittingException: 'Saving...',
      openLotMap: 'MAP LOT',
      closeLotMap: 'CLOSE LOT MAP',
      submitLotMap: 'SAVE LOT MAP',
      submittingLotMap: 'Saving...',
    },
    panels: {
      createEyebrow: 'CREATE',
      createTitle: 'New Shipment',
      listEyebrow: 'SHIPMENTS',
      listTitle: 'Shipment List',
      detailEyebrow: 'DETAIL',
      detailTitle: 'Shipment Summary',
      etaEyebrow: 'ETA',
      etaTitle: 'Arrival Estimate',
      historyEyebrow: 'STATUS HISTORY',
      historyTitle: 'Shipment History',
      trackEyebrow: 'TRACK',
      trackTitle: 'Track Shipment',
      etaProjectionEyebrow: 'ETA PROJECTIONS',
      etaProjectionTitle: 'Eta Projection History',
      exceptionEyebrow: 'EXCEPTION',
      exceptionTitle: 'Delivery Exception',
      exceptionsEyebrow: 'EXCEPTIONS',
      exceptionsTitle: 'Delivery Exceptions',
      lotMapEyebrow: 'LOT MAP',
      lotMapTitle: 'Shipment Lot Mapping',
      lotMappingsEyebrow: 'LOT MAPPINGS',
      lotMappingsTitle: 'Mapped Lots',
    },
    fields: {
      shipmentNumber: 'SHIPMENT NO',
      poId: 'PO ID',
      subPoId: 'SUB PO ID',
      carrierName: 'CARRIER',
      vehicleNo: 'VEHICLE',
      trackingNo: 'TRACKING NO',
      originNodePublicId: 'ORIGIN NODE',
      destinationNodePublicId: 'DESTINATION NODE',
      departureEta: 'DEPARTURE ETA',
      arrivalEta: 'ARRIVAL ETA',
      temperatureRequired: 'TEMPERATURE REQUIRED',
      status: 'STATUS',
      eta: 'ETA',
      action: 'ACTION',
      selectedShipment: 'Selected shipment',
      estimatedArrival: 'ESTIMATED ARRIVAL',
      delayMinutes: 'DELAY MINUTES',
      delayed: 'DELAYED',
      nodePublicId: 'NODE PUBLIC ID',
      checkpointType: 'CHECKPOINT TYPE',
      checkpointStatus: 'CHECKPOINT STATUS',
      plannedAt: 'PLANNED AT',
      actualAt: 'ACTUAL AT',
      note: 'NOTE',
      exceptionType: 'EXCEPTION TYPE',
      severity: 'SEVERITY',
      detectedAt: 'DETECTED AT',
      lotPublicId: 'LOT PUBLIC ID',
      shippedQty: 'SHIPPED QTY',
    },
    placeholders: {
      checkpointType: 'Select type',
      checkpointStatus: 'Select status',
      exceptionType: 'Select exception type',
      severity: 'Select severity',
    },
    messages: {
      loadShipmentsFail: 'Failed to load shipments.',
      loadDetailFail: 'Failed to load shipment detail.',
      createFail: 'Failed to create shipment.',
      trackFail: 'Failed to track shipment.',
      exceptionFail: 'Failed to create delivery exception.',
      lotMapFail: 'Failed to create shipment lot mapping.',
      emptyShipments: 'No shipments found.',
      loadingDetail: 'Loading shipment detail...',
      emptyHistory: 'No shipment history found.',
    },
    states: {
      yes: 'YES',
      no: 'NO',
      resolved: 'RESOLVED',
      open: 'OPEN',
    },
    units: {
      minutes: 'min',
    },
  },
} as const

const CHECKPOINT_TYPE_LABELS = {
  ko: {
    DEPARTURE: '출발',
    TRANSIT: '이동 중',
    ARRIVAL: '도착',
    WAREHOUSE_IN: '창고 입고',
  },
  en: {
    DEPARTURE: 'DEPARTURE',
    TRANSIT: 'TRANSIT',
    ARRIVAL: 'ARRIVAL',
    WAREHOUSE_IN: 'WAREHOUSE_IN',
  },
} as const

const CHECKPOINT_STATUS_LABELS = {
  ko: {
    PLANNED: '예정',
    PASSED: '통과',
    FAILED: '실패',
    CANCELLED: '취소',
  },
  en: {
    PLANNED: 'PLANNED',
    PASSED: 'PASSED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  },
} as const

const DELIVERY_EXCEPTION_TYPE_LABELS = {
  ko: {
    DELAY: '지연',
    DAMAGE: '파손',
    TEMPERATURE_DEVIATION: '온도 이탈',
    WRONG_DELIVERY: '오배송',
  },
  en: {
    DELAY: 'DELAY',
    DAMAGE: 'DAMAGE',
    TEMPERATURE_DEVIATION: 'TEMPERATURE_DEVIATION',
    WRONG_DELIVERY: 'WRONG_DELIVERY',
  },
} as const

const DELIVERY_EXCEPTION_SEVERITY_LABELS = {
  ko: {
    LOW: '낮음',
    MEDIUM: '보통',
    HIGH: '높음',
    CRITICAL: '치명',
  },
  en: {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL',
  },
} as const

const content = computed(() => CONTENT[preferences.language])

function getCheckpointTypeLabel(option: string) {
  const labels = CHECKPOINT_TYPE_LABELS[preferences.language] as Record<string, string>
  return labels[option] ?? option
}

function getCheckpointStatusLabel(option: string) {
  const labels = CHECKPOINT_STATUS_LABELS[preferences.language] as Record<string, string>
  return labels[option] ?? option
}

function getDeliveryExceptionTypeLabel(option: string) {
  const labels = DELIVERY_EXCEPTION_TYPE_LABELS[preferences.language] as Record<string, string>
  return labels[option] ?? option
}

function getDeliveryExceptionSeverityLabel(option: string) {
  const labels = DELIVERY_EXCEPTION_SEVERITY_LABELS[preferences.language] as Record<string, string>
  return labels[option] ?? option
}

const shipments = ref<ShipmentListResponseDto[]>([])
const shipmentErrorMessage = ref('')
const selectedShipment = ref<ShipmentListResponseDto | null>(null)
const selectedShipmentDetail = ref<ShipmentResponseDto | null>(null)
const selectedShipmentEta = ref<ShipmentEtaResponseDto | null>(null)
const selectedShipmentHistories = ref<ShipmentStatusHistoryResponseDto[]>([])
const shipmentDetailErrorMessage = ref('')
const isShipmentDetailLoading = ref(false)

const isCreateModalOpen = ref(false)
const isCreateSubmitting = ref(false)
const createErrorMessage = ref('')
const createForm = ref<CreateShipmentRequestDto>({
  shipmentNumber: '',
  poId: 0,
  subPoId: null,
  carrierName: '',
  vehicleNo: '',
  trackingNo: '',
  originNodePublicId: '',
  destinationNodePublicId: '',
  departureEta: '',
  arrivalEta: '',
  temperatureRequired: false,
})

const etaProjections = ref<EtaProjectionResponseDto[]>([])
const deliveryExceptions = ref<DeliveryExceptionResponseDto[]>([])
const shipmentLotMappings = ref<ShipmentLotMappingResponseDto[]>([])

const isTrackPanelOpen = ref(false)
const isTrackSubmitting = ref(false)
const trackErrorMessage = ref('')
const trackForm = ref<TrackShipmentRequestDto>({
  nodePublicId: '',
  checkpointType: '',
  checkpointStatus: '',
  plannedAt: '',
  actualAt: null,
  note: '',
})

const isExceptionPanelOpen = ref(false)
const isExceptionSubmitting = ref(false)
const exceptionErrorMessage = ref('')
const exceptionForm = ref<CreateDeliveryExceptionRequestDto>({
  shipmentPublicId: '',
  exceptionType: '',
  severity: '',
  detectedAt: '',
  note: '',
})

const isLotMappingPanelOpen = ref(false)
const isLotMappingSubmitting = ref(false)
const lotMappingErrorMessage = ref('')
const lotMappingForm = ref<CreateShipmentLotMappingRequestDto>({
  lotPublicId: '',
  shippedQty: 0,
})

const checkpointTypeOptions = ['DEPARTURE', 'TRANSIT', 'ARRIVAL', 'WAREHOUSE_IN']
const checkpointStatusOptions = ['PLANNED', 'PASSED', 'FAILED', 'CANCELLED']
const deliveryExceptionTypeOptions = ['DELAY', 'DAMAGE', 'TEMPERATURE_DEVIATION', 'WRONG_DELIVERY']
const deliveryExceptionSeverityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

async function fetchShipments() {
  try {
    const res = await getShipments()
    shipments.value = res.content
    shipmentErrorMessage.value = ''
  } catch (err) {
    console.error('Failed to fetch shipments:', err)
    shipments.value = []
    shipmentErrorMessage.value = content.value.messages.loadShipmentsFail
  }
}

async function handleShipmentSelect(shipment: ShipmentListResponseDto) {
  selectedShipment.value = shipment
  shipmentDetailErrorMessage.value = ''
  isShipmentDetailLoading.value = true

  try {
    const [detail, eta, histories, projections, exceptions, mappings] = await Promise.all([
      getShipment(shipment.publicId),
      getShipmentEta(shipment.publicId),
      getShipmentStatusHistories(shipment.publicId),
      getEtaProjections(shipment.publicId),
      getDeliveryExceptions(shipment.publicId),
      getShipmentLotMappings(shipment.publicId),
    ])

    selectedShipmentDetail.value = detail
    selectedShipmentEta.value = eta
    selectedShipmentHistories.value = histories
    etaProjections.value = projections
    deliveryExceptions.value = exceptions
    shipmentLotMappings.value = mappings

    exceptionForm.value.shipmentPublicId = shipment.publicId
  } catch (err) {
    console.error('Failed to load shipment detail:', err)
    selectedShipmentDetail.value = null
    selectedShipmentEta.value = null
    selectedShipmentHistories.value = []
    etaProjections.value = []
    deliveryExceptions.value = []
    shipmentLotMappings.value = []
    shipmentDetailErrorMessage.value = content.value.messages.loadDetailFail
  } finally {
    isShipmentDetailLoading.value = false
  }
}

function resetCreateForm() {
  createForm.value = {
    shipmentNumber: '',
    poId: 0,
    subPoId: null,
    carrierName: '',
    vehicleNo: '',
    trackingNo: '',
    originNodePublicId: '',
    destinationNodePublicId: '',
    departureEta: '',
    arrivalEta: '',
    temperatureRequired: false,
  }
}

async function handleCreateShipmentSubmit() {
  createErrorMessage.value = ''
  isCreateSubmitting.value = true

  try {
    await createShipment({
      ...createForm.value,
      subPoId: createForm.value.subPoId || null,
    })
    await fetchShipments()
    resetCreateForm()
    isCreateModalOpen.value = false
  } catch (err: any) {
    console.error('Failed to create shipment:', err)
    createErrorMessage.value = err?.message ?? content.value.messages.createFail
  } finally {
    isCreateSubmitting.value = false
  }
}

function resetTrackForm() {
  trackForm.value = {
    nodePublicId: '',
    checkpointType: '',
    checkpointStatus: '',
    plannedAt: '',
    actualAt: null,
    note: '',
  }
}

function resetExceptionForm() {
  exceptionForm.value = {
    shipmentPublicId: selectedShipmentDetail.value?.publicId ?? '',
    exceptionType: '',
    severity: '',
    detectedAt: '',
    note: '',
  }
}

function resetLotMappingForm() {
  lotMappingForm.value = {
    lotPublicId: '',
    shippedQty: 0,
  }
}

async function handleTrackShipmentSubmit() {
  if (!selectedShipment.value) return

  trackErrorMessage.value = ''
  isTrackSubmitting.value = true

  try {
    await trackShipment(selectedShipment.value.publicId, {
      ...trackForm.value,
      actualAt: trackForm.value.actualAt || null,
      note: trackForm.value.note || '',
    })
    resetTrackForm()
    isTrackPanelOpen.value = false
    await handleShipmentSelect(selectedShipment.value)
  } catch (err: any) {
    console.error('Failed to track shipment:', err)
    trackErrorMessage.value = err?.message ?? content.value.messages.trackFail
  } finally {
    isTrackSubmitting.value = false
  }
}

async function handleCreateDeliveryExceptionSubmit() {
  if (!selectedShipment.value) return

  exceptionErrorMessage.value = ''
  isExceptionSubmitting.value = true

  try {
    await createDeliveryException({
      ...exceptionForm.value,
      shipmentPublicId: selectedShipment.value.publicId,
    })
    resetExceptionForm()
    isExceptionPanelOpen.value = false
    await handleShipmentSelect(selectedShipment.value)
  } catch (err: any) {
    console.error('Failed to create delivery exception:', err)
    exceptionErrorMessage.value = err?.message ?? content.value.messages.exceptionFail
  } finally {
    isExceptionSubmitting.value = false
  }
}

async function handleCreateShipmentLotMappingSubmit() {
  if (!selectedShipment.value) return

  lotMappingErrorMessage.value = ''
  isLotMappingSubmitting.value = true

  try {
    await createShipmentLotMapping(selectedShipment.value.publicId, lotMappingForm.value)
    resetLotMappingForm()
    isLotMappingPanelOpen.value = false
    await handleShipmentSelect(selectedShipment.value)
  } catch (err: any) {
    console.error('Failed to create shipment lot mapping:', err)
    lotMappingErrorMessage.value = err?.message ?? content.value.messages.lotMapFail
  } finally {
    isLotMappingSubmitting.value = false
  }
}

onMounted(() => {
  fetchShipments()
})
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">
          {{ content.subtitle }}
        </p>
      </div>
      <div class="design-trigger-row">
        <button
          class="page-button page-button--primary"
          type="button"
          @click="isCreateModalOpen = !isCreateModalOpen"
        >
          {{ isCreateModalOpen ? content.buttons.closeCreate : content.buttons.openCreate }}
        </button>
      </div>
    </header>

    <article
      v-if="isCreateModalOpen"
      class="page-panel"
      style="margin-bottom: 16px;"
    >
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.panels.createEyebrow }}</div>
          <h3>{{ content.panels.createTitle }}</h3>
        </div>
      </div>

      <div class="page-feed">
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.shipmentNumber }}</span>
          <input v-model="createForm.shipmentNumber" type="text" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.poId }}</span>
          <input v-model.number="createForm.poId" type="number" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.carrierName }}</span>
          <input v-model="createForm.carrierName" type="text" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.vehicleNo }}</span>
          <input v-model="createForm.vehicleNo" type="text" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.trackingNo }}</span>
          <input v-model="createForm.trackingNo" type="text" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.originNodePublicId }}</span>
          <input v-model="createForm.originNodePublicId" type="text" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.destinationNodePublicId }}</span>
          <input v-model="createForm.destinationNodePublicId" type="text" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.departureEta }}</span>
          <input v-model="createForm.departureEta" type="datetime-local" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.arrivalEta }}</span>
          <input v-model="createForm.arrivalEta" type="datetime-local" class="page-input" />
        </div>

        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.subPoId }}</span>
          <input v-model.number="createForm.subPoId" type="number" class="page-input" />
        </div>

        <div class="page-feed__item">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input v-model="createForm.temperatureRequired" type="checkbox" />
            <span class="page-feed__label">{{ content.fields.temperatureRequired }}</span>
          </label>
        </div>
      </div>

      <div
        v-if="createErrorMessage"
        style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;"
      >
        {{ createErrorMessage }}
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="isCreateSubmitting"
          @click="handleCreateShipmentSubmit"
        >
          {{ isCreateSubmitting ? content.buttons.submittingCreate : content.buttons.submitCreate }}
        </button>
      </div>
    </article>

    <article class="page-panel">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.panels.listEyebrow }}</div>
          <h3>{{ content.panels.listTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ shipments.length }}</span>
      </div>

      <div v-if="shipmentErrorMessage" class="page-table__empty">
        {{ shipmentErrorMessage }}
      </div>

      <div v-else-if="shipments.length === 0" class="page-table__empty">
        {{ content.messages.emptyShipments }}
      </div>

      <div v-else class="page-table terminal-page__table">
        <div class="page-table__row page-table__row--head">
          <span>{{ content.fields.shipmentNumber }}</span>
          <span>{{ content.fields.carrierName }}</span>
          <span>{{ content.fields.status }}</span>
          <span>{{ content.fields.eta }}</span>
          <span>{{ content.fields.action }}</span>
        </div>

        <div
          v-for="shipment in shipments"
          :key="shipment.publicId"
          class="page-table__row"
        >
          <span>{{ shipment.shipmentNumber }}</span>
          <span>{{ shipment.carrierName }}</span>
          <span>{{ shipment.status }}</span>
          <span>{{ shipment.arrivalEta?.substring(0, 10) ?? '-' }}</span>
          <span>
            <button
              class="page-button page-button--secondary"
              type="button"
              @click="handleShipmentSelect(shipment)"
            >
              {{ content.buttons.select }}
            </button>
          </span>
        </div>
      </div>

      <div
        v-if="selectedShipment || isShipmentDetailLoading || shipmentDetailErrorMessage"
        class="page-table__empty"
        style="margin-top: 12px;"
      >
        <template v-if="isShipmentDetailLoading">
          {{ content.messages.loadingDetail }}
        </template>

        <template v-else-if="shipmentDetailErrorMessage">
          {{ shipmentDetailErrorMessage }}
        </template>

        <template v-else-if="selectedShipmentDetail">
          {{ content.fields.selectedShipment }}: {{ selectedShipmentDetail.shipmentNumber }} /
          {{ selectedShipmentDetail.status }}
        </template>
      </div>

      <div
        v-if="selectedShipmentDetail && selectedShipmentEta"
        style="
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        "
      >
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ content.panels.detailEyebrow }}</div>
              <h3>{{ content.panels.detailTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.carrierName }}</span>
              <strong class="page-feed__text">{{ selectedShipmentDetail.carrierName }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.vehicleNo }}</span>
              <strong class="page-feed__text">{{ selectedShipmentDetail.vehicleNo }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.trackingNo }}</span>
              <strong class="page-feed__text">{{ selectedShipmentDetail.trackingNo }}</strong>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ content.panels.etaEyebrow }}</div>
              <h3>{{ content.panels.etaTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.estimatedArrival }}</span>
              <strong class="page-feed__text">
                {{ selectedShipmentEta.estimatedArrivalAt?.substring(0, 10) ?? '-' }}
              </strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.delayMinutes }}</span>
              <strong class="page-feed__text">{{ selectedShipmentEta.delayMinutes }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.delayed }}</span>
              <strong class="page-feed__text">
                {{ selectedShipmentEta.delayed ? content.states.yes : content.states.no }}
              </strong>
            </div>
          </div>
        </article>
      </div>

      <article
        v-if="selectedShipmentDetail"
        class="page-panel"
        style="margin-top: 12px;"
      >
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.historyEyebrow }}</div>
            <h3>{{ content.panels.historyTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ selectedShipmentHistories.length }}</span>
        </div>

        <div class="page-feed">
          <div
            v-for="history in selectedShipmentHistories"
            :key="`${history.shipmentPublicId}-${history.recordedAt}-${history.statusCode}`"
            class="page-feed__item"
          >
            <span class="page-feed__label">
              {{ history.recordedAt?.substring(0, 10) ?? '-' }}
            </span>
            <strong class="page-feed__text">
              {{ history.statusCode }} / {{ history.statusMessage }}
            </strong>
          </div>

          <div v-if="selectedShipmentHistories.length === 0" class="page-feed__item">
            <span class="page-feed__text" style="opacity: 0.6;">
              {{ content.messages.emptyHistory }}
            </span>
          </div>
        </div>
      </article>

      <div
        v-if="selectedShipmentDetail"
        style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;"
      >
        <button class="page-button page-button--secondary" type="button" @click="isTrackPanelOpen = !isTrackPanelOpen">
          {{ isTrackPanelOpen ? content.buttons.closeTrack : content.buttons.openTrack }}
        </button>

        <button class="page-button page-button--secondary" type="button" @click="isExceptionPanelOpen = !isExceptionPanelOpen">
          {{ isExceptionPanelOpen ? content.buttons.closeException : content.buttons.openException }}
        </button>

        <button class="page-button page-button--secondary" type="button" @click="isLotMappingPanelOpen = !isLotMappingPanelOpen">
          {{ isLotMappingPanelOpen ? content.buttons.closeLotMap : content.buttons.openLotMap }}
        </button>
      </div>

      <article v-if="isTrackPanelOpen" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.trackEyebrow }}</div>
            <h3>{{ content.panels.trackTitle }}</h3>
          </div>
        </div>

        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.nodePublicId }}</span>
            <input v-model="trackForm.nodePublicId" type="text" class="page-input" />
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.checkpointType }}</span>
            <select v-model="trackForm.checkpointType" class="page-input">
              <option value="">{{ content.placeholders.checkpointType }}</option>
              <option v-for="option in checkpointTypeOptions" :key="option" :value="option">
                {{ getCheckpointTypeLabel(option) }}
              </option>
            </select>
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.checkpointStatus }}</span>
            <select v-model="trackForm.checkpointStatus" class="page-input">
              <option value="">{{ content.placeholders.checkpointStatus }}</option>
              <option v-for="option in checkpointStatusOptions" :key="option" :value="option">
                {{ getCheckpointStatusLabel(option) }}
              </option>
            </select>
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.plannedAt }}</span>
            <input v-model="trackForm.plannedAt" type="datetime-local" class="page-input" />
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.actualAt }}</span>
            <input v-model="trackForm.actualAt" type="datetime-local" class="page-input" />
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.note }}</span>
            <input v-model="trackForm.note" type="text" class="page-input" />
          </div>
        </div>

        <div v-if="trackErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
          {{ trackErrorMessage }}
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
          <button class="page-button page-button--primary" type="button" :disabled="isTrackSubmitting" @click="handleTrackShipmentSubmit">
            {{ isTrackSubmitting ? content.buttons.submittingTrack : content.buttons.submitTrack }}
          </button>
        </div>
      </article>

      <article v-if="etaProjections.length > 0" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.etaProjectionEyebrow }}</div>
            <h3>{{ content.panels.etaProjectionTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ etaProjections.length }}</span>
        </div>

        <div class="page-feed">
          <div v-for="projection in etaProjections" :key="projection.id" class="page-feed__item">
            <span class="page-feed__label">{{ projection.calculatedAt?.substring(0, 10) ?? '-' }}</span>
            <strong class="page-feed__text">
              {{ projection.previousEta?.substring(0, 10) ?? '-' }} -> {{ projection.projectedEta?.substring(0, 10) ?? '-' }}
              / {{ projection.delayMinutes }} {{ content.units.minutes }}
            </strong>
          </div>
        </div>
      </article>

      <article v-if="isExceptionPanelOpen" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.exceptionEyebrow }}</div>
            <h3>{{ content.panels.exceptionTitle }}</h3>
          </div>
        </div>

        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.exceptionType }}</span>
            <select v-model="exceptionForm.exceptionType" class="page-input">
              <option value="">{{ content.placeholders.exceptionType }}</option>
              <option v-for="option in deliveryExceptionTypeOptions" :key="option" :value="option">
                {{ getDeliveryExceptionTypeLabel(option) }}
              </option>
            </select>
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.severity }}</span>
            <select v-model="exceptionForm.severity" class="page-input">
              <option value="">{{ content.placeholders.severity }}</option>
              <option v-for="option in deliveryExceptionSeverityOptions" :key="option" :value="option">
                {{ getDeliveryExceptionSeverityLabel(option) }}
              </option>
            </select>
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.detectedAt }}</span>
            <input v-model="exceptionForm.detectedAt" type="datetime-local" class="page-input" />
          </div>

          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.note }}</span>
            <input v-model="exceptionForm.note" type="text" class="page-input" />
          </div>
        </div>

        <div v-if="exceptionErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
          {{ exceptionErrorMessage }}
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
          <button class="page-button page-button--primary" type="button" :disabled="isExceptionSubmitting" @click="handleCreateDeliveryExceptionSubmit">
            {{ isExceptionSubmitting ? content.buttons.submittingException : content.buttons.submitException }}
          </button>
        </div>
      </article>

      <article v-if="deliveryExceptions.length > 0" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.exceptionsEyebrow }}</div>
            <h3>{{ content.panels.exceptionsTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ deliveryExceptions.length }}</span>
        </div>

        <div class="page-feed">
          <div v-for="exception in deliveryExceptions" :key="`${exception.shipmentPublicId}-${exception.detectedAt}-${exception.exceptionType}`" class="page-feed__item">
            <span class="page-feed__label">{{ exception.detectedAt?.substring(0, 10) ?? '-' }}</span>
            <strong class="page-feed__text">
              {{ getDeliveryExceptionTypeLabel(exception.exceptionType) }} /
              {{ getDeliveryExceptionSeverityLabel(exception.severity) }} /
              {{ exception.resolved ? content.states.resolved : content.states.open }}
            </strong>
          </div>
        </div>
      </article>

      <article v-if="isLotMappingPanelOpen" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.lotMapEyebrow }}</div>
            <h3>{{ content.panels.lotMapTitle }}</h3>
          </div>
        </div>

        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.lotPublicId }}</span>
            <input v-model="lotMappingForm.lotPublicId" type="text" class="page-input" />
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.shippedQty }}</span>
            <input v-model.number="lotMappingForm.shippedQty" type="number" class="page-input" />
          </div>
        </div>

        <div v-if="lotMappingErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
          {{ lotMappingErrorMessage }}
        </div>

        <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
          <button class="page-button page-button--primary" type="button" :disabled="isLotMappingSubmitting" @click="handleCreateShipmentLotMappingSubmit">
            {{ isLotMappingSubmitting ? content.buttons.submittingLotMap : content.buttons.submitLotMap }}
          </button>
        </div>
      </article>

      <article v-if="shipmentLotMappings.length > 0" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.lotMappingsEyebrow }}</div>
            <h3>{{ content.panels.lotMappingsTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ shipmentLotMappings.length }}</span>
        </div>

        <div class="page-feed">
          <div v-for="mapping in shipmentLotMappings" :key="`${mapping.shipmentPublicId}-${mapping.lotPublicId}`" class="page-feed__item">
            <span class="page-feed__label">{{ mapping.lotPublicId }}</span>
            <strong class="page-feed__text">
              {{ mapping.shippedQty }} {{ mapping.unit }} / {{ mapping.loadedAt?.substring(0, 10) ?? '-' }}
            </strong>
          </div>
        </div>
      </article>
    </article>
  </section>
</template>
