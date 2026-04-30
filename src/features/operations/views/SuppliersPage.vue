<script setup lang="ts">
// 필요한 Vue 함수만 한 번에 가져옵니다.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  createSupplier,
  getConnectedSupplierDetail,
  getConnectedSupplierSummary,
  getMySupplier,
  getSupplier,
  getSuppliers,
  type ConnectedSupplierDetailResponseDto,
  type ConnectedSupplierSummaryResponseDto,
  type CreateSupplierRequestDto,
  type SupplierListResponseDto,
  type SupplierResponseDto,
} from '../../../services/supplier'

import {
  getMyOrganizationDetail,
  getOrganizations,
  type OrganizationListItem,
} from '../../../services/organization'

import { useAtlasSessionStore } from '../../../stores/session'
import { useActorScope } from '../../../composables/useActorScope'




type SupplierTabKey = 'ALL' | 'ACTIVE' | 'AT_RISK'

type SupplierTableRow = {
  supplierCode: string
  supplierName: string
  publicId?: string
  supplierStatus: string
  relationStatus: string | null
  purchaseOrderCount: number | null
  cumulativeAmount: number | null
  detail: SupplierResponseDto | null
  cells: string[]
}


type CreateSupplierFormState = {
  organizationPublicId: string
  supplierCode: string
  supplierName: string
  primaryContactName: string
  primaryContactEmail: string
  primaryContactPhone: string
}

const preferences = useAtlasPreferencesStore()
// 현재 로그인 조직 타입을 확인하려고 세션 스토어를 씁니다.
const session = useAtlasSessionStore()

// 화면에서 역할별 버튼 노출 제어에 사용합니다.
const actor = useActorScope()

// 검색 API를 너무 자주 호출하지 않게 잠깐 기다리는 타이머입니다.
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

// 협력사 조직은 백엔드 검색이 막혀 있어서 로컬 검색만 유지합니다.
const useServerSearch = computed(() => session.organizationType !== 'SUPPLIER')

// 총 협력사 개수만 실제 API 응답으로 덮어씁니다.
const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 협력사 관리',
    title: '협력사 관리',
    subtitle: '품질, 납기, 누적 거래 기준으로 협력사 현황을 관리합니다.',
    metrics: [
      { label: '총 거래 협력사', value: '0', tone: 'nominal' },
      { label: '위험 협력사', value: '0', tone: 'warning' },
      { label: '평균 납기 준수율 (최근 90일)', value: '0%', tone: 'info' },
      { label: '평균 리드타임', value: '0일', tone: 'nominal' },
    ],
    tabs: [
      { key: 'ALL', label: '전체' },
      { key: 'ACTIVE', label: '정상' },
      { key: 'AT_RISK', label: '위험' },
    ] as { key: SupplierTabKey; label: string }[],
    searchPlaceholder: '협력사명, 코드, 담당자 검색...',
    exportLabel: '내보내기',
    createLabel: '협력사 등록',
    tableTitle: '협력사 레지스트리',
    columns: ['ID', '협력사', '거래 상태','납기율', '협력사 점수', '품질 점수', '발주 건수', '누적 금액', '상세'],
    topTitle: '상위 성과 협력사',
    riskTitle: '주의 필요',
    regionTitle: '권역별 지출',
    detailTitle: '협력사 상세 조회',
    detailDescription: '선택한 협력사의 상세 정보를 확인합니다.',
  },
  en: {
    eyebrow: 'Supply Chain Ops / Suppliers',
    title: 'Supplier Directory',
    subtitle: 'Operate supplier portfolio by country, quality, lead time, and cumulative trading amount.',
    metrics: [
      { label: 'TOTAL TRADING SUPPLIERS', value: '0', tone: 'nominal' },
      { label: 'AT RISK', value: '0', tone: 'warning' },
      { label: 'AVERAGE ON-TIME RATE (ROLLING 90 DAYS)', value: '0%', tone: 'info' },
      { label: 'AVG LEAD TIME', value: '0d', tone: 'nominal' },
    ],
    tabs: [
      { key: 'ALL', label: 'ALL' },
      { key: 'ACTIVE', label: 'ACTIVE' },
      { key: 'AT_RISK', label: 'AT RISK' },
    ] as { key: SupplierTabKey; label: string }[],
    searchPlaceholder: 'Search supplier, code, or contact...',
    exportLabel: 'EXPORT',
    createLabel: 'ADD SUPPLIER',
    tableTitle: 'Supplier Registry',
    columns: ['ID', 'SUPPLIER', 'RELATION STATUS', 'ON-TIME RATE', 'SUPPLIER SCORE', 'QUALITY SCORE', 'PO COUNT', 'CUMULATIVE AMOUNT', 'DETAIL'],
    topTitle: 'Top Performers',
    riskTitle: 'Needs Attention',
    regionTitle: 'Spend By Region',
    detailTitle: 'Supplier Detail',
    detailDescription: 'Review the selected supplier detail information.',
  },
}

