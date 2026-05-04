<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { BaseModal, useModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasSessionStore } from '../../../stores/session'
import { 
  getAllCertificates, getExpiringCertificates, 
  approveCertificate, rejectCertificate, createSupplierCertificate,
  getCertificateHistories,
  type SupplierCertificateResponseDto,
  type CreateSupplierCertificateRequestDto,
  type CertificateHistoryResponseDto
} from '../../../services/certificate'
import CertificateCreateModal from '../components/CertificateCreateModal.vue'
import CertificateTypeCreateModal from '../components/CertificateTypeCreateModal.vue'
import { getAttachment } from '../../../services/file'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()
const router = useRouter()

const CONTENT = {
  ko: {
    eyebrow: '문서 / 인증',
    title: '인증서 관리',
    subtitle: '협력사 인증서 유효성과 갱신 상태를 중앙에서 관리합니다.',
    metrics: [
      { label: '유효 인증서', value: '84', meta: '활성', tone: 'nominal' },
      { label: '만료 임박', value: '6', meta: '30일 이내', tone: 'critical' },
      { label: '갱신 필요', value: '4', meta: '만료됨', tone: 'warning' },
      { label: '협력사 수', value: '18', meta: '등록 업체', tone: 'info' },
    ],
    tabs: ['ALL', 'REVIEW_REQUESTED', 'APPROVED', 'EXPIRED', 'REJECTED', 'REVOKED'],
    searchPlaceholder: '협력사명, 인증 번호 검색...',
    tableTitle: '전체 인증서 이력',
    exportLabel: '내보내기',
    createLabel: '인증서 등록',
    columns: ['인증서 번호', '협력사', '인증 유형', '발급 기관', '발급일', '만료일', '남은 일수', '상태', '상세'],
    timelineTitle: '인증서 심사 추적 이력',
    detailLabel: '상세보기'
  },
  en: {
    eyebrow: 'Documents / Certificates',
    title: 'Certificates',
    subtitle: 'Manage supplier certificate validity and renewal status from one control point.',
    metrics: [
      { label: 'VALID CERTS', value: '84', meta: 'ACTIVE', tone: 'nominal' },
      { label: 'EXPIRING SOON', value: '6', meta: 'WITHIN 30 DAYS', tone: 'critical' },
      { label: 'RENEWAL NEEDED', value: '4', meta: 'ALREADY EXPIRED', tone: 'warning' },
      { label: 'SUPPLIERS', value: '18', meta: 'REGISTERED', tone: 'info' },
    ],
    tabs: ['ALL', 'REVIEW_REQUESTED', 'APPROVED', 'EXPIRED', 'REJECTED', 'REVOKED'],
    searchPlaceholder: 'Search supplier or cert number...',
    tableTitle: 'Certificate Registry',
    exportLabel: 'EXPORT',
    createLabel: 'ADD CERT',
    columns: ['CERT NO', 'SUPPLIER', 'TYPE', 'ISSUER', 'ISSUED', 'EXPIRES', 'DAYS LEFT', 'STATUS', 'VIEW'],
    timelineTitle: 'Certificate Audit Trail',
    detailLabel: 'VIEW'
  },
}

const content = computed(() => CONTENT[preferences.language])

// API States
const certs = ref<SupplierCertificateResponseDto[]>([])
const certHistories = ref<CertificateHistoryResponseDto[]>([])
const expiringCount = ref<number>(0)
const search = ref('')
const activeTab = ref<string>('ALL')

// Modals
const { isOpen: traceOpen, payload: selectedCert, open: openTrace, close: closeTrace } = useModal<SupplierCertificateResponseDto>(false)
const isCreateModalOpen = ref(false)
const isTypeCreateModalOpen = ref(false)

import { getSuppliers } from '../../../services/supplier'

// ... existing imports ...

