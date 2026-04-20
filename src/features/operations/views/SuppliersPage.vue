<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  getSupplier,
  getSuppliers,
  type SupplierListResponseDto,
  type SupplierResponseDto,
  type SupplierTierLevel,
} from '../../../services/supplier'

type SupplierTableRow = {
  supplierCode: string
  supplierName: string
  publicId?: string
  detail: SupplierResponseDto | null
  supplierStatus: string
  tierLevel: SupplierTierLevel
  cells: string[]
}

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 협력사 관리',
    title: '협력사 관리',
    subtitle: '국가, 품목군, 납기, 품질 기준으로 협력사 포트폴리오를 운영합니다.',
    metrics: [
      { label: '총 협력사', value: '48', meta: '22개 국가', tone: 'nominal' },
      { label: '위험 협력사', value: '7', meta: '성과 이슈', tone: 'warning' },
      { label: '평균 납기 준수', value: '88%', meta: '최근 90일', tone: 'info' },
      { label: '평균 리드타임', value: '18일', meta: '글로벌 평균', tone: 'nominal' },
    ],
    tabs: ['전체', '활성', '위험', '검토 중'],
    searchPlaceholder: '협력사명, 국가, 품목군 검색...',
    exportLabel: '내보내기',
    createLabel: '협력사 등록',
    tableTitle: '협력사 레지스트리',
    columns: ['CODE', '협력사', '협력사 단계', '납기율', '협력사 점수', '품질 점수', '발주 수', '누적 금액', '상태'],
    topTitle: '상위 성과 협력사',
    riskTitle: '주의 필요',
    regionTitle: '권역별 지출',
  },
  en: {
    eyebrow: 'Supply Chain Ops / Suppliers',
    title: 'Supplier Directory',
    subtitle: 'Operate supplier portfolio by country, category, lead time, and quality performance.',
    metrics: [
      { label: 'TOTAL SUPPLIERS', value: '48', meta: '22 COUNTRIES', tone: 'nominal' },
      { label: 'AT RISK', value: '7', meta: 'PERFORMANCE ISSUES', tone: 'warning' },
      { label: 'ON-TIME RATE', value: '88%', meta: 'ROLLING 90 DAYS', tone: 'info' },
      { label: 'AVG LEAD TIME', value: '18d', meta: 'GLOBAL AVG', tone: 'nominal' },
    ],
    tabs: ['ALL', 'ACTIVE', 'AT RISK', 'UNDER REVIEW'],
    searchPlaceholder: 'Search supplier, country, or category...',
    exportLabel: 'EXPORT',
    createLabel: 'ADD SUPPLIER',
    tableTitle: 'Supplier Registry',
    columns: ['CODE', 'SUPPLIER', 'LEVEL', 'ON-TIME RATE', 'SUPPLIER SCORE', 'QUALITY', 'PO COUNT', 'TOTAL AMOUNT', 'STATUS'],
    topTitle: 'Top Performers',
    riskTitle: 'Needs Attention',
    regionTitle: 'Spend by Region',
  },
}



const TOP_ROWS = {
  ko: [
    ['SKF Nordic', '스웨덴 · 베어링', '98%'],
    ['토레이', '일본 · 복합재', '96%'],
    ['폭스콘', '대만 · 전자', '91%'],
  ],
  en: [
    ['SKF Nordic', 'Sweden · Bearings', '98%'],
    ['Toray', 'Japan · Composites', '96%'],
    ['Foxconn', 'Taiwan · Electronics', '91%'],
  ],
}

const RISK_ROWS = {
  ko: [
    ['실링크', '전력 이슈로 생산량 -15%'],
    ['헬릭스 GmbH', '통관 지연으로 ETA 변동'],
    ['파커', '품질 편차 재검토 필요'],
  ],
  en: [
    ['SiLink', 'Output dropped 15% after power disruption'],
    ['Helix GmbH', 'Customs delay impacting ETA'],
    ['Parker', 'Quality variance requires review'],
  ],
}

