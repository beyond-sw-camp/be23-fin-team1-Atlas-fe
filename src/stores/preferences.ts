import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { DEFAULT_ORGANIZATION, DEFAULT_PAGE, DEFAULT_THEME } from '../config/appDefaults'
import { NAV_ITEMS, isPageKey } from '../config/navigation'
import { DESIGN_THEME_TOKENS, isOrganization, isTheme } from '../config/theme'
import { PAGE_SHELL_CLASSES } from '../features/shared/pagePresentation'
import { updateMyPersonalSettings } from '../services/user'
import type { AppLanguage, OrganizationType, PageKey, ScreenTheme } from '../types'

const ORG_STORAGE_KEY = 'atlas-organization'
const LANG_STORAGE_KEY = 'atlas-language'
const THEME_STORAGE_KEY = 'atlas-theme'
const ACCESS_TOKEN_STORAGE_KEY = 'atlas-access-token'
const DEFAULT_LANGUAGE: AppLanguage = 'ko'

function getStoredOrganization(): OrganizationType {
  const value = window.sessionStorage.getItem(ORG_STORAGE_KEY) ?? undefined
  return isOrganization(value) ? value : DEFAULT_ORGANIZATION
}

function getStoredTheme(): ScreenTheme {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY) ?? undefined
  return isTheme(value) ? value : DEFAULT_THEME
}

function getStoredLanguage(): AppLanguage {
  return DEFAULT_LANGUAGE
}

const OPERATION_DETAIL_PAGE_KEYS: Record<string, PageKey> = {
  orders: 'ordersDesk',
  shipments: 'shipments',
  returns: 'returns',
  inventory: 'inventory',
  items: 'items',
  suppliers: 'supplierControl',
  'logistics-nodes': 'logisticsNodes',
  settlements: 'settlements',
  certificates: 'certificateWatch',
}

const ROUTE_PAGE_KEY_OVERRIDES: Record<string, PageKey> = {
  orderCreate: 'ordersDesk',
  shipmentCreate: 'shipments',
  settlementBudgetCreate: 'settlements',
  returnCreate: 'returns',
}

function getRouteNamePageKey(value: unknown, kind: unknown): PageKey {
  if (value === 'operationDetail' && typeof kind === 'string') {
    return OPERATION_DETAIL_PAGE_KEYS[kind] ?? DEFAULT_PAGE
  }

  if (typeof value === 'string' && ROUTE_PAGE_KEY_OVERRIDES[value]) {
    return ROUTE_PAGE_KEY_OVERRIDES[value]
  }

  return typeof value === 'string' && isPageKey(value) ? value : DEFAULT_PAGE
}

function toRgbTuple(hex: string) {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized
  const numeric = parseInt(value, 16)
  const r = (numeric >> 16) & 255
  const g = (numeric >> 8) & 255
  const b = numeric & 255

  return `${r} ${g} ${b}`
}

function getNavItemsForOrganization(organization: OrganizationType) {
  return NAV_ITEMS.filter((item) => item.organizations.includes(organization))
}

export const useAtlasPreferencesStore = defineStore('atlasPreferences', () => {
  const route = useRoute()
  const router = useRouter()

  const pageKey = computed<PageKey>(() => getRouteNamePageKey(route.name, route.params.kind))
  const theme = ref<ScreenTheme>(getStoredTheme())
  const language = ref<AppLanguage>(getStoredLanguage())
  const organization = ref<OrganizationType>(getStoredOrganization())

  const screenClasses = computed(() => PAGE_SHELL_CLASSES[pageKey.value] ?? [])
  const screenVars = computed(() =>
    Object.fromEntries(
      Object.entries(theme.value === 'light' ? DESIGN_THEME_TOKENS.light : DESIGN_THEME_TOKENS.dark).flatMap(([token, hex]) => [
        [`--${token}`, hex],
        [`--${token}-rgb`, toRgbTuple(hex)],
      ]),
    ),
  )

  function buildQuery() {
    return {}
  }

  function pageLocation(nextPageKey: PageKey) {
    return { name: nextPageKey, query: buildQuery() }
  }

  function setTheme(nextTheme: ScreenTheme) {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    theme.value = nextTheme
  }

  function applyLanguage() {
    window.localStorage.setItem(LANG_STORAGE_KEY, DEFAULT_LANGUAGE)
    language.value = DEFAULT_LANGUAGE
  }

  async function syncLanguageFromServer() {
    applyLanguage()
  }

  async function setLanguage() {
    applyLanguage()

    if (!window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)) {
      return
    }

    try {
      await updateMyPersonalSettings({ language: DEFAULT_LANGUAGE })
      applyLanguage()
    } catch {
      // 저장 실패 시에도 화면 언어는 한글로 유지합니다.
    }
  }

  function syncOrganizationFromSession() {
  organization.value = getStoredOrganization()
  }


  function setOrganization(nextOrganization: OrganizationType) {
    const nextAvailable = getNavItemsForOrganization(nextOrganization)
    const nextPage = nextAvailable.find((item) => item.key === pageKey.value) ?? nextAvailable[0] ?? NAV_ITEMS[0]

    window.sessionStorage.setItem(ORG_STORAGE_KEY, nextOrganization)
    organization.value = nextOrganization

    router.replace({
      name: nextPage.key,
      query: buildQuery(),
    })
  }

  return {
    buildQuery,
    language,
    organization,
    pageKey,
    pageLocation,
    screenClasses,
    screenVars,
    setLanguage,
    setOrganization,
    syncLanguageFromServer,
    syncOrganizationFromSession,
    setTheme,
    theme,
  }
})
