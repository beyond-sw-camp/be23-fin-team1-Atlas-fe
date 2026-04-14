import { apiClient } from './http'

export interface CreateReturnItemDto {
  itemPublicId: string
  lotPublicId?: string
  returnQty: number
  unit: string
  detailReason?: string
  attachmentPublicIds?: string[]
}

export interface CreateReturnRequestDto {
  returnNumber?: string // Could be generated on backend but required in DTO per spec
  sourceShipmentPublicId?: string
  requestOrganizationPublicId: string
  targetOrganizationPublicId: string
  returnType: 'DAMAGE' | 'DEFECTIVE' | 'MISDELIVERY' | 'SIMPLE_RETURN'
  returnReason: string
  attachmentPublicIds?: string[]
  items: CreateReturnItemDto[]
}

export interface ReturnItemResponseDto {
  publicId: string
  itemPublicId: string
  lotPublicId: string
  returnQty: number
  unit: string
  detailReason: string
  attachmentPublicIds: string[]
}

export interface ReturnRequestResponseDto {
  publicId: string
  returnNumber: string
  sourceShipmentPublicId: string
  requestOrganizationPublicId: string
  targetOrganizationPublicId: string
  returnType: string
  returnReason: string
  returnStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED'
  requestedAt: string
  approvedAt?: string
  completedAt?: string
  createdByUserPublicId: string
  attachmentPublicIds: string[]
  items: ReturnItemResponseDto[]
}

export interface UpdateReturnStatusDto {
  returnStatus: string
  reason: string
}

export async function createReturn(data: CreateReturnRequestDto): Promise<ReturnRequestResponseDto> {
  const response = await apiClient.post<ReturnRequestResponseDto>('/api/supply/returns', data)
  return response.data
}

export async function getReturnRequests(): Promise<ReturnRequestResponseDto[]> {
  const response = await apiClient.get<ReturnRequestResponseDto[]>('/api/supply/returns')
  return response.data
}

export async function getReturnRequest(publicId: string): Promise<ReturnRequestResponseDto> {
  const response = await apiClient.get<ReturnRequestResponseDto>(`/api/supply/returns/${publicId}`)
  return response.data
}

export async function updateReturnStatus(publicId: string, statusDto: UpdateReturnStatusDto): Promise<ReturnRequestResponseDto> {
  const response = await apiClient.patch<ReturnRequestResponseDto>(`/api/supply/returns/${publicId}/status`, statusDto)
  return response.data
}
