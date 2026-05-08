<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import PhoneField from '../../../components/forms/PhoneField.vue'
import { useActorScope } from '../../../composables/useActorScope'
import {
  createOrganization,
  getMyOrganizationDetail,
  getOrganizationDetail,
  getOrganizationSupplySummary,
  getOrganizations,
  updateOrganization,
  updateOrganizationStatus,
  type CreateOrganizationPayload,
  type OrganizationDetailResponse,
  type OrganizationListItem,
  type OrganizationStatus,
} from '../../../services/organization'
import { createSupplier } from '../../../services/supplier'
import {
  createOrganizationUser, // 사원 직접 등록 API라서 그대로 둡니다.
  getDepartments,
  getUsers,
  type CreateOrganizationUserPayload,
  type DepartmentOption,
  uploadOrganizationUsersExcel,
  type OrganizationUserExcelUploadResponse,
  type UserListItem,
} from '../../../services/user'

import { uploadAttachment } from '../../../services/file'
import { useAtlasDialogStore } from '../../../stores/dialog'
import { useAtlasNavigationStore } from '../../../stores/navigation'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const route = useRoute()

// 화면에서 여러 사원을 한 번에 입력할 때 사용하는 행 데이터입니다.
type CreateMemberRow = CreateOrganizationUserPayload & {
  rowId: string
  loginId?: string
  temporaryPassword?: string
  success?: boolean
  errorMessage?: string
}

// 조직관리 내부 탭 종류입니다.
type OrganizationManagementTabKey = 'organization' | 'members'

// 사원관리 탭 내부 서브탭입니다.
type MemberSubTabKey = 'add' | 'excel' | 'list'

// 오른쪽 패널이 상세보기인지 신규 생성인지 구분합니다.
type OrganizationPanelMode = 'detail' | 'create'

// 생성 화면에서는 주소 입력값을 항상 문자열로 들고 있어야 합니다.
type OrganizationCreateForm = Omit<
  CreateOrganizationPayload,
  'contactMiddleName' | 'address' | 'addressDetail' | 'zipCode'
> & {
  contactMiddleName: string
  address: string
  addressDetail: string
  zipCode: string
}

// 현재 언어 설정을 읽습니다.
const preferences = useAtlasPreferencesStore()
const dialog = useAtlasDialogStore()

// 페이지 이동에 사용합니다.
const navigation = useAtlasNavigationStore()

// 현재 로그인한 사용자의 역할 정보를 읽습니다.
const actor = useActorScope()

// 이 페이지는 플랫폼 관리자와 조직 대표자만 볼 수 있습니다.
const canManageOrganization = computed(() => {
  return actor.isAdminRole.value || actor.isOrgAdminRole.value
})

// 플랫폼 관리자 여부입니다.
const isAdminManager = computed(() => actor.isAdminRole.value)

// 조직 대표자 여부입니다.
const isOrgAdminManager = computed(() => actor.isOrgAdminRole.value)

// 조직 수정은 조직 대표자만 할 수 있습니다.
const canEditOrganization = computed(() => actor.isOrgAdminRole.value)

// 조직 상태 변경은 플랫폼 관리자와 조직 대표자 모두 가능합니다.
const canChangeOrganizationStatus = computed(() => {
  return actor.isAdminRole.value || actor.isOrgAdminRole.value
})

// 조직 삭제는 플랫폼 관리자만 가능합니다.
const canDeleteOrganization = computed(() => actor.isAdminRole.value)

// 조직관리 페이지 안에서 현재 어떤 탭을 보고 있는지 저장합니다.
const activeTab = ref<OrganizationManagementTabKey>('organization')

// 사원관리 탭 내부 서브탭입니다.
const activeMemberSubTab = ref<MemberSubTabKey>('add')

// 플랫폼 관리자는 오른쪽 패널에서 상세보기와 생성 폼을 번갈아 봅니다.
const organizationPanelMode = ref<OrganizationPanelMode>('detail')

// 플랫폼 관리자가 보는 조직 목록입니다.
const organizationRows = ref<OrganizationListItem[]>([])

// 조직 목록은 한 페이지에 8개씩 보여줍니다.
const ORGANIZATION_LIST_PAGE_SIZE = 8

// 현재 보고 있는 조직 목록 페이지 번호입니다. 백엔드는 0페이지부터 시작합니다.
const organizationListPage = ref(0)

// 백엔드에서 내려준 전체 조직 개수입니다.
const organizationListTotalElements = ref(0)

// 백엔드에서 내려준 전체 페이지 수입니다.
const organizationListTotalPages = ref(0)

// 화면에는 0페이지가 아니라 1페이지처럼 보여주기 위한 값입니다.
const organizationListCurrentPageNumber = computed(() => {
  return organizationListTotalPages.value === 0 ? 0 : organizationListPage.value + 1
})

// 이전 페이지로 갈 수 있는지 확인합니다.
const canMoveOrganizationListPrev = computed(() => organizationListPage.value > 0)

// 다음 페이지로 갈 수 있는지 확인합니다.
const canMoveOrganizationListNext = computed(() => {
  return organizationListPage.value + 1 < organizationListTotalPages.value
})

// 현재 선택한 조직의 내부 ID 입니다.
const selectedOrganizationId = ref<number | null>(null)

// 오른쪽 상세 패널에 보여줄 조직 상세 정보입니다.
const selectedOrganizationDetail = ref<OrganizationDetailResponse | null>(null)

// 조직 정보를 수정 중인지 표시합니다.
const isEditingOrganization = ref(false)

// 조직 상세에서 보여줄 창고/ESG 파일 집계입니다.
const organizationSupplySummary = reactive({
  warehouseCount: 0,
  esgFileCount: 0,
})

// 조직 집계값 로딩 상태입니다.
const isLoadingOrganizationSupplySummary = ref(false)

// 목록 로딩 상태입니다.
const isLoadingOrganizations = ref(false)

// 첫 조직 목록 로딩이 끝났는지 확인합니다.
const isOrganizationListInitialized = ref(false)

// 상세 로딩 상태입니다.
const isLoadingOrganizationDetail = ref(false)

// 저장 버튼 로딩 상태입니다.
const isSavingOrganization = ref(false)

// 조직 상태 변경 버튼 로딩 상태입니다.
const isUpdatingOrganizationStatus = ref(false)

// 화면 에러 문구입니다.
const pageError = ref('')

// 화면 성공 문구입니다.
const pageSuccess = ref('')

// 연락처 유효성 상태입니다.
const organizationPhoneValid = ref(false)

// 조직 이미지 파일 input을 직접 열기 위한 ref입니다.
const organizationImageInput = ref<HTMLInputElement | null>(null)

// 조직 이미지 업로드 중인지 표시합니다.
const isUploadingOrganizationImage = ref(false)

// 사원 엑셀 업로드 중 상태입니다.
const isUploadingMembers = ref(false)

// 사원 업로드 에러 문구입니다.
const memberUploadError = ref('')

// 사원 업로드 성공 문구입니다.
const memberUploadSuccess = ref('')

// 사원 업로드 결과입니다.
const memberUploadResult = ref<OrganizationUserExcelUploadResponse | null>(null)

// 현재 조직에 등록된 사원 목록입니다.
const memberRows = ref<UserListItem[]>([])

// 사원 목록을 불러오는 중인지 표시합니다.
const isLoadingMembers = ref(false)

// 화면에서 직접 등록할 사원 입력 행 목록입니다.
const createMemberRows = ref<CreateMemberRow[]>([])

// 직접 입력한 사원을 등록하는 중인지 표시합니다.
const isCreatingMembers = ref(false)

// 사원 등록 시 선택할 부서 목록입니다.
const departmentOptions = ref<DepartmentOption[]>([])

// 현재 사원관리 탭에서 관리할 조직 publicId입니다.
const currentManagedOrganizationPublicId = computed(() => {
  if (isOrgAdminManager.value) {
    return actor.organizationPublicId.value
  }

  return selectedOrganizationDetail.value?.organizationPublicId ?? ''
})

// 조직 수정 폼입니다.
const organizationForm = reactive({
  organizationName: '',
  organizationEnglishName: '',
  organizationAlias: '',
  businessNo: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  organizationImageAttachmentPublicId: '',
  organizationImageThumbPath: '',
  address: '',
  addressDetail: '',
  zipCode: '',
})

// 신규 조직 생성 폼입니다.
const organizationCreateForm = reactive<OrganizationCreateForm>({
  organizationType: 'SUPPLIER',
  organizationName: '',
  organizationEnglishName: '',
  organizationAlias: '',
  businessNo: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  address: '',
  addressDetail: '',
  zipCode: '',
})

// 신규 조직 생성 버튼을 중복 클릭하지 못하게 막기 위한 로딩 상태입니다.
const isCreatingOrganization = ref(false)

// 생성 폼의 연락처 유효성 상태입니다.
const organizationCreatePhoneValid = ref(false)

// 생성 폼에서만 보여줄 에러 문구입니다.
const organizationCreateError = ref('')

