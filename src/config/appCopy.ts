import type { AppLanguage, NavKey, OrganizationType } from '../types'

export const UI_COPY = {
  topbarContext: { ko: '백엔드 도메인 맵', en: '백엔드 도메인 맵' },
  organization: { ko: '조직', en: '조직' },
  searchPlaceholder: { ko: '시스템 검색...', en: '시스템 검색...' },
  secureAccess: { ko: 'Atlas SCM 보안 접근', en: 'Atlas SCM 보안 접근' },
  loginTitle: { ko: '로그인', en: '로그인' },
  loginDescription: { ko: '로그인 없이는 모든 페이지 접근이 차단됩니다.', en: '로그인 없이는 모든 페이지 접근이 차단됩니다.' },
  loginId: { ko: '아이디', en: '아이디' },
  loginPassword: { ko: '비밀번호', en: '비밀번호' },
  loginButton: { ko: '로그인', en: '로그인' },
  loginHint: { ko: '', en: '' },
  loginError: { ko: '아이디 또는 비밀번호가 올바르지 않습니다.', en: '아이디 또는 비밀번호가 올바르지 않습니다.' },
  riskOrchestration: { ko: '리스크 오케스트레이션', en: '리스크 오케스트레이션' },
  beAlignment: { ko: 'BE 정렬 / V1', en: 'BE 정렬 / V1' },
} as const

export const SECTION_I18N = {
  monitoring: { ko: '컨트롤 타워', en: '컨트롤 타워' },
  operations: { ko: '공급망 운영', en: '공급망 운영' },
  response: { ko: '문서 / 인증', en: '문서 / 인증' },
  governance: { ko: '거버넌스', en: '거버넌스' },
  system: { ko: '시스템', en: '시스템' },
} as const

export const ORGANIZATION_I18N: Record<OrganizationType, Record<AppLanguage, string>> = {
  mainBuyer: { ko: '메인 발주사', en: '메인 발주사' },
  supplier: { ko: '1차 협력사', en: '1차 협력사' },
  admin: { ko: '플랫폼 관리자', en: '플랫폼 관리자' },
}

