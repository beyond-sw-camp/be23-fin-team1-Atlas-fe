<script setup lang="ts">
// 필요한 Vue 함수만 한 번에 가져옵니다.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  createSupplier,
  getConnectedSupplierDetail,
  getConnectedSupplierSummary,
  getMySupplier,
  getSupplier,
  getSuppliers,
  type ConnectedSupplierDetailResponseDto,
  type ConnectedSupplierSummaryResponseDto,
  type CreateSupplierRequestDto,
  type SupplierListResponseDto,
  type SupplierResponseDto,
} from '../../../services/supplier'

import {
  getPurchaseOrders,
  type PurchaseOrderSummaryResponseDto,
} from '../../../services/purchaseOrder'

import {
  getMyOrganizationDetail,
  getOrganizations,
  type OrganizationListItem,
} from '../../../services/organization'

import { useAtlasSessionStore } from '../../../stores/session'
import { useActorScope } from '../../../composables/useActorScope'




type SupplierTabKey = 'ALL' | 'ACTIVE' | 'AT_RISK'
type SupplierRelationViewKey = 'SUPPLIERS' | 'CUSTOMERS' | 'ALL_RELATIONS'

type SupplierTableRow = {
  supplierCode: string
  supplierName: string
  publicId?: string
  relationView: 'SUPPLIER' | 'CUSTOMER'
  organizationPublicId?: string
  supplierStatus: string
  relationStatus: string | null
  onTimeRate: number | null
  supplierScore: number | null
  qualityScore: number | null
  purchaseOrderCount: number | null
  cumulativeAmount: number | null
  detail: SupplierResponseDto | null
  latestOrderedAt?: string | null
  pendingOrderCount?: number
  cells: string[]
}


