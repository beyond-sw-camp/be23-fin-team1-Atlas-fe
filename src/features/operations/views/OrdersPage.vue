<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useActorScope } from '../../../composables/useActorScope'
import { getItem, getItems, type ItemResponseDto } from '../../../services/item'
import { getSuppliers, type SupplierListResponseDto } from '../../../services/supplier'
import type { HeaderAction } from '../../../stores/header'

import {
  acceptPurchaseOrder,
  changePurchaseOrderStatus,
  confirmPurchaseOrderItem,
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  rejectPurchaseOrder,
  type CreatePurchaseOrderRequestDto,
  type CurrencyCode,
  type PoStatus,
  type PriorityCode,
  type PurchaseOrderDetailResponseDto,
  type PurchaseOrderItemResponseDto,
  type PurchaseOrderItemStatus,
} from '../../../services/purchaseOrder'
import {
  acceptSubPurchaseOrder,
  confirmSubPurchaseOrderItem,
  createSubPurchaseOrder,
  getReceivedSubPurchaseOrders,
  getSubPurchaseOrder,
  getSubPurchaseOrdersByParentPo,
  rejectSubPurchaseOrder,
  type CreateSubPurchaseOrderRequestDto,
  type SubPoStatus,
  type SubPurchaseOrderItemResponseDto,
  type SubPurchaseOrderLineStatus,
  type SubPurchaseOrderResponseDto,
} from '../../../services/subPurchaseOrder'

// 기존 Orders 페이지 레이아웃은 유지하고,
// 기존 더미 데이터만 실제 발주 / 서브발주 API 데이터로 연결합니다.
type OrderTabKey =
  | 'ALL'
  | 'CREATED'
  | 'ACCEPTED'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'

type OrderQueueEntry = {
  kind: 'PO' | 'SUB_PO'
  publicId: string
  number: string
  text: string
  value: string
  orderedAt: string
}

type CreateOrderLineForm = {
  id: number
  itemPublicId: string
  orderedQty: number | null
  unitPrice: number | null
  requiredDate: string
}

type CreateSubOrderLineForm = {
  parentPoItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  unit: string
  selected: boolean
  orderedQty: number | null
  unitPrice: number | null
  requiredDate: string
}

const TABLE_COLUMNS = [
  '발주번호',
  '품목',
  '협력사',
  '수량',
  '총액',
  '발주일',
  '납기일',
  '우선순위',
  '상태',
  '작업',
]

const TAB_OPTIONS: { key: OrderTabKey; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'CREATED', label: '확인 대기' },
  { key: 'ACCEPTED', label: '수락' },
  { key: 'PARTIALLY_CONFIRMED', label: '부분 확정' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'REJECTED', label: '반려' },
]

const header = useAtlasHeaderStore()
const actor = useActorScope()

const purchaseOrders = ref<PurchaseOrderDetailResponseDto[]>([])
const receivedSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const parentSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const supplierOptions = ref<SupplierListResponseDto[]>([])
const supplierItemOptions = ref<ItemResponseDto[]>([])
const itemMap = ref<Record<string, ItemResponseDto>>({})

const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const activeTabKey = ref<OrderTabKey>('ALL')

const orderDetailModalOpen = ref(false)
const detailLoading = ref(false)
const detailActionLoading = ref(false)
const detailErrorMessage = ref('')
const detailSuccessMessage = ref('')
const selectedOrder = ref<PurchaseOrderDetailResponseDto | null>(null)
const orderConfirmQtyMap = ref<Record<string, string>>({})

let createLineSeed = 1

function createEmptyOrderLine(): CreateOrderLineForm {
  return {
    id: createLineSeed++,
    itemPublicId: '',
    orderedQty: null,
    unitPrice: null,
    requiredDate: '',
  }
}

const createModalOpen = ref(false)
const createLoading = ref(false)
const createErrorMessage = ref('')
const createForm = ref({
  poNumber: '',
  supplierPublicId: '',
  priorityCode: 'NORMAL' as PriorityCode,
  dueDate: getLocalDateString(7),
  currencyCode: 'KRW' as CurrencyCode,
  memo: '',
  lines: [createEmptyOrderLine()],
})

const subOrderModalOpen = ref(false)
const subOrderCreateLoading = ref(false)
const subOrderCreateErrorMessage = ref('')
const subOrderForm = ref({
  subPoNumber: '',
  supplierPublicId: '',
  dueDate: getLocalDateString(7),
  lines: [] as CreateSubOrderLineForm[],
})

const subOrderDetailModalOpen = ref(false)
const subOrderDetailLoading = ref(false)
const subOrderActionLoading = ref(false)
const subOrderDetailErrorMessage = ref('')
const subOrderSuccessMessage = ref('')
const selectedSubOrder = ref<SubPurchaseOrderResponseDto | null>(null)
const subOrderConfirmQtyMap = ref<Record<string, string>>({})

const selectableSuppliers = computed(() =>
  supplierOptions.value.filter((supplier) => !!supplierPublicIdOf(supplier)),
)

const downstreamSupplierOptions = computed(() =>
  selectableSuppliers.value.filter(
    (supplier) => supplierPublicIdOf(supplier) !== selectedOrder.value?.supplierPublicId,
  ),
)

// 현재 화면에서 집계 중인 통화가 1종류면 그대로 화폐 포맷을 씁니다.
const currentCurrency = computed<CurrencyCode | null>(() => {
  const codes = Array.from(
    new Set(
      purchaseOrders.value
        .map((order) => order.currencyCode)
        .filter((value): value is CurrencyCode => !!value),
    ),
  )
  return codes.length === 1 ? codes[0] : null
})

const dashboardMetrics = computed(() => {
  const totalCount = purchaseOrders.value.length
  const pendingCount = purchaseOrders.value.filter((order) => order.poStatus === 'CREATED').length
  const overdueCount = purchaseOrders.value.filter(
    (order) => order.dueDate < getLocalDateString() && isOpenOrderStatus(order.poStatus),
  ).length
  const totalAmount = purchaseOrders.value.reduce(
    (sum, order) => sum + toNumber(order.totalAmount),
    0,
  )

  return [
    {
      label: '총 발주',
      value: String(totalCount),
      meta: '현재 조회 건수',
      tone: 'nominal',
    },
    {
      label: '확인 대기',
      value: String(pendingCount),
      meta: '협력사 응답 전',
      tone: 'warning',
    },
    {
      label: '납기 경과',
      value: String(overdueCount),
      meta: '완료 전 발주',
      tone: 'critical',
    },
    {
      label: '총 금액',
      value: formatDashboardAmount(totalAmount),
      meta: currentCurrency.value ? '현재 조회 합계' : '통화 혼합 합계',
      tone: 'info',
    },
  ]
})

const filteredOrders = computed(() => {
  const query = search.value.trim().toLowerCase()

  return purchaseOrders.value.filter((order) => {
    const matchesTab =
      activeTabKey.value === 'ALL' || order.poStatus === activeTabKey.value

    const tokens = [
      order.poNumber,
      order.supplierName,
      order.supplierCode,
      ...order.items.flatMap((item) => [item.itemCode, item.itemName]),
    ]
      .filter(Boolean)
      .map((value) => value.toLowerCase())

    const matchesQuery =
      !query || tokens.some((token) => token.includes(query))

    return matchesTab && matchesQuery
  })
})

