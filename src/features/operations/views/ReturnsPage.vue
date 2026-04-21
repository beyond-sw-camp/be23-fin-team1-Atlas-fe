<script setup lang="ts">
import { ref, onMounted, computed, watchEffect, onBeforeUnmount } from 'vue'
import { getReturnRequests, type ReturnRequestResponseDto } from '../../../services/return'
import { getOrganizations, type OrganizationListItem } from '../../../services/organization'
import ReturnCreateModal from '../components/ReturnCreateModal.vue'
import ReturnTimelineModal from '../components/ReturnTimelineModal.vue'

// Language & Theme state (mocking global store for now)
const currentLanguage = ref<'ko' | 'en'>('ko')

// Selected Tab: ALL, REQUESTED, IN_TRANSIT, COMPLETED
const activeTab = ref('ALL')

const returns = ref<ReturnRequestResponseDto[]>([])
const isLoading = ref(false)
const isCreateModalOpen = ref(false)

const isTimelineModalOpen = ref(false)
const selectedReturn = ref<ReturnRequestResponseDto | null>(null)

// 조직 publicId → 조직명 매핑용
const orgNameMap = ref<Record<string, string>>({})

// For formatting dates
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

/** publicId로 조직명 조회 (없으면 publicId 앞 8글자로 표시) */
function getOrgName(publicId: string | undefined): string {
  if (!publicId) return '-'
  return orgNameMap.value[publicId] || publicId.slice(0, 8) + '...'
}

async function fetchOrganizations() {
  try {
    const res = await getOrganizations({ page: 0, size: 200 })
    const orgs = res.content || []
    const map: Record<string, string> = {}
    orgs.forEach((org: OrganizationListItem) => {
      map[org.organizationPublicId] = org.organizationName
    })
    orgNameMap.value = map
  } catch (e) {
    console.error('Failed to fetch organizations:', e)
  }
}

const content = computed(() => {
  return currentLanguage.value === 'ko'
    ? {
        title: '반품 (Returns)',
        desc: '발주 또는 출하된 품목에 대한 수거 및 반품 상태를 관리합니다.',
        all: '전체',
        requested: '요청됨',
        inTransit: '회수 중',
        completed: '완료됨',
        newReturn: '반품 생성',
        colNo: '반품 번호',
        colReqOrg: '요청 조직',
        colTargetOrg: '대상 조직',
        colType: '반품 유형',
        colStatus: '상태',
        colDate: '요청일시',
        colAction: '이력/관리',
        btnDetail: '상세 보기',
        empty: '반품 내역이 없습니다.',
      }
    : {
        title: 'Returns',
        desc: 'Manage return requests and shipments for items.',
        all: 'All',
        requested: 'Requested',
        inTransit: 'In Transit',
        completed: 'Completed',
        newReturn: 'New Return',
        colNo: 'Return No',
        colReqOrg: 'Req Org',
        colTargetOrg: 'Target Org',
        colType: 'Type',
        colStatus: 'Status',
        colDate: 'Req Date',
        colAction: 'Action',
        btnDetail: 'Details',
        empty: 'No Returns found.',
      }
})

const filteredReturns = computed(() => {
  if (activeTab.value === 'ALL') return returns.value
  if (activeTab.value === 'REQUESTED') {
    return returns.value.filter(r => r.returnStatus === 'REQUESTED' || r.returnStatus === 'APPROVED')
  }
  if (activeTab.value === 'IN_TRANSIT') {
    return returns.value.filter(r => r.returnStatus === 'IN_TRANSIT' || r.returnStatus === 'RECEIVED')
  }
  if (activeTab.value === 'COMPLETED') {
    return returns.value.filter(r => r.returnStatus === 'COMPLETED' || r.returnStatus === 'REJECTED')
  }
  return returns.value
})

