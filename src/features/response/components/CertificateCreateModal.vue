<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BaseModal } from '../../shared'
import { getCertificateTypes } from '../../../services/certificate'
import type { CreateSupplierCertificateRequestDto, CertificateTypeResponseDto } from '../../../services/certificate'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  submit: [supplierPublicId: string, data: CreateSupplierCertificateRequestDto]
}>()

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

// 임시 모의 협력사 목록 (추후 API 연동)
const MOCK_SUPPLIERS = [
  { id: 'supp-001', name: '한국식품(주) (KOREA FOODS)' },
  { id: 'supp-002', name: '글로벌푸드 (GLOBAL FOODS)' },
  { id: 'supp-003', name: '농협유통 (NH DISTRIBUTION)' },
]

// 임시 모의 인증 유형 목록 (DB에 데이터가 없을 때 폴백)
const MOCK_CERT_TYPES: CertificateTypeResponseDto[] = [
  { publicId: 'ctype-001', name: 'ISO 22000' },
  { publicId: 'ctype-002', name: 'HACCP (위해요소중점관리기준)' },
  { publicId: 'ctype-003', name: 'ISO 9001 (품질경영시스템)' },
  { publicId: 'ctype-004', name: 'ESG 친환경 인증' },
]

onMounted(async () => {
  try {
    const types = await getCertificateTypes()
    if (types && types.length > 0) {
      certificateTypes.value = types
    } else {
      certificateTypes.value = MOCK_CERT_TYPES
    }
  } catch (error) {
    console.warn('Failed to load certificate types, using mock data.', error)
    certificateTypes.value = MOCK_CERT_TYPES
  }
})

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 인증서 등록',
        desc: '협력사의 새로운 인증서를 시스템에 등록합니다.',
        supplier: '협력사 선택',
        certType: '인증 유형',
        certNo: '인증 번호',
        issuer: '발급 기관',
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
        certNo: 'Certificate Number',
        issuer: 'Issuer',
        issueDate: 'Issued Date',
        expDate: 'Expiry Date',
        cancel: 'CANCEL',
        submit: 'REQUEST'
      }
})

function handleSubmit() {
  if (!supplierId.value || !form.value.certificateTypePublicId || !form.value.certificateNo) {
    alert(props.language === 'ko' ? '필수 값을 입력해주세요.' : 'Please enter required fields.')
    return
  }
  
  emit('submit', supplierId.value, { ...form.value })
}
</script>

<template>
  <BaseModal
    :model-value="isOpen"
    :title="content.title"
    :description="content.desc"
    size="sm"
    @update:model-value="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="cert-create-modal__form">
      <div class="terminal-form-group">
        <label>
          <span>{{ content.supplier }}</span>
          <select v-model="supplierId" required>
            <option value="" disabled selected>선택</option>
            <option v-for="s in MOCK_SUPPLIERS" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </label>
      </div>

      <div class="terminal-form-row">
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.certType }}</span>
            <select v-model="form.certificateTypePublicId" required>
              <option value="" disabled selected>선택</option>
              <option v-for="t in certificateTypes" :key="t.publicId" :value="t.publicId">{{ t.name }}</option>
            </select>
          </label>
        </div>
        <div class="terminal-form-group" style="flex: 1;">
          <label>
            <span>{{ content.certNo }}</span>
            <input v-model="form.certificateNo" type="text" placeholder="CERT-XX-001" required />
          </label>
        </div>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ content.issuer }}</span>
          <input v-model="form.issuerName" type="text" placeholder="e.g. MFDS, ISO..." required />
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