type CreateSupplierFormState = {
  organizationPublicId: string
  supplierCode: string
  supplierName: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

const preferences = useAtlasPreferencesStore()
const router = useRouter()
// 현재 로그인 조직 타입을 확인하려고 세션 스토어를 씁니다.
const session = useAtlasSessionStore()

// 화면에서 역할별 버튼 노출 제어에 사용합니다.
const actor = useActorScope()

// 검색 API를 너무 자주 호출하지 않게 잠깐 기다리는 타이머입니다.
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

// 협력사 조직은 백엔드 검색이 막혀 있어서 로컬 검색만 유지합니다.
const useServerSearch = computed(() => session.organizationType !== 'SUPPLIER')

// 총 협력사 개수만 실제 API 응답으로 덮어씁니다.
const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 협력사 관리',
    title: '협력사 관리',
    subtitle: '품질, 납기, 누적 거래 기준으로 협력사 현황을 관리합니다.',
    metrics: [
      { label: '공급처', value: '0', tone: 'nominal' },
      { label: '고객사', value: '0', tone: 'warning' },
      { label: '평균 납기 준수율 (최근 90일)', value: '0%', tone: 'info' },
      { label: '평균 리드타임', value: '0일', tone: 'nominal' },
    ],
    relationTabs: [
      { key: 'ALL_RELATIONS', label: '전체 관계' },
      { key: 'SUPPLIERS', label: '공급처' },
      { key: 'CUSTOMERS', label: '고객사' },
    ] as { key: SupplierRelationViewKey; label: string }[],
    tabs: [
      { key: 'ALL', label: '전체' },
      { key: 'ACTIVE', label: '정상' },
      { key: 'AT_RISK', label: '위험' },
    ] as { key: SupplierTabKey; label: string }[],
    searchPlaceholder: '거래처명, 코드, 담당자 검색',
    exportLabel: '내보내기',
    createLabel: '협력사 등록',
    tableTitle: '거래 관계 레지스트리',
    columns: ['구분', '거래처', '거래 상태','납기율', '협력사 점수', '품질 점수', '거래 건수', '누적 금액', '상세'],
    topTitle: '상위 거래 관계',
    riskTitle: '주의 필요',
    regionTitle: '거래 규모',
    detailTitle: '협력사 상세 조회',
    detailDescription: '선택한 협력사의 상세 정보를 확인합니다.',
    createDescription: '관리자 권한으로 협력사 마스터를 등록합니다.',
    form: {
      organization: '협력사 조직',
      selectOrganization: '조직을 선택하세요.',
      supplierCode: '협력사 코드',
      supplierCodePlaceholder: '예: SUP-001',
      supplierName: '협력사명',
      supplierNamePlaceholder: '협력사명을 입력하세요.',
      contactName: '담당자명',
      contactNamePlaceholder: '담당자명을 입력하세요.',
      contactEmail: '담당자 이메일',
      contactPhone: '담당자 연락처',
      cancel: '취소',
      submit: '등록',
      loadingDetail: '상세 정보를 불러오는 중...',
    },
    detail: {
      documentType: '문서유형',
      documentNo: '문서번호',
      parentPoNo: '상위발주번호',
      role: '구분',
      status: '상태',
      orderedAt: '발주일시',
      amount: '금액',
      purchaseOrder: '메인 발주',
      subPurchaseOrder: '서브 발주',
      noRelatedOrders: '연결된 발주 이력이 없습니다.',
    },
  },
  en: {
    eyebrow: 'Supply Chain Ops / Suppliers',
    title: 'Supplier Directory',
    subtitle: 'Operate supplier portfolio by country, quality, lead time, and cumulative trading amount.',
    metrics: [
      { label: 'SUPPLIERS', value: '0', tone: 'nominal' },
      { label: 'CUSTOMERS', value: '0', tone: 'warning' },
      { label: 'AVERAGE ON-TIME RATE (ROLLING 90 DAYS)', value: '0%', tone: 'info' },
      { label: 'AVG LEAD TIME', value: '0d', tone: 'nominal' },
    ],
    relationTabs: [
      { key: 'ALL_RELATIONS', label: 'ALL RELATIONS' },
      { key: 'SUPPLIERS', label: 'SUPPLIERS' },
      { key: 'CUSTOMERS', label: 'CUSTOMERS' },
    ] as { key: SupplierRelationViewKey; label: string }[],
    tabs: [
      { key: 'ALL', label: 'ALL' },
      { key: 'ACTIVE', label: 'ACTIVE' },
      { key: 'AT_RISK', label: 'AT RISK' },
    ] as { key: SupplierTabKey; label: string }[],
    searchPlaceholder: 'Search supplier, code, or contact...',
    exportLabel: 'EXPORT',
    createLabel: 'ADD SUPPLIER',
    tableTitle: 'Relationship Registry',
    columns: ['TYPE', 'COUNTERPARTY', 'RELATION STATUS', 'ON-TIME RATE', 'SUPPLIER SCORE', 'QUALITY SCORE', 'TRADE COUNT', 'CUMULATIVE AMOUNT', 'DETAIL'],
    topTitle: 'Top Relationships',
    riskTitle: 'Needs Attention',
    regionTitle: 'Spend By Supplier',
    detailTitle: 'Supplier Detail',
    detailDescription: 'Review the selected supplier detail information.',
    createDescription: 'Create supplier master data as admin.',
    form: {
      organization: 'Supplier Organization',
      selectOrganization: 'Select organization.',
      supplierCode: 'Supplier Code',
      supplierCodePlaceholder: 'e.g. SUP-001',
      supplierName: 'Supplier Name',
      supplierNamePlaceholder: 'Enter supplier name.',
      contactName: 'Contact Name',
      contactNamePlaceholder: 'Enter contact name.',
      contactEmail: 'Contact Email',
      contactPhone: 'Contact Phone',
      cancel: 'Cancel',
      submit: 'Register',
      loadingDetail: 'Loading detail...',
    },
    detail: {
      documentType: 'TYPE',
      documentNo: 'DOCUMENT NO',
      parentPoNo: 'PARENT PO NO',
      role: 'ROLE',
      status: 'STATUS',
      orderedAt: 'ORDERED AT',
      amount: 'AMOUNT',
      purchaseOrder: 'PURCHASE ORDER',
      subPurchaseOrder: 'SUB PURCHASE ORDER',
      noRelatedOrders: 'No related orders.',
    },
  },
}

const content = computed(() => CONTENT.ko)

// 실제 협력사 목록 상태입니다.
const rows = ref<SupplierTableRow[]>([])
const errorMessage = ref('')

// 상세 모달 상태입니다.
const detailModalOpen = ref(false)
const detailLoading = ref(false)
const detailErrorMessage = ref('')
const connectedSummary = ref<ConnectedSupplierSummaryResponseDto | null>(null)
const selectedSupplier = ref<ConnectedSupplierDetailResponseDto | null>(null)
const organizationNameMap = ref<Record<string, string>>({})
const receivedOrderRows = ref<PurchaseOrderSummaryResponseDto[]>([])

// 관리자 전용 협력사 등록 모달 상태입니다.
const createModalOpen = ref(false)
const createLoading = ref(false)
const createErrorMessage = ref('')
const supplierOrganizationOptions = ref<OrganizationListItem[]>([])

const createForm = ref<CreateSupplierFormState>({
  organizationPublicId: '',
  supplierCode: '',
  supplierName: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
})


const search = ref('')
const activeTab = ref<SupplierTabKey>('ALL')
const activeRelationView = ref<SupplierRelationViewKey>('ALL_RELATIONS')

function formatPercent(value: number | null | undefined) {
  if (value == null) return '-'
  return `${value}%`
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatAmount(value: number | null | undefined) {
  if (value == null) return '-'
  return `${value.toLocaleString('ko-KR')}원`
}

function toAmountNumber(value: number | null | undefined) {
  return value ?? 0
}

function formatDate(value: string | undefined) {
  if (!value) return '-'
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
  const normalizedValue = hasTimezone ? value : `${value}Z`
  const date = new Date(normalizedValue)

  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Seoul',
  }).format(date)
}


