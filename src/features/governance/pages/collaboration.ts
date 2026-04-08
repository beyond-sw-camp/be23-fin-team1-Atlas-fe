import type { StructuredPageDefinition } from '../../shared/types/page'

export const collaborationPage: StructuredPageDefinition = {
  eyebrow: 'Governance // Collaboration',
  title: 'Ops Collaboration Room',
  subtitle: '운영자, 협력사, 알림 흐름의 실시간 협업을 채널 중심으로 관리합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '14', meta: 'active threads' },
    { label: 'STATUS', value: 'Live', meta: 'channel healthy' },
    { label: 'QUEUE', value: '05', meta: 'mentions pending' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Ops Collaboration Room Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Ops Channel', meta: 'room owner' },
        { label: 'Focus', value: 'Threads', meta: 'handoff ready' },
        { label: 'Region', value: 'Cross-org', meta: 'buyer + supplier' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Ops Collaboration Room Queue',
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
      title: 'Ops Collaboration Room Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Supplier response posted in escalation room.' },
        { label: '10:40', text: 'Ops note pinned for recovery follow-up.' },
        { label: '13:15', text: 'Unread alert converted into collaboration thread.' },
      ],
    },
  ],
}
