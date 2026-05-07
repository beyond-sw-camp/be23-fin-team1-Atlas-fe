<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  downloadSettlementExcel,
  getSettlements,
  getSettlementStatistics,
  saveSettlementBudget,
  type SettlementCurrency,
  type SettlementListResponseDto,
  type SettlementStatisticsResponseDto,
  type SettlementTargetType,
} from '../../../services/settlement'
import {
  getSuppliers,
  type SupplierListResponseDto,
  type SupplierResponseDto,
} from '../../../services/supplier'

const preferences = useAtlasPreferencesStore()
const route = useRoute()
const router = useRouter()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 정산',
    title: '정산 관리',
    subtitle: '배송과 반품 완료로 자동 생성된 정산 명세와 예산 사용 현황을 확인합니다.',
    listEyebrow: '정산 명세',
    listTitle: '정산 명세 목록',
    detailEyebrow: '상세',
    detailTitle: '정산 명세 상세',
    itemEyebrow: '상세 항목',
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
      currencyCode: '기준 통화',
      createdAt: '생성 일시',
      updatedAt: '수정 일시',
      poItemId: '발주 품목 ID',
      itemId: '품목 ID',
      qty: '수량',
      unitPrice: '단가',
      detailAmount: '금액',
    },
    targetTypes: {
      ORDER: '발주',
      SHIPMENT: '출하',
      RETURN: '반품',
      DELIVERY_EXCEPTION: '배송 예외',
    },
    actions: {
      refresh: '새로고침',
      registerBudget: '예산 등록',
      exportExcel: '엑셀 내보내기',
      exportingExcel: '내보내는 중...',
      cancel: '취소',
      saveBudget: '예산 저장',
      saving: '저장 중...',
    },
    stats: {
      currentBudget: '이번 달 예산',
      monthlyBudgetBase: '월 예산 기준',
      payableThisMonth: '이번 달 지급 정산액',
      budgetUsageBase: '예산 사용액 기준',
      budgetUsageRate: '예산 사용률',
      receivableThisMonth: '이번 달 수금 예정',
      receivableBase: '받을 정산액 기준',
      monthlyBudgetChart: '월별 예산 대비 지급 정산액',
      annualPayable: '연간 지급 정산액',
      settlementAmountAnalysis: '정산 금액 분석',
      targetTypeAmount: '정산 유형별 금액',
      flowCompare: '지급/수금 비교',
      settlementFlow: '이번 달 정산 흐름',
      payableExpected: '지급 예정',
      receivableExpected: '수금 예정',
      remainingBudget: '예산 잔액',
      netFlow: '순흐름',
      all: '전체',
      q1: '1분기',
      q2: '2분기',
      q3: '3분기',
      q4: '4분기',
      recent6: '최근 6개월',
      loadingStats: '통계 데이터를 불러오는 중입니다.',
      noBudgetData: '예산 또는 정산 데이터가 없습니다.',
      noTargetTypeAmount: '정산 유형 금액이 없습니다.',
      total: '합계',
      amount: '금액',
      budgetStatuses: {
        SAFE: '정상',
        WARNING: '주의',
        EXCEEDED: '예산 초과',
        NO_BUDGET: '예산 등록 안 됨.',
      },
    },
    budgetModal: {
      title: '월별 예산 등록',
      description: '월별 예산을 등록하면 정산액과 예산 사용률을 차트에서 비교할 수 있습니다.',
      year: '예산 연도',
      month: '예산 월',
      amount: '예산 금액',
      currency: '통화',
      warningThreshold: '경고 기준 (%)',
      hint: '예산 사용률이 경고 기준 이상이면 주의, 예산을 초과하면 예산 초과 상태로 표시됩니다.',
    },
    validation: {
      invalidYear: '예산 연도를 확인해주세요.',
      invalidMonth: '예산 월은 1월부터 12월까지만 입력할 수 있습니다.',
      invalidAmount: '예산 금액은 0 이상이어야 합니다.',
      invalidThreshold: '경고 기준은 0부터 100 사이로 입력해주세요.',
      saveFailed: '예산 저장에 실패했습니다.',
      statsFailed: '정산 통계 데이터를 불러오지 못했습니다.',
    },
  },
} as const