const queueEntries = computed<OrderQueueEntry[]>(() => {
  const pendingOrders = purchaseOrders.value
    .filter((order) => order.poStatus === 'CREATED')
    .map((order) => ({
      kind: 'PO' as const,
      publicId: order.poPublicId,
      number: order.poNumber,
      text: `[발주] ${order.supplierName} / ${getOrderItemLabel(order)}`,
      value: formatAmount(toNumber(order.totalAmount), order.currencyCode),
      orderedAt: order.orderedAt,
    }))

  const pendingSubOrders =
    actor.isSupplierOrganization.value || actor.isAdminRole.value
      ? receivedSubOrders.value
          .filter((subOrder) => subOrder.subPoStatus === 'CREATED')
          .map((subOrder) => ({
            kind: 'SUB_PO' as const,
            publicId: subOrder.subPoPublicId,
            number: subOrder.subPoNumber,
            text: `[서브발주] ${subOrder.issuerSupplierName} -> ${subOrder.supplierName}`,
            value: formatPlainAmount(toNumber(subOrder.totalAmount)),
            orderedAt: subOrder.orderedAt,
          }))
      : []

  return [...pendingOrders, ...pendingSubOrders]
    .sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )
    .slice(0, 6)
})

const categoryRows = computed(() => {
  const totals = new Map<string, number>()

  purchaseOrders.value.forEach((order) => {
    order.items.forEach((item) => {
      const categoryName =
        itemMap.value[item.itemPublicId]?.categoryName ?? '미분류'
      totals.set(
        categoryName,
        (totals.get(categoryName) ?? 0) + toNumber(item.lineAmount),
      )
    })
  })

  const rows = Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  const maxValue = rows.length ? Math.max(...rows.map((row) => row[1])) : 1

  return rows.map(([label, value]) => ({
    label,
    value: formatDashboardAmount(value),
    width: `${Math.max(16, Math.round((value / maxValue) * 100))}%`,
  }))
})

const topSupplierRows = computed(() => {
  const supplierTotals = new Map<
    string,
    { orderCount: number; totalAmount: number }
  >()

  purchaseOrders.value.forEach((order) => {
    const current = supplierTotals.get(order.supplierName) ?? {
      orderCount: 0,
      totalAmount: 0,
    }

    current.orderCount += 1
    current.totalAmount += toNumber(order.totalAmount)
    supplierTotals.set(order.supplierName, current)
  })

  return Array.from(supplierTotals.entries())
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 4)
    .map(([name, summary]) => ({
      name,
      text: `${summary.orderCount}건 / ${formatDashboardAmount(summary.totalAmount)}`,
    }))
})

const selectedOrderDescription = computed(() =>
  selectedOrder.value
    ? `${selectedOrder.value.poNumber} / ${selectedOrder.value.supplierName}`
    : '선택한 발주의 상세 정보를 확인합니다.',
)

const selectedSubOrderDescription = computed(() =>
  selectedSubOrder.value
    ? `${selectedSubOrder.value.subPoNumber} / ${selectedSubOrder.value.supplierName}`
    : '선택한 서브발주의 상세 정보를 확인합니다.',
)

watchEffect(() => {
  const nextActions: HeaderAction[] = [
    {
      key: 'orders-export',
      label: '내보내기',
      tone: 'secondary',
      onClick: downloadOrdersCsv,
    },
    {
      key: 'orders-refresh',
      label: '새로고침',
      tone: 'secondary',
      onClick: loadOrderDashboard,
    },
  ]

  if (actor.canCreatePurchaseOrder.value) {
    nextActions.push({
      key: 'orders-create',
      label: '신규 발주',
      tone: 'primary',
      onClick: openCreateOrderModal,
    })
  }

  header.setActions(nextActions)
})


watch(
  () => createForm.value.supplierPublicId,
  async (supplierPublicId) => {
    supplierItemOptions.value = []
    createForm.value.lines = createForm.value.lines.map((line) => ({
      ...line,
      itemPublicId: '',
    }))

    if (!supplierPublicId) return

    try {
      const response = await getItems({
        supplierPublicId,
        status: 'ACTIVE',
        page: 0,
        size: 100,
      })

      supplierItemOptions.value = [...response.content].sort((a, b) =>
        a.itemName.localeCompare(b.itemName, 'ko-KR'),
      )
    } catch (error) {
      createErrorMessage.value = normalizeErrorMessage(
        error,
        '선택한 협력사의 품목 목록을 불러오지 못했습니다.',
      )
    }
  },
)

onMounted(async () => {
  resetCreateOrderForm()

  await Promise.all([loadOrderDashboard(), loadSupplierOptions()])
})

onBeforeUnmount(() => header.clearActions())

function getLocalDateString(addDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + addDays)

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toNumber(value: number | null | undefined) {
  return value == null ? 0 : Number(value)
}

function normalizeErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '-'

  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatPlainAmount(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return `${formatNumber(value)}`
}

function formatAmount(
  value: number | null | undefined,
  currency: CurrencyCode | null | undefined,
) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  if (!currency) return formatPlainAmount(value)

  try {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'KRW' || currency === 'JPY' ? 0 : 2,
    }).format(Number(value))
  } catch {
    return `${formatNumber(value)} ${currency}`
  }
}

