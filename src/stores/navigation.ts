import { computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { NAV_I18N, ORGANIZATION_I18N, SECTION_I18N, SIDEBAR_OPERATOR_I18N } from '../config/appCopy'
import { NAV_ITEMS, NAV_SECTION_LABELS } from '../config/navigation'
import type { OrganizationType, PageKey } from '../types'
import { useAtlasPreferencesStore } from './preferences'
import { useAtlasUiStore } from './ui'

function getNavItemsForOrganization(organization: OrganizationType) {
  return NAV_ITEMS.filter((item) => item.organizations.includes(organization))
}

export const useAtlasNavigationStore = defineStore('atlasNavigation', () => {
  const router = useRouter()
  const preferences = useAtlasPreferencesStore()
  const ui = useAtlasUiStore()

  const availableNavItems = computed(() => getNavItemsForOrganization(preferences.organization))
  const activeNavItem = computed(
    () => availableNavItems.value.find((item) => item.key === preferences.pageKey) ?? availableNavItems.value[0] ?? NAV_ITEMS[0],
  )
  const pageLabel = computed(() => NAV_I18N[activeNavItem.value.key]?.[preferences.language]?.label ?? activeNavItem.value.label)
  const pageSubtitle = computed(
    () => NAV_I18N[activeNavItem.value.key]?.[preferences.language]?.pageSubtitle ?? activeNavItem.value.pageSubtitle,
  )
  const organizationLabel = computed(() => ORGANIZATION_I18N[preferences.organization][preferences.language])
  const sidebarOperator = computed(() => SIDEBAR_OPERATOR_I18N[preferences.organization])
  const groupedNavItems = computed(() =>
    Object.entries(NAV_SECTION_LABELS)
      .map(([sectionKey]) => ({
        key: sectionKey,
        label: SECTION_I18N[sectionKey as keyof typeof SECTION_I18N][preferences.language],
        items: availableNavItems.value
          .filter((item) => item.section === sectionKey && !item.hidden)
          .map((item) => ({
            ...item,
            displayDescription: NAV_I18N[item.key][preferences.language].description,
            displayLabel: NAV_I18N[item.key][preferences.language].label,
          })),
      }))
      .filter((group) => group.items.length > 0),
  )

  function navigateToPage(nextPageKey: PageKey) {
    router.push(preferences.pageLocation(nextPageKey))
    ui.closeMobileSidebar()
  }

  function openNotifications() {
    const target = availableNavItems.value.find((item) => item.key === 'notificationsCenter') ?? availableNavItems.value[0]
    if (target) navigateToPage(target.key)
  }

  function openSettings() {
    const target =
      availableNavItems.value.find((item) => item.key === 'settings') ??
      availableNavItems.value.find((item) => item.key === 'riskRules') ??
      availableNavItems.value.find((item) => item.key === 'profile') ??
      availableNavItems.value[0]

    if (target) navigateToPage(target.key)
  }

  watch(
    [() => preferences.pageKey, () => preferences.theme],
    () => {
      document.title = `Atlas Kinetic Blueprint | ${preferences.pageKey} | ${preferences.theme}`
    },
    { immediate: true },
  )

  return {
    activeNavItem,
    availableNavItems,
    groupedNavItems,
    navigateToPage,
    openNotifications,
    openSettings,
    organizationLabel,
    pageLabel,
    pageSubtitle,
    sidebarOperator,
  }
})
