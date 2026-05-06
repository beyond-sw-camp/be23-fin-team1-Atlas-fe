import type { StructuredPageDefinition } from '../../shared/types/page'

export const recoveryTrackingPage: StructuredPageDefinition = {
  eyebrow: '대응 / 회복',
  title: '실행 타임라인',
  subtitle: '수용된 권고안의 실행 상태와 ETA 회복률을 추적합니다.',
  actions: [
    { label: '열기', tone: 'primary' },
    { label: '상세', tone: 'secondary' },
  ],
  metrics: [
    { label: '핵심 지표', value: '81%', meta: '예정 회복률' },
    { label: '상태', value: '정상 진행', meta: '마일스톤 3건 완료' },
    { label: '대기열', value: '02', meta: '차단 작업' },
  ],
  panels: [
    {
      kind: 'grid',
      eyebrow: '스냅샷',
      title: '실행 타임라인 현황',
      chip: '실시간',
      items: [
        { label: '담당', value: '회복 담당', meta: '타임라인 담당' },
        { label: '초점', value: '일정', meta: '마일스톤 흐름' },
        { label: '영역', value: '혼합', meta: '공장-항만' },
      ],
    },
    {
      kind: 'table',
      eyebrow: '대기열',
      title: '실행 타임라인 대기열',
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
      title: '실행 타임라인 피드',
      chip: '메모',
      items: [
        { label: '08:10', text: '권고안이 수용되어 실행 대기열에 등록되었습니다.' },
        { label: '10:40', text: '창고 재배치로 적체가 11% 감소했습니다.' },
        { label: '13:15', text: '운송 변경 후 최종 예정 시간이 재계산되었습니다.' },
      ],
    },
  ],
}
