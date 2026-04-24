import { apiClient } from './http'

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED'
export type SupplierRelationStatus = 'REQUESTED' | 'ACTIVE' | 'PAUSED' | 'ENDED'
export type SupplierItemQualityGrade = 'AAA' | 'AA_PLUS' | 'AA' | 'A_PLUS' | 'A' | 'B' | 'C'

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty?: boolean
}

export interface SupplierResponseDto {
  publicId: string
  organizationPublicId: string
  supplierCode: string
  supplierName: string
  supplierStatus: SupplierStatus
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  createdAt: string
  updatedAt: string
}

export interface SupplierListResponseDto {
  supplierCode: string
  supplierName: string
  onTimeRate: number | null
  supplierScore: number | null
  qualityScore: number | null
  purchaseOrderCount: number | null
  totalAmount: number | null
  cumulativeAmount: number | null
  relationStatus: SupplierRelationStatus | null
  detail: SupplierResponseDto | null
}

export interface CreateSupplierRequestDto {
  organizationPublicId: string
  supplierCode: string
  supplierName: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

export interface UpdateSupplierRequestDto {
  supplierCode: string
  supplierName: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

export interface GetSuppliersParams {
  // 백엔드 SupplierSearchDto 와 맞춘 검색 파라미터입니다.
  keyword?: string
  supplierStatus?: SupplierStatus
  organizationPublicId?: string
  itemPublicId?: string
  page?: number
  size?: number
}

export interface SupplierItemCapabilityResponseDto {
  supplierPublicId: string
  supplierCode: string
  supplierName: string
  itemPublicId: string
  itemCode: string
  itemName: string
  leadTimeDays: number | null
  monthlyCapacity: number | null
  availableQty: number | null
  moq: number | null
  qualityGrade: SupplierItemQualityGrade | null
  unitPriceHint: number | null
  validFrom: string | null
  createdAt: string
}

// 협력사 목록을 기본 응답 형태로 조회합니다.
export async function getSuppliers(
  params: GetSuppliersParams = {},
): Promise<PageResponse<SupplierListResponseDto>> {
  const response = await apiClient.get<PageResponse<SupplierListResponseDto>>(
    '/api/supply/suppliers',
    {
      params,
    },
  )
  return response.data
}

// 협력사 단건 조회
export async function getSupplier(supplierPublicId: string) {
  const response = await apiClient.get<SupplierResponseDto>(`/api/supply/suppliers/${supplierPublicId}`)
  return response.data
}

// 내 협력사 정보 조회 (SUPPLIER 전용)
export async function getMySupplier() {
  const response = await apiClient.get<SupplierResponseDto>('/api/supply/suppliers/me')
  return response.data
}

// 협력사 등록
export async function createSupplier(data: CreateSupplierRequestDto) {
  const response = await apiClient.post<SupplierResponseDto>('/api/supply/suppliers', data)
  return response.data
}

// 협력사 수정
export async function updateSupplier(supplierPublicId: string, data: UpdateSupplierRequestDto) {
  const response = await apiClient.put<SupplierResponseDto>(`/api/supply/suppliers/${supplierPublicId}`, data)
  return response.data
}

// 협력사 상태 삭제(soft delete)
export async function deleteSupplier(supplierPublicId: string) {
  await apiClient.delete(`/api/supply/suppliers/${supplierPublicId}/status`)
}

// 특정 협력사의 품목 공급 역량 목록 조회
export async function getSupplierItemCapabilities(supplierPublicId: string) {
  const response = await apiClient.get<SupplierItemCapabilityResponseDto[]>(
    `/api/supply/suppliers/${supplierPublicId}/item-capabilities`,
  )
  return response.data
}

// 특정 협력사의 특정 품목 공급 역량 조회
export async function getSupplierItemCapability(supplierPublicId: string, itemPublicId: string) {
  const response = await apiClient.get<SupplierItemCapabilityResponseDto>(
    `/api/supply/suppliers/${supplierPublicId}/item-capabilities/${itemPublicId}`,
  )
  return response.data
}

export interface CreateSupplierItemCapabilityRequestDto {
  itemPublicId: string
  leadTimeDays: number
  monthlyCapacity: number
  availableQty: number
  moq: number
  qualityGrade?: SupplierItemQualityGrade | null
  unitPriceHint?: number | null
  validFrom?: string | null
}

// 협력사 품목 공급 역량 등록
export async function createSupplierItemCapability(
  supplierPublicId: string,
  data: CreateSupplierItemCapabilityRequestDto,
) {
  const response = await apiClient.post<SupplierItemCapabilityResponseDto>(
    `/api/supply/suppliers/${supplierPublicId}/item-capabilities`,
    data,
  )
  return response.data
}

export interface ConnectedSupplierSummaryResponseDto {
  connectedSupplierCount: number
  averageOnTimeRate: number | null
  averageLeadTimeDays: number
}

export interface ConnectedSupplierOrderResponseDto {
  subPoPublicId: string
  subPoNumber: string
  parentPoNumber: string
  orderRole: 'ISSUED' | 'RECEIVED'
  subPoStatus: string
  orderedAt: string
  totalAmount: number
}

export interface ConnectedSupplierDetailResponseDto extends SupplierResponseDto {
  onTimeRate: number | null
  purchaseOrderCount: number
  cumulativeAmount: number
  orders: ConnectedSupplierOrderResponseDto[]
}

export async function getConnectedSupplierSummary() {
  const response = await apiClient.get<ConnectedSupplierSummaryResponseDto>(
    '/api/supply/suppliers/connections/summary',
  )
  return response.data
}

export async function getConnectedSupplierDetail(supplierPublicId: string) {
  const response = await apiClient.get<ConnectedSupplierDetailResponseDto>(
    `/api/supply/suppliers/${supplierPublicId}/connections/detail`,
  )
  return response.data
}

