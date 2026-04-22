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

export interface MyInfoResponse {
  organizationPublicId: string
  userPublicId: string
  role: 'USER' | 'ORG_ADMIN' | 'ADMIN'
}

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
