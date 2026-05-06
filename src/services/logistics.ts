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
