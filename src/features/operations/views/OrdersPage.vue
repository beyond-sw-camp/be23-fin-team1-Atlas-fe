<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useActorScope } from '../../../composables/useActorScope'
import { apiClient } from '../../../services/http'
import {
  getItem,
  getItems,
  getItemCategories,
  type SupplyType,
  type ItemCategoryResponseDto,
  type ItemResponseDto,
} from '../../../services/item'
import { getSuppliers, type SupplierListResponseDto } from '../../../services/supplier'
import type { HeaderAction } from '../../../stores/header'
import {
  acceptPurchaseOrder,
  changePurchaseOrderStatus,
  confirmPurchaseOrderItem,
  createPurchaseOrdersBatch,
  getOrderDashboardSummary,
  getPurchaseOrder,
  getPurchaseOrders,
  rejectPurchaseOrder,
  type CurrencyCode,
  type OrderDashboardSummaryResponseDto,
  type PoStatus,
  type PurchaseOrderDetailResponseDto,
  type SupplierStatus,
} from '../../../services/purchaseOrder'
import {
  confirmSubPurchaseOrderItem,
  createSubPurchaseOrder,
  getReceivedSubPurchaseOrders,
  getSentSubPurchaseOrders,
  getSubPurchaseOrder,
  getSubPurchaseOrdersByParentPo,
  rejectSubPurchaseOrder,
  type SubPoStatus,
  type SubPurchaseOrderResponseDto,
} from '../../../services/subPurchaseOrder'
import {
  getLogisticsNodes,
  type LogisticsNodeResponseDto,
} from '../../../services/logistics'

type OrderTabKey =
  | 'ALL'
  | 'CREATED'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'

type OrderDirectionFilter = 'ALL' | 'ISSUED' | 'RECEIVED'

type OrderDisplayRow = {
  id: string
  kind: 'PO' | 'SUB_PO'
  direction: 'ISSUED' | 'RECEIVED'
  number: string
  counterpartyName: string
  supplierStatus: SupplierStatus
  itemLabel: string
  qtyLabel: string
  totalAmount: number
  currencyCode?: CurrencyCode
  orderedAt: string
  expectedDueDate: string | null
  status: PoStatus | SubPoStatus
}

type OrderQueueEntry = {
  kind: 'PO' | 'SUB_PO'
  publicId: string
  number: string
  counterpartyName: string
  itemLabel: string
  orderedAt: string
  direction: 'ISSUED' | 'RECEIVED'
}

type CreateOrderLineForm = {
  id: number
  selectedItemPublicId: string
  selectedItemName: string
  selectedSupplierPublicId: string
  arrivalLogisticsNodePublicId: string
  orderedQty: number | null
}

type CreateSubOrderLineForm = {
  parentPoItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  unit: string
  selected: boolean
  orderedQty: number | null
}

type EditExistingOrderLine = {
  poItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  unit: string
  orderedQty: number | null
  originalOrderedQty: number
  deleted: boolean
}

type EditNewOrderLine = {
  key: number
  itemPublicId: string
  orderedQty: number | null
}

const TABLE_COLUMNS = [
  '문서번호',
  '거래처',
  '협력사 상태',
  '품목',
  '수량',
  '총금액',
  '발주일',
  '예상 납기일',
  '상태',
  '작업',
]

const DIRECTION_OPTIONS: { key: OrderDirectionFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'ISSUED', label: '발주' },
  { key: 'RECEIVED', label: '수주' },
]

const TAB_OPTIONS: { key: OrderTabKey; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'CREATED', label: '확인 대기' },
  { key: 'PARTIALLY_CONFIRMED', label: '부분 확정' },
  { key: 'CONFIRMED', label: '확정' },
  { key: 'REJECTED', label: '반려' },
  { key: 'CANCELLED', label: '취소' },
  { key: 'COMPLETED', label: '완료' },
]

const header = useAtlasHeaderStore()
const actor = useActorScope()

const purchaseOrders = ref<PurchaseOrderDetailResponseDto[]>([])
const receivedSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const sentSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const parentSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const supplierOptions = ref<SupplierListResponseDto[]>([])
const categoryOptions = ref<ItemCategoryResponseDto[]>([])
const itemMap = ref<Record<string, ItemResponseDto>>({})
const logisticsNodeOptions = ref<LogisticsNodeResponseDto[]>([])

const dashboardSummary = ref<OrderDashboardSummaryResponseDto | null>(null)
const directionFilter = ref<OrderDirectionFilter>('ALL')

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

const selectedParentCategoryId = ref('')
const selectedMiddleCategoryId = ref('')
const selectedLeafCategoryId = ref('')
const itemSearchKeyword = ref('')
const expandedItemPublicId = ref<string | null>(null)

type ConfirmOrderLineForm = {
  poItemPublicId: string
  itemName: string
  itemCode: string
  unit: string
  orderedQty: number
  confirmedQty: number | null
}

const confirmMode = ref(false)
const confirmErrorMessage = ref('')
const confirmLines = ref<ConfirmOrderLineForm[]>([])

const createModalOpen = ref(false)
const createLoading = ref(false)
const createErrorMessage = ref('')

const subOrderModalOpen = ref(false)
const subOrderCreateLoading = ref(false)
const subOrderCreateErrorMessage = ref('')
const subOrderForm = ref({
  supplierPublicId: '',
  lines: [] as CreateSubOrderLineForm[],
})

const subOrderDetailModalOpen = ref(false)
const subOrderDetailLoading = ref(false)
const subOrderActionLoading = ref(false)
const subOrderDetailErrorMessage = ref('')
const subOrderSuccessMessage = ref('')
const selectedSubOrder = ref<SubPurchaseOrderResponseDto | null>(null)
const selectedSubOrderDirection = ref<'ISSUED' | 'RECEIVED' | null>(null)

const editOrderModalOpen = ref(false)
const editOrderLoading = ref(false)
const editOrderSaving = ref(false)
const editOrderErrorMessage = ref('')
const editAvailableItems = ref<ItemResponseDto[]>([])
const editForm = ref({
  memo: '',
  existingLines: [] as EditExistingOrderLine[],
  newLines: [] as EditNewOrderLine[],
})

let createLineSeed = 1
let editLineSeed = 1

function createEmptyOrderLine(item: ItemResponseDto | null = null): CreateOrderLineForm {
  return {
    id: createLineSeed++,
    selectedItemPublicId: item?.publicId ?? '',
    selectedItemName: item?.itemName ?? '',
    selectedSupplierPublicId: item?.supplierPublicId ?? '',
    arrivalLogisticsNodePublicId: '',
    orderedQty: null,
  }
}

function createEmptyEditNewLine(): EditNewOrderLine {
  return {
    key: editLineSeed++,
    itemPublicId: '',
    orderedQty: null,
  }
}

const filteredSelectableItems = computed(() => {
  const keyword = createForm.value.itemKeyword.trim().toLowerCase()
  const selectedCategoryPublicId = selectedCreateCategoryPublicId.value

  if (!selectedCategoryPublicId && !keyword) return []

  return createForm.value.itemOptions
    .filter((item) => createForm.value.searchResultPublicIds.includes(item.publicId))
    .filter((item) => {
      const matchesCategory =
        !selectedCategoryPublicId ||
        item.itemCategoryPublicId === selectedCategoryPublicId

      const matchesKeyword =
        !keyword ||
        item.itemName.toLowerCase().includes(keyword) ||
        item.itemCode.toLowerCase().includes(keyword)

      return matchesCategory && matchesKeyword
    })
})

const createForm = ref({
  categoryLevel1PublicId: '',
  categoryLevel2PublicId: '',
  categoryLevel3PublicId: '',
  itemKeyword: '',
  itemOptions: [] as ItemResponseDto[],
  searchResultPublicIds: [] as string[],
  detailItemPublicId: '',
  searchLoading: false,
  lines: [] as CreateOrderLineForm[],
})
const selectableSuppliers = computed(() =>
  supplierOptions.value.filter((supplier) => !!supplierPublicIdOf(supplier)),
)

const downstreamSupplierOptions = computed(() =>
  selectableSuppliers.value.filter(
    (supplier) => supplierPublicIdOf(supplier) !== selectedOrder.value?.supplierPublicId,
  ),
)

const currentCurrency = computed<CurrencyCode | null>(() => {
  if (!actor.isBuyerOrganization.value) return null

  const codes = Array.from(
    new Set(
      purchaseOrders.value
        .map((order) => order.currencyCode)
        .filter((value): value is CurrencyCode => !!value),
    ),
  )

  return codes.length === 1 ? codes[0] : null
})

