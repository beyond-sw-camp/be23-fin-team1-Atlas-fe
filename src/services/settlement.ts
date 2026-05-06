import { apiClient } from './http'
import type { SpringPage } from '../types'

export type SettlementStatus = 'PENDING' | 'APPROVED' | 'CANCELLED'

export type SettlementTargetType =
  | 'SHIPMENT'
  | 'RETURN'
  | 'DELIVERY_EXCEPTION'

export type SettlementCurrency = 'KRW' | 'DOLLAR'

export interface SettlementDetailResponseDto {
  publicId: string
  poItemId: number
  itemId: number
  qty: number
  unitPrice: number
  amount: number
  detailStatus: string
}

export interface SettlementResponseDto {
  id: number
  publicId: string
  buyerOrganizationPublicId?: string | null
  supplierOrganizationPublicId?: string | null
  supplierPublicId: string
  targetType: SettlementTargetType
  targetPublicId: string
  settlementPeriodStart?: string | null
  settlementPeriodEnd?: string | null
  amount: number
  currencyCode: SettlementCurrency
  settlementStatus: SettlementStatus
  settledAt?: string | null
  approvedByUserPublicId?: string | null
  cancelledAt?: string | null
  cancelledByUserPublicId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  details: SettlementDetailResponseDto[]
}

export type SettlementListResponseDto = SettlementResponseDto

export interface CreateSettlementDetailRequestDto {
  poItemId: number
  itemId: number
  qty: number
  unitPrice: number
}

export interface CreateSettlementRequestDto {
  supplierPublicId: string
  targetType: SettlementTargetType
  targetPublicId: string
  settlementPeriodStart?: string
  settlementPeriodEnd?: string
  currencyCode: SettlementCurrency
  details: CreateSettlementDetailRequestDto[]
}

export async function getSettlements(
  page = 0,
  size = 10,
): Promise<SpringPage<SettlementListResponseDto>> {
  const response = await apiClient.get<SpringPage<SettlementListResponseDto>>(
    '/api/supply/settlements',
    {
      params: { page, size },
    },
  )
  return response.data
}

export async function getSettlement(
  settlementPublicId: string,
): Promise<SettlementResponseDto> {
  const response = await apiClient.get<SettlementResponseDto>(
    `/api/supply/settlements/${settlementPublicId}`,
  )
  return response.data
}

export async function createSettlement(
  data: CreateSettlementRequestDto,
): Promise<SettlementResponseDto> {
  const response = await apiClient.post<SettlementResponseDto>(
    '/api/supply/settlements',
    data,
  )
  return response.data
}

export async function approveSettlement(
  settlementPublicId: string,
): Promise<SettlementResponseDto> {
  const response = await apiClient.patch<SettlementResponseDto>(
    `/api/supply/settlements/${settlementPublicId}/approve`,
  )
  return response.data
}

export async function cancelSettlement(
  settlementPublicId: string,
): Promise<SettlementResponseDto> {
  const response = await apiClient.patch<SettlementResponseDto>(
    `/api/supply/settlements/${settlementPublicId}/cancel`,
  )
  return response.data
}

// 정산 통계 차트 한 칸에 들어가는 데이터입니다.
export interface SettlementChartPointDto {
  // 화면에 보여줄 이름입니다. 예: 2026년, 1월, 승인 완료
  label: string

  // 실제 계산이나 구분에 사용할 값입니다. 예: 2026, 1, APPROVED
  value: string

  // 해당 항목의 정산 총액입니다.
  amount: number

  // 해당 항목의 정산 건수입니다.
  count: number
}
export type BudgetUsageStatus = 'SAFE' | 'WARNING' | 'EXCEEDED' | 'NO_BUDGET'

export interface SettlementBudgetUsageDto {
  month: number
  label: string
  budgetAmount: number
  payableAmount: number
  remainingAmount: number
  usageRate: number
  status: BudgetUsageStatus
}


