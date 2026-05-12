<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseModal } from '../../shared'
import {
  createReturn,
  type CreateReturnItemDto,
  type CreateReturnRequestDto,
  type ResolutionType,
} from '../../../services/return'
import { getItems, type ItemResponseDto } from '../../../services/item'
import { getShipment, getShipments, type ShipmentListResponseDto, type ShipmentLineResponseDto } from '../../../services/shipment'
import { uploadAttachment } from '../../../services/file'
import { useAtlasDialogStore } from '../../../stores/dialog'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
  presentation?: 'modal' | 'page'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const items = ref<ItemResponseDto[]>([])
const dialog = useAtlasDialogStore()
const shipments = ref<ShipmentListResponseDto[]>([])
const shipmentLines = ref<ShipmentLineResponseDto[]>([])
const isSubmitting = ref(false)
const isLoadingItems = ref(false)
const isLoadingShipments = ref(false)
const proofFiles = ref<File[]>([])

function handleProofFilesChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) {
    proofFiles.value = Array.from(input.files)
  }
}

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
  resolutionType: 'RETURN',
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
        type: '반품 사유',
        resolution: '처리 방식',
        reason: '반품 사유 상세',
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
        proofPhotos: '증빙 사진 첨부',
      }
    : {
        title: 'Create Return Request',
        desc: 'Create a return request from an arrived shipment.',
        sourceShipment: 'Source Shipment',
        sourceShipmentPlaceholder: 'Select source shipment',
        sourceShipmentLoading: 'Loading shipments...',
        noShipment: 'No arrived shipments available',
        sourceShipmentHint: 'Return number and organizations are generated from the selected shipment.',
        type: 'Return Reason',
        resolution: 'Resolution Type',
        reason: 'Return Reason Detail',
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
        proofPhotos: 'Attach Proof Photos',
      }
})

const returnTypeOptions = computed(() => {
  return props.language === 'ko'
    ? [
        { value: 'DEFECTIVE', label: '불량' },
        { value: 'DAMAGE', label: '파손' },
        { value: 'SIMPLE_RETURN', label: '단순 반품' },
      ]
    : [
        { value: 'DEFECTIVE', label: 'Defective' },
        { value: 'DAMAGE', label: 'Damage' },
        { value: 'SIMPLE_RETURN', label: 'Simple Return' },
      ]
})

const resolutionOptions = computed<{ value: ResolutionType; icon: string; label: string; desc: string }[]>(() => {
  return props.language === 'ko'
    ? [
        { value: 'RETURN', icon: 'keyboard_return', label: '반납', desc: '물건을 공급사에 돌려보냅니다.' },
        { value: 'EXCHANGE', icon: 'swap_horiz', label: '교체', desc: '불량품 회수 후 교체품을 다시 받습니다.' },
        { value: 'DISPOSAL', icon: 'delete_forever', label: '폐기', desc: '물건을 반송하지 않고 현지에서 폐기합니다.' },
      ]
    : [
        { value: 'RETURN', icon: 'keyboard_return', label: 'Return', desc: 'Send goods back to supplier.' },
        { value: 'EXCHANGE', icon: 'swap_horiz', label: 'Exchange', desc: 'Collect defective and receive replacement.' },
        { value: 'DISPOSAL', icon: 'delete_forever', label: 'Disposal', desc: 'Dispose on-site without returning.' },
      ]
})

const resolutionHint = computed(() => {
  const rt = form.value.resolutionType
  if (props.language === 'ko') {
    if (rt === 'EXCHANGE') return '승인 후 회수 → 교체품 재출하가 자동으로 진행됩니다.'
    if (rt === 'DISPOSAL') return '승인 후 폐기 증빙을 첨부해야 완료됩니다. 출하(물류)가 발생하지 않습니다.'
    return ''
  } else {
    if (rt === 'EXCHANGE') return 'After approval, collection and replacement shipment will proceed automatically.'
    if (rt === 'DISPOSAL') return 'After approval, disposal proof must be attached. No shipment will be created.'
    return ''
  }
})

const arrivedShipments = computed(() =>
  shipments.value.filter(
    (shipment) =>
      shipment.status === 'ARRIVED' &&
      !shipment.hasReturn &&
      shipment.sourceType !== 'RETURN' &&
      shipment.sourceType !== 'EXCHANGE',
  ),
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
  const selectedLine = shipmentLines.value.find((line) => line.itemPublicId === selectedPublicId)
  const selectedItem = items.value.find((item) => item.publicId === selectedPublicId)

  if (!selectedLine) return

  form.value.items[index].itemName = selectedLine.itemName
  form.value.items[index].unit = selectedItem?.unit || 'EA'
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
    resolutionType: 'RETURN',
    returnReason: '',
    attachmentPublicIds: [],
    items: [createEmptyItem()],
  }
  proofFiles.value = []
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

