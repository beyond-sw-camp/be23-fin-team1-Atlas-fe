import { createRouter, createWebHistory } from 'vue-router'
import { DEFAULT_PAGE } from '../config/appDefaults'
import { governancePageDefinitions } from '../features/governance/definitions'
import { monitoringPageDefinitions } from '../features/monitoring/definitions'
import ControlTowerPage from '../features/monitoring/views/ControlTowerPage.vue'
import SupplierNetworkPage from '../features/monitoring/views/SupplierNetworkPage.vue'
import ProfilePage from '../features/profile/views/ProfilePage.vue'
import { responsePageDefinitions } from '../features/response/definitions'
import StructuredPage from '../features/shared/components/StructuredPage.vue'
import SystemSpecPage from '../features/system/views/SystemSpecPage.vue'
import AppShellLayout from '../layouts/AppShellLayout.vue'

const pageRoutes = [
  { path: 'control-tower', name: 'controlTower', component: ControlTowerPage },
  { path: 'impact-orders', name: 'impactOrders', component: StructuredPage, props: { page: monitoringPageDefinitions.impactOrders } },
  { path: 'supplier-network', name: 'supplierNetwork', component: SupplierNetworkPage },
  { path: 'orders-desk', name: 'ordersDesk', component: StructuredPage, props: { page: monitoringPageDefinitions.ordersDesk } },
  { path: 'supplier-control', name: 'supplierControl', component: StructuredPage, props: { page: monitoringPageDefinitions.supplierControl } },
  { path: 'certificate-watch', name: 'certificateWatch', component: StructuredPage, props: { page: monitoringPageDefinitions.certificateWatch } },
  { path: 'risk-events', name: 'shipmentOps', component: StructuredPage, props: { page: responsePageDefinitions.shipmentOps } },
  { path: 'recovery-tracking', name: 'recoveryTracking', component: StructuredPage, props: { page: responsePageDefinitions.recoveryTracking } },
  { path: 'documents', name: 'documents', component: StructuredPage, props: { page: responsePageDefinitions.documents } },
  { path: 'recommendations', name: 'recommendations', component: StructuredPage, props: { page: responsePageDefinitions.recommendations } },
  { path: 'esg-signals', name: 'esgSignals', component: StructuredPage, props: { page: responsePageDefinitions.esgSignals } },
  { path: 'governance', name: 'governance', component: StructuredPage, props: { page: governancePageDefinitions.governance } },
  { path: 'audit-trail', name: 'auditTrail', component: StructuredPage, props: { page: governancePageDefinitions.auditTrail } },
  { path: 'collaboration', name: 'collaboration', component: StructuredPage, props: { page: governancePageDefinitions.collaboration } },
  { path: 'notifications-center', name: 'notificationsCenter', component: StructuredPage, props: { page: governancePageDefinitions.notificationsCenter } },
  { path: 'risk-rules', name: 'riskRules', component: StructuredPage, props: { page: governancePageDefinitions.riskRules } },
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
