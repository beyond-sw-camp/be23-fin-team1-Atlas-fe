<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useActorScope } from '../../../composables/useActorScope'
import {
  changeItemStatus,
  changeItemPrimaryMedia,
  getItem,
  getManagedItems,
  getManagedItemLinkedOrders,
  updateItem,
  type ManageableItemStatus,
  type SupplierItemQualityGrade,
} from '../../../services/item'
import {
  confirmPurchaseOrderItem,
  getPurchaseOrder,
  rejectPurchaseOrder,
} from '../../../services/purchaseOrder'
import { useRoute, useRouter } from 'vue-router'
import { getCertificate, getCertificateHistories } from '../../../services/certificate'
import {
  getAttachment,
  getAttachmentByRef,
  updateAttachment,
  uploadAttachment,
  type AttachmentFileDto,
} from '../../../services/file'
import {
  getInventory,
  getItemInventories,
  getNodeInventories,
  updateInventory,
} from '../../../services/inventory'
import {
  activateLogisticsNode,
  deactivateLogisticsNode,
  getLogisticsNode,
  getLogisticsNodeHistories,
  updateLogisticsNode,
  type LogisticsNodeCapacityStatus,
} from '../../../services/logistics'
import { getReturnHistories, getReturnRequest, updateReturnStatus, type ReturnStatus } from '../../../services/return'
import { getSettlement } from '../../../services/settlement'
import { getShipment, getShipmentEta, getShipmentStatusHistories } from '../../../services/shipment'
import {
  getSupplier,
  getSupplierItemCapabilities,
  getSupplierItemCapability,
  updateSupplierItemCapability,
} from '../../../services/supplier'
import { getUserDetailByPublicId } from '../../../services/user'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasSidebarBadgesStore } from '../../../stores/sidebarBadges'
import type { PageKey } from '../../../types'
import { BaseModal } from '../../shared'
import { getSubPurchaseOrder } from '../../../services/subPurchaseOrder'
import {
  ITEM_MEDIA_MAX_UPLOAD_COUNT,
  getItemMedia,
  getItemMediaAttachment,
  itemMediaFilesFromItem,
  itemMediaPublicId,
  normalizeItemMediaFiles,
  resolveItemMediaUrl,
  resolveItemOriginalMediaUrl,
  uploadItemMedia,
  type ItemMediaFile,
} from '../../../services/itemMedia'
import LogisticsNodeLocationMap from '../components/LogisticsNodeLocationMap.vue'



type DetailKind =
  | 'orders'
  | 'shipments'
  | 'returns'
  | 'inventory'
  | 'items'
  | 'suppliers'
  | 'logistics-nodes'
  | 'settlements'
  | 'certificates'
  | 'sub-orders'

type DetailSection = {
  title: string
  rows: { label: string; value: string }[]
}

type DetailMetric = {
  label: string
  value: string
  meta?: string
  tone?: 'neutral' | 'critical' | 'warning' | 'success'
}

type DetailStep = {
  label: string
  meta: string
  state: 'done' | 'active' | 'pending' | 'critical'
}

type EditableItemMedia = {
  id: string
  filePublicId?: string
  originalFileName: string
  kind: 'image' | 'video'
  previewUrl: string
  source: 'existing' | 'new'
  file?: File
}

const route = useRoute()
const router = useRouter()
const preferences = useAtlasPreferencesStore()
const sidebarBadges = useAtlasSidebarBadgesStore()
const actor = useActorScope()

const itemInlineEditMode = ref(false)
const itemLockedModalOpen = ref(false)

const userNamesMap = ref<Record<string, string>>({})

// ── 반품 상태 변경 ──
const myOrgPublicId = window.sessionStorage.getItem('atlas-organization-public-id') ?? ''
const returnReasonText = ref('')
const returnAttachmentFiles = ref<File[]>([])

function handleReturnFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    returnAttachmentFiles.value = Array.from(target.files)
  } else {
    returnAttachmentFiles.value = []
  }
}
const isReturnUpdating = ref(false)

const isReturnDetail = computed(() => kind.value === 'returns' && !!data.value)
const returnStatus = computed(() => String(data.value?.returnStatus ?? '').toUpperCase() as ReturnStatus)
const resolutionType = computed(() => String(data.value?.resolutionType ?? 'RETURN').toUpperCase())

const isReturnTargetOrg = computed(() => {
  if (!data.value) return false
  return data.value.targetOrganizationPublicId === myOrgPublicId
})
const isReturnRequestOrg = computed(() => {
  if (!data.value) return false
  return data.value.requestOrganizationPublicId === myOrgPublicId
})

const returnNextActions = computed<Array<{ label: string; status: ReturnStatus; tone: 'primary' | 'secondary' }>>(() => {
  if (!isReturnDetail.value) return []
  const st = returnStatus.value
  const rt = resolutionType.value

  if (st === 'REQUESTED' && isReturnTargetOrg.value) {
    return [
      { label: t('반려', 'Reject'), status: 'REJECTED', tone: 'secondary' },
      { label: t('승인', 'Approve'), status: 'APPROVED', tone: 'primary' },
    ]
  }
  if (st === 'APPROVED' && isReturnRequestOrg.value) {
    if (rt === 'DISPOSAL') {
      return [{ label: t('폐기 처리', 'Dispose'), status: 'DISPOSED', tone: 'primary' }]
    }
    return [{ label: t('회수 중 처리', 'Mark In Transit'), status: 'IN_TRANSIT', tone: 'primary' }]
  }
  if (st === 'IN_TRANSIT' && isReturnTargetOrg.value) {
    return [{ label: t('입고 완료', 'Mark Received'), status: 'RECEIVED', tone: 'primary' }]
  }
  if (st === 'RECEIVED' && isReturnTargetOrg.value) {
    return [{ label: t('검수 시작', 'Start Inspection'), status: 'INSPECTING', tone: 'primary' }]
  }
  if (st === 'INSPECTING' && isReturnTargetOrg.value) {
    if (rt === 'EXCHANGE') {
      return [{ label: t('교체품 출하', 'Reship'), status: 'RESHIPPED', tone: 'primary' }]
    }
    return [{ label: t('처리 완료', 'Complete'), status: 'COMPLETED', tone: 'primary' }]
  }
  if (st === 'RESHIPPED' && rt === 'EXCHANGE' && (isReturnRequestOrg.value || isReturnTargetOrg.value)) {
    return [{ label: t('처리 완료', 'Complete'), status: 'COMPLETED', tone: 'primary' }]
  }
  if (st === 'DISPOSED' && rt === 'DISPOSAL' && isReturnTargetOrg.value) {
    return [{ label: t('최종 확인', 'Final Confirm'), status: 'COMPLETED', tone: 'primary' }]
  }
  return []
})

async function handleReturnStatusChange(nextStatus: ReturnStatus) {
  if (!data.value?.publicId) return
  isReturnUpdating.value = true
  try {
    let attachmentPublicIds: string[] | undefined = undefined

    if (returnAttachmentFiles.value.length > 0) {
      const uploadRes = await uploadAttachment(returnAttachmentFiles.value, 'RETURN_REQUEST', data.value.publicId)
      attachmentPublicIds = uploadRes.files.map((f) => f.publicId)
    }

    data.value = await updateReturnStatus(data.value.publicId, {
      returnStatus: nextStatus,
      reason: returnReasonText.value || '',
      attachmentPublicIds,
    }) as Record<string, any>
    
    returnReasonText.value = ''
    returnAttachmentFiles.value = []
    
    // 이력도 다시 로드
    related.value.histories = await getReturnHistories(data.value.publicId).catch(() => [])
  } catch (error: any) {
    errorMessage.value = error?.message ?? t('상태 변경에 실패했습니다.', 'Failed to update status.')
  } finally {
    isReturnUpdating.value = false
  }
}

const DETAIL_BADGE_KEY_BY_KIND: Record<DetailKind, PageKey> = {
  orders: 'ordersDesk',
  shipments: 'shipments',
  returns: 'returns',
  inventory: 'inventory',
  items: 'items',
  suppliers: 'supplierControl',
  'logistics-nodes': 'logisticsNodes',
  settlements: 'settlements',
  certificates: 'certificateWatch',
  'sub-orders': 'ordersDesk',
}

const confirmModalOpen = ref(false)
const confirmLines = ref<Array<{
  poItemPublicId: string
  itemName: string
  orderedQty: number
  confirmedQty: number | null
  partialConfirmationAllowed: boolean | null
}>>([])
const confirmErrorMessage = ref('')

function t(ko: string, _en: string) {
  return ko
}

const detailCopy = computed(() =>
  true
    ? {
        configs: {
          orders: { eyebrow: '공급망 운영 / 발주 관리', title: '발주 상세', idLabel: '발주번호' },
          shipments: { eyebrow: '공급망 운영 / 출하', title: '출하 상세', idLabel: '출하번호' },
          returns: { eyebrow: '공급망 운영 / 반품', title: '반품 상세', idLabel: '반품번호' },
          inventory: { eyebrow: '공급망 운영 / 재고', title: '재고 상세', idLabel: '재고 ID' },
          items: { eyebrow: '공급망 운영 / 품목', title: '품목 상세', idLabel: '품목코드' },
          suppliers: { eyebrow: '공급망 운영 / 협력사', title: '협력사 상세', idLabel: '협력사 코드' },
          'logistics-nodes': { eyebrow: '공급망 운영 / 창고', title: '창고 상세', idLabel: '창고 코드' },
          settlements: { eyebrow: '공급망 운영 / 정산', title: '정산 상세', idLabel: '정산 ID' },
          certificates: { eyebrow: '문서 / 인증서', title: '인증서 상세', idLabel: '인증서 번호' },
          'sub-orders': { eyebrow: '공급망 운영 / 서브발주 관리', title: '서브발주 상세', idLabel: '서브발주번호' },
        },
        backToList: '목록으로',
        loading: '상세 정보를 불러오는 중입니다.',
        loadFail: '상세 정보를 불러오지 못했습니다.',
        order: {
          orderDate: '발주일',
          requestedDue: '요청 납기',
          currency: '통화',
          totalAmount: '총 금액',
          basicInfo: '기본 정보',
          buyerOrg: '구매 조직',
          docType: '문서 유형',
          supplier: '협력사',
          shipTo: '배송지',
          owner: '담당자',
          shippingMethod: '운송 방식',
          paymentTerms: '결제 조건',
          memo: '비고',
          items: '발주 품목',
          changeHistory: '변경 내역',
          cancel: '취소',
          applyChange: '변경 적용',
          aiTitle: 'AI 발주 변경 영향 분석',
          risk: '위험도',
          requestedDueChange: '요청 납기',
          quantityChange: '발주 수량 (총 합계)',
          paymentTermsChange: '결제 조건',
          dueChangeReason: '고객 납기 연기 요청',
          qtyChangeReason: '수요 조정으로 수량 감소',
          subOrders: '하위 발주',
          shipments: '출하',
          inventory: '재고',
          supplierImpact: '협력사 영향',
          impactCount: (count: number) => `영향 건수 ${count}건`,
          aiSummaryTitle: 'AI 요약',
          aiSummaryText: '하위 발주 3건과 출하 2건에서 납기 지연이 발생할 가능성이 있습니다. 변경 적용 전 협력사 커뮤니케이션을 권장합니다.',
          communicationDraft: '권장 커뮤니케이션 초안',
          communicationText: '발주 변경으로 인해 납기 일정 및 수량이 조정되었습니다. 변경 상세는 첨부 파일을 확인해 주시기 바랍니다.',
        },
        common: {
          status: '상태',
          item: '품목',
          qty: '수량',
          confirmedQty: '확정 수량',
          amount: '금액',
          history: '히스토리',
          dateTime: '일시',
          step: '단계',
          processor: '처리자',
          description: '설명',
          totalCount: (count: number) => `총 ${count}건`,
          emptyDetailRows: '표시할 상세 항목이 없습니다.',
          process: '진행 상태',
          detailItems: '상세 항목',
          basicInfo: '기본 정보',
          aiAnalysis: '운영 영향 분석',
          impactArea: '영향 영역',
          causeFactors: '원인 변수',
          checklist: '후속 조치 체크리스트',
          notifyOwner: '담당자 알림',
          relatedDocuments: '관련 문서 보기',
          fullHistory: '이력 전체 보기',
        },
        minutes: (value: number) => `${value.toLocaleString('ko-KR')}분`,
      }
    : {
        configs: {
          orders: { eyebrow: 'Supply Operations / Purchase Orders', title: 'Order Detail', idLabel: 'Order No.' },
          shipments: { eyebrow: 'Supply Operations / Shipments', title: 'Shipment Detail', idLabel: 'Shipment No.' },
          returns: { eyebrow: 'Supply Operations / Returns', title: 'Return Detail', idLabel: 'Return No.' },
          inventory: { eyebrow: 'Supply Operations / Inventory', title: 'Inventory Detail', idLabel: 'Inventory ID' },
          items: { eyebrow: 'Supply Operations / Items', title: 'Item Detail', idLabel: 'Item Code' },
          suppliers: { eyebrow: 'Supply Operations / Suppliers', title: 'Supplier Detail', idLabel: 'Supplier Code' },
          'logistics-nodes': { eyebrow: 'Supply Operations / Logistics Nodes', title: 'Logistics Node Detail', idLabel: 'Node Code' },
          settlements: { eyebrow: 'Supply Operations / Settlements', title: 'Settlement Detail', idLabel: 'Settlement ID' },
          certificates: { eyebrow: 'Documents / Certificates', title: 'Certificate Detail', idLabel: 'Certificate No.' },
          'sub-orders': { eyebrow: 'Supply Operations / Sub Purchase Orders', title: 'Sub Order Detail', idLabel: 'Sub Order No.' },

        },
        backToList: 'Back to List',
        loading: 'Loading detail.',
        loadFail: 'Failed to load detail.',
        order: {
          orderDate: 'Order Date',
          requestedDue: 'Requested Due',
          currency: 'Currency',
          totalAmount: 'Total Amount',
          basicInfo: 'Basic Info',
          buyerOrg: 'Buyer Organization',
          docType: 'Document Type',
          supplier: 'Supplier',
          shipTo: 'Ship To',
          owner: 'Owner',
          shippingMethod: 'Shipping Method',
          paymentTerms: 'Payment Terms',
          memo: 'Memo',
          items: 'Order Items',
          changeHistory: 'Change History',
          cancel: 'Cancel',
          applyChange: 'Apply Change',
          aiTitle: 'AI Order Change Impact Analysis',
          risk: 'Risk',
          requestedDueChange: 'Requested Due',
          quantityChange: 'Order Quantity (Total)',
          paymentTermsChange: 'Payment Terms',
          dueChangeReason: 'Customer due date extension request',
          qtyChangeReason: 'Quantity reduced by demand adjustment',
          subOrders: 'Sub Orders',
          shipments: 'Shipments',
          inventory: 'Inventory',
          supplierImpact: 'Supplier Impact',
          impactCount: (count: number) => `${count} impacted`,
          aiSummaryTitle: 'AI Summary',
          aiSummaryText: 'Three sub orders and two shipments may be delayed. Supplier communication is recommended before applying the change.',
          communicationDraft: 'Recommended Communication Draft',
          communicationText: 'The delivery schedule and quantities were adjusted due to the order change. Please review the attached details.',
        },
        common: {
          status: 'Status',
          item: 'Item',
          qty: 'Qty',
          confirmedQty: 'Confirmed Qty',
          amount: 'Amount',
          history: 'History',
          dateTime: 'Date Time',
          step: 'Step',
          processor: 'Processor',
          description: 'Description',
          totalCount: (count: number) => `Total ${count}`,
          emptyDetailRows: 'No detail rows to display.',
          process: 'Process Status',
          detailItems: 'Detail Items',
          basicInfo: 'Basic Info',
          aiAnalysis: 'Operational Impact Analysis',
          impactArea: 'Impact Areas',
          causeFactors: 'Cause Factors',
          checklist: 'Follow-up Checklist',
          notifyOwner: 'Notify Owner',
          relatedDocuments: 'View Related Documents',
          fullHistory: 'View Full History',
        },
        minutes: (value: number) => `${value.toLocaleString('en-US')} min`,
      },
)

const loading = ref(false)
const errorMessage = ref('')
const data = ref<Record<string, any> | null>(null)
const related = ref<Record<string, any>>({})
const historyPage = ref(1)
const historyPageSize = 10
const itemMediaViewerOpen = ref(false)
const itemMediaViewerIndex = ref(0)
const itemEditModalOpen = ref(false)
const itemEditLoading = ref(false)
const itemEditErrorMessage = ref('')
const itemEditErrorModalOpen = ref(false)
const itemMediaFileInput = ref<HTMLInputElement | null>(null)
const itemEditableMedia = ref<EditableItemMedia[]>([])
const itemRemovedMediaPublicIds = ref<string[]>([])
const itemDraggedMediaIndex = ref<number | null>(null)
const itemEditForm = ref({
  itemName: '',
  unitPrice: null as number | null,
  spec: '',
  shelfLifeDays: 0,
  status: 'ACTIVE' as ManageableItemStatus,
  leadTimeDays: 0,
  monthlyCapacity: null as number | null,
  availableQty: null as number | null,
  moq: null as number | null,
  qualityGrade: '' as SupplierItemQualityGrade | '',
  unitPriceHint: null as number | null,
  validFrom: '',
  partialConfirmationAllowed: true,
})

const inventoryEditModalOpen = ref(false)
const inventoryEditLoading = ref(false)
const inventoryEditErrorMessage = ref('')
const inventoryEditForm = ref({
  manufacturedDate: '',
  qty: null as number | null,
  memo: '',
})
const logisticsEditModalOpen = ref(false)
const logisticsEditLoading = ref(false)
const logisticsEditErrorMessage = ref('')
const logisticsEditForm = ref({
  nodeName: '',
  baseAddress: '',
  detailAddress: '',
  capacityStatus: 'EMPTY' as LogisticsNodeCapacityStatus,
})
const logisticsCapacityStatusOptions: LogisticsNodeCapacityStatus[] = ['EMPTY', 'AVAILABLE', 'FULL']

const QUALITY_GRADE_OPTIONS: SupplierItemQualityGrade[] = [
  'AAA',
  'AA_PLUS',
  'AA',
  'A_PLUS',
  'A',
  'B',
  'C',
]

const kind = computed(() => route.params.kind as DetailKind)
const publicId = computed(() => route.params.publicId as string)

const config = computed(() => {
  const routes: Record<DetailKind, string> = {
    orders: 'ordersDesk',
    'sub-orders': 'ordersDesk',
    shipments: 'shipments',
    returns: 'returns',
    inventory: 'inventory',
    items: 'items',
    suppliers: 'supplierControl',
    'logistics-nodes': 'logisticsNodes',
    settlements: 'settlements',
    certificates: 'certificateWatch',
  }
  const text = detailCopy.value.configs[kind.value] ?? detailCopy.value.configs.orders
  return { ...text, listRoute: routes[kind.value] ?? routes.orders }
})

const title = computed(() => {
  const item = data.value
  if (!item) return config.value.title
  return (
    item.poNumber ??
    item.shipmentNumber ??
    item.returnNumber ??
    item.itemName ??
    item.supplierName ??
    item.nodeName ??
    item.certificateNo ??
    item.inventoryNumber ??
    config.value.title
  )
})

const status = computed(() => {
  const item = data.value
  if (!item) return ''
  return (
    item.poStatus ??
    item.subPoStatus ??
    item.status ??
    item.returnStatus ??
    item.supplierStatus ??
    item.capacityStatus ??
    item.settlementStatus ??
    item.certificateStatus ??
    ''
  )
})


const statusTone = computed<DetailMetric['tone']>(() => {
  const value = String(status.value || '').toUpperCase()
  if (/(REJECT|CANCEL|DELAY|EXPIRED|SUSPEND|TERMINAT|FAILED|SHORTAGE)/.test(value)) return 'critical'
  if (/(PENDING|READY|WARNING|PARTIAL|OPEN|CREATED)/.test(value)) return 'warning'
  if (/(APPROVED|CONFIRMED|COMPLETE|ARRIVED|ACTIVE|VALID|SAFE)/.test(value)) return 'success'
  return 'neutral'
})

const isOrderDetail = computed(() => kind.value === 'orders')

const isReceivedOrderDetail = computed(() =>
  isOrderDetail.value && actor.isSupplierOrganization.value,
)

const isBuyerOrderDetail = computed(() =>
  isOrderDetail.value && actor.isBuyerOrganization.value,
)

const isAcceptedOrder = computed(() => {
  const value = String(data.value?.poStatus ?? '').toUpperCase()
  return ['PARTIALLY_CONFIRMED', 'CONFIRMED', 'COMPLETED'].includes(value)
})

const canAcceptOrRejectOrder = computed(() => {
  const value = String(data.value?.poStatus ?? '').toUpperCase()
  return isReceivedOrderDetail.value && value === 'CREATED'
})

const canEditOrder = computed(() => {
  const value = String(data.value?.poStatus ?? '').toUpperCase()
  return isBuyerOrderDetail.value && value === 'CREATED'
})

const hasDomainLayout = computed(() => (
  ['orders', 'sub-orders', 'shipments', 'returns', 'suppliers', 'inventory', 'items'].includes(kind.value)
))

const detailLabel = computed(() => {
  if (kind.value === 'orders') return '발주 상세'
  if (kind.value === 'shipments') return '출하 상세'
  if (kind.value === 'returns') return '반품 요청'
  if (kind.value === 'suppliers') return '협력사 상세'
  if (kind.value === 'inventory') return '재고 상세'
  if (kind.value === 'items') return '품목 상세'
  return config.value.title
})

const riskLevel = computed(() => {
  if (statusTone.value === 'critical') return '높음'
  if (statusTone.value === 'success') return '낮음'
  return '보통'
})

const orderItems = computed(() => {
  return Array.isArray(data.value?.items) ? data.value.items : []
})