export const NAV_I18N: Record<NavKey, Record<AppLanguage, { label: string; description: string; pageSubtitle: string }>> = {
  designSystem: {
    ko: { label: '디자인 시스템', description: '토큰, 타이포, 인터랙션 기준', pageSubtitle: 'Kinetic Blueprint 토큰, 계층, 컴포넌트 기준' },
    en: { label: '디자인 시스템', description: '토큰, 타이포, 인터랙션 기준', pageSubtitle: 'Kinetic Blueprint 토큰, 계층, 컴포넌트 기준' },
  },
  organizationProfile: {
    ko: {
      label: '조직 프로필',
      description: '조직 기본정보와 등록 물품을 확인합니다.',
      pageSubtitle: '검색 결과에서 진입하는 읽기 전용 조직 정보입니다.',
    },
    en: {
      label: '조직 프로필',
      description: '조직 기본정보와 등록 물품을 확인합니다.',
      pageSubtitle: '검색 결과에서 진입하는 읽기 전용 조직 정보입니다.',
    },
  },
  controlTower: {
    ko: { label: '대시보드', description: '운영 대시보드와 핵심 위험 지표', pageSubtitle: '전체 공급망 운영 현황과 핵심 경보 모니터링' },
    en: { label: '대시보드', description: '운영 대시보드와 핵심 위험 지표', pageSubtitle: '전체 공급망 운영 현황과 핵심 경보 모니터링' },
  },
  impactOrders: {
    ko: { label: '영향 분석', description: '영향 분석과 우선순위 주문', pageSubtitle: '영향 주문, ETA 편차, 우선순위 실행 큐' },
    en: { label: '영향 분석', description: '영향 분석과 우선순위 주문', pageSubtitle: '영향 주문, ETA 편차, 우선순위 실행 큐' },
  },
  supplierNetwork: {
    ko: { label: '공급망 네트워크', description: '공급망 네트워크 시각화', pageSubtitle: 'Tier 연결, 병목 지점, 대체 경로 가시화' },
    en: { label: '공급망 네트워크', description: '공급망 네트워크 시각화', pageSubtitle: 'Tier 연결, 병목 지점, 대체 경로 가시화' },
  },
  ordersDesk: {
    ko: { label: '발주 관리', description: '발주 승인, ETA, 우선순위 운영', pageSubtitle: '발주 승인 상태, ETA 변동, 공급처별 우선순위 제어' },
    en: { label: '발주 관리', description: '발주 승인, ETA, 우선순위 운영', pageSubtitle: '발주 승인 상태, ETA 변동, 공급처별 우선순위 제어' },
  },
  supplierControl: {
    ko: { label: '협력사 관리', description: '협력사 상태, 등급, 온보딩 관리', pageSubtitle: '협력사 등급, 인증, 온보딩 및 성과 상태 관리' },
    en: { label: '협력사 관리', description: '협력사 상태, 등급, 온보딩 관리', pageSubtitle: '협력사 등급, 인증, 온보딩 및 성과 상태 관리' },
  },
  items: {
    ko: { label: '품목 관리', description: '품목 관리와 재고 임계치', pageSubtitle: 'SKU, 재고, 재발주점, 공급처 기준 운영' },
    en: { label: '품목 관리', description: '품목 관리와 재고 임계치', pageSubtitle: 'SKU, 재고, 재발주점, 공급처 기준 운영' },
  },
    inventory: {
      ko: {
        label: '재고 관리',
        description: '품목별 유통기한 재고 관리',
        pageSubtitle: '제조일, 유통기한, 예약 수량 기준 재고를 관리합니다.',
      },
    en: {
        label: '재고 관리',
        description: '품목별 유통기한 재고 관리',
        pageSubtitle: '제조일, 유통기한, 예약 수량 기준 재고를 관리합니다.',
      },
    },

    shipments: {
    ko: {
      label: '출하',
      description: '출하 목록, 추적, ETA, 예외 관리',
      pageSubtitle: '출하 흐름과 추적 상태를 관리합니다',
    },
    en: {
      label: '출하',
      description: '출하 목록, 추적, ETA, 예외 관리',
      pageSubtitle: '출하 흐름과 추적 상태를 관리합니다',
    },
  },
    settlements: {
    ko: {
      label: '정산',
      description: '정산 목록, 상세, 승인, 취소 관리',
      pageSubtitle: '정산 처리 상태와 승인 흐름을 관리합니다',
    },
    en: {
      label: '정산',
      description: '정산 목록, 상세, 승인, 취소 관리',
      pageSubtitle: '정산 처리 상태와 승인 흐름을 관리합니다',
    },
  },
  logisticsNodes: {
    ko: {
      label: '창고',
      description: '창고 등록, 조회, 상태 관리',
      pageSubtitle: '창고 정보와 활성 상태를 운영 화면에서 관리',
    },
    en: {
      label: '창고',
      description: '창고 등록, 조회, 상태 관리',
      pageSubtitle: '창고 정보와 활성 상태를 운영 화면에서 관리',
    },
  },
  returns: {
    ko: { label: '반품', description: '반품 요청 및 처리 관리', pageSubtitle: '요청, 승인, 회수, 입고 상태와 이력 추적' },
    en: { label: '반품', description: '반품 요청 및 처리 관리', pageSubtitle: '요청, 승인, 회수, 입고 상태와 이력 추적' },
  },
  certificateWatch: {
    ko: { label: '인증서', description: '인증서 유효성 및 갱신 관리', pageSubtitle: '인증 유형, 만료일, 협력사 상태 추적' },
    en: { label: '인증서', description: '인증서 유효성 및 갱신 관리', pageSubtitle: '인증 유형, 만료일, 협력사 상태 추적' },
  },
  certificateReview: {
    ko: { label: '인증서 심사', description: '심사 요청 인증서 승인/반려', pageSubtitle: 'REVIEW_REQUESTED 인증서를 검토하고 승인 또는 반려합니다.' },
    en: { label: '인증서 심사', description: '심사 요청 인증서 승인/반려', pageSubtitle: 'REVIEW_REQUESTED 인증서를 검토하고 승인 또는 반려합니다.' },
  },
  shipmentOps: {
    ko: { label: '리스크 이벤트', description: 'supplier_issue / shipment_delayed', pageSubtitle: '이벤트 기반 물류 지연 대응과 오케스트레이션' },
    en: { label: '리스크 이벤트', description: 'supplier_issue / shipment_delayed', pageSubtitle: '이벤트 기반 물류 지연 대응과 오케스트레이션' },
  },
  recoveryTracking: {
    ko: { label: '복구 추적', description: '복구 ETA, 실행 상태, 병목 해소 추적', pageSubtitle: '복구 ETA, 조치 이행, 병목 해소 상태 추적' },
    en: { label: '복구 추적', description: '복구 ETA, 실행 상태, 병목 해소 추적', pageSubtitle: '복구 ETA, 조치 이행, 병목 해소 상태 추적' },
  },
  documents: {
    ko: { label: '문서 관리', description: '문서 보관과 OCR 검증 관리', pageSubtitle: '송장, BOL, OCR 검증과 문서 상태 추적' },
    en: { label: '문서 관리', description: '문서 보관과 OCR 검증 관리', pageSubtitle: '송장, BOL, OCR 검증과 문서 상태 추적' },
  },
  recommendations: {
    ko: { label: '권고안', description: '대체 1차 / 2차 권고안', pageSubtitle: '추천 엔진 기반 대체 공급처 의사결정' },
    en: { label: '권고안', description: '대체 1차 / 2차 권고안', pageSubtitle: '추천 엔진 기반 대체 공급처 의사결정' },
  },
  esgSignals: {
    ko: { label: 'ESG 시그널', description: 'ESG 경보와 권고안 점수 반영', pageSubtitle: 'ESG 경보, 원산지, 지속가능성 점수 반영' },
    en: { label: 'ESG 시그널', description: 'ESG 경보와 권고안 점수 반영', pageSubtitle: 'ESG 경보, 원산지, 지속가능성 점수 반영' },
  },
  governance: {
    ko: { label: '거버넌스', description: '수용 여부와 사후평가 관리', pageSubtitle: '권고안 수용, 실행, 회복 성과, 사후평가' },
    en: { label: '거버넌스', description: '수용 여부와 사후평가 관리', pageSubtitle: '권고안 수용, 실행, 회복 성과, 사후평가' },
  },
  evaluation: {
    ko: { label: '평가', description: '수용 결과와 성과 평가 현황', pageSubtitle: '권고안 반영 결과, 평가 점수, 월별 추이 관리' },
    en: { label: '평가', description: '수용 결과와 성과 평가 현황', pageSubtitle: '권고안 반영 결과, 평가 점수, 월별 추이 관리' },
  },
  vendorKpi: {
    ko: { label: '벤더 KPI', description: '협력사 KPI 대시보드', pageSubtitle: '납기, 품질, ESG, 대응속도 기준 KPI 비교' },
    en: { label: '벤더 KPI', description: '협력사 KPI 대시보드', pageSubtitle: '납기, 품질, ESG, 대응속도 기준 KPI 비교' },
  },
  acceptance: {
    ko: { label: '수용률', description: '권고안 수용률 현황', pageSubtitle: '수용률, 거절 사유, 긴급도별 반영 상태 추적' },
    en: { label: '수용률', description: '권고안 수용률 현황', pageSubtitle: '수용률, 거절 사유, 긴급도별 반영 상태 추적' },
  },
  auditTrail: {
    ko: { label: '감사 로그', description: '시스템 감사 로그', pageSubtitle: '사용자, 시스템, 보안 이벤트 감사 로그' },
    en: { label: '감사 로그', description: '시스템 감사 로그', pageSubtitle: '사용자, 시스템, 보안 이벤트 감사 로그' },
  },
  collaboration: {
    ko: { label: '협업', description: '실시간 대응 협업과 알림', pageSubtitle: '운영자, 협력사, 알림 흐름의 실시간 협업' },
    en: { label: '협업', description: '실시간 대응 협업과 알림', pageSubtitle: '운영자, 협력사, 알림 흐름의 실시간 협업' },
  },
  notificationsCenter: {
    ko: { label: '알림', description: '채널 정책과 읽지 않은 경보 관리', pageSubtitle: '알림 채널, 미확인 경보, topic 상태 관리' },
    en: { label: '알림', description: '채널 정책과 읽지 않은 경보 관리', pageSubtitle: '알림 채널, 미확인 경보, topic 상태 관리' },
  },
  riskRules: {
    ko: { label: '리스크 규칙', description: '이벤트 규칙과 임계치 정책 관리', pageSubtitle: '리스크 룰, 임계치, 자동 에스컬레이션 정책 관리' },
    en: { label: '리스크 규칙', description: '이벤트 규칙과 임계치 정책 관리', pageSubtitle: '리스크 룰, 임계치, 자동 에스컬레이션 정책 관리' },
  },
  settings: {
    ko: { label: '설정', description: '조직, 사용자, 알림, API 키 정책', pageSubtitle: '시스템 전역 설정, 사용자, 보안 정책 관리' },
    en: { label: '설정', description: '조직, 사용자, 알림, API 키 정책', pageSubtitle: '시스템 전역 설정, 사용자, 보안 정책 관리' },
  },
    organizationManagement: {
    ko: {
      label: '조직관리',
      description: '조직 목록 조회와 조직 정보 수정',
      pageSubtitle: '플랫폼 관리자와 조직 대표자가 조직 정보를 관리합니다',
    },
    en: {
      label: '조직관리',
      description: '조직 목록 조회와 조직 정보 수정',
      pageSubtitle: '플랫폼 관리자와 조직 대표자가 조직 정보를 관리합니다',
    },
  },

  systemSpec: {
    ko: { label: '시스템 스펙', description: '디자인 스펙과 화면 규격 문서', pageSubtitle: 'Kinetic Blueprint 시스템 스펙 문서' },
    en: { label: '시스템 스펙', description: '디자인 스펙과 화면 규격 문서', pageSubtitle: 'Kinetic Blueprint 시스템 스펙 문서' },
  },
  profile: {
    ko: { label: '프로필', description: '운영자 계정, 권한, 알림 정책', pageSubtitle: '운영자 권한, 알림 정책, KPI와 감사 이력' },
    en: { label: '프로필', description: '운영자 계정, 권한, 알림 정책', pageSubtitle: '운영자 권한, 알림 정책, KPI와 감사 이력' },
  },
}

export const SIDEBAR_OPERATOR_I18N: Record<
  OrganizationType,
  { initials: string; name: Record<AppLanguage, string>; role: Record<AppLanguage, string> }
> = {
  mainBuyer: {
    initials: 'MB',
    name: { ko: '메인 발주 운영', en: '메인 발주 운영' },
    role: { ko: '메인 발주사 운영자', en: '메인 발주사 운영자' },
  },
  supplier: {
    initials: 'T1',
    name: { ko: '1차 협력사 데스크', en: '1차 협력사 데스크' },
    role: { ko: '1차 협력사 담당자', en: '1차 협력사 담당자' },
  },
  admin: {
    initials: 'PA',
    name: { ko: '플랫폼 관리자', en: '플랫폼 관리자' },
    role: { ko: '플랫폼 관리자', en: '플랫폼 관리자' },
  },
}
