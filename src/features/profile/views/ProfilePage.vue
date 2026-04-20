<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watchEffect } from 'vue'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { changePassword, getUserDetailByPublicId } from '../../../services/user'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasNavigationStore } from '../../../stores/navigation'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { useAtlasSessionStore } from '../../../stores/session'

const header = useAtlasHeaderStore()
const navigation = useAtlasNavigationStore()
const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()

// 현재 로그인한 사용자의 내부 userId를 담아둘 값입니다.
// 비밀번호 변경 API가 userId를 요구해서 필요합니다.
const currentUserId = ref<number | null>(null)

// 로딩 상태입니다.
// 사용자 상세를 불러오는 동안 안내 문구를 보여줄 때 씁니다.
const isLoadingUser = ref(false)

// 저장 중 상태입니다.
// 버튼 중복 클릭을 막기 위해 씁니다.
const isSubmitting = ref(false)

// 화면에 보여줄 에러 문구입니다.
const passwordError = ref('')

// 화면에 보여줄 성공 문구입니다.
const passwordSuccess = ref('')

// 비밀번호 변경 폼 값입니다.
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  newPasswordConfirm: '',
})

// 기존 더미 프로필 화면용 데이터입니다.
// passwordChangeRequired 가 false 일 때만 보여줍니다.
const identity = [
  ['User Public ID', 'USR_01HX7ATLASADMIN4P9C8'],
  ['User ID', '1'],
  ['Login ID', 'admin'],
  ['Full Name', '시스템 관리자 / System Administrator'],
  ['Last Sign-In', '2026-04-07 15:42 KST'],
  ['Password Changed', '2026-04-05 09:14 KST'],
]

const contact = [
  ['Email', 'admin@atlas.com'],
  ['Phone', '010-9999-9999'],
  ['Job Title', '시스템관리자 / System Admin'],
  ['Session Policy', 'JWT + role claim + organizationPublicId claim'],
]

const orgRows = [
  ['Organization Public ID', 'ORG_01HX7ATLASADMIN4P9C8'],
  ['Organization Type', 'ADMIN'],
  ['Organization Name', '아틀라스 관리조직'],
  ['Business No', 'N/A'],
  ['Contact Owner', '시스템 관리자 / admin@atlas.com / 010-9999-9999'],
]

const history = [
  ['Success / 15:42 KST', 'IP 10.10.2.44 · Mozilla/5.0 (Macintosh; Intel Mac OS X) · failureReason = null'],
  ['Success / 09:11 KST', 'IP 10.10.2.21 · Chrome 135 · token issued with role + organizationPublicId'],
  ['Failure / 08:58 KST', 'IP 10.10.2.21 · failureReason = INVALID_PASSWORD'],
  ['Security', 'Last password rotation tracked by passwordChangedAt and login history correlation'],
]

// 현재 로그인한 사용자의 내부 userId를 조회합니다.
// 첫 로그인 비밀번호 변경 화면에서 이 값이 필요합니다.
async function loadCurrentUserId() {
  // 로그인 안 된 상태면 조회하지 않습니다.
  if (!session.userPublicId) return

  try {
    isLoadingUser.value = true
    passwordError.value = ''

    // userPublicId로 사용자 상세를 조회합니다.
    const user = await getUserDetailByPublicId(session.userPublicId)

    // 비밀번호 변경 API에 쓸 userId를 저장합니다.
    currentUserId.value = user.userId
  } catch (error) {
    // userId를 못 가져오면 비밀번호 변경 요청 자체를 못 보내므로 안내합니다.
    passwordError.value =
      preferences.language === 'ko'
        ? '사용자 정보를 불러오지 못했습니다. 다시 로그인해 주세요.'
        : 'Failed to load user information. Please sign in again.'
  } finally {
    isLoadingUser.value = false
  }
}

