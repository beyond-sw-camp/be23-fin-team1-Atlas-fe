<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { BaseModal } from '../../shared'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useActorScope } from '../../../composables/useActorScope'
import {
  createItem,
  deleteItem,
  changeItemStatus,
  changeItemPrimaryMedia,
  getItem,
  getItems,
  getItemCategories,
  getManagedItems,
  getManagedItemDashboard,
  getManagedItemLinkedOrders,
  type ItemDashboardSummaryResponseDto,
  type ItemLinkedPurchaseOrderResponseDto,
  type CreateItemRequestDto,
  type GetItemsParams,
  type ItemCategoryResponseDto,
  type ItemResponseDto,
  type ItemStatus,
  type SupplyType,
  type ItemUnit,
} from '../../../services/item'

import {
  getLogisticsNodes,
  type LogisticsNodeResponseDto,
} from '../../../services/logistics'
import {
  getItemMedia,
  itemMediaPublicId,
  itemMediaFilesFromItem,
  resolveItemMediaUrl,
  resolveItemOriginalMediaUrl,
  resolveItemThumbnailUrl,
  uploadItemMedia,
  type ItemMediaFile,
} from '../../../services/itemMedia'
import {
  createSupplierItemCapability,
  getSupplierItemCapabilities,
  getSupplierItemCapability,
  updateSupplierItemCapability,
  type CreateSupplierItemCapabilityRequestDto,
  type UpdateSupplierItemCapabilityRequestDto,
  type SupplierItemCapabilityResponseDto,
  type SupplierItemQualityGrade,
} from '../../../services/supplier'

type ItemTabKey = 'ALL' | 'ACTIVE' | 'DEACTIVE'

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
const dialog = useAtlasDialogStore()
const preferences = useAtlasPreferencesStore()
const actor = useActorScope()
const router = useRouter()

