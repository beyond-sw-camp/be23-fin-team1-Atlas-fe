<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import {
  createOrganization,
  getOrganizations,
  type OrganizationListItem,
} from '../../../services/organization'
import { createSupplier } from '../../../services/supplier'


import { useActorScope } from '../../../composables/useActorScope'
import {
  createItemCategory,
  deleteItemCategory,
  getItemCategories,
  updateItemCategory,
  type CreateItemCategoryRequestDto,
  type ItemCategoryResponseDto,
  type UpdateItemCategoryRequestDto,
} from '../../../services/item'
import {
  createCertificateType,
  getCertificateTypes,
  updateCertificateType,
  type CertificateTypeResponseDto,
  type CreateCertificateTypeRequestDto,
} from '../../../services/certificate'
import { createInitialOrgAdmin } from '../../../services/user'
import PhoneField from '../../../components/forms/PhoneField.vue'
import OrganizationManagementPage from './OrganizationManagementPage.vue'

type SettingsTabKey = 'organization' | 'users' | 'categories' | 'certificateTypes'

type CategoryTreeNode = {
  publicId: string
  parentCategoryPublicId: string | null
  categoryName: string
  pathLabel: string
  level: number
  sortOrder: number
  status: string
  hasChildren: boolean
}

const dialog = useAtlasDialogStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '플랫폼 / 관리',
    title: '플랫폼관리',
    tabs: {
      organization: '조직',
      users: '사용자',
      categories: '카테고리',
      certificateTypes: '인증 분류',
    },
  },
  en: {
    eyebrow: 'Platform / Management',
    title: 'Platform Management',
    tabs: {
      organization: 'Organization',
      users: 'Users',
      categories: 'Categories',
      certificateTypes: 'Certificate Types',
    },
  },
} as const

const content = computed(() => CONTENT.ko)
// 플랫폼 관리자는 설정에 들어오면 조직 관리 탭을 먼저 봅니다.
const activeTab = ref<SettingsTabKey>('organization')
const tabEntries = computed(() => [
  { key: 'organization' as const, label: content.value.tabs.organization },
  { key: 'users' as const, label: content.value.tabs.users },
  { key: 'categories' as const, label: content.value.tabs.categories },
  { key: 'certificateTypes' as const, label: content.value.tabs.certificateTypes },
])

const organizationForm = reactive({
  organizationType: 'SUPPLIER' as 'BUYER' | 'SUPPLIER',
  organizationName: '',
  organizationEnglishName: '',

  // 조직 생성 API의 필수값입니다.
  // 영문 대문자/숫자 2~10자 규칙으로 입력받습니다.
  organizationAlias: '',

  businessNo: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
})


const initialOrgAdminForm = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
})

const createdOrganizationPublicId = ref('')
// 조직 드롭다운에 보여줄 목록입니다.
const organizationOptions = ref<OrganizationListItem[]>([])

// 조직 목록 로딩 상태입니다.
const isLoadingOrganizationOptions = ref(false)

// 사용자가 드롭다운에서 고른 조직 publicId 입니다.
const selectedOrganizationPublicId = ref('')

const createdOrgAdminLoginId = ref('')
const createdOrgAdminTempPassword = ref('')

const isCreatingOrganization = ref(false)
const isCreatingOrgAdmin = ref(false)

const organizationCreateError = ref('')
const organizationCreateSuccess = ref('')
const orgAdminCreateError = ref('')
const orgAdminCreateSuccess = ref('')

const organizationContactPhoneValid = ref(false)
const initialOrgAdminPhoneValid = ref(false)

const itemCategories = ref<ItemCategoryResponseDto[]>([])
const itemCategoriesLoaded = ref(false)
const itemCategoriesLoading = ref(false)
const itemCategorySubmitting = ref(false)
const itemCategoryError = ref('')
const itemCategorySuccess = ref('')
const selectedCategoryPublicId = ref('')
const expandedCategoryIds = ref<string[]>([])

const itemCategoryForm = reactive({
  categoryName: '',
  sortOrder: 1,
})

const actor = useActorScope()

const isAdminCategoryActor = computed(
  () => actor.isAdminRole.value)

const itemCategoryUpdating = ref(false)
const itemCategoryDeleting = ref(false)
const editingCategoryPublicId = ref('')

type CategoryParentOption = {
  publicId: string
  label: string
}

const itemCategoryEditForm = reactive({
  parentCategoryPublicId: '',
  categoryName: '',
  sortOrder: 1,
})

const certificateTypes = ref<CertificateTypeResponseDto[]>([])
const certificateTypesLoaded = ref(false)
const certificateTypesLoading = ref(false)
const certificateTypeSubmitting = ref(false)
const certificateTypeError = ref('')
const certificateTypeSuccess = ref('')
const selectedCertificateTypePublicId = ref('')
const editingCertificateTypePublicId = ref('')
const isCertificateTypeEditorOpen = ref(false)
const certificateTypeStatusUpdating = ref(false)
const selectedCertificatePresetCode = ref('')
const CERTIFICATE_TYPE_PAGE_SIZE = 7
const certificateTypePage = ref(0)

const certificateTypeForm = reactive<CreateCertificateTypeRequestDto>({
  certificateCode: '',
  certificateName: '',
  issuerName: '',
  scopeType: 'SUPPLIER_COMMON',
  requiredYn: false,
  activeYn: true,
})

const certificateScopeOptions = [
  {
    value: 'SUPPLIER_COMMON',
    ko: '협력사 전체 인증',
    en: 'Supplier Common',
    descriptionKo: '협력사 조직 전체에 적용',
    descriptionEn: '협력사 조직 전체에 적용',
  },
  {
    value: 'ITEM_SPECIFIC',
    ko: '품목별 인증',
    en: 'Item Specific',
    descriptionKo: '특정 품목에만 적용',
    descriptionEn: '특정 품목에만 적용',
  },
  {
    value: 'BOTH',
    ko: '공통/품목 모두',
    en: 'Both',
    descriptionKo: '협력사 전체 또는 품목별 인증으로 사용',
    descriptionEn: '협력사 전체 또는 품목별 인증으로 사용',
  },
] as const

const legacyCertificateScopeLabels: Record<string, { ko: string; en: string; descriptionKo: string; descriptionEn: string }> = {
  QUALITY: {
    ko: '품질',
    en: 'Quality',
    descriptionKo: '기존 품질 인증 분류',
    descriptionEn: '기존 품질 인증 분류',
  },
  SUSTAINABILITY: {
    ko: '지속가능성',
    en: 'Sustainability',
    descriptionKo: '기존 지속가능성 인증 분류',
    descriptionEn: '기존 지속가능성 인증 분류',
  },
  LOGISTICS: {
    ko: '물류',
    en: 'Logistics',
    descriptionKo: '기존 물류 인증 분류',
    descriptionEn: '기존 물류 인증 분류',
  },
}

const recommendedCertificateTypes = [
  { code: 'HACCP', nameKo: 'HACCP 인증', nameEn: 'HACCP 인증', scope: 'SUPPLIER_COMMON', categoryKo: '식품 안전', categoryEn: '식품 안전' },
  { code: 'ISO-9001', nameKo: '품질경영시스템', nameEn: '품질경영시스템', scope: 'SUPPLIER_COMMON', categoryKo: '품질', categoryEn: '품질' },
  { code: 'ISO-14001', nameKo: '환경경영시스템', nameEn: '환경경영시스템', scope: 'SUPPLIER_COMMON', categoryKo: 'ESG 환경', categoryEn: 'ESG 환경' },
  { code: 'ISO-45001', nameKo: '안전보건경영시스템', nameEn: '안전보건경영시스템', scope: 'SUPPLIER_COMMON', categoryKo: 'ESG 사회/안전', categoryEn: 'ESG 사회/안전' },
  { code: 'ISCC', nameKo: 'ISCC 지속가능원료 인증', nameEn: 'ISCC 지속가능원료 인증', scope: 'ITEM_SPECIFIC', categoryKo: 'ESG 지속가능성', categoryEn: 'ESG 지속가능성' },
  { code: 'CERT-ORIGIN', nameKo: '원산지 증명서', nameEn: '원산지 증명서', scope: 'ITEM_SPECIFIC', categoryKo: '컴플라이언스', categoryEn: '컴플라이언스' },
  { code: 'ECO-LABEL', nameKo: '환경표지 인증', nameEn: '환경표지 인증', scope: 'ITEM_SPECIFIC', categoryKo: 'ESG 환경', categoryEn: 'ESG 환경' },
  { code: 'ORGANIC-CERT', nameKo: '유기농 인증', nameEn: '유기농 인증', scope: 'ITEM_SPECIFIC', categoryKo: '식품/환경', categoryEn: '식품/환경' },
  { code: 'GAP', nameKo: '농산물우수관리 인증', nameEn: '농산물우수관리 인증', scope: 'ITEM_SPECIFIC', categoryKo: '식품 안전', categoryEn: '식품 안전' },
  { code: 'HALAL', nameKo: '할랄 인증', nameEn: '할랄 인증', scope: 'ITEM_SPECIFIC', categoryKo: '식품 인증', categoryEn: '식품 인증' },
  { code: 'SELF-QUALITY-INSPECTION', nameKo: '자가품질검사 성적서', nameEn: '자가품질검사 성적서', scope: 'ITEM_SPECIFIC', categoryKo: '식품 안전', categoryEn: '식품 안전' },
  { code: 'PESTICIDE-RESIDUE-TEST', nameKo: '잔류농약 검사성적서', nameEn: '잔류농약 검사성적서', scope: 'ITEM_SPECIFIC', categoryKo: '식품 안전', categoryEn: '식품 안전' },
] as const

