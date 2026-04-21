<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  approveSettlement,
  cancelSettlement,
  createSettlement,
  getSettlement,
  getSettlements,
  type CreateSettlementRequestDto,
  type SettlementCurrency,
  type SettlementListResponseDto,
  type SettlementResponseDto,
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
    title: '정산',
    subtitle: '정산 목록과 상세를 확인하고 생성, 승인, 취소를 처리합니다.',
    listEyebrow: '정산 목록',
    listTitle: '정산 목록',
    detailEyebrow: '정산 상세',
    detailTitle: '정산 상세 정보',
    itemEyebrow: '정산 상세 항목',
    itemTitle: '상세 항목',
    selectLabel: '선택',
    emptyList: '정산 데이터가 없습니다.',
    loadingList: '정산 목록을 불러오는 중입니다.',
    loadingDetail: '정산 상세를 불러오는 중입니다.',
    emptyDetail: '왼쪽 목록에서 정산을 선택해주세요.',
    approveLabel: '정산 승인',
    approvingLabel: '승인 중...',
    cancelLabel: '정산 취소',
    cancellingLabel: '취소 중...',
    approveConfirm: '이 정산을 승인하시겠습니까?',
    cancelConfirm: '이 정산을 취소하시겠습니까?',
    actionErrorFallback: '정산 처리 중 오류가 발생했습니다.',
    createOpenLabel: '정산 생성',
    createModalTitle: '신규 정산 생성',
    createModalDescription: '사용자가 publicId를 직접 입력하지 않도록 선택형 UI로 구성한 정산 생성 화면입니다.',
    createSubmitLabel: '저장',
    createSubmittingLabel: '저장 중...',
    createCancelLabel: '취소',
    createErrorFallback: '정산 생성에 실패했습니다.',
    emptyDetails: '상세 항목이 없습니다.',
    validation: {
      supplier: '공급업체를 선택해주세요.',
      targetType: '정산 대상 유형을 선택해주세요.',
      targetPublicId: '정산 대상을 선택해주세요.',
      startDate: '정산 시작일을 입력해주세요.',
      endDate: '정산 종료일을 입력해주세요.',
      period: '정산 종료일은 시작일과 같거나 이후여야 합니다.',
      poItemId: 'PO Item ID를 입력해주세요.',
      itemId: 'Item ID를 입력해주세요.',
      qty: '수량은 0보다 커야 합니다.',
      unitPrice: '단가는 0 이상이어야 합니다.',
    },
    fields: {
      id: '정산 ID',
      supplier: '공급업체',
      targetType: '정산 대상 유형',
      targetSelection: '정산 대상 선택',
      period: '정산 기간',
      amount: '정산 금액',
      currencyCode: '통화',
      status: '상태',
      settledAt: '확정 일시',
      approvedBy: '승인자',
      cancelledAt: '취소 일시',
      cancelledBy: '취소자',
      createdAt: '생성 일시',
      updatedAt: '수정 일시',
      poItemId: 'PO Item ID',
      itemId: 'Item ID',
      qty: '수량',
      unitPrice: '단가',
      detailAmount: '금액',
      detailStatus: '상세 상태',
      startDate: '정산 시작일',
      endDate: '정산 종료일',
      manualDetail: '수기 정산 상세',
    },
    placeholders: {
      supplier: '공급업체 선택',
      target: '정산 대상 선택',
      loading: '불러오는 중...',
      poItemId: '예: 1',
      itemId: '예: 10',
    },
    targetTypes: {
      SHIPMENT: '출하',
      RETURN: '반품',
      DELIVERY_EXCEPTION: '배송 예외',
    },
    statuses: {
      PENDING: '대기',
      APPROVED: '승인',
      CANCELLED: '취소',
    },
    currencies: {
      KRW: '원화(KRW)',
      DOLLAR: '달러(DOLLAR)',
    },
    targetHints: {
      SHIPMENT: '출하를 선택하면 내부적으로 해당 출하의 publicId가 전송됩니다.',
      RETURN: '완료된 반품만 표시되며, 선택 시 내부적으로 해당 반품의 publicId가 전송됩니다.',
    },
    deliveryExceptionNotice: '배송 예외 정산은 현재 선택형 목록 API가 없어 화면에서 제외했습니다.',
  },
  en: {
    eyebrow: 'SUPPLY CHAIN OPS / SETTLEMENTS',
    title: 'Settlements',
    subtitle: 'Review settlements and process create, approve, and cancel actions.',
    listEyebrow: 'SETTLEMENT LIST',
    listTitle: 'Settlement List',
    detailEyebrow: 'SETTLEMENT DETAIL',
    detailTitle: 'Settlement Detail',
    itemEyebrow: 'DETAIL ITEMS',
    itemTitle: 'Detail Items',
    selectLabel: 'SELECT',
    emptyList: 'No settlements found.',
    loadingList: 'Loading settlements...',
    loadingDetail: 'Loading settlement detail...',
    emptyDetail: 'Select a settlement from the list.',
    approveLabel: 'APPROVE',
    approvingLabel: 'Approving...',
    cancelLabel: 'CANCEL',
    cancellingLabel: 'Cancelling...',
    approveConfirm: 'Do you want to approve this settlement?',
    cancelConfirm: 'Do you want to cancel this settlement?',
    actionErrorFallback: 'Failed to process settlement.',
    createOpenLabel: 'CREATE SETTLEMENT',
    createModalTitle: 'New Settlement',
    createModalDescription: 'Selection-based settlement form without direct publicId input.',
    createSubmitLabel: 'SAVE',
    createSubmittingLabel: 'Saving...',
    createCancelLabel: 'CANCEL',
    createErrorFallback: 'Failed to create settlement.',
    emptyDetails: 'No detail items.',
    validation: {
      supplier: 'Please select a supplier.',
      targetType: 'Please select a target type.',
      targetPublicId: 'Please select a target.',
      startDate: 'Please enter a start date.',
      endDate: 'Please enter an end date.',
      period: 'End date must be on or after start date.',
      poItemId: 'Please enter PO item ID.',
      itemId: 'Please enter item ID.',
      qty: 'Quantity must be greater than 0.',
      unitPrice: 'Unit price must be 0 or greater.',
    },
    fields: {
      id: 'ID',
      supplier: 'SUPPLIER',
      targetType: 'TARGET TYPE',
      targetSelection: 'TARGET',
      period: 'PERIOD',
      amount: 'AMOUNT',
      currencyCode: 'CURRENCY',
      status: 'STATUS',
      settledAt: 'SETTLED AT',
      approvedBy: 'APPROVED BY',
      cancelledAt: 'CANCELLED AT',
      cancelledBy: 'CANCELLED BY',
      createdAt: 'CREATED AT',
      updatedAt: 'UPDATED AT',
      poItemId: 'PO ITEM ID',
      itemId: 'ITEM ID',
      qty: 'QTY',
      unitPrice: 'UNIT PRICE',
      detailAmount: 'AMOUNT',
      detailStatus: 'DETAIL STATUS',
      startDate: 'START DATE',
      endDate: 'END DATE',
      manualDetail: 'MANUAL DETAIL',
    },
    placeholders: {
      supplier: 'Select supplier',
      target: 'Select target',
      loading: 'Loading...',
      poItemId: 'e.g. 1',
      itemId: 'e.g. 10',
    },
    targetTypes: {
      SHIPMENT: 'Shipment',
      RETURN: 'Return',
      DELIVERY_EXCEPTION: 'Delivery Exception',
    },
    statuses: {
      PENDING: 'Pending',
      APPROVED: 'Approved',
      CANCELLED: 'Cancelled',
    },
    currencies: {
      KRW: 'KRW',
      DOLLAR: 'DOLLAR',
    },
    targetHints: {
      SHIPMENT: 'Selecting a shipment sends its publicId internally.',
      RETURN: 'Only completed returns are shown and the selected return publicId is sent internally.',
    },
    deliveryExceptionNotice: 'Delivery exception settlement is hidden until a selectable list API is available.',
  },
} as const

