import type { StructuredPageDefinition } from '../../shared/types/page'

export const shipmentOpsPage: StructuredPageDefinition = {
  eyebrow: '대응 / 이벤트',
  title: '리스크 이벤트 데스크',
  subtitle: '협력사 이슈와 출하 지연 이벤트 대응을 실행합니다.',
  actions: [
    { label: '열기', tone: 'primary' },
    { label: '상세', tone: 'secondary' },
  ],
  metrics: [
    { label: '핵심 지표', value: '09', meta: '활성 이벤트' },
    { label: '상태', value: '조치 중', meta: '대응 실행 중' },
    { label: '대기열', value: '04', meta: '예정 회복' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: '스냅샷',
      title: '리스크 이벤트 현황',
      chip: '실시간',
      items: [
        { label: '담당', value: '대응 운영', meta: '이벤트 담당' },
        { label: '초점', value: '이벤트', meta: '대응 절차' },
        { label: '영역', value: '운송', meta: '국경 간 흐름' },
      ],
    },
    {
      kind: 'table',
      eyebrow: '대기열',
      title: '리스크 이벤트 대기열',
      chip: '운영',
      columns: ['항목', '상태', '예상 시간'],
      rows: [
        ['주요 흐름', '모니터링', '2시간'],
        ['예비 출처', '준비됨', '5시간'],
        ['예외 검토', '대기 중', '9시간'],
      ],
    },
    {
      kind: 'feed',
      eyebrow: '업데이트',
      title: '리스크 이벤트 피드',
      chip: '메모',
      items: [
        { label: '08:10', text: '지연 출하가 대체 경로로 재배정되었습니다.' },
        { label: '10:40', text: '협력사 이슈가 회복 워크플로로 전환되었습니다.' },
        { label: '13:15', text: '운영팀이 권고 완화 경로를 수용했습니다.' },
      ],
    },
  ],
}
