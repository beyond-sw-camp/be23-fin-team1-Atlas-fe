<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import SupplierVectorMap from '../../monitoring/components/SupplierVectorMap.vue'
import type { MonitoringMapNode } from '../../monitoring/services/mapData'
import { getLogisticsNodes, type LogisticsNodeResponseDto } from '../../../services/logistics'
import {
  getPurchaseOrder,
  getPurchaseOrders,
  type PurchaseOrderDetailResponseDto,
  type PurchaseOrderSummaryResponseDto,
} from '../../../services/purchaseOrder'
import {
  getLots,
  type LotResponseDto,
} from '../../../services/lot'
import {
  createDeliveryException,
  createShipment,
  createShipmentLotMapping,
  getDeliveryExceptions,
  getEtaProjections,
  getShipment,
  getShipmentEta,
  getShipmentLotMappings,
  getShipmentMapData,
  getShipmentStatusHistories,
  getShipments,
  trackShipment,
  updateShipment,
  type CreateDeliveryExceptionRequestDto,
  type CreateShipmentLotMappingRequestDto,
  type CreateShipmentRequestDto,
  type DeliveryExceptionResponseDto,
  type EtaProjectionResponseDto,
  type ShipmentEtaResponseDto,
  type ShipmentListResponseDto,
  type ShipmentLotMappingResponseDto,
  type ShipmentMapResponseDto,
  type ShipmentResponseDto,
  type ShipmentStatusHistoryResponseDto,
  type TrackShipmentRequestDto,
  type UpdateShipmentRequestDto,
} from '../../../services/shipment'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 출하',
    title: '출하',
    subtitle: '출하 생성, 운송정보 수정, 체크포인트 추적, 진행 중 출하 흐름을 관리합니다.',
    buttons: {
      openCreate: '승인 발주로 출하 생성',
      closeCreate: '생성 닫기',
      submitCreate: '출하 생성',
      submitting: '저장 중...',
      select: '선택',
      refresh: '새로고침',
      submitUpdate: '수정 저장',
      openTrack: '추적 등록',
      closeTrack: '추적 닫기',
      submitTrack: '추적 저장',
      openException: '예외 등록',
      closeException: '예외 닫기',
      submitException: '예외 저장',
      openLotMap: 'LOT 연결',
      closeLotMap: 'LOT 연결 닫기',
      submitLotMap: 'LOT 연결 저장',
    },
    panels: {
      mapTitle: '진행 중 출하 지도',
      mapEyebrow: 'READY / IN_TRANSIT / DELAYED',
      createTitle: '신규 출하 등록',
      createEyebrow: '등록',
      listTitle: '출하 목록',
      listEyebrow: '출하',
      detailTitle: '출하 상세',
      detailEyebrow: '상세',
      updateTitle: '운송정보 수정',
      updateEyebrow: '수정',
      etaTitle: 'ETA',
      etaEyebrow: '예상 도착',
      historyTitle: '상태 이력',
      historyEyebrow: '이력',
      trackTitle: '출하 추적 등록',
      trackEyebrow: '추적',
      exceptionTitle: '배송 예외 등록',
      exceptionEyebrow: '예외',
      exceptionsTitle: '배송 예외 목록',
      lotMapTitle: '출하-LOT 연결',
      lotMappingsTitle: '연결 LOT 목록',
    },
    fields: {
      shipmentNumber: '출하 번호',
      poId: '발주 ID',
      purchaseOrderPublicId: '발주 Public ID',
      subPoId: '하위 발주 ID',
      subPurchaseOrderPublicId: '하위 발주 Public ID',
      carrierName: '운송사',
      vehicleNo: '차량 번호',
      trackingNo: '운송장 번호',
      originNode: '출발 거점',
      destinationNode: '도착 거점',
      currentNode: '현재 거점',
      destinationNodePublicId: '도착 거점',
      departureEta: '출발 예정 시각',
      arrivalEta: '도착 예정 시각',
      temperatureRequired: '온도 관리 필요',
      status: '상태',
      eta: 'ETA',
      action: '관리',
      nodePublicId: '체크포인트 거점',
      checkpointType: '체크포인트 유형',
      checkpointStatus: '체크포인트 상태',
      plannedAt: '예정 시각',
      actualAt: '실제 시각',
      note: '비고',
      exceptionType: '예외 유형',
      severity: '심각도',
      detectedAt: '감지 시각',
      lotPublicId: 'LOT',
      shippedQty: '출하 수량',
      delayed: '지연 여부',
      delayMinutes: '지연 분',
    },
    messages: {
      loadShipmentsFail: '출하 목록을 불러오지 못했습니다.',
      loadMapFail: '출하 지도 데이터를 불러오지 못했습니다.',
      loadNodesFail: '물류거점 목록을 불러오지 못했습니다.',
      loadDetailFail: '출하 상세를 불러오지 못했습니다.',
      createFail: '출하 등록에 실패했습니다.',
      updateFail: '출하 수정에 실패했습니다.',
      trackFail: '출하 추적 등록에 실패했습니다.',
      exceptionFail: '배송 예외 등록에 실패했습니다.',
      lotMapFail: 'LOT 연결 등록에 실패했습니다.',
      emptyShipments: '출하 데이터가 없습니다.',
      emptyMap: '현재 진행 중인 출하가 없습니다.',
      emptyHistory: '출하 이력이 없습니다.',
      requiredCreate: '승인 발주, 출발 거점, 출발/도착 예정 시각은 필수입니다.',
      destinationFromOrder: '도착 거점은 발주사가 발주 생성 시 지정한 거점을 사용합니다.',
      destinationOrderBlocked: '현재 발주 API에 도착 거점 필드가 없어 출하 생성 전 발주 쪽 백엔드/화면 수정이 필요합니다.',
    },
    states: {
      yes: '예',
      no: '아니오',
      resolved: '해결',
      open: '미해결',
    },
  },
  en: {
    eyebrow: 'SUPPLY CHAIN OPS / SHIPMENTS',
    title: 'Shipments',
    subtitle: 'Create shipments, update transport info, track checkpoints, and monitor active flows.',
    buttons: {
      openCreate: 'CREATE FROM ACCEPTED ORDER',
      closeCreate: 'CLOSE FORM',
      submitCreate: 'SAVE SHIPMENT',
      submitting: 'Saving...',
      select: 'SELECT',
      refresh: 'REFRESH',
      submitUpdate: 'SAVE UPDATE',
      openTrack: 'TRACK SHIPMENT',
      closeTrack: 'CLOSE TRACK',
      submitTrack: 'SAVE TRACK',
      openException: 'ADD EXCEPTION',
      closeException: 'CLOSE EXCEPTION',
      submitException: 'SAVE EXCEPTION',
      openLotMap: 'MAP LOT',
      closeLotMap: 'CLOSE LOT MAP',
      submitLotMap: 'SAVE LOT MAP',
    },
    panels: {
      mapTitle: 'Active Shipment Map',
      mapEyebrow: 'READY / IN_TRANSIT / DELAYED',
      createTitle: 'New Shipment',
      createEyebrow: 'CREATE',
      listTitle: 'Shipment List',
      listEyebrow: 'SHIPMENTS',
      detailTitle: 'Shipment Detail',
      detailEyebrow: 'DETAIL',
      updateTitle: 'Update Transport Info',
      updateEyebrow: 'UPDATE',
      etaTitle: 'ETA',
      etaEyebrow: 'ARRIVAL ESTIMATE',
      historyTitle: 'Status History',
      historyEyebrow: 'HISTORY',
      trackTitle: 'Track Shipment',
      trackEyebrow: 'TRACK',
      exceptionTitle: 'Delivery Exception',
      exceptionEyebrow: 'EXCEPTION',
      exceptionsTitle: 'Delivery Exceptions',
      lotMapTitle: 'Shipment Lot Mapping',
      lotMappingsTitle: 'Mapped Lots',
    },
    fields: {
      shipmentNumber: 'SHIPMENT NO',
      poId: 'PO ID',
      purchaseOrderPublicId: 'PO PUBLIC ID',
      subPoId: 'SUB PO ID',
      subPurchaseOrderPublicId: 'SUB PO PUBLIC ID',
      carrierName: 'CARRIER',
      vehicleNo: 'VEHICLE',
      trackingNo: 'TRACKING NO',
      originNode: 'ORIGIN NODE',
      destinationNode: 'DESTINATION NODE',
      currentNode: 'CURRENT NODE',
      destinationNodePublicId: 'DESTINATION NODE PUBLIC ID',
      departureEta: 'DEPARTURE ETA',
      arrivalEta: 'ARRIVAL ETA',
      temperatureRequired: 'TEMPERATURE REQUIRED',
      status: 'STATUS',
      eta: 'ETA',
      action: 'ACTION',
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
      delayed: 'DELAYED',
      delayMinutes: 'DELAY MINUTES',
    },
    messages: {
      loadShipmentsFail: 'Failed to load shipments.',
      loadMapFail: 'Failed to load shipment map data.',
      loadNodesFail: 'Failed to load logistics nodes.',
      loadDetailFail: 'Failed to load shipment detail.',
      createFail: 'Failed to create shipment.',
      updateFail: 'Failed to update shipment.',
      trackFail: 'Failed to track shipment.',
      exceptionFail: 'Failed to create delivery exception.',
      lotMapFail: 'Failed to create shipment lot mapping.',
      emptyShipments: 'No shipments found.',
      emptyMap: 'No active shipments found.',
      emptyHistory: 'No shipment history found.',
      requiredCreate: 'Accepted order, origin node, departure ETA, and arrival ETA are required.',
      destinationFromOrder: 'Destination node is taken from the purchase order.',
      destinationOrderBlocked: 'Purchase order destination node is not available yet. Update order API/UI first.',
    },
    states: {
      yes: 'YES',
      no: 'NO',
      resolved: 'RESOLVED',
      open: 'OPEN',
    },
  },
} as const

