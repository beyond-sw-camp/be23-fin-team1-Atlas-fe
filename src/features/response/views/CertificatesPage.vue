<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasSessionStore } from '../../../stores/session'
import { 
  getAllCertificates, getExpiringCertificates, 
  createSupplierCertificate,
  type SupplierCertificateResponseDto,
  type CreateSupplierCertificateRequestDto,
} from '../../../services/certificate'
import CertificateCreateModal from '../components/CertificateCreateModal.vue'
import DocumentsPage from './DocumentsPage.vue'

const header = useAtlasHeaderStore()
const dialog = useAtlasDialogStore()
const session = useAtlasSessionStore()

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
const expiringCount = ref<number>(0)
const search = ref('')
const activeTab = ref<string>('전체')

// Modals
const isCreateModalOpen = ref(false)
const selectedCertificateForDocuments = ref<SupplierCertificateResponseDto | null>(null)
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
    const statusKey = CERTIFICATE_TAB_STATUS[statusTab] ?? 'ALL'
    if (statusKey === 'ALL') return true
    return cert.certificateStatus === statusKey
  })
})

function certStatusText(status: string | null | undefined) {
  if (!status) return '-'
  return CERTIFICATE_STATUS_TEXT[status] ?? status
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

async function handleCreateCertSubmit(supplierPublicId: string, data: CreateSupplierCertificateRequestDto) {
  try {
    await createSupplierCertificate(supplierPublicId, data)
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
      <div class="page-table terminal-page__table is-nine-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in content.columns" :key="column">{{ column }}</span>
        </div>
        
        <div v-if="filteredRows.length === 0" class="terminal-page__table-message">
          조건에 맞는 인증서가 없습니다.
        </div>

        <template v-else>
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
                {{ certStatusText(cert.certificateStatus) }}
              </span>
            </span>
            <span style="display: flex; justify-content: flex-end;">
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
