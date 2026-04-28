<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { BaseModal } from '../../shared'
import CertificateTypeCreateModal from './CertificateTypeCreateModal.vue'
import { getCertificateTypes } from '../../../services/certificate'
import { getSuppliers, getMySupplier, type SupplierListResponseDto } from '../../../services/supplier'
import { uploadAttachment } from '../../../services/file'
import type { CreateSupplierCertificateRequestDto, CertificateTypeResponseDto } from '../../../services/certificate'
import { useAtlasSessionStore } from '../../../stores/session'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  submit: [supplierPublicId: string, data: CreateSupplierCertificateRequestDto]
}>()

const session = useAtlasSessionStore()

const form = ref<CreateSupplierCertificateRequestDto>({
  certificateTypePublicId: '',
  certificateNo: '',
  issuedAt: '',
  expiredAt: '',
  issuerName: '',
  attachmentPublicId: ''
})

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
        cancel: 'CANCEL',
        submit: 'REQUEST'
      }
})

const selectedFile = ref<File | null>(null)
const isUploading = ref(false)

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
    alert(props.language === 'ko' ? '협력사 정보를 확인할 수 없습니다.' : 'Supplier information is missing.')
    return
  }
  if (!form.value.certificateTypePublicId) {
    alert(props.language === 'ko' ? '인증 유형을 선택해주세요.' : 'Please select a certificate type.')
    return
  }
  if (!form.value.issuedAt || !form.value.expiredAt) {
    alert(props.language === 'ko' ? '발급일과 만료일을 입력해주세요.' : 'Please enter issued and expiry dates.')
    return
  }

  if (!selectedFile.value) {
    alert(props.language === 'ko' ? '인증서 PDF 파일을 업로드해주세요.' : 'Please upload the certificate PDF file.')
    return
  }
  
  try {
    isUploading.value = true
    // 백엔드 가이드: refType="SUPPLIER_CERTIFICATE", refPublicId=supplierId 사용
    const uploadRes = await uploadAttachment(selectedFile.value, 'SUPPLIER_CERTIFICATE', supplierId.value)
    form.value.attachmentPublicId = uploadRes.attachmentPublicId
  } catch (error) {
    console.error('File upload failed', error)
    alert(props.language === 'ko' ? '파일 업로드에 실패했습니다.' : 'File upload failed.')
    isUploading.value = false
    return
  }
  
  const payload: any = { ...form.value }
  if (!payload.attachmentPublicId) delete payload.attachmentPublicId
  if (!payload.certificateNo) delete payload.certificateNo
  if (!payload.issuerName) delete payload.issuerName
  if (!payload.issuedAt) delete payload.issuedAt
  if (!payload.expiredAt) delete payload.expiredAt
  
  emit('submit', supplierId.value, payload)
  isUploading.value = false
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
    <form @submit.prevent="handleSubmit" class="cert-create-modal__form">
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
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>{{ content.certType }}</span>
              <button v-if="session.userRole === 'ADMIN'" type="button" @click="isTypeModalOpen = true" style="background:none; border:none; color:var(--color-primary); cursor:pointer; font-size:0.75rem; text-decoration:underline;">
                + 신규 추가
              </button>
            </div>
            <select v-model="form.certificateTypePublicId" required>
              <option value="" disabled selected>선택</option>
              <option v-for="t in certificateTypes" :key="t.publicId" :value="t.publicId">{{ t.certificateName || t.name || t.certificateCode }}</option>
            </select>
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
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
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.issueDate }}</span>
            <input v-model="form.issuedAt" type="date" required />
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.expDate }}</span>
            <input v-model="form.expiredAt" type="date" required />
          </label>
        </div>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ props.language === 'ko' ? '인증서 파일 (PDF 필수)' : 'Certificate File (PDF required)' }}</span>
          <input type="file" accept="application/pdf" @change="handleFileChange" required />
        </label>
      </div>

      <div class="terminal-form-actions">
        <button class="page-button page-button--secondary" type="button" @click="emit('close')" :disabled="isUploading">
          {{ content.cancel }}
        </button>
        <button class="page-button page-button--primary" type="submit" :disabled="isUploading">
          {{ isUploading ? (props.language === 'ko' ? '업로드 중...' : 'Uploading...') : content.submit }}
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

.terminal-form-group input:focus:not(.cert-create-modal__readonly-input),
.terminal-form-group select:focus {
  border-bottom-color: var(--color-primary);
}

.cert-create-modal__readonly-input {
  color: var(--color-on-surface-variant) !important;
  border-bottom-style: dashed !important;
  cursor: not-allowed;
  opacity: 0.8;
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
