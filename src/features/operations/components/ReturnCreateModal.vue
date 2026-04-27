<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BaseModal } from '../../shared'
import { createReturn, type CreateReturnRequestDto, type CreateReturnItemDto } from '../../../services/return'
import { getOrganizations, type OrganizationListItem } from '../../../services/organization'
import { getItems, type ItemResponseDto } from '../../../services/item'
import { getPurchaseOrders, getPurchaseOrder } from '../../../services/purchaseOrder'
import { getShipments, getShipmentLotMappings, type ShipmentListResponseDto } from '../../../services/shipment'
import { getLot } from '../../../services/lot'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

// 조직 목록
const organizations = ref<OrganizationListItem[]>([])
const isOrganizationsLoading = ref(false)

// 로그인한 사용자의 조직 정보
const myOrganization = ref<OrganizationListItem | null>(null)
const myOrgType = ref<string>('') // 'BUYER' | 'SUPPLIER' | 'ADMIN'

// 대상 조직 드롭다운: 로그인한 조직이 SUPPLIER이면 BUYER만, BUYER이면 SUPPLIER만 보여줍니다.
const targetOrganizations = computed(() => {
  if (myOrgType.value === 'SUPPLIER') {
    return organizations.value.filter((org) => org.organizationType === 'BUYER')
  }
  // BUYER이거나 기타인 경우 SUPPLIER만 보여줍니다.
  return organizations.value.filter((org) => org.organizationType === 'SUPPLIER')
})

// 품목 목록 (발주 기반으로 필터링됨)
const items = ref<ItemResponseDto[]>([])
const poItems = ref<{ itemPublicId: string; itemName: string; unit: string; orderedQty: number; poNumber: string; lotPublicId?: string }[]>([])
const isLoadingPoItems = ref(false)

// 출하(Shipment) 목록
const shipments = ref<ShipmentListResponseDto[]>([])
const isLoadingShipments = ref(false)
const isShipmentSelected = ref(false)

function createEmptyItem(): CreateReturnItemDto {
  return {
    itemPublicId: '',
    itemName: '',
    lotPublicId: '',
    returnQty: 1,
    unit: 'EA',
    detailReason: ''
  }
}

// 반품 번호 자동 생성
function generateReturnNumber(): string {
  const year = new Date().getFullYear()
  const random4 = Math.floor(1000 + Math.random() * 9000)
  return `RT-${year}-${random4}`
}

const form = ref<CreateReturnRequestDto>({
  returnNumber: generateReturnNumber(),
  sourceShipmentPublicId: '',
  requestOrganizationPublicId: '',
  requestOrganizationName: '',
  targetOrganizationPublicId: '',
  targetOrganizationName: '',
  returnType: 'DEFECTIVE',
  returnReason: '',
  attachmentPublicIds: [],
  items: [createEmptyItem()]
})

const isSubmitting = ref(false)

// 조직 목록 로드 및 로그인한 사용자 조직 자동 세팅
async function loadOrganizations() {
  try {
    isOrganizationsLoading.value = true
    const response = await getOrganizations({ page: 0, size: 100 })
    organizations.value = response.content ?? []

    // 세션에서 로그인한 조직 정보 가져오기
    const currentOrganizationPublicId =
      window.sessionStorage.getItem('atlas-organization-public-id') ?? ''
    const currentOrganizationType =
      window.sessionStorage.getItem('atlas-organization-type') ?? ''

    myOrgType.value = currentOrganizationType

    if (currentOrganizationPublicId) {
      const currentOrganization = organizations.value.find(
        (org) => org.organizationPublicId === currentOrganizationPublicId,
      )

      if (currentOrganization) {
        myOrganization.value = currentOrganization
        form.value.requestOrganizationPublicId = currentOrganization.organizationPublicId
        form.value.requestOrganizationName = currentOrganization.organizationName
      }
    }
  } catch (error) {
    console.error('Failed to load organizations', error)
    organizations.value = []
  } finally {
    isOrganizationsLoading.value = false
  }
}

// 품목 목록 로드 (전체 - fallback용)
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

