<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ko, enUS } from 'date-fns/locale'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import PhoneField from '../../../components/forms/PhoneField.vue'
import BaseModal from '../../shared/components/BaseModal.vue'
import { getAttachmentOriginalImagePath, uploadUserProfileImage } from '../../../services/file'
import {
  changePassword,
  getDepartments,
  getMyInfo,
  getMyLoginHistories,
  getMySecurityHistories,
  getUserDetailByPublicId,
  updateUser,
  type DepartmentOption,
  type LoginHistoryListItem,
  type MyInfoResponse,
  type SecurityHistoryListItem,
  type UserDetailResponse,
} from '../../../services/user'
import {
  getMyOrganizationDetail,
  type OrganizationDetailResponse,
} from '../../../services/organization'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasNavigationStore } from '../../../stores/navigation'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasSessionStore } from '../../../stores/session'
import { notifyProfileImageUpdated } from '../../../utils/profileImageEvents'

// 이 페이지에서는 헤더 액션을 따로 쓰지 않아서 비워 둡니다.
const header = useAtlasHeaderStore()

// 강제 비밀번호 변경이 끝난 뒤 이동할 첫 화면을 찾을 때 씁니다.
const navigation = useAtlasNavigationStore()

// 현재 언어 설정을 읽습니다.
const preferences = useAtlasPreferencesStore()

// 로그인 사용자 상태를 읽습니다.
const session = useAtlasSessionStore()

// 로그인한 사용자 요약 정보입니다.
const myInfo = ref<MyInfoResponse | null>(null)

// 로그인한 사용자 상세 정보입니다.
const userDetail = ref<UserDetailResponse | null>(null)

// 로그인한 사용자의 조직 상세 정보입니다.
const organizationDetail = ref<OrganizationDetailResponse | null>(null)

// 로그인 이력 목록입니다.
const loginHistories = ref<LoginHistoryListItem[]>([])

// 보안 이력 목록입니다.
const securityHistories = ref<SecurityHistoryListItem[]>([])

// 로그인 이력 더보기 모달 열림 상태입니다.
const loginHistoryModalOpen = ref(false)

// 보안 이력 더보기 모달 열림 상태입니다.
const securityHistoryModalOpen = ref(false)

// 프로필 이미지 보기 모달 열림 상태입니다.
const profileImageViewerOpen = ref(false)

// 로그인 이력 모달 안에서 보여줄 전체 목록입니다.
const loginHistoryModalItems = ref<LoginHistoryListItem[]>([])

// 보안 이력 모달 안에서 보여줄 전체 목록입니다.
const securityHistoryModalItems = ref<SecurityHistoryListItem[]>([])

// 프로필 원본 이미지 URL 입니다.
const profileImageViewerSrc = ref('')

// 로그인 이력 모달 로딩 상태입니다.
const isLoadingLoginHistoryModal = ref(false)

// 보안 이력 모달 로딩 상태입니다.
const isLoadingSecurityHistoryModal = ref(false)

// 프로필 이미지 원본 로딩 상태입니다.
const isLoadingProfileImageViewer = ref(false)

// 로그인 이력 기간 필터입니다.
const loginHistoryFilter = reactive({
  from: '',
  to: '',
})

// 보안 이력 기간 필터입니다.
const securityHistoryFilter = reactive({
  from: '',
  to: '',
})

// 날짜 범위 선택기 값입니다.
// 문자열 날짜만 쓰면 시간 정보가 끼지 않습니다.
type DateRangeValue = string[] | null

// 빠른 기간 버튼 타입입니다.
type QuickRange = '7d' | '1m' | '6m' | 'all' | ''

// 로그인 이력 날짜 범위 선택 값입니다.
const loginHistoryRange = ref<DateRangeValue>(null)

// 보안 이력 날짜 범위 선택 값입니다.
const securityHistoryRange = ref<DateRangeValue>(null)

// 로그인 이력 빠른 기간 버튼 선택 상태입니다.
const loginHistoryQuickRange = ref<QuickRange>('all')

// 보안 이력 빠른 기간 버튼 선택 상태입니다.
const securityHistoryQuickRange = ref<QuickRange>('all')

// 사용자 수정과 비밀번호 변경에 필요한 내부 userId입니다.
const currentUserId = ref<number | null>(null)

// 프로필 전체 로딩 상태입니다.
const isLoadingProfile = ref(false)

// 기본 정보 저장 중 상태입니다.
const isSavingProfile = ref(false)

// 부서 목록 로딩 상태입니다.
const isLoadingDepartmentOptions = ref(false)

// 프로필 이미지 업로드 상태입니다.
const isUploadingProfileImage = ref(false)

// 강제 비밀번호 변경 저장 중 상태입니다.
const isSubmittingPassword = ref(false)

// 조회 모드와 수정 모드를 나눕니다.
const isEditing = ref(false)

// 프로필 조회/수정 에러 문구입니다.
const profileError = ref('')

// 프로필 저장 성공 문구입니다.
const profileSuccess = ref('')

// 비밀번호 변경 에러 문구입니다.
const passwordError = ref('')

// 비밀번호 변경 성공 문구입니다.
const passwordSuccess = ref('')

// 프로필 이미지 보기 에러 문구입니다.
const profileImageViewerError = ref('')

// 연락처 유효성 상태입니다.
const profilePhoneValid = ref(false)

// 부서 드롭다운 옵션입니다.
const departmentOptions = ref<DepartmentOption[]>([])

// 프로필 이미지 파일 입력 ref 입니다.
const profileImageInput = ref<HTMLInputElement | null>(null)

// 기본 정보 수정 폼입니다.
const profileForm = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
  departmentPublicId: '',
})

// 강제 비밀번호 변경 폼입니다.
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
})

// 달력 언어를 현재 화면 언어에 맞춥니다.
const datePickerLocale = computed(() => {
  if (preferences.language === 'ko') {
    return ko
  }

  return enUS
})

// 입력칸과 달력 표시 형식을 언어에 맞춥니다.
const datePickerFormats = computed(() => ({
  // 입력칸에는 날짜만 보이게 합니다.
  input: preferences.language === 'ko' ? 'yyyy-MM-dd' : 'MM/dd/yyyy',

  // 아래 미리보기에도 날짜만 보이게 합니다.
  preview: preferences.language === 'ko' ? 'yyyy-MM-dd' : 'MM/dd/yyyy',

  // 달력 상단 월 표기를 언어에 맞춥니다.
  month: preferences.language === 'ko' ? 'M월' : 'LLL',

  // 달력 상단 연도 표기를 언어에 맞춥니다.
  year: preferences.language === 'ko' ? 'yyyy년' : 'yyyy',

  // 요일 표기도 언어에 맞춥니다.
  weekDay: preferences.language === 'ko' ? 'EEE' : 'EEE',
}))

// 사용자 상세 값을 수정 폼에 그대로 채웁니다.
function syncProfileForm(detail: UserDetailResponse) {
  profileForm.firstName = detail.firstName ?? ''
  profileForm.middleName = detail.middleName ?? ''
  profileForm.lastName = detail.lastName ?? ''
  profileForm.email = detail.email ?? ''
  profileForm.phone = detail.phone ?? ''
  profileForm.jobTitle = detail.jobTitle ?? ''
  profileForm.departmentPublicId = detail.departmentPublicId ?? ''

  // 기존 연락처가 있으면 처음에는 유효한 값으로 봅니다.
  profilePhoneValid.value = Boolean(detail.phone)
}

