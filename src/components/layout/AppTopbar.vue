<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAtlasSessionStore } from '../../stores/session'
import type { ScreenTheme, PageKey } from '../../types'
import { UI_COPY } from '../../config/appCopy'
import { useAtlasNavigationStore } from '../../stores/navigation'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { useAtlasUiStore } from '../../stores/ui'
import { useAtlasChatStore } from '../../stores/chat'
import { useAtlasNotificationStore } from '../../stores/notification'
import {
  integratedSearchService,
  type IntegratedSearchItem,
  type IntegratedSearchSection,
  type IntegratedSearchSectionType,
} from '../../services/search'

const navigation = useAtlasNavigationStore()
const preferences = useAtlasPreferencesStore()
const ui = useAtlasUiStore()
const chat = useAtlasChatStore()
const notificationStore = useAtlasNotificationStore()
const session = useAtlasSessionStore()
const router = useRouter()


// 검색창 입력값입니다.
const searchKeyword = ref('')

// 검색 결과 원본입니다.
const searchSections = ref<IntegratedSearchSection[]>([])

// 검색 중 여부입니다.
const isSearching = ref(false)

// 검색 에러 문구입니다.
const searchError = ref('')

// 검색 패널 열림 여부입니다.
const isSearchPanelOpen = ref(false)

// 검색 영역 전체를 잡아두는 ref 입니다.
const searchLayerRef = ref<HTMLElement | null>(null)

// 디바운스 타이머를 저장합니다.
let searchDebounceTimer: number | undefined

const visibleSections = computed(() =>
  searchSections.value.filter((section) => Array.isArray(section.items) && section.items.length > 0),
)

// 실제로 보여줄 결과가 하나라도 있는지 확인합니다.
const hasSearchResults = computed(() => visibleSections.value.length > 0)

// 검색 패널을 보여줄지 결정합니다.
const shouldShowSearchPanel = computed(() => {
  if (!isSearchPanelOpen.value) {
    return false
  }

  // 검색어가 없으면 패널을 굳이 띄우지 않습니다.
  if (!searchKeyword.value.trim()) {
    return false
  }

  return true
})

function handleLanguageChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  preferences.setLanguage(target.value === 'en' ? 'en' : 'ko')
}

function toggleTheme() {
  preferences.setTheme(preferences.theme === 'dark' ? ('light' as ScreenTheme) : ('dark' as ScreenTheme))
}

function goHome() {
  const home = navigation.availableNavItems[0]
  if (home) {
    navigation.navigateToPage(home.key)
  }
}

function handleNotificationClick() {
  navigation.openNotifications()
}

function handleSearchFocus() {
  // 검색창에 들어오면 패널을 열 준비를 합니다.
  isSearchPanelOpen.value = true
}

function closeSearchPanel() {
  // 검색 패널만 닫고 입력값은 남겨둡니다.
  isSearchPanelOpen.value = false
}

function resetSearchState() {
  // 결과와 에러를 같이 초기화합니다.
  searchSections.value = []
  searchError.value = ''
  isSearching.value = false
}

// 검색어가 바뀌면 잠깐 기다렸다가 API를 호출합니다.
watch(searchKeyword, (nextKeyword) => {
  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer)
  }

  const trimmedKeyword = nextKeyword.trim()

  // 공백이면 결과를 바로 비웁니다.
  if (!trimmedKeyword) {
    resetSearchState()
    return
  }

  // 한 글자 검색은 너무 자주 호출되니 막습니다.
  if (trimmedKeyword.length < 2) {
    searchSections.value = []
    searchError.value = ''
    isSearching.value = false
    return
  }

  searchDebounceTimer = window.setTimeout(async () => {
    try {
      isSearching.value = true
      searchError.value = ''

      const response = await integratedSearchService.search(trimmedKeyword, 5)

      searchSections.value = response.sections ?? []

      isSearchPanelOpen.value = true
    } catch (error) {
      console.error('Failed to search integrated results', error)
      searchSections.value = []
      searchError.value = '통합검색 결과를 불러오지 못했습니다.'
      isSearchPanelOpen.value = true
    } finally {
      isSearching.value = false
    }
  }, 250)
})

// 바깥을 클릭하면 검색 패널을 닫습니다.
function handleSearchOutside(event: MouseEvent) {
  const target = event.target as Node | null

  if (!searchLayerRef.value || !target) {
    return
  }

  if (!searchLayerRef.value.contains(target)) {
    closeSearchPanel()
  }
}

document.addEventListener('mousedown', handleSearchOutside)

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleSearchOutside)

  if (searchDebounceTimer) {
    window.clearTimeout(searchDebounceTimer)
  }
})

