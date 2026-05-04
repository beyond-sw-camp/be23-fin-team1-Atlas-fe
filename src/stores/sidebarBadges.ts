import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { PageKey } from '../types'
import { EMPTY_SUPPLY_SIDEBAR_BADGES, getSupplySidebarBadges, markSupplyDetailViewed } from '../services/sidebarBadges'
import type { SupplySidebarBadgesResponse } from '../services/sidebarBadges'

const SIDEBAR_BADGE_KEYS: PageKey[] = [
  'ordersDesk',
  'supplierControl',
  'items',
  'inventory',
  'logisticsNodes',
  'shipments',
  'settlements',
  'returns',
  'certificateWatch',
]

function formatBadgeCount(count: number | undefined) {
  const value = Number(count ?? 0)
  if (value <= 0) return ''
  return value > 99 ? '99+' : String(value)
}

function badgeTone(key: PageKey, count: number) {
  if (count <= 0) return ''

  if (key === 'certificateWatch' || key === 'returns' || key === 'shipments' || key === 'inventory') {
    return 'warn'
  }

  return 'info'
}

export const useAtlasSidebarBadgesStore = defineStore('atlasSidebarBadges', () => {
  const counts = ref<SupplySidebarBadgesResponse>({ ...EMPTY_SUPPLY_SIDEBAR_BADGES })
  const isLoading = ref(false)

  const operationalKeys = computed(() => new Set<PageKey>(SIDEBAR_BADGE_KEYS))
  const dynamicKeys = computed(() => new Set<PageKey>(SIDEBAR_BADGE_KEYS))

  async function fetchBadges() {
    try {
      isLoading.value = true
      counts.value = await getSupplySidebarBadges()
    } catch (error) {
      console.error('Failed to fetch sidebar badges', error)
    } finally {
      isLoading.value = false
    }
  }

  function isDynamicBadgeKey(key: string) {
    return dynamicKeys.value.has(key as PageKey)
  }

  function getBadge(key: string) {
    return formatBadgeCount(getDisplayCount(key))
  }

  function getBadgeTone(key: string) {
    return badgeTone(key as PageKey, getDisplayCount(key))
  }

  function getDisplayCount(key: string) {
    const badgeKey = key as PageKey
    const count = Number(counts.value[badgeKey as keyof SupplySidebarBadgesResponse] ?? 0)
    return Math.max(count, 0)
  }

  async function markDetailViewed(key: string, detailPublicId?: string) {
    if (!isDynamicBadgeKey(key) || !detailPublicId) return

    await markSupplyDetailViewed(key, detailPublicId)
    await fetchBadges()
  }

  function clearBadges() {
    counts.value = { ...EMPTY_SUPPLY_SIDEBAR_BADGES }
  }

  return {
    counts,
    isLoading,
    operationalKeys,
    dynamicKeys,
    fetchBadges,
    isDynamicBadgeKey,
    getBadge,
    getBadgeTone,
    markDetailViewed,
    clearBadges,
  }
})
