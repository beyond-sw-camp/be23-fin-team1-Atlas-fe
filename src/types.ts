export type ScreenTheme = 'dark' | 'light'
export type NavSection = 'monitoring' | 'operations' | 'response' | 'governance' | 'system'
export type OrganizationType = 'mainBuyer' | 'supplier' | 'admin'
export type AppLanguage = 'ko' | 'en'

export type NavKey =
  | 'designSystem'
  | 'controlTower'
  | 'impactOrders'
  | 'supplierNetwork'
  | 'ordersDesk'
  | 'supplierControl'
  | 'items'
  | 'lots'
  | 'shipments'
  | 'settlements'
  | 'logisticsNodes'
  | 'returns'
  | 'certificateWatch'
  | 'shipmentOps'
  | 'recoveryTracking'
  | 'documents'
  | 'recommendations'
  | 'esgSignals'
  | 'governance'
  | 'evaluation'
  | 'vendorKpi'
  | 'acceptance'
  | 'auditTrail'
  | 'collaboration'
  | 'notificationsCenter'
  | 'riskRules'
  | 'settings'
  | 'profile'
  | 'systemSpec'


export type PageKey = NavKey

export interface NavEntry {
  key: NavKey
  label: string
  icon: string
  description: string
  pageSubtitle: string
  section: NavSection
  organizations: OrganizationType[]
  badge?: string
  badgeTone?: 'crit' | 'warn' | 'info' | 'ok'
  hidden?: boolean
}

export interface SpringPage<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  page: number
  first: boolean
  last: boolean
}
