import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  ChatRoom,
  ChatMessageDto,
  ChatPanelView,
} from '../types/chat'

/**
 * 채팅 더미 데이터
 * - 채팅방 목록 API가 미확정이므로 프론트에서 임시 데이터 사용
 * - 추후 fetchRooms()를 실제 API 호출로 교체 예정
 */
const DUMMY_ROOMS: ChatRoom[] = [
  {
    publicId: 'room-001',
    name: '발주팀 — 품질관리',
    unreadCount: 3,
    participants: [
      { userPublicId: 'user-001', displayName: '김대리' },
      { userPublicId: 'user-002', displayName: '이과장' },
    ],
    lastMessage: {
      publicId: 'msg-010',
      roomPublicId: 'room-001',
      senderUserPublicId: 'user-002',
      messageType: 'TEXT',
      messageBody: 'TX-990218 리스크 확인 부탁드립니다.',
      sentAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      isDeleted: false,
    },
  },
  {
    publicId: 'room-002',
    name: '반품 처리 협의',
    unreadCount: 0,
    participants: [
      { userPublicId: 'user-001', displayName: '김대리' },
      { userPublicId: 'user-003', displayName: '박부장' },
    ],
    lastMessage: {
      publicId: 'msg-020',
      roomPublicId: 'room-002',
      senderUserPublicId: 'user-001',
      messageType: 'TEXT',
      messageBody: '반품 수량 확인 완료했습니다.',
      sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isDeleted: false,
    },
  },
  {
    publicId: 'room-003',
    name: 'LOT 추적 — 생산라인 A',
    unreadCount: 1,
    participants: [
      { userPublicId: 'user-001', displayName: '김대리' },
      { userPublicId: 'user-004', displayName: '정차장' },
      { userPublicId: 'user-005', displayName: '최사원' },
    ],
    lastMessage: {
      publicId: 'msg-030',
      roomPublicId: 'room-003',
      senderUserPublicId: 'user-004',
      messageType: 'REFERENCE',
      messageBody: 'LOT-2026-0412 품질 상태 HOLD로 변경되었습니다.',
      referenceType: 'LOT',
      referencePublicId: 'lot-pub-001',
      referenceCode: 'LOT-2026-0412',
      referenceTitle: 'LOT 품질 보류 건',
      sentAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      isDeleted: false,
    },
  },
  {
    publicId: 'room-004',
    name: '긴급 — 출하 지연 대응',
    unreadCount: 5,
    participants: [
      { userPublicId: 'user-001', displayName: '김대리' },
      { userPublicId: 'user-006', displayName: '한팀장' },
    ],
    lastMessage: {
      publicId: 'msg-040',
      roomPublicId: 'room-004',
      senderUserPublicId: 'user-006',
      messageType: 'TEXT',
      messageBody: '물류사 측 회신 대기 중입니다. 30분 내 업데이트 드리겠습니다.',
      sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      isDeleted: false,
    },
  },
  {
    publicId: 'room-005',
    name: '인증서 만료 안내',
    unreadCount: 0,
    participants: [
      { userPublicId: 'user-001', displayName: '김대리' },
      { userPublicId: 'user-007', displayName: '윤대리' },
    ],
    lastMessage: {
      publicId: 'msg-050',
      roomPublicId: 'room-005',
      senderUserPublicId: 'user-007',
      messageType: 'TEXT',
      messageBody: 'ISO 9001 갱신 서류 접수 완료.',
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      isDeleted: false,
    },
  },
]

/** 더미 메시지 생성 — 채팅방 진입 시 사용 */
function createDummyMessages(roomPublicId: string): ChatMessageDto[] {
  const currentUser = 'user-001'
  const otherUser = roomPublicId === 'room-001' ? 'user-002' : 'user-003'

  return [
    {
      publicId: `${roomPublicId}-msg-001`,
      roomPublicId,
      senderUserPublicId: 'SYSTEM',
      messageType: 'SYSTEM_JOIN',
      messageBody: '김대리님이 입장했습니다.',
      sentAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      isDeleted: false,
    },
    {
      publicId: `${roomPublicId}-msg-002`,
      roomPublicId,
      senderUserPublicId: otherUser,
      messageType: 'TEXT',
      messageBody: '안녕하세요. 건 관련하여 논의 부탁드립니다.',
      sentAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 0,
    },
    {
      publicId: `${roomPublicId}-msg-003`,
      roomPublicId,
      senderUserPublicId: currentUser,
      messageType: 'TEXT',
      messageBody: '네, 확인했습니다. 어떤 부분 먼저 확인할까요?',
      sentAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 0,
    },
    {
      publicId: `${roomPublicId}-msg-004`,
      roomPublicId,
      senderUserPublicId: otherUser,
      messageType: 'REFERENCE',
      messageBody: '아래 발주서 건 먼저 확인 부탁드립니다.',
      referenceType: 'ORDER',
      referencePublicId: 'po-pub-001',
      referenceCode: 'TX-990218',
      referenceTitle: '반도체 부품 긴급 발주',
      sentAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 0,
    },
    {
      publicId: `${roomPublicId}-msg-005`,
      roomPublicId,
      senderUserPublicId: currentUser,
      messageType: 'TEXT',
      messageBody: '확인 중입니다. 수량 관련 이슈가 있어서 잠시만 기다려 주세요.',
      sentAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 0,
    },
    {
      publicId: `${roomPublicId}-msg-006`,
      roomPublicId,
      senderUserPublicId: currentUser,
      messageType: 'TEXT',
      messageBody: '수량 확인 완료했습니다. 기존 발주 대비 15% 초과 요청이 들어왔네요.',
      sentAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 1,
    },
    {
      publicId: `${roomPublicId}-msg-007`,
      roomPublicId,
      senderUserPublicId: otherUser,
      messageType: 'TEXT',
      messageBody: '초과분에 대해서는 별도 반품 처리 진행하겠습니다.',
      sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 1,
    },
    {
      publicId: `${roomPublicId}-msg-008`,
      roomPublicId,
      senderUserPublicId: otherUser,
      messageType: 'TEXT',
      messageBody: '관련 서류 첨부합니다.',
      attachmentPublicIds: ['file-001'],
      sentAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 1,
    },
    {
      publicId: `${roomPublicId}-msg-009`,
      roomPublicId,
      senderUserPublicId: currentUser,
      messageType: 'TEXT',
      messageBody: '접수 완료. 처리 후 알려드리겠습니다.',
      sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      editedAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
      isDeleted: false,
      unreadCount: 2,
    },
  ]
}

