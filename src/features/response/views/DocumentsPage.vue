<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    title: 'DOCUMENTS.SYS',
    subtitle: '기술 승인 문서와 송장 체인을 한 화면에서 추적합니다.',
    tabs: ['ALL_FILES (124)', 'PENDING_OCR (8)', 'VERIFIED (96)', 'FLAGGED (14)'],
    currentDocument: '현재 문서',
    fileQueue: [
      { name: 'INV-9920-X1.PDF', state: '열람 중', note: '2.4MB / 업로드 14:22', issue: false },
      { name: 'BOL-SHIP-440.PDF', state: '검증됨', note: '1.1MB / 업로드 12:05', issue: false },
      { name: 'CUST_DECLAR_02.PNG', state: 'OCR 오류', note: '4.8MB / 업로드 10:45', issue: true },
      { name: 'PACKING_SLP_ZZ.PDF', state: '대기', note: '0.8MB / 업로드 09:30', issue: false },
    ],
    previewTitle: '상업 송장',
    previewId: '#INV-9920-X1',
    previewDateLabel: '발행일',
    previewDate: '2024-OCT-12',
    previewSupplierLabel: '공급 법인',
    previewSupplierValue: 'GLOBAL LOGISTICS HUB LTD.',
    previewBuyerLabel: '수신 법인',
    previewBuyerValue: 'MONOLITH CORP SCM',
    previewRows: [
      ['REFRIGERATED_UNIT_X', '02', '14,200', '28,400.00'],
      ['SENSOR_ARRAY_V4', '39', '450', '4,500.00'],
    ],
    previewTableHead: ['품목 설명', '수량', '단가', '총계'],
    totalLabel: '총액',
    totalValue: '$32,900.00',
    stats: [
      { label: 'OCR_CONFIDENCE', value: '98.4%', meta: 'NO_RETRY_REQUIRED' },
      { label: 'FIELDS_DETECTED', value: '14 / 14', meta: 'COMPLETE_SCHEMA_MATCH' },
      { label: 'ERP_SYNC_STATUS', value: 'READY', meta: 'QUEUED_FOR_VOUCHER_ENTRY' },
    ],
    extractionTitle: '추출 데이터 검증',
    extractionChip: 'EDIT_MAP',
    extractionRows: [
      ['invoice_id', 'INV-9920-X1', '0.99', 'ready'],
      ['tax_id_vat', 'NL88290123801', '0.97', 'ready'],
      ['currency', 'USD', '1.00', 'ready'],
      ['due_date', '2024-NOV-12', '0.92', 'review'],
    ],
  },
  en: {
    title: 'DOCUMENTS.SYS',
    subtitle: 'Track technical approval documents and invoice chains in a single operator view.',
    tabs: ['ALL_FILES (124)', 'PENDING_OCR (8)', 'VERIFIED (96)', 'FLAGGED (14)'],
    currentDocument: 'Current Document',
    fileQueue: [
      { name: 'INV-9920-X1.PDF', state: 'Viewing', note: '2.4MB / uploaded 14:22', issue: false },
      { name: 'BOL-SHIP-440.PDF', state: 'Verified', note: '1.1MB / uploaded 12:05', issue: false },
      { name: 'CUST_DECLAR_02.PNG', state: 'OCR Error', note: '4.8MB / uploaded 10:45', issue: true },
      { name: 'PACKING_SLP_ZZ.PDF', state: 'Pending', note: '0.8MB / uploaded 09:30', issue: false },
    ],
    previewTitle: 'Commercial Invoice',
    previewId: '#INV-9920-X1',
    previewDateLabel: 'DATE_ISSUED',
    previewDate: '2024-OCT-12',
    previewSupplierLabel: 'SUPPLIER_ENTITY',
    previewSupplierValue: 'GLOBAL LOGISTICS HUB LTD.',
    previewBuyerLabel: 'RECEIVER_ENTITY',
    previewBuyerValue: 'MONOLITH CORP SCM',
    previewRows: [
      ['REFRIGERATED_UNIT_X', '02', '14,200', '28,400.00'],
      ['SENSOR_ARRAY_V4', '39', '450', '4,500.00'],
    ],
    previewTableHead: ['ITEM_DESCRIPTION', 'QTY', 'UNIT', 'TOTAL'],
    totalLabel: 'GRAND_TOTAL_USD',
    totalValue: '$32,900.00',
    stats: [
      { label: 'OCR_CONFIDENCE', value: '98.4%', meta: 'NO_RETRY_REQUIRED' },
      { label: 'FIELDS_DETECTED', value: '14 / 14', meta: 'COMPLETE_SCHEMA_MATCH' },
      { label: 'ERP_SYNC_STATUS', value: 'READY', meta: 'QUEUED_FOR_VOUCHER_ENTRY' },
    ],
    extractionTitle: 'EXTRACTED_DATA_RECONCILIATION',
    extractionChip: 'EDIT_MAP',
    extractionRows: [
      ['invoice_id', 'INV-9920-X1', '0.99', 'ready'],
      ['tax_id_vat', 'NL88290123801', '0.97', 'ready'],
      ['currency', 'USD', '1.00', 'ready'],
      ['due_date', '2024-NOV-12', '0.92', 'review'],
    ],
  },
}

const content = computed(() => CONTENT[preferences.language])
const search = ref('')
const activeTab = ref(0)
const activeFileIndex = ref(0)
const previewScale = ref(1)
const previewRotation = ref(0)