function supplierStatusText(value: string) {
  switch (value) {
    case 'ACTIVE':
      return '정상 거래'
    case 'INACTIVE':
      return '비활성'
    case 'SUSPENDED':
      return '일시 정지'
    case 'TERMINATED':
      return '계약 해지'
    case 'REQUESTED':
      return '승인 요청'
    case 'REJECTED':
      return '반려'
    default:
      return value
  }
}


function connectedOrderStatusText(order: { orderType: 'PURCHASE_ORDER' | 'SUB_PURCHASE_ORDER'; status: string }) {
  return order.orderType === 'PURCHASE_ORDER'
    ? poStatusText(order.status)
    : subPoStatusText(order.status)
}

function relationStatusText(value: string) {
  switch (value) {
    case 'REQUESTED': return '연결 요청'
    case 'ACTIVE': return '연결 유지'
    case 'PAUSED': return '일시 중지'
    case 'ENDED': return '종료'
    default: return value
  }
}

function supplierPerformanceScore(row: SupplierTableRow) {
  if (row.supplierScore != null) return row.supplierScore
  if (row.qualityScore != null) return row.qualityScore
  if (row.onTimeRate != null) return row.onTimeRate
  return row.purchaseOrderCount ?? 0
}

function hasSupplierPerformance(row: SupplierTableRow) {
  return (
    row.supplierScore != null ||
    row.qualityScore != null ||
    row.onTimeRate != null ||
    toAmountNumber(row.cumulativeAmount) > 0 ||
    (row.purchaseOrderCount ?? 0) > 0
  )
}

function hasSupplierTrade(supplier: SupplierListResponseDto) {
  return (
    (supplier.purchaseOrderCount ?? 0) > 0 ||
    toAmountNumber(supplier.cumulativeAmount) > 0 ||
    toAmountNumber(supplier.totalAmount) > 0
  )
}

const subOrderRelationCache = new Map<string, boolean>()

async function hasSupplierSubOrderRelation(supplier: SupplierListResponseDto) {
  const supplierPublicId = supplier.detail?.publicId
  if (!supplierPublicId) return false

  if (subOrderRelationCache.has(supplierPublicId)) {
    return subOrderRelationCache.get(supplierPublicId) ?? false
  }

  try {
    const detail = await getConnectedSupplierDetail(supplierPublicId)
    const hasSubOrder = detail.orders.some((order) => order.orderType === 'SUB_PURCHASE_ORDER')
    subOrderRelationCache.set(supplierPublicId, hasSubOrder)
    return hasSubOrder
  } catch {
    subOrderRelationCache.set(supplierPublicId, false)
    return false
  }
}

function supplierPerformanceMeta(row: SupplierTableRow) {
  const orderCount = row.purchaseOrderCount ?? 0
  const orderLabel = row.relationView === 'CUSTOMER' ? '수주' : '발주'
  if (row.qualityScore != null) {
    return `품질 ${formatNumber(row.qualityScore)}점 / ${orderLabel} ${formatNumber(orderCount)}건`
  }
  if (row.onTimeRate != null) {
    return `납기율 ${formatPercent(row.onTimeRate)} / ${orderLabel} ${formatNumber(orderCount)}건`
  }
  return `${orderLabel} ${formatNumber(orderCount)}건`
}

function supplierPerformanceValue(row: SupplierTableRow) {
  if (row.supplierScore != null) return `${formatNumber(row.supplierScore)}점`
  if (row.qualityScore != null) return `${formatNumber(row.qualityScore)}점`
  if (row.onTimeRate != null) return formatPercent(row.onTimeRate)
  return formatAmount(row.cumulativeAmount)
}

function supplierAttentionReason(row: SupplierTableRow) {
  if (row.relationView === 'CUSTOMER' && (row.pendingOrderCount ?? 0) > 0) {
    return `미처리 수주 ${formatNumber(row.pendingOrderCount)}건`
  }
  if (row.supplierStatus !== 'ACTIVE') return supplierStatusText(row.supplierStatus)
  if (row.relationStatus && row.relationStatus !== 'ACTIVE') return relationStatusText(row.relationStatus)
  if (row.qualityScore != null && row.qualityScore < 70) return `품질 점수 ${formatNumber(row.qualityScore)}점`
  if (row.onTimeRate != null && row.onTimeRate < 90) return `납기율 ${formatPercent(row.onTimeRate)}`
  return ''
}

function relationViewText(value: SupplierTableRow['relationView']) {
  return value === 'CUSTOMER' ? '고객사' : '공급처'
}

function relationOrderCountText(value: SupplierTableRow['relationView'], orderCount: number | null | undefined) {
  const label = value === 'CUSTOMER'
    ? (preferences.language === 'ko' ? '수주' : 'Received')
    : (preferences.language === 'ko' ? '발주' : 'Issued')
  const suffix = preferences.language === 'ko' ? '건' : ''
  return `${label} ${formatNumber(orderCount)}${suffix}`
}