const content = computed(() => CONTENT[preferences.language])

const shipments = ref<ShipmentListResponseDto[]>([])
const mapShipments = ref<ShipmentMapResponseDto[]>([])
const logisticsNodes = ref<LogisticsNodeResponseDto[]>([])
const acceptedPurchaseOrders = ref<PurchaseOrderSummaryResponseDto[]>([])
const selectedPurchaseOrderDetail = ref<PurchaseOrderDetailResponseDto | null>(null)
const lotOptions = ref<LotResponseDto[]>([])
const currentPage = ref(0)
const pageSize = ref(10)
const totalElements = ref(0)
const totalPages = ref(0)
const isShipmentListLoading = ref(false)
const isMapLoading = ref(false)
const shipmentErrorMessage = ref('')
const mapErrorMessage = ref('')
const nodeErrorMessage = ref('')
const orderErrorMessage = ref('')
const lotOptionErrorMessage = ref('')
const isOrderOptionsLoading = ref(false)
const isLotOptionsLoading = ref(false)

const selectedShipment = ref<ShipmentListResponseDto | null>(null)
const selectedShipmentDetail = ref<ShipmentResponseDto | null>(null)
const selectedShipmentEta = ref<ShipmentEtaResponseDto | null>(null)
const selectedShipmentHistories = ref<ShipmentStatusHistoryResponseDto[]>([])
const etaProjections = ref<EtaProjectionResponseDto[]>([])
const deliveryExceptions = ref<DeliveryExceptionResponseDto[]>([])
const shipmentLotMappings = ref<ShipmentLotMappingResponseDto[]>([])
const shipmentDetailErrorMessage = ref('')
const isShipmentDetailLoading = ref(false)

