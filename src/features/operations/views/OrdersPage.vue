<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BaseModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
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
  type PurchaseOrderItemResponseDto,
  type SupplierStatus,
} from '../../../services/purchaseOrder'
import {
  confirmSubPurchaseOrderItem,
  createSubPurchaseOrder,
  createSubPurchaseOrdersBatch,
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
import {
  getItemMedia,
  itemMediaFilesFromItem,
  resolveItemThumbnailUrl,
  type ItemMediaFile,
} from '../../../services/itemMedia'
import {
  getOrganizations,
  type OrganizationListItem,
} from '../../../services/organization'

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
  parentPoItemPublicId: string
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

const header = useAtlasHeaderStore()
const dialog = useAtlasDialogStore()
const route = useRoute()
const router = useRouter()
const actor = useActorScope()
const preferences = useAtlasPreferencesStore()

const copy = computed(() =>
  true
    ? {
        pageEyebrow: '공급망 운영 / 발주 관리',
        pageTitle: '발주 관리',
        export: '내보내기',
        refresh: '새로고침',
        createOrder: '신규 발주',
        queueTitle: '확인 대기함',
        queueEmpty: '확인 대기 건이 없습니다.',
        parentOrderSelect: '상위 발주 선택',
        mainOrderMode: '메인 발주',
        selectParentOrder: '선택하면 서브발주로 연결되고, 선택하지 않으면 메인 발주로 등록됩니다.',
        parentOrderItem: '상위 발주 품목',
        selectParentOrderItem: '연결할 상위 발주 품목을 선택하세요.',

        valueTitle: '카테고리별 금액',
        valueEmpty: '표시할 카테고리 금액이 없습니다.',
        counterpartyTitle: '주요 거래처',
        counterpartyEmpty: '표시할 거래처 집계가 없습니다.',
        searchLabel: '검색',
        searchPlaceholder: '발주번호, 거래처, 품목명으로 검색하세요.',
        tableTitle: '발주 테이블',
        loadingOrders: '주문 데이터를 불러오는 중입니다.',
        emptyOrders: '조건에 맞는 주문이 없습니다.',
        detail: '상세',
        loadingDetail: '발주 상세 정보를 불러오는 중입니다.',
        createTitle: '발주 등록',
        createDescription: '카테고리와 품목을 먼저 고른 뒤, 협력사와 도착거점을 지정해 발주 행을 구성합니다.',
        categorySearch: '카테고리 검색',
        itemSearch: '품목 검색',
        rootCategory: '상위 카테고리',
        secondCategory: '중간 카테고리',
        thirdCategory: '하위 카테고리',
        itemSearchPlaceholder: '품목명 또는 품목코드를 입력하세요.',
        uncategorized: '미분류',
        selectItem: '품목 선택',
        select: '선택',
        emptyItems: '조건에 맞는 외부 등록 품목이 없습니다.',
        itemCapability: '품목 capability',
        itemCode: '품목 코드',
        itemName: '품목명',
        supplier: '협력사',
        supplierColumn: '납품사',
        unit: '유닛',
        unitPrice: '단가',
        unitPricePerUnit: '단가',
        remainingQty: '남은 수량',
        leadTime: '리드타임',
        partialConfirmation: '부분 확정',
        supplyType: '품목 타입',
        monthlyCapacity: '월간 생산량',
        minimumOrderQty: '최소 주문 수량',
        availableQty: '주문 가능 수량',
        spec: '정보',
        shelfLife: '보관기한',
        days: '일',
        all: '전체',
        searching: '검색 중',
        search: '검색',
        close: '닫기',
        selectedItems: '선택한 발주 품목',
        selectHint: '검색 결과에서 품목을 선택하면 아래에 발주 행이 생성됩니다.',
        itemLine: '품목 행',
        deleteLine: '삭제',
        selectItemName: '품목명을 선택하세요.',
        selectSupplier: '협력사를 선택하세요.',
        orderQty: '발주 수량',
        expectedAmount: '예상 금액',
        arrivalNode: '도착 창고',
        selectArrivalNode: '도착 창고를 선택하세요.',
        selectedItemInfo: '선택 품목 정보',
        category: '카테고리',
        supplierCandidates: '협력사 후보',
        supplierCandidatesCount: (count: number) => `${count}곳`,
        cancel: '취소',
        submit: '등록',
        save: '저장',
        orderDetail: '발주 상세',
        basicInfo: '기본 정보',
        orderNumber: '발주 번호',
        targetSupplier: '발주 대상 협력사명',
        supplierStatus: '협력사 상태',
        orderStatus: '발주 상태',
        orderDate: '발주 날짜',
        expectedDueDate: '예상 납기일',
        totalAmount: '총 금액',
        memo: '메모',
        itemDetail: '품목 상세',
        item: '품목',
        confirmedQty: '확정 수량',
        confirmQtyInput: '확정 수량 입력',
        beforeAcceptInput: '수락 전 입력',
        linkedSubOrders: '연결된 서브발주',
        subOrderDetail: '서브발주 상세',
        noSubOrders: '연결된 서브발주가 없습니다.',
        reject: '반려',
        accept: '수락',
        cancelConfirmInput: '확정 입력 취소',
        acceptAfterConfirm: '확정 수량 입력 후 수락',
        createSubOrder: '서브발주 생성',
        editOrder: '발주 수정',
        cancelOrder: '발주 취소',
        editOrderDescription: '확인 대기 상태의 발주 메모와 품목 수량을 수정합니다.',
        loadingEdit: '발주 수정 정보를 불러오는 중입니다.',
        memoPlaceholder: '발주 메모를 입력하세요.',
        existingItems: '기존 품목',
        undoDelete: '삭제 취소',
        deleteItem: '품목 삭제',
        addItem: '품목 추가',
        addLine: '추가 행',
        newItem: '추가 품목',
        selectItemPlaceholder: '품목을 선택하세요.',
        createSubOrderTitle: '서브발주 등록',
        createSubOrderDescription: '선택한 부모 발주 기준으로 하위 협력사에 서브발주를 생성합니다.',
        baseOrder: '기준 발주',
        downstreamSupplier: '하위 협력사',
        selectDownstreamSupplier: '하위 협력사를 선택하세요.',
        subOrderItems: '서브발주 품목',
        subOrderQty: '서브발주 수량',
        subOrderDetailTitle: '서브발주 상세',
        loadingSubOrderDetail: '서브발주 상세 정보를 불러오는 중입니다.',
        subOrderNumber: '서브발주번호',
        parentOrderNumber: '부모 발주번호',
        issuerSupplier: '발행 협력사',
        receiverSupplier: '수신 협력사',
        moreItems: (count: number) => `외 ${count}건`,
        orderCountSummary: (count: number, amount: string) => `${count}건 / ${amount}`,
        selectedOrderFallback: '선택한 발주의 상세 정보를 확인합니다.',
        selectedSubOrderFallback: '선택한 서브발주의 상세 정보를 확인합니다.',
        previousPage: '이전',
        nextPage: '다음',
        columns: ['번호', '거래처', '품목', '수량', '총금액(원)', '발주일', '예상 납기일', '상태', '작업'],
        directionOptions: [
          { key: 'ALL' as const, label: '전체' },
          { key: 'ISSUED' as const, label: '발주' },
          { key: 'RECEIVED' as const, label: '수주' },
        ],
        tabOptions: [
          { key: 'ALL' as const, label: '전체' },
          { key: 'CREATED' as const, label: '확인 대기' },
          { key: 'PARTIALLY_CONFIRMED' as const, label: '부분 확정' },
          { key: 'CONFIRMED' as const, label: '확정' },
          { key: 'REJECTED' as const, label: '반려' },
          { key: 'CANCELLED' as const, label: '취소' },
          { key: 'COMPLETED' as const, label: '완료' },
        ],
        metrics: {
          totalOrders: '총 발주',
          buyerMeta: '메인 발주사 전체 발주',
          pending: '확인 대기',
          pendingMeta: '확인 대기 중인 발주',
          completed: '납기 완료',
          completedMeta: '완료 처리된 발주',
          totalAmount: '총금액(원)',
          amountMeta: '발주 기준 총금액(원)',
          issuedCount: '발주 수',
          receivedCount: '수주 수',
          totalAmountIssued: '총금액(원)',
        },
        supplierStatuses: {
          ACTIVE: '활성',
          INACTIVE: '비활성',
          SUSPENDED: '중지',
          TERMINATED: '종료',
        },
        orderStatuses: {
          CREATED: '확인 대기',
          PARTIALLY_CONFIRMED: '부분 확정',
          CONFIRMED: '확정',
          REJECTED: '반려',
          CANCELLED: '취소',
          COMPLETED: '완료',
          DELETED: '삭제',
        },
        messages: {
          loadOrdersFail: '주문 정보를 불러오지 못했습니다.',
          duplicateSubOrderMapping: '같은 상위 발주 품목과 하위 품목 조합은 중복 등록할 수 없습니다.',
          selectAtLeastOne: '검색 결과에서 발주할 품목을 1개 이상 선택하세요.',
          invalidOrderQty: '발주 수량은 0보다 커야 합니다.',
          invalidItemSupplierMapping: '품목과 협력사 매핑이 올바르지 않습니다.',
          itemAdded: '해당 품목이 추가되었습니다.',
          itemSearchFail: '품목 검색에 실패했습니다.',
          createSuccess: '발주 등록되었습니다.',
          createFail: '발주 등록에 실패했습니다.',
          loadDetailFail: '발주 상세 정보를 불러오지 못했습니다.',
          noConfirmItems: '확정할 품목이 없습니다.',
          confirmQtyRequired: (name: string) => `${name} 확정 수량을 입력하세요.`,
          confirmQtyNegative: (name: string) => `${name} 확정 수량은 0보다 작을 수 없습니다.`,
          confirmQtyTooLarge: (name: string) => `${name} 확정 수량은 발주 수량보다 클 수 없습니다.`,
          confirmAcceptQuestion: '입력한 확정 수량으로 수주를 수락하시겠습니까?',
          acceptSuccess: '수주를 수락했습니다.',
          acceptFail: '수주 수락에 실패했습니다.',
          rejectOrderQuestion: '이 발주를 반려하시겠습니까?',
          rejectOrderSuccess: '발주를 반려했습니다.',
          rejectOrderFail: '발주 반려에 실패했습니다.',
          cancelOrderQuestion: '이 발주를 취소하시겠습니까?',
          cancelOrderSuccess: '발주를 취소했습니다.',
          cancelOrderFail: '발주 취소에 실패했습니다.',
          loadEditFail: '발주 수정 정보를 불러오지 못했습니다.',
          editMinimumItem: '발주 품목은 최소 1개 이상 유지해야 합니다.',
          editExistingQtyPositive: '기존 품목 수량은 0보다 커야 합니다.',
          editSelectNewItem: '추가 품목을 선택하세요.',
          editNewQtyPositive: '추가 품목 수량은 0보다 커야 합니다.',
          editDuplicateNewItem: '동일한 추가 품목이 중복되었습니다.',
          editSuccess: '발주를 수정했습니다.',
          editFail: '발주 수정에 실패했습니다.',
          missingParentOrder: '부모 발주 정보가 없습니다.',
          selectDownstreamSupplier: '하위 협력사를 선택하세요.',
          selectSubOrderItems: '서브발주 품목을 1개 이상 선택하세요.',
          subOrderQtyPositive: '서브발주 수량은 0보다 커야 합니다.',
          subOrderCreateSuccess: '서브발주를 등록했습니다.',
          subOrderCreateFail: '서브발주 등록에 실패했습니다.',
          subOrderAcceptQuestion: '이 수주를 수락하시겠습니까?',
          subOrderAcceptSuccess: '수주를 수락했습니다.',
          subOrderAcceptFail: '수주 수락에 실패했습니다.',
          subOrderRejectQuestion: '이 서브발주를 반려하시겠습니까?',
          subOrderRejectSuccess: '서브발주를 반려했습니다.',
          subOrderRejectFail: '서브발주 반려에 실패했습니다.',
        },
      }
    : {
        pageEyebrow: 'Supply Operations / Purchase Orders',
        pageTitle: 'Purchase Orders',
        parentOrderSelect: 'Parent Order',
        mainOrderMode: 'Main Order',
        selectParentOrder: 'Selecting a parent order creates linked sub orders. Leaving it empty creates a main order.',
        parentOrderItem: 'Parent Order Item',
        selectParentOrderItem: 'Select the parent order item to link.',
        export: 'Export',
        refresh: 'Refresh',
        createOrder: 'New Order',
        queueTitle: 'Approval Queue',
        queueEmpty: 'No orders waiting for confirmation.',
        valueTitle: 'Category Amounts',
        valueEmpty: 'No category amount to display.',
        counterpartyTitle: 'Top Counterparties',
        counterpartyEmpty: 'No counterparty aggregate to display.',
        searchLabel: 'Search',
        searchPlaceholder: 'Search document no., counterparty, or item name.',
        tableTitle: 'Order Table',
        loadingOrders: 'Loading order data.',
        emptyOrders: 'No orders match the current conditions.',
        detail: 'Detail',
        loadingDetail: 'Loading order detail.',
        createTitle: 'Create Purchase Order',
        createDescription: 'Select categories and items, then assign suppliers and arrival nodes.',
        categorySearch: 'Category Search',
        itemSearch: 'Item Search',
        rootCategory: 'Root Category',
        secondCategory: 'Middle Category',
        thirdCategory: 'Leaf Category',
        itemSearchPlaceholder: 'Enter item name or item code.',
        uncategorized: 'Uncategorized',
        selectItem: 'Select Item',
        select: 'Select',
        emptyItems: '조건에 맞는 외부 등록 품목이 없습니다.',
        itemCapability: 'Item Capability',
        itemCode: 'Item Code',
        itemName: 'Item Name',
        supplier: 'Supplier',
        supplierColumn: 'Supplier',
        unit: 'Unit',
        unitPrice: 'Unit Price',
        unitPricePerUnit: '단가',
        remainingQty: '남은 수량',
        leadTime: 'Lead Time',
        partialConfirmation: 'Partial Confirmation',
        supplyType: 'Supply Type',
        monthlyCapacity: 'Monthly Capacity',
        minimumOrderQty: 'Minimum Order Qty',
        availableQty: 'Available Qty',
        spec: 'Spec',
        shelfLife: 'Shelf Life',
        days: 'days',
        all: 'All',
        searching: 'Searching',
        search: 'Search',
        close: 'Close',
        selectedItems: 'Selected Order Items',
        selectHint: 'Select items from the search results to create order lines below.',
        itemLine: 'Item Line',
        deleteLine: 'Delete Line',
        selectItemName: 'Select an item name.',
        selectSupplier: 'Select a supplier.',
        orderQty: 'Order Qty',
        expectedAmount: 'Expected Amount',
        arrivalNode: 'Arrival Warehouse',
        selectArrivalNode: 'Select an arrival warehouse.',
        selectedItemInfo: 'Selected Item Info',
        category: 'Category',
        supplierCandidates: 'Supplier Candidates',
        supplierCandidatesCount: (count: number) => `${count} candidates`,
        cancel: 'Cancel',
        submit: 'Submit',
        save: 'Save',
        orderDetail: 'Order Detail',
        basicInfo: 'Basic Info',
        orderNumber: 'Order Number',
        targetSupplier: 'Target Supplier',
        supplierStatus: 'Supplier Status',
        orderStatus: 'Order Status',
        orderDate: 'Order Date',
        expectedDueDate: 'Expected Due Date',
        totalAmount: 'Total Amount',
        memo: 'Memo',
        itemDetail: 'Item Detail',
        item: 'Item',
        confirmedQty: 'Confirmed Qty',
        confirmQtyInput: 'Confirm Quantity Input',
        beforeAcceptInput: 'Before Accept',
        linkedSubOrders: 'Linked Sub Orders',
        subOrderDetail: 'Sub Order Detail',
        noSubOrders: 'No linked sub orders.',
        reject: 'Reject',
        accept: 'Accept',
        cancelConfirmInput: 'Cancel Confirmation Input',
        acceptAfterConfirm: 'Accept After Quantity Confirmation',
        createSubOrder: 'Create Sub Order',
        editOrder: 'Edit Order',
        cancelOrder: 'Cancel Order',
        editOrderDescription: 'Edit memo and item quantities for an order waiting for confirmation.',
        loadingEdit: 'Loading order edit information.',
        memoPlaceholder: 'Enter order memo.',
        existingItems: 'Existing Items',
        undoDelete: 'Undo Delete',
        deleteItem: 'Delete Item',
        addItem: 'Add Item',
        addLine: 'Add Line',
        newItem: 'New Item',
        selectItemPlaceholder: 'Select an item.',
        createSubOrderTitle: 'Create Sub Order',
        createSubOrderDescription: 'Create a sub order for downstream suppliers from the selected parent order.',
        baseOrder: 'Base Order',
        downstreamSupplier: 'Downstream Supplier',
        selectDownstreamSupplier: 'Select a downstream supplier.',
        subOrderItems: 'Sub Order Items',
        subOrderQty: 'Sub Order Qty',
        subOrderDetailTitle: 'Sub Order Detail',
        loadingSubOrderDetail: 'Loading sub order detail.',
        subOrderNumber: 'Sub Order Number',
        parentOrderNumber: 'Parent Order Number',
        issuerSupplier: 'Issuer Supplier',
        receiverSupplier: 'Receiver Supplier',
        moreItems: (count: number) => `and ${count} more`,
        orderCountSummary: (count: number, amount: string) => `${count} orders / ${amount}`,
        selectedOrderFallback: 'Review the selected order detail.',
        selectedSubOrderFallback: 'Review the selected sub order detail.',
        previousPage: 'Previous',
        nextPage: 'Next',
        columns: ['No.', 'Counterparty', 'Item', 'Qty', 'Total Amount', 'Order Date', 'Expected Due Date', 'Status', 'Action'],
        directionOptions: [
          { key: 'ALL' as const, label: 'All' },
          { key: 'ISSUED' as const, label: 'Issued' },
          { key: 'RECEIVED' as const, label: 'Received' },
        ],
        tabOptions: [
          { key: 'ALL' as const, label: 'All' },
          { key: 'CREATED' as const, label: 'Pending' },
          { key: 'PARTIALLY_CONFIRMED' as const, label: 'Partially Confirmed' },
          { key: 'CONFIRMED' as const, label: 'Confirmed' },
          { key: 'REJECTED' as const, label: 'Rejected' },
          { key: 'CANCELLED' as const, label: 'Cancelled' },
          { key: 'COMPLETED' as const, label: 'Completed' },
        ],
        metrics: {
          totalOrders: 'Total Orders',
          buyerMeta: 'All main buyer orders',
          pending: 'Pending',
          pendingMeta: 'Orders waiting for confirmation',
          completed: 'Due Complete',
          completedMeta: 'Completed orders',
          totalAmount: 'Total Amount',
          amountMeta: 'Total issued amount',
          issuedCount: 'Issued',
          receivedCount: 'Received',
          totalAmountIssued: 'Total Amount',
        },
        supplierStatuses: {
          ACTIVE: 'Active',
          INACTIVE: 'Inactive',
          SUSPENDED: 'Suspended',
          TERMINATED: 'Terminated',
        },
        orderStatuses: {
          CREATED: 'Pending',
          PARTIALLY_CONFIRMED: 'Partially Confirmed',
          CONFIRMED: 'Confirmed',
          REJECTED: 'Rejected',
          CANCELLED: 'Cancelled',
          COMPLETED: 'Completed',
          DELETED: 'Deleted',
        },
        messages: {
          loadOrdersFail: 'Failed to load orders.',
          duplicateSubOrderMapping: 'The same parent-order-item and child-item mapping cannot be duplicated.',
          selectAtLeastOne: 'Select at least one item from the search results.',
          invalidOrderQty: 'Order quantity must be greater than 0.',
          invalidItemSupplierMapping: 'The item and supplier mapping is invalid.',
          itemAdded: '해당 품목이 추가되었습니다.',
          itemSearchFail: 'Failed to search items.',
          createSuccess: 'Purchase order created.',
          createFail: 'Failed to create purchase order.',
          loadDetailFail: 'Failed to load order detail.',
          noConfirmItems: 'No items to confirm.',
          confirmQtyRequired: (name: string) => `Enter confirmed quantity for ${name}.`,
          confirmQtyNegative: (name: string) => `Confirmed quantity for ${name} cannot be less than 0.`,
          confirmQtyTooLarge: (name: string) => `Confirmed quantity for ${name} cannot exceed ordered quantity.`,
          confirmAcceptQuestion: 'Accept this order with the entered confirmed quantities?',
          acceptSuccess: 'Order accepted.',
          acceptFail: 'Failed to accept order.',
          rejectOrderQuestion: 'Reject this order?',
          rejectOrderSuccess: 'Order rejected.',
          rejectOrderFail: '발주 반려에 실패했습니다.',
          cancelOrderQuestion: 'Cancel this order?',
          cancelOrderSuccess: 'Order cancelled.',
          cancelOrderFail: 'Failed to cancel order.',
          loadEditFail: 'Failed to load order edit information.',
          editMinimumItem: 'At least one order item must remain.',
          editExistingQtyPositive: 'Existing item quantity must be greater than 0.',
          editSelectNewItem: 'Select an item to add.',
          editNewQtyPositive: 'New item quantity must be greater than 0.',
          editDuplicateNewItem: 'The same new item is duplicated.',
          editSuccess: 'Order updated.',
          editFail: 'Failed to update order.',
          missingParentOrder: 'Parent order information is missing.',
          selectDownstreamSupplier: 'Select a downstream supplier.',
          selectSubOrderItems: 'Select at least one sub order item.',
          subOrderQtyPositive: 'Sub order quantity must be greater than 0.',
          subOrderCreateSuccess: 'Sub order created.',
          subOrderCreateFail: 'Failed to create sub order.',
          subOrderAcceptQuestion: 'Accept this received order?',
          subOrderAcceptSuccess: 'Received order accepted.',
          subOrderAcceptFail: 'Failed to accept received order.',
          subOrderRejectQuestion: 'Reject this sub order?',
          subOrderRejectSuccess: 'Sub order rejected.',
          subOrderRejectFail: '서브발주 반려에 실패했습니다.',
        },
      },
)

const TABLE_COLUMNS = computed(() => copy.value.columns)
const DIRECTION_OPTIONS = computed(() => copy.value.directionOptions)
const TAB_OPTIONS = computed(() => copy.value.tabOptions)

const purchaseOrders = ref<PurchaseOrderDetailResponseDto[]>([])
const issuedPurchaseOrders = ref<PurchaseOrderDetailResponseDto[]>([])
const receivedSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const sentSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const parentSubOrders = ref<SubPurchaseOrderResponseDto[]>([])
const supplierOptions = ref<SupplierListResponseDto[]>([])
const categoryOptions = ref<ItemCategoryResponseDto[]>([])
const itemMap = ref<Record<string, ItemResponseDto>>({})
const itemMediaMap = ref<Record<string, ItemMediaFile[]>>({})
const organizationMap = ref<Record<string, OrganizationListItem>>({})
const logisticsNodeOptions = ref<LogisticsNodeResponseDto[]>([])

const dashboardSummary = ref<OrderDashboardSummaryResponseDto | null>(null)
const directionFilter = ref<OrderDirectionFilter>('ALL')

const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const activeTabKey = ref<OrderTabKey>('ALL')
const ORDER_TABLE_PAGE_SIZE = 20
const orderTablePage = ref(0)

const orderDetailModalOpen = ref(false)
const detailLoading = ref(false)
const detailActionLoading = ref(false)
const detailErrorMessage = ref('')
const detailSuccessMessage = ref('')
const emptySelectedOrder = (): PurchaseOrderDetailResponseDto => ({
  poPublicId: '',
  poNumber: '',
  buyerOrganizationPublicId: '',
  supplierPublicId: '',
  supplierCode: '',
  supplierName: '',
  supplierStatus: 'ACTIVE',
  poStatus: 'CREATED',
  orderedAt: '',
  totalAmount: 0,
  currencyCode: 'KRW',
  createdAt: '',
  updatedAt: '',
  memo: null,
  createdByUserPublicId: '',
  items: [],
})

const hasSelectedOrder = ref(false)
const selectedOrder = ref<PurchaseOrderDetailResponseDto>(emptySelectedOrder())


const selectedParentCategoryId = ref('')
const selectedMiddleCategoryId = ref('')
const selectedLeafCategoryId = ref('')
const itemSearchKeyword = ref('')
const expandedItemPublicId = ref<string | null>(null)
const itemThumbPreview = ref({
  publicId: '',
  left: 0,
  top: 0,
  size: 360,
})

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
const isCreatePage = computed(() => route.name === 'orderCreate')

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
const emptySelectedSubOrder = (): SubPurchaseOrderResponseDto => ({
  subPoPublicId: '',
  subPoNumber: '',
  parentPoPublicId: '',
  parentPoNumber: '',
  issuerSupplierPublicId: '',
  issuerSupplierName: '',
  supplierPublicId: '',
  supplierCode: '',
  supplierName: '',
  supplierStatus: 'ACTIVE',
  totalAmount: 0,
  subPoStatus: 'CREATED',
  orderedAt: '',
  createdByUserPublicId: '',
  items: [],
})

const hasSelectedSubOrder = ref(false)
const selectedSubOrder = ref<SubPurchaseOrderResponseDto>(emptySelectedSubOrder())

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
    parentPoItemPublicId: '',
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

function itemMediaOf(item: ItemResponseDto | null | undefined) {
  if (!item) return []
  return itemMediaMap.value[item.publicId] ?? itemMediaFilesFromItem(item)
}

function itemThumbnailOf(item: ItemResponseDto | null | undefined) {
  return resolveItemThumbnailUrl(item, itemMediaOf(item))
}

function orderLineThumbnail(itemPublicId: string | null | undefined) {
  if (!itemPublicId) return ''
  return itemThumbnailOf(itemMap.value[itemPublicId])
}

async function loadItemMediaForItems(items: ItemResponseDto[]) {
  const unloadedItems = items.filter((item) => !itemMediaMap.value[item.publicId])
  if (!unloadedItems.length) return

  const entries = await Promise.all(
    unloadedItems.map(async (item) => [
      item.publicId,
      itemMediaFilesFromItem(item).length
        ? itemMediaFilesFromItem(item)
        : item.primaryMediaFilePublicId
          ? await getItemMedia(item.publicId)
          : [],
    ] as const),
  )

  itemMediaMap.value = {
    ...itemMediaMap.value,
    ...Object.fromEntries(entries),
  }
}


const createForm = ref({
  parentPoPublicId: '',
  categoryLevel1PublicId: '',
  categoryLevel2PublicId: '',
  categoryLevel3PublicId: '',
  itemKeyword: '',
  itemOptions: [] as ItemResponseDto[],
  searchResultPublicIds: [] as string[],
  detailItemPublicId: '',
  searchLoading: false,
  searchSubmitted: false,
  lines: [] as CreateOrderLineForm[],
})

const selectedCreateCategoryPublicId = computed(
  () =>
    createForm.value.categoryLevel3PublicId ||
    createForm.value.categoryLevel2PublicId ||
    createForm.value.categoryLevel1PublicId ||
    undefined,
)

const filteredSelectableItems = computed(() => {
  const keyword = createForm.value.itemKeyword.trim().toLowerCase()
  const selectedCategoryPublicId = selectedCreateCategoryPublicId.value

  if (!selectedCategoryPublicId && !keyword) return []

  return createForm.value.itemOptions
    .filter((item) => createForm.value.searchResultPublicIds.includes(item.publicId))
    .filter((item) => !isOwnRegisteredItem(item))
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

const routeParentPoPublicId = computed(() => {
  const value = route.query.parentPoPublicId
  return typeof value === 'string' ? value : ''
})

const isSubOrderCreateMode = computed(() => !!createForm.value.parentPoPublicId)

const creatableParentOrders = computed(() =>
  actor.isSupplierOrganization.value
    ? purchaseOrders.value.filter((order) =>
        ['PARTIALLY_CONFIRMED', 'CONFIRMED'].includes(order.poStatus),
      )
    : [],
)

const selectedCreateParentOrder = computed(
  () =>
    creatableParentOrders.value.find(
      (order) => order.poPublicId === createForm.value.parentPoPublicId,
    ) ?? null,
)

const selectedCreateParentOrderItems = computed<PurchaseOrderItemResponseDto[]>(() =>
  selectedCreateParentOrder.value?.items.filter(
    (item) => item.itemStatus !== 'DELETED' && item.itemStatus !== 'CANCELLED',
  ) ?? [],
)

function parentOrderLabel(order: PurchaseOrderDetailResponseDto) {
  return `${order.poNumber} / ${organizationDisplayName(order.buyerOrganizationPublicId, '거래처 미확인')} / ${formatDate(order.orderedAt)}`
}

function parentOrderItemLabel(item: PurchaseOrderItemResponseDto) {
  return `${item.itemCode} / ${itemDisplayName(item.itemName, item.itemCode)} / ${formatNumber(item.confirmedQty ?? item.orderedQty)} ${item.unit}`
}

function handleCreateParentOrderChange() {
  const availableParentItemIds = new Set(
    selectedCreateParentOrderItems.value.map((item) => item.poItemPublicId),
  )

  createForm.value.lines = createForm.value.lines.map((line) => ({
    ...line,
    parentPoItemPublicId: availableParentItemIds.has(line.parentPoItemPublicId)
      ? line.parentPoItemPublicId
      : '',
    arrivalLogisticsNodePublicId: isSubOrderCreateMode.value
      ? ''
      : line.arrivalLogisticsNodePublicId,
  }))
}

watch(
  () => routeParentPoPublicId.value,
  (parentPoPublicId) => {
    if (!isCreatePage.value) return
    createForm.value.parentPoPublicId = parentPoPublicId
    handleCreateParentOrderChange()
  },
  { immediate: true },
)


const selectableSuppliers = computed(() =>
  supplierOptions.value.filter((supplier) => !!supplierPublicIdOf(supplier)),
)

const downstreamSupplierOptions = computed(() =>
  selectableSuppliers.value.filter(
    (supplier) => supplierPublicIdOf(supplier) !== selectedOrder.value?.supplierPublicId,
  ),
)

const issuedTotalAmount = computed(() =>
  actor.isSupplierOrganization.value
    ? issuedPurchaseOrders.value.reduce((sum, order) => sum + toNumber(order.totalAmount), 0) +
      sentSubOrders.value.reduce((sum, subOrder) => sum + toNumber(subOrder.totalAmount), 0)
    : purchaseOrders.value.reduce((sum, order) => sum + toNumber(order.totalAmount), 0),
)

const dashboardMetrics = computed(() => {
  const summary = dashboardSummary.value

  if (actor.isBuyerOrganization.value) {
    return [
      { label: copy.value.metrics.totalOrders, value: formatNumber(summary?.issuedOrderCount ?? 0), meta: copy.value.metrics.buyerMeta, tone: 'nominal' },
      { label: copy.value.metrics.pending, value: formatNumber(summary?.pendingOrderCount ?? 0), meta: copy.value.metrics.pendingMeta, tone: 'warning' },
      { label: copy.value.metrics.completed, value: formatNumber(summary?.completedOrderCount ?? 0), meta: copy.value.metrics.completedMeta, tone: 'info' },
      { label: copy.value.metrics.totalAmount, value: formatThousandAmount(issuedTotalAmount.value), meta: copy.value.metrics.amountMeta, tone: 'critical' },
    ]
  }

  return [
    { label: copy.value.metrics.totalOrders, value: formatNumber(summary?.totalOrderCount ?? 0), tone: 'nominal' },
    { label: copy.value.metrics.issuedCount, value: formatNumber(summary?.issuedOrderCount ?? 0), tone: 'warning' },
    { label: copy.value.metrics.receivedCount, value: formatNumber(summary?.receivedOrderCount ?? 0), tone: 'info' },
    { label: copy.value.metrics.totalAmountIssued, value: formatThousandAmount(issuedTotalAmount.value), tone: 'critical' },
  ]
})

function getSubOrderItemLabel(subOrder: SubPurchaseOrderResponseDto) {
  if (!(subOrder.items ?? []).length) return '-'
  if ((subOrder.items ?? []).length === 1) return subOrder.items?.[0].itemName ?? '-'
  return `${subOrder.items?.[0].itemName ?? '-'} ${copy.value.moreItems((subOrder.items?.length ?? 1) - 1)}`
}

function getExpectedDueDate(items: Array<{ expectedDueDate: string | null }>) {
  const dates = items.map((item) => item.expectedDueDate).filter(Boolean).sort()
  return dates.length ? dates[dates.length - 1]! : null
}

const selectedOrderExpectedDueDate = computed(() =>
  getExpectedDueDate(selectedOrder.value.items),
)

const selectedSubOrderExpectedDueDate = computed(() =>
  getExpectedDueDate(selectedSubOrder.value.items ?? []),
)

const orderRows = computed<OrderDisplayRow[]>(() => {
  const receivedPoRows = purchaseOrders.value.map((order) => ({
    id: order.poPublicId,
    kind: 'PO' as const,
    direction: actor.isSupplierOrganization.value ? ('RECEIVED' as const) : ('ISSUED' as const),
    number: order.poNumber,
    counterpartyName: actor.isSupplierOrganization.value
      ? organizationDisplayName(order.buyerOrganizationPublicId, '거래처 미확인')
      : supplierDisplayName(order.supplierName),
    supplierStatus: order.supplierStatus,
    itemLabel: getOrderItemLabel(order),
    qtyLabel: getOrderQtyLabel(order),
    totalAmount: toNumber(order.totalAmount),
    currencyCode: order.currencyCode,
    orderedAt: order.orderedAt,
    expectedDueDate: getExpectedDueDate(order.items),
    status: order.poStatus,
  }))

  const issuedPoRows = actor.isSupplierOrganization.value
    ? issuedPurchaseOrders.value.map((order) => ({
        id: order.poPublicId,
        kind: 'PO' as const,
        direction: 'ISSUED' as const,
        number: order.poNumber,
        counterpartyName: order.supplierName,
        supplierStatus: order.supplierStatus,
        itemLabel: getOrderItemLabel(order),
        qtyLabel: getOrderQtyLabel(order),
        totalAmount: toNumber(order.totalAmount),
        currencyCode: order.currencyCode,
        orderedAt: order.orderedAt,
        expectedDueDate: getExpectedDueDate(order.items),
        status: order.poStatus,
      }))
    : []

  const subPoRows = actor.isSupplierOrganization.value
    ? sentSubOrders.value.map((subOrder) => ({
        id: subOrder.subPoPublicId,
        kind: 'SUB_PO' as const,
        direction: 'ISSUED' as const,
        number: subOrder.subPoNumber,
        counterpartyName: supplierDisplayName(subOrder.supplierName),
        supplierStatus: subOrder.supplierStatus,
        itemLabel:
          (subOrder.items?.length ?? 0) > 1
            ? `${itemDisplayName(subOrder.items?.[0].itemName, subOrder.items?.[0].itemCode)} ${copy.value.moreItems((subOrder.items?.length ?? 1) - 1)}`
            : itemDisplayName(subOrder.items?.[0].itemName, subOrder.items?.[0].itemCode),
        qtyLabel: formatNumber(
          (subOrder.items ?? []).reduce((sum, item) => sum + toNumber(item.orderedQty), 0),
        ),
        totalAmount: toNumber(subOrder.totalAmount),
        orderedAt: subOrder.orderedAt,
        expectedDueDate: getExpectedDueDate(subOrder.items ?? []),
        status: subOrder.subPoStatus,
      }))
    : []

  return [...receivedPoRows, ...issuedPoRows, ...subPoRows].sort(
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

const orderTableTotalPages = computed(() =>
  Math.max(Math.ceil(filteredOrders.value.length / ORDER_TABLE_PAGE_SIZE), 1),
)

const pagedOrders = computed(() => {
  const start = orderTablePage.value * ORDER_TABLE_PAGE_SIZE
  return filteredOrders.value.slice(start, start + ORDER_TABLE_PAGE_SIZE)
})

const canMoveOrderTablePrevious = computed(() => orderTablePage.value > 0 && !loading.value)
const canMoveOrderTableNext = computed(() =>
  !loading.value && orderTablePage.value < orderTableTotalPages.value - 1,
)

watch([search, activeTabKey, directionFilter], () => {
  orderTablePage.value = 0
})

watch(orderTableTotalPages, (totalPages) => {
  if (orderTablePage.value >= totalPages) {
    orderTablePage.value = totalPages - 1
  }
})

function moveOrderTablePage(offset: number) {
  const nextPage = Math.min(
    Math.max(orderTablePage.value + offset, 0),
    orderTableTotalPages.value - 1,
  )
  orderTablePage.value = nextPage
}

const queueEntries = computed<OrderQueueEntry[]>(() => {
  const pendingOrders = actor.isSupplierOrganization.value
    ? purchaseOrders.value
        .filter((order) => order.poStatus === 'CREATED')
        .map((order) => ({
          kind: 'PO' as const,
          publicId: order.poPublicId,
          number: order.poNumber,
          counterpartyName: organizationDisplayName(order.buyerOrganizationPublicId, '거래처 미확인'),
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
        const categoryName = itemCategoryPathOf(item.itemPublicId)
        totals.set(categoryName, (totals.get(categoryName) ?? 0) + toNumber(item.lineAmount))
      })
    })
  } else {
    purchaseOrders.value.forEach((order) => {
      order.items.forEach((item) => {
        const categoryName = itemCategoryPathOf(item.itemPublicId)
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
    value: formatThousandAmount(value),
    width: `${Math.max(16, Math.round((value / maxValue) * 100))}%`,
  }))
})

const topCounterpartyRows = computed(() => {
  const totals = new Map<string, { orderCount: number; totalAmount: number }>()

  if (actor.isSupplierOrganization.value) {
    sentSubOrders.value.forEach((subOrder) => {
      const supplierName = supplierDisplayName(subOrder.supplierName)
      const current = totals.get(supplierName) ?? { orderCount: 0, totalAmount: 0 }
      current.orderCount += 1
      current.totalAmount += toNumber(subOrder.totalAmount)
      totals.set(supplierName, current)
    })
  } else {
    purchaseOrders.value.forEach((order) => {
      const supplierName = supplierDisplayName(order.supplierName)
      const current = totals.get(supplierName) ?? { orderCount: 0, totalAmount: 0 }
      current.orderCount += 1
      current.totalAmount += toNumber(order.totalAmount)
      totals.set(supplierName, current)
    })
  }

  return Array.from(totals.entries())
    .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
    .slice(0, 4)
    .map(([name, summary]) => ({
      name,
        text: copy.value.orderCountSummary(
          summary.orderCount,
          formatThousandAmount(summary.totalAmount),
        ),
    }))
})

const selectedOrderDescription = computed(() =>
  hasSelectedOrder.value
    ? `${selectedOrder.value.poNumber} / ${supplierDisplayName(selectedOrder.value.supplierName)}`
    : copy.value.selectedOrderFallback,
)

const selectedSubOrderDescription = computed(() =>
  selectedSubOrder.value
    ? `${selectedSubOrder.value.subPoNumber} / ${supplierDisplayName(selectedSubOrder.value.supplierName)}`
    : copy.value.selectedSubOrderFallback,
)

watchEffect(() => {
  const nextActions: HeaderAction[] = [
    {
      key: 'orders-export',
      label: copy.value.export,
      tone: 'secondary',
      onClick: downloadOrdersCsv,
    },
    {
      key: 'orders-refresh',
      label: copy.value.refresh,
      tone: 'secondary',
      onClick: refreshOrdersPage,
    },
  ]

  if (actor.canCreatePurchaseOrder.value) {
    nextActions.push({
      key: 'orders-create',
      label: copy.value.createOrder,
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

  return new Intl.NumberFormat(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function formatPlainAmount(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return `${formatNumber(value)} 원`
}

function formatAmount(
  value: number | null | undefined,
  _currency: CurrencyCode | null | undefined,
) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  return formatPlainAmount(value)
}

function formatThousandAmount(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '-'
  const amount = Number(value)
  const units = [
    { threshold: 1_000_000_000, divisor: 1_000_000_000, label: '십억' },
    { threshold: 1_000_000, divisor: 1_000_000, label: '백만' },
    { threshold: 1_000, divisor: 1_000, label: '천' },
  ]
  const unit = units.find((candidate) => Math.abs(amount) >= candidate.threshold)

  if (!unit) return `${formatNumber(amount)} 원`

  const scaled = amount / unit.divisor
  const formatted = new Intl.NumberFormat(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    maximumFractionDigits: 1,
  }).format(scaled)

  return `${formatted} ${unit.label} 원`
}

function isPublicIdLike(value: string | null | undefined) {
  if (!value) return false
  return /^[A-Z]+_[0-9A-Z]+$/.test(value) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)
}

function displayNameOrFallback(value: string | null | undefined, fallback = '-') {
  const trimmed = value?.trim()
  if (!trimmed || isPublicIdLike(trimmed)) return fallback
  return trimmed
}

function organizationDisplayName(organizationPublicId: string, fallback = '-') {
  const organization = organizationMap.value[organizationPublicId]
  if (!organization) return fallback

  const englishName = organization.organizationEnglishName?.trim()
  return englishName
    ? `${organization.organizationName}(${englishName})`
    : organization.organizationName
}

function supplierDisplayName(supplierName: string | null | undefined) {
  return displayNameOrFallback(supplierName, '거래처 미확인')
}

function itemDisplayName(itemName: string | null | undefined, itemCode?: string | null) {
  return displayNameOrFallback(itemName, itemCode ? `품목 ${itemCode}` : '품목명 미확인')
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  const datePart = value.split('T')[0]
  const [year, month, day] = datePart.split('-')
  if (!year || !month || !day) return value

  return `${year}.${month}.${day}`
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US')
}

function openSubOrderDetailPage(subPoPublicId: string) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'sub-orders', publicId: subPoPublicId },
  })
}

function supplierStatusText(value: SupplierStatus) {
  return copy.value.supplierStatuses[value] ?? value
}

function poStatusText(value: PoStatus) {
  return copy.value.orderStatuses[value] ?? value
}

function subPoStatusText(value: SubPoStatus) {
  return copy.value.orderStatuses[value] ?? value
}

function supplierStatusTone(value: SupplierStatus) {
  if (value === 'ACTIVE') return 'is-success'
  if (value === 'SUSPENDED') return 'is-warning'
  if (value === 'TERMINATED') return 'is-critical'
  return 'is-muted'
}

function orderStatusTone(value: PoStatus | SubPoStatus) {
  if (value === 'PARTIALLY_CONFIRMED' || value === 'CONFIRMED' || value === 'COMPLETED') return 'is-success'
  if (value === 'CREATED') return 'is-warning'
  if (value === 'REJECTED' || value === 'CANCELLED' || value === 'DELETED') return 'is-critical'
  return 'is-muted'
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
  return `${order.items[0].itemName} ${copy.value.moreItems(order.items.length - 1)}`
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

async function loadOrganizationLookup() {
  try {
    const response = await getOrganizations({ page: 0, size: 500 })
    organizationMap.value = Object.fromEntries(
      response.content.map((organization) => [
        organization.organizationPublicId,
        organization,
      ]),
    )
  } catch {
    organizationMap.value = {}
  }
}

async function loadItemLookup(orders: PurchaseOrderDetailResponseDto[]) {
  await loadItemLookupByItemIds(
    orders.flatMap((order) => order.items.map((item) => item.itemPublicId)),
  )
}

async function loadItemLookupByItemIds(itemPublicIds: string[]) {
  const missingItemIds = Array.from(new Set(itemPublicIds)).filter(
    (itemPublicId) => !!itemPublicId && !itemMap.value[itemPublicId],
  )

  if (!missingItemIds.length) return

  const loadedItems = await Promise.all(
    missingItemIds.map((itemPublicId) => getItem(itemPublicId).catch(() => null)),
  )

  const nextMap = { ...itemMap.value }
  loadedItems.forEach((item) => {
    if (item) nextMap[item.publicId] = item
  })
  itemMap.value = nextMap
  await loadItemMediaForItems(loadedItems.filter((item): item is ItemResponseDto => !!item))
}


async function loadPurchaseOrders() {
  const loadDetails = async (viewType: 'BUYER' | 'SUPPLIER') => {
    const response = await getPurchaseOrders({
      viewType,
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

    return details
      .filter((order): order is PurchaseOrderDetailResponseDto => !!order)
      .sort((a, b) => new Date(b.orderedAt).getTime() - new Date(a.orderedAt).getTime())
  }

  if (actor.isSupplierOrganization.value) {
    const [receivedOrders, issuedOrders] = await Promise.all([
      loadDetails('SUPPLIER'),
      loadDetails('BUYER'),
    ])

    purchaseOrders.value = receivedOrders
    issuedPurchaseOrders.value = issuedOrders

    await loadItemLookup([...receivedOrders, ...issuedOrders])
    return
  }

  const orders = await loadDetails('BUYER')
  purchaseOrders.value = orders
  issuedPurchaseOrders.value = []

  await loadItemLookup(orders)
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

    await loadItemLookupByItemIds(
      receivedSubOrders.value.flatMap((subOrder) =>
        (subOrder.items ?? []).map((item) => item.itemPublicId),
      ),
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

    await loadItemLookupByItemIds(
      sentSubOrders.value.flatMap((subOrder) =>
        (subOrder.items ?? []).map((item) => item.itemPublicId),
      ),
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
    issuedPurchaseOrders.value = []
    receivedSubOrders.value = []
    sentSubOrders.value = []
    dashboardSummary.value = emptyDashboardSummary()
    errorMessage.value = normalizeErrorMessage(error, copy.value.messages.loadOrdersFail)
  } finally {
    loading.value = false
  }
}

function resetCreateOrderForm() {
  createErrorMessage.value = ''

  createForm.value = {
    parentPoPublicId: '',
    categoryLevel1PublicId: '',
    categoryLevel2PublicId: '',
    categoryLevel3PublicId: '',
    itemKeyword: '',
    itemOptions: [],
    searchResultPublicIds: [],
    detailItemPublicId: '',
    searchLoading: false,
    searchSubmitted: false,
    lines: [],
  }
}

function categoryPathOf(categoryPublicId: string | null | undefined) {
  if (!categoryPublicId) return copy.value.uncategorized

  const categoriesById = new Map(categoryOptions.value.map((category) => [category.publicId, category]))
  const names: string[] = []
  let current = categoriesById.get(categoryPublicId)

  while (current) {
    names.unshift(current.categoryName)
    current = current.parentCategoryPublicId
      ? categoriesById.get(current.parentCategoryPublicId)
      : undefined
  }

  return names.length ? names.join(' > ') : copy.value.uncategorized
}

function itemCategoryPathOf(itemPublicId: string) {
  return categoryPathOf(itemMap.value[itemPublicId]?.itemCategoryPublicId)
}



function openCreateOrderModal(parentPoPublicId = '') {
  resetCreateOrderForm()
  createForm.value.parentPoPublicId = parentPoPublicId

  const nextRoute = parentPoPublicId
    ? { name: 'orderCreate' as const, query: { parentPoPublicId } }
    : { name: 'orderCreate' as const }

  if (!isCreatePage.value) {
    router.push(nextRoute)
  } else {
    router.replace(nextRoute)
  }
}


function closeCreateOrderModal() {
  createModalOpen.value = false
  if (isCreatePage.value) {
    router.push({ name: 'ordersDesk' })
  }
}

function validateCreateOrderForm() {
  if (!createForm.value.lines.length) {
    return copy.value.messages.selectAtLeastOne
  }

  const duplicateSubOrderKeys = new Set<string>()

  for (const line of createForm.value.lines) {
    if (isSubOrderCreateMode.value && !line.parentPoItemPublicId) {
      return copy.value.selectParentOrderItem
    }
    if (!line.selectedItemName) return copy.value.selectItemName
    if (!line.selectedSupplierPublicId) return copy.value.selectSupplier
    if (!isSubOrderCreateMode.value && !line.arrivalLogisticsNodePublicId) {
      return copy.value.selectArrivalNode
    }
    if (!line.orderedQty || line.orderedQty <= 0) return copy.value.messages.invalidOrderQty

    const selectedItemPublicId = resolveSelectedItemPublicId(line)
    if (!selectedItemPublicId) return copy.value.messages.invalidItemSupplierMapping

    if (isSubOrderCreateMode.value) {
      const key = `${line.selectedSupplierPublicId}::${line.parentPoItemPublicId}::${selectedItemPublicId}`
      if (duplicateSubOrderKeys.has(key)) {
        return copy.value.messages.duplicateSubOrderMapping
      }
      duplicateSubOrderKeys.add(key)
    }
  }

  return ''
}


function unitPriceOf(item: ItemResponseDto | null | undefined) {
  const itemWithPrice = item as (ItemResponseDto & { unitPrice?: number | null }) | null | undefined
  return itemWithPrice?.unitPrice ?? null
}

function isOwnRegisteredItem(item: ItemResponseDto | null | undefined) {
  if (!item || !actor.organizationPublicId.value) return false
  return item.supplierOrganizationPublicId === actor.organizationPublicId.value
}

function itemUnitPriceLabel(item: ItemResponseDto | null | undefined) {
  const unitPrice = unitPriceOf(item)
  if (unitPrice == null) return '-'
  return `${formatPlainAmount(unitPrice)} / ${item?.unit ?? '-'}`
}

function itemRemainingQtyLabel(item: ItemResponseDto | null | undefined) {
  const availableQty = availableQtyOf(item)
  if (availableQty == null) return '-'
  return `${formatNumber(availableQty)} ${item?.unit ?? ''}`.trim()
}

function leadTimeDaysOf(item: ItemResponseDto | null | undefined) {
  const itemWithCapability = item as (ItemResponseDto & {
    leadTimeDays?: number | null
    capability?: { leadTimeDays?: number | null } | null
  }) | null | undefined
  return itemWithCapability?.capability?.leadTimeDays ?? itemWithCapability?.leadTimeDays ?? null
}

function partialConfirmationAllowedOf(item: ItemResponseDto | null | undefined) {
  const itemWithCapability = item as
    | (ItemResponseDto & { partialConfirmationAllowed?: boolean | null })
    | null
    | undefined

  return itemWithCapability?.partialConfirmationAllowed ?? null
}

function availableQtyOf(item: any) {
  if (!item) return null
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
    .filter((item) => !isOwnRegisteredItem(item))
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

function showItemThumbPreview(item: ItemResponseDto, event: MouseEvent | FocusEvent) {
  if (!itemThumbnailOf(item)) return

  const target = event.currentTarget as HTMLElement | null
  if (!target) return

  const rect = target.getBoundingClientRect()
  const margin = 16
  const gap = 18
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const size = Math.min(viewportWidth <= 768 ? 280 : 360, viewportWidth - margin * 2, viewportHeight - margin * 2)

  const rightLeft = rect.right + gap
  const leftLeft = rect.left - gap - size
  let left = rightLeft + size <= viewportWidth - margin ? rightLeft : leftLeft

  if (left < margin) {
    left = Math.min(Math.max(rect.left, margin), viewportWidth - size - margin)
  }

  let top = rect.top + rect.height / 2 - size / 2

  if (viewportWidth <= 768) {
    const belowTop = rect.bottom + 10
    const aboveTop = rect.top - 10 - size
    top = belowTop + size <= viewportHeight - margin ? belowTop : aboveTop
    left = Math.min(Math.max(rect.left, margin), viewportWidth - size - margin)
  }

  top = Math.min(Math.max(top, margin), viewportHeight - size - margin)

  itemThumbPreview.value = {
    publicId: item.publicId,
    left,
    top,
    size,
  }
}

function hideItemThumbPreview() {
  itemThumbPreview.value.publicId = ''
}

async function selectCreateSearchItem(item: ItemResponseDto) {
  const line = createEmptyOrderLine(item)
  createForm.value.lines.push(line)
  await dialog.alert(copy.value.messages.itemAdded)
}

function isCreateSearchItemSelected(item: ItemResponseDto) {
  return createForm.value.lines.some((line) => resolveSelectedItemPublicId(line) === item.publicId)
}

function toggleCreateSearchItem(item: ItemResponseDto, event: Event) {
  const checked = (event.target as HTMLInputElement).checked

  if (checked) {
    if (!isCreateSearchItemSelected(item)) {
      createForm.value.lines.push(createEmptyOrderLine(item))
    }
    return
  }

  createForm.value.lines = createForm.value.lines.filter(
    (line) => resolveSelectedItemPublicId(line) !== item.publicId,
  )
}

function handleCreateLineItemNameChange(line: CreateOrderLineForm) {
  line.selectedSupplierPublicId = ''
  line.selectedItemPublicId = ''
}

async function searchItemsForCreateOrder() {
  const keyword = createForm.value.itemKeyword.trim()

  try {
    createForm.value.searchLoading = true
    createForm.value.searchSubmitted = true
    createErrorMessage.value = ''
    createForm.value.detailItemPublicId = ''

    const response = await getItems({
      keyword: keyword || undefined,
      itemCategoryPublicId: selectedCreateCategoryPublicId.value,
      status: 'ACTIVE',
      page: 0,
      size: 100,
      sort: 'publicId,asc',
    })

    const detailedItems = await Promise.all(
      response.content.map((item) =>
        getItem(item.publicId).catch(() => item),
      ),
    )

    const nextOptions = new Map(createForm.value.itemOptions.map((item) => [item.publicId, item]))

    detailedItems.forEach((item) => {
      nextOptions.set(item.publicId, item)
    })

    createForm.value.itemOptions = Array.from(nextOptions.values())
    createForm.value.searchResultPublicIds = detailedItems.map((item) => item.publicId)
    await loadItemMediaForItems(detailedItems)
  } catch (error) {
    createForm.value.searchResultPublicIds = []
    createErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.itemSearchFail)
  } finally {
    createForm.value.searchLoading = false
  }
}

function supplierOptionsOf(line: CreateOrderLineForm) {
  const selectedItemName = line.selectedItemName || selectedCreateLineItem(line)?.itemName
  if (!selectedItemName) return []

  return createForm.value.itemOptions
    .filter((item) => item.itemName === selectedItemName)
    .map((item) => ({
      supplierPublicId: item.supplierPublicId,
      supplierName: item.supplierName,
      itemPublicId: item.publicId,
      unitPrice: unitPriceOf(item),
    }))
    .sort((a, b) => (a.supplierName ?? '').localeCompare(b.supplierName ?? '', 'ko-KR'))
}

function itemNameOptionsOf() {
  return Array.from(new Set(createForm.value.itemOptions.map((item) => item.itemName))).sort(
    (a, b) => a.localeCompare(b, 'ko-KR'),
  )
}


function handleCreateLineSupplierChange(line: CreateOrderLineForm) {
  const supplierItem = supplierOptionsOf(line).find(
    (option) => option.supplierPublicId === line.selectedSupplierPublicId,
  )

  line.selectedItemPublicId = supplierItem?.itemPublicId ?? ''
}


function selectedCreateLineItem(line: CreateOrderLineForm) {
  return (
    createForm.value.itemOptions.find((item) => item.publicId === line.selectedItemPublicId) ??
    createForm.value.itemOptions.find(
      (item) =>
        item.itemName === line.selectedItemName &&
        item.supplierPublicId === line.selectedSupplierPublicId,
    ) ??
    null
  )
}

function resolveSelectedItemPublicId(line: CreateOrderLineForm) {
  return selectedCreateLineItem(line)?.publicId ?? ''
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

function isCreateLineQtyOutOfRange(line: CreateOrderLineForm) {
  if (line.orderedQty == null) return false

  const qty = Number(line.orderedQty)
  if (!Number.isFinite(qty)) return false

  const item = selectedCreateLineItem(line)
  const minQty = Number(moqOf(item))
  const maxQty = Number(availableQtyOf(item))
  const hasMinQty = Number.isFinite(minQty)
  const hasMaxQty = Number.isFinite(maxQty)

  return (hasMinQty && qty < minQty) || (hasMaxQty && qty > maxQty)
}

function removeCreateOrderLine(lineId: number) {
  createForm.value.lines = createForm.value.lines.filter((line) => line.id !== lineId)
}

async function submitCreateOrder() {
  const validationMessage = validateCreateOrderForm()
  if (validationMessage) {
    createErrorMessage.value = ''
    await dialog.alert(validationMessage)
    return
  }

  try {
    createLoading.value = true
    createErrorMessage.value = ''

    if (!isSubOrderCreateMode.value) {
      await createPurchaseOrdersBatch({
        lines: createForm.value.lines.map((line) => ({
          supplierPublicId: line.selectedSupplierPublicId,
          itemPublicId: resolveSelectedItemPublicId(line),
          orderedQty: Number(line.orderedQty),
          arrivalLogisticsNodePublicId: line.arrivalLogisticsNodePublicId,
        })),
      })
    } else {
      await createSubPurchaseOrdersBatch({
        parentPoPublicId: createForm.value.parentPoPublicId,
        lines: createForm.value.lines.map((line) => ({
          supplierPublicId: line.selectedSupplierPublicId,
          parentPoItemPublicId: line.parentPoItemPublicId,
          itemPublicId: resolveSelectedItemPublicId(line),
          orderedQty: Number(line.orderedQty),
          arrivalLogisticsNodePublicId: line.arrivalLogisticsNodePublicId,
        })),
      })
    }

    await dialog.alert(
      isSubOrderCreateMode.value
        ? copy.value.messages.subOrderCreateSuccess
        : copy.value.messages.createSuccess,
    )
    closeCreateOrderModal()
    await loadOrderDashboard()
  } catch (error) {
    createErrorMessage.value = normalizeErrorMessage(
      error,
      isSubOrderCreateMode.value
        ? copy.value.messages.subOrderCreateFail
        : copy.value.messages.createFail,
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
    hasSelectedOrder.value = false
    selectedOrder.value = emptySelectedOrder()
    parentSubOrders.value = []

    const detail = await getPurchaseOrder(order.poPublicId)
    selectedOrder.value = detail
    hasSelectedOrder.value = true

    await loadItemLookup([detail])
    await loadParentSubOrders(detail.poPublicId)
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(
      error,
      copy.value.messages.loadDetailFail,
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

function openOrderDetailPage(poPublicId: string) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'orders', publicId: poPublicId },
  })
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
  hasSelectedOrder.value = false
  selectedOrder.value = emptySelectedOrder()
  parentSubOrders.value = []
}

async function refreshSelectedOrder() {
  if (!selectedOrder.value) return

  const refreshed = await getPurchaseOrder(selectedOrder.value.poPublicId)
  selectedOrder.value = refreshed

  await loadItemLookup([refreshed])
  await loadParentSubOrders(refreshed.poPublicId)
}

function isOrderIssuedByCurrentOrganization(order: PurchaseOrderDetailResponseDto | null) {
  return !!order && order.buyerOrganizationPublicId === actor.organizationPublicId.value
}

function canSupplierRespondOrder(order: PurchaseOrderDetailResponseDto | null) {
  return (
    actor.isSupplierOrganization.value &&
    !isOrderIssuedByCurrentOrganization(order) &&
    order?.poStatus === 'CREATED'
  )
}

function canBuyerEditOrder(order: PurchaseOrderDetailResponseDto | null) {
  return (
    (actor.canManagePurchaseOrdersAsBuyer.value || isOrderIssuedByCurrentOrganization(order)) &&
    order?.poStatus === 'CREATED'
  )
}

function canBuyerCancelOrder(order: PurchaseOrderDetailResponseDto | null) {
  return (
    (actor.canManagePurchaseOrdersAsBuyer.value || isOrderIssuedByCurrentOrganization(order)) &&
    order?.poStatus === 'CREATED'
  )
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
    return copy.value.messages.noConfirmItems
  }

  for (const line of confirmLines.value) {
    if (line.confirmedQty == null) {
      return copy.value.messages.confirmQtyRequired(line.itemName)
    }

    const confirmedQty = Number(line.confirmedQty)
    const orderedQty = Number(line.orderedQty)

    if (confirmedQty < 0) {
      return copy.value.messages.confirmQtyNegative(line.itemName)
    }

    if (confirmedQty > orderedQty) {
      return copy.value.messages.confirmQtyTooLarge(line.itemName)
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

  if (!(await dialog.confirm(copy.value.messages.confirmAcceptQuestion))) return

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

    await afterOrderMutation(copy.value.messages.acceptSuccess)
  } catch (error) {
    confirmErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.acceptFail)
  } finally {
    detailActionLoading.value = false
  }
}

async function submitRejectOrder() {
  if (!selectedOrder.value) return
  if (!(await dialog.confirm(copy.value.messages.rejectOrderQuestion))) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await rejectPurchaseOrder(selectedOrder.value.poPublicId)
    await afterOrderMutation(copy.value.messages.rejectOrderSuccess)
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.rejectOrderFail)
  } finally {
    detailActionLoading.value = false
  }
}

async function submitCancelOrder() {
  if (!selectedOrder.value) return
  if (!(await dialog.confirm(copy.value.messages.cancelOrderQuestion))) return

  try {
    detailActionLoading.value = true
    detailErrorMessage.value = ''
    detailSuccessMessage.value = ''

    await changePurchaseOrderStatus(selectedOrder.value.poPublicId, {
      poStatus: 'CANCELLED',
    })

    await afterOrderMutation(copy.value.messages.cancelOrderSuccess)
  } catch (error) {
    detailErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.cancelOrderFail)
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
    sort: 'publicId,asc',
  })

  editAvailableItems.value = response.content
    .slice()
    .sort((a, b) => a.itemName.localeCompare(b.itemName, 'ko-KR'))
  await loadItemMediaForItems(editAvailableItems.value)
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
    hasSelectedOrder.value = true

    await loadEditableSupplierItems(detail.supplierPublicId)
    resetEditOrderForm(detail)
  } catch (error) {
    editOrderErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.loadEditFail)
  } finally {
    editOrderLoading.value = false
  }
}

const canOpenCreateOrder = computed(
  () => actor.canCreatePurchaseOrder.value || actor.isSupplierOrganization.value,
)

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
    return copy.value.messages.editMinimumItem
  }

  for (const line of keptExistingLines) {
    if (!line.orderedQty || line.orderedQty <= 0) {
      return copy.value.messages.editExistingQtyPositive
    }
  }

  const selectedNewItemIds = new Set<string>()
  for (const line of newLines) {
    if (!line.itemPublicId) return copy.value.messages.editSelectNewItem
    if (!line.orderedQty || line.orderedQty <= 0) return copy.value.messages.editNewQtyPositive
    if (selectedNewItemIds.has(line.itemPublicId)) return copy.value.messages.editDuplicateNewItem
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
    await afterOrderMutation(copy.value.messages.editSuccess)
  } catch (error) {
    editOrderErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.editFail)
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
  openCreateOrderModal(selectedOrder.value.poPublicId)
}

function closeCreateSubOrderModal() {
  subOrderModalOpen.value = false
  subOrderCreateErrorMessage.value = ''
}

function validateSubOrderForm() {
  if (!selectedOrder.value) return copy.value.messages.missingParentOrder
  if (!subOrderForm.value.supplierPublicId) return copy.value.messages.selectDownstreamSupplier

  const selectedLines = subOrderForm.value.lines.filter((line) => line.selected)

  if (!selectedLines.length) return copy.value.messages.selectSubOrderItems

  for (const line of selectedLines) {
    if (!line.orderedQty || line.orderedQty <= 0) {
      return copy.value.messages.subOrderQtyPositive
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
    detailSuccessMessage.value = copy.value.messages.subOrderCreateSuccess
  } catch (error) {
    subOrderCreateErrorMessage.value = normalizeErrorMessage(
      error,
      copy.value.messages.subOrderCreateFail,
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
    hasSelectedSubOrder.value = false
    selectedSubOrder.value = emptySelectedSubOrder()
    selectedSubOrderDirection.value = direction ?? inferSubOrderDirection(subPoPublicId)

    const detail = await getSubPurchaseOrder(subPoPublicId)
    selectedSubOrder.value = detail
    hasSelectedSubOrder.value = true
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
  hasSelectedSubOrder.value = false
  selectedSubOrder.value = emptySelectedSubOrder()
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
  if (!(await dialog.confirm(copy.value.messages.subOrderAcceptQuestion))) return

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

    await afterSubOrderMutation(copy.value.messages.subOrderAcceptSuccess)
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(error, copy.value.messages.subOrderAcceptFail)
  } finally {
    subOrderActionLoading.value = false
  }
}

async function submitRejectSubOrder() {
  if (!selectedSubOrder.value) return
  if (!(await dialog.confirm(copy.value.messages.subOrderRejectQuestion))) return

  try {
    subOrderActionLoading.value = true
    subOrderDetailErrorMessage.value = ''
    subOrderSuccessMessage.value = ''

    await rejectSubPurchaseOrder(selectedSubOrder.value.subPoPublicId)
    await afterSubOrderMutation(copy.value.messages.subOrderRejectSuccess)
  } catch (error) {
    subOrderDetailErrorMessage.value = normalizeErrorMessage(
      error,
      copy.value.messages.subOrderRejectFail,
    )
  } finally {
    subOrderActionLoading.value = false
  }
}

function downloadOrdersCsv() {
  if (!filteredOrders.value.length) return

  const rows = [
    TABLE_COLUMNS.value,
    ...filteredOrders.value.map((order) => [
      order.number,
      order.counterpartyName,
      order.itemLabel,
      order.qtyLabel,
      formatThousandAmount(order.totalAmount),
      formatDate(order.orderedAt),
      formatDate(order.expectedDueDate),
      order.kind === 'PO'
        ? poStatusText(order.status as PoStatus)
        : subPoStatusText(order.status as SubPoStatus),
      copy.value.detail,
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

async function refreshOrdersPage() {
  await Promise.all([
    loadOrderDashboard(),
    loadOrganizationLookup(),
  ])
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

onMounted(async () => {
  resetCreateOrderForm()
  await Promise.all([
    loadOrderDashboard(),
    loadOrganizationLookup(),
    loadSupplierOptions(),
    loadCategoryOptions(),
    loadLogisticsNodeOptions(),
  ])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section v-if="!isCreatePage" class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ copy.pageEyebrow }}</div>
        <h2 class="terminal-page__title">{{ copy.pageTitle }}</h2>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="downloadOrdersCsv">
          {{ copy.export }}
        </button>
        <button class="page-button page-button--secondary" type="button" @click="refreshOrdersPage">
          {{ copy.refresh }}
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="!canOpenCreateOrder"
          @click="openCreateOrderModal()"
        >
          {{ copy.createOrder }}
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
            <div class="page-panel__eyebrow">확인 대기</div>
            <h3>{{ copy.queueTitle }}</h3>
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
                  ? openOrderDetailPage(queueEntry.publicId)
                  : openSubOrderDetail(queueEntry.publicId, 'RECEIVED')
              "
            >
              <span class="page-feed__label">{{ queueEntry.number }}</span>
              <strong class="page-feed__text">{{ queueEntry.counterpartyName }}</strong>
              <span class="orders-page__queue-subtext">{{ queueEntry.itemLabel }}</span>
            </button>
          </div>
        </div>

        <p v-else class="orders-page__empty">{{ copy.queueEmpty }}</p>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">금액</div>
            <h3>{{ copy.valueTitle }}</h3>
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

        <p v-else class="orders-page__empty">{{ copy.valueEmpty }}</p>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">거래처</div>
            <h3>{{ copy.counterpartyTitle }}</h3>
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

        <p v-else class="orders-page__empty">{{ copy.counterpartyEmpty }}</p>
      </article>
    </section>

    <section class="terminal-page__content orders-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search orders-page__search-field">
            <span
              v-if="!search"
              class="material-symbols-outlined orders-page__search-icon"
              aria-hidden="true"
            >
              search
            </span>
            <input
              v-model="search"
              type="text"
              placeholder=""
              :aria-label="copy.searchPlaceholder"
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

            <label class="orders-page__status-select">
              <select v-model="activeTabKey" :aria-label="copy.orderStatus">
                <option
                  v-for="tab in TAB_OPTIONS"
                  :key="tab.key"
                  :value="tab.key"
                >
                  {{ tab.label }}
                </option>
              </select>
            </label>
          </div>


        </section>
                 

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">운영</div>
              <h3>{{ copy.tableTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredOrders.length }}</span>
          </div>

          <div class="page-table terminal-page__table orders-page__table is-nine-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in TABLE_COLUMNS" :key="column">{{ column }}</span>
            </div>

            <p v-if="errorMessage" class="terminal-page__table-message is-error">{{ errorMessage }}</p>
            <p v-else-if="loading" class="terminal-page__table-message">{{ copy.loadingOrders }}</p>
            <p v-else-if="!filteredOrders.length" class="terminal-page__table-message">
              {{ copy.emptyOrders }}
            </p>

            <template v-else>
              <div
                v-for="(order, orderIndex) in pagedOrders"
                :key="`${order.kind}-${order.id}`"
                class="page-table__row"
              >
                <span>{{ orderTablePage * ORDER_TABLE_PAGE_SIZE + orderIndex + 1 }}</span>
                <span>{{ order.counterpartyName }}</span>
                <span>{{ order.itemLabel }}</span>
                <span>{{ order.qtyLabel }}</span>
                <span>{{ formatThousandAmount(order.totalAmount) }}</span>
                <span>{{ formatDate(order.orderedAt) }}</span>
                <span>{{ formatDate(order.expectedDueDate) }}</span>
                <span>
                  <span :class="['page-status-chip', 'orders-page__order-status-chip', orderStatusTone(order.status)]">
                    {{
                      order.kind === 'PO'
                        ? poStatusText(order.status as PoStatus)
                        : subPoStatusText(order.status as SubPoStatus)
                    }}
                  </span>
                </span>
                <span class="action-cell">
                  <button
                    class="page-button page-button--secondary"
                    type="button"
                    @click="
                      order.kind === 'PO'
                        ? openOrderDetailPage(order.id)
                        : openSubOrderDetailPage(order.id)
                    "
                  >
                    {{ copy.detail }}
                  </button>
                </span>
              </div>
            </template>
          </div>

          <nav v-if="orderTableTotalPages > 1" class="risk-rules-pagination orders-page__pagination" aria-label="order table pagination">
            <button
              class="page-button page-button--secondary risk-rules-pagination__button"
              type="button"
              :disabled="!canMoveOrderTablePrevious"
              @click="moveOrderTablePage(-1)"
            >
              {{ copy.previousPage }}
            </button>
            <span class="risk-rules-pagination__status">
              {{ orderTablePage + 1 }} / {{ orderTableTotalPages }}
            </span>
            <button
              class="page-button page-button--secondary risk-rules-pagination__button"
              type="button"
              :disabled="!canMoveOrderTableNext"
              @click="moveOrderTablePage(1)"
            >
              {{ copy.nextPage }}
            </button>
          </nav>
        </article>
      </div>

      
    </section>
  </section>

  <div :class="['orders-page__create-host', { 'orders-page__create-host--page': isCreatePage }]">
  <BaseModal
    :model-value="isCreatePage || createModalOpen"
    :title="copy.createTitle"
    :description="copy.createDescription"
    :presentation="isCreatePage ? 'page' : 'modal'"
    size="lg"
    hide-dividers
    :hide-close-button="isCreatePage"
    @update:model-value="(value) => { if (!value) closeCreateOrderModal() }"
  >
    <div class="orders-page__form orders-page__create-modal-body">

      <section
        v-if="actor.isSupplierOrganization"
        class="orders-page__detail-section orders-page__create-section orders-page__create-section--parent"
      >
      

        <div class="orders-page__section-head">
          <strong>{{ copy.parentOrderSelect }}</strong>
          <span class="page-panel__chip">
            {{ isSubOrderCreateMode ? copy.createSubOrderTitle : copy.createTitle }}
          </span>
        </div>

        <label class="orders-page__form-field orders-page__form-field--wide orders-page__parent-order-field">
          <select
            v-model="createForm.parentPoPublicId"
            :disabled="createLoading"
            :aria-label="copy.parentOrderSelect"
            @change="handleCreateParentOrderChange"
          >
            <option value="">{{ copy.mainOrderMode }}</option>
            <option
              v-for="order in creatableParentOrders"
              :key="order.poPublicId"
              :value="order.poPublicId"
            >
              {{ parentOrderLabel(order) }}
            </option>
          </select>
          <small class="orders-page__sub-text">{{ copy.selectParentOrder }}</small>
        </label>
      </section>

      <section class="orders-page__detail-section orders-page__create-section orders-page__create-section--search">
        <div class="orders-page__section-head">
          <strong>{{ copy.categorySearch }}</strong>
        </div>

        <div class="orders-page__create-filter-grid">
          <label class="orders-page__form-field">
            <span>{{ copy.rootCategory }}</span>
            <select
              v-model="createForm.categoryLevel1PublicId"
              :disabled="createForm.searchLoading"
              @change="handleCreateRootCategoryChange"
            >
              <option value="">{{ copy.all }}</option>
              <option
                v-for="category in createRootCategories"
                :key="category.publicId"
                :value="category.publicId"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </label>

          <label
            class="orders-page__form-field"
            :class="{ 'orders-page__form-field--mobile-deferred': !createForm.categoryLevel1PublicId }"
          >
            <span>{{ copy.secondCategory }}</span>
            <select
              v-model="createForm.categoryLevel2PublicId"
              :disabled="createForm.searchLoading || !createSecondCategories.length"
              @change="handleCreateSecondCategoryChange"
            >
              <option value="">{{ copy.all }}</option>
              <option
                v-for="category in createSecondCategories"
                :key="category.publicId"
                :value="category.publicId"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </label>

          <label
            class="orders-page__form-field"
            :class="{ 'orders-page__form-field--mobile-deferred': !createForm.categoryLevel2PublicId }"
          >
            <span>{{ copy.thirdCategory }}</span>
            <select
              v-model="createForm.categoryLevel3PublicId"
              :disabled="createForm.searchLoading || !createThirdCategories.length"
              @change="handleCreateThirdCategoryChange"
            >
              <option value="">{{ copy.all }}</option>
              <option
                v-for="category in createThirdCategories"
                :key="category.publicId"
                :value="category.publicId"
              >
                {{ category.categoryName }}
              </option>
            </select>
          </label>
        </div>
      </section>

      <section class="orders-page__detail-section orders-page__create-section orders-page__create-section--item-search">
        <div class="orders-page__section-head">
          <strong>{{ copy.itemSearch }}</strong>
        </div>

        <label class="orders-page__form-field orders-page__form-field--wide">
          <div class="orders-page__field-with-button">
            <span
              v-if="!createForm.itemKeyword"
              class="material-symbols-outlined orders-page__search-icon"
              aria-hidden="true"
            >
              search
            </span>
            <input
              v-model="createForm.itemKeyword"
              type="text"
              placeholder=""
              :aria-label="copy.itemSearchPlaceholder"
              :disabled="createForm.searchLoading"
              @input="handleCreateKeywordInput"
              @keyup.enter="searchItemsForCreateOrder"
            />
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="createForm.searchLoading"
              @click="searchItemsForCreateOrder"
              :aria-label="copy.search"
            >
              <span class="material-symbols-outlined" aria-hidden="true">
                {{ createForm.searchLoading ? 'hourglass_top' : 'search' }}
              </span>
            </button>
          </div>
        </label>

        <div v-if="filteredSelectableItems.length" class="orders-page__item-picker-list">
          <div class="orders-page__item-picker-head" aria-hidden="true">
            <span></span>
            <span>{{ copy.itemName }}</span>
            <span>{{ copy.category }}</span>
            <span>{{ copy.supplierColumn }}</span>
            <span>{{ copy.unit }}</span>
            <span>{{ copy.detail }}</span>
            <span>{{ copy.select }}</span>
          </div>

          <div
            v-for="item in filteredSelectableItems"
            :key="item.publicId"
            class="orders-page__item-picker-row-wrap"
          >
            <div class="orders-page__item-picker-row">
              <span
                class="orders-page__item-thumb"
                tabindex="0"
                @mouseenter="showItemThumbPreview(item, $event)"
                @focus="showItemThumbPreview(item, $event)"
                @mouseleave="hideItemThumbPreview"
                @blur="hideItemThumbPreview"
              >
                <template v-if="itemThumbnailOf(item)">
                  <img :src="itemThumbnailOf(item)" :alt="itemDisplayName(item.itemName, item.itemCode)" />
                  <span
                    v-if="itemThumbPreview.publicId === item.publicId"
                    class="orders-page__item-thumb-preview"
                    :style="{
                      left: `${itemThumbPreview.left}px`,
                      top: `${itemThumbPreview.top}px`,
                      width: `${itemThumbPreview.size}px`,
                      height: `${itemThumbPreview.size}px`,
                    }"
                    aria-hidden="true"
                  >
                    <img :src="itemThumbnailOf(item)" :alt="itemDisplayName(item.itemName, item.itemCode)" />
                  </span>
                </template>
                <span v-else class="material-symbols-outlined">inventory_2</span>
              </span>
              <span>{{ item.itemCode }}</span>
              <span class="orders-page__item-picker-main">
                <strong>{{ itemDisplayName(item.itemName, item.itemCode) }}</strong>
                <small>
                  {{ copy.unitPricePerUnit }} {{ itemUnitPriceLabel(item) }} ·
                  {{ copy.remainingQty }} {{ itemRemainingQtyLabel(item) }}
                </small>
              </span>
              <span>{{ item.categoryName || copy.uncategorized }}</span>
              <span>{{ supplierDisplayName(item.supplierName) }}</span>
              <span>{{ item.unit }}</span>

              <div class="orders-page__item-picker-actions">
                <button
                  class="page-button page-button--secondary"
                  type="button"
                  @click="expandedItemPublicId = expandedItemPublicId === item.publicId ? null : item.publicId"
                >
                  {{ expandedItemPublicId === item.publicId ? copy.close : copy.detail }}
                </button>

                <label
                  class="orders-page__item-picker-check"
                  :aria-label="copy.selectItem"
                >
                  <input
                    type="checkbox"
                    :checked="isCreateSearchItemSelected(item)"
                    @change="toggleCreateSearchItem(item, $event)"
                  />
                </label>
              </div>
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
                리드타임
                <strong>{{ leadTimeDaysOf(item) == null ? '-' : `${formatNumber(leadTimeDaysOf(item))}일` }}</strong>
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
                주문 가능 수량 (재고)
                <strong>{{ formatNumber(availableQtyOf(item)) }}</strong>
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

        <p v-else-if="createForm.searchSubmitted && !createForm.searchLoading" class="orders-page__empty">
          {{ copy.emptyItems }}
        </p>
      </section>


      <section class="orders-page__detail-section orders-page__create-section orders-page__create-section--selected">
        <div class="orders-page__section-head">
          <strong>{{ copy.selectedItems }}</strong>
          <span class="page-panel__chip">{{ createForm.lines.length }}</span>
        </div>

        <p v-if="!createForm.lines.length" class="orders-page__empty">
          {{ copy.selectHint }}
        </p>

        <div v-else class="orders-page__line-list">
          <div
            v-for="line in createForm.lines"
            :key="line.id"
            class="orders-page__line-card"
          >
            <div class="orders-page__line-head">
              <span class="orders-page__line-title">
                <span class="orders-page__item-thumb" aria-hidden="true">
                  <img
                    v-if="itemThumbnailOf(selectedCreateLineItem(line))"
                    :src="itemThumbnailOf(selectedCreateLineItem(line))"
                    :alt="line.selectedItemName || copy.itemLine"
                  />
                  <span v-else class="material-symbols-outlined">inventory_2</span>
                </span>
                <span class="orders-page__line-summary">
                  <strong>{{ selectedCreateLineItem(line)?.itemName || line.selectedItemName || copy.itemLine }}</strong>
                  <small>{{ supplierDisplayName(selectedCreateLineItem(line)?.supplierName) }}</small>
                </span>
              </span>
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="removeCreateOrderLine(line.id)"
              >
                {{ copy.deleteLine }}
              </button>
            </div>

            <div class="orders-page__line-grid">
              <label v-if="isSubOrderCreateMode" class="orders-page__form-field">
                <span>{{ copy.parentOrderItem }}</span>
                <select v-model="line.parentPoItemPublicId">
                  <option value="">{{ copy.selectParentOrderItem }}</option>
                  <option
                    v-for="item in selectedCreateParentOrderItems"
                    :key="item.poItemPublicId"
                    :value="item.poItemPublicId"
                  >
                    {{ parentOrderItemLabel(item) }}
                  </option>
                </select>
              </label>
              <label class="orders-page__form-field">
                <span>{{ copy.orderQty }}</span>
                <span class="orders-page__quantity-input-wrap">
                  <input
                    v-model.number="line.orderedQty"
                    :class="{ 'is-quantity-invalid': isCreateLineQtyOutOfRange(line) }"
                    :aria-invalid="isCreateLineQtyOutOfRange(line)"
                    type="number"
                    min="1"
                    step="1"
                  />
                  <strong class="orders-page__quantity-unit">
                    {{ selectedCreateLineItem(line)?.unit || '-' }}
                  </strong>
                </span>
              </label>

              <label class="orders-page__form-field">
                <span>{{ copy.unitPrice }}</span>
                <input
                  :value="formatPlainAmount(selectedCreateLineUnitPrice(line))"
                  type="text"
                  disabled
                />
              </label>

              <label class="orders-page__form-field">
                <span>{{ copy.expectedAmount }}</span>
                <input
                  :value="formatPlainAmount(selectedCreateLineAmount(line))"
                  type="text"
                  disabled
                />
              </label>

              <label class="orders-page__form-field">
                <span>{{ copy.arrivalNode }}</span>
                <select v-model="line.arrivalLogisticsNodePublicId">
                  <option value="">{{ copy.selectArrivalNode }}</option>
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
              <strong class="orders-page__item-preview-title">{{ copy.selectedItemInfo }}</strong>

              <div class="orders-page__item-preview-grid">
                <div>
                  <span>{{ copy.itemCode }}</span>
                  <strong>{{ selectedCreateLineItem(line)?.itemCode }}</strong>
                </div>
                <div>
                  <span>{{ copy.category }}</span>
                  <strong>{{ selectedCreateLineItem(line)?.categoryName }}</strong>
                </div>
                <div>
                  <span>{{ copy.leadTime }}</span>
                  <strong>{{ leadTimeDaysOf(selectedCreateLineItem(line)) ?? '-' }}{{ copy.days }}</strong>
                </div>
                <div>
                  <span>{{ copy.expectedDueDate }}</span>
                  <strong>{{ expectedDueDateText(selectedCreateLineItem(line)) }}</strong>
                </div>
                <div>
                  <span>{{ copy.monthlyCapacity }}</span>
                  <strong>{{ formatNumber(monthlyCapacityOf(selectedCreateLineItem(line))) }}</strong>
                </div>
                <div>
                  <span>{{ copy.availableQty }}</span>
                  <strong>{{ formatNumber(availableQtyOf(selectedCreateLineItem(line))) }}</strong>
                </div>
                <div>
                  <span>{{ copy.minimumOrderQty }}</span>
                  <strong>{{ formatNumber(moqOf(selectedCreateLineItem(line))) }}</strong>
                </div>
                <div>
                  <span>{{ copy.partialConfirmation }}</span>
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
          {{ copy.cancel }}
        </button>

        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="createLoading"
          @click="submitCreateOrder"
        >
          {{ copy.submit }}
        </button>
      </div>
    </div>
  </BaseModal>
  </div>

  <BaseModal
    v-model="orderDetailModalOpen"
    :title="copy.orderDetail"
    :description="selectedOrderDescription"
    size="lg"
    @close="closeOrderDetailModal"
  >
    <div v-if="detailLoading" class="orders-page__empty">{{ copy.loadingDetail }}</div>
    <p v-else-if="detailErrorMessage" class="orders-page__error">{{ detailErrorMessage }}</p>

    <div v-else-if="hasSelectedOrder" class="orders-page__detail-stack">
      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>{{ copy.basicInfo }}</strong>
        </div>

        <div class="orders-page__detail-grid">
          <div class="orders-page__detail-item">
            <span>{{ copy.orderNumber }}</span>
            <strong>{{ selectedOrder.poNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.targetSupplier }}</span>
            <strong>{{ supplierDisplayName(selectedOrder.supplierName) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.supplierStatus }}</span>
            <strong>{{ supplierStatusText(selectedOrder.supplierStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.orderStatus }}</span>
            <strong>{{ poStatusText(selectedOrder.poStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.orderDate }}</span>
            <strong>{{ formatDateTime(selectedOrder.orderedAt) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.expectedDueDate }}</span>
            <strong>{{ formatDate(selectedOrderExpectedDueDate) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.totalAmount }}</span>
            <strong>{{ formatAmount(selectedOrder.totalAmount, selectedOrder.currencyCode) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.memo }}</span>
            <strong>{{ selectedOrder.memo || '-' }}</strong>
          </div>
        </div>
      </section>

      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>{{ copy.itemDetail }}</strong>
        </div>

        <div class="orders-page__detail-table">
          <div class="orders-page__detail-row orders-page__detail-row--head">
            <span>{{ copy.item }}</span>
            <span>{{ copy.orderQty }}</span>
            <span>{{ copy.confirmedQty }}</span>
            <span>{{ copy.unit }}</span>
            <span>{{ copy.expectedDueDate }}</span>
            <span>{{ copy.totalAmount }}</span>
          </div>

          <div
            v-for="item in selectedOrder.items"
            :key="item.poItemPublicId"
            class="orders-page__detail-row"
          >
            <span>
              <span class="orders-page__detail-item-title">
                <span class="orders-page__item-thumb" aria-hidden="true">
                  <img v-if="orderLineThumbnail(item.itemPublicId)" :src="orderLineThumbnail(item.itemPublicId)" :alt="itemDisplayName(item.itemName, item.itemCode)" />
                  <span v-else class="material-symbols-outlined">inventory_2</span>
                </span>
                <span>
                  <strong>{{ itemDisplayName(item.itemName, item.itemCode) }}</strong><br />
                  <small>{{ item.itemCode }}</small>
                </span>
              </span>
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
    <strong>{{ copy.confirmQtyInput }}</strong>
    <span class="page-panel__chip">{{ copy.beforeAcceptInput }}</span>
  </div>

  <div class="orders-page__line-list">
    <div
      v-for="line in confirmLines"
      :key="line.poItemPublicId"
      class="orders-page__line-card"
    >
      <div class="orders-page__line-head">
        <strong>{{ itemDisplayName(line.itemName, line.itemCode) }}</strong>
        <span class="orders-page__sub-text">{{ line.itemCode }}</span>
      </div>

      <div class="orders-page__line-grid">
        <label class="orders-page__form-field">
          <span>{{ copy.orderQty }}</span>
          <input
            :value="`${formatNumber(line.orderedQty)} ${line.unit}`"
            type="text"
            disabled
          />
        </label>

        <label class="orders-page__form-field">
          <span>{{ copy.confirmedQty }}</span>
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
          <strong>{{ copy.linkedSubOrders }}</strong>
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
                {{ supplierDisplayName(subOrder.supplierName) }} / {{ subPoStatusText(subOrder.subPoStatus) }}
              </p>
            </div>

            <div class="orders-page__suborder-actions">
              <span>{{ formatPlainAmount(subOrder.totalAmount) }}</span>
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="openSubOrderDetail(subOrder.subPoPublicId, 'ISSUED')"
              >
                {{ copy.subOrderDetail }}
              </button>
            </div>
          </div>
        </div>

        <p v-else class="orders-page__empty">{{ copy.noSubOrders }}</p>
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
          {{ copy.reject }}
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder) && !confirmMode"
          class="page-button page-button--primary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitAcceptOrder"
        >
          {{ copy.accept }}
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder) && confirmMode"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="cancelConfirmOrder"
        >
          {{ copy.cancelConfirmInput }}
        </button>

        <button
          v-if="canSupplierRespondOrder(selectedOrder) && confirmMode"
          class="page-button page-button--primary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitConfirmOrder"
        >
          {{ copy.acceptAfterConfirm }}
        </button>

        <button
          v-if="canCreateSubOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="openCreateSubOrderModal"
        >
          {{ copy.createSubOrder }}
        </button>

        <button
          v-if="canBuyerEditOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="openEditOrderModal"
        >
          {{ copy.editOrder }}
        </button>

        <button
          v-if="canBuyerCancelOrder(selectedOrder)"
          class="page-button page-button--secondary"
          type="button"
          :disabled="detailActionLoading"
          @click="submitCancelOrder"
        >
          {{ copy.cancelOrder }}
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="editOrderModalOpen"
    :title="copy.editOrder"
    :description="copy.editOrderDescription"
    size="lg"
    @close="closeEditOrderModal"
  >
    <div v-if="editOrderLoading" class="orders-page__empty">{{ copy.loadingEdit }}</div>

    <div v-else class="orders-page__form">
      <label class="orders-page__form-field">
        <span>{{ copy.memo }}</span>
        <input v-model="editForm.memo" type="text" :placeholder="copy.memoPlaceholder" />
      </label>

      <div class="orders-page__section-head">
        <strong>{{ copy.existingItems }}</strong>
      </div>

      <div class="orders-page__line-list">
        <div
          v-for="line in editForm.existingLines"
          :key="line.poItemPublicId"
          :class="['orders-page__line-card', { 'is-deleted': line.deleted }]"
        >
          <div class="orders-page__line-head">
            <strong>{{ line.itemCode }} / {{ itemDisplayName(line.itemName, line.itemCode) }}</strong>
            <button
              class="page-button page-button--secondary"
              type="button"
              @click="line.deleted = !line.deleted"
            >
              {{ line.deleted ? copy.undoDelete : copy.deleteItem }}
            </button>
          </div>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>{{ copy.unit }}</span>
              <input :value="line.unit" type="text" disabled />
            </label>

            <label class="orders-page__form-field">
              <span>{{ copy.orderQty }}</span>
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
        <strong>{{ copy.addItem }}</strong>
        <button class="page-button page-button--secondary" type="button" @click="addEditOrderLine">
          {{ copy.addLine }}
        </button>
      </div>

      <div v-if="editForm.newLines.length" class="orders-page__line-list">
        <div
          v-for="line in editForm.newLines"
          :key="line.key"
          class="orders-page__line-card"
        >
          <div class="orders-page__line-head">
            <strong>{{ copy.newItem }}</strong>
            <button
              class="page-button page-button--secondary"
              type="button"
              @click="removeEditOrderNewLine(line.key)"
            >
              {{ copy.deleteLine }}
            </button>
          </div>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>{{ copy.item }}</span>
              <select v-model="line.itemPublicId">
                <option value="">{{ copy.selectItemPlaceholder }}</option>
                <option
                  v-for="item in editSelectableItems(line.key)"
                  :key="item.publicId"
                  :value="item.publicId"
                >
                  {{ item.itemCode }} / {{ itemDisplayName(item.itemName, item.itemCode) }}
                </option>
              </select>
            </label>

            <label class="orders-page__form-field">
              <span>{{ copy.orderQty }}</span>
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
          {{ copy.cancel }}
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="editOrderSaving"
          @click="submitEditOrder"
        >
          {{ copy.save }}
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="subOrderModalOpen"
    :title="copy.createSubOrderTitle"
    :description="copy.createSubOrderDescription"
    size="lg"
    @close="closeCreateSubOrderModal"
  >
    <div v-if="hasSelectedOrder" class="orders-page__form">
      <div class="orders-page__form-grid">
        <label class="orders-page__form-field">
          <span>{{ copy.baseOrder }}</span>
          <input :value="selectedOrder.poNumber" type="text" disabled />
        </label>

        <label class="orders-page__form-field">
          <span>{{ copy.downstreamSupplier }}</span>
          <select v-model="subOrderForm.supplierPublicId">
            <option value="">{{ copy.selectDownstreamSupplier }}</option>
            <option
              v-for="supplier in downstreamSupplierOptions"
              :key="supplierPublicIdOf(supplier)"
              :value="supplierPublicIdOf(supplier)"
            >
              {{ supplierDisplayName(supplier.supplierName) }}
            </option>
          </select>
        </label>
      </div>

      <div class="orders-page__section-head">
        <strong>{{ copy.subOrderItems }}</strong>
      </div>

      <div class="orders-page__line-list">
        <div
          v-for="line in subOrderForm.lines"
          :key="`${line.parentPoItemPublicId}-${line.itemPublicId}`"
          class="orders-page__line-card"
        >
          <label class="orders-page__checkbox">
            <input v-model="line.selected" type="checkbox" />
            <span>{{ line.itemCode }} / {{ itemDisplayName(line.itemName, line.itemCode) }} ({{ line.unit }})</span>
          </label>

          <div class="orders-page__line-grid">
            <label class="orders-page__form-field">
              <span>{{ copy.subOrderQty }}</span>
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
          {{ copy.cancel }}
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="subOrderCreateLoading"
          @click="submitCreateSubOrder"
        >
          {{ copy.submit }}
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
    v-model="subOrderDetailModalOpen"
    :title="copy.subOrderDetailTitle"
    :description="selectedSubOrderDescription"
    size="lg"
    @close="closeSubOrderDetailModal"
  >
    <div v-if="subOrderDetailLoading" class="orders-page__empty">
      {{ copy.loadingSubOrderDetail }}
    </div>
    <p v-else-if="subOrderDetailErrorMessage" class="orders-page__error">
      {{ subOrderDetailErrorMessage }}
    </p>

    <div v-else-if="hasSelectedSubOrder" class="orders-page__detail-stack">
      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>{{ copy.basicInfo }}</strong>
        </div>

        <div class="orders-page__detail-grid">
          <div class="orders-page__detail-item">
            <span>{{ copy.subOrderNumber }}</span>
            <strong>{{ selectedSubOrder.subPoNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.parentOrderNumber }}</span>
            <strong>{{ selectedSubOrder.parentPoNumber }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.issuerSupplier }}</span>
            <strong>{{ selectedSubOrder.issuerSupplierName }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.receiverSupplier }}</span>
            <strong>{{ supplierDisplayName(selectedSubOrder.supplierName) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.supplierStatus }}</span>
            <strong>{{ supplierStatusText(selectedSubOrder.supplierStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.orderStatus }}</span>
            <strong>{{ subPoStatusText(selectedSubOrder.subPoStatus) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.orderDate }}</span>
            <strong>{{ formatDateTime(selectedSubOrder.orderedAt) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.expectedDueDate }}</span>
            <strong>{{ formatDate(selectedSubOrderExpectedDueDate) }}</strong>
          </div>
          <div class="orders-page__detail-item">
            <span>{{ copy.totalAmount }}</span>
            <strong>{{ formatPlainAmount(selectedSubOrder.totalAmount) }}</strong>
          </div>
        </div>
      </section>

      <section class="orders-page__detail-section">
        <div class="orders-page__section-head">
          <strong>{{ copy.itemDetail }}</strong>
        </div>

        <div class="orders-page__detail-table">
          <div class="orders-page__detail-row orders-page__detail-row--head">
            <span>{{ copy.item }}</span>
            <span>{{ copy.orderQty }}</span>
            <span>{{ copy.confirmedQty }}</span>
            <span>{{ copy.unit }}</span>
            <span>{{ copy.expectedDueDate }}</span>
            <span>{{ copy.totalAmount }}</span>
          </div>

          <div
            v-for="item in selectedSubOrder.items ?? []"
            :key="`${item.parentPoItemPublicId}-${item.itemPublicId}`"
            class="orders-page__detail-row"
          >
            <span>
              <span class="orders-page__detail-item-title">
                <span class="orders-page__item-thumb" aria-hidden="true">
                  <img v-if="orderLineThumbnail(item.itemPublicId)" :src="orderLineThumbnail(item.itemPublicId)" :alt="itemDisplayName(item.itemName, item.itemCode)" />
                  <span v-else class="material-symbols-outlined">inventory_2</span>
                </span>
                <span>
                  <strong>{{ itemDisplayName(item.itemName, item.itemCode) }}</strong><br />
                  <small>{{ item.itemCode }}</small>
                </span>
              </span>
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
          {{ copy.reject }}
        </button>

        <button
          v-if="canRespondSubOrder(selectedSubOrder)"
          class="page-button page-button--primary"
          type="button"
          :disabled="subOrderActionLoading"
          @click="submitAcceptSubOrder"
        >
          {{ copy.accept }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>