type RecommendedCertificateType = (typeof recommendedCertificateTypes)[number]

const categoryCopy = computed(() =>
  preferences.language === 'ko'
    ? {
        structureEyebrow: 'CATEGORY STRUCTURE',
        structureTitle: '카테고리 구조',
        structureDescription: '왼쪽 구조에서 부모 노드를 선택한 뒤, 오른쪽에서 하위 카테고리를 추가합니다.',
        rootLabel: '최상위 카테고리',
        rootDescription: '선택 시 루트 카테고리를 생성합니다.',
        editorEyebrow: 'NODE EDITOR',
        createRootTitle: '최상위 카테고리 생성',
        createChildTitle: '하위 카테고리 추가',
        createDescription: '선택된 노드 아래로 새 카테고리를 추가합니다.',
        currentParentLabel: '현재 부모',
        nextLevelLabel: '생성 레벨',
        nameLabel: '새 카테고리명',
        sortOrderLabel: '정렬 순서',
        submitLabel: '하위 카테고리 추가',
        submitRootLabel: '최상위 카테고리 생성',
        empty: '등록된 카테고리가 없습니다.',
        statusActive: '활성',
        statusDeactive: '비활성',
        statusDelete: '삭제',
      }
    : {
        structureEyebrow: 'CATEGORY STRUCTURE',
        structureTitle: 'Category Structure',
        structureDescription: 'Choose a parent node on the left, then add a child category from the editor.',
        rootLabel: 'Top-level category',
        rootDescription: 'Create a root category without selecting a parent.',
        editorEyebrow: 'NODE EDITOR',
        createRootTitle: 'Create Root Category',
        createChildTitle: 'Add Child Category',
        createDescription: 'Add a new category under the selected parent node.',
        currentParentLabel: 'Current Parent',
        nextLevelLabel: 'Next Level',
        nameLabel: 'New Category Name',
        sortOrderLabel: 'Sort Order',
        submitLabel: 'Add Child Category',
        submitRootLabel: 'Create Root Category',
        empty: 'No categories registered.',
        statusActive: 'Active',
        statusDeactive: 'Inactive',
        statusDelete: 'Deleted',
      },
)

const certificateTypeCopy = computed(() =>
  preferences.language === 'ko'
    ? {
        listEyebrow: 'CERTIFICATE MASTER',
        listTitle: '인증 분류 목록',
        listDescription: '각 조직이 인증문서를 등록할 때 선택하는 플랫폼 공통 인증 분류입니다.',
        formEyebrow: 'TYPE EDITOR',
        formCreateTitle: '인증 분류 생성',
        formUpdateTitle: '인증 분류 수정',
        formDescription: '플랫폼 관리자가 인증서 분류와 기본 발급 기관을 등록합니다.',
        detailEyebrow: 'TYPE DETAIL',
        detailTitle: '인증 분류 상세',
        detailDescription: '왼쪽에서 인증 분류를 선택하면 기본 정보와 활성 상태를 확인할 수 있습니다.',
        chooseType: '왼쪽에서 인증 분류를 선택해 주세요.',
        recommendationTitle: 'ESG/인증 추천 종류',
        recommendationDescription: '초기 마스터에 넣기 좋은 인증 분류입니다.',
        codeLabel: '인증 코드',
        nameLabel: '인증명',
        issuerLabel: '발급 기관',
        scopeLabel: '인증 범위',
        categoryLabel: '분류',
        requiredLabel: '필수 인증',
        activeLabel: '활성 상태',
        createLabel: '인증 분류 생성',
        editLabel: '수정',
        cancelLabel: '취소',
        deactivateLabel: '비활성화',
        activateLabel: '활성화',
        statusUpdateLabel: '처리 중...',
        submitLabel: '인증 분류 등록',
        updateLabel: '인증 분류 수정',
        submittingLabel: '등록 중...',
        updatingLabel: '수정 중...',
        empty: '등록된 인증 분류가 없습니다.',
        yes: '예',
        no: '아니오',
        active: '활성',
        inactive: '비활성',
        statusUpdateFailed: '인증 분류 상태 변경에 실패했습니다.',
        activateSuccess: '인증 분류가 활성화되었습니다.',
        deactivateSuccess: '인증 분류가 비활성화되었습니다.',
        updateSuccess: '인증 분류가 수정되었습니다.',
        updateFailed: '인증 분류 수정에 실패했습니다.',
      }
    : {
        listEyebrow: 'CERTIFICATE MASTER',
        listTitle: 'Certificate Type List',
        listDescription: 'Platform-wide certificate types used when organizations upload certificate documents.',
        formEyebrow: 'TYPE EDITOR',
        formCreateTitle: 'Create Certificate Type',
        formUpdateTitle: 'Update Certificate Type',
        formDescription: 'Platform admins manage certificate classification and default issuer metadata.',
        detailEyebrow: 'TYPE DETAIL',
        detailTitle: 'Certificate Type Detail',
        detailDescription: 'Choose a certificate type from the list to review metadata and active status.',
        chooseType: 'Please choose a certificate type from the list.',
        recommendationTitle: 'ESG / Certificate Starter Set',
        recommendationDescription: 'Recommended certificate types for the initial master data.',
        codeLabel: 'Certificate Code',
        nameLabel: 'Certificate Name',
        issuerLabel: 'Issuer',
        scopeLabel: 'Scope',
        categoryLabel: 'Category',
        requiredLabel: 'Required',
        activeLabel: 'Active',
        createLabel: 'Create Type',
        editLabel: 'Edit',
        cancelLabel: 'Cancel',
        deactivateLabel: 'Deactivate',
        activateLabel: 'Activate',
        statusUpdateLabel: 'Updating...',
        submitLabel: 'Register Type',
        updateLabel: 'Update Type',
        submittingLabel: 'Registering...',
        updatingLabel: 'Updating...',
        empty: 'No certificate types registered.',
        yes: 'Yes',
        no: 'No',
        active: 'Active',
        inactive: 'Inactive',
        statusUpdateFailed: 'Failed to update certificate type status.',
        activateSuccess: 'Certificate type activated.',
        deactivateSuccess: 'Certificate type deactivated.',
        updateSuccess: 'Certificate type updated.',
        updateFailed: 'Failed to update certificate type.',
      },
)