const copy = computed(() =>
  preferences.language === 'ko'
    ? {
        eyebrow: '공급망 운영 / 품목 관리',
        title: '품목 관리',
        subtitle: '품목 마스터와 협력사 품목 공급 역량을 함께 조회하고 관리합니다.',
        createLabel: '품목 등록',
        tableTitle: '품목 목록',
        searchPlaceholder: '품목명, 품목코드, 카테고리, 협력사 검색',
        mediaColumn: '미디어',
        mediaTitle: '품목 미디어',
        mediaUploadTitle: '이미지/동영상',
        mediaUploadHint: '이미지와 동영상을 여러 개 첨부할 수 있습니다.',
        mediaAppendLabel: '미디어 추가',
        mediaAppendHint: '이미지 또는 동영상을 추가하면 상세와 발주 화면 썸네일에 반영됩니다.',
        emptyMedia: '등록된 미디어가 없습니다.',
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
          '상세',
        ],
        tabs: {
          all: '전체',
          active: '활성',
          deactive: '비활성'
        },
        metrics: {
          total: '총 품목',
          active: '활성 품목',
          deactive: '비활성 품목',
          orderedToday: '금일 발주 품목',
        },
        detailTitle: '품목 상세',
        createTitle: '품목 등록',
        createDescription: '품목 마스터 저장 후 협력사 품목 공급 역량까지 바로 연결합니다.',
        retryNotice:
          '품목 마스터는 이미 등록되었습니다. 아래 공급 역량 값만 확인 후 다시 등록하면 공급 역량만 재시도합니다.',
        createMasterSection: '품목 기본 정보',
        createCapabilitySection: '협력사 품목 공급 역량',
        cancelLabel: '취소',
        submitLabel: '완료',
        retrySubmitLabel: '완료',
        emptyCapability: '연결된 공급 역량 정보가 없습니다.',
        masterEyebrow: '품목',
        capabilityEyebrow: '품목 공급 역량',
        linkedOrdersTitle: '연결된 발주 목록',
        noLinkedOrders: '연결된 발주가 없습니다.',
        labels: {
          category: '카테고리',
          itemCode: '품목 코드',
          itemName: '품목명',
          unit: '단위',
          supplierName: '협력사명',
          itemStatus: '품목 상태',
          spec: '규격',
          shelfLife: '유통기한',
          createdAt: '품목 생성 시각',
          updatedAt: '품목 수정 시각',
          availableQty: '현재 가용 수량',
          moq: '최소 발주 수량',
          qualityGrade: '품질 등급',
          leadTime: '리드타임',
          monthlyCapacity: '월간 생산 가능량',
          unitPriceHint: '기준 단가',
          validFrom: '적용 시작일',
          capabilityCreatedAt: '공급 역량 생성 시각',
          qty: '수량',
          confirmed: '확정',
          dueDate: '납기',
          status: '상태',
          partialConfirmation: '부분 확정',
          qualityPrice: '품질 단가',
          capabilityValidFrom: '공급 역량 적용 시작일',
        },
        options: {
          none: '선택 안 함',
          active: '활성',
          deactive: '비활성',
          allowed: '허용',
          disallowed: '비허용',
        },
        editTitle: '품목 수정',
        editDescription: '공급역량과 활성 상태만 변경합니다.',
        editAction: '품목 수정',
        deleteAction: '품목 삭제',
        deleteConfirm: '이 품목을 삭제하시겠습니까?',
        deleteFailed: '품목 삭제에 실패했습니다.',
        editFailed: '품목 수정에 실패했습니다.',
        createComplete: '등록 완료',
        saveLabel: '저장',
        loading: '불러오는 중...',
      }
    : {
        eyebrow: 'Supply Chain Ops / Items',
        title: 'Items',
        subtitle: 'Browse and create item master data with supplier capability.',
        exportLabel: 'EXPORT',
        createLabel: 'ADD ITEM',
        tableTitle: 'Item Registry',
        searchPlaceholder: 'Search item, code, category, or supplier',
        mediaColumn: 'Media',
        mediaTitle: 'Item Media',
        mediaUploadTitle: 'Images / Videos',
        mediaUploadHint: 'Attach multiple image or video files.',
        mediaAppendLabel: 'Add Media',
        mediaAppendHint: 'Add images or videos for item detail and order thumbnails.',
        emptyMedia: 'No media registered.',
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
          'DETAIL',
        ],
        tabs: {
          all: 'ALL',
          active: 'ACTIVE',
          deactive: 'DEACTIVE',
        },
        metrics: {
          total: 'TOTAL ITEMS',
          active: 'ACTIVE ITEMS',
          deactive: 'INACTIVE ITEMS',
          orderedToday: 'ITEMS ORDERED TODAY',
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
        retrySubmitLabel: 'Retry',
        emptyCapability: 'No linked capability data.',
        masterEyebrow: 'Item',
        capabilityEyebrow: 'Item Capability',
        linkedOrdersTitle: 'Linked Purchase Orders',
        noLinkedOrders: 'No linked purchase orders.',
        labels: {
          category: 'Category',
          itemCode: 'Item Code',
          itemName: 'Item Name',
          unit: 'Unit',
          supplierName: 'Supplier',
          itemStatus: 'Item Status',
          spec: 'Spec',
          shelfLife: 'Shelf Life',
          createdAt: 'Item Created At',
          updatedAt: 'Item Updated At',
          availableQty: 'Available Qty',
          moq: 'MOQ',
          qualityGrade: 'Quality Grade',
          leadTime: 'Lead Time',
          monthlyCapacity: 'Monthly Capacity',
          unitPriceHint: 'Base Unit Price',
          validFrom: 'Valid From',
          capabilityCreatedAt: 'Capability Created At',
          qty: 'Qty',
          confirmed: 'Confirmed',
          dueDate: 'Due',
          status: 'Status',
          partialConfirmation: 'Partial Confirmation',
          qualityPrice: 'Quality Price',
          capabilityValidFrom: 'Capability Valid From',
        },
        options: {
          none: 'None',
          active: 'Active',
          deactive: 'Inactive',
          allowed: 'Allowed',
          disallowed: 'Disallowed',
        },
        editTitle: 'Edit Item',
        editDescription: 'Only capability and active status can be changed.',
        editAction: 'Edit Item',
        deleteAction: 'Delete Item',
        deleteConfirm: 'Delete this item?',
        deleteFailed: 'Failed to delete item.',
        editFailed: 'Failed to edit item.',
        createComplete: 'Complete',
        saveLabel: 'Save',
        loading: 'Loading...',
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
const selectedItemMedia = ref<ItemMediaFile[]>([])
const itemMediaMap = ref<Record<string, ItemMediaFile[]>>({})
const mediaViewerOpen = ref(false)
const mediaViewerIndex = ref(0)
const detailMediaUploading = ref(false)

const capabilityEditModalOpen = ref(false)
const capabilityEditLoading = ref(false)
const capabilityEditErrorMessage = ref('')

const capabilityEditForm = ref({
  leadTimeDays: 0,
  monthlyCapacity: null as number | null,
  availableQty: null as number | null,
  moq: null as number | null,
  qualityGrade: '' as SupplierItemQualityGrade | '',
  unitPriceHint: null as number | null,
  validFrom: '',
  partialConfirmationAllowed: true,
  status: 'ACTIVE' as 'ACTIVE' | 'DEACTIVE',
})

function openCapabilityEditModal() {
  if (!selectedItem.value || !selectedCapability.value) return

  capabilityEditErrorMessage.value = ''
  capabilityEditForm.value = {
    leadTimeDays: selectedCapability.value.leadTimeDays ?? 0,
    monthlyCapacity: selectedCapability.value.monthlyCapacity ?? null,
    availableQty: selectedCapability.value.availableQty ?? null,
    moq: selectedCapability.value.moq ?? null,
    qualityGrade: selectedCapability.value.qualityGrade ?? '',
    unitPriceHint: selectedCapability.value.unitPriceHint ?? null,
    validFrom: selectedCapability.value.validFrom ?? '',
    partialConfirmationAllowed: selectedCapability.value.partialConfirmationAllowed ?? true,
    status: selectedItem.value.status === 'DEACTIVE' ? 'DEACTIVE' : 'ACTIVE',
  }

  capabilityEditModalOpen.value = true
}

function closeCapabilityEditModal() {
  capabilityEditModalOpen.value = false
  capabilityEditLoading.value = false
  capabilityEditErrorMessage.value = ''
}

async function submitCapabilityEdit() {
  if (!selectedItem.value || !selectedCapability.value) return

  try {
    capabilityEditLoading.value = true
    capabilityEditErrorMessage.value = ''

    const updatedCapability = await updateSupplierItemCapability(
      selectedItem.value.supplierPublicId,
      selectedItem.value.publicId,
      {
        leadTimeDays: Number(capabilityEditForm.value.leadTimeDays),
        monthlyCapacity: capabilityEditForm.value.monthlyCapacity,
        availableQty: capabilityEditForm.value.availableQty,
        moq: capabilityEditForm.value.moq,
        qualityGrade: capabilityEditForm.value.qualityGrade || null,
        unitPriceHint: capabilityEditForm.value.unitPriceHint,
        validFrom: capabilityEditForm.value.validFrom || null,
        partialConfirmationAllowed: capabilityEditForm.value.partialConfirmationAllowed,
      },
    )

    let updatedItem = selectedItem.value

    if (selectedItem.value.status !== capabilityEditForm.value.status) {
      updatedItem = await changeItemStatus(selectedItem.value.publicId, {
        status: capabilityEditForm.value.status,
      })
    }

    selectedCapability.value = updatedCapability
    selectedItem.value = updatedItem

    await fetchItems()
    closeCapabilityEditModal()
  } catch (error: any) {
    capabilityEditErrorMessage.value =
      error.message ?? copy.value.editFailed
  } finally {
    capabilityEditLoading.value = false
  }
}



async function submitDeleteItem() {
  if (!selectedItem.value) return
  if (!(await dialog.confirm(copy.value.deleteConfirm))) return

  try {
    await deleteItem(selectedItem.value.publicId)
    await fetchItems()
    closeItemDetail()
  } catch (error: any) {
    detailErrorMessage.value =
      error.message ?? copy.value.deleteFailed
  }
}


// 품목 등록 모달 상태
const createModalOpen = ref(false)

const createLoading = ref(false)
const createErrorMessage = ref('')
const createdItemForCapability = ref<ItemResponseDto | null>(null)
const createMediaFiles = ref<File[]>([])
const createMediaPreviews = ref<Array<{ url: string; name: string; kind: 'image' | 'video' }>>([])

const dashboardSummary = ref<ItemDashboardSummaryResponseDto | null>(null)
const linkedOrders = ref<ItemLinkedPurchaseOrderResponseDto[]>([])

const logisticsNodeOptions = ref<LogisticsNodeResponseDto[]>([])
const createForm = ref({
  itemCategoryPublicId: '',
  supplyType: 'STOCK_BASED' as SupplyType,
  itemName: '',
  unitPrice: null as number | null,
  unit: 'EA' as ItemUnit,
  spec: '',
  shelfLifeDays: 0,
  leadTimeDays: 0,
  monthlyCapacity: null as number | null,
  availableQty: null as number | null,
  moq: null as number | null,
  qualityGrade: '' as SupplierItemQualityGrade | '',
  unitPriceHint: null as number | null,
  validFrom: '',
  partialConfirmationAllowed: true,
  originLogisticsNodePublicId: '',
})

function formatNumber(value: number | null | undefined) {
  if (value == null) return '-'
  return value.toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US')
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  return new Date(value).toLocaleString(preferences.language === 'ko' ? 'ko-KR' : 'en-US')
}

function itemMediaOf(item: ItemResponseDto | null | undefined) {
  if (!item) return []
  return itemMediaMap.value[item.publicId] ?? itemMediaFilesFromItem(item)
}

function itemThumbnailOf(item: ItemResponseDto | null | undefined) {
  return resolveItemThumbnailUrl(item, itemMediaOf(item))
}

function openMediaViewer(index: number) {
  mediaViewerIndex.value = index
  mediaViewerOpen.value = true
}

function closeMediaViewer() {
  mediaViewerOpen.value = false
}

function nextMedia() {
  if (mediaViewerIndex.value < selectedItemMedia.value.length - 1) {
    mediaViewerIndex.value += 1
  }
}

function prevMedia() {
  if (mediaViewerIndex.value > 0) {
    mediaViewerIndex.value -= 1
  }
}

function revokeCreateMediaPreviews() {
  createMediaPreviews.value.forEach((preview) => URL.revokeObjectURL(preview.url))
  createMediaPreviews.value = []
}

function handleCreateMediaChange(event: Event) {
  const target = event.target as HTMLInputElement
  revokeCreateMediaPreviews()

  const files = Array.from(target.files ?? []).filter(
    (file) => file.type.startsWith('image/') || file.type.startsWith('video/'),
  )

  createMediaFiles.value = files
  createMediaPreviews.value = files.map((file) => ({
    url: URL.createObjectURL(file),
    name: file.name,
    kind: file.type.startsWith('video/') ? 'video' : 'image',
  }))
}

async function setFirstImageAsPrimary(itemPublicId: string, files: ItemMediaFile[]) {
  const primaryImage = files.find((file) => file.kind === 'image')
  const filePublicId = itemMediaPublicId(primaryImage)

  if (!filePublicId) return null
  return changeItemPrimaryMedia(itemPublicId, filePublicId)
}

async function uploadAndRefreshItemMedia(itemPublicId: string, files: File[]) {
  const uploadResponse = await uploadItemMedia(itemPublicId, files)
  const uploadedFiles = uploadResponse ? itemMediaFilesFromItem({ files: uploadResponse.files } as ItemResponseDto) : []
  const updatedItem = uploadedFiles.length
    ? await setFirstImageAsPrimary(itemPublicId, uploadedFiles).catch(() => null)
    : null
  const refreshedMedia = await getItemMedia(itemPublicId)

  itemMediaMap.value = {
    ...itemMediaMap.value,
    [itemPublicId]: refreshedMedia,
  }

  if (selectedItem.value?.publicId === itemPublicId) {
    selectedItem.value = updatedItem ?? selectedItem.value
    selectedItemMedia.value = refreshedMedia
  }

  return { updatedItem, media: refreshedMedia }
}

async function handleDetailMediaChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? []).filter(
    (file) => file.type.startsWith('image/') || file.type.startsWith('video/'),
  )
  target.value = ''

  if (!selectedItem.value || !files.length) return

  try {
    detailMediaUploading.value = true
    detailErrorMessage.value = ''
    await uploadAndRefreshItemMedia(selectedItem.value.publicId, files)
    await fetchItems()
  } catch (error: any) {
    detailErrorMessage.value =
      error.message ??
      (preferences.language === 'ko'
        ? '품목 미디어 추가에 실패했습니다.'
        : 'Failed to add item media.')
  } finally {
    detailMediaUploading.value = false
  }
}