const filteredFileQueue = computed(() => {
  const query = search.value.trim().toLowerCase()
  const activeFilter = content.value.tabs[activeTab.value]

  return content.value.fileQueue.filter((file) => {
    const matchesQuery =
      !query || file.name.toLowerCase().includes(query) || file.state.toLowerCase().includes(query) || file.note.toLowerCase().includes(query)

    if (!matchesQuery) {
      return false
    }

    if (activeFilter.includes('ALL_FILES')) return true
    if (activeFilter.includes('PENDING_OCR')) return file.state === 'OCR 오류' || file.state === 'OCR Error'
    if (activeFilter.includes('VERIFIED')) return file.state === '검증됨' || file.state === 'Verified'
    if (activeFilter.includes('FLAGGED')) return file.issue

    return true
  })
})

const previewTransform = computed(() => `scale(${previewScale.value}) rotate(${previewRotation.value}deg)`)

function zoomIn() {
  previewScale.value = Math.min(previewScale.value + 0.1, 1.8)
}

function zoomOut() {
  previewScale.value = Math.max(previewScale.value - 0.1, 0.7)
}

function rotatePreview() {
  previewRotation.value = (previewRotation.value + 90) % 360
}

watchEffect(() => {
  if (activeFileIndex.value >= filteredFileQueue.value.length) {
    activeFileIndex.value = 0
  }

  header.setActions([
    { key: 'documents-upload', label: preferences.language === 'ko' ? '업로드 파일' : 'UPLOAD FILE', tone: 'primary' },
    { key: 'documents-export', label: preferences.language === 'ko' ? '데이터 내보내기' : 'DATA_EXPORT', tone: 'secondary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen documents-page">
    <header class="documents-page__header">
      <div>
        <h2 class="documents-page__title">{{ content.title }}</h2>
        <p class="documents-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--primary" type="button">{{ preferences.language === 'ko' ? '업로드 파일' : 'UPLOAD_FILE' }}</button>
        <button class="page-button page-button--secondary" type="button">{{ preferences.language === 'ko' ? '배치 내보내기' : 'BATCH_EXPORT' }}</button>
      </div>
    </header>

    <section class="documents-page__filter">
      <label class="documents-page__search">
        <span>⌕</span>
        <input
          v-model="search"
          :placeholder="preferences.language === 'ko' ? '문서명, 상태, 메모 검색...' : 'Search name, state, or note...'"
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
        <div class="documents-page__directory">
          <span class="page-panel__eyebrow">CURRENT_DIRECTORY</span>
          <strong>root / logistics / invoices_2024</strong>
        </div>
        <div class="page-panel__eyebrow">{{ content.currentDocument }}</div>
        <div class="documents-file-list">
          <button
            v-for="(file, index) in filteredFileQueue"
            :key="file.name"
            :class="['documents-file-item', { 'is-active': index === activeFileIndex, 'is-issue': file.issue }]"
            type="button"
            @click="activeFileIndex = index"
          >
            <strong>{{ file.name }}</strong>
            <span>{{ file.note }}</span>
            <em>{{ file.state }}</em>
          </button>
        </div>
      </article>

      <article class="page-panel documents-page__preview-panel">
        <div class="documents-preview">
          <div class="documents-preview__toolbar">
            <button class="page-button page-button--secondary" type="button" @click="zoomIn">+</button>
            <button class="page-button page-button--secondary" type="button" @click="zoomOut">-</button>
            <button class="page-button page-button--secondary" type="button" @click="rotatePreview">↻</button>
          </div>
          <div class="documents-preview__sheet" :style="{ transform: previewTransform }">
            <span class="page-panel__eyebrow">{{ content.previewTitle }}</span>
            <div class="documents-preview__hero">
              <h3>{{ content.previewId }}</h3>
              <div class="documents-preview__issued">
                <span>{{ content.previewDateLabel }}</span>
                <strong>{{ content.previewDate }}</strong>
              </div>
            </div>
            <div class="documents-preview__entities">
              <div>
                <span>{{ content.previewSupplierLabel }}</span>
                <strong>{{ content.previewSupplierValue }}</strong>
              </div>
              <div>
                <span>{{ content.previewBuyerLabel }}</span>
                <strong>{{ content.previewBuyerValue }}</strong>
              </div>
            </div>
            <div class="documents-preview__row documents-preview__row--head">
              <span v-for="heading in content.previewTableHead" :key="heading">{{ heading }}</span>
            </div>
            <div class="documents-preview__rows">
              <div v-for="[label, qty, unit, amount] in content.previewRows" :key="label" class="documents-preview__row">
                <span>{{ label }}</span>
                <span>{{ qty }}</span>
                <span>{{ unit }}</span>
                <strong>{{ amount }}</strong>
              </div>
            </div>
            <div class="documents-preview__total">
              <span>{{ content.totalLabel }}</span>
              <strong>{{ content.totalValue }}</strong>
            </div>
            <div class="documents-preview__barcode" />
          </div>
        </div>
      </article>
    </section>

    <section class="documents-page__stats">
      <article v-for="stat in content.stats" :key="stat.label" class="documents-stat">
        <span class="documents-stat__label">{{ stat.label }}</span>
        <strong class="documents-stat__value">{{ stat.value }}</strong>
        <span class="documents-stat__meta">{{ stat.meta }}</span>
      </article>
    </section>

    <article class="documents-recon">
      <div class="documents-recon__head">
        <strong>{{ content.extractionTitle }}</strong>
        <button class="documents-recon__action" type="button">{{ content.extractionChip }}</button>
      </div>
      <div class="documents-recon__table">
        <div class="documents-recon__row documents-recon__row--head">
          <span>DATA_POINT</span>
          <span>RAW_VALUE</span>
          <span>CONFIDENCE</span>
          <span>STATUS</span>
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
            <i :class="['documents-recon__dot', { 'is-review': status === 'review' }]" />
          </span>
        </div>
      </div>
    </article>
  </section>
</template>