async function loadDepartmentOptions() {
  try {
    isLoadingDepartmentOptions.value = true
    const response = await getDepartments()
    departmentOptions.value = [...response].sort((a, b) =>
      a.departmentName.localeCompare(
        b.departmentName,
        preferences.language === 'ko' ? 'ko-KR' : 'en-US',
      ),
    )
  } catch {
    departmentOptions.value = []
  } finally {
    isLoadingDepartmentOptions.value = false
  }
}

function triggerProfileImagePicker() {
  profileImageInput.value?.click()
}

async function handleProfileImageSelected(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]

  if (!file || !userDetail.value?.userPublicId || !currentUserId.value) {
    if (input) input.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    profileError.value =
      preferences.language === 'ko'
        ? '이미지 파일만 업로드할 수 있습니다.'
        : 'Only image files can be uploaded.'

    input.value = ''
    return
  }

  try {
    isUploadingProfileImage.value = true
    profileError.value = ''
    profileSuccess.value = ''

    const uploadResponse = await uploadUserProfileImage(file, userDetail.value.userPublicId)
    const attachmentPublicId = uploadResponse.attachmentPublicId
    const fileThumbPath = uploadResponse.files[0]?.fileThumbPath

    if (!attachmentPublicId || !fileThumbPath) {
      throw new Error('Invalid profile upload response')
    }

    const updatedUser = await updateUser(currentUserId.value, {
      profileAttachmentPublicId: attachmentPublicId,
      profileImageThumbPath: fileThumbPath,
    })

    userDetail.value = updatedUser
    syncProfileForm(updatedUser)

    if (myInfo.value) {
      myInfo.value = {
        ...myInfo.value,
        profileAttachmentPublicId: updatedUser.profileAttachmentPublicId ?? attachmentPublicId,
        profileImageThumbPath: updatedUser.profileImageThumbPath ?? fileThumbPath,
      }
    }

    notifyProfileImageUpdated()

    profileSuccess.value =
      preferences.language === 'ko'
        ? '프로필 이미지가 수정되었습니다.'
        : 'Profile image has been updated.'
  } catch {
    profileError.value =
      preferences.language === 'ko'
        ? '프로필 이미지 업로드에 실패했습니다.'
        : 'Failed to upload the profile image.'
  } finally {
    isUploadingProfileImage.value = false
    if (input) {
      input.value = ''
    }
  }
}

async function openProfileImageViewer() {
  if (!userDetail.value?.profileAttachmentPublicId) {
    return
  }

  try {
    profileImageViewerOpen.value = true
    isLoadingProfileImageViewer.value = true
    profileImageViewerError.value = ''
    profileImageViewerSrc.value = ''

    const originalImagePath = await getAttachmentOriginalImagePath(
      userDetail.value.profileAttachmentPublicId,
    )

    if (!originalImagePath) {
      throw new Error('Original image not found')
    }

    profileImageViewerSrc.value = originalImagePath
  } catch {
    profileImageViewerError.value =
      preferences.language === 'ko'
        ? '원본 프로필 이미지를 불러오지 못했습니다.'
        : 'Could not load the original profile image.'
  } finally {
    isLoadingProfileImageViewer.value = false
  }
}

// 페이지에 필요한 데이터를 모두 읽습니다.
async function loadProfileData() {
  try {
    // 로딩 시작 전에 메시지를 정리합니다.
    isLoadingProfile.value = true
    profileError.value = ''
    profileSuccess.value = ''

    // 로그인 사용자 기본 정보를 먼저 읽습니다.
    const myInfoResponse = await getMyInfo()
    myInfo.value = myInfoResponse

    // 프로필 상세 정보도 바로 읽습니다.
    const detailResponse = await getUserDetailByPublicId(myInfoResponse.userPublicId)
    userDetail.value = detailResponse
    currentUserId.value = detailResponse.userId
    syncProfileForm(detailResponse)

    // 조직 정보는 실패해도 프로필 전체를 막지 않게 분리합니다.
    try {
      organizationDetail.value = await getMyOrganizationDetail()
    } catch {
      organizationDetail.value = null
    }

    // 로그인 이력도 실패하면 빈 배열로 둡니다.
    try {
      const loginHistoryResponse = await getMyLoginHistories({ page: 0, size: 20 })
      loginHistories.value = loginHistoryResponse.content
    } catch {
      loginHistories.value = []
    }

    // 보안 이력도 실패하면 빈 배열로 둡니다.
    try {
      const securityHistoryResponse = await getMySecurityHistories({ page: 0, size: 20 })
      securityHistories.value = securityHistoryResponse.content
    } catch {
      securityHistories.value = []
    }
  } catch {
    profileError.value =
      preferences.language === 'ko'
        ? '사용자 정보를 불러오지 못했습니다. 다시 로그인해 주세요.'
        : 'Failed to load user information. Please sign in again.'
  } finally {
    // 마지막에는 로딩 상태를 끕니다.
    isLoadingProfile.value = false
  }
}

// 수정 모드를 시작합니다.
function startEdit() {
  // 수정 시작 전에 현재 값을 폼에 다시 넣습니다.
  if (userDetail.value) {
    syncProfileForm(userDetail.value)
  }

  if (departmentOptions.value.length === 0 && !isLoadingDepartmentOptions.value) {
    loadDepartmentOptions()
  }

  profileError.value = ''
  profileSuccess.value = ''
  isEditing.value = true
}

// 수정 모드를 취소합니다.
function cancelEdit() {
  // 취소하면 원래 값으로 되돌립니다.
  if (userDetail.value) {
    syncProfileForm(userDetail.value)
  }

  profileError.value = ''
  profileSuccess.value = ''
  isEditing.value = false
}

// 기본 정보 저장입니다.
async function submitProfileUpdate() {
  // 내부 userId가 없으면 요청을 보낼 수 없습니다.
  if (!currentUserId.value) {
    profileError.value =
      preferences.language === 'ko'
        ? '사용자 식별 정보를 찾지 못했습니다.'
        : 'Could not find the current user id.'
    return
  }

  profileError.value = ''
  profileSuccess.value = ''

  // 필수 값이 비었는지 먼저 확인합니다.
  if (
    !profileForm.firstName.trim() ||
    !profileForm.lastName.trim() ||
    !profileForm.email.trim() ||
    !profileForm.phone.trim()
  ) {
    profileError.value =
      preferences.language === 'ko'
        ? '이름, 성, 이메일, 연락처는 필수입니다.'
        : 'First name, last name, email, and phone are required.'
    return
  }

  // 연락처 형식도 같이 확인합니다.
  if (!profilePhoneValid.value) {
    profileError.value =
      preferences.language === 'ko'
        ? '연락처 형식이 올바르지 않습니다.'
        : 'The phone number format is invalid.'
    return
  }

  try {
    isSavingProfile.value = true

    // 실제 수정 API를 호출합니다.
    const updatedUser = await updateUser(currentUserId.value, {
      firstName: profileForm.firstName.trim(),
      middleName: profileForm.middleName.trim() || undefined,
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone,
      jobTitle: profileForm.jobTitle.trim() || undefined,
      departmentPublicId: profileForm.departmentPublicId || undefined,
    })

    // 저장 후 화면 데이터도 새 값으로 바꿉니다.
    userDetail.value = updatedUser
    syncProfileForm(updatedUser)
    isEditing.value = false

    // 보안 이력도 다시 읽어서 최신 상태로 맞춥니다.
    try {
      const securityHistoryResponse = await getMySecurityHistories({ page: 0, size: 20 })
      securityHistories.value = securityHistoryResponse.content
    } catch {
      // 이 부분은 실패해도 저장 자체는 유지합니다.
    }

    profileSuccess.value =
      preferences.language === 'ko'
        ? '프로필 정보가 수정되었습니다.'
        : 'Profile information has been updated.'
  } catch (error: any) {
    profileError.value =
      error?.payload?.message ||
      (preferences.language === 'ko'
        ? '프로필 수정에 실패했습니다.'
        : 'Failed to update the profile.')
  } finally {
    isSavingProfile.value = false
  }
}

