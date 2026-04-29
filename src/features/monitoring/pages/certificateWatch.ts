import type { StructuredPageDefinition } from '../../shared/types/page'

export const certificateWatchPage: StructuredPageDefinition = {
  eyebrow: 'Monitoring // Certificates',
  title: 'Expiry & Quality Monitor',
  subtitle: '인증 만료 및 원산지 증빙 누락을 함께 감시합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '07', meta: 'certificates due' },
    { label: 'STATUS', value: 'Risk', meta: 'mismatch' },
    { label: 'QUEUE', value: '02', meta: 'quality holds' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Expiry & Quality Monitor Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Quality Team', meta: 'doc control' },
        { label: 'Focus', value: 'Expiry', meta: 'renewal queue' },
        { label: 'Region', value: 'APAC', meta: 'high volume' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Expiry & Quality Monitor Queue',
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
      title: 'Expiry & Quality Monitor Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Two certificates enter 14-day renewal window.' },
        { label: '10:40', text: 'Evidence missing on one export batch.' },
        { label: '13:15', text: 'Quality hold released after inspection upload.' },
      ],
    },
  ],
}
