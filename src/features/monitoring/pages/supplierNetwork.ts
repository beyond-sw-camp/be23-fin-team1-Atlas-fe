import type { StructuredPageDefinition } from '../../shared/types/page'

export const supplierNetworkPage: StructuredPageDefinition = {
  eyebrow: 'Monitoring // Network',
  title: 'Global Partner Map',
  subtitle: '공급망 tier 연결, 병목 위치, 대체 경로를 가시화합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '24', meta: 'active suppliers' },
    { label: 'STATUS', value: 'High', meta: 'network volatility' },
    { label: 'QUEUE', value: '03', meta: 'risk clusters' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Global Partner Map Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Network Ops', meta: 'tier monitor' },
        { label: 'Focus', value: 'Map', meta: 'topology' },
        { label: 'Region', value: 'Global', meta: 'tier 1-3' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Global Partner Map Queue',
      chip: 'OPS',
      columns: ['Item', 'State', 'ETA'],
      rows: [
        ['Primary lane', 'Monitoring', '02h'],
        ['Backup source', 'Ready', '05h'],
        ['Exception review', 'Pending', '09h'],
      ],
    },
    {
      kind: 'feed',
      eyebrow: 'Updates',
      title: 'Global Partner Map Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Singapore congestion increased route stress.' },
        { label: '10:40', text: 'Tier-2 backup path confirmed for APAC lane.' },
        { label: '13:15', text: 'Supplier health score recalculated after ESG event.' },
      ],
    },
  ],
}
