<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { ko } from 'date-fns/locale/ko'
import { BaseModal } from '../../shared'
import CertificateTypeCreateModal from './CertificateTypeCreateModal.vue'
import { getCertificateTypes } from '../../../services/certificate'
import { getSuppliers, getMySupplier, type SupplierListResponseDto } from '../../../services/supplier'
import type { CreateSupplierCertificateRequestDto, CertificateTypeResponseDto } from '../../../services/certificate'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasSessionStore } from '../../../stores/session'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  submit: [supplierPublicId: string, data: CreateSupplierCertificateRequestDto, file: File]
}>()

const session = useAtlasSessionStore()
const dialog = useAtlasDialogStore()

const form = ref<CreateSupplierCertificateRequestDto>({
  certificateTypePublicId: '',
  certificateNo: '',
  issuedAt: '',
  expiredAt: '',
  issuerName: '',
  attachmentPublicId: ''
})
const issuedAtDate = ref<Date | null>(null)
const expiredAtDate = ref<Date | null>(null)

const supplierId = ref('')
const certificateTypes = ref<CertificateTypeResponseDto[]>([])
const supplierOptions = ref<SupplierListResponseDto[]>([])
const isTypeModalOpen = ref(false)

/** 랜덤 3자리 숫자 생성 */
function randomThreeDigits(): string {
  return String(Math.floor(100 + Math.random() * 900))
}

/** 인증 번호 자동 생성: CERT-{발급기관약자}-{3자리난수} */
function generateCertNo(issuer: string): string {
  const issuerCode = (issuer || 'XX')
    .toUpperCase()
    .replace(/\s+/g, '')
    .slice(0, 6)
  return `CERT-${issuerCode}-${randomThreeDigits()}`
}

/** 인증 유형 선택 시 발급기관 자동입력 + 인증번호 자동생성 */
watch(() => form.value.certificateTypePublicId, (typeId) => {
  const selected = certificateTypes.value.find(t => t.publicId === typeId)
  if (selected) {
    const issuer = selected.issuerName || ''
    form.value.issuerName = issuer
    form.value.certificateNo = generateCertNo(issuer)
  }
})

async function loadTypes() {
  try {
    const types = await getCertificateTypes()
    if (types && types.length > 0) {
      certificateTypes.value = types
      if (!form.value.certificateTypePublicId) {
        form.value.certificateTypePublicId = types[0].publicId
      }
    }
  } catch (error) {
    console.error('Failed to load certificate types', error)
  }
}

async function loadSuppliers() {
  try {
    if (session.organizationType === 'SUPPLIER') {
      try {
        const myInfo = await getMySupplier()
        supplierId.value = myInfo.publicId
        supplierOptions.value = [{
          supplierCode: myInfo.supplierCode,
          supplierName: myInfo.supplierName,
          onTimeRate: null,
          supplierScore: null,
          qualityScore: null,
          purchaseOrderCount: null,
          totalAmount: null,
          cumulativeAmount: null,
          relationStatus: null,
          detail: myInfo
        }]
      } catch (err) {
        console.error('Failed to load my supplier info', err)
        // Fallback if /me API fails
        supplierId.value = session.organizationPublicId || ''
      }
    } else {
      const res = await getSuppliers({ page: 0, size: 200 })
      if (res && res.content) {
        supplierOptions.value = res.content
      }
    }
  } catch (error) {
    console.error('Failed to load suppliers.', error)
  }
}

onMounted(() => {
  loadTypes()
  loadSuppliers()
})

async function handleTypeSuccess() {
  isTypeModalOpen.value = false
  await loadTypes()
}

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 인증서 등록',
        desc: '협력사의 새로운 인증서를 시스템에 등록합니다.',
        supplier: '협력사 선택',
        certType: '인증 유형',
        certNo: '인증 번호 (자동생성)',
        issuer: '발급 기관 (자동입력)',
        issueDate: '발급일',
        expDate: '만료일',
        file: '인증서 파일 (PDF 필수)',
        typeAdd: '신규 유형 추가',
        cancel: '취소',
        submit: '등록 요청'
      }
    : {
        title: 'Add New Certificate',
        desc: 'Register a new supplier certificate to the system.',
        supplier: 'Select Supplier',
        certType: 'Certificate Type',
        certNo: 'Certificate No. (auto-generated)',
        issuer: 'Issuer (auto-filled)',
        issueDate: 'Issued Date',
        expDate: 'Expiry Date',
        file: 'Certificate File (PDF required)',
        typeAdd: 'Add Type',
        cancel: 'CANCEL',
        submit: 'REQUEST'
      }
})

