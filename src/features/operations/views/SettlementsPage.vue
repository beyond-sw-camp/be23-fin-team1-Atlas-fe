<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  getSettlement,
  getSettlements,
  getSettlementStatistics,
  saveSettlementBudget,
  type SettlementCurrency,
  type SettlementListResponseDto,
  type SettlementResponseDto,
  type SettlementStatisticsResponseDto,
  type SettlementTargetType,
} from '../../../services/settlement'
import {
  getSuppliers,
  type SupplierListResponseDto,
  type SupplierResponseDto,
} from '../../../services/supplier'
import {
  getReturnRequests,
  type ReturnRequestResponseDto,
} from '../../../services/return'
import {
  getShipments,
  type ShipmentListResponseDto as ShipmentOptionDto,
} from '../../../services/shipment'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 정산',
    title: '정산 관리',
    subtitle: '배송과 반품 완료로 자동 생성된 정산 명세와 예산 사용 현황을 확인합니다.',
    listEyebrow: 'SETTLEMENT LEDGER',
    listTitle: '정산 명세 목록',
    detailEyebrow: 'DETAIL',
    detailTitle: '정산 명세 상세',
    itemEyebrow: 'DETAIL ITEMS',
    itemTitle: '상세 항목',
    selectLabel: '상세',
    emptyList: '정산 명세가 없습니다.',
    loadingList: '정산 명세를 불러오는 중입니다.',
    loadingDetail: '정산 상세를 불러오는 중입니다.',
    emptyDetail: '왼쪽 목록에서 정산 명세를 선택해주세요.',
    emptyDetails: '상세 항목이 없습니다.',
    fields: {
      id: '정산 ID',
      supplier: '공급업체',
      targetType: '유형',
      targetSelection: '정산 대상',
      period: '정산 기간',
      amount: '정산 금액',
      currencyCode: '통화',
      createdAt: '생성 일시',
      updatedAt: '수정 일시',
      poItemId: 'PO ITEM ID',
      itemId: 'ITEM ID',
      qty: '수량',
      unitPrice: '단가',
      detailAmount: '금액',
    },
    targetTypes: {
      SHIPMENT: '출하',
      RETURN: '반품',
      DELIVERY_EXCEPTION: '배송 예외',
    },
  },
  en: {
    eyebrow: 'SUPPLY CHAIN OPS / SETTLEMENTS',
    title: 'Settlement Management',
    subtitle: 'Review auto-generated settlement ledger and budget usage.',
    listEyebrow: 'SETTLEMENT LEDGER',
    listTitle: 'Settlement Ledger',
    detailEyebrow: 'DETAIL',
    detailTitle: 'Settlement Detail',
    itemEyebrow: 'DETAIL ITEMS',
    itemTitle: 'Detail Items',
    selectLabel: 'Detail',
    emptyList: 'No settlement ledger found.',
    loadingList: 'Loading settlements...',
    loadingDetail: 'Loading settlement detail...',
    emptyDetail: 'Select a settlement from the list.',
    emptyDetails: 'No detail items.',
    fields: {
      id: 'ID',
      supplier: 'Supplier',
      targetType: 'Type',
      targetSelection: 'Target',
      period: 'Period',
      amount: 'Amount',
      currencyCode: 'Currency',
      createdAt: 'Created At',
      updatedAt: 'Updated At',
      poItemId: 'PO ITEM ID',
      itemId: 'ITEM ID',
      qty: 'Qty',
      unitPrice: 'Unit Price',
      detailAmount: 'Amount',
    },
    targetTypes: {
      SHIPMENT: 'Shipment',
      RETURN: 'Return',
      DELIVERY_EXCEPTION: 'Delivery Exception',
    },
  },
} as const

const content = computed(() => CONTENT[preferences.language])

type SettlementBudgetForm = {
  year: number
  month: number
  budgetAmount: number
  currencyCode: SettlementCurrency
  warningThresholdRate: number
}

type SettlementInsightChartView = 'targetTypeAmount' | 'flowAmount'
type MonthlyBudgetRange = 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'RECENT_6'

const activeInsightChartView = ref<SettlementInsightChartView>('targetTypeAmount')
const monthlyBudgetRange = ref<MonthlyBudgetRange>('ALL')

const settlements = ref<SettlementListResponseDto[]>([])
const selectedSettlement = ref<SettlementResponseDto | null>(null)

const settlementStatistics = ref<SettlementStatisticsResponseDto | null>(null)
const isStatisticsLoading = ref(false)
const statisticsErrorMessage = ref('')
const statisticsYear = ref(new Date().getFullYear())

const supplierOptions = ref<SupplierResponseDto[]>([])
const shipmentOptions = ref<ShipmentOptionDto[]>([])
const returnOptions = ref<ReturnRequestResponseDto[]>([])

const isListLoading = ref(false)
const isDetailLoading = ref(false)
const isSupplierOptionsLoading = ref(false)
const isShipmentOptionsLoading = ref(false)
const isReturnOptionsLoading = ref(false)

const listErrorMessage = ref('')
const detailErrorMessage = ref('')

const isBudgetModalOpen = ref(false)
const isBudgetSubmitting = ref(false)
const budgetErrorMessage = ref('')

const budgetForm = ref<SettlementBudgetForm>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  budgetAmount: 0,
  currencyCode: 'KRW',
  warningThresholdRate: 80,
})

const CHART_MONTH_LABELS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
]

