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

function getSessionStorageValue(key: string) {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(key) ?? ''
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

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = getSessionStorageValue('atlas-access-token')
    const userPublicId = getSessionStorageValue('atlas-user-public-id')
    const organizationPublicId = getSessionStorageValue('atlas-organization-public-id')
    const organizationType = getSessionStorageValue('atlas-organization-type')
    const userRole = getSessionStorageValue('atlas-user-role')

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }

    if (userPublicId) {
      config.headers['X-User-Public-Id'] = userPublicId
    }

    if (organizationPublicId) {
      config.headers['X-Organization-Public-Id'] = organizationPublicId
    }

    if (organizationType) {
      config.headers['X-Organization-Type'] = organizationType
    }

    if (userRole) {
      config.headers['X-User-Role'] = userRole
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
