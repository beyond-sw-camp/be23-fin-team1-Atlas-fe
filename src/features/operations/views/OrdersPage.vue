<script setup lang="ts">
import { computed, ref, onBeforeUnmount, watchEffect } from 'vue'
import { BaseModal, useModal } from '../../shared'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasHeaderStore } from '../../../stores/header'
import { createReturn, CreateReturnRequestDto } from '../../../services/return'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '공급망 운영 / 발주 관리',
    title: '발주 관리',
    subtitle: '발주 승인, ETA, 우선순위와 공급사별 운영 상태를 단일 화면에서 관리합니다.',
    metrics: [
      { label: '총 발주', value: '312', meta: '전체 상태', tone: 'nominal' },
      { label: '승인 대기', value: '28', meta: '서명 필요', tone: 'warning' },
      { label: 'ETA 초과', value: '14', meta: '즉시 대응', tone: 'critical' },
      { label: '총 금액', value: '₩84억', meta: '연 누적', tone: 'info' },
    ],
    tabs: ['전체', '승인 대기', '운송 중', '생산 중', '완료'],
    searchPlaceholder: '발주 ID, 품목, 협력사 검색...',
    titleLabel: '발주 테이블',
    exportLabel: '내보내기',
    filterLabel: '필터',
    createLabel: '신규 발주',
    actionLabel: '반품',
    columns: ['발주 ID', '품목', '협력사', '수량', '총액', '발주일', 'ETA', '우선순위', '상태', '작업'],
    queueTitle: '승인 대기 큐',
    categoryTitle: '카테고리별 금액',
    supplierTitle: '상위 협력사',
  },
  en: {
    eyebrow: 'Supply Chain Ops / Orders',
    title: 'Purchase Orders',
    subtitle: 'Manage approvals, ETA changes, and supplier priority in one operating view.',
    metrics: [
      { label: 'TOTAL ORDERS', value: '312', meta: 'ALL STATES', tone: 'nominal' },
      { label: 'PENDING', value: '28', meta: 'SIGN-OFF REQUIRED', tone: 'warning' },
      { label: 'OVERDUE', value: '14', meta: 'ACTION REQUIRED', tone: 'critical' },
      { label: 'TOTAL VALUE', value: '$8.4M', meta: 'YTD OPEN ORDERS', tone: 'info' },
    ],
    tabs: ['ALL', 'PENDING', 'IN TRANSIT', 'IN PRODUCTION', 'DELIVERED'],
    searchPlaceholder: 'Search order, item, or supplier...',
    titleLabel: 'Order Table',
    exportLabel: 'EXPORT',
    filterLabel: 'FILTER',
    createLabel: 'NEW ORDER',
    actionLabel: 'RMA',
    columns: ['ORDER ID', 'ITEM', 'SUPPLIER', 'QTY', 'TOTAL', 'PO DATE', 'ETA', 'PRIORITY', 'STATUS', 'ACTION'],
    queueTitle: 'Approval Queue',
    categoryTitle: 'Value by Category',
    supplierTitle: 'Top Suppliers',
  },
}

const ROWS = {
  ko: [
    ['ORD-2024-8841', '티타늄 합금 시트', '헬릭스 GmbH', '120t', '₩2.18억', '03-14', '+72h', 'P1', '지연'],
    ['ORD-2024-8902', '반도체 웨이퍼', '실링크', '6,200', '₩12.4억', '03-20', '04-12', 'P1', '위험'],
    ['ORD-2024-8921', '광섬유 케이블', '루미넷', '1,200m', '₩5,760만', '03-25', '04-11', 'P2', '정상'],
    ['ORD-2024-9025', '서보 컨트롤러', '보쉬 렉스로스', '320', '₩1.32억', '04-02', '04-24', 'P2', '승인 대기'],
    ['ORD-2024-9031', '구리 전선 6AWG', '프리즈미안', '12,000m', '₩9,900만', '04-03', '04-28', 'P3', '승인 대기'],
    ['ORD-2024-9044', '에폭시 수지', '헌츠맨', '4,200L', '₩1.6억', '04-04', '04-30', 'P3', '생산 중'],
  ],
  en: [
    ['ORD-2024-8841', 'Titanium Alloy Sheets', 'HELIX GMBH', '120t', '$218,400', '03-14', '+72h', 'P1', 'DELAYED'],
    ['ORD-2024-8902', 'Semiconductor Wafers', 'SILINK', '6,200', '$1,240,000', '03-20', '04-12', 'P1', 'AT RISK'],
    ['ORD-2024-8921', 'Optical Fiber Cable', 'LUMINET', '1,200m', '$57,600', '03-25', '04-11', 'P2', 'ON TIME'],
    ['ORD-2024-9025', 'Servo Controllers', 'BOSCH REXROTH', '320', '$132,000', '04-02', '04-24', 'P2', 'PENDING'],
    ['ORD-2024-9031', 'Copper Wire 6AWG', 'PRYSMIAN', '12,000m', '$99,000', '04-03', '04-28', 'P3', 'PENDING'],
    ['ORD-2024-9044', 'Epoxy Resin', 'HUNTSMAN', '4,200L', '$160,000', '04-04', '04-30', 'P3', 'IN PRODUCTION'],
  ],
}