async function loadItemMediaMap(items: ItemResponseDto[]) {
  const entries = await Promise.all(
    items.map(async (item) => [
      item.publicId,
      itemMediaFilesFromItem(item).length
        ? itemMediaFilesFromItem(item)
        : item.primaryMediaFilePublicId
          ? await getItemMedia(item.publicId)
          : [],
    ] as const),
  )

  itemMediaMap.value = Object.fromEntries(entries)
}

async function loadLogisticsNodeOptions() {
  try {
    const response = await getLogisticsNodes({ page: 0, size: 100 })
    logisticsNodeOptions.value = response.content.filter((node) => node.active)
  } catch {
    logisticsNodeOptions.value = []
  }
}

onMounted(() => {
  void fetchItems()
  void loadItemCategories()
  void loadLogisticsNodeOptions()
})

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

function poStatusText(value: string) {
  if (preferences.language !== 'ko') return value

  switch (value) {
    case 'CREATED':
      return '확인 대기'
    case 'PARTIALLY_CONFIRMED':
      return '부분 확정'
    case 'CONFIRMED':
      return '확정'
    case 'REJECTED':
      return '반려'
    case 'CANCELLED':
      return '취소'
    case 'COMPLETED':
      return '완료'
    case 'DELETED':
      return '삭제'
    default:
      return value
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

// supplier 조직은 자기 조직 품목만 조회하고, admin/buyer는 전체 조회를 그대로 탑니다.
async function fetchItems() {
  try {
    errorMessage.value = ''

    const response = await getManagedItems(0, 100)
    const summary = await getManagedItemDashboard()

    dashboardSummary.value = summary

    const supplierPublicId = response.content[0]?.supplierPublicId
    const capabilities = supplierPublicId
      ? await getSupplierItemCapabilities(supplierPublicId)
      : []

    const capabilityMap = new Map(
      capabilities.map((capability) => [capability.itemPublicId, capability]),
    )

    await loadItemMediaMap(response.content)

    rows.value = response.content.map((item) =>
      toItemRow(item, capabilityMap.get(item.publicId) ?? null),
    )
  } catch (error: any) {
    rows.value = []
    errorMessage.value = error.message ?? '품목 목록을 불러오지 못했습니다.'
  }
}



// 등록 모달에서 사용할 카테고리 목록입니다.
async function loadItemCategories() {
  try {
    const response = await getItemCategories(0, 500)

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
  createMediaFiles.value = []
  revokeCreateMediaPreviews()
  createForm.value = {
    itemCategoryPublicId: '',
    supplyType: 'STOCK_BASED',
    itemName: '',
    unit: 'EA',
    unitPrice: null,
    spec: '',
    shelfLifeDays: 0,
    leadTimeDays: 0,
    monthlyCapacity: null,
    availableQty: null,
    moq: null,
    qualityGrade: '',
    unitPriceHint: null,
    validFrom: '',
    partialConfirmationAllowed: true,
    originLogisticsNodePublicId: '',
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
  const isKo = preferences.language === 'ko'

  if (!createForm.value.itemCategoryPublicId) return isKo ? '카테고리를 선택해 주세요.' : 'Select a category.'
  if (!createForm.value.itemName.trim()) return isKo ? '품목명을 입력해 주세요.' : 'Enter item name.'
  if (!createForm.value.spec.trim()) return isKo ? '규격을 입력해 주세요.' : 'Enter spec.'
  if (!isPositiveNumber(createForm.value.unitPrice)) return isKo ? '단가는 0보다 커야 합니다.' : 'Unit price must be greater than 0.'
  if (!isNonNegativeNumber(createForm.value.shelfLifeDays)) return isKo ? '유통기한을 입력해 주세요.' : 'Enter shelf life days.'
  if (!createForm.value.originLogisticsNodePublicId) return isKo ? '출발 물류거점을 선택해 주세요.' : 'Select origin logistics node.'

  if (!isNonNegativeNumber(createForm.value.leadTimeDays)) return isKo ? '리드타임을 입력해 주세요.' : 'Enter lead time.'
  if (!isPositiveNumber(createForm.value.monthlyCapacity)) return isKo ? '월간 생산 가능량을 입력해 주세요.' : 'Enter monthly capacity.'
  if (!isPositiveNumber(createForm.value.availableQty)) return isKo ? '주문 가능 수량을 입력해 주세요.' : 'Enter available quantity.'
  if (!isPositiveNumber(createForm.value.moq)) return isKo ? '최소 주문 수량을 입력해 주세요.' : 'Enter minimum order quantity.'
  if (!createForm.value.qualityGrade) return isKo ? '품질 등급을 선택해 주세요.' : 'Select quality grade.'
  if (typeof createForm.value.partialConfirmationAllowed !== 'boolean') {
    return isKo ? '부분 확정 허용 여부를 선택해 주세요.' : 'Select partial confirmation option.'
  }

  return ''
}


// 품목 마스터 등록 payload
function buildCreateItemPayload(): CreateItemRequestDto {
  return {
    itemCategoryPublicId: createForm.value.itemCategoryPublicId,
    supplyType: createForm.value.supplyType,
    itemName: createForm.value.itemName.trim(),
    unitPrice: Number(createForm.value.unitPrice),
    unit: createForm.value.unit,
    spec: createForm.value.spec.trim(),
    shelfLifeDays: Number(createForm.value.shelfLifeDays),
    originLogisticsNodePublicId: createForm.value.originLogisticsNodePublicId,
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
    unitPriceHint: createForm.value.unitPriceHint,
    validFrom: createForm.value.validFrom || null,
    partialConfirmationAllowed: createForm.value.partialConfirmationAllowed,
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

  let createdItem: ItemResponseDto | null = null

  try {
    createLoading.value = true
    createErrorMessage.value = ''

    createdItem = await createItem(buildCreateItemPayload())

    await createSupplierItemCapability(
      createdItem.supplierPublicId,
      buildCapabilityPayload(createdItem.publicId),
    )

    if (createMediaFiles.value.length) {
      await uploadAndRefreshItemMedia(createdItem.publicId, createMediaFiles.value).catch((error) => {
        console.warn('Failed to upload item media', error)
      })
    }

    activeTabKey.value = 'ALL'
    await fetchItems()
    closeCreateModal()
  } catch (error: any) {
    if (createdItem) {
      try {
        await deleteItem(createdItem.publicId)
        await fetchItems()
      } catch {
        // capability 실패 후 마스터 삭제까지 실패하면 서버/DB 정리가 필요함
      }
    }

    createErrorMessage.value =
      error.message ??
      (preferences.language === 'ko'
        ? '품목 기본 정보와 공급 역량을 모두 입력해야 등록할 수 있습니다.'
        : 'Item master and capability are both required.')
  } finally {
    createLoading.value = false
  }
}


const itemTabs = computed<{ key: ItemTabKey; label: string }[]>(() => [
  { key: 'ALL', label: copy.value.tabs.all },
  { key: 'ACTIVE', label: copy.value.tabs.active },
  { key: 'DEACTIVE', label: copy.value.tabs.deactive },
])

// 상단 카드 레이아웃은 유지하고, 총 품목만 실제 데이터로 연결합니다.
// 나머지 카드 값은 요청대로 더미 유지했습니다.
const metrics = computed(() => [
  {
    label: '총 품목',
    value: formatNumber(dashboardSummary.value?.totalItemCount ?? 0),
  },
  {
    label: '활성 품목',
    value: formatNumber(dashboardSummary.value?.activeItemCount ?? 0),
  },
  {
    label: '비활성 품목',
    value: formatNumber(dashboardSummary.value?.deactiveItemCount ?? 0),
  },
  {
    label: '금일 발주 품목',
    value: formatNumber(dashboardSummary.value?.todayOrderedItemCount ?? 0),
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
      default:
        return true
    }
  })
})

async function openItemDetail(row: ItemTableRow) {
  detailModalOpen.value = true
  detailLoading.value = true
  selectedItem.value = row.raw
  selectedCapability.value = null
  selectedItemMedia.value = itemMediaOf(row.raw)
  linkedOrders.value = []

  try {
    const shouldLoadMedia = Boolean(row.raw.primaryMediaFilePublicId || selectedItemMedia.value.length)
    const [capability, orders, media] = await Promise.all([
      getSupplierItemCapability(row.raw.supplierPublicId, row.publicId).catch(() => null),
      getManagedItemLinkedOrders(row.publicId),
      shouldLoadMedia ? getItemMedia(row.publicId) : Promise.resolve([]),
    ])

    selectedCapability.value = capability
    linkedOrders.value = orders
    selectedItemMedia.value = media.length ? media : selectedItemMedia.value
  } finally {
    detailLoading.value = false
  }
}

function openItemDetailPage(row: ItemTableRow) {
  router.push({
    name: 'operationDetail',
    params: { kind: 'items', publicId: row.publicId },
  })
}

function closeItemDetail() {
  detailModalOpen.value = false
  detailLoading.value = false
  detailErrorMessage.value = ''
  selectedItem.value = null
  selectedCapability.value = null
  selectedItemMedia.value = []
  closeMediaViewer()
}

onMounted(() => {
  void fetchItems()
  void loadItemCategories()
})

// 앱 상단 헤더 버튼과 페이지 버튼을 둘 다 연결합니다.
watchEffect(() => {
  header.setActions([
   
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
  revokeCreateMediaPreviews()
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

const categoryPathMap = computed(() => {
  const categoryMap = new Map(
    categories.value.map((category) => [category.publicId, category]),
  )

  function buildPath(categoryPublicId: string) {
    const names: string[] = []
    const visited = new Set<string>()

    let current = categoryMap.get(categoryPublicId)

    while (current && !visited.has(current.publicId)) {
      visited.add(current.publicId)
      names.unshift(current.categoryName)

      current = current.parentCategoryPublicId
        ? categoryMap.get(current.parentCategoryPublicId)
        : undefined
    }

    return names.join(' > ')
  }

  return new Map(
    categories.value.map((category) => [category.publicId, buildPath(category.publicId)]),
  )
})

function getItemCategoryPath(item: ItemResponseDto | null) {
  if (!item) return '-'

  const categoryMap = new Map(
    categories.value.map((category) => [category.publicId, category]),
  )

  const names: string[] = []
  const visited = new Set<string>()
  let current = categoryMap.get(item.itemCategoryPublicId)

  while (current && !visited.has(current.publicId)) {
    visited.add(current.publicId)
    names.unshift(current.categoryName)
    current = current.parentCategoryPublicId
      ? categoryMap.get(current.parentCategoryPublicId)
      : undefined
  }

  return names.length ? names.join(' > ') : item.categoryName
}

</script>

<template>
  <section class="app-screen terminal-page items-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">{{ copy.eyebrow }}</div>
        <h2 class="terminal-page__title">{{ copy.title }}</h2>
      </div>

      <div class="design-trigger-row">
        

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
        class="page-metric"
      >
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

      <div class="items-page__table-wrap">
        <div class="page-table terminal-page__table items-page__table">
          <div class="page-table__row page-table__row--head">
            <span>{{ copy.mediaColumn }}</span>
            <span v-for="column in copy.columns" :key="column">{{ column }}</span>
          </div>

          <p v-if="errorMessage" class="terminal-page__table-message is-error">
            {{ errorMessage }}
          </p>

          <div v-for="row in filteredRows" :key="row.publicId" class="page-table__row">
            <span>
              <span class="items-page__thumb" aria-hidden="true">
                <img
                  v-if="itemThumbnailOf(row.raw)"
                  :src="itemThumbnailOf(row.raw)"
                  :alt="row.itemName"
                />
                <span v-else class="material-symbols-outlined">inventory_2</span>
              </span>
            </span>
            <span v-for="(cell, index) in row.cells" :key="`${row.publicId}-${index}`">
              <button
                v-if="index === 1"
                class="items-page__link-button"
                type="button"
                @click="openItemDetailPage(row)"
              >
                {{ cell }}
              </button>
              <template v-else>
                {{ cell }}
              </template>
            </span>

            <span class="items-page__detail-cell">
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="openItemDetailPage(row)"
              >
                {{ copy.columns[10] }}
              </button>
            </span>
          </div>
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
        <span class="page-feed__label">{{ copy.labels.category }}</span>
        <strong class="page-feed__text">{{ copy.loading }}</strong>
      </div>
    </div>

    <p v-else-if="detailErrorMessage" class="items-page__error">{{ detailErrorMessage }}</p>

    <div v-else-if="selectedItem" class="items-page__detail-stack">
      <div class="items-page__detail-grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.masterEyebrow }}</div>
              <h3>Item Master</h3>
            </div>
          </div>

          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.itemCode }}</span>
              <strong class="page-feed__text">{{ selectedItem.itemCode }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.itemName }}</span>
              <strong class="page-feed__text">{{ selectedItem.itemName }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.category }}</span>
              <strong class="page-feed__text">{{ getItemCategoryPath(selectedItem) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.unit }}</span>
              <strong class="page-feed__text">{{ selectedItem.unit }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.supplierName }}</span>
              <strong class="page-feed__text">{{ selectedItem.supplierName }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.itemStatus }}</span>
              <strong class="page-feed__text">{{ itemStatusText(selectedItem.status) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.spec }}</span>
              <strong class="page-feed__text">{{ selectedItem.spec }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.shelfLife }}</span>
              <strong class="page-feed__text">{{ formatLeadTime(selectedItem.shelfLifeDays) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.createdAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedItem.createdAt) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.updatedAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedItem.updatedAt) }}</strong>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.capabilityEyebrow }}</div>
              <h3>Item Capability</h3>
            </div>
          </div>

          <div v-if="selectedCapability" class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.availableQty }}</span>
              <strong class="page-feed__text">{{ formatNumber(selectedCapability.availableQty) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.moq }}</span>
              <strong class="page-feed__text">{{ formatNumber(selectedCapability.moq) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.qualityGrade }}</span>
              <strong class="page-feed__text">{{ qualityGradeText(selectedCapability.qualityGrade) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.leadTime }}</span>
              <strong class="page-feed__text">{{ formatLeadTime(selectedCapability.leadTimeDays) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.monthlyCapacity }}</span>
              <strong class="page-feed__text">{{ formatNumber(selectedCapability.monthlyCapacity) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.unitPriceHint }}</span>
              <strong class="page-feed__text">{{ formatNumber(selectedCapability.unitPriceHint) }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.validFrom }}</span>
              <strong class="page-feed__text">{{ selectedCapability.validFrom ?? '-' }}</strong>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.labels.capabilityCreatedAt }}</span>
              <strong class="page-feed__text">{{ formatDate(selectedCapability.createdAt) }}</strong>
            </div>
          </div>
          
          
          

          <div v-else class="page-feed">
            <div class="page-feed__item">
              <strong class="page-feed__text">{{ copy.emptyCapability }}</strong>
            </div>
          </div>
        </article>

        <article class="page-panel items-page__detail-panel--full">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">MEDIA</div>
              <h3>{{ copy.mediaTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ selectedItemMedia.length }}</span>
          </div>

          <label
            v-if="actor.canManageItems.value"
            class="items-page__media-upload"
          >
            <span>{{ detailMediaUploading ? copy.loading : copy.mediaAppendLabel }}</span>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              :disabled="detailMediaUploading"
              @change="handleDetailMediaChange"
            />
            <small>{{ copy.mediaAppendHint }}</small>
          </label>

          <div v-if="selectedItemMedia.length" class="items-page__media-grid">
            <button
              v-for="(media, index) in selectedItemMedia"
              :key="media.publicId"
              class="items-page__media-tile"
              type="button"
              @click="openMediaViewer(index)"
            >
              <img
                v-if="media.kind === 'image'"
                :src="resolveItemMediaUrl(media)"
                :alt="media.originalFileName"
              />
              <video
                v-else
                :src="resolveItemMediaUrl(media)"
                preload="metadata"
              />
              <span v-if="media.kind === 'video'" class="items-page__media-play material-symbols-outlined">play_circle</span>
              <small>{{ media.originalFileName }}</small>
            </button>
          </div>

          <div v-else class="page-feed">
            <div class="page-feed__item">
              <strong class="page-feed__text">{{ copy.emptyMedia }}</strong>
            </div>
          </div>
        </article>

        <article class="page-panel items-page__detail-panel--full">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">PURCHASE ORDERS</div>
              <h3>{{ copy.linkedOrdersTitle }}</h3>
            </div>
            <span class="page-panel__chip">{{ linkedOrders.length }}</span>
          </div>

          <div v-if="linkedOrders.length" class="page-feed">
            <div
              v-for="order in linkedOrders"
              :key="order.poItemPublicId"
              class="page-feed__item"
            >
              <div class="items-page__linked-order">
                <div class="items-page__linked-order-main">
                  <strong class="page-feed__text">{{ order.poNumber }}</strong>
                  <span class="page-feed__label">{{ order.buyerOrganizationPublicId }}</span>
                </div>

                <div class="items-page__linked-order-meta">
                  <span>{{ poStatusText(order.poStatus) }}</span>
                  <span>{{ copy.labels.qty }} {{ formatNumber(order.orderedQty) }}</span>
                  <span>{{ copy.labels.confirmed }} {{ formatNumber(order.confirmedQty) }}</span>
                  <span>{{ copy.labels.dueDate }} {{ order.expectedDueDate ?? '-' }}</span>
                  <span>{{ formatDate(order.orderedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="page-feed">
            <div class="page-feed__item">
              <strong class="page-feed__text">{{ copy.noLinkedOrders }}</strong>
            </div>
          </div>
        </article>


      </div>
    </div>

      <div class="items-page__actions">
        <button
          class="page-button page-button--secondary"
          type="button"
          @click="openCapabilityEditModal"
        >
          {{ copy.editAction }}
        </button>
        <button
          class="page-button page-button--secondary"
          type="button"
          @click="submitDeleteItem"
        >
          {{ copy.deleteAction }}
        </button>
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
          <span>ITEM NAME</span>
          <input v-model="createForm.itemName" type="text" :disabled="!!createdItemForCapability" />
        </label>

        <label class="items-page__field">
          <span>ITEM TYPE</span>
          <select v-model="createForm.supplyType" :disabled="!!createdItemForCapability">
            <option value="STOCK_BASED">재고형</option>
            <option value="MAKE_TO_ORDER">주문생산형</option>
          </select>
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
          <span>UNIT PRICE</span>
          <input v-model.number="createForm.unitPrice" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>SHELF LIFE DAYS</span>
          <input v-model.number="createForm.shelfLifeDays" type="number" min="0" :disabled="!!createdItemForCapability" />
        </label>

        <label class="items-page__field items-page__field--full">
          <span>SPEC</span>
          <textarea v-model="createForm.spec" :disabled="!!createdItemForCapability" />
        </label>

        <label class="items-page__field">
          <span>출발 물류거점</span>
          <select v-model="createForm.originLogisticsNodePublicId" :disabled="!!createdItemForCapability">
            <option value="">출발 물류거점을 선택하세요.</option>
            <option
              v-for="node in logisticsNodeOptions"
              :key="node.publicId"
              :value="node.publicId"
            >
              {{ node.nodeName }} / {{ node.nodeType }}
            </option>
          </select>
        </label>

        <label class="items-page__field items-page__field--full">
          <span>{{ copy.mediaUploadTitle }}</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            :disabled="!!createdItemForCapability"
            @change="handleCreateMediaChange"
          />
          <small class="items-page__hint">{{ copy.mediaUploadHint }}</small>
        </label>

        <div v-if="createMediaPreviews.length" class="items-page__preview-grid">
          <div
            v-for="preview in createMediaPreviews"
            :key="preview.url"
            class="items-page__preview-tile"
          >
            <img v-if="preview.kind === 'image'" :src="preview.url" :alt="preview.name" />
            <video v-else :src="preview.url" preload="metadata" />
            <small>{{ preview.name }}</small>
          </div>
        </div>

      </section>

      <section class="items-page__form-section">
        <div class="items-page__section-title">{{ copy.createCapabilitySection }}</div>

        <label class="items-page__field">
          <span>LEAD TIME DAYS</span>
          <input v-model.number="createForm.leadTimeDays" type="number" min="0" />
        </label>

        <label class="items-page__field">
          <span>월간 생산량</span>
          <input v-model.number="createForm.monthlyCapacity" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>{{ createForm.supplyType === 'MAKE_TO_ORDER' ? '생산 가능 수량' : '주문 가능 수량' }}</span>
          <input v-model.number="createForm.availableQty" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>최소 주문 수량</span>
          <input v-model.number="createForm.moq" type="number" min="0.01" step="0.01" />
        </label>

        <label class="items-page__field">
          <span>품목 품질</span>
          <select v-model="createForm.qualityGrade">
            <option value="">{{ copy.options.none }}</option>
            <option v-for="grade in QUALITY_GRADE_OPTIONS" :key="grade" :value="grade">
              {{ qualityGradeText(grade) }}
            </option>
          </select>
        </label>

        <label class="items-page__field">
          <span>발주 수량 부분 확정</span>
          <select v-model="createForm.partialConfirmationAllowed">
            <option :value="true">{{ copy.options.allowed }}</option>
            <option :value="false">{{ copy.options.disallowed }}</option>
          </select>
        </label>

      </section>

      <p v-if="createErrorMessage" class="items-page__error">{{ createErrorMessage }}</p>

      <div class="items-page__actions">
        <button class="page-button page-button--secondary" type="button" @click="closeCreateModal">
          {{ copy.cancelLabel }}
        </button>
        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="createLoading"
          @click="submitCreateItem"
        >
          {{ copy.createComplete }}
        </button>
      </div>
    </div>
  </BaseModal>

  <BaseModal
  v-model="capabilityEditModalOpen"
  :title="copy.editTitle"
  :description="copy.editDescription"
  size="md"
  @close="closeCapabilityEditModal"
>
  <div class="items-page__form">
    <section class="items-page__form-section">
      <label class="items-page__field">
        <span>{{ copy.labels.status }}</span>
        <select v-model="capabilityEditForm.status">
          <option value="ACTIVE">{{ copy.options.active }}</option>
          <option value="DEACTIVE">{{ copy.options.deactive }}</option>
        </select>
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.leadTime }}</span>
        <input v-model.number="capabilityEditForm.leadTimeDays" type="number" min="0" />
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.monthlyCapacity }}</span>
        <input v-model.number="capabilityEditForm.monthlyCapacity" type="number" min="1" step="1" />
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.availableQty }}</span>
        <input v-model.number="capabilityEditForm.availableQty" type="number" min="1" step="1" />
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.moq }}</span>
        <input v-model.number="capabilityEditForm.moq" type="number" min="1" step="1" />
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.qualityGrade }}</span>
        <select v-model="capabilityEditForm.qualityGrade">
          <option value="">{{ copy.options.none }}</option>
          <option v-for="grade in QUALITY_GRADE_OPTIONS" :key="grade" :value="grade">
            {{ qualityGradeText(grade) }}
          </option>
        </select>
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.qualityPrice }}</span>
        <input v-model.number="capabilityEditForm.unitPriceHint" type="number" min="0" step="0.01" />
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.capabilityValidFrom }}</span>
        <input v-model="capabilityEditForm.validFrom" type="date" />
      </label>

      <label class="items-page__field">
        <span>{{ copy.labels.partialConfirmation }}</span>
        <select v-model="capabilityEditForm.partialConfirmationAllowed">
          <option :value="true">{{ copy.options.allowed }}</option>
          <option :value="false">{{ copy.options.disallowed }}</option>
        </select>
      </label>
    </section>

    <p v-if="capabilityEditErrorMessage" class="items-page__error">
      {{ capabilityEditErrorMessage }}
    </p>

    <div class="items-page__actions">
      <button class="page-button page-button--secondary" type="button" @click="closeCapabilityEditModal">
        {{ copy.cancelLabel }}
      </button>
      <button
        class="page-button page-button--primary"
        type="button"
        :disabled="capabilityEditLoading"
        @click="submitCapabilityEdit"
      >
        {{ copy.saveLabel }}
      </button>
    </div>
  </div>
