import { apiClient } from './http'
import type { PageResponse } from './item'

// 발주 화면에서 그대로 사용하는 백엔드 enum 타입들입니다.
export type PurchaseOrderViewType = 'BUYER' | 'SUPPLIER'
export type PoStatus =
  | 'CREATED'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DELETED'

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED'
export type CurrencyCode = 'KRW' | 'USD' | 'EUR' | 'JPY'
export type PurchaseOrderItemStatus =
  | 'OPEN'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DELETED'

export interface GetPurchaseOrdersParams {
  viewType: PurchaseOrderViewType
  supplierPublicId?: string
  keyword?: string
  poStatus?: PoStatus
  page?: number
  size?: number
}

export interface CreatePurchaseOrderItemRequestDto {
  itemPublicId: string
  orderedQty: number
  unitPrice: number
  requiredDate?: string
}

export interface CreatePurchaseOrderRequestDto {
  poNumber: string
  supplierPublicId: string
  dueDate: string
  currencyCode?: CurrencyCode
  memo?: string
  items: CreatePurchaseOrderItemRequestDto[]
}

export interface ConfirmPurchaseOrderItemRequestDto {
  confirmedQty: number
}

export interface ChangePurchaseOrderStatusRequestDto {
  poStatus: Extract<PoStatus, 'CANCELLED' | 'COMPLETED'>
}


export interface OrderDashboardSummaryResponseDto {
  totalOrderCount: number
  pendingOrderCount: number
  completedOrderCount: number
  issuedOrderCount: number
  receivedOrderCount: number
  totalAmount: number
}

export interface CreatePurchaseOrderBatchLineRequestDto {
  supplierPublicId: string
  itemPublicId: string
  orderedQty: number
}

export interface CreatePurchaseOrderBatchRequestDto {
  currencyCode?: CurrencyCode
  memo?: string
  lines: CreatePurchaseOrderBatchLineRequestDto[]
}
export interface PurchaseOrderSummaryResponseDto {
  poPublicId: string
  poNumber: string
  buyerOrganizationPublicId: string
  supplierPublicId: string
  supplierCode: string
  supplierName: string
  supplierStatus: SupplierStatus
  poStatus: PoStatus
  orderedAt: string
  totalAmount: number
  currencyCode: CurrencyCode
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderItemResponseDto {
  poItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  unit: string
  orderedQty: number
  confirmedQty: number | null
  unitPrice: number
  lineAmount: number
  itemStatus: PurchaseOrderItemStatus
  expectedDueDate: string | null
  leadTimeDays: number | null
  partialConfirmationAllowed: boolean | null
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderDetailResponseDto extends PurchaseOrderSummaryResponseDto {
  memo: string | null
  createdByUserPublicId: string
  items: PurchaseOrderItemResponseDto[]
}

export async function getOrderDashboardSummary() {
  const response = await apiClient.get<OrderDashboardSummaryResponseDto>(
    '/api/supply/purchase-order/dashboard',
  )
  return response.data
}

export async function createPurchaseOrdersBatch(data: CreatePurchaseOrderBatchRequestDto) {
  const response = await apiClient.post<PurchaseOrderDetailResponseDto[]>(
    '/api/supply/purchase-order/batch',
    data,
  )
  return response.data
}

// 발주 목록 조회
export async function getPurchaseOrders(params: GetPurchaseOrdersParams) {
  const response = await apiClient.get<PageResponse<PurchaseOrderSummaryResponseDto>>(
    '/api/supply/purchase-order',
    { params },
  )
  return response.data
}

// 발주 상세 조회
export async function getPurchaseOrder(poPublicId: string) {
  const response = await apiClient.get<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}`,
  )
  return response.data
}

// 발주 등록
export async function createPurchaseOrder(data: CreatePurchaseOrderRequestDto) {
  const response = await apiClient.post<PurchaseOrderDetailResponseDto>(
    '/api/supply/purchase-order',
    data,
  )
  return response.data
}

// 협력사 측 발주 수락
export async function acceptPurchaseOrder(poPublicId: string) {
  const response = await apiClient.post<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}/accept`,
  )
  return response.data
}

// 협력사 측 발주 반려
export async function rejectPurchaseOrder(poPublicId: string) {
  const response = await apiClient.post<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}/reject`,
  )
  return response.data
}

// 협력사 측 발주 품목 확정 수량 입력
export async function confirmPurchaseOrderItem(
  poPublicId: string,
  poItemPublicId: string,
  data: ConfirmPurchaseOrderItemRequestDto,
) {
  const response = await apiClient.patch<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}/items/${poItemPublicId}/confirm`,
    data,
  )
  return response.data
}

// 구매사 측 발주 상태 변경(CANCELLED / COMPLETED)
export async function changePurchaseOrderStatus(
  poPublicId: string,
  data: ChangePurchaseOrderStatusRequestDto,
) {
  const response = await apiClient.patch<PurchaseOrderDetailResponseDto>(
    `/api/supply/purchase-order/${poPublicId}/status`,
    data,
  )
  return response.data
}
