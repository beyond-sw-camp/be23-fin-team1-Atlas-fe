<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useActorScope } from '../../../composables/useActorScope'
import {
  changeItemStatus,
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
import { getAttachment, uploadAttachment, type AttachmentFileDto } from '../../../services/file'
import { getInventory, getInventories } from '../../../services/inventory'
import { getLogisticsNode } from '../../../services/logistics'
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
  getItemMedia,
  itemMediaFilesFromItem,
  resolveItemMediaUrl,
  resolveItemOriginalMediaUrl,
  type ItemMediaFile,
} from '../../../services/itemMedia'



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

const route = useRoute()
const router = useRouter()
const preferences = useAtlasPreferencesStore()
const sidebarBadges = useAtlasSidebarBadgesStore()
const actor = useActorScope()

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

function t(ko: string, en: string) {
  return preferences.language === 'ko' ? ko : en
}

const detailCopy = computed(() =>
  preferences.language === 'ko'
    ? {
        configs: {
          orders: { eyebrow: '공급망 운영 / 발주 관리', title: '발주 상세', idLabel: '발주번호' },
          shipments: { eyebrow: '공급망 운영 / 출하', title: '출하 상세', idLabel: '출하번호' },
          returns: { eyebrow: '공급망 운영 / 반품', title: '반품 상세', idLabel: '반품번호' },
          inventory: { eyebrow: '공급망 운영 / 재고', title: '재고 상세', idLabel: '재고 ID' },
          items: { eyebrow: '공급망 운영 / 품목', title: '품목 상세', idLabel: '품목코드' },
          suppliers: { eyebrow: '공급망 운영 / 협력사', title: '협력사 상세', idLabel: '협력사 코드' },
          'logistics-nodes': { eyebrow: '공급망 운영 / 물류거점', title: '물류거점 상세', idLabel: '거점 코드' },
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
const itemMediaViewerOpen = ref(false)
const itemMediaViewerIndex = ref(0)
const itemEditModalOpen = ref(false)
const itemEditLoading = ref(false)
const itemEditErrorMessage = ref('')
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
    item.publicId ??
    item.inventoryPublicId ??
    item.poPublicId ??
    publicId.value
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
  if (kind.value === 'orders') return 'PURCHASE ORDER'
  if (kind.value === 'shipments') return 'SHIPMENT DETAIL'
  if (kind.value === 'returns') return 'RETURN REQUEST'
  if (kind.value === 'suppliers') return 'SUPPLIER DETAIL'
  if (kind.value === 'inventory') return 'INVENTORY DETAIL'
  if (kind.value === 'items') return 'ITEM DETAIL'
  return config.value.title
})

const riskLevel = computed(() => {
  if (statusTone.value === 'critical') return 'HIGH'
  if (statusTone.value === 'success') return 'LOW'
  return 'MEDIUM'
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
      eta: formatDate(row.recordedAt),
      delay: row.statusCode === 'DELAYED' ? formatMinutes(related.value.eta?.delayMinutes) : '0',
      status: row.statusCode,
      order: data.value?.purchaseOrderPublicId ?? data.value?.subPurchaseOrderPublicId ?? '-',
    }))
  }
  return [
    { seq: 1, node: display(data.value?.originNodeName ?? data.value?.originNodeCode), eta: formatDate(data.value?.departureEta), delay: '0', status: 'DEPARTED', order: display(data.value?.purchaseOrderPublicId) },
    { seq: 2, node: display(data.value?.currentNodeName ?? data.value?.currentNodeCode), eta: formatDate(data.value?.departureEta), delay: formatMinutes(related.value.eta?.delayMinutes) || '142분', status: status.value || 'DELAYED', order: display(data.value?.purchaseOrderPublicId) },
    { seq: 3, node: display(data.value?.destinationNodeName ?? data.value?.destinationNodeCode), eta: formatDate(related.value.eta?.estimatedArrivalAt ?? data.value?.arrivalEta), delay: formatMinutes(related.value.eta?.delayMinutes) || '142분', status: 'PENDING', order: display(data.value?.purchaseOrderPublicId) },
  ]
})

const returnItems = computed(() => {
  if (lineItems.value.length > 0) return lineItems.value
  return [
    { itemPublicId: 'MAT-1001', itemName: 'STEEL COIL', unit: 'EA', returnQty: 5, detailReason: '표면 손상', itemStatus: 'REJECTED' },
    { itemPublicId: 'MAT-1002', itemName: 'ALUMINUM SHEET', unit: 'EA', returnQty: 2, detailReason: '치수 불량', itemStatus: 'REJECTED' },
  ]
})

const supplierCertificateRows = computed(() => [
  ['HACCP', 'HACCP-24-01520', '2024.04.10', '2026.05.10', 'CERTIFICATE EXPIRING', 'MEDIUM', '12일 전'],
  ['ISO9001', 'ISO9001-23-0876', '2023.03.15', '2026.03.15', 'EXPIRED', 'HIGH', '-44일'],
  ['원산지 증명', 'COO-26-000331', '2026.01.05', '2026.07.05', 'VALID', 'LOW', '68일'],
  ['식품안전관리 인증', 'FSMS-25-00211', '2025.02.20', '2027.02.19', 'VALID', 'LOW', '296일'],
])

const inventoryRows = computed(() => [
  ['ITEM-000124', '알루미늄 하우징 A1', 'EA', '120', '500', '-380', 'SHORTAGE', 'PO-2026-000014'],
  ['ITEM-000178', display(data.value?.itemName ?? '모터 컨트롤러 M5'), 'EA', formatNumber(data.value?.remainingQty ?? 35), '200', '-165', 'SHORTAGE', 'PO-2026-000021'],
  ['ITEM-000256', '베어링 6205', 'EA', '87', '300', '-213', 'SHORTAGE', 'PO-2026-000031'],
  ['ITEM-000312', 'PCB ASSY B-100', 'EA', '210', '200', '10', 'NORMAL', '-'],
])

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
  const primaryMediaFile = itemMediaFiles.value.find((file) => file.publicId === item.primaryMediaFilePublicId) ?? itemMediaFiles.value[0]

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
        [t('출발 물류거점', 'Origin Node'), item.originLogisticsNodeName ?? item.originLogisticsNodePublicId],
        [t('월간 생산량', 'Monthly Capacity'), formatNumber(item.monthlyCapacity)],
        [t('공급 유형', 'Supply Type'), item.supplyType],
        [t('상태', 'Status'), displayItemStatus(item.status)],
      ],
    },
    {
      title: t('미디어 / 시스템', 'Media / System'),
      rows: [
        [t('대표 미디어', 'Primary Media'), primaryMediaFile?.originalFileName ?? item.primaryMediaFilePublicId],
        [t('첨부 묶음', 'Attachment'), item.mediaAttachmentPublicId],
        [t('등록일', 'Created At'), formatDate(item.createdAt)],
        [t('최종 수정', 'Updated At'), formatDate(item.updatedAt)],
      ],
    },
  ].map((group) => ({
    title: group.title,
    rows: group.rows.map(([label, value]) => ({ label: String(label), value: display(value) })),
  }))
})