// 오른쪽 패널은 아직 손대지 않는다고 하셔서 더미 유지합니다.
const TOP_ROWS = {
  ko: [
    ['SKF Nordic', '스웨덴 / 베어링', '98%'],
    ['Toray', '일본 / 복합소재', '96%'],
    ['Foxconn', '대만 / 전자', '91%'],
  ],
  en: [
    ['SKF Nordic', 'Sweden / Bearings', '98%'],
    ['Toray', 'Japan / Composites', '96%'],
    ['Foxconn', 'Taiwan / Electronics', '91%'],
  ],
}

const RISK_ROWS = {
  ko: [
    ['SiLink', '전력 이슈 이후 생산량 하락'],
    ['Helix GmbH', '통관 지연으로 ETA 변동'],
    ['Parker', '품질 편차 재검토 필요'],
  ],
  en: [
    ['SiLink', 'Output dropped after power disruption'],
    ['Helix GmbH', 'Customs delay impacting ETA'],
    ['Parker', 'Quality variance requires review'],
  ],
}

const REGION_ROWS = {
  ko: [
    ['아시아 태평양', '₩14.2M', '100%'],
    ['유럽', '₩8.8M', '62%'],
    ['북미', '₩4.1M', '29%'],
  ],
  en: [
    ['Asia Pacific', '$14.2M', '100%'],
    ['Europe', '$8.8M', '62%'],
    ['North America', '$4.1M', '29%'],
  ],
}

const content = computed(() => CONTENT[preferences.language])
const topRows = computed(() => TOP_ROWS[preferences.language])
const riskRows = computed(() => RISK_ROWS[preferences.language])
const regionRows = computed(() => REGION_ROWS[preferences.language])

// 실제 협력사 목록 상태입니다.
const rows = ref<SupplierTableRow[]>([])
const errorMessage = ref('')

// 상세 모달 상태입니다.
const detailModalOpen = ref(false)
const detailLoading = ref(false)
const detailErrorMessage = ref('')
const connectedSummary = ref<ConnectedSupplierSummaryResponseDto | null>(null)
const selectedSupplier = ref<ConnectedSupplierDetailResponseDto | null>(null)
const organizationNameMap = ref<Record<string, string>>({})

// 관리자 전용 협력사 등록 모달 상태입니다.
const createModalOpen = ref(false)
const createLoading = ref(false)
const createErrorMessage = ref('')
const supplierOrganizationOptions = ref<OrganizationListItem[]>([])

const createForm = ref<CreateSupplierFormState>({
  organizationPublicId: '',
  supplierCode: '',
  supplierName: '',
  primaryContactName: '',
  primaryContactEmail: '',
  primaryContactPhone: '',
})


const search = ref('')
const activeTab = ref<SupplierTabKey>('ALL')

