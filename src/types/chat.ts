/**
 * 채팅 도메인 타입 정의
 * - frontend_dto_spec.md의 ChatMessageDto, MarkAsReadRequestDto 기반
 * - 채팅방 목록은 백엔드 API 미확정이므로 프론트 전용 타입으로 정의
 */

/** 메시지 유형 */
export type ChatMessageType =
  | 'TEXT'
  | 'SYSTEM'
  | 'SYSTEM_JOIN'
  | 'SYSTEM_LEAVE'
  | 'REFERENCE'
  | 'FILE'
  | 'IMAGE'

/** 업무 참조 유형 */
export type ChatReferenceType = 'ORDER' | 'RETURN_REQUEST' | string

/** 채팅 메시지 DTO (백엔드 응답/WebSocket 수신 구조) */
export interface ChatMessageDto {
  publicId: string
  roomPublicId: string
  senderUserPublicId: string
  messageType: ChatMessageType
  /** 본문. isDeleted가 true면 '[삭제된 메시지입니다.]'로 강제 치환됨 */
  messageBody: string
  referenceType?: ChatReferenceType
  referencePublicId?: string
  /** UI 표시용 참조 업무 번호 */
  referenceCode?: string
  /** UI 표시용 참조 업무 제목 */
  referenceTitle?: string
  attachmentPublicIds?: string[]
  
  // -- 답장 관련 필드 --
  parentMessagePublicId?: string
  parentMessageBody?: string
  parentSenderDisplayName?: string

  sentAt: string
  /** 수정 시간. UI에서 '(수정됨)' 표기 */
  editedAt?: string
  isDeleted: boolean
  /** 메시지별 안읽음 인원 수. 프론트엔드 UI 렌더링용 */
  unreadCount?: number
}

/** 읽음 처리 요청 DTO */
export interface MarkAsReadRequest {
  lastReadMessagePublicId?: string
}

/** 채팅방 참여자 */
export interface ChatParticipant {
  userPublicId: string
  displayName: string
  role?: string
  jobTitle?: string
  departmentName?: string
  departmentCode?: string
  profileAttachmentPublicId?: string
  profileImageThumbPath?: string
}

/** 채팅방 정보 (프론트 전용 — 백엔드 API 미확정) */
export interface ChatRoom {
  publicId: string
  roomName: string
  roomStatus?: string
  lastMessage?: ChatMessageDto
  unreadCount: number
  participants?: ChatParticipant[]
  /** 고정 시각. null이면 고정 안 됨. 백엔드 DB 기준. */
  pinnedAt?: string | null
}

/** 패널 내부 뷰 상태 */
export type ChatPanelView = 'list' | 'room'

/** WebSocket으로 메시지 발송 시 페이로드 */
export interface SendMessagePayload {
  messageBody: string
  messageType: ChatMessageType
  parentMessagePublicId?: string
  attachmentPublicIds?: string[]
  referenceType?: ChatReferenceType
  referencePublicId?: string
}

/** 타이핑 이벤트 페이로드 */
export interface TypingPayload {
  userPublicId: string
  roomPublicId: string
}
