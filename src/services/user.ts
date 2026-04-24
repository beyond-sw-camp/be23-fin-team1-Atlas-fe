import { apiClient } from './http'

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  page?: number
  number?: number
  first: boolean
  last: boolean
}
// 로그인/보안 이력 조회에 공통으로 쓰는 기간 필터입니다.
export interface HistoryQueryParams {
  // 페이지 번호입니다.
  page?: number
  // 한 번에 가져올 개수입니다.
  size?: number
  // 조회 시작일입니다. 예: 2026-04-01
  from?: string
  // 조회 종료일입니다. 예: 2026-04-23
  to?: string
}


export interface UserDepartmentSummary {
  departmentPublicId?: string | null
  departmentCode?: string | null
  departmentName?: string | null
}

export interface UserProfileImageSummary {
  profileAttachmentPublicId?: string | null
  profileImageThumbPath?: string | null
}

export interface UserListItem {
  userId: number
  userPublicId: string
  organizationPublicId: string
  loginId: string
  firstName: string
  middleName?: string | null
  lastName: string
  email: string
  phone: string
  jobTitle?: string | null
  userRole: 'USER' | 'ORG_ADMIN' | 'ADMIN'
  status: string
  createdAt?: string
}

export interface UserListItem extends UserDepartmentSummary, UserProfileImageSummary {}

export interface MyInfoResponse {
  organizationPublicId: string
  userPublicId: string
  role: 'USER' | 'ORG_ADMIN' | 'ADMIN'
}

export interface MyInfoResponse extends UserProfileImageSummary {}

export interface GetUsersParams {
  keyword?: string
  organizationPublicId?: string
  userRole?: 'USER' | 'ORG_ADMIN' | 'ADMIN'
  status?: string
  page?: number
  size?: number
}

// 사용자 목록을 페이지 형태로 조회합니다.
// 이후 사용자 선택 드롭다운이나 관리자 화면에서 재사용할 수 있습니다.
export async function getUsers(
  params?: GetUsersParams,
): Promise<PageResponse<UserListItem>> {
  const response = await apiClient.get<PageResponse<UserListItem>>('/api/auth/users', {
    params,
  })

  return response.data
}

// 현재 로그인한 사용자 정보를 조회합니다.
// 세션 검증이나 초기 사용자 정보 동기화에 사용할 수 있습니다.
export async function getMyInfo(): Promise<MyInfoResponse> {
  const response = await apiClient.get<MyInfoResponse>('/api/auth/me')
  return response.data
}

// 사용자 상세 응답 형태입니다.
// 비밀번호 변경 API 호출에 필요한 userId를 여기서 꺼냅니다.
export interface UserDetailResponse {
  userId: number
  userPublicId: string
  organizationPublicId: string
  loginId: string
  firstName: string
  middleName?: string | null
  lastName: string
  email: string
  phone: string
  jobTitle?: string | null
  userRole: 'USER' | 'ORG_ADMIN' | 'ADMIN'
  status: string
  passwordChangedAt?: string | null
  createdAt?: string
}

export interface UserDetailResponse extends UserDepartmentSummary, UserProfileImageSummary {}

export interface DepartmentOption {
  departmentPublicId: string
  departmentCode: string
  departmentName: string
  status: string
}

// 비밀번호 변경 요청 바디 형태입니다.
// 현재 비밀번호와 새 비밀번호 2개를 같이 보냅니다.
export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
  newPasswordConfirm: string
}

// userPublicId로 현재 사용자 상세를 조회합니다.
// 여기서 내부 userId를 얻어서 비밀번호 변경 API에 사용합니다.
export async function getUserDetailByPublicId(
  userPublicId: string,
): Promise<UserDetailResponse> {
  const response = await apiClient.get<UserDetailResponse>(
    `/api/auth/users/public/${userPublicId}`,
  )

  return response.data
}

export async function getDepartments(): Promise<DepartmentOption[]> {
  const response = await apiClient.get<DepartmentOption[]>('/api/auth/departments')
  return response.data
}

// userId 기준으로 비밀번호를 변경합니다.
// 성공하면 응답 본문 없이 끝납니다.
export async function changePassword(
  userId: number,
  payload: ChangePasswordPayload,
): Promise<void> {
  await apiClient.patch(`/api/auth/users/${userId}/password`, payload)
}

export interface CreateInitialOrgAdminPayload {
  // 로그인 ID는 서버가 자동 생성하므로 프론트에서는 보내지 않습니다.
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  jobTitle?: string
}

export interface CreateInitialOrgAdminResponse {
  userPublicId: string
  organizationPublicId: string
  // 서버가 자동 생성한 로그인 ID를 응답으로 받습니다.
  loginId: string
  temporaryPassword: string
  passwordChangeRequired: boolean
}

// 관리자가 방금 만든 조직의 최초 ORG_ADMIN 계정을 생성합니다.
export async function createInitialOrgAdmin(
  organizationPublicId: string,
  payload: CreateInitialOrgAdminPayload,
): Promise<CreateInitialOrgAdminResponse> {
  const response = await apiClient.post<CreateInitialOrgAdminResponse>(
    `/api/auth/organizations/${organizationPublicId}/org-admin`,
    payload,
  )

  return response.data
}

export interface CreateOrganizationUserPayload {
  // 로그인 ID는 서버가 자동 생성하므로 프론트에서는 보내지 않습니다.
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  jobTitle?: string
  departmentPublicId: string
}

