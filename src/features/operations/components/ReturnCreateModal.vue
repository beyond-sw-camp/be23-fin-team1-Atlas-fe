<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BaseModal } from '../../shared'
import { createReturn, type CreateReturnRequestDto, type CreateReturnItemDto } from '../../../services/return'
import { getOrganizations, type OrganizationListItem } from '../../../services/organization'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

// 실제 조직 목록을 담아둘 상태입니다.
const organizations = ref<OrganizationListItem[]>([])

// 조직 목록 로딩 상태입니다.
const isOrganizationsLoading = ref(false)

// 요청 조직 드롭다운에 보여줄 목록입니다.
// 우선은 전체 조직을 보여주고, 필요하면 나중에 BUYER만 필터링할 수 있습니다.
const requestOrganizations = computed(() => organizations.value)

// 대상 조직은 협력사(SUPPLIER)만 보여줍니다.
const targetOrganizations = computed(() =>
  organizations.value.filter((org) => org.organizationType === 'SUPPLIER'),
)

const MOCK_ITEMS = [
  { id: 'item-001', name: '프리미엄 원두 1kg', unit: 'EA' },
  { id: 'item-002', name: '유기농 밀가루 20kg', unit: 'BAG' },
  { id: 'item-003', name: '냉동 우삼겹 5kg', unit: 'BOX' }
]

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

const form = ref<CreateReturnRequestDto>({
  returnNumber: `RT-${Date.now()}`,
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

// 조직 목록을 실제 API에서 불러옵니다.
async function loadOrganizations() {
  try {
    isOrganizationsLoading.value = true

    // 드롭다운 용도라서 넉넉하게 100개 정도 먼저 가져옵니다.
    const response = await getOrganizations({
      page: 0,
      size: 100,
    })

    organizations.value = response.content ?? []

    // 로그인한 조직이 있으면 요청 조직 기본값으로 먼저 채워줍니다.
    const currentOrganizationPublicId =
      window.sessionStorage.getItem('atlas-organization-public-id') ?? ''

    if (currentOrganizationPublicId) {
      const currentOrganization = organizations.value.find(
        (org) => org.organizationPublicId === currentOrganizationPublicId,
      )

      if (currentOrganization) {
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


const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 반품(Return) 생성',
        desc: '발주 또는 출하된 품목에 대해 반품을 요청합니다.',
        returnNo: '반품 번호 (Return No.)',
        reqOrg: '요청 조직 (본사/창고)',
        targetOrg: '대상 조직 (협력사)',
        type: '반품 유형',
        reason: '반품 사유 (전체)',
        items: '반품 대상 품목',
        item: '품목',
        lot: 'LOT 번호 (선택)',
        qty: '수량',
        unit: '단위',
        itemReason: '상세 사유',
        addBtn: '+ 품목 추가',
        delBtn: '삭제',
        cancel: '취소',
        submit: '반품 요청'
      }
    : {
        title: 'Create Return Request',
        desc: 'Request a return for ordered or shipped items.',
        returnNo: 'Return No.',
        reqOrg: 'Request Org (Hub/Warehouse)',
        targetOrg: 'Target Org (Supplier)',
        type: 'Return Type',
        reason: 'Return Reason (Overall)',
        items: 'Return Items',
        item: 'Item',
        lot: 'LOT No. (Optional)',
        qty: 'Qty',
        unit: 'Unit',
        itemReason: 'Detail Reason',
        addBtn: '+ Add Item',
        delBtn: 'Del',
        cancel: 'CANCEL',
        submit: 'SUBMIT REQUEST'
      }
})

function handleTargetOrgChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  const found = targetOrganizations.value.find((o) => o.organizationPublicId === val)

  if (found) {
    form.value.targetOrganizationName = found.organizationName
  }
}

function handleReqOrgChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  const found = requestOrganizations.value.find((o) => o.organizationPublicId === val)

  if (found) {
    form.value.requestOrganizationName = found.organizationName
  }
}


function handleItemChange(index: number, e: Event) {
  const val = (e.target as HTMLSelectElement).value
  const found = MOCK_ITEMS.find(i => i.id === val)
  if (found) {
    form.value.items[index].itemName = found.name
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
// 모달이 열릴 때마다 조직 목록을 다시 불러옵니다.
// 처음 열릴 때도 바로 실행되게 immediate 를 켭니다.
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      loadOrganizations()
    }
  },
  { immediate: true },
)



