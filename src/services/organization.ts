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

  // 화면에 입력한 조직명입니다.
  organizationName: string

  // 자동 로그인 ID slug 생성에 쓸 영문 조직명입니다.
  organizationEnglishName: string

  // 백엔드가 필수로 받는 조직 코드입니다.
  // 영문 대문자/숫자만 2~10자여야 합니다.
  organizationAlias: string

  businessNo: string
  contactFirstName: string
  contactMiddleName?: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
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

export interface OrganizationDetailResponse {
  // 조직 공개 ID 입니다.
  organizationPublicId: string
  // 조직 내부 ID 입니다.
  organizationId: number
  // 조직 유형입니다.
  organizationType: 'BUYER' | 'SUPPLIER' | 'ADMIN'
  // 조직명입니다.
  organizationName: string
  // 조직 영문명입니다.
  organizationEnglishName: string
  // 사업자번호입니다.
  businessNo?: string | null
  // 담당자 이름입니다.
  contactFirstName: string
  // 담당자 중간이름입니다.
  contactMiddleName?: string | null
  // 담당자 성입니다.
  contactLastName: string
  // 담당자 이메일입니다.
  contactEmail?: string | null
  // 담당자 연락처입니다.
  contactPhone: string
  // 조직 상태입니다.
  status: string
}

// 현재 로그인한 사용자의 조직 상세를 조회합니다.
export async function getMyOrganizationDetail(): Promise<OrganizationDetailResponse> {
  const response = await apiClient.get<OrganizationDetailResponse>(
    '/api/auth/organizations/me',
  )

  return response.data
}