// 월별 예산 대비 지급 정산액 차트 데이터입니다.
const monthlyBudgetChartPoints = computed(() => {
  const source = new Map(
    (settlementStatistics.value?.monthlyBudgetUsages ?? []).map((point) => [
      Number(point.month),
      point,
    ]),
  )

  return CHART_MONTH_LABELS.map((label, index) => {
    const monthNumber = index + 1
    const point = source.get(monthNumber)

    return {
      month: monthNumber,
      label,
      budgetAmount: Number(point?.budgetAmount ?? 0),
      payableAmount: Number(point?.payableAmount ?? 0),
      remainingAmount: Number(point?.remainingAmount ?? 0),
      usageRate: Number(point?.usageRate ?? 0),
      status: point?.status ?? 'NO_BUDGET',
    }
  })
})

// 사용자가 누른 범위 버튼에 맞춰 차트에 보여줄 월만 골라냅니다.
const visibleMonthlyBudgetChartPoints = computed(() => {
  switch (monthlyBudgetRange.value) {
    case 'Q1':
      return monthlyBudgetChartPoints.value.slice(0, 3)
    case 'Q2':
      return monthlyBudgetChartPoints.value.slice(3, 6)
    case 'Q3':
      return monthlyBudgetChartPoints.value.slice(6, 9)
    case 'Q4':
      return monthlyBudgetChartPoints.value.slice(9, 12)
    case 'RECENT_6':
      return monthlyBudgetChartPoints.value.slice(6, 12)
    default:
      return monthlyBudgetChartPoints.value
  }
})

const hasMonthlyBudgetChartData = computed(() => {
  return monthlyBudgetChartPoints.value.some((point) => {
    return point.budgetAmount > 0 || point.payableAmount > 0
  })
})

const monthlyPayableTotalAmount = computed(() => {
  return monthlyBudgetChartPoints.value.reduce((sum, point) => {
    return sum + point.payableAmount
  }, 0)
})

// 예산과 지급 정산액을 둘 다 막대 그래프로 보여줍니다.
const monthlyBudgetChartSeries = computed(() => {
  return [
    {
      name: '예산',
      data: visibleMonthlyBudgetChartPoints.value.map((point) => point.budgetAmount),
    },
    {
      name: '지급 정산액',
      data: visibleMonthlyBudgetChartPoints.value.map((point) => point.payableAmount),
    },
  ]
})

const monthlyBudgetChartOptions = computed(() => {
  return {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '52%',
        borderRadius: 6,
      },
    },
    colors: ['#cbd5e1', '#334155'],
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: '#edf1f7',
      strokeDashArray: 4,
    },
    xaxis: {
      categories: visibleMonthlyBudgetChartPoints.value.map((point) => point.label),
      labels: {
        style: {
          colors: '#98a2b3',
          fontSize: '11px',
          fontWeight: 800,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => Number(value).toLocaleString(),
        style: {
          colors: '#98a2b3',
          fontSize: '11px',
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (value: number) => `${Number(value).toLocaleString()} KRW`,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontWeight: 800,
      labels: {
        colors: '#667085',
      },
    },
  }
})

// 정산 유형별 금액 차트 데이터입니다.
const targetTypeChartPoints = computed(() => {
  return settlementStatistics.value?.targetTypeAmounts ?? []
})

// 도넛은 금액 기준입니다. 반품 금액은 음수일 수 있어서 절댓값으로 표시합니다.
const targetTypeDonutChartSeries = computed(() => {
  return targetTypeChartPoints.value.map((point) => Math.abs(Number(point.amount ?? 0)))
})

const targetTypeDonutChartLabels = computed(() => {
  return targetTypeChartPoints.value.map((point) => point.label)
})

const hasTargetTypeChartData = computed(() => {
  return targetTypeDonutChartSeries.value.some((value) => value > 0)
})

const targetTypeAmountTotal = computed(() => {
  return targetTypeDonutChartSeries.value.reduce((sum, value) => sum + value, 0)
})

const targetTypeDonutChartOptions = computed(() => {
  return {
    labels: targetTypeDonutChartLabels.value,
    colors: ['#334155', '#10b981', '#f59e0b'],
    chart: {
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
      toolbar: { show: false },
    },
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontWeight: 800,
      labels: {
        colors: '#667085',
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            total: {
              show: true,
              label: '합계',
              formatter: () => `${targetTypeAmountTotal.value.toLocaleString()} KRW`,
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (value: number) => `${Number(value).toLocaleString()} KRW`,
      },
    },
  }
})

const currentMonthNetFlow = computed(() => {
  return (
    Number(settlementStatistics.value?.receivableAmountThisMonth ?? 0) -
    Number(settlementStatistics.value?.payableAmountThisMonth ?? 0)
  )
})

const settlementFlowAmountChartSeries = computed(() => {
  return [
    {
      name: '금액',
      data: [
        Number(settlementStatistics.value?.payableAmountThisMonth ?? 0),
        Number(settlementStatistics.value?.receivableAmountThisMonth ?? 0),
        Math.abs(currentMonthNetFlow.value),
      ],
    },
  ]
})

const settlementFlowAmountMax = computed(() => {
  return Math.max(...settlementFlowAmountChartSeries.value[0].data, 1)
})

