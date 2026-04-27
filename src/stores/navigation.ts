import { computed, watch } from 'vue'
import { defineStore } from 'pinia'
import { useRouter } from 'vue-router'
import { NAV_I18N, ORGANIZATION_I18N, SECTION_I18N, SIDEBAR_OPERATOR_I18N } from '../config/appCopy'
import { NAV_ITEMS, NAV_SECTION_LABELS } from '../config/navigation'
import type { OrganizationType, PageKey } from '../types'
import { useAtlasPreferencesStore } from './preferences'
import { useAtlasUiStore } from './ui'
import { useAtlasSessionStore } from './session'

const ADMIN_HIDDEN_PAGE_KEYS = new Set<PageKey>([
  'ordersDesk',
  'supplierControl',
  'items',
  'lots',
  'shipments',
  'settlements',
  'logisticsNodes',
  'returns',
  'certificateWatch',
  'documents',
  'evaluation',
  'vendorKpi',
  'acceptance',
])

function getNavItemsForOrganization(
  organization: OrganizationType,
  userRole: string,
) {
  return NAV_ITEMS.filter((item) => {
    // 먼저 조직 타입으로 1차 필터링합니다.
    if (!item.organizations.includes(organization)) return false

    // 관리자 조직에서 숨길 페이지는 그대로 막습니다.
    if (organization === 'admin' && ADMIN_HIDDEN_PAGE_KEYS.has(item.key)) return false

    // 조직관리는 플랫폼 관리자와 조직 대표자만 보이게 합니다.
    if (item.key === 'organizationManagement') {
      return userRole === 'ADMIN' || userRole === 'ORG_ADMIN'
    }

    return true
  })
}


export const useAtlasNavigationStore = defineStore('atlasNavigation', () => {
  const router = useRouter()
  const preferences = useAtlasPreferencesStore()
  const ui = useAtlasUiStore()

 const session = useAtlasSessionStore()

const availableNavItems = computed(() =>
  getNavItemsForOrganization(preferences.organization, session.userRole),
)

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
      document.title = `Atlas`
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