export const useAtlasChatStore = defineStore('atlasChat', () => {
  /* ── 현재 로그인 사용자 (더미) ── */
  const currentUserPublicId = ref('user-001')

  /* ── 패널 UI 상태 ── */
  const isPanelOpen = ref(false)
  const currentView = ref<ChatPanelView>('list')

  /* ── 채팅방 목록 ── */
  const rooms = ref<ChatRoom[]>([...DUMMY_ROOMS])

  /* ── 현재 채팅방 ── */
  const currentRoomPublicId = ref<string | null>(null)
  const messages = ref<ChatMessageDto[]>([])
  const isLoadingMessages = ref(false)

  /* ── 안 읽은 메시지 총합 (뱃지용) ── */
  const totalUnreadCount = computed(() =>
    rooms.value.reduce((sum, room) => sum + room.unreadCount, 0),
  )

  /* ── 현재 채팅방 정보 ── */
  const currentRoom = computed(() =>
    rooms.value.find((r) => r.publicId === currentRoomPublicId.value) ?? null,
  )

  /* ── 액션: 패널 토글 ── */
  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
    if (!isPanelOpen.value) {
      // 닫을 때 상태 초기화
      currentView.value = 'list'
      currentRoomPublicId.value = null
      messages.value = []
    }
  }

  function closePanel() {
    isPanelOpen.value = false
    currentView.value = 'list'
    currentRoomPublicId.value = null
    messages.value = []
  }

  /* ── 액션: 채팅방 진입 ── */
  function openRoom(roomPublicId: string) {
    currentRoomPublicId.value = roomPublicId
    currentView.value = 'room'
    isLoadingMessages.value = true

    // 더미 — 실제에서는 API 호출
    setTimeout(() => {
      messages.value = createDummyMessages(roomPublicId)
      isLoadingMessages.value = false
    }, 300)

    // 읽음 처리 (더미)
    const room = rooms.value.find((r) => r.publicId === roomPublicId)
    if (room) {
      room.unreadCount = 0
    }
  }

  /* ── 액션: 목록으로 복귀 ── */
  function backToList() {
    currentView.value = 'list'
    currentRoomPublicId.value = null
    messages.value = []
  }

  /* ── 액션: 메시지 전송 (더미) ── */
  function sendMessage(messageBody: string) {
    if (!currentRoomPublicId.value || !messageBody.trim()) return

    const newMsg: ChatMessageDto = {
      publicId: `msg-${Date.now()}`,
      roomPublicId: currentRoomPublicId.value,
      senderUserPublicId: currentUserPublicId.value,
      messageType: 'TEXT',
      messageBody: messageBody.trim(),
      sentAt: new Date().toISOString(),
      isDeleted: false,
    }

    messages.value.push(newMsg)

    // 채팅방 목록의 마지막 메시지도 업데이트
    const room = rooms.value.find((r) => r.publicId === currentRoomPublicId.value)
    if (room) {
      room.lastMessage = newMsg
    }
  }

  /* ── 액션: 메시지 삭제 (Soft Delete — 실제 API에서는 DELETE 요청) ── */
  function deleteMessage(messagePublicId: string) {
    const msg = messages.value.find((m) => m.publicId === messagePublicId)
    if (!msg) return

    // 내 메시지만 삭제 가능
    if (msg.senderUserPublicId !== currentUserPublicId.value) return

    // Soft Delete: isDeleted 플래그 + 본문 치환
    msg.isDeleted = true
    msg.messageBody = '[삭제된 메시지입니다.]'
  }

  /* ── 액션: 업무 참조 카드 메시지 전송 (더미) ── */
  function sendReferenceMessage(refType: string, refCode: string, refTitle: string) {
    if (!currentRoomPublicId.value) return

    const newMsg: ChatMessageDto = {
      publicId: `msg-${Date.now()}`,
      roomPublicId: currentRoomPublicId.value,
      senderUserPublicId: currentUserPublicId.value,
      messageType: 'REFERENCE',
      messageBody: `${refTitle} 건을 공유합니다.`,
      referenceType: refType,
      referencePublicId: `ref-${Date.now()}`,
      referenceCode: refCode,
      referenceTitle: refTitle,
      sentAt: new Date().toISOString(),
      isDeleted: false,
    }

    messages.value.push(newMsg)

    const room = rooms.value.find((r) => r.publicId === currentRoomPublicId.value)
    if (room) {
      room.lastMessage = newMsg
    }
  }

  return {
    currentUserPublicId,
    isPanelOpen,
    currentView,
    rooms,
    currentRoomPublicId,
    currentRoom,
    messages,
    isLoadingMessages,
    totalUnreadCount,
    togglePanel,
    closePanel,
    openRoom,
    backToList,
    sendMessage,
    deleteMessage,
    sendReferenceMessage,
  }
})

