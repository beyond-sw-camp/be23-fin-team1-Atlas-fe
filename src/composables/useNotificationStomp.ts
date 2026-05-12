import { onMounted, onUnmounted, ref } from 'vue'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useAtlasNotificationStore } from '../stores/notification'
import { useAtlasSidebarBadgesStore } from '../stores/sidebarBadges'
import { NotificationDto } from '../services/notification'

const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT || 'http://localhost:8083/ws-control'

export function useNotificationStomp(userPublicId: string = 'user-001') {
  const notificationStore = useAtlasNotificationStore()
  const sidebarBadgesStore = useAtlasSidebarBadgesStore()
  const isConnected = ref(false)
  let stompClient: Client | null = null

  function connect() {
    if (stompClient) return

    const accessToken = window.sessionStorage.getItem('atlas-access-token') || ''
    
    // 환경 변수에 설정된 엔드포인트를 가져옴
    let formattedEndpoint = WS_ENDPOINT.replace(/^wss:\/\//i, 'https://').replace(/^ws:\/\//i, 'http://')
    
    // 배포 환경(https)에서 http:// 로 접근을 시도하면 브라우저 정책(Mixed Content/SecurityError)으로 차단되므로 강제 변환
    if (window.location.protocol === 'https:' && formattedEndpoint.startsWith('http://')) {
      formattedEndpoint = formattedEndpoint.replace(/^http:\/\//i, 'https://')
    }

    const socketUrl = `${formattedEndpoint}?token=${accessToken}`

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
      
      stompClient?.subscribe(`/sub/notify.user.${userPublicId}`, (message) => {
        try {
          const notification: NotificationDto = JSON.parse(message.body)
          notificationStore.handleIncomingNotification(notification)
          sidebarBadgesStore.fetchBadges()
        } catch (e) {
          console.error('[STOMP] Failed to parse notification message', e)
        }
      })
    }

    stompClient.onStompError = (frame) => {
      const msg = frame.headers['message'] || ''
      // 알림 구독 거부 시(백엔드 미구현 등) 재연결 중단 — 콘솔 스팸 방지
      if (msg.includes('clientInboundChannel') || msg.includes('Failed to send')) {
        console.warn('[STOMP] 알림 구독이 서버에서 거부되었습니다. 백엔드 /sub/notify.user.* 구현 여부를 확인하세요.')
        stompClient?.deactivate()
        return
      }
      console.error('[STOMP] Broker reported error: ' + msg)
      console.error('[STOMP] Additional details: ' + frame.body)
    }

    stompClient.activate()
  }

  function disconnect() {
    if (stompClient) {
      stompClient.deactivate()
      stompClient = null
    }
    isConnected.value = false
  }

  onMounted(() => {
    connect()
  })

  onUnmounted(() => {
    disconnect()
  })

  return {
    isConnected,
    connect,
    disconnect
  }
}
