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


export interface CreateLotRequestDto {
  lotNumber: string
  sourcePoItemPublicId: string
  supplierPublicId: string
  itemPublicId: string
  manufacturedAt: string
  expiredAt?: string
  qty: number
  unit: string
  currentNodePublicId?: string
}

export interface UpdateLotRequestDto {
  qty?: number
  expiredAt?: string
  currentNodePublicId?: string
}

export interface LotResponseDto {
  publicId: string
  lotNumber: string
  sourcePoItemPublicId: string
  supplierPublicId: string
  itemPublicId: string
  supplierName: string
  itemName: string
  lotStatus: 'CREATED' | 'IN_PRODUCTION' | 'COMPLETED' | 'SHIPPED' | 'DISCARDED'
  manufacturedAt: string
  expiredAt: string
  qty: number
  unit: string
  qualityStatus: 'NORMAL' | 'HOLD' | 'DEFECTIVE'
  currentNodePublicId?: string
  createdAt: string
  updatedAt: string
}

export interface LotHistoryResponseDto {
  publicId: string
  preLotStatus: string
  lotStatus: string
  preQualityStatus: string
  qualityStatus: string
  preNodePublicId?: string
  currentNodePublicId?: string
  reason: string
  createdAt: string
}

export async function createLot(data: CreateLotRequestDto): Promise<LotResponseDto> {
  const response = await apiClient.post<LotResponseDto>('/api/supply/lots', data)
  return response.data
}

export async function getLots(): Promise<PageResponse<LotResponseDto>> {
  const response = await apiClient.get<PageResponse<LotResponseDto>>('/api/supply/lots')
  return response.data
}

export async function getLot(publicId: string): Promise<LotResponseDto> {
  const response = await apiClient.get<LotResponseDto>(`/api/supply/lots/${publicId}`)
  return response.data
}

export async function updateLot(publicId: string, data: UpdateLotRequestDto): Promise<LotResponseDto> {
  const response = await apiClient.put<LotResponseDto>(`/api/supply/lots/${publicId}`, data)
  return response.data
}

export async function updateLotStatus(publicId: string, lotStatus: string): Promise<LotResponseDto> {
  const response = await apiClient.patch<LotResponseDto>(`/api/supply/lots/${publicId}/status`, { lotStatus, reason: `상태 변경` })
  return response.data
}

export async function updateLotQuality(publicId: string, qualityStatus: string, customReason?: string): Promise<LotResponseDto> {
  const reason = customReason || `품질 상태 변경`
  const response = await apiClient.patch<LotResponseDto>(`/api/supply/lots/${publicId}/quality`, { qualityStatus, reason })
  return response.data
}

export async function getLotHistories(publicId: string): Promise<LotHistoryResponseDto[]> {
  const response = await apiClient.get<LotHistoryResponseDto[]>(`/api/supply/lots/${publicId}/histories`)
  return response.data
}