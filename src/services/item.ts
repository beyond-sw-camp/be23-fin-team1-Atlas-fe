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

export type ItemStatus = 'ACTIVE' | 'DEACTIVE' | 'DELETE'
export type ItemUnit =
  | 'EA' | 'SET' | 'PAIR'
  | 'MG' | 'G' | 'KG' | 'TON'
  | 'ML' | 'L'
  | 'MM' | 'CM' | 'M' | 'KM'
  | 'MM2' | 'CM2' | 'M2'
  | 'MM3' | 'CM3' | 'M3'
  | 'BOX' | 'PACK' | 'BAG' | 'BUNDLE' | 'ROLL' | 'SHEET' | 'CARTON' | 'CASE' | 'PALLET'
  | 'BOTTLE' | 'CAN' | 'JAR' | 'TUBE' | 'TRAY' | 'CUP' | 'POUCH'

export interface ItemCategoryResponseDto {
  publicId: string
  parentCategoryPublicId: string | null
  categoryName: string
  categoryLevel: number
  sortOrder: number
  createdByOrganizationPublicId: string
  status: ItemStatus
  createdAt: string
  updatedAt: string
}

export interface ItemResponseDto {
  publicId: string
  supplierPublicId: string
  supplierOrganizationPublicId: string
  supplierName: string
  itemCategoryPublicId: string
  categoryName: string
  itemCode: string
  itemName: string
  unit: ItemUnit
  spec: string
  shelfLifeDays: number
  status: ItemStatus
  createdAt: string
  updatedAt: string
}

export interface CreateItemRequestDto {
  itemCategoryPublicId: string
  itemCode: string
  itemName: string
  unit: ItemUnit
  spec: string
  shelfLifeDays: number
}

export interface UpdateItemRequestDto extends CreateItemRequestDto {}

export interface GetItemsParams {
  keyword?: string
  supplierPublicId?: string
  supplierOrganizationPublicId?: string
  itemCategoryPublicId?: string
  status?: ItemStatus
  page?: number
  size?: number
}

export async function getItems(params: GetItemsParams = {}) {
  const response = await apiClient.get<PageResponse<ItemResponseDto>>('/api/supply/items', { params })
  return response.data
}

export async function getItem(itemPublicId: string) {
  const response = await apiClient.get<ItemResponseDto>(`/api/supply/items/${itemPublicId}`)
  return response.data
}

export async function createItem(data: CreateItemRequestDto) {
  const response = await apiClient.post<ItemResponseDto>('/api/supply/items', data)
  return response.data
}

export async function updateItem(itemPublicId: string, data: UpdateItemRequestDto) {
  const response = await apiClient.put<ItemResponseDto>(`/api/supply/items/${itemPublicId}`, data)
  return response.data
}

export async function deleteItem(itemPublicId: string) {
  await apiClient.delete(`/api/supply/items/${itemPublicId}`)
}

export async function getItemCategories(page = 0, size = 100) {
  const response = await apiClient.get<PageResponse<ItemCategoryResponseDto>>('/api/supply/item-category', {
    params: { page, size },
  })
  return response.data
}

export async function getItemCategory(categoryPublicId: string) {
  const response = await apiClient.get<ItemCategoryResponseDto>(`/api/supply/item-category/${categoryPublicId}`)
  return response.data
}
