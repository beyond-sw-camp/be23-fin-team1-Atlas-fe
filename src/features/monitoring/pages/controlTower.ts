import type { StructuredPageDefinition } from '../../shared/types/page'

export const controlTowerPage: StructuredPageDefinition = {
  eyebrow: 'Monitoring // Control Tower',
  title: 'Control Tower',
  subtitle: '영향 주문, ETA 리스크, 이벤트 스트림을 단일 시야에서 감시합니다.',
  actions: [
    { label: 'OPEN_ORCHESTRATION', tone: 'primary' },
    { label: 'EXPORT_DATA', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '12', meta: 'impacted orders' },
    { label: 'STATUS', value: 'Stable', meta: 'workflow healthy' },
    { label: 'QUEUE', value: '04', meta: 'actions pending' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'Impact Monitoring Core Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'Main Buyer', meta: '24/7 operations' },
        { label: 'Focus', value: 'ETA', meta: 'delay threshold' },
        { label: 'Region', value: 'APAC', meta: 'top exposure' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'Impact Monitoring Core Queue',
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
      title: 'Impact Monitoring Core Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Impact orders refreshed from orchestration engine.' },
        { label: '10:40', text: 'Delay threshold crossed for two suppliers.' },
        { label: '13:15', text: 'Recovery candidates prepared for operator review.' },
      ],
    },
  ],
}
