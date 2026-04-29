<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseModal } from '../../shared'
import {
  createReturn,
  type CreateReturnItemDto,
  type CreateReturnRequestDto,
} from '../../../services/return'
import { getItems, type ItemResponseDto } from '../../../services/item'
import { getShipments, type ShipmentListResponseDto } from '../../../services/shipment'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const items = ref<ItemResponseDto[]>([])
const shipments = ref<ShipmentListResponseDto[]>([])
const isSubmitting = ref(false)
const isLoadingItems = ref(false)
const isLoadingShipments = ref(false)

function createEmptyItem(): CreateReturnItemDto {
  return {
    itemPublicId: '',
    itemName: '',
    returnQty: 1,
    unit: 'EA',
    detailReason: '',
  }
}

const form = ref<CreateReturnRequestDto>({
  sourceShipmentPublicId: '',
  returnType: 'DEFECTIVE',
  returnReason: '',
  attachmentPublicIds: [],
  items: [createEmptyItem()],
})

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 반품 요청',
        desc: '도착 완료된 출하를 기준으로 반품 요청을 생성합니다.',
        sourceShipment: '원본 출하',
        sourceShipmentPlaceholder: '반품할 출하를 선택하세요',
        sourceShipmentLoading: '출하 목록을 불러오는 중입니다...',
        noShipment: '선택 가능한 도착 완료 출하가 없습니다',
        sourceShipmentHint: '반품번호와 요청/대상 조직은 선택한 출하 기준으로 자동 생성됩니다.',
        type: '반품 유형',
        reason: '반품 사유',
        items: '반품 대상 품목',
        item: '품목',
        itemPlaceholder: '품목 선택',
        itemLoading: '품목 목록을 불러오는 중입니다...',
        qty: '수량',
        unit: '단위',
        itemReason: '상세 사유',
        addBtn: '+ 품목 추가',
        cancel: '취소',
        submit: '반품 요청',
        required: '*',
      }
    : {
        title: 'Create Return Request',
        desc: 'Create a return request from an arrived shipment.',
        sourceShipment: 'Source Shipment',
        sourceShipmentPlaceholder: 'Select source shipment',
        sourceShipmentLoading: 'Loading shipments...',
        noShipment: 'No arrived shipments available',
        sourceShipmentHint: 'Return number and organizations are generated from the selected shipment.',
        type: 'Return Type',
        reason: 'Return Reason',
        items: 'Return Items',
        item: 'Item',
        itemPlaceholder: 'Select item',
        itemLoading: 'Loading items...',
        qty: 'Qty',
        unit: 'Unit',
        itemReason: 'Detail Reason',
        addBtn: '+ Add Item',
        cancel: 'Cancel',
        submit: 'Submit Request',
        required: '*',
      }
})

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

const arrivedShipments = computed(() =>
  shipments.value.filter((shipment) => shipment.status === 'ARRIVED'),
)

function shipmentOptionText(shipment: ShipmentListResponseDto) {
  const origin = shipment.originNodeName || shipment.originNodeCode || '-'
  const destination = shipment.destinationNodeName || shipment.destinationNodeCode || '-'
  return `${shipment.shipmentNumber} / ${origin} -> ${destination}`
}

async function loadItems() {
  try {
    isLoadingItems.value = true
    const response = await getItems({ page: 0, size: 200 })
    items.value = response.content ?? []
  } catch (error) {
    console.error('Failed to load items', error)
    items.value = []
  } finally {
    isLoadingItems.value = false
  }
}

async function loadShipments() {
  try {
    isLoadingShipments.value = true
    const response = await getShipments({ page: 0, size: 100 })
    shipments.value = response.content ?? []
  } catch (error) {
    console.error('Failed to load shipments', error)
    shipments.value = []
  } finally {
    isLoadingShipments.value = false
  }
}

function handleItemChange(index: number, event: Event) {
  const selectedPublicId = (event.target as HTMLSelectElement).value
  const selectedItem = items.value.find((item) => item.publicId === selectedPublicId)

  if (!selectedItem) return

  form.value.items[index].itemName = selectedItem.itemName
  form.value.items[index].unit = selectedItem.unit
}

function addItem() {
  form.value.items.push(createEmptyItem())
}

function removeItem(index: number) {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1)
  }
}

function resetForm() {
  form.value = {
    sourceShipmentPublicId: '',
    returnType: 'DEFECTIVE',
    returnReason: '',
    attachmentPublicIds: [],
    items: [createEmptyItem()],
  }
}

