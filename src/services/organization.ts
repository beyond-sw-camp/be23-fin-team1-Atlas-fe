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
// 관리자 조직 생성 요청 바디입니다.
export interface CreateOrganizationPayload {
  organizationType: 'BUYER' | 'SUPPLIER'
  organizationName: string
  businessNo: string
  contactFirstName: string
  contactMiddleName?: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
  tierLevel?: number | null
}

// 조직 생성 응답입니다.
export interface CreateOrganizationResponse {
  organizationPublicId: string
}

// 관리자가 새 조직을 생성합니다.
export async function createOrganization(
  payload: CreateOrganizationPayload,
): Promise<CreateOrganizationResponse> {
  const response = await apiClient.post<CreateOrganizationResponse>(
    '/api/auth/organizations',
    payload,
  )

  return response.data
}

