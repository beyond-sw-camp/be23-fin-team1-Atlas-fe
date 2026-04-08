export type ScreenTheme = 'dark' | 'light'
export type NavSection = 'monitoring' | 'operations' | 'response' | 'governance' | 'system'
export type OrganizationType = 'mainBuyer' | 'supplier' | 'admin'
export type AppLanguage = 'ko' | 'en'

export type NavKey =
  | 'controlTower'
  | 'impactOrders'
  | 'supplierNetwork'
  | 'ordersDesk'
  | 'supplierControl'
  | 'certificateWatch'
  | 'shipmentOps'
  | 'recoveryTracking'
  | 'documents'
  | 'recommendations'
  | 'esgSignals'
  | 'governance'
  | 'auditTrail'
  | 'collaboration'
  | 'notificationsCenter'
  | 'riskRules'
  | 'profile'

export type PageKey = NavKey | 'systemSpec'

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
}