// 대상 조직 선택 시 해당 조직과의 발주(PO) 품목만 로드
async function loadPoItemsByTargetOrg(targetOrgPublicId: string) {
  isLoadingPoItems.value = true
  poItems.value = []
  // 기존 선택된 품목 초기화
  form.value.items = [createEmptyItem()]
  
  try {
    // viewType: 로그인한 조직이 SUPPLIER이면 SUPPLIER 뷰, 아니면 BUYER 뷰
    const viewType = myOrgType.value === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER'
    // SUPPLIER 뷰에서는 supplierPublicId가 필요 없음 (본인 기준)
    // BUYER 뷰에서는 supplierPublicId로 특정 협력사 발주 필터링
    const params = viewType === 'BUYER'
      ? { viewType, supplierPublicId: targetOrgPublicId, page: 0, size: 100 }
      : { viewType, page: 0, size: 100 }
    
    const poRes = await getPurchaseOrders(params as any)
    const poList = poRes.content || []
    
    // 각 PO의 상세 조회하여 품목 수집
    const allPoItems: typeof poItems.value = []
    const seen = new Set<string>() // 중복 품목 방지
    
    for (const po of poList) {
      try {
        const detail = await getPurchaseOrder(po.poPublicId)
        if (detail.items) {
          for (const item of detail.items) {
            if (!seen.has(item.itemPublicId)) {
              seen.add(item.itemPublicId)
              allPoItems.push({
                itemPublicId: item.itemPublicId,
                itemName: item.itemName,
                unit: item.unit,
                orderedQty: item.orderedQty,
                poNumber: po.poNumber,
              })
            }
          }
        }
      } catch (e) {
        console.warn(`PO 상세 조회 실패: ${po.poPublicId}`, e)
      }
    }
    
    poItems.value = allPoItems
  } catch (error) {
    console.error('Failed to load PO items', error)
    poItems.value = []
  } finally {
    isLoadingPoItems.value = false
  }
}

// 대상 조직 선택 시 출하(Shipment) 목록도 함께 로드
async function loadShipmentsForOrg() {
  isLoadingShipments.value = true
  try {
    const res = await getShipments({ page: 0, size: 50 })
    shipments.value = res.content
  } catch (err) {
    console.error('Failed to load shipments', err)
    shipments.value = []
  } finally {
    isLoadingShipments.value = false
  }
}

// 출하 선택 변경 시 해당 출하의 LOT 품목 로드
async function handleShipmentChange() {
  if (!form.value.sourceShipmentPublicId) {
    isShipmentSelected.value = false
    // 출하 선택 취소 시 다시 해당 조직의 발주 품목으로 복구
    if (form.value.targetOrganizationPublicId) {
      loadPoItemsByTargetOrg(form.value.targetOrganizationPublicId)
    }
    return
  }
  
  isShipmentSelected.value = true
  isLoadingPoItems.value = true
  poItems.value = []
  form.value.items = [createEmptyItem()]
  
  try {
    const mappings = await getShipmentLotMappings(form.value.sourceShipmentPublicId)
    const shipmentItems: typeof poItems.value = []
    
    for (const map of mappings) {
      try {
        const lot = await getLot(map.lotPublicId)
        shipmentItems.push({
          itemPublicId: lot.itemPublicId,
          itemName: lot.itemName,
          unit: lot.unit,
          orderedQty: map.shippedQty,
          poNumber: `LOT: ${lot.lotNumber}`, // 화면에 보여줄 텍스트 (기존 발주 번호 필드 재활용)
          lotPublicId: lot.publicId
        })
      } catch (err) {
        console.warn(`Failed to fetch lot detail: ${map.lotPublicId}`, err)
      }
    }
    poItems.value = shipmentItems
  } catch (err) {
    console.error('Failed to load shipment lot mappings', err)
    poItems.value = []
  } finally {
    isLoadingPoItems.value = false
  }
}

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 반품 요청',
        desc: '발주 또는 출하된 품목에 대해 반품을 요청합니다.',
        returnNo: '반품 번호',
        sourceShipment: '원천 출하 (선택)',
        reqOrg: '요청 조직',
        targetOrg: '대상 조직 (반품 수신처)',
        type: '반품 유형',
        reason: '반품 사유',
        items: '반품 대상 품목',
        item: '품목',
        lot: 'LOT (선택)',
        qty: '수량',
        unit: '단위',
        itemReason: '상세 사유',
        addBtn: '+ 품목 추가',
        delBtn: '삭제',
        cancel: '취소',
        submit: '반품 요청',
        selectPlaceholder: '선택',
        autoGenerated: '자동생성',
        autoSet: '자동설정',
        required: '*',
      }
    : {
        title: 'Create Return Request',
        desc: 'Request a return for ordered or shipped items.',
        returnNo: 'Return No.',
        reqOrg: 'Request Organization',
        targetOrg: 'Target Organization',
        type: 'Return Type',
        reason: 'Return Reason',
        items: 'Return Items',
        item: 'Item',
        lot: 'LOT (Optional)',
        qty: 'Qty',
        unit: 'Unit',
        itemReason: 'Detail Reason',
        addBtn: '+ Add Item',
        delBtn: 'Del',
        cancel: 'Cancel',
        submit: 'Submit Request',
        selectPlaceholder: 'Select',
        autoGenerated: 'Auto',
        autoSet: 'Auto',
        required: '*',
        shipmentLoading: 'Loading shipments...',
        selectShipmentFirst: 'Select shipment (optional)',
      }
})