const content = computed(() => CONTENT.ko)

function openSettlementDetailPage(publicId: string) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'settlements', publicId },
  })
}

type SettlementBudgetForm = {
  year: number
  month: number
  budgetAmount: number
  currencyCode: SettlementCurrency
  warningThresholdRate: number
}

type MonthlyBudgetRange = 'ALL' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'RECENT_6'

const monthlyBudgetRange = ref<MonthlyBudgetRange>('ALL')

const settlements = ref<SettlementListResponseDto[]>([])

const settlementStatistics = ref<SettlementStatisticsResponseDto | null>(null)
const isStatisticsLoading = ref(false)
const statisticsErrorMessage = ref('')
const statisticsYear = ref(new Date().getFullYear())

const supplierOptions = ref<SupplierResponseDto[]>([])

const isListLoading = ref(false)
const isExcelDownloading = ref(false)
const excelStartDate = ref('')
const excelEndDate = ref('')

const isSupplierOptionsLoading = ref(false)

const listErrorMessage = ref('')

const isBudgetModalOpen = ref(false)
const isBudgetCreatePage = computed(() => route.name === 'settlementBudgetCreate')
const isBudgetSubmitting = ref(false)
const budgetErrorMessage = ref('')

const budgetForm = ref<SettlementBudgetForm>({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  budgetAmount: 0,
  currencyCode: 'KRW',
  warningThresholdRate: 80,
})

const CHART_MONTH_LABELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

const monthLabel = (month: number) => `${month}월`
const formatWonAmount = (value: number) => `${Number(value).toLocaleString('ko-KR')}원`

type BudgetUsageStatusLabel = keyof typeof CONTENT.ko.stats.budgetStatuses

function budgetUsageStatusText(value: string | null | undefined) {
  const status = (value ?? 'NO_BUDGET') as BudgetUsageStatusLabel
  return content.value.stats.budgetStatuses[status] ?? value ?? content.value.stats.budgetStatuses.NO_BUDGET
}

const monthlyBudgetChartPoints = computed(() => {
  const source = new Map(
    (settlementStatistics.value?.monthlyBudgetUsages ?? []).map((point) => [
      Number(point.month),
      point,
    ]),
  )

  return CHART_MONTH_LABELS.map((monthNumber) => {
    const point = source.get(monthNumber)

    return {
      month: monthNumber,
      label: monthLabel(monthNumber),
      budgetAmount: Number(point?.budgetAmount ?? 0),
      payableAmount: Number(point?.payableAmount ?? 0),
      remainingAmount: Number(point?.remainingAmount ?? 0),
      usageRate: Number(point?.usageRate ?? 0),
      status: point?.status ?? 'NO_BUDGET',
    }
  })
})

const visibleMonthlyBudgetChartPoints = computed(() => {
  switch (monthlyBudgetRange.value) {
    case 'Q1': return monthlyBudgetChartPoints.value.slice(0, 3)
    case 'Q2': return monthlyBudgetChartPoints.value.slice(3, 6)
    case 'Q3': return monthlyBudgetChartPoints.value.slice(6, 9)
    case 'Q4': return monthlyBudgetChartPoints.value.slice(9, 12)
    case 'RECENT_6': return monthlyBudgetChartPoints.value.slice(6, 12)
    default: return monthlyBudgetChartPoints.value
  }
})

const hasMonthlyBudgetChartData = computed(() => {
  return monthlyBudgetChartPoints.value.some((point) => {
    return point.budgetAmount > 0 || point.payableAmount > 0
  })
})

const monthlyPayableTotalAmount = computed(() => {
  return monthlyBudgetChartPoints.value.reduce((sum, point) => sum + point.payableAmount, 0)
})