const settlementFlowAmountChartOptions = computed(() => {
  return {
    chart: {
      type: 'bar',
      toolbar: { show: false },
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
    },
    colors: ['#334155'],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        barHeight: '48%',
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (value: number) => `${Number(value).toLocaleString()} KRW`,
      style: {
        fontSize: '11px',
        fontWeight: 900,
      },
    },
    xaxis: {
      min: 0,
      max: settlementFlowAmountMax.value,
      categories: ['지급 예정', '수금 예정', '순흐름'],
      labels: {
        formatter: (value: number) => Number(value).toLocaleString(),
      },
    },
    grid: {
      borderColor: '#edf1f7',
      strokeDashArray: 4,
    },
    legend: { show: false },
    tooltip: {
      y: {
        formatter: (value: number) => `${Number(value).toLocaleString()} KRW`,
      },
    },
  }
})

function resetBudgetForm() {
  budgetErrorMessage.value = ''
  budgetForm.value = {
    year: statisticsYear.value,
    month: new Date().getMonth() + 1,
    budgetAmount: Number(settlementStatistics.value?.currentMonthBudgetAmount ?? 0),
    currencyCode: 'KRW',
    warningThresholdRate: 80,
  }
}

function openBudgetModal() {
  resetBudgetForm()
  isBudgetModalOpen.value = true
}

function closeBudgetModal() {
  isBudgetModalOpen.value = false
  resetBudgetForm()
}

function validateBudgetForm() {
  if (!Number.isInteger(budgetForm.value.year) || budgetForm.value.year < 2000) {
    return '예산 연도를 확인해주세요.'
  }

  if (!Number.isInteger(budgetForm.value.month) || budgetForm.value.month < 1 || budgetForm.value.month > 12) {
    return '예산 월은 1월부터 12월까지만 입력할 수 있습니다.'
  }

  if (!Number.isFinite(budgetForm.value.budgetAmount) || budgetForm.value.budgetAmount < 0) {
    return '예산 금액은 0 이상이어야 합니다.'
  }

  if (
    !Number.isFinite(budgetForm.value.warningThresholdRate) ||
    budgetForm.value.warningThresholdRate < 0 ||
    budgetForm.value.warningThresholdRate > 100
  ) {
    return '경고 기준은 0부터 100 사이로 입력해주세요.'
  }

  return ''
}