const shipmentPathRows = computed(() => {
  const histories = Array.isArray(related.value.histories) ? related.value.histories : []
  if (histories.length > 0) {
    return histories.map((row: any, index: number) => ({
      seq: index + 1,
      node: row.locationText || row.location || display(data.value?.currentNodeName),
      eta: formatShipmentEta(row.recordedAt),
      delay: row.statusCode === 'DELAYED' ? shipmentDelayText.value : '0',
      status: displayShipmentStatus(row.statusCode),
      statusCode: String(row.statusCode || '').toLowerCase(),
      order: data.value?.purchaseOrderNumber ?? data.value?.subPurchaseOrderNumber ?? '관련 발주',
    }))
  }
  return [
    { seq: 1, node: display(data.value?.originNodeName ?? data.value?.originNodeCode), eta: formatShipmentEta(data.value?.departureEta), delay: '0', status: displayShipmentStatus('DEPARTED'), statusCode: 'departed', order: display(data.value?.purchaseOrderNumber ?? '관련 발주') },
    { seq: 2, node: display(data.value?.currentNodeName ?? data.value?.currentNodeCode), eta: formatShipmentEta(data.value?.departureEta), delay: '0', status: displayShipmentStatus('ARRIVED'), statusCode: 'arrived', order: display(data.value?.purchaseOrderNumber ?? '관련 발주') },
    { seq: 3, node: display(data.value?.destinationNodeName ?? data.value?.destinationNodeCode), eta: formatShipmentEta(related.value.eta?.estimatedArrivalAt ?? data.value?.arrivalEta), delay: shipmentDelayText.value, status: displayShipmentStatus(status.value || 'DELAYED'), statusCode: 'delayed', order: display(data.value?.purchaseOrderNumber ?? '관련 발주') },
    { seq: 4, node: t('인천물류센터 (ICN DC)', 'Incheon Logistics Center (ICN DC)'), eta: '04. 29. 11:30', delay: shipmentDelayText.value, status: displayShipmentStatus('PENDING'), statusCode: 'pending', order: display(data.value?.purchaseOrderNumber ?? '관련 발주') },
    { seq: 5, node: t('고객사 창고 (CUSTOMER DC)', 'Customer Warehouse (CUSTOMER DC)'), eta: '04. 29. 14:00', delay: shipmentDelayText.value, status: displayShipmentStatus('PENDING'), statusCode: 'pending', order: display(data.value?.purchaseOrderNumber ?? '관련 발주') },
  ]
})

const shipmentDelayMinutes = computed(() => {
  const value = related.value.eta?.delayMinutes
  return typeof value === 'number' ? value : 142
})

const shipmentDelayText = computed(() => detailCopy.value.minutes(shipmentDelayMinutes.value))

const shipmentDelayEtaText = computed(() => {
  return `ETA + ${shipmentDelayMinutes.value}분`
})

const shipmentDepartureEta = computed(() => formatShipmentEta(data.value?.departureEta))
const shipmentArrivalEta = computed(() => formatShipmentEta(related.value.eta?.estimatedArrivalAt ?? data.value?.arrivalEta))

const shipmentAffectedRows = computed(() => [
  {
    order: display(data.value?.purchaseOrderNumber ?? '관련 발주'),
    item: 'LED DRIVER 60W',
    qty: '1,200 EA',
    due: '04. 29.',
    impact: shipmentDelayText.value,
      priority: '높음',
  },
  { order: 'PO-2026-000015', item: 'SMPS 24V 5A', qty: '800 EA', due: '04. 29.', impact: shipmentDelayText.value, priority: '높음' },
  { order: 'PO-2026-000016', item: 'AL CASE - M', qty: '500 EA', due: '04. 29.', impact: shipmentDelayText.value, priority: '보통' },
  { order: 'PO-2026-000017', item: 'CABLE ASSY', qty: '2,000 EA', due: '04. 30.', impact: '+82분', priority: '낮음' },
])

const shipmentRecommendationRows = computed(() => [
  {
    title: t('우회 운송 검토', 'Review Alternate Route'),
    priority: '높음',
    icon: 'sync_alt',
    reason: t('인천항 혼잡 및 입항 대기 지연으로 ETA 추가 지연 가능성 높음', 'Port congestion and berth waiting may add ETA delay.'),
    action: t('군산항 우회 입항 후 내륙 운송 전환을 권고합니다.', 'Route through Gunsan port and switch to inland transport.'),
    confidence: '82%',
  },
  {
    title: t('부분 출하', 'Partial Shipment'),
    priority: '보통',
    icon: 'inventory_2',
    reason: t('긴급 품목 우선 분리 시 고객 영향 최소화 가능', 'Separating urgent items first can reduce customer impact.'),
    action: t('긴급 품목(LED DRIVER 60W) 먼저 출하하여 부분 납품을 진행합니다.', 'Ship urgent LED DRIVER 60W items first and proceed with partial delivery.'),
    confidence: '76%',
  },
  {
    title: t('납기 재협의', 'Renegotiate Due Date'),
    priority: '보통',
    icon: 'handshake',
    reason: t('지연 회복까지 시간이 소요되어 고객과의 납기 조정이 필요', 'Delay recovery requires time, so due date adjustment is needed.'),
    action: t('고객사에 지연 사유와 새로운 ETA를 제안하고 납기 재협의를 진행합니다.', 'Share delay cause and new ETA with the customer and renegotiate due date.'),
    confidence: '71%',
  },
])

const returnItems = computed(() => {
  if (lineItems.value.length > 0) return lineItems.value
  return [
    { itemPublicId: 'MAT-1001', itemName: 'STEEL COIL', unit: 'EA', returnQty: 5, detailReason: '표면 손상', itemStatus: 'REJECTED' },
    { itemPublicId: 'MAT-1002', itemName: 'ALUMINUM SHEET', unit: 'EA', returnQty: 2, detailReason: '치수 불량', itemStatus: 'REJECTED' },
  ]
})

const supplierCertificateRows = computed(() => [
  ['HACCP', 'HACCP-24-01520', '2024.04.10', '2026.05.10', '인증 만료 임박', '보통', '12일 전'],
  ['ISO9001', 'ISO9001-23-0876', '2023.03.15', '2026.03.15', '만료됨', '높음', '-44일'],
  ['원산지 증명', 'COO-26-000331', '2026.01.05', '2026.07.05', '유효', '낮음', '68일'],
  ['식품안전관리 인증', 'FSMS-25-00211', '2025.02.20', '2027.02.19', '유효', '낮음', '296일'],
])

const inventoryRows = computed(() => {
  const inventories = Array.isArray(related.value.itemInventories)
    ? related.value.itemInventories
    : data.value && kind.value === 'inventory'
      ? [data.value]
      : []

  return inventories.map((row: any) => [
    row.itemCode,
    row.itemName,
    row.unit,
    formatNumber(row.remainingQty),
    formatNumber(row.reservedQty),
    formatNumber(row.availableQty),
    displayStatus(row.status),
    row.expirationDate ?? '-',
  ])
})

const hasConfirmedLinkedOrder = computed(() => {
  const lockedStatuses = new Set(['PARTIALLY_CONFIRMED', 'CONFIRMED', 'COMPLETED'])
  const linkedOrders = Array.isArray(related.value.linkedOrders) ? related.value.linkedOrders : []
  return linkedOrders.some((order: any) => lockedStatuses.has(String(order.poStatus ?? '').toUpperCase()))
})

const canEditCurrentInventory = computed(() => {
  if (!data.value || kind.value !== 'inventory') return false
  return data.value.status === 'ACTIVE' && Number(data.value.reservedQty ?? 0) === 0
})

const itemInformationSummary = computed(() => {
  const item = data.value
  if (!item || kind.value !== 'items') return null

  return {
    code: display(item.itemCode),
    name: display(item.itemName),
    category: display(item.categoryName),
    status: displayItemStatus(item.status),
  }
})

const itemInformationMetrics = computed(() => {
  const item = data.value
  if (!item || kind.value !== 'items') return []

  return [
    { label: t('현재 가용 수량', 'Available Qty'), value: formatNumber(item.availableQty), meta: display(item.unit) },
    { label: t('최소 발주 수량', 'MOQ'), value: formatNumber(item.moq), meta: display(item.unit) },
    { label: t('리드타임', 'Lead Time'), value: item.leadTimeDays ? formatNumber(item.leadTimeDays) : '-', meta: t('일', 'days') },
    { label: t('유통기한', 'Shelf Life'), value: item.shelfLifeDays ? formatNumber(item.shelfLifeDays) : '-', meta: t('일', 'days') },
  ]
})

const itemInformationGroups = computed(() => {
  const item = data.value
  if (!item || kind.value !== 'items') return []

  return [
    {
      title: t('기본 정보', 'Basic Info'),
      rows: [
        [t('규격', 'Spec'), item.spec ?? item.specification],
        [t('단가', 'Unit Price'), formatAmount(item.unitPrice, 'KRW')],
        [t('품질 등급', 'Quality Grade'), qualityGradeText(item.qualityGrade)],
        [t('부분 확정', 'Partial Confirm'), item.partialConfirmationAllowed === false ? t('불가', 'Not Allowed') : t('가능', 'Allowed')],
      ],
    },
    {
      title: t('공급 정보', 'Supply Info'),
      rows: [
        [t('출발 창고', 'Origin Warehouse'), item.originLogisticsNodeName ?? item.originLogisticsNodeCode ?? '출발 창고'],
        [t('월간 생산량', 'Monthly Capacity'), formatNumber(item.monthlyCapacity)],
        [t('공급 유형', 'Supply Type'), item.supplyType],
        [t('상태', 'Status'), displayItemStatus(item.status)],
      ],
    },
  ].map((group) => ({
    title: group.title,
    rows: group.rows.map(([label, value]) => ({
      label: String(label),
      value: display(value),
      role: String(label) === t('상태', 'Status') ? 'status' : 'text',
    })),
  }))
})

function openConfirmOrderModal() {
  confirmErrorMessage.value = ''

  confirmLines.value = orderItems.value.map((item: any) => ({
    poItemPublicId: item.poItemPublicId,
    itemName: item.itemName ?? item.itemCode ?? '-',
    orderedQty: Number(item.orderedQty ?? 0),
    confirmedQty: Number(item.orderedQty ?? 0),
    partialConfirmationAllowed: item.partialConfirmationAllowed,
  }))

  confirmModalOpen.value = true
}

function closeConfirmOrderModal() {
  confirmModalOpen.value = false
  confirmErrorMessage.value = ''
  confirmLines.value = []
}

function validateConfirmLines() {
  for (const line of confirmLines.value) {
    const confirmedQty = Number(line.confirmedQty)
    const orderedQty = Number(line.orderedQty)

    if (!confirmedQty || confirmedQty <= 0) {
      return `${line.itemName} 확정 수량을 입력해 주세요.`
    }

    if (confirmedQty > orderedQty) {
      return `${line.itemName} 확정 수량은 발주 수량 ${formatNumber(orderedQty)}개를 넘을 수 없습니다.`
    }

    if (line.partialConfirmationAllowed === false && confirmedQty !== orderedQty) {
      return `${line.itemName}은 부분 확정이 불가합니다. 전체 수량 ${formatNumber(orderedQty)}개로 확정해야 합니다.`
    }
  }

  return ''
}

const heroMetrics = computed<DetailMetric[]>(() => {
  const item = data.value
  if (!item) return []

  if (kind.value === 'orders') {
    return [
      { label: '상태', value: displayStatus(item.poStatus), tone: statusTone.value },
      { label: '발주일', value: formatDate(item.orderedAt) },
      { label: '거래처', value: display(item.supplierName) },
      { label: '총 금액', value: formatAmount(item.totalAmount, item.currencyCode) },
    ]
  }

  if (kind.value === 'shipments') {
    return [
      { label: '운송 상태', value: displayStatus(item.status), tone: statusTone.value },
      { label: '현재 거점', value: display(item.currentNodeName ?? item.currentNodeCode ?? '현재 거점') },
      { label: '출발 ETA', value: formatDate(item.departureEta) },
      { label: '도착 ETA', value: formatDate(related.value.eta?.estimatedArrivalAt ?? item.arrivalEta) },
    ]
  }

  if (kind.value === 'returns') {
    return [
      { label: '판정', value: displayReturnStatus(item.returnStatus), tone: statusTone.value },
      { label: '반품 유형', value: displayReturnType(item.returnType) },
      { label: '요청 조직', value: display(item.requestOrganizationName ?? '요청 조직') },
      { label: '대상 조직', value: display(item.targetOrganizationName ?? '대상 조직') },
    ]
  }

  if (kind.value === 'inventory') {
    return [
      { label: '품목', value: display(item.itemName ?? item.itemCode) },
      { label: '상태', value: displayStatus(item.status), tone: statusTone.value },
      { label: '잔여 수량', value: formatNumber(item.remainingQty), meta: 'EA' },
      { label: '주문 가능', value: formatNumber(item.availableQty), meta: 'EA' },
    ]
  }

  if (kind.value === 'items') {
    return [
      { label: '품목 코드', value: display(item.itemCode) },
      { label: '단위', value: display(item.unit) },
      { label: '공급사', value: display(item.supplierName) },
      { label: '상태', value: displayItemStatus(item.status), tone: statusTone.value },
    ]
  }

  if (kind.value === 'suppliers') {
    return [
      { label: '협력사 코드', value: display(item.supplierCode) },
      { label: '상태', value: displayStatus(item.supplierStatus), tone: statusTone.value },
      { label: '담당자', value: display(item.primaryContactName) },
      { label: '연락처', value: display(item.primaryContactPhone) },
    ]
  }

  if (kind.value === 'logistics-nodes') {
    return [
      { label: '거점 코드', value: display(item.nodeCode) },
      { label: '가용 상태', value: displayLogisticsCapacityStatus(item.capacityStatus), tone: statusTone.value },
      { label: '운영 여부', value: displayLogisticsActiveStatus(item.active), tone: item.active ? 'success' : 'critical' },
    ]
  }

  if (kind.value === 'settlements') {
    return [
      { label: '정산 상태', value: displayStatus(item.settlementStatus), tone: statusTone.value },
      { label: '대상 유형', value: displayStatus(item.targetType) },
      { label: '기간', value: `${item.settlementPeriodStart ?? '-'} ~ ${item.settlementPeriodEnd ?? '-'}` },
      { label: '금액', value: formatAmount(item.amount, item.currencyCode) },
    ]
  }

  return [
    { label: '인증 번호', value: display(item.certificateNo) },
    { label: '인증 유형', value: display(item.certificateTypeName ?? item.certificateTypeCode) },
    { label: '상태', value: displayStatus(item.certificateStatus), tone: statusTone.value },
    { label: '만료일', value: display(item.expiredAt) },
  ]
})

const processSteps = computed<DetailStep[]>(() => {
  const item = data.value
  const current = String(status.value || '').toUpperCase()
  if (kind.value === 'shipments') {
    return [
      { label: '출하 생성', meta: formatDate(item?.createdAt ?? item?.departureEta), state: 'done' },
      { label: '출발', meta: formatDate(item?.actualDepartedAt ?? item?.departureEta), state: current === 'READY' ? 'active' : 'done' },
      { label: '운송 중', meta: display(item?.currentNodeName ?? related.value.eta?.etaBasis), state: current === 'DELAYED' ? 'critical' : current === 'IN_TRANSIT' ? 'active' : current === 'ARRIVED' ? 'done' : 'pending' },
      { label: '도착', meta: formatDate(item?.actualArrivedAt ?? item?.arrivalEta), state: current === 'ARRIVED' ? 'done' : 'pending' },
    ]
  }

  if (kind.value === 'returns') {
    return [
      { label: '요청 생성', meta: formatDate(item?.createdAt), state: 'done' },
      { label: '검수', meta: display(item?.reason), state: current.includes('REQUEST') ? 'active' : 'done' },
      { label: '승인/거절', meta: displayReturnStatus(item?.returnStatus), state: statusTone.value === 'critical' ? 'critical' : statusTone.value === 'success' ? 'done' : 'active' },
      { label: '완료', meta: formatDate(item?.updatedAt), state: current.includes('COMPLETE') ? 'done' : 'pending' },
    ]
  }

  if (kind.value === 'orders') {
    return [
      { label: '발주 생성', meta: formatDate(item?.createdAt ?? item?.orderedAt), state: 'done' },
      { label: '협력사 확인', meta: display(item?.supplierName), state: current.includes('CREATED') ? 'active' : 'done' },
      { label: '수량 확정', meta: `${lineItems.value.length}건`, state: current.includes('PARTIAL') ? 'active' : current.includes('REJECT') ? 'critical' : 'done' },
      { label: '운영 완료', meta: displayStatus(item?.poStatus), state: current.includes('COMPLETE') ? 'done' : 'pending' },
    ]
  }

  return [
    { label: '등록', meta: formatDate(item?.createdAt), state: 'done' },
    { label: '검토', meta: display(status.value), state: statusTone.value === 'critical' ? 'critical' : 'active' },
    { label: '운영 반영', meta: formatDate(item?.updatedAt), state: statusTone.value === 'success' ? 'done' : 'pending' },
  ]
})

const aiSummary = computed(() => {
  if (statusTone.value === 'critical') return '운영 리스크가 감지되었습니다. 상태 원인과 영향 범위를 먼저 확인하세요.'
  if (statusTone.value === 'warning') return '담당자 확인이 필요한 대기 상태입니다. 관련 품목과 거래처 정보를 검토하세요.'
  if (statusTone.value === 'success') return '현재 상태는 정상 범위입니다. 변경 이력과 후속 작업만 확인하면 됩니다.'
  return '상세 데이터를 기준으로 운영 판단을 진행하세요.'
})

const recommendationRows = computed(() => {
  if (kind.value === 'shipments') {
    return [
      ['현재 노드', data.value?.currentNodeName ?? data.value?.currentNodeCode ?? '-'],
      ['지연 영향', formatMinutes(related.value.eta?.delayMinutes)],
      ['권장 조치', statusTone.value === 'critical' ? '담당자 알림 및 대체 경로 검토' : 'ETA와 체크포인트 확인'],
    ]
  }
  if (kind.value === 'orders') {
    return [
      ['품목 수', `${lineItems.value.length}건`],
      ['거래처 상태', displayStatus(data.value?.supplierStatus)],
      ['권장 조치', statusTone.value === 'warning' ? '협력사 응답 및 확정 수량 확인' : '발주 품목 상태 확인'],
    ]
  }
  if (kind.value === 'returns') {
    return [
      ['반품 사유', data.value?.reason ?? '-'],
      ['처리 방식', displayResolutionType(data.value?.resolutionType)],
      ['권장 조치', '검수 결과와 후속 체크리스트 확인'],
    ]
  }
  return [
    ['상세 구분', config.value.title],
    ['상태', displayStatus(status.value)],
    ['권장 조치', '상세 필드와 관련 항목 확인'],
  ]
})

const sections = computed<DetailSection[]>(() => {
  const item = data.value
  if (!item) return []

  if (kind.value === 'orders') {
    return [
      section('기본 정보', [
        ['발주번호', item.poNumber],
        ['거래처', item.supplierName],
        ['상태', displayStatus(item.poStatus)],
        ['발주일', formatDate(item.orderedAt)],
        ['총 금액', formatAmount(item.totalAmount, item.currencyCode)],
        ['메모', item.memo],
      ]),
    ]
  }

  if (kind.value === 'shipments') {
    return [
      section('기본 정보', [
        ['출하번호', item.shipmentNumber],
        ['상태', displayShipmentStatus(item.status)],
        ['운송사', item.carrierName],
        ['차량번호', item.vehicleNo],
        ['출발 예정', formatDate(item.departureEta)],
        ['도착 예정', formatDate(item.arrivalEta)],
      ]),
      section('경로 정보', [
        ['출발지', item.originNodeName ?? item.originNodeCode ?? '출발 창고'],
        ['도착지', item.destinationNodeName ?? item.destinationNodeCode ?? '도착 창고'],
        ['예상 도착', formatDate(related.value.eta?.estimatedArrivalAt)],
        ['지연 시간', formatMinutes(related.value.eta?.delayMinutes)],
      ]),
    ]
  }

  if (kind.value === 'returns') {
    return [
      section('기본 정보', [
        ['반품번호', item.returnNumber ?? '반품 요청'],
        ['상태', displayReturnStatus(item.returnStatus)],
        ['요청 조직', item.requestOrganizationName ?? '요청 조직'],
        ['대상 조직', item.targetOrganizationName ?? '대상 조직'],
        ['반품 유형', displayReturnType(item.returnType)],
        ['사유', item.reason],
      ]),
    ]
  }

  if (kind.value === 'inventory') {
    return [
      section('재고 정보', [
        ['품목', item.itemName],
        ['품목코드', item.itemCode],
        ['상태', displayStatus(item.status)],
        ['제조일', item.manufacturedDate],
        ['유통기한', item.expirationDate],
        ['초기 수량', formatNumber(item.initialQty)],
        ['잔여 수량', formatNumber(item.remainingQty)],
        ['예약 수량', formatNumber(item.reservedQty)],
        ['주문 가능 수량', formatNumber(item.availableQty)],
        ['메모', item.memo],
      ]),
    ]
  }

  if (kind.value === 'items') {
    return [
      section('품목 정보', [
        ['품목코드', item.itemCode],
        ['품목명', item.itemName],
        ['단위', item.unit],
        ['규격', item.specification],
        ['공급사', item.supplierName],
        ['상태', displayItemStatus(item.status)],
      ]),
    ]
  }

  if (kind.value === 'suppliers') {
    return [
      section('협력사 정보', [
        ['협력사 코드', item.supplierCode],
        ['협력사명', item.supplierName],
        ['상태', displayStatus(item.supplierStatus)],
        ['담당자', item.primaryContactName],
        ['이메일', item.primaryContactEmail],
        ['연락처', item.primaryContactPhone],
      ]),
    ]
  }

  if (kind.value === 'logistics-nodes') {
    return [
      section('거점 정보', [
        ['거점 코드', item.nodeCode],
        ['거점명', item.nodeName],
        ['가용 상태', displayLogisticsCapacityStatus(item.capacityStatus)],
        ['운영 여부', displayLogisticsActiveStatus(item.active)],
        ['주소', item.address],
      ]),
    ]
  }

  if (kind.value === 'settlements') {
    return [
      section('정산 정보', [
        ['정산 번호', item.settlementNumber ?? '정산 상세'],
        ['상태', displayStatus(item.settlementStatus)],
        ['대상 유형', displayStatus(item.targetType)],
        ['대상', item.targetName ?? item.targetNumber ?? '정산 대상'],
        ['기간', `${item.settlementPeriodStart ?? '-'} ~ ${item.settlementPeriodEnd ?? '-'}`],
        ['금액', formatAmount(item.amount, item.currencyCode)],
      ]),
    ]
  }

  return [
    section('인증서 정보', [
      ['인증서 번호', item.certificateNo],
      ['협력사', item.supplierName],
      ['인증 유형', item.certificateType?.name ?? item.certificateTypeName ?? item.certificateTypeCode],
      ['상태', displayStatus(item.certificateStatus)],
      ['발급일', item.issuedAt],
      ['만료일', item.expiredAt],
      ['발급기관', item.issuerName],
      ['반려 사유', item.rejectReason],
      ['첨부 파일', related.value.attachment?.files?.[0]?.originalFileName ?? (item.attachmentPublicId ? '첨부 파일 있음' : '-')],
    ]),
  ]
})