function isPendingOrderStatus(status: string) {
  return status === 'CREATED' || status === 'PARTIALLY_CONFIRMED'
}

function orderRoleText(value: 'ISSUED' | 'RECEIVED') {
  return value === 'ISSUED' ? '발주' : '수주'
}

function subPoStatusText(value: string) {
  switch (value) {
    case 'CREATED':
      return '생성'
    case 'PARTIALLY_CONFIRMED':
      return '일부 확정'
    case 'CONFIRMED':
      return '전체 확정'
    case 'REJECTED':
      return '거절'
    case 'CANCELLED':
      return '취소'
    case 'COMPLETED':
      return '완료'
    case 'DELETED':
      return '삭제'
    default:
      return value
  }
}

function poStatusText(value: string) {
  switch (value) {
    case 'CREATED':
      return '확인 대기'
    case 'PARTIALLY_CONFIRMED':
      return '부분 확정'
    case 'CONFIRMED':
      return '확정'
    case 'REJECTED':
      return '반려'
    case 'CANCELLED':
      return '취소'
    case 'COMPLETED':
      return '완료'
    case 'DELETED':
      return '삭제'
    default:
      return value
  }
}


// 협력사 목록 API 응답을 기존 테이블 행 구조로 변환합니다.
// 목록 API는 SupplierListResponseDto 를 내려주므로 상세 DTO가 아니라 목록 DTO 기준으로 받습니다.
function toDisplayRow(supplier: SupplierListResponseDto): SupplierTableRow {
  const supplierStatus = supplier.detail?.supplierStatus ?? 'INACTIVE'
  const relationStatus = supplier.relationStatus

  return {
    supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName,
    publicId: supplier.detail?.publicId,
    relationView: 'SUPPLIER',
    organizationPublicId: supplier.detail?.organizationPublicId,
    supplierStatus,
    relationStatus,
    onTimeRate: supplier.onTimeRate,
    supplierScore: supplier.supplierScore,
    qualityScore: supplier.qualityScore,
    purchaseOrderCount: supplier.purchaseOrderCount,
    cumulativeAmount: supplier.cumulativeAmount,
    detail: supplier.detail,
    cells: [
      relationViewText('SUPPLIER'),
      supplier.supplierName || '-',
      relationStatus ? relationStatusText(relationStatus) : '-',
      formatPercent(supplier.onTimeRate),
      formatNumber(supplier.supplierScore),
      formatNumber(supplier.qualityScore),
      relationOrderCountText('SUPPLIER', supplier.purchaseOrderCount),
      formatAmount(supplier.cumulativeAmount),
    ],
  }
}

function toCustomerDisplayRows(orders: PurchaseOrderSummaryResponseDto[]): SupplierTableRow[] {
  const grouped = new Map<string, {
    organizationPublicId: string
    name: string
    orderCount: number
    pendingOrderCount: number
    cumulativeAmount: number
    latestOrderedAt: string | null
  }>()

  orders.forEach((order) => {
    const key = order.buyerOrganizationPublicId || order.poPublicId
    const current = grouped.get(key) ?? {
      organizationPublicId: order.buyerOrganizationPublicId,
      name: organizationNameMap.value[order.buyerOrganizationPublicId] ?? order.buyerOrganizationPublicId ?? '고객사 미확인',
      orderCount: 0,
      pendingOrderCount: 0,
      cumulativeAmount: 0,
      latestOrderedAt: null,
    }

    current.orderCount += 1
    current.cumulativeAmount += order.totalAmount ?? 0
    if (isPendingOrderStatus(order.poStatus)) {
      current.pendingOrderCount += 1
    }
    if (!current.latestOrderedAt || new Date(order.orderedAt).getTime() > new Date(current.latestOrderedAt).getTime()) {
      current.latestOrderedAt = order.orderedAt
    }
    grouped.set(key, current)
  })

  return Array.from(grouped.values()).map((customer) => ({
    supplierCode: customer.organizationPublicId || '-',
    supplierName: customer.name,
    publicId: customer.organizationPublicId,
    relationView: 'CUSTOMER',
    organizationPublicId: customer.organizationPublicId,
    supplierStatus: 'ACTIVE',
    relationStatus: 'ACTIVE',
    onTimeRate: null,
    supplierScore: null,
    qualityScore: null,
    purchaseOrderCount: customer.orderCount,
    cumulativeAmount: customer.cumulativeAmount,
    detail: null,
    latestOrderedAt: customer.latestOrderedAt,
    pendingOrderCount: customer.pendingOrderCount,
    cells: [
      relationViewText('CUSTOMER'),
      customer.name || '-',
      '연결 유지',
      '-',
      '-',
      '-',
      relationOrderCountText('CUSTOMER', customer.orderCount),
      formatAmount(customer.cumulativeAmount),
    ],
  }))
}