async function fetchReturns() {
  isLoading.value = true
  try {
    const res = await getReturnRequests({ page: 0, size: 50 })
    returns.value = res.content
  } catch (error) {
    console.error('Failed to load returns:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchOrganizations()
  fetchReturns()
})

function openTimeline(ret: ReturnRequestResponseDto) {
  selectedReturn.value = ret
  isTimelineModalOpen.value = true
}

function handleCreateSuccess() {
  isCreateModalOpen.value = false
  fetchReturns()
}

// 반품 유형 한글 변환
function returnTypeText(type: string): string {
  if (currentLanguage.value !== 'ko') return type
  switch (type) {
    case 'DAMAGE': return '파손'
    case 'DEFECTIVE': return '불량'
    case 'MISDELIVERY': return '오배송'
    case 'SIMPLE_RETURN': return '단순 반품'
    default: return type
  }
}

// 반품 상태 한글 변환
function returnStatusText(status: string): string {
  if (currentLanguage.value !== 'ko') return status
  switch (status) {
    case 'REQUESTED': return '요청됨'
    case 'APPROVED': return '승인됨'
    case 'REJECTED': return '반려됨'
    case 'IN_TRANSIT': return '회수 중'
    case 'RECEIVED': return '입고 완료'
    case 'COMPLETED': return '처리 완료'
    default: return status
  }
}

// KPI 지표 계산
const metrics = computed(() => {
  const all = returns.value
  const requested = all.filter(r => r.returnStatus === 'REQUESTED' || r.returnStatus === 'APPROVED').length
  const inTransit = all.filter(r => r.returnStatus === 'IN_TRANSIT' || r.returnStatus === 'RECEIVED').length
  const completed = all.filter(r => r.returnStatus === 'COMPLETED').length

  return currentLanguage.value === 'ko'
    ? [
        { label: '총 반품', value: String(all.length), meta: '전체 건수', tone: 'nominal' },
        { label: '요청/승인', value: String(requested), meta: '처리 대기', tone: 'warning' },
        { label: '회수 중', value: String(inTransit), meta: '운송 진행', tone: 'info' },
        { label: '완료', value: String(completed), meta: '처리 완료', tone: 'nominal' },
      ]
    : [
        { label: 'TOTAL RETURNS', value: String(all.length), meta: 'ALL RECORDS', tone: 'nominal' },
        { label: 'PENDING', value: String(requested), meta: 'AWAITING', tone: 'warning' },
        { label: 'IN TRANSIT', value: String(inTransit), meta: 'SHIPPING', tone: 'info' },
        { label: 'COMPLETED', value: String(completed), meta: 'DONE', tone: 'nominal' },
      ]
})

const tabs = computed(() => {
  return currentLanguage.value === 'ko'
    ? [
        { key: 'ALL', label: '전체' },
        { key: 'REQUESTED', label: '요청됨' },
        { key: 'IN_TRANSIT', label: '회수 중' },
        { key: 'COMPLETED', label: '완료됨' },
      ]
    : [
        { key: 'ALL', label: 'ALL' },
        { key: 'REQUESTED', label: 'REQUESTED' },
        { key: 'IN_TRANSIT', label: 'IN TRANSIT' },
        { key: 'COMPLETED', label: 'COMPLETED' },
      ]
})

const columns = computed(() => {
  return currentLanguage.value === 'ko'
    ? ['반품 번호', '요청 조직', '대상 조직', '반품 유형', '상태', '요청일시', '관리']
    : ['RETURN NO', 'REQ ORG', 'TARGET ORG', 'TYPE', 'STATUS', 'REQ DATE', 'ACTION']
})
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">Supply Chain Ops / Returns</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">{{ content.desc }}</p>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--primary" @click="isCreateModalOpen = true">
          {{ content.newReturn }}
        </button>
      </div>
    </header>

    <!-- KPI 지표 카드 -->
    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <!-- 필터 및 탭 -->
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

        <!-- 데이터 테이블 패널 -->
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">RETURNS</div>
              <h3>{{ currentLanguage === 'ko' ? '반품 레지스트리' : 'Return Registry' }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredReturns.length }}</span>
          </div>

          <div class="page-table terminal-page__table is-eight-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="col in columns" :key="col">{{ col }}</span>
            </div>

            <div v-if="isLoading" class="page-table__row" style="justify-content: center; padding: 32px 0;">
              <span style="color: var(--color-on-surface-variant); font-style: italic;">Loading...</span>
            </div>

            <div v-else-if="filteredReturns.length === 0" class="page-table__row" style="justify-content: center; padding: 32px 0;">
              <span style="color: var(--color-on-surface-variant); font-style: italic;">{{ content.empty }}</span>
            </div>

            <div v-else v-for="item in filteredReturns" :key="item.publicId" class="page-table__row">
              <span style="font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem;">{{ item.returnNumber }}</span>
              <span>{{ item.requestOrganizationName || getOrgName(item.requestOrganizationPublicId) }}</span>
              <span>{{ item.targetOrganizationName || getOrgName(item.targetOrganizationPublicId) }}</span>
              <span>{{ returnTypeText(item.returnType) }}</span>
              <span>{{ returnStatusText(item.returnStatus) }}</span>
              <span>{{ formatDate(item.requestedAt) }}</span>
              <span>
                <button
                  type="button"
                  style="all: unset; cursor: pointer; color: var(--color-primary); font-weight: 600; font-size: 0.875rem;"
                  @click="openTimeline(item)"
                >
                  {{ content.btnDetail }} →
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Modals -->
    <ReturnCreateModal
      :is-open="isCreateModalOpen"
      :language="currentLanguage"
      @close="isCreateModalOpen = false"
      @success="handleCreateSuccess"
    />

    <ReturnTimelineModal
      :is-open="isTimelineModalOpen"
      :language="currentLanguage"
      :target-return="selectedReturn"
      @close="isTimelineModalOpen = false"
      @status-changed="fetchReturns"
    />
  </section>
</template>

