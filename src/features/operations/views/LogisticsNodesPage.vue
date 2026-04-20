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
  type LogisticsNodeResponseDto,
  type LogisticsNodeType,
  type UpdateLogisticsNodeRequestDto,
} from '../../../services/logistics'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    createModalTitle: '물류거점 등록',
    createModalDescription: '새 물류거점의 기본 정보를 입력합니다.',
    formLabels: {
      nodeCode: '거점 코드',
      nodeName: '거점명',
      nodeType: '거점 유형',
      address: '주소',
      latitude: '위도',
      longitude: '경도',
    },
    createSubmitLabel: '저장',
    createCancelLabel: '취소',
    eyebrow: '공급망 운영 / 물류거점 관리',
    title: '물류거점 관리',
    subtitle: '물류거점 목록과 활성 상태를 조회하고 운영 기준 데이터를 관리합니다.',
    searchPlaceholder: '거점 코드, 거점명, 주소 검색',
    tableTitle: '물류거점 목록',
    empty: '조회된 물류거점이 없습니다.',
    loading: '물류거점 목록을 불러오는 중입니다.',
    errorFallback: '물류거점 목록을 불러오지 못했습니다.',
    columns: ['거점 코드', '거점명', '유형', '주소', '활성 상태', '수정일', '관리'],
    refreshLabel: '새로고침',
    createLabel: '거점 등록',
    active: '활성',
    inactive: '비활성',
  },
  en: {
    createModalTitle: 'Create Logistics Node',
    createModalDescription: 'Enter the basic master data for a new logistics node.',
    formLabels: {
      nodeCode: 'Node Code',
      nodeName: 'Node Name',
      nodeType: 'Node Type',
      address: 'Address',
      latitude: 'Latitude',
      longitude: 'Longitude',
    },
    createSubmitLabel: 'SAVE',
    createCancelLabel: 'CANCEL',
    eyebrow: 'Supply Chain Ops / Logistics Nodes',
    title: 'Logistics Nodes',
    subtitle: 'Review node master data and active status for logistics operations.',
    searchPlaceholder: 'Search code, name, or address',
    tableTitle: 'Logistics Node List',
    empty: 'No logistics nodes found.',
    loading: 'Loading logistics nodes...',
    errorFallback: 'Failed to load logistics nodes.',
    columns: ['Code', 'Name', 'Type', 'Address', 'Active', 'Updated At', 'Action'],
    refreshLabel: 'REFRESH',
    createLabel: 'ADD NODE',
    active: 'Active',
    inactive: 'Inactive',
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
const {
  isOpen: createModalOpen,
  open: openCreateModal,
  close: closeCreateModal,
} = useModal(false)

const createForm = ref<{
  nodeCode: string
  nodeName: string
  nodeType: LogisticsNodeType
  address: string
  latitude: string
  longitude: string
}>({
  nodeCode: '',
  nodeName: '',
  nodeType: 'WAREHOUSE',
  address: '',
  latitude: '',
  longitude: '',
})

const nodeTypeOptions: LogisticsNodeType[] = [
  'FACTORY',
  'WAREHOUSE',
  'HUB',
  'LOGISTICS_CENTER',
  'PORT',
]

function resetCreateForm() {
  createErrorMessage.value = ''
  createForm.value = {
    nodeCode: '',
    nodeName: '',
    nodeType: 'WAREHOUSE',
    address: '',
    latitude: '',
    longitude: '',
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
    nodeCode: node.nodeCode,
    nodeName: node.nodeName,
    nodeType: node.nodeType,
    address: node.address ?? '',
    latitude: node.latitude != null ? String(node.latitude) : '',
    longitude: node.longitude != null ? String(node.longitude) : '',
  }
  openCreateModal()
}

function parseCoordinate(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)

  if (Number.isNaN(parsed)) {
    throw new Error('위도/경도는 숫자로 입력해야 합니다.')
  }

  return parsed
}

