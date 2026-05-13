import type { PageKey } from '../../types'

export const PAGE_SHELL_CLASSES: Record<PageKey, string[]> = {
  controlTower: ['bg-background', 'text-on-surface', 'antialiased'],
  impactOrders: ['bg-background', 'text-on-surface', 'antialiased'],
  supplierNetwork: ['bg-background', 'text-on-surface', 'antialiased'],
  ordersDesk: ['bg-background', 'text-on-surface', 'antialiased'],
  supplierControl: ['bg-background', 'text-on-surface', 'antialiased'],
  items: ['bg-background', 'text-on-surface', 'antialiased'],
  inventory: ['bg-background', 'text-on-surface', 'antialiased'],
  shipments: ['bg-background', 'text-on-surface', 'antialiased'],
  settlements: ['bg-background', 'text-on-surface', 'antialiased'],
  logisticsNodes: ['bg-background', 'text-on-surface', 'antialiased'],
  returns: ['bg-background', 'text-on-surface', 'antialiased'],
  certificateWatch: ['bg-background', 'text-on-surface', 'antialiased'],
  certificateReview: ['bg-background', 'text-on-surface', 'antialiased'],
  shipmentOps: ['bg-background', 'text-on-surface', 'antialiased'],
  recoveryTracking: ['bg-background', 'text-on-surface', 'antialiased'],
  documents: ['bg-background', 'text-on-surface', 'antialiased'],
  recommendations: ['bg-background', 'text-on-surface', 'antialiased'],
  esgSignals: ['bg-background', 'text-on-surface', 'antialiased'],
  governance: ['bg-background', 'text-on-surface', 'antialiased'],
  evaluation: ['bg-background', 'text-on-surface', 'antialiased'],
  vendorKpi: ['bg-background', 'text-on-surface', 'antialiased'],
  acceptance: ['bg-background', 'text-on-surface', 'antialiased'],
  auditTrail: ['bg-background', 'text-on-surface', 'antialiased'],
  collaboration: ['bg-background', 'text-on-surface', 'antialiased'],
  notificationsCenter: ['bg-background', 'text-on-surface', 'antialiased'],
  riskRules: ['bg-background', 'text-on-surface', 'antialiased'],
  settings: ['bg-background', 'text-on-surface', 'antialiased'],

  // 프로필 화면 기본 배경 클래스입니다.
  profile: ['bg-background', 'text-on-surface', 'antialiased'],

  // 새 조직관리 화면도 일반 페이지와 같은 배경 클래스를 씁니다.
  organizationManagement: ['bg-background', 'text-on-surface', 'antialiased'],
  organizationProfile: ['bg-background', 'text-on-surface', 'antialiased'],

  // 시스템 스펙 화면은 기존 전용 배경을 유지합니다.
  systemSpec: ['bg-surface-container-lowest', 'text-on-surface', 'antialiased', 'no-roundness'],
}
