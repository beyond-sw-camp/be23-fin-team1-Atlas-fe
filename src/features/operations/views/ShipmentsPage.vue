<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { ko } from 'date-fns/locale/ko'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import ShipmentKoreaMap from '../components/ShipmentKoreaMap.vue'
import {
  arriveShipment,
  cancelShipment,
  createDeliveryException,
  createShipment,
  getCreatableShipmentOrders,
  getDeliveryExceptions,
  getEtaProjections,
  getShipment,
  getShipmentEta,
  getShipmentMapData,
  getShipmentStatusHistories,
  getShipments,
  startShipment,
  trackShipment,
  updateShipment,
  type CreateDeliveryExceptionRequestDto,
  type CreateShipmentRequestDto,
  type DeliveryExceptionResponseDto,
  type EtaProjectionResponseDto,
  type ShipmentCreatableOrderDto,
  type ShipmentCreatableOrderItemDto,
  type ShipmentEtaResponseDto,
  type ShipmentListResponseDto,
  type ShipmentMapResponseDto,
  type ShipmentResponseDto,
  type ShipmentStatus,
  type ShipmentStatusHistoryResponseDto,
  type TrackShipmentRequestDto,
  type UpdateShipmentRequestDto,
} from '../../../services/shipment'

const preferences = useAtlasPreferencesStore()
const route = useRoute()
const router = useRouter()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 출하',
    title: '출하',
    refresh: '새로고침',
    openCreate: '출하 등록',
    closeCreate: '취소',
    createTitle: '출하 생성',
    createEyebrow: 'READY 생성',
    mapTitle: '진행 중 출하 지도',
    mapEyebrow: 'READY / 배송중 / 지연',
    activeListTitle: '진행 중 출하',
    boardTitle: '출하 목록',
    boardEyebrow: 'SHIPMENT LIST',
    searchPlaceholder: '출하번호, 창고, 운송장 검색',
    allBoard: '전체',
    readyBoard: '준비완료',
    inTransitBoard: '배송중',
    arrivedBoard: '도착완료',
    cancelledBoard: '취소건',
    boardEmpty: '대상 출하가 없습니다.',
    manageShipment: '관리 열기',
    detailTitle: '출하 상세',
    updateTitle: '출발 예정 시각 변경',
    historyTitle: '상태 이력',
    trackTitle: '중간 위치 등록',
    exceptionTitle: '배송 예외 등록',
    exceptionListTitle: '배송 예외 목록',
    etaTitle: '도착 예정 시각',
    etaProjectionTitle: '도착 예정 변경 이력',
    order: '승인 발주',
    orderIdentity: '주문 식별 정보',
    sourceType: '출하 유형',
    sourcePublicId: '기준 주문',
    purchaseOrderId: '상위 발주',
    subPurchaseOrderId: '하위 발주',
    shipmentItems: '출하 품목',
    originNode: '출발 창고',
    destinationNode: '도착 창고',
    currentNode: '현재 위치',
    departureEta: '출발 예정 시각',
    arrivalEta: '도착 예정 시각',
    actualDepartedAt: '실제 출발',
    actualArrivedAt: '실제 도착',
    carrierName: '운송사',
    vehicleNo: '차량 번호',
    trackingNo: '운송장 번호',
    shipmentNumber: '출하 번호',
    status: '상태',
    action: '관리',
    options: '배송 옵션',
    temperatureRequired: '온도 관리',
    sealedPackagingRequired: '밀봉 필요',
    fragile: '파손 위험',
    select: '선택',
    loading: '불러오는 중...',
    submitCreate: '출하 생성',
    submitUpdate: '시간 변경',
    cancelDetail: '취소',
    saveDetail: '저장',
    startShipment: '배송중 처리',
    arriveShipment: '도착완료 처리',
    cancelShipment: '출하 취소',
    openTrack: '위치 등록',
    closeTrack: '위치 닫기',
    submitTrack: '위치 저장',
    openException: '예외 등록',
    closeException: '예외 닫기',
    submitException: '예외 저장',
    checkpoint: '체크포인트',
    checkpointStatus: '체크포인트 상태',
    plannedAt: '예정 시각',
    actualAt: '실제 시각',
    note: '비고',
    exceptionType: '예외 유형',
    severity: '심각도',
    detectedAt: '감지 시각',
    delayMinutes: '지연 시간',
    previous: '이전',
    next: '다음',
    emptyShipments: '출하 데이터가 없습니다.',
    emptyMap: '현재 진행 중인 출하가 없습니다.',
    emptyHistory: '상태 이력이 없습니다.',
    emptyOrders: '출하 생성 가능한 승인 발주가 없습니다.',
    destinationFromOrder: '도착 창고는 발주 품목에 지정된 창고가 자동 적용됩니다.',
    destinationNotReady: '선택한 발주에 도착 창고가 없습니다. 발주 품목의 도착 창고를 먼저 지정해야 합니다.',
    requiredCreate: '승인 발주, 출하 품목 수량, 출발 예정 시각은 필수입니다.',
    loadFail: '출하 정보를 불러오지 못했습니다.',
    loadMapFail: '지도 데이터를 불러오지 못했습니다.',
    loadNodesFail: '창고 목록을 불러오지 못했습니다.',
    createFail: '출하 생성에 실패했습니다.',
    updateFail: '출하 수정에 실패했습니다.',
    statusFail: '출하 상태 변경에 실패했습니다.',
    cancelFail: '출하 취소에 실패했습니다.',
    trackFail: '위치 등록에 실패했습니다.',
    exceptionFail: '배송 예외 등록에 실패했습니다.',
    requiredException: '예외 유형, 심각도, 감지 시각은 필수입니다.',
    readyOnlyUpdate: '출하가 READY 상태일 때만 출발 예정 시각을 변경할 수 있습니다.',
    autoTransportNotice: '운송사, 차량 번호, 운송장 번호와 도착 예정 시각은 배송중 처리 시 자동 생성됩니다.',
  },
  en: {
    eyebrow: 'SUPPLY CHAIN OPS / SHIPMENTS',
    title: 'Shipments',
    refresh: 'REFRESH',
    openCreate: 'CREATE SHIPMENT',
    closeCreate: 'CANCEL',
    createTitle: 'Create Shipment',
    createEyebrow: 'READY',
    mapTitle: 'Active Shipment Map',
    mapEyebrow: 'READY / IN TRANSIT / DELAYED',
    activeListTitle: 'Active Shipments',
    boardTitle: 'Shipment List',
    boardEyebrow: 'SHIPMENT LIST',
    searchPlaceholder: 'Search shipment no., warehouse, or tracking no.',
    allBoard: 'All',
    readyBoard: 'Ready',
    inTransitBoard: 'In Transit',
    arrivedBoard: 'Arrived',
    cancelledBoard: 'Cancelled',
    boardEmpty: 'No shipments.',
    manageShipment: 'Open Management',
    detailTitle: 'Shipment Detail',
    updateTitle: 'Update Departure ETA',
    historyTitle: 'Status History',
    trackTitle: 'Register Transit Location',
    exceptionTitle: 'Delivery Exception',
    exceptionListTitle: 'Delivery Exceptions',
    etaTitle: 'Arrival Estimate',
    etaProjectionTitle: 'Arrival Estimate History',
    order: 'Accepted Order',
    orderIdentity: 'Order Identity',
    sourceType: 'Shipment Type',
    sourcePublicId: 'Source Order',
    purchaseOrderId: 'Purchase Order',
    subPurchaseOrderId: 'Sub Order',
    shipmentItems: 'Shipment Items',
    originNode: 'Origin Warehouse',
    destinationNode: 'Destination Warehouse',
    currentNode: 'Current Location',
    departureEta: 'Departure ETA',
    arrivalEta: 'Arrival ETA',
    actualDepartedAt: 'Actual Departed',
    actualArrivedAt: 'Actual Arrived',
    carrierName: 'Carrier',
    vehicleNo: 'Vehicle No',
    trackingNo: 'Tracking No',
    shipmentNumber: 'Shipment No',
    status: 'Status',
    action: 'Action',
    options: 'Delivery Options',
    temperatureRequired: 'Temperature Control',
    sealedPackagingRequired: 'Sealed Package',
    fragile: 'Fragile',
    select: 'SELECT',
    loading: 'Loading...',
    submitCreate: 'CREATE SHIPMENT',
    submitUpdate: 'SAVE TIME',
    cancelDetail: 'CANCEL',
    saveDetail: 'SAVE',
    startShipment: 'START DELIVERY',
    arriveShipment: 'CONFIRM ARRIVAL',
    cancelShipment: 'CANCEL SHIPMENT',
    openTrack: 'ADD LOCATION',
    closeTrack: 'CLOSE LOCATION',
    submitTrack: 'SAVE LOCATION',
    openException: 'ADD EXCEPTION',
    closeException: 'CLOSE EXCEPTION',
    submitException: 'SAVE EXCEPTION',
    checkpoint: 'Checkpoint',
    checkpointStatus: 'Checkpoint Status',
    plannedAt: 'Planned At',
    actualAt: 'Actual At',
    note: 'Note',
    exceptionType: 'Exception Type',
    severity: 'Severity',
    detectedAt: 'Detected At',
    delayMinutes: 'Delay',
    previous: 'PREV',
    next: 'NEXT',
    emptyShipments: 'No shipments found.',
    emptyMap: 'No active shipments found.',
    emptyHistory: 'No history found.',
    emptyOrders: 'No accepted orders available.',
    destinationFromOrder: 'Destination warehouse is automatically taken from the order item.',
    destinationNotReady: 'The selected order has no destination warehouse. Set it on order items first.',
    requiredCreate: 'Accepted order, shipment item quantity, and departure ETA are required.',
    loadFail: 'Failed to load shipments.',
    loadMapFail: 'Failed to load map data.',
    loadNodesFail: 'Failed to load warehouses.',
    createFail: 'Failed to create shipment.',
    updateFail: 'Failed to update shipment.',
    statusFail: 'Failed to change shipment status.',
    cancelFail: 'Failed to cancel shipment.',
    trackFail: 'Failed to register location.',
    exceptionFail: 'Failed to create delivery exception.',
    requiredException: 'Exception type, severity, and detected time are required.',
    readyOnlyUpdate: 'Departure ETA can be changed only while shipment is READY.',
    autoTransportNotice: 'Carrier, vehicle, tracking number, and arrival ETA are generated when delivery starts.',
  },
} as const

const content = computed(() => CONTENT.ko)
const shipmentKpiContent = computed(() => ({
        active: '출하 진행 중',
        ready: '상품 준비 완료',
        inTransit: '배송 중',
        delayed: '지연',
        activeSub: '',
        readySub: '배송대기',
        inTransitSub: '운송 진행',
        delayedSub: '확인 필요',
}))

const shipments = ref<ShipmentListResponseDto[]>([])
const search = ref('')
const mapShipments = ref<ShipmentMapResponseDto[]>([])
const acceptedPurchaseOrders = ref<ShipmentCreatableOrderDto[]>([])
const selectedPurchaseOrderDetail = ref<ShipmentCreatableOrderDto | null>(null)
const createLineQuantities = ref<Record<string, number>>({})
const isQuantityLimitModalOpen = ref(false)

const currentPage = ref(0)
const pageSize = ref(10)
const totalPages = ref(0)
const totalElements = ref(0)

const isShipmentListLoading = ref(false)
const isMapLoading = ref(false)
const isOrderOptionsLoading = ref(false)
const isShipmentDetailLoading = ref(false)
const isCreateSubmitting = ref(false)
const isUpdateSubmitting = ref(false)
const isStatusSubmitting = ref(false)
const isTrackSubmitting = ref(false)
const isExceptionSubmitting = ref(false)

const shipmentErrorMessage = ref('')
const mapErrorMessage = ref('')
const orderErrorMessage = ref('')
const shipmentDetailErrorMessage = ref('')
const createErrorMessage = ref('')
const updateErrorMessage = ref('')
const statusErrorMessage = ref('')
const trackErrorMessage = ref('')
const exceptionErrorMessage = ref('')

const selectedShipment = ref<ShipmentListResponseDto | null>(null)
const selectedShipmentDetail = ref<ShipmentResponseDto | null>(null)
const selectedShipmentEta = ref<ShipmentEtaResponseDto | null>(null)
const selectedShipmentHistories = ref<ShipmentStatusHistoryResponseDto[]>([])
const etaProjections = ref<EtaProjectionResponseDto[]>([])
const deliveryExceptions = ref<DeliveryExceptionResponseDto[]>([])
type ShipmentBoardFilter = 'ALL' | 'READY' | 'IN_TRANSIT' | 'ARRIVED' | 'CANCELLED'
const activeBoardFilter = ref<ShipmentBoardFilter>('ALL')

const isCreateModalOpen = ref(false)
const isCreatePage = computed(() => route.name === 'shipmentCreate')
const isTrackPanelOpen = ref(false)
const isExceptionPanelOpen = ref(false)
let searchDebounceTimer: number | undefined

