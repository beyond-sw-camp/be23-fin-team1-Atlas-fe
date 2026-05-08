<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAtlasDialogStore } from '../../../stores/dialog'
import {
  approveCertificate,
  getCertificate,
  getAllCertificates,
  rejectCertificate,
  type SupplierCertificateResponseDto,
} from '../../../services/certificate'
import DocumentsPage from '../../response/views/DocumentsPage.vue'

const dialog = useAtlasDialogStore()
const certificates = ref<SupplierCertificateResponseDto[]>([])
const selectedCertificate = ref<SupplierCertificateResponseDto | null>(null)
const search = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)

const content = computed(() => {
  return {
    eyebrow: '시스템 / 인증서 심사',
    title: '인증서 심사',
    subtitle: '새로 등록된 협력사 인증서를 검토하고 승인 또는 반려합니다.',
    searchPlaceholder: '협력사명, 인증 번호, 인증 유형 검색...',
    tableTitle: '심사 목록',
    pendingMetric: '심사 대기',
    supplierMetric: '협력사 수',
    reviewRatioMetric: '심사 비율',
    columns: ['인증서 번호', '협력사', '인증 유형', '발급 기관', '발급일', '만료일', '상세'],
    viewDetail: '상세보기',
    approve: '승인',
    reject: '반려',
    noRows: '심사 대기 중인 인증서가 없습니다.',
  }
})

const pendingCertificates = computed(() =>
  certificates.value.filter((certificate) => certificate.certificateStatus === 'REVIEW_REQUESTED'),
)

const filteredCertificates = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) return pendingCertificates.value

  return pendingCertificates.value.filter((certificate) => [
    certificate.certificateNo,
    certificate.supplierName,
    certificate.issuerName,
    certificate.certificateType?.certificateName,
    certificate.certificateType?.name,
    certificate.certificateType?.certificateCode,
  ].some((value) => String(value ?? '').toLowerCase().includes(query)))
})

const supplierCount = computed(() => new Set(pendingCertificates.value.map((certificate) => certificate.supplierPublicId)).size)

const reviewRatio = computed(() => {
  if (certificates.value.length === 0) return 0
  return Math.round((pendingCertificates.value.length / certificates.value.length) * 100)
})

function certificateTypeName(certificate: SupplierCertificateResponseDto) {
  return certificate.certificateType?.certificateName
    || certificate.certificateType?.name
    || certificate.certificateType?.certificateCode
    || '-'
}

function formatDate(value: string | undefined) {
  if (!value) return '-'
  return value
}

async function loadCertificates() {
  try {
    isLoading.value = true
    const response = await getAllCertificates({ size: 100 })
    certificates.value = response.content ?? []
  } catch (error) {
    console.error('Failed to load certificate review queue', error)
    await dialog.alert('인증서 심사 목록을 불러오지 못했습니다.')
  } finally {
    isLoading.value = false
  }
}

async function openCertificateDetail(certificate: SupplierCertificateResponseDto) {
  try {
    selectedCertificate.value = await getCertificate(certificate.publicId)
  } catch (error) {
    console.error('Failed to load certificate detail', error)
    selectedCertificate.value = certificate
  }
}

async function refreshSelectedCertificate(publicId: string, fallbackStatus: SupplierCertificateResponseDto['certificateStatus']) {
  try {
    selectedCertificate.value = await getCertificate(publicId)
  } catch (error) {
    console.error('Failed to refresh certificate detail', error)
    if (selectedCertificate.value?.publicId === publicId) {
      selectedCertificate.value = {
        ...selectedCertificate.value,
        certificateStatus: fallbackStatus,
      }
    }
  }
}

async function approveSelectedCertificate() {
  if (!selectedCertificate.value || isSubmitting.value) return
  if (!(await dialog.confirm('해당 인증서를 승인하시겠습니까?'))) return

  const publicId = selectedCertificate.value.publicId
  try {
    isSubmitting.value = true
    await approveCertificate(publicId)
    await Promise.all([
      refreshSelectedCertificate(publicId, 'APPROVED'),
      loadCertificates(),
    ])
    await dialog.alert('인증서가 승인되었습니다.')
  } catch (error: any) {
    await dialog.alert(error?.message || '인증서 승인에 실패했습니다.')
  } finally {
    isSubmitting.value = false
  }
}

