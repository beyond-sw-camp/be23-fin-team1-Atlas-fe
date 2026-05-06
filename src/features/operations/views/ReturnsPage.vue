<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getReturnRequests, type ReturnRequestResponseDto } from '../../../services/return'
import { getShipments } from '../../../services/shipment'
import { getOrganizations } from '../../../services/organization'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import ReturnCreateModal from '../components/ReturnCreateModal.vue'
import ReturnTimelineModal from '../components/ReturnTimelineModal.vue'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
const route = useRoute()
const router = useRouter()

const activeTab = ref<'ALL' | 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED'>('ALL')
const returns = ref<ReturnRequestResponseDto[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const isCreateModalOpen = ref(false)
const isCreatePage = computed(() => route.name === 'returnCreate')
const isTimelineModalOpen = ref(false)
const selectedReturn = ref<ReturnRequestResponseDto | null>(null)
const orgNameMap = ref<Record<string, string>>({})
const totalReturnCount = ref(0)
const totalShipmentCount = ref(0)

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
      returnRate: '전체 반품율',
      recovery: '회수 진행률',
      completed: '처리 완료율',
      pendingMeta: '처리 대기',
      returnRateMeta: '출하 횟수 누적 필요',
      returnRateBaseMeta: (count: number) => `출하 ${count.toLocaleString('ko-KR')}건 기준`,
      recoveryMeta: '회수/입고 진행',
      completedMeta: '완료 건수 기준',
    },
    insight: {
      reason: '반품 사유',
      resolution: '처리 방식',
      quantity: '반품 수량',
      watch: '주의 필요',
      reasonMeta: '최다 발생 사유',
      resolutionMeta: '주요 처리 방식',
      quantityMeta: '품목 수량 합계',
      watchMeta: '요청/승인 대기',
      noData: '데이터 없음',
    },
  },
  en: {
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
      returnRate: '전체 반품율',
      recovery: '회수 진행률',
      completed: '처리 완료율',
      pendingMeta: '처리 대기',
      returnRateMeta: '출하 횟수 누적 필요',
      returnRateBaseMeta: (count: number) => `출하 ${count.toLocaleString('ko-KR')}건 기준`,
      recoveryMeta: '회수/입고 진행',
      completedMeta: '완료 건수 기준',
    },
    insight: {
      reason: '반품 사유',
      resolution: '처리 방식',
      quantity: '반품 수량',
      watch: '주의 필요',
      reasonMeta: '최다 발생 사유',
      resolutionMeta: '주요 처리 방식',
      quantityMeta: '품목 수량 합계',
      watchMeta: '요청/승인 대기',
      noData: '데이터 없음',
    },
  },
} as const

const content = computed(() => CONTENT.ko)

const filteredReturns = computed(() => {
  if (activeTab.value === 'ALL') return returns.value

  if (activeTab.value === 'REQUESTED') {
    return returns.value.filter(
      (item) => item.returnStatus === 'REQUESTED' || item.returnStatus === 'APPROVED',
    )
  }

  if (activeTab.value === 'IN_TRANSIT') {
    return returns.value.filter(
      (item) => item.returnStatus === 'IN_TRANSIT' || item.returnStatus === 'RECEIVED' || item.returnStatus === 'INSPECTING',
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
  const totalReturns = totalReturnCount.value || all.length
  const totalShipments = totalShipmentCount.value
  const inTransit = all.filter(
    (item) => item.returnStatus === 'IN_TRANSIT' || item.returnStatus === 'RECEIVED',
  ).length
  const completed = all.filter((item) => item.returnStatus === 'COMPLETED').length
  const returnRate = totalShipments > 0 ? Math.round((totalReturns / totalShipments) * 100) : null
  const recoveryRate = totalReturns > 0 ? Math.round((inTransit / totalReturns) * 100) : 0
  const completedRate = totalReturns > 0 ? Math.round((completed / totalReturns) * 100) : 0

  return [
    {
      label: content.value.metrics.total,
      value: String(totalReturns),
      meta: content.value.metrics.pendingMeta,
      tone: 'nominal',
    },
    {
      label: content.value.metrics.returnRate,
      value: returnRate === null ? '-' : `${returnRate}%`,
      meta: returnRate === null
        ? content.value.metrics.returnRateMeta
        : content.value.metrics.returnRateBaseMeta(totalShipments),
      tone: 'warning',
    },
    {
      label: content.value.metrics.recovery,
      value: `${recoveryRate}%`,
      meta: content.value.metrics.recoveryMeta,
      tone: 'info',
    },
    {
      label: content.value.metrics.completed,
      value: `${completedRate}%`,
      meta: `${completed}건 완료`,
      tone: 'nominal',
    },
  ]
})

const insights = computed(() => {
  const topReturnType = getTopValue(returns.value.map((item) => item.returnType))
  const topResolutionType = getTopValue(returns.value.map((item) => item.resolutionType))
  const returnedItems = returns.value.reduce(
    (sum, item) => sum + item.items.reduce((itemSum, returnItem) => itemSum + returnItem.returnQty, 0),
    0,
  )
  const pending = returns.value.filter(
    (item) => item.returnStatus === 'REQUESTED' || item.returnStatus === 'APPROVED',
  ).length

  return [
    {
      label: content.value.insight.reason,
      value: topReturnType ? returnTypeText(topReturnType.value) : content.value.insight.noData,
      meta: topReturnType ? `${topReturnType.count}건` : content.value.insight.reasonMeta,
    },
    {
      label: content.value.insight.resolution,
      value: topResolutionType ? resolutionTypeText(topResolutionType.value) : content.value.insight.noData,
      meta: topResolutionType ? `${topResolutionType.count}건` : content.value.insight.resolutionMeta,
    },
    {
      label: content.value.insight.quantity,
      value: String(returnedItems),
      meta: content.value.insight.quantityMeta,
    },
    {
      label: content.value.insight.watch,
      value: String(pending),
      meta: content.value.insight.watchMeta,
    },
  ]
})

function getTopValue(values: string[]) {
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    if (!value) return acc
    acc[value] = (acc[value] ?? 0) + 1
    return acc
  }, {})
  const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] ?? []
  return value ? { value, count } : null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function shortId(value?: string | null) {
  if (!value) return '-'
  return value.length > 12 ? `${value.slice(0, 12)}...` : value
}