async function handleSaveBudget() {
  budgetErrorMessage.value = ''

  const validationMessage = validateBudgetForm()
  if (validationMessage) {
    budgetErrorMessage.value = validationMessage
    return
  }

  isBudgetSubmitting.value = true

  try {
    await saveSettlementBudget({
      year: Number(budgetForm.value.year),
      month: Number(budgetForm.value.month),
      budgetAmount: Number(budgetForm.value.budgetAmount),
      currencyCode: budgetForm.value.currencyCode,
      warningThresholdRate: Number(budgetForm.value.warningThresholdRate),
    })

    closeBudgetModal()
    await fetchSettlementStatistics()
  } catch (err: any) {
    console.error('Failed to save settlement budget:', err)
    budgetErrorMessage.value =
      err?.payload?.message ||
      err?.response?.data?.message ||
      err?.message ||
      '예산 저장에 실패했습니다.'
  } finally {
    isBudgetSubmitting.value = false
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.length >= 16 ? value.substring(0, 16).replace('T', ' ') : value
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return '-'
  return `${startDate ?? '-'} ~ ${endDate ?? '-'}`
}

function formatAmount(value?: number | null, currency?: string | null) {
  if (value == null) return '-'
  return `${Number(value).toLocaleString()}${currency ? ` ${currency}` : ''}`
}

function formatStatisticsAmount(value?: number | null) {
  if (value == null) return '-'
  return `${Number(value).toLocaleString()} KRW`
}

function formatRate(value?: number | null) {
  if (value == null) return '-'
  return `${Number(value).toLocaleString()}%`
}

function formatTargetType(value: SettlementTargetType) {
  return content.value.targetTypes[value as keyof typeof content.value.targetTypes] ?? value
}

function getSupplierLabel(publicId: string) {
  const supplier = supplierOptions.value.find((item) => item.publicId === publicId)
  if (!supplier) return publicId
  return `${supplier.supplierName} (${supplier.supplierCode})`
}

function getTargetLabel(targetType: SettlementTargetType, targetPublicId: string) {
  if (targetType === 'RETURN') {
    const target = returnOptions.value.find((item) => item.publicId === targetPublicId)
    return target ? `${target.returnNumber} / ${target.returnType}` : targetPublicId
  }

  if (targetType === 'SHIPMENT') {
    const target = shipmentOptions.value.find((item) => item.publicId === targetPublicId)
    return target ? `${target.shipmentNumber} / ${target.carrierName}` : targetPublicId
  }

  return targetPublicId
}

async function loadSupplierOptions() {
  isSupplierOptionsLoading.value = true

  try {
    const response = await getSuppliers({ page: 0, size: 100 })

    supplierOptions.value = (response.content ?? [])
      .map((supplier: SupplierListResponseDto) => supplier.detail)
      .filter((supplier): supplier is SupplierResponseDto => supplier !== null)
  } catch (err) {
    console.error('Failed to load suppliers:', err)
    supplierOptions.value = []
  } finally {
    isSupplierOptionsLoading.value = false
  }
}

async function loadShipmentOptions() {
  isShipmentOptionsLoading.value = true

  try {
    const response = await getShipments({
      page: 0,
      size: 100,
      sort: 'id,desc',
    })

    shipmentOptions.value = response.content ?? []
  } catch (err) {
    console.error('Failed to load shipments:', err)
    shipmentOptions.value = []
  } finally {
    isShipmentOptionsLoading.value = false
  }
}

async function loadReturnOptions() {
  isReturnOptionsLoading.value = true

  try {
    const response = await getReturnRequests({
      page: 0,
      size: 100,
      returnStatus: 'COMPLETED',
    })

    returnOptions.value = response.content ?? []
  } catch (err) {
    console.error('Failed to load returns:', err)
    returnOptions.value = []
  } finally {
    isReturnOptionsLoading.value = false
  }
}

async function fetchSettlements() {
  isListLoading.value = true
  listErrorMessage.value = ''

  try {
    const response = await getSettlements(0, 20)
    settlements.value = response.content
  } catch (err: any) {
    console.error('Failed to fetch settlements:', err)
    settlements.value = []
    listErrorMessage.value = err?.message ?? 'Failed to load settlements.'
  } finally {
    isListLoading.value = false
  }
}

async function fetchSettlementStatistics() {
  isStatisticsLoading.value = true
  statisticsErrorMessage.value = ''

  try {
    settlementStatistics.value = await getSettlementStatistics(statisticsYear.value)
  } catch (err: any) {
    console.error('Failed to fetch settlement statistics:', err)

    settlementStatistics.value = null
    statisticsErrorMessage.value =
      err?.payload?.message ||
      err?.response?.data?.message ||
      err?.message ||
      '정산 통계 데이터를 불러오지 못했습니다.'
  } finally {
    isStatisticsLoading.value = false
  }
}

async function refreshSettlementPage() {
  await Promise.all([
    fetchSettlements(),
    fetchSettlementStatistics(),
  ])
}

async function handleSettlementSelect(settlementPublicId: string) {
  isDetailLoading.value = true
  detailErrorMessage.value = ''

  try {
    selectedSettlement.value = await getSettlement(settlementPublicId)
  } catch (err: any) {
    console.error('Failed to fetch settlement detail:', err)
    selectedSettlement.value = null
    detailErrorMessage.value = err?.message ?? 'Failed to load settlement detail.'
  } finally {
    isDetailLoading.value = false
  }
}

onMounted(() => {
  refreshSettlementPage()
  loadSupplierOptions()
  loadShipmentOptions()
  loadReturnOptions()
})
</script>

<template>
  <section class="stl-page">
    <header class="stl-page__header">
      <div>
        <div class="stl-breadcrumb">
          <span>{{ content.eyebrow }}</span>
        </div>

        <h1 class="stl-page__title">{{ content.title }}</h1>
        <p class="stl-page__desc">{{ content.subtitle }}</p>
      </div>

      <div class="stl-page__actions">
        <button class="stl-btn stl-btn--ghost" type="button" @click="refreshSettlementPage">
          새로고침
        </button>

        <button class="stl-btn stl-btn--primary" type="button" @click="openBudgetModal">
          예산 등록
        </button>
      </div>
    </header>

    <div v-if="statisticsErrorMessage" class="stl-alert stl-alert--error">
      {{ statisticsErrorMessage }}
    </div>

    <section class="stl-kpi-row">
      <article class="stl-kpi-card">
        <div class="stl-kpi-card__icon stl-kpi-card__icon--blue">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5" />
            <path d="M2 7H16" stroke="currentColor" stroke-width="1.5" />
            <circle cx="5.5" cy="10.5" r="1" fill="currentColor" />
          </svg>
        </div>

        <div class="stl-kpi-card__body">
          <span class="stl-kpi-card__label">이번 달 예산</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatStatisticsAmount(settlementStatistics?.currentMonthBudgetAmount) }}
          </strong>
          <span class="stl-kpi-card__sub">월 예산 기준</span>
        </div>
      </article>

      <article class="stl-kpi-card">
        <div class="stl-kpi-card__icon stl-kpi-card__icon--amber">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M9 5.5V9L11.5 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>

        <div class="stl-kpi-card__body">
          <span class="stl-kpi-card__label">이번 달 지급 정산액</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatStatisticsAmount(settlementStatistics?.payableAmountThisMonth) }}
          </strong>
          <span class="stl-kpi-card__sub">예산 사용액 기준</span>
        </div>
      </article>

      <article class="stl-kpi-card">
        <div class="stl-kpi-card__icon stl-kpi-card__icon--emerald">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9.5L7.5 13L14 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <div class="stl-kpi-card__body">
          <span class="stl-kpi-card__label">예산 사용률</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatRate(settlementStatistics?.currentMonthBudgetUsageRate) }}
          </strong>
          <span class="stl-kpi-card__sub">
            {{ settlementStatistics?.currentMonthBudgetStatus ?? 'NO_BUDGET' }}
          </span>
        </div>
      </article>

      <article class="stl-kpi-card">
        <div class="stl-kpi-card__icon stl-kpi-card__icon--green">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="3" y="4" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.5" />
            <path d="M6 8H12M6 11H10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </div>

        <div class="stl-kpi-card__body">
          <span class="stl-kpi-card__label">이번 달 수금 예정</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatStatisticsAmount(settlementStatistics?.receivableAmountThisMonth) }}
          </strong>
          <span class="stl-kpi-card__sub">받을 정산액 기준</span>
        </div>
      </article>
    </section>

    <section class="stl-chart-layout">
      <article class="stl-card stl-chart-card stl-chart-card--monthly">
        <div class="stl-card__head stl-card__head--chart">
          <div>
            <span class="stl-card__eyebrow">BUDGET VS SETTLEMENT</span>
            <h3 class="stl-card__title">월별 예산 대비 지급 정산액</h3>
          </div>

          <div class="stl-chart-total">
            <span>연간 지급 정산액</span>
            <strong>{{ formatStatisticsAmount(monthlyPayableTotalAmount) }}</strong>
          </div>
        </div>

        <div class="stl-chart-tabs">
          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'ALL' }"
            type="button"
            @click="monthlyBudgetRange = 'ALL'"
          >
            전체
          </button>

          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q1' }"
            type="button"
            @click="monthlyBudgetRange = 'Q1'"
          >
            1분기
          </button>

          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q2' }"
            type="button"
            @click="monthlyBudgetRange = 'Q2'"
          >
            2분기
          </button>

          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q3' }"
            type="button"
            @click="monthlyBudgetRange = 'Q3'"
          >
            3분기
          </button>

          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q4' }"
            type="button"
            @click="monthlyBudgetRange = 'Q4'"
          >
            4분기
          </button>

          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'RECENT_6' }"
            type="button"
            @click="monthlyBudgetRange = 'RECENT_6'"
          >
            최근 6개월
          </button>
        </div>

        <div v-if="isStatisticsLoading" class="stl-empty">
          <div class="stl-spinner"></div>
          통계 데이터를 불러오는 중입니다.
        </div>

        <div v-else-if="!hasMonthlyBudgetChartData" class="stl-empty">
          예산 또는 정산 데이터가 없습니다.
        </div>

        <apexchart
          v-else
          type="bar"
          height="330"
          :options="monthlyBudgetChartOptions"
          :series="monthlyBudgetChartSeries"
        />
      </article>
    </section>

    <section class="stl-insight-grid">
      <article class="stl-card stl-chart-card stl-chart-card--insight">
        <div class="stl-card__head">
          <div>
            <span class="stl-card__eyebrow">SETTLEMENT AMOUNT</span>
            <h3 class="stl-card__title">정산 금액 분석</h3>
          </div>
        </div>

        <div class="stl-chart-tabs">
          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': activeInsightChartView === 'targetTypeAmount' }"
            type="button"
            @click="activeInsightChartView = 'targetTypeAmount'"
          >
            정산 유형별 금액
          </button>

          <button
            class="stl-chart-tab"
            :class="{ 'stl-chart-tab--active': activeInsightChartView === 'flowAmount' }"
            type="button"
            @click="activeInsightChartView = 'flowAmount'"
          >
            지급/수금 비교
          </button>
        </div>

        <div v-if="isStatisticsLoading" class="stl-empty stl-empty--sm">
          통계 데이터를 불러오는 중입니다.
        </div>

        <div
          v-else-if="activeInsightChartView === 'targetTypeAmount' && !hasTargetTypeChartData"
          class="stl-empty stl-empty--sm"
        >
          정산 유형 금액이 없습니다.
        </div>

        <apexchart
          v-else-if="activeInsightChartView === 'targetTypeAmount'"
          type="donut"
          height="260"
          :options="targetTypeDonutChartOptions"
          :series="targetTypeDonutChartSeries"
        />

        <apexchart
          v-else
          type="bar"
          height="260"
          :options="settlementFlowAmountChartOptions"
          :series="settlementFlowAmountChartSeries"
        />
      </article>

      <article class="stl-card stl-chart-card stl-chart-card--flow">
        <div class="stl-card__head">
          <div>
            <span class="stl-card__eyebrow">SETTLEMENT FLOW</span>
            <h3 class="stl-card__title">이번 달 정산 흐름</h3>
          </div>
        </div>

        <div v-if="isStatisticsLoading" class="stl-empty stl-empty--sm">
          통계 데이터를 불러오는 중입니다.
        </div>

        <div v-else class="stl-flow-summary">
          <div class="stl-flow-summary__row">
            <span>지급 예정</span>
            <strong>{{ formatStatisticsAmount(settlementStatistics?.payableAmountThisMonth) }}</strong>
          </div>

          <div class="stl-flow-summary__row">
            <span>수금 예정</span>
            <strong>{{ formatStatisticsAmount(settlementStatistics?.receivableAmountThisMonth) }}</strong>
          </div>

          <div class="stl-flow-summary__row">
            <span>예산 잔액</span>
            <strong>{{ formatStatisticsAmount(settlementStatistics?.currentMonthRemainingBudgetAmount) }}</strong>
          </div>

          <div class="stl-flow-summary__row stl-flow-summary__row--strong">
            <span>순흐름</span>
            <strong>{{ formatStatisticsAmount(currentMonthNetFlow) }}</strong>
          </div>
        </div>
      </article>
    </section>

    <section class="stl-main-grid">
      <article class="stl-card stl-card--list">
        <div class="stl-card__head">
          <div>
            <span class="stl-card__eyebrow">{{ content.listEyebrow }}</span>
            <h3 class="stl-card__title">{{ content.listTitle }}</h3>
          </div>
          <span class="stl-chip">{{ settlements.length }}</span>
        </div>

        <div v-if="isListLoading" class="stl-empty">
          <div class="stl-spinner"></div>
          {{ content.loadingList }}
        </div>

        <div v-else-if="listErrorMessage" class="stl-empty stl-empty--error">
          {{ listErrorMessage }}
        </div>

        <div v-else-if="settlements.length === 0" class="stl-empty">
          {{ content.emptyList }}
        </div>

        <div v-else class="stl-table-wrap">
          <table class="stl-table">
            <thead>
              <tr>
                <th>{{ content.fields.id }}</th>
                <th>{{ content.fields.supplier }}</th>
                <th>{{ content.fields.targetType }}</th>
                <th>{{ content.fields.amount }}</th>
                <th>{{ content.fields.createdAt }}</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="settlement in settlements"
                :key="settlement.publicId"
                class="stl-table__row"
                :class="{ 'stl-table__row--active': selectedSettlement?.publicId === settlement.publicId }"
                @click="handleSettlementSelect(settlement.publicId)"
              >
                <td class="stl-table__id">{{ settlement.id }}</td>
                <td>{{ getSupplierLabel(settlement.supplierPublicId) }}</td>
                <td>
                  <span class="stl-type-badge">
                    {{ formatTargetType(settlement.targetType) }}
                  </span>
                </td>
                <td class="stl-table__amount">
                  {{ formatAmount(settlement.amount, settlement.currencyCode) }}
                </td>
                <td>{{ formatDate(settlement.createdAt) }}</td>
                <td>
                  <button
                    class="stl-btn stl-btn--row"
                    type="button"
                    @click.stop="handleSettlementSelect(settlement.publicId)"
                  >
                    {{ content.selectLabel }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="stl-card stl-card--detail">
        <div class="stl-card__head">
          <div>
            <span class="stl-card__eyebrow">{{ content.detailEyebrow }}</span>
            <h3 class="stl-card__title">{{ content.detailTitle }}</h3>
          </div>
        </div>

        <div v-if="isDetailLoading" class="stl-empty">
          <div class="stl-spinner"></div>
          {{ content.loadingDetail }}
        </div>

        <div v-else-if="detailErrorMessage" class="stl-empty stl-empty--error">
          {{ detailErrorMessage }}
        </div>

        <div v-else-if="!selectedSettlement" class="stl-empty stl-empty--hint">
          {{ content.emptyDetail }}
        </div>

        <template v-else>
          <div class="stl-detail-grid">
            <div class="stl-detail-item">
              <span class="stl-detail-item__label">{{ content.fields.id }}</span>
              <span class="stl-detail-item__val">{{ selectedSettlement.id }}</span>
            </div>

            <div class="stl-detail-item">
              <span class="stl-detail-item__label">{{ content.fields.amount }}</span>
              <span class="stl-detail-item__val stl-detail-item__val--amount">
                {{ formatAmount(selectedSettlement.amount, selectedSettlement.currencyCode) }}
              </span>
            </div>

            <div class="stl-detail-item">
              <span class="stl-detail-item__label">{{ content.fields.supplier }}</span>
              <span class="stl-detail-item__val">
                {{ getSupplierLabel(selectedSettlement.supplierPublicId) }}
              </span>
            </div>

            <div class="stl-detail-item">
              <span class="stl-detail-item__label">{{ content.fields.targetType }}</span>
              <span class="stl-detail-item__val">
                {{ formatTargetType(selectedSettlement.targetType) }}
              </span>
            </div>

            <div class="stl-detail-item stl-detail-item--wide">
              <span class="stl-detail-item__label">{{ content.fields.targetSelection }}</span>
              <span class="stl-detail-item__val">
                {{ getTargetLabel(selectedSettlement.targetType, selectedSettlement.targetPublicId) }}
              </span>
            </div>

            <div class="stl-detail-item stl-detail-item--wide">
              <span class="stl-detail-item__label">{{ content.fields.period }}</span>
              <span class="stl-detail-item__val">
                {{ formatDateRange(selectedSettlement.settlementPeriodStart, selectedSettlement.settlementPeriodEnd) }}
              </span>
            </div>

            <div class="stl-detail-item">
              <span class="stl-detail-item__label">{{ content.fields.createdAt }}</span>
              <span class="stl-detail-item__val">{{ formatDate(selectedSettlement.createdAt) }}</span>
            </div>

            <div class="stl-detail-item">
              <span class="stl-detail-item__label">{{ content.fields.updatedAt }}</span>
              <span class="stl-detail-item__val">{{ formatDate(selectedSettlement.updatedAt) }}</span>
            </div>
          </div>

          <div class="stl-subcard">
            <div class="stl-subcard__head">
              <div>
                <span class="stl-card__eyebrow">{{ content.itemEyebrow }}</span>
                <h4 class="stl-subcard__title">{{ content.itemTitle }}</h4>
              </div>
              <span class="stl-chip stl-chip--sm">{{ selectedSettlement.details.length }}</span>
            </div>

            <div v-if="selectedSettlement.details.length === 0" class="stl-empty stl-empty--sm">
              {{ content.emptyDetails }}
            </div>

            <div v-else class="stl-table-wrap">
              <table class="stl-table stl-table--sm">
                <thead>
                  <tr>
                    <th>{{ content.fields.poItemId }}</th>
                    <th>{{ content.fields.itemId }}</th>
                    <th>{{ content.fields.qty }}</th>
                    <th>{{ content.fields.unitPrice }}</th>
                    <th>{{ content.fields.detailAmount }}</th>
                  </tr>
                </thead>

                <tbody>
                  <tr v-for="item in selectedSettlement.details" :key="item.publicId">
                    <td>{{ item.poItemId }}</td>
                    <td>{{ item.itemId }}</td>
                    <td>{{ Number(item.qty).toLocaleString() }}</td>
                    <td>{{ Number(item.unitPrice).toLocaleString() }}</td>
                    <td class="stl-table__amount">{{ Number(item.amount).toLocaleString() }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </article>
    </section>
  </section>

  <BaseModal
    v-model="isBudgetModalOpen"
    title="월별 예산 등록"
    description="월별 예산을 등록하면 정산액과 예산 사용률을 차트에서 비교할 수 있습니다."
    size="md"
    @close="closeBudgetModal"
  >
    <div class="stl-form-grid">
      <div class="stl-field">
        <label class="stl-field__label">예산 연도</label>
        <input v-model.number="budgetForm.year" type="number" min="2000" class="stl-input" />
      </div>

      <div class="stl-field">
        <label class="stl-field__label">예산 월</label>
        <input v-model.number="budgetForm.month" type="number" min="1" max="12" class="stl-input" />
      </div>

      <div class="stl-field">
        <label class="stl-field__label">예산 금액</label>
        <input v-model.number="budgetForm.budgetAmount" type="number" min="0" step="1000" class="stl-input" />
      </div>

      <div class="stl-field">
        <label class="stl-field__label">통화</label>
        <select v-model="budgetForm.currencyCode" class="stl-select">
          <option value="KRW">KRW</option>
          <option value="DOLLAR">DOLLAR</option>
        </select>
      </div>

      <div class="stl-field">
        <label class="stl-field__label">경고 기준 (%)</label>
        <input v-model.number="budgetForm.warningThresholdRate" type="number" min="0" max="100" step="1" class="stl-input" />
      </div>

      <div class="stl-form-hint">
        예산 사용률이 경고 기준 이상이면 WARNING, 예산을 초과하면 EXCEEDED 상태로 표시됩니다.
      </div>
    </div>

    <div v-if="budgetErrorMessage" class="stl-alert stl-alert--error stl-modal-error">
      {{ budgetErrorMessage }}
    </div>

    <template #footer>
      <button class="stl-btn stl-btn--ghost" type="button" @click="closeBudgetModal">
        취소
      </button>

      <button class="stl-btn stl-btn--primary" type="button" :disabled="isBudgetSubmitting" @click="handleSaveBudget">
        {{ isBudgetSubmitting ? '저장 중...' : '예산 저장' }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.stl-page {
  --stl-bg: #f4f6f9;
  --stl-card: #ffffff;
  --stl-border: #e5e9f0;
  --stl-text-primary: #111827;
  --stl-text-secondary: #667085;
  --stl-text-muted: #98a2b3;
  --stl-blue: #2563eb;
  --stl-blue-soft: #eff6ff;
  --stl-green: #10b981;
  --stl-green-soft: #ecfdf5;
  --stl-amber: #f59e0b;
  --stl-amber-soft: #fffbeb;
  --stl-radius: 12px;
  --stl-radius-sm: 8px;
  --stl-shadow: 0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04);

  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
  padding: 28px 32px;
  color: var(--stl-text-primary);
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 28rem),
    var(--stl-bg);
  font-family: Pretendard, "Segoe UI", sans-serif;
}

.stl-page__header,
.stl-card__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.stl-breadcrumb {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--stl-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.stl-page__title {
  margin: 0 0 4px;
  font-size: 1.7rem;
  line-height: 1.15;
}

.stl-page__desc {
  margin: 0;
  color: var(--stl-text-secondary);
  font-size: 0.9rem;
}

.stl-page__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 8px 14px;
  font-family: inherit;
  font-size: 0.8125rem;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: 0.15s ease;
}

.stl-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.stl-btn--primary {
  color: #ffffff;
  background: #111827;
  border-color: #111827;
}

.stl-btn--ghost {
  color: var(--stl-text-secondary);
  background: var(--stl-card);
  border-color: var(--stl-border);
}

.stl-btn--row {
  color: var(--stl-blue);
  background: transparent;
  padding: 5px 8px;
}

.stl-alert {
  border-radius: var(--stl-radius-sm);
  padding: 10px 12px;
  font-size: 0.8125rem;
  font-weight: 700;
}

.stl-alert--error {
  color: #b42318;
  background: #fff5f5;
  border: 1px solid #fecaca;
}

.stl-modal-error {
  margin-top: 16px;
}

.stl-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stl-kpi-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-height: 92px;
  padding: 18px;
  background: var(--stl-card);
  border: 1px solid var(--stl-border);
  border-radius: var(--stl-radius);
  box-shadow: var(--stl-shadow);
}

