<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BaseModal } from '../../shared'
import type { CreateLotRequestDto } from '../../../services/lot'
import { getMySupplier, type SupplierResponseDto } from '../../../services/supplier'
import { getItems, type ItemResponseDto } from '../../../services/item'
import {
  getPurchaseOrders,
  type PurchaseOrderSummaryResponseDto,
  type PurchaseOrderDetailResponseDto,
  getPurchaseOrder,
} from '../../../services/purchaseOrder'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  submit: [data: CreateLotRequestDto]
}>()

// 로그인한 협력사 정보 자동 세팅
const mySupplier = ref<SupplierResponseDto | null>(null)
const isLoadingSupplier = ref(false)

const form = ref<CreateLotRequestDto>({
  lotNumber: '',
  sourcePoItemPublicId: '',
  supplierPublicId: '',
  itemPublicId: '',
  qty: 0,
  unit: 'EA',
  manufacturedAt: '',
  expiredAt: ''
})

// 발주 목록 (내 협력사 관련)
const purchaseOrders = ref<PurchaseOrderSummaryResponseDto[]>([])
const selectedPoPublicId = ref('')
const poDetail = ref<PurchaseOrderDetailResponseDto | null>(null)
const isLoadingPo = ref(false)

// 품목 목록 (선택된 발주의 아이템 또는 전체)
const items = ref<ItemResponseDto[]>([])

// 선택된 품목의 유통기한 일수
const selectedItemShelfLifeDays = ref<number>(0)

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 로트 등록',
        desc: '공급 로트 번호 및 수량 등 생산 내역을 기입합니다.',
        lotNumber: '로트 번호',
        poSelect: '발주 선택',
        poItemSelect: '연동할 발주 내역 (선택)',
        supplier: '협력사',
        item: '생산 대상 품목',
        qty: '수량',
        unit: '단위',
        mfgDate: '제조일 (생산일)',
        expDate: '유통기한 (만료일)',
        cancel: '취소',
        submit: '등록',
        selectPlaceholder: '선택',
        autoCalculated: '(자동 계산됨)',
        noPoItems: '발주를 먼저 선택해 주세요.',
        loadingSupplier: '협력사 정보 로딩 중...',
      }
    : {
        title: 'New Lot Registration',
        desc: 'Enter the supply lot number and production details.',
        lotNumber: 'Lot Number',
        poSelect: 'Purchase Order',
        poItemSelect: 'Link PO Item (Optional)',
        supplier: 'Supplier',
        item: 'Target Item to Produce',
        qty: 'Quantity',
        unit: 'Unit',
        mfgDate: 'Manufactured Date',
        expDate: 'Expiry Date',
        cancel: 'CANCEL',
        submit: 'SUBMIT',
        selectPlaceholder: 'Select',
        autoCalculated: '(Auto-calculated)',
        noPoItems: 'Please select a PO first.',
        loadingSupplier: 'Loading supplier...',
      }
})

// 모달이 열릴 때마다 초기화 및 데이터 로드
watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      resetForm()
      await loadMySupplier()
    }
  },
  { immediate: true },
)

// 내 협력사 정보를 조회하고, 관련 발주 목록을 로드
function generateLotNumber(supplier: SupplierResponseDto) {
  const year = new Date().getFullYear()
  
  // 협력사 코드나 이름에서 첫 번째 영문 알파벳 추출, 없으면 기본값 'X'
  const match = (supplier.supplierCode + supplier.supplierName).match(/[A-Za-z]/)
  const firstLetter = match ? match[0].toUpperCase() : 'X'
  
  // 4자리 난수 (1000 ~ 9999)
  const random4 = Math.floor(1000 + Math.random() * 9000)
  
  return `LOT-${year}-${firstLetter}${random4}`
}

async function loadMySupplier() {
  try {
    isLoadingSupplier.value = true
    const supplier = await getMySupplier()
    mySupplier.value = supplier
    form.value.supplierPublicId = supplier.publicId
    
    // LOT 번호 자동 생성
    if (!form.value.lotNumber) {
      form.value.lotNumber = generateLotNumber(supplier)
    }

    // 내 협력사의 발주 목록을 가져옵니다 (SUPPLIER 뷰)
    await loadPurchaseOrders(supplier.publicId)
    // 전체 품목 목록도 로드 (발주가 없을 때를 대비)
    await loadItems()
  } catch (error) {
    console.error('Failed to load supplier info', error)
    mySupplier.value = null
    // 협력사 정보 가져오기 실패 시 전체 품목만 로드
    await loadItems()
  } finally {
    isLoadingSupplier.value = false
  }
}

async function loadPurchaseOrders(supplierPublicId: string) {
  try {
    isLoadingPo.value = true
    const res = await getPurchaseOrders({
      viewType: 'SUPPLIER',
      supplierPublicId,
      page: 0,
      size: 200,
    })
    purchaseOrders.value = res.content || []
  } catch (error) {
    console.error('Failed to load purchase orders', error)
    purchaseOrders.value = []
  } finally {
    isLoadingPo.value = false
  }
}