// 강제 비밀번호 변경 처리입니다.
async function submitPasswordChange() {
  passwordError.value = ''
  passwordSuccess.value = ''

  // 내부 userId가 없으면 비밀번호 변경을 할 수 없습니다.
  if (!currentUserId.value) {
    passwordError.value =
      preferences.language === 'ko'
        ? '사용자 식별 정보를 찾지 못했습니다.'
        : 'Could not find the current user id.'
    return
  }

  // 새 비밀번호 입력 여부를 확인합니다.
  if (!passwordForm.newPassword || !passwordForm.newPasswordConfirm) {
    passwordError.value =
      preferences.language === 'ko'
        ? '새 비밀번호와 확인 값을 입력해 주세요.'
        : 'Please fill in the new password fields.'
    return
  }

  // 두 값이 다르면 변경하지 않습니다.
  if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
    passwordError.value =
      preferences.language === 'ko'
        ? '새 비밀번호와 확인 값이 다릅니다.'
        : 'New password and confirmation do not match.'
    return
  }

  try {
    isSubmittingPassword.value = true

    // 강제 변경 상황이라 현재 비밀번호는 빈 값으로 보냅니다.
    await changePassword(currentUserId.value, {
      currentPassword: '',
      newPassword: passwordForm.newPassword,
      newPasswordConfirm: passwordForm.newPasswordConfirm,
    })

    // 강제 변경 상태를 해제합니다.
    session.passwordChangeRequired = false
    window.sessionStorage.setItem('atlas-password-change-required', 'false')

    // 입력값을 비웁니다.
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.newPasswordConfirm = ''

    // 프로필 데이터를 다시 읽습니다.
    await loadProfileData()

    // 접근 가능한 첫 화면으로 이동합니다.
    const firstAvailablePage =
      navigation.availableNavItems.find((item) => !item.hidden)?.key ?? 'profile'

    navigation.navigateToPage(firstAvailablePage)
  } catch (error: any) {
    passwordError.value =
      error?.payload?.message ||
      (preferences.language === 'ko'
        ? '비밀번호 변경에 실패했습니다.'
        : 'Failed to change password.')
  } finally {
    isSubmittingPassword.value = false
  }
}

// 화면에 보여줄 전체 이름입니다.
const fullName = computed(() => {
  if (!userDetail.value) return '-'

  return [
    userDetail.value.lastName,
    userDetail.value.middleName,
    userDetail.value.firstName,
  ]
    .filter((value) => value && String(value).trim().length > 0)
    .join(' ')
})

// 조직 담당자 이름을 한 줄로 만듭니다.
const organizationContactName = computed(() => {
  if (!organizationDetail.value) return '-'

  return [
    organizationDetail.value.contactLastName,
    organizationDetail.value.contactMiddleName,
    organizationDetail.value.contactFirstName,
  ]
    .filter((value) => value && String(value).trim().length > 0)
    .join(' ')
})

// 현재 역할 텍스트입니다.
const currentRoleLabel = computed(() => {
  if (myInfo.value?.role === 'ADMIN') return 'ADMIN'
  if (myInfo.value?.role === 'ORG_ADMIN') return 'ORG_ADMIN'
  return 'USER'
})

// 조직 타입은 조직 상세 값이 있으면 그 값을 우선 씁니다.
const currentOrganizationTypeLabel = computed(() => {
  return organizationDetail.value?.organizationType || session.organizationType || '-'
})

const currentDepartmentLabel = computed(() => {
  if (!userDetail.value?.departmentName) return '-'

  if (!userDetail.value.departmentCode) {
    return userDetail.value.departmentName
  }

  return `${userDetail.value.departmentName} (${userDetail.value.departmentCode})`
})

const profileThumbnailUrl = computed(() => userDetail.value?.profileImageThumbPath ?? '')
const canOpenProfileImageViewer = computed(() => Boolean(userDetail.value?.profileAttachmentPublicId))

// 역할 분기용 값입니다.
const isAdmin = computed(() => myInfo.value?.role === 'ADMIN')
const isOrgAdmin = computed(() => myInfo.value?.role === 'ORG_ADMIN')
const isUser = computed(() => myInfo.value?.role === 'USER')

// 로그인 이력 카드는 최근 4개만 미리 보여줍니다.
const visibleLoginHistories = computed(() => {
  return loginHistories.value.slice(0, 4)
})

// 로그인 이력이 5개 이상이면 더보기 버튼을 보여줍니다.
const canShowMoreLoginHistories = computed(() => loginHistories.value.length > 4)

// 보안 이력 카드도 최근 4개만 미리 보여줍니다.
const visibleSecurityHistories = computed(() => {
  return securityHistories.value.slice(0, 4)
})

// 보안 이력이 5개 이상이면 더보기 버튼을 보여줍니다.
const canShowMoreSecurityHistories = computed(() => securityHistories.value.length > 4)

// 날짜와 시간을 보기 좋게 보여줍니다.
// 이 함수는 이력 목록용이라 시간까지 포함합니다.
function formatDateTime(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date)
}

// 로그인 이력 카드 첫 줄에는 시간만 간단히 보여줍니다.
function formatLoginTimeOnly(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const timeText = new Intl.DateTimeFormat(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date)

  return `${timeText} KST`
}

// 브라우저 문자열이 너무 길면 대표 이름만 보여줍니다.
// 브라우저 이름과 버전을 같이 보여줍니다.
// 예: Chrome 135, Edge 134, Firefox 126, Safari 17
function formatUserAgent(value?: string | null) {
  // user-agent 가 없으면 표시할 수 없습니다.
  if (!value) return '-'

  // 정규식에서 첫 번째 버전만 뽑아 쓰기 위한 함수입니다.
  const pickVersion = (pattern: RegExp) => {
    const match = value.match(pattern)
    return match?.[1] || ''
  }

  // Edge 는 Chrome 문자열도 같이 들어 있어서 먼저 검사합니다.
  if (value.includes('Edg/')) {
    const version = pickVersion(/Edg\/([0-9.]+)/)
    return version ? `Edge ${version}` : 'Edge'
  }

  // Chrome 계열 브라우저는 Chrome 버전을 보여줍니다.
  if (value.includes('Chrome/')) {
    const version = pickVersion(/Chrome\/([0-9.]+)/)
    return version ? `Chrome ${version}` : 'Chrome'
  }

  // Firefox 버전을 보여줍니다.
  if (value.includes('Firefox/')) {
    const version = pickVersion(/Firefox\/([0-9.]+)/)
    return version ? `Firefox ${version}` : 'Firefox'
  }

  // Safari 는 Version/x.y.z 형태의 버전을 같이 봐야 합니다.
  if (value.includes('Safari/') && !value.includes('Chrome/')) {
    const version = pickVersion(/Version\/([0-9.]+)/)
    return version ? `Safari ${version}` : 'Safari'
  }

  // 규칙에 안 걸리면 너무 길지 않게만 잘라서 보여줍니다.
  return value.length > 60 ? `${value.slice(0, 60)}...` : value
}