const storedInventoryRows = computed(() => {
  const inventories = Array.isArray(related.value.nodeInventories) ? related.value.nodeInventories : []
  const grouped = new Map<string, { itemPublicId: string; itemName: string; quantity: number }>()

  inventories.forEach((row: any) => {
    const key = row.itemPublicId ?? row.itemCode ?? row.itemName
    if (!key) return

    const current = grouped.get(key) ?? {
      itemPublicId: key,
      itemName: row.itemName ?? row.itemCode ?? '-',
      quantity: 0,
    }

    current.quantity += Number(row.remainingQty ?? 0)
    grouped.set(key, current)
  })

  return Array.from(grouped.values()).filter((row) => row.quantity > 0)
})

const lineItems = computed(() => {
  const item = data.value
  if (!item) return []
  if (kind.value === 'logistics-nodes') return storedInventoryRows.value
  if (Array.isArray(item.items)) return item.items
  if (Array.isArray(item.details)) return item.details
  if (Array.isArray(item.returnItems)) return item.returnItems
  if (Array.isArray(related.value.histories)) return related.value.histories
  if (Array.isArray(related.value.linkedOrders)) return related.value.linkedOrders
  if (Array.isArray(related.value.capabilities)) return related.value.capabilities
  return []
})

const lineColumns = computed(() => {
  if (kind.value === 'orders') return ['품목', '수량', '확정 수량', '금액', '상태']
  if (kind.value === 'shipments') return ['시간', '상태', '위치', '메모']
  if (kind.value === 'returns') return ['시간', '상태', '처리자', '메모']
  if (kind.value === 'settlements') return ['품목 ID', '수량', '단가', '금액', '상태']
  if (kind.value === 'items') return ['발주번호', '거래처', '수량', '상태', '납기']
  if (kind.value === 'suppliers') return ['품목', '등급', '리드타임', '가용 수량', '상태']
  if (kind.value === 'logistics-nodes') return ['품목', '수량']
  if (kind.value === 'certificates') {
    return ['일시', '이전 상태', '변경 상태', '사유']
  }
  return ['항목', '값', '상태']
})

const detailRows = computed(() => sections.value.flatMap((item) => item.rows))

const chipLabels = new Set(['상태', '정산 상태', '인증 상태', '가용 상태', '운영 여부', '운영 상태', '위험도'])

function shouldRenderChip(label: string, value?: string) {
  if (chipLabels.has(label)) return true
  return /^(활성|비활성|가득 참|사용 가능|비어 있음|높음|보통|낮음)$/.test(String(value ?? ''))
}

function chipTone(value?: string, fallback: DetailMetric['tone'] = 'neutral') {
  const text = String(value ?? '').toUpperCase()

  if (/(REJECT|CANCEL|DELAY|EXPIRED|SUSPEND|TERMINAT|FAILED|SHORTAGE|비활성|높음)/.test(text)) return 'critical'
  if (/(PENDING|READY|WARNING|PARTIAL|OPEN|CREATED|가득 참|보통)/.test(text)) return 'warning'
  if (/(APPROVED|CONFIRMED|COMPLETE|ARRIVED|ACTIVE|VALID|SAFE|활성|사용 가능|낮음)/.test(text)) return 'success'
  return fallback ?? 'neutral'
}

const aiImpactRows = computed(() => {
  if (kind.value === 'orders') {
    return [
      ['하위 발주', statusTone.value === 'critical' ? '높음' : '보통', `${lineItems.value.length}건 영향 가능`],
      ['출하', statusTone.value === 'success' ? '낮음' : '보통', '요청 납기 기준 확인 필요'],
      ['재고', '보통', '품목별 가용 수량 확인'],
      ['협력사 영향', statusTone.value === 'warning' ? '높음' : '보통', display(data.value?.supplierName)],
    ]
  }

  if (kind.value === 'shipments') {
    return [
      ['배송 지연', statusTone.value === 'critical' ? '높음' : '보통', formatMinutes(related.value.eta?.delayMinutes)],
      ['영향 발주', '보통', `${lineItems.value.length}건`],
      ['재고', '낮음', '입고 일정 확인'],
      ['고객 영향', statusTone.value === 'critical' ? '높음' : '보통', display(data.value?.destinationNodeName)],
    ]
  }

  if (kind.value === 'returns') {
    return [
      ['검수', statusTone.value === 'critical' ? '높음' : '보통', display(data.value?.reason)],
      ['교체 출고', '보통', '가용 재고 확인'],
      ['환불', '낮음', displayResolutionType(data.value?.resolutionType)],
      ['고객 영향', statusTone.value === 'critical' ? '높음' : '보통', display(data.value?.targetOrganizationName)],
    ]
  }

  return [
    ['운영 상태', statusTone.value === 'critical' ? '높음' : statusTone.value === 'success' ? '낮음' : '보통', displayStatus(status.value)],
    ['관련 항목', '보통', `${lineItems.value.length}건`],
    ['데이터 품질', '낮음', '필수 필드 확인'],
    ['후속 조치', '보통', '담당자 검토'],
  ]
})

const aiChecklist = computed(() => [
  '상세 필드와 최신 상태 확인',
  '관련 항목 수량 및 일정 검토',
  statusTone.value === 'critical' ? '담당자 알림 및 대체안 검토' : '변경 이력과 후속 작업 확인',
])

const historyRows = computed(() => {
  const rows = Array.isArray(related.value.histories) ? related.value.histories : []
  if (rows.length > 0) return sortHistoryRows(rows)

  if (kind.value === 'logistics-nodes' && data.value) {
    const createdAt = data.value.createdAt ?? data.value.updatedAt
    const updatedAt = data.value.updatedAt ?? data.value.createdAt
    const capacityStatus = displayLogisticsCapacityStatus(data.value.capacityStatus)
    const activeStatus = displayLogisticsActiveStatus(data.value.active)

    return sortHistoryRows([
      {
        createdAt,
        changeType: '창고 생성',
        processedByUserPublicId: '-',
        memo: `${formatDate(createdAt)}에 창고 생성`,
      },
      {
        createdAt: updatedAt,
        changeType: '가용 상태',
        processedByUserPublicId: '-',
        memo: `가용 상태가 ${capacityStatus}(으)로 설정됨`,
      },
      {
        createdAt: updatedAt,
        changeType: '운영 여부',
        processedByUserPublicId: '-',
        memo: activeStatus === '활성' ? '창고 활성화' : '창고 비활성화',
      },
    ])
  }

  return [
    { createdAt: data.value?.updatedAt ?? data.value?.createdAt, statusCode: status.value || 'REVIEW', processedByUserPublicId: '-', memo: aiSummary.value },
  ]
})

const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyRows.value.length / historyPageSize)))

const paginatedHistoryRows = computed(() => {
  const start = (historyPage.value - 1) * historyPageSize
  return historyRows.value.slice(start, start + historyPageSize)
})

const shouldPaginateHistory = computed(() => historyRows.value.length > historyPageSize)

function moveHistoryPage(direction: -1 | 1) {
  historyPage.value = Math.min(historyTotalPages.value, Math.max(1, historyPage.value + direction))
}

function sortHistoryRows(rows: any[]) {
  return [...rows].sort((first, second) => {
    const firstTime = historyRowTime(first)
    const secondTime = historyRowTime(second)
    return secondTime - firstTime
  })
}

function historyRowTime(row: any) {
  const raw = row?.createdAt ?? row?.recordedAt ?? row?.updatedAt
  const time = raw ? new Date(raw).getTime() : 0
  return Number.isNaN(time) ? 0 : time
}

function historyChangeLabel(row: any) {
  if (kind.value === 'logistics-nodes') {
    return row.changeType ?? row.actionType ?? '변경사항'
  }

  return displayStatus(row.statusCode ?? row.returnStatus ?? row.status ?? status.value)
}

function historyDescription(row: any) {
  if (kind.value === 'logistics-nodes') {
    return row.memo ?? row.description ?? '창고 정보 변경'
  }

  return row.memo ?? row.description ?? aiSummary.value
}

function historyActorLabel(row: any) {
  if (kind.value === 'logistics-nodes') {
    return display(row.processedByUserName)
  }

  return formatActor(row.processedByUserPublicId ?? row.createdBy)
}

function section(title: string, rows: [string, unknown][]): DetailSection {
  return {
    title,
    rows: rows.map(([label, value]) => ({ label, value: display(value) })),
  }
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

const statusTextMap: Record<string, string> = {
  ACTIVE: '활성',
  INACTIVE: '비활성',
  DEACTIVE: '비활성',
  DELETE: '삭제',
  AVAILABLE: '사용 가능',
  EMPTY: '여유',
  FULL: '가득 참',
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
  CREATED: '생성됨',
  READY: '준비',
  PENDING: '대기',
  OPEN: '진행 중',
  APPROVED: '승인됨',
  CONFIRMED: '확정됨',
  PARTIALLY_CONFIRMED: '부분 확정',
  COMPLETED: '완료',
  COMPLETE: '완료',
  REJECTED: '반려됨',
  CANCELLED: '취소됨',
  CANCELED: '취소됨',
  DELAYED: '지연',
  DEPARTED: '출발',
  ARRIVED: '도착',
  IN_TRANSIT: '운송 중',
  EXPIRED: '만료됨',
  VALID: '유효',
  SHORTAGE: '부족',
  NORMAL: '정상',
  WARNING: '주의',
  SAFE: '안전',
  FAILED: '실패',
  REVIEW: '검토',
  RETURN: '반품',
  EXCHANGE: '교환',
  DISPOSAL: '폐기',
}

const displayStatus = (value: unknown) => {
  if (value === null || value === undefined || value === '') return '-'
  const statusValue = String(value).toUpperCase()
  return statusTextMap[statusValue] ?? display(value)
}

const riskClass = (value: unknown) => {
  const text = String(value)
  if (text === '높음') return 'high'
  if (text === '보통') return 'medium'
  if (text === '낮음') return 'low'
  return text.toLowerCase()
}

function displayItemStatus(value: unknown) {
  const statusValue = String(value || '').toUpperCase()
  if (statusValue === 'ACTIVE') return '활성'
  if (statusValue === 'DEACTIVE') return '비활성'
  if (statusValue === 'DELETE') return '삭제'
  return display(value)
}

function displayLogisticsCapacityStatus(value: unknown) {
  const statusValue = String(value || '').toUpperCase()
  if (statusValue === 'AVAILABLE') return '사용 가능'
  if (statusValue === 'EMPTY') return '여유'
  if (statusValue === 'FULL') return '가득 참'
  return display(value)
}

function displayLogisticsActiveStatus(value: unknown) {
  return value ? '활성' : '비활성'
}

function formatNumber(value: unknown) {
  return typeof value === 'number'
    ? value.toLocaleString('ko-KR')
    : display(value)
}

const returnStatusMap: Record<string, string> = {
  REQUESTED: '요청됨',
  APPROVED: '승인됨',
  REJECTED: '반려됨',
  IN_TRANSIT: '회수 중',
  RECEIVED: '입고 완료',
  INSPECTING: '검수 중',
  RESHIPPED: '교체품 출하',
  DISPOSED: '폐기 완료',
  COMPLETED: '처리 완료',
}

const returnTypeMap: Record<string, string> = {
  DAMAGE: '파손',
  DEFECTIVE: '불량',
  SIMPLE_RETURN: '단순 변심',
}

const resolutionTypeMap: Record<string, string> = {
  RETURN: '반품 (환불)',
  EXCHANGE: '교환',
  DISPOSAL: '폐기',
}

function displayReturnStatus(status: unknown) {
  if (!status) return '-'
  const st = String(status).toUpperCase()
  return returnStatusMap[st] || st
}

function displayReturnType(type: unknown) {
  if (!type) return '-'
  const str = String(type).toUpperCase()
  return returnTypeMap[str] || str
}

function displayResolutionType(type: unknown) {
  if (!type) return '-'
  const str = String(type).toUpperCase()
  return resolutionTypeMap[str] || str
}

function formatActor(publicId: unknown) {
  if (!publicId || publicId === '-') return '-'
  const str = String(publicId)
  if (userNamesMap.value[str]) return userNamesMap.value[str]
  if (str.length > 10) return `담당자 (${str.slice(-6)})`
  return str
}

function formatShortId(publicId: unknown) {
  if (!publicId || publicId === '-') return '-'
  const str = String(publicId)
  if (str.length > 12) return `...${str.slice(-6)}`
  return str
}

function formatAmount(value: unknown, _currency?: string) {
  if (typeof value !== 'number') return display(value)
  return `${value.toLocaleString('ko-KR')}원`
}

function formatDate(value: unknown) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
}