const categoryTreeNodes = computed<CategoryTreeNode[]>(() => {
  const categoryMap = new Map(
    itemCategories.value.map((category) => [category.publicId, category]),
  )

  const parentIds = new Set(
    itemCategories.value
      .map((category) => category.parentCategoryPublicId)
      .filter((value): value is string => !!value),
  )

  function buildPath(category: ItemCategoryResponseDto) {
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

  const childrenMap = new Map<string | null, ItemCategoryResponseDto[]>()

  for (const category of itemCategories.value) {
    const key = category.parentCategoryPublicId ?? null
    const siblings = childrenMap.get(key) ?? []
    siblings.push(category)
    childrenMap.set(key, siblings)
  }

  const compareCategories = (left: ItemCategoryResponseDto, right: ItemCategoryResponseDto) =>
    left.sortOrder - right.sortOrder ||
    left.categoryName.localeCompare(
      right.categoryName,
      'ko-KR',
    )

  const result: CategoryTreeNode[] = []

  function visit(parentCategoryPublicId: string | null) {
    const children = childrenMap.get(parentCategoryPublicId)
    if (!children) return

    for (const category of [...children].sort(compareCategories)) {
      result.push({
        publicId: category.publicId,
        parentCategoryPublicId: category.parentCategoryPublicId,
        categoryName: category.categoryName,
        pathLabel: buildPath(category),
        level: category.categoryLevel,
        sortOrder: category.sortOrder,
        status: category.status,
        hasChildren: parentIds.has(category.publicId),
      })

      visit(category.publicId)
    }
  }

  visit(null)
  return result
})


const selectedCategoryNode = computed(
  () => categoryTreeNodes.value.find((category) => category.publicId === selectedCategoryPublicId.value) ?? null,
)

const visibleCategoryNodes = computed(() => {
  const expanded = new Set(expandedCategoryIds.value)

  return categoryTreeNodes.value.filter((category) => {
    let currentParentId = category.parentCategoryPublicId

    while (currentParentId) {
      if (!expanded.has(currentParentId)) return false

      const parent = categoryTreeNodes.value.find((node) => node.publicId === currentParentId)
      currentParentId = parent?.parentCategoryPublicId ?? null
    }

    return true
  })
})

const selectedParentLabel = computed(() =>
  selectedCategoryNode.value ? selectedCategoryNode.value.pathLabel : categoryCopy.value.rootLabel,
)

const nextCategoryLevel = computed(() => (selectedCategoryNode.value ? selectedCategoryNode.value.level + 1 : 1))

const selectedCertificateType = computed(
  () => certificateTypes.value.find((type) => type.publicId === selectedCertificateTypePublicId.value) ?? null,
)

const editingCertificateType = computed(
  () => certificateTypes.value.find((type) => type.publicId === editingCertificateTypePublicId.value) ?? null,
)

const activeCertificateTypeCount = computed(
  () => certificateTypes.value.filter((type) => type.activeYn !== false).length,
)

const certificateTypeEditorTitle = computed(() =>
  editingCertificateType.value
    ? certificateTypeCopy.value.formUpdateTitle
    : certificateTypeCopy.value.formCreateTitle,
)

const certificateTypeTotalPages = computed(() =>
  Math.ceil(certificateTypes.value.length / CERTIFICATE_TYPE_PAGE_SIZE),
)

const certificateTypeCurrentPageNumber = computed(() => {
  return certificateTypeTotalPages.value === 0 ? 0 : certificateTypePage.value + 1
})

const visibleCertificateTypes = computed(() => {
  const startIndex = certificateTypePage.value * CERTIFICATE_TYPE_PAGE_SIZE
  return certificateTypes.value.slice(startIndex, startIndex + CERTIFICATE_TYPE_PAGE_SIZE)
})

const canMoveCertificateTypePrev = computed(() => certificateTypePage.value > 0)
const canMoveCertificateTypeNext = computed(() => {
  return certificateTypePage.value + 1 < certificateTypeTotalPages.value
})

function moveCertificateTypePage(nextPage: number) {
  if (nextPage < 0 || nextPage >= certificateTypeTotalPages.value) return
  certificateTypePage.value = nextPage
}

function formatCertificateTypeName(type: CertificateTypeResponseDto) {
  return type.certificateName || type.name || '-'
}

function getCertificateScopeOption(scopeType?: string) {
  return certificateScopeOptions.find((option) => option.value === scopeType)
}

function formatCertificateScope(scopeType?: string) {
  if (!scopeType) return '-'

  const option = getCertificateScopeOption(scopeType)
  const legacyLabel = legacyCertificateScopeLabels[scopeType]

  if (!option && legacyLabel) {
    return preferences.language === 'ko' ? legacyLabel.ko : legacyLabel.en
  }

  if (!option) return scopeType

  return preferences.language === 'ko' ? option.ko : option.en
}

function formatCertificateScopeDescription(scopeType?: string) {
  const option = getCertificateScopeOption(scopeType)
  const legacyLabel = scopeType ? legacyCertificateScopeLabels[scopeType] : undefined

  if (!option && legacyLabel) {
    return preferences.language === 'ko' ? legacyLabel.descriptionKo : legacyLabel.descriptionEn
  }

  if (!option) return scopeType || '-'

  return preferences.language === 'ko' ? option.descriptionKo : option.descriptionEn
}

function getRecommendedCertificateName(type: (typeof recommendedCertificateTypes)[number]) {
  return preferences.language === 'ko' ? type.nameKo : type.nameEn
}

function getRecommendedCertificateCategory(type: (typeof recommendedCertificateTypes)[number]) {
  return preferences.language === 'ko' ? type.categoryKo : type.categoryEn
}

function getRecommendedCertificateOptionLabel(type: RecommendedCertificateType) {
  return `${type.code} · ${getRecommendedCertificateCategory(type)} · ${getRecommendedCertificateName(type)}`
}

function selectRecommendedCertificateType(type: (typeof recommendedCertificateTypes)[number]) {
  selectedCertificatePresetCode.value = type.code
  certificateTypeForm.certificateCode = type.code
  certificateTypeForm.certificateName = getRecommendedCertificateName(type)
  certificateTypeForm.scopeType = type.scope
  certificateTypeForm.issuerName = type.code.startsWith('ISO') ? 'ISO' : ''
  certificateTypeForm.requiredYn = ['HACCP', 'ISO-9001'].includes(type.code)
  certificateTypeForm.activeYn = true
}

function applySelectedCertificatePreset() {
  const preset = recommendedCertificateTypes.find((type) => type.code === selectedCertificatePresetCode.value)
  if (preset) {
    selectRecommendedCertificateType(preset)
  }
}

function collectDescendantCategoryIds(categoryPublicId: string) {
  const descendants = new Set<string>()
  const stack = itemCategories.value
    .filter((category) => category.parentCategoryPublicId === categoryPublicId)
    .map((category) => category.publicId)

  while (stack.length) {
    const currentId = stack.pop()
    if (!currentId || descendants.has(currentId)) continue

    descendants.add(currentId)

    itemCategories.value
      .filter((category) => category.parentCategoryPublicId === currentId)
      .forEach((category) => stack.push(category.publicId))
  }

  return descendants
}

const blockedParentCategoryIds = computed(() => {
  const targetCategory = selectedCategoryNode.value
  const blocked = new Set<string>()

  if (!targetCategory) return blocked

  blocked.add(targetCategory.publicId)
  collectDescendantCategoryIds(targetCategory.publicId).forEach((id) => blocked.add(id))

  return blocked
})

const editableParentCategoryOptions = computed<CategoryParentOption[]>(() => {
  const targetCategory = selectedCategoryNode.value
  if (!targetCategory) return []

  return [
    {
      publicId: '',
      label: categoryCopy.value.rootLabel,
    },
    ...categoryTreeNodes.value
      .filter((category) => category.publicId !== targetCategory.publicId)
      .map((category) => ({
        publicId: category.publicId,
        label: category.pathLabel,
      })),
  ]
})



function categoryStatusText(status: string) {
  if (status === 'ACTIVE') return categoryCopy.value.statusActive
  if (status === 'DEACTIVE') return categoryCopy.value.statusDeactive
  return categoryCopy.value.statusDelete
}

function isCategoryExpanded(categoryPublicId: string) {
  return expandedCategoryIds.value.includes(categoryPublicId)
}

function toggleCategoryExpanded(categoryPublicId: string) {
  if (isCategoryExpanded(categoryPublicId)) {
    expandedCategoryIds.value = expandedCategoryIds.value.filter((value) => value !== categoryPublicId)
    return
  }

  expandedCategoryIds.value = [...expandedCategoryIds.value, categoryPublicId]
}

function expandCategoryAncestors(categoryPublicId: string) {
  const expanded = new Set(expandedCategoryIds.value)
  let current = categoryTreeNodes.value.find((category) => category.publicId === categoryPublicId)

  while (current?.parentCategoryPublicId) {
    expanded.add(current.parentCategoryPublicId)
    current = categoryTreeNodes.value.find((category) => category.publicId === current?.parentCategoryPublicId)
  }

  expandedCategoryIds.value = [...expanded]
}

function selectCategoryNode(categoryPublicId: string) {
  selectedCategoryPublicId.value = categoryPublicId
  expandCategoryAncestors(categoryPublicId)
}

async function loadItemCategories() {
  try {
    itemCategoriesLoading.value = true
    itemCategoryError.value = ''

    const response = await getItemCategories(0, 100)

    itemCategories.value = response.content
    itemCategoriesLoaded.value = true
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      ('카테고리 목록을 불러오지 못했습니다.')
  } finally {
    itemCategoriesLoading.value = false
  }
}

function resetCategoryForm() {
  itemCategoryForm.categoryName = ''
  itemCategoryForm.sortOrder = 1
}

function resetCategoryEditForm() {
  editingCategoryPublicId.value = ''
  itemCategoryEditForm.parentCategoryPublicId = ''
  itemCategoryEditForm.categoryName = ''
  itemCategoryEditForm.sortOrder = 1
}

function startCategoryEdit() {
  const targetCategory = selectedCategoryNode.value
  if (!targetCategory) return

  itemCategoryError.value = ''
  itemCategorySuccess.value = ''

  if (targetCategory.hasChildren) {
    itemCategoryError.value =
      '하위 카테고리가 있는 카테고리는 수정할 수 없습니다.'
    return
  }

  editingCategoryPublicId.value = targetCategory.publicId
  itemCategoryEditForm.parentCategoryPublicId = targetCategory.parentCategoryPublicId ?? ''
  itemCategoryEditForm.categoryName = targetCategory.categoryName
  itemCategoryEditForm.sortOrder = targetCategory.sortOrder
}

function cancelCategoryEdit() {
  resetCategoryEditForm()
}

async function submitCategoryEdit() {
  const targetCategory = selectedCategoryNode.value
  if (!targetCategory || editingCategoryPublicId.value !== targetCategory.publicId) return

  itemCategoryError.value = ''
  itemCategorySuccess.value = ''

  const categoryName = itemCategoryEditForm.categoryName.trim()
  const sortOrder = Number(itemCategoryEditForm.sortOrder)

  if (!categoryName) {
    itemCategoryError.value =
      '카테고리명을 입력해 주세요.'
    return
  }

  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    itemCategoryError.value =
      '정렬 순서는 0 이상이어야 합니다.'
    return
  }

  try {
    itemCategoryUpdating.value = true

    await updateItemCategory(targetCategory.publicId, {
      parentCategoryPublicId: itemCategoryEditForm.parentCategoryPublicId || undefined,
      categoryName,
      sortOrder,
    } satisfies UpdateItemCategoryRequestDto)

    itemCategorySuccess.value =
      '카테고리가 수정되었습니다.'

    await loadItemCategories()
    selectCategoryNode(targetCategory.publicId)
    cancelCategoryEdit()
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      ('카테고리 수정에 실패했습니다.')
  } finally {
    itemCategoryUpdating.value = false
  }
}