const isCreateModalOpen = ref(false)
const isCreateSubmitting = ref(false)
const createErrorMessage = ref('')
const createForm = ref<CreateShipmentRequestDto>({
  poId: null,
  purchaseOrderPublicId: '',
  subPoId: null,
  subPurchaseOrderPublicId: '',
  carrierName: '',
  vehicleNo: '',
  trackingNo: '',
  originNodePublicId: '',
  destinationNodePublicId: '',
  departureEta: '',
  arrivalEta: '',
  temperatureRequired: false,
})

const isUpdateSubmitting = ref(false)
const updateErrorMessage = ref('')
const updateForm = ref<UpdateShipmentRequestDto>({
  carrierName: '',
  vehicleNo: '',
  trackingNo: '',
  originNodePublicId: '',
  destinationNodePublicId: '',
  departureEta: '',
  arrivalEta: '',
})

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

const activeLogisticsNodes = computed(() => logisticsNodes.value.filter((node) => node.active))
const displayShipments = computed(() => dedupeShipments(shipments.value))
const displayMapShipments = computed(() =>
  dedupeShipments(mapShipments.value).filter((shipment) =>
    ['READY', 'IN_TRANSIT', 'DELAYED'].includes(shipment.status),
  ),
)
const availableLotOptions = computed(() =>
  lotOptions.value.filter(
    (lot) => lot.qty > 0 && lot.lotStatus !== 'SHIPPED' && lot.lotStatus !== 'DISCARDED',
  ),
)
const trackNodeOptions = computed(() => {
  if (!selectedShipmentDetail.value) return []

  const detail = selectedShipmentDetail.value
  const options = [
    {
      publicId: detail.originNodePublicId,
      label: formatNodeDisplay(detail.originNodeName, detail.originNodeCode, detail.originNodePublicId),
    },
    {
      publicId: detail.currentNodePublicId,
      label: formatNodeDisplay(detail.currentNodeName, detail.currentNodeCode, detail.currentNodePublicId),
    },
    {
      publicId: detail.destinationNodePublicId,
      label: formatNodeDisplay(
        detail.destinationNodeName,
        detail.destinationNodeCode,
        detail.destinationNodePublicId,
      ),
    },
  ]

  return options.filter(
    (
      option,
      index,
      array,
    ): option is { publicId: string; label: string } =>
      Boolean(option.publicId) &&
      array.findIndex((candidate) => candidate.publicId === option.publicId) === index,
  )
})
const checkpointTypeOptions = ['DEPARTURE', 'TRANSIT', 'ARRIVAL', 'WAREHOUSE_IN']
const checkpointStatusOptions = ['PLANNED', 'PASSED', 'FAILED', 'CANCELLED']
const deliveryExceptionTypeOptions = ['DELAY', 'DAMAGE', 'TEMPERATURE_DEVIATION', 'WRONG_DELIVERY']
const deliveryExceptionSeverityOptions = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const shipmentWorldMapNodes = computed<MonitoringMapNode[]>(() =>
  displayMapShipments.value.map((shipment) => {
    const currentName = formatNodeDisplay(
      shipment.currentNodeName,
      shipment.currentNodeCode,
      shipment.currentNodePublicId,
    )
    const originName = formatNodeDisplay(
      shipment.originNodeName,
      shipment.originNodeCode,
      shipment.originNodePublicId,
    )
    const destinationName = formatNodeDisplay(
      shipment.destinationNodeName,
      shipment.destinationNodeCode,
      shipment.destinationNodePublicId,
    )

    return {
      label: shipment.shipmentNumber,
      value: formatShipmentStatus(shipment.status),
      meta: `${originName} -> ${destinationName}`,
      latLng: resolveShipmentLatLng(shipment),
      displayName: {
        ko: currentName,
        en: currentName,
      },
      summary: {
        ko: `${shipment.shipmentNumber} / ${formatShipmentStatus(shipment.status)} / ${originName} -> ${destinationName}`,
        en: `${shipment.shipmentNumber} / ${shipment.status} / ${originName} -> ${destinationName}`,
      },
    }
  }),
)

const selectedArrivalLogisticsNodeText = computed(() => {
  const item = selectedPurchaseOrderDetail.value?.items.find(
    (item) => Boolean(item.arrivalLogisticsNodePublicId),
  )

  if (!item) {
    return content.value.messages.destinationFromOrder
  }

  const nodeName = item.arrivalLogisticsNodeName ?? '-'
  const nodeAddress = item.arrivalLogisticsNodeAddress ?? '-'

  return `${nodeName} / ${nodeAddress}`
})

const shipmentWorldMapKey = computed(() =>
  displayMapShipments.value.map((shipment) => getShipmentCaseKey(shipment)).join('|'),
)