const customerRows = computed(() => toCustomerDisplayRows(receivedOrderRows.value))

const allRelationRows = computed(() => [...rows.value, ...customerRows.value])

const relationRows = computed(() => {
  if (activeRelationView.value === 'CUSTOMERS') return customerRows.value
  if (activeRelationView.value === 'ALL_RELATIONS') return allRelationRows.value
  return rows.value
})

const topRows = computed(() =>
  allRelationRows.value
    .filter((row) => row.publicId && hasSupplierPerformance(row))
    .slice()
    .sort((a, b) => supplierPerformanceScore(b) - supplierPerformanceScore(a))
    .slice(0, 3)
    .map((row) => ({
      publicId: row.publicId as string,
      relationView: row.relationView,
      name: row.supplierName || row.supplierCode,
      meta: supplierPerformanceMeta(row),
      value: supplierPerformanceValue(row),
    })),
)

const riskRows = computed(() =>
  allRelationRows.value
    .filter((row) => row.publicId)
    .map((row) => ({
      publicId: row.publicId as string,
      relationView: row.relationView,
      name: row.supplierName || row.supplierCode,
      reason: supplierAttentionReason(row),
    }))
    .filter((row) => row.reason)
    .slice(0, 3),
)

const regionRows = computed(() => {
  const topSpendRows = allRelationRows.value
    .filter((row) => row.publicId && toAmountNumber(row.cumulativeAmount) > 0)
    .slice()
    .sort((a, b) => toAmountNumber(b.cumulativeAmount) - toAmountNumber(a.cumulativeAmount))
    .slice(0, 3)

  const maxAmount = Math.max(...topSpendRows.map((row) => toAmountNumber(row.cumulativeAmount)), 1)

  return topSpendRows.map((row) => ({
    publicId: row.publicId as string,
    relationView: row.relationView,
    label: row.supplierName || row.supplierCode,
    value: formatAmount(row.cumulativeAmount),
    width: `${Math.max(8, Math.round((toAmountNumber(row.cumulativeAmount) / maxAmount) * 100))}%`,
  }))
})


async function fetchConnectedSummary() {
  if (session.organizationType !== 'SUPPLIER') {
    connectedSummary.value = null
    return
  }
  connectedSummary.value = await getConnectedSupplierSummary()
}

async function loadSupplierOrganizationNameMap() {
  try {
    const response = await getOrganizations({ page: 0, size: 300 })
    organizationNameMap.value = Object.fromEntries(
      response.content.map((org) => [org.organizationPublicId, org.organizationName]),
    )
    if (actor.canCreateSupplier.value) {
      supplierOrganizationOptions.value = response.content.filter((org) => org.organizationType === 'SUPPLIER')
    }
  } catch {
    organizationNameMap.value = {}
    supplierOrganizationOptions.value = []
  }
}

async function fetchCustomerRows() {
  try {
    const response = await getPurchaseOrders({
      viewType: 'SUPPLIER',
      page: 0,
      size: 100,
    })
    receivedOrderRows.value = response.content
  } catch {
    receivedOrderRows.value = []
  }
}

// 총 협력사만 실제 데이터로 바꾸고 나머지 카드 값은 더미 유지합니다.
const metrics = computed(() => {
  const base = content.value.metrics.map((metric) => ({ ...metric }))

  base[0].value = formatNumber(connectedSummary.value?.connectedSupplierCount ?? rows.value.length)

  base[1].value = formatNumber(customerRows.value.length)

  base[2].value = formatPercent(connectedSummary.value?.averageOnTimeRate)

  const averageLeadTimeDays = connectedSummary.value?.averageLeadTimeDays ?? 0
  base[3].value = `${averageLeadTimeDays}일`

  return base
})

// 검색어를 받아서 협력사 목록을 다시 불러옵니다.
// 협력사 로그인인데 supply-service 에 supplier row가 없으면,
// auth-service 의 내 조직 정보를 협력사처럼 한 줄로 보여줍니다.
async function fetchSupplierRows(keyword = '') {
  errorMessage.value = ''

  try {
    const normalizedKeyword = keyword.trim()

    const response = await getSuppliers({
      keyword: useServerSearch.value ? normalizedKeyword || undefined : undefined,
      page: 0,
      size: 100,
    })

    const connectedSuppliers = await Promise.all(
      response.content.map(async (supplier) => {
        const supplierOrgId = supplier.detail?.organizationPublicId

        // 내 조직은 목록에서 제외
        if (supplierOrgId && supplierOrgId === session.organizationPublicId) {
          return null
        }

        if (hasSupplierTrade(supplier)) {
          return supplier
        }

        return (await hasSupplierSubOrderRelation(supplier)) ? supplier : null
      }),
    )

    rows.value = connectedSuppliers
      .filter((supplier): supplier is SupplierListResponseDto => supplier != null)
      .map(toDisplayRow)
  } catch (error: any) {
    rows.value = []
    errorMessage.value = error.message ?? '협력사 목록을 불러오지 못했습니다.'
  }
}



