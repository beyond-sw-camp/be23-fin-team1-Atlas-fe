<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BaseModal } from '../../shared'
import type { CreateLotRequestDto } from '../../../services/lot'
import { getSuppliers, type SupplierListResponseDto } from '../../../services/supplier'
import { getItems, type ItemResponseDto } from '../../../services/item'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  submit: [data: CreateLotRequestDto]
}>()

const form = ref<CreateLotRequestDto>({
  lotNumber: '',
  sourcePoItemPublicId: '',
  supplierPublicId: '',
  itemPublicId: '',
  qty: 0,
  unit: 'kg',
  manufacturedAt: '',
  expiredAt: ''
})

const suppliers = ref<SupplierListResponseDto[]>([])
const items = ref<ItemResponseDto[]>([])

async function loadData() {
  try {
    const [supplierRes, itemRes] = await Promise.all([
      getSuppliers({ page: 0, size: 200 }),
      getItems({ page: 0, size: 200 })
    ])
    if (supplierRes && supplierRes.content) {
      suppliers.value = supplierRes.content
    }
    if (itemRes && itemRes.content) {
      items.value = itemRes.content
    }
  } catch (error) {
    console.error('Failed to load lot creation data.', error)
  }
}

onMounted(() => {
  loadData()
})

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 로트 등록',
        desc: '공급 로트 번호 및 수량 등 생산 내역을 기입합니다.',
        lotNumber: '로트 번호',
        poItem: '발주 상세 테이블 ID (임시)',
        supplier: '협력사 선택',
        item: '품목 선택',
        qty: '수량',
        unit: '단위',
        mfgDate: '제조일 (생산일)',
        expDate: '유통기한 (만료일)',
        cancel: '취소',
        submit: '등록'
      }
    : {
        title: 'New Lot Registration',
        desc: 'Enter the supply lot number and production details.',
        lotNumber: 'Lot Number',
        poItem: 'PO Item ID (Temp)',
        supplier: 'Select Supplier',
        item: 'Select Item',
        qty: 'Quantity',
        unit: 'Unit',
        mfgDate: 'Manufactured Date',
        expDate: 'Expiry Date',
        cancel: 'CANCEL',
        submit: 'SUBMIT'
      }
})

function handleSubmit() {
  if (!form.value.lotNumber || !form.value.supplierPublicId || !form.value.itemPublicId || form.value.qty <= 0) {
    alert(props.language === 'ko' ? '필수 값을 정확히 입력해주세요.' : 'Please enter valid inputs.')
    return
  }
  
  // 만료일이 없으면 안 보내도록 처리. ISO 포맷으로 통일시킬 수 있으나 단순 전송
  const data = { ...form.value }
  if (!data.expiredAt) {
    delete data.expiredAt
  }

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
      <div class="terminal-form-group">
        <label>
          <span>{{ content.lotNumber }}</span>
          <input v-model="form.lotNumber" type="text" placeholder="e.g. LOT-2024-X123" required />
        </label>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ content.poItem }}</span>
          <input v-model="form.sourcePoItemPublicId" type="text" placeholder="PO ID..." />
        </label>
      </div>

      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.supplier }}</span>
            <select v-model="form.supplierPublicId" required>
              <option value="" disabled selected>선택</option>
              <option v-for="s in suppliers" :key="s.detail?.publicId || ''" :value="s.detail?.publicId || ''">{{ s.supplierName }}</option>
            </select>
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.item }}</span>
            <select v-model="form.itemPublicId" required>
              <option value="" disabled selected>선택</option>
              <option v-for="i in items" :key="i.publicId" :value="i.publicId">{{ i.itemName }}</option>
            </select>
          </label>
        </div>
      </div>

      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 2;">
          <label>
            <span>{{ content.qty }}</span>
            <input v-model.number="form.qty" type="number" step="0.01" min="0" required />
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.unit }}</span>
            <input v-model="form.unit" type="text" placeholder="kg, L, ea..." required />
          </label>
        </div>
      </div>

      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.mfgDate }}</span>
            <input v-model="form.manufacturedAt" type="datetime-local" required />
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.expDate }}</span>
            <input v-model="form.expiredAt" type="datetime-local" />
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