async function handleCreateSubmit() {
  const nodeCode = createForm.value.nodeCode.trim()
  const nodeName = createForm.value.nodeName.trim()

  if (!nodeCode || !nodeName) {
    alert('거점 코드와 거점명은 필수입니다.')
    return
  }

  isCreateSubmitting.value = true
  createErrorMessage.value = ''

  try {
        const payload = {
      nodeCode,
      nodeName,
      nodeType: createForm.value.nodeType,
      address: createForm.value.address.trim() || undefined,
      latitude: parseCoordinate(createForm.value.latitude),
      longitude: parseCoordinate(createForm.value.longitude),
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
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">{{ content.subtitle }}</p>
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

    <section class="page-metrics terminal-page__metrics">
      <article class="page-metric is-nominal">
        <span class="page-metric__label">TOTAL</span>
        <strong class="page-metric__value">{{ totalElements }}</strong>
        <span class="page-metric__meta">nodes</span>
      </article>
      <article class="page-metric is-info">
        <span class="page-metric__label">PAGE</span>
        <strong class="page-metric__value">{{ currentPage + 1 }}</strong>
        <span class="page-metric__meta">of {{ totalPages || 1 }}</span>
      </article>
      <article class="page-metric is-ok">
        <span class="page-metric__label">VISIBLE</span>
        <strong class="page-metric__value">{{ filteredNodes.length }}</strong>
        <span class="page-metric__meta">filtered rows</span>
      </article>
    </section>

    <section class="terminal-page__content">
      <div class="terminal-page__main">
        <section class="terminal-page__filter">
          <label class="terminal-page__search">
            <span>SEARCH</span>
            <input v-model="search" :placeholder="content.searchPlaceholder" type="text" />
          </label>

          <div style="display: flex; gap: 8px; align-items: center;">
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="currentPage === 0 || isLoading"
              @click="goToPreviousPage"
            >
              이전
            </button>

            <span style="font-size: 0.875rem; opacity: 0.8;">
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

        <article class="page-panel">
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

          <div v-else class="page-table terminal-page__table">
            <div class="page-table__row page-table__row--head logistics-table">
              <span v-for="column in content.columns" :key="column">{{ column }}</span>
            </div>

            <div
              v-for="node in filteredNodes"
              :key="node.publicId"
              class="page-table__row logistics-table"
            >
              <span>{{ node.nodeCode }}</span>
              <span>{{ node.nodeName }}</span>
              <span>{{ node.nodeType }}</span>
              <span>{{ node.address || '-' }}</span>
              <span>
                {{ node.active ? content.active : content.inactive }}
              </span>
              <span>{{ formatDate(node.updatedAt) }}</span>
                <span style="display: flex; gap: 8px;">
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
    <div class="page-form" style="display: flex; flex-direction: column; gap: 16px;">
      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.formLabels.nodeCode }}
        </span>
        <input
          v-model="createForm.nodeCode"
          type="text"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.formLabels.nodeName }}
        </span>
        <input
          v-model="createForm.nodeName"
          type="text"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.formLabels.nodeType }}
        </span>
        <div style="width: 100%; border-bottom: 2px solid var(--color-surface-container-high);">
          <select
            v-model="createForm.nodeType"
            style="font-family: inherit; font-size: inherit; width: 100%; appearance: auto; background: transparent; color: var(--color-on-surface); padding: 8px 0; border: none; outline: none;"
          >
            <option
              v-for="option in nodeTypeOptions"
              :key="option"
              :value="option"
              style="background-color: var(--color-surface); color: var(--color-on-surface);"
            >
              {{ option }}
            </option>
          </select>
        </div>
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.formLabels.address }}
        </span>
        <input
          v-model="createForm.address"
          type="text"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.formLabels.latitude }}
        </span>
        <input
          v-model="createForm.latitude"
          type="text"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
      </label>

      <label style="display: flex; flex-direction: column; align-items: flex-start; border-bottom: none;">
        <span style="font-size: 0.75rem; opacity: 0.7; margin-bottom: 4px;">
          {{ content.formLabels.longitude }}
        </span>
        <input
          v-model="createForm.longitude"
          type="text"
          style="font-family: inherit; font-size: inherit; width: 100%; background: transparent; color: var(--color-on-surface); border: none; outline: none; border-bottom: 2px solid var(--color-surface-container-high); padding: 8px 0;"
        />
        </label>
    </div>

    <div
      v-if="createErrorMessage"
      style="color: var(--color-critical); font-size: 0.875rem;"
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
