import type { StructuredPageDefinition } from '../../shared/types/page'

export const recoveryTrackingPage: StructuredPageDefinition = {
  eyebrow: 'Response // Recovery',
  title: 'Execution Timeline',
  subtitle: '수용된 권고안의 실행 상태와 ETA 회복률을 추적합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '81%', meta: 'eta recovery' },
    { label: 'STATUS', value: 'On Track', meta: '3 milestones done' },
    { label: 'QUEUE', value: '02', meta: 'blocked tasks' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Execution Timeline Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Recovery Lead', meta: 'timeline owner' },
        { label: 'Focus', value: 'Timeline', meta: 'milestone flow' },
        { label: 'Region', value: 'Mixed', meta: 'factory to port' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Execution Timeline Queue',
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
      title: 'Execution Timeline Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Recommendation accepted and queued for execution.' },
        { label: '10:40', text: 'Warehouse reslotting reduced backlog by 11%.' },
        { label: '13:15', text: 'Final ETA recalculated after transport change.' },
      ],
    },
  ],
}
