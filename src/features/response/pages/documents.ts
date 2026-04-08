import type { StructuredPageDefinition } from '../../shared/types/page'

export const documentsPage: StructuredPageDefinition = {
  eyebrow: 'Response // Documents',
  title: 'Document Trace Desk',
  subtitle: '품질, lot, 인증, 문서 상태를 실시간으로 추적합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '56', meta: 'tracked docs' },
    { label: 'STATUS', value: 'Normal', meta: 'audit synced' },
    { label: 'QUEUE', value: '03', meta: 'missing evidence' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Document Trace Desk Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Doc Control', meta: 'trace owner' },
        { label: 'Focus', value: 'Trace', meta: 'document chain' },
        { label: 'Region', value: 'Compliance', meta: 'cross-team' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Document Trace Desk Queue',
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
      title: 'Document Trace Desk Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Document bundle linked to delayed shipment.' },
        { label: '10:40', text: 'Missing origin proof requested from supplier.' },
        { label: '13:15', text: 'Compliance packet exported for governance review.' },
      ],
    },
  ],
}