export interface CreateOrganizationUserResponse {
  userPublicId: string
  organizationPublicId: string
  // 서버가 자동 생성한 로그인 ID를 응답으로 받습니다.
  loginId: string
  temporaryPassword: string
  passwordChangeRequired: boolean
}

// ORG_ADMIN 이 자기 조직 직원 계정을 생성합니다.
export async function createOrganizationUser(
  payload: CreateOrganizationUserPayload,
): Promise<CreateOrganizationUserResponse> {
  const response = await apiClient.post<CreateOrganizationUserResponse>(
    '/api/auth/org-admin/users',
    payload,
  )

  return response.data
}

export interface UpdateUserPayload {
  // 이름입니다.
  firstName?: string
  // 중간이름은 선택값입니다.
  middleName?: string
  // 성입니다.
  lastName?: string
  // 이메일입니다.
  email?: string
  // 연락처입니다.
  phone?: string
  // 직책은 선택값입니다.
  jobTitle?: string
  // 부서 공개 ID 입니다.
  departmentPublicId?: string
  // 프로필 이미지 첨부 공개 ID 입니다.
  profileAttachmentPublicId?: string
  // 프로필 썸네일 경로입니다.
  profileImageThumbPath?: string
}

// 현재 사용자 정보를 수정합니다.
// 백엔드 PATCH /api/auth/users/{userId} 와 연결됩니다.
export async function updateUser(
  userId: number,
  payload: UpdateUserPayload,
): Promise<UserDetailResponse> {
  const response = await apiClient.patch<UserDetailResponse>(
    `/api/auth/users/${userId}`,
    payload,
  )

  return response.data
}

export interface LoginHistoryListItem {
  // 로그인 이력 고유 ID입니다.
  loginHistoryId: number
  // 사용자 내부 ID입니다.
  userId: number
  // 로그인 시각입니다.
  loginAt: string
  // 실패 사유입니다. null 이면 성공 로그인입니다.
  failureReason?: string | null
  // 접속 IP 입니다.
  ipAddress: string
  // 사용자 브라우저 정보입니다.
  userAgent: string
  // 사용자 공개 ID 입니다.
  userPublicId: string
}

// 내 로그인 이력을 페이지 형태로 조회합니다.
// from, to 를 주면 기간 필터까지 같이 보냅니다.
export async function getMyLoginHistories(
  params: HistoryQueryParams = {},
): Promise<PageResponse<LoginHistoryListItem>> {
  const response = await apiClient.get<PageResponse<LoginHistoryListItem>>(
    '/api/auth/login-histories/me',
    {
      params,
    },
  )

  return response.data
}


// 보안 이력 한 줄 응답 형태입니다.
export interface SecurityHistoryListItem {
  // 보안 이력 고유 ID입니다.
  securityHistoryId: number
  // 사용자 내부 ID입니다.
  userId: number
  // 사용자 공개 ID입니다.
  userPublicId: string
  // 내부 이벤트 타입입니다.
  eventType: string
  // 화면에 보여줄 요약 문구입니다.
  summary: string
  // 요청 IP입니다.
  ipAddress?: string | null
  // 브라우저 정보입니다.
  userAgent?: string | null
  // 발생 시각입니다.
  occurredAt: string
}

// 내 보안 이력을 페이지 형태로 조회합니다.
// from, to 를 주면 기간 필터까지 같이 보냅니다.
export async function getMySecurityHistories(
  params: HistoryQueryParams = {},
): Promise<PageResponse<SecurityHistoryListItem>> {
  const response = await apiClient.get<PageResponse<SecurityHistoryListItem>>(
    '/api/auth/security-histories/me',
    {
      params,
    },
  )

  return response.data
}


// 사원 엑셀 업로드 한 줄 결과입니다.
export interface OrganizationUserExcelUploadRowResult {
  // 몇 번째 줄인지 보여줍니다.
  rowNumber: number

  // 성공 여부입니다.
  success: boolean

  // 성공 시 생성된 사용자 공개 ID 입니다.
  userPublicId?: string

  // 성공 시 자동 생성된 로그인 ID 입니다.
  loginId?: string

  // 성공 시 자동 생성된 임시 비밀번호 입니다.
  temporaryPassword?: string

  // 실패 시 에러 문구입니다.
  message?: string
}

// 사원 엑셀 업로드 전체 결과입니다.
export interface OrganizationUserExcelUploadResponse {
  // 총 처리 건수입니다.
  totalCount: number

  // 성공 건수입니다.
  successCount: number

  // 실패 건수입니다.
  failCount: number

  // 줄별 처리 결과입니다.
  results: OrganizationUserExcelUploadRowResult[]
}

// 조직 대표자가 엑셀 파일로 자기 조직 사원을 일괄 등록합니다.
export async function uploadOrganizationUsersExcel(
  file: File,
): Promise<OrganizationUserExcelUploadResponse> {
  // multipart/form-data 로 보내기 위해 FormData 를 만듭니다.
  const formData = new FormData()

  // 백엔드에서 @RequestParam("file") 로 받으므로 key 이름은 file 이어야 합니다.
  formData.append('file', file)

  // 파일 업로드 요청은 JSON 헤더를 제거해야 브라우저가 multipart boundary 를 자동으로 붙입니다.
  const response = await apiClient.post<OrganizationUserExcelUploadResponse>(
    '/api/auth/org-admin/users/upload',
    formData,
    {
      headers: {
        'Content-Type': undefined,
      },
    },
  )

  return response.data
}

