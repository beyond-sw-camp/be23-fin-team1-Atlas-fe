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
  loginHint: { ko: '데모 계정: atlas.admin / atlas1234', en: 'Demo account: atlas.admin / atlas1234' },
  loginError: { ko: '아이디 또는 비밀번호가 올바르지 않습니다.', en: 'The username or password is incorrect.' },
  riskOrchestration: { ko: '리스크 오케스트레이션', en: 'Risk Orchestration' },
  beAlignment: { ko: 'BE 정렬 / V1', en: 'BE Alignment / V1' },
} as const

export const SECTION_I18N = {
  monitoring: { ko: '모니터링', en: 'Monitoring' },
  operations: { ko: '운영', en: 'Operations' },
  response: { ko: '대응', en: 'Response' },
  governance: { ko: '거버넌스', en: 'Governance' },
  system: { ko: '시스템', en: 'System' },
} as const

export const ORGANIZATION_I18N: Record<OrganizationType, Record<AppLanguage, string>> = {
  mainBuyer: { ko: '메인 발주사', en: 'Main Buyer' },
  supplier: { ko: '1차 협력사', en: 'Tier-1 Supplier' },
  admin: { ko: '플랫폼 관리자', en: 'Platform Admin' },
}

export const NAV_I18N: Record<NavKey, Record<AppLanguage, { label: string; description: string; pageSubtitle: string }>> = {
  controlTower: {
    ko: { label: '컨트롤 타워', description: '실시간 리스크 오케스트레이션', pageSubtitle: '영향 주문, 납기 리스크, 실시간 이슈 모니터링' },
    en: { label: 'Control Tower', description: 'Real-time risk orchestration', pageSubtitle: 'Impact orders, ETA risk, and live issue monitoring' },
  },
  impactOrders: {
    ko: { label: '영향 발주', description: '영향 PO와 납기 복구 우선순위', pageSubtitle: '영향 발주, 회복 ETA, 우선순위 기준 실행 큐' },
    en: { label: 'Impact Orders', description: 'Priority queue for impacted POs', pageSubtitle: 'Impacted orders, recovery ETA, and prioritized execution queue' },
  },
  supplierNetwork: {
    ko: { label: '공급망 네트워크', description: '1차-3차 공급망 가시화', pageSubtitle: '공급망 tier 연결, 병목 위치, 대체 경로 가시화' },
    en: { label: 'Supplier Network', description: 'Tier 1-3 supply visibility', pageSubtitle: 'Tier links, bottleneck locations, and alternate route visibility' },
  },
  ordersDesk: {
    ko: { label: '발주 관리', description: '발주 승인, ETA, 우선순위 운영', pageSubtitle: '발주 승인 상태, ETA 변동, 공급처별 우선순위 제어' },
    en: { label: 'Order Control', description: 'PO approval, ETA, and priority operations', pageSubtitle: 'PO approval state, ETA shifts, and supplier priority control' },
  },
  supplierControl: {
    ko: { label: '협력사 관리', description: '협력사 상태, 등급, 온보딩 관리', pageSubtitle: '협력사 등급, 인증, 온보딩 및 성과 상태 관리' },
    en: { label: 'Supplier Control', description: 'Supplier status, tier, and onboarding', pageSubtitle: 'Supplier tier, certifications, onboarding, and performance status' },
  },
  certificateWatch: {
    ko: { label: '인증 감시', description: '인증 만료와 품질 리스크 사전 감시', pageSubtitle: '인증 만료, lot 이슈, 품질 문서 상태 사전 감시' },
    en: { label: 'Certificate Watch', description: 'Proactive certificate and quality watch', pageSubtitle: 'Expiry risk, lot issues, and proactive quality document watch' },
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
    ko: { label: '문서 및 인증', description: '품질 이슈, lot, 인증 추적', pageSubtitle: '품질, lot, 인증, 문서 상태 추적' },
    en: { label: 'Docs & Certs', description: 'Quality issue, lot, and certification tracking', pageSubtitle: 'Quality, lot, certification, and document status tracking' },
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
  auditTrail: {
    ko: { label: '감사 이력', description: '권고안 이력, 수용 사유, 감사 로그', pageSubtitle: '권고안 이력, 승인 기록, 감사 로그 추적' },
    en: { label: 'Audit Trail', description: 'Recommendation history and audit logs', pageSubtitle: 'Recommendation history, approval records, and audit log tracking' },
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
