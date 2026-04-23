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

// 로그인 API 응답 형태입니다.
// 일반 로그인 성공일 수도 있고, 새 IP 인증 필요 응답일 수도 있습니다.
type LoginResponse = {
  accessToken?: string
  refreshToken?: string
  passwordChangeRequired?: boolean
  ipVerificationRequired?: boolean
  verificationRequestId?: string | null
  verificationExpiresAt?: string | null
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

  // 새 IP 이메일 인증 단계에서 쓰는 상태입니다.
  const loginVerificationRequired = ref(false)
  const loginVerificationRequestId = ref('')
  const loginVerificationCode = ref('')
  const loginVerificationExpiresAt = ref('')
  const loginVerificationError = ref('')

  // 토큰 만료 시 자동 로그아웃용 타이머입니다.
  let sessionExpiryTimer: ReturnType<typeof window.setTimeout> | null = null

  // 남아 있는 만료 타이머를 지웁니다.
  function clearSessionExpiryTimer() {
    if (sessionExpiryTimer) {
      window.clearTimeout(sessionExpiryTimer)
      sessionExpiryTimer = null
    }
  }

  // 저장된 로그인 세션 값을 모두 지웁니다.
  function clearStoredSession() {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    window.sessionStorage.removeItem(ORG_STORAGE_KEY)
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    window.sessionStorage.removeItem(USER_PUBLIC_ID_STORAGE_KEY)
    window.sessionStorage.removeItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY)
    window.sessionStorage.removeItem(ORGANIZATION_TYPE_STORAGE_KEY)
    window.sessionStorage.removeItem(USER_ROLE_STORAGE_KEY)
    window.sessionStorage.removeItem(PASSWORD_CHANGE_REQUIRED_STORAGE_KEY)
  }

  // 인증 완료 상태를 모두 초기화합니다.
  function clearAuthenticatedState() {
    clearSessionExpiryTimer()

    isAuthenticated.value = false
    userPublicId.value = ''
    organizationPublicId.value = ''
    organizationType.value = ''
    userRole.value = ''
    passwordChangeRequired.value = false

    clearStoredSession()
    preferences.syncOrganizationFromSession()
  }

  // 새 IP 인증 단계 상태를 초기화합니다.
  function resetVerificationState() {
    loginVerificationRequired.value = false
    loginVerificationRequestId.value = ''
    loginVerificationCode.value = ''
    loginVerificationExpiresAt.value = ''
    loginVerificationError.value = ''
  }

  // access token 의 exp 값을 읽어서 자동 로그아웃 시간을 잡습니다.
  function scheduleAutoSignOut(accessToken: string) {
    clearSessionExpiryTimer()

    const claims = decodeAccessToken(accessToken)

    // exp 가 없으면 만료 시간을 계산할 수 없어서 여기서 끝냅니다.
    if (!claims?.exp) {
      return
    }

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

    // 만료 시점에 자동 로그아웃합니다.
    sessionExpiryTimer = window.setTimeout(() => {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
    }, remainingMs)
  }

  // 일반 로그인 성공 또는 이메일 인증 성공 후 공통 세션 처리입니다.
  function completeLogin(responseData: LoginResponse) {
    const accessToken = responseData.accessToken
    const refreshToken = responseData.refreshToken
    const mustChangePassword = Boolean(responseData.passwordChangeRequired)

    // 토큰이 없으면 정상 로그인 응답이 아니므로 막습니다.
    if (!accessToken || !refreshToken) {
      throw new Error('Invalid login response')
    }

    const claims = decodeAccessToken(accessToken)
    const mappedOrganization = mapOrganizationType(claims?.organizationType)

    if (
      !claims ||
      !mappedOrganization ||
      !claims.userPublicId ||
      !claims.organizationPublicId ||
      !claims.role
    ) {
      throw new Error('Invalid access token payload')
    }

    window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
    window.sessionStorage.setItem(ORG_STORAGE_KEY, mappedOrganization)
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
    window.sessionStorage.setItem(USER_PUBLIC_ID_STORAGE_KEY, claims.userPublicId)
    window.sessionStorage.setItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY, claims.organizationPublicId)
    window.sessionStorage.setItem(ORGANIZATION_TYPE_STORAGE_KEY, claims.organizationType ?? '')
    window.sessionStorage.setItem(USER_ROLE_STORAGE_KEY, claims.role)
    window.sessionStorage.setItem(
      PASSWORD_CHANGE_REQUIRED_STORAGE_KEY,
      String(mustChangePassword),
    )

    preferences.syncOrganizationFromSession()

    isAuthenticated.value = true
    userPublicId.value = claims.userPublicId
    organizationPublicId.value = claims.organizationPublicId
    organizationType.value = claims.organizationType ?? ''
    userRole.value = claims.role
    passwordChangeRequired.value = mustChangePassword

    loginError.value = ''
    loginPassword.value = ''

    // 인증이 끝났으니 새 IP 인증 상태도 정리합니다.
    resetVerificationState()

    scheduleAutoSignOut(accessToken)

    if (mustChangePassword) {
      navigation.navigateToPage('profile')
      return
    }

    const firstAvailablePage =
      navigation.availableNavItems.find((item) => !item.hidden)?.key ?? 'profile'

    navigation.navigateToPage(firstAvailablePage)
  }

  // 로그인 요청입니다.
  async function signIn() {
    if (!loginId.value || !loginPassword.value) {
      loginError.value = UI_COPY.loginError[preferences.language]
      return
    }

    try {
      loginError.value = ''
      loginVerificationError.value = ''

      const response = await apiClient.post<LoginResponse>('/api/auth/login', {
        loginId: loginId.value,
        password: loginPassword.value,
      })

      // 새 IP 로그인이라면 토큰 저장 대신 이메일 인증 단계로 넘깁니다.
      if (response.data.ipVerificationRequired) {
        clearAuthenticatedState()
        resetVerificationState()

        loginVerificationRequired.value = true
        loginVerificationRequestId.value = response.data.verificationRequestId ?? ''
        loginVerificationExpiresAt.value = response.data.verificationExpiresAt ?? ''
        loginPassword.value = ''

        return
      }

      completeLogin(response.data)
    } catch (error) {
      clearAuthenticatedState()
      resetVerificationState()

      if (error instanceof ApiError) {
        loginError.value = error.payload?.message || UI_COPY.loginError[preferences.language]
        return
      }

      loginError.value = UI_COPY.loginError[preferences.language]
    }
  }

  // 새 IP 이메일 인증 코드를 검증합니다.
  async function verifyLoginIp() {
    if (!loginVerificationRequestId.value || !loginVerificationCode.value.trim()) {
      loginVerificationError.value =
        preferences.language === 'ko'
          ? '이메일 인증 코드를 입력해 주세요.'
          : 'Please enter the verification code.'
      return
    }

    try {
      loginVerificationError.value = ''

      const response = await apiClient.post<LoginResponse>('/api/auth/login/verify-ip', {
        verificationRequestId: loginVerificationRequestId.value,
        verificationCode: loginVerificationCode.value.trim(),
      })

      completeLogin(response.data)
    } catch (error) {
      if (error instanceof ApiError) {
        const message =
          error.payload?.message ||
          (preferences.language === 'ko'
            ? '이메일 인증에 실패했습니다.'
            : 'Email verification failed.')

        const code = error.payload?.code

        // 만료나 코드 불일치는 백엔드에서 인증 요청을 끝내므로 다시 로그인으로 돌립니다.
        if (
          code === 'IP_VERIFICATION_EXPIRED' ||
          code === 'IP_VERIFICATION_CODE_MISMATCH'
        ) {
          resetVerificationState()
          loginError.value = message
          loginPassword.value = ''
          return
        }

        loginVerificationError.value = message
        return
      }

      loginVerificationError.value =
        preferences.language === 'ko'
          ? '이메일 인증 중 오류가 발생했습니다.'
          : 'An error occurred during email verification.'
    }
  }

  // 사용자가 인증 단계를 취소하고 로그인 화면으로 돌아갈 때 씁니다.
  function cancelLoginVerification() {
    resetVerificationState()
    loginPassword.value = ''
  }

  // 강제 로그아웃 또는 수동 로그아웃 처리입니다.
  function signOut(message = '') {
    clearAuthenticatedState()
    resetVerificationState()

    loginError.value = message
    navigation.navigateToPage('profile')
  }

  // 서버가 401 을 반환하면 자동 로그아웃합니다.
  registerUnauthorizedHandler(() => {
    signOut(
      preferences.language === 'ko'
        ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
        : 'Your session has expired. Please sign in again.',
    )
  })

  // 이미 로그인된 상태로 새로고침하면 기존 access token 기준으로 타이머를 다시 겁니다.
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
    loginVerificationCode,
    loginVerificationError,
    loginVerificationExpiresAt,
    loginVerificationRequestId,
    loginVerificationRequired,
    organizationPublicId,
    organizationType,
    passwordChangeRequired,
    signIn,
    signOut,
    verifyLoginIp,
    cancelLoginVerification,
    userPublicId,
    userRole,
  }
})
