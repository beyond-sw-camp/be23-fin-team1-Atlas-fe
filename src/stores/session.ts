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

type LoginResponse = {
  accessToken?: string
  refreshToken?: string
  passwordChangeRequired?: boolean
  ipVerificationRequired?: boolean
  verificationRequestId?: string | null
  verificationExpiresAt?: string | null
}

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
  const organizationPublicId = ref(
    window.sessionStorage.getItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY) ?? '',
  )
  const organizationType = ref(window.sessionStorage.getItem(ORGANIZATION_TYPE_STORAGE_KEY) ?? '')
  const userRole = ref(window.sessionStorage.getItem(USER_ROLE_STORAGE_KEY) ?? '')
  const passwordChangeRequired = ref(
    window.sessionStorage.getItem(PASSWORD_CHANGE_REQUIRED_STORAGE_KEY) === 'true',
  )

  const loginVerificationRequired = ref(false)
  const loginVerificationRequestId = ref('')
  const loginVerificationCode = ref('')
  const loginVerificationExpiresAt = ref('')
  const loginVerificationError = ref('')

  const sessionExpiresAt = ref<number | null>(null)
  const sessionRemainingMs = ref(0)
  const isRefreshingSession = ref(false)

  // 세션 만료/중복 로그인 안내 모달 상태입니다.
const sessionNoticeModalOpen = ref(false)
const sessionNoticeTitle = ref('')
const sessionNoticeMessage = ref('')

  let sessionCountdownTimer: ReturnType<typeof window.setInterval> | null = null
  let sessionExpiryTimer: ReturnType<typeof window.setTimeout> | null = null

  // 중복 로그인 감지용 타이머입니다.
  let duplicateLoginCheckTimer: ReturnType<typeof window.setInterval> | null = null

  // 401이 동시에 여러 번 터질 때 alert가 여러 번 뜨는 걸 막습니다.
  let isHandlingUnauthorized = false

  function updateSessionRemainingMs() {
    if (!sessionExpiresAt.value) {
      sessionRemainingMs.value = 0
      return
    }

    sessionRemainingMs.value = Math.max(sessionExpiresAt.value - Date.now(), 0)
  }

  function clearSessionCountdownTimer() {
    if (sessionCountdownTimer) {
      window.clearInterval(sessionCountdownTimer)
      sessionCountdownTimer = null
    }
  }

  function clearSessionExpiryTimer() {
    if (sessionExpiryTimer) {
      window.clearTimeout(sessionExpiryTimer)
      sessionExpiryTimer = null
    }
  }

  function stopDuplicateLoginCheckTimer() {
    if (duplicateLoginCheckTimer) {
      window.clearInterval(duplicateLoginCheckTimer)
      duplicateLoginCheckTimer = null
    }
  }

async function checkDuplicateLoginSession() {
  if (!isAuthenticated.value || isHandlingUnauthorized) return

  const accessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  if (!accessToken) return

  try {
    await apiClient.get('/api/auth/me')
  } catch {
    // 401 처리는 http.ts 인터셉터와 registerUnauthorizedHandler에서 처리합니다.
  }
}

