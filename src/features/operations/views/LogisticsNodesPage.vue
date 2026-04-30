<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { BaseModal, useModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  activateLogisticsNode,
  createLogisticsNode,
  deactivateLogisticsNode,
  getLogisticsNodes,
  updateLogisticsNode,
  type CreateLogisticsNodeRequestDto,
  type LogisticsNodeCapacityStatus,
  type LogisticsNodeResponseDto,
  type LogisticsNodeType,
  type UpdateLogisticsNodeRequestDto,
} from '../../../services/logistics'

type DaumPostcodeData = {
  roadAddress: string
  jibunAddress: string
  zonecode: string
}

type DaumPostcode = {
  open: () => void
}

type DaumPostcodeConstructor = new (options: {
  oncomplete: (data: DaumPostcodeData) => void
}) => DaumPostcode

declare global {
  interface Window {
    daum?: {
      Postcode: DaumPostcodeConstructor
    }
  }
}

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    createModalTitle: '창고 등록',
    createModalDescription: '새 창고의 기본 정보를 입력합니다.',
    formLabels: {
      nodeCode: '창고 코드',
      nodeName: '창고명',
      address: '주소',
      capacityStatus: '창고 상태',
    },
    createSubmitLabel: '저장',
    createCancelLabel: '취소',
    eyebrow: '공급망 운영 / 창고 관리',
    title: '창고 관리',
    searchPlaceholder: '창고 코드, 창고명, 주소 검색',
    tableTitle: '창고 목록',
    empty: '조회된 창고가 없습니다.',
    loading: '창고 목록을 불러오는 중입니다.',
    errorFallback: '창고 목록을 불러오지 못했습니다.',
    columns: ['창고 코드', '창고명', '주소', '창고 상태', '활성 상태', '관리'],
    refreshLabel: '새로고침',
    createLabel: '창고 등록',
    addressSearchLabel: '주소 검색',
    addressSearchLoadingLabel: '검색창 여는 중...',
    active: '활성',
    inactive: '비활성',
    totalLabel: '전체 창고',
    activeLabel: '활성 창고',
    inactiveLabel: '비활성 창고',
    availableLabel: '사용 가능',
    totalSub: '등록 기준',
    activeSub: '출하 선택 가능',
    inactiveSub: '관리 화면 표시',
    availableSub: '용량 상태 기준',
    statusLabels: {
      EMPTY: '비어 있음',
      AVAILABLE: '사용 가능',
      FULL: '가득 참',
    },
  },
  en: {
    createModalTitle: 'Create Warehouse',
    createModalDescription: 'Enter the basic master data for a new warehouse.',
    formLabels: {
      nodeCode: 'Warehouse Code',
      nodeName: 'Warehouse Name',
      address: 'Address',
      capacityStatus: 'Capacity Status',
    },
    createSubmitLabel: 'SAVE',
    createCancelLabel: 'CANCEL',
    eyebrow: 'Supply Chain Ops / Warehouses',
    title: 'Warehouses',
    searchPlaceholder: 'Search code, name, or address',
    tableTitle: 'Warehouse List',
    empty: 'No warehouses found.',
    loading: 'Loading warehouses...',
    errorFallback: 'Failed to load warehouses.',
    columns: ['Code', 'Name', 'Address', 'Capacity', 'Active', 'Action'],
    refreshLabel: 'REFRESH',
    createLabel: 'ADD WAREHOUSE',
    addressSearchLabel: 'SEARCH ADDRESS',
    addressSearchLoadingLabel: 'OPENING...',
    active: 'Active',
    inactive: 'Inactive',
    totalLabel: 'Total Warehouses',
    activeLabel: 'Active',
    inactiveLabel: 'Inactive',
    availableLabel: 'Available',
    totalSub: 'Registered',
    activeSub: 'Selectable for shipment',
    inactiveSub: 'Shown for management',
    availableSub: 'Capacity status',
    statusLabels: {
      EMPTY: 'Empty',
      AVAILABLE: 'Available',
      FULL: 'Full',
    },
  },
} as const