const QUEUE = {
  ko: [
    ['ORD-2024-9025', '서보 컨트롤러', '₩1.32억'],
    ['ORD-2024-9031', '구리 전선 6AWG', '₩9,900만'],
    ['ORD-2024-9044', '에폭시 수지', '₩1.6억'],
  ],
  en: [
    ['ORD-2024-9025', 'Servo Controllers', '$132,000'],
    ['ORD-2024-9031', 'Copper Wire 6AWG', '$99,000'],
    ['ORD-2024-9044', 'Epoxy Resin', '$160,000'],
  ],
}

const CATEGORIES = {
  ko: [
    ['전자부품', '₩31억', '100%'],
    ['원자재', '₩24억', '78%'],
    ['기계부품', '₩18억', '58%'],
    ['화학품', '₩7억', '23%'],
  ],
  en: [
    ['Electronics', '$3.1M', '100%'],
    ['Raw Materials', '$2.4M', '78%'],
    ['Components', '$1.8M', '58%'],
    ['Chemicals', '$0.7M', '23%'],
  ],
}

const SUPPLIERS = {
  ko: [
    ['폭스콘', '18 orders'],
    ['실링크', '14 orders'],
    ['토레이', '12 orders'],
    ['헬릭스', '11 orders'],
  ],
  en: [
    ['Foxconn', '18 orders'],
    ['SiLink', '14 orders'],
    ['Toray', '12 orders'],
    ['Helix', '11 orders'],
  ],
}

const preferencesStore = useAtlasPreferencesStore()
const content = computed(() => CONTENT[preferencesStore.language])
const rows = computed(() => ROWS[preferencesStore.language])
const queueRows = computed(() => QUEUE[preferencesStore.language])
const categories = computed(() => CATEGORIES[preferencesStore.language])
const suppliers = computed(() => SUPPLIERS[preferencesStore.language])
const search = ref('')
const activeTab = ref<string>('ALL')

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()
  const tab = activeTab.value
  return rows.value.filter((row) => {
    const matchesQuery = !query || row.some((cell) => cell.toLowerCase().includes(query))
    if (!matchesQuery) return false
    if (tab === '전체' || tab === 'ALL') return true
    if (tab === '승인 대기' || tab === 'PENDING') return row[8] === '승인 대기' || row[8] === 'PENDING'
    if (tab === '운송 중' || tab === 'IN TRANSIT') return row[8] === '운송 중' || row[8] === 'IN TRANSIT'
    if (tab === '생산 중' || tab === 'IN PRODUCTION') return row[8] === '생산 중' || row[8] === 'IN PRODUCTION'
    return row[8] === '정상' || row[8] === 'ON TIME'
  })
})

// Return Request Modal State
const { isOpen: returnModalOpen, payload: selectedOrder, open: openReturnModal, close: closeReturnModal } = useModal<string[]>(false)
const returnForm = ref({
  returnQty: 0,
  returnType: 'DEFECTIVE',
  returnReason: ''
})
const returnAttachedFiles = ref<File[]>([])
const returnError = ref('')

function handleFileAttach(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    returnAttachedFiles.value = Array.from(target.files)
  }
}

function handleReturnSubmit() {
  if (!selectedOrder.value) return
  
  // Extract max quantity from order data (e.g., '120t' -> 120)
  const maxQtyStr = selectedOrder.value[3].replace(/[^0-9.]/g, '')
  const maxQty = parseFloat(maxQtyStr)
  
  if (returnForm.value.returnQty <= 0) {
    returnError.value = '반품 수량은 0보다 커야 합니다.'
    return
  }
  
  if (returnForm.value.returnQty > maxQty) {
    returnError.value = `반품 수량은 원본 발주량(${maxQty})을 초과할 수 없습니다.`
    return
  }

  returnError.value = ''
  
  // Call API
  const dto: CreateReturnRequestDto = {
    returnNumber: `RMA-${Date.now()}`,
    sourceShipmentPublicId: `pub-${selectedOrder.value[0]}`,
    requestOrganizationPublicId: 'my-org',
    targetOrganizationPublicId: 'supplier-org',
    returnType: returnForm.value.returnType as any,
    returnReason: returnForm.value.returnReason,
    items: [
      {
        itemPublicId: 'item-pub-001',
        returnQty: returnForm.value.returnQty,
        unit: selectedOrder.value[3].replace(/[0-9.]/g, '') || 'ea'
      }
    ]
  }

  createReturn(dto)
    .then(() => {
      closeReturnModal()
      // In a real app, refresh data here
      alert('Return requested successfully.')
    })
    .catch((err) => {
      returnError.value = err.message || '반품 요청 중 오류가 발생했습니다.'
    })
}

