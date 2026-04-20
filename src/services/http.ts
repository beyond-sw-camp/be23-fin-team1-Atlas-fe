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

// Add a request interceptor for X-User-Public-Id
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // In a full auth implementation, this would be fetched from a session store.
    // For now, we hardcode the initial test user.
    const accessToken = window.sessionStorage.getItem('atlas-access-token')
    
    // API 명세서에 따른 공통 헤더 필수값 추가 (이력 추적 및 권한 검증)
    config.headers['X-User-Public-Id'] = window.sessionStorage.getItem('atlas-user-public-id') || '01HQ456789ABCDEF01HQ456789'
        config.headers['X-Organization-Public-Id'] =
      window.sessionStorage.getItem('atlas-organization-public-id') || ''

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
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