function formatPercent(value: number | null | undefined) {
  if (value == null) return '-'
  return `${value}%`
}

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatAmount(value: number | null | undefined) {
  if (value == null) return '-'
  return preferences.language === 'ko'
    ? `${value.toLocaleString('ko-KR')}원`
    : `$${value.toLocaleString('en-US')}`
}

function formatDate(value: string | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}


function supplierStatusText(value: string) {
  if (preferences.language !== 'ko') return value

  switch (value) {
    case 'ACTIVE':
      return '정상 거래'
    case 'INACTIVE':
      return '비활성'
    case 'SUSPENDED':
      return '일시 정지'
    case 'TERMINATED':
      return '계약 해지'
    case 'REQUESTED':
      return '승인 요청'
    case 'REJECTED':
      return '반려'
    default:
      return value
  }
}


function connectedOrderStatusText(order: { orderType: 'PURCHASE_ORDER' | 'SUB_PURCHASE_ORDER'; status: string }) {
  return order.orderType === 'PURCHASE_ORDER'
    ? poStatusText(order.status)
    : subPoStatusText(order.status)
}

function relationStatusText(value: string) {
  if (preferences.language !== 'ko') return value
  switch (value) {
    case 'REQUESTED': return '연결 요청'
    case 'ACTIVE': return '연결 유지'
    case 'PAUSED': return '일시 중지'
    case 'ENDED': return '종료'
    default: return value
  }
}

function orderRoleText(value: 'ISSUED' | 'RECEIVED') {
  if (preferences.language !== 'ko') return value
  return value === 'ISSUED' ? '발주' : '수주'
}

function subPoStatusText(value: string) {
  if (preferences.language !== 'ko') return value

  switch (value) {
    case 'CREATED':
      return '생성'
    case 'PARTIALLY_CONFIRMED':
      return '일부 확정'
    case 'CONFIRMED':
      return '전체 확정'
    case 'REJECTED':
      return '거절'
    case 'CANCELLED':
      return '취소'
    case 'COMPLETED':
      return '완료'
    case 'DELETED':
      return '삭제'
    default:
      return value
  }
}

function poStatusText(value: string) {
  if (preferences.language !== 'ko') return value

  switch (value) {
    case 'CREATED':
      return '확인 대기'
    case 'PARTIALLY_CONFIRMED':
      return '부분 확정'
    case 'CONFIRMED':
      return '확정'
    case 'REJECTED':
      return '반려'
    case 'CANCELLED':
      return '취소'
    case 'COMPLETED':
      return '완료'
    case 'DELETED':
      return '삭제'
    default:
      return value
  }
}


// 협력사 목록 API 응답을 기존 테이블 행 구조로 변환합니다.
// 목록 API는 SupplierListResponseDto 를 내려주므로 상세 DTO가 아니라 목록 DTO 기준으로 받습니다.
function toDisplayRow(supplier: SupplierListResponseDto): SupplierTableRow {
  const supplierStatus = supplier.detail?.supplierStatus ?? 'INACTIVE'
  const relationStatus = supplier.relationStatus

  return {
    supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName,
    publicId: supplier.detail?.publicId,
    supplierStatus,
    relationStatus,
    purchaseOrderCount: supplier.purchaseOrderCount,
    cumulativeAmount: supplier.cumulativeAmount,
    detail: supplier.detail,
    cells: [
      supplier.supplierCode || '-',
      supplier.supplierName || '-',
      relationStatus ? relationStatusText(relationStatus) : '-',
      formatPercent(supplier.onTimeRate),
      formatNumber(supplier.supplierScore),
      formatNumber(supplier.qualityScore),
      formatNumber(supplier.purchaseOrderCount),
      formatAmount(supplier.cumulativeAmount),
    ],
  }
}


async function fetchConnectedSummary() {
  if (session.organizationType !== 'SUPPLIER') {
    connectedSummary.value = null
    return
  }
  connectedSummary.value = await getConnectedSupplierSummary()
}