async function deleteSelectedCategory() {
  const targetCategory = selectedCategoryNode.value
  if (!targetCategory) return

  itemCategoryError.value = ''
  itemCategorySuccess.value = ''

  if (targetCategory.hasChildren) {
    itemCategoryError.value =
      '하위 카테고리가 있는 카테고리는 삭제할 수 없습니다.'
    return
  }

  const confirmed = await dialog.confirm(
    preferences.language === 'ko'
      ? `'${targetCategory.categoryName}' 카테고리를 삭제하시겠습니까?`
      : `Delete '${targetCategory.categoryName}' category?`,
  )

  if (!confirmed) return

  const nextSelectedCategoryPublicId = targetCategory.parentCategoryPublicId ?? ''

  try {
    itemCategoryDeleting.value = true
    await deleteItemCategory(targetCategory.publicId)

    itemCategorySuccess.value =
      '카테고리가 삭제되었습니다.'

    cancelCategoryEdit()
    await loadItemCategories()
    selectedCategoryPublicId.value = nextSelectedCategoryPublicId
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      ('카테고리 삭제에 실패했습니다.')
  } finally {
    itemCategoryDeleting.value = false
  }
}

async function submitItemCategory() {
  itemCategoryError.value = ''
  itemCategorySuccess.value = ''

  if (!itemCategoryForm.categoryName.trim()) {
    itemCategoryError.value =
      '카테고리명을 입력해 주세요.'
    return
  }

  if (itemCategoryForm.sortOrder < 0) {
    itemCategoryError.value =
      '정렬 순서는 0 이상이어야 합니다.'
    return
  }

  try {
    itemCategorySubmitting.value = true

    const savedCategory = await createItemCategory({
      parentCategoryPublicId: selectedCategoryPublicId.value || undefined,
      categoryName: itemCategoryForm.categoryName.trim(),
      sortOrder: itemCategoryForm.sortOrder,
    } satisfies CreateItemCategoryRequestDto)

    itemCategorySuccess.value =
      '카테고리가 등록되었습니다.'

    resetCategoryForm()
    await loadItemCategories()
    selectCategoryNode(savedCategory.publicId)
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      ('카테고리 등록에 실패했습니다.')
  } finally {
    itemCategorySubmitting.value = false
  }
}

async function loadCertificateTypes() {
  try {
    certificateTypesLoading.value = true
    certificateTypeError.value = ''

    const response = await getCertificateTypes()

    certificateTypes.value = [...response].sort((left, right) => {
      const leftName = left.certificateName ?? left.name ?? ''
      const rightName = right.certificateName ?? right.name ?? ''
      return leftName.localeCompare(
        rightName,
        'ko-KR',
      )
    })
    certificateTypesLoaded.value = true
  } catch (error: any) {
    certificateTypeError.value =
      error?.payload?.message ||
      error?.message ||
      ('인증 분류 목록을 불러오지 못했습니다.')
  } finally {
    certificateTypesLoading.value = false
  }
}

function resetCertificateTypeForm() {
  selectedCertificatePresetCode.value = ''
  certificateTypeForm.certificateCode = ''
  certificateTypeForm.certificateName = ''
  certificateTypeForm.issuerName = ''
  certificateTypeForm.scopeType = 'SUPPLIER_COMMON'
  certificateTypeForm.requiredYn = false
  certificateTypeForm.activeYn = true
}

function fillCertificateTypeForm(type: CertificateTypeResponseDto) {
  selectedCertificatePresetCode.value = ''
  certificateTypeForm.certificateCode = type.certificateCode || ''
  certificateTypeForm.certificateName = formatCertificateTypeName(type) === '-' ? '' : formatCertificateTypeName(type)
  certificateTypeForm.issuerName = type.issuerName || ''
  certificateTypeForm.scopeType = getCertificateScopeOption(type.scopeType) ? type.scopeType || 'SUPPLIER_COMMON' : 'SUPPLIER_COMMON'
  certificateTypeForm.requiredYn = !!type.requiredYn
  certificateTypeForm.activeYn = type.activeYn !== false
}

function openCreateCertificateTypeEditor() {
  certificateTypeError.value = ''
  certificateTypeSuccess.value = ''
  editingCertificateTypePublicId.value = ''
  resetCertificateTypeForm()
  isCertificateTypeEditorOpen.value = true
}

function selectCertificateTypeForDetail(publicId: string) {
  selectedCertificateTypePublicId.value = publicId

  if (isCertificateTypeEditorOpen.value) {
    editingCertificateTypePublicId.value = ''
    isCertificateTypeEditorOpen.value = false
    resetCertificateTypeForm()
  }
}

function openEditCertificateTypeEditor() {
  const targetType = selectedCertificateType.value
  if (!targetType) return

  certificateTypeError.value = ''
  certificateTypeSuccess.value = ''
  editingCertificateTypePublicId.value = targetType.publicId
  fillCertificateTypeForm(targetType)
  isCertificateTypeEditorOpen.value = true
}

function closeCertificateTypeEditor() {
  certificateTypeError.value = ''
  certificateTypeSuccess.value = ''
  editingCertificateTypePublicId.value = ''
  isCertificateTypeEditorOpen.value = false
  resetCertificateTypeForm()
}

async function submitCertificateType() {
  certificateTypeError.value = ''
  certificateTypeSuccess.value = ''

  if (!certificateTypeForm.certificateCode.trim() || !certificateTypeForm.certificateName.trim()) {
    certificateTypeError.value =
      '인증 코드와 인증명을 입력해 주세요.'
    return
  }

  try {
    certificateTypeSubmitting.value = true

    const targetType = editingCertificateType.value

    if (targetType) {
      const updated = await updateCertificateType(targetType.publicId, {
        certificateName: certificateTypeForm.certificateName.trim(),
        issuerName: certificateTypeForm.issuerName?.trim() || undefined,
        scopeType: certificateTypeForm.scopeType,
        requiredYn: certificateTypeForm.requiredYn,
        activeYn: certificateTypeForm.activeYn,
      })

      certificateTypes.value = certificateTypes.value.map((type) =>
        type.publicId === updated.publicId ? updated : type,
      )

      certificateTypeSuccess.value = certificateTypeCopy.value.updateSuccess
      selectedCertificateTypePublicId.value = updated.publicId
      editingCertificateTypePublicId.value = updated.publicId
      fillCertificateTypeForm(updated)
      return
    }

    const savedType = await createCertificateType({
      certificateCode: certificateTypeForm.certificateCode.trim(),
      certificateName: certificateTypeForm.certificateName.trim(),
      issuerName: certificateTypeForm.issuerName?.trim() || undefined,
      scopeType: certificateTypeForm.scopeType,
      requiredYn: certificateTypeForm.requiredYn,
      activeYn: certificateTypeForm.activeYn,
    })

    certificateTypeSuccess.value =
      '인증 분류가 등록되었습니다.'

    resetCertificateTypeForm()
    await loadCertificateTypes()
    selectedCertificateTypePublicId.value = savedType.publicId
    isCertificateTypeEditorOpen.value = false
  } catch (error: any) {
    certificateTypeError.value =
      error?.payload?.message ||
      error?.message ||
      (editingCertificateType.value
        ? certificateTypeCopy.value.updateFailed
        : '인증 분류 등록에 실패했습니다.')
  } finally {
    certificateTypeSubmitting.value = false
  }
}

