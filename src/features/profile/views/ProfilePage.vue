<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import PhoneField from '../../../components/forms/PhoneField.vue'
import BaseModal from '../../shared/components/BaseModal.vue'
import {
  changePassword,
  getMyInfo,
  getMyLoginHistories,
  getMySecurityHistories,
  getUserDetailByPublicId,
  updateUser,
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

// 로그인 이력 모달 안에서 보여줄 전체 목록입니다.
const loginHistoryModalItems = ref<LoginHistoryListItem[]>([])

// 보안 이력 모달 안에서 보여줄 전체 목록입니다.
const securityHistoryModalItems = ref<SecurityHistoryListItem[]>([])

// 로그인 이력 모달 로딩 상태입니다.
const isLoadingLoginHistoryModal = ref(false)

// 보안 이력 모달 로딩 상태입니다.
const isLoadingSecurityHistoryModal = ref(false)

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

// 사용자 수정과 비밀번호 변경에 필요한 내부 userId입니다.
const currentUserId = ref<number | null>(null)

// 프로필 전체 로딩 상태입니다.
const isLoadingProfile = ref(false)

// 기본 정보 저장 중 상태입니다.
const isSavingProfile = ref(false)

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

// 연락처 유효성 상태입니다.
const profilePhoneValid = ref(false)

// 기본 정보 수정 폼입니다.
const profileForm = reactive({
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
})

// 강제 비밀번호 변경 폼입니다.
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
})

// 사용자 상세 값을 수정 폼에 그대로 채웁니다.
function syncProfileForm(detail: UserDetailResponse) {
  profileForm.firstName = detail.firstName ?? ''
  profileForm.middleName = detail.middleName ?? ''
  profileForm.lastName = detail.lastName ?? ''
  profileForm.email = detail.email ?? ''
  profileForm.phone = detail.phone ?? ''
  profileForm.jobTitle = detail.jobTitle ?? ''

  // 기존 값이 있으면 일단 유효 상태로 시작합니다.
  profilePhoneValid.value = Boolean(detail.phone)
}