function formatShipmentEta(value: unknown) {
  if (!value) return '-'
  const raw = String(value)
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw.replace('T', ' ').slice(5, 16)

  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}. ${day}. ${hour}:${minute}`
}

function displayShipmentStatus(value: unknown) {
  const statusValue = String(value || '').toUpperCase()
  if (statusValue === 'DEPARTED') return '출발'
  if (statusValue === 'ARRIVED') return '도착'
  if (statusValue === 'DELAYED') return '지연'
  if (statusValue === 'PENDING') return '대기'
  if (statusValue === 'READY') return '준비'
  if (statusValue === 'IN_TRANSIT') return '운송 중'
  return display(value)
}

function qualityGradeText(value: SupplierItemQualityGrade | null | undefined) {
  if (!value) return '-'

  switch (value) {
    case 'AA_PLUS':
      return 'AA+'
    case 'A_PLUS':
      return 'A+'
    default:
      return value
  }
}

function formatMinutes(value: unknown) {
  if (typeof value !== 'number') return '-'
  return detailCopy.value.minutes(value)
}

function lineCell(row: any, index: number) {
  if (kind.value === 'orders') {
    return [
      row.itemName ?? row.itemCode,
      formatNumber(row.orderedQty),
      display(row.confirmedQty),
      formatAmount(row.lineAmount),
      displayStatus(row.itemStatus ?? row.lineStatus),
    ][index]
  }
  if (kind.value === 'shipments' || kind.value === 'returns') {
    return [
      formatDate(row.recordedAt ?? row.createdAt),
      kind.value === 'returns' ? displayReturnStatus(row.statusCode ?? row.returnStatus) : displayShipmentStatus(row.statusCode ?? row.returnStatus),
      row.location ?? formatActor(row.processedByUserPublicId),
      row.memo ?? row.description,
    ][index]
  }
  if (kind.value === 'settlements') {
    return [row.itemName ?? row.itemCode ?? '정산 품목', formatNumber(row.qty), formatAmount(row.unitPrice), formatAmount(row.amount), displayStatus(row.detailStatus)][index]
  }
  if (kind.value === 'items') {
    return [row.poNumber, row.supplierName, formatNumber(row.orderedQty), displayStatus(row.poStatus), row.expectedDueDate][index]
  }
  if (kind.value === 'suppliers') {
    return [row.itemName, row.qualityGrade, row.leadTimeDays, formatNumber(row.availableQty), displayStatus(row.status)][index]
  }
  if (kind.value === 'logistics-nodes') {
    return [
      row.itemName ?? '-',
      formatNumber(row.quantity),
    ][index]
  }
  if (kind.value === 'certificates') {
    return [
      formatDate(row.recordedAt),
      displayStatus(row.beforeStatus),
      displayStatus(row.afterStatus ?? row.actionType),
      row.reason ?? '-',
    ][index]
  }
  return [row.name ?? row.itemName ?? '상세 항목', row.name ?? row.itemName ?? displayStatus(row.status), displayStatus(row.status)][index]
}

async function handleAcceptOrder() {
  if (!data.value?.poPublicId) return

  const message = validateConfirmLines()
  if (message) {
    confirmErrorMessage.value = message
    return
  }

  try {
    loading.value = true

    let latest = data.value

    for (const line of confirmLines.value) {
      latest = await confirmPurchaseOrderItem(
        data.value.poPublicId,
        line.poItemPublicId,
        {
          confirmedQty: Number(line.confirmedQty),
        },
      )
    }

    data.value = latest
    closeConfirmOrderModal()
  } catch (error: any) {
    confirmErrorMessage.value = error?.message ?? '발주 수락에 실패했습니다.'
  } finally {
    loading.value = false
  }
}


async function handleRejectOrder() {
  if (!data.value?.poPublicId) return

  try {
    loading.value = true
    data.value = await rejectPurchaseOrder(data.value.poPublicId)
  } catch (error: any) {
    errorMessage.value = error?.message ?? '발주 반려에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

function handleEditOrder() {
  router.push({
    name: 'ordersDesk',
    query: {
      edit: publicId.value,
    },
  })
}

function isPositiveInteger(value: unknown) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function mediaFileToEditableMedia(file: ItemMediaFile): EditableItemMedia {
  const filePublicId = itemMediaPublicId(file)
  return {
    id: filePublicId,
    filePublicId,
    originalFileName: file.originalFileName,
    kind: file.kind === 'video' ? 'video' : 'image',
    previewUrl: resolveItemMediaUrl(file),
    source: 'existing',
  }
}

function resetEditableItemMedia() {
  itemEditableMedia.value.forEach((media) => {
    if (media.source === 'new') URL.revokeObjectURL(media.previewUrl)
  })
  itemEditableMedia.value = ensureEditablePrimaryImageFirst(itemMediaFiles.value.map(mediaFileToEditableMedia))
  itemRemovedMediaPublicIds.value = []
}

function ensureEditablePrimaryImageFirst(mediaList: EditableItemMedia[]) {
  if (mediaList.length <= 1 || mediaList[0]?.kind === 'image') return mediaList

  const firstImageIndex = mediaList.findIndex((media) => media.kind === 'image')
  if (firstImageIndex <= 0) return mediaList

  const next = [...mediaList]
  const [firstImage] = next.splice(firstImageIndex, 1)
  next.unshift(firstImage)
  return next
}

function triggerItemMediaPicker() {
  if (!canAddItemMedia.value) return
  itemMediaFileInput.value?.click()
}

function handleItemMediaFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const remainingCount = ITEM_MEDIA_MAX_UPLOAD_COUNT - itemEditableMedia.value.length
  const files = Array.from(target.files ?? [])
    .filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    .slice(0, Math.max(remainingCount, 0))

  if (files.length > 0) {
    itemEditableMedia.value = ensureEditablePrimaryImageFirst([
      ...itemEditableMedia.value,
      ...files.map((file, index) => ({
        id: `new-${Date.now()}-${index}-${file.name}`,
        originalFileName: file.name,
        kind: file.type.startsWith('video/') ? 'video' as const : 'image' as const,
        previewUrl: URL.createObjectURL(file),
        source: 'new' as const,
        file,
      })),
    ])
  }

  target.value = ''
}

function removeEditableItemMedia(index: number) {
  const media = itemEditableMedia.value[index]
  if (!media) return

  if (media.source === 'existing' && media.filePublicId) {
    itemRemovedMediaPublicIds.value = [
      ...itemRemovedMediaPublicIds.value,
      media.filePublicId,
    ]
  } else if (media.source === 'new') {
    URL.revokeObjectURL(media.previewUrl)
  }

  itemEditableMedia.value = itemEditableMedia.value.filter((_, mediaIndex) => mediaIndex !== index)
}

function moveEditableItemMedia(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= itemEditableMedia.value.length) return

  const next = [...itemEditableMedia.value]
  const [media] = next.splice(index, 1)
  next.splice(nextIndex, 0, media)
  if (next[0]?.kind !== 'image') {
    showItemEditError(t('대표 미디어는 이미지 파일만 지정할 수 있습니다.', 'Primary media must be an image file.'))
    return
  }
  itemEditableMedia.value = next
}

function moveEditableItemMediaTo(fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex) return
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= itemEditableMedia.value.length ||
    toIndex >= itemEditableMedia.value.length
  ) return

  const next = [...itemEditableMedia.value]
  const [media] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, media)
  if (next[0]?.kind !== 'image') {
    showItemEditError(t('대표 미디어는 이미지 파일만 지정할 수 있습니다.', 'Primary media must be an image file.'))
    return
  }
  itemEditableMedia.value = next
}

function handleItemMediaDragStart(index: number, event: DragEvent) {
  itemDraggedMediaIndex.value = index
  event.dataTransfer?.setData('text/plain', String(index))
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

function handleItemMediaDrop(index: number, event: DragEvent) {
  event.preventDefault()
  const fromIndex = itemDraggedMediaIndex.value ?? Number(event.dataTransfer?.getData('text/plain'))
  if (Number.isInteger(fromIndex)) {
    moveEditableItemMediaTo(fromIndex, index)
  }
  itemDraggedMediaIndex.value = null
}

async function saveItemMediaEdit() {
  if (itemEditableMedia.value.length > 0 && itemEditableMedia.value[0]?.kind !== 'image') {
    showItemEditError(t('대표 미디어는 이미지 파일만 지정할 수 있습니다.', 'Primary media must be an image file.'))
    return false
  }

  const attachmentPublicId =
    data.value?.mediaAttachmentPublicId ||
    related.value.itemMediaAttachmentPublicId ||
    itemMediaFiles.value[0]?.attachmentPublicId

  const newMedia = itemEditableMedia.value.filter((media) => media.source === 'new' && media.file)
  const newMediaUploadIndex = new Map(newMedia.map((media, index) => [media.id, index]))
  const existingChanged =
    itemRemovedMediaPublicIds.value.length > 0 ||
    itemEditableMedia.value.some((media, index) => (
      media.source === 'existing' &&
      media.filePublicId &&
      itemMediaFiles.value[index]?.publicId !== media.filePublicId
    ))

  let savedFiles: ItemMediaFile[] | null = null

  if (attachmentPublicId) {
    if (existingChanged || newMedia.length > 0) {
      const response = await updateAttachment(
        attachmentPublicId,
        {
          files: [
            ...itemEditableMedia.value
              .map((media, index) => {
                if (media.source === 'existing') {
                  return {
                    filePublicId: media.filePublicId,
                    sortOrder: index + 1,
                    action: 'KEEP' as const,
                  }
                }

                return {
                  uploadIndex: newMediaUploadIndex.get(media.id),
                  sortOrder: index + 1,
                  action: 'ADD' as const,
                }
              })
              .filter((request) => (
                request.action === 'ADD' ||
                Boolean(request.filePublicId)
              )),
            ...itemRemovedMediaPublicIds.value.map((filePublicId) => ({
              filePublicId,
              action: 'DELETE' as const,
            })),
          ],
        },
        newMedia.map((media) => media.file as File),
      )
      savedFiles = normalizeItemMediaFiles(response.files)
      related.value.itemMediaAttachmentPublicId = response.attachmentPublicId
    }
  } else if (newMedia.length > 0) {
    const response = await uploadItemMedia(publicId.value, newMedia.map((media) => media.file as File))
    if (response) {
      savedFiles = normalizeItemMediaFiles(response.files)
      related.value.itemMediaAttachmentPublicId = response.attachmentPublicId
    }
  }

  const nextPrimaryFilePublicId =
    savedFiles?.[0]?.publicId ||
    itemEditableMedia.value[0]?.filePublicId ||
    ''

  if (nextPrimaryFilePublicId && data.value?.primaryMediaFilePublicId !== nextPrimaryFilePublicId) {
    await changeItemPrimaryMedia(publicId.value, nextPrimaryFilePublicId)
  }

  return true
}

async function handleEditItem() {
  if (!data.value) return

  if (hasConfirmedLinkedOrder.value) {
    itemLockedModalOpen.value = true
    return
  }

  itemEditErrorMessage.value = ''
  const capability = await getSupplierItemCapability(data.value.supplierPublicId, publicId.value).catch(() => null)

  itemEditForm.value = {
    itemName: display(data.value.itemName) === '-' ? '' : String(data.value.itemName),
    unitPrice: typeof data.value.unitPrice === 'number' ? data.value.unitPrice : null,
    spec: display(data.value.spec) === '-' ? '' : String(data.value.spec),
    shelfLifeDays: Number(data.value.shelfLifeDays ?? 0),
    status: data.value.status === 'DEACTIVE' ? 'DEACTIVE' : 'ACTIVE',
    leadTimeDays: Number(capability?.leadTimeDays ?? data.value.leadTimeDays ?? 0),
    monthlyCapacity: capability?.monthlyCapacity ?? data.value.monthlyCapacity ?? null,
    availableQty: capability?.availableQty ?? data.value.availableQty ?? null,
    moq: capability?.moq ?? data.value.moq ?? null,
    qualityGrade: capability?.qualityGrade ?? '',
    unitPriceHint: capability?.unitPriceHint ?? data.value.unitPrice ?? null,
    validFrom: capability?.validFrom ?? '',
    partialConfirmationAllowed: capability?.partialConfirmationAllowed ?? data.value.partialConfirmationAllowed ?? true,
  }

  resetEditableItemMedia()
  itemInlineEditMode.value = true
}


function closeItemEditModal() {
  itemEditModalOpen.value = false
  itemEditLoading.value = false
  itemEditErrorMessage.value = ''
  itemEditErrorModalOpen.value = false
}

function showItemEditError(message: string) {
  itemEditErrorMessage.value = message
  itemEditErrorModalOpen.value = true
}

function closeItemEditErrorModal() {
  itemEditErrorModalOpen.value = false
}

function openInventoryEditModal() {
  if (!data.value || !canEditCurrentInventory.value) return

  inventoryEditErrorMessage.value = ''
  inventoryEditForm.value = {
    manufacturedDate: String(data.value.manufacturedDate ?? ''),
    qty: typeof data.value.initialQty === 'number' ? data.value.initialQty : null,
    memo: String(data.value.memo ?? ''),
  }
  inventoryEditModalOpen.value = true
}

function closeInventoryEditModal() {
  inventoryEditModalOpen.value = false
  inventoryEditLoading.value = false
  inventoryEditErrorMessage.value = ''
}

function handleEditLogisticsNode() {
  if (!data.value) return

  logisticsEditErrorMessage.value = ''
  logisticsEditForm.value = {
    nodeName: String(data.value.nodeName ?? ''),
    baseAddress: String(data.value.baseAddress ?? data.value.address ?? ''),
    detailAddress: String(data.value.detailAddress ?? ''),
    capacityStatus: (data.value.capacityStatus ?? 'EMPTY') as LogisticsNodeCapacityStatus,
  }
  logisticsEditModalOpen.value = true
}

function closeLogisticsEditModal() {
  logisticsEditModalOpen.value = false
  logisticsEditLoading.value = false
  logisticsEditErrorMessage.value = ''
}

async function refreshLogisticsNodeHistories() {
  if (kind.value !== 'logistics-nodes' || !publicId.value) return

  const histories = await getLogisticsNodeHistories(publicId.value).catch(() => related.value.histories ?? [])
  related.value = {
    ...related.value,
    histories,
  }
  historyPage.value = 1
}

async function submitLogisticsEdit() {
  if (!data.value) return

  const nodeName = logisticsEditForm.value.nodeName.trim()

  if (!nodeName) {
    logisticsEditErrorMessage.value = t('창고명을 입력해 주세요.', 'Enter warehouse name.')
    return
  }

  try {
    logisticsEditLoading.value = true
    logisticsEditErrorMessage.value = ''

    data.value = await updateLogisticsNode(publicId.value, {
      nodeName,
      nodeType: 'WAREHOUSE',
      baseAddress: String(data.value.baseAddress ?? data.value.address ?? '').trim(),
      detailAddress: String(data.value.detailAddress ?? '').trim() || null,
      capacityStatus: logisticsEditForm.value.capacityStatus,
    })

    await refreshLogisticsNodeHistories()
    closeLogisticsEditModal()
  } catch (error: any) {
    logisticsEditErrorMessage.value = error?.message ?? t('창고 수정에 실패했습니다.', 'Failed to edit warehouse.')
  } finally {
    logisticsEditLoading.value = false
  }
}

async function toggleLogisticsNodeActive() {
  if (!data.value) return

  try {
    loading.value = true
    errorMessage.value = ''

    data.value = data.value.active
      ? await deactivateLogisticsNode(publicId.value)
      : await activateLogisticsNode(publicId.value)
    await refreshLogisticsNodeHistories()
  } catch (error: any) {
    errorMessage.value = error?.message ?? t('활성 상태 변경에 실패했습니다.', 'Failed to update active status.')
  } finally {
    loading.value = false
  }
}

async function submitItemEdit() {
  if (!data.value) return

  if (hasConfirmedLinkedOrder.value) {
    showItemEditError(t(
      '확정된 발주가 연결된 품목은 수정할 수 없습니다.',
      'Items linked to confirmed purchase orders cannot be edited.',
    ))
    return
  }

  const nextName = itemEditForm.value.itemName.trim()
  const nextSpec = itemEditForm.value.spec.trim()
  if (!nextName || !nextSpec) {
    showItemEditError(t('품목명과 규격을 입력해 주세요.', 'Enter item name and spec.'))
    return
  }
  if (!isPositiveInteger(itemEditForm.value.unitPrice)) {
    showItemEditError(t('단가는 1 이상의 정수로 입력해 주세요.', 'Unit price must be a positive integer.'))
    return
  }
  if (!isPositiveInteger(itemEditForm.value.monthlyCapacity)) {
    showItemEditError(t('월간 생산량은 1 이상의 정수로 입력해 주세요.', 'Monthly capacity must be a positive integer.'))
    return
  }
  if (!isPositiveInteger(itemEditForm.value.availableQty)) {
    showItemEditError(t('주문 가능 수량은 1 이상의 정수로 입력해 주세요.', 'Available quantity must be a positive integer.'))
    return
  }
  if (!isPositiveInteger(itemEditForm.value.moq)) {
    showItemEditError(t('최소 주문 수량은 1 이상의 정수로 입력해 주세요.', 'MOQ must be a positive integer.'))
    return
  }

  try {
    itemEditLoading.value = true
    itemEditErrorMessage.value = ''

    const nextUnitPrice = Number(itemEditForm.value.unitPrice ?? data.value.unitPrice ?? 0)
    const nextShelfLifeDays = Number(itemEditForm.value.shelfLifeDays)
    const masterChanged =
      nextName !== String(data.value.itemName ?? '') ||
      nextSpec !== String(data.value.spec ?? '') ||
      nextUnitPrice !== Number(data.value.unitPrice ?? 0) ||
      nextShelfLifeDays !== Number(data.value.shelfLifeDays ?? 0)

    if (masterChanged) {
      const originLogisticsNodePublicId = String(data.value.originLogisticsNodePublicId ?? '').trim()

      if (!originLogisticsNodePublicId) {
        showItemEditError(t(
          '출발 창고 정보가 없어 품목 기본정보를 수정할 수 없습니다.',
          'Origin logistics node is required to edit item master data.',
        ))
        return
      }

      await updateItem(publicId.value, {
        itemCategoryPublicId: data.value.itemCategoryPublicId,
        supplyType: data.value.supplyType,
        itemName: nextName,
        unitPrice: nextUnitPrice,
        unit: data.value.unit,
        spec: nextSpec,
        shelfLifeDays: nextShelfLifeDays,
        originLogisticsNodePublicId,
      })
    }

    await updateSupplierItemCapability(data.value.supplierPublicId, publicId.value, {
      leadTimeDays: Number(itemEditForm.value.leadTimeDays),
      monthlyCapacity: itemEditForm.value.monthlyCapacity,
      availableQty: itemEditForm.value.availableQty,
      moq: itemEditForm.value.moq,
      qualityGrade: itemEditForm.value.qualityGrade || null,
      unitPriceHint: itemEditForm.value.unitPriceHint,
      validFrom: itemEditForm.value.validFrom || null,
      partialConfirmationAllowed: itemEditForm.value.partialConfirmationAllowed,
    })

    if (data.value.status !== itemEditForm.value.status) {
      await changeItemStatus(publicId.value, {
        status: itemEditForm.value.status,
      })
    }

    const itemMediaSaved = await saveItemMediaEdit()
    if (!itemMediaSaved) return

    await fetchDetail()
    itemInlineEditMode.value = false

  } catch (error: any) {
    showItemEditError(error?.message ?? t('품목 수정에 실패했습니다.', 'Failed to edit item.'))
  } finally {
    itemEditLoading.value = false
  }
}

function cancelInlineItemEdit() {
  itemEditableMedia.value.forEach((media) => {
    if (media.source === 'new') URL.revokeObjectURL(media.previewUrl)
  })
  itemInlineEditMode.value = false
  itemEditErrorMessage.value = ''
}

async function submitInventoryEdit() {
  if (!data.value || kind.value !== 'inventory') return

  if (!inventoryEditForm.value.manufacturedDate) {
    inventoryEditErrorMessage.value = t('제조일을 입력해 주세요.', 'Enter manufactured date.')
    return
  }
  if (!isPositiveInteger(inventoryEditForm.value.qty)) {
    inventoryEditErrorMessage.value = t('수량은 1 이상의 정수로 입력해 주세요.', 'Quantity must be a positive integer.')
    return
  }

  try {
    inventoryEditLoading.value = true
    inventoryEditErrorMessage.value = ''

    await updateInventory(publicId.value, {
      logisticsNodePublicId: data.value.logisticsNodePublicId,
      manufacturedDate: inventoryEditForm.value.manufacturedDate,
      qty: Number(inventoryEditForm.value.qty),
      memo: inventoryEditForm.value.memo.trim() || null,
    })

    await fetchDetail()
    closeInventoryEditModal()
  } catch (error: any) {
    inventoryEditErrorMessage.value = error?.message ?? t('재고 수정에 실패했습니다.', 'Failed to edit inventory.')
  } finally {
    inventoryEditLoading.value = false
  }
}


function rowKey(row: any, index: number) {
  return row.publicId ?? row.poItemPublicId ?? row.itemPublicId ?? row.id ?? `${index}`
}

async function fetchDetail() {
  loading.value = true
  errorMessage.value = ''
  data.value = null
  related.value = {}

  try {
    if (kind.value === 'orders') {
      data.value = await getPurchaseOrder(publicId.value)
    } else if (kind.value === 'sub-orders') {
      data.value = await getSubPurchaseOrder(publicId.value)
    } else if (kind.value === 'shipments') {
      const [detail, eta, histories] = await Promise.all([
        getShipment(publicId.value),
        getShipmentEta(publicId.value).catch(() => null),
        getShipmentStatusHistories(publicId.value).catch(() => []),
      ])
      data.value = detail as Record<string, any>
      related.value = { eta, histories }
    } else if (kind.value === 'returns') {
      const [detail, histories] = await Promise.all([
        getReturnRequest(publicId.value),
        getReturnHistories(publicId.value).catch(() => []),
      ])

      // 원출하 상세 정보 조회
      let sourceShipment = null
      if (detail.sourceShipmentPublicId) {
        sourceShipment = await getShipment(detail.sourceShipmentPublicId).catch(() => null)
      }

      // 품목 코드 조회를 위해 병렬 처리
      const itemsWithCode = await Promise.all(
        detail.items.map(async (item) => {
          const itemDetail = await getItem(item.itemPublicId).catch(() => null)
          return {
            ...item,
            itemCode: itemDetail?.itemCode,
          }
        })
      )
      detail.items = itemsWithCode

      // 사용자 이름 조회를 위해 병렬 처리
      const userPublicIdsToFetch = new Set<string>()
      if (detail.createdByUserPublicId) userPublicIdsToFetch.add(detail.createdByUserPublicId)
      histories.forEach((h: any) => {
        if (h.recordedBy) userPublicIdsToFetch.add(h.recordedBy)
      })

      await Promise.all(
        Array.from(userPublicIdsToFetch).map(async (uid) => {
          if (!userNamesMap.value[uid]) {
            const userDetail = await getUserDetailByPublicId(uid).catch(() => null)
            if (userDetail) {
              const name = `${userDetail.lastName || ''}${userDetail.firstName || ''}`.trim()
              userNamesMap.value[uid] = name || uid
            }
          }
        })
      )

      const attachmentPublicIds = [
        ...(detail.attachmentPublicIds || []),
        ...detail.items.flatMap((item: any) => item.attachmentPublicIds || [])
      ].filter((v, i, a) => a.indexOf(v) === i)

      const returnAttachments = (await Promise.all(
        attachmentPublicIds.map(id => getAttachment(id).catch(() => null))
      )).filter(Boolean)

      const refAttachment = await getAttachmentByRef('RETURN_REQUEST', publicId.value).catch(() => null)
      if (refAttachment && !returnAttachments.find((a: any) => a.attachmentPublicId === refAttachment.attachmentPublicId)) {
        returnAttachments.push(refAttachment)
      }

      data.value = detail as Record<string, any>
      related.value = { histories, sourceShipment, returnAttachments }
    } else if (kind.value === 'inventory') {
      const detail = await getInventory(publicId.value)
      const itemInventories = await getItemInventories(detail.itemPublicId).catch(() => [detail])

      data.value = detail as Record<string, any>
      related.value = { itemInventories }
    } else if (kind.value === 'items') {
      const [itemDetail, linkedOrders] = await Promise.all([
        getItem(publicId.value).catch(async () => {
          const managedPage = await getManagedItems(0, 500)
          const managedItem = managedPage.content.find((row) => row.publicId === publicId.value)
          if (!managedItem) throw new Error('조회 가능한 품목이 아닙니다.')
          return managedItem
        }),
        getManagedItemLinkedOrders(publicId.value).catch(() => []),
      ])

      const detail = itemDetail as Record<string, any>
      const itemCapability = detail.supplierPublicId
        ? await getSupplierItemCapability(detail.supplierPublicId, detail.publicId).catch(() => null)
        : null
      const detailWithCapability = itemCapability
        ? {
            ...detail,
            leadTimeDays: itemCapability.leadTimeDays ?? detail.leadTimeDays,
            monthlyCapacity: itemCapability.monthlyCapacity ?? detail.monthlyCapacity,
            availableQty: itemCapability.availableQty ?? detail.availableQty,
            moq: itemCapability.moq ?? detail.moq,
            qualityGrade: itemCapability.qualityGrade ?? detail.qualityGrade,
            partialConfirmationAllowed: itemCapability.partialConfirmationAllowed ?? detail.partialConfirmationAllowed,
            unitPriceHint: itemCapability.unitPriceHint ?? detail.unitPriceHint,
          }
        : detail

      const mediaFromDetail = itemMediaFilesFromItem(detailWithCapability as any)
      const mediaAttachment = mediaFromDetail.length
        ? null
        : await getItemMediaAttachment(publicId.value)
      const media = mediaFromDetail.length
        ? mediaFromDetail
        : mediaAttachment
          ? normalizeItemMediaFiles(mediaAttachment.files)
          : detailWithCapability.primaryMediaFilePublicId
            ? await getItemMedia(publicId.value)
            : []

      data.value = detailWithCapability as Record<string, any>
      related.value = {
        linkedOrders,
        itemCapability,
        itemMedia: media,
        itemMediaAttachmentPublicId: mediaAttachment?.attachmentPublicId ?? detailWithCapability.mediaAttachmentPublicId,
      }
    } else if (kind.value === 'suppliers') {
      const [detail, capabilities] = await Promise.all([
        getSupplier(publicId.value),
        getSupplierItemCapabilities(publicId.value).catch(() => []),
      ])
      data.value = detail as Record<string, any>
      related.value = { capabilities }
    } else if (kind.value === 'logistics-nodes') {
      const [detail, nodeInventories, histories] = await Promise.all([
        getLogisticsNode(publicId.value),
        getNodeInventories(publicId.value).catch(() => []),
        getLogisticsNodeHistories(publicId.value).catch(() => []),
      ])
      data.value = detail as Record<string, any>
      related.value = { nodeInventories, histories }
    } else if (kind.value === 'settlements') {
      data.value = await getSettlement(publicId.value)
    } else if (kind.value === 'certificates') {
      const [detail, histories] = await Promise.all([
        getCertificate(publicId.value),
        getCertificateHistories(publicId.value).catch(() => []),
      ])
      data.value = detail as Record<string, any>
      const attachment = detail.attachmentPublicId
        ? await getAttachment(detail.attachmentPublicId).catch(() => null)
        : null
      related.value = { histories, attachment }
    }
  } catch (error: any) {
    errorMessage.value = error?.message ?? detailCopy.value.loadFail
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.push({ name: config.value.listRoute })
}

const certificateFiles = computed<AttachmentFileDto[]>(() => {
  const files = related.value.attachment?.files
  return Array.isArray(files) ? files : []
})

const returnProofFiles = computed<AttachmentFileDto[]>(() => {
  if (!related.value.returnAttachments) return []
  return related.value.returnAttachments.flatMap((att: any) => att.files || [])
})

const itemMediaFiles = computed<ItemMediaFile[]>(() => {
  const files = related.value.itemMedia
  if (!Array.isArray(files)) return []

  const mediaFiles = [...files]
  if (mediaFiles.length <= 1 || mediaFiles[0]?.kind === 'image') return mediaFiles

  const primaryImageIndex = mediaFiles.findIndex((file) => (
    file.kind === 'image' &&
    itemMediaPublicId(file) === data.value?.primaryMediaFilePublicId
  ))
  const firstImageIndex = primaryImageIndex >= 0
    ? primaryImageIndex
    : mediaFiles.findIndex((file) => file.kind === 'image')

  if (firstImageIndex <= 0) return mediaFiles

  const [firstImage] = mediaFiles.splice(firstImageIndex, 1)
  mediaFiles.unshift(firstImage)
  return mediaFiles
})

const itemMediaCount = computed(() => (
  itemInlineEditMode.value ? itemEditableMedia.value.length : itemMediaFiles.value.length
))

const canAddItemMedia = computed(() => itemEditableMedia.value.length < ITEM_MEDIA_MAX_UPLOAD_COUNT)

function openItemMediaViewer(index: number) {
  itemMediaViewerIndex.value = index
  itemMediaViewerOpen.value = true
}

function closeItemMediaViewer() {
  itemMediaViewerOpen.value = false
}

function nextItemMedia() {
  if (itemMediaViewerIndex.value < itemMediaFiles.value.length - 1) {
    itemMediaViewerIndex.value += 1
  }
}

function prevItemMedia() {
  if (itemMediaViewerIndex.value > 0) {
    itemMediaViewerIndex.value -= 1
  }
}

function fileLink(file: AttachmentFileDto) {
  return file.fileUrl ?? file.filePath ?? ''
}

function formatFileSize(size: unknown) {
  if (typeof size !== 'number') return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

watch(() => [kind.value, publicId.value], fetchDetail, { immediate: true })
watch(() => [kind.value, publicId.value], () => {
  historyPage.value = 1
})
watch(historyTotalPages, (totalPages) => {
  if (historyPage.value > totalPages) historyPage.value = totalPages
})
watch(
  () => [kind.value, publicId.value],
  ([currentKind, currentPublicId]) => {
    if (!currentKind || !currentPublicId) return
    void sidebarBadges.markDetailViewed(DETAIL_BADGE_KEY_BY_KIND[currentKind as DetailKind], currentPublicId)
  },
  { immediate: true },
)
</script>

<template>
  <section class="app-screen terminal-page operation-detail-page">
    <header class="terminal-page__header operation-detail-page__header">
      <div>
        <p class="terminal-page__eyebrow">{{ config.eyebrow }}</p>
        <h1 class="terminal-page__title">{{ title }}</h1>
      </div>
      <div class="operation-detail-page__actions">
        <button
          v-if="kind === 'items' && !itemInlineEditMode"
          class="page-button page-button--primary"
          type="button"
          @click="handleEditItem"
        >
          수정
        </button>
        <template v-else-if="kind === 'items' && itemInlineEditMode">
          <button class="page-button page-button--secondary" type="button" @click="cancelInlineItemEdit">
            {{ t('취소', 'Cancel') }}
          </button>
          <button class="page-button page-button--primary" type="button" :disabled="itemEditLoading" @click="submitItemEdit">
            {{ itemEditLoading ? t('저장 중', 'Saving') : t('저장', 'Save') }}
          </button>
        </template>
        <button
          v-if="!itemInlineEditMode && kind !== 'logistics-nodes'"
          class="page-button page-button--secondary"
          type="button"
          @click="goBack"
        >
          {{ detailCopy.backToList }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="page-panel operation-detail-page__state">{{ detailCopy.loading }}</div>
    <div v-else-if="errorMessage" class="page-panel operation-detail-page__state operation-detail-page__state--error">
      {{ errorMessage }}
    </div>

    <template v-else-if="data && hasDomainLayout">
      <div class="operation-detail-page__domain-shell">
        <main v-if="kind === 'orders' || kind === 'sub-orders'" class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <article class="operation-detail-page__doc-hero">
              <div>
                <p>{{ detailLabel }}</p>
                <h2>{{ title }}</h2>
              </div>
              <span :class="['operation-detail-page__status', `is-${statusTone}`]">{{ displayStatus(status || 'CONFIRMED') }}</span>
              <dl>
                <div><dt>{{ detailCopy.order.orderDate }}</dt><dd>{{ formatDate(data.orderedAt ?? data.createdAt) }}</dd></div>
                <div><dt>{{ detailCopy.order.requestedDue }}</dt><dd>{{ display(orderItems[0]?.expectedDueDate) }}</dd></div>
                <div><dt>{{ detailCopy.order.currency }}</dt><dd>원화</dd></div>
                <div><dt>{{ detailCopy.order.totalAmount }}</dt><dd>{{ formatAmount(data.totalAmount, data.currencyCode) }}</dd></div>
              </dl>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ detailCopy.order.basicInfo }}</h3>
              <dl class="operation-detail-page__kv-grid is-two-col">
                <div><dt>{{ detailCopy.order.buyerOrg }}</dt><dd>{{ display(data.buyerOrganizationName ?? '구매 조직') }}</dd></div>
                <div><dt>{{ detailCopy.order.docType }}</dt><dd>표준 발주</dd></div>
                <div><dt>{{ detailCopy.order.supplier }}</dt><dd>{{ display(data.supplierName) }}</dd></div>
                <div><dt>{{ detailCopy.order.shipTo }}</dt><dd>{{ display(orderItems[0]?.arrivalLogisticsNodeName ?? orderItems[0]?.arrivalLogisticsNodeAddress) }}</dd></div>
                <div><dt>{{ detailCopy.order.owner }}</dt><dd>{{ formatActor(data.createdByUserPublicId) }}</dd></div>
                <div><dt>{{ detailCopy.order.shippingMethod }}</dt><dd>해상 운송</dd></div>
                <div><dt>{{ detailCopy.order.paymentTerms }}</dt><dd>30일 후 지급</dd></div>
                <div><dt>{{ detailCopy.order.memo }}</dt><dd>{{ display(data.memo) }}</dd></div>
              </dl>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ detailCopy.order.items }} ({{ orderItems.length }})</h3>
              <table class="operation-detail-page__domain-table">
                <thead><tr><th>번호</th><th>품목 코드</th><th>품목명</th><th>규격</th><th>단위</th><th>{{ detailCopy.common.qty }}</th><th>단가</th><th>{{ detailCopy.common.amount }}</th><th>{{ detailCopy.order.requestedDue }}</th></tr></thead>
                <tbody>
                  <tr v-for="(item, index) in orderItems" :key="rowKey(item, index)">
                    <td>{{ index + 1 }}</td>
                    <td>{{ display(item.itemCode) }}</td>
                    <td>{{ display(item.itemName) }}</td>
                    <td>{{ display(item.specification ?? 'SPCC 1.2t') }}</td>
                    <td>{{ display(item.unit) }}</td>
                    <td>{{ formatNumber(item.orderedQty) }}</td>
                    <td>{{ formatAmount(item.unitPrice, data.currencyCode) }}</td>
                    <td>{{ formatAmount(item.lineAmount, data.currencyCode) }}</td>
                    <td>{{ display(item.expectedDueDate) }}</td>
                  </tr>
                </tbody>
              </table>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ detailCopy.order.changeHistory }}</h3>
              <table class="operation-detail-page__domain-table">
                <tbody>
                  <tr><th>{{ detailCopy.order.requestedDueChange }}</th><td>{{ display(orderItems[0]?.expectedDueDate) }}</td><td>→</td><td>2026-05-20</td><td>{{ detailCopy.order.dueChangeReason }}</td></tr>
                  <tr><th>{{ detailCopy.order.quantityChange }}</th><td>{{ formatNumber(orderItems.reduce((sum: number, item: any) => sum + Number(item.orderedQty ?? 0), 0)) }}</td><td>→</td><td>1,500</td><td>{{ detailCopy.order.qtyChangeReason }}</td></tr>
                  <tr><th>{{ detailCopy.order.paymentTermsChange }}</th><td>30일 후 지급</td><td>→</td><td>30일 후 지급</td><td>-</td></tr>
                </tbody>
              </table>
            </article>

            <div class="operation-detail-page__bottom-actions">
              <button class="page-button page-button--secondary" type="button" @click="goBack">
                {{ detailCopy.backToList }}
              </button>

              <span></span>

              <template v-if="canAcceptOrRejectOrder">
                <button class="page-button page-button--secondary" type="button" @click="handleRejectOrder">
                  반려
                </button>
                <button class="page-button page-button--primary" type="button" @click="openConfirmOrderModal">
                  수락
                </button>

              </template>

              <button
                v-else-if="canEditOrder && !isAcceptedOrder"
                class="page-button page-button--primary"
                type="button"
                @click="handleEditOrder"
              >
                수정
              </button>
            </div>

          </section>

          <aside class="operation-detail-page__analysis-panel">
            <div class="operation-detail-page__panel-head"><h2>{{ detailCopy.order.aiTitle }}</h2><span>×</span></div>
            <div class="operation-detail-page__risk-band"><span>{{ detailCopy.order.risk }}</span><strong>{{ riskLevel }}</strong><p>{{ aiSummary }}</p></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.subOrders }}</strong><span>높음</span><small>{{ detailCopy.order.impactCount(3) }}</small></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.shipments }}</strong><span>높음</span><small>{{ detailCopy.order.impactCount(2) }}</small></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.inventory }}</strong><span>보통</span><small>{{ detailCopy.order.impactCount(5) }}</small></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.supplierImpact }}</strong><span>보통</span><small>{{ detailCopy.order.impactCount(2) }}</small></div>
            <section><h3>{{ detailCopy.order.aiSummaryTitle }}</h3><p>{{ detailCopy.order.aiSummaryText }}</p></section>
            <section><h3>{{ detailCopy.order.communicationDraft }}</h3><p>{{ detailCopy.order.communicationText }}</p></section>
          </aside>
        </main>

        <main v-else-if="kind === 'shipments'" class="operation-detail-page__shipment-layout">
          <section class="operation-detail-page__shipment-summary-strip">
            <article class="operation-detail-page__shipment-summary-card operation-detail-page__shipment-summary-card--title">
              <div class="operation-detail-page__shipment-icon-tile"><span class="material-symbols-outlined">local_shipping</span></div>
              <div>
                <h2>{{ title }}</h2>
                <strong>{{ t('출하 상세', 'Shipment Detail') }}</strong>
              </div>
            </article>
            <article class="operation-detail-page__shipment-summary-card">
              <span>출하 지연</span>
              <strong class="is-alert">{{ shipmentDelayEtaText }}</strong>
              <small>{{ t('지연 발생', 'Delay Detected') }}</small>
            </article>
            <article class="operation-detail-page__shipment-summary-card operation-detail-page__shipment-summary-card--nodes">
              <dl>
                <div><dt>현재 거점</dt><dd>{{ display(data.currentNodeName ?? data.currentNodeCode) }}</dd></div>
                <div><dt>목적지</dt><dd>{{ display(data.destinationNodeName ?? data.destinationNodeCode) }}</dd></div>
              </dl>
            </article>
            <article class="operation-detail-page__shipment-summary-card operation-detail-page__shipment-summary-card--eta">
              <dl>
                <div><dt>출발 예정</dt><dd>{{ shipmentDepartureEta }}</dd></div>
                <div><dt>도착 예정</dt><dd>{{ shipmentArrivalEta }}</dd></div>
              </dl>
            </article>
          </section>

          <section class="operation-detail-page__shipment-content-grid">
            <section class="operation-detail-page__shipment-main-column">
              <article class="operation-detail-page__shipment-card">
                <h3>{{ t('출하 경로 및 지연 현황', 'Shipment Route and Delay Status') }}</h3>
                <table class="operation-detail-page__shipment-table">
                  <thead>
                    <tr><th>순번</th><th>거점</th><th>{{ t('도착 ETA', 'Arrival ETA') }}</th><th>{{ t('지연 (분)', 'Delay (Min)') }}</th><th>{{ detailCopy.common.status }}</th><th>{{ t('관련 발주', 'Related Order') }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in shipmentPathRows" :key="row.seq">
                      <td>{{ row.seq }}</td>
                      <td>{{ row.node }}</td>
                      <td>{{ row.eta }}</td>
                      <td :class="{ 'is-delay': row.delay !== '0' }">{{ row.delay }}</td>
                      <td><span :class="['operation-detail-page__shipment-status', `is-${row.statusCode}`]">{{ row.status }}</span></td>
                      <td>{{ row.order }}</td>
                    </tr>
                  </tbody>
                </table>
              </article>

              <article class="operation-detail-page__shipment-card">
                <h3>{{ t('영향 받는 발주', 'Affected Purchase Orders') }}</h3>
                <table class="operation-detail-page__shipment-table operation-detail-page__shipment-table--affected">
                  <thead>
                    <tr><th>{{ t('발주번호', 'PO No.') }}</th><th>{{ detailCopy.common.item }}</th><th>{{ detailCopy.common.qty }}</th><th>{{ detailCopy.order.requestedDue }}</th><th>{{ t('지연 영향', 'Delay Impact') }}</th><th>{{ t('우선순위', 'Priority') }}</th></tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in shipmentAffectedRows" :key="row.order">
                      <td>{{ row.order }}</td>
                      <td>{{ row.item }}</td>
                      <td>{{ row.qty }}</td>
                      <td>{{ row.due }}</td>
                      <td>{{ row.impact }}</td>
                      <td><span :class="['operation-detail-page__chip', `is-${row.priority.toLowerCase()}`]">{{ row.priority }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </article>
            </section>

            <aside class="operation-detail-page__shipment-ai-panel">
              <div class="operation-detail-page__shipment-ai-head">
                <div>
                  <h2>{{ t('AI 배송 지연 권고', 'AI Shipment Delay Recommendation') }}</h2>
                  <p>{{ t('현재 지연 원인을 분석하고 다음과 같은 대응 방안을 권고합니다.', 'Current delay causes were analyzed and the following actions are recommended.') }}</p>
                </div>
                <small>{{ t('권고안 생성됨', 'Recommendation Generated') }} <b>04. 28. 16:08:25</b></small>
              </div>

              <article v-for="(row, index) in shipmentRecommendationRows" :key="row.title" class="operation-detail-page__shipment-recommendation">
                <div class="operation-detail-page__shipment-recommendation-title">{{ index + 1 }}. {{ row.title }}</div>
                <div class="operation-detail-page__shipment-recommendation-icon"><span class="material-symbols-outlined">{{ row.icon }}</span></div>
                <div class="operation-detail-page__shipment-recommendation-priority">
                  <span :class="['operation-detail-page__chip', `is-${row.priority.toLowerCase()}`]">{{ row.priority }}</span>
                </div>
                <p class="operation-detail-page__shipment-recommendation-reason">{{ row.reason }}</p>
                <p class="operation-detail-page__shipment-recommendation-action">{{ row.action }}</p>
                <strong class="operation-detail-page__shipment-recommendation-confidence">{{ row.confidence }}</strong>
                <div class="operation-detail-page__shipment-recommendation-actions">
                  <button class="page-button page-button--secondary" type="button">{{ t('상세 보기', 'View Detail') }}</button>
                  <button class="page-button page-button--primary" type="button">{{ t('수락', 'Accept') }}</button>
                  <button class="page-button page-button--secondary" type="button">{{ t('거절', 'Reject') }}</button>
                </div>
              </article>

              <footer class="operation-detail-page__shipment-ai-foot">
                <span class="material-symbols-outlined">info</span>
                <p>{{ t('AI 권고는 과거 데이터와 실시간 이벤트를 기반으로 생성되며, 최종 결정은 담당자 판단에 따릅니다.', 'AI recommendations are generated from historical data and realtime events. Final decisions remain with the operator.') }}</p>
                <button class="page-button page-button--secondary" type="button">{{ t('분석 로그 보기', 'View Analysis Log') }}</button>
              </footer>
            </aside>
          </section>
        </main>

        <main v-else-if="kind === 'returns'" class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <article class="operation-detail-page__doc-hero">
              <div><p>반품 요청</p><h2>{{ title }}</h2></div>
              <span :class="['operation-detail-page__status', `is-${statusTone}`]">{{ displayReturnStatus(status || 'REJECTED') }}</span>
              <dl>
                <div><dt>{{ t('요청일시', 'Requested At') }}</dt><dd>{{ formatDate(data.requestedAt ?? data.createdAt) }}</dd></div>
                <div><dt>{{ t('요청자', 'Requester') }}</dt><dd>{{ formatActor(data.createdByUserPublicId) }}</dd></div>
                <div><dt>{{ t('원출하', 'Source Shipment') }}</dt><dd>{{ display(related.sourceShipment?.shipmentNumber ?? (data.sourceShipmentPublicId ? '원출하 정보' : '-')) }}</dd></div>
                <div><dt>{{ t('사유 코드', 'Reason Code') }}</dt><dd>{{ displayReturnType(data.returnType) }}</dd></div>
                <div><dt>{{ t('우선순위', 'Priority') }}</dt><dd>높음</dd></div>
                <div><dt>{{ t('처리 방식', 'Resolution Type') }}</dt><dd>{{ displayResolutionType(data.resolutionType) }}</dd></div>
              </dl>
            </article>
            <article class="operation-detail-page__domain-card operation-detail-page__process">
              <h3>{{ t('반품 진행 상태', 'Return Progress') }}</h3>
              <div class="operation-detail-page__timeline">
                <div v-for="step in processSteps" :key="step.label" :class="['operation-detail-page__timeline-step', `is-${step.state}`]"><span class="operation-detail-page__timeline-node"></span><strong>{{ step.label }}</strong><small>{{ step.meta }}</small></div>
              </div>
            </article>
            <article class="operation-detail-page__domain-card">
              <h3>{{ t('반품 품목 및 클레임 정보', 'Return Items and Claims') }}</h3>
              <table class="operation-detail-page__domain-table">
                <thead><tr><th>#</th><th>{{ t('품목 코드', 'Item Code') }}</th><th>{{ t('품목명', 'Item Name') }}</th><th>{{ t('반품 수량', 'Return Qty') }}</th><th>{{ t('단위', 'Unit') }}</th><th>{{ t('클레임 사유', 'Claim Reason') }}</th><th>{{ t('판정', 'Decision') }}</th></tr></thead>
                <tbody><tr v-for="(item, index) in returnItems" :key="rowKey(item, index)"><td>{{ index + 1 }}</td><td>{{ display(item.itemCode ?? '품목 코드 없음') }}</td><td>{{ display(item.itemName) }}</td><td>{{ formatNumber(item.returnQty) }}</td><td>{{ display(item.unit) }}</td><td>{{ display(item.detailReason) }}</td><td>{{ displayStatus(item.itemStatus) }}</td></tr></tbody>
              </table>
            </article>
            <article class="operation-detail-page__domain-card">
              <h3>{{ t('반품 증빙 사진', 'Return Proof Photos') }}</h3>
              <div v-if="returnProofFiles.length === 0" class="page-table__empty">{{ t('첨부된 증빙 사진이 없습니다.', 'No attached proof photos.') }}</div>
              <div v-else class="operation-detail-page__proof-gallery">
                <a v-for="file in returnProofFiles" :key="file.publicId" :href="fileLink(file)" target="_blank" rel="noreferrer">
                  <img v-if="file.contentType?.startsWith('image/')" :src="fileLink(file)" :alt="file.originalFileName" />
                  <span v-else class="material-symbols-outlined">description</span>
                </a>
              </div>
            </article>
            <article class="operation-detail-page__domain-card"><h3>{{ detailCopy.common.history }}</h3><table class="operation-detail-page__domain-table"><tbody><tr v-for="(row, index) in historyRows" :key="rowKey(row, index)"><td>{{ formatDate(row.recordedAt ?? row.createdAt) }}</td><td>{{ kind === 'returns' ? displayReturnStatus(row.afterStatus ?? row.statusCode) : display(row.afterStatus ?? row.statusCode) }}</td><td>{{ kind === 'returns' ? formatActor(row.recordedBy ?? row.processedByUserPublicId) : display(row.recordedBy ?? row.processedByUserPublicId) }}</td><td>{{ display(row.reason ?? row.memo) }}</td></tr></tbody></table></article>

            <!-- 반품 상태 변경 -->
            <article v-if="returnNextActions.length > 0" class="operation-detail-page__domain-card operation-detail-page__return-actions">
              <h3>{{ t('상태 변경', 'Change Status') }}</h3>
              <p class="operation-detail-page__return-status-label">
                {{ t('현재 상태', 'Current Status') }}: <strong>{{ displayReturnStatus(returnStatus) }}</strong>
                <span v-if="resolutionType">({{ displayResolutionType(resolutionType) }})</span>
              </p>
              <label class="operation-detail-page__return-reason">
                <span>{{ t('사유', 'Reason') }}</span>
                <input v-model="returnReasonText" type="text" :placeholder="t('사유를 입력하세요 (선택)', 'Enter reason (optional)')" />
              </label>
              <div class="operation-detail-page__return-buttons">
                <button
                  v-for="action in returnNextActions"
                  :key="action.status"
                  :class="['page-button', `page-button--${action.tone}`]"
                  type="button"
                  :disabled="isReturnUpdating"
                  @click="handleReturnStatusChange(action.status)"
                >
                  {{ isReturnUpdating ? t('처리 중...', 'Processing...') : action.label }}
                </button>
              </div>
            </article>
          </section>
          <aside class="operation-detail-page__analysis-panel"><div class="operation-detail-page__panel-head"><h2>{{ t('AI 반품/클레임 분석', 'AI Return / Claim Analysis') }}</h2><span>−</span></div><section><h3>{{ t('반품 사유 요약', 'Return Reason Summary') }}</h3><p>{{ t(`총 ${returnItems.length}개 품목 중 주요 사유는 표면 손상과 치수 불량입니다.`, `Primary reasons across ${returnItems.length} items are surface damage and dimension defects.`) }}</p></section><section><h3>{{ t('AI 권고 사항', 'AI Recommendations') }}</h3><dl class="operation-detail-page__kv-grid"><div><dt>{{ t('권고 액션', 'Recommended Action') }}</dt><dd>{{ t('교체 출고', 'Replacement Shipment') }}</dd></div><div><dt>{{ t('이유', 'Reason') }}</dt><dd>{{ t('손상 및 구성품 확인 후 고객 영향 최소화', 'Minimize customer impact after damage and component checks') }}</dd></div><div><dt>{{ t('다음 담당', 'Next Owner') }}</dt><dd>{{ t('구매팀', 'Purchasing Team') }}</dd></div><div><dt>{{ t('목표 기한', 'Target Due') }}</dt><dd>2026-04-29 18:00</dd></div></dl></section><section><h3>{{ detailCopy.common.checklist }}</h3><ul class="operation-detail-page__checklist"><li>{{ t('검수 결과 확인 및 기록', 'Confirm and record inspection results') }}</li><li>{{ t('원인 분석 및 사진/증빙 확보', 'Analyze cause and collect photos/evidence') }}</li><li>{{ t('교체 출고 또는 환불 검토', 'Review replacement shipment or refund') }}</li></ul></section><div class="operation-detail-page__action-list"><button class="page-button page-button--primary" type="button">{{ t('교체 출고 생성', 'Create Replacement Shipment') }}</button><button class="page-button page-button--secondary" type="button">{{ t('환불 검토', 'Review Refund') }}</button><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.notifyOwner }}</button></div></aside>
        </main>

        <main v-else-if="kind === 'suppliers'" class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <article class="operation-detail-page__supplier-head"><div><p>협력사 상세</p><h2>{{ display(data.supplierName) }}</h2></div><dl><div><dt>협력사 코드</dt><dd>{{ display(data.supplierCode ?? data.supplierName ?? '협력사') }}</dd></div><div><dt>업종</dt><dd>식품 제조</dd></div><div><dt>국가</dt><dd>대한민국</dd></div><div><dt>리스크 점수</dt><dd>72 / 100 <span class="operation-detail-page__chip is-high">고위험</span></dd></div><div><dt>최종 수정</dt><dd>{{ formatDate(data.updatedAt) }}</dd></div></dl></article>
            <section class="operation-detail-page__metric-row"><div><span>협력사 등급</span><strong>B</strong></div><div><span>ESG 점수</span><strong>68 / 100</strong></div><div><span>정시 납품률</span><strong>92.1%</strong></div><div><span>품질 점수</span><strong>84 / 100</strong></div><div><span>활성 발주</span><strong>{{ t('12건', '12') }}</strong></div></section>
            <article class="operation-detail-page__domain-card"><h3>인증서 상태</h3><table class="operation-detail-page__domain-table"><thead><tr><th>인증명</th><th>인증서 번호</th><th>발급일</th><th>만료일</th><th>상태</th><th>위험도</th><th>잔여일</th><th>작업</th></tr></thead><tbody><tr v-for="row in supplierCertificateRows" :key="row[1]"><td>{{ row[0] }}</td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td>{{ row[3] }}</td><td>{{ row[4] }}</td><td>{{ row[5] }}</td><td>{{ row[6] }}</td><td><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.relatedDocuments }}</button></td></tr></tbody></table></article>
            <article class="operation-detail-page__domain-card"><h3>리스크 이벤트 이력</h3><table class="operation-detail-page__domain-table"><tbody><tr><td>2026.04.28 10:15</td><td>인증 만료 임박</td><td>{{ t('HACCP 인증 만료 12일 전', 'HACCP expires in 12 days') }}</td><td>보통</td><td>인증 서비스</td></tr><tr><td>2026.04.28 09:02</td><td>인증 만료</td><td>{{ t('ISO9001 인증 만료', 'ISO9001 certificate expired') }}</td><td>높음</td><td>인증 서비스</td></tr><tr><td>2026.04.25 14:11</td><td>리스크 점수 변경</td><td>{{ t('리스크 점수 72점으로 변경', 'Risk score changed to 72') }}</td><td>보통</td><td>리스크 엔진</td></tr></tbody></table></article>
          </section>
          <aside class="operation-detail-page__analysis-panel"><div class="operation-detail-page__panel-head"><h2>{{ t('AI 인증 리스크 요약', 'AI Certification Risk Summary') }}</h2><small>모델: ATLAS-RISK-1.0</small></div><div class="operation-detail-page__risk-band"><span>{{ t('종합 판단', 'Overall Decision') }}</span><strong>고위험</strong><p>{{ t('핵심 인증 만료로 품질 경영 체계 유효성이 상실되었습니다.', 'Core certification expiry invalidates the quality management system.') }}</p></div><section><h3>{{ t('비즈니스 영향 요약', 'Business Impact Summary') }}</h3><ul><li>{{ t('품질/식품안전 규정 준수 위험 증가', 'Quality and food-safety compliance risk increased') }}</li><li>{{ t('납품 중단 가능성 및 리콜 리스크 상승', 'Supply disruption and recall risk increased') }}</li><li>{{ t('고객사 감사 대응 시 컴플라이언스 이슈 발생 가능', 'Compliance issues may arise during customer audits') }}</li></ul></section><section><h3>{{ t('권장 액션 (AI)', 'Recommended Actions (AI)') }}</h3><ol><li>{{ t('ISO9001 갱신 상태 확인 및 갱신 일정 제출 요청', 'Request ISO9001 renewal status and schedule') }}</li><li>{{ t('대체 공급처 검토 및 위험 계획 수립', 'Review alternate suppliers and risk plan') }}</li><li>{{ t('인증 갱신 전까지 신규 발주 보류 검토', 'Review holding new orders until renewal') }}</li></ol></section><div class="operation-detail-page__action-list"><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.relatedDocuments }}</button><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.notifyOwner }}</button><button class="page-button page-button--secondary" type="button">{{ t('대체 후보 보기', 'View Alternatives') }}</button></div></aside>
        </main>

        <main v-else class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <section v-if="kind !== 'items'" class="operation-detail-page__metric-row"><div><span>전체 품목</span><strong>1,248 EA</strong></div><div><span>전체 재고 금액</span><strong>2,451,830,000원</strong></div><div><span>정상</span><strong>1,012</strong></div><div><span>부족 임박</span><strong>156</strong></div><div><span>부족 감지</span><strong class="is-alert">80</strong></div></section>
            <article v-if="kind === 'items'" class="operation-detail-page__domain-card">
              <div class="operation-detail-page__item-media-head">
                <h3>{{ t('품목 미디어', 'Item Media') }}</h3>
                <span>{{ itemMediaCount }} / {{ ITEM_MEDIA_MAX_UPLOAD_COUNT }}</span>
              </div>
              <div v-if="!itemInlineEditMode && itemMediaFiles.length === 0" class="page-table__empty">
                {{ t('등록된 미디어가 없습니다.', 'No media registered.') }}
              </div>
              <div v-else-if="!itemInlineEditMode" class="operation-detail-page__item-media-grid">
                <button
                  v-for="(file, index) in itemMediaFiles"
                  :key="file.publicId"
                  class="operation-detail-page__item-media"
                  type="button"
                  @click="openItemMediaViewer(index)"
                >
                  <img
                    v-if="file.kind === 'image'"
                    :src="resolveItemMediaUrl(file)"
                    :alt="file.originalFileName"
                  />
                  <video
                    v-else
                    :src="resolveItemMediaUrl(file)"
                    preload="metadata"
                  />
                  <span v-if="file.kind === 'video'" class="material-symbols-outlined">play_circle</span>
                  <small>{{ file.originalFileName }}</small>
                </button>
              </div>
              <div v-else class="operation-detail-page__item-media-grid operation-detail-page__item-media-grid--editing">
                <article
                  v-for="(media, index) in itemEditableMedia"
                  :key="media.id"
                  class="operation-detail-page__item-media operation-detail-page__item-media--editable"
                  draggable="true"
                  @dragstart="handleItemMediaDragStart(index, $event)"
                  @dragover.prevent
                  @drop="handleItemMediaDrop(index, $event)"
                >
                  <img v-if="media.kind === 'image'" :src="media.previewUrl" :alt="media.originalFileName" />
                  <video v-else :src="media.previewUrl" preload="metadata" />
                  <span v-if="media.kind === 'video'" class="material-symbols-outlined">play_circle</span>
                  <span v-if="index === 0" class="operation-detail-page__item-media-primary">대표</span>
                  <button
                    class="operation-detail-page__item-media-remove"
                    type="button"
                    :title="t('삭제', 'Remove')"
                    @click="removeEditableItemMedia(index)"
                  >
                    <span class="material-symbols-outlined">close</span>
                  </button>
                  <small>{{ media.originalFileName }}</small>
                </article>
                <button
                  v-if="canAddItemMedia"
                  class="operation-detail-page__item-media operation-detail-page__item-media-add"
                  type="button"
                  @click="triggerItemMediaPicker"
                >
                  <span class="material-symbols-outlined">add</span>
                </button>
                <input
                  ref="itemMediaFileInput"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  class="operation-detail-page__media-file-input"
                  @change="handleItemMediaFileChange"
                />
              </div>
            </article>
            <article
              v-if="kind === 'items'"
              class="operation-detail-page__domain-card operation-detail-page__item-info-card"
            >
              <div class="operation-detail-page__block-head">
                <h3>{{ t('품목 상세 정보', 'ITEM INFORMATION') }}</h3>
              </div>

              <div v-if="itemInlineEditMode" class="operation-detail-page__edit-form operation-detail-page__inline-edit-form">
                <section class="operation-detail-page__edit-section">
                  <label class="operation-detail-page__edit-field">
                    <span>품목명</span>
                    <input v-model="itemEditForm.itemName" type="text" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>단가</span>
                    <input v-model.number="itemEditForm.unitPrice" type="number" min="1" step="1" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>유통기한</span>
                    <input v-model.number="itemEditForm.shelfLifeDays" type="number" min="0" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>상태</span>
                    <select v-model="itemEditForm.status">
                      <option value="ACTIVE">활성</option>
                      <option value="DEACTIVE">비활성</option>
                    </select>
                  </label>

                  <label class="operation-detail-page__edit-field operation-detail-page__edit-field--full">
                    <span>규격</span>
                    <textarea v-model="itemEditForm.spec" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>리드타임</span>
                    <input v-model.number="itemEditForm.leadTimeDays" type="number" min="0" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>월간 생산량</span>
                    <input v-model.number="itemEditForm.monthlyCapacity" type="number" min="1" step="1" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>주문 가능 수량</span>
                    <input v-model.number="itemEditForm.availableQty" type="number" min="1" step="1" />
                  </label>

                  <label class="operation-detail-page__edit-field">
                    <span>최소 주문 수량</span>
                    <input v-model.number="itemEditForm.moq" type="number" min="1" step="1" />
                  </label>
                </section>

              </div>

              <template v-else>
                <div v-if="itemInformationSummary" class="operation-detail-page__item-info-hero">
                  <div class="operation-detail-page__item-info-main">
                    <span>{{ itemInformationSummary.category }} · {{ itemInformationSummary.status }}</span>
                    <strong>{{ itemInformationSummary.name }}</strong>
                    <small>{{ itemInformationSummary.code }}</small>
                  </div>
                </div>
                <div class="operation-detail-page__item-info-metrics">
                  <div v-for="metric in itemInformationMetrics" :key="metric.label">
                    <span>{{ metric.label }}</span>
                    <strong>{{ metric.value }}</strong>
                    <small>{{ metric.meta }}</small>
                  </div>
                </div>
                <div class="operation-detail-page__item-info-sections">
                  <section v-for="group in itemInformationGroups" :key="group.title">
                    <dl>
                      <div v-for="row in group.rows" :key="row.label">
                        <dt>{{ row.label }}</dt>
                        <dd>
                          <span
                            v-if="row.role === 'status'"
                            class="operation-detail-page__item-info-status-chip"
                          >
                            {{ row.value }}
                          </span>
                          <template v-else>{{ row.value }}</template>
                        </dd>
                      </div>
                    </dl>
                  </section>
                </div>
              </template>
            </article>
            <article v-if="kind !== 'items'" class="operation-detail-page__domain-card">
              <h3>재고 상태</h3>
              <table class="operation-detail-page__domain-table"><thead><tr><th>품목 코드</th><th>품목명</th><th>단위</th><th>잔여 수량</th><th>예약 수량</th><th>주문 가능</th><th>상태</th><th>유통기한</th></tr></thead><tbody><tr v-for="row in inventoryRows" :key="`${row[0]}-${row[7]}`"><td>{{ row[0] }}</td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td>{{ row[3] }}</td><td>{{ row[4] }}</td><td>{{ row[5] }}</td><td>{{ row[6] }}</td><td>{{ row[7] }}</td></tr></tbody></table>
            </article>
            <article class="operation-detail-page__domain-card"><h3>수요 대비 안전재고</h3><div class="operation-detail-page__chart-panel"><span></span><span></span><span></span><strong>예측 수요</strong></div></article>
            <div v-if="kind === 'inventory'" class="operation-detail-page__bottom-actions">
              <button class="page-button page-button--secondary" type="button" @click="goBack">
                {{ detailCopy.backToList }}
              </button>

              <span></span>

              <button
                class="page-button page-button--primary"
                type="button"
                :disabled="!canEditCurrentInventory"
                @click="openInventoryEditModal"
              >
                수정
              </button>
            </div>
          </section>

          <aside class="operation-detail-page__analysis-panel is-inventory"><div class="operation-detail-page__panel-head"><h2>{{ t('AI 재고 부족 대응', 'AI Inventory Shortage Response') }}</h2><span class="operation-detail-page__chip is-high">{{ t('안전재고 미달', 'Below Safety Stock') }}</span></div><div class="operation-detail-page__recommendation"><strong>{{ t('01 긴급 발주', '01 Urgent Order') }}</strong><span>높음</span><p>{{ t('필요 수량 165 EA, 권장 발주 수량 170 EA', 'Required 165 EA, recommended order 170 EA') }}</p><button class="page-button page-button--primary" type="button">{{ t('실행 계획 보기', 'View Action Plan') }}</button></div><div class="operation-detail-page__recommendation"><strong>{{ t('02 대체 공급처 검토', '02 Review Alternative Suppliers') }}</strong><span>보통</span><p>{{ t('공급처 3개, 필요 수량 165 EA', '3 suppliers, required 165 EA') }}</p><button class="page-button page-button--primary" type="button">{{ t('후보 공급처 보기', 'View Supplier Candidates') }}</button></div><div class="operation-detail-page__recommendation"><strong>{{ t('03 분할 입고', '03 Split Inbound') }}</strong><span>낮음</span><p>{{ t('분할 횟수 2회, 운송 영향 보통', '2 splits, normal logistics impact') }}</p><button class="page-button page-button--primary" type="button">{{ t('분할 계획 보기', 'View Split Plan') }}</button></div></aside>
        </main>
      </div>
    </template>

    <template v-else-if="data">
      <section
        v-if="kind !== 'logistics-nodes'"
        class="operation-detail-page__summary-strip"
        :style="{ gridTemplateColumns: `repeat(${heroMetrics.length}, minmax(0, 1fr))` }"
      >
        <article v-for="metric in heroMetrics" :key="metric.label" class="operation-detail-page__summary-cell">
          <span>{{ metric.label }}</span>
          <strong v-if="!metric.tone">{{ metric.value }}</strong>
          <span v-else :class="['operation-detail-page__state-chip', `is-${chipTone(metric.value, metric.tone)}`]">
            {{ metric.value }}
          </span>
          <small v-if="metric.meta">{{ metric.meta }}</small>
        </article>
      </section>

      <div class="operation-detail-page__layout">
        <main class="operation-detail-page__main">
          <article v-if="kind !== 'logistics-nodes'" class="operation-detail-page__block operation-detail-page__process">
            <h2>{{ detailCopy.common.process }}</h2>
            <div class="operation-detail-page__timeline">
              <div
                v-for="step in processSteps"
                :key="step.label"
                :class="['operation-detail-page__timeline-step', `is-${step.state}`]"
              >
                <span class="operation-detail-page__timeline-node"></span>
                <strong>{{ step.label }}</strong>
                <small>{{ step.meta }}</small>
              </div>
            </div>
          </article>

          <article class="operation-detail-page__block">
            <h2>{{ sections[0]?.title ?? detailCopy.common.basicInfo }}</h2>
            <dl class="operation-detail-page__definition-grid">
              <template v-for="row in detailRows" :key="row.label">
                <dt :class="{ 'is-wide-label': kind === 'logistics-nodes' && row.label === '주소' }">{{ row.label }}</dt>
                <dd :class="{ 'is-wide-value': kind === 'logistics-nodes' && row.label === '주소' }">
                  <span
                    v-if="shouldRenderChip(row.label, row.value)"
                    :class="['operation-detail-page__state-chip', `is-${chipTone(row.value)}`]"
                  >
                    {{ row.value }}
                  </span>
                  <template v-else>{{ row.value }}</template>
                </dd>
              </template>
            </dl>
            <LogisticsNodeLocationMap
              v-if="kind === 'logistics-nodes'"
              :latitude="data.latitude"
              :longitude="data.longitude"
              :node-name="display(data.nodeName)"
              :node-code="display(data.nodeCode)"
              :address="display(data.address)"
            />
          </article>

          <article v-if="kind === 'certificates'" class="operation-detail-page__block operation-detail-page__certificate-files">
            <div class="operation-detail-page__block-head">
              <h2>{{ t('인증서 파일', 'Certificate File') }}</h2>
              <span>{{ certificateFiles.length }}</span>
            </div>
            <div v-if="certificateFiles.length === 0" class="page-table__empty">
              {{ data.attachmentPublicId ? t('첨부파일 정보를 불러오지 못했습니다.', 'Failed to load attachment details.') : t('첨부된 인증서 파일이 없습니다.', 'No certificate file attached.') }}
            </div>
            <div v-else class="operation-detail-page__file-list">
              <a
                v-for="file in certificateFiles"
                :key="file.publicId"
                class="operation-detail-page__file-row"
                :href="fileLink(file)"
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>{{ file.originalFileName }}</strong>
                  <small>{{ file.contentType }} · {{ formatFileSize(file.fileSize) }}</small>
                </span>
                <em>{{ t('열기', 'Open') }}</em>
              </a>
            </div>
          </article>

          <article class="operation-detail-page__block">
            <div class="operation-detail-page__block-head">
              <h2>{{ kind === 'logistics-nodes' ? t('배치 물품', 'Stored Items') : detailCopy.common.detailItems }}</h2>
              <span>{{ detailCopy.common.totalCount(lineItems.length) }}</span>
            </div>
            <div
              v-if="lineItems.length === 0"
              :class="['page-table__empty', { 'operation-detail-page__empty--lower': kind === 'logistics-nodes' }]"
            >
              {{ kind === 'logistics-nodes' ? t('배치된 물품이 없습니다.', 'No stored items.') : detailCopy.common.emptyDetailRows }}
            </div>
            <div v-else class="page-table-wrap">
              <table class="operation-detail-page__table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th v-for="column in lineColumns" :key="column">{{ column }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, rowIndex) in lineItems" :key="rowKey(row, rowIndex)">
                    <td>{{ rowIndex + 1 }}</td>
                    <td v-for="(_, columnIndex) in lineColumns" :key="columnIndex">
                      {{ lineCell(row, columnIndex) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </article>

          <article class="operation-detail-page__block">
            <h2>{{ detailCopy.common.history }}</h2>
            <table class="operation-detail-page__table operation-detail-page__history-table">
              <thead>
                <tr>
                  <th>{{ detailCopy.common.dateTime }}</th>
                  <th>{{ kind === 'logistics-nodes' ? '변경사항' : detailCopy.common.step }}</th>
                  <th>{{ detailCopy.common.processor }}</th>
                  <th>{{ detailCopy.common.description }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in paginatedHistoryRows" :key="rowKey(row, rowIndex)">
                  <td>{{ formatDate(row.createdAt ?? row.recordedAt ?? row.updatedAt) }}</td>
                  <td>
                    <template v-if="kind === 'logistics-nodes'">
                      {{ historyChangeLabel(row) }}
                    </template>
                    <span
                      v-else
                      :class="[
                        'operation-detail-page__state-chip',
                        `is-${chipTone(historyChangeLabel(row))}`,
                      ]"
                    >
                      {{ historyChangeLabel(row) }}
                    </span>
                  </td>
                  <td>{{ historyActorLabel(row) }}</td>
                  <td>{{ historyDescription(row) }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="shouldPaginateHistory" class="operation-detail-page__history-pagination">
              <button
                class="page-button page-button--secondary"
                type="button"
                :disabled="historyPage <= 1"
                @click="moveHistoryPage(-1)"
              >
                이전
              </button>
              <span>{{ historyPage }} / {{ historyTotalPages }}</span>
              <button
                class="page-button page-button--secondary"
                type="button"
                :disabled="historyPage >= historyTotalPages"
                @click="moveHistoryPage(1)"
              >
                다음
              </button>
            </div>
          </article>

          <div v-if="kind === 'logistics-nodes' && data" class="operation-detail-page__node-actions">
            <button class="page-button page-button--secondary" type="button" @click="handleEditLogisticsNode">
              {{ t('수정', 'Edit') }}
            </button>
            <button class="page-button page-button--secondary" type="button" :disabled="loading" @click="toggleLogisticsNodeActive">
              {{ data.active ? t('비활성화', 'Deactivate') : t('활성화', 'Activate') }}
            </button>
            <button class="page-button page-button--secondary" type="button" @click="goBack">
              {{ detailCopy.backToList }}
            </button>
          </div>

          <article v-if="isReturnDetail" class="operation-detail-page__block">
            <h2>{{ t('반품 증빙 사진', 'Return Proof Photos') }}</h2>
            <div v-if="returnProofFiles.length === 0" class="page-table__empty">{{ t('첨부된 증빙 사진이 없습니다.', 'No attached proof photos.') }}</div>
            <div v-else class="operation-detail-page__proof-gallery">
              <a v-for="file in returnProofFiles" :key="file.publicId" :href="fileLink(file)" target="_blank" rel="noreferrer">
                <img v-if="file.contentType?.startsWith('image/')" :src="fileLink(file)" :alt="file.originalFileName" />
                <span v-else class="material-symbols-outlined">description</span>
              </a>
            </div>
          </article>

          <!-- 반품 상태 변경 영역 -->
          <article v-if="isReturnDetail && returnNextActions.length > 0" class="operation-detail-page__block operation-detail-page__return-actions">
            <h2>{{ t('상태 변경', 'Change Status') }}</h2>
            <p class="operation-detail-page__return-status-label">
              {{ t('현재 상태', 'Current Status') }}: <strong>{{ displayReturnStatus(returnStatus) }}</strong>
              <span v-if="resolutionType">({{ displayResolutionType(resolutionType) }})</span>
            </p>
            <label class="operation-detail-page__return-reason">
              <span>{{ t('사유', 'Reason') }}</span>
              <input v-model="returnReasonText" type="text" :placeholder="t('사유를 입력하세요 (선택)', 'Enter reason (optional)')" />
            </label>
            <div class="operation-detail-page__return-buttons">
              <button
                v-for="action in returnNextActions"
                :key="action.status"
                :class="['page-button', `page-button--${action.tone}`]"
                type="button"
                :disabled="isReturnUpdating"
                @click="handleReturnStatusChange(action.status)"
              >
                {{ isReturnUpdating ? t('처리 중...', 'Processing...') : action.label }}
              </button>
            </div>
          </article>
        </main>

        <aside class="operation-detail-page__aside">
          <article class="operation-detail-page__ai-panel">
            <div class="operation-detail-page__ai-head">
              <div>
                <p>AI 분석</p>
                <h2>{{ detailCopy.common.aiAnalysis }}</h2>
              </div>
              <span :class="['operation-detail-page__state-chip', `is-${chipTone(displayStatus(status || 'REVIEW'), statusTone)}`]">
                {{ displayStatus(status || 'REVIEW') }}
              </span>
            </div>

            <div class="operation-detail-page__risk-summary">
              <span>{{ detailCopy.order.risk }}</span>
              <strong
                :class="[
                  'operation-detail-page__state-chip',
                  `is-${chipTone(statusTone === 'critical' ? '높음' : statusTone === 'success' ? '낮음' : '보통')}`,
                ]"
              >
                {{ statusTone === 'critical' ? '높음' : statusTone === 'success' ? '낮음' : '보통' }}
              </strong>
              <p>{{ aiSummary }}</p>
            </div>

            <section class="operation-detail-page__ai-section">
              <h3>{{ detailCopy.common.impactArea }}</h3>
              <div class="operation-detail-page__impact-grid">
                <div v-for="[label, level, description] in aiImpactRows" :key="label" class="operation-detail-page__impact-card">
                  <span>{{ label }}</span>
                  <strong :class="['operation-detail-page__state-chip', `is-${chipTone(level)}`]">{{ level }}</strong>
                  <small>{{ description }}</small>
                </div>
              </div>
            </section>

            <section class="operation-detail-page__ai-section">
              <h3>{{ detailCopy.common.causeFactors }}</h3>
              <table class="operation-detail-page__mini-table">
                <tbody>
                  <tr v-for="[label, value] in recommendationRows" :key="label">
                    <th>{{ label }}</th>
                    <td>
                      <span
                        v-if="shouldRenderChip(label, value)"
                        :class="['operation-detail-page__state-chip', `is-${chipTone(value)}`]"
                      >
                        {{ value }}
                      </span>
                      <template v-else>{{ value }}</template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section class="operation-detail-page__ai-section">
              <h3>{{ detailCopy.common.checklist }}</h3>
              <ul class="operation-detail-page__checklist">
                <li v-for="item in aiChecklist" :key="item">{{ item }}</li>
              </ul>
            </section>

            <div class="operation-detail-page__action-list">
              <button class="page-button page-button--primary" type="button">{{ detailCopy.common.notifyOwner }}</button>
              <button class="page-button page-button--secondary" type="button">{{ detailCopy.common.relatedDocuments }}</button>
              <button class="page-button page-button--secondary" type="button">{{ detailCopy.common.fullHistory }}</button>
            </div>
          </article>
        </aside>
      </div>
    </template>

    <BaseModal
      v-model="confirmModalOpen"
      title="발주 수락"
      description="품목별 확정 수량을 입력해 주세요."
      size="md"
      @close="closeConfirmOrderModal"
    >
      <div class="operation-detail-page__confirm-form">
        <div
          v-for="line in confirmLines"
          :key="line.poItemPublicId"
          class="operation-detail-page__confirm-line"
        >
          <div>
            <strong>{{ line.itemName }}</strong>
            <small>
              발주 수량 {{ formatNumber(line.orderedQty) }}
              /
              부분 확정 {{ line.partialConfirmationAllowed === false ? '불가' : '허용' }}
            </small>
          </div>

          <input
            v-model.number="line.confirmedQty"
            type="number"
            min="1"
            :max="line.orderedQty"
          />
        </div>

        <p v-if="confirmErrorMessage" class="operation-detail-page__error">
          {{ confirmErrorMessage }}
        </p>

        <div class="operation-detail-page__bottom-actions">
          <button class="page-button page-button--secondary" type="button" @click="closeConfirmOrderModal">
            취소
          </button>
          <span></span>
          <button class="page-button page-button--primary" type="button" :disabled="loading" @click="handleAcceptOrder">
            수락 완료
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="itemLockedModalOpen"
      title="품목 수정 불가"
      description="발주 확정 품목은 수정 불가합니다."
      size="sm"
    >
      <div class="operation-detail-page__bottom-actions">
        <span></span>
        <button class="page-button page-button--primary" type="button" @click="itemLockedModalOpen = false">
          확인
        </button>
      </div>
    </BaseModal>

    <BaseModal
      v-model="itemEditErrorModalOpen"
      title="품목 수정 실패"
      :description="itemEditErrorMessage"
      size="sm"
      hide-eyebrow
      hide-dividers
      hide-close-button
      @close="closeItemEditErrorModal"
    >
      <div class="operation-detail-page__bottom-actions">
        <span></span>
        <button class="page-button page-button--primary" type="button" @click="closeItemEditErrorModal">
          확인
        </button>
      </div>
    </BaseModal>

    <BaseModal
      v-model="inventoryEditModalOpen"
      :title="t('재고 수정', 'Edit Inventory')"
      :description="t('예약되지 않은 정상 재고만 수정할 수 있습니다.', 'Only active inventory without reserved quantity can be edited.')"
      size="md"
      @close="closeInventoryEditModal"
    >
      <div class="operation-detail-page__edit-form">
        <section class="operation-detail-page__edit-section">
          <label class="operation-detail-page__edit-field">
            <span>{{ t('제조일', 'Manufactured Date') }}</span>
            <input v-model="inventoryEditForm.manufacturedDate" type="date" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('수량', 'Quantity') }}</span>
            <input v-model.number="inventoryEditForm.qty" type="number" min="1" step="1" />
          </label>

          <label class="operation-detail-page__edit-field operation-detail-page__edit-field--full">
            <span>{{ t('메모', 'Memo') }}</span>
            <textarea v-model="inventoryEditForm.memo" />
          </label>
        </section>

        <p v-if="inventoryEditErrorMessage" class="operation-detail-page__error">
          {{ inventoryEditErrorMessage }}
        </p>

        <div class="operation-detail-page__bottom-actions">
          <button class="page-button page-button--secondary" type="button" @click="closeInventoryEditModal">
            {{ t('취소', 'Cancel') }}
          </button>
          <span></span>
          <button
            class="page-button page-button--primary"
            type="button"
            :disabled="inventoryEditLoading"
            @click="submitInventoryEdit"
          >
            {{ inventoryEditLoading ? t('저장 중', 'Saving') : t('재고 수정', 'Save Inventory') }}
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      v-model="logisticsEditModalOpen"
      :title="t('창고 수정', 'Edit Warehouse')"
      :description="t('현재 창고의 기본 정보와 용량 상태를 수정합니다.', 'Edit warehouse information and capacity status.')"
      size="md"
      @close="closeLogisticsEditModal"
    >
      <div class="operation-detail-page__edit-form">
        <section class="operation-detail-page__edit-section">
          <h3>{{ t('창고 기본 정보', 'Warehouse Basic Info') }}</h3>

          <label class="operation-detail-page__edit-field operation-detail-page__edit-field--full">
            <span>{{ t('창고명', 'Warehouse Name') }}</span>
            <input v-model="logisticsEditForm.nodeName" type="text" />
          </label>

          <label class="operation-detail-page__edit-field operation-detail-page__edit-field--full">
            <span>{{ t('주소', 'Address') }}</span>
            <input v-model="logisticsEditForm.baseAddress" type="text" readonly />
          </label>

          <label class="operation-detail-page__edit-field operation-detail-page__edit-field--full">
            <span>{{ t('상세주소', 'Address Detail') }}</span>
            <input v-model="logisticsEditForm.detailAddress" type="text" readonly />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('창고 상태', 'Capacity Status') }}</span>
            <select v-model="logisticsEditForm.capacityStatus">
              <option v-for="statusOption in logisticsCapacityStatusOptions" :key="statusOption" :value="statusOption">
                {{ displayLogisticsCapacityStatus(statusOption) }}
              </option>
            </select>
          </label>
        </section>

        <p v-if="logisticsEditErrorMessage" class="operation-detail-page__error">
          {{ logisticsEditErrorMessage }}
        </p>

        <div class="operation-detail-page__bottom-actions operation-detail-page__bottom-actions--start">
          <button class="page-button page-button--secondary" type="button" @click="closeLogisticsEditModal">
            {{ t('취소', 'Cancel') }}
          </button>
          <button class="page-button page-button--primary" type="button" :disabled="logisticsEditLoading" @click="submitLogisticsEdit">
            {{ logisticsEditLoading ? t('저장 중', 'Saving') : t('수정 완료', 'Save Changes') }}
          </button>
        </div>
      </div>
    </BaseModal>

    <Teleport to="body">
      <div
        v-if="itemMediaViewerOpen && itemMediaFiles[itemMediaViewerIndex]"
        class="operation-detail-page__media-viewer"
        @click.self="closeItemMediaViewer"
      >
        <button class="operation-detail-page__media-viewer-close" type="button" @click="closeItemMediaViewer">
          <span class="material-symbols-outlined">close</span>
        </button>
        <button
          v-if="itemMediaViewerIndex > 0"
          class="operation-detail-page__media-viewer-nav operation-detail-page__media-viewer-nav--prev"
          type="button"
          @click.stop="prevItemMedia"
        >
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <div class="operation-detail-page__media-viewer-content">
          <img
            v-if="itemMediaFiles[itemMediaViewerIndex].kind === 'image'"
            :src="resolveItemOriginalMediaUrl(itemMediaFiles[itemMediaViewerIndex])"
            :alt="itemMediaFiles[itemMediaViewerIndex].originalFileName"
          />
          <video
            v-else
            :src="resolveItemOriginalMediaUrl(itemMediaFiles[itemMediaViewerIndex])"
            controls
            autoplay
          />
          <span>{{ itemMediaViewerIndex + 1 }} / {{ itemMediaFiles.length }}</span>
        </div>
        <button
          v-if="itemMediaViewerIndex < itemMediaFiles.length - 1"
          class="operation-detail-page__media-viewer-nav operation-detail-page__media-viewer-nav--next"
          type="button"
          @click.stop="nextItemMedia"
        >
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </Teleport>

  </section>
</template>

<style scoped>
.operation-detail-page {
  --detail-border: rgb(var(--outline-variant-rgb, 172 179 180) / 0.34);
  --detail-border-strong: rgb(var(--outline-rgb, 117 124 125) / 0.5);
  --detail-surface: rgb(var(--surface-container-low-rgb, 242 244 244) / 0.9);
  --detail-surface-plain: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.86);
  --detail-muted: var(--on-surface-variant, #596061);
  display: grid;
  gap: 14px;
}

.operation-detail-page__header {
  align-items: start;
  margin-bottom: 0;
}

.operation-detail-page__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.operation-detail-page__status,
.operation-detail-page__ai-status {
  min-height: 38px;
  padding: 9px 13px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
  color: var(--on-surface, #2d3435);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.operation-detail-page__status.is-critical,
.operation-detail-page__ai-status.is-critical,
.operation-detail-page__impact-card strong.is-high {
  color: var(--error, #9f403d);
}

.operation-detail-page__status.is-warning,
.operation-detail-page__ai-status.is-warning,
.operation-detail-page__impact-card strong.is-medium {
  color: #c27a16;
}

.operation-detail-page__status.is-success,
.operation-detail-page__ai-status.is-success,
.operation-detail-page__impact-card strong.is-low {
  color: var(--success, #2d7d46);
}

.operation-detail-page__state-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-height: 26px;
  border: 1px solid var(--detail-border);
  border-radius: 0;
  padding: 4px 10px;
  background: rgb(var(--surface-container-rgb, 235 238 239) / 0.55);
  color: var(--on-surface, #2d3435);
  font-size: 0.76rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
}

.operation-detail-page__summary-cell .operation-detail-page__state-chip,
.operation-detail-page__risk-summary .operation-detail-page__state-chip,
.operation-detail-page__impact-card .operation-detail-page__state-chip {
  color: var(--on-surface, #2d3435);
  font-size: 0.76rem;
  letter-spacing: 0;
  text-transform: none;
}

.operation-detail-page__state-chip.is-critical {
  border-color: rgb(var(--error-rgb, 159 64 61) / 0.28);
  background: rgb(var(--error-rgb, 159 64 61) / 0.1);
  color: var(--error, #9f403d);
}

.operation-detail-page__state-chip.is-warning {
  border-color: rgb(194 122 22 / 0.28);
  background: rgb(194 122 22 / 0.1);
  color: #a15f0d;
}

.operation-detail-page__state-chip.is-success {
  border-color: rgb(45 125 70 / 0.24);
  background: rgb(45 125 70 / 0.1);
  color: var(--success, #2d7d46);
}

.operation-detail-page__summary-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
}

.operation-detail-page__summary-cell {
  display: grid;
  gap: 7px;
  min-height: 78px;
  padding: 13px 16px;
  border-right: 1px solid var(--detail-border);
}

.operation-detail-page__summary-cell:last-child {
  border-right: 0;
}

.operation-detail-page__summary-cell span,
.operation-detail-page__ai-head p,
.operation-detail-page__risk-summary span {
  color: var(--detail-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.operation-detail-page__summary-cell strong {
  min-width: 0;
  color: var(--on-surface, #2d3435);
  font-size: clamp(0.98rem, 1.35vw, 1.22rem);
  font-weight: 900;
  line-height: 1.12;
  word-break: break-word;
}

.operation-detail-page__summary-cell small {
  color: var(--detail-muted);
  font-size: 0.76rem;
  font-weight: 800;
}

.operation-detail-page__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(330px, 0.42fr);
  gap: 14px;
  align-items: start;
}

.operation-detail-page__main,
.operation-detail-page__aside {
  display: grid;
  gap: 12px;
  min-width: 0;
  align-content: start;
}

.operation-detail-page__block,
.operation-detail-page__ai-panel {
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
}

.operation-detail-page__block {
  padding: 14px;
}

.operation-detail-page__block h2,
.operation-detail-page__ai-panel h2 {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 1.02rem;
  font-weight: 900;
  line-height: 1.2;
}

.operation-detail-page__item-media-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 180px;
  grid-template-columns: none;
  gap: 10px;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px;
  overscroll-behavior-x: contain;
}

.operation-detail-page__item-media {
  position: relative;
  display: grid;
  grid-template-rows: 128px auto;
  gap: 6px;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  color: inherit;
  text-align: left;
  background: var(--detail-surface-plain);
  border: 1px solid var(--detail-border);
  border-radius: 0;
  cursor: pointer;
}

.operation-detail-page__item-media--editable {
  cursor: grab;
}

.operation-detail-page__item-media--editable:active {
  cursor: grabbing;
}

.operation-detail-page__item-media-remove {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: block;
  width: 26px;
  height: 26px;
  padding: 0;
  color: #fff;
  background: rgb(0 0 0 / 0.72);
  border: 1px solid rgb(255 255 255 / 0.28);
  border-radius: 0;
  cursor: pointer;
  appearance: none;
}

.operation-detail-page__item-media-remove::before,
.operation-detail-page__item-media-remove::after {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 2px;
  background: currentcolor;
  content: "";
  transform-origin: center;
}

.operation-detail-page__item-media-remove::before {
  transform: translate(-50%, -50%) rotate(45deg);
}

.operation-detail-page__item-media-remove::after {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.operation-detail-page__item-media-remove .material-symbols-outlined {
  display: none;
}

.operation-detail-page__item-media-primary {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
  padding: 4px 6px;
  color: var(--detail-surface);
  font-size: 0.68rem;
  font-weight: 900;
  line-height: 1;
  background: var(--detail-text);
}

.operation-detail-page__item-media-add {
  place-items: center;
  min-height: 160px;
  grid-template-rows: 1fr;
  color: var(--detail-muted);
  background: var(--detail-surface-plain);
}

.operation-detail-page__item-media-add > .material-symbols-outlined {
  position: static;
  color: var(--detail-text);
  font-size: 42px;
  text-shadow: none;
  transform: none;
}

.operation-detail-page__item-media img,
.operation-detail-page__item-media video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.operation-detail-page__item-media > span {
  position: absolute;
  top: 48px;
  left: 50%;
  color: white;
  font-size: 34px;
  text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
  transform: translateX(-50%);
}

.operation-detail-page__item-media > .operation-detail-page__item-media-primary {
  top: 6px;
  left: 6px;
  color: var(--detail-surface);
  font-size: 0.68rem;
  text-shadow: none;
  transform: none;
}

.operation-detail-page__item-media small {
  padding: 0 8px 8px;
  overflow: hidden;
  color: var(--detail-muted);
  font-size: 0.72rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-detail-page__media-file-input {
  display: none;
}

.operation-detail-page__media-viewer {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgb(0 0 0 / 0.82);
}

.operation-detail-page__media-viewer-content {
  display: grid;
  gap: 12px;
  justify-items: center;
  max-width: min(1040px, 92vw);
  max-height: 88vh;
  color: white;
}

.operation-detail-page__media-viewer-content img,
.operation-detail-page__media-viewer-content video {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
}

.operation-detail-page__media-viewer-close,
.operation-detail-page__media-viewer-nav {
  position: fixed;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: white;
  background: rgb(255 255 255 / 0.12);
  border: 1px solid rgb(255 255 255 / 0.26);
  border-radius: 0;
  cursor: pointer;
}

.operation-detail-page__media-viewer-close {
  top: 20px;
  right: 20px;
}

.operation-detail-page__media-viewer-nav--prev {
  left: 20px;
}

.operation-detail-page__media-viewer-nav--next {
  right: 20px;
}

.operation-detail-page__block-head,
.operation-detail-page__ai-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.operation-detail-page__block-head span {
  color: var(--detail-muted);
  font-size: 0.76rem;
  font-weight: 800;
}

.operation-detail-page__item-media-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.operation-detail-page__item-media-head h3 {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 1.17em;
  font-weight: 900;
}

.operation-detail-page__item-media-head span {
  color: var(--detail-muted);
  font-size: 0.76rem;
  font-weight: 800;
}

.operation-detail-page__timeline {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin-top: 16px;
  padding: 0 12px 4px;
}

.operation-detail-page__timeline::before {
  content: '';
  position: absolute;
  left: 28px;
  right: 28px;
  top: 12px;
  height: 1px;
  background: var(--detail-border-strong);
}

.operation-detail-page__timeline-step {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 7px;
  min-height: 84px;
  padding: 0 8px;
  text-align: center;
}

.operation-detail-page__timeline-node {
  position: relative;
  z-index: 1;
  width: 24px;
  height: 24px;
  border: 1px solid var(--detail-border-strong);
  background: var(--detail-surface-plain);
}

.operation-detail-page__timeline-step.is-done .operation-detail-page__timeline-node,
.operation-detail-page__timeline-step.is-active .operation-detail-page__timeline-node {
  background: var(--primary, #5e5e5e);
  border-color: var(--primary, #5e5e5e);
}

.operation-detail-page__timeline-step.is-critical .operation-detail-page__timeline-node {
  background: var(--error, #9f403d);
  border-color: var(--error, #9f403d);
}

.operation-detail-page__timeline-step strong {
  color: var(--on-surface, #2d3435);
  font-size: 0.82rem;
  font-weight: 900;
}

.operation-detail-page__timeline-step small {
  color: var(--detail-muted);
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.35;
}

.operation-detail-page__definition-grid {
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr) 140px minmax(0, 1fr);
  margin: 14px 0 0;
  border-top: 1px solid var(--detail-border);
}

.operation-detail-page__definition-grid dt,
.operation-detail-page__definition-grid dd {
  min-height: 42px;
  margin: 0;
  padding: 11px 12px;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__definition-grid dt {
  color: var(--detail-muted);
  font-size: 0.78rem;
  font-weight: 900;
}

.operation-detail-page__definition-grid dd {
  min-width: 0;
  color: var(--on-surface, #2d3435);
  font-size: 0.84rem;
  font-weight: 800;
  word-break: break-word;
}

.operation-detail-page__definition-grid dd.is-wide-value {
  grid-column: span 3;
}

.operation-detail-page__empty--lower {
  margin-top: 8px;
  padding-top: 18px;
  padding-bottom: 12px;
}

.operation-detail-page__table,
.operation-detail-page__mini-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--on-surface, #2d3435);
  background: var(--detail-surface-plain);
}

.operation-detail-page__table {
  margin-top: 12px;
  border: 1px solid var(--detail-border);
}

.operation-detail-page__table th,
.operation-detail-page__table td,
.operation-detail-page__mini-table th,
.operation-detail-page__mini-table td {
  padding: 9px 10px;
  border-top: 1px solid var(--detail-border);
  border-right: 1px solid var(--detail-border);
  text-align: left;
  vertical-align: top;
}

.operation-detail-page__table th:last-child,
.operation-detail-page__table td:last-child,
.operation-detail-page__mini-table th:last-child,
.operation-detail-page__mini-table td:last-child {
  border-right: 0;
}

.operation-detail-page__table th,
.operation-detail-page__mini-table th {
  border-top: 0;
  color: var(--detail-muted);
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
}

.operation-detail-page__table td,
.operation-detail-page__mini-table td {
  font-size: 0.8rem;
  font-weight: 760;
}

.operation-detail-page__ai-panel {
  display: grid;
  gap: 0;
  padding: 14px;
  border-left: 4px solid #c27a16;
}

.operation-detail-page__ai-head {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__risk-summary {
  display: grid;
  grid-template-columns: 70px 100px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__risk-summary strong {
  color: var(--error, #9f403d);
  font-size: 1.24rem;
  font-weight: 900;
}

.operation-detail-page__risk-summary p {
  margin: 0;
  color: var(--detail-muted);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.55;
}

.operation-detail-page__ai-section {
  display: grid;
  gap: 10px;
  padding: 14px 0;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__ai-section h3 {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 0.88rem;
  font-weight: 900;
}

.operation-detail-page__impact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--detail-border);
}

.operation-detail-page__impact-card {
  display: grid;
  gap: 7px;
  min-height: 82px;
  padding: 12px;
  border-right: 1px solid var(--detail-border);
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__impact-card:nth-child(2n) {
  border-right: 0;
}

.operation-detail-page__impact-card:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.operation-detail-page__impact-card span,
.operation-detail-page__impact-card small {
  color: var(--detail-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.operation-detail-page__impact-card strong {
  font-size: 0.9rem;
  font-weight: 900;
}

.operation-detail-page__checklist {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.operation-detail-page__checklist li {
  position: relative;
  padding-left: 22px;
  color: var(--on-surface, #2d3435);
  font-size: 0.8rem;
  font-weight: 760;
  line-height: 1.5;
}

.operation-detail-page__checklist li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.38em;
  width: 11px;
  height: 11px;
  border: 1px solid var(--detail-border-strong);
  background: var(--detail-surface-plain);
}

.operation-detail-page__action-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding-top: 14px;
}

.operation-detail-page__action-list .page-button:first-child {
  grid-column: 1 / -1;
}

.operation-detail-page__node-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: -4px;
}

.operation-detail-page__node-actions .page-button {
  min-height: 32px;
  min-width: 76px;
  padding: 0 12px;
  font-size: 0.68rem;
}

.operation-detail-page__history-pagination {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
}

.operation-detail-page__history-pagination span {
  min-width: 42px;
  text-align: center;
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 900;
}

.operation-detail-page__history-pagination .page-button {
  min-height: 32px;
  min-width: 62px;
  padding: 0 10px;
  font-size: 0.68rem;
}

.operation-detail-page .page-button,
.operation-detail-page .page-panel,
.operation-detail-page .page-feed__item,
.operation-detail-page .page-panel__chip {
  border-radius: 0;
}

.operation-detail-page__domain-shell {
  min-width: 0;
}

.operation-detail-page__document-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.42fr);
  gap: 14px;
  align-items: start;
}

.operation-detail-page__document-main {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.operation-detail-page__doc-hero,
.operation-detail-page__shipment-hero,
.operation-detail-page__supplier-head,
.operation-detail-page__domain-card,
.operation-detail-page__analysis-panel,
.operation-detail-page__metric-row > div {
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
}

.operation-detail-page__doc-hero,
.operation-detail-page__shipment-hero,
.operation-detail-page__supplier-head {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.operation-detail-page__doc-hero {
  grid-template-columns: minmax(0, 1fr) max-content;
}

.operation-detail-page__doc-hero dl,
.operation-detail-page__shipment-hero dl,
.operation-detail-page__supplier-head dl {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin: 0;
  border: 1px solid var(--detail-border);
}

.operation-detail-page__doc-hero dl > div,
.operation-detail-page__shipment-hero dl > div,
.operation-detail-page__supplier-head dl > div {
  display: grid;
  gap: 6px;
  min-height: 64px;
  padding: 10px 12px;
  border-right: 1px solid var(--detail-border);
}

.operation-detail-page__doc-hero dl > div:last-child,
.operation-detail-page__shipment-hero dl > div:last-child,
.operation-detail-page__supplier-head dl > div:last-child {
  border-right: 0;
}

.operation-detail-page__doc-hero p,
.operation-detail-page__shipment-hero p,
.operation-detail-page__supplier-head p,
.operation-detail-page__domain-card > h3,
.operation-detail-page__analysis-panel h3,
.operation-detail-page__metric-row span {
  margin: 0;
  color: var(--detail-muted);
  font-size: 0.7rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.operation-detail-page__doc-hero h2,
.operation-detail-page__shipment-hero h2,
.operation-detail-page__supplier-head h2 {
  margin: 4px 0 0;
  color: var(--on-surface, #2d3435);
  font-size: clamp(1.35rem, 2vw, 1.85rem);
  font-weight: 950;
  line-height: 1.1;
}

.operation-detail-page__doc-hero dt,
.operation-detail-page__shipment-hero dt,
.operation-detail-page__supplier-head dt,
.operation-detail-page__kv-grid dt {
  color: var(--detail-muted);
  font-size: 0.72rem;
  font-weight: 900;
}

.operation-detail-page__doc-hero dd,
.operation-detail-page__shipment-hero dd,
.operation-detail-page__supplier-head dd,
.operation-detail-page__kv-grid dd {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 0.86rem;
  font-weight: 820;
  word-break: break-word;
}

.operation-detail-page__shipment-hero {
  grid-template-columns: 56px minmax(0, 1.2fr) minmax(180px, 0.7fr);
  align-items: center;
}

.operation-detail-page__shipment-hero dl {
  grid-column: 3 / 4;
  grid-row: 1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.operation-detail-page__shipment-hero dl > div {
  min-height: 48px;
}

.operation-detail-page__icon-tile {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  background: var(--on-surface, #111);
  color: var(--surface, #fff);
  font-size: 1rem;
  font-weight: 900;
}

.operation-detail-page__domain-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.operation-detail-page__domain-card > h3 {
  color: var(--on-surface, #2d3435);
  font-size: 0.9rem;
}

.operation-detail-page__kv-grid {
  display: grid;
  gap: 0;
  margin: 0;
}

.operation-detail-page__kv-grid.is-two-col {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.operation-detail-page__kv-grid > div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  min-height: 40px;
  padding: 9px 0;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__item-info-card {
  gap: 14px;
}

.operation-detail-page__item-info-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 14px;
  align-items: end;
  padding: 14px;
  border: 1px solid var(--detail-border);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.72);
}

.operation-detail-page__item-info-main {
  display: grid;
  gap: 6px;
}

.operation-detail-page__item-info-main span,
.operation-detail-page__item-info-metrics span,
.operation-detail-page__item-info-sections h4,
.operation-detail-page__item-info-sections dt {
  color: var(--detail-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.operation-detail-page__item-info-main strong {
  color: var(--on-surface, #2d3435);
  font-size: clamp(1.35rem, 2vw, 1.9rem);
  font-weight: 950;
  line-height: 1.05;
}

.operation-detail-page__item-info-main small {
  color: var(--on-surface, #2d3435);
  font-size: 0.85rem;
  font-weight: 850;
}

.operation-detail-page__item-info-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid var(--detail-border);
  border-right: 0;
  background: var(--detail-surface-plain);
}

.operation-detail-page__item-info-metrics > div {
  display: grid;
  gap: 6px;
  min-height: 82px;
  padding: 12px;
  border-right: 1px solid var(--detail-border);
}

.operation-detail-page__item-info-metrics strong {
  color: var(--on-surface, #2d3435);
  font-size: 1.25rem;
  font-weight: 950;
}

.operation-detail-page__item-info-metrics small {
  color: var(--detail-muted);
  font-size: 0.72rem;
  font-weight: 850;
}

.operation-detail-page__item-info-sections {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.operation-detail-page__item-info-sections section {
  display: grid;
  align-content: start;
  gap: 8px;
}

.operation-detail-page__item-info-sections h4 {
  margin: 0;
  color: var(--on-surface, #2d3435);
}

.operation-detail-page__item-info-sections dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  border: 1px solid var(--detail-border);
  border-right: 0;
  background: var(--detail-surface-plain);
}

.operation-detail-page__item-info-sections dl > div {
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  min-height: 82px;
  padding: 12px;
  border-right: 1px solid var(--detail-border);
}

.operation-detail-page__item-info-sections dd {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 0.78rem;
  font-weight: 820;
  word-break: break-word;
}

.operation-detail-page__item-info-status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 4px 10px;
  color: var(--success, #2d7d46);
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  border: 1px solid rgb(45 125 70 / 0.42);
  background: rgb(45 125 70 / 0.08);
}

.operation-detail-page__domain-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--detail-surface-plain);
  color: var(--on-surface, #2d3435);
}

.operation-detail-page__domain-table th,
.operation-detail-page__domain-table td {
  padding: 10px 12px;
  border: 1px solid var(--detail-border);
  text-align: left;
  vertical-align: top;
  font-size: 0.78rem;
  font-weight: 760;
}

.operation-detail-page__domain-table th {
  color: var(--detail-muted);
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
}

.operation-detail-page__analysis-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  align-content: start;
}

.operation-detail-page__analysis-panel.is-shipment {
  border-left: 4px solid #df8a12;
}

.operation-detail-page__panel-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__panel-head h2 {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 1.05rem;
  font-weight: 950;
}

.operation-detail-page__panel-head span {
  color: var(--on-surface, #2d3435);
  font-size: 1.2rem;
  font-weight: 700;
}

.operation-detail-page__risk-band,
.operation-detail-page__impact-row,
.operation-detail-page__recommendation {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--detail-border);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.7);
}

.operation-detail-page__risk-band {
  grid-template-columns: 70px 96px minmax(0, 1fr);
  align-items: center;
}

.operation-detail-page__risk-band strong,
.operation-detail-page__recommendation span,
.operation-detail-page__shipment-hero .is-alert,
.operation-detail-page__metric-row .is-alert {
  color: var(--error, #d32626);
  font-weight: 950;
}

.operation-detail-page__risk-band p,
.operation-detail-page__analysis-panel p,
.operation-detail-page__analysis-panel li {
  margin: 0;
  color: var(--detail-muted);
  font-size: 0.78rem;
  font-weight: 720;
  line-height: 1.55;
}

.operation-detail-page__impact-row {
  grid-template-columns: 1fr 78px 1fr;
  align-items: center;
}

.operation-detail-page__impact-row span,
.operation-detail-page__recommendation span,
.operation-detail-page__chip {
  justify-self: start;
  padding: 4px 8px;
  border: 1px solid currentColor;
  font-size: 0.68rem;
  font-weight: 950;
  text-transform: uppercase;
}

.operation-detail-page__chip.is-high,
.operation-detail-page__impact-row span,
.operation-detail-page__recommendation span {
  color: var(--error, #d32626);
}

.operation-detail-page__bottom-actions {
  display: grid;
  grid-template-columns: max-content 1fr max-content max-content;
  gap: 10px;
  align-items: center;
}

.operation-detail-page__bottom-actions--start {
  display: flex;
  justify-content: flex-end;
}

.operation-detail-page__recommendation {
  grid-template-columns: 56px minmax(0, 1fr) max-content;
  align-items: center;
}

.operation-detail-page__recommendation p,
.operation-detail-page__recommendation small {
  grid-column: 2 / 4;
}

.operation-detail-page__recommendation .page-button {
  min-height: 34px;
}

.operation-detail-page__shipment-layout {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.operation-detail-page__shipment-summary-strip {
  display: grid;
  grid-template-columns: minmax(300px, 1.25fr) minmax(210px, 0.7fr) minmax(260px, 0.85fr) minmax(220px, 0.7fr);
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
}

.operation-detail-page__shipment-summary-card {
  display: grid;
  align-content: center;
  gap: 6px;
  min-height: 102px;
  padding: 16px 18px;
  border-right: 1px solid var(--detail-border);
}

.operation-detail-page__shipment-summary-card:last-child {
  border-right: 0;
}

.operation-detail-page__shipment-summary-card--title {
  grid-template-columns: 64px minmax(0, 1fr);
  align-items: center;
}

.operation-detail-page__shipment-icon-tile,
.operation-detail-page__shipment-recommendation-icon {
  display: grid;
  place-items: center;
  background: #050505;
  color: #fff;
}

.operation-detail-page__shipment-icon-tile {
  width: 56px;
  height: 56px;
}

.operation-detail-page__shipment-icon-tile .material-symbols-outlined {
  font-size: 2rem;
}

.operation-detail-page__shipment-summary-card h2 {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: clamp(1.25rem, 2vw, 1.7rem);
  font-weight: 950;
  line-height: 1.1;
}

.operation-detail-page__shipment-summary-card span,
.operation-detail-page__shipment-summary-card dt,
.operation-detail-page__shipment-card h3,
.operation-detail-page__shipment-ai-head h2,
.operation-detail-page__shipment-recommendation-title {
  color: var(--on-surface, #2d3435);
  font-size: 0.78rem;
  font-weight: 950;
  letter-spacing: 0.02em;
}

.operation-detail-page__shipment-summary-card > span,
.operation-detail-page__shipment-summary-card dt,
.operation-detail-page__shipment-card h3,
.operation-detail-page__shipment-ai-head h2 {
  text-transform: uppercase;
}

.operation-detail-page__shipment-summary-card strong {
  color: var(--on-surface, #2d3435);
  font-size: 0.98rem;
  font-weight: 920;
}

.operation-detail-page__shipment-summary-card .is-alert {
  color: var(--error, #d32626);
  font-size: 1.35rem;
}

.operation-detail-page__shipment-summary-card small {
  color: var(--on-surface, #2d3435);
  font-size: 0.82rem;
  font-weight: 760;
}

.operation-detail-page__shipment-summary-card dl {
  display: grid;
  gap: 10px;
  margin: 0;
}

.operation-detail-page__shipment-summary-card dl > div {
  display: grid;
  grid-template-columns: 126px minmax(0, 1fr);
  gap: 12px;
}

.operation-detail-page__shipment-summary-card dt,
.operation-detail-page__shipment-summary-card dd {
  margin: 0;
}

.operation-detail-page__shipment-summary-card dd {
  color: var(--on-surface, #2d3435);
  font-size: 0.86rem;
  font-weight: 760;
}

.operation-detail-page__shipment-content-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(420px, 1fr);
  gap: 14px;
  align-items: start;
}

.operation-detail-page__shipment-main-column {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.operation-detail-page__shipment-card,
.operation-detail-page__shipment-ai-panel {
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
}

.operation-detail-page__shipment-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.operation-detail-page__shipment-card h3 {
  margin: 0;
  font-size: 0.95rem;
}

.operation-detail-page__shipment-table {
  width: 100%;
  border-collapse: collapse;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.78);
}

.operation-detail-page__shipment-table th,
.operation-detail-page__shipment-table td {
  padding: 10px 12px;
  border: 1px solid var(--detail-border);
  color: var(--on-surface, #2d3435);
  font-size: 0.76rem;
  font-weight: 760;
  text-align: left;
  vertical-align: middle;
}

.operation-detail-page__shipment-table th {
  color: var(--detail-muted);
  font-size: 0.68rem;
  font-weight: 950;
}

.operation-detail-page__shipment-table td:first-child,
.operation-detail-page__shipment-table th:first-child {
  width: 52px;
  text-align: center;
}

.operation-detail-page__shipment-table td.is-delay {
  color: var(--error, #d32626);
  font-weight: 950;
}

.operation-detail-page__shipment-status {
  font-weight: 950;
  text-transform: uppercase;
}

.operation-detail-page__shipment-status.is-departed,
.operation-detail-page__shipment-status.is-arrived {
  color: #197143;
}

.operation-detail-page__shipment-status.is-delayed {
  color: var(--error, #d32626);
}

.operation-detail-page__shipment-status.is-pending {
  color: var(--on-surface, #2d3435);
}

.operation-detail-page__chip.is-medium {
  color: #f97316;
}

.operation-detail-page__chip.is-low {
  color: #197143;
}

.operation-detail-page__shipment-ai-panel {
  display: grid;
  border-left: 4px solid #f97316;
}

.operation-detail-page__shipment-ai-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__shipment-ai-head h2,
.operation-detail-page__shipment-ai-head p {
  margin: 0;
}

.operation-detail-page__shipment-ai-head p,
.operation-detail-page__shipment-ai-head small,
.operation-detail-page__shipment-recommendation p,
.operation-detail-page__shipment-ai-foot p {
  color: var(--on-surface, #2d3435);
  font-size: 0.78rem;
  font-weight: 720;
  line-height: 1.55;
}

.operation-detail-page__shipment-ai-head small {
  min-width: max-content;
  color: var(--detail-muted);
}

.operation-detail-page__shipment-ai-head b {
  color: var(--on-surface, #2d3435);
}

.operation-detail-page__shipment-recommendation {
  display: grid;
  grid-template-columns: 112px 98px minmax(0, 1fr) minmax(0, 1fr) 72px;
  gap: 12px 16px;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid var(--detail-border);
}

.operation-detail-page__shipment-recommendation-title {
  grid-column: 1 / -1;
  font-size: 0.86rem;
}

.operation-detail-page__shipment-recommendation-icon {
  width: 72px;
  height: 72px;
}

.operation-detail-page__shipment-recommendation-icon .material-symbols-outlined {
  font-size: 2.4rem;
}

.operation-detail-page__shipment-recommendation p {
  margin: 0;
}

.operation-detail-page__shipment-recommendation-confidence {
  color: #197143;
  font-size: 1.25rem;
  font-weight: 950;
  text-align: right;
}

.operation-detail-page__shipment-recommendation-actions {
  grid-column: 3 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(96px, 1fr));
  gap: 12px;
}

.operation-detail-page__shipment-recommendation-actions .page-button {
  min-height: 34px;
}

.operation-detail-page__shipment-ai-foot {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) max-content;
  gap: 10px;
  align-items: center;
  padding: 14px 18px;
}

.operation-detail-page__shipment-ai-foot p {
  margin: 0;
  color: var(--detail-muted);
}

.operation-detail-page__edit-form {
  display: grid;
  gap: 22px;
}

.operation-detail-page__inline-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.operation-detail-page__inline-edit-form {
  margin-top: 16px;
}

.operation-detail-page__edit-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

.operation-detail-page__edit-section h3 {
  grid-column: 1 / -1;
  margin: 0;
  font-size: 1rem;
  font-weight: 950;
}

.operation-detail-page__edit-field {
  display: grid;
  gap: 7px;
  font-size: 0.78rem;
  font-weight: 850;
  color: var(--text-muted);
}

.operation-detail-page__edit-field--full {
  grid-column: 1 / -1;
}

.operation-detail-page__edit-field input,
.operation-detail-page__edit-field select,
.operation-detail-page__edit-field textarea {
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--outline-variant, var(--line));
  background: #fff;
  padding: 10px 12px;
  color: var(--text);
  font: inherit;
}

.operation-detail-page__edit-field input[readonly] {
  background: rgb(var(--surface-container-low-rgb, 245 245 245) / 0.72);
  color: var(--text-muted);
  cursor: not-allowed;
}

.operation-detail-page__edit-field textarea {
  min-height: 92px;
  resize: vertical;
}

.operation-detail-page__supplier-head {
  grid-template-columns: minmax(0, 1fr);
}

.operation-detail-page__supplier-head dl {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.operation-detail-page__metric-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
}

.operation-detail-page__metric-row > div {
  display: grid;
  gap: 8px;
  min-height: 76px;
  padding: 13px 16px;
  border-right: 0;
}

.operation-detail-page__metric-row strong {
  color: var(--on-surface, #2d3435);
  font-size: 1.12rem;
  font-weight: 950;
}

.operation-detail-page__chart-panel {
  position: relative;
  min-height: 220px;
  border: 1px solid var(--detail-border);
  background:
    repeating-linear-gradient(to bottom, transparent 0 35px, var(--detail-border) 36px),
    linear-gradient(180deg, transparent, rgb(var(--outline-variant-rgb, 172 179 180) / 0.18));
}

.operation-detail-page__chart-panel span {
  position: absolute;
  left: 5%;
  right: 5%;
  height: 2px;
  background: var(--on-surface, #111);
  transform-origin: left center;
}

.operation-detail-page__chart-panel span:nth-child(1) {
  top: 45%;
  transform: rotate(5deg);
}

.operation-detail-page__chart-panel span:nth-child(2) {
  top: 58%;
  border-top: 2px dashed var(--on-surface, #111);
  background: transparent;
  transform: rotate(-6deg);
}

.operation-detail-page__chart-panel span:nth-child(3) {
  top: 66%;
  height: 34px;
  background: rgb(var(--outline-variant-rgb, 172 179 180) / 0.22);
}

.operation-detail-page__chart-panel strong {
  position: absolute;
  left: 18px;
  top: 14px;
  color: var(--detail-muted);
  font-size: 0.76rem;
}

.page-table-wrap {
  overflow-x: auto;
}

.operation-detail-page__file-list {
  display: grid;
  gap: 10px;
}

.operation-detail-page__file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 62px;
  padding: 12px 14px;
  border: 1px solid var(--detail-border);
  background: var(--detail-surface-plain);
  color: var(--on-surface, #2d3435);
  text-decoration: none;
}

.operation-detail-page__file-row span {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.operation-detail-page__file-row strong,
.operation-detail-page__file-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.operation-detail-page__file-row small {
  color: var(--detail-muted);
  font-size: 0.72rem;
}

.operation-detail-page__file-row em {
  min-width: max-content;
  font-style: normal;
  font-size: 0.78rem;
  font-weight: 900;
}

.operation-detail-page__state {
  color: var(--on-surface, #2d3435);
  font-weight: 800;
}

.operation-detail-page__state--error {
  color: var(--error, #9f403d);
}

.theme-dark .operation-detail-page {
  --detail-border: rgb(255 255 255 / 0.12);
  --detail-border-strong: rgb(255 255 255 / 0.22);
  --detail-surface: rgb(var(--surface-container-rgb, 31 31 31) / 0.92);
  --detail-surface-plain: rgb(var(--surface-container-high-rgb, 42 42 42) / 0.72);
}

@media (max-width: 1180px) {
  .operation-detail-page__layout,
  .operation-detail-page__document-grid {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__shipment-summary-strip,
  .operation-detail-page__shipment-content-grid {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__shipment-summary-card {
    border-right: 0;
    border-bottom: 1px solid var(--detail-border);
  }

  .operation-detail-page__shipment-summary-card:last-child {
    border-bottom: 0;
  }

  .operation-detail-page__shipment-hero {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .operation-detail-page__shipment-hero dl {
    grid-column: 1 / -1;
    grid-row: auto;
  }
}

@media (max-width: 820px) {
  .operation-detail-page__domain-card {
    padding: 14px;
  }

  .operation-detail-page__summary-strip,
  .operation-detail-page__timeline,
  .operation-detail-page__impact-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operation-detail-page__definition-grid {
    grid-template-columns: 120px minmax(0, 1fr);
  }

  .operation-detail-page__risk-summary {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__doc-hero dl,
  .operation-detail-page__shipment-hero dl,
  .operation-detail-page__supplier-head dl,
  .operation-detail-page__item-info-hero,
  .operation-detail-page__item-info-metrics,
  .operation-detail-page__item-info-sections,
  .operation-detail-page__metric-row,
  .operation-detail-page__kv-grid.is-two-col {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__doc-hero dl > div,
  .operation-detail-page__shipment-hero dl > div,
  .operation-detail-page__supplier-head dl > div {
    border-right: 0;
    border-bottom: 1px solid var(--detail-border);
  }

  .operation-detail-page__shipment-card {
    overflow-x: auto;
  }

  .operation-detail-page__shipment-table {
    min-width: 680px;
  }

  .operation-detail-page__shipment-recommendation {
    grid-template-columns: 72px minmax(0, 1fr) max-content;
  }

  .operation-detail-page__shipment-recommendation-title {
    grid-column: 1 / -1;
  }

  .operation-detail-page__shipment-recommendation-reason,
  .operation-detail-page__shipment-recommendation-action {
    grid-column: 2 / -1;
  }

  .operation-detail-page__shipment-recommendation-confidence {
    grid-column: 3 / 4;
  }

  .operation-detail-page__shipment-recommendation-actions {
    grid-column: 1 / -1;
  }

  .operation-detail-page__item-media-grid {
    grid-auto-columns: 160px;
  }

  .operation-detail-page__item-info-card {
    gap: 10px;
  }

  .operation-detail-page__item-info-hero {
    padding: 12px;
  }

  .operation-detail-page__item-info-sections dl {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operation-detail-page__item-info-metrics {
    border-right: 1px solid var(--detail-border);
  }

  .operation-detail-page__item-info-metrics > div {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--detail-border);
  }

  .operation-detail-page__item-info-metrics > div:last-child {
    border-bottom: 0;
  }
}

@media (max-width: 560px) {
  .operation-detail-page__header {
    flex-direction: column;
  }

  .operation-detail-page__actions,
  .operation-detail-page__actions .page-button {
    width: 100%;
  }

  .operation-detail-page__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .operation-detail-page__summary-strip,
  .operation-detail-page__timeline,
  .operation-detail-page__definition-grid,
  .operation-detail-page__impact-grid,
  .operation-detail-page__action-list {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__summary-cell,
  .operation-detail-page__impact-card {
    border-right: 0;
    border-bottom: 1px solid var(--detail-border);
  }

  .operation-detail-page__summary-cell:last-child,
  .operation-detail-page__impact-card:last-child {
    border-bottom: 0;
  }

  .operation-detail-page__shipment-summary-card,
  .operation-detail-page__shipment-card,
  .operation-detail-page__shipment-ai-head,
  .operation-detail-page__shipment-recommendation,
  .operation-detail-page__shipment-ai-foot {
    padding: 12px;
  }

  .operation-detail-page__shipment-summary-card--title,
  .operation-detail-page__shipment-summary-card dl > div,
  .operation-detail-page__shipment-ai-head,
  .operation-detail-page__shipment-ai-foot {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__shipment-summary-card--title {
    justify-items: start;
  }

  .operation-detail-page__shipment-recommendation {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__shipment-recommendation-icon,
  .operation-detail-page__shipment-recommendation-priority,
  .operation-detail-page__shipment-recommendation-reason,
  .operation-detail-page__shipment-recommendation-action,
  .operation-detail-page__shipment-recommendation-confidence,
  .operation-detail-page__shipment-recommendation-actions {
    grid-column: 1 / -1;
  }

  .operation-detail-page__shipment-recommendation-confidence {
    text-align: left;
  }

  .operation-detail-page__shipment-recommendation-actions {
    grid-template-columns: 1fr;
  }

  .operation-detail-page__item-media-grid {
    grid-auto-columns: 144px;
  }

  .operation-detail-page__item-media {
    grid-template-rows: 104px auto;
  }

  .operation-detail-page__item-info-sections dl {
    grid-template-columns: 1fr;
    border-right: 1px solid var(--detail-border);
  }

  .operation-detail-page__item-info-sections dl > div,
  .operation-detail-page__item-info-sections dl > div:nth-child(2n) {
    border-right: 0;
    border-bottom: 1px solid var(--detail-border);
  }

  .operation-detail-page__item-info-sections dl > div:last-child {
    border-bottom: 0;
  }

  .operation-detail-page__item-info-main {
    padding: 0;
  }

  .operation-detail-page__item-info-main strong {
    font-size: 1.35rem;
    overflow-wrap: anywhere;
  }

  .operation-detail-page__item-info-metrics > div {
    min-height: 68px;
  }

  .operation-detail-page__item-info-sections {
    gap: 8px;
  }

  .operation-detail-page__item-info-sections section {
    padding: 10px 12px;
  }

  .operation-detail-page__item-info-sections dl > div {
    grid-template-columns: 1fr;
    gap: 4px;
    min-height: auto;
    padding: 10px 0;
  }

  .operation-detail-page__item-info-sections dd {
    overflow-wrap: anywhere;
  }

  .operation-detail-page__timeline::before {
    display: none;
  }
}

.operation-detail-page__confirm-form {
  display: grid;
  gap: 14px;
}

.operation-detail-page__confirm-line {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
}

.operation-detail-page__confirm-line strong,
.operation-detail-page__confirm-line small {
  display: block;
}

.operation-detail-page__confirm-line small {
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.operation-detail-page__confirm-line input {
  width: 100%;
  min-height: 42px;
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 0 12px;
  font: inherit;
  font-weight: 700;
}

.operation-detail-page__error {
  color: #b42318;
  font-weight: 700;
}

/* ── 반품 상태 변경 ── */
.operation-detail-page__return-actions {
  border: 2px solid var(--primary, #4e4e4e);
}

.operation-detail-page__return-status-label {
  margin: 0 0 12px;
  font-size: 0.85rem;
  color: var(--muted);
}

.operation-detail-page__return-status-label strong {
  color: var(--text);
  font-weight: 900;
}

.operation-detail-page__return-reason {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 16px;
}

.operation-detail-page__return-reason span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
}

.operation-detail-page__return-reason input {
  padding: 10px 12px;
  border: 1px solid var(--line);
  background: var(--surface);
  font: inherit;
  font-size: 0.85rem;
}

.operation-detail-page__return-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.operation-detail-page__return-proofs {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.operation-detail-page__return-proofs span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted);
}

.operation-detail-page__proof-gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.operation-detail-page__proof-gallery a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border: 1px solid var(--line);
  background: var(--surface);
  overflow: hidden;
  border-radius: 4px;
  transition: opacity 0.2s;
}

.operation-detail-page__proof-gallery a:hover {
  opacity: 0.8;
}

.operation-detail-page__proof-gallery img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.operation-detail-page__proof-gallery .material-symbols-outlined {
  font-size: 32px;
  color: var(--muted);
}

</style>