const createForm = ref<CreateShipmentRequestDto>({
  poId: null,
  purchaseOrderPublicId: '',
  subPoId: null,
  subPurchaseOrderPublicId: '',
  originNodePublicId: null,
  shipmentLines: [],
  departureEta: '',
  temperatureRequired: false,
  sealedPackagingRequired: false,
  fragile: false,
})

const createDepartureDate = ref('')
const createDepartureTime = ref('')
const createDepartureDatePickerValue = computed<Date | null>({
  get() {
    return parseDateValue(createDepartureDate.value)
  },
  set(date) {
    createDepartureDate.value = formatDateForApi(date)
  },
})

const updateForm = ref<UpdateShipmentRequestDto>({
  departureEta: '',
  temperatureRequired: false,
  sealedPackagingRequired: false,
  fragile: false,
})
const updateDepartureDate = ref('')
const updateDepartureTime = ref('')
const updateDepartureDatePickerValue = computed<Date | null>({
  get() {
    return parseDateValue(updateDepartureDate.value)
  },
  set(date) {
    updateDepartureDate.value = formatDateForApi(date)
  },
})

const datepickerTimeConfig = { enableTimePicker: false }
const datepickerFormats = {
  input: 'yyyy. MM. dd.',
  preview: 'yyyy. MM. dd.',
}

const trackForm = ref<TrackShipmentRequestDto>({
  nodePublicId: '',
  checkpointType: 'TRANSIT',
  checkpointStatus: 'PASSED',
  plannedAt: '',
  actualAt: null,
  note: '',
})

const exceptionForm = ref<CreateDeliveryExceptionRequestDto>({
  shipmentPublicId: '',
  exceptionType: '',
  severity: '',
  detectedAt: '',
  note: '',
})
const exceptionDetectedDate = ref('')
const exceptionDetectedTime = ref('')
const exceptionDetectedDatePickerValue = computed<Date | null>({
  get() {
    return parseDateValue(exceptionDetectedDate.value)
  },
  set(date) {
    exceptionDetectedDate.value = formatDateForApi(date)
  },
})

const checkpointTypeOptions = ['TRANSIT']
const checkpointStatusOptions = ['PASSED']
const deliveryExceptionTypeOptions = ['DELAY', 'DAMAGE', 'TEMPERATURE_DEVIATION', 'WRONG_DELIVERY']
const deliveryExceptionSeverityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const displayShipments = computed(() => dedupeShipments(shipments.value))
const displayMapShipments = computed(() =>
  dedupeShipments(mapShipments.value).filter((shipment) =>
    ['READY', 'IN_TRANSIT', 'DELAYED'].includes(shipment.status),
  ),
)
const activeShipmentCount = computed(() => displayMapShipments.value.length)
const readyShipmentCount = computed(() => displayShipments.value.filter((shipment) => shipment.status === 'READY').length)
const inTransitShipmentCount = computed(() => displayShipments.value.filter((shipment) => shipment.status === 'IN_TRANSIT').length)
const delayedShipmentCount = computed(() => displayShipments.value.filter((shipment) => shipment.status === 'DELAYED').length)
const boardFilterOptions = computed(() => [
  {
    value: 'ALL' as ShipmentBoardFilter,
    label: content.value.allBoard,
    count: displayShipments.value.length,
  },
  {
    value: 'READY' as ShipmentBoardFilter,
    label: content.value.readyBoard,
    count: displayShipments.value.filter((shipment) => shipment.status === 'READY').length,
  },
  {
    value: 'IN_TRANSIT' as ShipmentBoardFilter,
    label: content.value.inTransitBoard,
    count: displayShipments.value.filter((shipment) => shipment.status === 'IN_TRANSIT').length,
  },
  {
    value: 'ARRIVED' as ShipmentBoardFilter,
    label: content.value.arrivedBoard,
    count: displayShipments.value.filter((shipment) => shipment.status === 'ARRIVED').length,
  },
  {
    value: 'CANCELLED' as ShipmentBoardFilter,
    label: content.value.cancelledBoard,
    count: displayShipments.value.filter((shipment) => shipment.status === 'CANCELLED').length,
  },
])
const filteredBoardShipments = computed(() => {
  if (activeBoardFilter.value === 'ALL') {
    return displayShipments.value
  }

  return displayShipments.value.filter((shipment) => shipment.status === activeBoardFilter.value)
})
const selectedShipmentPublicId = computed(() => selectedShipmentDetail.value?.publicId ?? selectedShipment.value?.publicId ?? null)
const departureTimeOptions = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0')
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour}:${minute}`
})

const createDepartureEta = computed(() => {
  if (!createDepartureDate.value || !createDepartureTime.value) return ''
  return `${createDepartureDate.value}T${createDepartureTime.value}`
})
const updateDepartureEta = computed(() => {
  if (!updateDepartureDate.value || !updateDepartureTime.value) return ''
  return `${updateDepartureDate.value}T${updateDepartureTime.value}`
})
const exceptionDetectedAt = computed(() => {
  if (!exceptionDetectedDate.value || !exceptionDetectedTime.value) return ''
  return `${exceptionDetectedDate.value}T${exceptionDetectedTime.value}`
})

const selectedOrderItems = computed(() => selectedPurchaseOrderDetail.value?.items ?? [])
const selectedArrivalLogisticsNodeText = computed(() => {
  const nodes = selectedOrderItems.value
    .filter((item) => item.destinationNodePublicId)
    .map((item) => formatNodeDisplay(item.destinationNodeName, item.destinationNodeCode, item.destinationNodePublicId))

  if (nodes.length === 0) return '-'

  return Array.from(new Set(nodes)).join(', ')
})
const selectedOriginLogisticsNodeText = computed(() => {
  const nodes = selectedOrderItems.value
    .flatMap((item) => item.originNodeOptions ?? [])
    .map((node) => formatNodeDisplay(node.nodeName, node.nodeCode, node.nodePublicId))

  if (nodes.length === 0) return '-'

  return Array.from(new Set(nodes)).join(', ')
})

const selectedOrderHasDestinationNode = computed(() =>
  Boolean(selectedOrderItems.value.some((item) => item.destinationNodePublicId)),
)
const selectedCreateOrder = computed(() =>
  acceptedPurchaseOrders.value.find((order) => order.sourcePublicId === createForm.value.purchaseOrderPublicId) ?? null,
)
const selectedOrderItemCount = computed(() => selectedOrderItems.value.length)
const selectedOrderTotalQuantity = computed(() =>
  selectedOrderItems.value.reduce((sum, item) => sum + Number(item.shippableQty ?? 0), 0),
)
const selectedShipmentLinesForCreate = computed(() =>
  selectedOrderItems.value
    .map((item) => ({
      sourceItemPublicId: item.sourceItemPublicId,
      quantity: Number(createLineQuantities.value[item.sourceItemPublicId] ?? 0),
    }))
    .filter((line) => line.quantity > 0),
)

function handleCreateLineQuantityInput(item: ShipmentCreatableOrderItemDto, event: Event) {
  const input = event.target as HTMLInputElement
  const quantity = Number(input.value)
  const maxQuantity = Number(item.shippableQty ?? 0)

  if (!Number.isFinite(quantity)) {
    createLineQuantities.value = {
      ...createLineQuantities.value,
      [item.sourceItemPublicId]: 0,
    }
    return
  }

  const normalizedQuantity = Math.max(0, Math.trunc(quantity))
  const nextQuantity = Math.min(normalizedQuantity, maxQuantity)

  if (normalizedQuantity > maxQuantity) {
    isQuantityLimitModalOpen.value = true
  }

  input.value = String(nextQuantity)
  createLineQuantities.value = {
    ...createLineQuantities.value,
    [item.sourceItemPublicId]: nextQuantity,
  }
}

const trackNodeOptions = computed(() => {
  if (!selectedShipmentDetail.value) return []

  const detail = selectedShipmentDetail.value
  const options = [
    {
      publicId: detail.currentNodePublicId,
      label: formatNodeDisplay(detail.currentNodeName, detail.currentNodeCode, detail.currentNodePublicId),
    },
    {
      publicId: detail.originNodePublicId,
      label: formatNodeDisplay(detail.originNodeName, detail.originNodeCode, detail.originNodePublicId),
    },
    {
      publicId: detail.destinationNodePublicId,
      label: formatNodeDisplay(detail.destinationNodeName, detail.destinationNodeCode, detail.destinationNodePublicId),
    },
  ]

  return options.filter(
    (option, index, array): option is { publicId: string; label: string } =>
      Boolean(option.publicId) &&
      array.findIndex((candidate) => candidate.publicId === option.publicId) === index,
  )
})

const canEditSelectedShipment = computed(() =>
  selectedShipmentDetail.value?.status === 'READY' && selectedShipmentDetail.value?.sourceType === 'ORDER',
)
const canUpdateDepartureEta = computed(() => selectedShipmentDetail.value?.canUpdate === true)
const canStartSelectedShipment = computed(() => selectedShipmentDetail.value?.canStart === true)
const canCancelSelectedShipment = computed(() => selectedShipmentDetail.value?.canCancel === true)
const canArriveSelectedShipment = computed(() => selectedShipmentDetail.value?.canArrive === true)
const canTrackSelectedShipment = computed(() => selectedShipmentDetail.value?.canTrack === true)
const canRegisterExceptionSelectedShipment = computed(() =>
  selectedShipmentDetail.value?.canRegisterException === true,
)

function nullableText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function dedupeShipments<T extends ShipmentListResponseDto | ShipmentMapResponseDto>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.shipmentNumber || item.publicId, item])).values())
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function parseDateValue(value?: string | null) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDateForApi(date: Date | null) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateForDisplay(date: Date | null) {
  if (!date) return '연도. 월. 일.'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}. ${month}. ${day}.`
}

function splitDateTime(value?: string | null) {
  if (!value) return { date: '', time: '' }

  const [date, rawTime = ''] = value.split('T')
  const [hour = '', minute = ''] = rawTime.slice(0, 5).split(':')

  if (!date || !hour) return { date: '', time: '' }

  return {
    date,
    time: `${hour.padStart(2, '0')}:${Number(minute) < 30 ? '00' : '30'}`,
  }
}

function formatNodeDisplay(name?: string | null, code?: string | null, fallback?: string | null) {
  if (name && code) return `${name} (${code})`
  if (name) return name
  if (code) return code
  return fallback ?? '-'
}

function formatShipmentStatus(status?: ShipmentStatus | string | null) {
  if (!status) return '-'
  const labels: Record<string, { ko: string; en: string }> = {
    READY: { ko: '상품 준비 완료', en: 'Ready' },
    IN_TRANSIT: { ko: '배송중', en: 'In transit' },
    ARRIVED: { ko: '도착완료', en: 'Arrived' },
    DELAYED: { ko: '지연', en: 'Delayed' },
    CANCELLED: { ko: '취소', en: 'Cancelled' },
    CREATED: { ko: '확인 대기', en: 'Created' },
    ACCEPTED: { ko: '승인', en: 'Accepted' },
    CONFIRMED: { ko: '확정', en: 'Confirmed' },
    PARTIALLY_CONFIRMED: { ko: '부분 확정', en: 'Partially confirmed' },
    COMPLETED: { ko: '완료', en: 'Completed' },
    REJECTED: { ko: '반려', en: 'Rejected' },
  }
  return labels[status]?.ko ?? status
}

function formatShipmentSourceType(value?: string | null) {
  const labels: Record<string, { ko: string; en: string }> = {
    ORDER: { ko: '정상 출하', en: 'Order shipment' },
    RETURN: { ko: '반품 출하', en: 'Return shipment' },
    EXCHANGE: { ko: '교환 출하', en: 'Exchange shipment' },
  }

  return labels[value ?? '']?.ko ?? value ?? '-'
}

function formatCheckpointType(value?: string | null) {
  const labels: Record<string, { ko: string; en: string }> = {
    TRANSIT: { ko: '경유', en: 'Transit' },
    DEPARTURE: { ko: '출발', en: 'Departure' },
    ARRIVAL: { ko: '도착', en: 'Arrival' },
  }

  return labels[value ?? '']?.ko ?? value ?? '-'
}

function formatCheckpointStatus(value?: string | null) {
  const labels: Record<string, { ko: string; en: string }> = {
    PASSED: { ko: '통과', en: 'Passed' },
    PENDING: { ko: '대기', en: 'Pending' },
    FAILED: { ko: '실패', en: 'Failed' },
  }

  return labels[value ?? '']?.ko ?? value ?? '-'
}

function formatExceptionType(value?: string | null) {
  const labels: Record<string, { ko: string; en: string }> = {
    DELAY: { ko: '배송 지연', en: 'Delay' },
    DAMAGE: { ko: '파손', en: 'Damage' },
    TEMPERATURE_DEVIATION: { ko: '온도 이탈', en: 'Temperature Deviation' },
    WRONG_DELIVERY: { ko: '오배송', en: 'Wrong Delivery' },
  }

  return labels[value ?? '']?.ko ?? value ?? '-'
}