const monthlyBudgetChartSeries = computed(() => {
  return [
    {
      name: content.value.budgetModal.amount,
      data: visibleMonthlyBudgetChartPoints.value.map((point) => point.budgetAmount),
    },
    {
      name: content.value.stats.payableThisMonth,
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
        borderRadius: 0,
      },
    },
    colors: ['#cbd5e1', '#334155'],
    dataLabels: { enabled: false },
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
        formatter: (value: number) =>
          Number(value).toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US'),
        style: {
          colors: '#98a2b3',
          fontSize: '11px',
        },
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: { formatter: formatWonAmount },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      fontWeight: 800,
      labels: { colors: '#667085' },
    },
  }
})

const targetTypeChartPoints = computed(() => {
  return settlementStatistics.value?.targetTypeAmounts ?? []
})

const targetTypeDonutChartSeries = computed(() => {
  return targetTypeChartPoints.value.map((point) => Math.abs(Number(point.amount ?? 0)))
})

const targetTypeDonutChartLabels = computed(() => {
  return targetTypeChartPoints.value.map((point) => formatTargetType(point.value as SettlementTargetType))
})

const hasTargetTypeChartData = computed(() => {
  return targetTypeDonutChartSeries.value.some((value) => value > 0)
})

const targetTypeAmountTotal = computed(() => {
  return targetTypeChartPoints.value.reduce((sum, point) => sum + Number(point.amount ?? 0), 0)
})