// 브라우저 문자열에서 운영체제 이름만 간단히 뽑습니다.
// 운영체제 이름과 버전을 같이 보여줍니다.
// 예: Windows 10/11, macOS 10.15.7, Android 14, iOS 17.4
function formatClientOs(value?: string | null) {
  // user-agent 가 없으면 표시할 수 없습니다.
  if (!value) return '-'

  // Windows 버전은 NT 버전 기준으로 사람이 읽기 쉽게 바꿉니다.
  const windowsMatch = value.match(/Windows NT ([0-9.]+)/)
  if (windowsMatch) {
    const ntVersion = windowsMatch[1]

    // Windows UA 는 10과 11이 둘 다 NT 10.0 으로 잡히는 경우가 많습니다.
    if (ntVersion === '10.0') return 'Windows 10/11'
    if (ntVersion === '6.3') return 'Windows 8.1'
    if (ntVersion === '6.2') return 'Windows 8'
    if (ntVersion === '6.1') return 'Windows 7'

    return `Windows ${ntVersion}`
  }

  // macOS 버전은 밑줄을 점으로 바꿔서 보여줍니다.
  const macMatch = value.match(/Mac OS X ([0-9_]+)/)
  if (macMatch) {
    const version = macMatch[1].replace(/_/g, '.')
    return `macOS ${version}`
  }

  // Android 버전은 그대로 보여줍니다.
  const androidMatch = value.match(/Android ([0-9.]+)/)
  if (androidMatch) {
    return `Android ${androidMatch[1]}`
  }

  // iPhone, iPad 의 iOS 버전도 점으로 바꿔서 보여줍니다.
  const iosMatch = value.match(/OS ([0-9_]+) like Mac OS X/)
  if (iosMatch) {
    const version = iosMatch[1].replace(/_/g, '.')
    return `iOS ${version}`
  }

  // Linux 는 보통 세부 버전이 잘 안 잡혀서 이름만 보여줍니다.
  if (value.includes('Linux')) return 'Linux'

  return 'Other'
}


// 로그인 실패 사유 코드를 화면용 문구로 바꿉니다.
function formatLoginFailureReason(reason?: string | null) {
  if (!reason) return '-'

  if (preferences.language === 'ko') {
    switch (reason) {
      case 'INVALID_PASSWORD':
        return '비밀번호 불일치'
      case 'INVALID_LOGIN_ID':
        return '존재하지 않는 로그인 ID'
      case 'INACTIVE_USER':
        return '비활성화된 계정'
      case 'IP_VERIFICATION_EXPIRED':
        return '이메일 인증 시간이 만료되었습니다'
      case 'IP_VERIFICATION_CODE_MISMATCH':
        return '이메일 인증 코드가 올바르지 않습니다'
      case 'NEW_IP_VERIFICATION_REQUIRED':
        return '새로운 IP에서 로그인해 이메일 인증이 필요합니다'
      default:
        return reason
    }
  }

  switch (reason) {
    case 'INVALID_PASSWORD':
      return 'Invalid password'
    case 'INVALID_LOGIN_ID':
      return 'Invalid login ID'
    case 'INACTIVE_USER':
      return 'Inactive account'
    case 'IP_VERIFICATION_EXPIRED':
      return 'Email verification expired'
    case 'IP_VERIFICATION_CODE_MISMATCH':
      return 'Email verification code mismatch'
    case 'NEW_IP_VERIFICATION_REQUIRED':
      return 'New IP verification required'
    default:
      return reason
  }
}

// Date 값을 백엔드용 문자열 날짜로 바꿉니다.
function formatDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 선택된 날짜 범위를 필터에 넣습니다.
// 시작일과 종료일이 모두 있으면 true를 돌려줍니다.
function syncRangeToFilter(range: DateRangeValue, filter: { from: string; to: string }) {
  if (!range) {
    filter.from = ''
    filter.to = ''
    return false
  }

  const from = range[0] ?? ''
  const to = range[1] ?? ''

  filter.from = from
  filter.to = to

  return Boolean(from && to)
}

// 빠른 기간 버튼이 선택됐을 때 진한 색을 줍니다.
function getQuickRangeButtonStyle(isActive: boolean) {
  if (isActive) {
    return {
      backgroundColor: '#111827',
      borderColor: '#111827',
      color: '#ffffff',
    }
  }

  return {}
}

// 로그인 이력 모달 목록을 기간 조건으로 다시 읽습니다.
async function loadLoginHistoryModalItems() {
  try {
    isLoadingLoginHistoryModal.value = true

    const response = await getMyLoginHistories({
      page: 0,
      size: 100,
      from: loginHistoryFilter.from || undefined,
      to: loginHistoryFilter.to || undefined,
    })

    loginHistoryModalItems.value = response.content
  } catch {
    loginHistoryModalItems.value = []
  } finally {
    isLoadingLoginHistoryModal.value = false
  }
}

// 보안 이력 모달 목록을 기간 조건으로 다시 읽습니다.
async function loadSecurityHistoryModalItems() {
  try {
    isLoadingSecurityHistoryModal.value = true

    const response = await getMySecurityHistories({
      page: 0,
      size: 100,
      from: securityHistoryFilter.from || undefined,
      to: securityHistoryFilter.to || undefined,
    })

    securityHistoryModalItems.value = response.content
  } catch {
    securityHistoryModalItems.value = []
  } finally {
    isLoadingSecurityHistoryModal.value = false
  }
}

// 로그인 이력 더보기 모달을 열고 최신 목록을 읽습니다.
async function openLoginHistoryModal() {
  loginHistoryModalOpen.value = true
  await loadLoginHistoryModalItems()
}

// 보안 이력 더보기 모달을 열고 최신 목록을 읽습니다.
async function openSecurityHistoryModal() {
  securityHistoryModalOpen.value = true
  await loadSecurityHistoryModalItems()
}

// 로그인 이력 날짜 범위를 직접 바꾸면 바로 반영합니다.
async function handleLoginHistoryRangeChange(range: DateRangeValue) {
  // 직접 선택했으니 빠른 버튼 강조는 해제합니다.
  loginHistoryQuickRange.value = ''

  // 현재 선택한 값을 저장합니다.
  loginHistoryRange.value = range

  // 필터에도 같은 값을 넣습니다.
  const isCompletedRange = syncRangeToFilter(range, loginHistoryFilter)

  // 값을 지웠으면 전체 조회로 바로 돌아갑니다.
  if (!range) {
    await loadLoginHistoryModalItems()
    return
  }

  // 시작일과 종료일이 모두 선택됐을 때만 바로 조회합니다.
  if (isCompletedRange) {
    await loadLoginHistoryModalItems()
  }
}

