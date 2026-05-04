import { apiClient } from './http'

export type SupplySidebarBadgesResponse = {
  ordersDesk: number
  supplierControl: number
  items: number
  inventory: number
  logisticsNodes: number
  shipments: number
  settlements: number
  returns: number
  certificateWatch: number
}

export const EMPTY_SUPPLY_SIDEBAR_BADGES: SupplySidebarBadgesResponse = {
  ordersDesk: 0,
  supplierControl: 0,
  items: 0,
  inventory: 0,
  logisticsNodes: 0,
  shipments: 0,
  settlements: 0,
  returns: 0,
  certificateWatch: 0,
}

export async function getSupplySidebarBadges() {
  const { data } = await apiClient.get<Partial<SupplySidebarBadgesResponse>>('/api/supply/sidebar/badges')
  return {
    ...EMPTY_SUPPLY_SIDEBAR_BADGES,
    ...data,
  }
}

export async function markSupplyDetailViewed(menuKey: string, detailPublicId: string) {
  await apiClient.post('/api/supply/sidebar/details/read', {
    menuKey,
    detailPublicId,
  })
}