async function submitCertificateTypeStatusUpdate(activeYn: boolean) {
  const targetType = selectedCertificateType.value
  if (!targetType) return

  certificateTypeError.value = ''
  certificateTypeSuccess.value = ''

  try {
    certificateTypeStatusUpdating.value = true

    const updated = await updateCertificateType(targetType.publicId, {
      certificateName: formatCertificateTypeName(targetType),
      issuerName: targetType.issuerName || undefined,
      scopeType: targetType.scopeType,
      requiredYn: targetType.requiredYn,
      activeYn,
    })

    certificateTypes.value = certificateTypes.value.map((type) =>
      type.publicId === updated.publicId ? updated : type,
    )

    certificateTypeSuccess.value = activeYn
      ? certificateTypeCopy.value.activateSuccess
      : certificateTypeCopy.value.deactivateSuccess
  } catch (error: any) {
    certificateTypeError.value =
      error?.payload?.message ||
      error?.message ||
      certificateTypeCopy.value.statusUpdateFailed
  } finally {
    certificateTypeStatusUpdating.value = false
  }
}

watch(
  activeTab,
  (tab) => {
    // 카테고리 탭에 처음 들어갈 때만 목록을 읽습니다.
    if (tab === 'categories' && !itemCategoriesLoaded.value) {
      void loadItemCategories()
    }

    if (tab === 'certificateTypes' && !certificateTypesLoaded.value) {
      void loadCertificateTypes()
    }

    // 사용자 탭에 들어갈 때마다 조직 드롭다운 목록을 새로 읽습니다.
    if (tab === 'users') {
      void loadOrganizationOptions()
    }
  },
  { immediate: true },
)


watch(itemCategories, (categories) => {
  if (
    editingCategoryPublicId.value &&
    !categories.some((category) => category.publicId === editingCategoryPublicId.value)
  ) {
    cancelCategoryEdit()
  }

  if (
    selectedCategoryPublicId.value &&
    !categories.some((category) => category.publicId === selectedCategoryPublicId.value)
  ) {
    selectedCategoryPublicId.value = ''
  }
})

watch(selectedCategoryPublicId, (categoryPublicId) => {
  if (!categoryPublicId) {
    cancelCategoryEdit()
    return
  }

  if (editingCategoryPublicId.value && editingCategoryPublicId.value !== categoryPublicId) {
    cancelCategoryEdit()
  }

  expandCategoryAncestors(categoryPublicId)
})

watch(certificateTypes, (types) => {
  if (certificateTypePage.value >= certificateTypeTotalPages.value) {
    certificateTypePage.value = Math.max(certificateTypeTotalPages.value - 1, 0)
  }

  if (
    selectedCertificateTypePublicId.value &&
    !types.some((type) => type.publicId === selectedCertificateTypePublicId.value)
  ) {
    selectedCertificateTypePublicId.value = ''
  }

  if (
    editingCertificateTypePublicId.value &&
    !types.some((type) => type.publicId === editingCertificateTypePublicId.value)
  ) {
    editingCertificateTypePublicId.value = ''
    isCertificateTypeEditorOpen.value = false
    resetCertificateTypeForm()
  }
})
async function submitOrganization() {
  // 이전 에러와 성공 문구를 먼저 비웁니다.
  organizationCreateError.value = ''
  organizationCreateSuccess.value = ''

  // 조직 생성에 필요한 필수값이 모두 들어왔는지 먼저 확인합니다.
  if (
    !organizationForm.organizationName ||
    !organizationForm.organizationEnglishName ||
    !organizationForm.businessNo ||
    !organizationForm.contactFirstName ||
    !organizationForm.organizationAlias ||
    !organizationForm.contactLastName ||
    !organizationForm.contactEmail ||
    !organizationForm.contactPhone
  ) {
    organizationCreateError.value =
      '조직 생성에 필요한 항목을 모두 입력해 주세요.'
    return
  }

  // 담당자 연락처 형식도 같이 확인합니다.
  if (!organizationContactPhoneValid.value) {
    organizationCreateError.value =
      '담당자 연락처 형식이 올바르지 않습니다.'
    return
  }

  try {
    isCreatingOrganization.value = true

    // 조직 코드는 앞뒤 공백을 제거하고 대문자로 맞춥니다.
    const normalizedAlias = organizationForm.organizationAlias.trim().toUpperCase()

    // 1. 먼저 조직을 생성합니다.
    const response = await createOrganization({
      organizationType: organizationForm.organizationType,
      organizationName: organizationForm.organizationName.trim(),
      organizationEnglishName: organizationForm.organizationEnglishName.trim(),
      organizationAlias: normalizedAlias,
      businessNo: organizationForm.businessNo.trim(),
      contactFirstName: organizationForm.contactFirstName.trim(),
      contactMiddleName: organizationForm.contactMiddleName.trim(),
      contactLastName: organizationForm.contactLastName.trim(),
      contactEmail: organizationForm.contactEmail.trim(),
      contactPhone: organizationForm.contactPhone.trim(),
    })

    // 방금 만든 조직의 공개 ID를 저장합니다.
    createdOrganizationPublicId.value = response.organizationPublicId

    // 사용자 생성 드롭다운에서도 바로 선택되게 맞춥니다.
    selectedOrganizationPublicId.value = response.organizationPublicId

    // 2. 조직 타입이 협력사면 협력사 생성 API도 이어서 호출합니다.
    if (organizationForm.organizationType === 'SUPPLIER') {
      try {
        // 협력사 담당자 이름은 이름/중간이름/성을 이어서 만듭니다.
        const primaryContactName = [
          organizationForm.contactFirstName,
          organizationForm.contactMiddleName,
          organizationForm.contactLastName,
        ]
          .filter((value) => value && value.trim())
          .join(' ')

        await createSupplier({
          // 방금 생성한 조직과 협력사를 연결하기 위한 공개 ID 입니다.
          organizationPublicId: response.organizationPublicId,

          // 협력사 코드는 조직 코드(alias)를 그대로 사용합니다.
          supplierCode: normalizedAlias,

          // 협력사 이름은 조직명을 그대로 사용합니다.
          supplierName: organizationForm.organizationName.trim(),

          // 대표 연락 담당자 이름입니다.
          primaryContactName,

          // 대표 연락 담당자 이메일입니다.
          primaryContactEmail: organizationForm.contactEmail.trim(),

          // 대표 연락 담당자 연락처입니다.
          primaryContactPhone: organizationForm.contactPhone.trim(),
        })
      } catch (supplierError: any) {
        // 협력사 생성이 왜 실패했는지 콘솔에도 같이 남깁니다.
        console.error('협력사 생성 실패', supplierError)

        organizationCreateError.value =
          supplierError?.payload?.message ||
          supplierError?.message ||
          ('조직은 생성됐지만 협력사 생성은 실패했습니다.')

        return
      }
    }

    // 조직 타입에 따라 성공 문구를 다르게 보여줍니다.
    organizationCreateSuccess.value =
      preferences.language === 'ko'
        ? organizationForm.organizationType === 'SUPPLIER'
          ? '조직과 협력사가 함께 생성되었습니다.'
          : '조직이 생성되었습니다.'
        : organizationForm.organizationType === 'SUPPLIER'
          ? 'Organization and supplier have been created.'
          : 'Organization created.'

    // 새 조직이 추가됐으니 조직 목록을 다시 읽습니다.
    await loadOrganizationOptions()

    // 조직 생성 후 초기 조직 관리자 생성 영역 메시지는 초기화합니다.
    orgAdminCreateError.value = ''
    orgAdminCreateSuccess.value = ''
    createdOrgAdminLoginId.value = ''
    createdOrgAdminTempPassword.value = ''
  } catch (error: any) {
    console.error('조직 생성 실패', error)

    organizationCreateError.value =
      error?.payload?.message ||
      error?.message ||
      ('조직 생성에 실패했습니다.')
  } finally {
    isCreatingOrganization.value = false
  }
}


