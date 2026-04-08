import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { UI_COPY } from '../config/appCopy'
import { useAtlasNavigationStore } from './navigation'
import { useAtlasPreferencesStore } from './preferences'

const AUTH_STORAGE_KEY = 'atlas-authenticated'
const ORG_STORAGE_KEY = 'atlas-organization'

export const useAtlasSessionStore = defineStore('atlasSession', () => {
  const preferences = useAtlasPreferencesStore()
  const navigation = useAtlasNavigationStore()

  const isAuthenticated = ref(window.sessionStorage.getItem(AUTH_STORAGE_KEY) === 'true')
  const loginId = ref('atlas.admin')
  const loginPassword = ref('atlas1234')
  const loginError = ref('')

  function signIn() {
    if (loginId.value === 'atlas.admin' && loginPassword.value === 'atlas1234') {
      isAuthenticated.value = true
      loginError.value = ''
      window.sessionStorage.setItem(AUTH_STORAGE_KEY, 'true')
      window.sessionStorage.setItem(ORG_STORAGE_KEY, preferences.organization)
      return
    }

    loginError.value = UI_COPY.loginError[preferences.language]
  }

  function signOut() {
    isAuthenticated.value = false
    loginError.value = ''
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY)
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
