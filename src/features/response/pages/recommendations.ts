import type { StructuredPageDefinition } from '../../shared/types/page'

export const recommendationsPage: StructuredPageDefinition = {
  eyebrow: '대응 / 권고안',
  title: '대체 의사결정 데스크',
  subtitle: '추천 엔진 기반 대체 공급처 의사결정을 지원합니다.',
  actions: [
    { label: '열기', tone: 'primary' },
    { label: '상세', tone: 'secondary' },
  ],
  metrics: [
    { label: '핵심 지표', value: '05', meta: '활성 대안' },
    { label: '상태', value: '검토', meta: '거버넌스 대기' },
    { label: '대기열', value: '02', meta: '수용 경로' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: '스냅샷',
      title: '대체 의사결정 현황',
      chip: '실시간',
      items: [
        { label: '담당', value: '의사결정 데스크', meta: '권고안 담당' },
        { label: '초점', value: '대안', meta: '협력사 적합도' },
        { label: '영역', value: '1-2차 협력사', meta: '대응 가능' },
      ],
    },
    {
      kind: 'table',
      eyebrow: '대기열',
      title: '대체 의사결정 대기열',
      chip: '운영',
      columns: ['항목', '상태', '예상 시간'],
      rows: [
        ['주요 흐름', '모니터링', '2시간'],
        ['예비 공급처', '준비됨', '5시간'],
        ['예외 검토', '대기 중', '9시간'],
      ],
    },
    {
      kind: 'feed',
      eyebrow: '업데이트',
      title: '대체 의사결정 피드',
      chip: '메모',
      items: [
        { label: '08:10', text: '예비 협력사가 목표 점수를 넘었습니다.' },
        { label: '10:40', text: '거버넌스 검토용 비용 차이를 첨부했습니다.' },
        { label: '13:15', text: '수용된 권고안이 실행 흐름으로 이동했습니다.' },
      ],
    },
  ],
}