const itemHistoryRows = computed(() => {
  if (kind.value !== 'items') return []
  const item = data.value
  const rows: Array<{
    id: string
    time: string
    event: string
    qty: string
    ref: string
    status: string
    note: string
  }> = []

  if (item) {
    rows.push({
      id: 'item-created',
      time: formatDate(item.createdAt),
      event: t('품목 등록', 'Item Registered'),
      qty: display(item.availableQty),
      ref: display(item.itemCode),
      status: displayItemStatus(item.status),
      note: display(item.categoryName),
    })
  }

  const linkedOrders = Array.isArray(related.value.linkedOrders) ? related.value.linkedOrders : []
  linkedOrders.slice(0, 4).forEach((order: any, index: number) => {
    rows.push({
      id: order.poItemPublicId ?? order.poPublicId ?? `linked-order-${index}`,
      time: formatDate(order.orderedAt ?? order.expectedDueDate),
      event: t('발주 유입', 'Purchase Order Received'),
      qty: formatNumber(order.orderedQty),
      ref: display(order.poNumber ?? order.poPublicId),
      status: display(order.poStatus ?? order.itemStatus),
      note: order.expectedDueDate ? `${t('납기', 'Due')} ${display(order.expectedDueDate)}` : '-',
    })
  })

  if (item?.updatedAt && item.updatedAt !== item.createdAt) {
    rows.push({
      id: 'item-updated',
      time: formatDate(item.updatedAt),
      event: t('품목 정보 수정', 'Item Updated'),
      qty: display(item.availableQty),
      ref: display(item.itemCode),
      status: displayItemStatus(item.status),
      note: t('기본 정보 또는 공급 역량 변경', 'Basic info or capability changed'),
    })
  }

  if (itemMediaFiles.value.length > 0) {
    const primaryMediaFile = itemMediaFiles.value.find((file) => file.publicId === item?.primaryMediaFilePublicId) ?? itemMediaFiles.value[0]
    rows.push({
      id: 'item-media',
      time: formatDate(item?.updatedAt),
      event: t('미디어 등록', 'Media Attached'),
      qty: `${itemMediaFiles.value.length}`,
      ref: display(primaryMediaFile?.originalFileName ?? item?.primaryMediaFilePublicId),
      status: t('활성', 'Active'),
      note: t('대표 이미지/동영상 연결', 'Primary image/video linked'),
    })
  }

  return rows
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
      { label: '상태', value: display(item.poStatus), tone: statusTone.value },
      { label: '발주일', value: formatDate(item.orderedAt) },
      { label: '거래처', value: display(item.supplierName) },
      { label: '총 금액', value: formatAmount(item.totalAmount, item.currencyCode) },
    ]
  }

  if (kind.value === 'shipments') {
    return [
      { label: '운송 상태', value: display(item.status), tone: statusTone.value },
      { label: '현재 거점', value: display(item.currentNodeName ?? item.currentNodeCode ?? item.currentNodePublicId) },
      { label: '출발 ETA', value: formatDate(item.departureEta) },
      { label: '도착 ETA', value: formatDate(related.value.eta?.estimatedArrivalAt ?? item.arrivalEta) },
    ]
  }

  if (kind.value === 'returns') {
    return [
      { label: '판정', value: display(item.returnStatus), tone: statusTone.value },
      { label: '반품 유형', value: display(item.returnType) },
      { label: '요청 조직', value: display(item.requestOrganizationName ?? item.requestOrganizationPublicId) },
      { label: '대상 조직', value: display(item.targetOrganizationName ?? item.targetOrganizationPublicId) },
    ]
  }

  if (kind.value === 'inventory') {
    return [
      { label: '품목', value: display(item.itemName ?? item.itemCode) },
      { label: '상태', value: display(item.status), tone: statusTone.value },
      { label: '잔여 수량', value: formatNumber(item.remainingQty), meta: 'EA' },
      { label: '주문 가능', value: formatNumber(item.availableQty), meta: 'EA' },
    ]
  }

  if (kind.value === 'items') {
    return [
      { label: '품목 코드', value: display(item.itemCode) },
      { label: '단위', value: display(item.unit) },
      { label: '공급사', value: display(item.supplierName) },
      { label: '상태', value: display(item.status), tone: statusTone.value },
    ]
  }

  if (kind.value === 'suppliers') {
    return [
      { label: '협력사 코드', value: display(item.supplierCode) },
      { label: '상태', value: display(item.supplierStatus), tone: statusTone.value },
      { label: '담당자', value: display(item.primaryContactName) },
      { label: '연락처', value: display(item.primaryContactPhone) },
    ]
  }

  if (kind.value === 'logistics-nodes') {
    return [
      { label: '거점 코드', value: display(item.nodeCode) },
      { label: '유형', value: display(item.nodeType) },
      { label: '가용 상태', value: display(item.capacityStatus), tone: statusTone.value },
      { label: '운영 여부', value: item.active ? 'ACTIVE' : 'INACTIVE', tone: item.active ? 'success' : 'critical' },
    ]
  }

  if (kind.value === 'settlements') {
    return [
      { label: '정산 상태', value: display(item.settlementStatus), tone: statusTone.value },
      { label: '대상 유형', value: display(item.targetType) },
      { label: '기간', value: `${item.settlementPeriodStart ?? '-'} ~ ${item.settlementPeriodEnd ?? '-'}` },
      { label: '금액', value: formatAmount(item.amount, item.currencyCode) },
    ]
  }

  return [
    { label: '인증 번호', value: display(item.certificateNo) },
    { label: '인증 유형', value: display(item.certificateTypeName ?? item.certificateTypeCode) },
    { label: '상태', value: display(item.certificateStatus), tone: statusTone.value },
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
      { label: '승인/거절', meta: display(item?.returnStatus), state: statusTone.value === 'critical' ? 'critical' : statusTone.value === 'success' ? 'done' : 'active' },
      { label: '완료', meta: formatDate(item?.updatedAt), state: current.includes('COMPLETE') ? 'done' : 'pending' },
    ]
  }

  if (kind.value === 'orders') {
    return [
      { label: '발주 생성', meta: formatDate(item?.createdAt ?? item?.orderedAt), state: 'done' },
      { label: '협력사 확인', meta: display(item?.supplierName), state: current.includes('CREATED') ? 'active' : 'done' },
      { label: '수량 확정', meta: `${lineItems.value.length} items`, state: current.includes('PARTIAL') ? 'active' : current.includes('REJECT') ? 'critical' : 'done' },
      { label: '운영 완료', meta: display(item?.poStatus), state: current.includes('COMPLETE') ? 'done' : 'pending' },
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
      ['거래처 상태', data.value?.supplierStatus ?? '-'],
      ['권장 조치', statusTone.value === 'warning' ? '협력사 응답 및 확정 수량 확인' : '발주 품목 상태 확인'],
    ]
  }
  if (kind.value === 'returns') {
    return [
      ['반품 사유', data.value?.reason ?? '-'],
      ['처리 방식', data.value?.resolutionType ?? '-'],
      ['권장 조치', '검수 결과와 후속 체크리스트 확인'],
    ]
  }
  return [
    ['식별자', publicId.value],
    ['상태', status.value || '-'],
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
        ['상태', item.poStatus],
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
        ['상태', item.status],
        ['운송사', item.carrierName],
        ['차량번호', item.vehicleNo],
        ['출발 예정', formatDate(item.departureEta)],
        ['도착 예정', formatDate(item.arrivalEta)],
      ]),
      section('경로 정보', [
        ['출발지', item.originNodeName ?? item.originNodePublicId],
        ['도착지', item.destinationNodeName ?? item.destinationNodePublicId],
        ['예상 도착', formatDate(related.value.eta?.estimatedArrivalAt)],
        ['지연 시간', formatMinutes(related.value.eta?.delayMinutes)],
      ]),
    ]
  }

  if (kind.value === 'returns') {
    return [
      section('기본 정보', [
        ['반품번호', item.returnNumber ?? item.publicId],
        ['상태', item.returnStatus],
        ['요청 조직', item.requestOrganizationName ?? item.requestOrganizationPublicId],
        ['대상 조직', item.targetOrganizationName ?? item.targetOrganizationPublicId],
        ['반품 유형', item.returnType],
        ['사유', item.reason],
      ]),
    ]
  }

  if (kind.value === 'inventory') {
    return [
      section('재고 정보', [
        ['품목', item.itemName],
        ['품목코드', item.itemCode],
        ['상태', item.status],
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
        ['상태', item.status],
      ]),
    ]
  }

  if (kind.value === 'suppliers') {
    return [
      section('협력사 정보', [
        ['협력사 코드', item.supplierCode],
        ['협력사명', item.supplierName],
        ['상태', item.supplierStatus],
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
        ['유형', item.nodeType],
        ['가용 상태', item.capacityStatus],
        ['주소', item.address],
        ['운영 여부', item.active ? 'ACTIVE' : 'INACTIVE'],
      ]),
    ]
  }

  if (kind.value === 'settlements') {
    return [
      section('정산 정보', [
        ['정산 ID', item.publicId],
        ['상태', item.settlementStatus],
        ['대상 유형', item.targetType],
        ['대상 ID', item.targetPublicId],
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
      ['상태', item.certificateStatus],
      ['발급일', item.issuedAt],
      ['만료일', item.expiredAt],
      ['발급기관', item.issuerName],
      ['반려 사유', item.rejectReason],
      ['첨부 ID', item.attachmentPublicId],
    ]),
  ]
})

