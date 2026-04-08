import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { DEFAULT_ORGANIZATION, DEFAULT_PAGE, DEFAULT_THEME } from '../config/appDefaults'
import { NAV_ITEMS, isPageKey } from '../config/navigation'
import { DESIGN_THEME_TOKENS, isOrganization, isTheme } from '../config/theme'
import { PAGE_SHELL_CLASSES } from '../features/shared/pagePresentation'
import type { AppLanguage, OrganizationType, PageKey, ScreenTheme } from '../types'

const ORG_STORAGE_KEY = 'atlas-organization'
const LANG_STORAGE_KEY = 'atlas-language'

function getRouteNamePageKey(value: unknown): PageKey {
  return typeof value === 'string' && isPageKey(value) ? value : DEFAULT_PAGE
}

function queryValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
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

  const pageKey = computed<PageKey>(() => getRouteNamePageKey(route.name))
  const theme = computed<ScreenTheme>(() => {
    const value = queryValue(route.query.theme)
    return isTheme(value) ? value : DEFAULT_THEME
  })
  const organization = computed<OrganizationType>(() => {
    const value = queryValue(route.query.org) ?? window.sessionStorage.getItem(ORG_STORAGE_KEY) ?? undefined
    return isOrganization(value) ? value : DEFAULT_ORGANIZATION
  })
  const language = computed<AppLanguage>(() => {
    const value = queryValue(route.query.lang) ?? window.sessionStorage.getItem(LANG_STORAGE_KEY) ?? 'ko'
    return value === 'en' ? 'en' : 'ko'
  })
  const screenClasses = computed(() => PAGE_SHELL_CLASSES[pageKey.value])
  const screenVars = computed(() =>
    Object.fromEntries(
      Object.entries(theme.value === 'light' ? DESIGN_THEME_TOKENS.light : DESIGN_THEME_TOKENS.dark).flatMap(([token, hex]) => [
        [`--${token}`, hex],
        [`--${token}-rgb`, toRgbTuple(hex)],
      ]),
    ),
  )

  function buildQuery(overrides: Partial<Record<'lang' | 'org' | 'theme', string>> = {}) {
    return {
      lang: overrides.lang ?? language.value,
      org: overrides.org ?? organization.value,
      theme: overrides.theme ?? theme.value,
    }
  }

  function pageLocation(nextPageKey: PageKey) {
    return { name: nextPageKey, query: buildQuery() }
  }

  function setTheme(nextTheme: ScreenTheme) {
    router.replace({ name: pageKey.value, query: buildQuery({ theme: nextTheme }) })
  }

  function setLanguage(nextLanguage: AppLanguage) {
    window.sessionStorage.setItem(LANG_STORAGE_KEY, nextLanguage)
    router.replace({ name: pageKey.value, query: buildQuery({ lang: nextLanguage }) })
  }

  function setOrganization(nextOrganization: OrganizationType) {
    const nextAvailable = getNavItemsForOrganization(nextOrganization)
    const nextPage = nextAvailable.find((item) => item.key === pageKey.value) ?? nextAvailable[0] ?? NAV_ITEMS[0]

    window.sessionStorage.setItem(ORG_STORAGE_KEY, nextOrganization)
    router.replace({
      name: nextPage.key,
      query: buildQuery({ org: nextOrganization }),
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
    setTheme,
    theme,
  }
})
