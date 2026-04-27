<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { BaseModal, useModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { 
  getLots, updateLotStatus, updateLotQuality, createLot, getLotHistories, 
  type LotResponseDto, type CreateLotRequestDto, type LotHistoryResponseDto 
} from '../../../services/lot'
import LotCreateModal from '../components/LotCreateModal.vue'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / LOT',
    title: 'LOT',
    subtitle: 'LOT 이력과 검사 상태를 한 화면에서 추적합니다.',
    metrics: [
      { label: '활성 LOT', value: '142', meta: '추적 중', tone: 'nominal' },
      { label: '품질 보류', value: '3', meta: '검토 대기', tone: 'critical' },
      { label: '오늘 생산', value: '28', meta: '건', tone: 'info' },
      { label: '오늘 검사', value: '41', meta: '건', tone: 'nominal' },
    ],
    tabs: [
      { value: 'ALL', label: '전체' },
      { value: 'CREATED', label: '생성됨' },
      { value: 'IN_PRODUCTION', label: '생산 중' },
      { value: 'COMPLETED', label: '생산 완료' },
      { value: 'SHIPPED', label: '출하 완료' },
      { value: 'DISCARDED', label: '폐기됨' }
    ],
    searchPlaceholder: 'Lot 번호, 품목, 협력사 검색...',
    tableTitle: 'Lot 데이터베이스',
    timelineTitle: '로트 이력 추적',
    qualityTitle: '검수 결과 요약',
    exportLabel: '내보내기',
    createLabel: 'Lot 등록',
    columns: ['Lot 번호', '품목명', '협력사', '수량', '제조일자', '유통기한', '검수 결과', '상태', '상세'],
    detailLabel: '상세보기',
  },
  en: {
    eyebrow: 'Supply Chain Ops / LOT',
    title: 'LOT',
    subtitle: 'Track lot history and inspection status in one operating console.',
    metrics: [
      { label: 'ACTIVE LOTS', value: '142', meta: 'TRACKED', tone: 'nominal' },
      { label: 'QUALITY HOLD', value: '3', meta: 'AWAITING REVIEW', tone: 'critical' },
      { label: 'PRODUCED TODAY', value: '28', meta: 'CASES', tone: 'info' },
      { label: 'INSPECTED TODAY', value: '41', meta: 'CASES', tone: 'nominal' },
    ],
    tabs: [
      { value: 'ALL', label: 'ALL' },
      { value: 'CREATED', label: 'CREATED' },
      { value: 'IN_PRODUCTION', label: 'IN_PRODUCTION' },
      { value: 'COMPLETED', label: 'COMPLETED' },
      { value: 'SHIPPED', label: 'SHIPPED' },
      { value: 'DISCARDED', label: 'DISCARDED' }
    ],
    searchPlaceholder: 'Search lot, item, or supplier...',
    tableTitle: 'Lot Database',
    timelineTitle: 'Lot Trace History',
    qualityTitle: 'Inspection Summary',
    exportLabel: 'EXPORT',
    createLabel: 'ADD LOT',
    columns: ['LOT', 'ITEM', 'SUPPLIER', 'QTY', 'MFG DATE', 'EXPIRY', 'INSPECTION', 'STATUS', 'VIEW'],
    detailLabel: 'VIEW',
  },
}

const qualityRows = computed(() => {
  const total = lots.value.length || 1
  const pass = lots.value.filter(l => l.qualityStatus === 'NORMAL').length
  const hold = lots.value.filter(l => l.qualityStatus === 'HOLD').length
  const fail = lots.value.filter(l => l.qualityStatus === 'DEFECTIVE').length
  
  const isKo = preferences.language === 'ko'
  
  return [
    [isKo ? '합격 (NORMAL)' : 'PASS (NORMAL)', `${pass}${isKo ? '건' : ''}`, `${Math.round(pass/total*100)}%`],
    [isKo ? '보류 (HOLD)' : 'HOLD', `${hold}${isKo ? '건' : ''}`, `${Math.round(hold/total*100)}%`],
    [isKo ? '불합격 (DEFECTIVE)' : 'FAIL (DEFECTIVE)', `${fail}${isKo ? '건' : ''}`, `${Math.round(fail/total*100)}%`]
  ]
})