const targetTypeDonutChartOptions = computed(() => {
  return {
    labels: targetTypeDonutChartLabels.value,
    colors: ['#334155', '#10b981', '#f59e0b'],
    chart: {
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
      toolbar: { show: false },
    },
    dataLabels: {
      style: {
        fontFamily: 'Pretendard, "Segoe UI", sans-serif',
        fontWeight: 900,
        colors: ['#ffffff', '#ffffff', '#ffffff'],
      },
      dropShadow: {
        enabled: true,
        blur: 2,
        opacity: 0.4,
      },
    },
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontWeight: 800,
      fontFamily: 'Pretendard, "Segoe UI", sans-serif',
      labels: { colors: '#667085' },
    },
    plotOptions: {
      pie: {
        donut: {
          size: '68%',
          labels: {
            show: true,
            name: {
              fontFamily: 'Pretendard, "Segoe UI", sans-serif',
              fontWeight: 800,
            },
            value: {
              fontFamily: 'Pretendard, "Segoe UI", sans-serif',
              fontWeight: 800,
            },
            total: {
              show: true,
              label: content.value.stats.total,
              fontFamily: 'Pretendard, "Segoe UI", sans-serif',
              fontWeight: 800,
              formatter: () => formatWonAmount(targetTypeAmountTotal.value),
            },
          },
        },
      },
    },
    tooltip: {
      y: { formatter: formatWonAmount },
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
      name: content.value.stats.amount,
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
    colors: ['#94a3b8'],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 0,
        barHeight: '48%',
        dataLabels: {
          position: 'top',
        },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: formatWonAmount,
      // offsetX 제거 — 음수 데이터에서 레이블이 튀어나가는 문제 방지
      style: {
        fontSize: '11px',
        fontWeight: 900,
        colors: ['#334155'],
      },
      background: {
        enabled: false,
      },
    },
    xaxis: {
      min: 0,
      max: settlementFlowAmountMax.value * 1.4,  // 레이블 잘림 방지용 여백
      categories: [
        content.value.stats.payableExpected,
        content.value.stats.receivableExpected,
        content.value.stats.netFlow,
      ],
      labels: {
        formatter: (value: number) =>
          Number(value).toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US'),
      },
    },
    grid: {
      borderColor: '#edf1f7',
      strokeDashArray: 4,
    },
    legend: { show: false },
    tooltip: {
      y: { formatter: formatWonAmount },
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
  if (!isBudgetCreatePage.value) {
    router.push({ name: 'settlementBudgetCreate' })
  }
}

function closeBudgetModal() {
  isBudgetModalOpen.value = false
  resetBudgetForm()

  if (isBudgetCreatePage.value) {
    router.push({ name: 'settlements' })
  }
}

function validateBudgetForm() {
  if (!Number.isInteger(budgetForm.value.year) || budgetForm.value.year < 2000) {
    return content.value.validation.invalidYear
  }
  if (!Number.isInteger(budgetForm.value.month) || budgetForm.value.month < 1 || budgetForm.value.month > 12) {
    return content.value.validation.invalidMonth
  }
  if (!Number.isFinite(budgetForm.value.budgetAmount) || budgetForm.value.budgetAmount < 0) {
    return content.value.validation.invalidAmount
  }
  if (
    !Number.isFinite(budgetForm.value.warningThresholdRate) ||
    budgetForm.value.warningThresholdRate < 0 ||
    budgetForm.value.warningThresholdRate > 100
  ) {
    return content.value.validation.invalidThreshold
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
      content.value.validation.saveFailed
  } finally {
    isBudgetSubmitting.value = false
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.length >= 16 ? value.substring(0, 16).replace('T', ' ') : value
}

function formatAmount(value?: number | null) {
  if (value == null) return '-'
  return formatWonAmount(value)
}

function formatStatisticsAmount(value?: number | null) {
  if (value == null) return '-'
  return formatWonAmount(value)
}

function formatRate(value?: number | null) {
  if (value == null) return '-'
  return `${Number(value).toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US')}%`
}

function formatTargetType(value: SettlementTargetType) {
  return content.value.targetTypes[value as keyof typeof content.value.targetTypes] ?? value
}

function getSupplierLabel(publicId: string, organizationPublicId?: string | null) {
  const supplier = supplierOptions.value.find((item) => {
    return (
      item.publicId === publicId ||
      item.organizationPublicId === publicId ||
      item.organizationPublicId === organizationPublicId
    )
  })
  if (!supplier) return '공급업체 미확인'
  return `${supplier.supplierName} (${supplier.supplierCode})`
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

async function fetchSettlements() {
  isListLoading.value = true
  listErrorMessage.value = ''

  try {
    const response = await getSettlements(0, 20)
    settlements.value = response.content
  } catch (err: any) {
    console.error('Failed to fetch settlements:', err)
    settlements.value = []
    listErrorMessage.value = err?.message ?? '정산 명세를 불러오지 못했습니다.'
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
      content.value.validation.statsFailed
  } finally {
    isStatisticsLoading.value = false
  }
}

async function handleDownloadSettlementExcel() {
  if (isExcelDownloading.value) return

  isExcelDownloading.value = true
  listErrorMessage.value = ''

  try {
    const blob = await downloadSettlementExcel(
      preferences.language,
      excelStartDate.value || undefined,
      excelEndDate.value || undefined,
    )

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `settlements-${new Date().toISOString().slice(0, 10)}.xlsx`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err: any) {
    console.error('Failed to download settlement excel:', err)
    listErrorMessage.value =
      err?.payload?.message ||
      err?.response?.data?.message ||
      err?.message ||
      '정산 엑셀 파일을 내려받지 못했습니다.'
  } finally {
    isExcelDownloading.value = false
  }
}

async function refreshSettlementPage() {
  await Promise.all([fetchSettlements(), fetchSettlementStatistics()])
}

onMounted(() => {
  refreshSettlementPage()
  loadSupplierOptions()

  if (isBudgetCreatePage.value) {
    resetBudgetForm()
  }
})
</script>

<template>
  <section v-if="!isBudgetCreatePage" class="app-screen terminal-page stl-page settlements-page">
    <header class="stl-page__header">
      <div>
        <div class="stl-breadcrumb">
          <span>{{ content.eyebrow }}</span>
        </div>
        <h1 class="stl-page__title">{{ content.title }}</h1>
      </div>

      <div class="stl-page__actions">
        <button class="stl-btn stl-btn--ghost" type="button" @click="refreshSettlementPage">
          {{ content.actions.refresh }}
        </button>
        <input v-model="excelStartDate" class="stl-input stl-date-input" type="date" />
        <input v-model="excelEndDate" class="stl-input stl-date-input" type="date" />
        <button
          class="stl-btn stl-btn--ghost"
          type="button"
          :disabled="isExcelDownloading"
          @click="handleDownloadSettlementExcel"
        >
          {{ isExcelDownloading ? content.actions.exportingExcel : content.actions.exportExcel }}
        </button>
        <button class="stl-btn stl-btn--primary" type="button" @click="openBudgetModal">
          {{ content.actions.registerBudget }}
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
          <span class="stl-kpi-card__label">{{ content.stats.currentBudget }}</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatStatisticsAmount(settlementStatistics?.currentMonthBudgetAmount) }}
          </strong>
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
          <span class="stl-kpi-card__label">{{ content.stats.payableThisMonth }}</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatStatisticsAmount(settlementStatistics?.payableAmountThisMonth) }}
          </strong>
        </div>
      </article>

      <article class="stl-kpi-card">
        <div class="stl-kpi-card__icon stl-kpi-card__icon--emerald">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M4 9.5L7.5 13L14 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>
        <div class="stl-kpi-card__body">
          <span class="stl-kpi-card__label">{{ content.stats.budgetUsageRate }}</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatRate(settlementStatistics?.currentMonthBudgetUsageRate) }}
          </strong>
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
          <span class="stl-kpi-card__label">{{ content.stats.receivableThisMonth }}</span>
          <strong class="stl-kpi-card__value">
            {{ isStatisticsLoading ? '-' : formatStatisticsAmount(settlementStatistics?.receivableAmountThisMonth) }}
          </strong>
        </div>
      </article>
    </section>

    <section class="stl-chart-layout">
      <article class="stl-card stl-chart-card stl-chart-card--monthly">
        <div class="stl-card__head stl-card__head--chart">
          <div>
            <span class="stl-card__eyebrow">예산 대비 정산</span>
            <h3 class="stl-card__title">{{ content.stats.monthlyBudgetChart }}</h3>
          </div>
          <div class="stl-chart-total">
            <span>{{ content.stats.annualPayable }}</span>
            <strong>{{ formatStatisticsAmount(monthlyPayableTotalAmount) }}</strong>
          </div>
        </div>

        <div class="stl-chart-tabs">
          <button class="stl-chart-tab" :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'ALL' }" type="button" @click="monthlyBudgetRange = 'ALL'">{{ content.stats.all }}</button>
          <button class="stl-chart-tab" :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q1' }" type="button" @click="monthlyBudgetRange = 'Q1'">{{ content.stats.q1 }}</button>
          <button class="stl-chart-tab" :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q2' }" type="button" @click="monthlyBudgetRange = 'Q2'">{{ content.stats.q2 }}</button>
          <button class="stl-chart-tab" :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q3' }" type="button" @click="monthlyBudgetRange = 'Q3'">{{ content.stats.q3 }}</button>
          <button class="stl-chart-tab" :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'Q4' }" type="button" @click="monthlyBudgetRange = 'Q4'">{{ content.stats.q4 }}</button>
          <button class="stl-chart-tab" :class="{ 'stl-chart-tab--active': monthlyBudgetRange === 'RECENT_6' }" type="button" @click="monthlyBudgetRange = 'RECENT_6'">{{ content.stats.recent6 }}</button>
        </div>

        <div v-if="isStatisticsLoading" class="stl-empty">
          <div class="stl-spinner"></div>
          {{ content.stats.loadingStats }}
        </div>
        <div v-else-if="!hasMonthlyBudgetChartData" class="stl-empty">
          {{ content.stats.noBudgetData }}
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
            <span class="stl-card__eyebrow">정산 금액</span>
            <h3 class="stl-card__title">{{ content.stats.settlementAmountAnalysis }}</h3>
          </div>
        </div>

        <div v-if="isStatisticsLoading" class="stl-empty stl-empty--sm">
          {{ content.stats.loadingStats }}
        </div>

        <div v-else class="stl-insight-split">
          <div class="stl-insight-split__pane">
            <p class="stl-insight-split__label">{{ content.stats.targetTypeAmount }}</p>
            <div v-if="!hasTargetTypeChartData" class="stl-empty stl-empty--sm">
              {{ content.stats.noTargetTypeAmount }}
            </div>
            <apexchart
              v-else
              type="donut"
              height="240"
              :options="targetTypeDonutChartOptions"
              :series="targetTypeDonutChartSeries"
            />
          </div>

          <div class="stl-insight-split__pane stl-insight-split__pane--right">
            <p class="stl-insight-split__label">{{ content.stats.flowCompare }}</p>
            <apexchart
              type="bar"
              height="240"
              :options="settlementFlowAmountChartOptions"
              :series="settlementFlowAmountChartSeries"
            />
          </div>
        </div>
      </article>

      <article class="stl-card stl-chart-card stl-chart-card--flow">
        <div class="stl-card__head">
          <div>
            <span class="stl-card__eyebrow">정산 흐름</span>
            <h3 class="stl-card__title">{{ content.stats.settlementFlow }}</h3>
          </div>
        </div>

        <div v-if="isStatisticsLoading" class="stl-empty stl-empty--sm">
          {{ content.stats.loadingStats }}
        </div>

        <div v-else class="stl-flow-summary">
          <div class="stl-flow-summary__row">
            <span>{{ content.stats.payableExpected }}</span>
            <strong>{{ formatStatisticsAmount(settlementStatistics?.payableAmountThisMonth) }}</strong>
          </div>
          <div class="stl-flow-summary__row">
            <span>{{ content.stats.receivableExpected }}</span>
            <strong>{{ formatStatisticsAmount(settlementStatistics?.receivableAmountThisMonth) }}</strong>
          </div>
          <div class="stl-flow-summary__row">
            <span>{{ content.stats.remainingBudget }}</span>
            <strong>{{ formatStatisticsAmount(settlementStatistics?.currentMonthRemainingBudgetAmount) }}</strong>
          </div>
          <div class="stl-flow-summary__row stl-flow-summary__row--strong">
            <span>{{ content.stats.netFlow }}</span>
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
              >
                <td class="stl-table__id">{{ settlement.id }}</td>
                <td>{{ getSupplierLabel(settlement.supplierPublicId, settlement.supplierOrganizationPublicId) }}</td>
                <td>
                  <span class="stl-type-badge">{{ formatTargetType(settlement.targetType) }}</span>
                </td>
                <td class="stl-table__amount">{{ formatAmount(settlement.amount) }}</td>
                <td>{{ formatDate(settlement.createdAt) }}</td>
                <td>
                  <button
                    class="stl-btn stl-btn--row"
                    type="button"
                    @click.stop="openSettlementDetailPage(settlement.publicId)"
                  >
                    {{ content.selectLabel }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </section>

  <BaseModal
    :model-value="isBudgetCreatePage || isBudgetModalOpen"
    :title="content.budgetModal.title"
    :description="content.budgetModal.description"
    :presentation="isBudgetCreatePage ? 'page' : 'modal'"
    size="md"
    @update:model-value="(value) => { if (!value) closeBudgetModal() }"
  >
    <div class="stl-form-grid">
      <div class="stl-field">
        <label class="stl-field__label">{{ content.budgetModal.year }}</label>
        <input v-model.number="budgetForm.year" type="number" min="2000" class="stl-input" />
      </div>
      <div class="stl-field">
        <label class="stl-field__label">{{ content.budgetModal.month }}</label>
        <input v-model.number="budgetForm.month" type="number" min="1" max="12" class="stl-input" />
      </div>
      <div class="stl-field">
        <label class="stl-field__label">{{ content.budgetModal.amount }}</label>
        <input v-model.number="budgetForm.budgetAmount" type="number" min="0" step="1000" class="stl-input" />
      </div>
      <div class="stl-field">
        <label class="stl-field__label">{{ content.budgetModal.currency }}</label>
        <select v-model="budgetForm.currencyCode" class="stl-select">
          <option value="KRW">원</option>
        </select>
      </div>
      <div class="stl-field">
        <label class="stl-field__label">{{ content.budgetModal.warningThreshold }}</label>
        <input v-model.number="budgetForm.warningThresholdRate" type="number" min="0" max="100" step="1" class="stl-input" />
      </div>
      <div class="stl-form-hint">
        {{ content.budgetModal.hint }}
      </div>
    </div>

    <div v-if="budgetErrorMessage" class="stl-alert stl-alert--error stl-modal-error">
      {{ budgetErrorMessage }}
    </div>

    <template #footer>
      <button class="stl-btn stl-btn--ghost" type="button" @click="closeBudgetModal">
        {{ content.actions.cancel }}
      </button>
      <button class="stl-btn stl-btn--primary" type="button" :disabled="isBudgetSubmitting" @click="handleSaveBudget">
        {{ isBudgetSubmitting ? content.actions.saving : content.actions.saveBudget }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.stl-page {
  --stl-bg: var(--background, #fff);
  --stl-card: rgb(var(--surface-container-low-rgb, 245 245 245) / 0.86);
  --stl-border: rgb(var(--outline-variant-rgb, 172 179 180) / 0.24);
  --stl-text-primary: var(--on-surface, #121212);
  --stl-text-secondary: var(--on-surface-variant, #474747);
  --stl-text-muted: var(--on-surface-variant, #596061);
  --stl-green: #1c7c45;
  --stl-amber: #b7791f;
  --stl-radius: 0;
  --stl-radius-sm: 0;
  --stl-shadow: none;

  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
  padding: 28px 32px;
  color: var(--stl-text-primary);
  background: var(--stl-bg);
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
  margin-bottom: 0;
  color: var(--stl-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
}

.stl-page__title {
  margin: 8px 0 0;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  line-height: 0.98;
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
  border-radius: 0;
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
  background: var(--primary, #5e5e5e);
  border-color: var(--primary, #5e5e5e);
}

.stl-btn--ghost {
  color: var(--stl-text-secondary);
  background: var(--stl-card);
  border-color: var(--stl-border);
}

.stl-btn--row {
  color: var(--stl-text-secondary);
  background: transparent;
  padding: 5px 8px;
}

.stl-alert {
  border-radius: 0;
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
  border-left: 4px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  border-radius: 0;
  box-shadow: var(--stl-shadow);
}

.stl-kpi-card__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--stl-border);
  border-radius: 0;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.84);
  color: var(--stl-text-secondary);
  flex: 0 0 auto;
}

.stl-kpi-card:has(.stl-kpi-card__icon--green),
.stl-kpi-card:has(.stl-kpi-card__icon--emerald) {
  border-left-color: rgb(28 124 69 / 0.78);
}

.stl-kpi-card:has(.stl-kpi-card__icon--amber) {
  border-left-color: rgb(183 121 31 / 0.78);
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
  min-width: 0;
  background: var(--stl-card);
  border: 1px solid var(--stl-border);
  border-radius: 0;
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
  grid-template-columns: minmax(0, 1fr);
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

.stl-insight-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.stl-insight-split__pane {
  min-width: 0;
}

.stl-insight-split__pane--right {
  border-left: 1px solid var(--stl-border);
  padding-left: 20px;
}

.stl-insight-split__label {
  margin: 0 0 8px;
  color: var(--stl-text-muted);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.stl-chart-tabs {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  flex-wrap: wrap;
  margin-bottom: 12px;
  gap: 8px;
  padding: 0;
  border: 1px solid var(--stl-border);
  border-radius: 0;
  background: transparent;
}

.stl-chart-tab {
  border: 1px solid transparent;
  border-radius: 0;
  padding: 7px 12px;
  color: var(--stl-text-muted);
  background: transparent;
  font-family: inherit;
  font-size: 0.76rem;
  font-weight: 900;
  cursor: pointer;
}

.stl-chart-tab--active {
  color: var(--on-primary, #fff);
  background: var(--primary, #5e5e5e);
  box-shadow: none;
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
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.stl-chip {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  padding: 0 8px;
  border-radius: 0;
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
  max-width: 100%;
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
  background: rgb(var(--surface-container-rgb, 235 238 239) / 0.46);
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
  border-radius: 0;
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
  border: 1px dashed var(--stl-border);
  border-radius: 0;
  background: #fff;
  padding: 36px 20px;
  color: var(--stl-text-muted);
  text-align: center;
  font-size: 0.85rem;
  font-weight: 800;
}

.stl-empty--sm {
  min-height: 96px;
  padding: 28px 18px;
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
  border-top-color: var(--primary, #5e5e5e);
  border-radius: 0;
  animation: spin 0.7s linear infinite;
}

.stl-field__label {
  color: var(--stl-text-muted);
  font-size: 0.68rem;
  font-weight: 900;
  letter-spacing: 0.06em;
  text-transform: uppercase;
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
  border-radius: 0;
  padding: 9px 12px;
  color: var(--stl-text-primary);
  background: #fafafa;
  font-family: inherit;
  font-size: 0.875rem;
  outline: none;
}

.stl-input:focus,
.stl-select:focus {
  border-color: var(--primary, #5e5e5e);
  background: #ffffff;
  box-shadow: none;
}

.stl-form-hint {
  grid-column: 1 / -1;
  padding: 10px 12px;
  border: 1px solid #fde68a;
  border-radius: 0;
  color: #92400e;
  background: #fffbeb;
  font-size: 0.8rem;
  font-weight: 700;
}

.stl-date-input {
  width: 140px;
  min-height: 34px;
  padding: 7px 10px;
  font-size: 0.78rem;
  font-weight: 800;
}

.stl-chart-card :deep(.apexcharts-text),
.stl-chart-card :deep(.apexcharts-datalabel),
.stl-chart-card :deep(.apexcharts-legend-text),
.stl-chart-card :deep(.apexcharts-datalabel-label),
.stl-chart-card :deep(.apexcharts-datalabel-value) {
  font-family: Pretendard, "Segoe UI", sans-serif !important;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
    overflow-x: hidden;
  }

  .stl-page__header {
    align-items: flex-start;
  }

  .stl-page__actions {
    display: grid;
    width: 100%;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .stl-page__actions .stl-btn,
  .stl-page__actions .stl-input {
    width: 100%;
    min-width: 0;
  }

  .stl-kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .stl-kpi-card {
    min-height: 104px;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }

  .stl-kpi-card__icon {
    width: 34px;
    height: 34px;
  }

  .stl-kpi-card__label {
    font-size: 0.66rem;
    letter-spacing: 0.02em;
  }

  .stl-kpi-card__value {
    font-size: 1.05rem;
    overflow-wrap: anywhere;
  }

  .stl-insight-grid,
  .stl-main-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stl-insight-split {
    grid-template-columns: 1fr;
  }

  .stl-insight-split__pane--right {
    border-left: none;
    border-top: 1px solid var(--stl-border);
    padding-left: 0;
    padding-top: 16px;
  }

  .stl-card {
    padding: 16px;
  }

  .stl-chart-card :deep(.apexcharts-canvas),
  .stl-chart-card :deep(.apexcharts-svg) {
    max-width: 100%;
  }

  .stl-form-grid {
    grid-template-columns: 1fr;
  }

  .stl-chart-total {
    align-items: flex-start;
  }

  .stl-empty {
    min-width: 0;
    padding: 28px 14px;
    overflow-wrap: anywhere;
  }

  .stl-empty--hint {
    min-height: 180px;
  }

  .stl-table-wrap {
    overflow-x: hidden;
  }

  .stl-card--list .stl-table {
    table-layout: fixed;
  }

  .stl-card--list .stl-table th:nth-child(1),
  .stl-card--list .stl-table td:nth-child(1),
  .stl-card--list .stl-table th:nth-child(5),
  .stl-card--list .stl-table td:nth-child(5),
  .stl-card--list .stl-table th:nth-child(6),
  .stl-card--list .stl-table td:nth-child(6) {
    display: none;
  }

  .stl-card--list .stl-table th:nth-child(2),
  .stl-card--list .stl-table td:nth-child(2) {
    width: 48%;
  }

  .stl-card--list .stl-table th:nth-child(3),
  .stl-card--list .stl-table td:nth-child(3) {
    width: 22%;
  }

  .stl-card--list .stl-table th:nth-child(4),
  .stl-card--list .stl-table td:nth-child(4) {
    width: 30%;
  }

  .stl-table th,
  .stl-table td {
    padding: 10px 8px;
  }

  .stl-table td {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .stl-type-badge {
    padding: 4px 6px;
    white-space: normal;
    line-height: 1.15;
  }
}
</style>