const content = computed(() => CONTENT[preferences.language])

const search = ref('')
const isLoading = ref(false)
const errorMessage = ref('')
const nodes = ref<LogisticsNodeResponseDto[]>([])
const currentPage = ref(0)
const pageSize = ref(10)
const totalElements = ref(0)
const totalPages = ref(0)
const isCreateSubmitting = ref(false)
const createErrorMessage = ref('')
const editingNodeId = ref<string | null>(null)
const isEditMode = computed(() => editingNodeId.value !== null)
const isAddressScriptLoading = ref(false)
const {
  isOpen: createModalOpen,
  open: openCreateModal,
  close: closeCreateModal,
} = useModal(false)

const createForm = ref<{
  nodeName: string
  nodeType: LogisticsNodeType
  address: string
  capacityStatus: LogisticsNodeCapacityStatus
}>({
  nodeName: '',
  nodeType: 'WAREHOUSE',
  address: '',
  capacityStatus: 'EMPTY',
})

const capacityStatusOptions: LogisticsNodeCapacityStatus[] = [
  'EMPTY',
  'AVAILABLE',
  'FULL',
]

function resetCreateForm() {
  createErrorMessage.value = ''
  createForm.value = {
    nodeName: '',
    nodeType: 'WAREHOUSE',
    address: '',
    capacityStatus: 'EMPTY',
  }
}

function handleOpenCreateModal() {
  resetCreateForm()
  openCreateModal()
  editingNodeId.value = null
}

function handleOpenEditModal(node: LogisticsNodeResponseDto) {
  editingNodeId.value = node.publicId
  createErrorMessage.value = ''
  createForm.value = {
    nodeName: node.nodeName,
    nodeType: 'WAREHOUSE',
    address: node.address ?? '',
    capacityStatus: node.capacityStatus,
  }
  openCreateModal()
}

function loadDaumPostcodeScript() {
  if (window.daum?.Postcode) {
    return Promise.resolve()
  }

  const existingScript = document.querySelector<HTMLScriptElement>(
    'script[data-daum-postcode="true"]',
  )

  if (existingScript) {
    return new Promise<void>((resolve, reject) => {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('주소 검색 스크립트를 불러오지 못했습니다.')),
        { once: true },
      )
    })
  }

  const script = document.createElement('script')
  script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
  script.async = true
  script.dataset.daumPostcode = 'true'

  document.head.appendChild(script)

  return new Promise<void>((resolve, reject) => {
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('주소 검색 스크립트를 불러오지 못했습니다.')),
      { once: true },
    )
  })
}

async function openAddressSearch() {
  isAddressScriptLoading.value = true

  try {
    await loadDaumPostcodeScript()

    if (!window.daum?.Postcode) {
      throw new Error('주소 검색을 사용할 수 없습니다.')
    }

    new window.daum.Postcode({
      oncomplete(data) {
        createForm.value.address = data.roadAddress || data.jibunAddress
      },
    }).open()
  } catch (error) {
    const message = error instanceof Error ? error.message : '주소 검색을 열지 못했습니다.'

    alert(message)
  } finally {
    isAddressScriptLoading.value = false
  }
}

async function handleCreateSubmit() {
  const nodeName = createForm.value.nodeName.trim()
  const address = createForm.value.address.trim()

  if (!nodeName || !address) {
    alert('창고명과 주소는 필수입니다. 주소 검색으로 주소를 선택해 주세요.')
    return
  }

  isCreateSubmitting.value = true
  createErrorMessage.value = ''

  try {
    const payload = {
      nodeName,
      nodeType: 'WAREHOUSE' as LogisticsNodeType,
      address,
      capacityStatus: createForm.value.capacityStatus,
    }

    if (editingNodeId.value) {
      await updateLogisticsNode(
        editingNodeId.value,
        payload as UpdateLogisticsNodeRequestDto,
      )
    } else {
      await createLogisticsNode(
        payload as CreateLogisticsNodeRequestDto,
      )
    }
    closeCreateModal()
    resetCreateForm()
    await fetchLogisticsNodes()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : content.value.errorFallback

    createErrorMessage.value = message
    alert(message)
  } finally {
    isCreateSubmitting.value = false
  }
}