</BaseModal>

  <Teleport to="body">
    <div v-if="mediaViewerOpen && selectedItemMedia[mediaViewerIndex]" class="items-page__media-viewer" @click.self="closeMediaViewer">
      <button class="items-page__media-viewer-close" type="button" @click="closeMediaViewer">
        <span class="material-symbols-outlined">close</span>
      </button>

      <button
        v-if="mediaViewerIndex > 0"
        class="items-page__media-viewer-nav items-page__media-viewer-nav--prev"
        type="button"
        @click.stop="prevMedia"
      >
        <span class="material-symbols-outlined">chevron_left</span>
      </button>

      <div class="items-page__media-viewer-content">
        <img
          v-if="selectedItemMedia[mediaViewerIndex].kind === 'image'"
          :src="resolveItemOriginalMediaUrl(selectedItemMedia[mediaViewerIndex])"
          :alt="selectedItemMedia[mediaViewerIndex].originalFileName"
        />
        <video
          v-else
          :src="resolveItemOriginalMediaUrl(selectedItemMedia[mediaViewerIndex])"
          controls
          autoplay
        />
        <span>{{ mediaViewerIndex + 1 }} / {{ selectedItemMedia.length }}</span>
      </div>

      <button
        v-if="mediaViewerIndex < selectedItemMedia.length - 1"
        class="items-page__media-viewer-nav items-page__media-viewer-nav--next"
        type="button"
        @click.stop="nextMedia"
      >
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  </Teleport>


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

