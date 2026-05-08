<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasSessionStore } from '../../../stores/session'
import { useAtlasNavigationStore } from '../../../stores/navigation'
import { 
  getSupplierCertificates,
  createSupplierCertificate, updateCertificate,
  type SupplierCertificateResponseDto,
  type CreateSupplierCertificateRequestDto,
} from '../../../services/certificate'
import { getMySupplier } from '../../../services/supplier'
import CertificateCreateModal from '../components/CertificateCreateModal.vue'
import DocumentsPage from './DocumentsPage.vue'
import { uploadAttachment } from '../../../services/file'

const header = useAtlasHeaderStore()
const dialog = useAtlasDialogStore()
const session = useAtlasSessionStore()
const navigation = useAtlasNavigationStore()

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
    tabs: ['전체', '심사 요청', '승인', '만료', '반려', '철회'],
    searchPlaceholder: '협력사명, 인증 번호 검색...',
    tableTitle: '전체 인증서 이력',
    createLabel: '인증서 등록',
    columns: ['인증서 번호', '협력사', '인증 유형', '발급 기관', '발급일', '만료일', '남은 일수', '상태', '상세'],
    detailLabel: '상세보기'
  },
}

const CERTIFICATE_TAB_STATUS: Record<string, string> = {
  전체: 'ALL',
  '심사 요청': 'REVIEW_REQUESTED',
  승인: 'APPROVED',
  만료: 'EXPIRED',
  반려: 'REJECTED',
  철회: 'REVOKED',
}

const CERTIFICATE_STATUS_TEXT: Record<string, string> = {
  REVIEW_REQUESTED: '심사 요청',
  APPROVED: '승인',
  EXPIRED: '만료',
  REJECTED: '반려',
  REVOKED: '철회',
}

const content = computed(() => CONTENT.ko)

// API States
const certs = ref<SupplierCertificateResponseDto[]>([])
const search = ref('')
const activeTab = ref<string>('전체')

// Modals
const isCreateModalOpen = ref(false)
const selectedCertificateForDocuments = ref<SupplierCertificateResponseDto | null>(null)
async function fetchCertificates() {
  try {
    const mySupplier = await getMySupplier()
    certs.value = await getSupplierCertificates(mySupplier.publicId)
  } catch (e) {
    console.error('Failed to fetch certs:', e)
    certs.value = []
  }
}

onMounted(() => {
  fetchCertificates()
})

const metricDisplay = computed(() => {
  const base = [...content.value.metrics]
  const now = Date.now()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const expiringCount = certs.value.filter((cert) => {
    const expiry = new Date(cert.expiredAt).getTime()
    return Number.isFinite(expiry) && expiry >= now && expiry <= now + thirtyDaysMs
  }).length

  if (!certs.value || certs.value.length === 0) {
    base[0] = { ...base[0], value: '0' }
    base[1] = { ...base[1], value: '0' }
    base[2] = { ...base[2], value: '0' }
    base[3] = { ...base[3], value: '0' }
    return base
  }
  
  const validCerts = certs.value.filter(c => c.certificateStatus === 'APPROVED').length;
  const renewalNeeded = certs.value.filter(c => c.certificateStatus === 'EXPIRED' || c.certificateStatus === 'REVOKED').length;
  const numSuppliers = new Set(certs.value.map(c => c.supplierPublicId)).size;
  
  base[0] = { ...base[0], value: String(validCerts) }
  base[1] = { ...base[1], value: String(expiringCount) }
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
    const certificateTypeName = getCertificateTypeName(cert.certificateType).toLowerCase()
    const textMatch = !query || 
      cert.certificateNo.toLowerCase().includes(query) || 
      cert.supplierName?.toLowerCase().includes(query) ||
      certificateTypeName.includes(query)
    
    if (!textMatch) return false
    const statusKey = CERTIFICATE_TAB_STATUS[statusTab] ?? 'ALL'
    if (statusKey === 'ALL') return true
    return cert.certificateStatus === statusKey
  })
})

function certStatusText(status: string | null | undefined) {
  if (!status) return '-'
  return CERTIFICATE_STATUS_TEXT[status] ?? status
}

function getCertificateTypeName(type: SupplierCertificateResponseDto['certificateType'] | null | undefined) {
  return type?.name || type?.certificateName || type?.certificateCode || '-'
}

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

async function handleCertSelect(cert: SupplierCertificateResponseDto) {
  selectedCertificateForDocuments.value = cert
}

watch(
  () => navigation.navigationSequence,
  () => {
    if (navigation.lastNavigationPageKey === 'certificateWatch') {
      selectedCertificateForDocuments.value = null
    }
  },
)