// ... (find where `certs.value = fetchedCerts` happens and update)
async function fetchCertificates() {
  try {
    const res = await getAllCertificates()
    // 백엔드에서 사용자 권한(SUPPLIER 등)에 맞게 이미 필터링해서 내려준다고 가정합니다.
    // 403 에러가 나던 협력사 검색 로직은 제거합니다.
    certs.value = res.content
  } catch (e) {
    console.error('Failed to fetch certs:', e)
  }
}

async function fetchExpiring() {
  try {
    const expiring = await getExpiringCertificates()
    // 백엔드에서 이미 권한에 맞게 필터링된 결과가 내려온다고 가정합니다.
    expiringCount.value = expiring.length
  } catch (e) {
    console.error('Failed to fetch expiring certs:', e)
  }
}

onMounted(() => {
  fetchCertificates()
  fetchExpiring()
})

const metricDisplay = computed(() => {
  const base = [...content.value.metrics]
  if (!certs.value || certs.value.length === 0) {
    base[0] = { ...base[0], value: '0' }
    base[1] = { ...base[1], value: String(expiringCount.value) }
    base[2] = { ...base[2], value: '0' }
    base[3] = { ...base[3], value: '0' }
    return base
  }
  
  const validCerts = certs.value.filter(c => c.certificateStatus === 'APPROVED').length;
  const renewalNeeded = certs.value.filter(c => c.certificateStatus === 'EXPIRED' || c.certificateStatus === 'REVOKED').length;
  const numSuppliers = new Set(certs.value.map(c => c.supplierPublicId)).size;
  
  base[0] = { ...base[0], value: String(validCerts) }
  base[1] = { ...base[1], value: String(expiringCount.value) }
  base[2] = { ...base[2], value: String(renewalNeeded) }
  base[3] = { ...base[3], value: String(numSuppliers) }
  return base
})

function certStatusTone(status: string | null | undefined) {
  if (status === 'APPROVED') return 'is-success'
  if (status === 'REVIEW_REQUESTED') return 'is-warning'
  if (status === 'EXPIRED' || status === 'REVOKED' || status === 'REJECTED') return 'is-critical'
  return 'is-muted'
}

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const statusTab = activeTab.value

  return certs.value.filter((cert) => {
    const textMatch = !query || 
      cert.certificateNo.toLowerCase().includes(query) || 
      cert.supplierName?.toLowerCase().includes(query) ||
      cert.certificateType?.name?.toLowerCase().includes(query)
    
    if (!textMatch) return false
    if (statusTab === 'ALL') return true
    return cert.certificateStatus === statusTab
  })
})

