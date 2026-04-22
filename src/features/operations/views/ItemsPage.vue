<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { BaseModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useActorScope } from '../../../composables/useActorScope'
import {
  createItem,
  getItem,
  getItemCategories,
  getItems,
  type CreateItemRequestDto,
  type GetItemsParams,
  type ItemCategoryResponseDto,
  type ItemResponseDto,
  type ItemStatus,
  type ItemUnit,
} from '../../../services/item'
import {
  createSupplierItemCapability,
  getSupplierItemCapabilities,
  type CreateSupplierItemCapabilityRequestDto,
  type SupplierItemCapabilityResponseDto,
  type SupplierItemQualityGrade,
} from '../../../services/supplier'

type ItemTabKey = 'ALL' | 'ACTIVE' | 'DEACTIVE' | 'CAPABILITY'

type ItemTableRow = {
  publicId: string
  itemCode: string
  itemName: string
  categoryName: string
  supplierName: string
  status: ItemStatus
  capability: SupplierItemCapabilityResponseDto | null
  raw: ItemResponseDto
  cells: string[]
}

type CreateItemFormState = CreateItemRequestDto & {
  leadTimeDays: number | null
  monthlyCapacity: number | null
  availableQty: number | null
  moq: number | null
  qualityGrade: SupplierItemQualityGrade | ''
}

type CategoryPathOption = {
  publicId: string
  label: string
  level: number
  isLeaf: boolean
}

const itemCategoryPlaceholder = computed(() =>
  preferences.language === 'ko' ? '카테고리 선택' : 'Select category',
)

const itemCategoryHint = computed(() =>
  preferences.language === 'ko'
    ? '품목 등록은 최하위 카테고리만 선택할 수 있습니다. 예: 식품 > 냉동 식품'
    : 'Only leaf categories can be selected for item creation.',
)

const ITEM_UNIT_OPTIONS: ItemUnit[] = [
  'EA', 'SET', 'PAIR',
  'MG', 'G', 'KG', 'TON',
  'ML', 'L',
  'MM', 'CM', 'M', 'KM',
  'MM2', 'CM2', 'M2',
  'MM3', 'CM3', 'M3',
  'BOX', 'PACK', 'BAG', 'BUNDLE', 'ROLL', 'SHEET', 'CARTON', 'CASE', 'PALLET',
  'BOTTLE', 'CAN', 'JAR', 'TUBE', 'TRAY', 'CUP', 'POUCH',
]

const QUALITY_GRADE_OPTIONS: SupplierItemQualityGrade[] = [
  'AAA',
  'AA_PLUS',
  'AA',
  'A_PLUS',
  'A',
  'B',
  'C',
]

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()
const actor = useActorScope()

