import { createRouter, createWebHistory } from 'vue-router'
import { DEFAULT_ORGANIZATION, DEFAULT_PAGE } from '../config/appDefaults'
import { NAV_ITEMS, isPageKey } from '../config/navigation'
import { isOrganization } from '../config/theme'
import { governancePageDefinitions } from '../features/governance/definitions'
import AcceptancePage from '../features/governance/views/AcceptancePage.vue'
import EvaluationPage from '../features/governance/views/EvaluationPage.vue'
import GovernancePage from '../features/governance/views/GovernancePage.vue'
import RiskRulesPage from '../features/governance/views/RiskRulesPage.vue'
import VendorKpiPage from '../features/governance/views/VendorKpiPage.vue'
import { monitoringPageDefinitions } from '../features/monitoring/definitions'
import ControlTowerPage from '../features/monitoring/views/ControlTowerPage.vue'
import SupplierNetworkPage from '../features/monitoring/views/SupplierNetworkPage.vue'
import ItemsPage from '../features/operations/views/ItemsPage.vue'
import LotsPage from '../features/operations/views/LotsPage.vue'
import OrdersPage from '../features/operations/views/OrdersPage.vue'
import SuppliersPage from '../features/operations/views/SuppliersPage.vue'
import ProfilePage from '../features/profile/views/ProfilePage.vue'
import { responsePageDefinitions } from '../features/response/definitions'
import CertificatesPage from '../features/response/views/CertificatesPage.vue'
import DocumentsPage from '../features/response/views/DocumentsPage.vue'
import RecommendationsPage from '../features/response/views/RecommendationsPage.vue'
import StructuredPage from '../features/shared/components/StructuredPage.vue'
import AuditPage from '../features/system/views/AuditPage.vue'
import DesignSystemPage from '../features/system/views/DesignSystemPage.vue'
import NotificationsPage from '../features/system/views/NotificationsPage.vue'
import SettingsPage from '../features/system/views/SettingsPage.vue'
import SystemSpecPage from '../features/system/views/SystemSpecPage.vue'
import AppShellLayout from '../layouts/AppShellLayout.vue'
import type { OrganizationType, PageKey } from '../types'

const AUTH_ORG_STORAGE_KEY = 'atlas-organization'

const PAGE_ORGANIZATIONS = Object.fromEntries(NAV_ITEMS.map((item) => [item.key, item.organizations])) as Record<PageKey, OrganizationType[]>

const pageRoutes = [
  { path: 'design-system', name: 'designSystem', component: DesignSystemPage },
  { path: 'dashboard', alias: ['control-tower'], name: 'controlTower', component: ControlTowerPage },
  { path: 'impact', alias: ['impact-orders'], name: 'impactOrders', component: StructuredPage, props: { page: monitoringPageDefinitions.impactOrders } },
  { path: 'network', alias: ['supplier-network'], name: 'supplierNetwork', component: SupplierNetworkPage, meta: { hidePageHead: true } },
  { path: 'orders', alias: ['orders-desk'], name: 'ordersDesk', component: OrdersPage, meta: { hidePageHead: true } },
  { path: 'suppliers', alias: ['supplier-control'], name: 'supplierControl', component: SuppliersPage, meta: { hidePageHead: true } },
  { path: 'items', name: 'items', component: ItemsPage, meta: { hidePageHead: true } },
  { path: 'lots', name: 'lots', component: LotsPage, meta: { hidePageHead: true } },
  { path: 'certificates', alias: ['certificate-watch'], name: 'certificateWatch', component: CertificatesPage, meta: { hidePageHead: true } },
  { path: 'risks', alias: ['risk-events'], name: 'shipmentOps', component: StructuredPage, props: { page: responsePageDefinitions.shipmentOps } },
  { path: 'recovery-tracking', name: 'recoveryTracking', component: StructuredPage, props: { page: responsePageDefinitions.recoveryTracking } },
  { path: 'documents', name: 'documents', component: DocumentsPage, meta: { hidePageHead: true } },
  { path: 'recommendations', name: 'recommendations', component: RecommendationsPage, meta: { hidePageHead: true } },
  { path: 'esg-signals', name: 'esgSignals', component: StructuredPage, props: { page: responsePageDefinitions.esgSignals } },
  { path: 'governance', name: 'governance', component: GovernancePage, meta: { hidePageHead: true } },
  { path: 'evaluation', name: 'evaluation', component: EvaluationPage, meta: { hidePageHead: true } },
  { path: 'vendor-kpi', name: 'vendorKpi', component: VendorKpiPage, meta: { hidePageHead: true } },
  { path: 'acceptance', name: 'acceptance', component: AcceptancePage, meta: { hidePageHead: true } },
  { path: 'audit', alias: ['audit-trail'], name: 'auditTrail', component: AuditPage, meta: { hidePageHead: true } },
  { path: 'collaboration', name: 'collaboration', component: StructuredPage, props: { page: governancePageDefinitions.collaboration } },
  { path: 'notifications', alias: ['notifications-center'], name: 'notificationsCenter', component: NotificationsPage, meta: { hidePageHead: true } },
  { path: 'risk-rules', name: 'riskRules', component: RiskRulesPage, meta: { hidePageHead: true } },
  { path: 'settings', name: 'settings', component: SettingsPage, meta: { hidePageHead: true } },
  { path: 'profile', name: 'profile', component: ProfilePage },
  { path: 'system-spec', name: 'systemSpec', component: SystemSpecPage },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppShellLayout,
      children: [
        { path: '', redirect: { name: DEFAULT_PAGE } },
        ...pageRoutes,
      ],
    },
  ],
})

router.beforeEach((to) => {
  const currentName = typeof to.name === 'string' ? to.name : undefined

  if (!isPageKey(currentName)) {
    return true
  }

  const targetPage: PageKey = currentName
  const storedOrg = typeof window === 'undefined' ? undefined : window.sessionStorage.getItem(AUTH_ORG_STORAGE_KEY) ?? undefined
  const organization = isOrganization(storedOrg) ? storedOrg : DEFAULT_ORGANIZATION
  const allowedOrganizations = PAGE_ORGANIZATIONS[targetPage]


  if (allowedOrganizations && !allowedOrganizations.includes(organization)) {
    const fallbackPage = NAV_ITEMS.find((item) => item.organizations.includes(organization))?.key ?? DEFAULT_PAGE

    return {
      name: fallbackPage,
      query: to.query,
    }
  }

  return true
})