function returnTypeText(type: string) {
  const labels: Record<string, string> = {
    DAMAGE: '파손',
    DEFECTIVE: '불량',
    SIMPLE_RETURN: '단순 반품',
  }

  return labels[type] ?? type
}

function resolutionTypeText(type?: string) {
  if (!type) return '-'
  const labels: Record<string, string> = {
    RETURN: '반납',
    EXCHANGE: '교체',
    DISPOSAL: '폐기',
  }

  return labels[type] ?? type
}

function returnStatusText(status: string) {
  const labels: Record<string, string> = {
    REQUESTED: '요청됨',
    APPROVED: '승인됨',
    REJECTED: '반려됨',
    IN_TRANSIT: '회수 중',
    RECEIVED: '입고 완료',
    INSPECTING: '검수 중',
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
    const [response, shipmentResponse] = await Promise.all([
      getReturnRequests({ page: 0, size: 50 }),
      getShipments({ page: 0, size: 1 }).catch((error) => {
        console.error('Failed to load shipment base count:', error)
        return null
      }),
    ])
    returns.value = response.content
    totalReturnCount.value = response.totalElements ?? response.content.length
    totalShipmentCount.value = shipmentResponse?.totalElements ?? 0

    if (selectedReturn.value) {
      const updated = returns.value.find((item) => item.publicId === selectedReturn.value?.publicId)
      if (updated) {
        selectedReturn.value = updated
      }
    }
  } catch (error) {
    console.error('Failed to load returns:', error)
    returns.value = []
    totalReturnCount.value = 0
    totalShipmentCount.value = 0
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

function openReturnDetailPage(returnRequest: ReturnRequestResponseDto) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'returns', publicId: returnRequest.publicId },
  })
}

function openCreatePage() {
  if (isCreatePage.value) return
  router.push({ name: 'returnCreate' })
}

function closeCreatePage() {
  isCreateModalOpen.value = false

  if (isCreatePage.value) {
    router.push({ name: 'returns' })
  }
}

function handleCreateSuccess() {
  closeCreatePage()
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
  <section class="app-screen terminal-page returns-page">
    <header v-if="!isCreatePage" class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="fetchReturns">
          {{ content.refresh }}
        </button>
        <button class="page-button page-button--primary" type="button" @click="openCreatePage">
          {{ content.newReturn }}
        </button>
      </div>
    </header>

    <section v-if="!isCreatePage" class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section v-if="!isCreatePage" class="returns-page__insights">
      <article v-for="insight in insights" :key="insight.label" class="returns-page__insight">
        <span>{{ insight.label }}</span>
        <strong>{{ insight.value }}</strong>
        <small>{{ insight.meta }}</small>
      </article>
    </section>

    <section v-if="!isCreatePage" class="terminal-page__content">
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
              <div class="page-panel__eyebrow">반품</div>
              <h3>{{ content.title }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredReturns.length }}</span>
          </div>

          <div class="page-table terminal-page__table returns-page__table">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div v-if="isLoading" class="terminal-page__table-message">{{ content.loading }}</div>
            <div v-else-if="errorMessage" class="terminal-page__table-message is-error">{{ errorMessage }}</div>
            <div v-else-if="filteredReturns.length === 0" class="terminal-page__table-message">{{ content.empty }}</div>

            <template v-else>
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
                    @click="openReturnDetailPage(item)"
                  >
                    {{ content.btnDetail }}
                  </button>
                </span>
              </div>
            </template>
          </div>
        </article>
      </div>
    </section>

    <ReturnCreateModal
      :is-open="isCreatePage || isCreateModalOpen"
      :language="preferences.language"
      :presentation="isCreatePage ? 'page' : 'modal'"
      @close="closeCreatePage"
      @success="handleCreateSuccess"
    />

    <ReturnTimelineModal
      v-if="!isCreatePage"
      :is-open="isTimelineModalOpen"
      :language="preferences.language"
      :target-return="selectedReturn"
      :org-name-map="orgNameMap"
      @close="isTimelineModalOpen = false"
      @status-changed="fetchReturns"
    />
  </section>
</template>
