<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { BaseModal } from '../../shared'
import { getItem, getItems, type ItemResponseDto } from '../../../services/item'
import {
  getOrganizations,
  type OrganizationListItem,
} from '../../../services/organization'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const route = useRoute()
const preferences = useAtlasPreferencesStore()

// URL에 들어온 조직 publicId입니다.
const organizationPublicId = computed(() => String(route.params.organizationPublicId ?? ''))

// 통합검색에서 넘겨준 숫자 조직 ID입니다. 목록 응답 매칭 보조값으로 사용합니다.
const routeOrganizationId = computed(() => {
  const value = getQueryString('organizationId')
  const organizationId = Number(value)
  return Number.isFinite(organizationId) ? organizationId : null
})

// query 값은 새로고침해도 안전하게 문자열로만 꺼내 씁니다.
function getQueryString(key: string) {
  const value = route.query[key]
  return typeof value === 'string' ? value : ''
}

// 기존 조직 목록 API에서 찾은 조직 기본정보입니다.
const organizationDetail = ref<OrganizationListItem | null>(null)

// 상세 API 값이 있으면 우선 사용하고, 없으면 검색 결과 query 값으로 보완합니다.
const organizationName = computed(() => {
  return organizationDetail.value?.organizationName || getQueryString('organizationName') || '-'
})

const organizationEnglishName = computed(() => {
  return organizationDetail.value?.organizationEnglishName || getQueryString('organizationEnglishName') || '-'
})

const contactEmail = computed(() => {
  return organizationDetail.value?.contactEmail || getQueryString('contactEmail') || '-'
})

const contactPhone = computed(() => {
  return organizationDetail.value?.contactPhone || getQueryString('contactPhone') || '-'
})

const contactName = computed(() => {
  if (organizationDetail.value) {
    return [
      organizationDetail.value.contactFirstName,
      organizationDetail.value.contactMiddleName,
      organizationDetail.value.contactLastName,
    ]
      .filter(Boolean)
      .join(' ') || '-'
  }

  return getQueryString('contactName') || '-'
})

// 이 조직이 등록한 물품 목록입니다.
const organizationItems = ref<ItemResponseDto[]>([])

// 상세보기 모달에 보여줄 물품입니다.
const selectedItem = ref<ItemResponseDto | null>(null)

// 물품 상세 모달 열림 여부입니다.
const isItemDetailModalOpen = ref(false)

// 물품 목록을 불러오지 못했거나 비어 있을 때 보여줄 안내 문구입니다.
const itemListMessage = ref('')

// 물품 상세 조회 실패 문구입니다.
const itemDetailError = ref('')

// 목록과 상세 로딩 상태입니다.
const isLoadingItems = ref(false)
const isLoadingItemDetail = ref(false)
const isLoadingOrganizationDetail = ref(false)

