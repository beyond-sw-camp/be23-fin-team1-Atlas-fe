<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  getSupplier,
  getSuppliers,
  type SupplierListResponseDto,
  type SupplierResponseDto,
  type SupplierTierLevel,
} from '../../../services/supplier'

type SupplierTabKey = 'ALL' | 'ACTIVE' | 'AT_RISK' | 'UNDER_REVIEW'

type SupplierTableRow = {
  supplierCode: string
  supplierName: string
  publicId?: string
  supplierStatus: string
  approvalStatus?: string
  detail: SupplierResponseDto | null
  cells: string[]
}

const preferences = useAtlasPreferencesStore()

// 화면 문구와 더미 지표는 기존 레이아웃 유지용으로 그대로 둡니다.
// 총 협력사 개수만 실제 API 응답으로 덮어씁니다.
const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 협력사 관리',
    title: '협력사 관리',
    subtitle: '국가, 품질, 납기, 누적 거래 기준으로 협력사 현황을 관리합니다.',
    metrics: [
      { label: '총 협력사', value: '0', meta: '22개 국가', tone: 'nominal' },
      { label: '위험 협력사', value: '7', meta: '성과 이탈', tone: 'warning' },
      { label: '평균 납기 준수', value: '88%', meta: '최근 90일', tone: 'info' },
      { label: '평균 리드타임', value: '18일', meta: '글로벌 평균', tone: 'nominal' },
    ],
    tabs: [
      { key: 'ALL', label: '전체' },
      { key: 'ACTIVE', label: '정상' },
      { key: 'AT_RISK', label: '위험' },
      { key: 'UNDER_REVIEW', label: '검토 중' },
    ] as { key: SupplierTabKey; label: string }[],
    searchPlaceholder: '협력사명, 코드, 담당자 검색...',
    exportLabel: '내보내기',
    createLabel: '협력사 등록',
    tableTitle: '협력사 레지스트리',
    columns: ['ID', '협력사', '협력사 단계', '납기율', '협력사 점수', '품질 점수', '발주 건수', '누적 금액', '상태'],
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
      { label: 'TOTAL SUPPLIERS', value: '0', meta: '22 COUNTRIES', tone: 'nominal' },
      { label: 'AT RISK', value: '7', meta: 'PERFORMANCE GAP', tone: 'warning' },
      { label: 'ON-TIME RATE', value: '88%', meta: 'ROLLING 90 DAYS', tone: 'info' },
      { label: 'AVG LEAD TIME', value: '18d', meta: 'GLOBAL AVG', tone: 'nominal' },
    ],
    tabs: [
      { key: 'ALL', label: 'ALL' },
      { key: 'ACTIVE', label: 'ACTIVE' },
      { key: 'AT_RISK', label: 'AT RISK' },
      { key: 'UNDER_REVIEW', label: 'UNDER REVIEW' },
    ] as { key: SupplierTabKey; label: string }[],
    searchPlaceholder: 'Search supplier, code, or contact...',
    exportLabel: 'EXPORT',
    createLabel: 'ADD SUPPLIER',
    tableTitle: 'Supplier Registry',
    columns: ['ID', 'SUPPLIER', 'LEVEL', 'ON-TIME RATE', 'SUPPLIER SCORE', 'QUALITY SCORE', 'PO COUNT', 'CUMULATIVE AMOUNT', 'STATUS'],
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
const selectedSupplier = ref<SupplierResponseDto | null>(null)

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

