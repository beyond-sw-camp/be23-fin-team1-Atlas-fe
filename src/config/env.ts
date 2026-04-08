const DEFAULT_API_BASE_URL = 'http://localhost:8080'

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '')
}

export const appEnv = {
  apiBaseUrl: normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL),
} as const