// 화면에서 반복해서 쓰는 문구입니다.
const copy = computed(() =>
  preferences.language === 'ko'
    ? {
        eyebrow: 'ORGANIZATION',
        title: '조직관리',
        listTitle: '조직 목록',
        listDescription: '플랫폼 관리자는 전체 조직 목록을 보고 상세 정보를 조회할 수 있습니다.',
        myOrganizationDescription: '조직 대표자는 자신의 조직 정보만 수정할 수 있습니다.',
        readOnlyDescription: '플랫폼 관리자는 조직 정보를 조회만 할 수 있습니다.',
        detailTitle: '조직 상세',
        memberTitle: '사원관리',
        memberDescription: '사원을 직접 등록하거나 엑셀 파일로 일괄 등록할 수 있습니다.',
        noPermission: '조직관리 권한이 없습니다.',
        loadingList: '조직 목록을 불러오는 중입니다...',
        loadingDetail: '조직 정보를 불러오는 중입니다...',
        emptyList: '등록된 조직이 없습니다.',
        chooseOrganization: '왼쪽에서 조직을 선택해 주세요.',
        selectButton: '상세보기',
        selectedButton: '선택됨',
        unavailableButton: '상세불가',
        saveButton: '저장',
        savingButton: '저장 중...',
        editButton: '수정',
        cancelButton: '취소',
        createButton: '조직 생성',
        createTitle: '조직 생성',
        createDescription: '새 조직을 등록하면 목록에 바로 반영하고 상세 정보를 이어서 보여줍니다.',
        creatingButton: '생성 중...',
        buyerType: '발주사',
        supplierType: '협력사',
        organizationTab: '조직',
        membersTab: '사원관리',
        memberSubTabAdd: '직접 등록',
        memberSubTabExcel: '엑셀 업로드',
        memberSubTabList: '사원 목록',
        memberExcelFile: '사원 엑셀 파일',
        uploadHint:
          '엑셀 첫 줄 헤더는 firstName, middleName, lastName, email, phone, jobTitle, departmentPublicId 순서여야 합니다.',
        uploadingMembers: '업로드 중...',
        totalCount: '총 건수',
        successCount: '성공 건수',
        failCount: '실패 건수',
        rowNumber: '줄',
        rowResult: '결과',
        loginId: '로그인 ID',
        temporaryPassword: '임시 비밀번호',
        message: '메시지',
        success: '성공',
        fail: '실패',
        organizationType: '조직 유형',
        organizationStatus: '상태',
        organizationName: '조직명',
        organizationEnglishName: '조직 영문명',
        organizationAlias: '조직 코드',
        businessNo: '사업자번호',
        contactFirstName: '담당자 이름',
        contactMiddleName: '담당자 중간이름 (선택)',
        contactLastName: '담당자 성',
        contactEmail: '담당자 이메일',
        contactPhone: '담당자 연락처',
        listPhone: '연락처',
        listEmail: '이메일',
        activateButton: '활성화',
        deactivateButton: '비활성화',
        deleteButton: '삭제',
        updatingStatusButton: '처리 중...',
        activateConfirm: '이 조직을 활성화하시겠습니까? 사용자 계정은 자동 복구되지 않습니다.',
        deactivateConfirm: '이 조직을 비활성화하시겠습니까? 소속 사용자 계정도 함께 비활성화됩니다.',
        deleteConfirm: '이 조직을 삭제 상태로 변경하시겠습니까? 소속 사용자 계정도 함께 삭제 상태가 됩니다.',
        activateSuccess: '조직이 활성화되었습니다.',
        deactivateSuccess: '조직이 비활성화되었습니다.',
        deleteSuccess: '조직이 삭제 상태로 변경되었습니다.',
        statusUpdateFailed: '조직 상태 변경에 실패했습니다.',
        validationRequired:
          '조직명, 영문명, 조직 코드, 담당자 이름, 담당자 성, 연락처는 필수입니다.',
        validationAlias: '조직 코드는 영문 대문자/숫자만 가능하고 2~10자여야 합니다.',
        validationPhone: '담당자 연락처 형식이 올바르지 않습니다.',
        loadListFailed: '조직 목록을 불러오지 못했습니다.',
        loadDetailFailed: '조직 정보를 불러오지 못했습니다.',
        missingOrganizationId: '목록 응답에 organizationId가 없어 상세보기를 할 수 없습니다.',
        saveSuccess: '조직 정보가 수정되었습니다.',
        saveFailed: '조직 정보 수정에 실패했습니다.',
        createSuccess: '조직이 생성되었습니다.',
        createSupplierWarning: '조직은 생성되었지만 협력사 정보 자동 생성에 실패했습니다.',
        createFailed: '조직 생성에 실패했습니다.',
        memberUploadFailed: '사원 엑셀 업로드에 실패했습니다.',
        previousButton: '이전',
        nextButton: '다음',
        memberCount: '사원 수',
        warehouseCount: '창고 수',
        esgFileCount: 'ESG 파일 수',
        address: '주소',
        addressDetail: '상세주소',
        zipCode: '우편번호',
        addMemberRowButton: '+ 사원 추가',
        submitMembersButton: '등록하기',
        submittingMembersButton: '등록 중...',
        removeMemberRowButton: '삭제',
        memberRegisterComplete: '등록 완료',
        memberRegisterValidation: '성, 이름, 이메일, 연락처, 부서는 필수입니다.',
        memberRegisterFailed: '사원 등록에 실패했습니다.',
        memberListEmpty: '등록된 사원이 없습니다.',
        memberListLoading: '사원 목록을 불러오는 중입니다.',
        memberListRefresh: '새로고침',
        paginationTotal: (count: number) => `총 ${count}개`,
      }
    : {
        eyebrow: 'ORGANIZATION',
        title: 'Organization Management',
        listTitle: 'Organization List',
        listDescription: 'Platform admins can review all organizations and view their details.',
        myOrganizationDescription: 'Organization owners can edit only their own organization.',
        readOnlyDescription: 'Platform admins can view organization information only.',
        detailTitle: 'Organization Detail',
        memberTitle: 'Member Management',
        memberDescription: 'Register members directly or upload an Excel file.',
        noPermission: 'You do not have permission to manage organizations.',
        loadingList: 'Loading organizations...',
        loadingDetail: 'Loading organization detail...',
        emptyList: 'No organizations found.',
        chooseOrganization: 'Please choose an organization from the list.',
        selectButton: 'View Detail',
        selectedButton: 'Selected',
        unavailableButton: 'Unavailable',
        saveButton: 'Save',
        savingButton: 'Saving...',
        editButton: 'Edit',
        cancelButton: 'Cancel',
        createButton: 'Create Organization',
        createTitle: 'Create Organization',
        createDescription: 'Create a new organization here, then show it in the list and detail panel.',
        creatingButton: 'Creating...',
        buyerType: 'Buyer',
        supplierType: 'Supplier',
        organizationTab: 'Organization',
        membersTab: 'Members',
        memberSubTabAdd: 'Add Members',
        memberSubTabExcel: 'Excel Upload',
        memberSubTabList: 'Member List',
        memberExcelFile: 'Member Excel File',
        uploadHint:
          'The first excel header row must be firstName, middleName, lastName, email, phone, jobTitle, departmentPublicId.',
        uploadingMembers: 'Uploading...',
        totalCount: 'Total',
        successCount: 'Success',
        failCount: 'Fail',
        rowNumber: 'Row',
        rowResult: 'Result',
        loginId: 'Login ID',
        temporaryPassword: 'Temporary Password',
        message: 'Message',
        success: 'Success',
        fail: 'Fail',
        organizationType: 'Organization Type',
        organizationStatus: 'Status',
        organizationName: 'Organization Name',
        organizationEnglishName: 'Organization English Name',
        organizationAlias: 'Organization Code',
        businessNo: 'Business No',
        contactFirstName: 'Contact First Name',
        contactMiddleName: 'Contact Middle Name (Optional)',
        contactLastName: 'Contact Last Name',
        contactEmail: 'Contact Email',
        contactPhone: 'Contact Phone',
        listPhone: 'Phone',
        listEmail: 'Email',
        activateButton: 'Activate',
        deactivateButton: 'Deactivate',
        deleteButton: 'Delete',
        updatingStatusButton: 'Updating...',
        activateConfirm:
          'Do you want to activate this organization? User accounts are not restored automatically.',
        deactivateConfirm:
          'Do you want to deactivate this organization? Member accounts will also be deactivated.',
        deleteConfirm:
          'Do you want to mark this organization as deleted? Member accounts will also be marked as deleted.',
        activateSuccess: 'Organization activated.',
        deactivateSuccess: 'Organization deactivated.',
        deleteSuccess: 'Organization marked as deleted.',
        statusUpdateFailed: 'Failed to update organization status.',
        validationRequired:
          'Organization name, English name, organization code, contact first name, contact last name, and phone are required.',
        validationAlias:
          'Organization code must be 2 to 10 characters using uppercase letters and numbers only.',
        validationPhone: 'The contact phone number format is invalid.',
        loadListFailed: 'Failed to load organizations.',
        loadDetailFailed: 'Failed to load organization detail.',
        missingOrganizationId:
          'The organization list response does not include organizationId, so detail view is unavailable.',
        saveSuccess: 'Organization information has been updated.',
        saveFailed: 'Failed to update organization information.',
        createSuccess: 'Organization has been created.',
        createSupplierWarning: 'Organization was created, but supplier information could not be created automatically.',
        createFailed: 'Failed to create organization.',
        memberUploadFailed: 'Failed to upload member excel file.',
        previousButton: 'Previous',
        nextButton: 'Next',
        memberCount: 'Members',
        warehouseCount: 'Warehouses',
        esgFileCount: 'ESG Files',
        address: 'Address',
        addressDetail: 'Address Detail',
        zipCode: 'Zip Code',
        addMemberRowButton: '+ Add Member',
        submitMembersButton: 'Register',
        submittingMembersButton: 'Registering...',
        removeMemberRowButton: 'Remove',
        memberRegisterComplete: 'Registered',
        memberRegisterValidation: 'Last name, first name, email, phone, and department are required.',
        memberRegisterFailed: 'Failed to register member.',
        memberListEmpty: 'No members found.',
        memberListLoading: 'Loading members...',
        memberListRefresh: 'Refresh',
        paginationTotal: (count: number) => `Total ${count}`,
      },
)

// 현재 선택된 조직 이름입니다.
const selectedOrganizationLabel = computed(() => {
  return selectedOrganizationDetail.value?.organizationName || '-'
})