const filteredNodes = computed(() => {
  const query = search.value.trim().toLowerCase()

  if (!query) {
    return nodes.value
  }

  return nodes.value.filter((node) => {
    return (
      node.nodeCode.toLowerCase().includes(query) ||
      node.nodeName.toLowerCase().includes(query) ||
      (node.address ?? '').toLowerCase().includes(query)
    )
  })
})
const activeNodeCount = computed(() => nodes.value.filter((node) => node.active).length)
const inactiveNodeCount = computed(() => nodes.value.filter((node) => !node.active).length)
const availableNodeCount = computed(() => nodes.value.filter((node) => node.capacityStatus === 'AVAILABLE').length)

function formatCapacityStatus(status: LogisticsNodeCapacityStatus) {
  return content.value.statusLabels[status] ?? status
}

function formatDate(value: string) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

async function fetchLogisticsNodes() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const response = await getLogisticsNodes({
      page: currentPage.value,
      size: pageSize.value,
    })

    nodes.value = response.content
    totalElements.value = response.totalElements
    totalPages.value = response.totalPages
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : content.value.errorFallback
    nodes.value = []
    totalElements.value = 0
    totalPages.value = 0
  } finally {
    isLoading.value = false
  }
}

async function handleToggleActive(node: LogisticsNodeResponseDto) {
  try {
    if (node.active) {
      await deactivateLogisticsNode(node.publicId)
    } else {
      await activateLogisticsNode(node.publicId)
    }

    await fetchLogisticsNodes()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '상태 변경에 실패했습니다.'

    alert(message)
  }
}

function goToPreviousPage() {
  if (currentPage.value === 0) return

  currentPage.value -= 1
  fetchLogisticsNodes()
}

function goToNextPage() {
  if (currentPage.value >= totalPages.value - 1) return

  currentPage.value += 1
  fetchLogisticsNodes()
}

watchEffect(() => {
  header.setActions([
    { key: 'logistics-refresh', label: content.value.refreshLabel, tone: 'secondary' },
    { key: 'logistics-create', label: content.value.createLabel, tone: 'primary' },
  ])
})

onMounted(fetchLogisticsNodes)
onBeforeUnmount(() => header.clearActions())
</script>