const issuedTotalAmount = computed(() =>
  actor.isSupplierOrganization.value
    ? sentSubOrders.value.reduce((sum, subOrder) => sum + toNumber(subOrder.totalAmount), 0)
    : purchaseOrders.value.reduce((sum, order) => sum + toNumber(order.totalAmount), 0),
)

const dashboardMetrics = computed(() => {
  const summary = dashboardSummary.value

  if (actor.isBuyerOrganization.value) {
    return [
      { label: '총 발주', value: formatNumber(summary?.issuedOrderCount ?? 0), meta: '메인 발주사 전체 발주', tone: 'nominal' },
      { label: '확인 대기', value: formatNumber(summary?.pendingOrderCount ?? 0), meta: '확인 대기 중인 발주', tone: 'warning' },
      { label: '납기 완료', value: formatNumber(summary?.completedOrderCount ?? 0), meta: '완료 처리된 발주', tone: 'info' },
      { label: '총 금액', value: formatDashboardAmount(issuedTotalAmount.value), meta: '발주 기준 총 금액', tone: 'critical' },
    ]
  }

  return [
    { label: '총 발주', value: formatNumber(summary?.totalOrderCount ?? 0), tone: 'nominal' },
    { label: '발주 수', value: formatNumber(summary?.issuedOrderCount ?? 0), tone: 'warning' },
    { label: '수주 수', value: formatNumber(summary?.receivedOrderCount ?? 0), tone: 'info' },
    { label: '총 금액 (발주 기준)', value: formatDashboardAmount(issuedTotalAmount.value), tone: 'critical' },
  ]
})

function getSubOrderItemLabel(subOrder: SubPurchaseOrderResponseDto) {
  if (!(subOrder.items ?? []).length) return '-'
  if ((subOrder.items ?? []).length === 1) return subOrder.items?.[0].itemName ?? '-'
  return `${subOrder.items?.[0].itemName ?? '-'} 외 ${(subOrder.items?.length ?? 1) - 1}건`
}

function getExpectedDueDate(items: Array<{ expectedDueDate: string | null }>) {
  const dates = items.map((item) => item.expectedDueDate).filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1]! : null
}

const selectedOrderExpectedDueDate = computed(() =>
  getExpectedDueDate(selectedOrder.value?.items ?? []),
)

const selectedSubOrderExpectedDueDate = computed(() =>
  getExpectedDueDate(selectedSubOrder.value?.items ?? []),
)