// 관리자 사용자 생성용 조직 목록을 불러옵니다.
async function loadOrganizationOptions() {
  try {
    isLoadingOrganizationOptions.value = true

    const response = await getOrganizations({
      page: 0,
      size: 100,
    })

    // 화면에는 조직명만 보이게 하지만,
    // 내부적으로는 publicId를 value로 씁니다.
    organizationOptions.value = [...response.content].sort((a, b) =>
      a.organizationName.localeCompare(
        b.organizationName,
        'ko-KR',
      ),
    )
  } finally {
    isLoadingOrganizationOptions.value = false
  }
}


async function submitInitialOrgAdmin() {
  orgAdminCreateError.value = ''
  orgAdminCreateSuccess.value = ''
  createdOrgAdminLoginId.value = ''
  createdOrgAdminTempPassword.value = ''

if (!selectedOrganizationPublicId.value) {

    orgAdminCreateError.value =
      '조직을 선택해 주세요.'
    return
  }

  if (
    !initialOrgAdminForm.firstName ||
    !initialOrgAdminForm.lastName ||
    !initialOrgAdminForm.email ||
    !initialOrgAdminForm.phone
  ) {
    orgAdminCreateError.value =
      '최초 관리자 생성에 필요한 항목을 모두 입력해 주세요.'
    return
  }

  if (!initialOrgAdminPhoneValid.value) {
    orgAdminCreateError.value =
      '연락처 형식이 올바르지 않습니다.'
    return
  }

  try {
    isCreatingOrgAdmin.value = true

    const response = await createInitialOrgAdmin(selectedOrganizationPublicId.value, {

      firstName: initialOrgAdminForm.firstName,
      middleName: initialOrgAdminForm.middleName,
      lastName: initialOrgAdminForm.lastName,
      email: initialOrgAdminForm.email,
      phone: initialOrgAdminForm.phone,
      jobTitle: initialOrgAdminForm.jobTitle,
    })

    createdOrgAdminLoginId.value = response.loginId
    createdOrgAdminTempPassword.value = response.temporaryPassword
    orgAdminCreateSuccess.value =
      '최초 조직 관리자 계정이 생성되었습니다.'
  } catch (error: any) {
    orgAdminCreateError.value =
      error?.payload?.message ||
      ('최초 관리자 생성에 실패했습니다.')
  } finally {
    isCreatingOrgAdmin.value = false
  }
}
</script>

<template>
  <section class="app-screen settings-page">
    <header class="settings-page__header">
      <div>
        <div class="settings-page__eyebrow">{{ content.eyebrow }}</div>
        <h2 class="settings-page__title">{{ content.title }}</h2>
      </div>
    </header>

    <nav class="settings-page__tabs" aria-label="settings tabs">
      <button
        v-for="tab in tabEntries"
        :key="tab.key"
        :class="['settings-page__tab', { 'is-active': activeTab === tab.key }]"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </nav>

    <section v-if="activeTab === 'organization'" class="settings-page__panel settings-page__panel--organization">
      <OrganizationManagementPage />
    </section>

    <section v-else-if="activeTab === 'users'" class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">ORG ADMIN</div>
              <h3>{{ '최초 조직 관리자 생성' }}</h3>
            </div>
          </div>

          <div class="settings-form">
            <label>
  <span>{{ '대상 조직' }}</span>

  <select v-model="selectedOrganizationPublicId">
    <option value="">
      {{
        isLoadingOrganizationOptions
          ? ('조직 목록 불러오는 중...')
          : ('조직을 선택하세요.')
      }}
    </option>

    <option
      v-for="organization in organizationOptions"
      :key="organization.organizationPublicId"
      :value="organization.organizationPublicId"
    >
      {{ organization.organizationName }}
    </option>
  </select>