const copy = computed(() =>
  preferences.language === 'ko'
    ? {
        eyebrow: '공급망 운영 / 품목',
        title: '품목 관리',
        subtitle: '품목 마스터와 협력사 품목 공급 역량을 함께 조회하고 등록합니다.',
        exportLabel: '내보내기',
        createLabel: '품목 등록',
        tableTitle: '품목 목록',
        searchPlaceholder: '품목명, 품목코드, 카테고리, 협력사 검색',
        columns: [
          '품목코드',
          '품목명',
          '카테고리',
          '단위',
          '현재 가용 수량',
          '최소 발주 수량',
          '품질 등급',
          '리드타임',
          '협력사',
          '상태',
        ],
        tabs: {
          all: '전체',
          active: '활성',
          deactive: '비활성',
          capability: '공급 역량 연계',
        },
        metrics: {
          total: '총 품목',
          shortage: '재고 부족',
          reorder: '재발주 대기',
          inbound: '금일 입고',
          totalMeta: '등록 SKU',
          shortageMeta: '임계치 이하',
          reorderMeta: '발주 필요',
          inboundMeta: '단위',
        },
        detailTitle: '품목 상세',
        createTitle: '품목 등록',
        createDescription: '품목 마스터 저장 후 협력사 품목 공급 역량까지 바로 연결합니다.',
        retryNotice:
          '품목 마스터는 이미 등록되었습니다. 아래 공급 역량 값만 확인 후 다시 등록하면 공급 역량만 재시도합니다.',
        createMasterSection: '품목 기본 정보',
        createCapabilitySection: '협력사 품목 공급 역량',
        cancelLabel: '취소',
        submitLabel: '등록',
        retrySubmitLabel: '공급 역량 재시도',
        emptyCapability: '연결된 공급 역량 정보가 없습니다.',
      }
    : {
        eyebrow: 'Supply Chain Ops / Items',
        title: 'Items',
        subtitle: 'Browse and create item master data with supplier capability.',
        exportLabel: 'EXPORT',
        createLabel: 'ADD ITEM',
        tableTitle: 'Item Registry',
        searchPlaceholder: 'Search item, code, category, or supplier',
        columns: [
          'ITEM CODE',
          'ITEM NAME',
          'CATEGORY',
          'UNIT',
          'AVAILABLE QTY',
          'MOQ',
          'QUALITY',
          'LEAD TIME',
          'SUPPLIER',
          'STATUS',
        ],
        tabs: {
          all: 'ALL',
          active: 'ACTIVE',
          deactive: 'DEACTIVE',
          capability: 'CAPABILITY',
        },
        metrics: {
          total: 'TOTAL ITEMS',
          shortage: 'LOW STOCK',
          reorder: 'REORDER PENDING',
          inbound: 'TODAY INBOUND',
          totalMeta: 'Registered SKU',
          shortageMeta: 'Below threshold',
          reorderMeta: 'Order required',
          inboundMeta: 'Units',
        },
        detailTitle: 'Item Detail',
        createTitle: 'Create Item',
        createDescription: 'Save item master first and then connect supplier capability.',
        retryNotice:
          'Item master already exists. Review capability values and submit again to retry capability only.',
        createMasterSection: 'Item Master',
        createCapabilitySection: 'Supplier Item Capability',
        cancelLabel: 'Cancel',
        submitLabel: 'Create',
        retrySubmitLabel: 'Retry Capability',
        emptyCapability: 'No linked capability data.',
      },
)

const rows = ref<ItemTableRow[]>([])
const categories = ref<ItemCategoryResponseDto[]>([])
const errorMessage = ref('')

const search = ref('')
const activeTabKey = ref<ItemTabKey>('ALL')

// 품목 상세 모달 상태
const detailModalOpen = ref(false)
const detailLoading = ref(false)
const detailErrorMessage = ref('')
const selectedItem = ref<ItemResponseDto | null>(null)
const selectedCapability = ref<SupplierItemCapabilityResponseDto | null>(null)


// 품목 등록 모달 상태
const createModalOpen = ref(false)

const createLoading = ref(false)
const createErrorMessage = ref('')
const createdItemForCapability = ref<ItemResponseDto | null>(null)

const createForm = ref<CreateItemFormState>({
  itemCategoryPublicId: '',
  itemCode: '',
  itemName: '',
  unit: 'EA',
  spec: '',
  shelfLifeDays: 0,
  leadTimeDays: 0,
  monthlyCapacity: null,
  availableQty: null,
  moq: null,
  qualityGrade: '',
})

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString('ko-KR')
}

function formatLeadTime(value: number | null | undefined) {
  if (value == null) return '-'
  return preferences.language === 'ko' ? `${value}일` : `${value}d`
}

// 품목 등록에서는 최하위 카테고리만 선택하게 합니다.
const leafCategoryOptions = computed(() =>
  categoryOptions.value,
)


function qualityGradeText(value: SupplierItemQualityGrade | null | undefined) {
  if (!value) return '-'

  switch (value) {
    case 'AA_PLUS':
      return 'AA+'
    case 'A_PLUS':
      return 'A+'
    default:
      return value
  }
}

