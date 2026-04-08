import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useAtlasUiStore = defineStore('atlasUi', () => {
  const mobileSidebarOpen = ref(false)

  function toggleMobileSidebar() {
    mobileSidebarOpen.value = !mobileSidebarOpen.value
  }

  function closeMobileSidebar() {
    mobileSidebarOpen.value = false
  }

  function syncViewportLayout() {
    if (window.innerWidth > 900) {
      closeMobileSidebar()
    }
  }

  return {
    closeMobileSidebar,
    mobileSidebarOpen,
    syncViewportLayout,
    toggleMobileSidebar,
  }
})