// 화면 문구를 언어 설정에 맞춰 보여줍니다.
const copy = computed(() =>
  preferences.language === 'ko'
    ? {
        eyebrow: 'ORGANIZATION PROFILE',
        title: '조직 기본정보',
        description: '검색 결과에서 진입한 조직의 기본 정보와 등록 물품을 확인합니다.',
        organizationName: '조직명',
        organizationEnglishName: '영문명',
        contactEmail: '이메일',
        contactPhone: '연락처',
        contactName: '담당자명',
        itemListTitle: '물품목록',
        loadingItems: '물품 목록을 불러오는 중입니다...',
        emptyItems: '이 조직이 등록한 활성 물품이 없습니다.',
        unavailableItems: '물품 목록을 조회할 수 없습니다. 로그인한 조직과 연결된 협력사만 물품 목록이 표시됩니다.',
        loadingItemDetail: '물품 상세를 불러오는 중입니다...',
        loadItemDetailFailed: '물품 상세를 불러오지 못했습니다.',
        itemDetailTitle: '물품 상세보기',
        closeButton: '닫기',
        itemCode: '물품 코드',
        itemName: '물품명',
        category: '카테고리',
        unit: '단위',
        spec: '규격',
        shelfLifeDays: '유통기한',
        status: '상태',
        createdAt: '등록일',
        updatedAt: '수정일',
      }
    : {
        eyebrow: 'ORGANIZATION PROFILE',
        title: 'Organization Profile',
        description: 'Review organization information and registered items from search results.',
        organizationName: 'Organization Name',
        organizationEnglishName: 'English Name',
        contactEmail: 'Email',
        contactPhone: 'Phone',
        contactName: 'Contact Name',
        itemListTitle: 'Items',
        loadingItems: 'Loading items...',
        emptyItems: 'No active items registered by this organization.',
        unavailableItems: 'Item list is unavailable. Only suppliers connected to your organization can be shown.',
        loadingItemDetail: 'Loading item detail...',
        loadItemDetailFailed: 'Failed to load item detail.',
        itemDetailTitle: 'Item Detail',
        closeButton: 'Close',
        itemCode: 'Item Code',
        itemName: 'Item Name',
        category: 'Category',
        unit: 'Unit',
        spec: 'Spec',
        shelfLifeDays: 'Shelf Life',
        status: 'Status',
        createdAt: 'Created At',
        updatedAt: 'Updated At',
      },
)

// 기본정보 영역은 사용자가 말한 5개 항목만 보여줍니다.
const organizationInfoRows = computed(() => [
  { label: copy.value.organizationName, value: organizationName.value },
  { label: copy.value.organizationEnglishName, value: organizationEnglishName.value },
  { label: copy.value.contactEmail, value: contactEmail.value },
  { label: copy.value.contactPhone, value: contactPhone.value },
  { label: copy.value.contactName, value: contactName.value },
])

function formatDate(value?: string | null) {
  if (!value) return '-'
  return value.length >= 16 ? value.substring(0, 16).replace('T', ' ') : value
}

function formatShelfLifeDays(value?: number | null) {
  if (value == null) return '-'
  return preferences.language === 'ko' ? `${value.toLocaleString()}일` : `${value.toLocaleString()} days`
}

// 조직 publicId 기준으로 등록된 활성 물품을 가져옵니다.
async function loadOrganizationItems() {
  if (!organizationPublicId.value) {
    organizationItems.value = []
    itemListMessage.value = copy.value.emptyItems
    return
  }

  try {
    isLoadingItems.value = true
    itemListMessage.value = ''
    selectedItem.value = null
    isItemDetailModalOpen.value = false

    const response = await getItems({
      supplierOrganizationPublicId: organizationPublicId.value,
      status: 'ACTIVE',
      page: 0,
      size: 50,
    })

    organizationItems.value = response.content ?? []
    itemListMessage.value = organizationItems.value.length === 0 ? copy.value.emptyItems : ''
  } catch {
    organizationItems.value = []
    itemListMessage.value = copy.value.unavailableItems
  } finally {
    isLoadingItems.value = false
  }
}

// 이미 있는 조직 목록 API로 현재 조직 publicId에 맞는 기본정보를 찾습니다.
async function loadOrganizationDetail() {
  if (!organizationPublicId.value) {
    organizationDetail.value = null
    return
  }

  try {
    isLoadingOrganizationDetail.value = true

    const keyword = getQueryString('organizationName') || organizationPublicId.value
    const response = await getOrganizations({
      keyword,
      page: 0,
      size: 50,
    })

    organizationDetail.value =
      response.content.find((organization) => {
        return organization.organizationPublicId === organizationPublicId.value
      }) ||
      response.content.find((organization) => {
        return routeOrganizationId.value !== null && organization.organizationId === routeOrganizationId.value
      }) ||
      null
  } catch {
    organizationDetail.value = null
  } finally {
    isLoadingOrganizationDetail.value = false
  }
}