function itemStatusText(status: ItemStatus) {
  if (preferences.language !== 'ko') return status

  switch (status) {
    case 'ACTIVE':
      return '활성'
    case 'DEACTIVE':
      return '비활성'
    case 'DELETE':
      return '삭제'
    default:
      return status
  }
}

// 품목 DTO와 공급 역량 DTO를 화면 테이블용 한 줄 데이터로 합칩니다.
function toItemRow(
  item: ItemResponseDto,
  capability: SupplierItemCapabilityResponseDto | null,
): ItemTableRow {
  return {
    publicId: item.publicId,
    itemCode: item.itemCode,
    itemName: item.itemName,
    categoryName: item.categoryName,
    supplierName: item.supplierName,
    status: item.status,
    capability,
    raw: item,
    cells: [
      item.itemCode,
      item.itemName,
      item.categoryName,
      item.unit,
      formatNumber(capability?.availableQty ?? null),
      formatNumber(capability?.moq ?? null),
      qualityGradeText(capability?.qualityGrade),
      formatLeadTime(capability?.leadTimeDays),
      item.supplierName,
      itemStatusText(item.status),
    ],
  }
}

// 품목 API에 없는 가용수량/MOQ/품질등급/리드타임은 공급 역량 API에서 합칩니다.
async function loadCapabilityMap(items: ItemResponseDto[]) {
  const capabilityMap = new Map<string, SupplierItemCapabilityResponseDto>()
  const supplierPublicIds = [...new Set(items.map((item) => item.supplierPublicId))]

  const results = await Promise.allSettled(
    supplierPublicIds.map((supplierPublicId) => getSupplierItemCapabilities(supplierPublicId)),
  )

  for (const result of results) {
    if (result.status !== 'fulfilled') continue

    for (const capability of result.value) {
      capabilityMap.set(capability.itemPublicId, capability)
    }
  }

  return capabilityMap
}

// supplier 조직은 자기 조직 품목만 조회하고, admin/buyer는 전체 조회를 그대로 탑니다.
async function fetchItems() {
  try {
    errorMessage.value = ''

    const params: GetItemsParams = {
      page: 0,
      size: 100,
    }

    if (actor.isSupplierOrganization.value && actor.organizationPublicId.value) {
      params.supplierOrganizationPublicId = actor.organizationPublicId.value
    }

    const response = await getItems(params)
    const capabilityMap = await loadCapabilityMap(response.content)

    rows.value = response.content.map((item) => toItemRow(item, capabilityMap.get(item.publicId) ?? null))
  } catch (error: any) {
    rows.value = []
    errorMessage.value = error.message ?? '품목 목록을 불러오지 못했습니다.'
  }
}

// 등록 모달에서 사용할 카테고리 목록입니다.
async function loadItemCategories() {
  if (!actor.canManageItems.value && !actor.canManageItemCategories.value) return

  try {
    const response = await getItemCategories(0, 100)

    categories.value = response.content
      .filter((category) => category.status === 'ACTIVE')
      .sort(
        (a, b) =>
          a.categoryLevel - b.categoryLevel ||
          a.sortOrder - b.sortOrder ||
          a.categoryName.localeCompare(b.categoryName, 'ko-KR'),
      )
  } catch (error) {
    console.error('Failed to load item categories', error)
    categories.value = []
  }
}


function resetCreateForm() {
  createErrorMessage.value = ''
  createdItemForCapability.value = null
  createForm.value = {
    itemCategoryPublicId: '',
    itemCode: '',
    itemName: '',
    unit: 'EA',
    spec: '',
    shelfLifeDays: 0,
    leadTimeDays: 0,
    monthlyCapacity: null,
    availableQty: null,
    moq: null,
    qualityGrade: '',
  }
}

