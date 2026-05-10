<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { ko } from 'date-fns/locale/ko'
import { BaseModal } from '../../shared'
import { useActorScope } from '../../../composables/useActorScope'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { getManagedItems, type ItemResponseDto } from '../../../services/item'
import {
  createInventory,
  deleteInventory,
  getInventories,
  updateInventory,
  type InventoryStatus,
  type ItemInventoryResponseDto,
} from '../../../services/inventory'
import {
  getLogisticsNodes,
  type LogisticsNodeResponseDto,
} from '../../../services/logistics'
import {
  getItemMedia,
  resolveItemMediaUrl,
  resolveItemThumbnailUrl,
} from '../../../services/itemMedia'


type InventoryTabKey = 'ALL' | InventoryStatus

const actor = useActorScope()
const dialog = useAtlasDialogStore()
const preferences = useAtlasPreferencesStore()
const router = useRouter()

const rows = ref<ItemInventoryResponseDto[]>([])
const items = ref<ItemResponseDto[]>([])
const inventoryItemThumbnails = ref<Record<string, string>>({})
const logisticsNodeOptions = ref<LogisticsNodeResponseDto[]>([])
const search = ref('')
const activeTabKey = ref<InventoryTabKey>('ALL')
const errorMessage = ref('')

const detailModalOpen = ref(false)
const createModalOpen = ref(false)
const editModalOpen = ref(false)
const selectedInventory = ref<ItemInventoryResponseDto | null>(null)
const loading = ref(false)
const formErrorMessage = ref('')

const form = ref({
  itemPublicId: '',
  logisticsNodePublicId: '',
  manufacturedDate: '',
  expirationDate: '',
  qty: null as number | null,
  memo: '',
})

const selectedCreateItem = computed(() =>
  items.value.find((item) => item.publicId === form.value.itemPublicId) ?? null,
)

const selectedFormItem = computed(() =>
  items.value.find((item) => item.publicId === form.value.itemPublicId) ?? null,
)

const computedExpirationDate = computed(() => {
  if (!selectedCreateItem.value || !form.value.manufacturedDate) return ''

  const date = new Date(form.value.manufacturedDate)
  date.setDate(date.getDate() + selectedCreateItem.value.shelfLifeDays)

  return date.toISOString().slice(0, 10)
})

const manufacturedDatePickerValue = computed<Date | null>({
  get() {
    if (!form.value.manufacturedDate) return null
    const [year, month, day] = form.value.manufacturedDate.split('-').map(Number)
    if (!year || !month || !day) return null
    return new Date(year, month - 1, day)
  },
  set(date) {
    form.value.manufacturedDate = formatDateForApi(date)
  },
})

const datepickerTimeConfig = { enableTimePicker: false }
const datepickerFormats = {
  input: 'yyyy. MM. dd.',
  preview: 'yyyy. MM. dd.',
}

