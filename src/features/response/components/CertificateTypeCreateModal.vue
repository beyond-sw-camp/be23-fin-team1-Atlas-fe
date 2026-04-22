<script setup lang="ts">
import { ref, computed } from 'vue'
import { BaseModal } from '../../shared'
import { createCertificateType, type CreateCertificateTypeRequestDto } from '../../../services/certificate'

const props = defineProps<{
  isOpen: boolean
  language: 'ko' | 'en'
}>()

const emit = defineEmits<{
  close: []
  success: []
}>()

const form = ref<CreateCertificateTypeRequestDto>({
  certificateCode: '',
  certificateName: '',
  scopeType: 'GENERAL',
  requiredYn: false,
  activeYn: true,
  issuerName: ''
})

const isSubmitting = ref(false)

const content = computed(() => {
  return props.language === 'ko'
    ? {
        title: '신규 인증 유형 등록',
        desc: '서버 마스터 데이터에 새로운 인증 자격/유형을 추가합니다.',
        certCode: '인증 코드 (예: ISO-9001)',
        certName: '인증명 (예: 품질경영시스템)',
        issuer: '발급 기관 (예: ISO, MFDS)',
        scope: '인증 범위 (Scope)',
        required: '필수 여부 (Required)',
        active: '활성화 (Active)',
        cancel: '취소',
        submit: '유형 등록'
      }
    : {
        title: 'Add Certificate Type',
        desc: 'Register a new certificate type to the master DB.',
        certCode: 'Cert Code (e.g., ISO-9001)',
        certName: 'Cert Name (e.g., Quality Mgmt)',
        issuer: 'Issuer Organization (e.g., ISO, MFDS)',
        scope: 'Scope Type',
        required: 'Required',
        active: 'Active',
        cancel: 'CANCEL',
        submit: 'REGISTER'
      }
})

async function handleSubmit() {
  if (!form.value.certificateCode.trim() || !form.value.certificateName.trim()) {
    alert(props.language === 'ko' ? '인증 코드와 인증명은 필수입니다.' : 'Cert Code and Name are required.')
    return
  }
  
  try {
    isSubmitting.value = true
    await createCertificateType({ ...form.value })
    alert(props.language === 'ko' ? '새 인증 유형이 성공적으로 등록되었습니다.' : 'New certificate type registered successfully.')
    form.value.certificateCode = ''
    form.value.certificateName = ''
    form.value.issuerName = ''
    form.value.scopeType = 'GENERAL'
    form.value.requiredYn = false
    form.value.activeYn = true
    
    emit('success')
  } catch (error: any) {
    console.error('Failed to create certificate type', error)
    alert(error.message || 'Error occurred while creating certificate type.')
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
    size="sm"
    @update:model-value="emit('close')"
  >
    <form @submit.prevent="handleSubmit" class="cert-type-create-modal__form">
      <div class="terminal-form-group">
        <label>
          <span>{{ content.certCode }}</span>
          <input v-model="form.certificateCode" type="text" placeholder="ISO-9001" required :disabled="isSubmitting" />
        </label>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ content.certName }}</span>
          <input v-model="form.certificateName" type="text" placeholder="품질경영시스템" required :disabled="isSubmitting" />
        </label>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ content.issuer }}</span>
          <input v-model="form.issuerName" type="text" placeholder="e.g. ISO, MFDS, KTC" :disabled="isSubmitting" />
        </label>
      </div>

      <div class="terminal-form-group">
        <label>
          <span>{{ content.scope }}</span>
          <select v-model="form.scopeType" :disabled="isSubmitting">
            <!-- 백엔드의 CertificateScope Enum에 따라 옵션을 조정하세요 -->
            <option value="GENERAL">GENERAL (일반)</option>
            <option value="QUALITY">QUALITY (품질)</option>
            <option value="SAFETY">SAFETY (안전)</option>
            <option value="ENVIRONMENT">ENVIRONMENT (환경)</option>
          </select>
        </label>
      </div>

      <div class="terminal-form-group" style="flex-direction: row; align-items: center; gap: 8px;">
        <label style="flex-direction: row; align-items: center; gap: 8px; cursor: pointer;">
          <input type="checkbox" v-model="form.requiredYn" :disabled="isSubmitting" style="width: 16px; height: 16px;" />
          <span style="font-size: 0.875rem; color: var(--color-on-surface);">{{ content.required }}</span>
        </label>
        
        <label style="flex-direction: row; align-items: center; gap: 8px; cursor: pointer; margin-left: 16px;">
          <input type="checkbox" v-model="form.activeYn" :disabled="isSubmitting" style="width: 16px; height: 16px;" />
          <span style="font-size: 0.875rem; color: var(--color-on-surface);">{{ content.active }}</span>
        </label>
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
.cert-type-create-modal__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
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

.terminal-form-group span {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-on-surface-variant, #919191);
}

.terminal-form-group input[type="text"],
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

.terminal-form-group input[type="text"]:focus,
.terminal-form-group select:focus {
  border-bottom-color: var(--color-primary);
}

.terminal-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