function openCreateModal() {
  if (!actor.canManageItems.value) return

  resetCreateForm()
  createModalOpen.value = true

  if (!categories.value.length) {
    void loadItemCategories()
  }
}

function closeCreateModal() {
  createModalOpen.value = false
  createLoading.value = false
  resetCreateForm()
}

function isNonNegativeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function validateCreateForm() {
  if (!createForm.value.itemCategoryPublicId) {
    return preferences.language === 'ko'
      ? '카테고리를 선택해 주세요.'
      : 'Select a category.'
  }

  if (!createForm.value.itemCode.trim()) {
    return preferences.language === 'ko'
      ? '품목코드를 입력해 주세요.'
      : 'Enter item code.'
  }

  if (!createForm.value.itemName.trim()) {
    return preferences.language === 'ko'
      ? '품목명을 입력해 주세요.'
      : 'Enter item name.'
  }

  if (!createForm.value.spec.trim()) {
    return preferences.language === 'ko'
      ? '규격을 입력해 주세요.'
      : 'Enter spec.'
  }

  if (!isNonNegativeNumber(createForm.value.shelfLifeDays)) {
    return preferences.language === 'ko'
      ? '보관 가능 일수는 0 이상이어야 합니다.'
      : 'Shelf life must be 0 or more.'
  }

  if (!isNonNegativeNumber(createForm.value.leadTimeDays)) {
    return preferences.language === 'ko'
      ? '리드타임은 0 이상이어야 합니다.'
      : 'Lead time must be 0 or more.'
  }

  if (!isPositiveNumber(createForm.value.monthlyCapacity)) {
    return preferences.language === 'ko'
      ? '월 공급 가능 수량은 0보다 커야 합니다.'
      : 'Monthly capacity must be greater than 0.'
  }

  if (!isPositiveNumber(createForm.value.availableQty)) {
    return preferences.language === 'ko'
      ? '현재 가용 수량은 0보다 커야 합니다.'
      : 'Available quantity must be greater than 0.'
  }

  if (!isPositiveNumber(createForm.value.moq)) {
    return preferences.language === 'ko'
      ? '최소 발주 수량은 0보다 커야 합니다.'
      : 'MOQ must be greater than 0.'
  }

  return ''
}

// 품목 마스터 등록 payload
function buildCreateItemPayload(): CreateItemRequestDto {
  return {
    itemCategoryPublicId: createForm.value.itemCategoryPublicId,
    itemCode: createForm.value.itemCode.trim(),
    itemName: createForm.value.itemName.trim(),
    unit: createForm.value.unit,
    spec: createForm.value.spec.trim(),
    shelfLifeDays: Number(createForm.value.shelfLifeDays),
  }
}

// 공급 역량 등록 payload
function buildCapabilityPayload(itemPublicId: string): CreateSupplierItemCapabilityRequestDto {
  return {
    itemPublicId,
    leadTimeDays: Number(createForm.value.leadTimeDays),
    monthlyCapacity: Number(createForm.value.monthlyCapacity),
    availableQty: Number(createForm.value.availableQty),
    moq: Number(createForm.value.moq),
    qualityGrade: createForm.value.qualityGrade || null,
  }
}