function getDaysLeft(expiredAt: string) {
  if (!expiredAt) return '-'
  const diff = new Date(expiredAt).getTime() - new Date().getTime()
  const days = Math.ceil(diff / (1000 * 3600 * 24))
  if (days < 0) return `만료됨`
  return `D-${days}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const traceTitle = computed(() => {
  if (!selectedCert.value) return content.value.timelineTitle
  return `${selectedCert.value.certificateNo} 추적`
})

async function handleCertSelect(cert: SupplierCertificateResponseDto) {
  router.push({
    name: 'operationDetail',
    params: {
      kind: 'certificates',
      publicId: cert.publicId,
    },
  })
}

async function handleApprove() {
  if (!selectedCert.value) return
  if (!confirm('해당 인증서를 승인하시겠습니까?')) return

  try {
    await approveCertificate(selectedCert.value.publicId)
    alert('승인되었습니다.')
    await fetchCertificates()
    // refresh history
    certHistories.value = await getCertificateHistories(selectedCert.value.publicId)
    // update local payload reference status
    selectedCert.value.certificateStatus = 'APPROVED'
  } catch (err: any) {
    alert('Failed to approve: ' + err.message)
  }
}

async function handleReject() {
  if (!selectedCert.value) return
  const reason = prompt('반려 사유를 입력해주세요.')
  if (reason === null) return

  try {
    await rejectCertificate(selectedCert.value.publicId, reason)
    alert('반려되었습니다.')
    await fetchCertificates()
    certHistories.value = await getCertificateHistories(selectedCert.value.publicId)
    selectedCert.value.certificateStatus = 'REJECTED'
  } catch (err: any) {
    alert('Failed to reject: ' + err.message)
  }
}

async function handleCreateCertSubmit(supplierPublicId: string, data: CreateSupplierCertificateRequestDto) {
  try {
    await createSupplierCertificate(supplierPublicId, data)
    isCreateModalOpen.value = false
    alert('인증서가 성공적으로 등록 되었습니다.')
    await fetchCertificates()
  } catch (err: any) {
    alert('Error creating certificate: ' + err.message)
  }
}

function handleTypeCreateSuccess() {
  isTypeCreateModalOpen.value = false
  alert(preferences.language === 'ko' ? '인증 유형이 성공적으로 등록되었습니다.' : 'Certificate type successfully created.')
}

async function handleDownloadPdf(attachmentPublicId: string | undefined) {
  if (!attachmentPublicId) {
    alert(preferences.language === 'ko' ? '첨부된 파일이 없습니다.' : 'No attachment found.')
    return
  }
  try {
    const data = await getAttachment(attachmentPublicId)
    if (data.files && data.files.length > 0) {
      // 첫 번째 파일의 경로를 새 창에서 열기
      const fileUrl = data.files[0].fileUrl || (data.files[0] as any).filePath
      if (fileUrl) {
        window.open(fileUrl, '_blank')
      } else {
        throw new Error('File URL not found')
      }
    } else {
      alert(preferences.language === 'ko' ? '파일을 찾을 수 없습니다.' : 'File not found.')
    }
  } catch (err) {
    console.error('Download failed:', err)
    alert(preferences.language === 'ko' ? '다운로드 중 오류가 발생했습니다.' : 'Error during download.')
  }
}

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'cert-export', label: content.value.exportLabel, tone: 'secondary' },
  ])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button v-if="session.userRole === 'ADMIN'" class="page-button page-button--primary" type="button" @click="isTypeCreateModalOpen = true">
          {{ preferences.language === 'ko' ? '인증서 유형 등록' : 'ADD CERT TYPE' }}
        </button>
        <button v-else class="page-button page-button--primary" type="button" @click="isCreateModalOpen = true">
          {{ content.createLabel }}
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metricDisplay" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search">
        <span>⌕</span>
        <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
      </label>
      <div class="terminal-page__tabs" style="overflow-x: auto; white-space: nowrap;">
        <button
          v-for="tab in content.tabs"
          :key="tab"
          :class="['terminal-page__tab', { 'is-active': activeTab === tab }]"
          type="button"
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <article class="page-panel">
      <div class="page-panel__head">
        <div><div class="page-panel__eyebrow">CERTS</div><h3>{{ content.tableTitle }}</h3></div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>
      <div class="page-table terminal-page__table is-nine-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        
        <div v-for="cert in filteredRows" :key="cert.publicId" class="page-table__row">
          <span>{{ cert.certificateNo }}</span>
          <span>{{ cert.supplierName }}</span>
          <span>{{ cert.certificateType?.name }}</span>
          <span>{{ cert.issuerName }}</span>
          <span>{{ cert.issuedAt }}</span>
          <span>{{ cert.expiredAt }}</span>
          <span :class="{'text-critical': Number(getDaysLeft(cert.expiredAt).replace(/\D/g, '')) < 30}">
            {{ getDaysLeft(cert.expiredAt) }}
          </span>
          <span>
            <span :class="['page-status-chip', certStatusTone(cert.certificateStatus)]">
              {{ cert.certificateStatus }}
            </span>
          </span>
          <span style="display: flex; justify-content: flex-end;">
            <button class="page-button page-button--secondary" type="button" @click="handleCertSelect(cert)">
              {{ content.detailLabel }}
            </button>
          </span>
        </div>

        <div v-if="filteredRows.length === 0" style="padding: 32px 16px; text-align: center; color: var(--color-on-surface-variant); font-size: 0.875rem;">
          No matching certificates found.
        </div>
      </div>
    </article>
  </section>

  <!-- Create CERT Modal -->
  <CertificateCreateModal 
    :is-open="isCreateModalOpen" 
    :language="preferences.language" 
    @close="isCreateModalOpen = false" 
    @submit="handleCreateCertSubmit" 
  />

  <!-- Create CERT Type Modal (Admin Only) -->
  <CertificateTypeCreateModal
    :is-open="isTypeCreateModalOpen"
    :language="preferences.language"
    @close="isTypeCreateModalOpen = false"
    @success="handleTypeCreateSuccess"
  />

  <!-- Trace Timeline Modal -->
  <BaseModal
    v-model="traceOpen"
    :title="traceTitle"
    :description="preferences.language === 'ko' ? '인증서의 심사, 승인, 반려 이력을 조회합니다.' : 'Review certificate review audit trail.'"
    size="lg"
    @close="closeTrace"
  >
    <div v-if="selectedCert" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--color-surface-container-high);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 0.75rem; font-weight: bold; color: var(--color-on-surface-variant); letter-spacing: 0.05em;">인증서 파일</span>
        <button v-if="selectedCert.attachmentPublicId" class="page-button page-button--secondary" style="padding: 4px 12px; font-size: 0.75rem;" @click="handleDownloadPdf(selectedCert.attachmentPublicId)">
          PDF 보기
        </button>
        <span v-else style="color: var(--color-on-surface-variant); font-size: 0.875rem;">첨부파일 없음</span>
      </div>
    </div>

    <div class="page-table is-trace-cols" style="margin-top: 16px;">
      <div class="page-table__row page-table__row--head">
        <span>{{ preferences.language === 'ko' ? '일시' : 'Date' }}</span>
        <span>{{ preferences.language === 'ko' ? '상태' : 'Status' }}</span>
        <span>{{ preferences.language === 'ko' ? '상세 사유' : 'Reason' }}</span>
      </div>
      <div v-for="hist in certHistories" :key="hist.publicId" class="page-table__row">
        <span>{{ formatDate(hist.recordedAt) }}</span>
        <span>
          <span :class="{'text-warning': hist.afterStatus === 'REVIEW_REQUESTED', 'text-nominal': hist.afterStatus === 'APPROVED', 'text-critical': hist.afterStatus === 'REJECTED' || hist.afterStatus === 'REVOKED'}">
            {{ hist.afterStatus }}
          </span>
        </span>
        <span>{{ hist.reason || '-' }}</span>
      </div>
      <div v-if="certHistories.length === 0" style="padding: 16px; text-align: center; color: var(--color-on-surface-variant); grid-column: 1 / -1;">
        No history available.
      </div>
    </div>
    
    <!-- Admin Review Actions -->
    <div v-if="session.userRole === 'ADMIN' && selectedCert && selectedCert.certificateStatus === 'REVIEW_REQUESTED'" style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--color-surface-container-high); display: flex; flex-direction: column; gap: 16px;">
      <div>
        <div style="font-size: 0.75rem; color: var(--color-warning); margin-bottom: 8px;">ADMIN ACTION (REVIEW REQUESTED)</div>
        <div style="display: flex; gap: 8px;">
          <button class="page-button page-button--secondary" style="border-color: var(--color-nominal)" type="button" @click="handleApprove">
            APPROVE
          </button>
          <button class="page-button page-button--secondary" style="border-color: var(--color-critical)" type="button" @click="handleReject">
            REJECT
          </button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.text-critical {
  color: var(--color-critical, #ff3344);
}
.text-warning {
  color: var(--color-warning, #ffaa00);
}
.text-nominal {
  color: var(--color-nominal, #00eeaa);
}
.page-table.is-nine-cols .page-table__row {
  grid-template-columns: 1.4fr 1.2fr 1.2fr 1.2fr 1fr 1fr 0.8fr 1fr 0.9fr;
  min-width: 900px;
}

.page-table.is-trace-cols .page-table__row {
  grid-template-columns: 180px 150px 1fr;
}

.page-table {
  overflow-x: auto;
}
.terminal-page__tabs::-webkit-scrollbar {
  display: none;
}
</style>