const lineItems = computed(() => {
  const item = data.value
  if (!item) return []
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
  if (kind.value === 'certificates') {
    return preferences.language === 'ko'
      ? ['일시', '이전 상태', '변경 상태', '사유']
      : ['Date', 'Before', 'After', 'Reason']
  }
  return ['항목', '값', '상태']
})

const detailRows = computed(() => sections.value.flatMap((item) => item.rows))

const aiImpactRows = computed(() => {
  if (kind.value === 'orders') {
    return [
      ['하위 발주', statusTone.value === 'critical' ? 'HIGH' : 'MEDIUM', `${lineItems.value.length}건 영향 가능`],
      ['출하', statusTone.value === 'success' ? 'LOW' : 'MEDIUM', '요청 납기 기준 확인 필요'],
      ['재고', 'MEDIUM', '품목별 가용 수량 확인'],
      ['협력사 영향', statusTone.value === 'warning' ? 'HIGH' : 'MEDIUM', display(data.value?.supplierName)],
    ]
  }

  if (kind.value === 'shipments') {
    return [
      ['배송 지연', statusTone.value === 'critical' ? 'HIGH' : 'MEDIUM', formatMinutes(related.value.eta?.delayMinutes)],
      ['영향 발주', 'MEDIUM', `${lineItems.value.length}건`],
      ['재고', 'LOW', '입고 일정 확인'],
      ['고객 영향', statusTone.value === 'critical' ? 'HIGH' : 'MEDIUM', display(data.value?.destinationNodeName)],
    ]
  }

  if (kind.value === 'returns') {
    return [
      ['검수', statusTone.value === 'critical' ? 'HIGH' : 'MEDIUM', display(data.value?.reason)],
      ['교체 출고', 'MEDIUM', '가용 재고 확인'],
      ['환불', 'LOW', display(data.value?.resolutionType)],
      ['고객 영향', statusTone.value === 'critical' ? 'HIGH' : 'MEDIUM', display(data.value?.targetOrganizationName)],
    ]
  }

  return [
    ['운영 상태', statusTone.value === 'critical' ? 'HIGH' : statusTone.value === 'success' ? 'LOW' : 'MEDIUM', display(status.value)],
    ['관련 항목', 'MEDIUM', `${lineItems.value.length}건`],
    ['데이터 품질', 'LOW', '필수 필드 확인'],
    ['후속 조치', 'MEDIUM', '담당자 검토'],
  ]
})

const aiChecklist = computed(() => [
  '상세 필드와 최신 상태 확인',
  '관련 항목 수량 및 일정 검토',
  statusTone.value === 'critical' ? '담당자 알림 및 대체안 검토' : '변경 이력과 후속 작업 확인',
])

const historyRows = computed(() => {
  const rows = Array.isArray(related.value.histories) ? related.value.histories : []
  if (rows.length > 0) return rows.slice(0, 4)

  return [
    { createdAt: data.value?.updatedAt ?? data.value?.createdAt, statusCode: status.value || 'REVIEW', processedByUserPublicId: '-', memo: aiSummary.value },
  ]
})

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

function displayItemStatus(value: unknown) {
  const statusValue = String(value || '').toUpperCase()
  if (preferences.language !== 'ko') return display(value)
  if (statusValue === 'ACTIVE') return '활성'
  if (statusValue === 'DEACTIVE') return '비활성'
  if (statusValue === 'DELETE') return '삭제'
  return display(value)
}

