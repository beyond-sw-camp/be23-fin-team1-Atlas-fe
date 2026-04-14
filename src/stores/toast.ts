import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 토스트 알림의 시각적 등급.
 * Sovereign Architecture 디자인의 Status Ribbon(4px) 색상에 대응.
 */
export type ToastTone = 'info' | 'nominal' | 'warning' | 'critical'

export interface ToastItem {
  id: number
  title: string
  message: string
  tone: ToastTone
  /** 밀리초 단위 표시 시간. 0이면 수동 닫기 전까지 유지 */
  duration: number
  /** 내부 타이머 ID (자동 dismiss용) */
  timerId?: ReturnType<typeof setTimeout>
}

let nextId = 1

export const useAtlasToastStore = defineStore('atlasToast', () => {
  const toasts = ref<ToastItem[]>([])

  /**
   * 토스트를 화면에 추가한다.
   * @returns 생성된 토스트 ID (외부에서 수동 dismiss 할 때 사용)
   */
  function show(
    title: string,
    message: string,
    tone: ToastTone = 'info',
    duration = 3000,
  ): number {
    const id = nextId++

    const item: ToastItem = { id, title, message, tone, duration }

    // 자동 소멸 타이머 설정
    if (duration > 0) {
      item.timerId = setTimeout(() => dismiss(id), duration)
    }

    toasts.value.push(item)
    return id
  }

  /** 특정 토스트를 즉시 제거 */
  function dismiss(id: number) {
    const idx = toasts.value.findIndex((t) => t.id === id)
    if (idx !== -1) {
      const [removed] = toasts.value.splice(idx, 1)
      if (removed.timerId) clearTimeout(removed.timerId)
    }
  }

  /** 모든 토스트 제거 */
  function clear() {
    toasts.value.forEach((t) => {
      if (t.timerId) clearTimeout(t.timerId)
    })
    toasts.value = []
  }

  return { toasts, show, dismiss, clear }
})