function formatDateForApi(date: Date | null) {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDateForDisplay(date: Date | null) {
  if (!date) return '연도. 월. 일.'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}. ${month}. ${day}.`
}

function formatDateStringForDisplay(value: string) {
  if (!value) return '연도. 월. 일.'
  const [year, month, day] = value.split('-')
  return `${year}. ${month}. ${day}.`
}

watch(
  computedExpirationDate,
  (expirationDate) => {
    form.value.expirationDate = expirationDate
  },
  { immediate: true },
)

const copy = computed(() =>
  ({
        eyebrow: '공급망 운영 / 재고 관리',
        title: '재고 관리',
        createLabel: '재고 생성',
        exportLabel: '내보내기',
        searchPlaceholder: '품목명, 품목코드, 상태 검색',
        tableTitle: '재고 목록',
        detailButton: '상세',
        detailTitle: '재고 상세',
        detailFallback: '재고 상세',
        detailEyebrow: '상세',
        editInventory: '재고 수정',
        deleteInventory: '재고 삭제',
        createModalTitle: '재고 생성',
        createModalDescription: '품목을 선택하고 유통기한별 재고를 생성합니다.',
        editModalTitle: '재고 수정',
        editModalDescription: '예약되지 않은 정상 재고만 수정할 수 있습니다.',
        item: '품목',
        selectItem: '품목 선택',
        cancel: '취소',
        createDone: '생성 완료',
        save: '저장',
        fields: {
          itemCode: '품목코드',
          itemName: '품목명',
          unit: '단위',
          manufacturedDate: '제조일',
          expirationDate: '유통기한',
          initialQty: '초기 수량',
          remainingQty: '잔여 수량',
          reservedQty: '예약 수량',
          availableQty: '주문 가능',
          status: '상태',
          memo: '메모',
          qty: '수량',
          logisticsNode: '창고',
        },
        columns: [
          '이미지',
          '품목명',
          '단위',
          '제조일',
          '유통기한',
          '초기 수량',
          '잔여 수량',
          '예약 수량',
          '주문 가능',
          '상태',
          '상세',
        ],
        tabs: {
          ALL: '전체',
          ACTIVE: '정상',
          RESERVED: '예약',
          EXHAUSTED: '소진',
          EXPIRED: '만료',
          DELETED: '삭제',
        },
        metrics: {
          totalRemaining: '총 잔여 재고',
          totalReserved: '예약 재고',
          totalAvailable: '주문 가능 재고',
          expiredCount: '만료 재고',
        },
        messages: {
          listFail: '재고 목록을 불러오지 못했습니다.',
          listUnavailable: '재고 목록을 불러올 수 없습니다. 로그인한 조직의 재고 조회 권한을 확인해 주세요.',
          selectItem: '품목을 선택해 주세요.',
          manufacturedDate: '제조일을 입력해 주세요.',
          expirationDate: '유통기한을 입력해 주세요.',
          invalidDate: '유통기한은 제조일보다 빠를 수 없습니다.',
          invalidQty: '수량은 1 이상이어야 합니다.',
          createFail: '재고 생성에 실패했습니다.',
          editFail: '재고 수정에 실패했습니다.',
          deleteConfirm: '이 재고를 삭제/폐기하시겠습니까?',
          deleteFail: '재고 삭제에 실패했습니다.',
          selectLogisticsNode: '창고를 선택해 주세요.',
        },
      }),
)

const tabs = computed(() => [
  { key: 'ALL' as const, label: copy.value.tabs.ALL },
  { key: 'ACTIVE' as const, label: copy.value.tabs.ACTIVE },
  { key: 'RESERVED' as const, label: copy.value.tabs.RESERVED },
  { key: 'EXHAUSTED' as const, label: copy.value.tabs.EXHAUSTED },
  { key: 'EXPIRED' as const, label: copy.value.tabs.EXPIRED },
])

const metrics = computed(() => {
  const totalRemaining = rows.value.reduce((sum, row) => sum + row.remainingQty, 0)
  const totalReserved = rows.value.reduce((sum, row) => sum + row.reservedQty, 0)
  const totalAvailable = rows.value.reduce((sum, row) => sum + row.availableQty, 0)
  const expiredCount = rows.value.filter((row) => row.status === 'EXPIRED').length

  return [
    { label: copy.value.metrics.totalRemaining, value: formatNumber(totalRemaining) },
    { label: copy.value.metrics.totalReserved, value: formatNumber(totalReserved) },
    { label: copy.value.metrics.totalAvailable, value: formatNumber(totalAvailable) },
    { label: copy.value.metrics.expiredCount, value: formatNumber(expiredCount) },
  ]
})

const filteredRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return rows.value.filter((row) => {
    const matchesTab = activeTabKey.value === 'ALL' || row.status === activeTabKey.value
    const matchesKeyword =
      !keyword ||
      row.itemCode.toLowerCase().includes(keyword) ||
      row.itemName.toLowerCase().includes(keyword) ||
      row.status.toLowerCase().includes(keyword)

    return matchesTab && matchesKeyword
  })
})

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-'
  return value.toLocaleString('ko-KR')
}

function statusText(status: InventoryStatus) {
  return copy.value.tabs[status] ?? status
}

function statusTone(status: InventoryStatus) {
  if (status === 'ACTIVE') return 'is-success'
  if (status === 'RESERVED') return 'is-warning'
  if (status === 'EXHAUSTED' || status === 'EXPIRED' || status === 'DELETED') return 'is-critical'
  return 'is-muted'
}

function canEdit(row: ItemInventoryResponseDto) {
  return row.status === 'ACTIVE' && row.reservedQty === 0
}

function canDelete(row: ItemInventoryResponseDto) {
  return row.reservedQty === 0
}

async function loadLogisticsNodeOptions() {
  try {
    const response = await getLogisticsNodes({ page: 0, size: 100 })
    logisticsNodeOptions.value = response.content.filter((node) => node.active)
  } catch {
    logisticsNodeOptions.value = []
  }
}

async function fetchPageData() {
  if (!actor.isSupplierOrganization.value) return

  try {
    errorMessage.value = ''
    const [inventoryRows, itemPage, nodePage] = await Promise.all([
      getInventories(),
      getManagedItems(0, 500),
      getLogisticsNodes({ page: 0, size: 100 }),
    ])

    rows.value = inventoryRows
    items.value = itemPage.content
    logisticsNodeOptions.value = nodePage.content.filter((node) => node.active)
    await loadInventoryItemThumbnails(inventoryRows, itemPage.content)

  } catch (error: any) {
    rows.value = []
    inventoryItemThumbnails.value = {}
    errorMessage.value = inventoryListErrorMessage(error)
  }
}

async function loadInventoryItemThumbnails(
  inventoryRows: ItemInventoryResponseDto[],
  managedItems: ItemResponseDto[],
) {
  const managedItemMap = new Map(managedItems.map((item) => [item.publicId, item]))
  const itemPublicIds = [...new Set(inventoryRows.map((row) => row.itemPublicId).filter(Boolean))]

  const entries = await Promise.all(itemPublicIds.map(async (itemPublicId) => {
    const managedItem = managedItemMap.get(itemPublicId)
    const managedThumbnail = resolveItemThumbnailUrl(managedItem)

    if (managedThumbnail) {
      return [itemPublicId, managedThumbnail] as const
    }

    const media = await getItemMedia(itemPublicId).catch(() => [])
    const thumbnail = resolveItemMediaUrl(media.find((file) => file.kind === 'image') ?? media[0])
    return [itemPublicId, thumbnail] as const
  }))

  inventoryItemThumbnails.value = Object.fromEntries(entries.filter(([, thumbnail]) => Boolean(thumbnail)))
}

function inventoryItemThumbnail(row: ItemInventoryResponseDto) {
  return inventoryItemThumbnails.value[row.itemPublicId] ?? ''
}

function inventoryListErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : ''

  if (message.includes('협력사')) {
    return copy.value.messages.listUnavailable
  }

  return message || copy.value.messages.listFail
}

function resetForm() {
  formErrorMessage.value = ''
  form.value = {
    itemPublicId: '',
    logisticsNodePublicId: '',
    manufacturedDate: '',
    expirationDate: '',
    qty: null,
    memo: '',
  }
}

function openCreateModal() {
  resetForm()
  createModalOpen.value = true
}

function closeCreateModal() {
  createModalOpen.value = false
  loading.value = false
  resetForm()
}

function openDetail(row: ItemInventoryResponseDto) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'inventory', publicId: row.inventoryPublicId },
  })
}
function handleSelectItemForInventory() {
  form.value.logisticsNodePublicId = selectedCreateItem.value?.originLogisticsNodePublicId ?? ''
}

function closeDetail() {
  detailModalOpen.value = false
  selectedInventory.value = null
}

function openEditModal() {
  if (!selectedInventory.value || !canEdit(selectedInventory.value)) return

  formErrorMessage.value = ''
  form.value = {
    itemPublicId: selectedInventory.value.itemPublicId,
    logisticsNodePublicId: selectedInventory.value.logisticsNodePublicId,
    manufacturedDate: selectedInventory.value.manufacturedDate,
    expirationDate: selectedInventory.value.expirationDate,
    qty: selectedInventory.value.initialQty,
    memo: selectedInventory.value.memo ?? '',
  }
  editModalOpen.value = true
}

function closeEditModal() {
  editModalOpen.value = false
  loading.value = false
  resetForm()
}

function validateForm(isCreate: boolean) {
  if (isCreate && !form.value.itemPublicId) return copy.value.messages.selectItem
  if (!form.value.logisticsNodePublicId) return '선택한 품목에 출발 창고가 없습니다. 품목 정보를 먼저 확인해 주세요.'
  if (!form.value.manufacturedDate) return copy.value.messages.manufacturedDate
  if (!form.value.qty || form.value.qty <= 0) return copy.value.messages.invalidQty
  return ''
}

async function submitCreate() {
  const message = validateForm(true)
  if (message) {
    formErrorMessage.value = message
    return
  }

  try {
    loading.value = true
    await createInventory({
      itemPublicId: form.value.itemPublicId,
      logisticsNodePublicId: form.value.logisticsNodePublicId,
      manufacturedDate: form.value.manufacturedDate,
      qty: Number(form.value.qty),
      memo: form.value.memo || null,
    })
    await fetchPageData()
    closeCreateModal()
  } catch (error: any) {
    formErrorMessage.value = error.message ?? copy.value.messages.createFail
  } finally {
    loading.value = false
  }
}

async function submitEdit() {
  if (!selectedInventory.value) return

  const message = validateForm(false)
  if (message) {
    formErrorMessage.value = message
    return
  }

  try {
    loading.value = true
    const updated = await updateInventory(selectedInventory.value.inventoryPublicId, {
      logisticsNodePublicId: form.value.logisticsNodePublicId,
      manufacturedDate: form.value.manufacturedDate,
      qty: Number(form.value.qty),
      memo: form.value.memo || null,
    })

    selectedInventory.value = updated
    await fetchPageData()
    closeEditModal()
  } catch (error: any) {
    formErrorMessage.value = error.message ?? copy.value.messages.editFail
  } finally {
    loading.value = false
  }
}

async function submitDelete() {
  if (!selectedInventory.value || !canDelete(selectedInventory.value)) return
  if (!(await dialog.confirm(copy.value.messages.deleteConfirm))) return

  try {
    await deleteInventory(selectedInventory.value.inventoryPublicId)
    await fetchPageData()
    closeDetail()
  } catch (error: any) {
    errorMessage.value = error.message ?? copy.value.messages.deleteFail
  }
}

onMounted(() => {
  void fetchPageData()
})
</script>

<template>
  <section class="app-screen terminal-page inventory-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ copy.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ copy.title }}</h2>
      </div>

      <div class="design-trigger-row">
        <button class="page-button page-button--primary" type="button" @click="openCreateModal">
          {{ copy.createLabel }}
        </button>
      </div>
    </header>

    <section class="page-metrics terminal-page__metrics">
      <article v-for="metric in metrics" :key="metric.label" class="page-metric">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
      </article>
    </section>

    <section class="terminal-page__filter">
      <label class="terminal-page__search terminal-page__search--icon-only">
        <span
          v-if="!search"
          class="material-symbols-outlined terminal-page__search-icon"
          aria-hidden="true"
        >
          search
        </span>
        <input
          v-model="search"
          :aria-label="copy.searchPlaceholder"
          :placeholder="copy.searchPlaceholder"
          type="text"
        />
      </label>

      <div class="terminal-page__tabs">
        <button
          v-for="tab in tabs"
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
          <div class="page-panel__eyebrow">INVENTORY</div>
          <h3>{{ copy.tableTitle }}</h3>
        </div>
        <span class="page-panel__chip">{{ filteredRows.length }}</span>
      </div>

      <div class="inventory-page__table-wrap">
        <div class="page-table terminal-page__table inventory-page__table">
          <div class="page-table__row page-table__row--head">
            <span v-for="column in copy.columns" :key="column">{{ column }}</span>
          </div>

          <p v-if="errorMessage" class="terminal-page__table-message is-error">
            {{ errorMessage }}
          </p>

          <div v-for="row in filteredRows" :key="row.inventoryPublicId" class="page-table__row">
            <span>
              <span class="inventory-page__item-thumb">
                <img
                  v-if="inventoryItemThumbnail(row)"
                  :src="inventoryItemThumbnail(row)"
                  :alt="row.itemName"
                />
                <span v-else class="material-symbols-outlined">inventory_2</span>
              </span>
            </span>
            <span>{{ row.itemName }}</span>
            <span>{{ row.unit }}</span>
            <span>{{ row.manufacturedDate }}</span>
            <span>{{ row.expirationDate }}</span>
            <span>{{ formatNumber(row.initialQty) }}</span>
            <span>{{ formatNumber(row.remainingQty) }}</span>
            <span>{{ formatNumber(row.reservedQty) }}</span>
            <span>{{ formatNumber(row.availableQty) }}</span>
            <span>
              <span :class="['page-status-chip', 'inventory-page__status-chip', statusTone(row.status)]">
                {{ statusText(row.status) }}
              </span>
            </span>
            <span>
              <button class="page-button page-button--secondary" type="button" @click="openDetail(row)">
                {{ copy.detailButton }}
              </button>
            </span>
          </div>
        </div>
      </div>
    </article>

    <BaseModal
      v-model="detailModalOpen"
      :title="copy.detailTitle"
      :description="selectedInventory?.itemName ?? copy.detailFallback"
      size="lg"
      @close="closeDetail"
    >
      <div v-if="selectedInventory" class="inventory-page__detail-stack">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.detailEyebrow }}</div>
              <h3>{{ selectedInventory.itemName }}</h3>
            </div>
            <span class="page-panel__chip">{{ statusText(selectedInventory.status) }}</span>
          </div>

          <div class="page-feed inventory-page__detail-grid">
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.itemCode }}</span><strong class="page-feed__text">{{ selectedInventory.itemCode }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.unit }}</span><strong class="page-feed__text">{{ selectedInventory.unit }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.manufacturedDate }}</span><strong class="page-feed__text">{{ selectedInventory.manufacturedDate }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.expirationDate }}</span><strong class="page-feed__text">{{ selectedInventory.expirationDate }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.initialQty }}</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.initialQty) }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.remainingQty }}</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.remainingQty) }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.reservedQty }}</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.reservedQty) }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">{{ copy.fields.availableQty }}</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.availableQty) }}</strong></div>
            <div class="page-feed__item inventory-page__field--full"><span class="page-feed__label">{{ copy.fields.memo }}</span><strong class="page-feed__text">{{ selectedInventory.memo || '-' }}</strong></div>
          </div>
        </article>

        <div class="inventory-page__actions">
          <button class="page-button page-button--secondary" type="button" :disabled="!canEdit(selectedInventory)" @click="openEditModal">
            {{ copy.editInventory }}
          </button>
          <button class="page-button page-button--secondary" type="button" :disabled="!canDelete(selectedInventory)" @click="submitDelete">
            {{ copy.deleteInventory }}
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal v-model="createModalOpen" :title="copy.createModalTitle" :description="copy.createModalDescription" size="md" @close="closeCreateModal">
      <div class="inventory-page__form">
        <label class="inventory-page__field">
          <span>{{ copy.item }}</span>
          <select v-model="form.itemPublicId" @change="handleSelectItemForInventory">
            <option value="">{{ copy.selectItem }}</option>
            <option v-for="item in items" :key="item.publicId" :value="item.publicId">
              {{ item.itemCode }} / {{ item.itemName }} / {{ item.unit }}
            </option>
          </select>
        </label>
        
        <label class="inventory-page__field">
          <span>출발 창고</span>
          <input
            :value="selectedCreateItem?.originLogisticsNodeName ?? '품목에 등록된 출발 창고가 없습니다.'"
            type="text"
            readonly
          />
        </label>

        <label class="inventory-page__field">
          <span>{{ copy.fields.manufacturedDate }}</span>
          <VueDatePicker
            v-model="manufacturedDatePickerValue"
            class="inventory-page__datepicker"
            :locale="ko"
            :formats="datepickerFormats"
            :time-config="datepickerTimeConfig"
            auto-apply
            :clearable="false"
            teleport="body"
            required
          >
            <template #trigger>
              <button class="inventory-page__date-trigger" type="button">
                <span :class="{ 'is-placeholder': !manufacturedDatePickerValue }">
                  {{ formatDateForDisplay(manufacturedDatePickerValue) }}
                </span>
                <span class="material-symbols-outlined">calendar_month</span>
              </button>
            </template>
          </VueDatePicker>
        </label>

        <label class="inventory-page__field">
          <span>{{ copy.fields.expirationDate }}</span>
          <button class="inventory-page__date-trigger" type="button" disabled>
            <span :class="{ 'is-placeholder': !form.expirationDate }">{{ formatDateStringForDisplay(form.expirationDate) }}</span>
          </button>
        </label>

        <label class="inventory-page__field"><span>{{ copy.fields.qty }}</span><input v-model.number="form.qty" type="number" min="1" step="1" /></label>
        <label class="inventory-page__field inventory-page__field--full"><span>{{ copy.fields.memo }}</span><textarea v-model="form.memo" /></label>

        <p v-if="formErrorMessage" class="inventory-page__error">{{ formErrorMessage }}</p>

        <div class="inventory-page__actions">
          <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">{{ copy.cancel }}</button>
          <button class="page-button page-button--primary" type="button" :disabled="loading" @click="submitCreate">{{ copy.createDone }}</button>
        </div>
      </div>
    </BaseModal>

    <BaseModal v-model="editModalOpen" :title="copy.editModalTitle" :description="copy.editModalDescription" size="md" @close="closeEditModal">
      <div class="inventory-page__form">
        <label class="inventory-page__field">
          <span>{{ copy.fields.manufacturedDate }}</span>
          <input v-model="form.manufacturedDate" type="date" />
        </label>

        <label class="inventory-page__field">
          <span>{{ copy.fields.expirationDate }}</span>
          <input :value="computedExpirationDate" type="date" readonly />
        </label>

        <label class="inventory-page__field"><span>{{ copy.fields.qty }}</span><input v-model.number="form.qty" type="number" min="1" step="1" /></label>
        <label class="inventory-page__field inventory-page__field--full"><span>{{ copy.fields.memo }}</span><textarea v-model="form.memo" /></label>

        <p v-if="formErrorMessage" class="inventory-page__error">{{ formErrorMessage }}</p>

        <div class="inventory-page__actions">
          <button class="page-button page-button--secondary" type="button" @click="closeEditModal">{{ copy.cancel }}</button>
          <button class="page-button page-button--primary" type="button" :disabled="loading" @click="submitEdit">{{ copy.save }}</button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>

<style scoped>
.inventory-page__table-wrap {
  max-width: 100%;
  overflow-x: auto;
}

.inventory-page__table {
  min-width: 1120px;
}

.inventory-page__table .page-table__row {
  grid-template-columns: 1.1fr 1.4fr 0.6fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr 0.8fr;
}

.inventory-page__table .page-table__row > span:nth-child(10) {
  justify-content: center;
}

.inventory-page__item-thumb {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--line, #d9dedf);
  background: var(--surface-muted, #f4f6f6);
}

.inventory-page__item-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.inventory-page__item-thumb .material-symbols-outlined {
  color: var(--text-muted, #667072);
  font-size: 1.25rem;
}

.inventory-page__status-chip {
  min-width: 64px;
  min-height: 26px;
  padding: 0 12px;
  font-size: 0.86rem;
}

.inventory-page__form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.inventory-page__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.inventory-page__field--full {
  grid-column: 1 / -1;
}

.inventory-page__field span {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.7;
}

.inventory-page__field input,
.inventory-page__field select,
.inventory-page__field textarea {
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  color: var(--color-on-surface);
  background: var(--surface-container-lowest, #fff);
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  border-radius: 0;
}

.inventory-page__field input:focus,
.inventory-page__field select:focus,
.inventory-page__field textarea:focus {
  outline: none;
  border-color: rgb(var(--outline-rgb, 117 124 125) / 0.72);
}

.inventory-page__field textarea {
  min-height: 96px;
  resize: vertical;
}

.inventory-page__datepicker {
  width: 100%;
}

.inventory-page__datepicker :deep(.dp__main),
.inventory-page__datepicker :deep(.dp__input_wrap) {
  width: 100%;
  font-family: inherit;
}

.inventory-page__date-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 42px;
  padding: 8px 10px;
  color: var(--color-on-surface);
  background: var(--surface-container-lowest, #fff);
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  border-radius: 0;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 700;
  text-align: left;
}

.inventory-page__date-trigger:focus-visible {
  outline: none;
  border-color: rgb(var(--outline-rgb, 117 124 125) / 0.72);
}

.inventory-page__date-trigger:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.inventory-page__date-trigger .is-placeholder {
  color: var(--color-on-surface-variant, #919191);
}

.inventory-page__date-trigger .material-symbols-outlined {
  color: var(--color-on-surface, #2f3435);
  font-size: 1.2rem;
}

.inventory-page__datepicker :deep(.dp__clear_icon),
.inventory-page__datepicker :deep(.dp__button_bottom) {
  display: none;
}

.inventory-page__datepicker :deep(.dp__menu),
:global(.dp__menu) {
  border: 1px solid rgb(var(--outline-rgb, 117 124 125) / 0.38);
  border-radius: 0;
  background: var(--surface-container-lowest, #fff);
  box-shadow: 0 20px 60px rgb(0 0 0 / 0.16);
  font-family: inherit;
}

.inventory-page__datepicker :deep(.dp__month_year_row),
.inventory-page__datepicker :deep(.dp__calendar_header),
:global(.dp__month_year_row),
:global(.dp__calendar_header) {
  color: var(--on-surface, #2f3435);
  font-weight: 900;
}

.inventory-page__datepicker :deep(.dp__calendar_header_separator),
:global(.dp__calendar_header_separator) {
  background: rgb(var(--outline-variant-rgb, 172 179 180) / 0.42);
}

.inventory-page__datepicker :deep(.dp__cell_inner),
:global(.dp__cell_inner) {
  border-radius: 0;
  color: var(--on-surface, #2f3435);
  font-weight: 800;
}

.inventory-page__datepicker :deep(.dp__cell_inner:hover),
:global(.dp__cell_inner:hover) {
  background: rgb(var(--outline-variant-rgb, 172 179 180) / 0.18);
}

.inventory-page__datepicker :deep(.dp__active_date),
.inventory-page__datepicker :deep(.dp__today),
:global(.dp__active_date),
:global(.dp__today) {
  border-color: var(--primary, #5e5e5e);
  background: var(--primary, #5e5e5e);
  color: var(--on-primary, #fff);
}

.inventory-page__datepicker :deep(.dp__action_row),
:global(.dp__action_row) {
  border-top: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.32);
}

.inventory-page__datepicker :deep(.dp__action_button),
:global(.dp__action_button) {
  border-radius: 0;
  font-family: inherit;
  font-weight: 900;
}

:global(.dp--menu-wrapper) {
  z-index: 100000;
}

.inventory-page__detail-stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.inventory-page__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.inventory-page__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.inventory-page__form > .inventory-page__actions {
  grid-column: 1 / -1;
}

@media (max-width: 960px) {
  .inventory-page__form,
  .inventory-page__detail-grid {
    grid-template-columns: 1fr;
  }

  .inventory-page__field--full {
    grid-column: auto;
  }
}
</style>