.stl-kpi-card__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  flex: 0 0 auto;
}

.stl-kpi-card__icon--blue {
  color: var(--stl-blue);
  background: var(--stl-blue-soft);
}

.stl-kpi-card__icon--green,
.stl-kpi-card__icon--emerald {
  color: var(--stl-green);
  background: var(--stl-green-soft);
}

.stl-kpi-card__icon--amber {
  color: var(--stl-amber);
  background: var(--stl-amber-soft);
}

.stl-kpi-card__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.stl-kpi-card__label {
  color: var(--stl-text-muted);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.stl-kpi-card__value {
  margin-top: 3px;
  color: var(--stl-text-primary);
  font-size: 1.35rem;
  line-height: 1.2;
}

.stl-kpi-card__sub {
  margin-top: 3px;
  color: var(--stl-text-muted);
  font-size: 0.76rem;
  font-weight: 700;
}

.stl-card {
  background: var(--stl-card);
  border: 1px solid var(--stl-border);
  border-radius: var(--stl-radius);
  padding: 20px;
  box-shadow: var(--stl-shadow);
}

.stl-card__head {
  align-items: flex-start;
  margin-bottom: 16px;
}

.stl-card__eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--stl-text-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.11em;
}

.stl-card__title {
  margin: 0;
  color: var(--stl-text-primary);
  font-size: 1rem;
  font-weight: 900;
}