// 버튼 한 번에 품목 마스터 + 공급 역량까지 연결합니다.
// 백엔드 API가 분리되어 있어서, 공급 역량만 실패하면 모달을 재시도 상태로 유지합니다.
async function submitCreateItem() {
  const validationMessage = validateCreateForm()

  if (validationMessage) {
    createErrorMessage.value = validationMessage
    return
  }

  try {
    createLoading.value = true
    createErrorMessage.value = ''

    const createdItem =
      createdItemForCapability.value ?? (await createItem(buildCreateItemPayload()))

    createdItemForCapability.value = createdItem

    await createSupplierItemCapability(
      createdItem.supplierPublicId,
      buildCapabilityPayload(createdItem.publicId),
    )

    activeTabKey.value = 'ALL'
    await fetchItems()
    closeCreateModal()
  } catch (error: any) {
    if (createdItemForCapability.value) {
      try {
        await fetchItems()
      } catch {
        // 목록 재조회 실패는 재시도 안내를 막지 않도록 무시합니다.
      }

      const baseMessage =
        error.message ??
        (preferences.language === 'ko'
          ? '공급 역량 등록에 실패했습니다.'
          : 'Failed to create capability.')

      createErrorMessage.value =
        preferences.language === 'ko'
          ? `${baseMessage} 품목 마스터는 이미 등록되었습니다. 값을 확인한 뒤 다시 등록을 누르면 공급 역량만 재시도합니다.`
          : `${baseMessage} Item master already exists. Submit again to retry capability only.`

      return
    }

    createErrorMessage.value =
      error.message ??
      (preferences.language === 'ko'
        ? '품목 등록에 실패했습니다.'
        : 'Failed to create item.')
  } finally {
    createLoading.value = false
  }
}

const itemTabs = computed<{ key: ItemTabKey; label: string }[]>(() => [
  { key: 'ALL', label: copy.value.tabs.all },
  { key: 'ACTIVE', label: copy.value.tabs.active },
  { key: 'DEACTIVE', label: copy.value.tabs.deactive },
  { key: 'CAPABILITY', label: copy.value.tabs.capability },
])

// 상단 카드 레이아웃은 유지하고, 총 품목만 실제 데이터로 연결합니다.
// 나머지 카드 값은 요청대로 더미 유지했습니다.
const metrics = computed(() => [
  {
    label: copy.value.metrics.total,
    value: String(rows.value.length),
    meta: copy.value.metrics.totalMeta,
    tone: 'nominal',
  },
  {
    label: copy.value.metrics.shortage,
    value: '14',
    meta: copy.value.metrics.shortageMeta,
    tone: 'warning',
  },
  {
    label: copy.value.metrics.reorder,
    value: '28',
    meta: copy.value.metrics.reorderMeta,
    tone: 'warning',
  },
  {
    label: copy.value.metrics.inbound,
    value: '1,240',
    meta: copy.value.metrics.inboundMeta,
    tone: 'info',
  },
])

const filteredRows = computed(() => {
  const query = search.value.trim().toLowerCase()

  return rows.value.filter((row) => {
    const matchesQuery =
      !query ||
      row.cells.some((cell) => cell.toLowerCase().includes(query)) ||
      row.itemCode.toLowerCase().includes(query) ||
      row.itemName.toLowerCase().includes(query) ||
      row.categoryName.toLowerCase().includes(query) ||
      row.supplierName.toLowerCase().includes(query)

    if (!matchesQuery) return false

    switch (activeTabKey.value) {
      case 'ACTIVE':
        return row.status === 'ACTIVE'
      case 'DEACTIVE':
        return row.status === 'DEACTIVE'
      case 'CAPABILITY':
        return row.capability != null
      default:
        return true
    }
  })
})

async function openItemDetail(row: ItemTableRow) {
  detailModalOpen.value = true
  detailLoading.value = true
  detailErrorMessage.value = ''
  selectedItem.value = null
  selectedCapability.value = row.capability

  try {
    selectedItem.value = await getItem(row.publicId)
  } catch (error: any) {
    detailErrorMessage.value = error.message ?? '품목 상세 정보를 불러오지 못했습니다.'
  } finally {
    detailLoading.value = false
  }
}

function closeItemDetail() {
  detailModalOpen.value = false
  detailLoading.value = false
  detailErrorMessage.value = ''
  selectedItem.value = null
  selectedCapability.value = null
}

onMounted(() => {
  void fetchItems()
  void loadItemCategories()
})