function handleAction(row: string[]) {
  returnForm.value = { returnQty: 0, returnType: 'DEFECTIVE', returnReason: '' }
  returnAttachedFiles.value = []
  returnError.value = ''
  openReturnModal(row)
}

const header = useAtlasHeaderStore()
watchEffect(() => {
  header.setActions([
    { key: 'orders-export', label: content.value.exportLabel, tone: 'secondary' },
    { key: 'orders-create', label: content.value.createLabel, tone: 'primary' },
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
        <p class="terminal-page__subtitle">{{ content.subtitle }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
        <button class="page-button page-button--secondary" type="button">{{ content.filterLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.createLabel }}</button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" :class="['page-metric', `is-${metric.tone}`]">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>⌕</span>
            <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
          </label>
          <div class="terminal-page__tabs">
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
            <div><div class="page-panel__eyebrow">OPERATIONS</div><h3>{{ content.titleLabel }}</h3></div>
            <span class="page-panel__chip">{{ filteredRows.length }}</span>
          </div>
          <div class="page-table terminal-page__table is-ten-cols">
            <div class="page-table__row page-table__row--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>
            <div v-for="row in filteredRows" :key="row[0]" class="page-table__row">
              <span v-for="cell in row" :key="cell">{{ cell }}</span>
              <span class="action-cell">
                <button class="page-button page-button--secondary" type="button" @click="handleAction(row)">
                  {{ content.actionLabel }}
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>

      <aside class="terminal-page__aside">
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">APPROVAL</div><h3>{{ content.queueTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[id, name, value] in queueRows" :key="id" class="page-feed__item">
              <span class="page-feed__label">{{ id }}</span>
              <strong class="page-feed__text">{{ name }}</strong>
              <span>{{ value }}</span>
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">VALUE</div><h3>{{ content.categoryTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[label, value, width] in categories" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ label }}</span>
              <strong class="page-feed__text">{{ value }}</strong>
              <div class="terminal-page__bar"><span :style="{ width }" /></div>
            </div>
          </div>
        </article>
        <article class="page-panel">
          <div class="page-panel__head"><div><div class="page-panel__eyebrow">SUPPLIERS</div><h3>{{ content.supplierTitle }}</h3></div></div>
          <div class="page-feed">
            <div v-for="[name, count] in suppliers" :key="name" class="page-feed__item">
              <span class="page-feed__label">{{ name }}</span>
              <strong class="page-feed__text">{{ count }}</strong>
            </div>
          </div>
        </article>
      </aside>
    </section>
  </section>

  <BaseModal
    v-model="returnModalOpen"
    :title="preferences.language === 'ko' ? '반품 요청 (RMA)' : 'Return Request (RMA)'"
    :description="selectedOrder ? `${selectedOrder[0]} - ${selectedOrder[1]}` : ''"
    size="md"
    @close="closeReturnModal"
  >
    <div v-if="selectedOrder" class="page-form" style="display: flex; flex-direction: column; gap: 16px;">
      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 4px;">반품 수량 (최대 {{ selectedOrder[3] }})</span>
        <input v-model.number="returnForm.returnQty" type="number" min="0" style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;" />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 4px;">반품 사유 구분</span>
        <div style="width: 100%; border-bottom: 2px solid var(--color-surface-container-high);">
          <select v-model="returnForm.returnType" style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none;">
            <option value="DEFECTIVE" style="background-color: var(--color-surface); color: var(--color-on-surface);">불량 (DEFECTIVE)</option>
            <option value="DAMAGE" style="background-color: var(--color-surface); color: var(--color-on-surface);">파손 (DAMAGE)</option>
            <option value="MISDELIVERY" style="background-color: var(--color-surface); color: var(--color-on-surface);">오배송 (MISDELIVERY)</option>
            <option value="SIMPLE_RETURN" style="background-color: var(--color-surface); color: var(--color-on-surface);">단순 반품 (SIMPLE_RETURN)</option>
          </select>
        </div>
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 4px;">세부 사유</span>
        <input v-model="returnForm.returnReason" type="text" placeholder="사유를 입력하세요..." style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;" />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; color: var(--color-on-surface); opacity: 0.7; margin-bottom: 4px;">첨부 파일 (이미지 / 동영상)</span>
        <input type="file" multiple accept="image/*,video/*" @change="handleFileAttach" style="font-family: inherit; font-size: 0.875rem; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;" />
      </label>

      <div v-if="returnError" style="color: var(--color-error); font-size: 0.875rem; margin-top: 8px;">
        {{ returnError }}
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
        <button class="page-button page-button--secondary" type="button" @click="closeReturnModal">취소</button>
        <button class="page-button page-button--primary" type="button" @click="handleReturnSubmit">승인 요청</button>
      </div>
    </div>
  </BaseModal>
</template>
