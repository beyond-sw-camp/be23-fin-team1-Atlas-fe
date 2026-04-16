import { apiClient } from './http'

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
}


export interface CreateReturnItemDto {
  itemPublicId: string
  lotPublicId?: string
  returnQty: number
  unit: string
  detailReason?: string
  attachmentPublicIds?: string[]
}

export interface CreateReturnRequestDto {
  returnNumber: string // Could be generated on backend but required in DTO per spec
  sourceShipmentPublicId?: string
  requestOrganizationPublicId: string
  targetOrganizationPublicId: string
  returnType: 'DAMAGE' | 'DEFECTIVE' | 'MISDELIVERY' | 'SIMPLE_RETURN'
  returnReason: string
  attachmentPublicIds?: string[]
  items: CreateReturnItemDto[]
}

export interface ReturnItemResponseDto {
  id: number
  itemPublicId: string
  lotPublicId?: string | null
  returnQty: number
  unit: string
  detailReason?: string | null
  itemStatus: string
  attachmentPublicIds: string[]
}


export interface ReturnRequestResponseDto {
  id: number
  publicId: string
  returnNumber: string
  sourceShipmentPublicId?: string | null
  requestOrganizationPublicId: string
  targetOrganizationPublicId: string
  returnType: 'DAMAGE' | 'DEFECTIVE' | 'MISDELIVERY' | 'SIMPLE_RETURN'
  returnReason: string
  returnStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED'
  requestedAt: string
  approvedAt?: string | null
  completedAt?: string | null
  createdByUserPublicId?: string | null
  attachmentPublicIds: string[]
  items: ReturnItemResponseDto[]
}


export interface UpdateReturnStatusDto {
  returnStatus: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED'

  reason: string
}

export interface GetReturnRequestsParams {
  keyword?: string
  requestOrganizationPublicId?: string
  targetOrganizationPublicId?: string
  sourceShipmentPublicId?: string
  returnType?: 'DAMAGE' | 'DEFECTIVE' | 'MISDELIVERY' | 'SIMPLE_RETURN'
  returnStatus?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED'
  itemPublicId?: string
  lotPublicId?: string
  page?: number
  size?: number
}


export async function createReturn(data: CreateReturnRequestDto): Promise<ReturnRequestResponseDto> {
  const response = await apiClient.post<ReturnRequestResponseDto>('/api/supply/returns', data)
  return response.data
}

export async function getReturnRequests(
  params?: GetReturnRequestsParams
): Promise<PageResponse<ReturnRequestResponseDto>> {
  const response = await apiClient.get<PageResponse<ReturnRequestResponseDto>>('/api/supply/returns', {
    params,
  })
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
