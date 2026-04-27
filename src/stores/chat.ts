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

const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT || 'http://localhost:8083/ws-control'

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
  const roomSubscription = ref<StompSubscription | null>(null)
  const typingSubscription = ref<StompSubscription | null>(null)

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
            console.log('[STOMP] 알림 수신:', notification)
          } catch (e) {
            console.error('[STOMP] 알림 파싱 실패', e)
          }
        })
        console.log(`[STOMP] 알림 구독 완료: /sub/notify.user.${currentUserPublicId.value}`)
      }

      // 채팅 패널이 열려있고 특정 방에 들어와있다면 구독 재개
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
    roomSubscription.value = null
    typingSubscription.value = null
  }

  function subscribeToRoom(roomPublicId: string) {
    if (!stompClient || !stompClient.connected) return

    // 기존 구독 해제
    if (roomSubscription.value) {
      roomSubscription.value.unsubscribe()
    }
    if (typingSubscription.value) {
      typingSubscription.value.unsubscribe()
    }

    roomSubscription.value = stompClient.subscribe(`/sub/chat.room.${roomPublicId}`, (message) => {
      try {
        const raw = JSON.parse(message.body)
        // 백엔드 응답 필드 정규화 (deleted → isDeleted)
        const chatMsg: ChatMessageDto = { ...raw, isDeleted: raw.isDeleted ?? raw.deleted ?? false }

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
          if (currentRoomPublicId.value !== roomPublicId || !isPanelOpen.value) {
            room.unreadCount += 1
          }
        }
      } catch (e) {
        console.error('[STOMP] Failed to parse chat message', e)
      }
    })

    typingSubscription.value = stompClient.subscribe(`/sub/chat.typing.${roomPublicId}`, (message) => {
      // 타이핑 상태 처리 (추후 UI 구현 필요)
    })
  }

  async function markAsRead(roomPublicId: string, lastMessagePublicId?: string) {
    try {
      await chatService.markAsRead(roomPublicId, { lastReadMessagePublicId: lastMessagePublicId })
      const room = rooms.value.find(r => r.publicId === roomPublicId)
      if (room) {
        room.unreadCount = 0
      }
    } catch (e) {
      console.error('Failed to mark as read', e)
    }
  }

  async function fetchRooms() {
    if (!currentUserPublicId.value) return
    try {
      const result = await chatService.getRooms(currentUserPublicId.value)
      // 백엔드 응답이 { content: ChatRoom[] } 구조일 경우
      rooms.value = (result as any).content || result || []
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
      const departmentName = user.departmentName || user.department_name || ''
      const departmentCode = user.departmentCode || user.department_code || ''
      const profileAttachmentPublicId = user.profileAttachmentPublicId || user.profile_attachment_public_id || ''
      const profileImageThumbPath = user.profileImageThumbPath || user.profile_image_thumb_path || ''

      return {
        userPublicId: user.userPublicId || user.user_public_id || user.publicId || user.public_id || user.id,
        displayName,
        jobTitle,
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
      return newRoom.publicId
    } catch (e) {
      console.error('Failed to create room', e)
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
          } else { // fallback if user is not in availableUsers
            room.participants.push({ userPublicId, displayName: '초대된 유저' })
          }
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
      backToList()
      // 최신 갱신을 위해 방 목록 비동기 호출
      fetchRooms()
    } catch (e) {
      console.error('Failed to leave room', e)
    }
  }

  async function openRoom(roomPublicId: string) {
    currentRoomPublicId.value = roomPublicId
    currentView.value = 'room'
    isLoadingMessages.value = true
    messages.value = []

    // 초대 목록용 전체 사용자 조회 (동시 호출)
    fetchAvailableUsers()

    try {
      // 과거 메시지 조회
      const result = await chatService.getMessages(roomPublicId)
      // 백엔드 응답의 'deleted' 필드를 프론트 타입 'isDeleted'로 정규화
      const raw = ((result as any).content || result || [])
      messages.value = raw.reverse().map((m: any) => ({
        ...m,
        isDeleted: m.isDeleted ?? m.deleted ?? false,
      }))

      // STOMP 구독
      subscribeToRoom(roomPublicId)

      // 읽음 처리 (마지막 메시지가 있다면)
      if (messages.value.length > 0) {
        const lastMsg = messages.value[messages.value.length - 1]
        markAsRead(roomPublicId, lastMsg.publicId)
      } else {
        markAsRead(roomPublicId)
      }
    } catch (e) {
      console.error('Failed to fetch messages', e)
    } finally {
      isLoadingMessages.value = false
    }
  }

  function backToList() {
    currentView.value = 'list'
    currentRoomPublicId.value = null
    messages.value = []
    
    if (roomSubscription.value) {
      roomSubscription.value.unsubscribe()
      roomSubscription.value = null
    }
    if (typingSubscription.value) {
      typingSubscription.value.unsubscribe()
      typingSubscription.value = null
    }
    fetchRooms() // 목록 업데이트
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
      // disconnectStomp() // 닫아도 연결 유지할지 여부 결정 (알림 위해 유지 권장)
    }
  }

  function closePanel() {
    isPanelOpen.value = false
    currentView.value = 'list'
    currentRoomPublicId.value = null
    messages.value = []
  }

  function sendMessage(messageBody: string) {
    if (!currentRoomPublicId.value || !messageBody.trim()) return

    if (!stompClient || !stompClient.connected) {
      console.warn('[STOMP] 발송 실패: 현재 소켓이 연결되어 있지 않습니다. (stompClient.connected === false)')
      return
    }

    stompClient.publish({
      destination: `/pub/chat.message.${currentRoomPublicId.value}`,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        senderUserPublicId: currentUserPublicId.value,
        roomPublicId: currentRoomPublicId.value,
        messageBody: messageBody.trim(),
        messageType: 'TEXT',
      }),
    })
  }

  function sendReferenceMessage(refType: string, refCode: string, refTitle: string) {
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
        referencePublicId: `ref-${Date.now()}`,
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
    togglePanel,
    closePanel,
    createRoom,
    renameRoom,
    inviteUser,
    leaveRoom,
    openRoom,
    backToList,
    sendMessage,
    deleteMessage,
    sendReferenceMessage,
    fetchRooms,
    fetchAvailableUsers,
    connectStomp,
    disconnectStomp,
  }
})