const content = computed(() => CONTENT[preferences.language])

type VisibleSettlementTargetType = Extract<SettlementTargetType, 'SHIPMENT' | 'RETURN'>

type SettlementCreateForm = {
  supplierPublicId: string
  targetType: VisibleSettlementTargetType
  targetPublicId: string
  settlementPeriodStart: string
  settlementPeriodEnd: string
  currencyCode: SettlementCurrency
  poItemId: number | null
  itemId: number | null
  qty: number
  unitPrice: number
}

type TargetOption = {
  value: string
  label: string
}

const settlements = ref<SettlementListResponseDto[]>([])
const selectedSettlement = ref<SettlementResponseDto | null>(null)
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
const actionErrorMessage = ref('')

const isApproveSubmitting = ref(false)
const isCancelSubmitting = ref(false)

const isCreateModalOpen = ref(false)
const isCreateSubmitting = ref(false)
const createErrorMessage = ref('')

const createForm = ref<SettlementCreateForm>({
  supplierPublicId: '',
  targetType: 'SHIPMENT',
  targetPublicId: '',
  settlementPeriodStart: '',
  settlementPeriodEnd: '',
  currencyCode: 'KRW',
  poItemId: null,
  itemId: null,
  qty: 0,
  unitPrice: 0,
})

const isTargetOptionsLoading = computed(() => {
  return createForm.value.targetType === 'RETURN'
    ? isReturnOptionsLoading.value
    : isShipmentOptionsLoading.value
})