// 엔터를 누르면 맨 위 첫 결과를 바로 엽니다.
function handleSearchEnter() {
  const firstItem = visibleSections.value[0]?.items?.[0]

  if (!firstItem) {
    return
  }

  handleSearchItemClick(firstItem)
}

// 각 결과 타입별로 대표 화면을 매핑합니다.
function resolveTargetPage(type: IntegratedSearchSectionType): PageKey | null {
  switch (type) {
    case 'SUPPLIER':
      return 'supplierControl'

    case 'ITEM':
      return 'items'

    case 'PURCHASE_ORDER':
      return 'ordersDesk'

    case 'SHIPMENT':
      return 'shipmentOps'

    case 'RETURN':
      return 'returns'

    case 'PRODUCTION_LINE':
    case 'SETTLEMENT':
      return 'controlTower'

    default:
      return null
  }
}

// 유저는 아직 바로 1:1 채팅 생성 플로우가 없어서 우선 채팅 패널만 엽니다.
function openUserResult(item: IntegratedSearchItem) {
  if (!item.publicId) return

  router.push({
    name: 'userProfile',
    params: { userPublicId: item.publicId },
  })

  closeSearchPanel()
}
function openOrganizationResult(item: IntegratedSearchItem) {
  // 플랫폼 관리자는 조직관리 상세로 이동합니다.
  if (session.userRole === 'ADMIN') {
    if (!item.id) {
      navigation.navigateToPage('organizationManagement')
      closeSearchPanel()
      return
    }

    router.push({
      name: 'organizationManagement',
      query: {
        ...preferences.buildQuery(),
        organizationId: String(item.id),
      },
    })

    closeSearchPanel()
    return
  }

  // 다른 조직 담당자는 읽기 전용 조직 프로필로 이동합니다.
  if (!item.publicId) {
    return
  }

  router.push({
    name: 'organizationProfile',
    params: {
      organizationPublicId: item.publicId,
    },
    query: {
      ...preferences.buildQuery(),
      organizationId: item.id != null ? String(item.id) : '',
      organizationName: item.title,
      organizationEnglishName: item.organizationEnglishName ?? '',
      contactEmail: item.contactEmail ?? '',
      contactPhone: item.contactPhone ?? '',
      contactName: item.contactName ?? '',
    },
  })

  closeSearchPanel()
}


function handleSearchItemClick(item: IntegratedSearchItem) {
  if (item.type === 'USER') {
    openUserResult(item)
    return
  }

  if (item.type === 'ORGANIZATION') {
    openOrganizationResult(item)
    return
  }

  const targetPage = resolveTargetPage(item.type)

  if (targetPage) {
    navigation.navigateToPage(targetPage)
  }

  closeSearchPanel()
}

// 결과 key 를 안정적으로 만들기 위한 헬퍼입니다.
function buildItemKey(item: IntegratedSearchItem, index: number) {
  return `${item.type}-${item.publicId ?? item.id ?? index}`
}
function resolveSearchItemThumbnail(item: IntegratedSearchItem) {
  // 검색 결과마다 이미지 필드명이 다를 수 있어서 순서대로 확인합니다.
  return (
    item.thumbnailUrl ||
    item.profileImageThumbPath ||
    item.organizationImageThumbPath ||
    ''
  )
}


</script>