function formatSeverity(value?: string | null) {
  const labels: Record<string, { ko: string; en: string }> = {
    LOW: { ko: '낮음', en: 'Low' },
    MEDIUM: { ko: '보통', en: 'Medium' },
    HIGH: { ko: '높음', en: 'High' },
    CRITICAL: { ko: '긴급', en: 'Critical' },
  }

  return labels[value ?? '']?.ko ?? value ?? '-'
}

function formatShortShipmentNumber(value?: string | null) {
  if (!value) return '-'

  const normalized = value.replace(/^SHIP-/, '')
  const parts = normalized.split('-')

  if (parts.length >= 2) {
    return parts.slice(-2).join('-')
  }

  return normalized.slice(-12)
}

function formatBooleanLabel(value?: boolean | null) {
  return value ? '필요' : '없음'
}

function formatDelayMinutes(value?: number | null) {
  return `${value ?? 0}분`
}

function isSelectedShipment(publicId?: string | null) {
  return Boolean(publicId && selectedShipmentPublicId.value === publicId)
}

function toShipmentListItem(shipment: ShipmentMapResponseDto): ShipmentListResponseDto {
  return {
    publicId: shipment.publicId,
    shipmentNumber: shipment.shipmentNumber,
    purchaseOrderPublicId: shipment.purchaseOrderPublicId,
    subPurchaseOrderPublicId: shipment.subPurchaseOrderPublicId,
    carrierName: shipment.carrierName,
    originNodePublicId: shipment.originNodePublicId,
    originNodeName: shipment.originNodeName,
    originNodeCode: shipment.originNodeCode,
    destinationNodePublicId: shipment.destinationNodePublicId,
    destinationNodeName: shipment.destinationNodeName,
    destinationNodeCode: shipment.destinationNodeCode,
    currentNodePublicId: shipment.currentNodePublicId,
    currentNodeName: shipment.currentNodeName,
    currentNodeCode: shipment.currentNodeCode,
    departureEta: shipment.departureEta,
    arrivalEta: shipment.arrivalEta,
    status: shipment.status,
    temperatureRequired: shipment.temperatureRequired,
    sealedPackagingRequired: shipment.sealedPackagingRequired,
    fragile: shipment.fragile,
  }
}

async function fetchAcceptedPurchaseOrders() {
  isOrderOptionsLoading.value = true
  orderErrorMessage.value = ''

  try {
    acceptedPurchaseOrders.value = await getCreatableShipmentOrders()
  } catch (error) {
    console.error('Failed to fetch accepted purchase orders:', error)
    acceptedPurchaseOrders.value = []
    orderErrorMessage.value = content.value.loadFail
  } finally {
    isOrderOptionsLoading.value = false
  }
}

async function fetchShipmentMapData() {
  isMapLoading.value = true

  try {
    mapShipments.value = await getShipmentMapData()
    mapErrorMessage.value = ''
  } catch (error) {
    console.error('Failed to fetch shipment map data:', error)
    mapShipments.value = []
    mapErrorMessage.value = content.value.loadMapFail
  } finally {
    isMapLoading.value = false
  }
}

async function fetchShipments() {
  isShipmentListLoading.value = true

  try {
    const response = await getShipments({
      keyword: search.value.trim() || undefined,
      page: currentPage.value,
      size: pageSize.value,
      sort: 'id,desc',
    })

    shipments.value = response.content ?? []
    totalElements.value = response.totalElements
    totalPages.value = response.totalPages
    shipmentErrorMessage.value = ''
  } catch (error) {
    console.error('Failed to fetch shipments:', error)
    shipments.value = []
    totalElements.value = 0
    totalPages.value = 0
    shipmentErrorMessage.value = content.value.loadFail
  } finally {
    isShipmentListLoading.value = false
  }
}

async function refreshShipments() {
  await Promise.all([fetchShipments(), fetchShipmentMapData()])
}

async function openCreateModal() {
  resetCreateForm()
  createErrorMessage.value = ''
  if (!isCreatePage.value) {
    router.push({ name: 'shipmentCreate' })
  }

  await fetchAcceptedPurchaseOrders()
}

function closeCreateModal() {
  isCreateModalOpen.value = false
  createErrorMessage.value = ''
  resetCreateForm()

  if (isCreatePage.value) {
    router.push({ name: 'shipments' })
  }
}

function handleCreateModalOpenChange(isOpen: boolean) {
  if (!isOpen) {
    closeCreateModal()
  }
}

function goToPreviousPage() {
  if (currentPage.value === 0 || isShipmentListLoading.value) return
  currentPage.value -= 1
  fetchShipments()
}

function goToNextPage() {
  if (totalPages.value === 0 || currentPage.value >= totalPages.value - 1 || isShipmentListLoading.value) return
  currentPage.value += 1
  fetchShipments()
}

function fillUpdateForm(detail: ShipmentResponseDto) {
  const departure = splitDateTime(detail.departureEta)

  updateForm.value = {
    departureEta: detail.departureEta,
    temperatureRequired: detail.temperatureRequired,
    sealedPackagingRequired: detail.sealedPackagingRequired,
    fragile: detail.fragile,
  }
  updateDepartureDate.value = departure.date
  updateDepartureTime.value = departure.time
}

async function handleShipmentSelect(shipment: ShipmentListResponseDto) {
  selectedShipment.value = shipment
  shipmentDetailErrorMessage.value = ''
  statusErrorMessage.value = ''
  isShipmentDetailLoading.value = true

  try {
    const [detail, eta, histories, projections, exceptions] = await Promise.all([
      getShipment(shipment.publicId),
      getShipmentEta(shipment.publicId),
      getShipmentStatusHistories(shipment.publicId),
      getEtaProjections(shipment.publicId),
      getDeliveryExceptions(shipment.publicId),
    ])

    selectedShipmentDetail.value = detail
    selectedShipmentEta.value = eta
    selectedShipmentHistories.value = histories
    etaProjections.value = projections
    deliveryExceptions.value = exceptions
    exceptionForm.value.shipmentPublicId = shipment.publicId
    fillUpdateForm(detail)
  } catch (error) {
    console.error('Failed to load shipment detail:', error)
    selectedShipmentDetail.value = null
    selectedShipmentEta.value = null
    selectedShipmentHistories.value = []
    etaProjections.value = []
    deliveryExceptions.value = []
    shipmentDetailErrorMessage.value = content.value.loadFail
  } finally {
    isShipmentDetailLoading.value = false
  }
}

function openShipmentDetailPage(shipment: ShipmentListResponseDto) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'shipments', publicId: shipment.publicId },
  })
}

async function handleMapShipmentSelect(shipment: ShipmentMapResponseDto) {
  await handleShipmentSelect(toShipmentListItem(shipment))
}

function closeShipmentDetailModal() {
  selectedShipment.value = null
  selectedShipmentDetail.value = null
  selectedShipmentEta.value = null
  selectedShipmentHistories.value = []
  etaProjections.value = []
  deliveryExceptions.value = []
  shipmentDetailErrorMessage.value = ''
  statusErrorMessage.value = ''
  updateErrorMessage.value = ''
  trackErrorMessage.value = ''
  exceptionErrorMessage.value = ''
  isTrackPanelOpen.value = false
  isExceptionPanelOpen.value = false
}

function handleDetailModalOpenChange(isOpen: boolean) {
  if (!isOpen) {
    closeShipmentDetailModal()
  }
}

async function reloadSelectedShipment() {
  if (!selectedShipmentDetail.value) return
  await handleShipmentSelect({
    ...selectedShipmentDetail.value,
    arrivalEta: selectedShipmentDetail.value.arrivalEta ?? null,
  })
}

async function handlePurchaseOrderSelect(poPublicId: string) {
  createForm.value.purchaseOrderPublicId = poPublicId
  selectedPurchaseOrderDetail.value = null
  createLineQuantities.value = {}
  createErrorMessage.value = ''

  if (!poPublicId) return

  const order = acceptedPurchaseOrders.value.find((item) => item.sourcePublicId === poPublicId) ?? null
  selectedPurchaseOrderDetail.value = order

  if (order) {
    createLineQuantities.value = Object.fromEntries(
      order.items.map((item) => [item.sourceItemPublicId, item.shippableQty]),
    )
  }
}

function resetCreateForm() {
  createForm.value = {
    poId: null,
    purchaseOrderPublicId: '',
    subPoId: null,
    subPurchaseOrderPublicId: '',
    originNodePublicId: null,
    shipmentLines: [],
    departureEta: '',
    temperatureRequired: false,
    sealedPackagingRequired: false,
    fragile: false,
  }
  createDepartureDate.value = ''
  createDepartureTime.value = ''
  selectedPurchaseOrderDetail.value = null
  createLineQuantities.value = {}
}

async function handleCreateShipmentSubmit() {
  createErrorMessage.value = ''

  if (!createForm.value.purchaseOrderPublicId || !createDepartureEta.value || selectedShipmentLinesForCreate.value.length === 0) {
    createErrorMessage.value = content.value.requiredCreate
    return
  }

  if (!selectedOrderHasDestinationNode.value) {
    createErrorMessage.value = content.value.destinationNotReady
    return
  }

  isCreateSubmitting.value = true

  try {
    await createShipment({
      poId: null,
      purchaseOrderPublicId: nullableText(createForm.value.purchaseOrderPublicId),
      subPoId: createForm.value.subPoId || null,
      subPurchaseOrderPublicId: nullableText(createForm.value.subPurchaseOrderPublicId),
      originNodePublicId: null,
      shipmentLines: selectedShipmentLinesForCreate.value,
      departureEta: createDepartureEta.value,
      temperatureRequired: createForm.value.temperatureRequired,
      sealedPackagingRequired: createForm.value.sealedPackagingRequired,
      fragile: createForm.value.fragile,
    })

    currentPage.value = 0
    await refreshShipments()
    resetCreateForm()
    closeCreateModal()
  } catch (error: any) {
    console.error('Failed to create shipment:', error)
    createErrorMessage.value = error?.message ?? content.value.createFail
  } finally {
    isCreateSubmitting.value = false
  }
}

async function handleUpdateShipmentSubmit() {
  if (!selectedShipmentDetail.value) return

  updateErrorMessage.value = ''

  if (!canEditSelectedShipment.value) {
    updateErrorMessage.value = content.value.readyOnlyUpdate
    return
  }

  if (!updateDepartureEta.value) {
    updateErrorMessage.value = content.value.requiredCreate
    return
  }

  isUpdateSubmitting.value = true

  try {
    const updated = await updateShipment(selectedShipmentDetail.value.publicId, {
      departureEta: updateDepartureEta.value,
      temperatureRequired: updateForm.value.temperatureRequired,
      sealedPackagingRequired: updateForm.value.sealedPackagingRequired,
      fragile: updateForm.value.fragile,
    })

    selectedShipmentDetail.value = updated
    fillUpdateForm(updated)
    await refreshShipments()
    closeShipmentDetailModal()
  } catch (error: any) {
    console.error('Failed to update shipment:', error)
    updateErrorMessage.value = error?.message ?? content.value.updateFail
  } finally {
    isUpdateSubmitting.value = false
  }
}

async function handleStartShipment() {
  if (!selectedShipmentDetail.value) return

  statusErrorMessage.value = ''
  isStatusSubmitting.value = true

  try {
    const updated = await startShipment(selectedShipmentDetail.value.publicId)
    selectedShipmentDetail.value = updated
    fillUpdateForm(updated)
    await Promise.all([reloadSelectedShipment(), refreshShipments()])
  } catch (error: any) {
    console.error('Failed to start shipment:', error)
    statusErrorMessage.value = error?.message ?? content.value.statusFail
  } finally {
    isStatusSubmitting.value = false
  }
}

async function handleArriveShipment() {
  if (!selectedShipmentDetail.value) return

  statusErrorMessage.value = ''
  isStatusSubmitting.value = true

  try {
    const updated = await arriveShipment(selectedShipmentDetail.value.publicId)
    selectedShipmentDetail.value = updated
    fillUpdateForm(updated)
    await Promise.all([reloadSelectedShipment(), refreshShipments()])
  } catch (error: any) {
    console.error('Failed to arrive shipment:', error)
    statusErrorMessage.value = error?.message ?? content.value.statusFail
  } finally {
    isStatusSubmitting.value = false
  }
}

async function handleCancelShipment() {
  if (!selectedShipmentDetail.value) return

  statusErrorMessage.value = ''
  isStatusSubmitting.value = true

  try {
    const updated = await cancelShipment(selectedShipmentDetail.value.publicId)
    selectedShipmentDetail.value = updated
    fillUpdateForm(updated)
    await Promise.all([reloadSelectedShipment(), refreshShipments()])
  } catch (error: any) {
    console.error('Failed to cancel shipment:', error)
    statusErrorMessage.value = error?.message ?? content.value.cancelFail
  } finally {
    isStatusSubmitting.value = false
  }
}

function resetTrackForm() {
  trackForm.value = {
    nodePublicId: '',
    checkpointType: 'TRANSIT',
    checkpointStatus: 'PASSED',
    plannedAt: '',
    actualAt: null,
    note: '',
  }
}