<template>
  <section class="app-screen terminal-page logistics-page">
    <header class="terminal-page__header logistics-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button" @click="fetchLogisticsNodes">
          {{ content.refreshLabel }}
        </button>
        <button class="page-button page-button--primary" type="button" @click="handleOpenCreateModal">
        {{ content.createLabel }}
        </button>

      </div>
    </header>

    <section class="logistics-kpi-row" aria-label="warehouse summary">
      <article class="logistics-kpi-card">
        <div class="logistics-kpi-card__icon logistics-kpi-card__icon--blue">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9l8-4 8 4v10H4z" />
            <path d="M8 19v-7h8v7" />
          </svg>
        </div>
        <div class="logistics-kpi-card__body">
          <span>{{ content.totalLabel }}</span>
          <strong>{{ totalElements }}</strong>
          <small>{{ content.totalSub }}</small>
        </div>
      </article>

      <article class="logistics-kpi-card">
        <div class="logistics-kpi-card__icon logistics-kpi-card__icon--green">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12l4 4L19 6" />
          </svg>
        </div>
        <div class="logistics-kpi-card__body">
          <span>{{ content.activeLabel }}</span>
          <strong>{{ activeNodeCount }}</strong>
          <small>{{ content.activeSub }}</small>
        </div>
      </article>

      <article class="logistics-kpi-card">
        <div class="logistics-kpi-card__icon logistics-kpi-card__icon--amber">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 6v6l4 2" />
            <circle cx="12" cy="12" r="8" />
          </svg>
        </div>
        <div class="logistics-kpi-card__body">
          <span>{{ content.availableLabel }}</span>
          <strong>{{ availableNodeCount }}</strong>
          <small>{{ content.availableSub }}</small>
        </div>
      </article>

      <article class="logistics-kpi-card">
        <div class="logistics-kpi-card__icon logistics-kpi-card__icon--red">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </div>
        <div class="logistics-kpi-card__body">
          <span>{{ content.inactiveLabel }}</span>
          <strong>{{ inactiveNodeCount }}</strong>
          <small>{{ content.inactiveSub }}</small>
        </div>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="logistics-filter-card">
          <label class="logistics-search">
            <span>SEARCH</span>
            <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
          </label>

          <div class="logistics-pagination">
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="currentPage === 0 || isLoading"
              @click="goToPreviousPage"
            >
              이전
            </button>

            <span>
              {{ currentPage + 1 }} / {{ totalPages || 1 }}
            </span>

            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="totalPages === 0 || currentPage >= totalPages - 1 || isLoading"
              @click="goToNextPage"
            >
              다음
            </button>
          </div>
        </section>

        <article class="logistics-card">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">LOGISTICS</div>
              <h3>{{ content.tableTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ filteredNodes.length }}</span>
          </div>

          <div v-if="isLoading" class="page-empty-state">
            {{ content.loading }}
          </div>

          <div v-else-if="errorMessage" class="page-empty-state page-empty-state--error">
            {{ errorMessage }}
          </div>

          <div v-else-if="filteredNodes.length === 0" class="page-empty-state">
            {{ content.empty }}
          </div>

          <div v-else class="page-table terminal-page__table logistics-data-table">
            <div class="page-table__row page-table__row--head logistics-table logistics-table--head">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div
              v-for="node in filteredNodes"
              :key="node.publicId"
              class="page-table__row logistics-table logistics-table--body"
            >
              <span class="logistics-code-cell">
                <strong>{{ node.nodeCode }}</strong>
                <small>{{ formatDate(node.updatedAt) }}</small>
              </span>
              <span class="logistics-name-cell">
                <strong>{{ node.nodeName }}</strong>
              </span>
              <span class="logistics-address-cell">{{ node.address || '-' }}</span>
              <span>
                <span class="logistics-status-pill" :class="`is-${node.capacityStatus.toLowerCase()}`">
                  {{ formatCapacityStatus(node.capacityStatus) }}
                </span>
              </span>
              <span>
                <span class="logistics-active-pill" :class="{ 'is-inactive': !node.active }">
                  {{ node.active ? content.active : content.inactive }}
                </span>
              </span>
              <span class="logistics-row-actions">
                <button
                  class="page-button page-button--secondary"
                  type="button"
                  @click="handleOpenEditModal(node)"
                >
                  수정
                </button>
                <button
                  class="page-button page-button--secondary"
                  type="button"
                  @click="handleToggleActive(node)"
                >
                  {{ node.active ? '비활성화' : '활성화' }}
                </button>
              </span>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
    <BaseModal
    v-model="createModalOpen"
    :title="content.createModalTitle"
    :description="content.createModalDescription"
    size="md"
    @close="closeCreateModal"
  >
    <div class="logistics-modal-form">
      <label class="logistics-modal-field">
        <span>
          {{ content.formLabels.nodeName }}
        </span>
        <input
          v-model="createForm.nodeName"
          type="text"
        />
      </label>

      <label class="logistics-modal-field">
        <span>
          {{ content.formLabels.capacityStatus }}
        </span>
        <div>
          <select
            v-model="createForm.capacityStatus"
          >
            <option
              v-for="option in capacityStatusOptions"
              :key="option"
              :value="option"
            >
              {{ formatCapacityStatus(option) }}
            </option>
          </select>
        </div>
      </label>

      <label class="logistics-modal-field">
        <span>
          {{ content.formLabels.address }}
        </span>
        <div class="logistics-address-row">
          <input
            v-model="createForm.address"
            type="text"
            readonly
            placeholder="주소 검색으로 선택해 주세요"
          />
          <button
            class="page-button page-button--secondary"
            type="button"
            :disabled="isAddressScriptLoading"
            @click="openAddressSearch"
          >
            {{ isAddressScriptLoading ? content.addressSearchLoadingLabel : content.addressSearchLabel }}
          </button>
        </div>
      </label>
    </div>

    <div
      v-if="createErrorMessage"
      class="logistics-error"
    >
      {{ createErrorMessage }}
    </div>

    <template #footer>

      <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
        {{ content.createCancelLabel }}
      </button>
            <button
        class="page-button page-button--primary"
        type="button"
        :disabled="isCreateSubmitting"
        @click="handleCreateSubmit"
      >
        {{ isCreateSubmitting ? '저장 중...' : content.createSubmitLabel }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.logistics-page {
  --log-bg: #f4f6f9;
  --log-card: #ffffff;
  --log-border: #e5e9f0;
  --log-text: #111827;
  --log-muted: #667085;
  --log-faint: #98a2b3;
  --log-blue: #2563eb;
  --log-blue-soft: #eff6ff;
  --log-green: #10b981;
  --log-green-soft: #ecfdf5;
  --log-amber: #f59e0b;
  --log-amber-soft: #fffbeb;
  --log-red: #ef4444;
  --log-red-soft: #fff1f2;
  --log-radius: 12px;
  --log-shadow: 0 1px 3px rgba(16, 24, 40, 0.08), 0 1px 2px rgba(16, 24, 40, 0.04);

  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: 100vh;
  padding: 28px 32px;
  color: var(--log-text);
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.06), transparent 28rem),
    var(--log-bg);
  font-family: Pretendard, "Segoe UI", sans-serif;
}

