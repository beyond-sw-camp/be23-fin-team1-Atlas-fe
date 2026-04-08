import type { StructuredPageDefinition } from '../../shared/types/page'

export const shipmentOpsPage: StructuredPageDefinition = {
  eyebrow: 'Response // Events',
  title: 'Risk Event Desk',
  subtitle: 'supplier_issue, shipment_delayed 이벤트 대응을 실행합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '09', meta: 'active events' },
    { label: 'STATUS', value: 'Action', meta: 'orchestration running' },
    { label: 'QUEUE', value: '04', meta: 'eta recoveries' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Risk Event Desk Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Response Ops', meta: 'event owner' },
        { label: 'Focus', value: 'Event', meta: 'playbook' },
        { label: 'Region', value: 'Transit', meta: 'cross-border' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Risk Event Desk Queue',
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
      title: 'Risk Event Desk Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Delayed shipment rerouted through alternate lane.' },
        { label: '10:40', text: 'Supplier issue converted into recovery workflow.' },
        { label: '13:15', text: 'Ops team accepted recommended mitigation path.' },
      ],
    },
  ],
}
