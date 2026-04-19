import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

export interface ApiErrorPayload {
  message?: string
  code?: string
}

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

function getApiBaseUrl() {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL

  if (!apiBaseUrl) {
    console.warn('[env] VITE_API_BASE_URL is not defined, using fallback http://localhost:8080')
    return 'http://localhost:8080'
  }

  return normalizeBaseUrl(apiBaseUrl)
}

export class ApiError extends Error {
  status: number
  payload?: ApiErrorPayload

  constructor(status: number, message: string, payload?: ApiErrorPayload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})
// 로그인 후 sessionStorage 에 저장해둔 키 이름입니다.
// session.ts 에 저장하는 이름과 반드시 같아야 합니다.
const ACCESS_TOKEN_STORAGE_KEY = 'atlas-access-token'
const USER_PUBLIC_ID_STORAGE_KEY = 'atlas-user-public-id'
const ORGANIZATION_PUBLIC_ID_STORAGE_KEY = 'atlas-organization-public-id'
const ORGANIZATION_TYPE_STORAGE_KEY = 'atlas-organization-type'
const USER_ROLE_STORAGE_KEY = 'atlas-user-role'

// 값이 있을 때만 헤더를 붙이는 작은 헬퍼 함수입니다.
// 값이 없으면 헤더를 아예 넣지 않습니다.
function applyHeaderIfPresent(
  config: InternalAxiosRequestConfig,
  headerName: string,
  value: string | null,
) {

  // 값이 있을 때만 헤더를 붙입니다.
  if (value && value.trim()) {
    config.headers[headerName] = value
  }
}

// 모든 API 요청에 공통 헤더를 붙입니다.
// 로그인한 사용자 정보가 sessionStorage 에 있으면 자동으로 함께 전송됩니다.
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // headers 객체가 없을 가능성까지 먼저 방어합니다.
    if (!config.headers) {
      config.headers = {} as InternalAxiosRequestConfig['headers']
    }

    // 로그인 후 저장된 토큰과 사용자/조직 정보를 꺼냅니다.
    const accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    const userPublicId = window.sessionStorage.getItem(USER_PUBLIC_ID_STORAGE_KEY)
    const organizationPublicId = window.sessionStorage.getItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY)
    const organizationType = window.sessionStorage.getItem(ORGANIZATION_TYPE_STORAGE_KEY)
    const userRole = window.sessionStorage.getItem(USER_ROLE_STORAGE_KEY)

    // 토큰이 있으면 Authorization 헤더를 붙입니다.
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // 로그인한 사용자 식별값을 붙입니다.
    applyHeaderIfPresent(config, 'X-User-Public-Id', userPublicId)

    // 로그인한 조직 식별값을 붙입니다.
    applyHeaderIfPresent(config, 'X-Organization-Public-Id', organizationPublicId)

    // 로그인한 조직 타입을 붙입니다.
    // 예: BUYER, SUPPLIER, ADMIN
    applyHeaderIfPresent(config, 'X-Organization-Type', organizationType)

    // 로그인한 사용자 권한을 붙입니다.
    // 예: USER, ORG_ADMIN, ADMIN
    applyHeaderIfPresent(config, 'X-User-Role', userRole)

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)



// Add a response interceptor for unified error formatting
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response) {
      const payload = error.response.data
      const message = payload?.message || `API request failed with status ${error.response.status}`
      throw new ApiError(error.response.status, message, payload)
    }
    throw error
  }
)
