import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { UI_COPY } from '../config/appCopy'
import { useAtlasNavigationStore } from './navigation'
import { useAtlasPreferencesStore } from './preferences'
import { apiClient, ApiError } from '../services/http'

const AUTH_STORAGE_KEY = 'atlas-authenticated'
const ORG_STORAGE_KEY = 'atlas-organization'
const ACCESS_TOKEN_STORAGE_KEY = 'atlas-access-token'
const REFRESH_TOKEN_STORAGE_KEY = 'atlas-refresh-token'
const USER_PUBLIC_ID_STORAGE_KEY = 'atlas-user-public-id'
const ORGANIZATION_PUBLIC_ID_STORAGE_KEY = 'atlas-organization-public-id'
const ORGANIZATION_TYPE_STORAGE_KEY = 'atlas-organization-type'
const USER_ROLE_STORAGE_KEY = 'atlas-user-role'
const PASSWORD_CHANGE_REQUIRED_STORAGE_KEY = 'atlas-password-change-required'

type AccessTokenClaims = {
  userPublicId?: string
  organizationPublicId?: string
  organizationType?: 'BUYER' | 'SUPPLIER' | 'ADMIN'
  role?: 'USER' | 'ORG_ADMIN' | 'ADMIN'
}

function decodeAccessToken(accessToken: string): AccessTokenClaims | null {
  try {
    const payload = accessToken.split('.')[1]
    if (!payload) return null

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')

    return JSON.parse(window.atob(padded)) as AccessTokenClaims
  } catch {
    return null
  }
}

function mapOrganizationType(value: AccessTokenClaims['organizationType']) {
  switch (value) {
    case 'BUYER':
      return 'mainBuyer'
    case 'SUPPLIER':
      return 'supplier'
    case 'ADMIN':
      return 'admin'
    default:
      return null
  }
}

export const useAtlasSessionStore = defineStore('atlasSession', () => {
  const preferences = useAtlasPreferencesStore()
  const navigation = useAtlasNavigationStore()

  const isAuthenticated = ref(window.sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true')
  const loginId = ref('')
  const loginPassword = ref('')
  const loginError = ref('')
  const userPublicId = ref(window.sessionStorage.getItem(USER_PUBLIC_ID_STORAGE_KEY) ?? '')
  const organizationPublicId = ref(window.sessionStorage.getItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY) ?? '')
  const organizationType = ref(window.sessionStorage.getItem(ORGANIZATION_TYPE_STORAGE_KEY) ?? '')
  const userRole = ref(window.sessionStorage.getItem(USER_ROLE_STORAGE_KEY) ?? '')
  const passwordChangeRequired = ref(
  window.sessionStorage.getItem(PASSWORD_CHANGE_REQUIRED_STORAGE_KEY) === 'true',
)

  async function signIn() {
    if (!loginId.value || !loginPassword.value) {
      loginError.value = UI_COPY.loginError[preferences.language]
      return
    }

    try {
      const response = await apiClient.post('/api/auth/login', {
        loginId: loginId.value,
        password: loginPassword.value,
      })

      const {
  accessToken,
  refreshToken,
  passwordChangeRequired: mustChangePassword,
} = response.data

      const claims = decodeAccessToken(accessToken)
      const mappedOrganization = mapOrganizationType(claims?.organizationType)

      if (!claims || !mappedOrganization || !claims.userPublicId || !claims.organizationPublicId || !claims.role) {
        throw new Error('Invalid access token payload')
      }

      window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
      window.sessionStorage.setItem(ORG_STORAGE_KEY, mappedOrganization)
      preferences.syncOrganizationFromSession()

      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
      window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
      window.sessionStorage.setItem(USER_PUBLIC_ID_STORAGE_KEY, claims.userPublicId)
      window.sessionStorage.setItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY, claims.organizationPublicId)
      window.sessionStorage.setItem(ORGANIZATION_TYPE_STORAGE_KEY, claims.organizationType ?? '')
      window.sessionStorage.setItem(USER_ROLE_STORAGE_KEY, claims.role)
      window.sessionStorage.setItem(
        PASSWORD_CHANGE_REQUIRED_STORAGE_KEY,
         String(Boolean(mustChangePassword)),
      )


      isAuthenticated.value = true
      userPublicId.value = claims.userPublicId
      organizationPublicId.value = claims.organizationPublicId
      organizationType.value = claims.organizationType ?? ''
      userRole.value = claims.role
      passwordChangeRequired.value = Boolean(mustChangePassword)
      loginError.value = ''
      loginPassword.value = ''

if (mustChangePassword) {
  navigation.navigateToPage('profile')
} else {
  const firstAvailablePage =
    navigation.availableNavItems.find((item) => !item.hidden)?.key ?? 'profile'

  navigation.navigateToPage(firstAvailablePage)
}


    } catch (error) {
      isAuthenticated.value = false
      userPublicId.value = ''
      organizationPublicId.value = ''
      organizationType.value = ''
      userRole.value = ''
      passwordChangeRequired.value = false


      window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
      window.sessionStorage.removeItem(ORG_STORAGE_KEY)
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
      window.sessionStorage.removeItem(USER_PUBLIC_ID_STORAGE_KEY)
      window.sessionStorage.removeItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY)
      window.sessionStorage.removeItem(ORGANIZATION_TYPE_STORAGE_KEY)
      window.sessionStorage.removeItem(USER_ROLE_STORAGE_KEY)
      window.sessionStorage.removeItem(PASSWORD_CHANGE_REQUIRED_STORAGE_KEY)


      if (error instanceof ApiError) {
        loginError.value = error.payload?.message || UI_COPY.loginError[preferences.language]
        return
      }

      loginError.value = UI_COPY.loginError[preferences.language]
    }
  }

  function signOut() {
    isAuthenticated.value = false
    userPublicId.value = ''
    organizationPublicId.value = ''
    organizationType.value = ''
    userRole.value = ''
    loginError.value = ''
    passwordChangeRequired.value = false


    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    window.sessionStorage.removeItem(ORG_STORAGE_KEY)
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    window.sessionStorage.removeItem(USER_PUBLIC_ID_STORAGE_KEY)
    window.sessionStorage.removeItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY)
    window.sessionStorage.removeItem(ORGANIZATION_TYPE_STORAGE_KEY)
    window.sessionStorage.removeItem(USER_ROLE_STORAGE_KEY)
    window.sessionStorage.removeItem(PASSWORD_CHANGE_REQUIRED_STORAGE_KEY)

    preferences.syncOrganizationFromSession()

    navigation.navigateToPage('profile')

  }

  watch(
    () => preferences.language,
    (nextLanguage) => {
      if (loginError.value) {
        loginError.value = UI_COPY.loginError[nextLanguage]
      }
    },
    { immediate: true },
  )

  return {
    isAuthenticated,
    loginError,
    loginId,
    loginPassword,
    organizationPublicId,
    organizationType,
    passwordChangeRequired,
    signIn,
    signOut,
    userPublicId,
    userRole,
  }
})
