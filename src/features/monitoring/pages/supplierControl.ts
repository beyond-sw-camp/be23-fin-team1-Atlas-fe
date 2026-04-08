import type { StructuredPageDefinition } from '../../shared/types/page'

export const supplierControlPage: StructuredPageDefinition = {
  eyebrow: 'Monitoring // Supplier Control',
  title: 'Supplier Master Desk',
  subtitle: '협력사 등급, 인증, 온보딩 상태, 성과 저하 신호를 관리합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '42', meta: 'managed partners' },
    { label: 'STATUS', value: 'Normal', meta: 'quality stable' },
    { label: 'QUEUE', value: '05', meta: 'onboarding items' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Supplier Master Desk Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Vendor Office', meta: 'control owner' },
        { label: 'Focus', value: 'Partner', meta: 'tier review' },
        { label: 'Region', value: 'Global', meta: 'multi-org' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Supplier Master Desk Queue',
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
      title: 'Supplier Master Desk Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'One supplier moved to watchlist after KPI drop.' },
        { label: '10:40', text: 'Onboarding packet completed for new backup vendor.' },
        { label: '13:15', text: 'Tier-level reassessment scheduled for next review.' },
      ],
    },
  ],
}
