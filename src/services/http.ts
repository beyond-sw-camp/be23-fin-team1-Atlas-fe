import { appEnv } from '../config/env'

export interface ApiErrorPayload {
  message?: string
  code?: string
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

export function buildApiUrl(path: string) {
  return `${appEnv.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    ...init,
  })

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined

    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch {
      payload = undefined
    }

    throw new ApiError(response.status, payload?.message ?? `API request failed with status ${response.status}`, payload)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
