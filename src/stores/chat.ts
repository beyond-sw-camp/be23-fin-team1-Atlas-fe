import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { Client, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { getUsers } from '../services/user'

import type {
  ChatRoom,
  ChatMessageDto,
  ChatPanelView,
  ChatParticipant
} from '../types/chat'
import { chatService } from '../services/chat'
import { useAtlasSessionStore } from './session'
import { useAtlasNotificationStore } from './notification'

const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT || 'http://localhost:8080/ws-control'
const ROOM_LIST_SIZE = 100

// --- Backend to Frontend Mapper (Anti-Corruption Layer) ---
export function mapToParticipant(p: any): ChatParticipant {
  if (!p) return {} as ChatParticipant
  return {
    userPublicId: String(p.userPublicId || p.user_public_id || p.publicId || p.public_id || p.id || ''),
    displayName: String(p.displayName || p.display_name || p.name || p.user_name || p.loginId || '이름 없음'),
    role: p.role,
    jobTitle: p.jobTitle || p.job_title,
    departmentName: p.departmentName || p.department_name,
    departmentCode: p.departmentCode || p.department_code,
    profileAttachmentPublicId: p.profileAttachmentPublicId || p.profile_attachment_public_id,
    profileImageThumbPath: p.profileImageThumbPath || p.profile_image_thumb_path
  }
}

export function mapToChatMessage(m: any): ChatMessageDto {
  if (!m) return m as any
  return {
    publicId: String(m.publicId || m.public_id || m.id || ''),
    roomPublicId: String(m.roomPublicId || m.room_public_id || ''),
    senderUserPublicId: String(m.senderUserPublicId || m.sender_user_public_id || ''),
    messageType: m.messageType || m.message_type,
    messageBody: m.messageBody || m.message_body || m.content || '',
    referenceType: m.referenceType || m.reference_type,
    referencePublicId: m.referencePublicId || m.reference_public_id,
    referenceCode: m.referenceCode || m.reference_code,
    referenceTitle: m.referenceTitle || m.reference_title,
    attachmentPublicIds: m.attachmentPublicIds || m.attachment_public_ids,
    parentMessagePublicId: m.parentMessagePublicId || m.parent_message_public_id || undefined,
    parentMessageBody: m.parentMessageBody || m.parent_message_body || undefined,
    parentSenderDisplayName: m.parentSenderDisplayName || m.parent_sender_display_name || undefined,
    sentAt: m.sentAt || m.sent_at || m.createdAt || m.created_at,
    editedAt: m.editedAt || m.edited_at,
    isDeleted: Boolean(m.isDeleted ?? m.is_deleted ?? m.deleted ?? false),
    unreadCount: Number(m.unreadCount ?? m.unread_count ?? 0)
  }
}

export function mapToChatRoom(r: any): ChatRoom {
  if (!r) return r as any
  const lastMessageValue = r.lastMessage || r.last_message
  const lastMessageAt = r.lastMessageAt || r.last_message_at
  const createdAt = r.createdAt || r.created_at
  const lastMessage = lastMessageValue && typeof lastMessageValue === 'object'
    ? mapToChatMessage(lastMessageValue)
    : lastMessageValue
      ? mapToChatMessage({
          publicId: '',
          roomPublicId: r.publicId || r.public_id || r.id || '',
          senderUserPublicId: '',
          messageType: 'TEXT',
          messageBody: lastMessageValue,
          sentAt: lastMessageAt || createdAt,
          isDeleted: false,
        })
      : undefined

  return {
    publicId: String(r.publicId || r.public_id || r.id || ''),
    roomName: String(r.roomName || r.room_name || r.name || ''),
    roomStatus: r.roomStatus || r.room_status,
    createdAt,
    lastMessageAt,
    lastMessageText: typeof lastMessageValue === 'string' ? lastMessageValue : undefined,
    lastMessage,
    unreadCount: Number(r.unreadCount ?? r.unread_count ?? 0),
    participants: Array.isArray(r.participants) ? r.participants.map(mapToParticipant) : [],
    pinnedAt: r.pinnedAt || r.pinned_at || null
  }
}
// -----------------------------------------------------------

function isChatNotification(notification: any) {
  const eventType = String(notification?.eventType || '').toLowerCase()
  const domainType = String(notification?.domainType || '').toLowerCase()
  const notificationType = String(notification?.notificationType || '').toLowerCase()
  const deepLinkUrl = String(notification?.deepLinkUrl || '').toLowerCase()

  return (
    eventType.startsWith('chat.') ||
    eventType.includes('chat-room') ||
    eventType.includes('chat_message') ||
    eventType.includes('chat-message') ||
    domainType === 'chat' ||
    domainType === 'chat_room' ||
    domainType === 'chat-room' ||
    notificationType.includes('chat') ||
    deepLinkUrl.includes('/chat')
  )
}

export const useAtlasChatStore = defineStore('atlasChat', () => {
  const sessionStore = useAtlasSessionStore()
  
  const currentUserPublicId = computed(() => sessionStore.userPublicId)

  // 패널 UI 상태
  const isPanelOpen = ref(false)
  const currentView = ref<ChatPanelView>('list')

  // 상태
  const rooms = ref<ChatRoom[]>([])
  const currentRoomPublicId = ref<string | null>(null)
  const messages = ref<ChatMessageDto[]>([])
  const isLoadingMessages = ref(false)

  // 사용자 초대용 (실제로는 auth-service에서 조회해야 함)
  const availableUsers = ref<ChatParticipant[]>([])

  // STOMP 클라이언트 및 연결 상태
  const isConnected = ref(false)
  let stompClient: Client | null = null
  const roomSubscriptions = ref<Map<string, StompSubscription>>(new Map())
  const typingSubscription = ref<StompSubscription | null>(null)

  // 답장 대상 (Reply Target)
  const replyTarget = ref<{
    publicId: string
    messageBody: string
    senderDisplayName: string
  } | null>(null)

  const totalUnreadCount = computed(() =>
    rooms.value.reduce((sum, room) => sum + room.unreadCount, 0),
  )

  const currentRoom = computed(() =>
    rooms.value.find((r) => r.publicId === currentRoomPublicId.value) ?? null,
  )

  function connectStomp() {
    if (stompClient && stompClient.connected) return

    const accessToken = window.sessionStorage.getItem('atlas-access-token') || ''
    const socketUrl = `${WS_ENDPOINT}?token=${accessToken}`

    stompClient = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: {
        Authorization: `Bearer ${accessToken}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    })

    stompClient.onConnect = () => {
      isConnected.value = true
      console.log('[STOMP] Chat connected.')

      // 알림 구독 — 채팅 STOMP 클라이언트에 통합 (별도 연결 불필요)
      if (currentUserPublicId.value) {
        const notificationStore = useAtlasNotificationStore()
        stompClient!.subscribe(`/sub/notify.user.${currentUserPublicId.value}`, (message) => {
          try {
            const notification = JSON.parse(message.body)
            notificationStore.handleIncomingNotification(notification)
            if (isChatNotification(notification)) {
              void fetchRooms()
            }
            console.log('[STOMP] 알림 수신:', notification)
          } catch (e) {
            console.error('[STOMP] 알림 파싱 실패', e)
          }
        })
        console.log(`[STOMP] 알림 구독 완료: /sub/notify.user.${currentUserPublicId.value}`)
      }

      // 채팅 패널이 열려있고 특정 방에 들어와있다면 구독 재개
      syncRoomSubscriptions(rooms.value.map((room) => room.publicId))
      if (currentRoomPublicId.value) {
        subscribeToRoom(currentRoomPublicId.value)
      }
    }

    stompClient.onWebSocketError = (event) => {
      console.error('[STOMP] WebSocket Error:', event)
    }

    stompClient.onWebSocketClose = () => {
      console.warn('[STOMP] WebSocket closed or could not connect.')
      isConnected.value = false
    }

    stompClient.onStompError = (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message'])
      console.error('[STOMP] Details:', frame.body)
    }

    stompClient.activate()
  }

  function disconnectStomp() {
    if (stompClient) {
      stompClient.deactivate()
      stompClient = null
    }
    isConnected.value = false
    for (const subscription of roomSubscriptions.value.values()) {
      subscription.unsubscribe()
    }
    roomSubscriptions.value.clear()
    typingSubscription.value = null
  }

  function handleIncomingRoomMessage(roomPublicId: string, messageBody: string) {
    try {
      const raw = JSON.parse(messageBody)
      const chatMsg: ChatMessageDto = mapToChatMessage(raw)
      const messageRoomPublicId = chatMsg.roomPublicId || roomPublicId

      if (messageRoomPublicId !== roomPublicId) {
        console.warn('[STOMP] 메시지 roomPublicId 불일치:', { topicRoomPublicId: roomPublicId, messageRoomPublicId })
        return
      }

      console.log('[STOMP] 메시지 수신:', chatMsg.messageBody?.slice(0, 30))

      // 현재 방의 메시지면 추가
      if (currentRoomPublicId.value === roomPublicId) {
        // 이미 있는 메시지인지 확인 (중복 방지)
        const exists = messages.value.some(m => m.publicId === chatMsg.publicId)
        if (!exists) {
          messages.value.push(chatMsg)
        }

        // 화면을 보고 있다면 읽음 처리
        if (isPanelOpen.value) {
          markAsRead(roomPublicId, chatMsg.publicId)
        }
      }

      // 룸 목록 업데이트
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.lastMessage = chatMsg
        // 현재 보고 있는 방이면 unreadCount를 올리지 않음
        const isViewingThisRoom = currentRoomPublicId.value === roomPublicId && isPanelOpen.value
        if (!isViewingThisRoom) {
          room.unreadCount += 1
          // 새 안읽음 메시지 발생 → 읽음 추적에서 제거
          recentlyReadRoomIds.value.delete(roomPublicId)
        }

        // 정렬 등 computed 속성이 즉각 반응하도록 배열 레퍼런스 강제 업데이트
        rooms.value = [...rooms.value]
      } else {
        void fetchRooms()
      }
    } catch (e) {
      console.error('[STOMP] Failed to parse chat message', e)
    }
  }

  function subscribeToRoomMessages(roomPublicId: string) {
    if (!stompClient || !stompClient.connected) {
      console.warn('[STOMP] 구독 실패: 연결되지 않음. roomPublicId:', roomPublicId)
      return
    }

    if (roomSubscriptions.value.has(roomPublicId)) return

    const subPath = `/sub/chat.room.${roomPublicId}`
    console.log('[STOMP] 채팅방 구독 시작:', subPath)

    const subscription = stompClient.subscribe(subPath, (message) => {
      handleIncomingRoomMessage(roomPublicId, message.body)
    })

    roomSubscriptions.value.set(roomPublicId, subscription)
  }

  function syncRoomSubscriptions(roomPublicIds: string[]) {
    if (!stompClient || !stompClient.connected) return

    const nextRoomIds = new Set(roomPublicIds)
    for (const [roomPublicId, subscription] of roomSubscriptions.value.entries()) {
      if (!nextRoomIds.has(roomPublicId)) {
        subscription.unsubscribe()
        roomSubscriptions.value.delete(roomPublicId)
      }
    }

    for (const roomPublicId of nextRoomIds) {
      subscribeToRoomMessages(roomPublicId)
    }
  }

  function subscribeToRoom(roomPublicId: string) {
    subscribeToRoomMessages(roomPublicId)

    if (!stompClient || !stompClient.connected) {
      return
    }

    if (typingSubscription.value) {
      typingSubscription.value.unsubscribe()
    }

    typingSubscription.value = stompClient.subscribe(`/sub/chat.typing.${roomPublicId}`, (message) => {
      // 타이핑 상태 처리 (추후 UI 구현 필요)
    })
  }

  async function markAsRead(roomPublicId: string, lastMessagePublicId?: string) {
    try {
      console.log('[Chat] markAsRead 호출:', roomPublicId, lastMessagePublicId)
      await chatService.markAsRead(roomPublicId, { lastReadMessagePublicId: lastMessagePublicId })
      console.log('[Chat] markAsRead 성공')
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.unreadCount = 0
      }
      // fetchRooms 후에도 0 유지하도록 추적
      recentlyReadRoomIds.value.add(roomPublicId)
    } catch (e) {
      console.error('[Chat] markAsRead 실패:', e)
    }
  }

  // 최근 읽음 처리한 방 ID를 추적 — fetchRooms 후에도 unreadCount=0 보장
  const recentlyReadRoomIds = ref<Set<string>>(new Set())

  async function fetchRooms() {
    if (!currentUserPublicId.value) return
    try {
      const result = await chatService.getRooms(currentUserPublicId.value, '', ROOM_LIST_SIZE)
      // 데이터 정규화 매퍼 적용
      const rawFetched = (result as any).content || result || []
      const fetched: ChatRoom[] = Array.isArray(rawFetched) ? rawFetched.map(mapToChatRoom) : []

      // 최근 읽은 방은 서버 응답의 unreadCount를 무시하고 0으로 유지
      for (const room of fetched) {
        if (recentlyReadRoomIds.value.has(room.publicId)) {
          room.unreadCount = 0
        }
      }

      rooms.value = fetched
      syncRoomSubscriptions(fetched.map((room) => room.publicId))
    } catch (e) {
      console.error('Failed to fetch rooms', e)
    }
  }

  /** auth-service에서 전체 조직 사용자 목록을 가져와 초대 목록에 활용 */
async function fetchAvailableUsers() {
  try {
    // 사용자 목록을 auth-service 조회 서비스로 가져옵니다.
    const response = await getUsers({
      page: 0,
      size: 100,
    })

    // 백엔드 공통 응답 래퍼 대응 (Data 기반 추출 방어 코드)
    let rawData: any = response
    if (rawData && rawData.data) {
      rawData = rawData.data
    }
    
    // content 배열 찾기
    let users: any[] = []
    if (Array.isArray(rawData)) {
      users = rawData
    } else if (rawData && Array.isArray(rawData.content)) {
      users = rawData.content
    } else if (rawData && Array.isArray(rawData.data)) {
      users = rawData.data
    } else {
      console.warn('[Chat] 사용자 목록 구조를 파악할 수 없습니다.', response)
    }

    // 디버깅용: F12 콘솔에서 데이터 직접 확인 가능하도록 출력
    console.log('[Chat] 원본 사용자 데이터:', users)

    // 채팅 초대 목록에서 쓰는 형태로 변환합니다.
    availableUsers.value = users.map((user: any) => {
      const lastName = String(user.lastName || user.last_name || '').replace(/null|undefined/gi, '').trim()
      const middleName = String(user.middleName || user.middle_name || '').replace(/null|undefined/gi, '').trim()
      const firstName = String(user.firstName || user.first_name || '').replace(/null|undefined/gi, '').trim()
      let displayName = `${lastName}${firstName}`.trim()
      
      if (!displayName) {
        // 백엔드 엔티티 변경(소셜로그인 등)에 대비한 모든 가능성 영끌 폴백
        const possibleNames = [
          user.name, user.userName, user.user_name, 
          user.nickname, user.realName, user.real_name,
          user.loginId, user.login_id, user.email
        ]
        
        for (const n of possibleNames) {
          const val = String(n || '').replace(/null|undefined/gi, '').trim()
          if (val) {
            displayName = val
            break
          }
        }
        
        if (!displayName) {
          displayName = '이름 없음'
        }
      }
      
      const jobTitle = user.jobTitle || user.job_title || ''
      const organizationName = user.organizationName || user.organization_name || user.orgName || user.org_name || ''
      const organizationEnglishName =
        user.organizationEnglishName ||
        user.organization_english_name ||
        user.organizationNameEn ||
        user.organization_name_en ||
        user.orgEnglishName ||
        user.org_english_name ||
        ''
      const departmentName = user.departmentName || user.department_name || ''
      const departmentCode = user.departmentCode || user.department_code || ''
      const profileAttachmentPublicId = user.profileAttachmentPublicId || user.profile_attachment_public_id || ''
      const profileImageThumbPath = user.profileImageThumbPath || user.profile_image_thumb_path || ''

      return {
        userPublicId: user.userPublicId || user.user_public_id || user.publicId || user.public_id || user.id,
        displayName,
        firstName,
        middleName,
        lastName,
        jobTitle,
        organizationName,
        organizationEnglishName,
        departmentName,
        departmentCode,
        profileAttachmentPublicId,
        profileImageThumbPath,
      }
    })
  } catch (e) {
    console.error('[Chat] 사용자 목록 조회 실패', e)
  }
}


  async function createRoom(name: string, userIds: string[]) {
    try {
      const newRoom = await chatService.createRoom(name, currentUserPublicId.value, userIds)
      await fetchRooms() // 목록 다시 불러오기
      return String(newRoom.publicId || (newRoom as any).public_id || (newRoom as any).id || '')
    } catch (e) {
      console.error('Failed to create room', e)
      return null
    }
  }
  async function openProfileDirectRoom(targetUser: ChatParticipant) {
  try {
    // 현재 로그인한 사용자가 없으면 방을 열 수 없습니다.
    if (!currentUserPublicId.value) {
      return null
    }

    // 백엔드에서 정확한 1:1 방을 찾거나 새로 만듭니다.
    const room = await chatService.findOrCreateDirectRoom(
      targetUser.displayName,
      currentUserPublicId.value,
      targetUser.userPublicId,
    )

    // 방 목록을 최신 상태로 맞춥니다.
    await fetchRooms()

    const publicId = String(room.publicId || (room as any).public_id || (room as any).id || '')

    // 만들어졌거나 찾은 방으로 바로 이동합니다.
    await openRoom(publicId)

    return publicId
  } catch (e) {
    console.error('Failed to open profile direct room', e)
    return null
  }
}


  async function renameRoom(roomPublicId: string, newName: string) {
    if (!newName.trim()) return
    try {
      await chatService.renameRoom(roomPublicId, newName)
      // 낙관적 UI 업데이트
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.roomName = newName
      }
    } catch (e) {
      console.error('Failed to rename room', e)
    }
  }

  async function inviteUser(userPublicId: string) {
    if (!currentRoomPublicId.value) return
    try {
      await chatService.inviteParticipants(currentRoomPublicId.value, currentUserPublicId.value, [userPublicId])
      
      // 즉각적인 UI 반영을 위한 낙관적 업데이트 (Optimistic Update)
      const room = rooms.value.find(r => r.publicId === currentRoomPublicId.value)
      if (room) {
        if (!room.participants) room.participants = []
        if (!room.participants.some(p => p.userPublicId === userPublicId)) {
          const invitedUser = availableUsers.value.find(u => u.userPublicId === userPublicId)
          if (invitedUser) {
            room.participants.push(invitedUser)
          } else {
            room.participants.push({ userPublicId, displayName: '초대된 유저' })
          }
        }

        // 초대된 유저의 이름을 방 이름에 자동 추가
        const invitedDisplayName = availableUsers.value.find(u => u.userPublicId === userPublicId)?.displayName
        if (invitedDisplayName && room.roomName && !room.roomName.includes(invitedDisplayName)) {
          const updatedName = `${room.roomName}, ${invitedDisplayName}`
          room.roomName = updatedName
          // 백엔드에도 반영 (실패해도 UI는 유지)
          chatService.renameRoom(currentRoomPublicId.value, updatedName).catch(() => {})
        }
      }
    } catch (e) {
      console.error('Failed to invite user', e)
    }
  }

  async function leaveRoom() {
    if (!currentRoomPublicId.value || !currentUserPublicId.value) return
    try {
      await chatService.leaveRoom(currentRoomPublicId.value, currentUserPublicId.value)
      // 낙관적 업데이트: 현재 목록에서 방 제거
      rooms.value = rooms.value.filter(r => r.publicId !== currentRoomPublicId.value)
      // 목록으로 돌아가기
      currentView.value = 'list'
      currentRoomPublicId.value = null
      messages.value = []
      replyTarget.value = null
      if (typingSubscription.value) {
        typingSubscription.value.unsubscribe()
        typingSubscription.value = null
      }
      await fetchRooms()
    } catch (e) {
      console.error('Failed to leave room', e)
    }
  }

  async function openRoom(roomPublicId: string) {
    currentRoomPublicId.value = roomPublicId
    currentView.value = 'room'
    isLoadingMessages.value = true
    messages.value = []
    const requestedRoomPublicId = roomPublicId

    console.log('[Chat] openRoom 시작:', roomPublicId)

    // 초대 목록용 전체 사용자 조회 (동시 호출)
    fetchAvailableUsers()

    try {
      // 과거 메시지 조회
      const result = await chatService.getMessages(roomPublicId)
      if (currentRoomPublicId.value !== requestedRoomPublicId) {
        return
      }
      // 백엔드 응답 데이터 정규화
      const raw = ((result as any).content || result || [])
      messages.value = Array.isArray(raw) ? raw.reverse().map(mapToChatMessage) : []

      console.log('[Chat] 메시지 로드 완료:', messages.value.length, '건')

      // 참여자 목록 조회
      try {
        const participantResult = await chatService.searchParticipants(roomPublicId, '', 100)
        if (currentRoomPublicId.value !== requestedRoomPublicId) {
          return
        }
        const participantList = (participantResult as any).content || participantResult || []
        const room = rooms.value.find(r => r.publicId === roomPublicId)
        if (room) {
          room.participants = participantList.map((p: any) => ({
            userPublicId: p.userPublicId || p.user_public_id || p.publicId,
            displayName: p.displayName || p.display_name || p.userName || p.user_name || '참여자',
            jobTitle: p.jobTitle || p.job_title || '',
            role: p.role || '',
          }))
        }
      } catch (participantError) {
        console.warn('[Chat] 참여자 목록 조회 실패, availableUsers 기반 폴백:', participantError)
      }

      // STOMP 구독
      subscribeToRoom(roomPublicId)

      // 읽음 처리 — unreadCount를 먼저 0으로 초기화하고 API 호출
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.unreadCount = 0
      }

      console.log('[Chat] markAsRead 호출 직전, 메시지 수:', messages.value.length)
      if (messages.value.length > 0) {
        const lastMsg = messages.value[messages.value.length - 1]
        console.log('[Chat] 마지막 메시지 publicId:', lastMsg.publicId)
        await markAsRead(roomPublicId, lastMsg.publicId)
      } else {
        await markAsRead(roomPublicId)
      }
      console.log('[Chat] openRoom 완료')
    } catch (e) {
      console.error('[Chat] openRoom 에러:', e)
    } finally {
      if (currentRoomPublicId.value === requestedRoomPublicId) {
        isLoadingMessages.value = false
      }
    }
  }

  async function backToList() {
    // 나가기 전 현재 방의 읽음 처리를 먼저 완료
    const leavingRoomId = currentRoomPublicId.value
    if (leavingRoomId) {
      // 즉시 UI에서 unreadCount 제거 + fetchRooms 후에도 0 유지
      const room = rooms.value.find(r => r.publicId === leavingRoomId)
      if (room) room.unreadCount = 0
      recentlyReadRoomIds.value.add(leavingRoomId)

      // 마지막 메시지로 읽음 처리 API 호출 (실패해도 UI는 이미 0)
      const lastMsg = messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
      try {
        await markAsRead(leavingRoomId, lastMsg?.publicId)
      } catch {
        // 무시 — UI에서는 이미 읽음 처리됨
      }
    }

    currentView.value = 'list'
    currentRoomPublicId.value = null
    messages.value = []
    replyTarget.value = null
    
    if (typingSubscription.value) {
      typingSubscription.value.unsubscribe()
      typingSubscription.value = null
    }
    await fetchRooms()
  }

  function togglePanel() {
    isPanelOpen.value = !isPanelOpen.value
    if (isPanelOpen.value) {
      connectStomp()
      fetchRooms()
    } else {
      currentView.value = 'list'
      currentRoomPublicId.value = null
      messages.value = []
      replyTarget.value = null
      // disconnectStomp() // 닫아도 연결 유지할지 여부 결정 (알림 위해 유지 권장)
    }
  }

  function closePanel() {
    isPanelOpen.value = false
    currentView.value = 'list'
    currentRoomPublicId.value = null
    messages.value = []
    replyTarget.value = null
  }

  function sendMessage(messageBody: string) {
    if (!currentRoomPublicId.value || !messageBody.trim()) return

    if (!stompClient || !stompClient.connected) {
      console.warn('[STOMP] 발송 실패: 현재 소켓이 연결되어 있지 않습니다. (stompClient.connected === false)')
      return
    }

    const payload: any = {
      senderUserPublicId: currentUserPublicId.value,
      roomPublicId: currentRoomPublicId.value,
      messageBody: messageBody.trim(),
      messageType: 'TEXT',
    }

    if (replyTarget.value) {
      payload.parentMessagePublicId = replyTarget.value.publicId
    }

    stompClient.publish({
      destination: `/pub/chat.message.${currentRoomPublicId.value}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    clearReplyTarget()
  }

  function sendFileMessage(attachmentPublicId: string, isImage: boolean = false, messageBody: string = '') {
    if (!currentRoomPublicId.value || !stompClient || !stompClient.connected) return

    const payload: any = {
      senderUserPublicId: currentUserPublicId.value,
      roomPublicId: currentRoomPublicId.value,
      messageBody: messageBody || (isImage ? '사진을 보냈습니다.' : '파일을 보냈습니다.'),
      messageType: isImage ? 'IMAGE' : 'FILE',
      attachmentPublicIds: [attachmentPublicId],
    }

    if (replyTarget.value) {
      payload.parentMessagePublicId = replyTarget.value.publicId
    }

    stompClient.publish({
      destination: `/pub/chat.message.${currentRoomPublicId.value}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })

    clearReplyTarget()
  }

  function sendReferenceMessage(refType: string, refPublicId: string, refCode: string, refTitle: string) {
    if (!currentRoomPublicId.value || !stompClient || !stompClient.connected) return

    stompClient.publish({
      destination: `/pub/chat.message.${currentRoomPublicId.value}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        senderUserPublicId: currentUserPublicId.value,
        roomPublicId: currentRoomPublicId.value,
        messageBody: `${refTitle} 건을 공유합니다.`,
        messageType: 'REFERENCE',
        referenceType: refType,
        referencePublicId: refPublicId,
        referenceCode: refCode,
        referenceTitle: refTitle,
      }),
    })
  }

  async function deleteMessage(messagePublicId: string) {
    try {
      await chatService.deleteMessage(messagePublicId)
      // 성공하면 화면에서 삭제 또는 '[삭제된 메시지입니다.]'로 치환
      const msg = messages.value.find(m => m.publicId === messagePublicId)
      if (msg) {
        msg.isDeleted = true
        msg.messageBody = '[삭제된 메시지입니다.]'
      }
    } catch (e) {
      console.error('Failed to delete message', e)
    }
  }

  async function pinRoom(roomPublicId: string) {
    try {
      const data = await chatService.pinRoom(roomPublicId)
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.pinnedAt = data?.pinnedAt || new Date().toISOString()
      }
    } catch (e) {
      console.error('채팅방 고정 실패', e)
    }
  }

  async function unpinRoom(roomPublicId: string) {
    try {
      await chatService.unpinRoom(roomPublicId)
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.pinnedAt = null
      }
    } catch (e) {
      console.error('채팅방 고정 해제 실패', e)
    }
  }

  function setReplyTarget(message: ChatMessageDto, senderDisplayName: string) {
    let preview = message.messageBody
    if ((!preview || preview.trim() === '') && (message.messageType === 'FILE' || message.messageType === 'IMAGE')) {
      preview = message.messageType === 'IMAGE' ? '[이미지]' : '[파일]'
    }
    
    replyTarget.value = {
      publicId: message.publicId,
      messageBody: preview.length > 100 ? preview.substring(0, 100) + '...' : preview,
      senderDisplayName: senderDisplayName,
    }
  }

  function clearReplyTarget() {
    replyTarget.value = null
  }

  return {
    currentUserPublicId,
    availableUsers,
    isPanelOpen,
    currentView,
    rooms,
    currentRoomPublicId,
    currentRoom,
    messages,
    isLoadingMessages,
    totalUnreadCount,
    isConnected,
    replyTarget,
    setReplyTarget,
    clearReplyTarget,
    togglePanel,
    closePanel,
    createRoom,
    renameRoom,
    inviteUser,
    leaveRoom,
    openRoom,
    backToList,
    sendMessage,
    sendFileMessage,
    deleteMessage,
    sendReferenceMessage,
    fetchRooms,
    fetchAvailableUsers,
    connectStomp,
    disconnectStomp,
    openProfileDirectRoom,
    pinRoom,
    unpinRoom,
  }
})