// 삭제 상태 조직은 기본 목록에서 숨깁니다.
const visibleOrganizationRows = computed(() => {
  return organizationRows.value.filter((row) => row.status !== 'DELETE')
})

// 목록 row 안에 organizationId가 실제로 있는지 확인합니다.
function hasOrganizationId(row: OrganizationListItem) {
  return typeof row.organizationId === 'number' && Number.isFinite(row.organizationId)
}

// 현재 조직의 사원 목록을 불러옵니다.
async function loadMembers() {
  const organizationPublicId = currentManagedOrganizationPublicId.value

  if (!organizationPublicId) {
    memberRows.value = []
    return
  }

  try {
    isLoadingMembers.value = true

    const response = await getUsers({
      organizationPublicId,
      page: 0,
      size: 100,
    })

    memberRows.value = response.content
  } finally {
    isLoadingMembers.value = false
  }
}

// 사원 등록 폼에서 사용할 활성 부서 목록을 불러옵니다.
async function loadDepartmentOptions() {
  departmentOptions.value = await getDepartments()
}

// 직접 등록할 사원 입력 행을 하나 추가합니다.
function addCreateMemberRow() {
  createMemberRows.value.push({
    rowId: crypto.randomUUID(),
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    jobTitle: '',
    departmentPublicId: '',
  })
}

// 직접 등록 입력 행을 제거합니다.
function removeCreateMemberRow(rowId: string) {
  createMemberRows.value = createMemberRows.value.filter((row) => row.rowId !== rowId)
}

function formatMemberPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

function handleCreateMemberPhoneInput(row: CreateMemberRow, event: Event) {
  const input = event.target as HTMLInputElement
  row.phone = formatMemberPhoneNumber(input.value)
}

// 입력된 사원들을 기존 사원 생성 API에 순서대로 등록합니다.
async function submitCreateMembers() {
  if (createMemberRows.value.length === 0) {
    return
  }

  isCreatingMembers.value = true

  try {
    for (const row of createMemberRows.value) {
      row.success = false
      row.errorMessage = ''
      row.loginId = ''
      row.temporaryPassword = ''

      if (
        !row.firstName.trim() ||
        !row.lastName.trim() ||
        !row.email.trim() ||
        !row.phone.trim() ||
        !row.departmentPublicId
      ) {
        row.errorMessage = copy.value.memberRegisterValidation
        continue
      }

      try {
        const result = await createOrganizationUser({
          firstName: row.firstName.trim(),
          middleName: row.middleName?.trim() || '',
          lastName: row.lastName.trim(),
          email: row.email.trim(),
          phone: row.phone.trim(),
          jobTitle: row.jobTitle?.trim() || '',
          departmentPublicId: row.departmentPublicId,
        })

        row.success = true
        row.loginId = result.loginId
        row.temporaryPassword = result.temporaryPassword
      } catch (error: any) {
        row.errorMessage =
          error?.payload?.message ||
          error?.message ||
          copy.value.memberRegisterFailed
      }
    }

    await loadMembers()

    if (selectedOrganizationDetail.value) {
      selectedOrganizationDetail.value.memberCount = memberRows.value.length
    }
  } finally {
    isCreatingMembers.value = false
  }
}

// 현재 row가 진짜 선택된 row인지 안전하게 확인합니다.
function isSelectedRow(row: OrganizationListItem) {
  return (
    organizationPanelMode.value === 'detail' &&
    hasOrganizationId(row) &&
    selectedOrganizationId.value === row.organizationId
  )
}

// 숫자 값이 없을 때도 화면이 깨지지 않게 0으로 보여줍니다.
function formatCount(value?: number | null) {
  return value ?? 0
}

function getRouteOrganizationId() {
  const rawValue = route.query.organizationId
  const normalizedValue = Array.isArray(rawValue) ? rawValue[0] : rawValue

  if (!normalizedValue) {
    return null
  }

  const organizationId = Number(normalizedValue)

  return Number.isFinite(organizationId) ? organizationId : null
}

// 타입 코드를 화면용 텍스트로 바꿉니다.
function formatOrganizationType(value?: string) {
  if (!value) return '-'

  if (preferences.language === 'ko') {
    if (value === 'BUYER') return '발주사'
    if (value === 'SUPPLIER') return '협력사'
    if (value === 'ADMIN') return '플랫폼'
    return value
  }

  return value
}

// 상태 코드를 화면용 텍스트로 바꿉니다.
function formatOrganizationStatus(value?: string) {
  if (!value) return '-'

  if (preferences.language === 'ko') {
    if (value === 'ACTIVE') return '활성'
    if (value === 'DEACTIVE') return '비활성'
    if (value === 'DELETE') return '삭제'
    return value
  }

  if (value === 'DEACTIVE') return 'Inactive'
  if (value === 'DELETE') return 'Deleted'
  return 'Active'
}

// 조직 메시지를 비웁니다.
function resetMessages() {
  pageError.value = ''
  pageSuccess.value = ''
}

// 사원 업로드 메시지를 비웁니다.
function resetMemberMessages() {
  memberUploadError.value = ''
  memberUploadSuccess.value = ''
}

// 선택 조직이 바뀔 때 이전 집계값을 비웁니다.
function resetOrganizationSupplySummary() {
  organizationSupplySummary.warehouseCount = 0
  organizationSupplySummary.esgFileCount = 0
}

// 숨겨진 파일 선택창을 엽니다.
function triggerOrganizationImagePicker() {
  organizationImageInput.value?.click()
}

// 조직 수정 모드로 들어갑니다.
function startOrganizationEdit() {
  if (!selectedOrganizationDetail.value) return

  syncOrganizationForm(selectedOrganizationDetail.value)
  resetMessages()
  isEditingOrganization.value = true
}

// 조직 수정 모드를 취소합니다.
function cancelOrganizationEdit() {
  if (selectedOrganizationDetail.value) {
    syncOrganizationForm(selectedOrganizationDetail.value)
  }

  resetMessages()
  isEditingOrganization.value = false
}

// supply-service에서 조직 관련 집계값을 불러옵니다.
async function loadOrganizationSupplySummary(organizationPublicId: string) {
  try {
    isLoadingOrganizationSupplySummary.value = true
    resetOrganizationSupplySummary()

    const summary = await getOrganizationSupplySummary(organizationPublicId)

    organizationSupplySummary.warehouseCount = summary.warehouseCount ?? 0
    organizationSupplySummary.esgFileCount = summary.esgFileCount ?? 0
  } catch {
    resetOrganizationSupplySummary()
  } finally {
    isLoadingOrganizationSupplySummary.value = false
  }
}

// 사원 카드를 누르면 현재 페이지 안의 사원관리 탭으로 이동합니다.
function openOrganizationMembers() {
  if (canEditOrganization.value) {
    activeTab.value = 'members'
  }
}

// 창고 카드를 누르면 창고 관리 페이지로 이동합니다.
function openOrganizationWarehouses() {
  navigation.navigateToPage('logisticsNodes')
}

// ESG 파일 카드를 누르면 인증/ESG 파일 관리 페이지로 이동합니다.
function openOrganizationEsgFiles() {
  navigation.navigateToPage('certificateWatch')
}

// 조직 이미지를 선택하면 파일 서비스에 업로드하고, 조직 수정 API로 이미지 값을 저장합니다.
async function handleOrganizationImageSelected(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file || !selectedOrganizationDetail.value?.organizationPublicId) {
    if (input) input.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    pageError.value = '이미지 파일만 업로드할 수 있습니다.'

    if (input) input.value = ''
    return
  }

  try {
    isUploadingOrganizationImage.value = true
    resetMessages()

    const uploadResponse = await uploadAttachment(
      file,
      'ORGANIZATION',
      selectedOrganizationDetail.value.organizationPublicId,
    )

    const attachmentPublicId = uploadResponse.attachmentPublicId
    const thumbPath = uploadResponse.files[0]?.fileThumbPath

    if (!attachmentPublicId || !thumbPath) {
      throw new Error('Invalid organization image upload response')
    }

    const saved = await updateOrganization(selectedOrganizationDetail.value.organizationId, {
      organizationName: organizationForm.organizationName.trim(),
      organizationEnglishName: organizationForm.organizationEnglishName.trim(),
      organizationAlias: organizationForm.organizationAlias.trim(),
      businessNo: organizationForm.businessNo.trim() || null,
      contactFirstName: organizationForm.contactFirstName.trim(),
      contactMiddleName: organizationForm.contactMiddleName.trim() || null,
      contactLastName: organizationForm.contactLastName.trim(),
      contactEmail: organizationForm.contactEmail.trim() || null,
      contactPhone: organizationForm.contactPhone,
      organizationImageAttachmentPublicId: attachmentPublicId,
      organizationImageThumbPath: thumbPath,
      address: organizationForm.address.trim() || null,
      addressDetail: organizationForm.addressDetail.trim() || null,
      zipCode: organizationForm.zipCode.trim() || null,
    })

    selectedOrganizationDetail.value = saved
    syncOrganizationForm(saved)
    await loadOrganizationSupplySummary(saved.organizationPublicId)

    organizationRows.value = organizationRows.value.map((row) =>
      hasOrganizationId(row) && row.organizationId === saved.organizationId
        ? {
            ...row,
            organizationImageThumbPath: saved.organizationImageThumbPath ?? '',
          }
        : row,
    )

    pageSuccess.value = '조직 이미지가 수정되었습니다.'
  } catch (error: any) {
    pageError.value =
      error?.payload?.message || '조직 이미지 업로드에 실패했습니다.'
  } finally {
    isUploadingOrganizationImage.value = false

    if (input) {
      input.value = ''
    }
  }
}