const visibleTargetOptions = computed<TargetOption[]>(() => {
  if (createForm.value.targetType === 'RETURN') {
    return returnOptions.value.map((item) => ({
      value: item.publicId,
      label: `${item.returnNumber} / ${item.returnType} / ${item.returnStatus}`,
    }))
  }

  return shipmentOptions.value.map((item) => ({
    value: item.publicId,
    label: `${item.shipmentNumber} / ${item.carrierName} / ${item.status}`,
  }))
})

watch(
  () => createForm.value.targetType,
  () => {
    createForm.value.targetPublicId = ''

    if (createForm.value.targetType === 'RETURN') {
      createForm.value.poItemId = null
      createForm.value.itemId = null
      createForm.value.qty = 0
      createForm.value.unitPrice = 0
    }
  },
)

function resetCreateForm() {
  createErrorMessage.value = ''
  createForm.value = {
    supplierPublicId: '',
    targetType: 'SHIPMENT',
    targetPublicId: '',
    settlementPeriodStart: '',
    settlementPeriodEnd: '',
    currencyCode: 'KRW',
    poItemId: null,
    itemId: null,
    qty: 0,
    unitPrice: 0,
  }
}

function openCreateModal() {
  resetCreateForm()
  isCreateModalOpen.value = true
}

function closeCreateModal() {
  isCreateModalOpen.value = false
  resetCreateForm()
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
  return `${value.toLocaleString()}${currency ? ` ${currency}` : ''}`
}

function formatTargetType(value: SettlementTargetType) {
  return content.value.targetTypes[value]
}