async function loadSupplierOrganizationNameMap() {
  try {
    const response = await getOrganizations({ organizationType: 'SUPPLIER', page: 0, size: 200 })
    organizationNameMap.value = Object.fromEntries(
      response.content.map((org) => [org.organizationPublicId, org.organizationName]),
    )
    if (actor.canCreateSupplier.value) {
      supplierOrganizationOptions.value = response.content
    }
  } catch {
    organizationNameMap.value = {}
    supplierOrganizationOptions.value = []
  }
}

// 총 협력사만 실제 데이터로 바꾸고 나머지 카드 값은 더미 유지합니다.
const metrics = computed(() => {
  const base = content.value.metrics.map((metric) => ({ ...metric }))

  base[0].value = formatNumber(connectedSummary.value?.connectedSupplierCount ?? rows.value.length)

  base[1].value = formatNumber(
    rows.value.filter(
      (row) => row.supplierStatus === 'INACTIVE' || row.supplierStatus === 'SUSPENDED',
    ).length,
  )

  base[2].value = formatPercent(connectedSummary.value?.averageOnTimeRate)

  const averageLeadTimeDays = connectedSummary.value?.averageLeadTimeDays ?? 0
  base[3].value =
    preferences.language === 'ko'
      ? `${averageLeadTimeDays}일`
      : `${averageLeadTimeDays}d`

  return base
})

// 검색어를 받아서 협력사 목록을 다시 불러옵니다.
// 협력사 로그인인데 supply-service 에 supplier row가 없으면,
// auth-service 의 내 조직 정보를 협력사처럼 한 줄로 보여줍니다.
async function fetchSupplierRows(keyword = '') {
  errorMessage.value = ''

  try {
    const normalizedKeyword = keyword.trim()

    const response = await getSuppliers({
      keyword: useServerSearch.value ? normalizedKeyword || undefined : undefined,
      page: 0,
      size: 100,
    })

    rows.value = response.content
      .filter((supplier) => {
        const supplierOrgId = supplier.detail?.organizationPublicId

        // 내 조직은 목록에서 제외
        if (supplierOrgId && supplierOrgId === session.organizationPublicId) {
          return false
        }

        return true
      })
      .map(toDisplayRow)
  } catch (error: any) {
    rows.value = []
    errorMessage.value = error.message ?? '협력사 목록을 불러오지 못했습니다.'
  }
}



// ADMIN / BUYER 는 검색을 서버가 처리하므로 탭 필터만 적용합니다.
// SUPPLIER 는 기존처럼 화면에서 검색어 필터를 한 번 더 적용합니다.
const filteredRows = computed(() => {
  const query = useServerSearch.value ? '' : search.value.trim().toLowerCase()

  return rows.value.filter((row) => {
    const matchesQuery =
      !query ||
      row.supplierCode.toLowerCase().includes(query) ||
      row.supplierName.toLowerCase().includes(query) ||
      row.cells.some((cell) => cell.toLowerCase().includes(query))

    if (!matchesQuery) return false

    switch (activeTab.value) {
      case 'ALL':
        return true
      case 'ACTIVE':
        return row.relationStatus === 'ACTIVE'
      case 'AT_RISK':
        return row.supplierStatus === 'INACTIVE' || row.supplierStatus === 'SUSPENDED'
      default:
        return true
    }
  })
})

// 검색어가 바뀌면 잠깐 기다렸다가 서버 검색을 호출합니다.
watch(search, (nextKeyword) => {
  // 협력사 로그인은 백엔드에서 검색이 막혀 있어서 서버 호출을 하지 않습니다.
  if (!useServerSearch.value) {
    return
  }

  // 이전 타이머가 있으면 지웁니다.
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // 0.3초 뒤에 한 번만 검색합니다.
  searchDebounceTimer = setTimeout(() => {
    void fetchSupplierRows(nextKeyword)
  }, 300)
})

// 페이지를 떠날 때 남아 있는 타이머를 정리합니다.
onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
})