function formatNumber(value: unknown) {
  return typeof value === 'number'
    ? value.toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US')
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

function formatAmount(value: unknown, currency?: string) {
  if (typeof value !== 'number') return display(value)
  return `${currency ?? ''} ${value.toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US')}`.trim()
}

function formatDate(value: unknown) {
  if (!value) return '-'
  return String(value).replace('T', ' ').slice(0, 16)
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
      row.itemStatus ?? row.lineStatus,
    ][index]
  }
  if (kind.value === 'shipments' || kind.value === 'returns') {
    return [
      formatDate(row.recordedAt ?? row.createdAt),
      row.statusCode ?? row.returnStatus,
      row.location ?? row.processedByUserPublicId,
      row.memo ?? row.description,
    ][index]
  }
  if (kind.value === 'settlements') {
    return [row.itemId, formatNumber(row.qty), formatAmount(row.unitPrice), formatAmount(row.amount), row.detailStatus][index]
  }
  if (kind.value === 'items') {
    return [row.poNumber, row.supplierName, formatNumber(row.orderedQty), row.poStatus, row.expectedDueDate][index]
  }
  if (kind.value === 'suppliers') {
    return [row.itemName, row.qualityGrade, row.leadTimeDays, formatNumber(row.availableQty), row.status][index]
  }
  if (kind.value === 'certificates') {
    return [
      formatDate(row.recordedAt),
      row.beforeStatus ?? '-',
      row.afterStatus ?? row.actionType ?? '-',
      row.reason ?? '-',
    ][index]
  }
  return [row.publicId ?? row.id ?? '-', row.name ?? row.itemName ?? row.status ?? '-', row.status ?? '-'][index]
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

async function handleEditItem() {
  if (!data.value) return

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

  itemEditModalOpen.value = true
}

function closeItemEditModal() {
  itemEditModalOpen.value = false
  itemEditLoading.value = false
  itemEditErrorMessage.value = ''
}

async function submitItemEdit() {
  if (!data.value) return

  const nextName = itemEditForm.value.itemName.trim()
  const nextSpec = itemEditForm.value.spec.trim()
  if (!nextName || !nextSpec) {
    itemEditErrorMessage.value = t('품목명과 규격을 입력해 주세요.', 'Enter item name and spec.')
    return
  }

  try {
    itemEditLoading.value = true
    itemEditErrorMessage.value = ''

    await updateItem(publicId.value, {
      itemCategoryPublicId: data.value.itemCategoryPublicId,
      supplyType: data.value.supplyType,
      itemName: nextName,
      unitPrice: Number(itemEditForm.value.unitPrice ?? data.value.unitPrice ?? 0),
      unit: data.value.unit,
      spec: nextSpec,
      shelfLifeDays: Number(itemEditForm.value.shelfLifeDays),
      originLogisticsNodePublicId: data.value.originLogisticsNodePublicId,
    })

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

    await fetchDetail()
    closeItemEditModal()
  } catch (error: any) {
    itemEditErrorMessage.value = error?.message ?? t('품목 수정에 실패했습니다.', 'Failed to edit item.')
  } finally {
    itemEditLoading.value = false
  }
}