// 반품 유형 옵션
const returnTypeOptions = computed(() => {
  return props.language === 'ko'
    ? [
        { value: 'DEFECTIVE', label: '불량' },
        { value: 'DAMAGE', label: '파손' },
        { value: 'MISDELIVERY', label: '오배송' },
        { value: 'SIMPLE_RETURN', label: '단순 반품' },
      ]
    : [
        { value: 'DEFECTIVE', label: 'Defective' },
        { value: 'DAMAGE', label: 'Damage' },
        { value: 'MISDELIVERY', label: 'Misdelivery' },
        { value: 'SIMPLE_RETURN', label: 'Simple Return' },
      ]
})

function handleTargetOrgChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  const found = targetOrganizations.value.find((o) => o.organizationPublicId === val)
  if (found) {
    form.value.targetOrganizationName = found.organizationName
    form.value.sourceShipmentPublicId = '' // 대상 조직 변경 시 출하 선택 초기화
    isShipmentSelected.value = false
    // 대상 조직 변경 시 해당 조직과의 발주 품목을 로드
    loadPoItemsByTargetOrg(found.organizationPublicId)
    // 연관된 출하 목록 로드
    loadShipmentsForOrg()
  }
}

function handleItemChange(index: number, e: Event) {
  const val = (e.target as HTMLSelectElement).value
  // poItems에서 먼저 검색 (발주 또는 출하 LOT)
  const foundPo = poItems.value.find(i => i.itemPublicId === val)
  if (foundPo) {
    form.value.items[index].itemName = foundPo.itemName
    form.value.items[index].unit = foundPo.unit
    if (foundPo.lotPublicId) {
      form.value.items[index].lotPublicId = foundPo.lotPublicId
    }
    return
  }
  // fallback: 전체 품목에서 검색
  const found = items.value.find(i => i.publicId === val)
  if (found) {
    form.value.items[index].itemName = found.itemName
    form.value.items[index].unit = found.unit
  }
}

function addItem() {
  form.value.items.push(createEmptyItem())
}