async function handleTrackShipmentSubmit() {
  if (!selectedShipmentDetail.value) return

  trackErrorMessage.value = ''
  isTrackSubmitting.value = true

  try {
    const payload: TrackShipmentRequestDto = {
      ...trackForm.value,
      actualAt: nullableText(trackForm.value.actualAt) ?? null,
      note: nullableText(trackForm.value.note) ?? undefined,
    }
    const updated = await trackShipment(selectedShipmentDetail.value.publicId, payload)
    selectedShipmentDetail.value = updated
    resetTrackForm()
    isTrackPanelOpen.value = false
    await Promise.all([reloadSelectedShipment(), refreshShipments()])
  } catch (error: any) {
    console.error('Failed to track shipment:', error)
    trackErrorMessage.value = error?.message ?? content.value.trackFail
  } finally {
    isTrackSubmitting.value = false
  }
}

async function handleCreateDeliveryExceptionSubmit() {
  if (!selectedShipmentDetail.value) return

  exceptionErrorMessage.value = ''

  if (!exceptionForm.value.exceptionType || !exceptionForm.value.severity || !exceptionDetectedAt.value) {
    exceptionErrorMessage.value = content.value.requiredException
    return
  }

  isExceptionSubmitting.value = true

  try {
    await createDeliveryException({
      ...exceptionForm.value,
      shipmentPublicId: selectedShipmentDetail.value.publicId,
      detectedAt: exceptionDetectedAt.value,
      note: nullableText(exceptionForm.value.note) ?? undefined,
    })
    exceptionForm.value = {
      shipmentPublicId: selectedShipmentDetail.value.publicId,
      exceptionType: '',
      severity: '',
      detectedAt: '',
      note: '',
    }
    exceptionDetectedDate.value = ''
    exceptionDetectedTime.value = ''
    isExceptionPanelOpen.value = false
    await reloadSelectedShipment()
  } catch (error: any) {
    console.error('Failed to create delivery exception:', error)
    exceptionErrorMessage.value = error?.message ?? content.value.exceptionFail
  } finally {
    isExceptionSubmitting.value = false
  }
}

watch(search, () => {
  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = window.setTimeout(() => {
    currentPage.value = 0
    fetchShipments()
  }, 250)
})

onMounted(() => {
  refreshShipments()

  if (isCreatePage.value) {
    void openCreateModal()
  }
})
</script>