// ADMIN / BUYER 는 검색을 서버가 처리하므로 탭 필터만 적용합니다.
// SUPPLIER 는 기존처럼 화면에서 검색어 필터를 한 번 더 적용합니다.
const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()

  return relationRows.value.filter((row) => {
    const matchesQuery =
      !query ||
      row.supplierCode.toLowerCase().includes(query) ||
      row.supplierName.toLowerCase().includes(query) ||
      row.cells.some((cell) => cell.toLowerCase().includes(query))

    if (!matchesQuery) return false

    switch (activeTab.value) {
      case 'ALL':
        return true
      case 'ACTIVE':
        return row.relationStatus === 'ACTIVE'
      case 'AT_RISK':
        return !!supplierAttentionReason(row)
      default:
        return true
    }
  })
})

// 검색어가 바뀌면 잠깐 기다렸다가 서버 검색을 호출합니다.
watch(search, (nextKeyword) => {
  // 협력사 로그인은 백엔드에서 검색이 막혀 있어서 서버 호출을 하지 않습니다.
  if (!useServerSearch.value) {
    return
  }

  // 이전 타이머가 있으면 지웁니다.
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // 0.3초 뒤에 한 번만 검색합니다.
  searchDebounceTimer = setTimeout(() => {
    void fetchSupplierRows(nextKeyword)
  }, 300)
})

// 페이지를 떠날 때 남아 있는 타이머를 정리합니다.
onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})


onMounted(() => {
  void fetchSupplierRows()
  void fetchCustomerRows()
  void fetchConnectedSummary()
  void loadSupplierOrganizationNameMap()
})

function toDetailResponse(supplier: SupplierResponseDto): ConnectedSupplierDetailResponseDto {
  return {
    ...supplier,
    onTimeRate: null,
    purchaseOrderCount: 0,
    cumulativeAmount: 0,
    orders: [],
  }
}

async function openSupplierDetail(publicId: string) {
  detailModalOpen.value = true
  detailLoading.value = true
  detailErrorMessage.value = ''
  selectedSupplier.value = null

  try {
    if (session.organizationType === 'BUYER' || session.organizationType === 'SUPPLIER') {
      selectedSupplier.value = await getConnectedSupplierDetail(publicId)
    } else {
      const supplier = await getSupplier(publicId)
      selectedSupplier.value = toDetailResponse(supplier)
    }
  } catch (error: any) {
    detailErrorMessage.value = error.message ?? '협력사 상세 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

function openRelationDetailPage(publicId: string, relationView: SupplierTableRow['relationView']) {
  if (relationView === 'CUSTOMER') {
    router.push({
      name: 'operationDetail',
      params: { kind: 'suppliers', publicId },
      query: { relation: 'customer' },
    })
    return
  }

  router.push({
    name: 'operationDetail',
    params: { kind: 'suppliers', publicId },
  })
}

function openSupplierDetailPage(publicId: string) {
  openRelationDetailPage(publicId, 'SUPPLIER')
}




const selectedSupplierOrganizationName = computed(() => {
  const organizationPublicId = selectedSupplier.value?.organizationPublicId
  if (!organizationPublicId) return '-'
  return organizationNameMap.value[organizationPublicId] ?? organizationPublicId
})

function closeSupplierDetail() {
  detailModalOpen.value = false
  detailLoading.value = false
  detailErrorMessage.value = ''
  selectedSupplier.value = null
}

// 협력사 등록 모달 기본값으로 되돌립니다.
function resetCreateForm() {
  createErrorMessage.value = ''
  createForm.value = {
    organizationPublicId: '',
    supplierCode: '',
    supplierName: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  }
}

// 협력사로 생성 가능한 조직 목록을 관리자 화면에서만 불러옵니다.
async function loadSupplierOrganizations() {
  if (!actor.canCreateSupplier.value) {
    supplierOrganizationOptions.value = []
    return
  }

  try {
    const response = await getOrganizations({
      organizationType: 'SUPPLIER',
      page: 0,
      size: 100,
    })

    supplierOrganizationOptions.value = response.content
      .slice()
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName, 'ko-KR'))
  } catch {
    supplierOrganizationOptions.value = []
  }
}

// 관리자일 때만 협력사 등록 모달을 엽니다.
function openCreateModal() {
  if (!actor.canCreateSupplier.value) return

  resetCreateForm()
  createModalOpen.value = true
}

// 협력사 등록 모달을 닫습니다.
function closeCreateModal() {
  createModalOpen.value = false
  createErrorMessage.value = ''
}

