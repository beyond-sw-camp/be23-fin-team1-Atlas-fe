import { apiClient } from './http'
import type { SpringPage } from '../types'

export type ShipmentStatus =
  | 'READY'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'DELAYED'
  | 'CANCELLED'

export type ShipmentSourceType = 'ORDER' | 'RETURN' | 'EXCHANGE'

export interface ShipmentListResponseDto {
  publicId: string
  shipmentNumber: string
  sourceType?: ShipmentSourceType | null
  sourcePublicId?: string | null
  purchaseOrderPublicId?: string | null
  subPurchaseOrderPublicId?: string | null
  carrierName?: string | null
  originNodePublicId: string
  originNodeName?: string | null
  originNodeCode?: string | null
  destinationNodePublicId: string
  destinationNodeName?: string | null
  destinationNodeCode?: string | null
  currentNodePublicId?: string | null
  currentNodeName?: string | null
  currentNodeCode?: string | null
  departureEta?: string | null
  arrivalEta?: string | null
  status: ShipmentStatus
  temperatureRequired?: boolean
  sealedPackagingRequired?: boolean
  fragile?: boolean
}

export interface ShipmentResponseDto {
  publicId: string
  shipmentNumber: string
  sourceType?: ShipmentSourceType | null
  sourcePublicId?: string | null
  poId: number
  purchaseOrderPublicId?: string | null
  subPoId?: number | null
  subPurchaseOrderPublicId?: string | null
  carrierName?: string | null
  vehicleNo?: string | null
  trackingNo?: string | null
  originNodePublicId: string
  originNodeName?: string | null
  originNodeCode?: string | null
  originLatitude?: number | null
  originLongitude?: number | null
  destinationNodePublicId: string
  destinationNodeName?: string | null
  destinationNodeCode?: string | null
  destinationLatitude?: number | null
  destinationLongitude?: number | null
  currentNodePublicId?: string | null
  currentNodeName?: string | null
  currentNodeCode?: string | null
  currentLatitude?: number | null
  currentLongitude?: number | null
  departureEta: string
  arrivalEta?: string | null
  actualDepartedAt?: string | null
  actualArrivedAt?: string | null
  status: ShipmentStatus
  temperatureRequired: boolean
  sealedPackagingRequired: boolean
  fragile: boolean
  shipmentLines?: ShipmentLineResponseDto[]
}

export interface ShipmentLineResponseDto {
  publicId: string
  sourceType: ShipmentSourceType
  sourcePublicId: string
  sourceItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  quantity: number
}

export interface CreateShipmentRequestDto {
  poId?: number | null
  purchaseOrderPublicId?: string | null
  subPoId?: number | null
  subPurchaseOrderPublicId?: string | null
  originNodePublicId?: string | null
  shipmentLines?: CreateShipmentLineRequestDto[]
  departureEta: string
  temperatureRequired: boolean
  sealedPackagingRequired: boolean
  fragile: boolean
}

export interface CreateShipmentLineRequestDto {
  sourceItemPublicId: string
  quantity: number
}

export interface ShipmentOriginNodeOptionDto {
  nodePublicId: string
  nodeCode: string
  nodeName: string
  availableQty: number
}

export interface ShipmentCreatableOrderItemDto {
  sourceItemPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  confirmedQty: number
  alreadyShipmentQty: number
  shippableQty: number
  destinationNodePublicId: string
  destinationNodeCode: string
  destinationNodeName: string
  originNodeOptions: ShipmentOriginNodeOptionDto[]
}

export interface ShipmentCreatableOrderDto {
  sourceType: ShipmentSourceType
  sourcePublicId: string
  orderNumber: string
  buyerOrganizationPublicId: string
  supplierPublicId: string
  supplierName: string
  status: string
  items: ShipmentCreatableOrderItemDto[]
}

export interface UpdateShipmentRequestDto {
  departureEta: string
  temperatureRequired: boolean
  sealedPackagingRequired: boolean
  fragile: boolean
}

export interface ShipmentMapCheckpointDto {
  checkpointType: string
  checkpointStatus: string
  nodePublicId?: string | null
  nodeName?: string | null
  nodeCode?: string | null
  latitude?: number | null
  longitude?: number | null
  plannedAt?: string | null
  actualAt?: string | null
  note?: string | null
}

export interface ShipmentMapResponseDto extends ShipmentResponseDto {
  estimatedArrivalAt?: string | null
  delayed: boolean
  delayMinutes?: number | null
  etaBasis?: string | null
  lastCheckpointType?: string | null
  lastCheckpointAt?: string | null
  checkpoints: ShipmentMapCheckpointDto[]
}

export interface ShipmentEtaResponseDto {
  publicId: string
  status: ShipmentStatus
  currentNodePublicId: string
  destinationNodePublicId: string
  departureEta: string
  arrivalEta?: string | null
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

export async function getCreatableShipmentOrders(): Promise<ShipmentCreatableOrderDto[]> {
  const response = await apiClient.get<ShipmentCreatableOrderDto[]>(
    '/api/supply/shipments/creatable-orders',
  )
  return response.data
}

export async function updateShipment(
  publicId: string,
  data: UpdateShipmentRequestDto,
): Promise<ShipmentResponseDto> {
  const response = await apiClient.patch<ShipmentResponseDto>(
    `/api/supply/shipments/${publicId}`,
    data,
  )
  return response.data
}

export async function startShipment(
  publicId: string,
): Promise<ShipmentResponseDto> {
  const response = await apiClient.patch<ShipmentResponseDto>(
    `/api/supply/shipments/${publicId}/start`,
  )
  return response.data
}

export async function arriveShipment(
  publicId: string,
): Promise<ShipmentResponseDto> {
  const response = await apiClient.patch<ShipmentResponseDto>(
    `/api/supply/shipments/${publicId}/arrive`,
  )
  return response.data
}

export async function getShipmentMapData(): Promise<ShipmentMapResponseDto[]> {
  const response = await apiClient.get<ShipmentMapResponseDto[]>('/api/supply/shipments/map')
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