<template>
  <section class="app-screen terminal-page shipments-page">
    <header v-if="!isCreatePage" class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="refreshShipments">
          {{ content.refresh }}
        </button>
        <button class="page-button page-button--primary" type="button" @click="openCreateModal">
          {{ content.openCreate }}
        </button>
      </div>
    </header>

    <section v-if="!isCreatePage" class="shipment-kpi-row" aria-label="shipment summary">
      <article class="shipment-kpi-card">
        <div class="shipment-kpi-card__icon shipment-kpi-card__icon--blue">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 6.5h16v10H4z" />
            <path d="M7 10h10M7 13h6" />
          </svg>
        </div>
        <div class="shipment-kpi-card__body">
          <span>{{ shipmentKpiContent.active }}</span>
          <strong>{{ activeShipmentCount }}</strong>
          <small v-if="shipmentKpiContent.activeSub">{{ shipmentKpiContent.activeSub }}</small>
        </div>
      </article>

      <article class="shipment-kpi-card">
        <div class="shipment-kpi-card__icon shipment-kpi-card__icon--amber">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 7h12v10H6z" />
            <path d="M9 7V5h6v2" />
          </svg>
        </div>
        <div class="shipment-kpi-card__body">
          <span>{{ shipmentKpiContent.ready }}</span>
          <strong>{{ readyShipmentCount }}</strong>
          <small>{{ shipmentKpiContent.readySub }}</small>
        </div>
      </article>

      <article class="shipment-kpi-card">
        <div class="shipment-kpi-card__icon shipment-kpi-card__icon--green">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 8h11v8H4z" />
            <path d="M15 11h3l2 2v3h-5z" />
            <circle cx="8" cy="18" r="1.5" />
            <circle cx="17" cy="18" r="1.5" />
          </svg>
        </div>
        <div class="shipment-kpi-card__body">
          <span>{{ shipmentKpiContent.inTransit }}</span>
          <strong>{{ inTransitShipmentCount }}</strong>
          <small>{{ shipmentKpiContent.inTransitSub }}</small>
        </div>
      </article>

      <article class="shipment-kpi-card">
        <div class="shipment-kpi-card__icon shipment-kpi-card__icon--red">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5l8 14H4z" />
            <path d="M12 10v4M12 17h.01" />
          </svg>
        </div>
        <div class="shipment-kpi-card__body">
          <span>{{ shipmentKpiContent.delayed }}</span>
          <strong>{{ delayedShipmentCount }}</strong>
          <small>{{ shipmentKpiContent.delayedSub }}</small>
        </div>
      </article>
    </section>

    <article v-if="!isCreatePage" class="stl-card shipment-map-card">
      <div class="stl-card__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.mapEyebrow }}</div>
          <h3>{{ content.mapTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ displayMapShipments.length }}</span>
      </div>

      <div v-if="isMapLoading" class="page-table__empty">{{ content.loading }}</div>
      <div v-else-if="mapErrorMessage" class="page-table__empty">{{ mapErrorMessage }}</div>
      <div v-else-if="displayMapShipments.length === 0" class="page-table__empty">{{ content.emptyMap }}</div>
      <div v-else class="korea-map-layout">
        <ShipmentKoreaMap
          :shipments="displayMapShipments"
          :selected-public-id="selectedShipmentPublicId"
          :language="preferences.language"
          @select="handleMapShipmentSelect"
        />

        <aside class="shipment-map-list">
          <div class="shipment-map-list__head">
            <span>{{ content.activeListTitle }}</span>
            <strong>{{ displayMapShipments.length }}</strong>
          </div>
          <button
            v-for="shipment in displayMapShipments"
            :key="shipment.publicId"
            class="shipment-map-list__item"
            :class="{ 'is-selected': isSelectedShipment(shipment.publicId) }"
            type="button"
            :aria-label="`${formatShortShipmentNumber(shipment.shipmentNumber)} ${content.manageShipment}`"
            @click="handleMapShipmentSelect(shipment)"
          >
            <div>
              <strong>{{ formatShortShipmentNumber(shipment.shipmentNumber) }}</strong>
              <span class="shipment-status-pill" :class="`is-${shipment.status.toLowerCase()}`">
                {{ formatShipmentStatus(shipment.status) }}
              </span>
            </div>
            <p>
              {{ formatNodeDisplay(shipment.originNodeName, shipment.originNodeCode, shipment.originNodePublicId) }}
              →
              {{ formatNodeDisplay(shipment.destinationNodeName, shipment.destinationNodeCode, shipment.destinationNodePublicId) }}
            </p>
            <small>{{ content.currentNode }}: {{ formatNodeDisplay(shipment.currentNodeName, shipment.currentNodeCode, shipment.currentNodePublicId) }}</small>
          </button>
        </aside>
      </div>
    </article>

    <section v-if="isCreatePage" class="shipment-create-page">
      <header class="shipment-create-page__header">
        <div>
          <div class="terminal-page__eyebrow">{{ content.createEyebrow }}</div>
          <h2 class="terminal-page__title">{{ content.createTitle }}</h2>
          <p>{{ content.autoTransportNotice }}</p>
        </div>
      </header>

      <div class="shipment-create-page__body">
        <div class="shipment-create-modal">
          <div class="shipment-create-shell">
            <section class="shipment-create-primary">
              <div class="shipment-create-section-head">
                <div>
                  <span>{{ content.createEyebrow }}</span>
                  <h3>{{ content.createTitle }}</h3>
                </div>
                <strong>{{ createDepartureEta || '--:--' }}</strong>
              </div>

              <div class="shipment-form-grid shipment-create-form-grid">
                <label class="shipment-field shipment-field--wide">
                  <span>{{ content.order }} <strong class="shipment-required-mark">*</strong></span>
                  <select
                    :value="createForm.purchaseOrderPublicId"
                    class="page-input"
                    :disabled="isOrderOptionsLoading"
                    @change="handlePurchaseOrderSelect(($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">{{ isOrderOptionsLoading ? content.loading : content.select }}</option>
                    <option v-for="order in acceptedPurchaseOrders" :key="order.sourcePublicId" :value="order.sourcePublicId">
                      {{ order.orderNumber }} / {{ order.supplierName }} / {{ formatShipmentStatus(order.status) }}
                    </option>
                  </select>
                </label>

                <label class="shipment-field">
                  <span>{{ content.departureEta }} <strong class="shipment-required-mark">*</strong></span>
                  <div class="shipment-date-time-row">
                    <VueDatePicker
                      v-model="createDepartureDatePickerValue"
                      class="shipment-datepicker"
                      :locale="ko"
                      :formats="datepickerFormats"
                      :time-config="datepickerTimeConfig"
                      auto-apply
                      :clearable="false"
                      teleport="body"
                    >
                      <template #trigger>
                        <button class="shipment-date-trigger" type="button">
                          <span :class="{ 'is-placeholder': !createDepartureDatePickerValue }">
                            {{ formatDateForDisplay(createDepartureDatePickerValue) }}
                          </span>
                          <span class="material-symbols-outlined">calendar_month</span>
                        </button>
                      </template>
                    </VueDatePicker>
                    <select v-model="createDepartureTime" class="page-input">
                      <option value="">{{ content.select }}</option>
                      <option v-for="time in departureTimeOptions" :key="time" :value="time">
                        {{ time }}
                      </option>
                    </select>
                  </div>
                </label>
              </div>

              <div class="shipment-create-route">
                <div>
                  <span>{{ content.originNode }}</span>
                  <strong>{{ selectedOriginLogisticsNodeText }}</strong>
                </div>
                <em>→</em>
                <div>
                  <span>{{ content.destinationNode }}</span>
                  <strong>{{ selectedArrivalLogisticsNodeText }}</strong>
                </div>
              </div>

              <aside class="shipment-create-aside">
                <section class="shipment-create-spec-grid">
                  <div>
                    <span>품목</span>
                    <strong>{{ selectedOrderItemCount }}</strong>
                  </div>
                  <div>
                    <span>수량</span>
                    <strong>{{ selectedOrderTotalQuantity }}</strong>
                  </div>
                  <div>
                    <span>{{ content.status }}</span>
                    <strong>{{ selectedCreateOrder ? formatShipmentStatus(selectedCreateOrder.status) : '-' }}</strong>
                  </div>
                  <div>
                    <span>{{ content.destinationNode }}</span>
                    <strong>{{ selectedOrderHasDestinationNode ? '준비 완료' : '-' }}</strong>
                  </div>
                </section>

                <section class="shipment-create-options">
                  <span>{{ content.options }}</span>
                  <div class="shipment-option-row">
                    <label :class="{ 'is-selected': createForm.temperatureRequired }">
                      <input v-model="createForm.temperatureRequired" type="checkbox" />
                      {{ content.temperatureRequired }}
                    </label>
                    <label :class="{ 'is-selected': createForm.sealedPackagingRequired }">
                      <input v-model="createForm.sealedPackagingRequired" type="checkbox" />
                      {{ content.sealedPackagingRequired }}
                    </label>
                    <label :class="{ 'is-selected': createForm.fragile }">
                      <input v-model="createForm.fragile" type="checkbox" />
                      {{ content.fragile }}
                    </label>
                  </div>
                </section>
              </aside>

              <section v-if="selectedOrderItems.length > 0" class="shipment-create-options">
                <span>출하 품목 / 수량</span>
                <div class="shipment-line-list">
                  <label
                    v-for="item in selectedOrderItems"
                    :key="item.sourceItemPublicId"
                    class="shipment-line-row"
                  >
                    <div>
                      <strong>{{ item.itemName }} ({{ item.itemCode }})</strong>
                      <small>
                        출하 가능 {{ item.shippableQty }} / 도착 {{ formatNodeDisplay(item.destinationNodeName, item.destinationNodeCode, item.destinationNodePublicId) }}
                      </small>
                      <small>
                        출발 후보 {{ item.originNodeOptions.map((node) => `${node.nodeName} (${node.nodeCode}) ${node.availableQty}`).join(', ') }}
                      </small>
                    </div>
                    <input
                      :value="createLineQuantities[item.sourceItemPublicId] ?? 0"
                      type="number"
                      min="0"
                      :max="item.shippableQty"
                      class="page-input"
                      @input="handleCreateLineQuantityInput(item, $event)"
                    />
                  </label>
                </div>
              </section>
            </section>
          </div>

          <div v-if="orderErrorMessage" class="page-table__empty">{{ orderErrorMessage }}</div>
          <div v-else-if="!isOrderOptionsLoading && acceptedPurchaseOrders.length === 0" class="page-table__empty">
            {{ content.emptyOrders }}
          </div>
          <div v-if="createErrorMessage" class="shipment-error">{{ createErrorMessage }}</div>
        </div>
      </div>

      <footer class="shipment-create-page__footer">
        <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
          {{ content.closeCreate }}
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="isCreateSubmitting"
          @click="handleCreateShipmentSubmit"
        >
          {{ isCreateSubmitting ? content.loading : content.submitCreate }}
        </button>
      </footer>
    </section>

    <BaseModal
      v-else
      :model-value="isCreateModalOpen"
      :title="content.createTitle"
      :description="content.autoTransportNotice"
      size="lg"
      hide-eyebrow
      @update:model-value="handleCreateModalOpenChange"
    >
      <div class="shipment-create-modal">
        <div class="shipment-create-shell">
          <section class="shipment-create-primary">
            <div class="shipment-create-section-head">
              <div>
                <span>{{ content.createEyebrow }}</span>
                <h3>{{ content.createTitle }}</h3>
              </div>
              <strong>{{ createDepartureEta || '--:--' }}</strong>
            </div>

            <div class="shipment-form-grid shipment-create-form-grid">
              <label class="shipment-field shipment-field--wide">
                <span>{{ content.order }} <strong class="shipment-required-mark">*</strong></span>
                <select
                  :value="createForm.purchaseOrderPublicId"
                  class="page-input"
                  :disabled="isOrderOptionsLoading"
                  @change="handlePurchaseOrderSelect(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">{{ isOrderOptionsLoading ? content.loading : content.select }}</option>
                  <option v-for="order in acceptedPurchaseOrders" :key="order.sourcePublicId" :value="order.sourcePublicId">
                    {{ order.orderNumber }} / {{ order.supplierName }} / {{ formatShipmentStatus(order.status) }}
                  </option>
                </select>
              </label>

              <label class="shipment-field">
                <span>{{ content.departureEta }} <strong class="shipment-required-mark">*</strong></span>
                <div class="shipment-date-time-row">
                  <VueDatePicker
                    v-model="createDepartureDatePickerValue"
                    class="shipment-datepicker"
                    :locale="ko"
                    :formats="datepickerFormats"
                    :time-config="datepickerTimeConfig"
                    auto-apply
                    :clearable="false"
                    teleport="body"
                  >
                    <template #trigger>
                      <button class="shipment-date-trigger" type="button">
                        <span :class="{ 'is-placeholder': !createDepartureDatePickerValue }">
                          {{ formatDateForDisplay(createDepartureDatePickerValue) }}
                        </span>
                        <span class="material-symbols-outlined">calendar_month</span>
                      </button>
                    </template>
                  </VueDatePicker>
                  <select v-model="createDepartureTime" class="page-input">
                    <option value="">{{ content.select }}</option>
                    <option v-for="time in departureTimeOptions" :key="time" :value="time">
                      {{ time }}
                    </option>
                  </select>
                </div>
              </label>
            </div>

            <div class="shipment-create-route">
              <div>
                <span>{{ content.originNode }}</span>
                <strong>{{ selectedOriginLogisticsNodeText }}</strong>
              </div>
              <em>→</em>
              <div>
                <span>{{ content.destinationNode }}</span>
                <strong>{{ selectedArrivalLogisticsNodeText }}</strong>
              </div>
            </div>

            <section v-if="selectedOrderItems.length > 0" class="shipment-create-options">
              <span>출하 품목 / 수량</span>
              <div class="shipment-line-list">
                <label
                  v-for="item in selectedOrderItems"
                  :key="item.sourceItemPublicId"
                  class="shipment-line-row"
                >
                  <div>
                    <strong>{{ item.itemName }} ({{ item.itemCode }})</strong>
                    <small>
                      출하 가능 {{ item.shippableQty }} / 도착 {{ formatNodeDisplay(item.destinationNodeName, item.destinationNodeCode, item.destinationNodePublicId) }}
                    </small>
                    <small>
                      출발 후보 {{ item.originNodeOptions.map((node) => `${node.nodeName} (${node.nodeCode}) ${node.availableQty}`).join(', ') }}
                    </small>
                  </div>
                  <input
                    :value="createLineQuantities[item.sourceItemPublicId] ?? 0"
                    type="number"
                    min="0"
                    :max="item.shippableQty"
                    class="page-input"
                    @input="handleCreateLineQuantityInput(item, $event)"
                  />
                </label>
              </div>
            </section>
          </section>

          <aside class="shipment-create-aside">
            <section class="shipment-create-spec-grid">
              <div>
                <span>품목</span>
                <strong>{{ selectedOrderItemCount }}</strong>
              </div>
              <div>
                <span>수량</span>
                <strong>{{ selectedOrderTotalQuantity }}</strong>
              </div>
              <div>
                <span>{{ content.status }}</span>
                <strong>{{ selectedCreateOrder ? formatShipmentStatus(selectedCreateOrder.status) : '-' }}</strong>
              </div>
              <div>
                <span>{{ content.destinationNode }}</span>
                <strong>{{ selectedOrderHasDestinationNode ? '준비 완료' : '-' }}</strong>
              </div>
            </section>

            <section class="shipment-create-options">
              <span>{{ content.options }}</span>
              <div class="shipment-option-row">
                <label :class="{ 'is-selected': createForm.temperatureRequired }">
                  <input v-model="createForm.temperatureRequired" type="checkbox" />
                  {{ content.temperatureRequired }}
                </label>
                <label :class="{ 'is-selected': createForm.sealedPackagingRequired }">
                  <input v-model="createForm.sealedPackagingRequired" type="checkbox" />
                  {{ content.sealedPackagingRequired }}
                </label>
                <label :class="{ 'is-selected': createForm.fragile }">
                  <input v-model="createForm.fragile" type="checkbox" />
                  {{ content.fragile }}
                </label>
              </div>
            </section>
          </aside>
        </div>

        <div v-if="orderErrorMessage" class="page-table__empty">{{ orderErrorMessage }}</div>
        <div v-else-if="!isOrderOptionsLoading && acceptedPurchaseOrders.length === 0" class="page-table__empty">
          {{ content.emptyOrders }}
        </div>
        <div v-if="createErrorMessage" class="shipment-error">{{ createErrorMessage }}</div>
      </div>

      <template #footer>
        <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
          {{ content.closeCreate }}
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="isCreateSubmitting"
          @click="handleCreateShipmentSubmit"
        >
          {{ isCreateSubmitting ? content.loading : content.submitCreate }}
        </button>
      </template>
    </BaseModal>

    <BaseModal
      v-model="isQuantityLimitModalOpen"
      title="출하 수량 확인"
      description="출하 가능한 수량보다 높은 숫자는 입력할 수 없습니다."
      size="sm"
      hide-eyebrow
    >
      <template #footer>
        <button class="page-button page-button--primary" type="button" @click="isQuantityLimitModalOpen = false">
          확인
        </button>
      </template>
    </BaseModal>

    <section v-if="!isCreatePage" class="terminal-page__filter shipment-board-filter">
        <label class="terminal-page__search terminal-page__search--icon-only">
          <span
            v-if="!search"
            class="material-symbols-outlined terminal-page__search-icon"
            aria-hidden="true"
          >
            search
          </span>
          <input
            v-model="search"
            :aria-label="content.searchPlaceholder"
            :placeholder="content.searchPlaceholder"
            type="text"
          />
        </label>

        <div class="shipment-board-tabs">
          <button
            v-for="option in boardFilterOptions"
            :key="option.value"
            class="shipment-board-tab"
            :class="{ 'is-active': activeBoardFilter === option.value }"
            type="button"
            @click="activeBoardFilter = option.value"
          >
            <span>{{ option.label }}</span>
          </button>
        </div>
      </section>

    <article v-if="!isCreatePage" class="stl-card shipment-board-card">
      <div class="stl-card__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.boardEyebrow }}</div>
          <h3>{{ content.boardTitle }}</h3>
        </div>
      </div>

      <div v-if="isShipmentListLoading" class="page-table__empty">{{ content.loading }}</div>
      <div v-else-if="shipmentErrorMessage" class="page-table__empty">{{ shipmentErrorMessage }}</div>
      <div v-else class="shipment-work-board shipment-work-board--list">
        <div class="shipment-board-list">
          <button
            v-for="shipment in filteredBoardShipments"
            :key="shipment.publicId"
            class="shipment-work-card shipment-work-card--row"
            :class="{
              'shipment-work-card--danger': shipment.status === 'DELAYED',
              'shipment-work-card--cancelled': shipment.status === 'CANCELLED',
            }"
            type="button"
            @click="openShipmentDetailPage(shipment)"
          >
            <div>
              <span>{{ formatShortShipmentNumber(shipment.shipmentNumber) }}</span>
              <strong>
                {{ formatNodeDisplay(shipment.originNodeName, shipment.originNodeCode, shipment.originNodePublicId) }}
                →
                {{ formatNodeDisplay(shipment.destinationNodeName, shipment.destinationNodeCode, shipment.destinationNodePublicId) }}
              </strong>
            </div>
            <small>{{ content.departureEta }}: {{ formatDate(shipment.departureEta) }}</small>
            <small>{{ content.arrivalEta }}: {{ formatDate(shipment.arrivalEta) }}</small>
            <span class="shipment-status-pill" :class="`is-${shipment.status.toLowerCase()}`">
              {{ formatShipmentStatus(shipment.status) }}
            </span>
          </button>

          <div v-if="filteredBoardShipments.length === 0" class="shipment-work-empty">{{ content.boardEmpty }}</div>
        </div>
      </div>
    </article>

    <BaseModal
      :model-value="Boolean(selectedShipment || isShipmentDetailLoading || shipmentDetailErrorMessage)"
      :title="selectedShipmentDetail?.shipmentNumber ?? content.detailTitle"
      size="lg"
      hide-eyebrow
      hide-close-button
      @update:model-value="handleDetailModalOpenChange"
      @close="closeShipmentDetailModal"
    >
    <div class="shipment-detail-modal shipment-detail-shell">
      <div v-if="isShipmentDetailLoading" class="page-table__empty">{{ content.loading }}</div>
      <div v-else-if="shipmentDetailErrorMessage" class="page-table__empty">{{ shipmentDetailErrorMessage }}</div>

      <template v-else-if="selectedShipmentDetail">
        <article class="stl-card shipment-detail-card shipment-detail-card--summary">
          <div class="stl-card__head">
            <div>
              <div class="page-panel__eyebrow">{{ selectedShipmentDetail.shipmentNumber }}</div>
              <h3>{{ content.detailTitle }}</h3>
            </div>
            <span class="shipment-status-pill" :class="`is-${selectedShipmentDetail.status.toLowerCase()}`">
              {{ formatShipmentStatus(selectedShipmentDetail.status) }}
            </span>
          </div>

          <div class="shipment-order-summary">
            <div>
              <span>{{ content.sourceType }}</span>
              <strong>{{ formatShipmentSourceType(selectedShipmentDetail.sourceType) }}</strong>
            </div>
            <div>
              <span>{{ content.sourcePublicId }}</span>
              <strong>{{ selectedShipmentDetail.sourceNumber || '-' }}</strong>
            </div>
            <div>
              <span>{{ content.purchaseOrderId }}</span>
              <strong>{{ selectedShipmentDetail.purchaseOrderNumber || '-' }}</strong>
            </div>
            <div>
              <span>{{ content.subPurchaseOrderId }}</span>
              <strong>{{ selectedShipmentDetail.subPurchaseOrderNumber || '-' }}</strong>
            </div>
          </div>

          <div class="shipment-info-grid">
            <div>
              <span>{{ content.carrierName }}</span>
              <strong>{{ selectedShipmentDetail.carrierName || '-' }}</strong>
            </div>
            <div>
              <span>{{ content.vehicleNo }}</span>
              <strong>{{ selectedShipmentDetail.vehicleNo || '-' }}</strong>
            </div>
            <div>
              <span>{{ content.trackingNo }}</span>
              <strong>{{ selectedShipmentDetail.trackingNo || '-' }}</strong>
            </div>
            <div>
              <span>{{ content.departureEta }}</span>
              <strong>{{ formatDate(selectedShipmentDetail.departureEta) }}</strong>
            </div>
            <div>
              <span>{{ content.actualDepartedAt }}</span>
              <strong>{{ formatDate(selectedShipmentDetail.actualDepartedAt) }}</strong>
            </div>
            <div>
              <span>{{ content.arrivalEta }}</span>
              <strong>{{ formatDate(selectedShipmentDetail.arrivalEta) }}</strong>
            </div>
            <div>
              <span>{{ content.actualArrivedAt }}</span>
              <strong>{{ formatDate(selectedShipmentDetail.actualArrivedAt) }}</strong>
            </div>
          </div>

          <div class="shipment-route-summary">
            <strong>{{ formatNodeDisplay(selectedShipmentDetail.originNodeName, selectedShipmentDetail.originNodeCode, selectedShipmentDetail.originNodePublicId) }}</strong>
            <span>→</span>
            <strong>{{ formatNodeDisplay(selectedShipmentDetail.destinationNodeName, selectedShipmentDetail.destinationNodeCode, selectedShipmentDetail.destinationNodePublicId) }}</strong>
          </div>

          <div v-if="selectedShipmentDetail.shipmentLines?.length" class="shipment-detail-lines">
            <div class="shipment-detail-lines__head">
              <span>{{ content.shipmentItems }}</span>
              <strong>{{ selectedShipmentDetail.shipmentLines.length }}</strong>
            </div>
            <div class="shipment-detail-line-list">
              <div
                v-for="line in selectedShipmentDetail.shipmentLines"
                :key="line.publicId"
                class="shipment-detail-line"
              >
                <div>
                  <strong>{{ line.itemName }}</strong>
                  <span>{{ line.itemCode }}</span>
                </div>
                <em>{{ line.quantity }}</em>
              </div>
            </div>
          </div>

          <div class="shipment-field shipment-field--wide shipment-option-editor">
            <span>{{ content.options }}</span>
            <div class="shipment-option-row">
              <label :class="{ 'is-selected': updateForm.temperatureRequired }">
                <input
                  v-model="updateForm.temperatureRequired"
                  type="checkbox"
                  :disabled="!canEditSelectedShipment"
                />
                {{ content.temperatureRequired }}
              </label>
              <label :class="{ 'is-selected': updateForm.sealedPackagingRequired }">
                <input
                  v-model="updateForm.sealedPackagingRequired"
                  type="checkbox"
                  :disabled="!canEditSelectedShipment"
                />
                {{ content.sealedPackagingRequired }}
              </label>
              <label :class="{ 'is-selected': updateForm.fragile }">
                <input
                  v-model="updateForm.fragile"
                  type="checkbox"
                  :disabled="!canEditSelectedShipment"
                />
                {{ content.fragile }}
              </label>
            </div>
          </div>

          <div class="shipment-actions shipment-actions--split">
            <div>
              <button
                v-if="canStartSelectedShipment"
                class="page-button page-button--secondary"
                type="button"
                :disabled="isStatusSubmitting"
                @click="handleStartShipment"
              >
                {{ content.startShipment }}
              </button>
              <button
                v-if="canArriveSelectedShipment"
                class="page-button page-button--primary"
                type="button"
                :disabled="isStatusSubmitting"
                @click="handleArriveShipment"
              >
                {{ content.arriveShipment }}
              </button>
              <button
                v-if="canCancelSelectedShipment"
                class="page-button page-button--secondary shipment-danger-button"
                type="button"
                :disabled="isStatusSubmitting"
                @click="handleCancelShipment"
              >
                {{ content.cancelShipment }}
              </button>
            </div>
            <div>
              <button
                v-if="canRegisterExceptionSelectedShipment"
                class="page-button page-button--secondary"
                type="button"
                @click="isExceptionPanelOpen = !isExceptionPanelOpen"
              >
                {{ isExceptionPanelOpen ? content.closeException : content.openException }}
              </button>
            </div>
          </div>
          <div v-if="statusErrorMessage" class="shipment-error">{{ statusErrorMessage }}</div>
        </article>

        <article v-if="canUpdateDepartureEta" class="stl-card shipment-detail-card">
          <div class="stl-card__head">
            <div>
              <div class="page-panel__eyebrow">{{ content.etaTitle }}</div>
              <h3>{{ content.etaTitle }}</h3>
            </div>
          </div>
          <div class="shipment-info-grid">
            <div>
              <span>{{ content.etaTitle }}</span>
              <strong>{{ formatDate(selectedShipmentEta?.estimatedArrivalAt) }}</strong>
            </div>
            <div>
              <span>{{ content.arrivalEta }}</span>
              <strong>{{ formatDate(selectedShipmentEta?.arrivalEta) }}</strong>
            </div>
            <div>
              <span>{{ content.delayMinutes }}</span>
              <strong>{{ formatDelayMinutes(selectedShipmentEta?.delayMinutes) }}</strong>
            </div>
          </div>
        </article>

        <article v-if="canEditSelectedShipment" class="stl-card shipment-detail-card">
          <div class="stl-card__head">
            <div>
              <div class="page-panel__eyebrow">준비 완료</div>
              <h3>{{ content.updateTitle }}</h3>
            </div>
          </div>
          <div class="shipment-form-grid">
            <label class="shipment-field">
              <span>{{ content.departureEta }}</span>
              <div class="shipment-date-time-row">
                <VueDatePicker
                  v-model="updateDepartureDatePickerValue"
                  class="shipment-datepicker"
                  :locale="ko"
                  :formats="datepickerFormats"
                  :time-config="datepickerTimeConfig"
                  auto-apply
                  :clearable="false"
                  :disabled="!canEditSelectedShipment"
                  teleport="body"
                >
                  <template #trigger>
                    <button
                      class="shipment-date-trigger"
                      type="button"
                      :disabled="!canEditSelectedShipment"
                    >
                      <span :class="{ 'is-placeholder': !updateDepartureDatePickerValue }">
                        {{ formatDateForDisplay(updateDepartureDatePickerValue) }}
                      </span>
                      <span class="material-symbols-outlined">calendar_month</span>
                    </button>
                  </template>
                </VueDatePicker>
                <select v-model="updateDepartureTime" class="page-input" :disabled="!canEditSelectedShipment">
                  <option value="">{{ content.select }}</option>
                  <option v-for="time in departureTimeOptions" :key="time" :value="time">
                    {{ time }}
                  </option>
                </select>
              </div>
            </label>
          </div>
          <div v-if="updateErrorMessage" class="shipment-error">{{ updateErrorMessage }}</div>
        </article>

        <article class="stl-card shipment-detail-card">
          <div class="stl-card__head">
            <div>
              <h3>{{ content.historyTitle }}</h3>
            </div>
          </div>
          <div class="shipment-history-list">
            <div v-for="history in selectedShipmentHistories" :key="`${history.shipmentPublicId}-${history.recordedAt}-${history.statusCode}`">
              <span>{{ formatDate(history.recordedAt) }}</span>
              <strong>{{ formatShipmentStatus(history.statusCode) }} / {{ history.statusMessage }}</strong>
            </div>
            <div v-if="selectedShipmentHistories.length === 0" class="page-table__empty">
              {{ content.emptyHistory }}
            </div>
          </div>
        </article>

        <article v-if="isTrackPanelOpen && canTrackSelectedShipment" class="stl-card shipment-detail-card">
          <div class="stl-card__head"><h3>{{ content.trackTitle }}</h3></div>
          <div class="shipment-form-grid">
            <label class="shipment-field">
              <span>{{ content.currentNode }}</span>
              <select v-model="trackForm.nodePublicId" class="page-input">
                <option value="">{{ content.select }}</option>
                <option v-for="node in trackNodeOptions" :key="node.publicId" :value="node.publicId">
                  {{ node.label }}
                </option>
              </select>
            </label>
            <label class="shipment-field">
              <span>{{ content.checkpoint }}</span>
              <select v-model="trackForm.checkpointType" class="page-input">
                <option v-for="option in checkpointTypeOptions" :key="option" :value="option">{{ formatCheckpointType(option) }}</option>
              </select>
            </label>
            <label class="shipment-field">
              <span>{{ content.checkpointStatus }}</span>
              <select v-model="trackForm.checkpointStatus" class="page-input">
                <option v-for="option in checkpointStatusOptions" :key="option" :value="option">{{ formatCheckpointStatus(option) }}</option>
              </select>
            </label>
            <label class="shipment-field">
              <span>{{ content.plannedAt }}</span>
              <input v-model="trackForm.plannedAt" type="datetime-local" class="page-input" />
            </label>
            <label class="shipment-field">
              <span>{{ content.actualAt }}</span>
              <input v-model="trackForm.actualAt" type="datetime-local" class="page-input" />
            </label>
            <label class="shipment-field shipment-field--wide">
              <span>{{ content.note }}</span>
              <input v-model="trackForm.note" type="text" class="page-input" />
            </label>
          </div>
          <div v-if="trackErrorMessage" class="shipment-error">{{ trackErrorMessage }}</div>
          <div class="shipment-actions">
            <button class="page-button page-button--primary" type="button" :disabled="isTrackSubmitting" @click="handleTrackShipmentSubmit">
              {{ content.submitTrack }}
            </button>
          </div>
        </article>

        <article v-if="isExceptionPanelOpen && canRegisterExceptionSelectedShipment" class="stl-card shipment-detail-card">
          <div class="stl-card__head"><h3>{{ content.exceptionTitle }}</h3></div>
          <div class="shipment-form-grid">
            <div class="shipment-field shipment-field--wide">
              <span>{{ content.exceptionType }}</span>
              <div class="shipment-choice-row">
                <label
                  v-for="option in deliveryExceptionTypeOptions"
                  :key="option"
                  :class="{ 'is-selected': exceptionForm.exceptionType === option }"
                >
                  <input v-model="exceptionForm.exceptionType" type="radio" :value="option" />
                  {{ formatExceptionType(option) }}
                </label>
              </div>
            </div>
            <div class="shipment-field shipment-field--wide">
              <span>{{ content.severity }}</span>
              <div class="shipment-choice-row">
                <label
                  v-for="option in deliveryExceptionSeverityOptions"
                  :key="option"
                  :class="{ 'is-selected': exceptionForm.severity === option }"
                >
                  <input v-model="exceptionForm.severity" type="radio" :value="option" />
                  {{ formatSeverity(option) }}
                </label>
              </div>
            </div>
            <label class="shipment-field">
              <span>{{ content.detectedAt }}</span>
              <div class="shipment-date-time-row">
                <VueDatePicker
                  v-model="exceptionDetectedDatePickerValue"
                  class="shipment-datepicker"
                  :locale="ko"
                  :formats="datepickerFormats"
                  :time-config="datepickerTimeConfig"
                  auto-apply
                  :clearable="false"
                  teleport="body"
                >
                  <template #trigger>
                    <button class="shipment-date-trigger" type="button">
                      <span :class="{ 'is-placeholder': !exceptionDetectedDatePickerValue }">
                        {{ formatDateForDisplay(exceptionDetectedDatePickerValue) }}
                      </span>
                      <span class="material-symbols-outlined">calendar_month</span>
                    </button>
                  </template>
                </VueDatePicker>
                <select v-model="exceptionDetectedTime" class="page-input">
                  <option value="">{{ content.select }}</option>
                  <option v-for="time in departureTimeOptions" :key="time" :value="time">
                    {{ time }}
                  </option>
                </select>
              </div>
            </label>
            <label class="shipment-field shipment-field--wide">
              <span>{{ content.note }}</span>
              <input v-model="exceptionForm.note" type="text" class="page-input" />
            </label>
          </div>
          <div v-if="exceptionErrorMessage" class="shipment-error">{{ exceptionErrorMessage }}</div>
          <div class="shipment-actions">
            <button class="page-button page-button--primary" type="button" :disabled="isExceptionSubmitting" @click="handleCreateDeliveryExceptionSubmit">
              {{ content.submitException }}
            </button>
          </div>
        </article>

        <article v-if="etaProjections.length > 0" class="stl-card shipment-detail-card">
          <div class="stl-card__head"><h3>{{ content.etaProjectionTitle }}</h3></div>
          <div class="shipment-history-list">
            <div v-for="projection in etaProjections" :key="projection.id">
              <span>{{ formatDate(projection.calculatedAt) }}</span>
              <strong>{{ formatDate(projection.previousEta) }} → {{ formatDate(projection.projectedEta) }} / {{ formatDelayMinutes(projection.delayMinutes) }}</strong>
            </div>
          </div>
        </article>

        <article v-if="deliveryExceptions.length > 0" class="stl-card shipment-detail-card">
          <div class="stl-card__head">
            <h3>{{ content.exceptionListTitle }}</h3>
            <span class="page-panel__chip">{{ deliveryExceptions.length }}</span>
          </div>
          <div class="shipment-history-list">
            <div v-for="exception in deliveryExceptions" :key="`${exception.shipmentPublicId}-${exception.detectedAt}-${exception.exceptionType}`">
              <span>{{ formatDate(exception.detectedAt) }}</span>
              <strong>{{ formatExceptionType(exception.exceptionType) }} / {{ formatSeverity(exception.severity) }}</strong>
            </div>
          </div>
        </article>
      </template>
    </div>
      <template v-if="selectedShipmentDetail" #footer>
        <button class="page-button page-button--secondary" type="button" @click="closeShipmentDetailModal">
          {{ content.cancelDetail }}
        </button>
        <button
          v-if="canEditSelectedShipment"
          class="page-button page-button--primary"
          type="button"
          :disabled="isUpdateSubmitting"
          @click="handleUpdateShipmentSubmit"
        >
          {{ isUpdateSubmitting ? content.loading : content.saveDetail }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>

<style scoped>
.shipments-page {
  --ship-bg: var(--background, #fff);
  --ship-card: rgb(var(--surface-container-low-rgb, 245 245 245) / 0.86);
  --ship-border: rgb(var(--outline-variant-rgb, 172 179 180) / 0.24);
  --ship-text: var(--on-surface, #121212);
  --ship-muted: var(--on-surface-variant, #474747);
  --ship-faint: var(--on-surface-variant, #596061);
  --ship-green: #1c7c45;
  --ship-amber: #b7791f;
  --ship-red: var(--color-critical, #9f403d);
  --ship-radius: 0;
  --ship-shadow: none;

  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
  padding: 28px 32px;
  color: var(--ship-text);
  background: var(--ship-bg);
  font-family: Pretendard, "Segoe UI", sans-serif;
}

.shipments-page .terminal-page__header,
.shipments-page .stl-card__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.shipments-page .terminal-page__title {
  margin: 8px 0 0;
  color: var(--ship-text);
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  line-height: 0.98;
}

.shipments-page .terminal-page__eyebrow,
.shipments-page .page-panel__eyebrow {
  color: var(--ship-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.shipments-page .design-trigger-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shipments-page .page-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 0;
  padding: 9px 14px;
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  transition: 0.15s ease;
}

.shipments-page .page-button .material-symbols-outlined {
  font-size: 1rem;
  line-height: 1;
}

.shipments-page .page-button--primary {
  border-color: var(--primary, #5e5e5e);
  background: var(--primary, #5e5e5e);
  color: #fff;
}

.shipments-page .page-button--secondary {
  border-color: var(--ship-border);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.74);
  color: var(--ship-muted);
}

.shipments-page .stl-card {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 20px;
  background: var(--ship-card);
  box-shadow: var(--ship-shadow);
}

.shipments-page .stl-card__head {
  align-items: flex-start;
  margin-bottom: 16px;
}

.shipments-page .stl-card__head h3 {
  margin: 4px 0 0;
  color: var(--ship-text);
  font-size: 1.05rem;
  font-weight: 900;
}

.shipments-page .page-panel__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 24px;
  border-radius: 0;
  padding: 2px 9px;
  background: #f1f5f9;
  color: var(--ship-text);
  font-size: 0.76rem;
  font-weight: 900;
}

.shipments-page .page-input {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.88);
  color: var(--ship-text);
  font-family: inherit;
}

.shipments-page .page-table {
  overflow: hidden;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  background: #fff;
}

.shipments-page .page-table__row {
  border-bottom: 1px solid var(--ship-border);
  color: var(--ship-muted);
}

.shipments-page .page-table__row:last-child {
  border-bottom: 0;
}

.shipments-page .page-table__row--head {
  background: #f8fafc;
  color: var(--ship-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.shipments-page .page-table__empty {
  border: 1px dashed var(--ship-border);
  border-radius: 0;
  padding: 36px 20px;
  background: #fff;
  color: var(--ship-faint);
  text-align: center;
  font-weight: 800;
}

.shipment-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.shipment-kpi-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-height: 92px;
  border: 1px solid var(--ship-border);
  border-left: 4px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  border-radius: 0;
  padding: 18px;
  background: var(--ship-card);
  box-shadow: var(--ship-shadow);
}

.shipment-kpi-card__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.84);
  color: var(--ship-muted);
}

.shipment-kpi-card__icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.shipment-kpi-card:has(.shipment-kpi-card__icon--amber) {
  border-left-color: rgb(183 121 31 / 0.78);
}

.shipment-kpi-card:has(.shipment-kpi-card__icon--green) {
  border-left-color: rgb(28 124 69 / 0.78);
}

.shipment-kpi-card:has(.shipment-kpi-card__icon--red) {
  border-left-color: rgb(var(--error-rgb, 159 64 61) / 0.8);
}

.shipment-kpi-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.shipment-kpi-card__body span {
  color: var(--ship-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.shipment-kpi-card__body strong {
  margin-top: 3px;
  color: var(--ship-text);
  font-size: 1.35rem;
  line-height: 1.2;
}

.shipment-kpi-card__body small {
  margin-top: 3px;
  color: var(--ship-faint);
  font-size: 0.76rem;
  font-weight: 700;
}

.shipment-map-card,
.shipment-board-card,
.shipment-detail-card {
  margin-top: 16px;
}

.shipment-board-filter {
  grid-template-columns: minmax(0, 1fr) auto;
  margin-top: 16px;
}

.korea-map-layout {
  display: grid;
  grid-template-columns: minmax(420px, 1.45fr) minmax(300px, 0.85fr);
  gap: 18px;
  align-items: stretch;
}

.korea-map-layout :deep(.shipment-korea-map__canvas .maplibregl-ctrl-group),
.korea-map-layout :deep(.shipment-korea-map__canvas .maplibregl-ctrl-group button),
.korea-map-layout :deep(.shipment-korea-map__canvas .maplibregl-ctrl-group button:first-child),
.korea-map-layout :deep(.shipment-korea-map__canvas .maplibregl-ctrl-group button:last-child) {
  border-radius: 0;
}

.shipment-map-list {
  display: flex;
  max-height: 560px;
  overflow: auto;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.shipment-map-list__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 12px 14px;
  background: #f8fafc;
  color: var(--ship-faint);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.shipment-map-list__head strong {
  color: var(--ship-text);
  font-size: 1rem;
}

.shipment-map-list__item {
  width: 100%;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 16px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
  transition: background 50ms ease;
}

.shipment-map-list__item:hover,
.shipment-map-list__item.is-selected {
  background: rgb(var(--surface-container-rgb, 235 238 239) / 0.52);
}

.shipment-map-list__item.is-selected {
  border-left: 4px solid var(--primary, #5e5e5e);
}

.shipment-map-list__item > div {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.shipment-map-list__item p {
  margin: 8px 0;
  color: var(--ship-muted);
  font-size: 0.9rem;
  line-height: 1.5;
}

.shipment-map-list__item small {
  color: var(--ship-muted);
}

.shipment-map-list__item em {
  display: inline-flex;
  margin-top: 10px;
  color: var(--ship-muted);
  font-size: 0.76rem;
  font-style: normal;
  font-weight: 900;
}

.shipment-status-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--ship-border);
  padding: 4px 8px;
  background: rgb(183 121 31 / 0.1);
  color: var(--ship-amber);
  font-size: 0.75rem;
  font-weight: 800;
}

.shipment-status-pill.is-in_transit {
  background: rgb(28 124 69 / 0.08);
  color: var(--ship-green);
}

.shipment-status-pill.is-arrived {
  background: rgb(var(--surface-container-rgb, 235 238 239) / 0.7);
  color: var(--ship-muted);
}

.shipment-status-pill.is-delayed {
  background: rgb(var(--error-rgb, 159 64 61) / 0.1);
  color: var(--ship-red);
}

.shipment-status-pill.is-cancelled {
  background: #ececec;
  color: #555;
}

.shipment-form-grid,
.shipment-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.shipment-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shipment-field > span,
.shipment-info-grid span {
  color: var(--ship-muted);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.shipment-field strong,
.shipment-info-grid strong {
  color: var(--ship-text);
  font-size: 0.92rem;
  line-height: 1.35;
  word-break: keep-all;
}

.shipment-field strong {
  min-height: 42px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 10px 12px;
  background: #f8fafc;
}

.shipment-field > span .shipment-required-mark {
  display: inline;
  min-height: 0;
  border: 0;
  padding: 0;
  background: transparent;
  color: #d92d20;
  font-size: 0.78rem;
  line-height: 1;
  vertical-align: baseline;
}

.shipment-field--wide {
  grid-column: 1 / -1;
}

.shipment-option-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.shipment-line-list {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.shipment-line-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--ship-border);
  background: #fff;
  padding: 12px;
}

.shipment-line-row > div {
  display: grid;
  gap: 4px;
}

.shipment-line-row strong {
  color: var(--ship-text);
}

.shipment-line-row small {
  color: var(--ship-muted);
  line-height: 1.4;
}

.shipment-line-row > input {
  text-align: right;
}

.shipment-option-row label,
.shipment-option-row--readonly span {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 9px 12px;
  background: #f8fafc;
  color: var(--ship-muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.shipment-option-row label {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.shipment-option-row label.is-selected {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.shipment-option-row label:has(input:disabled) {
  cursor: not-allowed;
  opacity: 0.62;
}

.shipment-option-editor {
  margin-top: 14px;
}

.shipment-choice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shipment-choice-row label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 9px 12px;
  background: #fff;
  color: var(--ship-muted);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 800;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.shipment-choice-row label.is-selected {
  border-color: #666;
  background: #666;
  color: #fff;
}

.shipment-choice-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.shipment-option-row--readonly {
  margin-top: 14px;
}

.shipment-notice {
  border: 1px solid #e5e9f0;
  border-left: 3px solid #94a3b8;
  border-radius: 0;
  margin: 0 0 16px;
  padding: 10px 12px;
  background: #f8fafc;
  color: var(--ship-muted);
}

.shipment-error {
  margin-top: 12px;
  color: var(--color-critical);
  font-size: 0.875rem;
}

.shipment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.shipment-actions--split {
  justify-content: flex-end;
}

.shipment-actions--split > div {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.shipment-danger-button {
  border-color: #fecaca;
  color: #b91c1c;
  background: #fff7f7;
}

.shipment-danger-button:hover {
  border-color: #ef4444;
  background: #fff1f2;
}

.shipment-pagination {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.shipment-work-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.shipment-work-board--list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.shipment-board-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.shipment-board-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.24);
  border-radius: 0;
  padding: 0 14px;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.56);
  color: inherit;
  cursor: pointer;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.shipment-board-tab strong {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  min-height: 20px;
  padding: 0 6px;
  background: #f1f5f9;
  color: var(--ship-text);
  font-size: 0.7rem;
}

.shipment-board-tab.is-active {
  border-color: var(--primary, #5e5e5e);
  background: var(--primary, #5e5e5e);
  color: var(--on-primary, #fff);
}

.shipment-board-tab.is-active strong {
  background: rgb(255 255 255 / 0.16);
  color: #fff;
}

.shipment-board-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.shipment-work-column {
  min-height: 260px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 14px;
  background: #f8fafc;
}

.shipment-work-column header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: var(--ship-faint);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.shipment-work-column header strong {
  color: var(--ship-text);
  font-size: 1rem;
}

.shipment-work-card {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 5px;
  border: 1px solid var(--ship-border);
  border-left: 4px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.42);
  border-radius: 0;
  margin-bottom: 10px;
  padding: 12px;
  background: #fff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: none;
}

.shipment-work-card:hover {
  background: rgb(var(--surface-container-rgb, 235 238 239) / 0.48);
}

.shipment-work-card--row {
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(140px, 0.72fr) minmax(140px, 0.72fr) max-content;
  gap: 12px;
  align-items: center;
  margin-bottom: 0;
}

.shipment-work-card--row > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.shipment-work-card--row .shipment-status-pill {
  width: 98px;
  justify-content: center;
  justify-self: end;
}

.shipment-work-card--cancelled {
  border-left-color: #94a3b8;
  background: #f8fafc;
  opacity: 0.78;
}

.shipment-work-card--danger:hover {
  border-color: rgba(239, 68, 68, 0.42);
}

.shipment-work-card span {
  color: var(--ship-muted);
  font-size: 0.74rem;
  font-weight: 900;
}

.shipment-work-card strong {
  color: var(--ship-text);
  font-size: 0.9rem;
}

.shipment-work-card small,
.shipment-work-empty {
  color: var(--ship-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.shipment-work-empty {
  border: 1px dashed var(--ship-border);
  border-radius: 0;
  padding: 18px 12px;
  background: #fff;
  text-align: center;
}

.shipment-detail-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(360px, 0.82fr);
  gap: 16px;
  margin-top: 0;
}

:global(.base-modal__surface:has(.shipment-detail-modal)) {
  width: min(calc(100vw - 48px), 1180px);
  max-width: 1180px;
  max-height: min(88vh, 940px);
}

:global(.base-modal__surface:has(.shipment-detail-modal) .base-modal__header) {
  border-bottom: 0;
}

:global(.base-modal__surface:has(.shipment-detail-modal) .base-modal__body) {
  padding: 22px 24px 24px;
}

:global(.base-modal__surface:has(.shipment-detail-modal) .base-modal__footer) {
  border-top: 0;
}

:global(.base-modal__surface:has(.shipment-detail-modal) .base-modal__footer .page-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 0;
  padding: 9px 14px;
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
}

:global(.base-modal__surface:has(.shipment-detail-modal) .base-modal__footer .page-button--primary) {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

:global(.base-modal__surface:has(.shipment-detail-modal) .base-modal__footer .page-button--secondary) {
  border-color: #e5e9f0;
  background: #fff;
  color: #667085;
}

:global(.base-modal__surface:has(.shipment-create-modal)) {
  width: min(calc(100vw - 48px), 1120px);
  max-width: 1120px;
  max-height: min(88vh, 900px);
  border-radius: 0;
  box-shadow: none;
}

:global(.base-modal__surface--page:has(.shipment-create-modal)) {
  max-height: none;
  margin-inline: auto;
}

:global(.base-modal__surface:has(.shipment-create-modal) .base-modal__body) {
  padding: 24px 28px 28px;
}

:global(.base-modal__surface:has(.shipment-create-modal) .base-modal__footer .page-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 0;
  padding: 9px 14px;
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
}

:global(.base-modal__surface:has(.shipment-create-modal) .base-modal__footer .page-button--primary) {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.shipment-create-page {
  --ship-page-border: rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  --ship-page-surface: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.94);
  display: grid;
  gap: 22px;
  max-width: 1240px;
  margin: 0 auto 0 0;
  padding: 0 0 32px;
}

.shipment-create-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding: 0 0 18px;
}

.shipment-create-page__header p {
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--on-surface-variant, #474747);
  font-size: 0.95rem;
  line-height: 1.6;
}

.shipment-create-page__header .page-button,
.shipment-create-page__footer .page-button {
  min-height: 38px;
  border-radius: 0;
  padding: 9px 16px;
  font-size: 0.82rem;
  font-weight: 900;
}

.shipment-create-page__body {
  border: 1px solid var(--ship-page-border);
  background: var(--ship-page-surface);
  padding: 24px;
}

.shipment-create-page__footer {
  position: sticky;
  bottom: 0;
  z-index: 5;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 2px;
  padding: 16px 0 0;
  background: var(--background, #fff);
}

.shipment-create-page__footer .page-button--primary {
  border-color: var(--primary, #5e5e5e);
  background: var(--primary, #5e5e5e);
  color: #fff;
}

.shipment-create-page .shipment-create-primary,
.shipment-create-page .shipment-create-aside,
.shipment-create-page .shipment-create-spec,
.shipment-create-page .shipment-create-options {
  border-color: transparent;
  background: transparent;
}

.shipment-create-page .shipment-create-primary {
  padding: 0;
  border: 0;
}

.shipment-create-page .shipment-create-aside {
  padding: 0;
  align-self: stretch;
}

.shipment-create-page .shipment-create-spec,
.shipment-create-page .shipment-create-options {
  padding: 10px 0;
}

.shipment-create-modal {
  --ship-border: rgb(var(--outline-variant-rgb, 172 179 180) / 0.24);
  --ship-strong-border: rgb(var(--outline-variant-rgb, 71 71 71) / 0.42);
  --ship-surface: rgb(var(--surface-container-low-rgb, 245 245 245) / 0.9);
  --ship-field: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.96);
  --ship-text: var(--on-surface, #121212);
  --ship-muted: var(--on-surface-variant, #474747);
  --ship-faint: #919191;

  display: grid;
  gap: 16px;
}

.shipment-create-shell {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.75fr);
  gap: 16px;
  align-items: stretch;
}

.shipment-create-page .shipment-create-shell {
  grid-template-columns: minmax(0, 1fr);
}

.shipment-create-primary,
.shipment-create-aside,
.shipment-create-spec,
.shipment-create-options {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  background: var(--ship-surface);
}

.shipment-create-primary {
  display: grid;
  gap: 18px;
  padding: 18px;
  border-left: 4px solid var(--ship-text);
}

.shipment-create-aside {
  display: grid;
  gap: 12px;
  padding: 12px;
  background: transparent;
}

.shipment-create-section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--ship-border);
}

.shipment-create-section-head span,
.shipment-create-spec span,
.shipment-create-spec-grid span,
.shipment-create-options > span {
  color: var(--ship-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.shipment-create-section-head h3 {
  margin: 4px 0 0;
  color: var(--ship-text);
  font-size: 1.25rem;
  line-height: 1.1;
}

.shipment-create-section-head > strong {
  color: var(--ship-text);
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

.shipment-create-form-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.shipment-create-modal .shipment-form-grid {
  gap: 14px;
}

.shipment-create-modal .shipment-field {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 12px;
  background: var(--ship-field);
}

.shipment-create-modal .shipment-field .page-input {
  min-height: 44px;
  border: 0;
  border-bottom: 2px solid var(--ship-strong-border);
  border-radius: 0;
  background: transparent;
}

.shipment-create-modal .shipment-field .page-input:focus {
  border-bottom-color: var(--ship-text);
  box-shadow: none;
  outline: none;
}

.shipment-create-route {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.shipment-create-route > div {
  min-height: 92px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 14px;
  background: var(--ship-field);
}

.shipment-create-route span {
  display: block;
  color: var(--ship-muted);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.shipment-create-route strong {
  display: block;
  margin-top: 12px;
  color: var(--ship-text);
  font-size: 0.9rem;
  line-height: 1.4;
  word-break: keep-all;
}

.shipment-create-route em {
  display: grid;
  place-items: center;
  color: var(--ship-faint);
  font-style: normal;
  font-weight: 900;
}

.shipment-create-spec,
.shipment-create-options {
  padding: 14px;
}

.shipment-create-spec {
  border-left: 4px solid var(--ship-text);
}

.shipment-create-spec strong {
  display: block;
  margin-top: 8px;
  color: var(--ship-text);
  font-size: 1.2rem;
  line-height: 1.2;
}

.shipment-create-spec p {
  margin: 8px 0 0;
  color: var(--ship-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.shipment-create-spec-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.shipment-create-spec-grid > div {
  min-height: 86px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 12px;
  background: var(--ship-field);
}

.shipment-create-spec-grid strong {
  display: block;
  margin-top: 8px;
  color: var(--ship-text);
  font-size: 1.05rem;
  line-height: 1.2;
  word-break: keep-all;
}

.shipment-create-options {
  display: grid;
  gap: 12px;
}

.shipment-date-time-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(120px, 0.8fr);
  gap: 8px;
}

.shipment-datepicker {
  width: 100%;
}

.shipment-datepicker :deep(.dp__main),
.shipment-datepicker :deep(.dp__input_wrap) {
  width: 100%;
  font-family: inherit;
}

.shipment-date-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  color: var(--color-on-surface, #2f3435);
  background: var(--surface-container-lowest, #fff);
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  border-radius: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  text-align: left;
}

.shipment-date-trigger:focus-visible {
  outline: none;
  border-color: rgb(var(--outline-rgb, 117 124 125) / 0.72);
}

.shipment-date-trigger:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.shipment-date-trigger .is-placeholder {
  color: var(--color-on-surface-variant, #919191);
}

.shipment-date-trigger .material-symbols-outlined {
  color: var(--color-on-surface, #2f3435);
  font-size: 1.2rem;
}

.shipment-datepicker :deep(.dp__clear_icon),
.shipment-datepicker :deep(.dp__button_bottom) {
  display: none;
}

.shipment-datepicker :deep(.dp__menu),
:global(.dp__menu) {
  border: 1px solid rgb(var(--outline-rgb, 117 124 125) / 0.38);
  border-radius: 0;
  background: var(--surface-container-lowest, #fff);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.16);
  font-family: inherit;
}

.shipment-datepicker :deep(.dp__month_year_row),
.shipment-datepicker :deep(.dp__calendar_header),
:global(.dp__month_year_row),
:global(.dp__calendar_header) {
  color: var(--on-surface, #2f3435);
  font-weight: 900;
}

.shipment-datepicker :deep(.dp__calendar_header_separator),
:global(.dp__calendar_header_separator) {
  background: rgb(var(--outline-variant-rgb, 172 179 180) / 0.42);
}

.shipment-datepicker :deep(.dp__cell_inner),
:global(.dp__cell_inner) {
  border-radius: 0;
}

.shipment-date-time-row select {
  cursor: pointer;
}

.shipment-detail-modal {
  --ship-card: #ffffff;
  --ship-border: #e5e9f0;
  --ship-text: #111827;
  --ship-muted: #667085;
  --ship-faint: #98a2b3;
  --ship-radius: 0;
  --ship-shadow: none;
}

.shipment-detail-modal .stl-card {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 20px;
  background: var(--ship-card);
  box-shadow: var(--ship-shadow);
}

.shipment-detail-card--summary {
  grid-column: 1 / -1;
}

.shipment-order-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.shipment-order-summary > div {
  min-width: 0;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 12px 14px;
  background: #f8fafc;
}

.shipment-order-summary span {
  display: block;
  margin-bottom: 7px;
  color: var(--ship-faint);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.shipment-order-summary strong {
  display: block;
  overflow: hidden;
  color: var(--ship-text);
  font-size: 0.9rem;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shipment-detail-modal .stl-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.shipment-detail-modal .stl-card__head h3 {
  margin: 4px 0 0;
  color: var(--ship-text);
  font-size: 1rem;
  font-weight: 900;
}

.shipment-detail-modal .page-panel__eyebrow {
  color: var(--ship-faint);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.shipment-detail-modal .page-table__empty {
  border: 1px dashed var(--ship-border);
  border-radius: 0;
  padding: 28px 18px;
  background: #fff;
  color: var(--ship-faint);
  text-align: center;
  font-weight: 800;
}

.shipment-detail-modal .page-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 0;
  padding: 9px 14px;
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
}

.shipment-detail-modal .page-button--primary {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.shipment-detail-modal .page-button--secondary {
  border-color: var(--ship-border);
  background: #fff;
  color: var(--ship-muted);
}

.shipment-detail-modal .shipment-info-grid {
  grid-template-columns: repeat(2, minmax(160px, 1fr));
  gap: 12px;
}

.shipment-detail-card--summary .shipment-info-grid {
  grid-template-columns: repeat(4, minmax(150px, 1fr));
}

.shipment-detail-modal .shipment-info-grid > div {
  min-height: auto;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 12px 14px;
  background: #f8fafc;
}

.shipment-detail-modal .shipment-info-grid span {
  display: block;
  margin-bottom: 7px;
  color: var(--ship-faint);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.shipment-detail-modal .shipment-info-grid strong {
  display: block;
  color: var(--ship-text);
  font-size: 0.93rem;
  font-weight: 900;
  line-height: 1.35;
  word-break: normal;
  overflow-wrap: normal;
}

.shipment-detail-card {
  margin-top: 0;
}

.shipment-detail-modal .shipment-route-summary {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 14px;
  background: #f8fafc;
}

.shipment-detail-modal .shipment-route-summary strong {
  flex: 1;
  color: var(--ship-text);
  font-size: 0.98rem;
  font-weight: 900;
  line-height: 1.35;
  word-break: normal;
}

.shipment-detail-modal .shipment-route-summary span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  background: #fff;
  color: var(--ship-muted);
  font-weight: 900;
}

.shipment-detail-lines {
  margin-top: 14px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 14px;
  background: #fff;
}

.shipment-detail-lines__head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
  color: var(--ship-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.shipment-detail-lines__head strong {
  color: var(--ship-text);
  font-size: 0.95rem;
}

.shipment-detail-line-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.shipment-detail-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  min-width: 0;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 10px 12px;
  background: #f8fafc;
}

.shipment-detail-line div {
  min-width: 0;
}

.shipment-detail-line strong,
.shipment-detail-line span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shipment-detail-line strong {
  color: var(--ship-text);
  font-size: 0.88rem;
  font-weight: 900;
}

.shipment-detail-line span {
  margin-top: 3px;
  color: var(--ship-muted);
  font-size: 0.74rem;
  font-weight: 800;
}

.shipment-detail-line em {
  flex: 0 0 auto;
  min-width: 54px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 6px 8px;
  background: #fff;
  color: var(--ship-text);
  font-style: normal;
  font-weight: 900;
  text-align: center;
}

.shipment-detail-modal .shipment-option-row--readonly {
  gap: 8px;
  margin-top: 12px;
}

.shipment-detail-modal .shipment-option-row--readonly span {
  border-color: #dfe5ee;
  background: #fff;
  color: var(--ship-muted);
  white-space: nowrap;
}

.shipment-detail-modal .shipment-actions--split {
  margin-top: 18px;
  border-top: 1px solid var(--ship-border);
  padding-top: 14px;
}

.shipment-detail-modal .shipment-form-grid {
  gap: 12px;
}

.shipment-detail-modal .shipment-field {
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 12px;
  background: #f8fafc;
}

.shipment-detail-modal .shipment-field .page-input {
  min-height: 40px;
  border-radius: 0;
  background: #fff;
}

.shipment-detail-modal .shipment-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shipment-detail-modal .shipment-history-list > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid var(--ship-border);
  border-radius: 0;
  padding: 10px 12px;
  background: #f8fafc;
}

.shipment-detail-modal .shipment-history-list span {
  color: var(--ship-muted);
  font-size: 0.8rem;
  font-weight: 800;
}

.shipment-detail-modal .shipment-history-list strong {
  color: var(--ship-text);
  font-size: 0.86rem;
  font-weight: 900;
  text-align: right;
}

@media (max-width: 960px) {
  .korea-map-layout,
  .shipment-work-board,
  .shipment-detail-shell,
  .shipment-form-grid,
  .shipment-info-grid,
  .shipment-order-summary,
  .shipment-detail-line-list {
    grid-template-columns: 1fr;
  }

  .shipment-kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .korea-map-layout :deep(.shipment-korea-map) {
    min-height: 420px;
  }

  .shipment-create-shell,
  .shipment-create-route {
    grid-template-columns: 1fr;
  }

  .shipment-create-page__header {
    align-items: stretch;
    flex-direction: column;
  }

  .shipment-create-page__body {
    padding: 16px;
  }

  .shipment-create-page__footer {
    flex-direction: column-reverse;
  }

  .shipment-create-page__footer .page-button {
    width: 100%;
  }

  .shipment-create-route em {
    min-height: 18px;
    transform: rotate(90deg);
  }

  .shipment-create-spec-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .shipment-work-card--row {
    grid-template-columns: 1fr;
  }
}
</style>
