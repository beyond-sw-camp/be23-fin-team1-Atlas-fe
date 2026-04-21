import { apiClient } from './http'
import type { PageResponse } from './item'

// 서브발주 화면에서 그대로 사용하는 백엔드 enum 타입들입니다.
export type SubPoStatus =
  | 'CREATED'
  | 'ACCEPTED'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'DELETED'

export type SubPurchaseOrderLineStatus =
  | 'OPEN'
  | 'PARTIALLY_CONFIRMED'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DELETED'

export interface CreateSubPurchaseOrderItemRequestDto {
  parentPoItemPublicId: string
  itemPublicId: string
  orderedQty: number
  requiredDate?: string
  unitPrice: number
}

export interface CreateSubPurchaseOrderRequestDto {
  subPoNumber: string
  parentPoPublicId: string
  supplierPublicId: string
  dueDate: string
  items: CreateSubPurchaseOrderItemRequestDto[]
}

export interface ConfirmSubPurchaseOrderItemRequestDto {
  confirmedQty: number
}

export interface GetSubPurchaseOrdersByParentPoParams {
  parentPoPublicId: string
  page?: number
  size?: number
}

export interface GetReceivedSubPurchaseOrdersParams {
  page?: number
  size?: number
}

export interface SubPurchaseOrderItemResponseDto {
  parentPoItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  unit: string
  unitPrice: number
  lineAmount: number
  orderedQty: number
  confirmedQty: number | null
  requiredDate: string | null
  lineStatus: SubPurchaseOrderLineStatus
  createdAt: string
  updatedAt: string
}

export interface SubPurchaseOrderResponseDto {
  subPoPublicId: string
  subPoNumber: string
  parentPoPublicId: string
  parentPoNumber: string
  issuerSupplierPublicId: string
  issuerSupplierName: string
  supplierPublicId: string
  supplierCode: string
  supplierName: string
  totalAmount: number
  subPoStatus: SubPoStatus
  orderedAt: string
  dueDate: string
  createdByUserPublicId: string
  items: SubPurchaseOrderItemResponseDto[] | null
}

// 서브발주 등록
export async function createSubPurchaseOrder(data: CreateSubPurchaseOrderRequestDto) {
  const response = await apiClient.post<SubPurchaseOrderResponseDto>(
    '/api/supply/sub-purchase-orders',
    data,
  )
  return response.data
}

// 부모 발주 기준 서브발주 목록 조회
export async function getSubPurchaseOrdersByParentPo(
  params: GetSubPurchaseOrdersByParentPoParams,
) {
  const response = await apiClient.get<PageResponse<SubPurchaseOrderResponseDto>>(
    '/api/supply/sub-purchase-orders',
    { params },
  )
  return response.data
}

// 내가 받은 서브발주 목록 조회
export async function getReceivedSubPurchaseOrders(
  params: GetReceivedSubPurchaseOrdersParams = {},
) {
  const response = await apiClient.get<PageResponse<SubPurchaseOrderResponseDto>>(
    '/api/supply/sub-purchase-orders/received',
    { params },
  )
  return response.data
}

// 서브발주 상세 조회
export async function getSubPurchaseOrder(subPoPublicId: string) {
  const response = await apiClient.get<SubPurchaseOrderResponseDto>(
    `/api/supply/sub-purchase-orders/${subPoPublicId}`,
  )
  return response.data
}

// 수신 협력사 측 서브발주 수락
export async function acceptSubPurchaseOrder(subPoPublicId: string) {
  const response = await apiClient.post<SubPurchaseOrderResponseDto>(
    `/api/supply/sub-purchase-orders/${subPoPublicId}/accept`,
  )
  return response.data
}

// 수신 협력사 측 서브발주 반려
export async function rejectSubPurchaseOrder(subPoPublicId: string) {
  const response = await apiClient.post<SubPurchaseOrderResponseDto>(
    `/api/supply/sub-purchase-orders/${subPoPublicId}/reject`,
  )
  return response.data
}

// 수신 협력사 측 서브발주 품목 확정 수량 입력
export async function confirmSubPurchaseOrderItem(
  subPoPublicId: string,
  parentPoItemPublicId: string,
  itemPublicId: string,
  data: ConfirmSubPurchaseOrderItemRequestDto,
) {
  const response = await apiClient.patch<SubPurchaseOrderResponseDto>(
    `/api/supply/sub-purchase-orders/${subPoPublicId}/items/${parentPoItemPublicId}/${itemPublicId}/confirm`,
    data,
  )
  return response.data
}