// 앱 상단 헤더 버튼과 페이지 버튼을 둘 다 연결합니다.
watchEffect(() => {
  header.setActions([
    { key: 'items-export', label: copy.value.exportLabel, tone: 'secondary' },
    ...(actor.canManageItems.value
      ? [
          {
            key: 'items-create',
            label: copy.value.createLabel,
            tone: 'primary' as const,
            onClick: openCreateModal,
          },
        ]
      : []),
  ])
})



onBeforeUnmount(() => {
  header.clearActions()
})

type CategoryOption = {
  publicId: string
  label: string
  level: number
}

// 카테고리 목록을 parent-child 구조로 읽어서
// "식품 > 냉동 식품" 같은 전체 경로 라벨을 만들어 줍니다.
const categoryOptions = computed<CategoryOption[]>(() => {
  const categoryMap = new Map(
    categories.value.map((category) => [category.publicId, category]),
  )

  // 자식이 있는 카테고리 publicId 집합입니다.
  // 이 값을 이용해서 최하위(leaf) 카테고리만 선택 가능하게 만들 수 있습니다.
  const parentIds = new Set(
    categories.value
      .map((category) => category.parentCategoryPublicId)
      .filter((value): value is string => !!value),
  )

  function buildCategoryPath(category: ItemCategoryResponseDto) {
    const names: string[] = []
    const visited = new Set<string>()

    let current: ItemCategoryResponseDto | undefined = category

    while (current && !visited.has(current.publicId)) {
      visited.add(current.publicId)
      names.unshift(current.categoryName)

      current = current.parentCategoryPublicId
        ? categoryMap.get(current.parentCategoryPublicId)
        : undefined
    }

    return names.join(' > ')
  }

  return categories.value
    // 최하위 카테고리만 선택 가능하게 합니다.
    .filter((category) => !parentIds.has(category.publicId))
    .map((category) => ({
      publicId: category.publicId,
      label: buildCategoryPath(category),
      level: category.categoryLevel,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'ko-KR'))
})

</script>

<template>
  <section class="app-screen terminal-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ copy.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ copy.title }}</h2>
        <p class="terminal-page__subtitle">{{ copy.subtitle }}</p>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">
          {{ copy.exportLabel }}
        </button>

        <button
          v-if="actor.canManageItems.value"
          class="page-button page-button--primary"
          type="button"
          @click="openCreateModal"
        >
          {{ copy.createLabel }}
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article
        v-for="metric in metrics"
        :key="metric.label"
        :class="['page-metric', `is-${metric.tone}`]"
      >
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search">
        <span>SEARCH</span>
        <input v-model="search" :placeholder="copy.searchPlaceholder" type="text" />
      </label>

      <div class="terminal-page__tabs">
        <button
          v-for="tab in itemTabs"
          :key="tab.key"
          :class="['terminal-page__tab', { 'is-active': activeTabKey === tab.key }]"
          type="button"
          @click="activeTabKey = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </section>

    <article class="page-panel">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">ITEM</div>
          <h3>{{ copy.tableTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>

      <p v-if="errorMessage" class="items-page__error">{{ errorMessage }}</p>

      <div class="page-table terminal-page__table is-ten-cols">
        <div class="page-table__row page-table__row--head">
          <span v-for="column in copy.columns" :key="column">{{ column }}</span>
        </div>

        <div v-for="row in filteredRows" :key="row.publicId" class="page-table__row">
          <span v-for="(cell, index) in row.cells" :key="`${row.publicId}-${index}`">
            <button
              v-if="index === 1"
              class="items-page__link-button"
              type="button"
              @click="openItemDetail(row)"
            >
              {{ cell }}
            </button>
            <template v-else>
              {{ cell }}
            </template>
          </span>
        </div>
      </div>
    </article>
  </section>

  <BaseModal
    v-model="detailModalOpen"
    :title="copy.detailTitle"
    :description="selectedItem?.itemName || copy.detailTitle"
    size="lg"
    @close="closeItemDetail"
  >
    <div v-if="detailLoading" class="page-feed">
      <div class="page-feed__item">
        <strong class="page-feed__text">Loading...</strong>
      </div>
    </div>

    <p v-else-if="detailErrorMessage" class="items-page__error">{{ detailErrorMessage }}</p>

    <div v-else-if="selectedItem" class="items-page__detail-grid">
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">MASTER</div>
            <h3>Item Master</h3>
          </div>
        </div>

        <div class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">ITEM CODE</span>
            <strong class="page-feed__text">{{ selectedItem.itemCode }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">ITEM NAME</span>
            <strong class="page-feed__text">{{ selectedItem.itemName }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">CATEGORY</span>
            <strong class="page-feed__text">{{ selectedItem.categoryName }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">UNIT</span>
            <strong class="page-feed__text">{{ selectedItem.unit }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">SUPPLIER</span>
            <strong class="page-feed__text">{{ selectedItem.supplierName }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">STATUS</span>
            <strong class="page-feed__text">{{ itemStatusText(selectedItem.status) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">SPEC</span>
            <strong class="page-feed__text">{{ selectedItem.spec }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">SHELF LIFE</span>
            <strong class="page-feed__text">{{ formatLeadTime(selectedItem.shelfLifeDays) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">CREATED</span>
            <strong class="page-feed__text">{{ formatDate(selectedItem.createdAt) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">UPDATED</span>
            <strong class="page-feed__text">{{ formatDate(selectedItem.updatedAt) }}</strong>
          </div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">CAPABILITY</div>
            <h3>Supplier Item Capability</h3>
          </div>
        </div>

        <div v-if="selectedCapability" class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">AVAILABLE QTY</span>
            <strong class="page-feed__text">{{ formatNumber(selectedCapability.availableQty) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">MOQ</span>
            <strong class="page-feed__text">{{ formatNumber(selectedCapability.moq) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">QUALITY GRADE</span>
            <strong class="page-feed__text">{{ qualityGradeText(selectedCapability.qualityGrade) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">LEAD TIME</span>
            <strong class="page-feed__text">{{ formatLeadTime(selectedCapability.leadTimeDays) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">MONTHLY CAPACITY</span>
            <strong class="page-feed__text">{{ formatNumber(selectedCapability.monthlyCapacity) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">UNIT PRICE HINT</span>
            <strong class="page-feed__text">{{ formatNumber(selectedCapability.unitPriceHint) }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">VALID FROM</span>
            <strong class="page-feed__text">{{ selectedCapability.validFrom ?? '-' }}</strong>
          </div>
          <div class="page-feed__item">
            <span class="page-feed__label">CAPABILITY CREATED</span>
            <strong class="page-feed__text">{{ formatDate(selectedCapability.createdAt) }}</strong>
          </div>
        </div>

        <div v-else class="page-feed">
          <div class="page-feed__item">
            <strong class="page-feed__text">{{ copy.emptyCapability }}</strong>
          </div>
        </div>
      </article>
    </div>
  </BaseModal>

  <BaseModal
    v-model="createModalOpen"
    :title="copy.createTitle"
    :description="copy.createDescription"
    size="lg"
    @close="closeCreateModal"
  >
    <div class="items-page__form">
      <p v-if="createdItemForCapability" class="items-page__notice">
        {{ copy.retryNotice }}
      </p>

      <section class="items-page__form-section">
        <div class="items-page__section-title">{{ copy.createMasterSection }}</div>

        <label class="items-page__field">
          <span>CATEGORY</span>
          <select
            v-model="createForm.itemCategoryPublicId"
            :disabled="!!createdItemForCapability"
          >
            <option value="">{{ itemCategoryPlaceholder }}</option>
            <option
              v-for="category in leafCategoryOptions"
              :key="category.publicId"
              :value="category.publicId"
            >
              {{ category.label }}
            </option>
          </select>
          <small class="items-page__hint">{{ itemCategoryHint }}</small>
        </label>


        <label class="items-page__field">
          <span>ITEM CODE</span>
          <input v-model="createForm.itemCode" type="text" :disabled="!!createdItemForCapability" />
        </label>

        <label class="items-page__field">
          <span>ITEM NAME</span>
          <input v-model="createForm.itemName" type="text" :disabled="!!createdItemForCapability" />
        </label>

        <label class="items-page__field">
          <span>UNIT</span>
          <select v-model="createForm.unit" :disabled="!!createdItemForCapability">
            <option v-for="unit in ITEM_UNIT_OPTIONS" :key="unit" :value="unit">
              {{ unit }}
            </option>
          </select>
        </label>

        <label class="items-page__field">
          <span>SHELF LIFE DAYS</span>
          <input v-model.number="createForm.shelfLifeDays" type="number" min="0" :disabled="!!createdItemForCapability" />
        </label>

        <label class="items-page__field items-page__field--full">
          <span>SPEC</span>
          <textarea v-model="createForm.spec" :disabled="!!createdItemForCapability" />
        </label>
      </section>

      <section class="items-page__form-section">
        <div class="items-page__section-title">{{ copy.createCapabilitySection }}</div>

        <label class="items-page__field">
          <span>LEAD TIME DAYS</span>
          <input v-model.number="createForm.leadTimeDays" type="number" min="0" />
        </label>

        <label class="items-page__field">
          <span>MONTHLY CAPACITY</span>
          <input v-model.number="createForm.monthlyCapacity" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>AVAILABLE QTY</span>
          <input v-model.number="createForm.availableQty" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>MOQ</span>
          <input v-model.number="createForm.moq" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>QUALITY GRADE</span>
          <select v-model="createForm.qualityGrade">
            <option value="">선택 안 함</option>
            <option v-for="grade in QUALITY_GRADE_OPTIONS" :key="grade" :value="grade">
              {{ qualityGradeText(grade) }}
            </option>
          </select>
        </label>
      </section>

      <p v-if="createErrorMessage" class="items-page__error">{{ createErrorMessage }}</p>

      <div class="items-page__actions">
        <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
          {{ copy.cancelLabel }}
        </button>
        <button class="page-button page-button--primary" type="button" :disabled="createLoading" @click="submitCreateItem">
          {{ createdItemForCapability ? copy.retrySubmitLabel : copy.submitLabel }}
        </button>
      </div>
    </div>
  </BaseModal>

</template>

<style scoped>
.items-page__link-button {
  all: unset;
  cursor: pointer;
  color: inherit;
}

.items-page__hint {
  font-size: 0.72rem;
  opacity: 0.7;
}

.items-page__error {
  margin: 0 0 12px;
  color: var(--color-error);
}

.items-page__notice {
  margin: 0;
  padding: 12px 14px;
  color: var(--color-on-surface);
  background: rgb(var(--warning-container-rgb, 184 112 0) / 0.08);
  border: 1px solid rgb(var(--warning-container-rgb, 184 112 0) / 0.18);
  border-radius: 6px;
}

.items-page__detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.items-page__form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.items-page__form-section {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.items-page__section-title {
  grid-column: 1 / -1;
  font-size: 0.78rem;
  font-weight: 700;
  opacity: 0.75;
}

.items-page__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.items-page__field--full {
  grid-column: 1 / -1;
}

.items-page__field span {
  font-size: 0.75rem;
  opacity: 0.7;
}

.items-page__field input,
.items-page__field select,
.items-page__field textarea {
  width: 100%;
  min-height: 40px;
  padding: 8px 10px;
  color: var(--color-on-surface);
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: 6px;
}

.items-page__field textarea {
  min-height: 96px;
  resize: vertical;
}

.items-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 960px) {
  .items-page__detail-grid,
  .items-page__form-section {
    grid-template-columns: 1fr;
  }

  .items-page__field--full {
    grid-column: auto;
  }
}
</style>
