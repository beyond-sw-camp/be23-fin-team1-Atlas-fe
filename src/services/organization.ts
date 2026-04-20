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

export interface OrganizationListItem {
  organizationId: number
  organizationPublicId: string
  organizationType: 'BUYER' | 'SUPPLIER' | 'ADMIN'
  organizationName: string
  businessNo: string
  contactEmail: string
  contactPhone: string
  status: string
  tierLevel?: number | null
  createdAt?: string
}

export interface GetOrganizationsParams {
  keyword?: string
  organizationType?: 'BUYER' | 'SUPPLIER' | 'ADMIN'
  status?: string
  page?: number
  size?: number
}

// 조직 목록을 페이지 형태로 조회합니다.
// ReturnCreateModal 같은 조직 선택 드롭다운에 사용할 수 있습니다.
export async function getOrganizations(
  params?: GetOrganizationsParams,
): Promise<PageResponse<OrganizationListItem>> {
  const response = await apiClient.get<PageResponse<OrganizationListItem>>('/api/auth/organizations', {
    params,
  })

  return response.data
}
