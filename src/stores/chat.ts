import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { Client, StompSubscription } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import type {
  ChatRoom,
  ChatMessageDto,
  ChatPanelView,
  ChatParticipant
} from '../types/chat'
import { chatService } from '../services/chat'
import { useAtlasSessionStore } from './session'

const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT || 'http://localhost:8080/ws-chat'

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

    stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_ENDPOINT),
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
      
      // 채팅 패널이 열려있고 특정 방에 들어와있다면 구독 재개
      if (currentRoomPublicId.value) {
        subscribeToRoom(currentRoomPublicId.value)
      }
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
        const chatMsg: ChatMessageDto = JSON.parse(message.body)
        
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

  async function inviteUser(userPublicId: string) {
    if (!currentRoomPublicId.value) return
    try {
      await chatService.inviteParticipants(currentRoomPublicId.value, currentUserPublicId.value, [userPublicId])
      // 참여자 목록 갱신을 위해 방 정보 리로드 가능
    } catch (e) {
      console.error('Failed to invite user', e)
    }
  }

  async function openRoom(roomPublicId: string) {
    currentRoomPublicId.value = roomPublicId
    currentView.value = 'room'
    isLoadingMessages.value = true
    messages.value = []

    try {
      // 과거 메시지 조회
      const result = await chatService.getMessages(roomPublicId)
      messages.value = ((result as any).content || result || []).reverse() // 과거순 정렬 필요 시

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
    if (!currentRoomPublicId.value || !messageBody.trim() || !stompClient || !stompClient.connected) return

    stompClient.publish({
      destination: `/pub/chat.message.${currentRoomPublicId.value}`,
      body: JSON.stringify({
        messageBody: messageBody.trim(),
        messageType: 'TEXT',
      }),
    })
  }

  function sendReferenceMessage(refType: string, refCode: string, refTitle: string) {
    if (!currentRoomPublicId.value || !stompClient || !stompClient.connected) return

    stompClient.publish({
      destination: `/pub/chat.message.${currentRoomPublicId.value}`,
      body: JSON.stringify({
        messageBody: `${refTitle} 건을 공유합니다.`,
        messageType: 'REFERENCE',
        referenceType: refType,
        referencePublicId: `ref-${Date.now()}`, // 백엔드에서 생성될 수도 있으나 전송 규격에 맞게
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
    inviteUser,
    openRoom,
    backToList,
    sendMessage,
    deleteMessage,
    sendReferenceMessage,
    fetchRooms,
    connectStomp,
    disconnectStomp,
  }
})