async function loadItems() {
  try {
    const res = await getItems({ page: 0, size: 200 })
    if (res && res.content) {
      items.value = res.content
    }
  } catch (error) {
    console.error('Failed to load items', error)
    items.value = []
  }
}

// 발주(PO) 선택 시 → 해당 PO의 상세를 로드하여 품목 드롭다운에 반영
watch(selectedPoPublicId, async (newPoPublicId) => {
  if (!newPoPublicId) {
    poDetail.value = null
    form.value.sourcePoItemPublicId = ''
    return
  }
  try {
    const detail = await getPurchaseOrder(newPoPublicId)
    poDetail.value = detail
    // 발주 상세 아이템이 1개면 자동 선택
    if (detail.items && detail.items.length === 1) {
      form.value.sourcePoItemPublicId = detail.items[0].poItemPublicId
      // 해당 품목도 자동 세팅
      form.value.itemPublicId = detail.items[0].itemPublicId
      updateUnitFromItem(detail.items[0].itemPublicId)
    } else {
      form.value.sourcePoItemPublicId = ''
    }
  } catch (error) {
    console.error('Failed to load PO detail', error)
    poDetail.value = null
  }
})

// 발주 상세 항목 선택 시 → 해당 품목 자동 세팅
function handlePoItemChange(poItemPublicId: string) {
  if (!poDetail.value) return
  const poItem = poDetail.value.items.find(i => i.poItemPublicId === poItemPublicId)
  if (poItem) {
    form.value.itemPublicId = poItem.itemPublicId
    updateUnitFromItem(poItem.itemPublicId)
  }
}

// 품목 선택 시 단위(unit)와 유통기한 일수(shelfLifeDays) 업데이트
function updateUnitFromItem(itemPublicId: string) {
  const item = items.value.find(i => i.publicId === itemPublicId)
  if (item) {
    form.value.unit = item.unit
    selectedItemShelfLifeDays.value = item.shelfLifeDays || 0
    // 제조일이 이미 입력되어 있으면 유통기한 자동 계산
    if (form.value.manufacturedAt && selectedItemShelfLifeDays.value > 0) {
      calculateExpiry()
    }
  }
}

// 품목 직접 선택 핸들러
function handleItemChange(itemPublicId: string) {
  updateUnitFromItem(itemPublicId)
}

// 제조일 변경 시 유통기한 자동 계산
watch(
  () => form.value.manufacturedAt,
  (newDate) => {
    if (newDate && selectedItemShelfLifeDays.value > 0) {
      calculateExpiry()
    }
  },
)

// 유통기한 계산 로직: 제조일 + shelfLifeDays
function calculateExpiry() {
  if (!form.value.manufacturedAt || selectedItemShelfLifeDays.value <= 0) return

  const mfgDate = new Date(form.value.manufacturedAt)
  mfgDate.setDate(mfgDate.getDate() + selectedItemShelfLifeDays.value)

  // datetime-local 형식으로 변환 (YYYY-MM-DDTHH:mm)
  const year = mfgDate.getFullYear()
  const month = String(mfgDate.getMonth() + 1).padStart(2, '0')
  const day = String(mfgDate.getDate()).padStart(2, '0')
  const hours = String(mfgDate.getHours()).padStart(2, '0')
  const minutes = String(mfgDate.getMinutes()).padStart(2, '0')
  form.value.expiredAt = `${year}-${month}-${day}T${hours}:${minutes}`
}

function resetForm() {
  form.value = {
    lotNumber: '',
    sourcePoItemPublicId: '',
    supplierPublicId: '',
    itemPublicId: '',
    qty: 0,
    unit: 'EA',
    manufacturedAt: '',
    expiredAt: '',
  }
  selectedPoPublicId.value = ''
  poDetail.value = null
  selectedItemShelfLifeDays.value = 0
}

function handleSubmit() {
  if (
    !form.value.lotNumber ||
    !form.value.supplierPublicId ||
    !form.value.itemPublicId ||
    form.value.qty <= 0 ||
    !form.value.manufacturedAt
  ) {
    alert(
      props.language === 'ko'
        ? '필수 값(*)을 정확히 입력해주세요.'
        : 'Please fill in all required (*) fields.',
    )
    return
  }

  const data = { ...form.value }
  if (!data.expiredAt) {
    delete data.expiredAt
  }
  // sourcePoItemPublicId가 비어있으면 빈 문자열로 그대로 전송
  emit('submit', data)
}
</script>