function tierText(value: SupplierTierLevel) {
  if (preferences.language === 'ko') {
    switch (value) {
      case 'TIER1':
        return '1차'
      case 'TIER2':
        return '2차'
      case 'TIER3':
        return '3차'
      default:
        return value
    }
  }

  return value.replace('TIER', 'TIER ')
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

// API 응답을 기존 테이블 레이아웃에 맞게 변환합니다.
function toDisplayRow(supplier: SupplierListResponseDto): SupplierTableRow {
  const supplierStatus = supplier.detail?.supplierStatus ?? supplier.status
  const approvalStatus = supplier.detail?.approvalStatus

  return {
    supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName,
    publicId: supplier.detail?.publicId,
    supplierStatus,
    approvalStatus,
    detail: supplier.detail,
    cells: [
      supplier.supplierCode || '-',
      supplier.supplierName || '-',
      tierText(supplier.tierLevel),
      formatPercent(supplier.onTimeRate),
      formatNumber(supplier.supplierScore),
      formatNumber(supplier.qualityScore),
      formatNumber(supplier.purchaseOrderCount),
      formatAmount(supplier.cumulativeAmount),
      supplierStatusText(supplierStatus),
    ],
  }
}

// 총 협력사만 실제 데이터로 바꾸고 나머지 카드 값은 더미 유지합니다.
const metrics = computed(() => {
  const base = content.value.metrics.map((metric) => ({ ...metric }))
  base[0].value = String(rows.value.length)
  return base
})

async function fetchSupplierRows() {
  try {
    errorMessage.value = ''

    const response = await getSuppliers({
      page: 0,
      size: 100,
    })

    rows.value = response.content.map(toDisplayRow)
  } catch (error: any) {
    rows.value = []
    errorMessage.value = error.message ?? '협력사 목록을 불러오지 못했습니다.'
  }
}

// 검색/탭 필터만 기존 레이아웃에 맞게 유지합니다.
const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()

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
        return row.supplierStatus === 'ACTIVE'
      case 'AT_RISK':
        return row.supplierStatus === 'INACTIVE' || row.supplierStatus === 'SUSPENDED'
      case 'UNDER_REVIEW':
        return row.approvalStatus === 'REQUESTED' || row.approvalStatus === 'REJECTED'
      default:
        return true
    }
  })
})

onMounted(() => {
  void fetchSupplierRows()
})

async function openSupplierDetail(publicId: string) {
  detailModalOpen.value = true
  detailLoading.value = true
  detailErrorMessage.value = ''
  selectedSupplier.value = null

  try {
    selectedSupplier.value = await getSupplier(publicId)
  } catch (error: any) {
    detailErrorMessage.value = error.message ?? '협력사 상세 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

function closeSupplierDetail() {
  detailModalOpen.value = false
  detailLoading.value = false
  detailErrorMessage.value = ''
  selectedSupplier.value = null
}
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">{{ content.subtitle }}</p>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.createLabel }}</button>
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
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">SUPPLIER</div>
              <h3>{{ content.tableTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredRows.length }}</span>
          </div>

          <p v-if="errorMessage" style="margin: 0 0 12px; color: var(--color-error);">
            {{ errorMessage }}
          </p>

          <div class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div v-for="row in filteredRows" :key="row.publicId ?? row.supplierCode" class="page-table__row">
              <span v-for="(cell, index) in row.cells" :key="`${row.publicId ?? row.supplierCode}-${index}`">
                <button
                  v-if="index === 1 && row.publicId"
                  type="button"
                  @click="openSupplierDetail(row.publicId)"
                  style="all: unset; cursor: pointer; color: inherit;"
                >
                  {{ cell }}
                </button>
                <template v-else>
                  {{ cell }}
                </template>
              </span>
            </div>
          </div>
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
        <span class="page-feed__label">PUBLIC ID</span>
        <strong class="page-feed__text">{{ selectedSupplier.publicId }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">ORGANIZATION PUBLIC ID</span>
        <strong class="page-feed__text">{{ selectedSupplier.organizationPublicId }}</strong>
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
        <span class="page-feed__label">TIER</span>
        <strong class="page-feed__text">{{ tierText(selectedSupplier.tierLevel) }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">SUPPLIER STATUS</span>
        <strong class="page-feed__text">{{ supplierStatusText(selectedSupplier.supplierStatus) }}</strong>
      </div>

      <div class="page-feed__item">
        <span class="page-feed__label">APPROVAL STATUS</span>
        <strong class="page-feed__text">{{ selectedSupplier.approvalStatus }}</strong>
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

      <div class="page-feed__item">
        <span class="page-feed__label">UPDATED AT</span>
        <strong class="page-feed__text">{{ formatDate(selectedSupplier.updatedAt) }}</strong>
      </div>
    </div>
  </BaseModal>
</template>