onMounted(() => {
  void fetchSupplierRows()
  void fetchConnectedSummary()
  void loadSupplierOrganizationNameMap()
})

function toDetailResponse(supplier: SupplierResponseDto): ConnectedSupplierDetailResponseDto {
  return {
    ...supplier,
    onTimeRate: null,
    purchaseOrderCount: 0,
    cumulativeAmount: 0,
    orders: [],
  }
}

async function openSupplierDetail(publicId: string) {
  detailModalOpen.value = true
  detailLoading.value = true
  detailErrorMessage.value = ''
  selectedSupplier.value = null

  try {
    if (session.organizationType === 'BUYER' || session.organizationType === 'SUPPLIER') {
      selectedSupplier.value = await getConnectedSupplierDetail(publicId)
    } else {
      const supplier = await getSupplier(publicId)
      selectedSupplier.value = toDetailResponse(supplier)
    }
  } catch (error: any) {
    detailErrorMessage.value = error.message ?? '협력사 상세 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}




const selectedSupplierOrganizationName = computed(() => {
  const organizationPublicId = selectedSupplier.value?.organizationPublicId
  if (!organizationPublicId) return '-'
  return organizationNameMap.value[organizationPublicId] ?? organizationPublicId
})

function closeSupplierDetail() {
  detailModalOpen.value = false
  detailLoading.value = false
  detailErrorMessage.value = ''
  selectedSupplier.value = null
}

// 협력사 등록 모달 기본값으로 되돌립니다.
function resetCreateForm() {
  createErrorMessage.value = ''
  createForm.value = {
    organizationPublicId: '',
    supplierCode: '',
    supplierName: '',
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
  }
}

// 협력사로 생성 가능한 조직 목록을 관리자 화면에서만 불러옵니다.
async function loadSupplierOrganizations() {
  if (!actor.canCreateSupplier.value) {
    supplierOrganizationOptions.value = []
    return
  }

  try {
    const response = await getOrganizations({
      organizationType: 'SUPPLIER',
      page: 0,
      size: 100,
    })

    supplierOrganizationOptions.value = response.content
      .slice()
      .sort((a, b) => a.organizationName.localeCompare(b.organizationName, 'ko-KR'))
  } catch {
    supplierOrganizationOptions.value = []
  }
}

// 관리자일 때만 협력사 등록 모달을 엽니다.
function openCreateModal() {
  if (!actor.canCreateSupplier.value) return

  resetCreateForm()
  createModalOpen.value = true
}

// 협력사 등록 모달을 닫습니다.
function closeCreateModal() {
  createModalOpen.value = false
  createErrorMessage.value = ''
}

// 협력사 생성 API를 호출합니다.
async function submitCreateSupplier() {
  if (!createForm.value.organizationPublicId) {
    createErrorMessage.value = '협력사 조직을 선택해 주세요.'
    return
  }

  if (!createForm.value.supplierCode.trim()) {
    createErrorMessage.value = '협력사 코드를 입력해 주세요.'
    return
  }

  if (!createForm.value.supplierName.trim()) {
    createErrorMessage.value = '협력사명을 입력해 주세요.'
    return
  }

  try {
    createLoading.value = true
    createErrorMessage.value = ''

    const payload: CreateSupplierRequestDto = {
      organizationPublicId: createForm.value.organizationPublicId,
      supplierCode: createForm.value.supplierCode.trim(),
      supplierName: createForm.value.supplierName.trim(),
      primaryContactName: createForm.value.primaryContactName.trim(),
      primaryContactEmail: createForm.value.primaryContactEmail.trim(),
      primaryContactPhone: createForm.value.primaryContactPhone.trim(),
    }

    await createSupplier(payload)

    closeCreateModal()
    await fetchSupplierRows(search.value)
  } catch (error: any) {
    createErrorMessage.value = error.message ?? '협력사 등록에 실패했습니다.'
  } finally {
    createLoading.value = false
  }
}

</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">
          {{ content.exportLabel }}
        </button>

        <button
          v-if="actor.canCreateSupplier.value"
          class="page-button page-button--primary"
          type="button"
          @click="openCreateModal"
        >
          {{ content.createLabel }}
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>SEARCH</span>
            <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
          </label>

          <div class="terminal-page__tabs">
            <button
              v-for="tab in content.tabs"
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
          <div class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div v-for="row in filteredRows" :key="row.publicId ?? row.supplierCode" class="page-table__row">
              <span v-for="(cell, index) in row.cells" :key="`${row.publicId ?? row.supplierCode}-${index}`">
                {{ cell }}
              </span>
              <span>
                <button
                  v-if="row.publicId"
                  class="page-button page-button--secondary"
                  type="button"
                  @click="openSupplierDetail(row.publicId)"
                >
                  {{ preferences.language === 'ko' ? '상세' : 'DETAIL' }}
                </button>
                <template v-else>-</template>
              </span>
            </div>
          </div>


          <p v-if="errorMessage" style="margin: 0 0 12px; color: var(--color-error);">
            {{ errorMessage }}
          </p>
        </article>
      </div>

      <aside class="terminal-page__aside">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">TOP</div>
              <h3>{{ content.topTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div v-for="[name, meta, value] in topRows" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ meta }}</span>
              <strong class="page-feed__text">{{ name }}</strong>
              <span>{{ value }}</span>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">WATCH</div>
              <h3>{{ content.riskTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div v-for="[name, reason] in riskRows" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ name }}</span>
              <strong class="page-feed__text">{{ reason }}</strong>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">REGION</div>
              <h3>{{ content.regionTitle }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div v-for="[label, value, width] in regionRows" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ value }}</strong>
              <div class="terminal-page__bar">
                <span :style="{ width }" />
              </div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>

  <BaseModal
  v-model="createModalOpen"
  :title="content.createLabel"
  :description="preferences.language === 'ko' ? '관리자 권한으로 협력사 마스터를 등록합니다.' : 'Create supplier master data as admin.'"
  size="md"
  @close="closeCreateModal"
>
  <div class="page-form" style="display: flex; flex-direction: column; gap: 16px;">
    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">협력사 조직</span>
      <div style="width: 100%; border-bottom: 2px solid var(--color-surface-container-high);">
        <select
          v-model="createForm.organizationPublicId"
          style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none;"
        >
          <option value="">조직을 선택하세요.</option>
          <option
            v-for="organization in supplierOrganizationOptions"
            :key="organization.organizationPublicId"
            :value="organization.organizationPublicId"
          >
            {{ organization.organizationName }} / {{ organization.organizationPublicId }}
          </option>
        </select>
      </div>
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">협력사 코드</span>
      <input
        v-model="createForm.supplierCode"
        type="text"
        placeholder="예: SUP-001"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">협력사명</span>
      <input
        v-model="createForm.supplierName"
        type="text"
        placeholder="협력사명을 입력하세요."
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">담당자명</span>
      <input
        v-model="createForm.primaryContactName"
        type="text"
        placeholder="담당자명을 입력하세요."
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">담당자 이메일</span>
      <input
        v-model="createForm.primaryContactEmail"
        type="email"
        placeholder="email@example.com"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
      <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">담당자 연락처</span>
      <input
        v-model="createForm.primaryContactPhone"
        type="text"
        placeholder="010-0000-0000"
        style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
      />
    </label>

    <p v-if="createErrorMessage" style="margin: 0; color: var(--color-error);">
      {{ createErrorMessage }}
    </p>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
      <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
        취소
      </button>
      <button
        class="page-button page-button--primary"
        type="button"
        :disabled="createLoading"
        @click="submitCreateSupplier"
      >
        등록
      </button>
    </div>
  </div>
</BaseModal>

  <BaseModal
    v-model="detailModalOpen"
    :title="content.detailTitle"
    :description="selectedSupplier?.supplierName || content.detailDescription"
    size="md"
    @close="closeSupplierDetail"
  >
    <div v-if="detailLoading" class="page-feed">
      <div class="page-feed__item">
        <strong class="page-feed__text">상세 정보를 불러오는 중...</strong>
      </div>
    </div>

    <p v-else-if="detailErrorMessage" style="margin: 0; color: var(--color-error);">
      {{ detailErrorMessage }}
    </p>

    <div v-else-if="selectedSupplier" class="page-feed">
      <div class="page-feed__item">
        <span class="page-feed__label">ORGANIZATION NAME</span>
        <strong class="page-feed__text">{{ selectedSupplierOrganizationName }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER CODE</span>
        <strong class="page-feed__text">{{ selectedSupplier.supplierCode }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER NAME</span>
        <strong class="page-feed__text">{{ selectedSupplier.supplierName }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER STATUS</span>
        <strong class="page-feed__text">
          {{ supplierStatusText(selectedSupplier.supplierStatus) }}
        </strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">PRIMARY CONTACT NAME</span>
        <strong class="page-feed__text">{{ selectedSupplier.primaryContactName || '-' }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">PRIMARY CONTACT EMAIL</span>
        <strong class="page-feed__text">{{ selectedSupplier.primaryContactEmail || '-' }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">PRIMARY CONTACT PHONE</span>
        <strong class="page-feed__text">{{ selectedSupplier.primaryContactPhone || '-' }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">CREATED AT</span>
        <strong class="page-feed__text">{{ formatDate(selectedSupplier.createdAt) }}</strong>
      </div>

      <div class="page-feed__item" style="display: block;">
        <span class="page-feed__label">RELATED ORDERS</span>

        <div
          v-if="selectedSupplier.orders && selectedSupplier.orders.length > 0"
          class="page-table"
          style="margin-top: 8px;"
        >
          <div class="page-table__row page-table__row--head">
            <span>{{ preferences.language === 'ko' ? '문서유형' : 'TYPE' }}</span>
            <span>{{ preferences.language === 'ko' ? '문서번호' : 'DOCUMENT NO' }}</span>
            <span>{{ preferences.language === 'ko' ? '상위발주번호' : 'PARENT PO NO' }}</span>
            <span>{{ preferences.language === 'ko' ? '구분' : 'ROLE' }}</span>
            <span>{{ preferences.language === 'ko' ? '상태' : 'STATUS' }}</span>
            <span>{{ preferences.language === 'ko' ? '발주일시' : 'ORDERED AT' }}</span>
            <span>{{ preferences.language === 'ko' ? '금액' : 'AMOUNT' }}</span>
          </div>

          <div
            v-for="order in selectedSupplier.orders"
            :key="order.subPoPublicId || order.poPublicId || order.orderedAt"
            class="page-table__row"
          >
            <span>
              {{ order.orderType === 'PURCHASE_ORDER'
                ? (preferences.language === 'ko' ? '메인 발주' : 'PURCHASE ORDER')
                : (preferences.language === 'ko' ? '서브 발주' : 'SUB PURCHASE ORDER') }}
            </span>
            <span>{{ order.orderType === 'PURCHASE_ORDER' ? order.poNumber : order.subPoNumber }}</span>
            <span>{{ order.parentPoNumber ?? '-' }}</span>
            <span>{{ orderRoleText(order.orderRole) }}</span>
            <span>{{ connectedOrderStatusText(order) }}</span>
            <span>{{ formatDate(order.orderedAt) }}</span>
            <span>{{ formatAmount(order.totalAmount) }}</span>
          </div>
        </div>

        <p v-else style="margin: 8px 0 0;">
          {{ preferences.language === 'ko' ? '연결된 발주 이력이 없습니다.' : 'No related orders.' }}
        </p>
      </div>
    </div>
  </BaseModal>
</template>
