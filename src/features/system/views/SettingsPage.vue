<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
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
import { createInitialOrgAdmin } from '../../../services/user'
import PhoneField from '../../../components/forms/PhoneField.vue'

type SettingsTabKey = 'organization' | 'users' | 'categories'

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

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '플랫폼 / 관리',
    title: '플랫폼관리',
    tabs: {
      organization: '조직',
      users: '사용자',
      categories: '카테고리',
    },
    resetLabel: '초기화',
    saveLabel: '저장',
  },
  en: {
    eyebrow: 'Platform / Management',
    title: 'Platform Management',
    tabs: {
      organization: 'Organization',
      users: 'Users',
      categories: 'Categories',
    },
    resetLabel: 'RESET',
    saveLabel: 'SAVE CHANGES',
  },
} as const

const content = computed(() => CONTENT[preferences.language])
const activeTab = ref<SettingsTabKey>('organization')
const tabEntries = computed(() => [
  { key: 'organization' as const, label: content.value.tabs.organization },
  { key: 'users' as const, label: content.value.tabs.users },
  { key: 'categories' as const, label: content.value.tabs.categories },
])

watchEffect(() => {
  header.setActions([
    { key: 'settings-reset', label: content.value.resetLabel, tone: 'secondary' },
    { key: 'settings-save', label: content.value.saveLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})

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
      preferences.language === 'ko' ? 'ko-KR' : 'en-US',
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
      (preferences.language === 'ko'
        ? '카테고리 목록을 불러오지 못했습니다.'
        : 'Failed to load categories.')
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
      preferences.language === 'ko'
        ? '하위 카테고리가 있는 카테고리는 수정할 수 없습니다.'
        : 'Categories with child categories cannot be edited.'
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
      preferences.language === 'ko' ? '카테고리명을 입력해 주세요.' : 'Enter category name.'
    return
  }

  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    itemCategoryError.value =
      preferences.language === 'ko'
        ? '정렬 순서는 0 이상이어야 합니다.'
        : 'Sort order must be 0 or more.'
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
      preferences.language === 'ko' ? '카테고리가 수정되었습니다.' : 'Category updated.'

    await loadItemCategories()
    selectCategoryNode(targetCategory.publicId)
    cancelCategoryEdit()
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      (preferences.language === 'ko'
        ? '카테고리 수정에 실패했습니다.'
        : 'Failed to update category.')
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
      preferences.language === 'ko'
        ? '하위 카테고리가 있는 카테고리는 삭제할 수 없습니다.'
        : 'Categories with child categories cannot be deleted.'
    return
  }

  const confirmed = window.confirm(
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
      preferences.language === 'ko' ? '카테고리가 삭제되었습니다.' : 'Category deleted.'

    cancelCategoryEdit()
    await loadItemCategories()
    selectedCategoryPublicId.value = nextSelectedCategoryPublicId
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      (preferences.language === 'ko'
        ? '카테고리 삭제에 실패했습니다.'
        : 'Failed to delete category.')
  } finally {
    itemCategoryDeleting.value = false
  }
}

async function submitItemCategory() {
  itemCategoryError.value = ''
  itemCategorySuccess.value = ''

  if (!itemCategoryForm.categoryName.trim()) {
    itemCategoryError.value =
      preferences.language === 'ko'
        ? '카테고리명을 입력해 주세요.'
        : 'Enter category name.'
    return
  }

  if (itemCategoryForm.sortOrder < 0) {
    itemCategoryError.value =
      preferences.language === 'ko'
        ? '정렬 순서는 0 이상이어야 합니다.'
        : 'Sort order must be 0 or more.'
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
      preferences.language === 'ko'
        ? '카테고리가 등록되었습니다.'
        : 'Category created.'

    resetCategoryForm()
    await loadItemCategories()
    selectCategoryNode(savedCategory.publicId)
  } catch (error: any) {
    itemCategoryError.value =
      error?.payload?.message ||
      error?.message ||
      (preferences.language === 'ko'
        ? '카테고리 등록에 실패했습니다.'
        : 'Failed to create category.')
  } finally {
    itemCategorySubmitting.value = false
  }
}

