import type { StructuredPageDefinition } from '../../shared/types/page'

export const governancePage: StructuredPageDefinition = {
  eyebrow: 'Governance // Board',
  title: 'Decision Governance Board',
  subtitle: '권고안 수용, 실행, 회복 성과, 사후평가를 거버넌스 기준으로 관리합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '07', meta: 'reviews open' },
    { label: 'STATUS', value: 'Board', meta: '2 escalations' },
    { label: 'QUEUE', value: '04', meta: 'post-evals due' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Decision Governance Board Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Gov Board', meta: 'decision owner' },
        { label: 'Focus', value: 'Policy', meta: 'acceptance' },
        { label: 'Region', value: 'Enterprise', meta: 'all orgs' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Decision Governance Board Queue',
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
      title: 'Decision Governance Board Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'One recommendation escalated to board review.' },
        { label: '10:40', text: 'Recovery score added to post-evaluation ledger.' },
        { label: '13:15', text: 'Governance owner requested audit evidence update.' },
      ],
    },
  ],
}
