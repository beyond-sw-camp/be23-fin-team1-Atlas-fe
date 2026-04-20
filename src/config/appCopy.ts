import type { AppLanguage, NavKey, OrganizationType } from '../types'

export const UI_COPY = {
  topbarContext: { ko: '백엔드 도메인 맵', en: 'Backend Domain Map' },
  organization: { ko: '조직', en: 'Organization' },
  searchPlaceholder: { ko: '시스템 검색...', en: 'Search system...' },
  secureAccess: { ko: 'Atlas SCM 보안 접근', en: 'Atlas SCM Secure Access' },
  loginTitle: { ko: '로그인', en: 'Sign In' },
  loginDescription: { ko: '로그인 없이는 모든 페이지 접근이 차단됩니다.', en: 'All pages are blocked until the user signs in.' },
  loginId: { ko: '아이디', en: 'Username' },
  loginPassword: { ko: '비밀번호', en: 'Password' },
  loginButton: { ko: '로그인', en: 'Sign In' },
  loginHint: { ko: '', en: '' },
  loginError: { ko: '아이디 또는 비밀번호가 올바르지 않습니다.', en: 'The username or password is incorrect.' },
  riskOrchestration: { ko: '리스크 오케스트레이션', en: 'Risk Orchestration' },
  beAlignment: { ko: 'BE 정렬 / V1', en: 'BE Alignment / V1' },
} as const

export const SECTION_I18N = {
  monitoring: { ko: '컨트롤 타워', en: 'Control Tower' },
  operations: { ko: '공급망 운영', en: 'Supply Chain Ops' },
  response: { ko: '문서 / 인증', en: 'Documents & Certificates' },
  governance: { ko: '거버넌스', en: 'Governance' },
  system: { ko: '시스템', en: 'System' },
} as const

export const ORGANIZATION_I18N: Record<OrganizationType, Record<AppLanguage, string>> = {
  mainBuyer: { ko: '메인 발주사', en: 'Main Buyer' },
  supplier: { ko: '1차 협력사', en: 'Tier-1 Supplier' },
  admin: { ko: '플랫폼 관리자', en: 'Platform Admin' },
}

