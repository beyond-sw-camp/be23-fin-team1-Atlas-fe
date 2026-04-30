<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { getReturnRequests, type ReturnRequestResponseDto } from '../../../services/return'
import { getOrganizations } from '../../../services/organization'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import ReturnCreateModal from '../components/ReturnCreateModal.vue'
import ReturnTimelineModal from '../components/ReturnTimelineModal.vue'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const activeTab = ref<'ALL' | 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED'>('ALL')
const returns = ref<ReturnRequestResponseDto[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const isCreateModalOpen = ref(false)
const isTimelineModalOpen = ref(false)
const selectedReturn = ref<ReturnRequestResponseDto | null>(null)
const orgNameMap = ref<Record<string, string>>({})

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 반품',
    title: '반품',
    desc: '도착 완료된 출하를 기준으로 반품 요청과 반품 출하 흐름을 관리합니다.',
    newReturn: '반품 생성',
    refresh: '새로고침',
    empty: '반품 내역이 없습니다.',
    loading: '반품 목록을 불러오는 중입니다.',
    loadFail: '반품 목록을 불러오지 못했습니다.',
    btnDetail: '이력/상태',
    columns: ['반품 번호', '요청 조직', '대상 조직', '반품 사유', '처리 방식', '상태', '요청일시', '관리'],
    tabs: {
      ALL: '전체',
      REQUESTED: '요청/승인',
      IN_TRANSIT: '회수 중',
      COMPLETED: '완료/반려',
    },
    metrics: {
      total: '총 반품',
      pending: '요청/승인',
      moving: '회수 중',
      done: '완료',
      totalMeta: '전체 건수',
      pendingMeta: '처리 대기',
      movingMeta: '이동 진행',
      doneMeta: '처리 완료',
    },
  },
  en: {
    eyebrow: 'SUPPLY CHAIN OPS / RETURNS',
    title: 'Returns',
    desc: 'Manage return requests and return-shipment flow from arrived shipments.',
    newReturn: 'New Return',
    refresh: 'Refresh',
    empty: 'No returns found.',
    loading: 'Loading returns...',
    loadFail: 'Failed to load returns.',
    btnDetail: 'History/Status',
    columns: ['RETURN NO', 'REQUEST ORG', 'TARGET ORG', 'REASON', 'RESOLUTION', 'STATUS', 'REQ DATE', 'ACTION'],
    tabs: {
      ALL: 'ALL',
      REQUESTED: 'REQUESTED/APPROVED',
      IN_TRANSIT: 'IN TRANSIT',
      COMPLETED: 'DONE/REJECTED',
    },
    metrics: {
      total: 'TOTAL RETURNS',
      pending: 'PENDING',
      moving: 'IN TRANSIT',
      done: 'COMPLETED',
      totalMeta: 'ALL RECORDS',
      pendingMeta: 'AWAITING',
      movingMeta: 'SHIPPING',
      doneMeta: 'DONE',
    },
  },
} as const

const content = computed(() => CONTENT[preferences.language])

const filteredReturns = computed(() => {
  if (activeTab.value === 'ALL') return returns.value

  if (activeTab.value === 'REQUESTED') {
    return returns.value.filter(
      (item) => item.returnStatus === 'REQUESTED' || item.returnStatus === 'APPROVED',
    )
  }

  if (activeTab.value === 'IN_TRANSIT') {
    return returns.value.filter(
      (item) => item.returnStatus === 'IN_TRANSIT' || item.returnStatus === 'RECEIVED',
    )
  }

  return returns.value.filter(
    (item) => item.returnStatus === 'COMPLETED' || item.returnStatus === 'REJECTED',
  )
})

const tabs = computed(() => [
  { key: 'ALL' as const, label: content.value.tabs.ALL },
  { key: 'REQUESTED' as const, label: content.value.tabs.REQUESTED },
  { key: 'IN_TRANSIT' as const, label: content.value.tabs.IN_TRANSIT },
  { key: 'COMPLETED' as const, label: content.value.tabs.COMPLETED },
])

const metrics = computed(() => {
  const all = returns.value
  const requested = all.filter(
    (item) => item.returnStatus === 'REQUESTED' || item.returnStatus === 'APPROVED',
  ).length
  const inTransit = all.filter(
    (item) => item.returnStatus === 'IN_TRANSIT' || item.returnStatus === 'RECEIVED',
  ).length
  const completed = all.filter((item) => item.returnStatus === 'COMPLETED').length

  return [
    {
      label: content.value.metrics.total,
      value: String(all.length),
      meta: content.value.metrics.totalMeta,
      tone: 'nominal',
    },
    {
      label: content.value.metrics.pending,
      value: String(requested),
      meta: content.value.metrics.pendingMeta,
      tone: 'warning',
    },
    {
      label: content.value.metrics.moving,
      value: String(inTransit),
      meta: content.value.metrics.movingMeta,
      tone: 'info',
    },
    {
      label: content.value.metrics.done,
      value: String(completed),
      meta: content.value.metrics.doneMeta,
      tone: 'nominal',
    },
  ]
})

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function shortId(value?: string | null) {
  if (!value) return '-'
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
}