watch(
  activeTab,
  (tab) => {
    // 카테고리 탭에 처음 들어갈 때만 목록을 읽습니다.
    if (tab === 'categories' && !itemCategoriesLoaded.value) {
      void loadItemCategories()
    }

    // 사용자 탭에 들어가면 조직 드롭다운 목록을 읽습니다.
    // 이미 읽은 뒤면 또 부르지 않게 길이로 한 번 막습니다.
    if (tab === 'users' && !organizationOptions.value.length) {
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
      preferences.language === 'ko'
        ? '조직 생성에 필요한 항목을 모두 입력해 주세요.'
        : 'Please fill in all required organization fields.'
    return
  }

  // 담당자 연락처 형식도 같이 확인합니다.
  if (!organizationContactPhoneValid.value) {
    organizationCreateError.value =
      preferences.language === 'ko'
        ? '담당자 연락처 형식이 올바르지 않습니다.'
        : 'The contact phone number format is invalid.'
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
          (preferences.language === 'ko'
            ? '조직은 생성됐지만 협력사 생성은 실패했습니다.'
            : 'Organization was created, but supplier creation failed.')

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
      (preferences.language === 'ko'
        ? '조직 생성에 실패했습니다.'
        : 'Failed to create organization.')
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
        preferences.language === 'ko' ? 'ko-KR' : 'en-US',
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
      preferences.language === 'ko'
        ? '조직을 선택해 주세요.'
: 'Please select an organization.'
    return
  }

  if (
    !initialOrgAdminForm.firstName ||
    !initialOrgAdminForm.lastName ||
    !initialOrgAdminForm.email ||
    !initialOrgAdminForm.phone
  ) {
    orgAdminCreateError.value =
      preferences.language === 'ko'
        ? '최초 관리자 생성에 필요한 항목을 모두 입력해 주세요.'
        : 'Please fill in all required admin fields.'
    return
  }

  if (!initialOrgAdminPhoneValid.value) {
    orgAdminCreateError.value =
      preferences.language === 'ko'
        ? '연락처 형식이 올바르지 않습니다.'
        : 'The phone number format is invalid.'
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
      preferences.language === 'ko'
        ? '최초 조직 관리자 계정이 생성되었습니다.'
        : 'Initial organization admin account has been created.'
  } catch (error: any) {
    orgAdminCreateError.value =
      error?.payload?.message ||
      (preferences.language === 'ko'
        ? '최초 관리자 생성에 실패했습니다.'
        : 'Failed to create the initial organization admin.')
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

      <div class="design-trigger-row">
        <button class="page-button page-button--secondary" type="button">
          {{ content.resetLabel }}
        </button>
        <button class="page-button page-button--primary" type="button">
          {{ content.saveLabel }}
        </button>
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

    <section v-if="activeTab === 'organization'" class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">ORG CREATE</div>
              <h3>{{ preferences.language === 'ko' ? '조직 생성' : 'Create Organization' }}</h3>
            </div>
          </div>

          <div class="settings-form">
            <label>
              <span>{{ preferences.language === 'ko' ? '조직 유형' : 'Organization Type' }}</span>
              <select v-model="organizationForm.organizationType">
                <option value="BUYER">{{ preferences.language === 'ko' ? '발주사' : 'BUYER' }}</option>
                <option value="SUPPLIER">{{ preferences.language === 'ko' ? '협력사' : 'SUPPLIER' }}</option>
              </select>
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '조직명' : 'Organization Name' }}</span>
              <input v-model="organizationForm.organizationName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '조직 영문명' : 'Organization English Name' }}</span>
              <input v-model="organizationForm.organizationEnglishName" type="text" />
            </label>
            <label>
  <span>{{ preferences.language === 'ko' ? '조직 코드' : 'Organization Code' }}</span>

  <!-- 백엔드 규칙:
       영문 대문자/숫자만, 2~10자 -->
  <input
    v-model="organizationForm.organizationAlias"
    type="text"
    maxlength="10"
    placeholder="예: ATLAS1"
  />
</label>


            <label>
              <span>{{ preferences.language === 'ko' ? '사업자번호' : 'Business No' }}</span>
              <input v-model="organizationForm.businessNo" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '담당자 이름' : 'Contact First Name' }}</span>
              <input v-model="organizationForm.contactFirstName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '담당자 중간이름 (선택)' : 'Contact Middle Name (OPTIONAL)' }}</span>
              <input v-model="organizationForm.contactMiddleName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '담당자 성' : 'Contact Last Name' }}</span>
              <input v-model="organizationForm.contactLastName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '담당자 이메일' : 'Contact Email' }}</span>
              <input v-model="organizationForm.contactEmail" type="email" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '담당자 연락처' : 'Contact Phone' }}</span>
              <PhoneField
                v-model="organizationForm.contactPhone"
                v-model:valid="organizationContactPhoneValid"
                :language="preferences.language"
              />
            </label>

            <div v-if="organizationCreateError" class="login-error">
              {{ organizationCreateError }}
            </div>

            <div v-if="organizationCreateSuccess" class="login-hint">
              {{ organizationCreateSuccess }}
            </div>

            <button
              class="page-button page-button--primary"
              type="button"
              :disabled="isCreatingOrganization"
              @click="submitOrganization"
            >
              {{
                isCreatingOrganization
                  ? (preferences.language === 'ko' ? '생성 중...' : 'Creating...')
                  : (preferences.language === 'ko' ? '조직 생성' : 'Create Organization')
              }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'users'" class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">ORG ADMIN</div>
              <h3>{{ preferences.language === 'ko' ? '최초 조직 관리자 생성' : 'Create Initial Org Admin' }}</h3>
            </div>
          </div>

          <div class="settings-form">
            <label>
  <span>{{ preferences.language === 'ko' ? '대상 조직' : 'Target Organization' }}</span>

  <select v-model="selectedOrganizationPublicId">
    <option value="">
      {{
        isLoadingOrganizationOptions
          ? (preferences.language === 'ko' ? '조직 목록 불러오는 중...' : 'Loading organizations...')
          : (preferences.language === 'ko' ? '조직을 선택하세요.' : 'Select an organization.')
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
              <span>{{ preferences.language === 'ko' ? '이름' : 'First Name' }}</span>
              <input v-model="initialOrgAdminForm.firstName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '중간이름 (선택)' : 'Middle Name (OPTIONAL)' }}</span>
              <input v-model="initialOrgAdminForm.middleName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '성' : 'Last Name' }}</span>
              <input v-model="initialOrgAdminForm.lastName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '이메일' : 'Email' }}</span>
              <input v-model="initialOrgAdminForm.email" type="email" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '연락처' : 'Phone' }}</span>
              <PhoneField
                v-model="initialOrgAdminForm.phone"
                v-model:valid="initialOrgAdminPhoneValid"
                :language="preferences.language"
              />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '직책' : 'Job Title' }}</span>
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
                  {{ preferences.language === 'ko' ? '자동 생성 로그인 ID' : 'Generated Login ID' }}
                </span>
                <strong class="page-feed__text">{{ createdOrgAdminLoginId }}</strong>
              </div>

              <div v-if="createdOrgAdminTempPassword" class="page-feed__item">
                <span class="page-feed__label">
                  {{ preferences.language === 'ko' ? '임시 비밀번호' : 'Temporary Password' }}
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
                  ? (preferences.language === 'ko' ? '생성 중...' : 'Creating...')
                  : (preferences.language === 'ko' ? '조직 관리자 생성' : 'Create Org Admin')
              }}
            </button>
          </div>
        </article>
      </div>
    </section>

    <section v-else class="settings-page__panel">
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
                <span class="page-feed__label">{{ preferences.language === 'ko' ? '로딩 중' : 'Loading' }}</span>
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
        {{ preferences.language === 'ko' ? '선택 카테고리' : 'Selected Category' }}
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
        {{ preferences.language === 'ko' ? '수정' : 'Edit' }}
      </button>

      <button
        class="page-button page-button--danger"
        type="button"
        :disabled="itemCategoryUpdating || itemCategoryDeleting"
        @click="deleteSelectedCategory"
      >
        {{ preferences.language === 'ko' ? '삭제' : 'Delete' }}
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
        <h3>{{ preferences.language === 'ko' ? '카테고리 수정' : 'Edit Category' }}</h3>
        <p class="settings-page__copy">
          {{
            preferences.language === 'ko'
              ? '현재 페이지에서 바로 이름과 정렬 순서를 수정합니다.'
              : 'Update the category name and sort order inline.'
          }}
        </p>
      </div>
    </div>

    <div class="settings-form">
    <label>
        <span>{{ preferences.language === 'ko' ? '부모 카테고리' : 'Parent Category' }}</span>
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
        <span>{{ preferences.language === 'ko' ? '카테고리명' : 'Category Name' }}</span>
        <input v-model="itemCategoryEditForm.categoryName" type="text" maxlength="100" />
      </label>

      <label>
        <span>{{ preferences.language === 'ko' ? '정렬 순서' : 'Sort Order' }}</span>
        <input v-model.number="itemCategoryEditForm.sortOrder" type="number" min="0" />
      </label>

      <div class="settings-category__inline-actions">
        <button
          class="page-button page-button--secondary"
          type="button"
          :disabled="itemCategoryUpdating"
          @click="cancelCategoryEdit"
        >
          {{ preferences.language === 'ko' ? '취소' : 'Cancel' }}
        </button>

        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="itemCategoryUpdating"
          @click="submitCategoryEdit"
        >
          {{
            itemCategoryUpdating
              ? (preferences.language === 'ko' ? '수정 중...' : 'Updating...')
              : (preferences.language === 'ko' ? '수정 저장' : 'Save Changes')
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
  </section>
</template>