// 페이지에 필요한 데이터를 모두 읽습니다.
async function loadProfileData() {
  try {
    // 로딩 시작 전에 상태를 정리합니다.
    isLoadingProfile.value = true
    profileError.value = ''
    profileSuccess.value = ''

    // 먼저 로그인 사용자 기본 식별 정보를 읽습니다.
    const myInfoResponse = await getMyInfo()
    myInfo.value = myInfoResponse

    // 사용자 상세 정보는 프로필 화면의 핵심이라 필수로 읽습니다.
    const detailResponse = await getUserDetailByPublicId(myInfoResponse.userPublicId)
    userDetail.value = detailResponse
    currentUserId.value = detailResponse.userId
    syncProfileForm(detailResponse)

    // 조직 정보는 실패해도 프로필 전체를 막지는 않게 따로 읽습니다.
    try {
      organizationDetail.value = await getMyOrganizationDetail()
    } catch {
      organizationDetail.value = null
    }

    // 로그인 이력도 실패하면 빈 목록으로 둡니다.
    try {
      const loginHistoryResponse = await getMyLoginHistories({ page: 0, size: 20 })
      loginHistories.value = loginHistoryResponse.content
    } catch {
      loginHistories.value = []
    }

    // 보안 이력도 실패하면 빈 목록으로 둡니다.
    try {
      const securityHistoryResponse = await getMySecurityHistories({ page: 0, size: 20 })
      securityHistories.value = securityHistoryResponse.content
    } catch {
      securityHistories.value = []
    }
  } catch (error) {
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
  // 수정 시작 전에 현재 값을 다시 폼에 맞춥니다.
  if (userDetail.value) {
    syncProfileForm(userDetail.value)
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
  // 내부 userId가 없으면 수정 요청을 보낼 수 없습니다.
  if (!currentUserId.value) {
    profileError.value =
      preferences.language === 'ko'
        ? '사용자 식별 정보를 찾지 못했습니다.'
        : 'Could not find the current user id.'
    return
  }

  profileError.value = ''
  profileSuccess.value = ''

  // 필수 입력값을 먼저 검사합니다.
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

  // 연락처 형식도 검사합니다.
  if (!profilePhoneValid.value) {
    profileError.value =
      preferences.language === 'ko'
        ? '연락처 형식이 올바르지 않습니다.'
        : 'The phone number format is invalid.'
    return
  }

  try {
    isSavingProfile.value = true

    // 실제 사용자 수정 API를 호출합니다.
    const updatedUser = await updateUser(currentUserId.value, {
      firstName: profileForm.firstName.trim(),
      middleName: profileForm.middleName.trim() || undefined,
      lastName: profileForm.lastName.trim(),
      email: profileForm.email.trim(),
      phone: profileForm.phone,
      jobTitle: profileForm.jobTitle.trim() || undefined,
    })

    // 화면 데이터도 최신 값으로 갱신합니다.
    userDetail.value = updatedUser
    syncProfileForm(updatedUser)
    isEditing.value = false

    // 저장 후 보안 이력을 다시 읽으면 최신 수정 줄이 바로 보입니다.
    try {
      const securityHistoryResponse = await getMySecurityHistories({ page: 0, size: 20 })
      securityHistories.value = securityHistoryResponse.content
    } catch {
      // 여기 실패는 프로필 저장 자체를 막지 않습니다.
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

  // 내부 userId가 없으면 비밀번호 변경 요청을 보낼 수 없습니다.
  if (!currentUserId.value) {
    passwordError.value =
      preferences.language === 'ko'
        ? '사용자 식별 정보를 찾지 못했습니다.'
        : 'Could not find the current user id.'
    return
  }

  // 새 비밀번호 입력 여부를 먼저 확인합니다.
  if (!passwordForm.newPassword || !passwordForm.newPasswordConfirm) {
    passwordError.value =
      preferences.language === 'ko'
        ? '새 비밀번호와 확인 값을 입력해 주세요.'
        : 'Please fill in the new password fields.'
    return
  }

  // 새 비밀번호와 확인 값이 서로 다르면 막습니다.
  if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
    passwordError.value =
      preferences.language === 'ko'
        ? '새 비밀번호와 확인 값이 다릅니다.'
        : 'New password and confirmation do not match.'
    return
  }

  try {
    isSubmittingPassword.value = true

    // 강제 변경 상태이므로 현재 비밀번호는 빈 값으로 보냅니다.
    await changePassword(currentUserId.value, {
      currentPassword: '',
      newPassword: passwordForm.newPassword,
      newPasswordConfirm: passwordForm.newPasswordConfirm,
    })

    // 강제 변경 상태를 해제합니다.
    session.passwordChangeRequired = false
    window.sessionStorage.setItem('atlas-password-change-required', 'false')

    // 입력값도 비웁니다.
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.newPasswordConfirm = ''

    // 비밀번호 변경 후 프로필과 이력을 다시 읽습니다.
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

// 날짜 문자열을 보기 좋게 바꿉니다.
function formatDateTime(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  // 날짜 파싱이 안 되면 원본을 그대로 보여줍니다.
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

// 로그인 이력 첫 줄에는 시간만 간단히 보여줍니다.
function formatLoginTimeOnly(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  // 날짜 파싱이 안 되면 원본을 그대로 보여줍니다.
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
function formatUserAgent(value?: string | null) {
  if (!value) return '-'

  if (value.includes('Edg/')) return 'Edge'
  if (value.includes('Chrome/')) return 'Chrome'
  if (value.includes('Firefox/')) return 'Firefox'
  if (value.includes('Safari/') && !value.includes('Chrome/')) return 'Safari'

  return value.length > 40 ? `${value.slice(0, 40)}...` : value
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

// 로그인 이력 기간 필터를 적용합니다.
async function applyLoginHistoryFilter() {
  await loadLoginHistoryModalItems()
}

// 보안 이력 기간 필터를 적용합니다.
async function applySecurityHistoryFilter() {
  await loadSecurityHistoryModalItems()
}

// 로그인 이력 기간 필터를 초기화하고 다시 조회합니다.
async function resetLoginHistoryFilter() {
  loginHistoryFilter.from = ''
  loginHistoryFilter.to = ''
  await loadLoginHistoryModalItems()
}

// 보안 이력 기간 필터를 초기화하고 다시 조회합니다.
async function resetSecurityHistoryFilter() {
  securityHistoryFilter.from = ''
  securityHistoryFilter.to = ''
  await loadSecurityHistoryModalItems()
}

// 페이지에 들어오면 데이터부터 읽습니다.
onMounted(() => {
  header.clearActions()
  loadProfileData()
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

            <span class="page-panel__chip">
              {{ isEditing ? (preferences.language === 'ko' ? '수정 중' : 'Editing') : currentRoleLabel }}
            </span>
          </div>

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
              <span>{{ preferences.language === 'ko' ? '권한' : 'Role' }}</span>
              <strong>{{ currentRoleLabel }}</strong>
            </div>
          </div>

          <div v-else class="settings-form">
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
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">
                {{ preferences.language === 'ko' ? '소속' : 'Organization' }}
              </div>
              <h3>{{ preferences.language === 'ko' ? '조직 정보' : 'Organization Info' }}</h3>
            </div>

            <span class="page-panel__chip">
              {{ currentOrganizationTypeLabel }}
            </span>
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

      <!-- 아래쪽 2칸은 로그인 이력과 보안 이력으로 맞춥니다. -->
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
              <!-- 첫 줄은 상태만 색을 주고 시간은 검정색으로 둡니다. -->
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

              <!-- 둘째 줄은 IP, 브라우저, 실패 사유를 검정색으로 보여줍니다. -->
              <strong class="page-feed__text" style="color: #111827;">
                IP {{ history.ipAddress || '-' }}
                <template v-if="history.userAgent">
                  · {{ formatUserAgent(history.userAgent) }}
                </template>
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

      <!-- 로그인 이력 더보기 모달입니다. -->
      <BaseModal
        v-model="loginHistoryModalOpen"
        :title="preferences.language === 'ko' ? '로그인 이력' : 'Login History'"
        :description="preferences.language === 'ko'
          ? '기간을 선택해 로그인 이력을 조회합니다.'
          : 'Select a period to view login history.'"
        size="lg"
      >
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
          <label style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 220px;">
            <span>{{ preferences.language === 'ko' ? '시작일' : 'From' }}</span>
            <input v-model="loginHistoryFilter.from" type="date" />
          </label>

          <label style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 220px;">
            <span>{{ preferences.language === 'ko' ? '종료일' : 'To' }}</span>
            <input v-model="loginHistoryFilter.to" type="date" />
          </label>
        </div>

        <div class="design-trigger-row" style="margin-bottom: 16px;">
          <button class="page-button page-button--primary" type="button" @click="applyLoginHistoryFilter">
            {{ preferences.language === 'ko' ? '적용' : 'Apply' }}
          </button>

          <button class="page-button page-button--secondary" type="button" @click="resetLoginHistoryFilter">
            {{ preferences.language === 'ko' ? '초기화' : 'Reset' }}
          </button>
        </div>

        <div v-if="isLoadingLoginHistoryModal" class="login-hint">
          {{ preferences.language === 'ko' ? '로그인 이력을 불러오는 중입니다...' : 'Loading login history...' }}
        </div>

        <div v-else class="page-feed">
          <div
            v-for="history in loginHistoryModalItems"
            :key="history.loginHistoryId"
            class="page-feed__item"
          >
            <!-- 모달도 상태만 색을 주고 날짜/시간은 검정색으로 둡니다. -->
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

            <!-- 모달 안 둘째 줄도 검정색으로 고정합니다. -->
            <strong class="page-feed__text" style="color: #111827;">
              IP {{ history.ipAddress || '-' }}
              <template v-if="history.userAgent">
                · {{ formatUserAgent(history.userAgent) }}
              </template>
              <template v-if="history.failureReason">
                · {{ preferences.language === 'ko' ? '실패 사유' : 'Reason' }} = {{ formatLoginFailureReason(history.failureReason) }}
              </template>
            </strong>
          </div>

          <div v-if="loginHistoryModalItems.length === 0" class="page-feed__item">
            <strong class="page-feed__text">
              {{ preferences.language === 'ko' ? '조건에 맞는 로그인 이력이 없습니다.' : 'No login history matches the selected period.' }}
            </strong>
          </div>
        </div>

        <template #footer>
          <button
            class="page-button page-button--secondary"
            type="button"
            @click="loginHistoryModalOpen = false"
          >
            {{ preferences.language === 'ko' ? '닫기' : 'Close' }}
          </button>
        </template>
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
        <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
          <label style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 220px;">
            <span>{{ preferences.language === 'ko' ? '시작일' : 'From' }}</span>
            <input v-model="securityHistoryFilter.from" type="date" />
          </label>

          <label style="display: flex; flex-direction: column; gap: 6px; flex: 1 1 220px;">
            <span>{{ preferences.language === 'ko' ? '종료일' : 'To' }}</span>
            <input v-model="securityHistoryFilter.to" type="date" />
          </label>
        </div>

        <div class="design-trigger-row" style="margin-bottom: 16px;">
          <button class="page-button page-button--primary" type="button" @click="applySecurityHistoryFilter">
            {{ preferences.language === 'ko' ? '적용' : 'Apply' }}
          </button>

          <button class="page-button page-button--secondary" type="button" @click="resetSecurityHistoryFilter">
            {{ preferences.language === 'ko' ? '초기화' : 'Reset' }}
          </button>
        </div>

        <div v-if="isLoadingSecurityHistoryModal" class="login-hint">
          {{ preferences.language === 'ko' ? '보안 이력을 불러오는 중입니다...' : 'Loading security history...' }}
        </div>

        <div v-else class="page-feed">
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

          <div v-if="securityHistoryModalItems.length === 0" class="page-feed__item">
            <strong class="page-feed__text">
              {{ preferences.language === 'ko' ? '조건에 맞는 보안 이력이 없습니다.' : 'No security history matches the selected period.' }}
            </strong>
          </div>
        </div>

        <template #footer>
          <button
            class="page-button page-button--secondary"
            type="button"
            @click="securityHistoryModalOpen = false"
          >
            {{ preferences.language === 'ko' ? '닫기' : 'Close' }}
          </button>
        </template>
      </BaseModal>
    </template>
  </section>
</template>
