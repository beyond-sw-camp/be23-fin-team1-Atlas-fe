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

export const useAtlasSessionStore = defineStore('atlasSession', () => {
  const preferences = useAtlasPreferencesStore()
  const navigation = useAtlasNavigationStore()

  const isAuthenticated = ref(window.sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true')
  const loginId = ref('')
  const loginPassword = ref('')
  const loginError = ref('')

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

      const { accessToken, refreshToken } = response.data

      window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
      window.sessionStorage.setItem(ORG_STORAGE_KEY, preferences.organization)
      window.sessionStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
      window.sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)

      isAuthenticated.value = true
      loginError.value = ''
      loginPassword.value = ''
      navigation.navigateToPage('controlTower')
    } catch (error) {
      isAuthenticated.value = false
      window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
      window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
      window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)

      if (error instanceof ApiError) {
        loginError.value = error.payload?.message || UI_COPY.loginError[preferences.language]
        return
      }

      loginError.value = UI_COPY.loginError[preferences.language]
    }
  }

  function signOut() {
    isAuthenticated.value = false
    loginError.value = ''
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
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
    signIn,
    signOut,
  }
})