function returnTypeText(type: string) {
  if (preferences.language !== 'ko') return type

  const labels: Record<string, string> = {
    DAMAGE: '파손',
    DEFECTIVE: '불량',
    SIMPLE_RETURN: '단순 반품',
  }

  return labels[type] ?? type
}

function resolutionTypeText(type?: string) {
  if (!type) return '-'
  if (preferences.language !== 'ko') return type

  const labels: Record<string, string> = {
    RETURN: '반납',
    EXCHANGE: '교체',
    DISPOSAL: '폐기',
  }

  return labels[type] ?? type
}

function returnStatusText(status: string) {
  if (preferences.language !== 'ko') return status

  const labels: Record<string, string> = {
    REQUESTED: '요청됨',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
    IN_TRANSIT: '회수 중',
    RECEIVED: '입고 완료',
    RESHIPPED: '교체품 발송',
    DISPOSED: '폐기 완료',
    COMPLETED: '처리 완료',
  }

  return labels[status] ?? status
}

async function fetchReturns() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getReturnRequests({ page: 0, size: 50 })
    returns.value = response.content

    if (selectedReturn.value) {
      const updated = returns.value.find((item) => item.publicId === selectedReturn.value?.publicId)
      if (updated) {
        selectedReturn.value = updated
      }
    }
  } catch (error) {
    console.error('Failed to load returns:', error)
    returns.value = []
    errorMessage.value = content.value.loadFail
  } finally {
    isLoading.value = false
  }
}

async function fetchOrgNameMap() {
  try {
    const res = await getOrganizations({ page: 0, size: 500 })
    const map: Record<string, string> = {}
    res.content.forEach(org => {
      map[org.organizationPublicId] = org.organizationName
    })
    orgNameMap.value = map
  } catch (e) {
    console.error('Failed to load org name map:', e)
  }
}

function getOrgName(name?: string, publicId?: string) {
  if (name) return name
  if (!publicId) return '-'
  return orgNameMap.value[publicId] || shortId(publicId)
}

function openTimeline(returnRequest: ReturnRequestResponseDto) {
  selectedReturn.value = returnRequest
  isTimelineModalOpen.value = true
}

function handleCreateSuccess() {
  isCreateModalOpen.value = false
  fetchReturns()
}

watchEffect(() => {
  header.setActions([
    { key: 'returns-refresh', label: content.value.refresh, tone: 'secondary' },
    { key: 'returns-create', label: content.value.newReturn, tone: 'primary' },
  ])
})

onMounted(() => {
  fetchOrgNameMap()
  fetchReturns()
})
onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="fetchReturns">
          {{ content.refresh }}
        </button>
        <button class="page-button page-button--primary" type="button" @click="isCreateModalOpen = true">
          {{ content.newReturn }}
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <div class="terminal-page__tabs">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              :class="['terminal-page__tab', { 'is-active': activeTab === tab.key }]"
              type="button"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
            </button>
          </div>
        </section>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">RETURNS</div>
              <h3>{{ content.title }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredReturns.length }}</span>
          </div>

          <div v-if="isLoading" class="page-table__empty">{{ content.loading }}</div>
          <div v-else-if="errorMessage" class="page-table__empty">{{ errorMessage }}</div>
          <div v-else-if="filteredReturns.length === 0" class="page-table__empty">{{ content.empty }}</div>

          <div v-else class="page-table terminal-page__table is-eight-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div v-for="item in filteredReturns" :key="item.publicId" class="page-table__row">
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">
                {{ item.returnNumber }}
              </span>
              <span>{{ getOrgName(item.requestOrganizationName, item.requestOrganizationPublicId) }}</span>
              <span>{{ getOrgName(item.targetOrganizationName, item.targetOrganizationPublicId) }}</span>
              <span>{{ returnTypeText(item.returnType) }}</span>
              <span>
                <span :class="['resolution-chip', `resolution-chip--${(item.resolutionType || 'RETURN').toLowerCase()}`]">{{ resolutionTypeText(item.resolutionType) }}</span>
              </span>
              <span>{{ returnStatusText(item.returnStatus) }}</span>
              <span>{{ formatDate(item.requestedAt) }}</span>
              <span>
                <button
                  class="page-button page-button--secondary"
                  type="button"
                  @click="openTimeline(item)"
                >
                  {{ content.btnDetail }}
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <ReturnCreateModal
      :is-open="isCreateModalOpen"
      :language="preferences.language"
      @close="isCreateModalOpen = false"
      @success="handleCreateSuccess"
    />

    <ReturnTimelineModal
      :is-open="isTimelineModalOpen"
      :language="preferences.language"
      :target-return="selectedReturn"
      :org-name-map="orgNameMap"
      @close="isTimelineModalOpen = false"
      @status-changed="fetchReturns"
    />
  </section>
</template>
