import { onMounted, onUnmounted, ref } from 'vue'
import { Client } from '@stomp/stompjs'
import { useAtlasNotificationStore } from '../stores/notification'
import { NotificationDto } from '../services/notification'

// Fallback to /ws endpoint. Depending on Spring backend, might be /ws-notify or similar.
const WS_ENDPOINT = import.meta.env.VITE_WS_ENDPOINT || 'ws://localhost:8080/ws-chat' 

export function useNotificationStomp(userPublicId: string = 'user-001') {
  const notificationStore = useAtlasNotificationStore()
  const isConnected = ref(false)
  let stompClient: Client | null = null

  function connect() {
    if (stompClient) return

    // Spring Security 등에서 인증이 필요하다면 connectHeaders에 Authorization 토큰을 추가할 수 있습니다.
    stompClient = new Client({
      brokerURL: WS_ENDPOINT,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    })

    stompClient.onConnect = () => {
      isConnected.value = true
      console.log(`[STOMP] Connected. Subscribing to notifications for ${userPublicId}`)
      
      stompClient?.subscribe(`/sub/notify.user.${userPublicId}`, (message) => {
        try {
          const notification: NotificationDto = JSON.parse(message.body)
          notificationStore.handleIncomingNotification(notification)
        } catch (e) {
          console.error('[STOMP] Failed to parse notification message', e)
        }
      })
    }

    stompClient.onStompError = (frame) => {
      console.error('[STOMP] Broker reported error: ' + frame.headers['message'])
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