const content = computed(() => CONTENT[preferences.language])

// API States
const lots = ref<LotResponseDto[]>([])
const lotHistories = ref<LotHistoryResponseDto[]>([])
const search = ref('')
const activeTab = ref<string>('ALL')

// Modals
const { isOpen: traceOpen, payload: selectedLot, open: openTrace, close: closeTrace } = useModal<LotResponseDto>(false)
const isCreateModalOpen = ref(false)

async function fetchLots() {
  try {
    const res = await getLots()
    lots.value = res.content
  } catch (err) {
    console.error('Failed to fetch lots:', err)
  }
}
onMounted(() => {
  fetchLots()
})

const filteredLots = computed(() => {
  const query = search.value.trim().toLowerCase()
  const statusTab = activeTab.value

  return lots.value.filter((lot) => {
    const textMatch = !query || 
      lot.lotNumber.toLowerCase().includes(query) || 
      lot.supplierName?.toLowerCase().includes(query) || 
      lot.itemName?.toLowerCase().includes(query)
    
    if (!textMatch) return false
    if (statusTab === 'ALL') return true
    return lot.lotStatus === statusTab
  })
})

const traceTitle = computed(() => {
  if (!selectedLot.value) return content.value.timelineTitle
  return preferences.language === 'ko' ? `${selectedLot.value.lotNumber} 추적 이력` : `${selectedLot.value.lotNumber} TRACE`
})