// 비밀번호 변경 버튼을 눌렀을 때 실행됩니다.
async function submitPasswordChange() {
  // 이전 메시지를 먼저 지웁니다.
  passwordError.value = ''
  passwordSuccess.value = ''

  // 내부 userId가 없으면 요청을 보낼 수 없습니다.
  if (!currentUserId.value) {
    passwordError.value =
      preferences.language === 'ko'
        ? '사용자 식별 정보를 찾지 못했습니다.'
        : 'Could not find the current user id.'
    return
  }

  // 새 비밀번호 입력값이 비어 있으면 바로 막습니다.
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.newPasswordConfirm) {
    passwordError.value =
      preferences.language === 'ko'
        ? '모든 비밀번호 항목을 입력해 주세요.'
        : 'Please fill in all password fields.'
    return
  }

  // 새 비밀번호와 확인 값이 다르면 바로 막습니다.
  if (passwordForm.newPassword !== passwordForm.newPasswordConfirm) {
    passwordError.value =
      preferences.language === 'ko'
        ? '새 비밀번호와 확인 값이 다릅니다.'
        : 'New password and confirmation do not match.'
    return
  }

  try {
    isSubmitting.value = true

    // 실제 비밀번호 변경 API를 호출합니다.
    await changePassword(currentUserId.value, {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
      newPasswordConfirm: passwordForm.newPasswordConfirm,
    })

    // 프론트 세션 상태도 같이 false 로 바꿉니다.
    session.passwordChangeRequired = false

    // 세션 스토리지에도 false 를 저장합니다.
    window.sessionStorage.setItem('atlas-password-change-required', 'false')

    // 입력창을 비웁니다.
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.newPasswordConfirm = ''

   // 성공 문구를 먼저 정리합니다.
// 바로 페이지 이동할 거라서 별도 성공 문구는 남기지 않아도 됩니다.
passwordSuccess.value = ''

// 현재 로그인한 조직에 맞는 첫 메뉴로 이동합니다.
// controlTower를 하드코딩하면 supplier 계정에서 꼬일 수 있어서,
// 실제로 접근 가능한 첫 메뉴를 찾아 이동시키는 방식이 더 안전합니다.
const firstAvailablePage =
  navigation.availableNavItems.find((item) => !item.hidden)?.key ?? 'profile'


// 비밀번호 변경이 끝났으면 접근 가능한 기본 화면으로 이동합니다.
navigation.navigateToPage(firstAvailablePage)

  } catch (error: any) {
    // 백엔드 에러 문구가 있으면 그걸 우선 보여줍니다.
    passwordError.value =
      error?.payload?.message ||
      (preferences.language === 'ko'
        ? '비밀번호 변경에 실패했습니다.'
        : 'Failed to change password.')
  } finally {
    isSubmitting.value = false
  }
}

// 첫 로그인 강제 변경 상태일 때는 헤더 액션을 비웁니다.
// 일반 프로필 상태일 때만 기존 액션을 보여줍니다.
watchEffect(() => {
  if (session.passwordChangeRequired) {
    header.clearActions()
    return
  }

  header.setActions([
    { key: 'profile-notification-policy', label: resolveDefaultCopy('NOTIFICATION_POLICY', preferences.language), tone: 'secondary' },
    { key: 'profile-edit-profile', label: resolveDefaultCopy('EDIT_PROFILE', preferences.language), tone: 'primary' },
  ])
})

// 페이지가 열릴 때, 강제 비밀번호 변경 상태면 userId를 먼저 조회합니다.
onMounted(() => {
  if (session.passwordChangeRequired) {
    loadCurrentUserId()
  }
})

// 페이지를 떠날 때 헤더 버튼을 비웁니다.
onBeforeUnmount(() => {
  header.clearActions()
})

// 화면 상단에 보여줄 역할 텍스트입니다.
const currentRoleLabel = computed(() => {
  if (session.userRole === 'ADMIN') return 'ADMIN'
  if (session.userRole === 'ORG_ADMIN') return 'ORG_ADMIN'
  return 'USER'
})
</script>