<template>
  <header class="app-topbar">
    <div class="app-branding">
      <button class="app-icon-button app-mobile-menu-button" type="button" @click="ui.toggleMobileSidebar">
        <span class="material-symbols-outlined">{{ ui.mobileSidebarOpen ? 'close' : 'menu' }}</span>
      </button>
      <button class="app-brand" type="button" @click="goHome">ATLAS</button>
      <div v-if="session.isAuthenticated" class="app-session-controls app-session-controls--mobile">
        <div class="app-session-controls__meta">
          <strong class="app-session-controls__time">
            {{ session.sessionRemainingLabel }}
          </strong>
        </div>

        <button
          class="app-session-controls__action"
          type="button"
          :disabled="session.isRefreshingSession"
          @click="session.extendSession()"
        >
          {{
            session.isRefreshingSession
              ? (preferences.language === 'ko' ? '연장 중...' : 'Extending...')
              : (preferences.language === 'ko' ? '로그인 연장' : 'Extend Session')
          }}
        </button>
      </div>
      <span class="app-topbar__badge app-topbar__badge--neutral">CONTROL TERMINAL</span>
      <span v-if="notificationStore.unreadCount > 0" class="app-topbar__badge app-topbar__badge--warn">
        {{ notificationStore.unreadCount }} ALERTS
      </span>
    </div>

    <div class="app-topbar__actions">
      <!-- 검색창은 제일 앞에 둡니다. -->
      <div ref="searchLayerRef" class="app-search">
        <span class="material-symbols-outlined">search</span>
        <input
          v-model="searchKeyword"
          id="app-integrated-search"
          name="app-integrated-search"
          type="text"
          :placeholder="UI_COPY.searchPlaceholder[preferences.language]"
          @focus="handleSearchFocus"
          @keydown.enter.prevent="handleSearchEnter"
          @keydown.esc="closeSearchPanel"
        />

        <div v-if="shouldShowSearchPanel" class="app-search__panel">
          <!-- 두 글자보다 짧으면 안내만 보여줍니다. -->
          <div v-if="searchKeyword.trim().length < 2" class="app-search__state">
            두 글자 이상 입력하세요.
          </div>

          <!-- 검색 중이면 로딩 문구를 보여줍니다. -->
          <div v-else-if="isSearching" class="app-search__state">
            검색 중...
          </div>

          <!-- 검색 에러가 있으면 에러 문구를 보여줍니다. -->
          <div v-else-if="searchError" class="app-search__state app-search__state--error">
            {{ searchError }}
          </div>

          <!-- 결과가 없으면 결과 없음 문구를 보여줍니다. -->
          <div v-else-if="!hasSearchResults" class="app-search__state">
            검색 결과가 없습니다.
          </div>

          <!-- 결과가 있으면 목록을 보여줍니다. -->
          <template v-else>
            <section
              v-for="section in visibleSections"
              :key="section.type"
              class="app-search__section"
            >
              <header class="app-search__section-head">
                <strong>{{ section.label }}</strong>
                <span>{{ section.totalCount }}</span>
              </header>

              <button
                  v-for="(item, index) in section.items"
                  :key="buildItemKey(item, index)"
                  class="app-search__item"
                  type="button"
                  @click="handleSearchItemClick(item)"
                >
                  <span class="app-search__item-thumb" aria-hidden="true">
                    <img
                        v-if="resolveSearchItemThumbnail(item)"
                        :src="resolveSearchItemThumbnail(item)"
                        :alt="item.title"
                        class="app-search__item-thumb-image"
                      />

                    <span v-else class="material-symbols-outlined app-search__item-thumb-icon">
                      {{ item.type === 'USER' ? 'person' : 'business' }}
                    </span>
                  </span>

                  <span class="app-search__item-content">
                    <span class="app-search__item-title-row">
                      <strong class="app-search__item-title">{{ item.title }}</strong>
                      <span v-if="item.status" class="app-search__chip">{{ item.status }}</span>
                    </span>
                    <span v-if="item.subtitle" class="app-search__item-subtitle">
                      {{ item.subtitle }}
                    </span>
                  </span>
                </button>
            </section>
          </template>
        </div>
      </div>

      <!-- 언어 선택은 검색창 오른쪽에 둡니다. -->
      <label class="app-language-select app-language-select--desktop">
        <select
          id="app-language-desktop"
          name="app-language-desktop"
          :value="preferences.language"
          @change="handleLanguageChange"
        >
          <option value="ko">KO</option>
          <option value="en">EN</option>
        </select>
      </label>

         <!-- 남은 시간과 로그인 연장은 바깥 박스 하나로만 묶습니다. -->
      <div v-if="session.isAuthenticated" class="app-session-controls app-session-controls--desktop">
        <!-- 왼쪽에는 안내 문구와 시간을 보여줍니다. -->
        <div class="app-session-controls__meta">
          <strong class="app-session-controls__time">
            {{ session.sessionRemainingLabel }}
          </strong>
        </div>
        
        <!-- 로그인 연장은 박스 없는 텍스트 버튼처럼 둡니다. -->
        <button
          class="app-session-controls__action"
          type="button"
          :disabled="session.isRefreshingSession"
          @click="session.extendSession()"
        >
          {{
            session.isRefreshingSession
              ? (preferences.language === 'ko' ? '연장 중...' : 'Extending...')
              : (preferences.language === 'ko' ? '로그인 연장' : 'Extend Session')
          }}
        </button>
      </div>


      <!-- 아래 아이콘 버튼들은 그대로 둡니다. -->
      <button class="app-icon-button" type="button" @click="toggleTheme">
        <span class="material-symbols-outlined">contrast</span>
      </button>

      <button
        :class="['app-icon-button', { 'app-icon-button--badge': chat.totalUnreadCount > 0 }]"
        type="button"
        @click="chat.togglePanel()"
      >
        <span class="material-symbols-outlined">chat_bubble</span>
      </button>

      <button
        :class="['app-icon-button', { 'app-icon-button--badge': notificationStore.unreadCount > 0 }]"
        type="button"
        @click="handleNotificationClick"
      >
        <span class="material-symbols-outlined">notifications</span>
      </button>

      <button class="app-icon-button" type="button" @click="navigation.openSettings">
        <span class="material-symbols-outlined">settings</span>
      </button>

    </div>
  </header>
</template>