const selectedFile = ref<File | null>(null)
const isSubmitting = ref(false)
const datepickerTimeConfig = { enableTimePicker: false }
const datepickerFormats = {
  input: 'yyyy. MM. dd.',
  preview: 'yyyy. MM. dd.',
}

function formatDateForApi(date: Date | null) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateForDisplay(date: Date | null) {
  if (!date) return '연도. 월. 일.'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}. ${month}. ${day}.`
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0]
  } else {
    selectedFile.value = null
  }
}

async function handleSubmit() {
  if (!supplierId.value) {
    await dialog.alert(props.language === 'ko' ? '협력사 정보를 확인할 수 없습니다.' : 'Supplier information is missing.')
    return
  }
  if (!form.value.certificateTypePublicId) {
    await dialog.alert(props.language === 'ko' ? '인증 유형을 선택해주세요.' : 'Please select a certificate type.')
    return
  }
  const issuedAt = formatDateForApi(issuedAtDate.value)
  const expiredAt = formatDateForApi(expiredAtDate.value)

  if (!issuedAt || !expiredAt) {
    await dialog.alert(props.language === 'ko' ? '발급일과 만료일을 입력해주세요.' : 'Please enter issued and expiry dates.')
    return
  }

  if (!selectedFile.value) {
    await dialog.alert(props.language === 'ko' ? '인증서 PDF 파일을 업로드해주세요.' : 'Please upload the certificate PDF file.')
    return
  }
  
  const payload: any = {
    ...form.value,
    issuedAt,
    expiredAt,
  }
  if (!payload.attachmentPublicId) delete payload.attachmentPublicId
  if (!payload.certificateNo) delete payload.certificateNo
  if (!payload.issuerName) delete payload.issuerName
  if (!payload.issuedAt) delete payload.issuedAt
  if (!payload.expiredAt) delete payload.expiredAt
  
  isSubmitting.value = true
  emit('submit', supplierId.value, payload, selectedFile.value)
  isSubmitting.value = false
}
</script>

<template>
  <BaseModal
    :model-value="isOpen"
    :title="content.title"
    :description="content.desc"
    size="lg"
    modal-class="cert-create-modal"
    hide-dividers
    hide-close-button
    @update:model-value="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="cert-create-modal__form">
      <section class="cert-create-modal__section">
        <div class="cert-create-modal__section-head">
          <span>01</span>
          <strong>인증 대상</strong>
        </div>

        <div class="terminal-form-group" v-if="session.organizationType !== 'SUPPLIER'">
        <label>
          <span>{{ content.supplier }}</span>
          <select v-model="supplierId" required>
            <option value="" disabled selected>선택</option>
            <option v-for="s in supplierOptions" :key="s.detail?.publicId || ''" :value="s.detail?.publicId || ''">
              {{ s.supplierName }}
            </option>
          </select>
        </label>
      </div>

      <div class="terminal-form-row">
        <div class="terminal-form-group">
          <label>
            <div class="cert-create-modal__label-row">
              <span>{{ content.certType }}</span>
              <button v-if="session.userRole === 'ADMIN'" type="button" class="cert-create-modal__inline-action" @click="isTypeModalOpen = true">
                {{ content.typeAdd }}
              </button>
            </div>
            <select v-model="form.certificateTypePublicId" required>
              <option value="" disabled selected>선택</option>
              <option v-for="t in certificateTypes" :key="t.publicId" :value="t.publicId">{{ t.certificateName || t.name || t.certificateCode }}</option>
            </select>
          </label>
        </div>
        <div class="terminal-form-group">
          <label>
            <span>{{ content.certNo }}</span>
            <input
              v-model="form.certificateNo"
              type="text"
              placeholder="인증 유형 선택 시 자동 생성"
              readonly
              class="cert-create-modal__readonly-input"
            />
          </label>
        </div>
      </div>
      </section>

      <section class="cert-create-modal__section">
        <div class="cert-create-modal__section-head">
          <span>02</span>
          <strong>발급 정보</strong>
        </div>

        <div class="terminal-form-group">
        <label>
          <span>{{ content.issuer }}</span>
          <input
            v-model="form.issuerName"
            type="text"
            placeholder="인증 유형 선택 시 자동 입력"
            readonly
            class="cert-create-modal__readonly-input"
          />
        </label>
      </div>

      <div class="terminal-form-row">
        <div class="terminal-form-group">
          <label>
            <span>{{ content.issueDate }}</span>
            <VueDatePicker
              v-model="issuedAtDate"
              class="cert-create-modal__datepicker"
              :locale="ko"
              :formats="datepickerFormats"
              :time-config="datepickerTimeConfig"
              auto-apply
              :clearable="false"
              :teleport="false"
              required
            >
              <template #trigger>
                <button class="cert-create-modal__date-trigger" type="button">
                  <span :class="{ 'is-placeholder': !issuedAtDate }">{{ formatDateForDisplay(issuedAtDate) }}</span>
                  <span class="material-symbols-outlined">calendar_month</span>
                </button>
              </template>
            </VueDatePicker>
          </label>
        </div>
        <div class="terminal-form-group">
          <label>
            <span>{{ content.expDate }}</span>
            <VueDatePicker
              v-model="expiredAtDate"
              class="cert-create-modal__datepicker"
              :locale="ko"
              :formats="datepickerFormats"
              :time-config="datepickerTimeConfig"
              auto-apply
              :clearable="false"
              :teleport="false"
              required
            >
              <template #trigger>
                <button class="cert-create-modal__date-trigger" type="button">
                  <span :class="{ 'is-placeholder': !expiredAtDate }">{{ formatDateForDisplay(expiredAtDate) }}</span>
                  <span class="material-symbols-outlined">calendar_month</span>
                </button>
              </template>
            </VueDatePicker>
          </label>
        </div>
      </div>
      </section>

      <section class="cert-create-modal__section">
        <div class="cert-create-modal__section-head">
          <span>03</span>
          <strong>파일 첨부</strong>
        </div>

        <label class="cert-create-modal__file">
          <input type="file" accept="application/pdf" @change="handleFileChange" required />
          <span class="material-symbols-outlined">upload_file</span>
          <strong>{{ selectedFile?.name || content.file }}</strong>
          <em>PDF 파일만 등록 가능</em>
        </label>
      </section>

      <div class="terminal-form-actions">
        <button class="page-button page-button--secondary" type="button" @click="emit('close')" :disabled="isSubmitting">
          {{ content.cancel }}
        </button>
        <button class="page-button page-button--primary" type="submit" :disabled="isSubmitting">
          {{ isSubmitting ? (props.language === 'ko' ? '등록 중...' : 'Submitting...') : content.submit }}
        </button>
      </div>
    </form>
  </BaseModal>

  <CertificateTypeCreateModal 
    :is-open="isTypeModalOpen"
    :language="language"
    @close="isTypeModalOpen = false"
    @success="handleTypeSuccess"
  />
</template>

<style scoped>
.cert-create-modal__form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cert-create-modal__section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.78);
}

.cert-create-modal__section-head,
.cert-create-modal__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cert-create-modal__section-head span {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.36);
  color: var(--on-surface-variant, #596061);
  font-size: 0.72rem;
  font-weight: 900;
}

.cert-create-modal__section-head strong {
  margin-right: auto;
  font-size: 0.9rem;
  font-weight: 900;
}

.cert-create-modal__inline-action {
  appearance: none;
  border: 0;
  background: transparent;
  color: var(--primary, #5e5e5e);
  cursor: pointer;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 3px;
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
  min-height: 42px;
  padding: 8px 0;
  transition: border-color 0.2s;
}

.terminal-form-group select option {
  background: var(--color-surface);
  color: var(--color-on-surface);
}

.terminal-form-group input:focus:not(.cert-create-modal__readonly-input),
.terminal-form-group select:focus {
  border-bottom-color: var(--color-primary);
}

.cert-create-modal__datepicker {
  width: 100%;
}

.cert-create-modal__datepicker :deep(.dp__main) {
  font-family: inherit;
}

.cert-create-modal__datepicker :deep(.dp__input_wrap) {
  width: 100%;
}

.cert-create-modal__datepicker :deep(.dp__input) {
  width: 100%;
  min-height: 42px;
  padding: 8px 32px 8px 0;
  border: 0;
  border-bottom: 2px solid var(--color-surface-container-high);
  border-radius: 0;
  background: transparent;
  color: var(--color-on-surface);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
}

.cert-create-modal__datepicker :deep(.dp__input:focus) {
  border-bottom-color: var(--color-primary);
  box-shadow: none;
}

.cert-create-modal__datepicker :deep(.dp__input_icon) {
  inset-inline-start: auto;
  right: 0;
  color: var(--color-on-surface, #2f3435);
}

.cert-create-modal__date-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 8px 0;
  border: 0;
  border-bottom: 2px solid var(--color-surface-container-high);
  background: transparent;
  color: var(--color-on-surface);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  text-align: left;
}

.cert-create-modal__date-trigger:focus-visible {
  outline: none;
  border-bottom-color: var(--color-primary);
}

.cert-create-modal__date-trigger .is-placeholder {
  color: var(--color-on-surface-variant, #919191);
}

.cert-create-modal__date-trigger .material-symbols-outlined {
  color: var(--color-on-surface, #2f3435);
  font-size: 1.2rem;
}

.cert-create-modal__datepicker :deep(.dp__clear_icon) {
  display: none;
}

.cert-create-modal__datepicker :deep(.dp__menu) {
  border: 1px solid rgb(var(--outline-rgb, 117 124 125) / 0.38);
  border-radius: 0;
  background: var(--surface-container-lowest, #fff);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.16);
  font-family: inherit;
}

.cert-create-modal__datepicker :deep(.dp__month_year_row),
.cert-create-modal__datepicker :deep(.dp__calendar_header) {
  color: var(--on-surface, #2f3435);
  font-weight: 900;
}

.cert-create-modal__datepicker :deep(.dp__calendar_header_separator) {
  background: rgb(var(--outline-variant-rgb, 172 179 180) / 0.42);
}

.cert-create-modal__datepicker :deep(.dp__cell_inner) {
  border-radius: 0;
  color: var(--on-surface, #2f3435);
  font-weight: 800;
}

.cert-create-modal__datepicker :deep(.dp__cell_inner:hover) {
  background: rgb(var(--outline-variant-rgb, 172 179 180) / 0.18);
}

.cert-create-modal__datepicker :deep(.dp__active_date),
.cert-create-modal__datepicker :deep(.dp__today) {
  border-color: var(--primary, #5e5e5e);
  background: var(--primary, #5e5e5e);
  color: var(--on-primary, #fff);
}

.cert-create-modal__datepicker :deep(.dp__action_row) {
  border-top: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.32);
}

.cert-create-modal__datepicker :deep(.dp__action_button) {
  border-radius: 0;
  font-family: inherit;
  font-weight: 900;
}

.cert-create-modal__datepicker :deep(.dp__button_bottom) {
  display: none;
}

.cert-create-modal__readonly-input {
  color: var(--color-on-surface-variant) !important;
  border-bottom-style: dashed !important;
  cursor: not-allowed;
  opacity: 0.8;
}

.terminal-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.cert-create-modal__file {
  position: relative;
  display: grid;
  place-items: center;
  gap: 8px;
  min-height: 126px;
  padding: 20px;
  border: 1px dashed rgb(var(--outline-rgb, 117 124 125) / 0.5);
  background: var(--surface-container-lowest, #fff);
  color: var(--on-surface, #2f3435);
  text-align: center;
  cursor: pointer;
}

.cert-create-modal__file input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.cert-create-modal__file .material-symbols-outlined {
  font-size: 2rem;
  color: var(--on-surface-variant, #596061);
}

.cert-create-modal__file strong {
  font-size: 0.92rem;
  font-weight: 900;
  word-break: break-all;
}

.cert-create-modal__file em {
  color: var(--on-surface-variant, #596061);
  font-size: 0.72rem;
  font-style: normal;
  font-weight: 700;
}

.terminal-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}

@media (max-width: 720px) {
  .terminal-form-row {
    grid-template-columns: 1fr;
  }
}
</style>
