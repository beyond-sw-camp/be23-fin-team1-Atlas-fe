import type { StructuredPageDefinition } from '../../shared/types/page'

export const auditTrailPage: StructuredPageDefinition = {
  eyebrow: 'Governance // Audit',
  title: 'Governance Ledger',
  subtitle: '권고안 수용 여부, 승인자, 사후평가 결과를 감사 로그로 추적합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '128', meta: 'ledger entries' },
    { label: 'STATUS', value: 'Clean', meta: 'log integrity' },
    { label: 'QUEUE', value: '03', meta: 'follow-ups' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Governance Ledger Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Audit Lead', meta: 'ledger owner' },
        { label: 'Focus', value: 'Trace', meta: 'acceptance history' },
        { label: 'Region', value: 'All pages', meta: 'route linked' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Governance Ledger Queue',
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
      title: 'Governance Ledger Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Approval reason captured for supplier switch.' },
        { label: '10:40', text: 'Rejected path logged with evidence reference.' },
        { label: '13:15', text: 'Audit export scheduled for compliance handoff.' },
      ],
    },
  ],
}
