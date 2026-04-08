import type { StructuredPageDefinition } from '../../shared/types/page'

export const notificationsCenterPage: StructuredPageDefinition = {
  eyebrow: 'Governance // Notifications',
  title: 'Alert Channel Center',
  subtitle: '리스크 이벤트, ESG 경보, 복구 알림의 unread 상태와 채널 정책을 관리합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '22', meta: 'alerts today' },
    { label: 'STATUS', value: 'Unread', meta: '5 need action' },
    { label: 'QUEUE', value: '03', meta: 'policy gaps' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Alert Channel Center Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Alert Desk', meta: 'channel routing' },
        { label: 'Focus', value: 'Delivery', meta: 'channel policy' },
        { label: 'Region', value: 'All channels', meta: 'email/slack/sms' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Alert Channel Center Queue',
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
      title: 'Alert Channel Center Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Unread risk alert escalated to duty operator.' },
        { label: '10:40', text: 'Delivery channel switched for supplier incident.' },
        { label: '13:15', text: 'Topic policy updated after missed acknowledgement.' },
      ],
    },
  ],
}
