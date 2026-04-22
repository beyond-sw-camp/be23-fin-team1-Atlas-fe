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

// 401 응답이 왔을 때 session store의 로그아웃 함수를 나중에 연결해 둘 자리입니다.
// http.ts 에서 session store를 직접 import하면 순환 참조가 생길 수 있어서,
// 함수만 등록받아 쓰는 방식으로 분리합니다.
let unauthorizedHandler: null | (() => void) = null

// session store에서 401 처리 함수를 등록할 때 사용합니다.
export function registerUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler
}

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

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // headers 객체가 없는 경우를 먼저 만들어둡니다.
    if (!config.headers) {
      config.headers = {} as InternalAxiosRequestConfig['headers']
    }

    // 현재 요청 URL이 어떤 API인지 확인합니다.
    const requestUrl = config.url ?? ''

    // supply / control / file 계열 요청인지 구분합니다.
    const isSupplyRequest = requestUrl.startsWith('/api/supply')
    const isControlRequest = requestUrl.startsWith('/api/control')
    const isFileRequest = requestUrl.startsWith('/api/files')

    // 로그인 후 세션에 저장된 값을 꺼냅니다.
    const accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
    const userPublicId = window.sessionStorage.getItem(USER_PUBLIC_ID_STORAGE_KEY)
    const organizationPublicId = window.sessionStorage.getItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY)
    const organizationType = window.sessionStorage.getItem(ORGANIZATION_TYPE_STORAGE_KEY)
    const userRole = window.sessionStorage.getItem(USER_ROLE_STORAGE_KEY)

    // 인증 토큰은 모든 보호 API에서 쓸 수 있게 그대로 붙입니다.
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    // 사용자 식별 헤더는 control / file / supply 요청에만 붙입니다.
    if (isSupplyRequest || isControlRequest || isFileRequest) {
      applyHeaderIfPresent(config, 'X-User-Public-Id', userPublicId)
    }

    // 조직/권한 헤더는 supply 요청에만 붙입니다.
    // 검색(/api/search), auth(/api/auth)에는 일부러 붙이지 않습니다.
    if (isSupplyRequest) {
      applyHeaderIfPresent(config, 'X-Organization-Public-Id', organizationPublicId)
      applyHeaderIfPresent(config, 'X-Organization-Type', organizationType)
      applyHeaderIfPresent(config, 'X-User-Role', userRole)
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)



apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    if (error.response) {
      const payload = error.response.data
      const message = payload?.message || `API request failed with status ${error.response.status}`

      // 어떤 요청에서 401이 났는지 확인하려고 요청 URL을 꺼냅니다.
      const requestUrl = error.config?.url ?? ''

      // 현재 access token 이 저장된 상태인지 확인합니다.
      // 로그인도 안 한 상태의 401과 구분하려고 씁니다.
      const hasAccessToken = Boolean(window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY))

      // 로그인/토큰 재발급 요청 자체에서 난 401은 자동 로그아웃 처리에서 제외합니다.
      const isLoginRequest = requestUrl.includes('/api/auth/login')
      const isRefreshRequest = requestUrl.includes('/api/auth/refresh')

      // 이미 로그인한 상태에서 일반 API 요청이 401로 실패하면
      // 세션 만료로 보고 자동 로그아웃을 실행합니다.
      if (
        error.response.status === 401 &&
        hasAccessToken &&
        !isLoginRequest &&
        !isRefreshRequest
      ) {
        unauthorizedHandler?.()
      }

      throw new ApiError(error.response.status, message, payload)
    }

    throw error
  },
)