// 물품 목록에서 클릭하면 상세를 조회하고 모달을 엽니다.
async function openItemDetail(item: ItemResponseDto) {
  try {
    isLoadingItemDetail.value = true
    itemDetailError.value = ''
    isItemDetailModalOpen.value = true
    selectedItem.value = await getItem(item.publicId)
  } catch (error: any) {
    itemDetailError.value = error?.payload?.message || error?.message || copy.value.loadItemDetailFailed
  } finally {
    isLoadingItemDetail.value = false
  }
}

function closeItemDetailModal() {
  isItemDetailModalOpen.value = false
  selectedItem.value = null
  itemDetailError.value = ''
}

onMounted(() => {
  void loadOrganizationDetail()
  void loadOrganizationItems()
})

watch(organizationPublicId, () => {
  void loadOrganizationDetail()
  void loadOrganizationItems()
})
</script>

<template>
  <section class="organization-profile-page">
    <header class="organization-profile-page__header">
      <div>
        <div class="organization-profile-page__eyebrow">{{ copy.eyebrow }}</div>
        <h1>{{ copy.title }}</h1>
      </div>
    </header>

    <section class="organization-profile-info">
      <article
        v-for="row in organizationInfoRows"
        :key="row.label"
        class="organization-profile-info__item"
      >
        <span>{{ row.label }}</span>
        <strong>{{ isLoadingOrganizationDetail ? '-' : row.value }}</strong>
      </article>
    </section>

    <article class="organization-profile-panel">
      <div class="organization-profile-panel__head">
        <div>
          <span>{{ copy.eyebrow }}</span>
          <h2>{{ copy.itemListTitle }}</h2>
        </div>

        <strong>{{ organizationItems.length }}</strong>
      </div>

      <div v-if="isLoadingItems" class="organization-profile-empty">
        {{ copy.loadingItems }}
      </div>

      <div v-else-if="organizationItems.length === 0" class="organization-profile-empty">
        {{ itemListMessage || copy.emptyItems }}
      </div>

      <div v-else class="organization-profile-table-wrap">
        <table class="organization-profile-table">
          <thead>
            <tr>
              <th>{{ copy.itemCode }}</th>
              <th>{{ copy.itemName }}</th>
              <th>{{ copy.category }}</th>
              <th>{{ copy.unit }}</th>
              <th>{{ copy.status }}</th>
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="item in organizationItems"
              :key="item.publicId"
              @click="openItemDetail(item)"
            >
              <td>{{ item.itemCode }}</td>
              <td class="organization-profile-table__strong">{{ item.itemName }}</td>
              <td>{{ item.categoryName }}</td>
              <td>{{ item.unit }}</td>
              <td>{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>

  <BaseModal
    v-model="isItemDetailModalOpen"
    :title="copy.itemDetailTitle"
    size="lg"
    @close="closeItemDetailModal"
  >
    <div v-if="isLoadingItemDetail" class="organization-profile-empty organization-profile-empty--modal">
      {{ copy.loadingItemDetail }}
    </div>

    <div v-else-if="itemDetailError" class="organization-profile-alert">
      {{ itemDetailError }}
    </div>

    <div v-else-if="selectedItem" class="organization-profile-detail">
      <div>
        <span>{{ copy.itemCode }}</span>
        <strong>{{ selectedItem.itemCode || '-' }}</strong>
      </div>

      <div>
        <span>{{ copy.itemName }}</span>
        <strong>{{ selectedItem.itemName || '-' }}</strong>
      </div>

      <div>
        <span>{{ copy.category }}</span>
        <strong>{{ selectedItem.categoryName || '-' }}</strong>
      </div>

      <div>
        <span>{{ copy.unit }}</span>
        <strong>{{ selectedItem.unit || '-' }}</strong>
      </div>

      <div class="organization-profile-detail__wide">
        <span>{{ copy.spec }}</span>
        <strong>{{ selectedItem.spec || '-' }}</strong>
      </div>

      <div>
        <span>{{ copy.shelfLifeDays }}</span>
        <strong>{{ formatShelfLifeDays(selectedItem.shelfLifeDays) }}</strong>
      </div>

      <div>
        <span>{{ copy.status }}</span>
        <strong>{{ selectedItem.status || '-' }}</strong>
      </div>

      <div>
        <span>{{ copy.createdAt }}</span>
        <strong>{{ formatDate(selectedItem.createdAt) }}</strong>
      </div>

      <div>
        <span>{{ copy.updatedAt }}</span>
        <strong>{{ formatDate(selectedItem.updatedAt) }}</strong>
      </div>
    </div>

    <template #footer>
      <button class="page-button page-button--secondary" type="button" @click="closeItemDetailModal">
        {{ copy.closeButton }}
      </button>
    </template>
  </BaseModal>
</template>

<style scoped>
.organization-profile-page {
  display: grid;
  gap: 18px;
  min-height: 100vh;
  padding: 28px 32px;
  color: #111827;
  background: #f4f6f9;
  font-family: Pretendard, "Segoe UI", sans-serif;
}

.organization-profile-page__header h1 {
  margin: 0 0 6px;
  font-size: 1.6rem;
}

.organization-profile-page__header p {
  margin: 0;
  color: #667085;
  font-size: 0.9rem;
}

.organization-profile-page__eyebrow,
.organization-profile-panel__head span,
.organization-profile-info__item span,
.organization-profile-detail span {
  color: #98a2b3;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.organization-profile-info {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.organization-profile-info__item,
.organization-profile-panel {
  border: 1px solid #e5e9f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(16, 24, 40, 0.08);
}

.organization-profile-info__item {
  display: grid;
  align-content: center;
  gap: 8px;
  min-height: 98px;
  padding: 16px;
}

.organization-profile-info__item strong {
  font-size: 0.95rem;
  word-break: break-all;
}

.organization-profile-panel {
  padding: 20px;
}

.organization-profile-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.organization-profile-panel__head h2 {
  margin: 4px 0 0;
  font-size: 1rem;
}

.organization-profile-panel__head > strong {
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 28px;
  padding: 0 8px;
  border-radius: 999px;
  color: #667085;
  background: #f3f4f6;
  font-size: 0.75rem;
}

.organization-profile-empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  color: #98a2b3;
  text-align: center;
  font-size: 0.86rem;
  font-weight: 800;
}

.organization-profile-empty--modal {
  min-height: 220px;
}

.organization-profile-alert {
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 12px;
  color: #b42318;
  background: #fff5f5;
  font-size: 0.82rem;
  font-weight: 800;
}

.organization-profile-table-wrap {
  overflow-x: auto;
}

.organization-profile-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.84rem;
}

.organization-profile-table th {
  padding: 10px 12px;
  border-bottom: 1.5px solid #e5e9f0;
  color: #98a2b3;
  font-size: 0.72rem;
  font-weight: 900;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.organization-profile-table td {
  padding: 12px;
  border-bottom: 1px solid #f1f3f6;
}

.organization-profile-table tbody tr {
  cursor: pointer;
}

.organization-profile-table tbody tr:hover td {
  background: #f9fafb;
}

.organization-profile-table__strong {
  font-weight: 900;
}

.organization-profile-detail {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid #e5e9f0;
  border-radius: 8px;
  background: #e5e9f0;
  gap: 1px;
}

.organization-profile-detail div {
  display: grid;
  gap: 5px;
  padding: 13px 14px;
  background: #ffffff;
}

.organization-profile-detail strong {
  font-size: 0.86rem;
  word-break: break-all;
}

.organization-profile-detail__wide {
  grid-column: span 2;
}

@media (max-width: 1200px) {
  .organization-profile-info {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .organization-profile-page {
    padding: 16px;
  }

  .organization-profile-info,
  .organization-profile-detail {
    grid-template-columns: 1fr;
  }

  .organization-profile-detail__wide {
    grid-column: auto;
  }
}
</style>