function handleEditInventory() {
  router.push({
    name: 'inventory',
    query: {
      edit: publicId.value,
    },
  })
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

      data.value = detail as Record<string, any>
      related.value = { histories, sourceShipment, returnAttachments }
    } else if (kind.value === 'inventory') {
      const inventories = await getInventories()
      const detail = inventories.find((row) => row.inventoryPublicId === publicId.value)

      if (!detail) {
        throw new Error('조회 가능한 재고가 아닙니다.')
      }

      data.value = detail as Record<string, any>
    } else if (kind.value === 'items') {
      const [itemPage, linkedOrders] = await Promise.all([
        getManagedItems(0, 500),
        getManagedItemLinkedOrders(publicId.value).catch(() => []),
      ])

      const detail = itemPage.content.find((row) => row.publicId === publicId.value)

      if (!detail) {
        throw new Error('조회 가능한 품목이 아닙니다.')
      }

      const media = itemMediaFilesFromItem(detail).length
        ? itemMediaFilesFromItem(detail)
        : detail.primaryMediaFilePublicId
          ? await getItemMedia(publicId.value)
          : []

      data.value = detail as Record<string, any>
      related.value = { linkedOrders, itemMedia: media }
    } else if (kind.value === 'suppliers') {
      const [detail, capabilities] = await Promise.all([
        getSupplier(publicId.value),
        getSupplierItemCapabilities(publicId.value).catch(() => []),
      ])
      data.value = detail as Record<string, any>
      related.value = { capabilities }
    } else if (kind.value === 'logistics-nodes') {
      data.value = await getLogisticsNode(publicId.value)
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
  return Array.isArray(files) ? files : []
})

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
          v-if="kind === 'items'"
          class="page-button page-button--primary"
          type="button"
          @click="handleEditItem"
        >
          수정
        </button>
        <button class="page-button page-button--secondary" type="button" @click="goBack">{{ detailCopy.backToList }}</button>
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
              <span :class="['operation-detail-page__status', `is-${statusTone}`]">{{ status || 'CONFIRMED' }}</span>
              <dl>
                <div><dt>{{ detailCopy.order.orderDate }}</dt><dd>{{ formatDate(data.orderedAt ?? data.createdAt) }}</dd></div>
                <div><dt>{{ detailCopy.order.requestedDue }}</dt><dd>{{ display(orderItems[0]?.expectedDueDate) }}</dd></div>
                <div><dt>{{ detailCopy.order.currency }}</dt><dd>{{ display(data.currencyCode ?? 'KRW') }}</dd></div>
                <div><dt>{{ detailCopy.order.totalAmount }}</dt><dd>{{ formatAmount(data.totalAmount, data.currencyCode) }}</dd></div>
              </dl>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ detailCopy.order.basicInfo }}</h3>
              <dl class="operation-detail-page__kv-grid is-two-col">
                <div><dt>{{ detailCopy.order.buyerOrg }}</dt><dd>{{ display(data.buyerOrganizationPublicId) }}</dd></div>
                <div><dt>{{ detailCopy.order.docType }}</dt><dd>STANDARD PO</dd></div>
                <div><dt>{{ detailCopy.order.supplier }}</dt><dd>{{ display(data.supplierName) }}</dd></div>
                <div><dt>{{ detailCopy.order.shipTo }}</dt><dd>{{ display(orderItems[0]?.arrivalLogisticsNodeName ?? orderItems[0]?.arrivalLogisticsNodeAddress) }}</dd></div>
                <div><dt>{{ detailCopy.order.owner }}</dt><dd>{{ display(data.createdByUserPublicId) }}</dd></div>
                <div><dt>{{ detailCopy.order.shippingMethod }}</dt><dd>SEA</dd></div>
                <div><dt>{{ detailCopy.order.paymentTerms }}</dt><dd>NET 30</dd></div>
                <div><dt>{{ detailCopy.order.memo }}</dt><dd>{{ display(data.memo) }}</dd></div>
              </dl>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ detailCopy.order.items }} ({{ orderItems.length }})</h3>
              <table class="operation-detail-page__domain-table">
                <thead><tr><th>NO</th><th>ITEM CODE</th><th>ITEM NAME</th><th>SPEC</th><th>UNIT</th><th>{{ detailCopy.common.qty }}</th><th>UNIT PRICE</th><th>{{ detailCopy.common.amount }}</th><th>{{ detailCopy.order.requestedDue }}</th></tr></thead>
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
                  <tr><th>{{ detailCopy.order.paymentTermsChange }}</th><td>NET 30</td><td>→</td><td>NET 30</td><td>-</td></tr>
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
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.subOrders }}</strong><span>HIGH</span><small>{{ detailCopy.order.impactCount(3) }}</small></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.shipments }}</strong><span>HIGH</span><small>{{ detailCopy.order.impactCount(2) }}</small></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.inventory }}</strong><span>MEDIUM</span><small>{{ detailCopy.order.impactCount(5) }}</small></div>
            <div class="operation-detail-page__impact-row"><strong>{{ detailCopy.order.supplierImpact }}</strong><span>MEDIUM</span><small>{{ detailCopy.order.impactCount(2) }}</small></div>
            <section><h3>{{ detailCopy.order.aiSummaryTitle }}</h3><p>{{ detailCopy.order.aiSummaryText }}</p></section>
            <section><h3>{{ detailCopy.order.communicationDraft }}</h3><p>{{ detailCopy.order.communicationText }}</p></section>
          </aside>
        </main>

        <main v-else-if="kind === 'shipments'" class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <article class="operation-detail-page__shipment-hero">
              <div class="operation-detail-page__icon-tile">▣</div>
              <div><p>SHIPMENT</p><h2>{{ title }}</h2><strong>{{ t('출하 상세', 'Shipment Detail') }}</strong></div>
              <div><p>SHIPMENT DELAY</p><strong class="is-alert">ETA + {{ formatMinutes(related.eta?.delayMinutes) || t('142분', '142 min') }}</strong><small>{{ t('지연 발생', 'Delay Detected') }}</small></div>
              <dl>
                <div><dt>CURRENT NODE</dt><dd>{{ display(data.currentNodeName ?? data.currentNodeCode) }}</dd></div>
                <div><dt>DESTINATION</dt><dd>{{ display(data.destinationNodeName ?? data.destinationNodeCode) }}</dd></div>
                <div><dt>DEPARTURE ETA</dt><dd>{{ formatDate(data.departureEta) }}</dd></div>
                <div><dt>ARRIVAL ETA</dt><dd>{{ formatDate(related.eta?.estimatedArrivalAt ?? data.arrivalEta) }}</dd></div>
              </dl>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ t('출하 경로 및 지연 현황', 'Shipment Route and Delay Status') }}</h3>
              <table class="operation-detail-page__domain-table">
                <thead><tr><th>SEQ</th><th>NODE</th><th>{{ t('도착 ETA', 'Arrival ETA') }}</th><th>{{ t('지연 (분)', 'Delay (Min)') }}</th><th>{{ detailCopy.common.status }}</th><th>{{ t('관련 발주', 'Related Order') }}</th></tr></thead>
                <tbody><tr v-for="row in shipmentPathRows" :key="row.seq"><td>{{ row.seq }}</td><td>{{ row.node }}</td><td>{{ row.eta }}</td><td>{{ row.delay }}</td><td>{{ row.status }}</td><td>{{ row.order }}</td></tr></tbody>
              </table>
            </article>

            <article class="operation-detail-page__domain-card">
              <h3>{{ t('영향 받는 발주', 'Affected Purchase Orders') }}</h3>
              <table class="operation-detail-page__domain-table">
                <thead><tr><th>{{ t('발주번호', 'PO No.') }}</th><th>{{ detailCopy.common.item }}</th><th>{{ detailCopy.common.qty }}</th><th>{{ detailCopy.order.requestedDue }}</th><th>{{ t('지연 영향', 'Delay Impact') }}</th><th>{{ t('우선순위', 'Priority') }}</th></tr></thead>
                <tbody>
                  <tr><td>{{ display(data.purchaseOrderPublicId) }}</td><td>LED DRIVER 60W</td><td>1,200 EA</td><td>04.29</td><td>{{ formatMinutes(related.eta?.delayMinutes) || t('142분', '142 min') }}</td><td><span class="operation-detail-page__chip is-high">HIGH</span></td></tr>
                  <tr><td>PO-2026-000015</td><td>SMPS 24V 5A</td><td>800 EA</td><td>04.29</td><td>{{ formatMinutes(related.eta?.delayMinutes) || t('142분', '142 min') }}</td><td><span class="operation-detail-page__chip is-high">HIGH</span></td></tr>
                </tbody>
              </table>
            </article>
          </section>

          <aside class="operation-detail-page__analysis-panel is-shipment">
            <div class="operation-detail-page__panel-head"><h2>{{ t('AI 배송 지연 권고', 'AI Shipment Delay Recommendation') }}</h2><small>{{ t('권고안 생성됨', 'Recommendation Generated') }}</small></div>
            <p>{{ t('현재 지연 원인을 분석하고 다음과 같은 대응 방안을 권고합니다.', 'Current delay causes were analyzed and the following actions are recommended.') }}</p>
            <div v-for="(row, index) in [t('우회 운송 검토', 'Review Alternate Route'), t('부분 출하', 'Partial Shipment'), t('납기 재협의', 'Renegotiate Due Date')]" :key="row" class="operation-detail-page__recommendation">
              <div class="operation-detail-page__icon-tile">{{ index + 1 }}</div>
              <strong>{{ row }}</strong>
              <span>{{ index === 0 ? 'HIGH' : 'MEDIUM' }}</span>
              <p>{{ index === 0 ? t('입항 대기 지연으로 ETA 추가 지연 가능성 높음', 'Port waiting delay may add further ETA risk') : t('고객 영향 최소화를 위한 보완 조치 필요', 'Additional action required to minimize customer impact') }}</p>
              <small>{{ index === 0 ? '82%' : index === 1 ? '76%' : '71%' }}</small>
              <button class="page-button page-button--secondary" type="button">{{ t('상세 보기', 'View Detail') }}</button>
              <button class="page-button page-button--primary" type="button">{{ t('수락', 'Accept') }}</button>
              <button class="page-button page-button--secondary" type="button">{{ t('거절', 'Reject') }}</button>
            </div>
            <button class="page-button page-button--secondary" type="button">{{ t('분석 로그 보기', 'View Analysis Log') }}</button>
          </aside>
        </main>

        <main v-else-if="kind === 'returns'" class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <article class="operation-detail-page__doc-hero">
              <div><p>RETURN REQUEST</p><h2>{{ title }}</h2></div>
              <span :class="['operation-detail-page__status', `is-${statusTone}`]">{{ status || 'REJECTED' }}</span>
              <dl>
                <div><dt>{{ t('요청일시', 'Requested At') }}</dt><dd>{{ formatDate(data.requestedAt ?? data.createdAt) }}</dd></div>
                <div><dt>{{ t('요청자', 'Requester') }}</dt><dd>{{ formatActor(data.createdByUserPublicId) }}</dd></div>
                <div><dt>{{ t('원출하', 'Source Shipment') }}</dt><dd>{{ display(related.sourceShipment?.shipmentNumber ?? formatShortId(data.sourceShipmentPublicId)) }}</dd></div>
                <div><dt>{{ t('사유 코드', 'Reason Code') }}</dt><dd>{{ displayReturnType(data.returnType) }}</dd></div>
                <div><dt>{{ t('우선순위', 'Priority') }}</dt><dd>HIGH</dd></div>
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
                <tbody><tr v-for="(item, index) in returnItems" :key="rowKey(item, index)"><td>{{ index + 1 }}</td><td>{{ display(item.itemCode ?? formatShortId(item.itemPublicId)) }}</td><td>{{ display(item.itemName) }}</td><td>{{ formatNumber(item.returnQty) }}</td><td>{{ display(item.unit) }}</td><td>{{ display(item.detailReason) }}</td><td>{{ display(item.itemStatus) }}</td></tr></tbody>
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
            <article class="operation-detail-page__supplier-head"><div><p>SUPPLIER DETAIL</p><h2>{{ display(data.supplierName) }}</h2></div><dl><div><dt>SUPPLIER PUBLIC ID</dt><dd>{{ publicId }}</dd></div><div><dt>BUSINESS TYPE</dt><dd>FOOD_MANUFACTURER</dd></div><div><dt>COUNTRY</dt><dd>KOREA</dd></div><div><dt>RISK SCORE</dt><dd>72 / 100 <span class="operation-detail-page__chip is-high">HIGH RISK</span></dd></div><div><dt>LAST UPDATED</dt><dd>{{ formatDate(data.updatedAt) }}</dd></div></dl></article>
            <section class="operation-detail-page__metric-row"><div><span>SUPPLIER GRADE</span><strong>B</strong></div><div><span>ESG SCORE</span><strong>68 / 100</strong></div><div><span>ON-TIME DELIVERY</span><strong>92.1%</strong></div><div><span>QUALITY SCORE</span><strong>84 / 100</strong></div><div><span>ACTIVE ORDERS</span><strong>{{ t('12건', '12') }}</strong></div></section>
            <article class="operation-detail-page__domain-card"><h3>CERTIFICATE STATUS</h3><table class="operation-detail-page__domain-table"><thead><tr><th>CERTIFICATE NAME</th><th>CERTIFICATE NO.</th><th>ISSUED DATE</th><th>EXPIRY DATE</th><th>STATUS</th><th>RISK LEVEL</th><th>DAYS LEFT</th><th>ACTIONS</th></tr></thead><tbody><tr v-for="row in supplierCertificateRows" :key="row[1]"><td>{{ row[0] }}</td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td>{{ row[3] }}</td><td>{{ row[4] }}</td><td>{{ row[5] }}</td><td>{{ row[6] }}</td><td><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.relatedDocuments }}</button></td></tr></tbody></table></article>
            <article class="operation-detail-page__domain-card"><h3>RISK EVENT TIMELINE</h3><table class="operation-detail-page__domain-table"><tbody><tr><td>2026.04.28 10:15</td><td>CERTIFICATE EXPIRING</td><td>{{ t('HACCP 인증 만료 12일 전', 'HACCP expires in 12 days') }}</td><td>MEDIUM</td><td>CERTIFICATE SERVICE</td></tr><tr><td>2026.04.28 09:02</td><td>CERTIFICATE EXPIRED</td><td>{{ t('ISO9001 인증 만료', 'ISO9001 certificate expired') }}</td><td>HIGH</td><td>CERTIFICATE SERVICE</td></tr><tr><td>2026.04.25 14:11</td><td>RISK SCORE UPDATED</td><td>{{ t('리스크 점수 72점으로 변경', 'Risk score changed to 72') }}</td><td>MEDIUM</td><td>RISK ENGINE</td></tr></tbody></table></article>
          </section>
          <aside class="operation-detail-page__analysis-panel"><div class="operation-detail-page__panel-head"><h2>{{ t('AI 인증 리스크 요약', 'AI Certification Risk Summary') }}</h2><small>MODEL: ATLAS-RISK-1.0</small></div><div class="operation-detail-page__risk-band"><span>{{ t('종합 판단', 'Overall Decision') }}</span><strong>HIGH RISK</strong><p>{{ t('핵심 인증 만료로 품질 경영 체계 유효성이 상실되었습니다.', 'Core certification expiry invalidates the quality management system.') }}</p></div><section><h3>{{ t('비즈니스 영향 요약', 'Business Impact Summary') }}</h3><ul><li>{{ t('품질/식품안전 규정 준수 위험 증가', 'Quality and food-safety compliance risk increased') }}</li><li>{{ t('납품 중단 가능성 및 리콜 리스크 상승', 'Supply disruption and recall risk increased') }}</li><li>{{ t('고객사 감사 대응 시 컴플라이언스 이슈 발생 가능', 'Compliance issues may arise during customer audits') }}</li></ul></section><section><h3>{{ t('권장 액션 (AI)', 'Recommended Actions (AI)') }}</h3><ol><li>{{ t('ISO9001 갱신 상태 확인 및 갱신 일정 제출 요청', 'Request ISO9001 renewal status and schedule') }}</li><li>{{ t('대체 공급처 검토 및 위험 계획 수립', 'Review alternate suppliers and risk plan') }}</li><li>{{ t('인증 갱신 전까지 신규 발주 보류 검토', 'Review holding new orders until renewal') }}</li></ol></section><div class="operation-detail-page__action-list"><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.relatedDocuments }}</button><button class="page-button page-button--secondary" type="button">{{ detailCopy.common.notifyOwner }}</button><button class="page-button page-button--secondary" type="button">{{ t('대체 후보 보기', 'View Alternatives') }}</button></div></aside>
        </main>

        <main v-else class="operation-detail-page__document-grid">
          <section class="operation-detail-page__document-main">
            <section v-if="kind !== 'items'" class="operation-detail-page__metric-row"><div><span>TOTAL ITEMS</span><strong>1,248 EA</strong></div><div><span>TOTAL INVENTORY VALUE</span><strong>₩ 2,451,830,000</strong></div><div><span>NORMAL</span><strong>1,012</strong></div><div><span>LOW STOCK</span><strong>156</strong></div><div><span>SHORTAGE DETECTED</span><strong class="is-alert">80</strong></div></section>
            <article v-if="kind === 'items'" class="operation-detail-page__domain-card">
              <h3>{{ t('품목 미디어', 'Item Media') }}</h3>
              <div v-if="itemMediaFiles.length === 0" class="page-table__empty">
                {{ t('등록된 미디어가 없습니다.', 'No media registered.') }}
              </div>
              <div v-else class="operation-detail-page__item-media-grid">
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
            </article>
            <article
              v-if="kind === 'items'"
              class="operation-detail-page__domain-card operation-detail-page__item-info-card"
            >
              <h3>{{ t('물품 상세정보', 'ITEM INFORMATION') }}</h3>
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
                  <h4>{{ group.title }}</h4>
                  <dl>
                    <div v-for="row in group.rows" :key="row.label">
                      <dt>{{ row.label }}</dt>
                      <dd>{{ row.value }}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </article>
            <article class="operation-detail-page__domain-card">
              <h3>{{ kind === 'items' ? t('품목 히스토리', 'ITEM HISTORY') : 'INVENTORY STATUS' }}</h3>
              <table v-if="kind === 'items'" class="operation-detail-page__domain-table operation-detail-page__item-history-table">
                <thead>
                  <tr>
                    <th>{{ t('시각', 'TIME') }}</th>
                    <th>{{ t('이벤트', 'EVENT') }}</th>
                    <th>{{ t('수량', 'QTY') }}</th>
                    <th>{{ t('연결 문서', 'REFERENCE') }}</th>
                    <th>{{ t('상태', 'STATUS') }}</th>
                    <th>{{ t('메모', 'NOTE') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in itemHistoryRows" :key="row.id">
                    <td :data-label="t('시각', 'TIME')">{{ row.time }}</td>
                    <td :data-label="t('이벤트', 'EVENT')">{{ row.event }}</td>
                    <td :data-label="t('수량', 'QTY')">{{ row.qty }}</td>
                    <td :data-label="t('연결 문서', 'REFERENCE')">{{ row.ref }}</td>
                    <td :data-label="t('상태', 'STATUS')">{{ row.status }}</td>
                    <td :data-label="t('메모', 'NOTE')">{{ row.note }}</td>
                  </tr>
                </tbody>
              </table>
              <table v-else class="operation-detail-page__domain-table"><thead><tr><th>ITEM CODE</th><th>ITEM NAME</th><th>UOM</th><th>CURRENT STOCK</th><th>SAFETY STOCK</th><th>SHORTAGE QTY</th><th>STATUS</th><th>AFFECTED POs</th></tr></thead><tbody><tr v-for="row in inventoryRows" :key="row[0]"><td>{{ row[0] }}</td><td>{{ row[1] }}</td><td>{{ row[2] }}</td><td>{{ row[3] }}</td><td>{{ row[4] }}</td><td>{{ row[5] }}</td><td>{{ row[6] }}</td><td>{{ row[7] }}</td></tr></tbody></table>
            </article>
            <article class="operation-detail-page__domain-card"><h3>DEMAND vs SAFETY STOCK</h3><div class="operation-detail-page__chart-panel"><span></span><span></span><span></span><strong>Forecast demand</strong></div></article>
          </section>
          <div v-if="kind === 'inventory'" class="operation-detail-page__bottom-actions">
            <button class="page-button page-button--secondary" type="button" @click="goBack">
              {{ detailCopy.backToList }}
            </button>

            <span></span>

            <button
              class="page-button page-button--primary"
              type="button"
              @click="handleEditInventory"
            >
              수정
            </button>
          </div>

          <aside class="operation-detail-page__analysis-panel is-inventory"><div class="operation-detail-page__panel-head"><h2>{{ t('AI 재고 부족 대응', 'AI Inventory Shortage Response') }}</h2><span class="operation-detail-page__chip is-high">{{ t('안전재고 미달', 'Below Safety Stock') }}</span></div><div class="operation-detail-page__recommendation"><strong>{{ t('01 긴급 발주', '01 Urgent Order') }}</strong><span>HIGH</span><p>{{ t('필요 수량 165 EA, 권장 발주 수량 170 EA', 'Required 165 EA, recommended order 170 EA') }}</p><button class="page-button page-button--primary" type="button">{{ t('실행 계획 보기', 'View Action Plan') }}</button></div><div class="operation-detail-page__recommendation"><strong>{{ t('02 대체 공급처 검토', '02 Review Alternative Suppliers') }}</strong><span>MEDIUM</span><p>{{ t('공급처 3개, 필요 수량 165 EA', '3 suppliers, required 165 EA') }}</p><button class="page-button page-button--primary" type="button">{{ t('후보 공급처 보기', 'View Supplier Candidates') }}</button></div><div class="operation-detail-page__recommendation"><strong>{{ t('03 분할 입고', '03 Split Inbound') }}</strong><span>LOW</span><p>{{ t('분할 횟수 2회, 운송 영향 보통', '2 splits, normal logistics impact') }}</p><button class="page-button page-button--primary" type="button">{{ t('분할 계획 보기', 'View Split Plan') }}</button></div></aside>
        </main>
      </div>
    </template>

    <template v-else-if="data">
      <section class="operation-detail-page__summary-strip">
        <article v-for="metric in heroMetrics" :key="metric.label" class="operation-detail-page__summary-cell">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
          <small v-if="metric.meta">{{ metric.meta }}</small>
        </article>
      </section>

      <div class="operation-detail-page__layout">
        <main class="operation-detail-page__main">
          <article class="operation-detail-page__block operation-detail-page__process">
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
                <dt>{{ row.label }}</dt>
                <dd>{{ row.value }}</dd>
              </template>
            </dl>
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
              <h2>{{ detailCopy.common.detailItems }}</h2>
              <span>{{ detailCopy.common.totalCount(lineItems.length) }}</span>
            </div>
            <div v-if="lineItems.length === 0" class="page-table__empty">{{ detailCopy.common.emptyDetailRows }}</div>
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
                  <th>{{ detailCopy.common.step }}</th>
                  <th>{{ detailCopy.common.processor }}</th>
                  <th>{{ detailCopy.common.description }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIndex) in historyRows" :key="rowKey(row, rowIndex)">
                  <td>{{ formatDate(row.createdAt ?? row.recordedAt ?? row.updatedAt) }}</td>
                  <td>{{ row.statusCode ?? row.returnStatus ?? row.status ?? status }}</td>
                  <td>{{ row.processedByUserPublicId ?? row.createdBy ?? '-' }}</td>
                  <td>{{ row.memo ?? row.description ?? aiSummary }}</td>
                </tr>
              </tbody>
            </table>
          </article>

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
              {{ t('현재 상태', 'Current Status') }}: <strong>{{ returnStatus }}</strong>
              <span v-if="resolutionType">({{ resolutionType }})</span>
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
                <p>AI ANALYSIS</p>
                <h2>{{ detailCopy.common.aiAnalysis }}</h2>
              </div>
              <span :class="['operation-detail-page__ai-status', `is-${statusTone}`]">{{ status || 'REVIEW' }}</span>
            </div>

            <div class="operation-detail-page__risk-summary">
              <span>{{ detailCopy.order.risk }}</span>
              <strong>{{ statusTone === 'critical' ? 'HIGH' : statusTone === 'success' ? 'LOW' : 'MEDIUM' }}</strong>
              <p>{{ aiSummary }}</p>
            </div>

            <section class="operation-detail-page__ai-section">
              <h3>{{ detailCopy.common.impactArea }}</h3>
              <div class="operation-detail-page__impact-grid">
                <div v-for="[label, level, description] in aiImpactRows" :key="label" class="operation-detail-page__impact-card">
                  <span>{{ label }}</span>
                  <strong :class="`is-${String(level).toLowerCase()}`">{{ level }}</strong>
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
                    <td>{{ value }}</td>
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
      v-model="itemEditModalOpen"
      :title="t('품목 수정', 'Edit Item')"
      :description="t('현재 품목의 기본 정보와 공급 역량을 수정합니다.', 'Edit item details and supplier capability.')"
      size="lg"
      @close="closeItemEditModal"
    >
      <div class="operation-detail-page__edit-form">
        <section class="operation-detail-page__edit-section">
          <h3>{{ t('품목 기본 정보', 'Item Basic Info') }}</h3>

          <label class="operation-detail-page__edit-field">
            <span>ITEM NAME</span>
            <input v-model="itemEditForm.itemName" type="text" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>UNIT PRICE</span>
            <input v-model.number="itemEditForm.unitPrice" type="number" min="0" step="0.01" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>SHELF LIFE DAYS</span>
            <input v-model.number="itemEditForm.shelfLifeDays" type="number" min="0" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('상태', 'Status') }}</span>
            <select v-model="itemEditForm.status">
              <option value="ACTIVE">{{ t('활성', 'ACTIVE') }}</option>
              <option value="DEACTIVE">{{ t('비활성', 'DEACTIVE') }}</option>
            </select>
          </label>

          <label class="operation-detail-page__edit-field operation-detail-page__edit-field--full">
            <span>SPEC</span>
            <textarea v-model="itemEditForm.spec" />
          </label>
        </section>

        <section class="operation-detail-page__edit-section">
          <h3>{{ t('협력사 품목 공급 역량', 'Supplier Item Capability') }}</h3>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('리드타임', 'Lead Time') }}</span>
            <input v-model.number="itemEditForm.leadTimeDays" type="number" min="0" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('월간 생산량', 'Monthly Capacity') }}</span>
            <input v-model.number="itemEditForm.monthlyCapacity" type="number" min="1" step="1" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('주문 가능 수량', 'Available Qty') }}</span>
            <input v-model.number="itemEditForm.availableQty" type="number" min="1" step="1" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('최소 주문 수량', 'MOQ') }}</span>
            <input v-model.number="itemEditForm.moq" type="number" min="1" step="1" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('품질 등급', 'Quality Grade') }}</span>
            <select v-model="itemEditForm.qualityGrade">
              <option value="">{{ t('선택 안 함', 'None') }}</option>
              <option v-for="grade in QUALITY_GRADE_OPTIONS" :key="grade" :value="grade">
                {{ qualityGradeText(grade) }}
              </option>
            </select>
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('품질 단가', 'Quality Price') }}</span>
            <input v-model.number="itemEditForm.unitPriceHint" type="number" min="0" step="0.01" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('적용 시작일', 'Valid From') }}</span>
            <input v-model="itemEditForm.validFrom" type="date" />
          </label>

          <label class="operation-detail-page__edit-field">
            <span>{{ t('부분 확정', 'Partial Confirmation') }}</span>
            <select v-model="itemEditForm.partialConfirmationAllowed">
              <option :value="true">{{ t('허용', 'Allowed') }}</option>
              <option :value="false">{{ t('비허용', 'Disallowed') }}</option>
            </select>
          </label>
        </section>

        <p v-if="itemEditErrorMessage" class="operation-detail-page__error">
          {{ itemEditErrorMessage }}
        </p>

        <div class="operation-detail-page__bottom-actions">
          <button class="page-button page-button--secondary" type="button" @click="closeItemEditModal">
            {{ t('취소', 'Cancel') }}
          </button>
          <span></span>
          <button class="page-button page-button--primary" type="button" :disabled="itemEditLoading" @click="submitItemEdit">
            {{ t('품목 수정', 'Save Item') }}
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
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
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

