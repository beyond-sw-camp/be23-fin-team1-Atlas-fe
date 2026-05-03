<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseModal } from '../../shared'
import { useActorScope } from '../../../composables/useActorScope'
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

type InventoryTabKey = 'ALL' | InventoryStatus

const actor = useActorScope()
const preferences = useAtlasPreferencesStore()

const rows = ref<ItemInventoryResponseDto[]>([])
const items = ref<ItemResponseDto[]>([])
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
  manufacturedDate: '',
  qty: null as number | null,
  memo: '',
})

const selectedCreateItem = computed(() =>
  items.value.find((item) => item.publicId === form.value.itemPublicId) ?? null,
)

const computedExpirationDate = computed(() => {
  if (!selectedCreateItem.value || !form.value.manufacturedDate) return ''

  const date = new Date(form.value.manufacturedDate)
  date.setDate(date.getDate() + selectedCreateItem.value.shelfLifeDays)

  return date.toISOString().slice(0, 10)
})

const copy = computed(() => ({
  eyebrow: '공급망 운영 / 재고 관리',
  title: '재고 관리',
  subtitle: '품목별 제조일, 유통기한, 예약 수량 기준으로 재고를 관리합니다.',
  createLabel: '재고 생성',
  exportLabel: '내보내기',
  searchPlaceholder: '품목명, 품목코드, 상태 검색',
  tableTitle: '재고 목록',
  columns: [
    '품목코드',
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
}))

const tabs = computed(() => [
  { key: 'ALL' as const, label: '전체' },
  { key: 'ACTIVE' as const, label: '정상' },
  { key: 'RESERVED' as const, label: '예약' },
  { key: 'EXHAUSTED' as const, label: '소진' },
  { key: 'EXPIRED' as const, label: '만료' },
])

const metrics = computed(() => {
  const totalRemaining = rows.value.reduce((sum, row) => sum + row.remainingQty, 0)
  const totalReserved = rows.value.reduce((sum, row) => sum + row.reservedQty, 0)
  const totalAvailable = rows.value.reduce((sum, row) => sum + row.availableQty, 0)
  const expiredCount = rows.value.filter((row) => row.status === 'EXPIRED').length

  return [
    { label: '총 잔여 재고', value: formatNumber(totalRemaining) },
    { label: '예약 재고', value: formatNumber(totalReserved) },
    { label: '주문 가능 재고', value: formatNumber(totalAvailable) },
    { label: '만료 재고', value: formatNumber(expiredCount) },
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
  switch (status) {
    case 'ACTIVE':
      return '정상'
    case 'RESERVED':
      return '예약'
    case 'EXHAUSTED':
      return '소진'
    case 'EXPIRED':
      return '만료'
    case 'DELETED':
      return '삭제'
    default:
      return status
  }
}

function canEdit(row: ItemInventoryResponseDto) {
  return row.status === 'ACTIVE' && row.reservedQty === 0
}

function canDelete(row: ItemInventoryResponseDto) {
  return row.reservedQty === 0
}

async function fetchPageData() {
  if (!actor.isSupplierOrganization.value) return

  try {
    errorMessage.value = ''
    const [inventoryRows, itemPage] = await Promise.all([
      getInventories(),
      getManagedItems(0, 500),
    ])

    rows.value = inventoryRows
    items.value = itemPage.content
  } catch (error: any) {
    rows.value = []
    errorMessage.value = error.message ?? '재고 목록을 불러오지 못했습니다.'
  }
}

function resetForm() {
  formErrorMessage.value = ''
  form.value = {
    itemPublicId: '',
    manufacturedDate: '',
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
  selectedInventory.value = row
  detailModalOpen.value = true
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
    manufacturedDate: selectedInventory.value.manufacturedDate,
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
  if (isCreate && !form.value.itemPublicId) return '품목을 선택해 주세요.'
  if (!form.value.manufacturedDate) return '제조일을 입력해 주세요.'
  if (!form.value.qty || form.value.qty <= 0) return '수량은 1 이상이어야 합니다.'
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
      manufacturedDate: form.value.manufacturedDate,
      qty: Number(form.value.qty),
      memo: form.value.memo || null,
    })
    await fetchPageData()
    closeCreateModal()
  } catch (error: any) {
    formErrorMessage.value = error.message ?? '재고 생성에 실패했습니다.'
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
      manufacturedDate: form.value.manufacturedDate,
      qty: Number(form.value.qty),
      memo: form.value.memo || null,
    })

    selectedInventory.value = updated
    await fetchPageData()
    closeEditModal()
  } catch (error: any) {
    formErrorMessage.value = error.message ?? '재고 수정에 실패했습니다.'
  } finally {
    loading.value = false
  }
}

