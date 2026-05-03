import { apiClient } from './http'
import type { ItemUnit } from './item'

export type InventoryStatus = 'ACTIVE' | 'RESERVED' | 'EXHAUSTED' | 'EXPIRED' | 'DELETED'

export interface ItemInventoryResponseDto {
  inventoryPublicId: string
  itemPublicId: string
  itemCode: string
  itemName: string
  unit: ItemUnit | string
  manufacturedDate: string
  expirationDate: string
  initialQty: number
  remainingQty: number
  reservedQty: number
  availableQty: number
  status: InventoryStatus
  memo: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateItemInventoryRequestDto {
  itemPublicId: string
  manufacturedDate: string
  qty: number
  memo?: string | null
}

export interface UpdateItemInventoryRequestDto {
  manufacturedDate: string
  qty: number
  memo?: string | null
}

export async function getInventories() {
  const response = await apiClient.get<ItemInventoryResponseDto[]>('/api/supply/inventories')
  return response.data
}

export async function createInventory(data: CreateItemInventoryRequestDto) {
  const response = await apiClient.post<ItemInventoryResponseDto>('/api/supply/inventories', data)
  return response.data
}

export async function updateInventory(
  inventoryPublicId: string,
  data: UpdateItemInventoryRequestDto,
) {
  const response = await apiClient.put<ItemInventoryResponseDto>(
    `/api/supply/inventories/${inventoryPublicId}`,
    data,
  )
  return response.data
}

export async function deleteInventory(inventoryPublicId: string) {
  await apiClient.delete(`/api/supply/inventories/${inventoryPublicId}`)
}

export interface InventorySummaryResponseDto {
  remainingQty: number
  reservedQty: number
  availableQty: number
}

export async function getInventorySummary() {
  const response = await apiClient.get<InventorySummaryResponseDto>('/api/supply/inventories/summary')
  return response.data
}

export async function getItemInventories(itemPublicId: string) {
  const response = await apiClient.get<ItemInventoryResponseDto[]>(
    `/api/supply/inventories/items/${itemPublicId}`,
  )
  return response.data
}

