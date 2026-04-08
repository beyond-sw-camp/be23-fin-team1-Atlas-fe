import type { StructuredPageDefinition } from '../../shared/types/page'

export const impactOrdersPage: StructuredPageDefinition = {
  eyebrow: 'Monitoring // Orders',
  title: 'Impact Orders Board',
  subtitle: '영향 PO와 납기 복구 우선순위를 한 화면에서 정리합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '18', meta: 'priority orders' },
    { label: 'STATUS', value: 'Watch', meta: '2 escalations' },
    { label: 'QUEUE', value: '06', meta: 'approval waits' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Impact Orders Board Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Order Desk', meta: 'buyer ops' },
        { label: 'Focus', value: 'PO', meta: 'priority queue' },
        { label: 'Region', value: 'KR/EU', meta: 'mixed lanes' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Impact Orders Board Queue',
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
      title: 'Impact Orders Board Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Priority stack re-ranked after ETA change.' },
        { label: '10:40', text: 'Two orders moved to supplier backup plan.' },
        { label: '13:15', text: 'Budget owner approval still pending on one line.' },
      ],
    },
  ],
}
