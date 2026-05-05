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
  organizationEnglishName: string
  organizationAlias: string
  businessNo: string
  contactFirstName: string
  contactMiddleName?: string | null
  contactLastName: string
  contactEmail: string
  contactPhone: string
  status: string
  createdAt?: string
  organizationImageThumbPath?: string | null
  address?: string | null
  addressDetail?: string | null
  zipCode?: string | null
}

export interface GetOrganizationsParams {
  keyword?: string
  organizationType?: 'BUYER' | 'SUPPLIER' | 'ADMIN'
  status?: string
  page?: number
  size?: number
}

// 조직 목록을 읽습니다.
export async function getOrganizations(
  params?: GetOrganizationsParams,
): Promise<PageResponse<OrganizationListItem>> {
  const response = await apiClient.get<PageResponse<OrganizationListItem>>(
    '/api/auth/organizations',
    {
      params,
    },
  )

  return response.data
}

export interface CreateOrganizationPayload {
  organizationType: 'BUYER' | 'SUPPLIER'
  organizationName: string
  organizationEnglishName: string
  organizationAlias: string
  businessNo: string
  contactFirstName: string
  contactMiddleName?: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
  address?: string | null
  addressDetail?: string | null
  zipCode?: string | null
}

export interface CreateOrganizationResponse {
  organizationPublicId: string
  organizationImageAttachmentPublicId?: string | null
  organizationImageThumbPath?: string | null
}

// 조직을 생성합니다.
export async function createOrganization(
  payload: CreateOrganizationPayload,
): Promise<CreateOrganizationResponse> {
  const response = await apiClient.post<CreateOrganizationResponse>(
    '/api/auth/organizations',
    payload,
  )

  return response.data
}

export interface OrganizationDetailResponse {
  // 백엔드 DTO의 organizationPublicId 입니다.
  organizationPublicId: string

  // 백엔드 DTO의 organizationId 입니다.
  organizationId: number

  organizationType: 'BUYER' | 'SUPPLIER' | 'ADMIN'
  organizationName: string
  organizationEnglishName: string
  organizationAlias: string
  businessNo?: string | null
  contactFirstName: string
  contactMiddleName?: string | null
  contactLastName: string
  contactEmail?: string | null
  contactPhone: string
  status: string
  organizationImageAttachmentPublicId?: string | null
  organizationImageThumbPath?: string | null
  address?: string | null
  addressDetail?: string | null
  zipCode?: string | null
  memberCount: number
}

export interface UpdateOrganizationPayload {
  organizationName: string
  organizationEnglishName: string
  organizationAlias: string
  businessNo?: string | null
  contactFirstName: string
  contactMiddleName?: string | null
  contactLastName: string
  contactEmail?: string | null
  contactPhone: string
  organizationImageAttachmentPublicId?: string | null
  organizationImageThumbPath?: string | null
  address?: string | null
  addressDetail?: string | null
  zipCode?: string | null
}

// 조직 상세를 내부 ID 기준으로 읽습니다.
// 백엔드: GET /api/auth/organizations/{organizationId}
export async function getOrganizationDetail(
  organizationId: number,
): Promise<OrganizationDetailResponse> {
  const response = await apiClient.get<OrganizationDetailResponse>(
    `/api/auth/organizations/${organizationId}`,
  )

  return response.data
}

// 현재 로그인한 사용자의 조직 상세를 읽습니다.
export async function getMyOrganizationDetail(): Promise<OrganizationDetailResponse> {
  const response = await apiClient.get<OrganizationDetailResponse>(
    '/api/auth/organizations/me',
  )

  return response.data
}

// 조직 정보를 수정합니다.
export async function updateOrganization(
  organizationId: number,
  payload: UpdateOrganizationPayload,
): Promise<OrganizationDetailResponse> {
  const response = await apiClient.patch<OrganizationDetailResponse>(
    `/api/auth/organizations/${organizationId}`,
    payload,
  )

  return response.data
}
export type OrganizationStatus = 'ACTIVE' | 'DEACTIVE' | 'DELETE'

export interface UpdateOrganizationStatusPayload {
  status: OrganizationStatus
}

// 조직 상태를 ACTIVE, DEACTIVE, DELETE 중 하나로 변경합니다.
export async function updateOrganizationStatus(
  organizationId: number,
  payload: UpdateOrganizationStatusPayload,
): Promise<OrganizationDetailResponse> {
  const response = await apiClient.patch<OrganizationDetailResponse>(
    `/api/auth/organizations/${organizationId}/status`,
    payload,
  )

  return response.data
}

export interface OrganizationSupplySummaryResponse {
  // 조직에 등록된 창고/물류거점 수입니다.
  warehouseCount: number

  // 조직 협력사에 등록된 ESG/인증 파일 수입니다.
  esgFileCount: number
}

// 조직 상세 화면에서 보여줄 supply-service 집계값을 조회합니다.
export async function getOrganizationSupplySummary(
  organizationPublicId: string,
): Promise<OrganizationSupplySummaryResponse> {
  const response = await apiClient.get<OrganizationSupplySummaryResponse>(
    `/api/supply/suppliers/organizations/${organizationPublicId}/summary`,
  )

  return response.data
}