function formatStatus(value: string) {
  return content.value.statuses[value as keyof typeof content.value.statuses] ?? value
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
    const response = await getSuppliers({
      page: 0,
      size: 100,
    })

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
    const response = await getShipments(0, 100)
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

async function handleSettlementSelect(settlementId: number) {
  isDetailLoading.value = true
  detailErrorMessage.value = ''

  try {
    selectedSettlement.value = await getSettlement(settlementId)
  } catch (err: any) {
    console.error('Failed to fetch settlement detail:', err)
    selectedSettlement.value = null
    detailErrorMessage.value = err?.message ?? 'Failed to load settlement detail.'
  } finally {
    isDetailLoading.value = false
  }
}

async function handleApproveSettlement() {
  if (!selectedSettlement.value) return
  if (!window.confirm(content.value.approveConfirm)) return

  actionErrorMessage.value = ''
  isApproveSubmitting.value = true

  try {
    selectedSettlement.value = await approveSettlement(selectedSettlement.value.id)
    await fetchSettlements()
  } catch (err: any) {
    console.error('Failed to approve settlement:', err)
    actionErrorMessage.value = err?.message ?? content.value.actionErrorFallback
  } finally {
    isApproveSubmitting.value = false
  }
}

async function handleCancelSettlement() {
  if (!selectedSettlement.value) return
  if (!window.confirm(content.value.cancelConfirm)) return

  actionErrorMessage.value = ''
  isCancelSubmitting.value = true

  try {
    selectedSettlement.value = await cancelSettlement(selectedSettlement.value.id)
    await fetchSettlements()
  } catch (err: any) {
    console.error('Failed to cancel settlement:', err)
    actionErrorMessage.value = err?.message ?? content.value.actionErrorFallback
  } finally {
    isCancelSubmitting.value = false
  }
}

function validateCreateForm() {
  if (!createForm.value.supplierPublicId) {
    return content.value.validation.supplier
  }

  if (!createForm.value.targetType) {
    return content.value.validation.targetType
  }

  if (!createForm.value.targetPublicId) {
    return content.value.validation.targetPublicId
  }

  if (!createForm.value.settlementPeriodStart) {
    return content.value.validation.startDate
  }

  if (!createForm.value.settlementPeriodEnd) {
    return content.value.validation.endDate
  }

  if (createForm.value.settlementPeriodEnd < createForm.value.settlementPeriodStart) {
    return content.value.validation.period
  }

  if (createForm.value.targetType !== 'RETURN') {
    if (createForm.value.poItemId == null || createForm.value.poItemId <= 0) {
      return content.value.validation.poItemId
    }

    if (createForm.value.itemId == null || createForm.value.itemId <= 0) {
      return content.value.validation.itemId
    }

    if (!Number.isFinite(createForm.value.qty) || Number(createForm.value.qty) <= 0) {
      return content.value.validation.qty
    }

    if (!Number.isFinite(createForm.value.unitPrice) || Number(createForm.value.unitPrice) < 0) {
      return content.value.validation.unitPrice
    }
  }

  return ''
}

async function handleCreateSettlement() {
  createErrorMessage.value = ''

  const validationMessage = validateCreateForm()
  if (validationMessage) {
    createErrorMessage.value = validationMessage
    return
  }

  isCreateSubmitting.value = true

  try {
    const payload: CreateSettlementRequestDto = {
      supplierPublicId: createForm.value.supplierPublicId,
      targetType: createForm.value.targetType,
      targetPublicId: createForm.value.targetPublicId,
      settlementPeriodStart: createForm.value.settlementPeriodStart,
      settlementPeriodEnd: createForm.value.settlementPeriodEnd,
      currencyCode: createForm.value.currencyCode,
      details:
        createForm.value.targetType === 'RETURN'
          ? []
          : [
              {
                poItemId: Number(createForm.value.poItemId),
                itemId: Number(createForm.value.itemId),
                qty: Number(createForm.value.qty),
                unitPrice: Number(createForm.value.unitPrice),
              },
            ],
    }

    const created = await createSettlement(payload)

    selectedSettlement.value = created
    closeCreateModal()
    await fetchSettlements()
  } catch (err: any) {
    console.error('Failed to create settlement:', err)
    createErrorMessage.value = err?.message ?? content.value.createErrorFallback
  } finally {
    isCreateSubmitting.value = false
  }
}

onMounted(() => {
  fetchSettlements()
  loadSupplierOptions()
  loadShipmentOptions()
  loadReturnOptions()
})
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
        <button
          class="page-button page-button--primary"
          type="button"
          @click="openCreateModal"
        >
          {{ content.createOpenLabel }}
        </button>
      </div>
    </header>

    <section
      style="
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
        gap: 16px;
      "
    >
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.listEyebrow }}</div>
            <h3>{{ content.listTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ settlements.length }}</span>
        </div>

        <div v-if="isListLoading" class="page-table__empty">
          {{ content.loadingList }}
        </div>

        <div v-else-if="listErrorMessage" class="page-table__empty">
          {{ listErrorMessage }}
        </div>

        <div v-else-if="settlements.length === 0" class="page-table__empty">
          {{ content.emptyList }}
        </div>

        <div v-else class="page-table terminal-page__table">
          <div class="page-table__row page-table__row--head">
            <span>{{ content.fields.id }}</span>
            <span>{{ content.fields.supplier }}</span>
            <span>{{ content.fields.targetType }}</span>
            <span>{{ content.fields.amount }}</span>
            <span>{{ content.fields.status }}</span>
            <span>{{ content.selectLabel }}</span>
          </div>

          <div
            v-for="settlement in settlements"
            :key="settlement.id"
            class="page-table__row"
          >
            <span>{{ settlement.id }}</span>
            <span>{{ getSupplierLabel(settlement.supplierPublicId) }}</span>
            <span>{{ formatTargetType(settlement.targetType) }}</span>
            <span>{{ formatAmount(settlement.amount, settlement.currencyCode) }}</span>
            <span>{{ formatStatus(settlement.settlementStatus) }}</span>
            <span>
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="handleSettlementSelect(settlement.id)"
              >
                {{ content.selectLabel }}
              </button>
            </span>
          </div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ content.detailEyebrow }}</div>
            <h3>{{ content.detailTitle }}</h3>
          </div>
        </div>

        <div v-if="isDetailLoading" class="page-table__empty">
          {{ content.loadingDetail }}
        </div>

        <div v-else-if="detailErrorMessage" class="page-table__empty">
          {{ detailErrorMessage }}
        </div>

        <div v-else-if="!selectedSettlement" class="page-table__empty">
          {{ content.emptyDetail }}
        </div>

        <template v-else>
          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.id }}</span>
              <strong class="page-feed__text">{{ selectedSettlement.id }}</strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.supplier }}</span>
              <strong class="page-feed__text">
                {{ getSupplierLabel(selectedSettlement.supplierPublicId) }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.targetType }}</span>
              <strong class="page-feed__text">
                {{ formatTargetType(selectedSettlement.targetType) }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.targetSelection }}</span>
              <strong class="page-feed__text">
                {{ getTargetLabel(selectedSettlement.targetType, selectedSettlement.targetPublicId) }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.period }}</span>
              <strong class="page-feed__text">
                {{
                  formatDateRange(
                    selectedSettlement.settlementPeriodStart,
                    selectedSettlement.settlementPeriodEnd,
                  )
                }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.amount }}</span>
              <strong class="page-feed__text">
                {{ formatAmount(selectedSettlement.amount, selectedSettlement.currencyCode) }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.status }}</span>
              <strong class="page-feed__text">
                {{ formatStatus(selectedSettlement.settlementStatus) }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.settledAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedSettlement.settledAt) }}</strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.approvedBy }}</span>
              <strong class="page-feed__text">
                {{ selectedSettlement.approvedByUserPublicId || '-' }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.cancelledAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedSettlement.cancelledAt) }}</strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.cancelledBy }}</span>
              <strong class="page-feed__text">
                {{ selectedSettlement.cancelledByUserPublicId || '-' }}
              </strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.createdAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedSettlement.createdAt) }}</strong>
            </div>

            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.fields.updatedAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedSettlement.updatedAt) }}</strong>
            </div>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
            <button
              class="page-button page-button--primary"
              type="button"
              :disabled="
                isApproveSubmitting ||
                isCancelSubmitting ||
                selectedSettlement.settlementStatus !== 'PENDING'
              "
              @click="handleApproveSettlement"
            >
              {{ isApproveSubmitting ? content.approvingLabel : content.approveLabel }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="
                isApproveSubmitting ||
                isCancelSubmitting ||
                selectedSettlement.settlementStatus !== 'PENDING'
              "
              @click="handleCancelSettlement"
            >
              {{ isCancelSubmitting ? content.cancellingLabel : content.cancelLabel }}
            </button>
          </div>

          <div
            v-if="actionErrorMessage"
            style="color: var(--color-critical); font-size: 0.875rem; margin-top: 12px;"
          >
            {{ actionErrorMessage }}
          </div>

          <article class="page-panel" style="margin-top: 16px;">
            <div class="page-panel__head">
              <div>
                <div class="page-panel__eyebrow">{{ content.itemEyebrow }}</div>
                <h3>{{ content.itemTitle }}</h3>
              </div>
              <span class="page-panel__chip">{{ selectedSettlement.details.length }}</span>
            </div>

            <div
              v-if="selectedSettlement.details.length === 0"
              class="page-table__empty"
            >
              {{ content.emptyDetails }}
            </div>

            <div v-else class="page-table terminal-page__table">
              <div class="page-table__row page-table__row--head">
                <span>{{ content.fields.poItemId }}</span>
                <span>{{ content.fields.itemId }}</span>
                <span>{{ content.fields.qty }}</span>
                <span>{{ content.fields.unitPrice }}</span>
                <span>{{ content.fields.detailAmount }}</span>
                <span>{{ content.fields.detailStatus }}</span>
              </div>

              <div
                v-for="item in selectedSettlement.details"
                :key="item.publicId"
                class="page-table__row"
              >
                <span>{{ item.poItemId }}</span>
                <span>{{ item.itemId }}</span>
                <span>{{ Number(item.qty).toLocaleString() }}</span>
                <span>{{ Number(item.unitPrice).toLocaleString() }}</span>
                <span>{{ Number(item.amount).toLocaleString() }}</span>
                <span>{{ item.detailStatus }}</span>
              </div>
            </div>
          </article>
        </template>
      </article>
    </section>
  </section>

  <BaseModal
    v-model="isCreateModalOpen"
    :title="content.createModalTitle"
    :description="content.createModalDescription"
    size="lg"
    @close="closeCreateModal"
  >
    <div
      class="page-form"
      style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px;"
    >
      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.fields.supplier }}
        </span>
        <select
          v-model="createForm.supplierPublicId"
          style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high);"
        >
          <option value="">
            {{ isSupplierOptionsLoading ? content.placeholders.loading : content.placeholders.supplier }}
          </option>
          <option
            v-for="supplier in supplierOptions"
            :key="supplier.publicId"
            :value="supplier.publicId"
            style="background-color: var(--color-surface); color: var(--color-on-surface);"
          >
            {{ supplier.supplierName }} ({{ supplier.supplierCode }})
          </option>
        </select>
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.fields.targetType }}
        </span>
        <select
          v-model="createForm.targetType"
          style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high);"
        >
          <option value="SHIPMENT">{{ content.targetTypes.SHIPMENT }}</option>
          <option value="RETURN">{{ content.targetTypes.RETURN }}</option>
        </select>
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.fields.targetSelection }}
        </span>
        <select
          v-model="createForm.targetPublicId"
          style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high);"
        >
          <option value="">
            {{ isTargetOptionsLoading ? content.placeholders.loading : content.placeholders.target }}
          </option>
          <option
            v-for="option in visibleTargetOptions"
            :key="option.value"
            :value="option.value"
            style="background-color: var(--color-surface); color: var(--color-on-surface);"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.fields.currencyCode }}
        </span>
        <select
          v-model="createForm.currencyCode"
          style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high);"
        >
          <option value="KRW">{{ content.currencies.KRW }}</option>
          <option value="DOLLAR">{{ content.currencies.DOLLAR }}</option>
        </select>
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.fields.startDate }}
        </span>
        <input
          v-model="createForm.settlementPeriodStart"
          type="date"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.fields.endDate }}
        </span>
        <input
          v-model="createForm.settlementPeriodEnd"
          type="date"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
      </label>

      <div style="grid-column: 1 / -1; font-size: 0.875rem; opacity: 0.75;">
        {{
          createForm.targetType === 'RETURN'
            ? content.targetHints.RETURN
            : content.targetHints.SHIPMENT
        }}
      </div>

      <div style="grid-column: 1 / -1; font-size: 0.8125rem; opacity: 0.65;">
        {{ content.deliveryExceptionNotice }}
      </div>

      <template v-if="createForm.targetType !== 'RETURN'">
        <div style="grid-column: 1 / -1; font-size: 0.875rem; opacity: 0.75;">
          {{ content.fields.manualDetail }}
        </div>

        <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
          <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
            {{ content.fields.poItemId }}
          </span>
          <input
            v-model.number="createForm.poItemId"
            type="number"
            min="1"
            :placeholder="content.placeholders.poItemId"
            style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
          />
        </label>

        <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
          <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
            {{ content.fields.itemId }}
          </span>
          <input
            v-model.number="createForm.itemId"
            type="number"
            min="1"
            :placeholder="content.placeholders.itemId"
            style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
          />
        </label>

        <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
          <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
            {{ content.fields.qty }}
          </span>
          <input
            v-model.number="createForm.qty"
            type="number"
            min="0.01"
            step="0.01"
            style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
          />
        </label>

        <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
          <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
            {{ content.fields.unitPrice }}
          </span>
          <input
            v-model.number="createForm.unitPrice"
            type="number"
            min="0"
            step="0.01"
            style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
          />
        </label>
      </template>
    </div>

    <div
      v-if="createErrorMessage"
      style="color: var(--color-critical); font-size: 0.875rem; margin-top: 16px;"
    >
      {{ createErrorMessage }}
    </div>

    <template #footer>
      <button
        class="page-button page-button--secondary"
        type="button"
        @click="closeCreateModal"
      >
        {{ content.createCancelLabel }}
      </button>

      <button
        class="page-button page-button--primary"
        type="button"
        :disabled="isCreateSubmitting"
        @click="handleCreateSettlement"
      >
        {{ isCreateSubmitting ? content.createSubmittingLabel : content.createSubmitLabel }}
      </button>
    </template>
  </BaseModal>
</template>
