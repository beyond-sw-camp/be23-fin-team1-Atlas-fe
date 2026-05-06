<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

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

    if (activeFilter.includes('전체 파일')) return true
    if (activeFilter.includes('OCR 대기')) return file.state === 'OCR 오류'
    if (activeFilter.includes('검증 완료')) return file.state === '검증됨'
    if (activeFilter.includes('주의 필요')) return file.issue

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
    { key: 'documents-upload', label: '업로드 파일', tone: 'primary' },
    { key: 'documents-export', label: '데이터 내보내기', tone: 'secondary' },
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
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--primary" type="button">{{ '업로드 파일' }}</button>
        <button class="page-button page-button--secondary" type="button">{{ '배치 내보내기' }}</button>
      </div>
    </header>

    <section class="documents-page__filter">
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
        <div class="documents-page__directory">
          <span class="page-panel__eyebrow">현재 경로</span>
          <strong>루트 / 물류 / 2024년 송장</strong>
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