.operation-detail-page__item-media small {
  padding: 0 8px 8px;
  overflow: hidden;
  color: var(--detail-muted);
  font-size: 0.72rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  border-radius: 6px;
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.operation-detail-page__item-info-sections section {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--detail-border);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.72);
}

.operation-detail-page__item-info-sections h4 {
  margin: 0;
  color: var(--on-surface, #2d3435);
}

.operation-detail-page__item-info-sections dl {
  display: grid;
  gap: 0;
  margin: 0;
}

.operation-detail-page__item-info-sections dl > div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 10px;
  min-height: 34px;
  padding: 8px 0;
  border-top: 1px solid var(--detail-border);
}

.operation-detail-page__item-info-sections dd {
  margin: 0;
  color: var(--on-surface, #2d3435);
  font-size: 0.78rem;
  font-weight: 820;
  word-break: break-word;
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

.operation-detail-page__edit-form {
  display: grid;
  gap: 22px;
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
  border: 1px solid var(--line);
  background: var(--surface);
  padding: 10px 12px;
  color: var(--text);
  font: inherit;
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

  .operation-detail-page__item-media-grid {
    grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  }

  .operation-detail-page__item-info-card {
    gap: 10px;
  }

  .operation-detail-page__item-info-hero,
  .operation-detail-page__item-info-sections section {
    padding: 12px;
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

  .operation-detail-page__item-media-grid {
    grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
  }

  .operation-detail-page__item-media {
    grid-template-rows: 104px auto;
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

  .operation-detail-page__item-history-table,
  .operation-detail-page__item-history-table thead,
  .operation-detail-page__item-history-table tbody,
  .operation-detail-page__item-history-table tr,
  .operation-detail-page__item-history-table th,
  .operation-detail-page__item-history-table td {
    display: block;
  }

  .operation-detail-page__item-history-table {
    background: transparent;
  }

  .operation-detail-page__item-history-table thead {
    display: none;
  }

  .operation-detail-page__item-history-table tbody {
    display: grid;
    gap: 10px;
  }

  .operation-detail-page__item-history-table tr {
    border: 1px solid var(--detail-border);
    background: var(--detail-surface-plain);
  }

  .operation-detail-page__item-history-table td {
    display: grid;
    grid-template-columns: 88px minmax(0, 1fr);
    gap: 10px;
    padding: 9px 10px;
    border: 0;
    border-bottom: 1px solid var(--detail-border);
    overflow-wrap: anywhere;
    word-break: normal;
  }

  .operation-detail-page__item-history-table td::before {
    content: attr(data-label);
    color: var(--detail-muted);
    font-size: 0.66rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .operation-detail-page__item-history-table td:last-child {
    border-bottom: 0;
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