.stl-chart-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.stl-chart-card--monthly {
  min-height: 360px;
}

.stl-chart-total {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: var(--stl-text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.stl-chart-total strong {
  color: var(--stl-text-primary);
  font-size: 0.95rem;
}

.stl-insight-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 380px);
  gap: 16px;
  align-items: stretch;
}

.stl-chart-card--insight,
.stl-chart-card--flow {
  min-height: 330px;
}

.stl-chart-tabs {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  margin-bottom: 12px;
  padding: 4px;
  border: 1px solid var(--stl-border);
  border-radius: 999px;
  background: #f8fafc;
}

.stl-chart-tab {
  border: 0;
  border-radius: 999px;
  padding: 7px 12px;
  color: var(--stl-text-muted);
  background: transparent;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 900;
  cursor: pointer;
}

.stl-chart-tab--active {
  color: var(--stl-text-primary);
  background: #ffffff;
  box-shadow: var(--stl-shadow);
}

.stl-flow-summary {
  display: grid;
  gap: 12px;
}

.stl-flow-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--stl-text-secondary);
  font-size: 0.78rem;
  font-weight: 800;
}

.stl-flow-summary__row strong {
  color: var(--stl-text-primary);
  font-size: 0.82rem;
  white-space: nowrap;
}

.stl-flow-summary__row--strong {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--stl-border);
}

