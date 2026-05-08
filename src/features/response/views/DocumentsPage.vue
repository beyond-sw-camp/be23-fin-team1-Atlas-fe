<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from 'vue'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { SupplierCertificateResponseDto } from '../../../services/certificate'
import { getAttachment, type AttachmentFileDto } from '../../../services/file'

const props = withDefaults(defineProps<{
  embedded?: boolean
  certificate?: SupplierCertificateResponseDto | null
}>(), {
  embedded: false,
  certificate: null,
})

const emit = defineEmits<{
  back: []
}>()

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface DocumentInfoSection {
  title: string
  rows: Array<[string, string]>
}

interface DocumentFileItem {
  name: string
  state: string
  note: string
  issue: boolean
  fileUrl?: string | null
  mimeType?: string
  infoRows?: Array<[string, string]>
  infoSections?: DocumentInfoSection[]
}

const CONTENT = {
  ko: {
    title: '문서 관리',
    subtitle: '기술 승인 문서와 송장 체인을 한 화면에서 추적합니다.',
    tabs: ['전체 파일 (124)', 'OCR 대기 (8)', '검증 완료 (96)', '주의 필요 (14)'],
    currentDocument: '현재 문서',
    fileQueue: [
      { name: '송장-9920-X1.pdf', state: '열람 중', note: '2.4MB / 업로드 14:22', issue: false },
      { name: '선하증권-440.pdf', state: '검증됨', note: '1.1MB / 업로드 12:05', issue: false },
      { name: '통관신고-02.png', state: 'OCR 오류', note: '4.8MB / 업로드 10:45', issue: true },
      { name: '포장명세-ZZ.pdf', state: '대기', note: '0.8MB / 업로드 09:30', issue: false },
    ],
    previewTitle: '상업 송장',
    previewId: '송장 9920-X1',
    previewDateLabel: '발행일',
    previewDate: '2024.10.12',
    previewSupplierLabel: '공급 법인',
    previewSupplierValue: '글로벌 물류 허브',
    previewBuyerLabel: '수신 법인',
    previewBuyerValue: '모노리스 공급망 운영',
    previewRows: [
      ['냉장 유닛 X', '2', '14,200원', '28,400원'],
      ['센서 배열 V4', '39', '450원', '4,500원'],
    ],
    previewTableHead: ['품목 설명', '수량', '단가', '총계'],
    totalLabel: '총액',
    totalValue: '32,900원',
    stats: [
      { label: 'OCR 신뢰도', value: '98.4%', meta: '재처리 불필요' },
      { label: '감지 필드', value: '14 / 14', meta: '스키마 일치' },
      { label: '전표 연동 상태', value: '대기', meta: '전표 입력 대기열' },
    ],
    extractionTitle: '추출 데이터 검증',
    extractionChip: '매핑 수정',
    extractionRows: [
      ['송장 번호', '송장 9920-X1', '0.99', '준비'],
      ['사업자 번호', 'NL88290123801', '0.97', '준비'],
      ['통화', '원', '1.00', '준비'],
      ['지급 기한', '2024.11.12', '0.92', '검토'],
    ],
  },
}

const content = computed(() => CONTENT.ko)
const pageTitle = computed(() => props.certificate ? '인증서 문서 관리' : content.value.title)
const attachmentFiles = ref<AttachmentFileDto[]>([])
const attachmentLoading = ref(false)
const directoryText = computed(() => {
  if (!props.certificate) return '루트 / 물류 / 2024년 송장'
  return `인증서 / ${props.certificate.supplierName || '협력사'} / ${props.certificate.certificateNo}`
})
const search = ref('')
const activeTab = ref(0)
const activeFileIndex = ref(0)
const previewScale = ref(1)
const certificateTypeName = computed(() => {
  const type = props.certificate?.certificateType
  return type?.name || type?.certificateName || type?.certificateCode || '인증서'
})

const certificateFileState = computed(() => {
  const status = props.certificate?.certificateStatus
  if (status === 'REVIEW_REQUESTED') return '심사 요청'
  if (status === 'APPROVED') return '승인'
  if (status === 'REJECTED') return '반려'
  if (status === 'EXPIRED') return '만료'
  if (status === 'REVOKED') return '철회'
  return '대기'
})