<template>
  <BaseModal
    :model-value="isOpen"
    :title="content.title"
    :description="content.desc"
    size="md"
    @update:model-value="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="lot-create-modal__form">
      <!-- 로트 번호 (자동 생성, 필수) -->
      <div class="terminal-form-group">
        <label>
          <span>{{ content.lotNumber }} <em class="required-mark">*</em> <em class="auto-calc-mark">{{ content.autoCalculated }}</em></span>
          <input 
            v-model="form.lotNumber" 
            type="text" 
            readonly 
            disabled 
            class="readonly-field" 
            required 
          />
        </label>
      </div>

      <!-- 협력사 (자동 세팅, 읽기 전용) -->
      <div class="terminal-form-group">
        <label>
          <span>{{ content.supplier }}</span>
          <input
            :value="mySupplier ? mySupplier.supplierName : (isLoadingSupplier ? content.loadingSupplier : '-')"
            type="text"
            readonly
            disabled
            class="readonly-field"
          />
        </label>
      </div>

      <!-- 발주 선택 (드롭다운) -->
      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.poSelect }}</span>
            <select v-model="selectedPoPublicId" :disabled="isLoadingPo">
              <option value="">{{ content.selectPlaceholder }}</option>
              <option
                v-for="po in purchaseOrders"
                :key="po.poPublicId"
                :value="po.poPublicId"
              >
                {{ po.poNumber }} ({{ po.supplierName }})
              </option>
            </select>
          </label>
        </div>
        <!-- 발주 상세 항목 (드롭다운) [31 버그 수정 포인트] -->
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.poItemSelect }}</span>
            <select
              v-model="form.sourcePoItemPublicId"
              :disabled="!poDetail || !poDetail.items || poDetail.items.length === 0"
              @change="handlePoItemChange(form.sourcePoItemPublicId)"
            >
              <option value="">{{ poDetail ? content.selectPlaceholder : content.noPoItems }}</option>
              <option
                v-for="poItem in (poDetail?.items || [])"
                :key="poItem.poItemPublicId"
                :value="poItem.poItemPublicId"
              >
                {{ poItem.itemName }} ({{ poItem.orderedQty }} {{ poItem.unit }})
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- 품목 선택 (필수) -->
      <div class="terminal-form-group">
        <label>
          <span>{{ content.item }} <em class="required-mark">*</em></span>
          <select
            v-model="form.itemPublicId"
            required
            :disabled="!!form.sourcePoItemPublicId"
            :class="{ 'readonly-field': !!form.sourcePoItemPublicId }"
            @change="handleItemChange(form.itemPublicId)"
          >
            <option value="" disabled>{{ content.selectPlaceholder }}</option>
            <option v-for="i in items" :key="i.publicId" :value="i.publicId">
              {{ i.itemName }} ({{ i.unit }}, {{ language === 'ko' ? '유통기한' : 'Shelf Life' }}: {{ i.shelfLifeDays }}{{ language === 'ko' ? '일' : 'd' }})
            </option>
          </select>
        </label>
      </div>

      <!-- 수량 / 단위 -->
      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 2;">
          <label>
            <span>{{ content.qty }} <em class="required-mark">*</em></span>
            <input v-model.number="form.qty" type="number" step="0.01" min="0" required />
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.unit }}</span>
            <input v-model="form.unit" type="text" readonly disabled class="readonly-field" />
          </label>
        </div>
      </div>

      <!-- 제조일 / 유통기한 -->
      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.mfgDate }} <em class="required-mark">*</em></span>
            <input v-model="form.manufacturedAt" type="datetime-local" required />
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>
              {{ content.expDate }}
              <em v-if="selectedItemShelfLifeDays > 0" class="auto-calc-mark">{{ content.autoCalculated }}</em>
            </span>
            <input
              v-model="form.expiredAt"
              type="datetime-local"
              :readonly="selectedItemShelfLifeDays > 0"
              :class="{ 'readonly-field': selectedItemShelfLifeDays > 0 }"
            />
          </label>
        </div>
      </div>

      <div class="terminal-form-actions">
        <button class="page-button page-button--secondary" type="button" @click="emit('close')">
          {{ content.cancel }}
        </button>
        <button class="page-button page-button--primary" type="submit">
          {{ content.submit }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.lot-create-modal__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}

.terminal-form-group label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terminal-form-group span {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant, #919191);
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 필수 항목 빨간 별표 */
.required-mark {
  color: var(--color-critical, #ff3344);
  font-style: normal;
  font-size: 0.85rem;
  font-weight: 700;
}

/* 자동 계산 표시 */
.auto-calc-mark {
  color: var(--color-info, #4dabf7);
  font-style: normal;
  font-size: 0.65rem;
  font-weight: 400;
}

.terminal-form-group input,
.terminal-form-group select {
  font-family: inherit;
  font-size: 0.875rem;
  background: transparent;
  color: var(--color-on-surface);
  border: none;
  outline: none;
  border-bottom: 2px solid var(--color-surface-container-high);
  padding: 8px 0;
  transition: border-color 0.2s;
}

.terminal-form-group select option {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

.terminal-form-group input:focus,
.terminal-form-group select:focus {
  border-bottom-color: var(--color-primary);
}

/* 읽기 전용 필드 스타일 */
.readonly-field {
  opacity: 0.6;
  cursor: not-allowed;
  border-bottom-style: dashed !important;
}

.terminal-form-row {
  display: flex;
  gap: 16px;
}

.terminal-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