// 상세 데이터를 수정 폼에 그대로 채웁니다.
function syncOrganizationForm(detail: OrganizationDetailResponse) {
  organizationForm.organizationName = detail.organizationName ?? ''
  organizationForm.organizationEnglishName = detail.organizationEnglishName ?? ''
  organizationForm.organizationAlias = detail.organizationAlias ?? ''
  organizationForm.businessNo = detail.businessNo ?? ''
  organizationForm.contactFirstName = detail.contactFirstName ?? ''
  organizationForm.contactMiddleName = detail.contactMiddleName ?? ''
  organizationForm.contactLastName = detail.contactLastName ?? ''
  organizationForm.contactEmail = detail.contactEmail ?? ''
  organizationForm.contactPhone = detail.contactPhone ?? ''
  organizationForm.organizationImageAttachmentPublicId = detail.organizationImageAttachmentPublicId ?? ''
  organizationForm.organizationImageThumbPath = detail.organizationImageThumbPath ?? ''
  organizationForm.address = detail.address ?? ''
  organizationForm.addressDetail = detail.addressDetail ?? ''
  organizationForm.zipCode = detail.zipCode ?? ''

  organizationPhoneValid.value = Boolean(detail.contactPhone)
}

// 조직 코드는 영문 대문자/숫자만 남기고 길이도 자릅니다.
function normalizeOrganizationAlias() {
  organizationForm.organizationAlias = organizationForm.organizationAlias
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

// 생성 폼의 조직 코드도 수정 폼과 같은 규칙으로 맞춥니다.
function normalizeCreateOrganizationAlias() {
  organizationCreateForm.organizationAlias = organizationCreateForm.organizationAlias
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

// 생성 폼을 처음 상태로 되돌립니다.
function resetCreateOrganizationForm() {
  organizationCreateForm.organizationType = 'SUPPLIER'
  organizationCreateForm.organizationName = ''
  organizationCreateForm.organizationEnglishName = ''
  organizationCreateForm.organizationAlias = ''
  organizationCreateForm.businessNo = ''
  organizationCreateForm.contactFirstName = ''
  organizationCreateForm.contactMiddleName = ''
  organizationCreateForm.contactLastName = ''
  organizationCreateForm.contactEmail = ''
  organizationCreateForm.contactPhone = ''
  organizationCreatePhoneValid.value = false
  organizationCreateError.value = ''
  organizationCreateForm.address = ''
  organizationCreateForm.addressDetail = ''
  organizationCreateForm.zipCode = ''
}

// 생성 버튼을 누르면 오른쪽 상세 패널 자리에 생성 폼을 엽니다.
function startOrganizationCreate() {
  activeTab.value = 'organization'
  organizationPanelMode.value = 'create'
  selectedOrganizationId.value = null
  selectedOrganizationDetail.value = null
  isEditingOrganization.value = false
  resetMessages()
  resetOrganizationSupplySummary()
  resetCreateOrganizationForm()
}

// 생성 취소 시 다시 상세 패널 기본 상태로 돌아갑니다.
function cancelOrganizationCreate() {
  organizationPanelMode.value = 'detail'
  organizationCreateError.value = ''
}

// 생성 직후 목록을 다시 읽고 방금 만든 조직을 상세 패널에 바로 띄웁니다.
async function refreshListAndOpenCreatedOrganization(createdOrganizationPublicId: string) {
  await loadOrganizationList(0)

  const createdRow = organizationRows.value.find((row) => {
    return row.organizationPublicId === createdOrganizationPublicId
  })

  if (createdRow && hasOrganizationId(createdRow)) {
    await loadOrganizationDetailById(createdRow.organizationId)
  }
}

// 플랫폼 관리자가 새 조직을 생성합니다.
async function submitOrganizationCreate() {
  organizationCreateError.value = ''
  pageSuccess.value = ''
  normalizeCreateOrganizationAlias()

  if (
    !organizationCreateForm.organizationName.trim() ||
    !organizationCreateForm.organizationEnglishName.trim() ||
    !organizationCreateForm.organizationAlias.trim() ||
    !organizationCreateForm.businessNo.trim() ||
    !organizationCreateForm.contactFirstName.trim() ||
    !organizationCreateForm.contactLastName.trim() ||
    !organizationCreateForm.contactEmail.trim() ||
    !organizationCreateForm.contactPhone.trim() ||
    !organizationCreateForm.address.trim()
  ) {
    organizationCreateError.value = copy.value.validationRequired
    return
  }

  if (!/^[A-Z0-9]{2,10}$/.test(organizationCreateForm.organizationAlias)) {
    organizationCreateError.value = copy.value.validationAlias
    return
  }

  if (!organizationCreatePhoneValid.value) {
    organizationCreateError.value = copy.value.validationPhone
    return
  }

  try {
    isCreatingOrganization.value = true

    const normalizedAlias = organizationCreateForm.organizationAlias.trim().toUpperCase()

    const response = await createOrganization({
      organizationType: organizationCreateForm.organizationType,
      organizationName: organizationCreateForm.organizationName.trim(),
      organizationEnglishName: organizationCreateForm.organizationEnglishName.trim(),
      organizationAlias: normalizedAlias,
      businessNo: organizationCreateForm.businessNo.trim(),
      contactFirstName: organizationCreateForm.contactFirstName.trim(),
      contactMiddleName: organizationCreateForm.contactMiddleName?.trim() || undefined,
      contactLastName: organizationCreateForm.contactLastName.trim(),
      contactEmail: organizationCreateForm.contactEmail.trim(),
      contactPhone: organizationCreateForm.contactPhone.trim(),
      address: organizationCreateForm.address.trim(),
      addressDetail: organizationCreateForm.addressDetail.trim() || null,
      zipCode: organizationCreateForm.zipCode.trim() || null,
    })



    let supplierCreateFailed = false

    if (organizationCreateForm.organizationType === 'SUPPLIER') {
      try {
        const primaryContactName = [
          organizationCreateForm.contactFirstName,
          organizationCreateForm.contactMiddleName,
          organizationCreateForm.contactLastName,
        ]
          .filter((value) => value && value.trim())
          .join(' ')

        await createSupplier({
          organizationPublicId: response.organizationPublicId,
          supplierCode: normalizedAlias,
          supplierName: organizationCreateForm.organizationName.trim(),
          primaryContactName,
          primaryContactEmail: organizationCreateForm.contactEmail.trim(),
          primaryContactPhone: organizationCreateForm.contactPhone.trim(),
        })
      } catch (supplierError) {
        console.error('Failed to create supplier after organization creation:', supplierError)
        supplierCreateFailed = true
      }
    }

   organizationPanelMode.value = 'detail'
await refreshListAndOpenCreatedOrganization(response.organizationPublicId)
resetCreateOrganizationForm()

// 조직 생성 단계에서는 대표자 계정을 만들지 않습니다.
// 대표자 계정은 나중에 조직 관리자 생성 화면에서 따로 만듭니다.
pageSuccess.value = supplierCreateFailed
  ? copy.value.createSupplierWarning
  : copy.value.createSuccess


  } catch (error: any) {
    console.error('Failed to create organization:', error)

    organizationCreateError.value =
      error?.payload?.message ||
      error?.message ||
      copy.value.createFailed
  } finally {
    isCreatingOrganization.value = false
  }
}

// 플랫폼 관리자가 보는 조직 목록을 8개씩 페이징해서 불러옵니다.
async function loadOrganizationList(page = organizationListPage.value) {
  try {
    isLoadingOrganizations.value = true
    pageError.value = ''
    pageSuccess.value = ''

    const response = await getOrganizations({
      page,
      size: ORGANIZATION_LIST_PAGE_SIZE,
      status: 'ACTIVE',
    })

    organizationRows.value = response.content

    organizationListPage.value = response.number ?? page
    organizationListTotalElements.value = response.totalElements ?? 0
    organizationListTotalPages.value = response.totalPages ?? 0
  } catch (error: any) {
    pageError.value = error?.payload?.message || copy.value.loadListFailed
  } finally {
    isOrganizationListInitialized.value = true
    isLoadingOrganizations.value = false
  }
}

// 이전/다음 버튼을 눌렀을 때 해당 페이지 목록을 다시 불러옵니다.
function moveOrganizationListPage(nextPage: number) {
  if (nextPage < 0 || nextPage >= organizationListTotalPages.value) {
    return
  }

  void loadOrganizationList(nextPage)
}

// 조직 내부 ID 기준으로 상세 API를 호출합니다.
async function loadOrganizationDetailById(organizationId: number) {
  if (!Number.isFinite(organizationId)) {
    selectedOrganizationId.value = null
    selectedOrganizationDetail.value = null
    isEditingOrganization.value = false
    resetOrganizationSupplySummary()
    pageError.value = copy.value.missingOrganizationId
    pageSuccess.value = ''
    return
  }

  try {
    organizationPanelMode.value = 'detail'
    selectedOrganizationId.value = organizationId
    selectedOrganizationDetail.value = null
    isEditingOrganization.value = false
    isLoadingOrganizationDetail.value = true
    resetMessages()
    resetOrganizationSupplySummary()

    const detail = await getOrganizationDetail(organizationId)

    selectedOrganizationDetail.value = detail
    syncOrganizationForm(detail)
    await loadOrganizationSupplySummary(detail.organizationPublicId)
  } catch (error: any) {
    selectedOrganizationId.value = null
    selectedOrganizationDetail.value = null
    isEditingOrganization.value = false
    resetOrganizationSupplySummary()
    pageError.value =
      error?.payload?.message ||
      error?.message ||
      copy.value.loadDetailFailed
  } finally {
    isLoadingOrganizationDetail.value = false
  }
}

// 조직 대표자는 자기 조직만 읽습니다.
async function loadMyOrganization() {
  try {
    organizationPanelMode.value = 'detail'
    isLoadingOrganizationDetail.value = true
    isEditingOrganization.value = false
    resetMessages()
    resetOrganizationSupplySummary()

    const detail = await getMyOrganizationDetail()

    selectedOrganizationId.value = detail.organizationId
    selectedOrganizationDetail.value = detail
    syncOrganizationForm(detail)
    await loadOrganizationSupplySummary(detail.organizationPublicId)
  } catch (error: any) {
    pageError.value = error?.payload?.message || copy.value.loadDetailFailed
  } finally {
    isLoadingOrganizationDetail.value = false
  }
}

// 현재 역할에 맞는 첫 데이터를 읽습니다.
async function loadPage() {
  if (!canManageOrganization.value) {
    return
  }

  if (isAdminManager.value) {
    await loadOrganizationList()

    const routeOrganizationId = getRouteOrganizationId()

    if (routeOrganizationId !== null) {
      await loadOrganizationDetailById(routeOrganizationId)
    }

    return
  }

  if (isOrgAdminManager.value) {
    await loadMyOrganization()
  }
}

// 목록에서 조직 하나를 누르면 해당 organizationId로 상세를 읽습니다.
function selectOrganization(row: OrganizationListItem) {
  if (!hasOrganizationId(row)) {
    selectedOrganizationId.value = null
    selectedOrganizationDetail.value = null
    isEditingOrganization.value = false
    resetOrganizationSupplySummary()
    pageError.value = copy.value.missingOrganizationId
    pageSuccess.value = ''
    return
  }

  if (isSelectedRow(row)) {
    return
  }

  void loadOrganizationDetailById(row.organizationId)
}

// 저장 버튼을 누르면 현재 폼 값으로 조직 정보를 수정합니다.
async function submitOrganizationUpdate() {
  if (!selectedOrganizationDetail.value) {
    return
  }

  resetMessages()
  normalizeOrganizationAlias()

  if (
    !organizationForm.organizationName.trim() ||
    !organizationForm.organizationEnglishName.trim() ||
    !organizationForm.organizationAlias.trim() ||
    !organizationForm.contactFirstName.trim() ||
    !organizationForm.contactLastName.trim() ||
    !organizationForm.contactPhone.trim()
  ) {
    pageError.value = copy.value.validationRequired
    return
  }

  if (!/^[A-Z0-9]{2,10}$/.test(organizationForm.organizationAlias)) {
    pageError.value = copy.value.validationAlias
    return
  }

  if (!organizationPhoneValid.value) {
    pageError.value = copy.value.validationPhone
    return
  }

  try {
    isSavingOrganization.value = true

    const saved = await updateOrganization(
      selectedOrganizationDetail.value.organizationId,
      {
        organizationName: organizationForm.organizationName.trim(),
        organizationEnglishName: organizationForm.organizationEnglishName.trim(),
        organizationAlias: organizationForm.organizationAlias.trim(),
        businessNo: organizationForm.businessNo.trim() || null,
        address: organizationForm.address.trim() || null,
        addressDetail: organizationForm.addressDetail.trim() || null,
        zipCode: organizationForm.zipCode.trim() || null,
        contactFirstName: organizationForm.contactFirstName.trim(),
        contactMiddleName: organizationForm.contactMiddleName.trim() || null,
        contactLastName: organizationForm.contactLastName.trim(),
        contactEmail: organizationForm.contactEmail.trim() || null,
        contactPhone: organizationForm.contactPhone,
        organizationImageAttachmentPublicId:
          organizationForm.organizationImageAttachmentPublicId || null,
        organizationImageThumbPath: organizationForm.organizationImageThumbPath || null,
      },
    )

    selectedOrganizationDetail.value = saved
    syncOrganizationForm(saved)
    await loadOrganizationSupplySummary(saved.organizationPublicId)

    organizationRows.value = organizationRows.value.map((row) =>
      hasOrganizationId(row) && row.organizationId === saved.organizationId
        ? {
            ...row,
            organizationName: saved.organizationName,
            organizationType: saved.organizationType,
            businessNo: saved.businessNo ?? '',
            address: saved.address ?? '',
            addressDetail: saved.addressDetail ?? '',
            zipCode: saved.zipCode ?? '',
            contactEmail: saved.contactEmail ?? '',
            contactPhone: saved.contactPhone,
            status: saved.status,
            organizationImageThumbPath: saved.organizationImageThumbPath ?? '',
          }
        : row,
    )

    isEditingOrganization.value = false
    pageSuccess.value = copy.value.saveSuccess
  } catch (error: any) {
    pageError.value = error?.payload?.message || copy.value.saveFailed
  } finally {
    isSavingOrganization.value = false
  }
}

// 조직 상태를 활성화, 비활성화, 삭제 중 하나로 변경합니다.
async function submitOrganizationStatusUpdate(nextStatus: OrganizationStatus) {
  if (!selectedOrganizationDetail.value) {
    return
  }

  resetMessages()

  const confirmMessage =
    nextStatus === 'ACTIVE'
      ? copy.value.activateConfirm
      : nextStatus === 'DEACTIVE'
        ? copy.value.deactivateConfirm
        : copy.value.deleteConfirm

  if (!(await dialog.confirm(confirmMessage))) {
    return
  }

  try {
    isUpdatingOrganizationStatus.value = true

    const saved = await updateOrganizationStatus(
      selectedOrganizationDetail.value.organizationId,
      { status: nextStatus },
    )

    if (nextStatus === 'DELETE') {
      organizationRows.value = organizationRows.value.filter(
        (row) => !(hasOrganizationId(row) && row.organizationId === saved.organizationId),
      )
      selectedOrganizationId.value = null
      selectedOrganizationDetail.value = null
      isEditingOrganization.value = false
      resetOrganizationSupplySummary()
      pageSuccess.value = copy.value.deleteSuccess
      return
    }

    selectedOrganizationDetail.value = saved
    syncOrganizationForm(saved)
    await loadOrganizationSupplySummary(saved.organizationPublicId)

    organizationRows.value = organizationRows.value.map((row) =>
      hasOrganizationId(row) && row.organizationId === saved.organizationId
        ? {
            ...row,
            organizationName: saved.organizationName,
            organizationType: saved.organizationType,
            businessNo: saved.businessNo ?? '',
            address: saved.address ?? '',
            addressDetail: saved.addressDetail ?? '',
            zipCode: saved.zipCode ?? '',
            contactEmail: saved.contactEmail ?? '',
            contactPhone: saved.contactPhone,
            status: saved.status,
            organizationImageThumbPath: saved.organizationImageThumbPath ?? '',
          }
        : row,
    )

    pageSuccess.value =
      nextStatus === 'ACTIVE'
        ? copy.value.activateSuccess
        : nextStatus === 'DEACTIVE'
          ? copy.value.deactivateSuccess
          : copy.value.deleteSuccess
  } catch (error: any) {
    pageError.value =
      error?.payload?.message ||
      error?.message ||
      copy.value.statusUpdateFailed
  } finally {
    isUpdatingOrganizationStatus.value = false
  }
}

// 조직 대표자가 엑셀 파일로 자기 조직 사원을 일괄 등록합니다.
async function handleMemberExcelUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  try {
    resetMemberMessages()
    memberUploadResult.value = null
    isUploadingMembers.value = true

    const result = await uploadOrganizationUsersExcel(file)

    memberUploadResult.value = result
    memberUploadSuccess.value =
      preferences.language === 'ko'
        ? `업로드가 완료되었습니다. 성공 ${result.successCount}건 / 실패 ${result.failCount}건`
        : `Upload completed. Success ${result.successCount} / Fail ${result.failCount}`

    await loadMembers()

    if (selectedOrganizationDetail.value) {
      selectedOrganizationDetail.value.memberCount = memberRows.value.length
    }
  } catch (error: any) {
    memberUploadError.value =
      error?.payload?.message ||
      error?.message ||
      copy.value.memberUploadFailed
  } finally {
    isUploadingMembers.value = false
    input.value = ''
  }
}

// 페이지가 열리면 바로 데이터를 읽습니다.
onMounted(() => {
  void loadPage()
  void loadDepartmentOptions()
})

watch(
  () => route.query.organizationId,
  async () => {
    if (!isAdminManager.value) {
      return
    }

    const routeOrganizationId = getRouteOrganizationId()

    if (routeOrganizationId !== null) {
      await loadOrganizationDetailById(routeOrganizationId)
    }
  },
)

// 사원관리 탭에 들어오면 현재 조직 사원 목록을 불러옵니다.
watch(
  activeTab,
  (nextTab) => {
    if (nextTab === 'members') {
      void loadMembers()
    }
  },
)

// 관리 대상 조직이 바뀌면 사원 목록도 새로 맞춥니다.
watch(
  currentManagedOrganizationPublicId,
  () => {
    if (activeTab.value === 'members') {
      void loadMembers()
    }
  },
)
</script>

<template>
  <section class="app-screen">
    <article v-if="!canManageOrganization" class="page-panel">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">{{ copy.eyebrow }}</div>
          <h3>{{ copy.title }}</h3>
        </div>
      </div>

      <div class="login-error">
        {{ copy.noPermission }}
      </div>
    </article>

    <template v-else>
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 20px;
        "
      >
        <article v-if="isAdminManager" class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.eyebrow }}</div>
              <h3>{{ copy.listTitle }}</h3>
              <p class="settings-page__copy">{{ copy.listDescription }}</p>
            </div>

            <button
              class="page-button page-button--primary"
              type="button"
              :disabled="isCreatingOrganization"
              @click="startOrganizationCreate"
            >
              {{ copy.createButton }}
            </button>
          </div>

          <div v-if="!isOrganizationListInitialized && isLoadingOrganizations" class="login-hint">
            {{ copy.loadingList }}
          </div>

          <div v-else-if="visibleOrganizationRows.length === 0" class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.listTitle }}</span>
              <strong class="page-feed__text">{{ copy.emptyList }}</strong>
            </div>
          </div>

          <div v-else class="organization-list-block">
            <div class="page-feed">
              <div
                v-for="row in visibleOrganizationRows"
                :key="row.organizationPublicId || row.organizationName"
                class="page-feed__item"
                :class="{
                  'organization-list-item': true,
                  'is-selected': isSelectedRow(row),
                  'is-disabled': !hasOrganizationId(row),
                }"
                role="button"
                tabindex="0"
                :style="{
                  borderColor: isSelectedRow(row) ? '#111827' : undefined,
                  backgroundColor: isSelectedRow(row) ? 'rgba(17, 24, 39, 0.04)' : undefined,
                }"
                @click="hasOrganizationId(row) && selectOrganization(row)"
                @keydown.enter.prevent="hasOrganizationId(row) && selectOrganization(row)"
                @keydown.space.prevent="hasOrganizationId(row) && selectOrganization(row)"
              >
                <span class="page-feed__label">
                  {{ formatOrganizationType(row.organizationType) }} ·
                  {{ formatOrganizationStatus(row.status) }}
                </span>

                <strong class="page-feed__text">
                  {{ row.organizationName }}
                </strong>
              </div>
            </div>

            <div class="organization-pagination">
              <button
                class="page-button page-button--secondary"
                type="button"
                :disabled="!canMoveOrganizationListPrev || isLoadingOrganizations"
                @click="moveOrganizationListPage(organizationListPage - 1)"
              >
                {{ copy.previousButton }}
              </button>

              <span class="organization-pagination__info">
                {{ organizationListCurrentPageNumber }} / {{ organizationListTotalPages }}
                · {{ copy.paginationTotal(organizationListTotalElements) }}
              </span>

              <button
                class="page-button page-button--secondary"
                type="button"
                :disabled="!canMoveOrganizationListNext || isLoadingOrganizations"
                @click="moveOrganizationListPage(organizationListPage + 1)"
              >
                {{ copy.nextButton }}
              </button>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head organization-management-head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.eyebrow }}</div>
              <h3>
                {{
                  organizationPanelMode === 'create'
                    ? copy.createTitle
                    : activeTab === 'members'
                      ? copy.memberTitle
                      : copy.detailTitle
                }}
              </h3>
              <p class="settings-page__copy">
                {{
                  organizationPanelMode === 'create'
                    ? copy.createDescription
                    : activeTab === 'members'
                      ? copy.memberDescription
                      : isAdminManager
                        ? copy.readOnlyDescription
                        : copy.myOrganizationDescription
                }}
              </p>

              <div v-if="isOrgAdminManager" class="organization-management-tabs">
                <button
                  class="page-button"
                  type="button"
                  :class="activeTab === 'organization' ? 'page-button--primary' : 'page-button--secondary'"
                  @click="activeTab = 'organization'"
                >
                  {{ copy.organizationTab }}
                </button>

                <button
                  class="page-button"
                  type="button"
                  :class="activeTab === 'members' ? 'page-button--primary' : 'page-button--secondary'"
                  @click="activeTab = 'members'"
                >
                  {{ copy.membersTab }}
                </button>
              </div>
            </div>
          </div>

          <!-- 조직 생성 폼 -->
          <template v-if="organizationPanelMode === 'create' && isAdminManager">
            <div v-if="organizationCreateError" class="login-error" style="margin-bottom: 12px;">
              {{ organizationCreateError }}
            </div>

            <div class="settings-form organization-create-form">
              <label>
                <span>{{ copy.organizationType }} <b class="required-mark">*</b></span>
                <select v-model="organizationCreateForm.organizationType">
                  <option value="SUPPLIER">{{ copy.supplierType }}</option>
                  <option value="BUYER">{{ copy.buyerType }}</option>
                </select>
              </label>

              <label>
                <span>{{ copy.organizationName }} <b class="required-mark">*</b></span>
                <input v-model="organizationCreateForm.organizationName" type="text" />
              </label>

              <label>
                <span>{{ copy.organizationEnglishName }} <b class="required-mark">*</b></span>
                <input v-model="organizationCreateForm.organizationEnglishName" type="text" />
              </label>

              <label>
                <span>{{ copy.organizationAlias }} <b class="required-mark">*</b></span>
                <input
                  v-model="organizationCreateForm.organizationAlias"
                  type="text"
                  maxlength="10"
                  placeholder="ATLAS1"
                  @input="normalizeCreateOrganizationAlias"
                />
              </label>

              <label>
                <span>{{ copy.businessNo }} <b class="required-mark">*</b></span>
                <input v-model="organizationCreateForm.businessNo" type="text" />
              </label>

              <label>
                <span>{{ copy.address }} <b class="required-mark">*</b></span>
                <input v-model="organizationCreateForm.address" type="text" />
              </label>

              <label>
                <span>{{ copy.addressDetail }}</span>
                <input v-model="organizationCreateForm.addressDetail" type="text" />
              </label>

              <div class="organization-create-form__contact-name">
                <label>
                  <span>{{ copy.contactLastName }} <b class="required-mark">*</b></span>
                  <input v-model="organizationCreateForm.contactLastName" type="text" />
                </label>

                <label>
                  <span>{{ copy.contactFirstName }} <b class="required-mark">*</b></span>
                  <input v-model="organizationCreateForm.contactFirstName" type="text" />
                </label>
              </div>

              <label>
                <span>{{ copy.contactEmail }} <b class="required-mark">*</b></span>
                <input v-model="organizationCreateForm.contactEmail" type="email" />
              </label>

              <label>
                <span>{{ copy.contactPhone }} <b class="required-mark">*</b></span>
                <PhoneField
                  v-model="organizationCreateForm.contactPhone"
                  v-model:valid="organizationCreatePhoneValid"
                  :language="preferences.language"
                />
              </label>
            </div>

            <div class="organization-form-actions">
              <button
                class="page-button page-button--secondary"
                type="button"
                :disabled="isCreatingOrganization"
                @click="cancelOrganizationCreate"
              >
                {{ copy.cancelButton }}
              </button>

              <button
                class="page-button page-button--primary"
                type="button"
                :disabled="isCreatingOrganization"
                @click="submitOrganizationCreate"
              >
                {{ isCreatingOrganization ? copy.creatingButton : copy.createButton }}
              </button>
            </div>
          </template>

          <template v-else>
            <div v-if="pageError && activeTab === 'organization'" class="login-error" style="margin-bottom: 12px;">
              {{ pageError }}
            </div>

            <div v-if="pageSuccess && activeTab === 'organization'" class="login-hint" style="margin-bottom: 12px;">
              {{ pageSuccess }}
            </div>

            <div v-if="isLoadingOrganizationDetail && activeTab === 'organization'" class="login-hint">
              {{ copy.loadingDetail }}
            </div>

            <div v-else-if="!selectedOrganizationDetail && activeTab === 'organization'" class="page-feed">
              <div class="page-feed__item">
                <span class="page-feed__label">{{ copy.detailTitle }}</span>
                <strong class="page-feed__text">{{ copy.chooseOrganization }}</strong>
              </div>
            </div>

            <!-- 조직 상세 -->
            <template v-else-if="activeTab === 'organization' && selectedOrganizationDetail">
              <div class="organization-summary-grid">
                <button
                  class="organization-summary-card"
                  type="button"
                  :disabled="!canEditOrganization"
                  @click="openOrganizationMembers"
                >
                  <span>{{ copy.memberCount }}</span>
                  <strong>{{ formatCount(selectedOrganizationDetail.memberCount) }}</strong>
                </button>

                <button
                  class="organization-summary-card"
                  type="button"
                  @click="openOrganizationWarehouses"
                >
                  <span>{{ copy.warehouseCount }}</span>
                  <strong>
                    {{ isLoadingOrganizationSupplySummary ? '-' : formatCount(organizationSupplySummary.warehouseCount) }}
                  </strong>
                </button>

                <button
                  class="organization-summary-card"
                  type="button"
                  @click="openOrganizationEsgFiles"
                >
                  <span>{{ copy.esgFileCount }}</span>
                  <strong>
                    {{ isLoadingOrganizationSupplySummary ? '-' : formatCount(organizationSupplySummary.esgFileCount) }}
                  </strong>
                </button>
              </div>

              <div class="organization-entity-card">
                <div class="organization-entity-card__image">
                  <img
                    v-if="selectedOrganizationDetail.organizationImageThumbPath"
                    :src="selectedOrganizationDetail.organizationImageThumbPath"
                    :alt="selectedOrganizationDetail.organizationName"
                  />
                  <span v-else class="material-symbols-outlined">business</span>
                </div>

                <div class="organization-entity-card__body">
                  <span class="organization-entity-card__eyebrow">
                    {{ formatOrganizationType(selectedOrganizationDetail.organizationType) }} ·
                    {{ formatOrganizationStatus(selectedOrganizationDetail.status) }}
                  </span>

                  <strong class="organization-entity-card__title">
                    {{ selectedOrganizationLabel }}
                  </strong>
                </div>

                <div
                  v-if="canEditOrganization && isEditingOrganization"
                  class="organization-entity-card__actions"
                >
                  <input
                    ref="organizationImageInput"
                    type="file"
                    accept="image/*"
                    style="display: none;"
                    @change="handleOrganizationImageSelected"
                  />

                  <button
                    class="page-button page-button--secondary"
                    type="button"
                    :disabled="isUploadingOrganizationImage"
                    @click="triggerOrganizationImagePicker"
                  >
                    {{ isUploadingOrganizationImage ? '업로드 중...' : '이미지 변경' }}
                  </button>
                </div>
              </div>

              <div class="profile-kv organization-inline-edit">
                <div class="profile-kv__row">
                  <span>{{ copy.organizationName }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.organizationName || '-' }}</strong>
                  <input v-else v-model="organizationForm.organizationName" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.organizationEnglishName }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.organizationEnglishName || '-' }}</strong>
                  <input v-else v-model="organizationForm.organizationEnglishName" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.organizationAlias }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.organizationAlias || '-' }}</strong>
                  <input
                    v-else
                    v-model="organizationForm.organizationAlias"
                    type="text"
                    maxlength="10"
                    placeholder="ATLAS1"
                    @input="normalizeOrganizationAlias"
                  />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.businessNo }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.businessNo || '-' }}</strong>
                  <input v-else v-model="organizationForm.businessNo" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.address }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.address || '-' }}</strong>
                  <input v-else v-model="organizationForm.address" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.addressDetail }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.addressDetail || '-' }}</strong>
                  <input v-else v-model="organizationForm.addressDetail" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.zipCode }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.zipCode || '-' }}</strong>
                  <input v-else v-model="organizationForm.zipCode" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.contactFirstName }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.contactFirstName || '-' }}</strong>
                  <input v-else v-model="organizationForm.contactFirstName" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.contactMiddleName }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.contactMiddleName || '-' }}</strong>
                  <input v-else v-model="organizationForm.contactMiddleName" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.contactLastName }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.contactLastName || '-' }}</strong>
                  <input v-else v-model="organizationForm.contactLastName" type="text" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.contactEmail }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.contactEmail || '-' }}</strong>
                  <input v-else v-model="organizationForm.contactEmail" type="email" />
                </div>

                <div class="profile-kv__row">
                  <span>{{ copy.contactPhone }}</span>
                  <strong v-if="!isEditingOrganization">{{ selectedOrganizationDetail.contactPhone || '-' }}</strong>
                  <PhoneField
                    v-else
                    v-model="organizationForm.contactPhone"
                    v-model:valid="organizationPhoneValid"
                    :language="preferences.language"
                  />
                </div>
              </div>

              <div v-if="canEditOrganization" class="organization-form-actions">
                <button
                  v-if="!isEditingOrganization"
                  class="page-button page-button--primary"
                  type="button"
                  @click="startOrganizationEdit"
                >
                  {{ copy.editButton }}
                </button>

                <template v-else>
                  <button
                    class="page-button page-button--secondary"
                    type="button"
                    :disabled="isSavingOrganization"
                    @click="cancelOrganizationEdit"
                  >
                    {{ copy.cancelButton }}
                  </button>

                  <button
                    class="page-button page-button--primary"
                    type="button"
                    :disabled="isSavingOrganization"
                    @click="submitOrganizationUpdate"
                  >
                    {{ isSavingOrganization ? copy.savingButton : copy.saveButton }}
                  </button>
                </template>
              </div>

              <div v-if="canChangeOrganizationStatus" class="organization-danger-actions">
                <button
                  v-if="selectedOrganizationDetail.status !== 'ACTIVE'"
                  class="page-button page-button--secondary"
                  type="button"
                  :disabled="isUpdatingOrganizationStatus"
                  @click="submitOrganizationStatusUpdate('ACTIVE')"
                >
                  {{ isUpdatingOrganizationStatus ? copy.updatingStatusButton : copy.activateButton }}
                </button>

                <button
                  v-if="selectedOrganizationDetail.status === 'ACTIVE'"
                  class="page-button page-button--danger"
                  type="button"
                  :disabled="isUpdatingOrganizationStatus"
                  @click="submitOrganizationStatusUpdate('DEACTIVE')"
                >
                  {{ isUpdatingOrganizationStatus ? copy.updatingStatusButton : copy.deactivateButton }}
                </button>

                <button
                  v-if="canDeleteOrganization && selectedOrganizationDetail.status !== 'DELETE'"
                  class="page-button page-button--danger"
                  type="button"
                  :disabled="isUpdatingOrganizationStatus"
                  @click="submitOrganizationStatusUpdate('DELETE')"
                >
                  {{ isUpdatingOrganizationStatus ? copy.updatingStatusButton : copy.deleteButton }}
                </button>
              </div>
            </template>

            <!-- 사원관리 탭 -->
            <template v-else-if="activeTab === 'members' && canEditOrganization">
              <!-- 사원관리 서브탭 -->
              <div class="member-subtabs">
                <button
                  class="page-button"
                  type="button"
                  :class="activeMemberSubTab === 'add' ? 'page-button--primary' : 'page-button--secondary'"
                  @click="activeMemberSubTab = 'add'"
                >
                  {{ copy.memberSubTabAdd }}
                </button>

                <button
                  class="page-button"
                  type="button"
                  :class="activeMemberSubTab === 'excel' ? 'page-button--primary' : 'page-button--secondary'"
                  @click="activeMemberSubTab = 'excel'"
                >
                  {{ copy.memberSubTabExcel }}
                </button>

                <button
                  class="page-button"
                  type="button"
                  :class="activeMemberSubTab === 'list' ? 'page-button--primary' : 'page-button--secondary'"
                  @click="activeMemberSubTab = 'list'"
                >
                  {{ copy.memberSubTabList }}
                </button>
              </div>