.logistics-page__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.logistics-page .terminal-page__title {
  margin: 0 0 4px;
  color: var(--log-text);
  font-size: 1.75rem;
  line-height: 1.15;
}

.logistics-page .terminal-page__eyebrow,
.logistics-page .page-panel__eyebrow {
  color: var(--log-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.logistics-page .design-trigger-row,
.logistics-pagination,
.logistics-row-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logistics-row-actions {
  justify-content: flex-end;
}

.logistics-row-actions .page-button {
  min-height: 32px;
  padding: 7px 10px;
  font-size: 0.76rem;
}

.logistics-page .page-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 8px;
  padding: 9px 14px;
  font-size: 0.8rem;
  font-weight: 900;
  line-height: 1;
}

.logistics-page .page-button--primary {
  border-color: #111827;
  background: #111827;
  color: #fff;
}

.logistics-page .page-button--secondary {
  border-color: var(--log-border);
  background: var(--log-card);
  color: var(--log-muted);
}

.logistics-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.logistics-kpi-card {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-height: 92px;
  border: 1px solid var(--log-border);
  border-radius: var(--log-radius);
  padding: 18px;
  background: var(--log-card);
  box-shadow: var(--log-shadow);
}

.logistics-kpi-card__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 10px;
}

.logistics-kpi-card__icon svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.logistics-kpi-card__icon--blue {
  background: var(--log-blue-soft);
  color: var(--log-blue);
}

.logistics-kpi-card__icon--green {
  background: var(--log-green-soft);
  color: var(--log-green);
}

.logistics-kpi-card__icon--amber {
  background: var(--log-amber-soft);
  color: var(--log-amber);
}

.logistics-kpi-card__icon--red {
  background: var(--log-red-soft);
  color: var(--log-red);
}

