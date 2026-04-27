import { apiClient } from './http'

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
  first: boolean
  last: boolean
  empty?: boolean
}

// 품목/카테고리 상태값
export type ItemStatus = 'ACTIVE' | 'DEACTIVE' | 'DELETE'
// 품목 단위
export type ItemUnit =
  | 'EA'
  | 'SET'
  | 'PAIR'
  | 'MG'
  | 'G'
  | 'KG'
  | 'TON'
  | 'ML'
  | 'L'
  | 'MM'
  | 'CM'
  | 'M'
  | 'KM'
  | 'MM2'
  | 'CM2'
  | 'M2'
  | 'MM3'
  | 'CM3'
  | 'M3'
  | 'BOX'
  | 'PACK'
  | 'BAG'
  | 'BUNDLE'
  | 'ROLL'
  | 'SHEET'
  | 'CARTON'
  | 'CASE'
  | 'PALLET'
  | 'BOTTLE'
  | 'CAN'
  | 'JAR'
  | 'TUBE'
  | 'TRAY'
  | 'CUP'
  | 'POUCH'

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

export interface CreateItemCategoryRequestDto {
  parentCategoryPublicId?: string
  categoryName: string
  sortOrder?: number
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

export interface UpdateItemCategoryRequestDto {
  parentCategoryPublicId?: string
  categoryName: string
  sortOrder?: number
}

// 품목 카테고리 수정
export async function updateItemCategory(
  categoryPublicId: string,
  data: UpdateItemCategoryRequestDto,
) {
  const response = await apiClient.put<ItemCategoryResponseDto>(
    `/api/supply/item-category/${categoryPublicId}`,
    data,
  )
  return response.data
}


// 품목 카테고리 삭제
export async function deleteItemCategory(categoryPublicId: string) {
  await apiClient.delete(`/api/supply/item-category/${categoryPublicId}`)
}


// 품목 목록 조회
export async function getItems(params: GetItemsParams = {}) {
  const response = await apiClient.get<PageResponse<ItemResponseDto>>('/api/supply/items', {
    params,
  })
  return response.data
}

// 품목 단건 조회
export async function getItem(itemPublicId: string) {
  const response = await apiClient.get<ItemResponseDto>(`/api/supply/items/${itemPublicId}`)
  return response.data
}

// 품목 등록
export async function createItem(data: CreateItemRequestDto) {
  const response = await apiClient.post<ItemResponseDto>('/api/supply/items', data)
  return response.data
}

// 품목 수정
export async function updateItem(itemPublicId: string, data: UpdateItemRequestDto) {
  const response = await apiClient.put<ItemResponseDto>(`/api/supply/items/${itemPublicId}`, data)
  return response.data
}

// 품목 삭제
export async function deleteItem(itemPublicId: string) {
  await apiClient.delete(`/api/supply/items/${itemPublicId}`)
}

// 품목 카테고리 목록 조회
export async function getItemCategories(page = 0, size = 100) {
  const response = await apiClient.get<PageResponse<ItemCategoryResponseDto>>('/api/supply/item-category', {
    params: { page, size },
  })
  return response.data
}

// 품목 카테고리 단건 조회
export async function getItemCategory(categoryPublicId: string) {
  const response = await apiClient.get<ItemCategoryResponseDto>(
    `/api/supply/item-category/${categoryPublicId}`,
  )
  return response.data
}

// 품목 카테고리 등록
export async function createItemCategory(data: CreateItemCategoryRequestDto) {
  const response = await apiClient.post<ItemCategoryResponseDto>('/api/supply/item-category', data)
  return response.data
}