async function rejectSelectedCertificate() {
  if (!selectedCertificate.value || isSubmitting.value) return
  const reason = await dialog.prompt('반려 사유를 입력해 주세요.')
  if (reason === null) return

  const publicId = selectedCertificate.value.publicId
  try {
    isSubmitting.value = true
    await rejectCertificate(publicId, reason)
    await Promise.all([
      refreshSelectedCertificate(publicId, 'REJECTED'),
      loadCertificates(),
    ])
    await dialog.alert('인증서가 반려되었습니다.')
  } catch (error: any) {
    await dialog.alert(error?.message || '인증서 반려에 실패했습니다.')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  loadCertificates()
})
</script>

<template>
  <section v-if="selectedCertificate" class="certificate-review-page__detail-screen">
    <DocumentsPage
      embedded
      review-actions
      :review-submitting="isSubmitting"
      :certificate="selectedCertificate"
      @back="selectedCertificate = null"
      @reject="rejectSelectedCertificate"
      @approve="approveSelectedCertificate"
    />
  </section>

  <section v-else class="app-screen terminal-page certificate-review-page">
    <header class="terminal-page__header">
      <div>
        <p class="terminal-page__eyebrow">{{ content.eyebrow }}</p>
        <h1 class="terminal-page__title">{{ content.title }}</h1>
        <p class="certificate-review-page__subtitle">{{ content.subtitle }}</p>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article class="page-metric is-warning">
        <span class="page-metric__label">{{ content.pendingMetric }}</span>
        <strong class="page-metric__value">{{ pendingCertificates.length }}</strong>
        <span class="page-metric__meta">심사 요청</span>
      </article>
      <article class="page-metric is-info">
        <span class="page-metric__label">{{ content.supplierMetric }}</span>
        <strong class="page-metric__value">{{ supplierCount }}</strong>
        <span class="page-metric__meta">협력사 기준</span>
      </article>
      <article class="page-metric is-nominal">
        <span class="page-metric__label">{{ content.reviewRatioMetric }}</span>
        <strong class="page-metric__value">{{ reviewRatio }}%</strong>
        <span class="page-metric__meta">전체 인증서 대비</span>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search">
        <span>⌕</span>
        <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
      </label>
    </section>

    <section class="certificate-review-page__grid">
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">CERTIFICATE REVIEW</div>
            <h2>{{ content.tableTitle }}</h2>
          </div>
          <span class="page-panel__chip">{{ filteredCertificates.length }}</span>
        </div>

        <div class="page-table terminal-page__table certificate-review-page__table">
          <div class="page-table__row page-table__row--head">
            <span v-for="column in content.columns" :key="column">{{ column }}</span>
          </div>
          <div
            v-for="certificate in filteredCertificates"
            :key="certificate.publicId"
            class="page-table__row certificate-review-page__row"
          >
            <span>{{ certificate.certificateNo }}</span>
            <span>{{ certificate.supplierName || '-' }}</span>
            <span>{{ certificateTypeName(certificate) }}</span>
            <span>{{ certificate.issuerName || '-' }}</span>
            <span>{{ formatDate(certificate.issuedAt) }}</span>
            <span>{{ formatDate(certificate.expiredAt) }}</span>
            <span>
              <button class="page-button page-button--secondary certificate-review-page__detail-button" type="button" @click="openCertificateDetail(certificate)">
                {{ content.viewDetail }}
              </button>
            </span>
          </div>
          <div v-if="!isLoading && filteredCertificates.length === 0" class="terminal-page__table-message">
            {{ content.noRows }}
          </div>
        </div>
      </article>
    </section>
  </section>
</template>

<style scoped>
.certificate-review-page__subtitle {
  margin: 8px 0 0;
  color: var(--color-on-surface-variant);
  font-weight: 700;
}

.certificate-review-page__grid {
  width: 100%;
}

.certificate-review-page__table .page-table__row {
  grid-template-columns: 1.2fr 1fr 1.15fr 1fr 0.9fr 0.9fr 0.7fr;
  min-width: 1040px;
}

.certificate-review-page__row.is-active {
  background: var(--color-surface-container-high);
  outline: 1px solid var(--color-outline);
}

.certificate-review-page__detail-button {
  min-height: 44px;
  padding: 0 14px;
  font-size: 0.85rem;
}

.certificate-review-page__detail-screen {
  display: grid;
  gap: 24px;
}

@media (max-width: 1180px) {
  .certificate-review-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