function nullableText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function formatNodeDisplay(name?: string | null, code?: string | null, fallback?: string | null) {
  if (name && code) return `${name} (${code})`
  if (name) return name
  if (code) return code
  return fallback ?? '-'
}

function dedupeShipments<T extends ShipmentListResponseDto | ShipmentMapResponseDto>(items: T[]) {
  return Array.from(new Map(items.map((item) => [getShipmentCaseKey(item), item])).values())
}

function getShipmentCaseKey(shipment: ShipmentListResponseDto | ShipmentMapResponseDto) {
  const shipmentWithPoId = shipment as ShipmentMapResponseDto

  return (
    shipment.subPurchaseOrderPublicId ||
    shipment.purchaseOrderPublicId ||
    (shipmentWithPoId.poId ? `PO_ID:${shipmentWithPoId.poId}` : '') ||
    [
      shipment.originNodePublicId,
      shipment.destinationNodePublicId,
      shipment.currentNodePublicId ?? '',
      shipment.status,
    ].join('|') ||
    shipment.publicId
  )
}

function resolveShipmentLatLng(shipment: ShipmentMapResponseDto): [number, number] {
  const latitude =
    shipment.currentLatitude ??
    shipment.originLatitude ??
    shipment.destinationLatitude
  const longitude =
    shipment.currentLongitude ??
    shipment.originLongitude ??
    shipment.destinationLongitude

  if (latitude == null || longitude == null) {
    return [37.5665, 126.978]
  }

  return [Number(latitude), Number(longitude)]
}

function formatShipmentStatus(status?: string | null) {
  if (!status) return '-'
  if (preferences.language !== 'ko') return status

  const labels: Record<string, string> = {
    READY: '준비',
    IN_TRANSIT: '운송 중',
    ARRIVED: '도착',
    DELAYED: '지연',
    CANCELLED: '취소',
  }

  return labels[status] ?? status
}

async function fetchLogisticsNodes() {
  try {
    const response = await getLogisticsNodes({ page: 0, size: 100 })
    logisticsNodes.value = response.content ?? []
    nodeErrorMessage.value = ''
  } catch (error) {
    console.error('Failed to fetch logistics nodes:', error)
    logisticsNodes.value = []
    nodeErrorMessage.value = content.value.messages.loadNodesFail
  }
}

async function fetchAcceptedPurchaseOrders() {
  isOrderOptionsLoading.value = true
  orderErrorMessage.value = ''

  try {
    const [confirmed, partiallyConfirmed] = await Promise.all([
      getPurchaseOrders({
        viewType: 'SUPPLIER',
        poStatus: 'CONFIRMED',
        page: 0,
        size: 100,
      }),
      getPurchaseOrders({
        viewType: 'SUPPLIER',
        poStatus: 'PARTIALLY_CONFIRMED',
        page: 0,
        size: 100,
      }),
    ])

    const orders = [
      ...(confirmed.content ?? []),
      ...(partiallyConfirmed.content ?? []),
    ]

    acceptedPurchaseOrders.value = Array.from(
      new Map(orders.map((order) => [order.poPublicId, order])).values(),
    )
  } catch (error) {
    console.error('Failed to fetch accepted purchase orders:', error)
    acceptedPurchaseOrders.value = []
    orderErrorMessage.value = '출하 생성 가능한 승인 발주 목록을 불러오지 못했습니다.'
  } finally {
    isOrderOptionsLoading.value = false
  }
}

async function fetchLotOptions() {
  isLotOptionsLoading.value = true
  lotOptionErrorMessage.value = ''

  try {
    const response = await getLots()
    lotOptions.value = response.content ?? []
  } catch (error) {
    console.error('Failed to fetch lots:', error)
    lotOptions.value = []
    lotOptionErrorMessage.value = 'LOT 목록을 불러오지 못했습니다.'
  } finally {
    isLotOptionsLoading.value = false
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
    mapErrorMessage.value = content.value.messages.loadMapFail
  } finally {
    isMapLoading.value = false
  }
}

async function fetchShipments() {
  isShipmentListLoading.value = true

  try {
    const response = await getShipments({
      page: currentPage.value,
      size: pageSize.value,
      sort: 'id,desc',
    })

    shipments.value = response.content
    totalElements.value = response.totalElements
    totalPages.value = response.totalPages
    shipmentErrorMessage.value = ''
  } catch (error) {
    console.error('Failed to fetch shipments:', error)
    shipments.value = []
    totalElements.value = 0
    totalPages.value = 0
    shipmentErrorMessage.value = content.value.messages.loadShipmentsFail
  } finally {
    isShipmentListLoading.value = false
  }
}

async function refreshShipments() {
  await Promise.all([fetchShipments(), fetchShipmentMapData(), fetchLogisticsNodes()])
}