// 협력사 생성 API를 호출합니다.
async function submitCreateSupplier() {
  if (!createForm.value.organizationPublicId) {
    createErrorMessage.value = '협력사 조직을 선택해 주세요.'
    return
  }

  if (!createForm.value.supplierCode.trim()) {
    createErrorMessage.value = '협력사 코드를 입력해 주세요.'
    return
  }

  if (!createForm.value.supplierName.trim()) {
    createErrorMessage.value = '협력사명을 입력해 주세요.'
    return
  }

  try {
    createLoading.value = true
    createErrorMessage.value = ''

    const payload: CreateSupplierRequestDto = {
      organizationPublicId: createForm.value.organizationPublicId,
      supplierCode: createForm.value.supplierCode.trim(),
      supplierName: createForm.value.supplierName.trim(),
      primaryContactName: createForm.value.primaryContactName.trim(),
      primaryContactEmail: createForm.value.primaryContactEmail.trim(),
      primaryContactPhone: createForm.value.primaryContactPhone.trim(),
    }

    await createSupplier(payload)

    closeCreateModal()
    await fetchSupplierRows(search.value)
  } catch (error: any) {
    createErrorMessage.value = error.message ?? '협력사 등록에 실패했습니다.'
  } finally {
    createLoading.value = false
  }
}

</script>