function removeItem(index: number) {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

// 모달이 열릴 때마다 폼 초기화 및 데이터 로드
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      form.value = {
        returnNumber: generateReturnNumber(),
        sourceShipmentPublicId: '',
        requestOrganizationPublicId: '',
        requestOrganizationName: '',
        targetOrganizationPublicId: '',
        targetOrganizationName: '',
        returnType: 'DEFECTIVE',
        returnReason: '',
        attachmentPublicIds: [],
        items: [createEmptyItem()]
      }
      loadOrganizations()
      loadItems()
    }
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!form.value.targetOrganizationPublicId) {
    alert(props.language === 'ko' ? '대상 조직을 선택해주세요.' : 'Please select target organization.')
    return
  }
  if (!form.value.returnReason.trim()) {
    alert(props.language === 'ko' ? '반품 사유를 입력해주세요.' : 'Please enter a return reason.')
    return
  }
  if (form.value.items.some(i => !i.itemPublicId || i.returnQty <= 0)) {
    alert(props.language === 'ko' ? '모든 품목과 수량(0보다 큼)을 올바르게 선택해주세요.' : 'Please select items and ensure qty > 0.')
    return
  }
  
  try {
    isSubmitting.value = true
    await createReturn(form.value)
    alert(props.language === 'ko' ? '반품 요청이 완료되었습니다.' : 'Return request completed.')
    emit('success')
  } catch (error: any) {
    console.error('Failed to create return', error)
    alert(error.message || 'Error occurred while creating return request.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="isOpen"
    :title="content.title"
    :description="content.desc"
    size="lg"
    @update:model-value="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="return-create-modal__form">
      
      <!-- 반품 번호 (자동 생성, Read-only) -->
      <div class="terminal-grid-2">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.returnNo }} <em class="required-mark">{{ content.required }}</em> <em class="auto-calc-mark">{{ content.autoGenerated }}</em></span>
            <input v-model="form.returnNumber" type="text" required readonly disabled class="readonly-field" />
          </label>
        </div>
        <div class="terminal-form-group">
          <label>
            <span>{{ content.type }} <em class="required-mark">{{ content.required }}</em></span>
            <select v-model="form.returnType" :disabled="isSubmitting">
              <option v-for="opt in returnTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </label>
        </div>
      </div>

      <!-- 요청 조직 (자동 세팅, Read-only) / 대상 조직 -->
      <div class="terminal-grid-2">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.reqOrg }} <em class="required-mark">{{ content.required }}</em> <em class="auto-calc-mark">{{ content.autoSet }}</em></span>
            <input
              :value="myOrganization?.organizationName || '로딩 중...'"
              type="text"
              readonly
              disabled
              class="readonly-field"
            />
          </label>
        </div>
        <div class="terminal-form-group">
          <label>
            <span>{{ content.targetOrg }} <em class="required-mark">{{ content.required }}</em></span>
            <select
              v-model="form.targetOrganizationPublicId"
              @change="handleTargetOrgChange"
              required
              :disabled="isSubmitting || isOrganizationsLoading"
            >
              <option value="" disabled>{{ content.selectPlaceholder }}</option>
              <option
                v-for="org in targetOrganizations"
                :key="org.organizationPublicId"
                :value="org.organizationPublicId"
              >
                {{ org.organizationName }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- 출하 연동 (선택) -->
      <div class="terminal-grid-2">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.sourceShipment }}</span>
            <select 
              v-model="form.sourceShipmentPublicId" 
              @change="handleShipmentChange"
              :disabled="isSubmitting || isLoadingShipments || !form.targetOrganizationPublicId"
            >
              <option value="">
                {{ isLoadingShipments ? content.shipmentLoading : (!form.targetOrganizationPublicId ? '대상 조직을 먼저 선택하세요' : content.selectShipmentFirst) }}
              </option>
              <option v-for="s in shipments" :key="s.publicId" :value="s.publicId">
                {{ s.shipmentNumber }} ({{ s.carrierName }})
              </option>
            </select>
          </label>
        </div>
      </div>

      <!-- 반품 사유 -->
      <div class="terminal-form-group">
        <label>
          <span>{{ content.reason }} <em class="required-mark">{{ content.required }}</em></span>
          <textarea v-model="form.returnReason" rows="2" :placeholder="language === 'ko' ? '반품 사유를 입력해주세요...' : 'Enter the reason for return...'" required :disabled="isSubmitting"></textarea>
        </label>
      </div>

      <!-- 반품 대상 품목 섹션 -->
      <div class="items-section">
        <div class="items-header">
          <span>{{ content.items }} <em class="required-mark">{{ content.required }}</em></span>
          <button type="button" class="btn-add-item" @click="addItem" :disabled="isSubmitting">{{ content.addBtn }}</button>
        </div>
        
        <div class="item-row" v-for="(item, index) in form.items" :key="index">
          <div class="item-col item-col--name">
            <span>{{ content.item }} <em class="required-mark">{{ content.required }}</em></span>
            <select 
              v-model="item.itemPublicId" 
              @change="(e) => handleItemChange(index, e)" 
              required 
              :disabled="isSubmitting || isLoadingPoItems || !form.targetOrganizationPublicId"
            >
              <option value="" disabled>
                {{ isLoadingPoItems ? (language === 'ko' ? '발주 품목 로딩 중...' : 'Loading PO items...') : !form.targetOrganizationPublicId ? (language === 'ko' ? '대상 조직을 먼저 선택하세요' : 'Select target org first') : content.selectPlaceholder }}
              </option>
              <!-- 발주 기반 품목 (대상 조직 선택 시) -->
              <option v-for="i in poItems" :key="i.itemPublicId" :value="i.itemPublicId">
                {{ i.itemName }} ({{ language === 'ko' ? '발주' : 'PO' }}: {{ i.poNumber }}, {{ i.orderedQty }}{{ i.unit }})
              </option>
            </select>
          </div>
          
          <div class="item-col item-col--lot">
            <span>{{ content.lot }}</span>
            <input v-model="item.lotPublicId" type="text" placeholder="LOT-..." :disabled="isSubmitting" />
          </div>

          <div class="item-col item-col--qty">
            <span>{{ content.qty }} <em class="required-mark">{{ content.required }}</em></span>
            <input v-model.number="item.returnQty" type="number" min="1" step="1" required :disabled="isSubmitting" />
          </div>
          
          <div class="item-col item-col--unit">
            <span>{{ content.unit }}</span>
            <input v-model="item.unit" type="text" readonly disabled class="readonly-field" />
          </div>

          <div class="item-col item-col--reason">
            <span>{{ content.itemReason }}</span>
            <input v-model="item.detailReason" type="text" :placeholder="language === 'ko' ? '상세 사유...' : 'Detail...'" :disabled="isSubmitting" />
          </div>
          
          <button v-if="form.items.length > 1" type="button" class="btn-remove-item" @click="removeItem(index)" :disabled="isSubmitting">
            &times;
          </button>
        </div>
      </div>

      <div class="terminal-form-actions">
        <button class="page-button page-button--secondary" type="button" @click="emit('close')" :disabled="isSubmitting">
          {{ content.cancel }}
        </button>
        <button class="page-button page-button--primary" type="submit" :disabled="isSubmitting">
          {{ content.submit }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.return-create-modal__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 16px;
}