const certificateDurationText = computed(() => {
  const issuedAt = props.certificate?.issuedAt
  const expiredAt = props.certificate?.expiredAt

  if (!issuedAt || !expiredAt) return '-'

  const issued = new Date(issuedAt)
  const expired = new Date(expiredAt)

  if (Number.isNaN(issued.getTime()) || Number.isNaN(expired.getTime())) return '-'

  const diffDays = Math.ceil((expired.getTime() - issued.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return '-'

  return `${diffDays}일`
})

const certificateInfoSections = computed<DocumentInfoSection[]>(() => {
  if (!props.certificate) return []
  return [
    {
      title: '신청 정보',
      rows: [
        ['인증서 번호', props.certificate.certificateNo || '-'],
        ['신청사', props.certificate.supplierName || '-'],
        ['인증 유형', certificateTypeName.value],
      ],
    },
    {
      title: '발급 정보',
      rows: [
        ['발급 기관', props.certificate.issuerName || '-'],
        ['발급일', formatDisplayDate(props.certificate.issuedAt)],
        ['만료일', formatDisplayDate(props.certificate.expiredAt)],
        ['남은 기간', certificateDurationText.value],
      ],
    },
    {
      title: '상태',
      rows: [
        ['심사 상태', certificateFileState.value],
      ],
    },
  ]
})

const certificateDocumentFiles = computed<DocumentFileItem[]>(() => {
  if (!props.certificate) return content.value.fileQueue

  if (attachmentLoading.value) {
    const name = '첨부파일 조회 중'
    const state = '불러오는 중'
    return [{
      name,
      state,
      note: '첨부파일 정보를 불러오는 중',
      issue: false,
      infoSections: [
        createFileInfoSection(name, '조회 중', '-'),
        ...certificateInfoSections.value,
      ],
    }]
  }

  if (attachmentFiles.value.length === 0) {
    const name = `${props.certificate.certificateNo}.pdf`
    const state = props.certificate.attachmentPublicId ? certificateFileState.value : '첨부 없음'
    const note = props.certificate.attachmentPublicId ? '첨부파일 정보를 찾을 수 없습니다.' : '등록된 첨부파일이 없습니다.'
    return [{
      name,
      state,
      note,
      issue: !props.certificate.attachmentPublicId,
      infoSections: [
        createFileInfoSection(name, note, '-'),
        ...certificateInfoSections.value,
      ],
    }]
  }

  return attachmentFiles.value.map((file) => {
    const name = file.originalFileName || file.fileName || `${props.certificate?.certificateNo}.pdf`
    const size = formatFileSize(file.fileSize ?? file.size ?? 0)
    const type = formatFileType(file.mimeType || file.contentType, name)
    const state = certificateFileState.value

    return {
      name,
      state,
      note: `${size} / ${type}`,
      issue: props.certificate?.certificateStatus === 'REJECTED',
      fileUrl: file.filePath || file.fileUrl || null,
      mimeType: file.mimeType || file.contentType,
      infoSections: [
        createFileInfoSection(name, size, type),
        ...certificateInfoSections.value,
      ],
    }
  })
})

const filteredFileQueue = computed(() => {
  const query = search.value.trim().toLowerCase()
  const activeFilter = content.value.tabs[activeTab.value]

  return certificateDocumentFiles.value.filter((file) => {
    const infoText = file.infoRows?.map(([, value]) => value).join(' ').toLowerCase() ?? ''
    const sectionText =
      file.infoSections
        ?.flatMap((section) => section.rows.map(([, value]) => value))
        .join(' ')
        .toLowerCase() ?? ''
    const matchesQuery =
      !query ||
      file.name.toLowerCase().includes(query) ||
      file.state.toLowerCase().includes(query) ||
      file.note.toLowerCase().includes(query) ||
      infoText.includes(query) ||
      sectionText.includes(query)

    if (!matchesQuery) {
      return false
    }

    if (activeFilter.includes('전체 파일')) return true
    if (activeFilter.includes('OCR 대기')) return file.state === 'OCR 오류'
    if (activeFilter.includes('검증 완료')) return file.state === '검증됨'
    if (activeFilter.includes('주의 필요')) return file.issue

    return true
  })
})

const activeFile = computed(() => filteredFileQueue.value[activeFileIndex.value] ?? filteredFileQueue.value[0] ?? null)
const activeFileUrl = computed(() => activeFile.value?.fileUrl || null)
const activeFileIsPdf = computed(() => {
  const file = activeFile.value
  return Boolean(file?.mimeType?.includes('pdf') || file?.name.toLowerCase().endsWith('.pdf'))
})
const pdfPageImages = ref<string[]>([])
const activePdfPageIndex = ref(0)
const pdfRendering = ref(false)
const pdfRenderError = ref(false)
let pdfRenderSequence = 0
const previewRows = computed(() => {
  if (!props.certificate) return content.value.previewRows
  return [
    ['인증서 번호', props.certificate.certificateNo || '-', '상태', certificateFileState.value],
    ['인증 유형', certificateTypeName.value, '기관', props.certificate.issuerName || '-'],
    ['발급일', formatDisplayDate(props.certificate.issuedAt), '만료일', formatDisplayDate(props.certificate.expiredAt)],
  ]
})

const activePdfPageImage = computed(() => pdfPageImages.value[activePdfPageIndex.value] ?? '')
const activePdfPageNumber = computed(() => {
  if (pdfPageImages.value.length === 0) return 0
  return activePdfPageIndex.value + 1
})
const canMovePdfPrev = computed(() => activePdfPageIndex.value > 0)
const canMovePdfNext = computed(() => activePdfPageIndex.value + 1 < pdfPageImages.value.length)
const previewTransform = computed(() => `scale(${previewScale.value})`)

function formatDisplayDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}. ${String(date.getMonth() + 1).padStart(2, '0')}. ${String(date.getDate()).padStart(2, '0')}.`
}

function formatFileSize(bytes: number) {
  if (!bytes) return '-'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function createFileInfoSection(name: string, size: string, type: string): DocumentInfoSection {
  return {
    title: '파일 정보',
    rows: [
      ['파일명', name],
      ['파일 크기', size],
      ['파일 형식', type],
    ],
  }
}

function formatFileType(type?: string | null, name?: string) {
  if (type?.includes('/')) return type.split('/').pop()?.toLowerCase() || type
  if (type) return type.toLowerCase()
  const extension = name?.split('.').pop()
  return extension ? extension.toLowerCase() : '-'
}

function documentStatusTone(value: string) {
  if (['승인', '검증됨'].includes(value)) return 'is-success'
  if (['반려', '만료', 'OCR 오류'].includes(value)) return 'is-critical'
  if (['대기', '첨부 없음'].includes(value)) return 'is-muted'
  return 'is-warning'
}

function zoomIn() {
  previewScale.value = Math.min(previewScale.value + 0.1, 1.8)
}

function zoomOut() {
  previewScale.value = Math.max(previewScale.value - 0.1, 0.7)
}

function movePdfPage(direction: -1 | 1) {
  const nextIndex = activePdfPageIndex.value + direction
  if (nextIndex < 0 || nextIndex >= pdfPageImages.value.length) return
  activePdfPageIndex.value = nextIndex
}

async function renderPdfPages(url: string) {
  const sequence = ++pdfRenderSequence
  pdfRendering.value = true
  pdfRenderError.value = false
  pdfPageImages.value = []
  activePdfPageIndex.value = 0

  try {
    const pdf = await getDocument({ url }).promise
    const images: string[] = []

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (sequence !== pdfRenderSequence) return

      const page = await pdf.getPage(pageNumber)
      const viewport = page.getViewport({ scale: 1.6 })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')

      if (!context) continue

      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)

      await page.render({ canvasContext: context, viewport } as any).promise
      images.push(canvas.toDataURL('image/png'))
    }

    if (sequence === pdfRenderSequence) {
      pdfPageImages.value = images
      activePdfPageIndex.value = 0
    }
  } catch (error) {
    if (sequence === pdfRenderSequence) {
      console.error('Failed to render PDF preview:', error)
      pdfRenderError.value = true
    }
  } finally {
    if (sequence === pdfRenderSequence) {
      pdfRendering.value = false
    }
  }
}

watchEffect(() => {
  if (activeFileIndex.value >= filteredFileQueue.value.length) {
    activeFileIndex.value = 0
  }

  if (!props.embedded) {
    header.setActions([
      { key: 'documents-export', label: '데이터 내보내기', tone: 'secondary' },
    ])
  }
})

onBeforeUnmount(() => {
  if (!props.embedded) {
    header.clearActions()
  }
})

watch(
  () => props.certificate?.attachmentPublicId,
  async (attachmentPublicId) => {
    attachmentFiles.value = []
    activeFileIndex.value = 0
    if (!attachmentPublicId) return

    attachmentLoading.value = true
    try {
      const attachment = await getAttachment(attachmentPublicId)
      attachmentFiles.value = attachment.files ?? []
    } catch (error) {
      console.error('Failed to load certificate attachment:', error)
    } finally {
      attachmentLoading.value = false
    }
  },
  { immediate: true },
)

watch(
  [activeFileUrl, activeFileIsPdf],
  ([url, isPdf]) => {
    if (url && isPdf) {
      void renderPdfPages(url)
      return
    }

    pdfRenderSequence += 1
    pdfPageImages.value = []
    activePdfPageIndex.value = 0
    pdfRendering.value = false
    pdfRenderError.value = false
  },
  { immediate: true },
)
</script>

<template>
  <section :class="['app-screen documents-page', { 'documents-page--embedded': embedded }]">
    <header class="documents-page__header">
      <div>
        <div v-if="embedded" class="terminal-page__eyebrow">인증서 / 문서 관리</div>
        <h2 class="documents-page__title">{{ pageTitle }}</h2>
        <p v-if="certificate" class="documents-page__subtitle">
          {{ certificate.certificateNo }} · {{ certificateTypeName }}
        </p>
      </div>
      <div class="design-trigger-row">
        <button v-if="embedded" class="page-button page-button--secondary" type="button" @click="emit('back')">목록으로</button>
        <button v-if="!embedded" class="page-button page-button--secondary" type="button">{{ '배치 내보내기' }}</button>
      </div>
    </header>

    <section v-if="!certificate" class="documents-page__filter">
      <label class="documents-page__search">
        <span>⌕</span>
        <input
          v-model="search"
          :placeholder="'문서명, 상태, 메모 검색...'"
          type="text"
        />
      </label>
      <div class="documents-page__tabs">
        <button
          v-for="(tab, index) in content.tabs"
          :key="tab"
          :class="['documents-page__tab', { 'is-active': index === activeTab }]"
          type="button"
          @click="activeTab = index"
        >
          {{ tab }}
        </button>
      </div>
    </section>

    <section class="documents-page__workspace">
      <article class="page-panel documents-page__list-panel">
        <div v-if="!certificate" class="documents-page__directory">
          <span class="page-panel__eyebrow">현재 경로</span>
          <strong>{{ directoryText }}</strong>
        </div>
        <div class="documents-file-list">
          <button
            v-for="(file, index) in filteredFileQueue"
            :key="file.name"
            :class="['documents-file-item', { 'is-active': index === activeFileIndex, 'is-issue': file.issue }]"
            type="button"
            @click="activeFileIndex = index"
          >
            <strong v-if="!certificate">{{ file.name }}</strong>
            <span v-if="!certificate">{{ file.note }}</span>
            <em v-if="!certificate">{{ file.state }}</em>
            <dl v-if="file.infoRows?.length" class="documents-file-item__meta">
              <template v-for="[label, value] in file.infoRows" :key="label">
                <dt>{{ label }}</dt>
                <dd>{{ value }}</dd>
              </template>
            </dl>
            <div v-if="file.infoSections?.length" class="documents-file-item__sections">
              <section v-for="section in file.infoSections" :key="section.title" class="documents-file-item__section">
                <h4>{{ section.title }}</h4>
                <dl class="documents-file-item__meta">
                  <template v-for="[label, value] in section.rows" :key="`${section.title}-${label}`">
                    <dt>{{ label }}</dt>
                    <dd>
                      <span v-if="label === '심사 상태'" :class="['page-status-chip', documentStatusTone(value)]">
                        {{ value }}
                      </span>
                      <template v-else>{{ value }}</template>
                    </dd>
                  </template>
                </dl>
              </section>
            </div>
          </button>
        </div>
      </article>

      <article class="page-panel documents-page__preview-panel">
        <div class="documents-preview">
          <div class="documents-preview__toolbar">
            <button class="page-button page-button--secondary" type="button" @click="zoomIn">+</button>
            <button class="page-button page-button--secondary" type="button" @click="zoomOut">-</button>
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="!canMovePdfPrev"
              @click="movePdfPage(-1)"
            >
              ‹
            </button>
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="!canMovePdfNext"
              @click="movePdfPage(1)"
            >
              ›
            </button>
            <span v-if="pdfPageImages.length" class="documents-preview__page-count">
              {{ activePdfPageNumber }} / {{ pdfPageImages.length }}
            </span>
          </div>
          <div
            v-if="activeFileUrl && activeFileIsPdf"
            class="documents-preview__pdf-pages"
            :style="{ transform: previewTransform }"
          >
            <div v-if="pdfRendering" class="documents-preview__placeholder">PDF 불러오는 중...</div>
            <div v-else-if="pdfRenderError || pdfPageImages.length === 0" class="documents-preview__placeholder">
              PDF 미리보기를 불러오지 못했습니다.
            </div>
            <template v-else-if="activePdfPageImage">
              <img
                :key="`${activeFile?.name}-${activePdfPageIndex}`"
                class="documents-preview__pdf-page"
                :src="activePdfPageImage"
                :alt="`${activeFile?.name || 'PDF'} ${activePdfPageNumber}페이지`"
              />
            </template>
          </div>
          <div v-else class="documents-preview__sheet" :style="{ transform: previewTransform }">
            <span class="page-panel__eyebrow">{{ certificate ? '인증서 첨부 PDF' : content.previewTitle }}</span>
            <div class="documents-preview__hero">
              <h3>{{ certificate ? certificate.certificateNo : content.previewId }}</h3>
              <div class="documents-preview__issued">
                <span>{{ certificate ? '신청 상태' : content.previewDateLabel }}</span>
                <strong>{{ certificate ? certificateFileState : content.previewDate }}</strong>
              </div>
            </div>
            <div class="documents-preview__entities">
              <div>
                <span>{{ certificate ? '협력사' : content.previewSupplierLabel }}</span>
                <strong>{{ certificate?.supplierName || content.previewSupplierValue }}</strong>
              </div>
              <div>
                <span>{{ certificate ? '인증 유형' : content.previewBuyerLabel }}</span>
                <strong>{{ certificate ? certificateTypeName : content.previewBuyerValue }}</strong>
              </div>
            </div>
            <div class="documents-preview__row documents-preview__row--head">
              <span v-for="heading in certificate ? ['항목', '값', '항목', '값'] : content.previewTableHead" :key="heading">{{ heading }}</span>
            </div>
            <div class="documents-preview__rows">
              <div v-for="[label, qty, unit, amount] in previewRows" :key="label" class="documents-preview__row">
                <span>{{ label }}</span>
                <span>{{ qty }}</span>
                <span>{{ unit }}</span>
                <strong>{{ amount }}</strong>
              </div>
            </div>
            <div class="documents-preview__total">
              <span>{{ certificate ? '첨부 파일' : content.totalLabel }}</span>
              <strong>{{ activeFile?.name || content.totalValue }}</strong>
            </div>
            <div class="documents-preview__barcode" />
          </div>
        </div>
      </article>
    </section>

    <section v-if="!certificate" class="documents-page__stats">
      <article v-for="stat in content.stats" :key="stat.label" class="documents-stat">
        <span class="documents-stat__label">{{ stat.label }}</span>
        <strong class="documents-stat__value">{{ stat.value }}</strong>
        <span class="documents-stat__meta">{{ stat.meta }}</span>
      </article>
    </section>

    <article v-if="!certificate" class="documents-recon">
      <div class="documents-recon__head">
        <strong>{{ content.extractionTitle }}</strong>
        <button class="documents-recon__action" type="button">{{ content.extractionChip }}</button>
      </div>
      <div class="documents-recon__table">
        <div class="documents-recon__row documents-recon__row--head">
          <span>데이터 항목</span>
          <span>원본 값</span>
          <span>신뢰도</span>
          <span>상태</span>
        </div>
        <div
          v-for="[field, value, confidence, status] in content.extractionRows"
          :key="field"
          class="documents-recon__row"
        >
          <span>{{ field }}</span>
          <span>{{ value }}</span>
          <span>{{ confidence }}</span>
          <span class="documents-recon__status">
            <i :class="['documents-recon__dot', { 'is-review': status === '검토' }]" />
          </span>
        </div>
      </div>
    </article>
  </section>
</template>