function startDuplicateLoginCheckTimer() {
  stopDuplicateLoginCheckTimer()

  // 로그인 직후 한 번 바로 확인하고, 이후 1초마다 확인합니다.
  void checkDuplicateLoginSession()

  duplicateLoginCheckTimer = window.setInterval(() => {
    void checkDuplicateLoginSession()
  }, 1000)
}

  function formatSessionRemainingLabel(remainingMs: number) {
    const totalSeconds = Math.max(Math.ceil(remainingMs / 1000), 0)
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
    const seconds = String(totalSeconds % 60).padStart(2, '0')

    return `${minutes}:${seconds}`
  }

  const sessionRemainingLabel = computed(() => {
    return formatSessionRemainingLabel(sessionRemainingMs.value)
  })

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

  function clearAuthenticatedState() {
    clearSessionExpiryTimer()
    clearSessionCountdownTimer()
    stopDuplicateLoginCheckTimer()

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

  function resetVerificationState() {
    loginVerificationRequired.value = false
    loginVerificationRequestId.value = ''
    loginVerificationCode.value = ''
    loginVerificationExpiresAt.value = ''
    loginVerificationError.value = ''
  }

  function syncAuthenticatedUserFromAccessToken(accessToken: string) {
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
    window.sessionStorage.setItem(USER_PUBLIC_ID_STORAGE_KEY, claims.userPublicId)
    window.sessionStorage.setItem(ORGANIZATION_PUBLIC_ID_STORAGE_KEY, claims.organizationPublicId)
    window.sessionStorage.setItem(ORGANIZATION_TYPE_STORAGE_KEY, claims.organizationType ?? '')
    window.sessionStorage.setItem(USER_ROLE_STORAGE_KEY, claims.role)

    preferences.syncOrganizationFromSession()

    isAuthenticated.value = true
    userPublicId.value = claims.userPublicId
    organizationPublicId.value = claims.organizationPublicId
    organizationType.value = claims.organizationType ?? ''
    userRole.value = claims.role
  }

  function scheduleAutoSignOut(accessToken: string) {
    clearSessionExpiryTimer()
    clearSessionCountdownTimer()

    sessionExpiresAt.value = null
    sessionRemainingMs.value = 0

    const claims = decodeAccessToken(accessToken)

    if (!claims?.exp) {
      return
    }

    const expiresAtMs = claims.exp * 1000
    const remainingMs = expiresAtMs - Date.now()

    sessionExpiresAt.value = expiresAtMs
    updateSessionRemainingMs()

    if (remainingMs <= 0) {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
      return
    }

    sessionCountdownTimer = window.setInterval(() => {
      updateSessionRemainingMs()

      if (sessionRemainingMs.value <= 0) {
        clearSessionCountdownTimer()
      }
    }, 1000)

    sessionExpiryTimer = window.setTimeout(() => {
      signOut(
        preferences.language === 'ko'
          ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
          : 'Your session has expired. Please sign in again.',
      )
    }, remainingMs)
  }

  function completeLogin(responseData: LoginResponse) {
    const accessToken = responseData.accessToken
    const refreshToken = responseData.refreshToken
    const mustChangePassword = Boolean(responseData.passwordChangeRequired)

    if (!accessToken || !refreshToken) {
      throw new Error('Invalid login response')
    }

    isHandlingUnauthorized = false

    window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)

    window.sessionStorage.setItem(
      PASSWORD_CHANGE_REQUIRED_STORAGE_KEY,
      String(mustChangePassword),
    )

    syncAuthenticatedUserFromAccessToken(accessToken)
    passwordChangeRequired.value = mustChangePassword

    loginError.value = ''
    loginPassword.value = ''

    resetVerificationState()

    scheduleAutoSignOut(accessToken)

    // 로그인 성공 후부터 중복 로그인 감지를 시작합니다.
    startDuplicateLoginCheckTimer()

    if (mustChangePassword) {
      navigation.navigateToPage('profile')
      return
    }

    const firstAvailablePage =
      navigation.availableNavItems.find((item) => !item.hidden)?.key ?? 'profile'

    navigation.navigateToPage(firstAvailablePage)
  }

  async function signIn() {
    if (!loginId.value || !loginPassword.value) {
      loginError.value = UI_COPY.loginError[preferences.language]
      return
    }

    try {
      isHandlingUnauthorized = false
      loginError.value = ''
      loginVerificationError.value = ''

      const response = await apiClient.post<LoginResponse>('/api/auth/login', {
        loginId: loginId.value,
        password: loginPassword.value,
      })

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

  async function extendSession() {
    if (isRefreshingSession.value) {
      return
    }

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

      const response = await apiClient.post<RefreshAccessTokenResponse>('/api/auth/refresh', {
        refreshToken,
      })

      const nextAccessToken = response.data.accessToken

      if (!nextAccessToken) {
        throw new Error('Invalid refresh response')
      }

      syncAuthenticatedUserFromAccessToken(nextAccessToken)

      scheduleAutoSignOut(nextAccessToken)

      // 혹시 타이머가 꺼져 있으면 다시 켭니다.
      startDuplicateLoginCheckTimer()
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

  function cancelLoginVerification() {
    resetVerificationState()
    loginPassword.value = ''
  }

  function signOut(message = '') {
    clearAuthenticatedState()
    resetVerificationState()

    loginError.value = message
    navigation.navigateToPage('profile')
  }

 function closeSessionNoticeModal() {
  sessionNoticeModalOpen.value = false
  sessionNoticeTitle.value = ''
  sessionNoticeMessage.value = ''
}

registerUnauthorizedHandler((payload) => {
  // 로그인 안 된 상태의 401, 로그인 실패 401 등은 여기서 모달을 띄우지 않습니다.
  if (!isAuthenticated.value) {
    return
  }

  // 여러 API가 동시에 401을 받으면 모달이 여러 번 뜰 수 있어서 막습니다.
  if (isHandlingUnauthorized) {
    return
  }

  isHandlingUnauthorized = true

  const isDuplicateLogin = payload?.code === 'DUPLICATE_LOGIN_SESSION_EXPIRED'

  const title = isDuplicateLogin
    ? preferences.language === 'ko'
      ? '중복 로그인 감지'
      : 'Duplicate login detected'
    : preferences.language === 'ko'
      ? '세션 만료'
      : 'Session expired'

  const message = isDuplicateLogin
    ? preferences.language === 'ko'
      ? '다른 기기에서 로그인되어 현재 기기에서 로그아웃되었습니다. 다시 로그인해 주세요.'
      : 'You have been signed out because your account was used on another device. Please sign in again.'
    : payload?.message ||
      (preferences.language === 'ko'
        ? '세션이 만료되었습니다. 다시 로그인해 주세요.'
        : 'Your session has expired. Please sign in again.')

  clearAuthenticatedState()
  resetVerificationState()

  loginError.value = message
  navigation.navigateToPage('profile')

  sessionNoticeTitle.value = title
  sessionNoticeMessage.value = message
  sessionNoticeModalOpen.value = true
})

  const storedAccessToken = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)

  if (isAuthenticated.value && storedAccessToken) {
    scheduleAutoSignOut(storedAccessToken)
    startDuplicateLoginCheckTimer()
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
    sessionNoticeModalOpen,
    sessionNoticeTitle,
    sessionNoticeMessage,
    closeSessionNoticeModal,
  }
})