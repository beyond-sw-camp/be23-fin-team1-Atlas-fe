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