async function handleSubmit() {
  if (!form.value.targetOrganizationPublicId) {
    alert(props.language === 'ko' ? '대상 조직(협력사)을 선택해주세요.' : 'Please select target organization.')
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
      <div class="terminal-grid-2">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.returnNo }}</span>
            <input v-model="form.returnNumber" type="text" required :disabled="isSubmitting" />
          </label>
        </div>
        <div class="terminal-form-group">
          <label>
            <span>{{ content.type }}</span>
            <select v-model="form.returnType" :disabled="isSubmitting">
              <option value="DEFECTIVE">불량 (DEFECTIVE)</option>
              <option value="DAMAGE">파손 (DAMAGE)</option>
              <option value="MISDELIVERY">오배송 (MISDELIVERY)</option>
              <option value="SIMPLE_RETURN">단순변심 (SIMPLE_RETURN)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="terminal-grid-2">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.reqOrg }}</span>
            <select
              v-model="form.requestOrganizationPublicId"
              @change="handleReqOrgChange"
              required
              :disabled="isSubmitting || isOrganizationsLoading"
            >
              <option value="" disabled>선택</option>
              <option
                v-for="org in requestOrganizations"
                :key="org.organizationPublicId"
                :value="org.organizationPublicId"
              >
                {{ org.organizationName }}
              </option>
            </select>


          </label>
        </div>
        <div class="terminal-form-group">
          <label>
            <span>{{ content.targetOrg }}</span>
              <select v-model="form.targetOrganizationPublicId" @change="handleTargetOrgChange" required :disabled="isSubmitting || isOrganizationsLoading">
                <option value="" disabled>선택</option>
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

      <div class="terminal-form-group">
        <label>
          <span>{{ content.reason }}</span>
          <textarea v-model="form.returnReason" rows="2" placeholder="..." required :disabled="isSubmitting"></textarea>
        </label>
      </div>

      <div class="items-section">
        <div class="items-header">
          <span>{{ content.items }}</span>
          <button type="button" class="btn-add-item" @click="addItem" :disabled="isSubmitting">{{ content.addBtn }}</button>
        </div>
        
        <div class="item-row" v-for="(item, index) in form.items" :key="index">
          <div class="item-col item-col--name">
            <span>{{ content.item }}</span>
            <select v-model="item.itemPublicId" @change="(e) => handleItemChange(index, e)" required :disabled="isSubmitting">
              <option value="" disabled>선택</option>
              <option v-for="i in MOCK_ITEMS" :key="i.id" :value="i.id">{{ i.name }}</option>
            </select>
          </div>
          
          <div class="item-col item-col--lot">
            <span>{{ content.lot }}</span>
            <input v-model="item.lotPublicId" type="text" placeholder="lot-..." :disabled="isSubmitting" />
          </div>

          <div class="item-col item-col--qty">
            <span>{{ content.qty }}</span>
            <input v-model.number="item.returnQty" type="number" min="0.01" step="0.01" required :disabled="isSubmitting" />
          </div>
          
          <div class="item-col item-col--unit">
            <span>{{ content.unit }}</span>
            <input v-model="item.unit" type="text" readonly disabled />
          </div>

          <div class="item-col item-col--reason">
            <span>{{ content.itemReason }}</span>
            <input v-model="item.detailReason" type="text" placeholder="..." :disabled="isSubmitting" />
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

.terminal-form-group input:disabled,
.terminal-form-group select:disabled,
.terminal-form-group textarea:disabled,
.item-col input:disabled,
.item-col select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