.terminal-grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.terminal-form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terminal-form-group label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.terminal-form-group span,
.items-header span,
.item-col span {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant, #919191);
}

.required-mark {
  color: #EF4444;
  font-style: normal;
  font-weight: 700;
}

.auto-calc-mark {
  font-style: normal;
  font-size: 0.65rem;
  color: var(--color-primary);
  opacity: 0.8;
  margin-left: 4px;
  text-transform: uppercase;
}

.terminal-form-group input[type="text"],
.terminal-form-group input[type="number"],
.terminal-form-group select,
.terminal-form-group textarea,
.item-col input,
.item-col select {
  font-family: inherit;
  font-size: 0.875rem;
  background: transparent;
  color: var(--color-on-surface);
  border: none;
  outline: none;
  border-bottom: 2px solid var(--color-surface-container-high);
  padding: 8px 0;
  transition: border-color 0.2s;
  width: 100%;
  resize: vertical;
}

.readonly-field {
  border-bottom-style: dashed !important;
  opacity: 0.7;
  cursor: not-allowed;
}

.terminal-form-group input:disabled,
.terminal-form-group select:disabled,
.terminal-form-group textarea:disabled,
.item-col input:disabled,
.item-col select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.readonly-field:disabled {
  opacity: 0.7;
}

.terminal-form-group select option,
.item-col select option {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

.terminal-form-group input:focus:not(:disabled),
.terminal-form-group select:focus:not(:disabled),
.terminal-form-group textarea:focus:not(:disabled),
.item-col input:focus:not(:disabled),
.item-col select:focus:not(:disabled) {
  border-bottom-color: var(--color-primary);
}

.items-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--color-surface-container-lowest);
  padding: 16px;
  border: 1px solid var(--color-surface-container-high);
}

.items-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-surface-container-high);
  padding-bottom: 8px;
}

.btn-add-item {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: underline;
}

.item-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  position: relative;
  background: var(--color-surface-container);
  padding: 12px;
}

.item-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.item-col--name { flex: 2; }
.item-col--lot { flex: 1.5; }
.item-col--qty { flex: 1; max-width: 80px; }
.item-col--unit { flex: 0.8; max-width: 60px; }
.item-col--reason { flex: 2; }

.btn-remove-item {
  background: var(--color-error);
  color: #fff;
  border: none;
  width: 24px;
  height: 24px;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.terminal-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
