import { apiClient } from './http'
import type { SpringPage } from '../types'

export type SettlementStatus = 'PENDING' | 'APPROVED' | 'CANCELLED'

export type SettlementTargetType =
  | 'SHIPMENT'
  | 'RETURN'
  | 'DELIVERY_EXCEPTION'

export type SettlementCurrency = 'KRW' | 'DOLLAR'

export interface SettlementDetailResponseDto {
  publicId: string
  poItemId: number
  itemId: number
  qty: number
  unitPrice: number
  amount: number
  detailStatus: string
}

export interface SettlementResponseDto {
  id: number
  supplierPublicId: string
  targetType: SettlementTargetType
  targetPublicId: string
  settlementPeriodStart?: string | null
  settlementPeriodEnd?: string | null
  amount: number
  currencyCode: SettlementCurrency
  settlementStatus: SettlementStatus
  settledAt?: string | null
  approvedByUserPublicId?: string | null
  cancelledAt?: string | null
  cancelledByUserPublicId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  details: SettlementDetailResponseDto[]
}

export type SettlementListResponseDto = SettlementResponseDto

export interface CreateSettlementDetailRequestDto {
  poItemId: number
  itemId: number
  qty: number
  unitPrice: number
}

export interface CreateSettlementRequestDto {
  supplierPublicId: string
  targetType: SettlementTargetType
  targetPublicId: string
  settlementPeriodStart?: string
  settlementPeriodEnd?: string
  currencyCode: SettlementCurrency
  details: CreateSettlementDetailRequestDto[]
}

export async function getSettlements(
  page = 0,
  size = 10,
): Promise<SpringPage<SettlementListResponseDto>> {
  const response = await apiClient.get<SpringPage<SettlementListResponseDto>>(
    '/api/supply/settlements',
    {
      params: { page, size },
    },
  )
  return response.data
}

export async function getSettlement(
  settlementId: number,
): Promise<SettlementResponseDto> {
  const response = await apiClient.get<SettlementResponseDto>(
    `/api/supply/settlements/${settlementId}`,
  )
  return response.data
}

export async function createSettlement(
  data: CreateSettlementRequestDto,
): Promise<SettlementResponseDto> {
  const response = await apiClient.post<SettlementResponseDto>(
    '/api/supply/settlements',
    data,
  )
  return response.data
}

export async function approveSettlement(
  settlementId: number,
): Promise<SettlementResponseDto> {
  const response = await apiClient.patch<SettlementResponseDto>(
    `/api/supply/settlements/${settlementId}/approve`,
  )
  return response.data
}

export async function cancelSettlement(
  settlementId: number,
): Promise<SettlementResponseDto> {
  const response = await apiClient.patch<SettlementResponseDto>(
    `/api/supply/settlements/${settlementId}/cancel`,
  )
  return response.data
}