</label>


            <label>
              <span>{{ '이름' }}</span>
              <input v-model="initialOrgAdminForm.firstName" type="text" />
            </label>

            <label>
              <span>{{ '중간이름 (선택)' }}</span>
              <input v-model="initialOrgAdminForm.middleName" type="text" />
            </label>

            <label>
              <span>{{ '성' }}</span>
              <input v-model="initialOrgAdminForm.lastName" type="text" />
            </label>

            <label>
              <span>{{ '이메일' }}</span>
              <input v-model="initialOrgAdminForm.email" type="email" />
            </label>

            <label>
              <span>{{ '연락처' }}</span>
              <PhoneField
                v-model="initialOrgAdminForm.phone"
                v-model:valid="initialOrgAdminPhoneValid"
                :language="preferences.language"
              />
            </label>

            <label>
              <span>{{ '직책' }}</span>
              <input v-model="initialOrgAdminForm.jobTitle" type="text" />
            </label>

            <div v-if="orgAdminCreateError" class="login-error">
              {{ orgAdminCreateError }}
            </div>

            <div v-if="orgAdminCreateSuccess" class="login-hint">
              {{ orgAdminCreateSuccess }}
            </div>

            <div v-if="createdOrgAdminLoginId || createdOrgAdminTempPassword" class="page-feed">
              <div v-if="createdOrgAdminLoginId" class="page-feed__item">
                <span class="page-feed__label">
                  {{ '자동 생성 로그인 ID' }}
                </span>
                <strong class="page-feed__text">{{ createdOrgAdminLoginId }}</strong>
              </div>

              <div v-if="createdOrgAdminTempPassword" class="page-feed__item">
                <span class="page-feed__label">
                  {{ '임시 비밀번호' }}
                </span>
                <strong class="page-feed__text">{{ createdOrgAdminTempPassword }}</strong>
              </div>
            </div>

            <button
              class="page-button page-button--primary"
              type="button"
              :disabled="isCreatingOrgAdmin || !selectedOrganizationPublicId"

              @click="submitInitialOrgAdmin"
            >
              {{
                isCreatingOrgAdmin
                  ? ('생성 중...')
                  : ('조직 관리자 생성')
              }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'categories'" class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ categoryCopy.structureEyebrow }}</div>
              <h3>{{ categoryCopy.structureTitle }}</h3>
              <p class="settings-page__copy">{{ categoryCopy.structureDescription }}</p>
            </div>
          </div>

          <div class="settings-category__tree">
            <div
              :class="['settings-category__node', 'is-root', { 'is-active': !selectedCategoryPublicId }]"
            >
              <span class="settings-category__node-toggle settings-category__node-toggle--spacer"></span>
              <button
                class="settings-category__node-main"
                type="button"
                @click="selectedCategoryPublicId = ''"
              >
                <span class="settings-category__node-ribbon"></span>
                <span class="settings-category__node-copy">
                  <strong>{{ categoryCopy.rootLabel }}</strong>
                  <span>{{ categoryCopy.rootDescription }}</span>
                </span>
              </button>
            </div>

            <div v-if="itemCategoriesLoading && !categoryTreeNodes.length" class="page-feed">
              <div class="page-feed__item">
                <span class="page-feed__label">{{ '로딩 중' }}</span>
                <strong class="page-feed__text">...</strong>
              </div>
            </div>

            <div v-else-if="!categoryTreeNodes.length" class="page-feed">
              <div class="page-feed__item">
                <span class="page-feed__label">{{ categoryCopy.structureTitle }}</span>
                <strong class="page-feed__text">{{ categoryCopy.empty }}</strong>
              </div>
            </div>

            <div
              v-for="category in visibleCategoryNodes"
              :key="category.publicId"
              :class="['settings-category__node', { 'is-active': selectedCategoryPublicId === category.publicId }]"
              :style="{ '--category-level': String(Math.max(category.level - 1, 0)) }"
            >
              <button
                v-if="category.hasChildren"
                :class="['settings-category__node-toggle', { 'is-expanded': isCategoryExpanded(category.publicId) }]"
                type="button"
                :aria-label="isCategoryExpanded(category.publicId) ? 'Collapse category' : 'Expand category'"
                @click="toggleCategoryExpanded(category.publicId)"
              >
                <span aria-hidden="true">›</span>
              </button>
              <span v-else class="settings-category__node-toggle settings-category__node-toggle--spacer"></span>
              <button
                class="settings-category__node-main"
                type="button"
                @click="selectCategoryNode(category.publicId)"
              >
              <span class="settings-category__node-ribbon"></span>
              <span class="settings-category__node-copy">
                <strong>{{ category.categoryName }}</strong>
                <span>{{ category.pathLabel }}</span>
              </span>
              <span class="settings-category__node-status">{{ categoryStatusText(category.status) }}</span>
              </button>
            </div>
          </div>
        </article>

        <article class="page-panel">
  <div class="page-panel__head">
    <div>
      <div class="page-panel__eyebrow">{{ categoryCopy.editorEyebrow }}</div>
      <h3>{{ selectedCategoryNode ? categoryCopy.createChildTitle : categoryCopy.createRootTitle }}</h3>
      <p class="settings-page__copy">{{ categoryCopy.createDescription }}</p>
    </div>
  </div>

  <div class="page-feed settings-category__context">
    <div class="page-feed__item">
      <span class="page-feed__label">{{ categoryCopy.currentParentLabel }}</span>
      <strong class="page-feed__text">{{ selectedParentLabel }}</strong>
    </div>
    <div class="page-feed__item">
      <span class="page-feed__label">{{ categoryCopy.nextLevelLabel }}</span>
      <strong class="page-feed__text">{{ nextCategoryLevel }}</strong>
    </div>
  </div>

  <div v-if="itemCategoryError" class="login-error">
    {{ itemCategoryError }}
  </div>

  <div v-if="itemCategorySuccess" class="login-hint">
    {{ itemCategorySuccess }}
  </div>

  <div
    v-if="isAdminCategoryActor && selectedCategoryNode"
    class="page-feed settings-category__action-summary"
  >
    <div class="page-feed__item">
      <span class="page-feed__label">
        {{ '선택 카테고리' }}
      </span>
      <strong class="page-feed__text">{{ selectedCategoryNode.categoryName }}</strong>
    </div>

    <div class="settings-category__action-buttons">
      <button
        class="page-button page-button--secondary"
        type="button"
        :disabled="itemCategoryUpdating || itemCategoryDeleting"
        @click="startCategoryEdit"
      >
        {{ '수정' }}
      </button>

      <button
        class="page-button page-button--danger"
        type="button"
        :disabled="itemCategoryUpdating || itemCategoryDeleting"
        @click="deleteSelectedCategory"
      >
        {{ '삭제' }}
      </button>
    </div>
  </div>

  <div
    v-if="
      isAdminCategoryActor &&
      selectedCategoryNode &&
      editingCategoryPublicId === selectedCategoryNode.publicId
    "
    class="settings-category__inline-editor"
  >
    <div class="page-panel__head">
      <div>
        <div class="page-panel__eyebrow">CATEGORY EDIT</div>
        <h3>{{ '카테고리 수정' }}</h3>
        <p class="settings-page__copy">
          {{
            '현재 페이지에서 바로 이름과 정렬 순서를 수정합니다.'
          }}
        </p>
      </div>
    </div>

    <div class="settings-form">
    <label>
        <span>{{ '부모 카테고리' }}</span>
        <select v-model="itemCategoryEditForm.parentCategoryPublicId">
          <option
            v-for="option in editableParentCategoryOptions"
            :key="option.publicId || 'root'"
            :value="option.publicId"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <label>
        <span>{{ '카테고리명' }}</span>
        <input v-model="itemCategoryEditForm.categoryName" type="text" maxlength="100" />
      </label>

      <label>
        <span>{{ '정렬 순서' }}</span>
        <input v-model.number="itemCategoryEditForm.sortOrder" type="number" min="0" />
      </label>

      <div class="settings-category__inline-actions">
        <button
          class="page-button page-button--secondary"
          type="button"
          :disabled="itemCategoryUpdating"
          @click="cancelCategoryEdit"
        >
          {{ '취소' }}
        </button>

        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="itemCategoryUpdating"
          @click="submitCategoryEdit"
        >
          {{
            itemCategoryUpdating
              ? ('수정 중...')
              : ('수정 저장')
          }}
        </button>
      </div>
    </div>
  </div>

  <div class="settings-form">
    <label>
      <span>{{ categoryCopy.nameLabel }}</span>
      <input v-model="itemCategoryForm.categoryName" type="text" maxlength="100" />
    </label>

    <button
      class="page-button page-button--primary"
      type="button"
      :disabled="itemCategorySubmitting"
      @click="submitItemCategory"
    >
      {{ selectedCategoryNode ? categoryCopy.submitLabel : categoryCopy.submitRootLabel }}
    </button>
  </div>
</article>

      </div>
    </section>

    <section v-else class="settings-page__panel">
      <div class="settings-page__grid settings-page__grid--certificate-types">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ certificateTypeCopy.listEyebrow }}</div>
              <h3>{{ certificateTypeCopy.listTitle }}</h3>
              <p class="settings-page__copy">{{ certificateTypeCopy.listDescription }}</p>
            </div>
            <button
              class="page-button page-button--primary"
              type="button"
              @click="openCreateCertificateTypeEditor"
            >
              {{ certificateTypeCopy.createLabel }}
            </button>
          </div>

          <div v-if="certificateTypesLoading && !certificateTypes.length" class="page-table__empty">
            {{ '인증 분류를 불러오는 중입니다.' }}
          </div>

          <div v-else-if="!certificateTypes.length" class="page-table__empty">
            {{ certificateTypeCopy.empty }}
          </div>

          <div v-else class="settings-certificate-types__list page-feed">
            <button
              v-for="certificateType in visibleCertificateTypes"
              :key="certificateType.publicId"
              :class="[
                'settings-certificate-types__item',
                'page-feed__item',
                { 'is-active': selectedCertificateTypePublicId === certificateType.publicId },
              ]"
              type="button"
              @click="selectCertificateTypeForDetail(certificateType.publicId)"
            >
              <span class="settings-certificate-types__item-meta">
                {{ formatCertificateScope(certificateType.scopeType) }} ·
                {{ certificateType.activeYn === false ? certificateTypeCopy.inactive : certificateTypeCopy.active }}
              </span>
              <span class="settings-certificate-types__item-title">
                <span class="settings-certificate-types__item-code">{{ certificateType.certificateCode || '-' }}</span>
                <strong>{{ formatCertificateTypeName(certificateType) }}</strong>
              </span>
            </button>
          </div>

          <div v-if="certificateTypeTotalPages > 1" class="settings-certificate-types__pagination">
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="!canMoveCertificateTypePrev"
              @click="moveCertificateTypePage(certificateTypePage - 1)"
            >
              {{ '이전' }}
            </button>
            <strong>
              {{ certificateTypeCurrentPageNumber }} / {{ certificateTypeTotalPages }} ·
              {{ preferences.language === 'ko' ? `총 ${certificateTypes.length}개` : `Total ${certificateTypes.length}` }}
            </strong>
            <button
              class="page-button page-button--secondary"
              type="button"
              :disabled="!canMoveCertificateTypeNext"
              @click="moveCertificateTypePage(certificateTypePage + 1)"
            >
              {{ '다음' }}
            </button>
          </div>
        </article>

        <article class="page-panel">
          <div v-if="!isCertificateTypeEditorOpen" class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ certificateTypeCopy.detailEyebrow }}</div>
              <h3>{{ certificateTypeCopy.detailTitle }}</h3>
              <p class="settings-page__copy">{{ certificateTypeCopy.detailDescription }}</p>
            </div>
          </div>

          <div v-if="certificateTypeError" class="login-error">
            {{ certificateTypeError }}
          </div>

          <div v-if="certificateTypeSuccess" class="login-hint">
            {{ certificateTypeSuccess }}
          </div>

          <div v-if="isCertificateTypeEditorOpen" class="settings-certificate-types__create">
            <div class="page-panel__head">
              <div>
                <div class="page-panel__eyebrow">{{ certificateTypeCopy.formEyebrow }}</div>
                <h3>{{ certificateTypeEditorTitle }}</h3>
                <p class="settings-page__copy">{{ certificateTypeCopy.formDescription }}</p>
              </div>
            </div>

          <div class="settings-form">
            <label>
              <span>{{ certificateTypeCopy.recommendationTitle }}</span>
              <select
                v-model="selectedCertificatePresetCode"
                @change="applySelectedCertificatePreset"
              >
                <option value="">
                  {{
                    '추천 인증을 선택하세요.'
                  }}
                </option>
                <option
                  v-for="type in recommendedCertificateTypes"
                  :key="type.code"
                  :value="type.code"
                >
                  {{ getRecommendedCertificateOptionLabel(type) }}
                </option>
              </select>
            </label>

            <label>
              <span>{{ certificateTypeCopy.codeLabel }}</span>
              <input
                v-model="certificateTypeForm.certificateCode"
                type="text"
                placeholder="ISO-9001"
                maxlength="50"
                :readonly="!!editingCertificateType"
              />
            </label>

            <label>
              <span>{{ certificateTypeCopy.nameLabel }}</span>
              <input v-model="certificateTypeForm.certificateName" type="text" placeholder="품질경영시스템" maxlength="100" />
            </label>

            <label>
              <span>{{ certificateTypeCopy.issuerLabel }}</span>
              <input v-model="certificateTypeForm.issuerName" type="text" placeholder="ISO" maxlength="100" />
            </label>

            <label>
              <span>{{ certificateTypeCopy.scopeLabel }}</span>
              <select v-model="certificateTypeForm.scopeType">
                <option
                  v-for="scope in certificateScopeOptions"
                  :key="scope.value"
                  :value="scope.value"
                >
                  {{ preferences.language === 'ko' ? scope.ko : scope.en }}
                </option>
              </select>
            </label>

            <div class="settings-certificate-types__toggles">
              <label>
                <input v-model="certificateTypeForm.requiredYn" type="checkbox" />
                <span>{{ certificateTypeCopy.requiredLabel }}</span>
              </label>

              <label>
                <input v-model="certificateTypeForm.activeYn" type="checkbox" />
                <span>{{ certificateTypeCopy.activeLabel }}</span>
              </label>
            </div>

            <div class="settings-certificate-types__form-actions">
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="closeCertificateTypeEditor"
              >
                {{ certificateTypeCopy.cancelLabel }}
              </button>
              <button
                class="page-button page-button--primary"
                type="button"
                :disabled="certificateTypeSubmitting"
                @click="submitCertificateType"
              >
                {{
                  certificateTypeSubmitting
                    ? (editingCertificateType ? certificateTypeCopy.updatingLabel : certificateTypeCopy.submittingLabel)
                    : (editingCertificateType ? certificateTypeCopy.updateLabel : certificateTypeCopy.submitLabel)
                }}
              </button>
            </div>
          </div>
          </div>

          <div v-else-if="!selectedCertificateType" class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ certificateTypeCopy.detailTitle }}</span>
              <strong class="page-feed__text">{{ certificateTypeCopy.chooseType }}</strong>
            </div>
          </div>

          <template v-else>
            <div class="settings-certificate-types__detail-hero">
              <span class="material-symbols-outlined">workspace_premium</span>
              <div>
                <span>
                  {{ formatCertificateScope(selectedCertificateType.scopeType) }} ·
                  {{ selectedCertificateType.activeYn === false ? certificateTypeCopy.inactive : certificateTypeCopy.active }}
                </span>
                <strong>{{ formatCertificateTypeName(selectedCertificateType) }}</strong>
              </div>
            </div>

            <div class="settings-certificate-types__detail-list">
              <div>
                <span>{{ certificateTypeCopy.codeLabel }}</span>
                <strong>{{ selectedCertificateType.certificateCode || '-' }}</strong>
              </div>
              <div>
                <span>{{ certificateTypeCopy.nameLabel }}</span>
                <strong>{{ formatCertificateTypeName(selectedCertificateType) }}</strong>
              </div>
              <div>
                <span>{{ certificateTypeCopy.issuerLabel }}</span>
                <strong>{{ selectedCertificateType.issuerName || '-' }}</strong>
              </div>
              <div>
                <span>{{ certificateTypeCopy.scopeLabel }}</span>
                <strong>{{ formatCertificateScope(selectedCertificateType.scopeType) }}</strong>
              </div>
              <div>
                <span>{{ '범위 설명' }}</span>
                <strong>{{ formatCertificateScopeDescription(selectedCertificateType.scopeType) }}</strong>
              </div>
              <div>
                <span>{{ certificateTypeCopy.requiredLabel }}</span>
                <strong>{{ selectedCertificateType.requiredYn ? certificateTypeCopy.yes : certificateTypeCopy.no }}</strong>
              </div>
            </div>

            <div class="settings-certificate-types__detail-actions">
              <button
                class="page-button page-button--secondary"
                type="button"
                @click="openEditCertificateTypeEditor"
              >
                {{ certificateTypeCopy.editLabel }}
              </button>
              <button
                v-if="selectedCertificateType.activeYn === false"
                class="page-button page-button--primary"
                type="button"
                :disabled="certificateTypeStatusUpdating"
                @click="submitCertificateTypeStatusUpdate(true)"
              >
                {{
                  certificateTypeStatusUpdating
                    ? certificateTypeCopy.statusUpdateLabel
                    : certificateTypeCopy.activateLabel
                }}
              </button>
              <button
                v-else
                class="page-button page-button--danger"
                type="button"
                :disabled="certificateTypeStatusUpdating"
                @click="submitCertificateTypeStatusUpdate(false)"
              >
                {{
                  certificateTypeStatusUpdating
                    ? certificateTypeCopy.statusUpdateLabel
                    : certificateTypeCopy.deactivateLabel
                }}
              </button>
            </div>
          </template>
        </article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.settings-page__grid--certificate-types {
  align-items: start;
}

