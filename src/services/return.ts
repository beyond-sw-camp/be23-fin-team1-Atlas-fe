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

/** 반품 사유 (Why) */
export type ReturnType = 'DAMAGE' | 'DEFECTIVE' | 'SIMPLE_RETURN'

/** 처리 방식 (How) */
export type ResolutionType = 'RETURN' | 'EXCHANGE' | 'DISPOSAL'

/** QC 검수 상태 */
export type QcStatus = 'PENDING' | 'PASS' | 'FAIL'

/** QC 검수 등급 */
export type QcGrade = 'A' | 'B' | 'DEFECTIVE'

/** 폐기 사유 */
export type DisposalReason = 'EXPIRED' | 'DAMAGED' | 'CONTAMINATED' | 'OTHER'

/** 반품 상태 (유형별 경로가 다름) */
export type ReturnStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_TRANSIT'
  | 'RECEIVED'
  | 'INSPECTING'  // QC 검수 진행 중
  | 'RESHIPPED'   // EXCHANGE 전용: 교체품 발송 완료
  | 'DISPOSED'    // DISPOSAL 전용: 폐기 처리 완료
  | 'COMPLETED'


export interface CreateReturnItemDto {
  itemPublicId: string
  itemName?: string

  returnQty: number
  unit: string
  detailReason?: string
  attachmentPublicIds?: string[]
}

export interface CreateReturnRequestDto {
  sourceShipmentPublicId: string
  returnType: ReturnType
  resolutionType: ResolutionType
  returnReason: string
  attachmentPublicIds?: string[]
  items: CreateReturnItemDto[]
}

export interface ReturnItemResponseDto {
  id: number
  itemPublicId: string
  itemName?: string | null
  returnQty: number
  unit: string
  detailReason?: string | null
  itemStatus: string
  attachmentPublicIds: string[]
  // QC 검수 관련
  qcStatus?: QcStatus
  qcGrade?: QcGrade
  // 폐기 증빙 관련
  disposalReason?: DisposalReason
  disposalProofAttachmentPublicId?: string | null
}

export interface InspectReturnItemDto {
  qcStatus: QcStatus
  qcGrade: QcGrade
  action: 'RESTOCK' | 'DISPOSE'
  description?: string
}


export interface ReturnRequestResponseDto {
  id: number
  publicId: string
  returnNumber: string
  sourceShipmentPublicId?: string | null
  returnShipmentPublicId?: string | null
  requestOrganizationPublicId: string
  targetOrganizationPublicId: string
  requestOrganizationName?: string
  targetOrganizationName?: string
  returnType: ReturnType
  resolutionType: ResolutionType
  returnReason: string
  returnStatus: ReturnStatus
  requestedAt: string
  approvedAt?: string | null
  completedAt?: string | null
  createdByUserPublicId?: string | null
  settlementPublicId?: string | null
  attachmentPublicIds: string[]
  items: ReturnItemResponseDto[]
}

export interface ReturnStatusHistoryResponseDto {
  id: number
  returnRequestId: number
  beforeStatus: string
  afterStatus: string
  reason: string
  recordedAt: string
  recordedBy: string
}


export interface UpdateReturnStatusDto {
  returnStatus: ReturnStatus
  reason: string
  attachmentPublicIds?: string[]
}

export interface GetReturnRequestsParams {
  keyword?: string
  requestOrganizationPublicId?: string
  targetOrganizationPublicId?: string
  sourceShipmentPublicId?: string
  returnType?: ReturnType
  resolutionType?: ResolutionType
  returnStatus?: ReturnStatus
  itemPublicId?: string

  page?: number
  size?: number
}

export interface SearchReturnRequestsParams {
  keyword?: string
  status?: ReturnStatus
  type?: ReturnType
  page?: number
  size?: number
  sort?: string
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

export async function searchReturnRequests(
  params?: SearchReturnRequestsParams
): Promise<PageResponse<ReturnRequestResponseDto>> {
  const response = await apiClient.get<PageResponse<ReturnRequestResponseDto>>('/api/supply/returns/search', {
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

export async function getReturnHistories(publicId: string): Promise<ReturnStatusHistoryResponseDto[]> {
  const response = await apiClient.get<ReturnStatusHistoryResponseDto[]>(`/api/supply/returns/${publicId}/histories`)
  return response.data
}

/** 검수 결과 입력 (품목별) */
export async function inspectReturnItem(
  returnPublicId: string,
  itemId: number,
  data: InspectReturnItemDto,
): Promise<ReturnItemResponseDto> {
  const response = await apiClient.patch<ReturnItemResponseDto>(
    `/api/supply/returns/${returnPublicId}/items/${itemId}/inspect`,
    data,
  )
  return response.data
}
