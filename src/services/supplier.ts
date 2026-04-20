import { apiClient } from './http'

export type SupplierTierLevel = 'TIER1' | 'TIER2' | 'TIER3'
export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED'
export type ApprovalStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED'

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty: boolean
}

export interface SupplierListResponseDto {
  supplierCode: string
  supplierName: string
  tierLevel: SupplierTierLevel
  onTimeRate: number | null
  supplierScore: number | null
  qualityScore: number | null
  purchaseOrderCount: number | null
  totalAmount: number | null
  cumulativeAmount: number | null
  status: string
  detail: SupplierResponseDto | null
}

export interface SupplierResponseDto {
  publicId: string
  organizationPublicId: string
  supplierCode: string
  supplierName: string
  tierLevel: SupplierTierLevel
  supplierStatus: SupplierStatus
  approvalStatus: ApprovalStatus
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
  createdAt: string
  updatedAt: string
}

export interface CreateSupplierRequestDto {
  organizationPublicId: string
  supplierCode: string
  supplierName: string
  tierLevel: SupplierTierLevel
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

export interface UpdateSupplierRequestDto {
  supplierCode: string
  supplierName: string
  tierLevel: SupplierTierLevel
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

export interface GetSuppliersParams {
  page?: number
  size?: number
}

export interface GetSuppliersParams {
  keyword?: string
  tierLevel?: SupplierTierLevel
  approvalStatus?: ApprovalStatus
  supplierStatus?: SupplierStatus
  itemPublicId?: string
  page?: number
  size?: number
}

export async function getSuppliersByTier(tierLevel: SupplierTierLevel, params: Omit<GetSuppliersParams, 'tierLevel'> = {}) {
  const response = await apiClient.get<PageResponse<SupplierListResponseDto>>(
    `/api/supply/suppliers/tier/${tierLevel}`,
    { params },
  )
  return response.data
}


export async function getSuppliers(params: GetSuppliersParams = {}) {
  const response = await apiClient.get<PageResponse<SupplierListResponseDto>>('/api/supply/suppliers', {
    params,
  })
  return response.data
}

export async function getSupplier(supplierPublicId: string) {
  const response = await apiClient.get<SupplierResponseDto>(`/api/supply/suppliers/${supplierPublicId}`)
  return response.data
}

export async function createSupplier(data: CreateSupplierRequestDto) {
  const response = await apiClient.post<SupplierResponseDto>('/api/supply/suppliers', data)
  return response.data
}

export async function updateSupplier(supplierPublicId: string, data: UpdateSupplierRequestDto) {
  const response = await apiClient.put<SupplierResponseDto>(`/api/supply/suppliers/${supplierPublicId}`, data)
  return response.data
}

export async function deleteSupplier(supplierPublicId: string) {
  await apiClient.delete(`/api/supply/suppliers/${supplierPublicId}/status`)
}

