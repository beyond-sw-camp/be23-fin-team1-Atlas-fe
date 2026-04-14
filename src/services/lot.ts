import { apiClient } from './http'

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

export interface LotResponseDto {
  publicId: string
  lotNumber: string
  sourcePoItemPublicId: string
  supplierPublicId: string
  itemPublicId: string
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

export async function createLot(data: CreateLotRequestDto): Promise<LotResponseDto> {
  const response = await apiClient.post<LotResponseDto>('/api/supply/lots', data)
  return response.data
}

export async function getLots(): Promise<LotResponseDto[]> {
  const response = await apiClient.get<LotResponseDto[]>('/api/supply/lots')
  return response.data
}

export async function getLot(publicId: string): Promise<LotResponseDto> {
  const response = await apiClient.get<LotResponseDto>(`/api/supply/lots/${publicId}`)
  return response.data
}

export async function updateLotStatus(publicId: string, status: string): Promise<LotResponseDto> {
  const response = await apiClient.patch<LotResponseDto>(`/api/supply/lots/${publicId}/status`, { status })
  return response.data
}

export async function updateLotQuality(publicId: string, quality: string): Promise<LotResponseDto> {
  const response = await apiClient.patch<LotResponseDto>(`/api/supply/lots/${publicId}/quality`, { quality })
  return response.data
}