const orderRows = computed<OrderDisplayRow[]>(() => {
  const poRows = purchaseOrders.value.map((order) => ({
    id: order.poPublicId,
    kind: 'PO' as const,
    direction: actor.isSupplierOrganization.value ? ('RECEIVED' as const) : ('ISSUED' as const),
    number: order.poNumber,
    counterpartyName: actor.isSupplierOrganization.value
      ? order.buyerOrganizationPublicId
      : order.supplierName,
    supplierStatus: order.supplierStatus,
    itemLabel: getOrderItemLabel(order),
    qtyLabel: getOrderQtyLabel(order),
    totalAmount: toNumber(order.totalAmount),
    currencyCode: order.currencyCode,
    orderedAt: order.orderedAt,
    expectedDueDate: getExpectedDueDate(order.items),
    status: order.poStatus,
  }))

  const subPoRows = actor.isSupplierOrganization.value
    ? sentSubOrders.value.map((subOrder) => ({
        id: subOrder.subPoPublicId,
        kind: 'SUB_PO' as const,
        direction: 'ISSUED' as const,
        number: subOrder.subPoNumber,
        counterpartyName: subOrder.supplierName,
        supplierStatus: subOrder.supplierStatus,
        itemLabel:
          (subOrder.items?.length ?? 0) > 1
            ? `${subOrder.items?.[0].itemName ?? '-'} 외 ${(subOrder.items?.length ?? 1) - 1}건`
            : subOrder.items?.[0].itemName ?? '-',
        qtyLabel: formatNumber(
          (subOrder.items ?? []).reduce((sum, item) => sum + toNumber(item.orderedQty), 0),
        ),
        totalAmount: toNumber(subOrder.totalAmount),
        orderedAt: subOrder.orderedAt,
        expectedDueDate: getExpectedDueDate(subOrder.items ?? []),
        status: subOrder.subPoStatus,
      }))
    : []

  return [...poRows, ...subPoRows].sort(
    (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
  )
})

const filteredOrders = computed(() => {
  const query = search.value.trim().toLowerCase()

  return orderRows.value.filter((row) => {
    const matchesDirection =
      !actor.isSupplierOrganization.value ||
      directionFilter.value === 'ALL' ||
      row.direction === directionFilter.value

    const matchesStatus =
      activeTabKey.value === 'ALL' || row.status === activeTabKey.value

    const matchesQuery =
      !query ||
      [row.number, row.counterpartyName, row.itemLabel]
        .filter(Boolean)
        .some((token) => token.toLowerCase().includes(query))

    return matchesDirection && matchesStatus && matchesQuery
  })
})

const queueEntries = computed<OrderQueueEntry[]>(() => {
  const pendingOrders = actor.isSupplierOrganization.value
    ? purchaseOrders.value
        .filter((order) => order.poStatus === 'CREATED')
        .map((order) => ({
          kind: 'PO' as const,
          publicId: order.poPublicId,
          number: order.poNumber,
          counterpartyName: order.buyerOrganizationPublicId,
          itemLabel: getOrderItemLabel(order),
          orderedAt: order.orderedAt,
          direction: 'RECEIVED' as const,
        }))
    : []

  const pendingSubOrders =
    actor.isSupplierOrganization.value || actor.isAdminRole.value
      ? receivedSubOrders.value
          .filter((subOrder) => subOrder.subPoStatus === 'CREATED')
          .map((subOrder) => ({
            kind: 'SUB_PO' as const,
            publicId: subOrder.subPoPublicId,
            number: subOrder.subPoNumber,
            counterpartyName: subOrder.issuerSupplierName,
            itemLabel: getSubOrderItemLabel(subOrder),
            orderedAt: subOrder.orderedAt,
            direction: 'RECEIVED' as const,
          }))
      : []

  return [...pendingOrders, ...pendingSubOrders].sort(
    (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
  )
})


const categoryRows = computed(() => {
  const totals = new Map<string, number>()

  if (actor.isSupplierOrganization.value) {
    sentSubOrders.value.forEach((subOrder) => {
      ;(subOrder.items ?? []).forEach((item) => {
        const categoryName = itemMap.value[item.itemPublicId]?.categoryName ?? '미분류'
        totals.set(categoryName, (totals.get(categoryName) ?? 0) + toNumber(item.lineAmount))
      })
    })
  } else {
    purchaseOrders.value.forEach((order) => {
      order.items.forEach((item) => {
        const categoryName = itemMap.value[item.itemPublicId]?.categoryName ?? '미분류'
        totals.set(categoryName, (totals.get(categoryName) ?? 0) + toNumber(item.lineAmount))
      })
    })
  }

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

const topCounterpartyRows = computed(() => {
  const totals = new Map<string, { orderCount: number; totalAmount: number }>()

  if (actor.isSupplierOrganization.value) {
    sentSubOrders.value.forEach((subOrder) => {
      const current = totals.get(subOrder.supplierName) ?? { orderCount: 0, totalAmount: 0 }
      current.orderCount += 1
      current.totalAmount += toNumber(subOrder.totalAmount)
      totals.set(subOrder.supplierName, current)
    })
  } else {
    purchaseOrders.value.forEach((order) => {
      const current = totals.get(order.supplierName) ?? { orderCount: 0, totalAmount: 0 }
      current.orderCount += 1
      current.totalAmount += toNumber(order.totalAmount)
      totals.set(order.supplierName, current)
    })
  }

  return Array.from(totals.entries())
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

function emptyDashboardSummary(): OrderDashboardSummaryResponseDto {
  return {
    totalOrderCount: 0,
    pendingOrderCount: 0,
    completedOrderCount: 0,
    issuedOrderCount: 0,
    receivedOrderCount: 0,
    totalAmount: 0,
  }
}

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

function supplierStatusText(value: SupplierStatus) {
  switch (value) {
    case 'ACTIVE':
      return '활성'
    case 'INACTIVE':
      return '비활성'
    case 'SUSPENDED':
      return '중지'
    case 'TERMINATED':
      return '종료'
    default:
      return value
  }
}

function poStatusText(value: PoStatus) {
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

function subPoStatusText(value: SubPoStatus) {
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

function supplyTypeText(type: SupplyType) {
  return type === 'MAKE_TO_ORDER' ? '주문생산형' : '재고형'
}

function orderableQtyLabel(type: SupplyType) {
  return type === 'MAKE_TO_ORDER' ? '생산 가능 수량' : '주문 가능 재고'
}

function getOrderItemLabel(order: PurchaseOrderDetailResponseDto) {
  if (!order.items.length) return '-'
  if (order.items.length === 1) return order.items[0].itemName
  return `${order.items[0].itemName} 외 ${order.items.length - 1}건`
}

function getOrderQtyLabel(order: PurchaseOrderDetailResponseDto) {
  const totalQty = order.items.reduce((sum, item) => sum + toNumber(item.orderedQty), 0)
  const units = Array.from(new Set(order.items.map((item) => item.unit)))

  if (units.length === 1 && units[0]) {
    return `${formatNumber(totalQty)} ${units[0]}`
  }

  return formatNumber(totalQty)
}

function supplierPublicIdOf(supplier: SupplierListResponseDto) {
  return supplier.detail?.publicId ?? ''
}



async function loadSupplierOptions() {
  try {
    const response = await getSuppliers({ page: 0, size: 100 })
    supplierOptions.value = response.content
      .slice()
      .sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'ko-KR'))
  } catch {
    supplierOptions.value = []
  }
}

async function loadLogisticsNodeOptions() {
  try {
    const response = await getLogisticsNodes({ page: 0, size: 100 })

    logisticsNodeOptions.value = response.content
      .filter((node) => node.active)
      .slice()
      .sort((a, b) => a.nodeName.localeCompare(b.nodeName, 'ko-KR'))
  } catch {
    logisticsNodeOptions.value = []
  }
}

async function loadItemLookup(orders: PurchaseOrderDetailResponseDto[]) {
  const missingItemIds = Array.from(
    new Set(orders.flatMap((order) => order.items.map((item) => item.itemPublicId))),
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
    if (item) nextMap[item.publicId] = item
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
    .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())

  await loadItemLookup(purchaseOrders.value)
}

async function loadReceivedSubOrders() {
  if (!actor.isSupplierOrganization.value && !actor.isAdminRole.value) {
    receivedSubOrders.value = []
    return
  }

  try {
    const response = await getReceivedSubPurchaseOrders({ page: 0, size: 100 })
    receivedSubOrders.value = [...response.content].sort(
      (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )
  } catch {
    receivedSubOrders.value = []
  }
}

async function loadSentSubOrders() {
  if (!actor.isSupplierOrganization.value && !actor.isAdminRole.value) {
    sentSubOrders.value = []
    return
  }

  try {
    const response = await getSentSubPurchaseOrders({ page: 0, size: 100 })
    sentSubOrders.value = [...response.content].sort(
      (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )
  } catch {
    sentSubOrders.value = []
  }
}

async function loadParentSubOrders(poPublicId: string) {
  if (
    !actor.isBuyerOrganization.value &&
    !actor.isSupplierOrganization.value &&
    !actor.isAdminRole.value
  ) {
    parentSubOrders.value = []
    return
  }

  try {
    const response = await getSubPurchaseOrdersByParentPo({
      parentPoPublicId: poPublicId,
      page: 0,
      size: 100,
    })

    parentSubOrders.value = [...response.content].sort(
      (a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime(),
    )
  } catch {
    parentSubOrders.value = []
  }
}


async function loadCategoryOptions() {
  try {
    const response = await getItemCategories(0, 500)
    categoryOptions.value = response.content
      .filter((category) => category.status === 'ACTIVE')
      .sort(
        (a, b) =>
          a.categoryLevel - b.categoryLevel ||
          a.sortOrder - b.sortOrder ||
          a.categoryName.localeCompare(b.categoryName, 'ko-KR'),
      )
  } catch {
    categoryOptions.value = []
  }
}

const createRootCategories = computed(() =>
  categoryOptions.value.filter((category) => !category.parentCategoryPublicId),
)

const createSecondCategories = computed(() =>
  createForm.value.categoryLevel1PublicId
    ? categoryOptions.value.filter(
        (category) =>
          category.parentCategoryPublicId === createForm.value.categoryLevel1PublicId,
      )
    : [],
)

const createThirdCategories = computed(() =>
  createForm.value.categoryLevel2PublicId
    ? categoryOptions.value.filter(
        (category) =>
          category.parentCategoryPublicId === createForm.value.categoryLevel2PublicId,
      )
    : [],
)


const selectedCreateCategoryPublicId = computed(
  () =>
    createForm.value.categoryLevel3PublicId ||
    createForm.value.categoryLevel2PublicId ||
    createForm.value.categoryLevel1PublicId ||
    undefined,
)

async function loadDashboardSummary() {
  if (!actor.isBuyerOrganization.value && !actor.isSupplierOrganization.value) {
    dashboardSummary.value = emptyDashboardSummary()
    return
  }

  dashboardSummary.value = await getOrderDashboardSummary()
}

async function loadOrderDashboard() {
  try {
    loading.value = true
    errorMessage.value = ''

    await Promise.all([
      loadPurchaseOrders(),
      loadReceivedSubOrders(),
      loadSentSubOrders(),
      loadDashboardSummary(),
    ])
  } catch (error) {
    purchaseOrders.value = []
    receivedSubOrders.value = []
    sentSubOrders.value = []
    dashboardSummary.value = emptyDashboardSummary()
    errorMessage.value = normalizeErrorMessage(error, '주문 정보를 불러오지 못했습니다.')
  } finally {
    loading.value = false
  }
}

function resetCreateOrderForm() {
  createErrorMessage.value = ''

  createForm.value = {
    categoryLevel1PublicId: '',
    categoryLevel2PublicId: '',
    categoryLevel3PublicId: '',
    itemKeyword: '',
    itemOptions: [],
    searchResultPublicIds: [],
    detailItemPublicId: '',
    searchLoading: false,
    lines: [],
  }
}

function openCreateOrderModal() {
  resetCreateOrderForm()
  createModalOpen.value = true
}

function closeCreateOrderModal() {
  createModalOpen.value = false
}

function validateCreateOrderForm() {
  if (!createForm.value.lines.length) {
    return '검색 결과에서 발주할 품목을 1개 이상 선택하세요.'
  }

  for (const line of createForm.value.lines) {
    if (!line.selectedItemPublicId) return '품목을 선택해 주세요.'
if (!line.selectedSupplierPublicId) return '협력사를 선택해 주세요.'
if (!line.arrivalLogisticsNodePublicId) return '도착 거점을 선택해 주세요.'
if (!line.orderedQty || line.orderedQty <= 0) return '발주 수량은 0보다 커야 합니다.'
  }

  return ''
}

function unitPriceOf(item: ItemResponseDto | null | undefined) {
  const itemWithPrice = item as (ItemResponseDto & { unitPrice?: number | null }) | null | undefined
  return itemWithPrice?.unitPrice ?? null
}

function leadTimeDaysOf(item: ItemResponseDto | null | undefined) {
  const itemWithCapability = item as (ItemResponseDto & { leadTimeDays?: number | null }) | null | undefined
  return itemWithCapability?.leadTimeDays ?? null
}

function partialConfirmationAllowedOf(item: ItemResponseDto | null | undefined) {
  const itemWithCapability = item as
    | (ItemResponseDto & { partialConfirmationAllowed?: boolean | null })
    | null
    | undefined

  return itemWithCapability?.partialConfirmationAllowed ?? null
}

function availableQtyOf(item: any) {
  return item.capability?.availableQty ?? item.availableQty ?? null
}

function moqOf(item: any) {
  return item.capability?.moq ?? item.moq ?? null
}

function monthlyCapacityOf(item: any) {
  return item.capability?.monthlyCapacity ?? item.monthlyCapacity ?? null
}

function expectedDueDateText(item: ItemResponseDto | null | undefined) {
  const leadTimeDays = leadTimeDaysOf(item)
  if (leadTimeDays == null) return '-'
  return formatDate(getLocalDateString(leadTimeDays))
}


function capabilityText(value: boolean | null | undefined) {
  if (value == null) return '-'
  return value ? '허용' : '불가'
}

function resetCreateSearchResults() {
  createForm.value.searchResultPublicIds = []
  createForm.value.detailItemPublicId = ''
}

function handleCreateCategoryChange() {
  resetCreateSearchResults()
}

function handleCreateKeywordInput() {
  createForm.value.detailItemPublicId = ''
}


function handleCreateRootCategoryChange() {
  createForm.value.categoryLevel2PublicId = ''
  createForm.value.categoryLevel3PublicId = ''
  resetCreateSearchResults()
  void searchItemsForCreateOrder()
}


function handleCreateSecondCategoryChange() {
  createForm.value.categoryLevel3PublicId = ''
  resetCreateSearchResults()
  void searchItemsForCreateOrder()
}

function handleCreateThirdCategoryChange() {
  resetCreateSearchResults()
  void searchItemsForCreateOrder()
}


const createSearchItemResults = computed(() => {
  const byPublicId = new Map<string, ItemResponseDto>()

  createForm.value.itemOptions
    .filter((item) => createForm.value.searchResultPublicIds.includes(item.publicId))
    .forEach((item) => byPublicId.set(item.publicId, item))

  return Array.from(byPublicId.values()).sort((a, b) => {
    const nameCompare = a.itemName.localeCompare(b.itemName, 'ko-KR')
    if (nameCompare !== 0) return nameCompare
    return (a.supplierName ?? '').localeCompare(b.supplierName ?? '', 'ko-KR')
  })
})

const createSearchDetailItem = computed(() =>
  createForm.value.itemOptions.find(
    (item) => item.publicId === createForm.value.detailItemPublicId,
  ) ?? null,
)

function showCreateItemCapability(itemPublicId: string) {
  createForm.value.detailItemPublicId =
    createForm.value.detailItemPublicId === itemPublicId ? '' : itemPublicId
}

function selectCreateSearchItem(item: ItemResponseDto) {
  const line = createEmptyOrderLine(item)
  createForm.value.lines.push(line)
}

function handleCreateLineItemNameChange(line: CreateOrderLineForm) {
  line.selectedSupplierPublicId = ''
}

async function searchItemsForCreateOrder() {
  const keyword = createForm.value.itemKeyword.trim()

  try {
    createForm.value.searchLoading = true
    createErrorMessage.value = ''
    createForm.value.detailItemPublicId = ''

    const response = await getItems({
      keyword: keyword || undefined,
      itemCategoryPublicId: selectedCreateCategoryPublicId.value,
      status: 'ACTIVE',
      page: 0,
      size: 100,
    })

    const nextOptions = new Map(createForm.value.itemOptions.map((item) => [item.publicId, item]))

    response.content.forEach((item) => {
      nextOptions.set(item.publicId, item)
    })

    createForm.value.itemOptions = Array.from(nextOptions.values())
    createForm.value.searchResultPublicIds = response.content.map((item) => item.publicId)
  } catch (error) {
    createForm.value.searchResultPublicIds = []
    createErrorMessage.value = normalizeErrorMessage(error, '품목 검색에 실패했습니다.')
  } finally {
    createForm.value.searchLoading = false
  }
}

function itemNameOptionsOf() {
  return Array.from(new Set(createForm.value.itemOptions.map((item) => item.itemName))).sort(
    (a, b) => a.localeCompare(b, 'ko-KR'),
  )
}

function supplierOptionsOf(line: CreateOrderLineForm) {
  const selectedItem = selectedCreateLineItem(line)
  if (!selectedItem) return []

  return createForm.value.itemOptions
    .filter((item) => item.itemName === selectedItem.itemName)
    .map((item) => ({
      supplierPublicId: item.supplierPublicId,
      supplierName: item.supplierName,
      itemPublicId: item.publicId,
      unitPrice: unitPriceOf(item),
    }))
    .sort((a, b) => (a.supplierName ?? '').localeCompare(b.supplierName ?? '', 'ko-KR'))
}

function handleCreateLineSupplierChange(line: CreateOrderLineForm) {
  const supplierItem = supplierOptionsOf(line).find(
    (option) => option.supplierPublicId === line.selectedSupplierPublicId,
  )

  line.selectedItemPublicId = supplierItem?.itemPublicId ?? ''
}


function selectedCreateLineItem(line: CreateOrderLineForm) {
  return createForm.value.itemOptions.find((item) => item.publicId === line.selectedItemPublicId) ?? null
}

function matchingSupplierCount(line: CreateOrderLineForm) {
  return supplierOptionsOf(line).length
}

function selectedCreateLineUnitPrice(line: CreateOrderLineForm) {
  return unitPriceOf(selectedCreateLineItem(line))
}

function selectedCreateLineAmount(line: CreateOrderLineForm) {
  const unitPrice = selectedCreateLineUnitPrice(line)
  if (unitPrice == null || !line.orderedQty) return null

  return unitPrice * Number(line.orderedQty)
}

function removeCreateOrderLine(lineId: number) {
  createForm.value.lines = createForm.value.lines.filter((line) => line.id !== lineId)
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

    await createPurchaseOrdersBatch({
      lines: createForm.value.lines.map((line) => ({
        supplierPublicId: line.selectedSupplierPublicId,
        itemPublicId: line.selectedItemPublicId,
        orderedQty: Number(line.orderedQty),
        arrivalLogisticsNodePublicId: line.arrivalLogisticsNodePublicId,
      })),
    })

    createModalOpen.value = false
    await loadOrderDashboard()
  } catch (error) {
    createErrorMessage.value = normalizeErrorMessage(error, '발주 등록에 실패했습니다.')
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
    // 무시
  }
}

function closeOrderDetailModal() {
  orderDetailModalOpen.value = false
  detailLoading.value = false
  detailActionLoading.value = false
  detailErrorMessage.value = ''
  detailSuccessMessage.value = ''
  confirmMode.value = false
  confirmErrorMessage.value = ''
  confirmLines.value = []
  selectedOrder.value = null
  parentSubOrders.value = []
}

async function refreshSelectedOrder() {
  if (!selectedOrder.value) return

  const refreshed = await getPurchaseOrder(selectedOrder.value.poPublicId)
  selectedOrder.value = refreshed

  await loadItemLookup([refreshed])
  await loadParentSubOrders(refreshed.poPublicId)
}

function canSupplierRespondOrder(order: PurchaseOrderDetailResponseDto | null) {
  return actor.isSupplierOrganization.value && order?.poStatus === 'CREATED'
}

function canBuyerEditOrder(order: PurchaseOrderDetailResponseDto | null) {
  return actor.canManagePurchaseOrdersAsBuyer.value && order?.poStatus === 'CREATED'
}

function canBuyerCancelOrder(order: PurchaseOrderDetailResponseDto | null) {
  return actor.canManagePurchaseOrdersAsBuyer.value && order?.poStatus === 'CREATED'
}

function canCreateSubOrder(order: PurchaseOrderDetailResponseDto | null) {
  return (
    actor.isSupplierOrganization.value &&
    !!order &&
    ['PARTIALLY_CONFIRMED', 'CONFIRMED'].includes(order.poStatus)
  )
}

async function afterOrderMutation(successMessage: string) {
  await loadOrderDashboard()
  await refreshSelectedOrder()
  detailSuccessMessage.value = successMessage
}

function submitAcceptOrder() {
  if (!selectedOrder.value) return

  confirmMode.value = true
  confirmErrorMessage.value = ''
  detailErrorMessage.value = ''
  detailSuccessMessage.value = ''

  confirmLines.value = selectedOrder.value.items
    .filter((item) => item.itemStatus !== 'DELETED' && item.itemStatus !== 'CANCELLED')
    .map((item) => ({
      poItemPublicId: item.poItemPublicId,
      itemName: item.itemName,
      itemCode: item.itemCode,
      unit: item.unit,
      orderedQty: item.orderedQty,
      confirmedQty: item.confirmedQty ?? item.orderedQty,
    }))
}

function cancelConfirmOrder() {
  confirmMode.value = false
  confirmErrorMessage.value = ''
  confirmLines.value = []
}

function validateConfirmOrder() {
  if (!selectedOrder.value) {
    return '선택된 발주가 없습니다.'
  }

  if (!confirmLines.value.length) {
    return '확정할 품목이 없습니다.'
  }

  for (const line of confirmLines.value) {
    if (line.confirmedQty == null) {
      return `${line.itemName} 확정 수량을 입력하세요.`
    }

    const confirmedQty = Number(line.confirmedQty)
    const orderedQty = Number(line.orderedQty)

    if (confirmedQty < 0) {
      return `${line.itemName} 확정 수량은 0보다 작을 수 없습니다.`
    }

    if (confirmedQty > orderedQty) {
      return `${line.itemName} 확정 수량은 발주 수량보다 클 수 없습니다.`
    }

    const originalItem = selectedOrder.value.items.find(
      (item) => item.poItemPublicId === line.poItemPublicId,
    )

    if (originalItem?.partialConfirmationAllowed === false && confirmedQty !== orderedQty) {
      return `${line.itemName}은 부분 확정이 불가합니다. 전체 수량 ${formatNumber(orderedQty)}개로 확정해야 합니다.`
    }
  }

  return ''
}


async function submitConfirmOrder() {
  if (!selectedOrder.value) return

  const validationMessage = validateConfirmOrder()

  if (validationMessage) {
    confirmErrorMessage.value = validationMessage
    return
  }

  if (!window.confirm('입력한 확정 수량으로 수주를 수락하시겠습니까?')) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''
    confirmErrorMessage.value = ''

    const poPublicId = selectedOrder.value.poPublicId

    for (const line of confirmLines.value) {
      await confirmPurchaseOrderItem(poPublicId, line.poItemPublicId, {
        confirmedQty: Number(line.confirmedQty),
      })
    }

    confirmMode.value = false
    confirmLines.value = []

    await afterOrderMutation('수주를 수락했습니다.')
  } catch (error) {
    confirmErrorMessage.value = normalizeErrorMessage(error, '수주 수락에 실패했습니다.')
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
    detailErrorMessage.value = normalizeErrorMessage(error, '발주 반려에 실패했습니다.')
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
    detailErrorMessage.value = normalizeErrorMessage(error, '발주 취소에 실패했습니다.')
  } finally {
    detailActionLoading.value = false
  }
}

async function patchPurchaseOrderMemo(poPublicId: string, memo: string) {
  const response = await apiClient.patch<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}`,
    { memo },
  )
  return response.data
}

async function addPurchaseOrderItemRequest(
  poPublicId: string,
  payload: { itemPublicId: string; orderedQty: number },
) {
  const response = await apiClient.post<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}/items`,
    payload,
  )
  return response.data
}

async function updatePurchaseOrderItemRequest(
  poPublicId: string,
  poItemPublicId: string,
  payload: { orderedQty: number },
) {
  const response = await apiClient.patch<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}/items/${poItemPublicId}`,
    payload,
  )
  return response.data
}

async function deletePurchaseOrderItemRequest(poPublicId: string, poItemPublicId: string) {
  await apiClient.delete(`/api/supply/purchase-order/${poPublicId}/items/${poItemPublicId}`)
}

async function loadEditableSupplierItems(supplierPublicId: string) {
  const response = await getItems({
    supplierPublicId,
    status: 'ACTIVE',
    page: 0,
    size: 100,
  })

  editAvailableItems.value = response.content
    .slice()
    .sort((a, b) => a.itemName.localeCompare(b.itemName, 'ko-KR'))
}

function resetEditOrderForm(order: PurchaseOrderDetailResponseDto) {
  editOrderErrorMessage.value = ''
  editForm.value = {
    memo: order.memo ?? '',
    existingLines: order.items.map((item) => ({
      poItemPublicId: item.poItemPublicId,
      itemPublicId: item.itemPublicId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unit: item.unit,
      orderedQty: toNumber(item.orderedQty),
      originalOrderedQty: toNumber(item.orderedQty),
      deleted: false,
    })),
    newLines: [],
  }
}

async function openEditOrderModal() {
  if (!selectedOrder.value) return

  try {
    editOrderModalOpen.value = true
    editOrderLoading.value = true
    editOrderErrorMessage.value = ''

    const detail = await getPurchaseOrder(selectedOrder.value.poPublicId)
    selectedOrder.value = detail

    await loadEditableSupplierItems(detail.supplierPublicId)
    resetEditOrderForm(detail)
  } catch (error) {
    editOrderErrorMessage.value = normalizeErrorMessage(error, '발주 수정 정보를 불러오지 못했습니다.')
  } finally {
    editOrderLoading.value = false
  }
}

function closeEditOrderModal() {
  editOrderModalOpen.value = false
  editOrderLoading.value = false
  editOrderSaving.value = false
  editOrderErrorMessage.value = ''
  editAvailableItems.value = []
  editForm.value = {
    memo: '',
    existingLines: [],
    newLines: [],
  }
}

function addEditOrderLine() {
  editForm.value.newLines.push(createEmptyEditNewLine())
}

function removeEditOrderNewLine(key: number) {
  editForm.value.newLines = editForm.value.newLines.filter((line) => line.key !== key)
}

function editSelectableItems(currentKey: number) {
  const existingItemIds = new Set(editForm.value.existingLines.map((line) => line.itemPublicId))
  const newItemIds = new Set(
    editForm.value.newLines
      .filter((line) => line.key !== currentKey && !!line.itemPublicId)
      .map((line) => line.itemPublicId),
  )

  return editAvailableItems.value.filter(
    (item) => !existingItemIds.has(item.publicId) && !newItemIds.has(item.publicId),
  )
}

function activeEditNewLines() {
  return editForm.value.newLines.filter((line) => line.itemPublicId || line.orderedQty)
}

function validateEditOrderForm() {
  const keptExistingLines = editForm.value.existingLines.filter((line) => !line.deleted)
  const newLines = activeEditNewLines()

  if (!keptExistingLines.length && !newLines.length) {
    return '발주 품목은 최소 1개 이상 유지해야 합니다.'
  }

  for (const line of keptExistingLines) {
    if (!line.orderedQty || line.orderedQty <= 0) {
      return '기존 품목 수량은 0보다 커야 합니다.'
    }
  }

  const selectedNewItemIds = new Set<string>()
  for (const line of newLines) {
    if (!line.itemPublicId) return '추가 품목을 선택하세요.'
    if (!line.orderedQty || line.orderedQty <= 0) return '추가 품목 수량은 0보다 커야 합니다.'
    if (selectedNewItemIds.has(line.itemPublicId)) return '동일한 추가 품목이 중복되었습니다.'
    selectedNewItemIds.add(line.itemPublicId)
  }

  return ''
}

async function submitEditOrder() {
  if (!selectedOrder.value) return

  const validationMessage = validateEditOrderForm()
  if (validationMessage) {
    editOrderErrorMessage.value = validationMessage
    return
  }

  const poPublicId = selectedOrder.value.poPublicId
  const originalMemo = selectedOrder.value.memo ?? ''
  const nextMemo = editForm.value.memo
  const newLines = activeEditNewLines()
  const updatedExistingLines = editForm.value.existingLines.filter(
    (line) => !line.deleted && Number(line.orderedQty) !== line.originalOrderedQty,
  )
  const deletedExistingLines = editForm.value.existingLines.filter((line) => line.deleted)

  const hasChanges =
    originalMemo !== nextMemo ||
    newLines.length > 0 ||
    updatedExistingLines.length > 0 ||
    deletedExistingLines.length > 0

  if (!hasChanges) {
    closeEditOrderModal()
    return
  }

  try {
    editOrderSaving.value = true
    editOrderErrorMessage.value = ''

    if (originalMemo !== nextMemo) {
      await patchPurchaseOrderMemo(poPublicId, nextMemo)
    }

    for (const line of newLines) {
      await addPurchaseOrderItemRequest(poPublicId, {
        itemPublicId: line.itemPublicId,
        orderedQty: Number(line.orderedQty),
      })
    }

    for (const line of updatedExistingLines) {
      await updatePurchaseOrderItemRequest(poPublicId, line.poItemPublicId, {
        orderedQty: Number(line.orderedQty),
      })
    }

    for (const line of deletedExistingLines) {
      await deletePurchaseOrderItemRequest(poPublicId, line.poItemPublicId)
    }

    closeEditOrderModal()
    await afterOrderMutation('발주를 수정했습니다.')
  } catch (error) {
    editOrderErrorMessage.value = normalizeErrorMessage(error, '발주 수정에 실패했습니다.')
  } finally {
    editOrderSaving.value = false
  }
}

function resetSubOrderForm(order: PurchaseOrderDetailResponseDto) {
  subOrderCreateErrorMessage.value = ''
  subOrderForm.value = {
    supplierPublicId: '',
    lines: order.items.map((item) => ({
      parentPoItemPublicId: item.poItemPublicId,
      itemPublicId: item.itemPublicId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unit: item.unit,
      selected: true,
      orderedQty: toNumber(item.confirmedQty ?? item.orderedQty),
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
  if (!subOrderForm.value.supplierPublicId) return '하위 협력사를 선택하세요.'

  const selectedLines = subOrderForm.value.lines.filter((line) => line.selected)

  if (!selectedLines.length) return '서브발주 품목을 1개 이상 선택하세요.'

  for (const line of selectedLines) {
    if (!line.orderedQty || line.orderedQty <= 0) {
      return '서브발주 수량은 0보다 커야 합니다.'
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

    const payload = {
      parentPoPublicId: selectedOrder.value.poPublicId,
      supplierPublicId: subOrderForm.value.supplierPublicId,
      items: subOrderForm.value.lines
        .filter((line) => line.selected)
        .map((line) => ({
          parentPoItemPublicId: line.parentPoItemPublicId,
          itemPublicId: line.itemPublicId,
          orderedQty: Number(line.orderedQty),
        })),
    }

    await createSubPurchaseOrder(payload as Parameters<typeof createSubPurchaseOrder>[0])

    subOrderModalOpen.value = false
    await loadReceivedSubOrders()
    await loadSentSubOrders()
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

function inferSubOrderDirection(subPoPublicId: string): 'ISSUED' | 'RECEIVED' {
  if (receivedSubOrders.value.some((subOrder) => subOrder.subPoPublicId === subPoPublicId)) {
    return 'RECEIVED'
  }
  return 'ISSUED'
}

async function openSubOrderDetail(
  subPoPublicId: string,
  direction?: 'ISSUED' | 'RECEIVED',
) {
  try {
    subOrderDetailModalOpen.value = true
    subOrderDetailLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''
    selectedSubOrder.value = null
    selectedSubOrderDirection.value = direction ?? inferSubOrderDirection(subPoPublicId)

    const detail = await getSubPurchaseOrder(subPoPublicId)
    selectedSubOrder.value = detail
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
  selectedSubOrderDirection.value = null
}

async function refreshSelectedSubOrder() {
  if (!selectedSubOrder.value) return
  selectedSubOrder.value = await getSubPurchaseOrder(selectedSubOrder.value.subPoPublicId)
}

function canRespondSubOrder(subOrder: SubPurchaseOrderResponseDto | null) {
  return (
    actor.isSupplierOrganization.value &&
    selectedSubOrderDirection.value === 'RECEIVED' &&
    subOrder?.subPoStatus === 'CREATED'
  )
}

async function afterSubOrderMutation(successMessage: string) {
  await loadReceivedSubOrders()
  await loadSentSubOrders()
  await refreshSelectedSubOrder()
  await refreshSelectedOrder()
  subOrderSuccessMessage.value = successMessage
}

async function submitAcceptSubOrder() {
  if (!selectedSubOrder.value) return
  if (!window.confirm('이 수주를 수락하시겠습니까?')) return

  try {
    subOrderActionLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''

    for (const item of selectedSubOrder.value.items ?? []) {
      await confirmSubPurchaseOrderItem(
        selectedSubOrder.value.subPoPublicId,
        item.parentPoItemPublicId,
        item.itemPublicId,
        { confirmedQty: item.orderedQty },
      )
    }

    await afterSubOrderMutation('수주를 수락했습니다.')
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(error, '수주 수락에 실패했습니다.')
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

function downloadOrdersCsv() {
  if (!filteredOrders.value.length) return

  const rows = [
    TABLE_COLUMNS,
    ...filteredOrders.value.map((order) => [
      order.number,
      order.counterpartyName,
      supplierStatusText(order.supplierStatus),
      order.itemLabel,
      order.qtyLabel,
      formatAmount(order.totalAmount, order.currencyCode),
      formatDateTime(order.orderedAt),
      formatDate(order.expectedDueDate),
      order.kind === 'PO'
        ? poStatusText(order.status as PoStatus)
        : subPoStatusText(order.status as SubPoStatus),
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

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

onMounted(async () => {
  resetCreateOrderForm()
  await Promise.all([
    loadOrderDashboard(),
    loadSupplierOptions(),
    loadCategoryOptions(),
    loadLogisticsNodeOptions(),
  ])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">공급망 운영 / 발주 관리</div>
        <h2 class="terminal-page__title">발주 관리</h2>
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
      </article>
    </section>

    <section class="orders-page__insight-grid">
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">APPROVAL</div>
            <h3>확인 대기함</h3>
          </div>
        </div>

        <div v-if="queueEntries.length" class="page-feed orders-page__insight-feed">
          <div
            v-for="queueEntry in queueEntries"
            :key="`${queueEntry.kind}-${queueEntry.publicId}`"
            class="page-feed__item"
          >
            <button
              class="orders-page__queue-button"
              type="button"
              @click="
                queueEntry.kind === 'PO'
                  ? openOrderDetailById(queueEntry.publicId)
                  : openSubOrderDetail(queueEntry.publicId, 'RECEIVED')
              "
            >
              <span class="page-feed__label">{{ queueEntry.number }}</span>
              <strong class="page-feed__text">{{ queueEntry.counterpartyName }}</strong>
              <span class="orders-page__queue-subtext">{{ queueEntry.itemLabel }}</span>
            </button>
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

        <div v-if="categoryRows.length" class="page-feed orders-page__insight-feed">
          <div
            v-for="category in categoryRows"
            :key="category.label"
            class="page-feed__item"
          >
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
            <div class="page-panel__eyebrow">COUNTERPARTY</div>
            <h3>주요 거래처</h3>
          </div>
        </div>

        <div v-if="topCounterpartyRows.length" class="page-feed orders-page__insight-feed">
          <div
            v-for="counterparty in topCounterpartyRows"
            :key="counterparty.name"
            class="page-feed__item"
          >
            <span class="page-feed__label">{{ counterparty.name }}</span>
            <strong class="page-feed__text">{{ counterparty.text }}</strong>
          </div>
        </div>

        <p v-else class="orders-page__empty">표시할 거래처 집계가 없습니다.</p>
      </article>
    </section>

    <section class="terminal-page__content orders-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>검색</span>
            <input
              v-model="search"
              type="text"
              placeholder="문서번호, 거래처, 품목명으로 검색하세요."
            />
          </label>

          <div class="orders-page__filter-actions">
            <div v-if="actor.isSupplierOrganization.value" class="orders-page__segmented">
              <button
                v-for="direction in DIRECTION_OPTIONS"
                :key="direction.key"
                :class="[
                  'page-button',
                  directionFilter === direction.key ? 'page-button--primary' : 'page-button--secondary',
                  'orders-page__filter-button',
                ]"
                type="button"
                @click="directionFilter = direction.key"
              >
                {{ direction.label }}
              </button>
            </div>

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
          <p v-else-if="loading" class="orders-page__empty">주문 데이터를 불러오는 중입니다.</p>
          <p v-else-if="!filteredOrders.length" class="orders-page__empty">
            조건에 맞는 주문이 없습니다.
          </p>

          <div v-else class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in TABLE_COLUMNS" :key="column">{{ column }}</span>
            </div>

            <div
              v-for="order in filteredOrders"
              :key="`${order.kind}-${order.id}`"
              class="page-table__row"
            >
              <span>{{ order.number }}</span>
              <span>{{ order.counterpartyName }}</span>
              <span>{{ supplierStatusText(order.supplierStatus) }}</span>
              <span>{{ order.itemLabel }}</span>
              <span>{{ order.qtyLabel }}</span>
              <span>{{ formatAmount(order.totalAmount, order.currencyCode) }}</span>
              <span>{{ formatDateTime(order.orderedAt) }}</span>
              <span>{{ formatDate(order.expectedDueDate) }}</span>
              <span>
                {{
                  order.kind === 'PO'
                    ? poStatusText(order.status as PoStatus)
                    : subPoStatusText(order.status as SubPoStatus)
                }}
              </span>
              <span class="action-cell">
                <button
                  class="page-button page-button--secondary"
                  type="button"
                  @click="
                    order.kind === 'PO'
                      ? openOrderDetailById(order.id)
                      : openSubOrderDetail(order.id, 'ISSUED')
                  "
                >
                  상세
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>

      
    </section>
  </section>

  <BaseModal
    v-model="createModalOpen"
    title="발주 등록"
    description="카테고리와 품목을 먼저 고른 뒤, 협력사와 도착거점을 지정해 발주 행을 구성합니다."
    size="lg"
    hide-dividers
    @close="closeCreateOrderModal"
  >
    <div class="orders-page__form orders-page__create-modal-body">
      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>품목 검색</strong>
        </div>

        <div class="orders-page__create-filter-grid">
          <label class="orders-page__form-field">
            <span>상위 카테고리</span>
            <select
              v-model="createForm.categoryLevel1PublicId"
              :disabled="createForm.searchLoading"
              @change="handleCreateRootCategoryChange"
            >
              <option value="">전체</option>
              <option
                v-for="category in createRootCategories"
                :key="category.publicId"
                :value="category.publicId"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </label>

          <label class="orders-page__form-field">
            <span>중간 카테고리</span>
            <select
              v-model="createForm.categoryLevel2PublicId"
              :disabled="createForm.searchLoading || !createSecondCategories.length"
              @change="handleCreateSecondCategoryChange"
            >
              <option value="">전체</option>
              <option
                v-for="category in createSecondCategories"
                :key="category.publicId"
                :value="category.publicId"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </label>

          <label class="orders-page__form-field">
            <span>하위 카테고리</span>
            <select
              v-model="createForm.categoryLevel3PublicId"
              :disabled="createForm.searchLoading || !createThirdCategories.length"
              @change="handleCreateThirdCategoryChange"
            >
              <option value="">전체</option>
              <option
                v-for="category in createThirdCategories"
                :key="category.publicId"
                :value="category.publicId"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </label>

          <label class="orders-page__form-field orders-page__form-field--wide">
            <span>품목 검색</span>
            <div class="orders-page__field-with-button">
              <input
                v-model="createForm.itemKeyword"
                type="text"
                placeholder="품목명 또는 품목코드를 입력하세요."
                :disabled="createForm.searchLoading"
                @input="handleCreateKeywordInput"
                @keyup.enter="searchItemsForCreateOrder"
              />
              <button
                class="page-button page-button--secondary"
                type="button"
                :disabled="createForm.searchLoading"
                @click="searchItemsForCreateOrder"
              >
                {{ createForm.searchLoading ? '검색 중' : '검색' }}
              </button>
            </div>
          </label>
        </div>

        <div v-if="filteredSelectableItems.length" class="orders-page__item-picker-list">
          <div
            v-for="item in filteredSelectableItems"
            :key="item.publicId"
            class="orders-page__item-picker-row-wrap"
          >
            <div class="orders-page__item-picker-row">
              <span>{{ item.itemCode }}</span>
              <span>{{ item.itemName }}</span>
              <span>{{ item.categoryName }}</span>
              <span>{{ item.unit }}</span>

              <button
                class="page-button page-button--secondary"
                type="button"
                @click="expandedItemPublicId = expandedItemPublicId === item.publicId ? null : item.publicId"
              >
                상세
              </button>

              <button
                class="page-button page-button--secondary orders-page__select-button"
                type="button"
                @click="selectCreateSearchItem(item)"
              >
                선택
              </button>
            </div>

            <div
              v-if="expandedItemPublicId === item.publicId"
              class="orders-page__item-inline-detail"
            >
              <span>
                품목 코드
                <strong>{{ item.itemCode }}</strong>
              </span>
              <span>
                카테고리
                <strong>{{ item.categoryName }}</strong>
              </span>
              <span>
                단위
                <strong>{{ item.unit }}</strong>
              </span>
              <span>
                품목 타입
                <strong>{{ supplyTypeText(item.supplyType) }}</strong>
              </span>
              <span>
                납기 예정일
                <strong>{{ expectedDueDateText(item) }}</strong>
              </span>
              <span>
                월간 생산량
                <strong>{{ formatNumber(monthlyCapacityOf(item)) }}</strong>
              </span>
              <span>
                최소 주문 수량
                <strong>{{ formatNumber(moqOf(item)) }}</strong>
              </span>
              <span>
                부분 확정
                <strong>{{ capabilityText(partialConfirmationAllowedOf(item)) }}</strong>
              </span>
            </div>

          </div>
        </div>

        <p v-else-if="!createForm.searchLoading" class="orders-page__empty">
          카테고리를 선택하거나 품목을 검색하세요.
        </p>

      </section>


      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>선택한 발주 품목</strong>
          <span class="page-panel__chip">{{ createForm.lines.length }}</span>
        </div>

        <p v-if="!createForm.lines.length" class="orders-page__empty">
          검색 결과에서 품목을 선택하면 아래에 발주 행이 생성됩니다.
        </p>

        <div v-else class="orders-page__line-list">
          <div
            v-for="line in createForm.lines"
            :key="line.id"
            class="orders-page__line-card"
          >
            <div class="orders-page__line-head">
              <strong>{{ line.selectedItemName || '품목 행' }}</strong>
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="removeCreateOrderLine(line.id)"
              >
                행 삭제
              </button>
            </div>

            <div class="orders-page__line-grid">
              <label class="orders-page__form-field">
                <span>품목명</span>
                <select
                  v-model="line.selectedItemName"
                  @change="handleCreateLineItemNameChange(line)"
                >
                  <option value="">품목명을 선택하세요.</option>
                  <option
                    v-for="itemName in itemNameOptionsOf()"
                    :key="itemName"
                    :value="itemName"
                  >
                    {{ itemName }}
                  </option>
                </select>
              </label>

              <label class="orders-page__form-field">
                <span>협력사</span>
                <select
                  v-model="line.selectedSupplierPublicId"
                  @change="handleCreateLineSupplierChange(line)"
                >
                  <option value="">협력사를 선택하세요.</option>
                  <option
                    v-for="supplier in supplierOptionsOf(line)"
                    :key="`${supplier.supplierPublicId}-${supplier.itemPublicId}`"
                    :value="supplier.supplierPublicId"
                  >
                    {{ supplier.supplierName }} / {{ formatPlainAmount(supplier.unitPrice) }}
                  </option>
                </select>
              </label>

              <label class="orders-page__form-field">
                <span>발주 수량</span>
                <input
                  v-model.number="line.orderedQty"
                  type="number"
                  min="1"
                  step="1"
                />
              </label>

              <label class="orders-page__form-field">
                <span>단가</span>
                <input
                  :value="formatPlainAmount(selectedCreateLineUnitPrice(line))"
                  type="text"
                  disabled
                />
              </label>

              <label class="orders-page__form-field">
                <span>예상 금액</span>
                <input
                  :value="formatPlainAmount(selectedCreateLineAmount(line))"
                  type="text"
                  disabled
                />
              </label>

              <label class="orders-page__form-field">
                <span>도착거점</span>
                <select v-model="line.arrivalLogisticsNodePublicId">
                  <option value="">도착거점을 선택하세요.</option>
                  <option
                    v-for="node in logisticsNodeOptions"
                    :key="node.publicId"
                    :value="node.publicId"
                  >
                    {{ node.nodeName }} / {{ node.nodeType }}
                  </option>
                </select>
              </label>    
            </div>

            <div v-if="selectedCreateLineItem(line)" class="orders-page__item-preview">
              <strong class="orders-page__item-preview-title">선택 품목 정보</strong>

              <div class="orders-page__item-preview-grid">
                <div>
                  <span>품목 코드</span>
                  <strong>{{ selectedCreateLineItem(line)?.itemCode }}</strong>
                </div>
                <div>
                  <span>카테고리</span>
                  <strong>{{ selectedCreateLineItem(line)?.categoryName }}</strong>
                </div>
                <div>
                  <span>협력사 후보</span>
                  <strong>{{ matchingSupplierCount(line) }}곳</strong>
                </div>
                <div>
                  <span>단위</span>
                  <strong>{{ selectedCreateLineItem(line)?.unit }}</strong>
                </div>
                <div>
                  <span>리드타임</span>
                  <strong>{{ leadTimeDaysOf(selectedCreateLineItem(line)) ?? '-' }}일</strong>
                </div>
                <div>
                  <span>납기 예정일</span>
                  <strong>{{ expectedDueDateText(selectedCreateLineItem(line)) }}</strong>
                </div>
                <div>
                  <span>월간 생산량</span>
                  <strong>{{ formatNumber(monthlyCapacityOf(selectedCreateLineItem(line))) }}</strong>
                </div>
                <div>
                  <span>최소 주문 수량</span>
                  <strong>{{ formatNumber(moqOf(selectedCreateLineItem(line))) }}</strong>
                </div>
                <div>
                  <span>부분 확정</span>
                  <strong>
                    {{ capabilityText(partialConfirmationAllowedOf(selectedCreateLineItem(line))) }}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p v-if="createErrorMessage" class="orders-page__error">
        {{ createErrorMessage }}
      </p>

      <div class="orders-page__actions">
        <button
          class="page-button page-button--secondary"
          type="button"
          @click="closeCreateOrderModal"
        >
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
            <span>발주 번호</span>
            <strong>{{ selectedOrder.poNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주 대상 협력사명</span>
            <strong>{{ selectedOrder.supplierName }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>협력사 상태</span>
            <strong>{{ supplierStatusText(selectedOrder.supplierStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주 상태</span>
            <strong>{{ poStatusText(selectedOrder.poStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주 날짜</span>
            <strong>{{ formatDateTime(selectedOrder.orderedAt) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>예상 납기일</span>
            <strong>{{ formatDate(selectedOrderExpectedDueDate) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>총 금액</span>
            <strong>{{ formatAmount(selectedOrder.totalAmount, selectedOrder.currencyCode) }}</strong>
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
            <span>유닛</span>
            <span>예상 납기일</span>
            <span>총 금액</span>
          </div>

          <div
            v-for="item in selectedOrder.items"
            :key="item.poItemPublicId"
            class="orders-page__detail-row"
          >
            <span>
              <strong>{{ item.itemName }}</strong><br />
              <small>{{ item.itemCode }}</small>
            </span>
            <span>{{ formatNumber(item.orderedQty) }}</span>
            <span>{{ formatNumber(item.confirmedQty) }}</span>
            <span>{{ item.unit }}</span>
            <span>{{ formatDate(item.expectedDueDate) }}</span>
            <span>{{ formatAmount(item.lineAmount, selectedOrder.currencyCode) }}</span>
          </div>
        </div>
      </section>

      <section
  v-if="confirmMode"
  class="orders-page__detail-section"
>
  <div class="orders-page__section-head">
    <strong>확정 수량 입력</strong>
    <span class="page-panel__chip">수락 전 입력</span>
  </div>

  <div class="orders-page__line-list">
    <div
      v-for="line in confirmLines"
      :key="line.poItemPublicId"
      class="orders-page__line-card"
    >
      <div class="orders-page__line-head">
        <strong>{{ line.itemName }}</strong>
        <span class="orders-page__sub-text">{{ line.itemCode }}</span>
      </div>

      <div class="orders-page__line-grid">
        <label class="orders-page__form-field">
          <span>발주 수량</span>
          <input
            :value="`${formatNumber(line.orderedQty)} ${line.unit}`"
            type="text"
            disabled
          />
        </label>

        <label class="orders-page__form-field">
          <span>확정 수량</span>
          <input
            v-model.number="line.confirmedQty"
            type="number"
            min="0"
            :max="line.orderedQty"
            step="1"
            :disabled="detailActionLoading"
          />
        </label>
      </div>
    </div>
  </div>

  <p
    v-if="confirmErrorMessage"
    class="orders-page__error"
  >
    {{ confirmErrorMessage }}
  </p>
</section>

      <section
        v-if="actor.isBuyerOrganization || actor.isSupplierOrganization || actor.isAdminRole"
        class="orders-page__detail-section"
      >
        <div class="orders-page__section-head">
          <strong>연결된 서브발주</strong>
        </div>

        <div v-if="parentSubOrders.length" class="orders-page__suborder-list">
          <div
            v-for="subOrder in parentSubOrders"
            :key="subOrder.subPoPublicId"
            class="orders-page__suborder-row"
          >
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
                @click="openSubOrderDetail(subOrder.subPoPublicId, 'ISSUED')"
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
          v-if="canSupplierRespondOrder(selectedOrder) && !confirmMode"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitRejectOrder"
        >
          반려
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder) && !confirmMode"
          class="page-button page-button--primary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitAcceptOrder"
        >
          수락
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder) && confirmMode"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="cancelConfirmOrder"
        >
          확정 입력 취소
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder) && confirmMode"
          class="page-button page-button--primary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitConfirmOrder"
        >
          확정 수량 입력 후 수락
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
          v-if="canBuyerEditOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="openEditOrderModal"
        >
          발주 수정
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
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="editOrderModalOpen"
    title="발주 수정"
    description="확인 대기 상태의 발주 메모와 품목 수량을 수정합니다."
    size="lg"
    @close="closeEditOrderModal"
  >
    <div v-if="editOrderLoading" class="orders-page__empty">발주 수정 정보를 불러오는 중입니다.</div>

    <div v-else class="orders-page__form">
      <label class="orders-page__form-field">
        <span>메모</span>
        <input v-model="editForm.memo" type="text" placeholder="발주 메모를 입력하세요." />
      </label>

      <div class="orders-page__section-head">
        <strong>기존 품목</strong>
      </div>

      <div class="orders-page__line-list">
        <div
          v-for="line in editForm.existingLines"
          :key="line.poItemPublicId"
          :class="['orders-page__line-card', { 'is-deleted': line.deleted }]"
        >
          <div class="orders-page__line-head">
            <strong>{{ line.itemCode }} / {{ line.itemName }}</strong>
            <button
              class="page-button page-button--secondary"
              type="button"
              @click="line.deleted = !line.deleted"
            >
              {{ line.deleted ? '삭제 취소' : '품목 삭제' }}
            </button>
          </div>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>유닛</span>
              <input :value="line.unit" type="text" disabled />
            </label>

            <label class="orders-page__form-field">
              <span>발주 수량</span>
              <input
                v-model.number="line.orderedQty"
                type="number"
                min="1"
                step="1"
                :disabled="line.deleted || editOrderSaving"
              />
            </label>
          </div>
        </div>
      </div>

      <div class="orders-page__section-head">
        <strong>품목 추가</strong>
        <button class="page-button page-button--secondary" type="button" @click="addEditOrderLine">
          추가 행
        </button>
      </div>

      <div v-if="editForm.newLines.length" class="orders-page__line-list">
        <div
          v-for="line in editForm.newLines"
          :key="line.key"
          class="orders-page__line-card"
        >
          <div class="orders-page__line-head">
            <strong>추가 품목</strong>
            <button
              class="page-button page-button--secondary"
              type="button"
              @click="removeEditOrderNewLine(line.key)"
            >
              행 삭제
            </button>
          </div>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>품목</span>
              <select v-model="line.itemPublicId">
                <option value="">품목을 선택하세요.</option>
                <option
                  v-for="item in editSelectableItems(line.key)"
                  :key="item.publicId"
                  :value="item.publicId"
                >
                  {{ item.itemCode }} / {{ item.itemName }}
                </option>
              </select>
            </label>

            <label class="orders-page__form-field">
              <span>발주 수량</span>
              <input
                v-model.number="line.orderedQty"
                type="number"
                min="1"
                step="1"
                :disabled="editOrderSaving"
              />
            </label>
          </div>
        </div>
      </div>

      <p v-if="editOrderErrorMessage" class="orders-page__error">{{ editOrderErrorMessage }}</p>

      <div class="orders-page__actions">
        <button class="page-button page-button--secondary" type="button" @click="closeEditOrderModal">
          취소
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="editOrderSaving"
          @click="submitEditOrder"
        >
          저장
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
            <span>{{ line.itemCode }} / {{ line.itemName }} ({{ line.unit }})</span>
          </label>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>서브발주 수량</span>
              <input
                v-model.number="line.orderedQty"
                type="number"
                min="1"
                step="1"
                :disabled="!line.selected || subOrderCreateLoading"
              />
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
            <span>협력사 상태</span>
            <strong>{{ supplierStatusText(selectedSubOrder.supplierStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주 상태</span>
            <strong>{{ subPoStatusText(selectedSubOrder.subPoStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>발주 날짜</span>
            <strong>{{ formatDateTime(selectedSubOrder.orderedAt) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>예상 납기일</span>
            <strong>{{ formatDate(selectedSubOrderExpectedDueDate) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>총 금액</span>
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
            <span>유닛</span>
            <span>예상 납기일</span>
            <span>총 금액</span>
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
            <span>{{ formatNumber(item.orderedQty) }}</span>
            <span>{{ formatNumber(item.confirmedQty) }}</span>
            <span>{{ item.unit }}</span>
            <span>{{ formatDate(item.expectedDueDate) }}</span>
            <span>{{ formatPlainAmount(item.lineAmount) }}</span>
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