.stl-flow-summary__row--strong strong {
  font-size: 0.95rem;
}

.stl-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(420px, 0.85fr);
  gap: 16px;
  align-items: start;
}

.stl-chip {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  color: var(--stl-text-secondary);
  background: #f3f4f6;
  font-size: 0.72rem;
  font-weight: 900;
}

.stl-chip--sm {
  min-width: 20px;
  height: 20px;
  font-size: 0.68rem;
}

.stl-table-wrap {
  overflow-x: auto;
}

.stl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.stl-table th {
  padding: 9px 10px;
  color: var(--stl-text-muted);
  border-bottom: 1.5px solid var(--stl-border);
  font-size: 0.7rem;
  font-weight: 900;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.stl-table td {
  padding: 11px 10px;
  color: var(--stl-text-primary);
  border-bottom: 1px solid #f1f3f6;
  vertical-align: middle;
}

.stl-table__row {
  cursor: pointer;
}

.stl-table__row:hover td {
  background: #f9fafb;
}

.stl-table__row--active td {
  background: #eff6ff;
}

.stl-table__id {
  color: var(--stl-text-secondary);
  font-weight: 800;
}

.stl-table__amount {
  font-weight: 900;
  white-space: nowrap;
}

.stl-table--sm th,
.stl-table--sm td {
  padding: 8px;
}

.stl-type-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 3px 9px;
  color: var(--stl-text-secondary);
  background: #f3f4f6;
  border: 1px solid var(--stl-border);
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
}