<!-- 직접 등록 -->
              <div v-if="activeMemberSubTab === 'add'" class="member-add-block">
                <div v-if="createMemberRows.length === 0" class="login-hint">
                  {{ copy.addMemberRowButton }} 버튼을 눌러 등록할 사원을 입력하세요.
                </div>

                <!-- 직접 등록 테이블 -->
                <div v-else class="member-create-table">
                  <div class="member-create-table__head">
                    <span>{{ preferences.language === 'ko' ? '성 *' : 'Last Name *' }}</span>
                    <span>{{ preferences.language === 'ko' ? '이름 *' : 'First Name *' }}</span>
                    <span>{{ preferences.language === 'ko' ? '이메일 *' : 'Email *' }}</span>
                    <span>{{ preferences.language === 'ko' ? '연락처 *' : 'Phone *' }}</span>
                    <span>{{ preferences.language === 'ko' ? '직급' : 'Job Title' }}</span>
                    <span>{{ preferences.language === 'ko' ? '부서 *' : 'Department *' }}</span>
                    <span></span>
                  </div>

                  <div
                    v-for="row in createMemberRows"
                    :key="row.rowId"
                    class="member-create-table__row"
                  >
                    <input v-model="row.lastName" type="text" :placeholder="preferences.language === 'ko' ? '성' : 'Last'" />
                    <input v-model="row.firstName" type="text" :placeholder="preferences.language === 'ko' ? '이름' : 'First'" />
                    <input v-model="row.email" type="email" placeholder="email@example.com" />
                    <input
                      :value="row.phone"
                      type="text"
                      inputmode="numeric"
                      maxlength="13"
                      placeholder="010-0000-0000"
                      @input="handleCreateMemberPhoneInput(row, $event)"
                    />
                    <input v-model="row.jobTitle" type="text" />
                    <select v-model="row.departmentPublicId">
                      <option value="">{{ preferences.language === 'ko' ? '부서 선택' : 'Select' }}</option>
                      <option
                        v-for="dept in departmentOptions"
                        :key="dept.departmentPublicId"
                        :value="dept.departmentPublicId"
                      >
                        {{ dept.departmentName }}
                      </option>
                    </select>
                    <button
                      class="page-button page-button--secondary"
                      type="button"
                      :disabled="isCreatingMembers"
                      @click="removeCreateMemberRow(row.rowId)"
                    >
                      {{ copy.removeMemberRowButton }}
                    </button>

                    <div
                      v-if="row.success || row.errorMessage"
                      class="member-create-table__feedback"
                      :class="row.success ? 'member-create-table__feedback--success' : 'member-create-table__feedback--error'"
                    >
                      <template v-if="row.success">
                        <span class="material-symbols-outlined" style="font-size: 15px;">check_circle</span>
                        {{ copy.memberRegisterComplete }} —
                        {{ copy.loginId }}: <strong>{{ row.loginId }}</strong> /
                        {{ copy.temporaryPassword }}: <strong>{{ row.temporaryPassword }}</strong>
                      </template>
                      <template v-else>{{ row.errorMessage }}</template>
                    </div>
                  </div>
                </div>

                <div class="member-add-actions">
                  <button
                    class="page-button page-button--secondary"
                    type="button"
                    :disabled="isCreatingMembers"
                    @click="addCreateMemberRow"
                  >
                    {{ copy.addMemberRowButton }}
                  </button>

                  <button
                    v-if="createMemberRows.length > 0"
                    class="page-button page-button--primary"
                    type="button"
                    :disabled="isCreatingMembers"
                    @click="submitCreateMembers"
                  >
                    {{ isCreatingMembers ? copy.submittingMembersButton : copy.submitMembersButton }}
                  </button>
                </div>
              </div>

          

              <!-- 엑셀 업로드 -->
              <div v-else-if="activeMemberSubTab === 'excel'" class="member-excel-block">
                <div class="settings-form">
                  <label>
                    <span>{{ copy.memberExcelFile }}</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      :disabled="isUploadingMembers"
                      @change="handleMemberExcelUpload"
                    />
                  </label>

                  <div class="login-hint" style="margin-top: 8px;">
                    {{ copy.uploadHint }}
                  </div>

                  <div v-if="memberUploadError" class="login-error" style="margin-top: 8px;">
                    {{ memberUploadError }}
                  </div>

                  <div v-if="memberUploadSuccess" class="login-hint" style="margin-top: 8px;">
                    {{ memberUploadSuccess }}
                  </div>

                  <div v-if="isUploadingMembers" class="login-hint" style="margin-top: 8px;">
                    {{ copy.uploadingMembers }}
                  </div>
                </div>

                <div v-if="memberUploadResult" class="page-feed" style="margin-top: 16px;">
                  <div class="page-feed__item">
                    <span class="page-feed__label">{{ copy.totalCount }}</span>
                    <strong class="page-feed__text">{{ memberUploadResult.totalCount }}</strong>
                  </div>

                  <div class="page-feed__item">
                    <span class="page-feed__label">{{ copy.successCount }}</span>
                    <strong class="page-feed__text">{{ memberUploadResult.successCount }}</strong>
                  </div>

                  <div class="page-feed__item">
                    <span class="page-feed__label">{{ copy.failCount }}</span>
                    <strong class="page-feed__text">{{ memberUploadResult.failCount }}</strong>
                  </div>
                </div>

                <div v-if="memberUploadResult?.results?.length" class="page-table" style="margin-top: 16px;">
                  <div class="page-table__row page-table__row--head">
                    <span>{{ copy.rowNumber }}</span>
                    <span>{{ copy.rowResult }}</span>
                    <span>{{ copy.loginId }}</span>
                    <span>{{ copy.temporaryPassword }}</span>
                    <span>{{ copy.message }}</span>
                  </div>

                  <div
                    v-for="row in memberUploadResult.results"
                    :key="`${row.rowNumber}-${row.loginId || row.message}`"
                    class="page-table__row"
                  >
                    <span>{{ row.rowNumber }}</span>
                    <span>{{ row.success ? copy.success : copy.fail }}</span>
                    <span>{{ row.loginId || '-' }}</span>
                    <span>{{ row.temporaryPassword || '-' }}</span>
                    <span>{{ row.message || '-' }}</span>
                  </div>
                </div>
              </div>

        <!-- 사원 목록 -->
              <div v-else-if="activeMemberSubTab === 'list'" class="member-list-block">
                <div v-if="isLoadingMembers" class="login-hint">
                  {{ copy.memberListLoading }}
                </div>

                <div v-else-if="memberRows.length === 0" class="login-hint">
                  {{ copy.memberListEmpty }}
                </div>

                <div v-else class="member-create-table">
                  <div class="member-create-table__head">
                    <span>{{ preferences.language === 'ko' ? '이름' : 'Name' }}</span>
                    <span>{{ preferences.language === 'ko' ? '이메일' : 'Email' }}</span>
                    <span>{{ preferences.language === 'ko' ? '연락처' : 'Phone' }}</span>
                    <span>{{ preferences.language === 'ko' ? '직급' : 'Job Title' }}</span>
                    <span>{{ preferences.language === 'ko' ? '부서' : 'Department' }}</span>
                    <span>{{ preferences.language === 'ko' ? '권한' : 'Role' }}</span>
                    <span>{{ preferences.language === 'ko' ? '상태' : 'Status' }}</span>
                  </div>

                  <div
                    v-for="member in memberRows"
                    :key="member.userPublicId"
                    class="member-create-table__row member-list-row"
                  >
                    <strong>{{ member.lastName }}{{ member.firstName }}</strong>
                    <span>{{ member.email }}</span>
                    <span>{{ member.phone }}</span>
                    <span>{{ member.jobTitle || '-' }}</span>
                    <span>{{ member.departmentName || '-' }}</span>
                    <span>{{ member.userRole }}</span>
                    <span>{{ member.status }}</span>
                  </div>
                </div>
              </div>
            </template>
          </template>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.organization-management-head {
  align-items: flex-start;
}

