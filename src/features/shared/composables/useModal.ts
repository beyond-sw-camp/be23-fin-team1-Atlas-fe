import { ref } from 'vue'

export function useModal<T = undefined>(initialValue = false, initialPayload?: T) {
  const isOpen = ref(initialValue)
  const payload = ref<T | undefined>(initialPayload)

  function open(nextPayload?: T) {
    if (nextPayload !== undefined) {
      payload.value = nextPayload
    }
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  function setPayload(nextPayload?: T) {
    payload.value = nextPayload
  }

  return {
    isOpen,
    payload,
    open,
    close,
    setPayload,
    toggle,
  }
}
