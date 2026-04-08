import type { AppLanguage } from '../../../types'

export type MonitoringMapTab = 'vector' | 'raster'

export interface LocalizedCopy {
  ko: string
  en: string
}

export interface MonitoringMapNode {
  label: string
  value: string
  meta: string
  latLng: [number, number]
  displayName: LocalizedCopy
  summary: LocalizedCopy
}

export function getLocalizedMapText(copy: LocalizedCopy, language: AppLanguage) {
  return copy[language]
}

export const supplierNetworkNodes: MonitoringMapNode[] = [
  {
    label: 'EUR_HUB_01',
    value: 'LAT: 48.85 / LON: 2.35',
    meta: 'Paris density cluster',
    latLng: [48.85, 2.35],
    displayName: { ko: '유럽 허브 01', en: 'EUR HUB 01' },
    summary: { ko: '파리 밀집 클러스터', en: 'Paris density cluster' },
  },
  {
    label: 'SINGAPORE_PORT',
    value: 'LAT: 1.29 / LON: 103.85',
    meta: 'Logistics latency +14%',
    latLng: [1.29, 103.85],
    displayName: { ko: '싱가포르 항만', en: 'SINGAPORE PORT' },
    summary: { ko: '물류 지연 +14%', en: 'Logistics latency +14%' },
  },
  {
    label: 'SHANGHAI_NODE',
    value: 'LAT: 31.23 / LON: 121.47',
    meta: 'Congestion signal +12h',
    latLng: [31.23, 121.47],
    displayName: { ko: '상하이 노드', en: 'SHANGHAI NODE' },
    summary: { ko: '혼잡 신호 +12시간', en: 'Congestion signal +12h' },
  },
  {
    label: 'NEW_JERSEY_DC',
    value: 'LAT: 40.73 / LON: -74.17',
    meta: 'Receiving overflow',
    latLng: [40.73, -74.17],
    displayName: { ko: '뉴저지 물류센터', en: 'NEW JERSEY DC' },
    summary: { ko: '입고 용량 초과', en: 'Receiving overflow' },
  },
]

export const supplierRegistryRows = [
  ['SUP-00124', 'North Star Logistics', 'Nordics', 'Operational', '12.4 LOW'],
  ['SUP-00891', 'Pacific Chip Fab', 'East Asia', 'Delay Reported', '88.9 CRITICAL'],
  ['SUP-01255', 'Bavaria Motor Works', 'DACH', 'Operational', '24.1 STABLE'],
  ['SUP-02110', 'Suez Marine Route', 'EMEA', 'Latency', '61.0 WARNING'],
]

export const controlTowerNodes: MonitoringMapNode[] = [
  {
    label: 'ROTTERDAM_ORIGIN',
    value: 'LAT: 51.92 / LON: 4.48',
    meta: '14 active transactions',
    latLng: [51.92, 4.48],
    displayName: { ko: '로테르담 출발지', en: 'ROTTERDAM ORIGIN' },
    summary: { ko: '활성 트랜잭션 14건', en: '14 active transactions' },
  },
  {
    label: 'PACIFIC_ROUTE_04',
    value: 'LAT: 34.05 / LON: -118.24',
    meta: 'Critical lane +4h drift',
    latLng: [34.05, -118.24],
    displayName: { ko: '태평양 루트 04', en: 'PACIFIC ROUTE 04' },
    summary: { ko: '핵심 레인 +4시간 편차', en: 'Critical lane +4h drift' },
  },
  {
    label: 'NEW_JERSEY_TERMINAL',
    value: 'LAT: 40.73 / LON: -74.17',
    meta: 'Warehouse intake 12.4k MT',
    latLng: [40.73, -74.17],
    displayName: { ko: '뉴저지 터미널', en: 'NEW JERSEY TERMINAL' },
    summary: { ko: '창고 반입량 12.4k MT', en: 'Warehouse intake 12.4k MT' },
  },
  {
    label: 'TOKYO_BUFFER',
    value: 'LAT: 35.68 / LON: 139.69',
    meta: 'Recovery ETA within threshold',
    latLng: [35.68, 139.69],
    displayName: { ko: '도쿄 버퍼', en: 'TOKYO BUFFER' },
    summary: { ko: '복구 ETA 임계치 이내', en: 'Recovery ETA within threshold' },
  },
]

export const controlTowerAlerts = [
  'TX-990218 lane delay escalation active',
  'Warehouse overflow pressure at New Jersey',
]
