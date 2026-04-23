import { computed, ref, watch } from 'vue'
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

// 로그인 연장 API는 새 access token만 내려줍니다.
type RefreshAccessTokenResponse = {
  accessToken?: string
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
    // 헤더에서 보여줄 세션 만료 시각입니다.
  const sessionExpiresAt = ref<number | null>(null)

  // 헤더에서 보여줄 남은 시간(ms)입니다.
  const sessionRemainingMs = ref(0)

  // 로그인 연장 버튼을 연속으로 누르는 것을 막습니다.
  const isRefreshingSession = ref(false)

  // 헤더 시간을 1초마다 줄여 보여주는 타이머입니다.
  let sessionCountdownTimer: ReturnType<typeof window.setInterval> | null = null

  // 남은 시간을 현재 시각 기준으로 다시 계산합니다.
  function updateSessionRemainingMs() {
    if (!sessionExpiresAt.value) {
      sessionRemainingMs.value = 0
      return
    }

    sessionRemainingMs.value = Math.max(sessionExpiresAt.value - Date.now(), 0)
  }

  // 1초 카운트다운 타이머를 정리합니다.
  function clearSessionCountdownTimer() {
    if (sessionCountdownTimer) {
      window.clearInterval(sessionCountdownTimer)
      sessionCountdownTimer = null
    }
  }

  // 헤더에 보여줄 60:00 같은 문자열을 만듭니다.
  function formatSessionRemainingLabel(remainingMs: number) {
    const totalSeconds = Math.max(Math.ceil(remainingMs / 1000), 0)
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')

    return `${minutes}:${seconds}`
  }

  // 템플릿에서는 이 값만 바로 쓰면 됩니다.
  const sessionRemainingLabel = computed(() => {
    return formatSessionRemainingLabel(sessionRemainingMs.value)
  })


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

  // 인증된 세션 값을 모두 비웁니다.
  function clearAuthenticatedState() {
    // 자동 로그아웃 타이머를 먼저 지웁니다.
    clearSessionExpiryTimer()

    // 헤더 카운트다운 타이머도 같이 지웁니다.
    clearSessionCountdownTimer()

    // 헤더 시간도 같이 초기화합니다.
    sessionExpiresAt.value = null
    sessionRemainingMs.value = 0
    isRefreshingSession.value = false

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
    // access token 안의 사용자 정보를 현재 세션 상태에 다시 반영합니다.
  function syncAuthenticatedUserFromAccessToken(accessToken: string) {
    const claims = decodeAccessToken(accessToken)
    const mappedOrganization = mapOrganizationType(claims?.organizationType)

    // 토큰 안 핵심 값이 비었으면 여기서 중단합니다.
    if (
      !claims ||
      !mappedOrganization ||
      !claims.userPublicId ||
      !claims.organizationPublicId ||
      !claims.role
    ) {
      throw new Error('Invalid access token payload')
    }

    // 새 access token 기준으로 세션 저장값을 다시 맞춥니다.
    window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
    window.sessionStorage.setItem(ORG_STORAGE_KEY, mappedOrganization)
    window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
    window.sessionStorage.setItem(USER_PUBLIC_ID_STORAGE_KEY, claims.userPublicId)
    window.sessionStorage.setItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY, claims.organizationPublicId)
    window.sessionStorage.setItem(ORGANIZATION_TYPE_STORAGE_KEY, claims.organizationType ?? '')
    window.sessionStorage.setItem(USER_ROLE_STORAGE_KEY, claims.role)

    // 화면에서 참조하는 상태도 같이 맞춥니다.
    preferences.syncOrganizationFromSession()

    isAuthenticated.value = true
    userPublicId.value = claims.userPublicId
    organizationPublicId.value = claims.organizationPublicId
    organizationType.value = claims.organizationType ?? ''
    userRole.value = claims.role
  }


  // access token의 exp 시간으로 자동 로그아웃과 헤더 카운트다운을 같이 겁니다.
  function scheduleAutoSignOut(accessToken: string) {
    // 이전 타이머는 먼저 모두 정리합니다.
    clearSessionExpiryTimer()
    clearSessionCountdownTimer()

    // 계산 전에는 헤더 값을 한 번 비웁니다.
    sessionExpiresAt.value = null
    sessionRemainingMs.value = 0

    const claims = decodeAccessToken(accessToken)

    // exp가 없으면 남은 시간을 계산할 수 없습니다.
    if (!claims?.exp) {
      return
    }

    const expiresAtMs = claims.exp * 1000
    const remainingMs = expiresAtMs - Date.now()

    // 헤더 카운트다운 기준 시각을 저장합니다.
    sessionExpiresAt.value = expiresAtMs

    // 처음 값도 바로 한 번 계산합니다.
    updateSessionRemainingMs()

    // 이미 만료된 토큰이면 바로 로그아웃합니다.
    if (remainingMs <= 0) {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
      return
    }

    // 헤더 숫자가 1초마다 줄어들게 합니다.
    sessionCountdownTimer = window.setInterval(() => {
      updateSessionRemainingMs()

      // 0초가 되면 화면용 interval만 먼저 정리합니다.
      if (sessionRemainingMs.value <= 0) {
        clearSessionCountdownTimer()
      }
    }, 1000)

    // 실제 만료 시점에는 자동 로그아웃합니다.
    sessionExpiryTimer = window.setTimeout(() => {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
    }, remainingMs)
  }

  // 일반 로그인 성공 또는 IP 인증 성공 뒤 공통 세션 처리입니다.
  function completeLogin(responseData: LoginResponse) {
    const accessToken = responseData.accessToken
    const refreshToken = responseData.refreshToken
    const mustChangePassword = Boolean(responseData.passwordChangeRequired)

    // 로그인 응답에 토큰이 빠지면 중단합니다.
    if (!accessToken || !refreshToken) {
      throw new Error('Invalid login response')
    }

    // refresh token은 로그인 성공 때만 새로 저장합니다.
    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)

    // 비밀번호 강제 변경 여부도 같이 저장합니다.
    window.sessionStorage.setItem(
      PASSWORD_CHANGE_REQUIRED_STORAGE_KEY,
      String(mustChangePassword),
    )

    // access token 안의 값으로 현재 세션 상태를 다시 맞춥니다.
    syncAuthenticatedUserFromAccessToken(accessToken)
    passwordChangeRequired.value = mustChangePassword

    loginError.value = ''
    loginPassword.value = ''

    // IP 인증 상태는 여기서 끝났으니 정리합니다.
    resetVerificationState()

    // 헤더 시간과 자동 로그아웃 타이머를 다시 겁니다.
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

    // 로그인 연장 버튼을 누르면 refresh token으로 새 access token을 받습니다.
  async function extendSession() {
    // 같은 요청을 연달아 보내지 않게 막습니다.
    if (isRefreshingSession.value) {
      return
    }

    // refresh token이 없으면 연장할 수 없습니다.
    const refreshToken = window.sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)

    if (!refreshToken) {
      signOut(
        preferences.language === 'ko'
          ? '로그인 정보가 없어 다시 로그인해야 합니다.'
          : 'Session information is missing. Please sign in again.',
      )
      return
    }

    try {
      isRefreshingSession.value = true

      // refresh token으로 새 access token을 다시 받습니다.
      const response = await apiClient.post<RefreshAccessTokenResponse>('/api/auth/refresh', {
        refreshToken,
      })

      const nextAccessToken = response.data.accessToken

      // 응답에 access token이 없으면 중단합니다.
      if (!nextAccessToken) {
        throw new Error('Invalid refresh response')
      }

      // 새 access token 기준으로 사용자 상태를 다시 맞춥니다.
      syncAuthenticatedUserFromAccessToken(nextAccessToken)

      // 헤더 카운트다운과 자동 로그아웃 시간도 다시 시작합니다.
      scheduleAutoSignOut(nextAccessToken)
    } catch (error) {
      if (error instanceof ApiError) {
        signOut(
          error.payload?.message ||
            (preferences.language === 'ko'
              ? '로그인 연장에 실패했습니다. 다시 로그인해 주세요.'
              : 'Failed to extend the session. Please sign in again.'),
        )
        return
      }

      signOut(
        preferences.language === 'ko'
          ? '로그인 연장 중 오류가 발생했습니다. 다시 로그인해 주세요.'
          : 'An error occurred while extending the session. Please sign in again.',
      )
    } finally {
      isRefreshingSession.value = false
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
    extendSession,
    isRefreshingSession,
    sessionRemainingLabel,
    sessionRemainingMs,

  }
})