// formatDate helper
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${min}`
}

function shortDate(dateStr: string) {
  if (!dateStr) return '-'
  return dateStr.substring(0, 10)
}

function formatLotStatus(status: string) {
  if (preferences.language !== 'ko') return status
  const map: Record<string, string> = {
    CREATED: '생성됨',
    IN_PRODUCTION: '생산 중',
    COMPLETED: '생산 완료',
    SHIPPED: '출하 완료',
    DISCARDED: '폐기됨'
  }
  return map[status] || status
}

function formatQualityStatus(status: string) {
  if (preferences.language !== 'ko') return status
  const map: Record<string, string> = {
    NORMAL: '정상',
    HOLD: '보류',
    DEFECTIVE: '불량'
  }
  return map[status] || status
}

async function handleLotSelect(lot: LotResponseDto) {
  openTrace(lot)
  try {
    lotHistories.value = await getLotHistories(lot.publicId)
  } catch (err) {
    console.error('Failed to load lot histories', err)
    lotHistories.value = []
  }
}

const metricDisplay = computed(() => {
  const base = [...content.value.metrics]
  if (!lots.value || lots.value.length === 0) {
    base[0] = { ...base[0], value: '0' }
    base[1] = { ...base[1], value: '0' }
    base[2] = { ...base[2], value: '0' }
    base[3] = { ...base[3], value: '0' }
    return base
  }
  
  const activeLots = lots.value.filter(l => l.lotStatus !== 'DISCARDED' && l.lotStatus !== 'SHIPPED').length;
  const qualityHoldLots = lots.value.filter(l => l.qualityStatus === 'HOLD').length;
  
  const todayDate = new Date();
  const today = todayDate.getFullYear() + '-' + String(todayDate.getMonth() + 1).padStart(2, '0') + '-' + String(todayDate.getDate()).padStart(2, '0');
  
  const producedToday = lots.value.filter(l => l.manufacturedAt && l.manufacturedAt.startsWith(today)).length;
  // Fallback: using createdAt for inspectedToday since inspectionDate is not in DTO
  const inspectedToday = lots.value.filter(l => l.createdAt && l.createdAt.startsWith(today)).length;

  base[0] = { ...base[0], value: String(activeLots) }
  base[1] = { ...base[1], value: String(qualityHoldLots) }
  base[2] = { ...base[2], value: String(producedToday) }
  base[3] = { ...base[3], value: String(inspectedToday) }
  return base
})

async function handleStatusUpdate(status: string) {
  if (!selectedLot.value) return
  if (!confirm(`Change LOT status to ${status}?`)) return
  
  try {
    const updated = await updateLotStatus(selectedLot.value.publicId, status)
    selectedLot.value = updated // Update the modal payload reference
    alert(`Status updated to ${status}`)
    await fetchLots() // refresh list
    // refresh history
    lotHistories.value = await getLotHistories(selectedLot.value.publicId)
  } catch (e: any) {
    alert(`Failed to update status: ${e.message}`)
  }
}

async function handleQualityUpdate(quality: string) {
  if (!selectedLot.value) return
  
  let reason: string | undefined = undefined
  if (quality === 'DEFECTIVE') {
    const input = prompt('불합격 사유를 입력해주세요:')
    if (input === null) return // canceled
    reason = input || '사유 미입력'
  } else if (quality === 'HOLD') {
    const input = prompt('보류 사유를 입력해주세요:')
    if (input === null) return // canceled
    reason = input || '사유 미입력'
  } else {
    if (!confirm(`품질 상태를 '${formatQualityStatus(quality)}' (으)로 변경하시겠습니까?`)) return
  }

  try {
    const updated = await updateLotQuality(selectedLot.value.publicId, quality, reason)
    selectedLot.value = updated // Update the modal payload reference
    alert(`품질 상태가 ${formatQualityStatus(quality)}(으)로 변경되었습니다.`)
    await fetchLots() // refresh list
    // refresh history
    lotHistories.value = await getLotHistories(selectedLot.value.publicId)
  } catch (e: any) {
    alert(`Failed to update quality: ${e.message}`)
  }
}

// 상태 변경 순서 제어 (역방향 방지)
function isStatusAllowed(targetStatus: string) {
  if (!selectedLot.value) return false
  const order = ['CREATED', 'IN_PRODUCTION', 'COMPLETED', 'SHIPPED']
  const currentIndex = order.indexOf(selectedLot.value.lotStatus)
  const targetIndex = order.indexOf(targetStatus)
  
  // 폐기된 로트는 상태 변경 불가
  if (selectedLot.value.lotStatus === 'DISCARDED') return false
  
  // 타겟 상태가 현재 상태보다 뒤에 있어야 함
  return targetIndex > currentIndex
}

async function handleCreateLotSubmit(data: CreateLotRequestDto) {
  try {
    await createLot(data)
    isCreateModalOpen.value = false
    alert(preferences.language === 'ko' ? '정상적으로 등록되었습니다.' : 'Lot created successfully.')
    await fetchLots()
  } catch (err: any) {
    alert('Error creating lot: ' + err.message)
  }
}

watchEffect(() => {
  if (content.value.tabs.length > 0 && !content.value.tabs.find(t => t.value === activeTab.value)) {
    activeTab.value = content.value.tabs[0].value
  }
  header.setActions([
    { key: 'lots-export', label: content.value.exportLabel, tone: 'secondary' },
    // Remove the create button from header state since we handle it natively to open modal easier,
    // or we can listen to it. In this refactor, we just use the native button in template.
  ])
})

onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page lots-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--primary" type="button" @click="isCreateModalOpen = true">{{ content.createLabel }}</button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="(metric, idx) in metricDisplay" :key="idx" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>SEARCH</span>
            <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
          </label>
          <div class="terminal-page__tabs">
            <button
              v-for="tab in content.tabs"
              :key="tab.value"
              :class="['terminal-page__tab', { 'is-active': activeTab === tab.value }]"
              type="button"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
            </button>
          </div>
        </section>
        <article class="page-panel lots-page__table-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">LOT TABLE</div>
              <h3>{{ content.tableTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredLots.length }}</span>
          </div>
          <div class="page-table terminal-page__table is-nine-cols lots-page__table">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>
            
            <div v-for="lot in filteredLots" :key="lot.publicId" class="page-table__row lots-page__row">
              <span>{{ lot.lotNumber }}</span>
              <span>{{ lot.itemName }}</span>
              <span>{{ lot.supplierName }}</span>
              <span>{{ lot.qty.toLocaleString() }} {{ lot.unit }}</span>
              <span>{{ shortDate(lot.manufacturedAt) }}</span>
              <span>{{ shortDate(lot.expiredAt) }}</span>
              <!-- Quality Status mapping to simple text/color can be enhanced later -->
              <span :class="{'text-critical': lot.qualityStatus === 'DEFECTIVE', 'text-warning': lot.qualityStatus === 'HOLD'}">
                {{ formatQualityStatus(lot.qualityStatus) }}
              </span>
              <span>{{ formatLotStatus(lot.lotStatus) }}</span>
              <span class="lots-page__action-cell">
                <button class="page-button page-button--secondary lots-page__detail-button" type="button" @click="handleLotSelect(lot)">
                  {{ content.detailLabel }}
                </button>
              </span>
            </div>
            
            <div v-if="filteredLots.length === 0" class="page-table__empty">
              No matching lots found.
            </div>
          </div>
        </article>
      </div>
    </section>

    <article class="page-panel lots-page__quality-panel">
      <div class="page-panel__head">
        <div><div class="page-panel__eyebrow">QUALITY</div><h3>{{ content.qualityTitle }}</h3></div>
      </div>
      <div class="page-feed">
        <div v-for="[label, value, width] in qualityRows" :key="label" class="page-feed__item">
          <span class="page-feed__label">{{ label }}</span>
          <strong class="page-feed__text">{{ value }}</strong>
          <div class="terminal-page__bar"><span :style="{ width }" /></div>
        </div>
      </div>
    </article>
  </section>

  <!-- Create LOT Modal -->
  <LotCreateModal 
    :is-open="isCreateModalOpen" 
    :language="preferences.language" 
    @close="isCreateModalOpen = false" 
    @submit="handleCreateLotSubmit" 
  />

  <!-- Trace Timeline Modal -->
  <BaseModal
    v-model="traceOpen"
    :title="traceTitle"
    :description="preferences.language === 'ko' ? '선택한 Lot의 상태 이력을 시간 순서대로 최신순으로 확인합니다.' : 'Review chronological audit history for the selected lot.'"
    size="md"
    @close="closeTrace"
  >
    <div class="page-feed lots-page__trace-feed" style="max-height: 300px; overflow-y: auto;">
      <!-- Timeline Render dynamically -->
      <div v-for="hist in lotHistories" :key="hist.publicId" class="page-feed__item">
        <span class="page-feed__label">{{ formatDate(hist.createdAt) }}</span>
        <strong class="page-feed__text">
          <template v-if="hist.preQualityStatus !== hist.qualityStatus || (!['CREATED','IN_PRODUCTION','COMPLETED','SHIPPED','DISCARDED'].includes(hist.reason) && hist.preLotStatus === hist.lotStatus)">
            <span style="opacity: 0.5; margin-right: 4px;" :class="{'text-critical': hist.qualityStatus === 'DEFECTIVE'}">[{{ formatQualityStatus(hist.qualityStatus) }}]</span> 
            {{ hist.reason === '품질 상태 변경' ? formatQualityStatus(hist.qualityStatus) + ' 처리됨' : hist.reason }}
          </template>
          <template v-else>
            <span style="opacity: 0.5; margin-right: 4px;">[{{ formatLotStatus(hist.lotStatus) }}]</span> 
            {{ hist.reason === '상태 변경' ? formatLotStatus(hist.lotStatus) + ' 처리됨' : hist.reason }}
          </template>
        </strong>
      </div>
      <div v-if="lotHistories.length === 0" class="page-feed__item">
        <span class="page-feed__text" style="opacity: 0.5;">No history available.</span>
      </div>
    </div>
    
    <div v-if="selectedLot" style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--color-surface-container-high); display: flex; flex-direction: column; gap: 16px;">
      <div>
        <div style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 8px;">{{ preferences.language === 'ko' ? '현재 상태' : 'CURRENT STATUS' }}: {{ formatLotStatus(selectedLot.lotStatus) }}</div>
        <div style="display: flex; gap: 8px;">
          <button 
            class="page-button page-button--secondary" 
            type="button" 
            :disabled="!isStatusAllowed('IN_PRODUCTION')"
            :style="!isStatusAllowed('IN_PRODUCTION') ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
            @click="handleStatusUpdate('IN_PRODUCTION')"
          >
            {{ preferences.language === 'ko' ? '생산 중' : 'TO PRODUCT' }}
          </button>
          
          <button 
            class="page-button page-button--secondary" 
            type="button" 
            :disabled="!isStatusAllowed('COMPLETED')"
            :style="!isStatusAllowed('COMPLETED') ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
            @click="handleStatusUpdate('COMPLETED')"
          >
            {{ preferences.language === 'ko' ? '생산 완료' : 'COMPLETED' }}
          </button>
          
          <button 
            class="page-button page-button--secondary" 
            type="button" 
            :disabled="!isStatusAllowed('SHIPPED')"
            :style="!isStatusAllowed('SHIPPED') ? { opacity: 0.5, cursor: 'not-allowed' } : {}"
            @click="handleStatusUpdate('SHIPPED')"
          >
            {{ preferences.language === 'ko' ? '출하 완료' : 'SHIPPED' }}
          </button>
        </div>
      </div>
      <div>
        <div style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 8px;">{{ preferences.language === 'ko' ? '현재 품질' : 'CURRENT QUALITY' }}: {{ formatQualityStatus(selectedLot.qualityStatus) }}</div>
        <div style="display: flex; gap: 8px;">
          <button 
            class="page-button page-button--secondary" 
            :style="[{ borderColor: 'var(--color-nominal)' }, selectedLot.qualityStatus === 'NORMAL' ? { opacity: 0.5, cursor: 'not-allowed' } : {}]" 
            type="button" 
            :disabled="selectedLot.qualityStatus === 'NORMAL'"
            @click="handleQualityUpdate('NORMAL')"
          >
            {{ preferences.language === 'ko' ? '정상 (합격)' : 'PASS (NORMAL)' }}
          </button>
          <button 
            class="page-button page-button--secondary" 
            :style="[{ borderColor: 'var(--color-warning)' }, selectedLot.qualityStatus === 'HOLD' ? { opacity: 0.5, cursor: 'not-allowed' } : {}]" 
            type="button" 
            :disabled="selectedLot.qualityStatus === 'HOLD'"
            @click="handleQualityUpdate('HOLD')"
          >
            {{ preferences.language === 'ko' ? '보류' : 'HOLD' }}
          </button>
          <button 
            class="page-button page-button--secondary" 
            :style="[{ borderColor: 'var(--color-critical)' }, selectedLot.qualityStatus === 'DEFECTIVE' ? { opacity: 0.5, cursor: 'not-allowed' } : {}]" 
            type="button" 
            :disabled="selectedLot.qualityStatus === 'DEFECTIVE'"
            @click="handleQualityUpdate('DEFECTIVE')"
          >
            {{ preferences.language === 'ko' ? '불량 (불합격)' : 'DEFECTIVE' }}
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
.page-table__empty {
  padding: 32px 16px;
  text-align: center;
  color: var(--color-on-surface-variant);
  font-size: 0.875rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--color-surface-container-high);
}
/* LOT 테이블 9컬럼 커스텀 너비 — 글자 안 겹치게 */
.page-table.is-nine-cols .page-table__row {
  grid-template-columns: 1.4fr 1.2fr 1.2fr 0.9fr 1fr 1fr 1fr 1fr 0.8fr;
  min-width: 900px;
}
.page-table {
  overflow-x: auto;
}
</style>