<template>
  <section class="app-screen profile-page">
    <!-- 첫 로그인 비밀번호 변경이 필요한 경우에는 이 화면만 보여줍니다. -->
    <section v-if="session.passwordChangeRequired" class="page-panels">
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">
              {{ preferences.language === 'ko' ? '보안 안내' : 'Security Notice' }}
            </div>
            <h3>
              {{ preferences.language === 'ko' ? '비밀번호를 먼저 변경해 주세요' : 'Please change your password first' }}
            </h3>
          </div>
          <span class="page-panel__chip">{{ currentRoleLabel }}</span>
        </div>

        <p style="margin-bottom: 20px; color: var(--color-text-secondary, #666);">
          {{
            preferences.language === 'ko'
              ? '임시 비밀번호로 로그인한 계정입니다. 계속 사용하려면 새 비밀번호로 변경해야 합니다.'
              : 'This account signed in with a temporary password. Please set a new password before continuing.'
          }}
        </p>

        <div v-if="isLoadingUser" class="page-feed">
          <div class="page-feed__item">
            <strong class="page-feed__text">
              {{ preferences.language === 'ko' ? '사용자 정보를 불러오는 중입니다...' : 'Loading user information...' }}
            </strong>
          </div>
        </div>

        <form v-else class="settings-form" @submit.prevent="submitPasswordChange">
          <!-- 현재 비밀번호 입력 -->
          <label>
            <span>{{ preferences.language === 'ko' ? '현재 비밀번호' : 'Current Password' }}</span>
            <input
              v-model="passwordForm.currentPassword"
              type="password"
              autocomplete="current-password"
            />
          </label>

          <!-- 새 비밀번호 입력 -->
          <label>
            <span>{{ preferences.language === 'ko' ? '새 비밀번호' : 'New Password' }}</span>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              autocomplete="new-password"
            />
          </label>

          <!-- 새 비밀번호 확인 입력 -->
          <label>
            <span>{{ preferences.language === 'ko' ? '새 비밀번호 확인' : 'Confirm New Password' }}</span>
            <input
              v-model="passwordForm.newPasswordConfirm"
              type="password"
              autocomplete="new-password"
            />
          </label>

          <!-- 에러 문구 -->
          <div v-if="passwordError" class="login-error">
            {{ passwordError }}
          </div>

          <!-- 성공 문구 -->
          <div v-if="passwordSuccess" class="login-hint">
            {{ passwordSuccess }}
          </div>

          <!-- 저장 버튼 -->
          <button
            class="page-button page-button--primary"
            type="submit"
            :disabled="isSubmitting"
          >
            {{ isSubmitting
              ? (preferences.language === 'ko' ? '변경 중...' : 'Saving...')
              : (preferences.language === 'ko' ? '비밀번호 변경' : 'Change Password') }}
          </button>
        </form>
      </article>
    </section>

    <!-- 비밀번호 변경이 필요 없을 때는 기존 프로필 화면을 보여줍니다. -->
    <template v-else>
      <section class="profile-summary">
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Identity', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Operator Snapshot', preferences.language) }}</h3></div>
            <span class="page-panel__chip">{{ resolveDefaultCopy('ADMIN', preferences.language) }}</span>
          </div>
          <div class="profile-kv">
            <div v-for="[label, value] in identity" :key="label" class="profile-kv__row"><span>{{ resolveDefaultCopy(label, preferences.language) }}</span><strong>{{ resolveDefaultCopy(value, preferences.language) }}</strong></div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Contact & Credentials', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Access Details', preferences.language) }}</h3></div>
            <span class="page-panel__chip">{{ resolveDefaultCopy('ACTIVE', preferences.language) }}</span>
          </div>
          <div class="profile-kv">
            <div v-for="[label, value] in contact" :key="label" class="profile-kv__row"><span>{{ resolveDefaultCopy(label, preferences.language) }}</span><strong>{{ resolveDefaultCopy(value, preferences.language) }}</strong></div>
          </div>
        </article>
      </section>

      <section class="page-metrics">
        <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Recommendation Adoption', preferences.language) }}</span><strong class="page-metric__value">84.2%</strong><span class="page-metric__meta">{{ resolveDefaultCopy('+6.4% QoQ', preferences.language) }}</span></article>
        <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Recovery Success Rate', preferences.language) }}</span><strong class="page-metric__value">91.8%</strong><span class="page-metric__meta">{{ resolveDefaultCopy('ETA restored in 42h avg', preferences.language) }}</span></article>
        <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Open Governance Reviews', preferences.language) }}</span><strong class="page-metric__value">07</strong><span class="page-metric__meta">{{ resolveDefaultCopy('2 overdue escalations', preferences.language) }}</span></article>
        <article class="page-metric"><span class="page-metric__label">{{ resolveDefaultCopy('Active Collaboration Rooms', preferences.language) }}</span><strong class="page-metric__value">13</strong><span class="page-metric__meta">{{ resolveDefaultCopy('5 critical channels pinned', preferences.language) }}</span></article>
      </section>

      <section class="page-panels">
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Organization Context', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Auth Organization Entity', preferences.language) }}</h3></div>
            <span class="page-panel__chip">{{ resolveDefaultCopy('ORG_ADMIN', preferences.language) }}</span>
          </div>
          <div class="profile-kv">
            <div v-for="[label, value] in orgRows" :key="label" class="profile-kv__row"><span>{{ resolveDefaultCopy(label, preferences.language) }}</span><strong>{{ resolveDefaultCopy(value, preferences.language) }}</strong></div>
          </div>
        </article>

        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">{{ resolveDefaultCopy('Login History', preferences.language) }}</div><h3>{{ resolveDefaultCopy('Auth Access Trace', preferences.language) }}</h3></div>
            <span class="page-panel__chip">{{ resolveDefaultCopy('LOGIN_HISTORY', preferences.language) }}</span>
          </div>
          <div class="page-feed">
            <div v-for="[label, text] in history" :key="label" class="page-feed__item">
              <span class="page-feed__label">{{ resolveDefaultCopy(label, preferences.language) }}</span>
              <strong class="page-feed__text">{{ resolveDefaultCopy(text, preferences.language) }}</strong>
            </div>
          </div>
          <button class="page-button page-button--danger" type="button" @click="session.signOut">{{ resolveDefaultCopy('SIGN_OUT', preferences.language) }}</button>
        </article>
      </section>
    </template>
  </section>
</template>
