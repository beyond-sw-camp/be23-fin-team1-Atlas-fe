import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ActionButton } from '../features/shared/types/page'

export interface HeaderAction extends ActionButton {
  key: string
  onClick?: () => void
}

export const useAtlasHeaderStore = defineStore('atlasHeader', () => {
  const actions = ref<HeaderAction[]>([])

  function setActions(nextActions: HeaderAction[]) {
    actions.value = nextActions
  }

  function clearActions() {
    actions.value = []
  }

  return {
    actions,
    clearActions,
    setActions,
  }
})