// 보안 이력 날짜 범위를 직접 바꾸면 바로 반영합니다.
async function handleSecurityHistoryRangeChange(range: DateRangeValue) {
  // 직접 선택했으니 빠른 버튼 강조는 해제합니다.
  securityHistoryQuickRange.value = ''

  // 현재 선택한 값을 저장합니다.
  securityHistoryRange.value = range

  // 필터에도 같은 값을 넣습니다.
  const isCompletedRange = syncRangeToFilter(range, securityHistoryFilter)

  // 값을 지웠으면 전체 조회로 바로 돌아갑니다.
  if (!range) {
    await loadSecurityHistoryModalItems()
    return
  }

  // 시작일과 종료일이 모두 선택됐을 때만 바로 조회합니다.
  if (isCompletedRange) {
    await loadSecurityHistoryModalItems()
  }
}

// 로그인 이력 기간 필터를 전체로 되돌립니다.
async function resetLoginHistoryFilter() {
  loginHistoryQuickRange.value = 'all'
  loginHistoryRange.value = null
  loginHistoryFilter.from = ''
  loginHistoryFilter.to = ''
  await loadLoginHistoryModalItems()
}

// 보안 이력 기간 필터를 전체로 되돌립니다.
async function resetSecurityHistoryFilter() {
  securityHistoryQuickRange.value = 'all'
  securityHistoryRange.value = null
  securityHistoryFilter.from = ''
  securityHistoryFilter.to = ''
  await loadSecurityHistoryModalItems()
}

// 로그인 이력 빠른 기간 버튼을 적용합니다.
async function setLoginHistoryQuickRange(range: QuickRange) {
  loginHistoryQuickRange.value = range

  // 전체는 필터를 비우고 바로 다시 조회합니다.
  if (range === 'all') {
    await resetLoginHistoryFilter()
    return
  }

  const to = new Date()
  const from = new Date()

  if (range === '7d') {
    from.setDate(from.getDate() - 7)
  } else if (range === '1m') {
    from.setMonth(from.getMonth() - 1)
  } else if (range === '6m') {
    from.setMonth(from.getMonth() - 6)
  }

  const fromText = formatDateInputValue(from)
  const toText = formatDateInputValue(to)

  // 선택기 값도 같이 바꿉니다.
  loginHistoryRange.value = [fromText, toText]

  // 실제 API용 필터도 바로 맞춥니다.
  loginHistoryFilter.from = fromText
  loginHistoryFilter.to = toText

  // 버튼 클릭 후 바로 조회합니다.
  await loadLoginHistoryModalItems()
}

// 보안 이력 빠른 기간 버튼을 적용합니다.
async function setSecurityHistoryQuickRange(range: QuickRange) {
  securityHistoryQuickRange.value = range

  // 전체는 필터를 비우고 바로 다시 조회합니다.
  if (range === 'all') {
    await resetSecurityHistoryFilter()
    return
  }

  const to = new Date()
  const from = new Date()

  if (range === '7d') {
    from.setDate(from.getDate() - 7)
  } else if (range === '1m') {
    from.setMonth(from.getMonth() - 1)
  } else if (range === '6m') {
    from.setMonth(from.getMonth() - 6)
  }

  const fromText = formatDateInputValue(from)
  const toText = formatDateInputValue(to)

  // 선택기 값도 같이 바꿉니다.
  securityHistoryRange.value = [fromText, toText]

  // 실제 API용 필터도 바로 맞춥니다.
  securityHistoryFilter.from = fromText
  securityHistoryFilter.to = toText

  // 버튼 클릭 후 바로 조회합니다.
  await loadSecurityHistoryModalItems()
}

// 페이지가 열리면 데이터부터 읽습니다.
onMounted(() => {
  header.clearActions()
  loadProfileData()
  loadDepartmentOptions()
})