.settings-certificate-types__toggles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.settings-certificate-types__toggles label {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--color-surface-container-high);
  padding: 0 14px;
}

.settings-certificate-types__toggles input {
  width: 16px;
  height: 16px;
}

.settings-certificate-types__toggles span {
  color: var(--color-on-surface);
  font-size: 0.875rem;
  font-weight: 700;
}

.settings-certificate-types__list {
  gap: 12px;
}

.settings-certificate-types__item {
  width: 100%;
  border: 0;
  background: var(--surface-container-lowest, #fff);
  color: var(--color-on-surface);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.15s ease, outline-color 0.15s ease;
}

.settings-certificate-types__item {
  display: grid;
  gap: 7px;
  align-items: center;
  min-height: 96px;
  padding: 18px 22px;
}

.settings-certificate-types__item.is-active {
  background: var(--surface-container-lowest, #fff);
  outline: 0;
}

.settings-certificate-types__item-meta,
.settings-certificate-types__item-code {
  color: var(--color-on-surface-variant);
  font-size: 0.75rem;
  font-style: normal;
  font-weight: 800;
}

.settings-certificate-types__item-title {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 12px;
  white-space: nowrap;
}

.settings-certificate-types__item-title strong {
  font-size: 1.25rem;
  line-height: 1.2;
}

.settings-certificate-types__item-title .settings-certificate-types__item-code {
  color: var(--color-on-surface);
  font-size: 1.25rem;
  line-height: 1.2;
}

.settings-certificate-types__create {
  margin-top: 0;
}

.settings-certificate-types__form-actions {
  display: grid;
  grid-template-columns: minmax(120px, 0.28fr) minmax(0, 1fr);
  gap: 10px;
}

.settings-certificate-types__item:hover {
  background: var(--surface-container-lowest, #fff);
  outline: 1px solid var(--color-outline);
}

.settings-certificate-types__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-top: 20px;
}

.settings-certificate-types__detail-hero {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 20px;
  align-items: center;
  border: 1px solid var(--color-surface-container-high);
  background: var(--color-surface-container-lowest);
  padding: 20px;
}

.settings-certificate-types__detail-hero > .material-symbols-outlined {
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  border: 1px solid var(--color-outline-variant);
  background: var(--color-surface-container-high);
  color: var(--color-on-surface-variant);
  font-size: 3rem;
}

.settings-certificate-types__detail-hero div {
  display: grid;
  gap: 8px;
}

.settings-certificate-types__detail-hero span {
  color: var(--color-on-surface-variant);
  font-size: 0.85rem;
  font-weight: 800;
}

.settings-certificate-types__detail-hero strong {
  font-size: clamp(1.75rem, 4vw, 2.25rem);
  line-height: 1.08;
}

.settings-certificate-types__detail-list {
  display: grid;
  margin-top: 20px;
}

.settings-certificate-types__detail-list > div {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 16px;
  border-bottom: 1px solid var(--color-surface-container-high);
  padding: 16px 0;
}

.settings-certificate-types__detail-list span {
  color: var(--color-on-surface-variant);
  font-size: 0.875rem;
  font-weight: 800;
}

.settings-certificate-types__detail-list strong {
  justify-self: end;
  text-align: right;
}

.settings-certificate-types__detail-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 28px;
}

.settings-certificate-types__detail-actions .page-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 112px;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  margin-top: 0;
  padding: 0 16px;
}

@media (max-width: 720px) {
  .settings-certificate-types__toggles {
    grid-template-columns: 1fr;
  }

  .settings-certificate-types__detail-hero,
  .settings-certificate-types__detail-list > div {
    grid-template-columns: 1fr;
  }

  .settings-certificate-types__item {
    grid-template-columns: 1fr;
  }

  .settings-certificate-types__pagination {
    flex-wrap: wrap;
  }

  .settings-certificate-types__detail-list strong {
    justify-self: start;
    text-align: left;
  }
}
</style>