const REGION_ROWS = {
  ko: [
    ['아시아 태평양', '₩142억', '100%'],
    ['유럽', '₩88억', '62%'],
    ['북미', '₩41억', '29%'],
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


const rows = ref<SupplierTableRow[]>([])
const errorMessage = ref('')

const detailModalOpen = ref(false)
const detailLoading = ref(false)
const detailErrorMessage = ref('')
const selectedSupplier = ref<SupplierResponseDto | null>(null)

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
  return `${value.toLocaleString('ko-KR')}원`
}

function tierText(value: SupplierTierLevel) {
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

function supplierStatusText(value: string) {
  switch (value) {
    case 'ACTIVE':
      return '정상 거래중'
    case 'INACTIVE':
      return '비활성'
    case 'SUSPENDED':
      return '일시 정지'
    case 'TERMINATED':
      return '계약 해지'
    default:
      return value
  }
}

function toDisplayRow(supplier: SupplierListResponseDto): SupplierTableRow {
  return {
    supplierCode: supplier.supplierCode,
    supplierName: supplier.supplierName,
    publicId: supplier.detail?.publicId,
    detail: supplier.detail,
    supplierStatus: supplier.detail?.supplierStatus ?? supplier.status,
    tierLevel: supplier.tierLevel,
    cells: [
      supplier.supplierCode || '-',
      supplier.supplierName || '-',
      tierText(supplier.tierLevel),
      formatPercent(supplier.onTimeRate),
      formatNumber(supplier.supplierScore),
      formatNumber(supplier.qualityScore),
      formatNumber(supplier.purchaseOrderCount),
      formatAmount(supplier.cumulativeAmount),
      supplierStatusText(supplier.detail?.supplierStatus ?? supplier.status),
    ],
  }
}


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

const search = ref('')
const activeTab = ref<string>('ALL')

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const tab = activeTab.value

  return rows.value.filter((row) => {
    const matchesQuery = !query || row.cells.some((cell) => cell.toLowerCase().includes(query))
    if (!matchesQuery) return false

    if (tab === 'ALL' || tab === '전체') return true
if (tab === 'ACTIVE' || tab === '정상 거래중') return row.supplierStatus === 'ACTIVE'
if (tab === 'INACTIVE' || tab === '비활성') return row.supplierStatus === 'INACTIVE'
if (tab === 'SUSPENDED' || tab === '일시 정지') return row.supplierStatus === 'SUSPENDED'
if (tab === 'TERMINATED' || tab === '계약 해지') return row.supplierStatus === 'TERMINATED'

    return true
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
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>⌕</span>
            <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
          </label>
          <div class="terminal-page__tabs">
            <button
              v-for="tab in content.tabs"
              :key="tab"
              :class="['terminal-page__tab', { 'is-active': activeTab === tab }]"
              type="button"
              @click="activeTab = tab"
            >
              {{ tab }}
            </button>
          </div>
        </section>

        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">SUPPLIER</div><h3>{{ content.tableTitle }}</h3></div>
            <span class="page-panel__chip">{{ filteredRows.length }}</span>
          </div>
          <div class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>
            <div v-for="row in filteredRows" :key="row.publicId ?? row.supplierCode" class="page-table__row">
              <span v-for="(cell, index) in row.cells" :key="`${row.publicId ?? row.supplierCode}-${index}`">
                <button
                  v-if="index === 1"
                  type="button"
                  @click="row.publicId && openSupplierDetail(row.publicId)"
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
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">TOP</div><h3>{{ content.topTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[name, meta, value] in topRows" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ meta }}</span>
              <strong class="page-feed__text">{{ name }}</strong>
              <span>{{ value }}</span>
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">WATCH</div><h3>{{ content.riskTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[name, reason] in riskRows" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ name }}</span>
              <strong class="page-feed__text">{{ reason }}</strong>
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">REGION</div><h3>{{ content.regionTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[label, value, width] in regionRows" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ value }}</strong>
              <div class="terminal-page__bar"><span :style="{ width }" /></div>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>
  <BaseModal
  v-model="detailModalOpen"
  title="협력사 상세 조회"
  :description="selectedSupplier?.supplierName || '선택한 협력사 상세 정보를 확인합니다.'"
  size="md"
  @close="closeSupplierDetail"
>
  <div v-if="detailLoading" class="page-feed">
    <div class="page-feed__item">
      <strong class="page-feed__text">협력사 상세 정보를 불러오는 중...</strong>
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
      <span class="page-feed__label">조직 PUBLIC ID</span>
      <strong class="page-feed__text">{{ selectedSupplier.organizationPublicId }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">협력사 코드</span>
      <strong class="page-feed__text">{{ selectedSupplier.supplierCode }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">협력사명</span>
      <strong class="page-feed__text">{{ selectedSupplier.supplierName }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">협력사 단계</span>
      <strong class="page-feed__text">{{ tierText(selectedSupplier.tierLevel) }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">거래 상태</span>
      <strong class="page-feed__text">{{ supplierStatusText(selectedSupplier.supplierStatus) }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">담당자명</span>
      <strong class="page-feed__text">{{ selectedSupplier.primaryContactName || '-' }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">담당자 이메일</span>
      <strong class="page-feed__text">{{ selectedSupplier.primaryContactEmail || '-' }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">담당자 연락처</span>
      <strong class="page-feed__text">{{ selectedSupplier.primaryContactPhone || '-' }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">생성일</span>
      <strong class="page-feed__text">{{ selectedSupplier.createdAt }}</strong>
    </div>

    <div class="page-feed__item">
      <span class="page-feed__label">수정일</span>
      <strong class="page-feed__text">{{ selectedSupplier.updatedAt }}</strong>
    </div>
  </div>
</BaseModal>
</template>