function formatDashboardAmount(value: number) {
  return currentCurrency.value
    ? formatAmount(value, currentCurrency.value)
    : formatPlainAmount(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value

  return `${year}.${month}.${day}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function priorityText(value: PriorityCode | null | undefined) {
  switch (value) {
    case 'LOW':
      return '낮음'
    case 'NORMAL':
      return '보통'
    case 'HIGH':
      return '높음'
    case 'URGENT':
      return '긴급'
    default:
      return '-'
  }
}

function poStatusText(value: PoStatus) {
  switch (value) {
    case 'CREATED':
      return '확인 대기'
    case 'ACCEPTED':
      return '수락'
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

function purchaseOrderItemStatusText(value: PurchaseOrderItemStatus) {
  switch (value) {
    case 'OPEN':
      return '대기'
    case 'PARTIALLY_CONFIRMED':
      return '부분 확정'
    case 'CONFIRMED':
      return '확정'
    case 'REJECTED':
      return '반려'
    case 'CANCELLED':
      return '취소'
    case 'DELETED':
      return '삭제'
    default:
      return value
  }
}

function subPoStatusText(value: SubPoStatus) {
  switch (value) {
    case 'CREATED':
      return '확인 대기'
    case 'ACCEPTED':
      return '수락'
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

function subPurchaseOrderLineStatusText(value: SubPurchaseOrderLineStatus) {
  switch (value) {
    case 'OPEN':
      return '대기'
    case 'PARTIALLY_CONFIRMED':
      return '부분 확정'
    case 'CONFIRMED':
      return '확정'
    case 'REJECTED':
      return '반려'
    case 'CANCELLED':
      return '취소'
    case 'DELETED':
      return '삭제'
    default:
      return value
  }
}

function isOpenOrderStatus(status: PoStatus) {
  return !['REJECTED', 'CANCELLED', 'COMPLETED', 'DELETED'].includes(status)
}

function getOrderItemLabel(order: PurchaseOrderDetailResponseDto) {
  if (!order.items.length) return '-'
  if (order.items.length === 1) return order.items[0].itemName
  return `${order.items[0].itemName} 외 ${order.items.length - 1}건`
}

function getOrderQtyLabel(order: PurchaseOrderDetailResponseDto) {
  const totalQty = order.items.reduce(
    (sum, item) => sum + toNumber(item.orderedQty),
    0,
  )
  const units = Array.from(new Set(order.items.map((item) => item.unit)))

  if (units.length === 1 && units[0]) {
    return `${formatNumber(totalQty)} ${units[0]}`
  }

  return formatNumber(totalQty)
}

function supplierPublicIdOf(supplier: SupplierListResponseDto) {
  return supplier.detail?.publicId ?? ''
}

function buildOrderConfirmQtyMap(order: PurchaseOrderDetailResponseDto) {
  return Object.fromEntries(
    order.items.map((item) => [
      item.poItemPublicId,
      String(toNumber(item.confirmedQty ?? item.orderedQty)),
    ]),
  )
}

function buildSubOrderConfirmQtyMap(subOrder: SubPurchaseOrderResponseDto) {
  return Object.fromEntries(
    (subOrder.items ?? []).map((item) => [
      subOrderItemKey(item),
      String(toNumber(item.confirmedQty ?? item.orderedQty)),
    ]),
  )
}

function subOrderItemKey(item: SubPurchaseOrderItemResponseDto) {
  return `${item.parentPoItemPublicId}:${item.itemPublicId}`
}

async function loadSupplierOptions() {
  try {
    const response = await getSuppliers({
      page: 0,
      size: 100,
    })

    // 발주 화면에서는 협력사 목록 응답 DTO 기준으로 정렬해서 사용합니다.
    const supplierRows = response.content as SupplierListResponseDto[]

    supplierOptions.value = supplierRows
      .slice()
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'ko-KR'))
  } catch {
    supplierOptions.value = []
  }
}

async function loadItemLookup(orders: PurchaseOrderDetailResponseDto[]) {
  const missingItemIds = Array.from(
    new Set(
      orders.flatMap((order) => order.items.map((item) => item.itemPublicId)),
    ),
  ).filter((itemPublicId) => !itemMap.value[itemPublicId])

  if (!missingItemIds.length) return

  const loadedItems = await Promise.all(
    missingItemIds.map(async (itemPublicId) => {
      try {
        return await getItem(itemPublicId)
      } catch {
        return null
      }
    }),
  )

  const nextMap = { ...itemMap.value }

  loadedItems.forEach((item) => {
    if (item) {
      nextMap[item.publicId] = item
    }
  })

  itemMap.value = nextMap
}

async function loadPurchaseOrders() {
  const response = await getPurchaseOrders({
    viewType: actor.ordersViewType.value,
    page: 0,
    size: 100,
  })

  const details = await Promise.all(
    response.content.map(async (summary) => {
      try {
        return await getPurchaseOrder(summary.poPublicId)
      } catch {
        return null
      }
    }),
  )

  purchaseOrders.value = details
    .filter((order): order is PurchaseOrderDetailResponseDto => !!order)
    .sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )

  await loadItemLookup(purchaseOrders.value)
}

async function loadReceivedSubOrders() {
  if (!actor.isSupplierOrganization.value && !actor.isAdminRole.value) {
    receivedSubOrders.value = []
    return
  }

  try {
    const response = await getReceivedSubPurchaseOrders({
      page: 0,
      size: 50,
    })

    receivedSubOrders.value = [...response.content].sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )
  } catch {
    receivedSubOrders.value = []
  }
}

async function loadParentSubOrders(poPublicId: string) {
  if (!actor.isSupplierOrganization.value && !actor.isAdminRole.value) {
    parentSubOrders.value = []
    return
  }

  try {
    const response = await getSubPurchaseOrdersByParentPo({
      parentPoPublicId: poPublicId,
      page: 0,
      size: 50,
    })

    parentSubOrders.value = [...response.content].sort(
      (a, b) =>
        new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )
  } catch {
    parentSubOrders.value = []
  }
}

async function loadOrderDashboard() {
  try {
    loading.value = true
    errorMessage.value = ''

    await Promise.all([loadPurchaseOrders(), loadReceivedSubOrders()])
  } catch (error) {
    purchaseOrders.value = []
    errorMessage.value = normalizeErrorMessage(
      error,
      '발주 목록을 불러오지 못했습니다.',
    )
  } finally {
    loading.value = false
  }
}


function resetCreateOrderForm() {
  createErrorMessage.value = ''
  supplierItemOptions.value = []

  createForm.value = {
    poNumber: '',
    supplierPublicId: '',
    priorityCode: 'NORMAL',
    dueDate: getLocalDateString(7),
    currencyCode: 'KRW',
    memo: '',
    lines: [createEmptyOrderLine()],
  }
}

function openCreateOrderModal() {
  resetCreateOrderForm()
  createModalOpen.value = true
}

function closeCreateOrderModal() {
  createModalOpen.value = false
}

function addCreateOrderLine() {
  createForm.value.lines.push(createEmptyOrderLine())
}

function removeCreateOrderLine(lineId: number) {
  if (createForm.value.lines.length === 1) return
  createForm.value.lines = createForm.value.lines.filter((line) => line.id !== lineId)
}

function validateCreateOrderForm() {
  if (!createForm.value.poNumber.trim()) return '발주번호를 입력하세요.'
  if (!createForm.value.supplierPublicId) return '협력사를 선택하세요.'
  if (!createForm.value.dueDate) return '납기일을 입력하세요.'

  const selectedLines = createForm.value.lines.filter((line) => !!line.itemPublicId)

  if (!selectedLines.length) return '발주 품목을 1개 이상 선택하세요.'

  const duplicatedItemIds = new Set<string>()

  for (const line of selectedLines) {
    if (duplicatedItemIds.has(line.itemPublicId)) {
      return '같은 품목을 중복으로 담을 수 없습니다.'
    }

    duplicatedItemIds.add(line.itemPublicId)

    if (!line.orderedQty || line.orderedQty <= 0) {
      return '발주 수량은 0보다 커야 합니다.'
    }

    if (!line.unitPrice || line.unitPrice <= 0) {
      return '단가는 0보다 커야 합니다.'
    }

    // 품목 요청 납기일은 발주 납기일보다 늦을 수 없습니다.
    if (line.requiredDate && line.requiredDate > createForm.value.dueDate) {
      return '요청 납기일은 발주 납기일보다 늦을 수 없습니다.'
    }
  }

  return ''
}

async function submitCreateOrder() {
  const validationMessage = validateCreateOrderForm()

  if (validationMessage) {
    createErrorMessage.value = validationMessage
    return
  }

  try {
    createLoading.value = true
    createErrorMessage.value = ''

    const payload: CreatePurchaseOrderRequestDto = {
      poNumber: createForm.value.poNumber.trim(),
      supplierPublicId: createForm.value.supplierPublicId,
      priorityCode: createForm.value.priorityCode,
      dueDate: createForm.value.dueDate,
      currencyCode: createForm.value.currencyCode,
      memo: createForm.value.memo.trim() || undefined,
      items: createForm.value.lines
        .filter((line) => !!line.itemPublicId)
        .map((line) => ({
          itemPublicId: line.itemPublicId,
          orderedQty: Number(line.orderedQty),
          unitPrice: Number(line.unitPrice),
          requiredDate: line.requiredDate || undefined,
        })),
    }

    await createPurchaseOrder(payload)
    createModalOpen.value = false

    await loadOrderDashboard()
  } catch (error) {
    createErrorMessage.value = normalizeErrorMessage(
      error,
      '발주 등록에 실패했습니다.',
    )
  } finally {
    createLoading.value = false
  }
}

async function openOrderDetail(order: PurchaseOrderDetailResponseDto) {
  try {
    orderDetailModalOpen.value = true
    detailLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''
    selectedOrder.value = null
    parentSubOrders.value = []

    const detail = await getPurchaseOrder(order.poPublicId)

    selectedOrder.value = detail
    orderConfirmQtyMap.value = buildOrderConfirmQtyMap(detail)

    await loadItemLookup([detail])
    await loadParentSubOrders(detail.poPublicId)
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      '발주 상세 정보를 불러오지 못했습니다.',
    )
  } finally {
    detailLoading.value = false
  }
}

async function openOrderDetailById(poPublicId: string) {
  const foundOrder = purchaseOrders.value.find((order) => order.poPublicId === poPublicId)

  if (foundOrder) {
    await openOrderDetail(foundOrder)
    return
  }

  try {
    const detail = await getPurchaseOrder(poPublicId)
    await openOrderDetail(detail)
  } catch {
    // 큐에서 눌렀는데 이미 삭제되었거나 권한이 없으면 조용히 무시합니다.
  }
}

function closeOrderDetailModal() {
  orderDetailModalOpen.value = false
  detailLoading.value = false
  detailActionLoading.value = false
  detailErrorMessage.value = ''
  detailSuccessMessage.value = ''
  selectedOrder.value = null
  parentSubOrders.value = []
  orderConfirmQtyMap.value = {}
}

async function refreshSelectedOrder() {
  if (!selectedOrder.value) return

  const refreshed = await getPurchaseOrder(selectedOrder.value.poPublicId)
  selectedOrder.value = refreshed
  orderConfirmQtyMap.value = buildOrderConfirmQtyMap(refreshed)

  await loadItemLookup([refreshed])
  await loadParentSubOrders(refreshed.poPublicId)
}

function canSupplierRespondOrder(order: PurchaseOrderDetailResponseDto | null) {
  return actor.isSupplierOrganization.value && order?.poStatus === 'CREATED'
}

function canSupplierConfirmOrderItem(
  order: PurchaseOrderDetailResponseDto | null,
  item: PurchaseOrderItemResponseDto,
) {
  return (
    actor.isSupplierOrganization.value &&
    !!order &&
    ['ACCEPTED', 'PARTIALLY_CONFIRMED', 'CONFIRMED'].includes(order.poStatus) &&
    !['CONFIRMED', 'REJECTED', 'CANCELLED', 'DELETED'].includes(item.itemStatus)
  )
}

function canBuyerCancelOrder(order: PurchaseOrderDetailResponseDto | null) {
  return (
    actor.canManagePurchaseOrdersAsBuyer.value &&
    !!order &&
    !['REJECTED', 'CANCELLED', 'COMPLETED', 'DELETED'].includes(order.poStatus)
  )
}

function canBuyerCompleteOrder(order: PurchaseOrderDetailResponseDto | null) {
  return actor.canManagePurchaseOrdersAsBuyer.value && order?.poStatus === 'CONFIRMED'
}

function canCreateSubOrder(order: PurchaseOrderDetailResponseDto | null) {
  return (
    actor.isSupplierOrganization.value &&
    !!order &&
    ['ACCEPTED', 'PARTIALLY_CONFIRMED', 'CONFIRMED'].includes(order.poStatus)
  )
}

async function afterOrderMutation(successMessage: string) {
  await loadOrderDashboard()
  await refreshSelectedOrder()
  detailSuccessMessage.value = successMessage
}

async function submitAcceptOrder() {
  if (!selectedOrder.value) return
  if (!window.confirm('이 발주를 수락하시겠습니까?')) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await acceptPurchaseOrder(selectedOrder.value.poPublicId)
    await afterOrderMutation('발주를 수락했습니다.')
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      '발주 수락에 실패했습니다.',
    )
  } finally {
    detailActionLoading.value = false
  }
}

async function submitRejectOrder() {
  if (!selectedOrder.value) return
  if (!window.confirm('이 발주를 반려하시겠습니까?')) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await rejectPurchaseOrder(selectedOrder.value.poPublicId)
    await afterOrderMutation('발주를 반려했습니다.')
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      '발주 반려에 실패했습니다.',
    )
  } finally {
    detailActionLoading.value = false
  }
}

async function submitConfirmOrderItem(item: PurchaseOrderItemResponseDto) {
  if (!selectedOrder.value) return

  const confirmedQty = Number(orderConfirmQtyMap.value[item.poItemPublicId])

  if (!confirmedQty || confirmedQty <= 0) {
    detailErrorMessage.value = '확정 수량은 0보다 커야 합니다.'
    return
  }

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await confirmPurchaseOrderItem(
      selectedOrder.value.poPublicId,
      item.poItemPublicId,
      {
        confirmedQty,
      },
    )

    await afterOrderMutation('확정 수량을 반영했습니다.')
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      '확정 수량 반영에 실패했습니다.',
    )
  } finally {
    detailActionLoading.value = false
  }
}

async function submitCancelOrder() {
  if (!selectedOrder.value) return
  if (!window.confirm('이 발주를 취소하시겠습니까?')) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await changePurchaseOrderStatus(selectedOrder.value.poPublicId, {
      poStatus: 'CANCELLED',
    })

    await afterOrderMutation('발주를 취소했습니다.')
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      '발주 취소에 실패했습니다.',
    )
  } finally {
    detailActionLoading.value = false
  }
}

async function submitCompleteOrder() {
  if (!selectedOrder.value) return
  if (!window.confirm('이 발주를 완료 처리하시겠습니까?')) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await changePurchaseOrderStatus(selectedOrder.value.poPublicId, {
      poStatus: 'COMPLETED',
    })

    await afterOrderMutation('발주를 완료 처리했습니다.')
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      '발주 완료 처리에 실패했습니다.',
    )
  } finally {
    detailActionLoading.value = false
  }
}

function resetSubOrderForm(order: PurchaseOrderDetailResponseDto) {
  subOrderCreateErrorMessage.value = ''

  subOrderForm.value = {
    subPoNumber: `SUB-${order.poNumber}-${Date.now().toString().slice(-4)}`,
    supplierPublicId: '',
    dueDate: order.dueDate,
    lines: order.items.map((item) => ({
      parentPoItemPublicId: item.poItemPublicId,
      itemPublicId: item.itemPublicId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unit: item.unit,
      selected: true,
      orderedQty: toNumber(item.confirmedQty ?? item.orderedQty),
      unitPrice: toNumber(item.unitPrice),
      requiredDate: item.requiredDate ?? order.dueDate,
    })),
  }
}

function openCreateSubOrderModal() {
  if (!selectedOrder.value) return

  resetSubOrderForm(selectedOrder.value)
  subOrderModalOpen.value = true
}

function closeCreateSubOrderModal() {
  subOrderModalOpen.value = false
  subOrderCreateErrorMessage.value = ''
}

function validateSubOrderForm() {
  if (!selectedOrder.value) return '부모 발주 정보가 없습니다.'
  if (!subOrderForm.value.subPoNumber.trim()) return '서브발주번호를 입력하세요.'
  if (!subOrderForm.value.supplierPublicId) return '하위 협력사를 선택하세요.'
  if (!subOrderForm.value.dueDate) return '납기일을 입력하세요.'

  const selectedLines = subOrderForm.value.lines.filter((line) => line.selected)

  if (!selectedLines.length) return '서브발주 품목을 1개 이상 선택하세요.'

  for (const line of selectedLines) {
    if (!line.orderedQty || line.orderedQty <= 0) {
      return '서브발주 수량은 0보다 커야 합니다.'
    }

    if (!line.unitPrice || line.unitPrice <= 0) {
      return '단가는 0보다 커야 합니다.'
    }
  }

  return ''
}

async function submitCreateSubOrder() {
  const validationMessage = validateSubOrderForm()

  if (validationMessage) {
    subOrderCreateErrorMessage.value = validationMessage
    return
  }

  if (!selectedOrder.value) return

  try {
    subOrderCreateLoading.value = true
    subOrderCreateErrorMessage.value = ''

    const payload: CreateSubPurchaseOrderRequestDto = {
      subPoNumber: subOrderForm.value.subPoNumber.trim(),
      parentPoPublicId: selectedOrder.value.poPublicId,
      supplierPublicId: subOrderForm.value.supplierPublicId,
      dueDate: subOrderForm.value.dueDate,
      items: subOrderForm.value.lines
        .filter((line) => line.selected)
        .map((line) => ({
          parentPoItemPublicId: line.parentPoItemPublicId,
          itemPublicId: line.itemPublicId,
          orderedQty: Number(line.orderedQty),
          requiredDate: line.requiredDate || undefined,
          unitPrice: Number(line.unitPrice),
        })),
    }

    await createSubPurchaseOrder(payload)
    subOrderModalOpen.value = false

    await loadReceivedSubOrders()
    await refreshSelectedOrder()

    detailSuccessMessage.value = '서브발주를 등록했습니다.'
  } catch (error) {
    subOrderCreateErrorMessage.value = normalizeErrorMessage(
      error,
      '서브발주 등록에 실패했습니다.',
    )
  } finally {
    subOrderCreateLoading.value = false
  }
}

async function openSubOrderDetail(subPoPublicId: string) {
  try {
    subOrderDetailModalOpen.value = true
    subOrderDetailLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''
    selectedSubOrder.value = null

    const detail = await getSubPurchaseOrder(subPoPublicId)

    selectedSubOrder.value = detail
    subOrderConfirmQtyMap.value = buildSubOrderConfirmQtyMap(detail)
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(
      error,
      '서브발주 상세 정보를 불러오지 못했습니다.',
    )
  } finally {
    subOrderDetailLoading.value = false
  }
}

function closeSubOrderDetailModal() {
  subOrderDetailModalOpen.value = false
  subOrderDetailLoading.value = false
  subOrderActionLoading.value = false
  subOrderDetailErrorMessage.value = ''
  subOrderSuccessMessage.value = ''
  selectedSubOrder.value = null
  subOrderConfirmQtyMap.value = {}
}

async function refreshSelectedSubOrder() {
  if (!selectedSubOrder.value) return

  const refreshed = await getSubPurchaseOrder(selectedSubOrder.value.subPoPublicId)
  selectedSubOrder.value = refreshed
  subOrderConfirmQtyMap.value = buildSubOrderConfirmQtyMap(refreshed)
}

function canRespondSubOrder(subOrder: SubPurchaseOrderResponseDto | null) {
  return actor.isSupplierOrganization.value && subOrder?.subPoStatus === 'CREATED'
}

function canConfirmSubOrderItem(
  subOrder: SubPurchaseOrderResponseDto | null,
  item: SubPurchaseOrderItemResponseDto,
) {
  return (
    actor.isSupplierOrganization.value &&
    !!subOrder &&
    ['ACCEPTED', 'PARTIALLY_CONFIRMED', 'CONFIRMED'].includes(subOrder.subPoStatus) &&
    !['CONFIRMED', 'REJECTED', 'CANCELLED', 'DELETED'].includes(item.lineStatus)
  )
}

async function afterSubOrderMutation(successMessage: string) {
  await loadReceivedSubOrders()
  await refreshSelectedSubOrder()
  await refreshSelectedOrder()
  subOrderSuccessMessage.value = successMessage
}

async function submitAcceptSubOrder() {
  if (!selectedSubOrder.value) return
  if (!window.confirm('이 서브발주를 수락하시겠습니까?')) return

  try {
    subOrderActionLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''

    await acceptSubPurchaseOrder(selectedSubOrder.value.subPoPublicId)
    await afterSubOrderMutation('서브발주를 수락했습니다.')
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(
      error,
      '서브발주 수락에 실패했습니다.',
    )
  } finally {
    subOrderActionLoading.value = false
  }
}

async function submitRejectSubOrder() {
  if (!selectedSubOrder.value) return
  if (!window.confirm('이 서브발주를 반려하시겠습니까?')) return

  try {
    subOrderActionLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''

    await rejectSubPurchaseOrder(selectedSubOrder.value.subPoPublicId)
    await afterSubOrderMutation('서브발주를 반려했습니다.')
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(
      error,
      '서브발주 반려에 실패했습니다.',
    )
  } finally {
    subOrderActionLoading.value = false
  }
}

async function submitConfirmSubOrderItem(item: SubPurchaseOrderItemResponseDto) {
  if (!selectedSubOrder.value) return

  const confirmedQty = Number(subOrderConfirmQtyMap.value[subOrderItemKey(item)])

  if (!confirmedQty || confirmedQty <= 0) {
    subOrderDetailErrorMessage.value = '확정 수량은 0보다 커야 합니다.'
    return
  }

  try {
    subOrderActionLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''

    await confirmSubPurchaseOrderItem(
      selectedSubOrder.value.subPoPublicId,
      item.parentPoItemPublicId,
      item.itemPublicId,
      {
        confirmedQty,
      },
    )

    await afterSubOrderMutation('서브발주 확정 수량을 반영했습니다.')
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(
      error,
      '서브발주 확정 수량 반영에 실패했습니다.',
    )
  } finally {
    subOrderActionLoading.value = false
  }
}

function downloadOrdersCsv() {
  if (!filteredOrders.value.length) return

  const rows = [
    TABLE_COLUMNS,
    ...filteredOrders.value.map((order) => [
      order.poNumber,
      getOrderItemLabel(order),
      order.supplierName,
      getOrderQtyLabel(order),
      formatAmount(toNumber(order.totalAmount), order.currencyCode),
      formatDateTime(order.orderedAt),
      formatDate(order.dueDate),
      priorityText(order.priorityCode),
      poStatusText(order.poStatus),
      '상세',
    ]),
  ]

  const csv = '\uFEFF' + rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = `orders-${getLocalDateString()}.csv`
  link.click()

  window.URL.revokeObjectURL(url)
}

function escapeCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">공급망 운영 / 발주 관리</div>
        <h2 class="terminal-page__title">발주 관리</h2>
        <p class="terminal-page__subtitle">
          발주, 협력사 응답, 서브발주 상태를 같은 화면에서 관리합니다.
        </p>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="downloadOrdersCsv">
          내보내기
        </button>
        <button class="page-button page-button--secondary" type="button" @click="loadOrderDashboard">
          새로고침
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="!actor.canCreatePurchaseOrder"
          @click="openCreateOrderModal"
        >
          신규 발주
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article
        v-for="metric in dashboardMetrics"
        :key="metric.label"
        :class="['page-metric', `is-${metric.tone}`]"
      >
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>검색</span>
            <input
              v-model="search"
              type="text"
              placeholder="발주번호, 품목명, 협력사명을 검색하세요."
            />
          </label>

          <div class="terminal-page__tabs">
            <button
              v-for="tab in TAB_OPTIONS"
              :key="tab.key"
              :class="['terminal-page__tab', { 'is-active': activeTabKey === tab.key }]"
              type="button"
              @click="activeTabKey = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
        </section>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">OPERATIONS</div>
              <h3>발주 테이블</h3>
            </div>
            <span class="page-panel__chip">{{ filteredOrders.length }}</span>
          </div>

          <p v-if="errorMessage" class="orders-page__error">{{ errorMessage }}</p>
          <p v-else-if="loading" class="orders-page__empty">발주 데이터를 불러오는 중입니다.</p>
          <p v-else-if="!filteredOrders.length" class="orders-page__empty">
            조건에 맞는 발주가 없습니다.
          </p>

          <div v-else class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in TABLE_COLUMNS" :key="column">{{ column }}</span>
            </div>

            <div v-for="order in filteredOrders" :key="order.poPublicId" class="page-table__row">
              <span>{{ order.poNumber }}</span>
              <span>{{ getOrderItemLabel(order) }}</span>
              <span>{{ order.supplierName }}</span>
              <span>{{ getOrderQtyLabel(order) }}</span>
              <span>{{ formatAmount(order.totalAmount, order.currencyCode) }}</span>
              <span>{{ formatDateTime(order.orderedAt) }}</span>
              <span>{{ formatDate(order.dueDate) }}</span>
              <span>{{ priorityText(order.priorityCode) }}</span>
              <span>{{ poStatusText(order.poStatus) }}</span>
              <span class="action-cell">
                <button class="page-button page-button--secondary" type="button" @click="openOrderDetail(order)">
                  상세
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>

      <aside class="terminal-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">APPROVAL</div>
              <h3>확인 대기함</h3>
            </div>
          </div>

          <div class="page-feed" v-if="queueEntries.length">
            <div v-for="queueEntry in queueEntries" :key="`${queueEntry.kind}-${queueEntry.publicId}`" class="page-feed__item">
              <button
                class="orders-page__queue-button"
                type="button"
                @click="queueEntry.kind === 'PO' ? openOrderDetailById(queueEntry.publicId) : openSubOrderDetail(queueEntry.publicId)"
              >
                <span class="page-feed__label">{{ queueEntry.number }}</span>
                <strong class="page-feed__text">{{ queueEntry.text }}</strong>
              </button>
              <span>{{ queueEntry.value }}</span>
            </div>
          </div>

          <p v-else class="orders-page__empty">확인 대기 건이 없습니다.</p>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">VALUE</div>
              <h3>카테고리별 금액</h3>
            </div>
          </div>

          <div class="page-feed" v-if="categoryRows.length">
            <div v-for="category in categoryRows" :key="category.label" class="page-feed__item">
              <span class="page-feed__label">{{ category.label }}</span>
              <strong class="page-feed__text">{{ category.value }}</strong>
              <div class="orders-page__bar">
                <span :style="{ width: category.width }" />
              </div>
            </div>
          </div>

          <p v-else class="orders-page__empty">표시할 카테고리 금액이 없습니다.</p>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">SUPPLIERS</div>
              <h3>상위 협력사</h3>
            </div>
          </div>

          <div class="page-feed" v-if="topSupplierRows.length">
            <div v-for="supplier in topSupplierRows" :key="supplier.name" class="page-feed__item">
              <span class="page-feed__label">{{ supplier.name }}</span>
              <strong class="page-feed__text">{{ supplier.text }}</strong>
            </div>
          </div>

          <p v-else class="orders-page__empty">표시할 협력사 집계가 없습니다.</p>
        </article>
      </aside>
    </section>
  </section>

  <BaseModal
    v-model="createModalOpen"
    title="발주 등록"
    description="구매사 발주 생성 API와 연결된 등록 모달입니다."
    size="lg"
    @close="closeCreateOrderModal"
  >
    <div class="orders-page__form">
      <div class="orders-page__form-grid">
        <label class="orders-page__form-field">
          <span>발주번호</span>
          <input v-model="createForm.poNumber" type="text" placeholder="예: PO-2026-0001" />
        </label>

        <label class="orders-page__form-field">
          <span>협력사</span>
          <select v-model="createForm.supplierPublicId">
            <option value="">협력사를 선택하세요.</option>
            <option
              v-for="supplier in selectableSuppliers"
              :key="supplierPublicIdOf(supplier)"
              :value="supplierPublicIdOf(supplier)"
            >
              {{ supplier.supplierName }}
            </option>
          </select>
        </label>

        <label class="orders-page__form-field">
          <span>우선순위</span>
          <select v-model="createForm.priorityCode">
            <option value="LOW">낮음</option>
            <option value="NORMAL">보통</option>
            <option value="HIGH">높음</option>
            <option value="URGENT">긴급</option>
          </select>
        </label>

        <label class="orders-page__form-field">
          <span>납기일</span>
          <input v-model="createForm.dueDate" type="date" />
        </label>

        <label class="orders-page__form-field">
          <span>통화</span>
          <select v-model="createForm.currencyCode">
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
          </select>
        </label>

        <label class="orders-page__form-field">
          <span>메모</span>
          <input v-model="createForm.memo" type="text" placeholder="발주 메모를 입력하세요." />
        </label>
      </div>

      <div class="orders-page__section-head">
        <strong>발주 품목</strong>
        <button class="page-button page-button--secondary" type="button" @click="addCreateOrderLine">
          품목 추가
        </button>
      </div>

      <div class="orders-page__line-list">
        <div v-for="line in createForm.lines" :key="line.id" class="orders-page__line-card">
          <div class="orders-page__line-head">
            <strong>품목 행</strong>
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="createForm.lines.length === 1"
              @click="removeCreateOrderLine(line.id)"
            >
              행 삭제
            </button>
          </div>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>품목</span>
              <select v-model="line.itemPublicId">
                <option value="">품목을 선택하세요.</option>
                <option v-for="item in supplierItemOptions" :key="item.publicId" :value="item.publicId">
                  {{ item.itemCode }} / {{ item.itemName }}
                </option>
              </select>
            </label>

            <label class="orders-page__form-field">
              <span>발주 수량</span>
              <input v-model.number="line.orderedQty" type="number" min="0" step="0.01" />
            </label>

            <label class="orders-page__form-field">
              <span>단가</span>
              <input v-model.number="line.unitPrice" type="number" min="0" step="0.01" />
            </label>

            <label class="orders-page__form-field">
              <span>요청 납기일</span>
              <!-- 요청 납기일은 발주 납기일 이후로 선택되지 않게 제한합니다. -->
                <input
                  v-model="line.requiredDate"
                  type="date"
                  :max="createForm.dueDate || undefined"
                />
            </label>
          </div>
        </div>
      </div>

      <p v-if="createForm.supplierPublicId && !supplierItemOptions.length" class="orders-page__hint">
        선택한 협력사에 등록된 ACTIVE 품목이 없습니다.
      </p>

      <p v-if="createErrorMessage" class="orders-page__error">{{ createErrorMessage }}</p>

      <div class="orders-page__actions">
        <button class="page-button page-button--secondary" type="button" @click="closeCreateOrderModal">
          취소
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="createLoading"
          @click="submitCreateOrder"
        >
          등록
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="orderDetailModalOpen"
    title="발주 상세"
    :description="selectedOrderDescription"
    size="lg"
    @close="closeOrderDetailModal"
  >
    <div v-if="detailLoading" class="orders-page__empty">발주 상세 정보를 불러오는 중입니다.</div>
    <p v-else-if="detailErrorMessage" class="orders-page__error">{{ detailErrorMessage }}</p>

    <div v-else-if="selectedOrder" class="orders-page__detail-stack">
      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>기본 정보</strong>
        </div>

        <div class="orders-page__detail-grid">
          <div class="orders-page__detail-item">
            <span>발주번호</span>
            <strong>{{ selectedOrder.poNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>협력사</span>
            <strong>{{ selectedOrder.supplierName }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>협력사 코드</span>
            <strong>{{ selectedOrder.supplierCode }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>상태</span>
            <strong>{{ poStatusText(selectedOrder.poStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>우선순위</span>
            <strong>{{ priorityText(selectedOrder.priorityCode) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주일</span>
            <strong>{{ formatDateTime(selectedOrder.orderedAt) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>납기일</span>
            <strong>{{ formatDate(selectedOrder.dueDate) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>총액</span>
            <strong>{{ formatAmount(selectedOrder.totalAmount, selectedOrder.currencyCode) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>생성자</span>
            <strong>{{ selectedOrder.createdByUserPublicId }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>메모</span>
            <strong>{{ selectedOrder.memo || '-' }}</strong>
          </div>
        </div>
      </section>

      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>품목 상세</strong>
        </div>

        <div class="orders-page__detail-table">
          <div class="orders-page__detail-row orders-page__detail-row--head">
            <span>품목</span>
            <span>발주 수량</span>
            <span>확정 수량</span>
            <span>단가</span>
            <span>상태</span>
            <span>처리</span>
          </div>

          <div v-for="item in selectedOrder.items" :key="item.poItemPublicId" class="orders-page__detail-row">
            <span>
              <strong>{{ item.itemName }}</strong><br />
              <small>{{ item.itemCode }}</small>
            </span>
            <span>{{ formatNumber(item.orderedQty) }} {{ item.unit }}</span>
            <span>
              <template v-if="canSupplierConfirmOrderItem(selectedOrder, item)">
                <input
                  v-model="orderConfirmQtyMap[item.poItemPublicId]"
                  class="orders-page__inline-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </template>
              <template v-else>
                {{ formatNumber(item.confirmedQty) }}
              </template>
            </span>
            <span>{{ formatAmount(item.unitPrice, selectedOrder.currencyCode) }}</span>
            <span>{{ purchaseOrderItemStatusText(item.itemStatus) }}</span>
            <span>
              <button
                v-if="canSupplierConfirmOrderItem(selectedOrder, item)"
                class="page-button page-button--secondary"
                type="button"
                :disabled="detailActionLoading"
                @click="submitConfirmOrderItem(item)"
              >
                수량 확정
              </button>
              <template v-else>-</template>
            </span>
          </div>
        </div>
      </section>

      <section
        v-if="actor.isSupplierOrganization || actor.isAdminRole"
        class="orders-page__detail-section"
      >
        <div class="orders-page__section-head">
          <strong>연결된 서브발주</strong>
        </div>

        <div v-if="parentSubOrders.length" class="orders-page__suborder-list">
          <div v-for="subOrder in parentSubOrders" :key="subOrder.subPoPublicId" class="orders-page__suborder-row">
            <div>
              <strong>{{ subOrder.subPoNumber }}</strong>
              <p class="orders-page__sub-text">
                {{ subOrder.supplierName }} / {{ subPoStatusText(subOrder.subPoStatus) }}
              </p>
            </div>

            <div class="orders-page__suborder-actions">
              <span>{{ formatPlainAmount(subOrder.totalAmount) }}</span>
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="openSubOrderDetail(subOrder.subPoPublicId)"
              >
                서브발주 상세
              </button>
            </div>
          </div>
        </div>

        <p v-else class="orders-page__empty">연결된 서브발주가 없습니다.</p>
      </section>

      <p v-if="detailSuccessMessage" class="orders-page__success">{{ detailSuccessMessage }}</p>

      <div class="orders-page__actions">
        <button
          v-if="canSupplierRespondOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitRejectOrder"
        >
          반려
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder)"
          class="page-button page-button--primary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitAcceptOrder"
        >
          수락
        </button>

        <button
          v-if="canCreateSubOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="openCreateSubOrderModal"
        >
          서브발주 생성
        </button>

        <button
          v-if="canBuyerCancelOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitCancelOrder"
        >
          발주 취소
        </button>

        <button
          v-if="canBuyerCompleteOrder(selectedOrder)"
          class="page-button page-button--primary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitCompleteOrder"
        >
          완료 처리
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="subOrderModalOpen"
    title="서브발주 등록"
    description="선택한 부모 발주 기준으로 하위 협력사에 서브발주를 생성합니다."
    size="lg"
    @close="closeCreateSubOrderModal"
  >
    <div v-if="selectedOrder" class="orders-page__form">
      <div class="orders-page__form-grid">
        <label class="orders-page__form-field">
          <span>기준 발주</span>
          <input :value="selectedOrder.poNumber" type="text" disabled />
        </label>

        <label class="orders-page__form-field">
          <span>하위 협력사</span>
          <select v-model="subOrderForm.supplierPublicId">
            <option value="">하위 협력사를 선택하세요.</option>
            <option
              v-for="supplier in downstreamSupplierOptions"
              :key="supplierPublicIdOf(supplier)"
              :value="supplierPublicIdOf(supplier)"
            >
              {{ supplier.supplierName }}
            </option>
          </select>
        </label>

        <label class="orders-page__form-field">
          <span>서브발주번호</span>
          <input v-model="subOrderForm.subPoNumber" type="text" />
        </label>

        <label class="orders-page__form-field">
          <span>납기일</span>
          <input v-model="subOrderForm.dueDate" type="date" />
        </label>
      </div>

      <div class="orders-page__section-head">
        <strong>서브발주 품목</strong>
      </div>

      <div class="orders-page__line-list">
        <div
          v-for="line in subOrderForm.lines"
          :key="`${line.parentPoItemPublicId}-${line.itemPublicId}`"
          class="orders-page__line-card"
        >
          <label class="orders-page__checkbox">
            <input v-model="line.selected" type="checkbox" />
            <span>{{ line.itemCode }} / {{ line.itemName }}</span>
          </label>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>서브발주 수량</span>
              <input
                v-model.number="line.orderedQty"
                type="number"
                min="0"
                step="0.01"
                :disabled="!line.selected || subOrderCreateLoading"
              />
            </label>

            <label class="orders-page__form-field">
              <span>단가</span>
              <input
                v-model.number="line.unitPrice"
                type="number"
                min="0"
                step="0.01"
                :disabled="!line.selected || subOrderCreateLoading"
              />
            </label>

            <label class="orders-page__form-field">
              <span>요청 납기일</span>
              <input
                v-model="line.requiredDate"
                type="date"
                :disabled="!line.selected || subOrderCreateLoading"
              />
            </label>

            <label class="orders-page__form-field">
              <span>단위</span>
              <input :value="line.unit" type="text" disabled />
            </label>
          </div>
        </div>
      </div>

      <p v-if="subOrderCreateErrorMessage" class="orders-page__error">
        {{ subOrderCreateErrorMessage }}
      </p>

      <div class="orders-page__actions">
        <button class="page-button page-button--secondary" type="button" @click="closeCreateSubOrderModal">
          취소
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="subOrderCreateLoading"
          @click="submitCreateSubOrder"
        >
          등록
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="subOrderDetailModalOpen"
    title="서브발주 상세"
    :description="selectedSubOrderDescription"
    size="lg"
    @close="closeSubOrderDetailModal"
  >
    <div v-if="subOrderDetailLoading" class="orders-page__empty">
      서브발주 상세 정보를 불러오는 중입니다.
    </div>
    <p v-else-if="subOrderDetailErrorMessage" class="orders-page__error">
      {{ subOrderDetailErrorMessage }}
    </p>

    <div v-else-if="selectedSubOrder" class="orders-page__detail-stack">
      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>기본 정보</strong>
        </div>

        <div class="orders-page__detail-grid">
          <div class="orders-page__detail-item">
            <span>서브발주번호</span>
            <strong>{{ selectedSubOrder.subPoNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>부모 발주번호</span>
            <strong>{{ selectedSubOrder.parentPoNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발행 협력사</span>
            <strong>{{ selectedSubOrder.issuerSupplierName }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>수신 협력사</span>
            <strong>{{ selectedSubOrder.supplierName }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>상태</span>
            <strong>{{ subPoStatusText(selectedSubOrder.subPoStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주일</span>
            <strong>{{ formatDateTime(selectedSubOrder.orderedAt) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>납기일</span>
            <strong>{{ formatDate(selectedSubOrder.dueDate) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>총액</span>
            <strong>{{ formatPlainAmount(selectedSubOrder.totalAmount) }}</strong>
          </div>
        </div>
      </section>

      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>품목 상세</strong>
        </div>

        <div class="orders-page__detail-table">
          <div class="orders-page__detail-row orders-page__detail-row--head">
            <span>품목</span>
            <span>발주 수량</span>
            <span>확정 수량</span>
            <span>단가</span>
            <span>상태</span>
            <span>처리</span>
          </div>

          <div
            v-for="item in selectedSubOrder.items ?? []"
            :key="`${item.parentPoItemPublicId}-${item.itemPublicId}`"
            class="orders-page__detail-row"
          >
            <span>
              <strong>{{ item.itemName }}</strong><br />
              <small>{{ item.itemCode }}</small>
            </span>
            <span>{{ formatNumber(item.orderedQty) }} {{ item.unit }}</span>
            <span>
              <template v-if="canConfirmSubOrderItem(selectedSubOrder, item)">
                <input
                  v-model="subOrderConfirmQtyMap[subOrderItemKey(item)]"
                  class="orders-page__inline-input"
                  type="number"
                  min="0"
                  step="0.01"
                />
              </template>
              <template v-else>
                {{ formatNumber(item.confirmedQty) }}
              </template>
            </span>
            <span>{{ formatPlainAmount(item.unitPrice) }}</span>
            <span>{{ subPurchaseOrderLineStatusText(item.lineStatus) }}</span>
            <span>
              <button
                v-if="canConfirmSubOrderItem(selectedSubOrder, item)"
                class="page-button page-button--secondary"
                type="button"
                :disabled="subOrderActionLoading"
                @click="submitConfirmSubOrderItem(item)"
              >
                수량 확정
              </button>
              <template v-else>-</template>
            </span>
          </div>
        </div>
      </section>

      <p v-if="subOrderSuccessMessage" class="orders-page__success">{{ subOrderSuccessMessage }}</p>

      <div class="orders-page__actions">
        <button
          v-if="canRespondSubOrder(selectedSubOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="subOrderActionLoading"
          @click="submitRejectSubOrder"
        >
          반려
        </button>

        <button
          v-if="canRespondSubOrder(selectedSubOrder)"
          class="page-button page-button--primary"
          type="button"
          :disabled="subOrderActionLoading"
          @click="submitAcceptSubOrder"
        >
          수락
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.orders-page__error,
.orders-page__empty,
.orders-page__success,
.orders-page__hint {
  margin-top: 12px;
  font-size: 0.9rem;
}

.orders-page__error {
  color: #d14848;
}

.orders-page__success {
  color: #2d8a55;
}

.orders-page__hint {
  opacity: 0.72;
}

.orders-page__form,
.orders-page__detail-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.orders-page__form-grid,
.orders-page__detail-grid,
.orders-page__line-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.orders-page__form-field,
.orders-page__detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.orders-page__form-field span,
.orders-page__detail-item span {
  font-size: 0.75rem;
  opacity: 0.72;
}

.orders-page__form-field input,
.orders-page__form-field select,
.orders-page__form-field textarea,
.orders-page__inline-input {
  width: 100%;
  border: 1px solid var(--color-surface-container-high);
  border-radius: 6px;
  background: transparent;
  color: var(--color-on-surface);
  padding: 10px 12px;
  font: inherit;
}

.orders-page__form-field input:disabled,
.orders-page__form-field select:disabled {
  opacity: 0.65;
}

.orders-page__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.orders-page__line-list,
.orders-page__suborder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.orders-page__line-card {
  border: 1px solid var(--color-surface-container-high);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.orders-page__line-head,
.orders-page__suborder-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.orders-page__detail-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.orders-page__detail-row {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-surface-container-high);
}

.orders-page__detail-row--head {
  font-size: 0.75rem;
  opacity: 0.72;
}

.orders-page__suborder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-surface-container-high);
}

.orders-page__sub-text {
  margin: 6px 0 0;
  opacity: 0.72;
}

.orders-page__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.orders-page__queue-button {
  border: 0;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font: inherit;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.orders-page__bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: var(--color-surface-container-high);
  overflow: hidden;
}

.orders-page__bar span {
  display: block;
  height: 100%;
  background: var(--color-primary);
}

.orders-page__checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 1024px) {
  .orders-page__form-grid,
  .orders-page__detail-grid,
  .orders-page__line-grid,
  .orders-page__detail-row {
    grid-template-columns: 1fr;
  }

  .orders-page__suborder-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .orders-page__suborder-actions {
    width: 100%;
  }
}
</style>
