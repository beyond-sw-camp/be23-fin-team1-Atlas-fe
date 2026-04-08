import type { StructuredPageDefinition } from '../../shared/types/page'

export const recommendationsPage: StructuredPageDefinition = {
  eyebrow: 'Response // Recommendations',
  title: 'Alternative Decision Desk',
  subtitle: '추천 엔진 기반 대체 공급처 의사결정을 지원합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '05', meta: 'active options' },
    { label: 'STATUS', value: 'Review', meta: 'governance pending' },
    { label: 'QUEUE', value: '02', meta: 'accepted paths' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Alternative Decision Desk Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Decision Desk', meta: 'recommendation owner' },
        { label: 'Focus', value: 'Option', meta: 'supplier fit' },
        { label: 'Region', value: 'Tier 1-2', meta: 'coverage ready' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Alternative Decision Desk Queue',
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
      title: 'Alternative Decision Desk Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Backup supplier scored above target threshold.' },
        { label: '10:40', text: 'Cost delta attached for governance review.' },
        { label: '13:15', text: 'Accepted recommendation moved into execution lane.' },
      ],
    },
  ],
}