async function handleCreateCertSubmit(supplierPublicId: string, data: CreateSupplierCertificateRequestDto, file: File) {
  try {
    const createdCertificate = await createSupplierCertificate(supplierPublicId, data)
    const uploadRes = await uploadAttachment(file, 'SUPPLIER_CERTIFICATE', createdCertificate.publicId)
    await updateCertificate(createdCertificate.publicId, {
      ...data,
      attachmentPublicId: uploadRes.attachmentPublicId,
    })
    isCreateModalOpen.value = false
    await nextTick()
    await dialog.alert('인증서가 성공적으로 등록 되었습니다.')
    await fetchCertificates()
  } catch (err: any) {
    await dialog.alert('인증서 등록에 실패했습니다: ' + err.message)
  }
}

watchEffect(() => {
  if (!content.value.tabs.includes(activeTab.value)) {
    activeTab.value = content.value.tabs[0]
  }
  header.setActions([])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <DocumentsPage
    v-if="selectedCertificateForDocuments"
    embedded
    :certificate="selectedCertificateForDocuments"
    @back="selectedCertificateForDocuments = null"
  />

  <section v-else class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button v-if="session.userRole !== 'ADMIN'" class="page-button page-button--primary" type="button" @click="isCreateModalOpen = true">
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
      <label class="certificates-page__mobile-status-filter">
        <span class="sr-only">상태 필터</span>
        <select v-model="activeTab">
          <option v-for="tab in content.tabs" :key="tab" :value="tab">{{ tab }}</option>
        </select>
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
        <div><div class="page-panel__eyebrow">인증서</div><h3>{{ content.tableTitle }}</h3></div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>
      <div class="page-table terminal-page__table certificates-page__table is-nine-cols">
        <div class="page-table__row page-table__row--head">
          <span class="certificates-page__col certificates-page__col--number">인증서 번호</span>
          <span class="certificates-page__col certificates-page__col--supplier">협력사</span>
          <span class="certificates-page__col certificates-page__col--type">인증 유형</span>
          <span class="certificates-page__col certificates-page__col--issuer">발급 기관</span>
          <span class="certificates-page__col certificates-page__col--issued">발급일</span>
          <span class="certificates-page__col certificates-page__col--expired">만료일</span>
          <span class="certificates-page__col certificates-page__col--days">남은 일수</span>
          <span class="certificates-page__col certificates-page__col--status">상태</span>
          <span class="certificates-page__col certificates-page__col--detail">상세</span>
        </div>
        
        <div v-if="filteredRows.length === 0" class="terminal-page__table-message">
          조건에 맞는 인증서가 없습니다.
        </div>

        <template v-else>
          <div v-for="cert in filteredRows" :key="cert.publicId" class="page-table__row">
            <span class="certificates-page__col certificates-page__col--number">{{ cert.certificateNo }}</span>
            <span class="certificates-page__col certificates-page__col--supplier">{{ cert.supplierName }}</span>
            <span class="certificates-page__col certificates-page__col--type">{{ getCertificateTypeName(cert.certificateType) }}</span>
            <span class="certificates-page__col certificates-page__col--issuer">{{ cert.issuerName }}</span>
            <span class="certificates-page__col certificates-page__col--issued">{{ cert.issuedAt }}</span>
            <span class="certificates-page__col certificates-page__col--expired">{{ cert.expiredAt }}</span>
            <span class="certificates-page__col certificates-page__col--days" :class="{'text-critical': Number(getDaysLeft(cert.expiredAt).replace(/\D/g, '')) < 30}">
              {{ getDaysLeft(cert.expiredAt) }}
            </span>
            <span class="certificates-page__col certificates-page__col--status certificates-page__status-cell">
              <span :class="['page-status-chip', certStatusTone(cert.certificateStatus)]">
                {{ certStatusText(cert.certificateStatus) }}
              </span>
            </span>
            <span class="certificates-page__col certificates-page__col--detail certificates-page__detail-cell">
              <button class="page-button page-button--secondary" type="button" @click="handleCertSelect(cert)">
                {{ content.detailLabel }}
              </button>
            </span>
          </div>
        </template>
      </div>
    </article>
  </section>

  <!-- Create CERT Modal -->
  <CertificateCreateModal 
    :is-open="isCreateModalOpen" 
    language="ko"
    @close="isCreateModalOpen = false" 
    @submit="handleCreateCertSubmit" 
  />

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
.certificates-page__table .page-table__row {
  grid-template-columns:
    minmax(128px, 1.1fr)
    minmax(120px, 1.4fr)
    minmax(130px, 1.1fr)
    repeat(6, minmax(72px, 1fr));
  min-width: 860px;
  gap: 0;
}

.certificates-page__table .page-table__row > span {
  min-width: 0;
  padding-right: 14px;
  word-break: keep-all;
}

.certificates-page__col {
  min-width: 0;
}

.certificates-page__col--number,
.certificates-page__col--supplier,
.certificates-page__col--type {
  overflow-wrap: anywhere;
}

.certificates-page__status-cell {
  justify-self: stretch;
}

.certificates-page__status-cell .page-status-chip {
  min-width: 0;
  white-space: nowrap;
}

.certificates-page__col--detail {
  justify-self: stretch;
  text-align: right;
  padding-right: 0 !important;
}

.certificates-page__detail-cell {
  display: flex;
  justify-content: flex-end;
  justify-self: stretch;
}

.certificates-page__detail-cell .page-button {
  min-width: 0;
  padding-inline: 14px;
  white-space: nowrap;
}

.page-table.is-trace-cols .page-table__row {
  grid-template-columns: 180px 150px 1fr;
}

.page-table {
  overflow-x: auto;
}

.certificates-page__mobile-status-filter {
  display: none;
}

.certificates-page__mobile-status-filter select {
  width: 100%;
  height: 100%;
  min-height: 48px;
  padding: 0 34px 0 12px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.38);
  border-radius: 0;
  background: var(--surface-container-lowest, #fff);
  color: var(--color-on-surface);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 900;
  cursor: pointer;
}

@media (max-width: 640px) {
  .terminal-page__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .terminal-page__metrics .page-metric {
    min-width: 0;
    padding: 16px;
  }
}

@media (max-width: 1280px) {
  .terminal-page__filter {
    grid-template-columns: minmax(0, 1fr) 120px;
  }

  .certificates-page__mobile-status-filter {
    display: block;
  }

  .terminal-page__tabs {
    display: none;
  }
}

@media (max-width: 1500px) {
  .certificates-page__table .page-table__row {
    grid-template-columns:
      minmax(128px, 1.1fr)
      minmax(120px, 1.35fr)
      minmax(130px, 1.1fr)
      repeat(5, minmax(76px, 1fr));
    min-width: 780px;
  }

  .certificates-page__col--issuer {
    display: none;
  }
}

@media (max-width: 1280px) {
  .certificates-page__table .page-table__row {
    grid-template-columns:
      minmax(124px, 1.15fr)
      minmax(112px, 1.2fr)
      minmax(126px, 1.15fr)
      minmax(104px, 0.9fr)
      minmax(92px, 0.78fr)
      minmax(88px, 0.7fr)
      minmax(96px, 0.72fr);
    min-width: 720px;
  }

  .certificates-page__col--days {
    display: none;
  }
}

@media (max-width: 1120px) {
  .certificates-page__table .page-table__row {
    grid-template-columns:
      minmax(124px, 1.2fr)
      minmax(110px, 1.15fr)
      minmax(126px, 1.15fr)
      minmax(104px, 0.9fr)
      minmax(88px, 0.72fr)
      minmax(96px, 0.72fr);
    min-width: 650px;
  }

  .certificates-page__col--expired {
    display: none;
  }
}

@media (max-width: 980px) {
  .certificates-page__table .page-table__row {
    grid-template-columns:
      minmax(118px, 1.2fr)
      minmax(104px, 1.1fr)
      minmax(122px, 1.1fr)
      minmax(86px, 0.78fr)
      minmax(94px, 0.72fr);
    min-width: 560px;
  }

  .certificates-page__col--issued {
    display: none;
  }
}

@media (max-width: 840px) {
  .certificates-page__table .page-table__row {
    grid-template-columns:
      minmax(112px, 1.2fr)
      minmax(100px, 1.05fr)
      minmax(82px, 0.78fr)
      minmax(94px, 0.72fr);
    min-width: 440px;
  }

  .certificates-page__col--type {
    display: none;
  }
}

@media (max-width: 560px) {
  .certificates-page__table .page-table__row {
    grid-template-columns:
      minmax(100px, 1.1fr)
      minmax(80px, 0.8fr)
      minmax(88px, 0.72fr);
    min-width: 320px;
  }

  .certificates-page__col--supplier {
    display: none;
  }

  .certificates-page__detail-cell .page-button {
    padding-inline: 8px;
  }
}

.terminal-page__tabs::-webkit-scrollbar {
  display: none;
}
</style>
