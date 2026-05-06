<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  approveCertificate,
  getAllCertificates,
  rejectCertificate,
  type SupplierCertificateResponseDto,
} from '../../../services/certificate'
import { getAttachment } from '../../../services/file'

const header = useAtlasHeaderStore()
const dialog = useAtlasDialogStore()
const preferences = useAtlasPreferencesStore()

const certificates = ref<SupplierCertificateResponseDto[]>([])
const selectedCertificate = ref<SupplierCertificateResponseDto | null>(null)
const search = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)

const content = computed(() => {
  if (preferences.language === 'en') {
    return {
      eyebrow: 'System / Certificate Review',
      title: 'Certificate Review',
      subtitle: 'Review newly submitted supplier certificates and decide approval status.',
      refresh: 'Refresh',
      searchPlaceholder: 'Search supplier, certificate number, or type...',
      tableTitle: 'Review List',
      pendingMetric: 'Pending Review',
      supplierMetric: 'Suppliers',
      selectedMetric: 'Selected Certificate',
      detailTitle: 'Review Detail',
      emptyDetail: 'Select a certificate from the left.',
      columns: ['CERT NO', 'SUPPLIER', 'TYPE', 'ISSUER', 'ISSUED', 'EXPIRES', 'ACTION'],
      viewDetail: 'View Detail',
      file: 'PDF',
      approve: 'Approve',
      reject: 'Reject',
      noFile: 'No file',
      noRows: 'No certificates waiting for review.',
    }
  }

  return {
    eyebrow: '시스템 / 인증서 심사',
    title: '인증서 심사',
    subtitle: '새로 등록된 협력사 인증서를 검토하고 승인 또는 반려합니다.',
    refresh: '새로고침',
    searchPlaceholder: '협력사명, 인증 번호, 인증 유형 검색...',
    tableTitle: '심사 목록',
    pendingMetric: '심사 대기',
    supplierMetric: '협력사 수',
    selectedMetric: '선택 인증서',
    detailTitle: '심사 상세',
    emptyDetail: '왼쪽에서 인증서를 선택해 주세요.',
    columns: ['인증서 번호', '협력사', '인증 유형', '발급 기관', '발급일', '만료일', '상세'],
    viewDetail: '상세보기',
    file: 'PDF 보기',
    approve: '승인',
    reject: '반려',
    noFile: '첨부파일 없음',
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

    if (selectedCertificate.value) {
      selectedCertificate.value = pendingCertificates.value.find(
        (certificate) => certificate.publicId === selectedCertificate.value?.publicId,
      ) ?? pendingCertificates.value[0] ?? null
    } else {
      selectedCertificate.value = pendingCertificates.value[0] ?? null
    }
  } catch (error) {
    console.error('Failed to load certificate review queue', error)
    await dialog.alert(preferences.language === 'ko' ? '인증서 심사 목록을 불러오지 못했습니다.' : 'Failed to load certificate review queue.')
  } finally {
    isLoading.value = false
  }
}

async function openCertificateFile(certificate: SupplierCertificateResponseDto) {
  if (!certificate.attachmentPublicId) {
    await dialog.alert(content.value.noFile)
    return
  }

  try {
    const attachment = await getAttachment(certificate.attachmentPublicId)
    const file = attachment.files?.[0]
    const fileUrl = file?.fileUrl || (file as any)?.filePath
    if (!fileUrl) throw new Error('File URL not found')
    window.open(fileUrl, '_blank')
  } catch (error) {
    console.error('Failed to open certificate file', error)
    await dialog.alert(preferences.language === 'ko' ? '인증서 파일을 열지 못했습니다.' : 'Failed to open certificate file.')
  }
}

async function approveSelectedCertificate() {
  if (!selectedCertificate.value || isSubmitting.value) return
  if (!(await dialog.confirm('해당 인증서를 승인하시겠습니까?'))) return

  try {
    isSubmitting.value = true
    await approveCertificate(selectedCertificate.value.publicId)
    await loadCertificates()
    await dialog.alert('인증서를 승인했습니다.')
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

  try {
    isSubmitting.value = true
    await rejectCertificate(selectedCertificate.value.publicId, reason)
    await loadCertificates()
    await dialog.alert('인증서를 반려했습니다.')
  } catch (error: any) {
    await dialog.alert(error?.message || '인증서 반려에 실패했습니다.')
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  header.setActions([
    { key: 'certificate-review-refresh', label: content.value.refresh, tone: 'secondary', onClick: loadCertificates },
  ])
  loadCertificates()
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page certificate-review-page">
    <header class="terminal-page__header">
      <div>
        <p class="terminal-page__eyebrow">{{ content.eyebrow }}</p>
        <h1 class="terminal-page__title">{{ content.title }}</h1>
        <p class="certificate-review-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <button class="page-button page-button--secondary" type="button" :disabled="isLoading" @click="loadCertificates">
        {{ content.refresh }}
      </button>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article class="page-metric is-warning">
        <span class="page-metric__label">{{ content.pendingMetric }}</span>
        <strong class="page-metric__value">{{ pendingCertificates.length }}</strong>
        <span class="page-metric__meta">REVIEW_REQUESTED</span>
      </article>
      <article class="page-metric is-info">
        <span class="page-metric__label">{{ content.supplierMetric }}</span>
        <strong class="page-metric__value">{{ supplierCount }}</strong>
        <span class="page-metric__meta">SUPPLIERS</span>
      </article>
      <article class="page-metric is-nominal">
        <span class="page-metric__label">{{ content.selectedMetric }}</span>
        <strong class="page-metric__value">{{ selectedCertificate ? selectedCertificate.certificateNo : '-' }}</strong>
        <span class="page-metric__meta">{{ selectedCertificate ? certificateTypeName(selectedCertificate) : '-' }}</span>
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
            :class="['page-table__row', 'certificate-review-page__row', { 'is-active': selectedCertificate?.publicId === certificate.publicId }]"
          >
            <span>{{ certificate.certificateNo }}</span>
            <span>{{ certificate.supplierName || '-' }}</span>
            <span>{{ certificateTypeName(certificate) }}</span>
            <span>{{ certificate.issuerName || '-' }}</span>
            <span>{{ formatDate(certificate.issuedAt) }}</span>
            <span>{{ formatDate(certificate.expiredAt) }}</span>
            <span>
              <button class="page-button page-button--secondary certificate-review-page__detail-button" type="button" @click="selectedCertificate = certificate">
                {{ content.viewDetail }}
              </button>
            </span>
          </div>
          <div v-if="!isLoading && filteredCertificates.length === 0" class="certificate-review-page__empty">
            {{ content.noRows }}
          </div>
        </div>
      </article>

      <article class="page-panel certificate-review-page__detail">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">TYPE DETAIL</div>
            <h2>{{ content.detailTitle }}</h2>
          </div>
        </div>

        <div v-if="selectedCertificate" class="certificate-review-page__detail-body">
          <div class="certificate-review-page__hero">
            <span class="material-symbols-outlined">workspace_premium</span>
            <div>
              <span>REVIEW_REQUESTED</span>
              <strong>{{ selectedCertificate.certificateNo }}</strong>
              <p>{{ selectedCertificate.supplierName }} · {{ certificateTypeName(selectedCertificate) }}</p>
            </div>
          </div>

          <dl class="certificate-review-page__detail-list">
            <div>
              <dt>협력사</dt>
              <dd>{{ selectedCertificate.supplierName || '-' }}</dd>
            </div>
            <div>
              <dt>인증 유형</dt>
              <dd>{{ certificateTypeName(selectedCertificate) }}</dd>
            </div>
            <div>
              <dt>발급 기관</dt>
              <dd>{{ selectedCertificate.issuerName || '-' }}</dd>
            </div>
            <div>
              <dt>발급일</dt>
              <dd>{{ formatDate(selectedCertificate.issuedAt) }}</dd>
            </div>
            <div>
              <dt>만료일</dt>
              <dd>{{ formatDate(selectedCertificate.expiredAt) }}</dd>
            </div>
          </dl>

          <div class="certificate-review-page__actions">
            <button class="page-button page-button--secondary" type="button" @click="openCertificateFile(selectedCertificate)">
              {{ selectedCertificate.attachmentPublicId ? content.file : content.noFile }}
            </button>
            <button class="page-button page-button--secondary" type="button" :disabled="isSubmitting" @click="rejectSelectedCertificate">
              {{ content.reject }}
            </button>
            <button class="page-button page-button--primary" type="button" :disabled="isSubmitting" @click="approveSelectedCertificate">
              {{ content.approve }}
            </button>
          </div>
        </div>

        <div v-else class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">{{ content.detailTitle }}</span>
            <strong class="page-feed__text">{{ content.emptyDetail }}</strong>
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

.certificate-review-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 96px;
  margin-top: 16px;
  padding: 24px 16px;
  border: 1px dashed var(--color-outline-variant);
  background: var(--color-surface);
  color: var(--color-on-surface);
  font-weight: 800;
  text-align: center;
}

.certificate-review-page__detail {
  display: none;
}

.certificate-review-page__detail-body {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.certificate-review-page__hero {
  display: grid;
  grid-template-columns: 72px 1fr;
  align-items: center;
  gap: 24px;
  min-height: 180px;
}

.certificate-review-page__hero > .material-symbols-outlined {
  font-size: 64px;
}

.certificate-review-page__hero span {
  display: block;
  color: var(--color-on-surface-variant);
  font-size: 0.8rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.certificate-review-page__hero strong {
  display: block;
  margin-top: 6px;
  font-size: clamp(2rem, 4vw, 3.4rem);
  line-height: 1;
}

.certificate-review-page__hero p {
  margin: 12px 0 0;
  color: var(--color-on-surface-variant);
  font-weight: 800;
}

.certificate-review-page__detail-list {
  display: grid;
  gap: 0;
  margin: 0;
}

.certificate-review-page__detail-list > div {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 16px;
  padding: 18px 0;
  border-top: 1px solid var(--color-outline-variant);
}

.certificate-review-page__detail-list dt {
  color: var(--color-on-surface-variant);
  font-weight: 900;
}

.certificate-review-page__detail-list dd {
  margin: 0;
  text-align: right;
  font-weight: 900;
}

.certificate-review-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1180px) {
  .certificate-review-page__grid {
    grid-template-columns: 1fr;
  }
}
</style>