.organization-list-block {
  display: grid;
  gap: 12px;
}

.organization-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.organization-pagination__info {
  color: var(--on-surface-variant, #596061);
  font-size: 0.82rem;
  font-weight: 800;
}

.organization-management-tabs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.organization-list-item {
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.15s ease;
}

.organization-list-item:hover {
  border-color: #111827;
  background: rgba(17, 24, 39, 0.04);
}

.organization-list-item:focus-visible {
  outline: 2px solid rgb(var(--primary-rgb, 0 95 115) / 0.45);
  outline-offset: 2px;
}

.organization-list-item.is-selected {
  cursor: default;
}

.organization-list-item.is-disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.organization-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.organization-summary-card {
  min-height: 78px;
  display: grid;
  align-content: center;
  gap: 5px;
  padding: 12px 14px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.3);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.95);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.organization-summary-card:disabled {
  cursor: default;
  opacity: 0.65;
}

.organization-summary-card span {
  color: var(--on-surface-variant, #596061);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.organization-summary-card strong {
  color: var(--on-surface, #111827);
  font-size: 1.45rem;
  line-height: 1;
}

.organization-entity-card {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  margin-bottom: 14px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.9);
}

.organization-entity-card__image {
  width: 84px;
  height: 84px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  background: rgb(var(--surface-container-high-rgb, 228 233 234) / 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.organization-entity-card__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.organization-entity-card__image .material-symbols-outlined {
  font-size: 34px;
  color: var(--on-surface-variant, #596061);
}

.organization-entity-card__body {
  min-width: 0;
}

.organization-entity-card__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--on-surface-variant, #596061);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.organization-entity-card__title {
  display: block;
  margin-bottom: 8px;
  color: var(--on-surface, #111827);
  font-size: 1.45rem;
  line-height: 1.15;
}

.organization-entity-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.organization-entity-card__meta span {
  padding: 4px 8px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  background: rgb(var(--surface-container-low-rgb, 244 247 248) / 0.9);
  color: var(--on-surface-variant, #596061);
  font-size: 0.78rem;
  font-weight: 700;
}

.organization-inline-edit .profile-kv__row {
  align-items: center;
}

.organization-inline-edit .profile-kv__row input {
  width: min(100%, 360px);
  justify-self: end;
  text-align: right;
}

.organization-inline-edit .profile-kv__row :deep(.phone-field),
.organization-inline-edit .profile-kv__row :deep(.phone-field__control),
.organization-inline-edit .profile-kv__row :deep(label),
.organization-inline-edit .profile-kv__row :deep(input) {
  width: min(100%, 360px);
  justify-self: end;
}

.organization-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.organization-form-actions .page-button {
  min-width: 120px;
}

.organization-create-form__contact-name {
  display: grid;
  grid-template-columns: minmax(120px, 0.42fr) minmax(0, 1fr);
  gap: 14px;
}

.organization-danger-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.organization-danger-actions .page-button {
  width: 96px;
  min-height: 40px;
  margin-top: 0;
}

/* 사원관리 서브탭 */
.member-subtabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
}

/* 직접 등록 */
.member-add-block {
  display: grid;
  gap: 16px;
}

.member-add-actions {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  align-items: center;
}

.member-create-table {
  width: 100%;
}

.member-create-table__head,
.member-create-table__row {
  display: grid;
  grid-template-columns: 0.8fr 0.8fr 1.4fr 1.1fr 0.9fr 1.2fr 72px;
  gap: 8px;
  align-items: center;
  padding: 6px 0;
}

.member-create-table__head {
  border-bottom: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  margin-bottom: 4px;
}

.member-create-table__head span {
  font-size: 11px;
  font-weight: 700;
  color: var(--on-surface-variant, #596061);
  letter-spacing: 0.04em;
}

.member-create-table__row {
  border-bottom: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.15);
}

.member-create-table__row:last-of-type {
  border-bottom: 0;
}

.member-create-table__row input,
.member-create-table__row select,
.member-create-table__row .page-button {
  height: 30px !important;
  min-height: unset !important;
  width: 100%;
  font-size: 12px;
  padding: 0 8px;
  border-radius: 0;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.45);
  background: #fff;
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  line-height: 30px !important;
}

.member-create-table__row .page-button {
  padding: 0;
  cursor: pointer;
  color: var(--on-surface, #111827);
}

.member-create-table__feedback {
  grid-column: 1 / -1;
  padding: 5px 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.member-create-table__feedback--success {
  color: var(--on-surface-variant, #596061);
}

.member-create-table__feedback--error {
  color: var(--error, #b3261e);
}

/* 엑셀 업로드 */
.member-excel-block {
  display: grid;
  gap: 4px;
}

/* 사원 목록 */
.member-list-block {
  display: grid;
  gap: 12px;
}

.member-list-row {
  grid-template-columns: 1fr 1.5fr 1fr 0.8fr 1fr 0.9fr 0.7fr;
  font-size: 13px;
  padding: 8px 0;
}

.member-list-row strong {
  color: var(--on-surface, #111827);
  font-weight: 700;
}

.member-list-row span {
  color: var(--on-surface-variant, #596061);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}


@media (max-width: 720px) {
  .member-create-table__head {
    display: none;
  }

  .member-create-table__row {
    grid-template-columns: 1fr 1fr;
  }

  .member-create-table__row input:nth-child(3),
  .member-create-table__row input:nth-child(4),
  .member-create-table__row select {
    grid-column: 1 / -1;
  }
}
@media (max-width: 720px) {
  .organization-management-head {
    display: grid;
    gap: 12px;
  }

  .organization-summary-grid {
    grid-template-columns: 1fr;
  }

  .organization-entity-card {
    grid-template-columns: 70px minmax(0, 1fr);
  }

  .organization-create-form__contact-name {
    grid-template-columns: 1fr;
  }

  .organization-entity-card__image {
    width: 70px;
    height: 70px;
  }

  .organization-entity-card__actions {
    grid-column: 1 / -1;
  }

  .organization-entity-card__actions .page-button,
  .organization-form-actions .page-button {
    width: 100%;
  }

  .organization-form-actions,
  .organization-danger-actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .organization-danger-actions .page-button {
    width: 100%;
  }

  .organization-inline-edit .profile-kv__row input,
  .organization-inline-edit .profile-kv__row :deep(.phone-field),
  .organization-inline-edit .profile-kv__row :deep(.phone-field__control),
  .organization-inline-edit .profile-kv__row :deep(label),
  .organization-inline-edit .profile-kv__row :deep(input) {
    width: 100%;
    justify-self: stretch;
    text-align: left;
  }

  .member-create-card__fields {
    grid-template-columns: 1fr 1fr;
  }

  .member-subtabs {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .member-create-card__fields {
    grid-template-columns: 1fr;
  }
}
</style>
