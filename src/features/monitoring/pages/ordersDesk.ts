import type { StructuredPageDefinition } from '../../shared/types/page'

export const ordersDeskPage: StructuredPageDefinition = {
  eyebrow: 'Monitoring // Orders Desk',
  title: 'Purchase Order Board',
  subtitle: '발주 승인, ETA 변경, 예산 영향, 우선순위를 운영합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '31', meta: 'open approvals' },
    { label: 'STATUS', value: 'Busy', meta: 'buyer review' },
    { label: 'QUEUE', value: '09', meta: 'eta changes' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Purchase Order Board Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'PO Manager', meta: 'approval lead' },
        { label: 'Focus', value: 'Approvals', meta: 'budget sync' },
        { label: 'Region', value: 'Domestic', meta: 'warehouse linked' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Purchase Order Board Queue',
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
      title: 'Purchase Order Board Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Three urgent approvals moved to fast lane.' },
        { label: '10:40', text: 'Budget variance attached to impacted PO batch.' },
        { label: '13:15', text: 'ETA recalculation completed for delayed shipment.' },
      ],
    },
  ],
}