<template>
  <section class="app-screen terminal-page suppliers-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>

      <div class="design-trigger-row">
        <button
          v-if="actor.canCreateSupplier.value"
          class="page-button page-button--primary"
          type="button"
          @click="openCreateModal"
        >
          {{ content.createLabel }}
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
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

          <div class="terminal-page__tabs">
            <button
              v-for="tab in content.tabs"
              :key="tab.key"
              :class="['terminal-page__tab', { 'is-active': activeTab === tab.key }]"
              type="button"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>

          <label class="suppliers-page__relation-select">
            <select v-model="activeRelationView" aria-label="거래 관계 필터">
              <option
                v-for="tab in content.relationTabs"
                :key="tab.key"
                :value="tab.key"
              >
                {{ tab.label }}
              </option>
            </select>
          </label>
        </section>

        <article class="page-panel">
          <div class="page-table terminal-page__table suppliers-page__table">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div v-for="row in filteredRows" :key="row.publicId ?? row.supplierCode" class="page-table__row">
              <span v-for="(cell, index) in row.cells" :key="`${row.publicId ?? row.supplierCode}-${index}`">
                {{ cell }}
              </span>
              <span>
                <button
                  v-if="row.publicId"
                  class="page-button page-button--secondary"
                  type="button"
                  @click="openRelationDetailPage(row.publicId, row.relationView)"
                >
                  {{ '상세' }}
                </button>
                <template v-else>-</template>
              </span>
            </div>
          </div>


          <p v-if="errorMessage" class="terminal-page__table-message is-error">
            {{ errorMessage }}
          </p>
        </article>
      </div>

      <aside class="terminal-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">TOP</div>
              <h3>{{ content.topTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div
              v-for="row in topRows"
              :key="row.publicId"
              class="page-feed__item suppliers-page__feed-summary"
            >
              <span class="page-feed__label">{{ row.meta }}</span>
              <strong class="page-feed__text">{{ row.name }}</strong>
              <span>{{ row.value }}</span>
            </div>
            <p v-if="topRows.length === 0" class="terminal-page__table-message">
              표시할 성과 데이터가 없습니다.
            </p>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">WATCH</div>
              <h3>{{ content.riskTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div
              v-for="row in riskRows"
              :key="row.publicId"
              class="page-feed__item suppliers-page__feed-summary"
            >
              <span class="page-feed__label">{{ row.name }}</span>
              <strong class="page-feed__text">{{ row.reason }}</strong>
            </div>
            <p v-if="riskRows.length === 0" class="terminal-page__table-message">
              주의가 필요한 협력사가 없습니다.
            </p>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">SPEND</div>
              <h3>{{ content.regionTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div
              v-for="row in regionRows"
              :key="row.publicId"
              class="page-feed__item suppliers-page__feed-summary"
            >
              <span class="page-feed__label">{{ row.label }}</span>
              <strong class="page-feed__text">{{ row.value }}</strong>
              <div class="terminal-page__bar">
                <span :style="{ width: row.width }" />
              </div>
            </div>
            <p v-if="regionRows.length === 0" class="terminal-page__table-message">
              표시할 거래 금액이 없습니다.
            </p>
          </div>
        </article>
      </aside>
    </section>
  </section>

  <BaseModal
  v-model="createModalOpen"
  :title="content.createLabel"
  :description="content.createDescription"
  size="md"
  @close="closeCreateModal"
>
  <div class="page-form" style="display: flex; flex-direction: column; gap: 16px;">
    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">{{ content.form.organization }}</span>
      <div style="width: 100%; border-bottom: 2px solid var(--color-surface-container-high);">
        <select
          v-model="createForm.organizationPublicId"
          style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none;"
        >
          <option value="">{{ content.form.selectOrganization }}</option>
          <option
            v-for="organization in supplierOrganizationOptions"
            :key="organization.organizationPublicId"
            :value="organization.organizationPublicId"
          >
            {{ organization.organizationName }} / {{ organization.organizationPublicId }}
          </option>
        </select>
      </div>
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">{{ content.form.supplierCode }}</span>
      <input
        v-model="createForm.supplierCode"
        type="text"
        :placeholder="content.form.supplierCodePlaceholder"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">{{ content.form.supplierName }}</span>
      <input
        v-model="createForm.supplierName"
        type="text"
        :placeholder="content.form.supplierNamePlaceholder"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">{{ content.form.contactName }}</span>
      <input
        v-model="createForm.primaryContactName"
        type="text"
        :placeholder="content.form.contactNamePlaceholder"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">{{ content.form.contactEmail }}</span>
      <input
        v-model="createForm.primaryContactEmail"
        type="email"
        placeholder="email@example.com"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">{{ content.form.contactPhone }}</span>
      <input
        v-model="createForm.primaryContactPhone"
        type="text"
        placeholder="010-0000-0000"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <p v-if="createErrorMessage" style="margin: 0; color: var(--color-error);">
      {{ createErrorMessage }}
    </p>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
      <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
        {{ content.form.cancel }}
      </button>
      <button
        class="page-button page-button--primary"
        type="button"
        :disabled="createLoading"
        @click="submitCreateSupplier"
      >
        {{ content.form.submit }}
      </button>
    </div>
  </div>
</BaseModal>

  <BaseModal
    v-model="detailModalOpen"
    :title="content.detailTitle"
    :description="selectedSupplier?.supplierName || content.detailDescription"
    size="md"
    @close="closeSupplierDetail"
  >
    <div v-if="detailLoading" class="page-feed">
      <div class="page-feed__item">
        <strong class="page-feed__text">{{ content.form.loadingDetail }}</strong>
      </div>
    </div>

    <p v-else-if="detailErrorMessage" style="margin: 0; color: var(--color-error);">
      {{ detailErrorMessage }}
    </p>

    <div v-else-if="selectedSupplier" class="page-feed">
      <div class="page-feed__item">
        <span class="page-feed__label">ORGANIZATION NAME</span>
        <strong class="page-feed__text">{{ selectedSupplierOrganizationName }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER CODE</span>
        <strong class="page-feed__text">{{ selectedSupplier.supplierCode }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER NAME</span>
        <strong class="page-feed__text">{{ selectedSupplier.supplierName }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER STATUS</span>
        <strong class="page-feed__text">
          {{ supplierStatusText(selectedSupplier.supplierStatus) }}
        </strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">PRIMARY CONTACT NAME</span>
        <strong class="page-feed__text">{{ selectedSupplier.primaryContactName || '-' }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">PRIMARY CONTACT EMAIL</span>
        <strong class="page-feed__text">{{ selectedSupplier.primaryContactEmail || '-' }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">PRIMARY CONTACT PHONE</span>
        <strong class="page-feed__text">{{ selectedSupplier.primaryContactPhone || '-' }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">CREATED AT</span>
        <strong class="page-feed__text">{{ formatDate(selectedSupplier.createdAt) }}</strong>
      </div>

      <div class="page-feed__item" style="display: block;">
        <span class="page-feed__label">RELATED ORDERS</span>

        <div
          v-if="selectedSupplier.orders && selectedSupplier.orders.length > 0"
          class="page-table"
          style="margin-top: 8px;"
        >
          <div class="page-table__row page-table__row--head">
            <span>{{ content.detail.documentType }}</span>
            <span>{{ content.detail.documentNo }}</span>
            <span>{{ content.detail.parentPoNo }}</span>
            <span>{{ content.detail.role }}</span>
            <span>{{ content.detail.status }}</span>
            <span>{{ content.detail.orderedAt }}</span>
            <span>{{ content.detail.amount }}</span>
          </div>

          <div
            v-for="order in selectedSupplier.orders"
            :key="order.subPoPublicId || order.poPublicId || order.orderedAt"
            class="page-table__row"
          >
            <span>
              {{ order.orderType === 'PURCHASE_ORDER'
                ? content.detail.purchaseOrder
                : content.detail.subPurchaseOrder }}
            </span>
            <span>{{ order.orderType === 'PURCHASE_ORDER' ? order.poNumber : order.subPoNumber }}</span>
            <span>{{ order.parentPoNumber ?? '-' }}</span>
            <span>{{ orderRoleText(order.orderRole) }}</span>
            <span>{{ connectedOrderStatusText(order) }}</span>
            <span>{{ formatDate(order.orderedAt) }}</span>
            <span>{{ formatAmount(order.totalAmount) }}</span>
          </div>
        </div>

        <p v-else style="margin: 8px 0 0;">
          {{ content.detail.noRelatedOrders }}
        </p>
      </div>
    </div>
  </BaseModal>
</template>