watch(
  () => props.isOpen,
  (isOpen) => {
    if (!isOpen) return

    resetForm()
    loadItems()
    loadShipments()
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!form.value.sourceShipmentPublicId.trim()) {
    alert(props.language === 'ko' ? '원본 출하를 선택해주세요.' : 'Please select source shipment.')
    return
  }

  if (!form.value.returnReason.trim()) {
    alert(props.language === 'ko' ? '반품 사유를 입력해주세요.' : 'Please enter return reason.')
    return
  }

  if (form.value.items.some((item) => !item.itemPublicId || item.returnQty <= 0)) {
    alert(
      props.language === 'ko'
        ? '모든 품목과 수량을 올바르게 입력해주세요.'
        : 'Please select items and enter valid quantity.',
    )
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
    <form class="return-create-modal__form" @submit.prevent="handleSubmit">
      <div class="terminal-grid-2">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.sourceShipment }} <em class="required-mark">{{ content.required }}</em></span>
            <select
              v-model="form.sourceShipmentPublicId"
              required
              :disabled="isSubmitting || isLoadingShipments"
            >
              <option value="" disabled>
                {{
                  isLoadingShipments
                    ? content.sourceShipmentLoading
                    : arrivedShipments.length === 0
                      ? content.noShipment
                      : content.sourceShipmentPlaceholder
                }}
              </option>
              <option
                v-for="shipment in arrivedShipments"
                :key="shipment.publicId"
                :value="shipment.publicId"
              >
                {{ shipmentOptionText(shipment) }}
              </option>
            </select>
          </label>
          <p class="form-help">{{ content.sourceShipmentHint }}</p>
        </div>

        <div class="terminal-form-group">
          <label>
            <span>{{ content.type }} <em class="required-mark">{{ content.required }}</em></span>
            <select v-model="form.returnType" :disabled="isSubmitting">
              <option v-for="option in returnTypeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ content.reason }} <em class="required-mark">{{ content.required }}</em></span>
          <textarea
            v-model="form.returnReason"
            rows="2"
            required
            :disabled="isSubmitting"
            placeholder="..."
          />
        </label>
      </div>

      <div class="items-section">
        <div class="items-header">
          <span>{{ content.items }} <em class="required-mark">{{ content.required }}</em></span>
          <button
            class="btn-add-item"
            type="button"
            :disabled="isSubmitting"
            @click="addItem"
          >
            {{ content.addBtn }}
          </button>
        </div>

        <div v-for="(item, index) in form.items" :key="index" class="item-row">
          <div class="item-col item-col--name">
            <span>{{ content.item }} <em class="required-mark">{{ content.required }}</em></span>
            <select
              v-model="item.itemPublicId"
              required
              :disabled="isSubmitting || isLoadingItems"
              @change="(event) => handleItemChange(index, event)"
            >
              <option value="" disabled>
                {{ isLoadingItems ? content.itemLoading : content.itemPlaceholder }}
              </option>
              <option v-for="option in items" :key="option.publicId" :value="option.publicId">
                {{ option.itemName }} ({{ option.itemCode }})
              </option>
            </select>
          </div>

          <div class="item-col item-col--qty">
            <span>{{ content.qty }} <em class="required-mark">{{ content.required }}</em></span>
            <input
              v-model.number="item.returnQty"
              type="number"
              min="1"
              step="1"
              required
              :disabled="isSubmitting"
            />
          </div>

          <div class="item-col item-col--unit">
            <span>{{ content.unit }}</span>
            <input v-model="item.unit" class="readonly-field" type="text" readonly disabled />
          </div>

          <div class="item-col item-col--reason">
            <span>{{ content.itemReason }}</span>
            <input v-model="item.detailReason" type="text" placeholder="..." :disabled="isSubmitting" />
          </div>

          <button
            v-if="form.items.length > 1"
            class="btn-remove-item"
            type="button"
            :disabled="isSubmitting"
            @click="removeItem(index)"
          >
            &times;
          </button>
        </div>
      </div>

      <div class="terminal-form-actions">
        <button
          class="page-button page-button--secondary"
          type="button"
          :disabled="isSubmitting"
          @click="emit('close')"
        >
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
  color: #ef4444;
  font-style: normal;
  font-weight: 700;
}

.form-help {
  margin: 0;
  font-size: 0.75rem;
  color: var(--color-on-surface-variant);
}

.readonly-field {
  opacity: 0.75;
}

.terminal-form-group input[type='text'],
.terminal-form-group input[type='number'],
.terminal-form-group select,
.terminal-form-group textarea,
.item-col input,
.item-col select {
  width: 100%;
  border: none;
  border-bottom: 2px solid var(--color-surface-container-high);
  outline: none;
  background: transparent;
  color: var(--color-on-surface);
  padding: 8px 0;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
  transition: border-color 0.2s;
}

.terminal-form-group input:disabled,
.terminal-form-group select:disabled,
.terminal-form-group textarea:disabled,
.item-col input:disabled,
.item-col select:disabled {
  cursor: not-allowed;
  opacity: 0.5;
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
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  padding: 16px;
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--color-surface-container-high);
  padding-bottom: 8px;
}

.btn-add-item {
  border: none;
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: 0.75rem;
  text-decoration: underline;
}

.item-row {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: var(--color-surface-container);
  padding: 12px;
}

.item-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-col--name {
  flex: 2;
}

.item-col--qty {
  max-width: 80px;
  flex: 1;
}

.item-col--unit {
  max-width: 70px;
  flex: 0.8;
}

.item-col--reason {
  flex: 2;
}

.btn-remove-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  border: none;
  background: var(--color-error);
  color: #fff;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.terminal-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