// 페이지를 떠날 때도 헤더 액션을 비웁니다.
onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <!-- 임시 비밀번호 로그인 직후에는 강제 비밀번호 변경 화면만 보여줍니다. -->
  <main v-if="session.passwordChangeRequired" class="login-screen">
    <section class="login-card">
      <div class="login-card__eyebrow">
        {{ preferences.language === 'ko' ? '보안 안내' : 'Security Notice' }}
      </div>

      <h1>
        {{ preferences.language === 'ko' ? '비밀번호를 먼저 변경해 주세요' : 'Please change your password first' }}
      </h1>

      <p>
        {{
          preferences.language === 'ko'
            ? '임시 비밀번호로 로그인한 계정입니다. 계속 사용하려면 새 비밀번호로 변경해야 합니다.'
            : 'This account signed in with a temporary password. Please set a new password before continuing.'
        }}
      </p>

      <div class="login-hint" style="margin-bottom: 12px;">
        {{ currentRoleLabel }}
      </div>

      <div v-if="isLoadingProfile" class="login-hint">
        {{ preferences.language === 'ko' ? '사용자 정보를 불러오는 중입니다...' : 'Loading user information...' }}
      </div>

      <form v-else class="login-form" @submit.prevent="submitPasswordChange">
        <label>
          <span>{{ preferences.language === 'ko' ? '새 비밀번호' : 'New Password' }}</span>
          <input
            v-model="passwordForm.newPassword"
            type="password"
            autocomplete="new-password"
          />
        </label>

        <label>
          <span>{{ preferences.language === 'ko' ? '새 비밀번호 확인' : 'Confirm New Password' }}</span>
          <input
            v-model="passwordForm.newPasswordConfirm"
            type="password"
            autocomplete="new-password"
          />
        </label>

        <button type="submit" :disabled="isSubmittingPassword">
          {{
            isSubmittingPassword
              ? (preferences.language === 'ko' ? '변경 중...' : 'Saving...')
              : (preferences.language === 'ko' ? '비밀번호 변경' : 'Change Password')
          }}
        </button>
      </form>

      <div v-if="passwordError" class="login-error">{{ passwordError }}</div>
      <div v-if="passwordSuccess" class="login-hint">{{ passwordSuccess }}</div>
    </section>
  </main>

  <!-- 일반 상태에서는 프로필 화면을 보여줍니다. -->
  <section v-else class="app-screen profile-page">
    <div v-if="isLoadingProfile" class="login-hint">
      {{ preferences.language === 'ko' ? '사용자 정보를 불러오는 중입니다...' : 'Loading user information...' }}
    </div>

    <div v-else-if="profileError" class="login-error">
      {{ profileError }}
    </div>

    <template v-else-if="userDetail && myInfo">
      <!-- 상단 수정 버튼 영역입니다. -->
      <div class="design-trigger-row" style="margin-bottom: 20px;">
        <button
          v-if="!isEditing"
          class="page-button page-button--primary"
          type="button"
          @click="startEdit"
        >
          {{ preferences.language === 'ko' ? '수정' : 'Edit' }}
        </button>

        <template v-else>
          <button
            class="page-button page-button--secondary"
            type="button"
            :disabled="isSavingProfile"
            @click="cancelEdit"
          >
            {{ preferences.language === 'ko' ? '취소' : 'Cancel' }}
          </button>

          <button
            class="page-button page-button--primary"
            type="button"
            :disabled="isSavingProfile"
            @click="submitProfileUpdate"
          >
            {{
              isSavingProfile
                ? (preferences.language === 'ko' ? '저장 중...' : 'Saving...')
                : (preferences.language === 'ko' ? '저장' : 'Save')
            }}
          </button>
        </template>
      </div>

      <div v-if="profileSuccess" class="login-hint" style="margin-bottom: 16px;">
        {{ profileSuccess }}
      </div>

      <!-- 위쪽 2칸은 내 정보와 조직 정보로 채웁니다. -->
      <section class="profile-summary">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">
                {{ preferences.language === 'ko' ? '내 정보' : 'My Info' }}
              </div>
              <h3>{{ preferences.language === 'ko' ? '프로필' : 'Profile' }}</h3>
            </div>
            <div class="profile-panel__head-side">
              <button
                class="profile-hero__avatar-button"
                type="button"
                :disabled="!canOpenProfileImageViewer"
                :title="canOpenProfileImageViewer
                  ? (preferences.language === 'ko' ? '원본 이미지 보기' : 'Open original image')
                  : (preferences.language === 'ko' ? '등록된 프로필 이미지가 없습니다.' : 'No profile image uploaded.')"
                @click="openProfileImageViewer"
              >
                <span class="profile-hero__avatar-frame" aria-hidden="true">
                  <img
                    v-if="profileThumbnailUrl"
                    :src="profileThumbnailUrl"
                    :alt="fullName"
                    class="profile-hero__avatar-image"
                  />
                  <span v-else class="material-symbols-outlined profile-hero__avatar-icon">person</span>
                </span>
              </button>
            </div>
          </div>

          <input
            ref="profileImageInput"
            type="file"
            accept="image/*"
            style="display: none;"
            @change="handleProfileImageSelected"
          />

          <div v-if="!isEditing" class="profile-kv">
            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '이름' : 'Name' }}</span>
              <strong>{{ fullName }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '로그인 ID' : 'Login ID' }}</span>
              <strong>{{ userDetail.loginId }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '이메일' : 'Email' }}</span>
              <strong>{{ userDetail.email || '-' }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '연락처' : 'Phone' }}</span>
              <strong>{{ userDetail.phone || '-' }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '직책' : 'Job Title' }}</span>
              <strong>{{ userDetail.jobTitle || '-' }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '부서' : 'Department' }}</span>
              <strong>{{ currentDepartmentLabel }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '권한' : 'Role' }}</span>
              <strong>{{ currentRoleLabel }}</strong>
            </div>
          </div>

          <div v-else>
            <div class="profile-hero profile-hero--edit">
              <div class="profile-hero__avatar-stack">
                <button
                  class="profile-hero__avatar-button"
                  type="button"
                  :disabled="!canOpenProfileImageViewer"
                  :title="canOpenProfileImageViewer
                    ? (preferences.language === 'ko' ? '원본 이미지 보기' : 'Open original image')
                    : (preferences.language === 'ko' ? '등록된 프로필 이미지가 없습니다.' : 'No profile image uploaded.')"
                  @click="openProfileImageViewer"
                >
                  <span class="profile-hero__avatar-frame" aria-hidden="true">
                    <img
                      v-if="profileThumbnailUrl"
                      :src="profileThumbnailUrl"
                      :alt="fullName"
                      class="profile-hero__avatar-image"
                    />
                    <span v-else class="material-symbols-outlined profile-hero__avatar-icon">person</span>
                  </span>
                </button>

                <button
                  class="page-button page-button--secondary profile-hero__upload-button"
                  type="button"
                  :disabled="isUploadingProfileImage"
                  @click="triggerProfileImagePicker"
                >
                  {{
                    isUploadingProfileImage
                      ? (preferences.language === 'ko' ? '업로드 중...' : 'Uploading...')
                      : (preferences.language === 'ko' ? '이미지 변경' : 'Change Image')
                  }}
                </button>
              </div>

              <div class="profile-hero__summary">
                <div class="profile-hero__title-row">
                  <strong>{{ fullName }}</strong>
                </div>
              </div>
            </div>

            <div class="settings-form">
            <label>
              <span>{{ preferences.language === 'ko' ? '성' : 'Last Name' }}</span>
              <input v-model="profileForm.lastName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '이름' : 'First Name' }}</span>
              <input v-model="profileForm.firstName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '중간이름 (선택)' : 'Middle Name (Optional)' }}</span>
              <input v-model="profileForm.middleName" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '이메일' : 'Email' }}</span>
              <input v-model="profileForm.email" type="email" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '연락처' : 'Phone' }}</span>
              <PhoneField
                v-model="profileForm.phone"
                v-model:valid="profilePhoneValid"
                :language="preferences.language"
              />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '직책' : 'Job Title' }}</span>
              <input v-model="profileForm.jobTitle" type="text" />
            </label>

            <label>
              <span>{{ preferences.language === 'ko' ? '부서' : 'Department' }}</span>
              <select v-model="profileForm.departmentPublicId">
                <option value="">
                  {{
                    isLoadingDepartmentOptions
                      ? (preferences.language === 'ko' ? '부서 목록 불러오는 중...' : 'Loading departments...')
                      : (preferences.language === 'ko' ? '부서를 선택하세요.' : 'Select a department.')
                  }}
                </option>
                <option
                  v-for="department in departmentOptions"
                  :key="department.departmentPublicId"
                  :value="department.departmentPublicId"
                >
                  {{ department.departmentName }} ({{ department.departmentCode }})
                </option>
              </select>
            </label>

            <div class="page-feed" style="margin-top: 12px;">
              <div class="page-feed__item">
                <span class="page-feed__label">
                  {{ preferences.language === 'ko' ? '로그인 ID' : 'Login ID' }}
                </span>
                <strong class="page-feed__text">{{ userDetail.loginId }}</strong>
              </div>

              <div class="page-feed__item">
                <span class="page-feed__label">
                  {{ preferences.language === 'ko' ? '권한' : 'Role' }}
                </span>
                <strong class="page-feed__text">{{ currentRoleLabel }}</strong>
              </div>
            </div>
            </div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">
                {{ preferences.language === 'ko' ? '소속' : 'Organization' }}
              </div>
              <h3>{{ preferences.language === 'ko' ? '조직 정보' : 'Organization Info' }}</h3>
            </div>
          </div>

          <div v-if="organizationDetail" class="profile-kv">
            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '조직명' : 'Organization Name' }}</span>
              <strong>{{ organizationDetail.organizationName }}</strong>
            </div>

            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '조직 유형' : 'Organization Type' }}</span>
              <strong>{{ organizationDetail.organizationType }}</strong>
            </div>

            <template v-if="isOrgAdmin">
              <div class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '조직 영문명' : 'Organization English Name' }}</span>
                <strong>{{ organizationDetail.organizationEnglishName || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '사업자번호' : 'Business No' }}</span>
                <strong>{{ organizationDetail.businessNo || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '담당자명' : 'Contact Name' }}</span>
                <strong>{{ organizationContactName }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '담당자 이메일' : 'Contact Email' }}</span>
                <strong>{{ organizationDetail.contactEmail || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '담당자 연락처' : 'Contact Phone' }}</span>
                <strong>{{ organizationDetail.contactPhone || '-' }}</strong>
              </div>
            </template>

            <template v-else>
              <div class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '담당자 이메일' : 'Contact Email' }}</span>
                <strong>{{ organizationDetail.contactEmail || '-' }}</strong>
              </div>

              <div v-if="isAdmin" class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '담당자 연락처' : 'Contact Phone' }}</span>
                <strong>{{ organizationDetail.contactPhone || '-' }}</strong>
              </div>

              <div v-if="isUser" class="profile-kv__row">
                <span>{{ preferences.language === 'ko' ? '조직 영문명' : 'Organization English Name' }}</span>
                <strong>{{ organizationDetail.organizationEnglishName || '-' }}</strong>
              </div>
            </template>
          </div>

          <div v-else class="profile-kv">
            <div class="profile-kv__row">
              <span>{{ preferences.language === 'ko' ? '조직 정보' : 'Organization Info' }}</span>
              <strong>
                {{ preferences.language === 'ko' ? '조직 정보를 불러오지 못했습니다.' : 'Could not load organization info.' }}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <!-- 아래쪽 2칸은 로그인 이력과 보안 이력입니다. -->
      <section class="profile-summary" style="margin-top: 20px;">
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">
                {{ preferences.language === 'ko' ? '로그' : 'Log' }}
              </div>
              <h3>{{ preferences.language === 'ko' ? '로그인 이력' : 'Login History' }}</h3>
            </div>

            <span class="page-panel__chip">
              {{ preferences.language === 'ko' ? '로그인 이력' : 'Login History' }}
            </span>
          </div>

          <div class="page-feed">
            <div
              v-for="history in visibleLoginHistories"
              :key="history.loginHistoryId"
              class="page-feed__item"
            >
              <!-- 첫 줄은 성공/실패와 시간만 보여줍니다. -->
              <span class="page-feed__label" style="font-weight: 700; color: #111827;">
                <span :style="{ color: history.failureReason ? '#dc2626' : '#16a34a' }">
                  {{
                    history.failureReason
                      ? (preferences.language === 'ko' ? '실패' : 'Failed')
                      : (preferences.language === 'ko' ? '성공' : 'Success')
                  }}
                </span>
                / {{ formatLoginTimeOnly(history.loginAt) }}
              </span>

          <!-- 로그인 이력 모달의 둘째 줄입니다. -->
