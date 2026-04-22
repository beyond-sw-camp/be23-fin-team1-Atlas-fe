import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { UI_COPY } from '../config/appCopy'
import { useAtlasNavigationStore } from './navigation'
import { useAtlasPreferencesStore } from './preferences'
import { apiClient, ApiError, registerUnauthorizedHandler } from '../services/http'


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
  exp?: number
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

  // 토큰 만료 시 자동 로그아웃시키기 위한 타이머입니다.
  let sessionExpiryTimer: ReturnType<typeof window.setTimeout> | null = null

  // 기존에 걸려 있던 만료 타이머가 있으면 먼저 지웁니다.
  function clearSessionExpiryTimer() {
    if (sessionExpiryTimer) {
      window.clearTimeout(sessionExpiryTimer)
      sessionExpiryTimer = null
    }
  }

  // access token 안의 exp 값을 읽어서 만료 시 자동 로그아웃을 예약합니다.
  function scheduleAutoSignOut(accessToken: string) {
    clearSessionExpiryTimer()

    const claims = decodeAccessToken(accessToken)

    // exp 값이 없으면 만료 시간을 계산할 수 없어서 여기서는 종료합니다.
    if (!claims?.exp) {
      return
    }

    // JWT exp는 초 단위라서 밀리초로 바꿉니다.
    const expiresAtMs = claims.exp * 1000
    const remainingMs = expiresAtMs - Date.now()

    // 이미 만료된 토큰이면 바로 로그아웃합니다.
    if (remainingMs <= 0) {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
      return
    }

    // 남은 시간이 끝나는 시점에 자동 로그아웃합니다.
    sessionExpiryTimer = window.setTimeout(() => {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
    }, remainingMs)
  }


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

      // 로그인에 성공했으니 토큰 만료 시간 기준으로 자동 로그아웃 타이머를 시작합니다.
      scheduleAutoSignOut(accessToken)

      if (mustChangePassword) {
        navigation.navigateToPage('profile')
      } else {

  const firstAvailablePage =
    navigation.availableNavItems.find((item) => !item.hidden)?.key ?? 'profile'

  navigation.navigateToPage(firstAvailablePage)
}


        } catch (error) {
      // 로그인 실패 시 이전 세션 타이머가 남아 있으면 같이 정리합니다.
      clearSessionExpiryTimer()

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

  function signOut(message = '') {
    isAuthenticated.value = false
    userPublicId.value = ''
    organizationPublicId.value = ''
    organizationType.value = ''
    userRole.value = ''
    passwordChangeRequired.value = false

    // 세션 만료나 강제 로그아웃 문구를 로그인 화면에 보여줄 때 씁니다.
    loginError.value = message

    // 남아 있는 자동 로그아웃 타이머가 있으면 같이 정리합니다.
    clearSessionExpiryTimer()

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

  // 서버가 401을 반환하면 여기서 자동 로그아웃을 실행합니다.
  // 로그인/refresh 요청이 아닌 일반 API 요청에서 토큰이 만료됐을 때 사용됩니다.
  registerUnauthorizedHandler(() => {
    signOut(
      preferences.language === 'ko'
        ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
        : 'Your session has expired. Please sign in again.',
    )
  })

  // 새로고침 후에도 저장된 access token 기준으로 자동 로그아웃 타이머를 다시 겁니다.
  const storedAccessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)

  if (isAuthenticated.value && storedAccessToken) {
    scheduleAutoSignOut(storedAccessToken)
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