.logistics-kpi-card__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.logistics-kpi-card__body span {
  color: var(--log-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.logistics-kpi-card__body strong {
  margin-top: 3px;
  color: var(--log-text);
  font-size: 1.35rem;
  line-height: 1.2;
}

.logistics-kpi-card__body small {
  margin-top: 3px;
  color: var(--log-faint);
  font-size: 0.76rem;
  font-weight: 700;
}

.logistics-filter-card,
.logistics-card {
  border: 1px solid var(--log-border);
  border-radius: var(--log-radius);
  padding: 20px;
  background: var(--log-card);
  box-shadow: var(--log-shadow);
}

.logistics-filter-card {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.logistics-search {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 6px;
}

.logistics-search span {
  color: var(--log-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.logistics-search input {
  width: 100%;
  border: 1px solid var(--log-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
  color: var(--log-text);
  font-family: inherit;
}

.logistics-pagination span {
  color: var(--log-muted);
  font-size: 0.875rem;
  font-weight: 800;
}

.logistics-page .page-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.logistics-page .page-panel__head h3 {
  margin: 4px 0 0;
  color: var(--log-text);
  font-size: 1.05rem;
  font-weight: 900;
}

.logistics-page .page-panel__chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  min-height: 24px;
  border-radius: 999px;
  padding: 2px 9px;
  background: #f1f5f9;
  color: var(--log-text);
  font-size: 0.76rem;
  font-weight: 900;
}

.logistics-page .page-table {
  overflow: hidden;
  border: 1px solid var(--log-border);
  border-radius: var(--log-radius);
  background: #f8fafc;
}

.logistics-data-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 0 !important;
  background: transparent !important;
}

.logistics-page .page-table__row {
  border: 1px solid var(--log-border);
  border-radius: 12px;
  background: #fff;
  color: var(--log-muted);
}

.logistics-page .page-table__row:last-child {
  border-bottom: 1px solid var(--log-border);
}

.logistics-page .page-table__row--head {
  border: 0;
  border-radius: 10px;
  background: #f8fafc;
  color: var(--log-faint);
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06em;
}

.logistics-table {
  display: grid;
  grid-template-columns:
    minmax(120px, 0.8fr)
    minmax(160px, 1fr)
    minmax(280px, 1.8fr)
    minmax(100px, 0.7fr)
    minmax(90px, 0.6fr)
    minmax(170px, 1fr);
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
}

.logistics-table--body {
  min-height: 76px;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}

.logistics-table--body:hover {
  border-color: rgba(37, 99, 235, 0.32);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.logistics-code-cell,
.logistics-name-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.logistics-code-cell strong {
  color: var(--log-text);
  font-size: 0.9rem;
  font-weight: 900;
}

.logistics-code-cell small {
  color: var(--log-faint);
  font-size: 0.72rem;
  font-weight: 800;
}

.logistics-name-cell strong {
  overflow: hidden;
  color: var(--log-text);
  font-size: 0.92rem;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logistics-address-cell {
  color: var(--log-muted);
  font-size: 0.84rem;
  line-height: 1.45;
}

.logistics-status-pill,
.logistics-active-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--log-border);
  border-radius: 999px;
  padding: 4px 8px;
  background: var(--log-green-soft);
  color: #047857;
  font-size: 0.75rem;
  font-weight: 900;
}

.logistics-status-pill.is-empty {
  background: var(--log-blue-soft);
  color: var(--log-blue);
}

.logistics-status-pill.is-full,
.logistics-active-pill.is-inactive {
  background: var(--log-red-soft);
  color: var(--log-red);
}

.logistics-modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.logistics-modal-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logistics-modal-field > span {
  color: var(--log-muted, #667085);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.logistics-modal-field input,
.logistics-modal-field select {
  width: 100%;
  border: 1px solid var(--log-border, #e5e9f0);
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
  color: var(--log-text, #111827);
  font-family: inherit;
}

.logistics-address-row {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.logistics-error {
  margin-top: 14px;
  color: var(--color-critical);
  font-size: 0.875rem;
  font-weight: 800;
}

@media (max-width: 960px) {
  .logistics-kpi-row {
    grid-template-columns: 1fr;
  }

  .logistics-filter-card {
    align-items: stretch;
    flex-direction: column;
  }

  .logistics-address-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
