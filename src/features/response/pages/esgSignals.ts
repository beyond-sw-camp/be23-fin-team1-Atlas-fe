import type { StructuredPageDefinition } from '../../shared/types/page'

export const esgSignalsPage: StructuredPageDefinition = {
  eyebrow: 'Response // ESG',
  title: 'ESG-Aware Scoring Desk',
  subtitle: '권고안 점수에 ESG 경보, 원산지 리스크, 지속가능성 기준을 반영합니다.',
  actions: [
    { label: 'OPEN', tone: 'primary' },
    { label: 'DETAILS', tone: 'secondary' },
  ],
  metrics: [
    { label: 'KPI', value: '03', meta: 'esg alerts' },
    { label: 'STATUS', value: 'Adjusted', meta: 'scores updated' },
    { label: 'QUEUE', value: '11', meta: 'suppliers tracked' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: 'Snapshot',
      title: 'ESG-Aware Scoring Desk Snapshot',
      chip: 'LIVE',
      items: [
        { label: 'Owner', value: 'ESG Desk', meta: 'policy owner' },
        { label: 'Focus', value: 'Scoring', meta: 'risk weighted' },
        { label: 'Region', value: 'Global', meta: 'origin mix' },
      ],
    },
    {
      kind: 'table',
      eyebrow: 'Queue',
      title: 'ESG-Aware Scoring Desk Queue',
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
      title: 'ESG-Aware Scoring Desk Feed',
      chip: 'NOTES',
      items: [
        { label: '08:10', text: 'Origin risk increased for one supplier cluster.' },
        { label: '10:40', text: 'Recommendation score dropped below policy floor.' },
        { label: '13:15', text: 'Sustainability evidence restored ranking on backup vendor.' },
      ],
    },
  ],
}