async function toggleCreateModal() {
  isCreateModalOpen.value = !isCreateModalOpen.value

  if (isCreateModalOpen.value) {
    await Promise.all([fetchAcceptedPurchaseOrders(), fetchLogisticsNodes()])
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
  updateForm.value = {
    carrierName: detail.carrierName ?? '',
    vehicleNo: detail.vehicleNo ?? '',
    trackingNo: detail.trackingNo ?? '',
    originNodePublicId: detail.originNodePublicId,
    destinationNodePublicId: detail.destinationNodePublicId,
    departureEta: detail.departureEta,
    arrivalEta: detail.arrivalEta,
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
    fillUpdateForm(detail)
  } catch (error) {
    console.error('Failed to load shipment detail:', error)
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

async function handlePurchaseOrderSelect(poPublicId: string) {
  createForm.value.purchaseOrderPublicId = poPublicId
  createForm.value.destinationNodePublicId = ''
  selectedPurchaseOrderDetail.value = null

  if (!poPublicId) return

  try {
    const detail = await getPurchaseOrder(poPublicId)
    selectedPurchaseOrderDetail.value = detail

    const arrivalNodePublicId = detail.items.find(
      (item) => Boolean(item.arrivalLogisticsNodePublicId),
    )?.arrivalLogisticsNodePublicId

    createForm.value.destinationNodePublicId = arrivalNodePublicId ?? ''
    createErrorMessage.value = ''
  } catch (error) {
    console.error('Failed to load purchase order detail:', error)
    createForm.value.destinationNodePublicId = ''
    createErrorMessage.value = '발주 상세 정보를 불러오지 못했습니다.'
  }
}

function resetCreateForm() {
  createForm.value = {
    poId: null,
    purchaseOrderPublicId: '',
    subPoId: null,
    subPurchaseOrderPublicId: '',
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

  if (
    !createForm.value.purchaseOrderPublicId ||
    !createForm.value.originNodePublicId ||
    !createForm.value.departureEta ||
    !createForm.value.arrivalEta
  ) {
    createErrorMessage.value = content.value.messages.requiredCreate
    return
  }

  if (!createForm.value.destinationNodePublicId) {
    createErrorMessage.value = content.value.messages.destinationOrderBlocked
    return
  }

  isCreateSubmitting.value = true

  try {
    await createShipment({
      ...createForm.value,
      poId: null,
      purchaseOrderPublicId: nullableText(createForm.value.purchaseOrderPublicId),
      subPoId: createForm.value.subPoId || null,
      subPurchaseOrderPublicId: nullableText(createForm.value.subPurchaseOrderPublicId),
      carrierName: nullableText(createForm.value.carrierName),
      vehicleNo: nullableText(createForm.value.vehicleNo),
      trackingNo: nullableText(createForm.value.trackingNo),
    })

    currentPage.value = 0
    await refreshShipments()
    resetCreateForm()
    isCreateModalOpen.value = false
  } catch (error: any) {
    console.error('Failed to create shipment:', error)
    createErrorMessage.value = error?.message ?? content.value.messages.createFail
  } finally {
    isCreateSubmitting.value = false
  }
}

async function handleUpdateShipmentSubmit() {
  if (!selectedShipmentDetail.value) return

  updateErrorMessage.value = ''
  isUpdateSubmitting.value = true

  try {
    const updated = await updateShipment(selectedShipmentDetail.value.publicId, {
      carrierName: nullableText(updateForm.value.carrierName),
      vehicleNo: nullableText(updateForm.value.vehicleNo),
      trackingNo: nullableText(updateForm.value.trackingNo),
      originNodePublicId: nullableText(updateForm.value.originNodePublicId),
      destinationNodePublicId: nullableText(updateForm.value.destinationNodePublicId),
      departureEta: nullableText(updateForm.value.departureEta),
      arrivalEta: nullableText(updateForm.value.arrivalEta),
    })

    selectedShipmentDetail.value = updated
    fillUpdateForm(updated)
    await refreshShipments()
  } catch (error: any) {
    console.error('Failed to update shipment:', error)
    updateErrorMessage.value = error?.message ?? content.value.messages.updateFail
  } finally {
    isUpdateSubmitting.value = false
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

async function toggleLotMappingPanel() {
  isLotMappingPanelOpen.value = !isLotMappingPanelOpen.value

  if (isLotMappingPanelOpen.value) {
    await fetchLotOptions()
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
    await fetchShipmentMapData()
  } catch (error: any) {
    console.error('Failed to track shipment:', error)
    trackErrorMessage.value = error?.message ?? content.value.messages.trackFail
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
    isExceptionPanelOpen.value = false
    await handleShipmentSelect(selectedShipment.value)
  } catch (error: any) {
    console.error('Failed to create delivery exception:', error)
    exceptionErrorMessage.value = error?.message ?? content.value.messages.exceptionFail
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
    lotMappingForm.value = { lotPublicId: '', shippedQty: 0 }
    isLotMappingPanelOpen.value = false
    await handleShipmentSelect(selectedShipment.value)
  } catch (error: any) {
    console.error('Failed to create shipment lot mapping:', error)
    lotMappingErrorMessage.value = error?.message ?? content.value.messages.lotMapFail
  } finally {
    isLotMappingSubmitting.value = false
  }
}

onMounted(refreshShipments)
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="refreshShipments">
          {{ content.buttons.refresh }}
        </button>
        <button class="page-button page-button--primary" type="button" @click="toggleCreateModal">
          {{ isCreateModalOpen ? content.buttons.closeCreate : content.buttons.openCreate }}
        </button>
      </div>
    </header>

    <article class="page-panel" style="margin-bottom: 16px;">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.panels.mapEyebrow }}</div>
          <h3>{{ content.panels.mapTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ displayMapShipments.length }}</span>
      </div>
      <div v-if="isMapLoading" class="page-table__empty">Loading...</div>
      <div v-else-if="mapErrorMessage" class="page-table__empty">{{ mapErrorMessage }}</div>
      <div v-else-if="displayMapShipments.length === 0" class="page-table__empty">{{ content.messages.emptyMap }}</div>
      <div v-else class="shipment-map-shell">
        <div class="shipment-map-shell__map">
          <SupplierVectorMap
            :key="shipmentWorldMapKey"
            :nodes="shipmentWorldMapNodes"
            :language="preferences.language"
          />
        </div>
        <aside class="shipment-map-shell__list">
          <article
            v-for="shipment in displayMapShipments"
            :key="getShipmentCaseKey(shipment)"
            class="shipment-map-shell__item"
          >
            <strong>{{ shipment.shipmentNumber }}</strong>
            <span>{{ formatShipmentStatus(shipment.status) }}</span>
            <p>
              {{ formatNodeDisplay(shipment.originNodeName, shipment.originNodeCode, shipment.originNodePublicId) }}
              ->
              {{ formatNodeDisplay(shipment.destinationNodeName, shipment.destinationNodeCode, shipment.destinationNodePublicId) }}
            </p>
          </article>
        </aside>
      </div>
    </article>

    <article v-if="isCreateModalOpen" class="page-panel" style="margin-bottom: 16px;">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.panels.createEyebrow }}</div>
          <h3>{{ content.panels.createTitle }}</h3>
        </div>
      </div>

      <div v-if="nodeErrorMessage" class="page-table__empty">{{ nodeErrorMessage }}</div>

      <div class="page-feed">
        <div class="page-feed__item">
          <span class="page-feed__label">승인 발주 <strong style="color: var(--color-critical);">*</strong></span>
          <select
            :value="createForm.purchaseOrderPublicId"
            class="page-input"
            :disabled="isOrderOptionsLoading"
            @change="handlePurchaseOrderSelect(($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ isOrderOptionsLoading ? '불러오는 중...' : '선택' }}</option>
            <option v-for="order in acceptedPurchaseOrders" :key="order.poPublicId" :value="order.poPublicId">
              {{ order.poNumber }} / {{ order.supplierName }} / {{ order.poStatus }}
            </option>
          </select>
        </div>
        <div v-if="orderErrorMessage" class="page-table__empty">{{ orderErrorMessage }}</div>
        <div v-else-if="!isOrderOptionsLoading && acceptedPurchaseOrders.length === 0" class="page-table__empty">
          출하 생성 가능한 승인 발주가 없습니다.
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.destinationNodePublicId }}</span>
          <strong class="page-feed__text">
            {{ selectedArrivalLogisticsNodeText }}
          </strong>
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.vehicleNo }} <small style="opacity: 0.65;">선택</small></span>
          <input v-model="createForm.vehicleNo" type="text" class="page-input" />
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.trackingNo }} <small style="opacity: 0.65;">선택</small></span>
          <input v-model="createForm.trackingNo" type="text" class="page-input" />
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.originNode }} <strong style="color: var(--color-critical);">*</strong></span>
          <select v-model="createForm.originNodePublicId" class="page-input">
            <option value="">선택</option>
            <option v-for="node in activeLogisticsNodes" :key="node.publicId" :value="node.publicId">
              {{ formatNodeDisplay(node.nodeName, node.nodeCode, node.publicId) }}
            </option>
          </select>
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.destinationNodePublicId }}</span>
          <strong class="page-feed__text">{{ content.messages.destinationFromOrder }}</strong>
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.departureEta }} <strong style="color: var(--color-critical);">*</strong></span>
          <input v-model="createForm.departureEta" type="datetime-local" class="page-input" />
        </div>
        <div class="page-feed__item">
          <span class="page-feed__label">{{ content.fields.arrivalEta }} <strong style="color: var(--color-critical);">*</strong></span>
          <input v-model="createForm.arrivalEta" type="datetime-local" class="page-input" />
        </div>
        <div class="page-feed__item">
          <label style="display: flex; align-items: center; gap: 8px;">
            <input v-model="createForm.temperatureRequired" type="checkbox" />
            <span class="page-feed__label">{{ content.fields.temperatureRequired }} <small style="opacity: 0.65;">선택</small></span>
          </label>
        </div>
      </div>

      <div v-if="createErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
        {{ createErrorMessage }}
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
        <button class="page-button page-button--primary" type="button" :disabled="isCreateSubmitting" @click="handleCreateShipmentSubmit">
          {{ isCreateSubmitting ? content.buttons.submitting : content.buttons.submitCreate }}
        </button>
      </div>
    </article>

    <article class="page-panel">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">{{ content.panels.listEyebrow }}</div>
          <h3>{{ content.panels.listTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ displayShipments.length }}</span>
      </div>

      <div v-if="isShipmentListLoading" class="page-table__empty">Loading...</div>
      <div v-else-if="shipmentErrorMessage" class="page-table__empty">{{ shipmentErrorMessage }}</div>
      <div v-else-if="displayShipments.length === 0" class="page-table__empty">{{ content.messages.emptyShipments }}</div>
      <div v-else class="page-table terminal-page__table">
        <div class="page-table__row page-table__row--head">
          <span>{{ content.fields.shipmentNumber }}</span>
          <span>{{ content.fields.originNode }}</span>
          <span>{{ content.fields.destinationNode }}</span>
          <span>{{ content.fields.status }}</span>
          <span>{{ content.fields.eta }}</span>
          <span>{{ content.fields.action }}</span>
        </div>

        <div v-for="shipment in displayShipments" :key="shipment.publicId" class="page-table__row">
          <span>{{ shipment.shipmentNumber }}</span>
          <span>{{ formatNodeDisplay(shipment.originNodeName, shipment.originNodeCode, shipment.originNodePublicId) }}</span>
          <span>{{ formatNodeDisplay(shipment.destinationNodeName, shipment.destinationNodeCode, shipment.destinationNodePublicId) }}</span>
          <span>{{ formatShipmentStatus(shipment.status) }}</span>
          <span>{{ formatDate(shipment.arrivalEta) }}</span>
          <span>
            <button class="page-button page-button--secondary" type="button" @click="handleShipmentSelect(shipment)">
              {{ content.buttons.select }}
            </button>
          </span>
        </div>
      </div>

      <div v-if="!shipmentErrorMessage && totalPages > 0" style="display: flex; gap: 8px; align-items: center; justify-content: flex-end; margin-top: 12px;">
        <button class="page-button page-button--secondary" type="button" :disabled="currentPage === 0 || isShipmentListLoading" @click="goToPreviousPage">
          이전
        </button>
        <span style="font-size: 0.875rem; opacity: 0.8;">{{ currentPage + 1 }} / {{ totalPages }}</span>
        <button class="page-button page-button--secondary" type="button" :disabled="totalPages === 0 || currentPage >= totalPages - 1 || isShipmentListLoading" @click="goToNextPage">
          다음
        </button>
      </div>

      <div v-if="selectedShipment || isShipmentDetailLoading || shipmentDetailErrorMessage" class="page-table__empty" style="margin-top: 12px;">
        <template v-if="isShipmentDetailLoading">Loading...</template>
        <template v-else-if="shipmentDetailErrorMessage">{{ shipmentDetailErrorMessage }}</template>
        <template v-else-if="selectedShipmentDetail">
          {{ selectedShipmentDetail.shipmentNumber }} / {{ selectedShipmentDetail.status }}
        </template>
      </div>

      <div v-if="selectedShipmentDetail" style="margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
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
              <strong class="page-feed__text">{{ selectedShipmentDetail.carrierName || '-' }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.vehicleNo }}</span>
              <strong class="page-feed__text">{{ selectedShipmentDetail.vehicleNo || '-' }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.trackingNo }}</span>
              <strong class="page-feed__text">{{ selectedShipmentDetail.trackingNo || '-' }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.originNode }}</span>
              <strong class="page-feed__text">
                {{ formatNodeDisplay(selectedShipmentDetail.originNodeName, selectedShipmentDetail.originNodeCode, selectedShipmentDetail.originNodePublicId) }}
              </strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.destinationNode }}</span>
              <strong class="page-feed__text">
                {{ formatNodeDisplay(selectedShipmentDetail.destinationNodeName, selectedShipmentDetail.destinationNodeCode, selectedShipmentDetail.destinationNodePublicId) }}
              </strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.currentNode }}</span>
              <strong class="page-feed__text">
                {{ formatNodeDisplay(selectedShipmentDetail.currentNodeName, selectedShipmentDetail.currentNodeCode, selectedShipmentDetail.currentNodePublicId) }}
              </strong>
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
              <span class="page-feed__label">{{ content.fields.eta }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedShipmentEta?.estimatedArrivalAt) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.delayMinutes }}</span>
              <strong class="page-feed__text">{{ selectedShipmentEta?.delayMinutes ?? 0 }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.delayed }}</span>
              <strong class="page-feed__text">{{ selectedShipmentEta?.delayed ? content.states.yes : content.states.no }}</strong>
            </div>
          </div>
        </article>
      </div>

      <article v-if="selectedShipmentDetail" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.updateEyebrow }}</div>
            <h3>{{ content.panels.updateTitle }}</h3>
          </div>
        </div>
        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.carrierName }}</span>
            <input v-model="updateForm.carrierName" type="text" class="page-input" />
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.vehicleNo }}</span>
            <input v-model="updateForm.vehicleNo" type="text" class="page-input" />
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.trackingNo }}</span>
            <input v-model="updateForm.trackingNo" type="text" class="page-input" />
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.departureEta }}</span>
            <input v-model="updateForm.departureEta" type="datetime-local" class="page-input" />
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.arrivalEta }}</span>
            <input v-model="updateForm.arrivalEta" type="datetime-local" class="page-input" />
          </div>
        </div>
        <div v-if="updateErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
          {{ updateErrorMessage }}
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
          <button class="page-button page-button--primary" type="button" :disabled="isUpdateSubmitting" @click="handleUpdateShipmentSubmit">
            {{ isUpdateSubmitting ? content.buttons.submitting : content.buttons.submitUpdate }}
          </button>
        </div>
      </article>

      <article v-if="selectedShipmentDetail" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.panels.historyEyebrow }}</div>
            <h3>{{ content.panels.historyTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ selectedShipmentHistories.length }}</span>
        </div>
        <div class="page-feed">
          <div v-for="history in selectedShipmentHistories" :key="`${history.shipmentPublicId}-${history.recordedAt}-${history.statusCode}`" class="page-feed__item">
            <span class="page-feed__label">{{ formatDate(history.recordedAt) }}</span>
            <strong class="page-feed__text">{{ history.statusCode }} / {{ history.statusMessage }}</strong>
          </div>
          <div v-if="selectedShipmentHistories.length === 0" class="page-feed__item">
            <span class="page-feed__text" style="opacity: 0.6;">{{ content.messages.emptyHistory }}</span>
          </div>
        </div>
      </article>

      <div v-if="selectedShipmentDetail" style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
        <button class="page-button page-button--secondary" type="button" @click="isTrackPanelOpen = !isTrackPanelOpen">
          {{ isTrackPanelOpen ? content.buttons.closeTrack : content.buttons.openTrack }}
        </button>
        <button class="page-button page-button--secondary" type="button" @click="isExceptionPanelOpen = !isExceptionPanelOpen">
          {{ isExceptionPanelOpen ? content.buttons.closeException : content.buttons.openException }}
        </button>
        <button class="page-button page-button--secondary" type="button" @click="toggleLotMappingPanel">
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
            <select v-model="trackForm.nodePublicId" class="page-input">
              <option value="">선택</option>
              <option v-for="node in trackNodeOptions" :key="node.publicId" :value="node.publicId">
                {{ node.label }}
              </option>
            </select>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.checkpointType }}</span>
            <select v-model="trackForm.checkpointType" class="page-input">
              <option value="">선택</option>
              <option v-for="option in checkpointTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.checkpointStatus }}</span>
            <select v-model="trackForm.checkpointStatus" class="page-input">
              <option value="">선택</option>
              <option v-for="option in checkpointStatusOptions" :key="option" :value="option">{{ option }}</option>
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
            {{ isTrackSubmitting ? content.buttons.submitting : content.buttons.submitTrack }}
          </button>
        </div>
      </article>

      <article v-if="etaProjections.length > 0" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head"><h3>ETA Projections</h3></div>
        <div class="page-feed">
          <div v-for="projection in etaProjections" :key="projection.id" class="page-feed__item">
            <span class="page-feed__label">{{ formatDate(projection.calculatedAt) }}</span>
            <strong class="page-feed__text">{{ formatDate(projection.previousEta) }} -> {{ formatDate(projection.projectedEta) }} / {{ projection.delayMinutes }}</strong>
          </div>
        </div>
      </article>

      <article v-if="isExceptionPanelOpen" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head"><h3>{{ content.panels.exceptionTitle }}</h3></div>
        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.exceptionType }}</span>
            <select v-model="exceptionForm.exceptionType" class="page-input">
              <option value="">선택</option>
              <option v-for="option in deliveryExceptionTypeOptions" :key="option" :value="option">{{ option }}</option>
            </select>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.severity }}</span>
            <select v-model="exceptionForm.severity" class="page-input">
              <option value="">선택</option>
              <option v-for="option in deliveryExceptionSeverityOptions" :key="option" :value="option">{{ option }}</option>
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
            {{ isExceptionSubmitting ? content.buttons.submitting : content.buttons.submitException }}
          </button>
        </div>
      </article>

      <article v-if="deliveryExceptions.length > 0" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <h3>{{ content.panels.exceptionsTitle }}</h3>
          <span class="page-panel__chip">{{ deliveryExceptions.length }}</span>
        </div>
        <div class="page-feed">
          <div v-for="exception in deliveryExceptions" :key="`${exception.shipmentPublicId}-${exception.detectedAt}-${exception.exceptionType}`" class="page-feed__item">
            <span class="page-feed__label">{{ formatDate(exception.detectedAt) }}</span>
            <strong class="page-feed__text">{{ exception.exceptionType }} / {{ exception.severity }} / {{ exception.resolved ? content.states.resolved : content.states.open }}</strong>
          </div>
        </div>
      </article>

      <article v-if="isLotMappingPanelOpen" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head"><h3>{{ content.panels.lotMapTitle }}</h3></div>
        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.lotPublicId }}</span>
            <select v-model="lotMappingForm.lotPublicId" class="page-input" :disabled="isLotOptionsLoading">
              <option value="">{{ isLotOptionsLoading ? '불러오는 중...' : '선택' }}</option>
              <option v-for="lot in availableLotOptions" :key="lot.publicId" :value="lot.publicId">
                {{ lot.lotNumber }} / {{ lot.itemName }} / {{ lot.qty }} {{ lot.unit }} / {{ lot.lotStatus }}
              </option>
            </select>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.fields.shippedQty }}</span>
            <input v-model.number="lotMappingForm.shippedQty" type="number" class="page-input" />
          </div>
        </div>
        <div v-if="lotMappingErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
          {{ lotMappingErrorMessage }}
        </div>
        <div v-if="lotOptionErrorMessage" style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;">
          {{ lotOptionErrorMessage }}
        </div>
        <div v-else-if="!isLotOptionsLoading && availableLotOptions.length === 0" class="page-table__empty" style="margin-top: 12px;">
          출하에 연결할 수 있는 LOT가 없습니다.
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
          <button class="page-button page-button--primary" type="button" :disabled="isLotMappingSubmitting" @click="handleCreateShipmentLotMappingSubmit">
            {{ isLotMappingSubmitting ? content.buttons.submitting : content.buttons.submitLotMap }}
          </button>
        </div>
      </article>

      <article v-if="shipmentLotMappings.length > 0" class="page-panel" style="margin-top: 12px;">
        <div class="page-panel__head">
          <h3>{{ content.panels.lotMappingsTitle }}</h3>
          <span class="page-panel__chip">{{ shipmentLotMappings.length }}</span>
        </div>
        <div class="page-feed">
          <div v-for="mapping in shipmentLotMappings" :key="`${mapping.shipmentPublicId}-${mapping.lotPublicId}`" class="page-feed__item">
            <span class="page-feed__label">{{ mapping.lotPublicId }}</span>
            <strong class="page-feed__text">{{ mapping.shippedQty }} {{ mapping.unit }} / {{ formatDate(mapping.loadedAt) }}</strong>
          </div>
        </div>
      </article>
    </article>
  </section>
</template>