export const NAV_I18N: Record<NavKey, Record<AppLanguage, { label: string; description: string; pageSubtitle: string }>> = {
  designSystem: {
    ko: { label: '디자인 시스템', description: '토큰, 타이포, 인터랙션 기준', pageSubtitle: 'Kinetic Blueprint 토큰, 계층, 컴포넌트 기준' },
    en: { label: 'Design System', description: 'Tokens, typography, and interaction rules', pageSubtitle: 'Kinetic Blueprint tokens, hierarchy, and component rules' },
  },
  controlTower: {
    ko: { label: '대시보드', description: '운영 대시보드와 핵심 위험 지표', pageSubtitle: '전체 공급망 운영 현황과 핵심 경보 모니터링' },
    en: { label: 'Dashboard', description: 'Operational dashboard and core risk metrics', pageSubtitle: 'Monitor overall network operations and high-priority alerts' },
  },
  impactOrders: {
    ko: { label: '영향 분석', description: '영향 분석과 우선순위 주문', pageSubtitle: '영향 주문, ETA 편차, 우선순위 실행 큐' },
    en: { label: 'Impact', description: 'Impact analysis and prioritized orders', pageSubtitle: 'Impacted orders, ETA variance, and prioritized execution queue' },
  },
  supplierNetwork: {
    ko: { label: '공급망 네트워크', description: '공급망 네트워크 시각화', pageSubtitle: 'Tier 연결, 병목 지점, 대체 경로 가시화' },
    en: { label: 'Network', description: 'Supply network visualization', pageSubtitle: 'Tier links, bottleneck locations, and alternate route visibility' },
  },
  ordersDesk: {
    ko: { label: '발주 관리', description: '발주 승인, ETA, 우선순위 운영', pageSubtitle: '발주 승인 상태, ETA 변동, 공급처별 우선순위 제어' },
    en: { label: 'Orders', description: 'PO approval, ETA, and priority operations', pageSubtitle: 'PO approval state, ETA shifts, and supplier priority control' },
  },
  supplierControl: {
    ko: { label: '협력사 관리', description: '협력사 상태, 등급, 온보딩 관리', pageSubtitle: '협력사 등급, 인증, 온보딩 및 성과 상태 관리' },
    en: { label: 'Suppliers', description: 'Supplier status, tier, and onboarding', pageSubtitle: 'Supplier tier, certifications, onboarding, and performance status' },
  },
  items: {
    ko: { label: '품목 관리', description: '품목 관리와 재고 임계치', pageSubtitle: 'SKU, 재고, 재발주점, 공급처 기준 운영' },
    en: { label: 'Items', description: 'Item catalog and stock thresholds', pageSubtitle: 'Operate SKUs, inventory, reorder points, and source ownership' },
  },
  lots: {
    ko: { label: 'Lot / 출하', description: 'Lot 추적과 출하 관리', pageSubtitle: 'Lot 이력, 검수, 출하 상태 추적' },
    en: { label: 'Lots', description: 'Lot tracking and shipment control', pageSubtitle: 'Track lot history, inspection, and outbound status' },
  },
    shipments: {
    ko: {
      label: '출하',
      description: '출하 목록, 추적, ETA, 예외 관리',
      pageSubtitle: '출하 흐름과 추적 상태를 관리합니다',
    },
    en: {
      label: 'Shipments',
      description: 'Shipment list, tracking, ETA, and exceptions',
      pageSubtitle: 'Manage outbound shipment flow and tracking status',
    },
  },
  logisticsNodes: {
    ko: {
      label: '물류거점',
      description: '물류거점 등록, 조회, 상태 관리',
      pageSubtitle: '물류거점 정보와 활성 상태를 운영 화면에서 관리',
    },
    en: {
      label: 'Logistics',
      description: 'Create, review, and manage logistics nodes',
      pageSubtitle: 'Operate logistics node master data and active status',
    },
  },
  returns: {
    ko: { label: '반품 (Returns)', description: '반품 요청 및 처리 관리', pageSubtitle: '요청, 승인, 회수, 입고 상태와 이력 추적' },
    en: { label: 'Returns', description: 'Return request and processing management', pageSubtitle: 'Track requested, approved, in-transit, and completed status' },
  },
  certificateWatch: {
    ko: { label: '인증서', description: '인증서 유효성 및 갱신 관리', pageSubtitle: '인증 유형, 만료일, 협력사 상태 추적' },
    en: { label: 'Certificates', description: 'Certificate validity and renewal control', pageSubtitle: 'Track certificate type, expiry, and supplier status' },
  },
  shipmentOps: {
    ko: { label: '리스크 이벤트', description: 'supplier_issue / shipment_delayed', pageSubtitle: '이벤트 기반 물류 지연 대응과 오케스트레이션' },
    en: { label: 'Risk Events', description: 'supplier_issue / shipment_delayed', pageSubtitle: 'Event-driven delay response and orchestration' },
  },
  recoveryTracking: {
    ko: { label: '복구 추적', description: '복구 ETA, 실행 상태, 병목 해소 추적', pageSubtitle: '복구 ETA, 조치 이행, 병목 해소 상태 추적' },
    en: { label: 'Recovery Tracking', description: 'Recovery ETA and execution tracking', pageSubtitle: 'Recovery ETA, task execution, and bottleneck resolution tracking' },
  },
  documents: {
    ko: { label: '문서 관리', description: '문서 보관과 OCR 검증 관리', pageSubtitle: '송장, BOL, OCR 검증과 문서 상태 추적' },
    en: { label: 'Documents', description: 'Document storage and OCR validation', pageSubtitle: 'Track invoice, BOL, OCR validation, and document status' },
  },
  recommendations: {
    ko: { label: '권고안', description: '대체 1차 / 2차 권고안', pageSubtitle: '추천 엔진 기반 대체 공급처 의사결정' },
    en: { label: 'Recommendations', description: 'Alternative tier-1 / tier-2 recommendations', pageSubtitle: 'Recommendation-engine-based supplier decision support' },
  },
  esgSignals: {
    ko: { label: 'ESG 시그널', description: 'ESG 경보와 권고안 점수 반영', pageSubtitle: 'ESG 경보, 원산지, 지속가능성 점수 반영' },
    en: { label: 'ESG Signals', description: 'Apply ESG alerts to recommendation scores', pageSubtitle: 'Apply ESG alerts, origin, and sustainability scoring' },
  },
  governance: {
    ko: { label: '거버넌스', description: '수용 여부와 사후평가 관리', pageSubtitle: '권고안 수용, 실행, 회복 성과, 사후평가' },
    en: { label: 'Governance', description: 'Acceptance and post-evaluation management', pageSubtitle: 'Acceptance, execution, recovery performance, and post-evaluation' },
  },
  evaluation: {
    ko: { label: '평가', description: '수용 결과와 성과 평가 현황', pageSubtitle: '권고안 반영 결과, 평가 점수, 월별 추이 관리' },
    en: { label: 'Evaluation', description: 'Acceptance outcome and performance evaluation', pageSubtitle: 'Track recommendation adoption, evaluation score, and monthly trends' },
  },
  vendorKpi: {
    ko: { label: '벤더 KPI', description: '협력사 KPI 대시보드', pageSubtitle: '납기, 품질, ESG, 대응속도 기준 KPI 비교' },
    en: { label: 'Vendor KPI', description: 'Supplier KPI dashboard', pageSubtitle: 'Compare on-time delivery, quality, ESG, and response performance' },
  },
  acceptance: {
    ko: { label: '수용률', description: '권고안 수용률 현황', pageSubtitle: '수용률, 거절 사유, 긴급도별 반영 상태 추적' },
    en: { label: 'Acceptance', description: 'Recommendation acceptance status', pageSubtitle: 'Track acceptance rate, reject reasons, and urgency-level adoption' },
  },
  auditTrail: {
    ko: { label: '감사 로그', description: '시스템 감사 로그', pageSubtitle: '사용자, 시스템, 보안 이벤트 감사 로그' },
    en: { label: 'Audit', description: 'System audit log', pageSubtitle: 'Audit user, system, and security events' },
  },
  collaboration: {
    ko: { label: '협업', description: '실시간 대응 협업과 알림', pageSubtitle: '운영자, 협력사, 알림 흐름의 실시간 협업' },
    en: { label: 'Collaboration', description: 'Realtime response collaboration and alerts', pageSubtitle: 'Real-time collaboration between operators, suppliers, and alerts' },
  },
  notificationsCenter: {
    ko: { label: '알림', description: '채널 정책과 읽지 않은 경보 관리', pageSubtitle: '알림 채널, 미확인 경보, topic 상태 관리' },
    en: { label: 'Notifications', description: 'Channel policy and unread alert control', pageSubtitle: 'Notification channels, unread alerts, and topic health management' },
  },
  riskRules: {
    ko: { label: '리스크 규칙', description: '이벤트 규칙과 임계치 정책 관리', pageSubtitle: '리스크 룰, 임계치, 자동 에스컬레이션 정책 관리' },
    en: { label: 'Risk Rules', description: 'Event rules and threshold policies', pageSubtitle: 'Risk rules, thresholds, and auto-escalation policy management' },
  },
  settings: {
    ko: { label: '설정', description: '조직, 사용자, 알림, API 키 정책', pageSubtitle: '시스템 전역 설정, 사용자, 보안 정책 관리' },
    en: { label: 'Settings', description: 'Organization, users, notifications, and API policies', pageSubtitle: 'Manage global system configuration, users, and security policies' },
  },
  systemSpec: {
    ko: { label: '시스템 스펙', description: '디자인 스펙과 화면 규격 문서', pageSubtitle: 'Kinetic Blueprint 시스템 스펙 문서' },
    en: { label: 'System Spec', description: 'Design specification and screen standards', pageSubtitle: 'Kinetic Blueprint system specification reference' },
  },
  profile: {
    ko: { label: '프로필', description: '운영자 계정, 권한, 알림 정책', pageSubtitle: '운영자 권한, 알림 정책, KPI와 감사 이력' },
    en: { label: 'Profile', description: 'Operator account, access, and alert policy', pageSubtitle: 'Operator permissions, alert policy, KPI, and audit history' },
  },
}

export const SIDEBAR_OPERATOR_I18N: Record<
  OrganizationType,
  { initials: string; name: Record<AppLanguage, string>; role: Record<AppLanguage, string> }
> = {
  mainBuyer: {
    initials: 'MB',
    name: { ko: '메인 발주 운영', en: 'Min Buyer Ops' },
    role: { ko: '메인 발주사 운영자', en: 'Main Buyer Operator' },
  },
  supplier: {
    initials: 'T1',
    name: { ko: '1차 협력사 데스크', en: 'Tier-1 Desk' },
    role: { ko: '1차 협력사 담당자', en: 'Tier-1 Supplier Lead' },
  },
  admin: {
    initials: 'PA',
    name: { ko: '플랫폼 관리자', en: 'Platform Admin' },
    role: { ko: '플랫폼 관리자', en: 'Platform Administrator' },
  },
}
