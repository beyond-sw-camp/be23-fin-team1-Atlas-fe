import type { StructuredPageDefinition } from '../../shared/types/page'

export const riskRulesPage: StructuredPageDefinition = {
  eyebrow: 'Governance // Rules',
  title: 'Rule & Escalation Matrix',
  subtitle: 'supplier_issue, shipment_delayed, quality_hold, esg_alert 임계치와 자동 에스컬레이션 룰을 관리합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '19', meta: 'active rules' },
    { label: 'STATUS', value: 'Valid', meta: 'threshold synced' },
    { label: 'QUEUE', value: '02', meta: 'pending edits' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Rule & Escalation Matrix Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Policy Admin', meta: 'rule manager' },
        { label: 'Focus', value: 'Threshold', meta: 'escalation logic' },
        { label: 'Region', value: 'System-wide', meta: 'auto actions' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Rule & Escalation Matrix Queue',
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
      title: 'Rule & Escalation Matrix Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Delay threshold tuned for ocean freight lane.' },
        { label: '10:40', text: 'ESG alert rule linked to recommendation penalty.' },
        { label: '13:15', text: 'Auto escalation target updated for night shift.' },
      ],
    },
  ],
}