.items-page__detail-panel--full,
.items-page__preview-grid {
  grid-column: 1 / -1;
}

.items-page__thumb {
  display: inline-grid;
  place-items: center;
  width: 42px;
  height: 42px;
  overflow: hidden;
  color: var(--color-on-surface);
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: 6px;
}

.items-page__thumb img,
.items-page__media-tile img,
.items-page__media-tile video,
.items-page__preview-tile img,
.items-page__preview-tile video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.items-page__media-grid,
.items-page__preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 10px;
}

.items-page__media-upload {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
  padding: 14px;
  background: var(--color-surface);
  border: 1px dashed var(--color-outline);
  border-radius: 6px;
}

.items-page__media-upload span {
  font-weight: 800;
}

.items-page__media-upload small {
  color: var(--color-on-surface-variant);
}

.items-page__media-tile,
.items-page__preview-tile {
  position: relative;
  display: grid;
  grid-template-rows: 120px auto;
  gap: 6px;
  min-width: 0;
  padding: 0;
  overflow: hidden;
  color: inherit;
  text-align: left;
  background: var(--color-surface);
  border: 1px solid var(--color-outline);
  border-radius: 6px;
}

.items-page__media-tile {
  cursor: pointer;
}

.items-page__media-tile small,
.items-page__preview-tile small {
  padding: 0 8px 8px;
  overflow: hidden;
  color: var(--color-on-surface);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.items-page__media-play {
  position: absolute;
  top: 44px;
  left: 50%;
  color: white;
  font-size: 34px;
  text-shadow: 0 1px 8px rgb(0 0 0 / 0.45);
  transform: translateX(-50%);
}

.items-page__media-viewer {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgb(0 0 0 / 0.82);
}

.items-page__media-viewer-content {
  display: grid;
  gap: 12px;
  justify-items: center;
  max-width: min(1040px, 92vw);
  max-height: 88vh;
  color: white;
}

.items-page__media-viewer-content img,
.items-page__media-viewer-content video {
  max-width: 100%;
  max-height: 78vh;
  object-fit: contain;
}

.items-page__media-viewer-close,
.items-page__media-viewer-nav {
  position: fixed;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  color: white;
  background: rgb(255 255 255 / 0.12);
  border: 1px solid rgb(255 255 255 / 0.26);
  border-radius: 6px;
  cursor: pointer;
}

.items-page__media-viewer-close {
  top: 20px;
  right: 20px;
}

.items-page__media-viewer-nav--prev {
  left: 20px;
}

.items-page__media-viewer-nav--next {
  right: 20px;
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