// 정산 통계 화면에서 사용할 전체 응답입니다.
export interface SettlementStatisticsResponseDto {
  // 조회 기준 연도입니다.
  year: number

  // 올해 전체 정산 금액입니다.
  totalAmountThisYear: number

  // 이번 달 전체 정산 금액입니다.
  totalAmountThisMonth: number

  // 아직 승인 대기 중인 정산 금액입니다.
  pendingAmount: number

  // 승인 완료된 정산 금액입니다.
  approvedAmount: number

  // 취소된 정산 금액입니다.
  cancelledAmount: number

  // 전체 정산 건수입니다.
  totalCount: number

  // 승인 대기 정산 건수입니다.
  pendingCount: number

  // 승인 완료 정산 건수입니다.
  approvedCount: number

  // 취소 정산 건수입니다.
  cancelledCount: number

  // 전체 정산 중 승인 완료 비율입니다.
  approvalRate: number

  // 연도별 정산 금액 차트 데이터입니다.
  yearlyAmounts: SettlementChartPointDto[]

  // 월별 정산 금액 차트 데이터입니다.
  monthlyAmounts: SettlementChartPointDto[]

  // 상태별 정산 금액 차트 데이터입니다.
  statusAmounts: SettlementChartPointDto[]

  // 정산 대상 유형별 금액 차트 데이터입니다.
  targetTypeAmounts: SettlementChartPointDto[]

  // 운영 상태 카드/차트용 발주 전체 건수입니다.
purchaseOrderCount: number

// 아직 처리 중인 발주 건수입니다.
pendingPurchaseOrderCount: number

// 현재 배송중인 건수입니다.
inTransitShipmentCount: number

// 배송 지연 건수입니다.
delayedShipmentCount: number

// 아직 완료되지 않은 반품 진행 건수입니다.
returnInProgressCount: number

// 운영 상태 막대 차트에 바로 넣을 데이터입니다.
operationStatusCounts: SettlementChartPointDto[]


  payableAmountThisYear: number
payableAmountThisMonth: number
receivableAmountThisYear: number
receivableAmountThisMonth: number
currentMonthBudgetAmount: number
currentMonthRemainingBudgetAmount: number
currentMonthBudgetUsageRate: number
currentMonthBudgetStatus: BudgetUsageStatus
monthlyBudgetUsages: SettlementBudgetUsageDto[]

}

export interface SettlementBudgetRequestDto {
  year: number
  month: number
  budgetAmount: number
  currencyCode: SettlementCurrency
  warningThresholdRate?: number
}

export interface SettlementBudgetResponseDto {
  publicId: string
  organizationPublicId: string
  year: number
  month: number
  budgetAmount: number
  currencyCode: SettlementCurrency
  warningThresholdRate: number
}

export async function saveSettlementBudget(
  data: SettlementBudgetRequestDto,
): Promise<SettlementBudgetResponseDto> {
  const response = await apiClient.put<SettlementBudgetResponseDto>(
    '/api/supply/settlements/budgets',
    data,
  )

  return response.data
}


// 정산 대시보드 카드와 차트에 사용할 통계 데이터를 조회합니다.
export async function getSettlementStatistics(
  year?: number,
): Promise<SettlementStatisticsResponseDto> {
  const response = await apiClient.get<SettlementStatisticsResponseDto>(
    '/api/supply/settlements/statistics',
    {
      params: {
        year,
      },
    },
  )

  return response.data
}

// 정산 엑셀을 현재 화면 언어 기준으로 다운로드합니다.
// 정산 엑셀을 현재 화면 언어와 선택 기간 기준으로 다운로드합니다.
export async function downloadSettlementExcel(
  language: 'ko' | 'en',
  startDate?: string,
  endDate?: string,
): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    '/api/supply/settlements/export/excel',
    {
      responseType: 'blob',
      params: {
        language,
        startDate,
        endDate,
      },
      headers: {
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    },
  )

  return response.data
}


