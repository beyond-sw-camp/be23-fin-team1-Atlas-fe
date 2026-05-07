import { apiClient } from './http'
import type { SpringPage } from '../types'

export type LogisticsNodeType = 'WAREHOUSE'

export type LogisticsNodeCapacityStatus = 'EMPTY' | 'AVAILABLE' | 'FULL'

export interface CreateLogisticsNodeRequestDto {
  nodeName: string
  nodeType: LogisticsNodeType
  baseAddress: string
  detailAddress?: string | null
  capacityStatus?: LogisticsNodeCapacityStatus
}

export interface UpdateLogisticsNodeRequestDto {
  nodeName: string
  nodeType: LogisticsNodeType
  baseAddress: string
  detailAddress?: string | null
  capacityStatus: LogisticsNodeCapacityStatus
}

export interface LogisticsNodeResponseDto {
  publicId: string
  organizationPublicId: string
  nodeCode: string
  nodeName: string
  nodeType: LogisticsNodeType
  baseAddress?: string | null
  detailAddress?: string | null
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  capacityStatus: LogisticsNodeCapacityStatus
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface LogisticsNodeHistoryResponseDto {
  id: number
  logisticsNodePublicId: string
  actionType: 'CREATED' | 'UPDATED' | 'CAPACITY_STATUS_CHANGED' | 'ACTIVATED' | 'DEACTIVATED'
  changeType: string
  beforeCapacityStatus?: LogisticsNodeCapacityStatus | null
  afterCapacityStatus?: LogisticsNodeCapacityStatus | null
  beforeActive?: boolean | null
  afterActive?: boolean | null
  nodeName?: string | null
  address?: string | null
  memo?: string | null
  recordedAt: string
  processedByUserPublicId?: string | null
  processedByUserName?: string | null
}

export interface GetLogisticsNodesParams {
  page?: number
  size?: number
}

export async function createLogisticsNode(
  data: CreateLogisticsNodeRequestDto,
): Promise<LogisticsNodeResponseDto> {
  const response = await apiClient.post<LogisticsNodeResponseDto>(
    '/api/supply/logistics-nodes',
    data,
  )
  return response.data
}

export async function getLogisticsNodes(
  params: GetLogisticsNodesParams = {},
): Promise<SpringPage<LogisticsNodeResponseDto>> {
  const response = await apiClient.get<SpringPage<LogisticsNodeResponseDto>>(
    '/api/supply/logistics-nodes',
    {
      params,
    },
  )
  return response.data
}

export async function getLogisticsNode(
  publicId: string,
): Promise<LogisticsNodeResponseDto> {
  const response = await apiClient.get<LogisticsNodeResponseDto>(
    `/api/supply/logistics-nodes/${publicId}`,
  )
  return response.data
}

export async function getLogisticsNodeHistories(
  publicId: string,
): Promise<LogisticsNodeHistoryResponseDto[]> {
  const response = await apiClient.get<LogisticsNodeHistoryResponseDto[]>(
    `/api/supply/logistics-nodes/${publicId}/histories`,
  )
  return response.data
}

export async function updateLogisticsNode(
  publicId: string,
  data: UpdateLogisticsNodeRequestDto,
): Promise<LogisticsNodeResponseDto> {
  const response = await apiClient.patch<LogisticsNodeResponseDto>(
    `/api/supply/logistics-nodes/${publicId}`,
    data,
  )
  return response.data
}

export async function activateLogisticsNode(
  publicId: string,
): Promise<LogisticsNodeResponseDto> {
  const response = await apiClient.patch<LogisticsNodeResponseDto>(
    `/api/supply/logistics-nodes/${publicId}/activate`,
  )
  return response.data
}

export async function deactivateLogisticsNode(
  publicId: string,
): Promise<LogisticsNodeResponseDto> {
  const response = await apiClient.patch<LogisticsNodeResponseDto>(
    `/api/supply/logistics-nodes/${publicId}/deactivate`,
  )
  return response.data
}