async function submitDelete() {
  if (!selectedInventory.value || !canDelete(selectedInventory.value)) return
  if (!window.confirm('이 재고를 삭제/폐기하시겠습니까?')) return

  try {
    await deleteInventory(selectedInventory.value.inventoryPublicId)
    await fetchPageData()
    closeDetail()
  } catch (error: any) {
    errorMessage.value = error.message ?? '재고 삭제에 실패했습니다.'
  }
}

onMounted(() => {
  void fetchPageData()
})
</script>

<template>
  <section class="terminal-page inventory-page">
    <header class="terminal-page__hero">
      <div>
        <p class="terminal-page__eyebrow">{{ copy.eyebrow }}</p>
        <h1>{{ copy.title }}</h1>
      </div>

      <div class="terminal-page__actions">
        <button class="page-button page-button--secondary" type="button">
          {{ copy.exportLabel }}
        </button>
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
      <label class="terminal-page__search">
        <span>SEARCH</span>
        <input v-model="search" :placeholder="copy.searchPlaceholder" type="text" />
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

      <p v-if="errorMessage" class="inventory-page__error">{{ errorMessage }}</p>

      <div class="inventory-page__table-wrap">
        <div class="page-table terminal-page__table inventory-page__table">
          <div class="page-table__row page-table__row--head">
            <span v-for="column in copy.columns" :key="column">{{ column }}</span>
          </div>

          <div v-for="row in filteredRows" :key="row.inventoryPublicId" class="page-table__row">
            <span>{{ row.itemCode }}</span>
            <span>{{ row.itemName }}</span>
            <span>{{ row.unit }}</span>
            <span>{{ row.manufacturedDate }}</span>
            <span>{{ row.expirationDate }}</span>
            <span>{{ formatNumber(row.initialQty) }}</span>
            <span>{{ formatNumber(row.remainingQty) }}</span>
            <span>{{ formatNumber(row.reservedQty) }}</span>
            <span>{{ formatNumber(row.availableQty) }}</span>
            <span>{{ statusText(row.status) }}</span>
            <span>
              <button class="page-button page-button--secondary" type="button" @click="openDetail(row)">
                상세
              </button>
            </span>
          </div>
        </div>
      </div>
    </article>

    <BaseModal
      v-model="detailModalOpen"
      title="재고 상세"
      :description="selectedInventory?.itemName ?? '재고 상세'"
      size="lg"
      @close="closeDetail"
    >
      <div v-if="selectedInventory" class="inventory-page__detail-stack">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">DETAIL</div>
              <h3>{{ selectedInventory.itemName }}</h3>
            </div>
            <span class="page-panel__chip">{{ statusText(selectedInventory.status) }}</span>
          </div>

          <div class="page-feed inventory-page__detail-grid">
            <div class="page-feed__item"><span class="page-feed__label">품목코드</span><strong class="page-feed__text">{{ selectedInventory.itemCode }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">단위</span><strong class="page-feed__text">{{ selectedInventory.unit }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">제조일</span><strong class="page-feed__text">{{ selectedInventory.manufacturedDate }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">유통기한</span><strong class="page-feed__text">{{ selectedInventory.expirationDate }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">초기 수량</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.initialQty) }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">잔여 수량</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.remainingQty) }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">예약 수량</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.reservedQty) }}</strong></div>
            <div class="page-feed__item"><span class="page-feed__label">주문 가능</span><strong class="page-feed__text">{{ formatNumber(selectedInventory.availableQty) }}</strong></div>
            <div class="page-feed__item inventory-page__field--full"><span class="page-feed__label">메모</span><strong class="page-feed__text">{{ selectedInventory.memo || '-' }}</strong></div>
          </div>
        </article>

        <div class="inventory-page__actions">
          <button class="page-button page-button--secondary" type="button" :disabled="!canEdit(selectedInventory)" @click="openEditModal">
            재고 수정
          </button>
          <button class="page-button page-button--secondary" type="button" :disabled="!canDelete(selectedInventory)" @click="submitDelete">
            재고 삭제
          </button>
        </div>
      </div>
    </BaseModal>

    <BaseModal v-model="createModalOpen" title="재고 생성" description="품목을 선택하고 유통기한별 재고를 생성합니다." size="md" @close="closeCreateModal">
      <div class="inventory-page__form">
        <label class="inventory-page__field">
          <span>품목</span>
          <select v-model="form.itemPublicId">
            <option value="">품목 선택</option>
            <option v-for="item in items" :key="item.publicId" :value="item.publicId">
              {{ item.itemCode }} / {{ item.itemName }} / {{ item.unit }}
            </option>
          </select>
        </label>

        <label class="inventory-page__field">
            <span>제조일</span>
            <input v-model="form.manufacturedDate" type="date" />
            </label>

            <label class="inventory-page__field">
            <span>유통기한</span>
            <input :value="computedExpirationDate" type="date" readonly />
            </label>

            <label class="inventory-page__field">
            <span>수량</span>
            <input v-model.number="form.qty" type="number" min="1" step="1" />
            </label>
        <label class="inventory-page__field inventory-page__field--full"><span>메모</span><textarea v-model="form.memo" /></label>

        <p v-if="formErrorMessage" class="inventory-page__error">{{ formErrorMessage }}</p>

        <div class="inventory-page__actions">
          <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">취소</button>
          <button class="page-button page-button--primary" type="button" :disabled="loading" @click="submitCreate">생성 완료</button>
        </div>
      </div>
    </BaseModal>

    <BaseModal v-model="editModalOpen" title="재고 수정" description="예약되지 않은 정상 재고만 수정할 수 있습니다." size="md" @close="closeEditModal">
      <div class="inventory-page__form">
        <label class="inventory-page__field">
            <span>제조일</span>
            <input v-model="form.manufacturedDate" type="date" />
            </label>

            <label class="inventory-page__field">
            <span>유통기한</span>
            <input :value="computedExpirationDate" type="date" readonly />
            </label>

            <label class="inventory-page__field">
            <span>수량</span>
            <input v-model.number="form.qty" type="number" min="1" step="1" />
            </label>
        <label class="inventory-page__field inventory-page__field--full"><span>메모</span><textarea v-model="form.memo" /></label>

        <p v-if="formErrorMessage" class="inventory-page__error">{{ formErrorMessage }}</p>

        <div class="inventory-page__actions">
          <button class="page-button page-button--secondary" type="button" @click="closeEditModal">취소</button>
          <button class="page-button page-button--primary" type="button" :disabled="loading" @click="submitEdit">저장</button>
        </div>
      </div>
    </BaseModal>
  </section>
</template>

<style scoped>
.inventory-page__table-wrap {
  overflow-x: auto;
}

.inventory-page__table {
  min-width: 1120px;
}

.inventory-page__table .page-table__row {
  grid-template-columns: 1.1fr 1.4fr 0.6fr 1fr 1fr 0.8fr 0.8fr 0.8fr 0.8fr 0.7fr 0.8fr;
}

.inventory-page__error {
  margin: 0 0 12px;
  color: var(--color-error);
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
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: 0;
}

.inventory-page__field textarea {
  min-height: 96px;
  resize: vertical;
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
