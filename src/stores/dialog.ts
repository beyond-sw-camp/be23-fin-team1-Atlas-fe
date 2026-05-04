import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

type DialogTone = 'primary' | 'danger'
type DialogKind = 'alert' | 'confirm' | 'prompt'

interface DialogOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
  placeholder?: string
  defaultValue?: string
}

interface DialogState extends Required<Pick<DialogOptions, 'message'>> {
  id: number
  kind: DialogKind
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  tone: DialogTone
  placeholder?: string
  defaultValue: string
  resolve: (value: unknown) => void
}

let nextDialogId = 1

export const useAtlasDialogStore = defineStore('atlasDialog', () => {
  const current = ref<DialogState | null>(null)
  const isOpen = computed(() => current.value !== null)

  function open<T>(kind: DialogKind, options: DialogOptions): Promise<T> {
    return new Promise<T>((resolve) => {
      current.value = {
        id: nextDialogId++,
        kind,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel,
        cancelLabel: options.cancelLabel,
        tone: options.tone ?? 'primary',
        placeholder: options.placeholder,
        defaultValue: options.defaultValue ?? '',
        resolve: resolve as (value: unknown) => void,
      }
    })
  }

  function alert(message: string, title?: string) {
    return open<void>('alert', {
      title,
      message,
      confirmLabel: '확인',
    })
  }

  function confirm(message: string, title?: string, tone: DialogTone = 'danger') {
    return open<boolean>('confirm', {
      title,
      message,
      confirmLabel: '확인',
      cancelLabel: '취소',
      tone,
    })
  }

  function prompt(message: string, title?: string, defaultValue = '') {
    return open<string | null>('prompt', {
      title,
      message,
      confirmLabel: '확인',
      cancelLabel: '취소',
      defaultValue,
    })
  }

  function resolve(value: unknown) {
    const dialog = current.value
    if (!dialog) return
    current.value = null
    dialog.resolve(value)
  }

  return { current, isOpen, alert, confirm, prompt, resolve }
})
