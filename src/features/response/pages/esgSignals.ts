import type { StructuredPageDefinition } from '../../shared/types/page'

export const esgSignalsPage: StructuredPageDefinition = {
  eyebrow: '대응 / ESG',
  title: 'ESG 반영 점수 데스크',
  subtitle: '권고안 점수에 ESG 경보, 원산지 리스크, 지속가능성 기준을 반영합니다.',
  actions: [
    { label: '열기', tone: 'primary' },
    { label: '상세', tone: 'secondary' },
  ],
  metrics: [
    { label: '핵심 지표', value: '03', meta: 'ESG 경보' },
    { label: '상태', value: '조정됨', meta: '점수 갱신' },
    { label: '대기열', value: '11', meta: '추적 협력사' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: '스냅샷',
      title: 'ESG 반영 점수 현황',
      chip: '실시간',
      items: [
        { label: '담당', value: 'ESG 데스크', meta: '정책 담당' },
        { label: '초점', value: '점수', meta: '리스크 가중치' },
        { label: '영역', value: '글로벌', meta: '원산지 혼합' },
      ],
    },
    {
      kind: 'table',
      eyebrow: '대기열',
      title: 'ESG 점수 대기열',
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
      title: 'ESG 점수 피드',
      chip: '메모',
      items: [
        { label: '08:10', text: '협력사 묶음 1건의 원산지 리스크가 상승했습니다.' },
        { label: '10:40', text: '권고안 점수가 정책 기준 아래로 내려갔습니다.' },
        { label: '13:15', text: '지속가능성 증빙으로 예비 공급처 순위가 회복되었습니다.' },
      ],
    },
  ],
}
