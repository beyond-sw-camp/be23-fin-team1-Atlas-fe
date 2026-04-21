import { apiClient } from './http'
import type { SpringPage } from '../types'

export type ShipmentStatus =
  | 'READY'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELAYED'
  | 'DELIVERED'
  | 'CANCELLED'

export interface ShipmentListResponseDto {
  publicId: string
  shipmentNumber: string
  carrierName: string
  destinationNodePublicId: string
  currentNodePublicId: string
  arrivalEta: string
  status: ShipmentStatus
}

export interface ShipmentResponseDto {
  publicId: string
  shipmentNumber: string
  poId: number
  subPoId?: number | null
  carrierName: string
  vehicleNo: string
  trackingNo: string
  originNodePublicId: string
  destinationNodePublicId: string
  currentNodePublicId?: string | null
  departureEta: string
  arrivalEta: string
  actualDepartedAt?: string | null
  actualArrivedAt?: string | null
  status: ShipmentStatus
  temperatureRequired: boolean
}

export interface CreateShipmentRequestDto {
  shipmentNumber: string
  poId: number
  subPoId?: number | null
  carrierName: string
  vehicleNo: string
  trackingNo: string
  originNodePublicId: string
  destinationNodePublicId: string
  departureEta: string
  arrivalEta: string
  temperatureRequired: boolean
}

export interface ShipmentEtaResponseDto {
  publicId: string
  status: ShipmentStatus
  currentNodePublicId: string
  destinationNodePublicId: string
  departureEta: string
  arrivalEta: string
  actualDepartedAt?: string | null
  actualArrivedAt?: string | null
  estimatedArrivalAt: string
  delayMinutes: number
  delayed: boolean
  etaBasis: string
  lastCheckpointType?: string | null
  lastCheckpointAt?: string | null
  lastCheckpointNodePublicId?: string | null
}

export interface ShipmentStatusHistoryResponseDto {
  shipmentPublicId: string
  statusCode: ShipmentStatus
  statusMessage: string
  locationText: string
  latitude?: number | null
  longitude?: number | null
  recordedAt: string
  recordedBy: string
}
export interface TrackShipmentRequestDto {
  nodePublicId: string
  checkpointType: string
  checkpointStatus: string
  plannedAt: string
  actualAt?: string | null
  note?: string
}

export interface EtaProjectionResponseDto {
  id: number
  riskEventId: number
  previousEta: string
  projectedEta: string
  delayMinutes: number
  calculatedAt: string
}
export interface CreateDeliveryExceptionRequestDto {
  shipmentPublicId: string
  exceptionType: string
  severity: string
  detectedAt: string
  note?: string
}

export interface DeliveryExceptionResponseDto {
  shipmentPublicId: string
  exceptionType: string
  severity: string
  detectedAt: string
  resolved: boolean
  resolvedAt?: string | null
  note?: string | null
}
export interface CreateShipmentLotMappingRequestDto {
  lotPublicId: string
  shippedQty: number
}

export interface ShipmentLotMappingResponseDto {
  shipmentPublicId: string
  lotPublicId: string
  shippedQty: number
  unit: string
  loadedAt: string
}

export interface GetShipmentsParams {
  page?: number
  size?: number
  sort?: string
}

export async function getShipments(
  params: GetShipmentsParams = {},
): Promise<SpringPage<ShipmentListResponseDto>> {
  const response = await apiClient.get<SpringPage<ShipmentListResponseDto>>(
    '/api/supply/shipments',
    {
      params: {
        page: 0,
        size: 10,
        sort: 'id,desc',
        ...params,
      },
    },
  )
  return response.data
}

export async function getShipment(
  publicId: string,
): Promise<ShipmentResponseDto> {
  const response = await apiClient.get<ShipmentResponseDto>(
    `/api/supply/shipments/${publicId}`,
  )
  return response.data
}

export async function createShipment(
  data: CreateShipmentRequestDto,
): Promise<ShipmentResponseDto> {
  const response = await apiClient.post<ShipmentResponseDto>(
    '/api/supply/shipments',
    data,
  )
  return response.data
}

export async function getShipmentEta(
  publicId: string,
): Promise<ShipmentEtaResponseDto> {
  const response = await apiClient.get<ShipmentEtaResponseDto>(
    `/api/supply/shipments/${publicId}/eta`,
  )
  return response.data
}

export async function getShipmentStatusHistories(
  publicId: string,
): Promise<ShipmentStatusHistoryResponseDto[]> {
  const response = await apiClient.get<ShipmentStatusHistoryResponseDto[]>(
    `/api/supply/shipments/${publicId}/status-history`,
  )
  return response.data
}
export async function trackShipment(
  publicId: string,
  data: TrackShipmentRequestDto,
): Promise<ShipmentResponseDto> {
  const response = await apiClient.post<ShipmentResponseDto>(
    `/api/supply/shipments/${publicId}/track`,
    data,
  )
  return response.data
}

export async function getEtaProjections(
  publicId: string,
): Promise<EtaProjectionResponseDto[]> {
  const response = await apiClient.get<EtaProjectionResponseDto[]>(
    `/api/supply/shipments/${publicId}/eta-projections`,
  )
  return response.data
}
export async function createDeliveryException(
  data: CreateDeliveryExceptionRequestDto,
): Promise<DeliveryExceptionResponseDto> {
  const response = await apiClient.post<DeliveryExceptionResponseDto>(
    '/api/supply/delivery-exceptions',
    data,
  )
  return response.data
}

export async function getDeliveryExceptions(
  publicId: string,
): Promise<DeliveryExceptionResponseDto[]> {
  const response = await apiClient.get<DeliveryExceptionResponseDto[]>(
    `/api/supply/shipments/${publicId}/delivery-exceptions`,
  )
  return response.data
}
export async function createShipmentLotMapping(
  shipmentPublicId: string,
  data: CreateShipmentLotMappingRequestDto,
): Promise<ShipmentLotMappingResponseDto> {
  const response = await apiClient.post<ShipmentLotMappingResponseDto>(
    `/api/supply/shipments/${shipmentPublicId}/lots`,
    data,
  )
  return response.data
}

export async function getShipmentLotMappings(
  shipmentPublicId: string,
): Promise<ShipmentLotMappingResponseDto[]> {
  const response = await apiClient.get<ShipmentLotMappingResponseDto[]>(
    `/api/supply/shipments/${shipmentPublicId}/lots`,
  )
  return response.data
}