watch(
  () => form.value.sourceShipmentPublicId,
  async (newId) => {
    if (!newId) {
      shipmentLines.value = []
      return
    }
    try {
      isLoadingItems.value = true
      const shipment = await getShipment(newId)
      shipmentLines.value = shipment.shipmentLines ?? []
      
      form.value.items.forEach(item => {
        if (item.itemPublicId && !shipmentLines.value.find(l => l.itemPublicId === item.itemPublicId)) {
           item.itemPublicId = ''
           item.itemName = ''
           item.returnQty = 1
        }
      })
    } catch (e) {
      console.error(e)
      shipmentLines.value = []
    } finally {
      isLoadingItems.value = false
    }
  }
)

async function handleSubmit() {
  if (!form.value.sourceShipmentPublicId.trim()) {
    await dialog.alert(props.language === 'ko' ? '원본 출하를 선택해주세요.' : 'Please select source shipment.')
    return
  }

  if (!form.value.returnReason.trim()) {
    await dialog.alert(props.language === 'ko' ? '반품 사유를 입력해주세요.' : 'Please enter return reason.')
    return
  }

  if (form.value.items.some((item) => !item.itemPublicId || item.returnQty <= 0)) {
    await dialog.alert(
      props.language === 'ko'
        ? '모든 품목과 수량을 올바르게 입력해주세요.'
        : 'Please select items and enter valid quantity.',
    )
    return
  }

  if (proofFiles.value.length === 0) {
    await dialog.alert(
      props.language === 'ko'
        ? '반품 증빙 사진을 첨부해주세요.'
        : 'Please attach proof photos.',
    )
    return
  }

  try {
    isSubmitting.value = true
    const createdReturn = await createReturn(form.value)
    
    if (proofFiles.value.length > 0) {
      await uploadAttachment(proofFiles.value, 'RETURN_REQUEST', createdReturn.publicId)
    }

    await dialog.alert(props.language === 'ko' ? '반품 요청이 완료되었습니다.' : 'Return request completed.')
    emit('success')
  } catch (error: any) {
    console.error('Failed to create return', error)
    await dialog.alert(error.message || 'Error occurred while creating return request.')
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
    :presentation="props.presentation ?? 'modal'"
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

      <!-- 처리 방식 카드형 라디오 -->
      <div class="terminal-form-group">
        <span>{{ content.resolution }} <em class="required-mark">{{ content.required }}</em></span>
        <div class="resolution-cards">
          <label
            v-for="opt in resolutionOptions"
            :key="opt.value"
            :class="['resolution-card', { 'resolution-card--selected': form.resolutionType === opt.value }]"
          >
            <input
              type="radio"
              :value="opt.value"
              v-model="form.resolutionType"
              :disabled="isSubmitting"
              class="resolution-card__radio"
            />
            <span class="material-symbols-outlined resolution-card__icon">{{ opt.icon }}</span>
            <strong class="resolution-card__label">{{ opt.label }}</strong>
            <span class="resolution-card__desc">{{ opt.desc }}</span>
          </label>
        </div>
        <p v-if="resolutionHint" class="form-help resolution-hint">
          <span class="material-symbols-outlined" style="font-size: 14px; vertical-align: middle;">info</span>
          {{ resolutionHint }}
        </p>
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

      <div class="terminal-form-group">
        <label>
          <span>{{ content.proofPhotos }} <em class="required-mark">{{ content.required }}</em></span>
          <input type="file" accept="image/*" multiple required @change="handleProofFilesChange" :disabled="isSubmitting" />
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
              <option v-for="option in shipmentLines" :key="option.itemPublicId" :value="option.itemPublicId">
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

/* 처리 방식 카드형 라디오 */
.resolution-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.resolution-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 12px;
  border: 2px solid var(--color-surface-container-high, #333);
  background: var(--color-surface-container-lowest, #1a1a1a);
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background-color 0.2s;
}

.resolution-card:hover {
  border-color: var(--color-on-surface-variant, #999);
}

.resolution-card--selected {
  border-color: var(--color-primary, #fff);
  background: var(--color-surface-container, #252525);
}

.resolution-card__radio {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.resolution-card__icon {
  font-size: 1.5rem;
  color: var(--color-on-surface-variant, #999);
  transition: color 0.2s;
}

.resolution-card--selected .resolution-card__icon {
  color: var(--color-primary, #fff);
}

.resolution-card__label {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--color-on-surface, #eee);
}

.resolution-card__desc {
  font-size: 0.7rem;
  color: var(--color-on-surface-variant, #999);
  line-height: 1.3;
}

.resolution-hint {
  margin-top: 4px;
  padding: 6px 8px;
  background: var(--color-surface-container, #252525);
  border-left: 3px solid var(--color-primary, #fff);
  font-size: 0.75rem;
  color: var(--color-on-surface-variant, #bbb);
}
</style>