<!-- 카드와 같은 형식으로 맞춰 둡니다. -->
<strong class="page-feed__text" style="color: #111827;">
  IP {{ history.ipAddress || '-' }}

  <!-- user-agent 가 있으면 OS와 브라우저 정보를 보여줍니다. -->
  <template v-if="history.userAgent">
    ·  {{ formatClientOs(history.userAgent) }}
    ·  {{ formatUserAgent(history.userAgent) }}
  </template>

  <!-- 실패 이력이면 실패 사유도 같이 보여줍니다. -->
  <template v-if="history.failureReason">
    · {{ preferences.language === 'ko' ? '실패 사유' : 'Reason' }} = {{ formatLoginFailureReason(history.failureReason) }}
  </template>
</strong>

            </div>

            <div v-if="loginHistories.length === 0" class="page-feed__item">
              <strong class="page-feed__text">
                {{ preferences.language === 'ko' ? '로그인 이력이 없습니다.' : 'No login history available.' }}
              </strong>
            </div>
          </div>

          <button
            v-if="canShowMoreLoginHistories"
            class="page-button page-button--secondary"
            type="button"
            style="margin-top: 16px;"
            @click="openLoginHistoryModal"
          >
            {{ preferences.language === 'ko' ? '더보기' : 'Show More' }}
          </button>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">
                {{ preferences.language === 'ko' ? '보안' : 'Security' }}
              </div>
              <h3>{{ preferences.language === 'ko' ? '보안 이력' : 'Security History' }}</h3>
            </div>
          </div>

          <div class="page-feed">
            <div
              v-for="history in visibleSecurityHistories"
              :key="history.securityHistoryId"
              class="page-feed__item"
            >
              <span class="page-feed__label">
                {{ formatDateTime(history.occurredAt) }}
              </span>

              <strong class="page-feed__text">
                {{ history.summary }}
              </strong>

              <span class="page-feed__label">
                IP: {{ history.ipAddress || '-' }}
              </span>

              <span class="page-feed__label">
                {{ preferences.language === 'ko' ? '브라우저' : 'Browser' }}:
                {{ formatUserAgent(history.userAgent) }}
              </span>
            </div>

            <div v-if="securityHistories.length === 0" class="page-feed__item">
              <strong class="page-feed__text">
                {{ preferences.language === 'ko' ? '보안 이력이 없습니다.' : 'No security history available.' }}
              </strong>
            </div>
          </div>

          <button
            v-if="canShowMoreSecurityHistories"
            class="page-button page-button--secondary"
            type="button"
            style="margin-top: 16px;"
            @click="openSecurityHistoryModal"
          >
            {{ preferences.language === 'ko' ? '더보기' : 'Show More' }}
          </button>
        </article>
      </section>

      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <button
          class="page-button page-button--danger"
          type="button"
          @click="session.signOut()"
        >
          {{ preferences.language === 'ko' ? '로그아웃' : 'Sign Out' }}
        </button>
      </div>

      <BaseModal
        v-model="profileImageViewerOpen"
        :title="preferences.language === 'ko' ? '프로필 이미지' : 'Profile Image'"
        :description="preferences.language === 'ko'
          ? '원본 프로필 이미지를 확인합니다.'
          : 'View the original profile image.'"
        size="lg"
      >
        <div class="profile-image-viewer">
          <div v-if="isLoadingProfileImageViewer" class="login-hint">
            {{ preferences.language === 'ko' ? '원본 이미지를 불러오는 중입니다...' : 'Loading original image...' }}
          </div>

          <div v-else-if="profileImageViewerError" class="login-error">
            {{ profileImageViewerError }}
          </div>

          <img
            v-else-if="profileImageViewerSrc"
            :src="profileImageViewerSrc"
            :alt="fullName"
            class="profile-image-viewer__image"
          />
        </div>
      </BaseModal>

      <!-- 로그인 이력 더보기 모달입니다. -->
      <BaseModal
        v-model="loginHistoryModalOpen"
        :title="preferences.language === 'ko' ? '로그인 이력' : 'Login History'"
        :description="preferences.language === 'ko'
          ? '기간을 선택해 로그인 이력을 조회합니다.'
          : 'Select a period to view login history.'"
        size="lg"
      >
        <div
          style="
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: end;
            margin-bottom: 16px;
          "
        >
          <!-- 기간 선택기는 한 개만 보여주고 폭도 줄입니다. -->
          <label
            style="
              display: flex;
              flex-direction: column;
              gap: 6px;
              width: 320px;
              max-width: 100%;
            "
          >
            <span>{{ preferences.language === 'ko' ? '기간' : 'Period' }}</span>

            <VueDatePicker
              v-model="loginHistoryRange"
              range
              model-type="yyyy-MM-dd"
              :locale="datePickerLocale"
              :formats="datePickerFormats"
              :enable-time-picker="false"
              :hide-navigation="['time']"
              :clearable="true"
              auto-apply
              :placeholder="preferences.language === 'ko' ? '기간 선택' : 'Select period'"
              @update:model-value="handleLoginHistoryRangeChange"
            />
          </label>

          <!-- 빠른 기간 버튼은 오른쪽에 붙입니다. -->
          <div
            style="
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              padding-bottom: 2px;
            "
          >
            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(loginHistoryQuickRange === '7d')"
              @click="setLoginHistoryQuickRange('7d')"
            >
              {{ preferences.language === 'ko' ? '1주' : '1W' }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(loginHistoryQuickRange === '1m')"
              @click="setLoginHistoryQuickRange('1m')"
            >
              {{ preferences.language === 'ko' ? '1개월' : '1M' }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(loginHistoryQuickRange === '6m')"
              @click="setLoginHistoryQuickRange('6m')"
            >
              {{ preferences.language === 'ko' ? '6개월' : '6M' }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(loginHistoryQuickRange === 'all')"
              @click="setLoginHistoryQuickRange('all')"
            >
              {{ preferences.language === 'ko' ? '전체' : 'ALL' }}
            </button>
          </div>
        </div>

        <!-- 목록은 그대로 두고, 로딩 때는 위에만 덮어서 모달 높이가 안 출렁이게 합니다. -->
        <div style="position: relative; min-height: 320px;">
          <div class="page-feed" :style="{ opacity: isLoadingLoginHistoryModal ? 0.45 : 1 }">
            <div
              v-for="history in loginHistoryModalItems"
              :key="history.loginHistoryId"
              class="page-feed__item"
            >
              <span class="page-feed__label" style="font-weight: 700; color: #111827;">
                <span :style="{ color: history.failureReason ? '#dc2626' : '#16a34a' }">
                  {{
                    history.failureReason
                      ? (preferences.language === 'ko' ? '실패' : 'Failed')
                      : (preferences.language === 'ko' ? '성공' : 'Success')
                  }}
                </span>
                / {{ formatDateTime(history.loginAt) }}
              </span>

              <strong class="page-feed__text" style="color: #111827;">
                IP {{ history.ipAddress || '-' }}
                <template v-if="history.userAgent">
                  · {{ formatClientOs(history.userAgent) }}
                  · {{ formatUserAgent(history.userAgent) }}
                </template>
                <template v-if="history.failureReason">
                  · {{ preferences.language === 'ko' ? '실패 사유' : 'Reason' }} = {{ formatLoginFailureReason(history.failureReason) }}
                </template>
              </strong>
            </div>

            <div v-if="loginHistoryModalItems.length === 0 && !isLoadingLoginHistoryModal" class="page-feed__item">
              <strong class="page-feed__text">
                {{ preferences.language === 'ko' ? '조건에 맞는 로그인 이력이 없습니다.' : 'No login history matches the selected period.' }}
              </strong>
            </div>
          </div>

          <div
            v-if="isLoadingLoginHistoryModal"
            class="login-hint"
            style="
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.6);
            "
          >
            {{ preferences.language === 'ko' ? '로그인 이력을 불러오는 중입니다...' : 'Loading login history...' }}
          </div>
        </div>
      </BaseModal>

      <!-- 보안 이력 더보기 모달입니다. -->
      <BaseModal
        v-model="securityHistoryModalOpen"
        :title="preferences.language === 'ko' ? '보안 이력' : 'Security History'"
        :description="preferences.language === 'ko'
          ? '기간을 선택해 보안 이력을 조회합니다.'
          : 'Select a period to view security history.'"
        size="lg"
      >
        <div
          style="
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            align-items: end;
            margin-bottom: 16px;
          "
        >
          <!-- 기간 선택기는 한 개만 보여주고 폭도 줄입니다. -->
          <label
            style="
              display: flex;
              flex-direction: column;
              gap: 6px;
              width: 320px;
              max-width: 100%;
            "
          >
            <span>{{ preferences.language === 'ko' ? '기간' : 'Period' }}</span>

            <VueDatePicker
              v-model="securityHistoryRange"
              range
              model-type="yyyy-MM-dd"
              :locale="datePickerLocale"
              :formats="datePickerFormats"
              :enable-time-picker="false"
              :hide-navigation="['time']"
              :clearable="true"
              auto-apply
              :placeholder="preferences.language === 'ko' ? '기간 선택' : 'Select period'"
              @update:model-value="handleSecurityHistoryRangeChange"
            />
          </label>

          <!-- 빠른 기간 버튼은 오른쪽에 붙입니다. -->
          <div
            style="
              display: flex;
              gap: 8px;
              flex-wrap: wrap;
              padding-bottom: 2px;
            "
          >
            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(securityHistoryQuickRange === '7d')"
              @click="setSecurityHistoryQuickRange('7d')"
            >
              {{ preferences.language === 'ko' ? '1주' : '1W' }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(securityHistoryQuickRange === '1m')"
              @click="setSecurityHistoryQuickRange('1m')"
            >
              {{ preferences.language === 'ko' ? '1개월' : '1M' }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(securityHistoryQuickRange === '6m')"
              @click="setSecurityHistoryQuickRange('6m')"
            >
              {{ preferences.language === 'ko' ? '6개월' : '6M' }}
            </button>

            <button
              class="page-button page-button--secondary"
              type="button"
              :style="getQuickRangeButtonStyle(securityHistoryQuickRange === 'all')"
              @click="setSecurityHistoryQuickRange('all')"
            >
              {{ preferences.language === 'ko' ? '전체' : 'ALL' }}
            </button>
          </div>
        </div>

        <!-- 목록은 그대로 두고, 로딩 때는 위에만 덮어서 모달 높이가 안 출렁이게 합니다. -->
        <div style="position: relative; min-height: 320px;">
          <div class="page-feed" :style="{ opacity: isLoadingSecurityHistoryModal ? 0.45 : 1 }">
            <div
              v-for="history in securityHistoryModalItems"
              :key="history.securityHistoryId"
              class="page-feed__item"
            >
              <span class="page-feed__label">
                {{ formatDateTime(history.occurredAt) }}
              </span>

              <strong class="page-feed__text">
                {{ history.summary }}
              </strong>

              <span class="page-feed__label">
                IP: {{ history.ipAddress || '-' }}
              </span>

              <span class="page-feed__label">
                {{ preferences.language === 'ko' ? '브라우저' : 'Browser' }}:
                {{ formatUserAgent(history.userAgent) }}
              </span>
            </div>

            <div v-if="securityHistoryModalItems.length === 0 && !isLoadingSecurityHistoryModal" class="page-feed__item">
              <strong class="page-feed__text">
                {{ preferences.language === 'ko' ? '조건에 맞는 보안 이력이 없습니다.' : 'No security history matches the selected period.' }}
              </strong>
            </div>
          </div>

          <div
            v-if="isLoadingSecurityHistoryModal"
            class="login-hint"
            style="
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.6);
            "
          >
            {{ preferences.language === 'ko' ? '보안 이력을 불러오는 중입니다...' : 'Loading security history...' }}
          </div>
        </div>
      </BaseModal>
    </template>
  </section>
</template>