.stl-empty {
  display: flex;
  min-height: 120px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--stl-text-muted);
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.stl-empty--sm {
  min-height: 84px;
}

.stl-empty--error {
  color: #dc2626;
}

.stl-empty--hint {
  min-height: 240px;
}

.stl-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid var(--stl-border);
  border-top-color: var(--stl-blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.stl-detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  overflow: hidden;
  margin-bottom: 16px;
  border: 1px solid var(--stl-border);
  border-radius: var(--stl-radius-sm);
  background: var(--stl-border);
  gap: 1px;
}

.stl-detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  background: var(--stl-card);
}

.stl-detail-item--wide {
  grid-column: span 2;
}

.stl-detail-item__label,
.stl-field__label {
  color: var(--stl-text-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.stl-detail-item__val {
  color: var(--stl-text-primary);
  font-size: 0.82rem;
  font-weight: 800;
  word-break: break-all;
}

.stl-detail-item__val--amount {
  font-size: 1rem;
}

.stl-subcard {
  overflow: hidden;
  border: 1px solid var(--stl-border);
  border-radius: var(--stl-radius-sm);
}

.stl-subcard__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 14px;
  background: #fafafa;
  border-bottom: 1px solid var(--stl-border);
}

.stl-subcard__title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 900;
}

.stl-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stl-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stl-input,
.stl-select {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid var(--stl-border);
  border-radius: 8px;
  padding: 9px 12px;
  color: var(--stl-text-primary);
  background: #fafafa;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
}

.stl-input:focus,
.stl-select:focus {
  border-color: var(--stl-blue);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.stl-form-hint {
  grid-column: 1 / -1;
  padding: 10px 12px;
  border: 1px solid #fde68a;
  border-radius: 8px;
  color: #92400e;
  background: #fffbeb;
  font-size: 0.8rem;
  font-weight: 700;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .stl-kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stl-insight-grid,
  .stl-main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .stl-page {
    padding: 16px;
  }

  .stl-kpi-row,
  .stl-form-grid,
  .stl-detail-grid {
    grid-template-columns: 1fr;
  }

  .stl-detail-item--wide {
    grid-column: auto;
  }

  .stl-chart-total {
    align-items: flex-start;
  }
}
</style>
