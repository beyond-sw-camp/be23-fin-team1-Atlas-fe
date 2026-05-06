import type { StructuredPageDefinition } from '../../shared/types/page'

export const documentsPage: StructuredPageDefinition = {
  eyebrow: '대응 / 문서',
  title: '문서 추적 데스크',
  subtitle: '품질, 인증, 문서 상태를 실시간으로 추적합니다.',
  actions: [
    { label: '열기', tone: 'primary' },
    { label: '상세', tone: 'secondary' },
  ],
  metrics: [
    { label: '핵심 지표', value: '56', meta: '추적 문서' },
    { label: '상태', value: '정상', meta: '감사 동기화' },
    { label: '대기열', value: '03', meta: '증빙 누락' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: '스냅샷',
      title: '문서 추적 현황',
      chip: '실시간',
      items: [
        { label: '담당', value: '문서 관리', meta: '추적 담당' },
        { label: '초점', value: '추적', meta: '문서 흐름' },
        { label: '영역', value: '컴플라이언스', meta: '부서 연계' },
      ],
    },
    {
      kind: 'table',
      eyebrow: '대기열',
      title: '문서 처리 대기열',
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
      title: '문서 추적 피드',
      chip: '메모',
      items: [
        { label: '08:10', text: '지연 출하에 문서 묶음이 연결되었습니다.' },
        { label: '10:40', text: '협력사에 원산지 증빙 보완을 요청했습니다.' },
        { label: '13:15', text: '거버넌스 검토용 컴플라이언스 묶음을 내보냈습니다.' },
      ],
    },
  ],
}
