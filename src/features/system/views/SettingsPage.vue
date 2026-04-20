<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { createOrganization } from '../../../services/organization'
import { createInitialOrgAdmin } from '../../../services/user'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '시스템 / 설정',
    title: '시스템 설정',
    tabs: ['조직', '알림', '사용자', 'API 키', '고급'],
    resetLabel: '초기화',
    saveLabel: '저장',
    inviteLabel: '사용자 초대',
    keyLabel: '키 생성',
    exportLabel: '전체 데이터 내보내기',
    resetDangerLabel: '설정 초기화',
  },
  en: {
    eyebrow: 'System / Settings',
    title: 'System Settings',
    tabs: ['Organization', 'Notifications', 'Users', 'API Keys', 'Advanced'],
    resetLabel: 'RESET',
    saveLabel: 'SAVE CHANGES',
    inviteLabel: 'INVITE USER',
    keyLabel: 'GENERATE KEY',
    exportLabel: 'EXPORT ALL DATA',
    resetDangerLabel: 'RESET SETTINGS',
  },
}

const content = computed(() => CONTENT[preferences.language])
const activeTab = ref<string>(content.value.tabs[0])

watchEffect(() => {
  activeTab.value = content.value.tabs[0]
  header.setActions([
    { key: 'settings-reset', label: content.value.resetLabel, tone: 'secondary' },
    { key: 'settings-save', label: content.value.saveLabel, tone: 'primary' },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})

// 조직 생성 폼 값입니다.
// 관리자가 새 조직을 만들 때 입력하는 정보입니다.
const organizationForm = reactive({
  organizationType: 'SUPPLIER' as 'BUYER' | 'SUPPLIER',
  organizationName: '',
  businessNo: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
  tierLevel: 1,
})

// 최초 ORG_ADMIN 생성 폼 값입니다.
// 조직 생성이 끝난 뒤 대표자 계정을 만들 때 사용합니다.
const initialOrgAdminForm = reactive({
  loginId: '',
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  jobTitle: '',
})

// 방금 생성된 조직 publicId를 저장합니다.
// 최초 ORG_ADMIN 생성 API 호출에 필요합니다.
const createdOrganizationPublicId = ref('')

// 조직 생성 중 상태입니다.
const isCreatingOrganization = ref(false)

// 최초 ORG_ADMIN 생성 중 상태입니다.
const isCreatingOrgAdmin = ref(false)

// 조직 생성 에러 문구입니다.
const organizationCreateError = ref('')

// 조직 생성 성공 문구입니다.
const organizationCreateSuccess = ref('')

// 최초 ORG_ADMIN 생성 에러 문구입니다.
const orgAdminCreateError = ref('')

// 최초 ORG_ADMIN 생성 성공 문구입니다.
const orgAdminCreateSuccess = ref('')

// 최초 ORG_ADMIN 생성 후 받은 임시 비밀번호입니다.
const createdOrgAdminTempPassword = ref('')


const notifications = reactive([
  { labelKo: '지연 알림 메일', labelEn: 'Delay alert emails', on: true },
  { labelKo: '통관 홀드 SMS', labelEn: 'Customs hold SMS', on: true },
  { labelKo: 'Slack 채널 알림', labelEn: 'Slack notifications', on: false },
  { labelKo: '일일 요약 리포트', labelEn: 'Daily digest report', on: true },
])

const users = computed(() =>
  preferences.language === 'ko'
    ? [
        ['김운영', 'ops@atlas-scm.io', '관리자', '방금 전', '활성'],
        ['박분석', 'analyst@atlas-scm.io', '분석가', '2시간 전', '활성'],
        ['이협력', 'supplier@atlas-scm.io', '협력사', '1일 전', '잠금'],
      ]
    : [
        ['KIM OPS', 'ops@atlas-scm.io', 'ADMIN', 'JUST NOW', 'ACTIVE'],
        ['PARK ANALYST', 'analyst@atlas-scm.io', 'ANALYST', '2H AGO', 'ACTIVE'],
        ['LEE SUPPLIER', 'supplier@atlas-scm.io', 'SUPPLIER', '1D AGO', 'LOCKED'],
      ],
)

const keys = [
  ['ERP Connector', 'atl_live_••••••••••1a9f', '2026-02-21', 'READ/WRITE', 'ACTIVE'],
  ['Analytics Export', 'atl_live_••••••••••5d2c', '2026-03-12', 'READ', 'ACTIVE'],
  ['Legacy Bridge', 'atl_test_••••••••••8f11', '2025-12-05', 'FULL', 'REVOKED'],
]

// 새 조직을 생성합니다.
// 성공하면 organizationPublicId 를 저장해서 다음 단계인 ORG_ADMIN 생성에 씁니다.
async function submitOrganization() {
  organizationCreateError.value = ''
  organizationCreateSuccess.value = ''

  if (
    !organizationForm.organizationName ||
    !organizationForm.businessNo ||
    !organizationForm.contactFirstName ||
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

  try {
    isCreatingOrganization.value = true

    const response = await createOrganization({
      organizationType: organizationForm.organizationType,
      organizationName: organizationForm.organizationName,
      businessNo: organizationForm.businessNo,
      contactFirstName: organizationForm.contactFirstName,
      contactMiddleName: organizationForm.contactMiddleName,
      contactLastName: organizationForm.contactLastName,
      contactEmail: organizationForm.contactEmail,
      contactPhone: organizationForm.contactPhone,
      tierLevel:
        organizationForm.organizationType === 'SUPPLIER'
          ? organizationForm.tierLevel
          : null,
    })

    createdOrganizationPublicId.value = response.organizationPublicId

    organizationCreateSuccess.value =
      preferences.language === 'ko'
        ? `조직이 생성되었습니다. 조직 ID: ${response.organizationPublicId}`
        : `Organization created. ID: ${response.organizationPublicId}`

    // 조직이 새로 만들어지면 이전 대표자 생성 결과는 비웁니다.
    orgAdminCreateError.value = ''
    orgAdminCreateSuccess.value = ''
    createdOrgAdminTempPassword.value = ''
  } catch (error: any) {
    organizationCreateError.value =
      error?.payload?.message ||
      (preferences.language === 'ko'
        ? '조직 생성에 실패했습니다.'
        : 'Failed to create organization.')
  } finally {
    isCreatingOrganization.value = false
  }
}

// 방금 생성한 조직의 최초 ORG_ADMIN 계정을 생성합니다.
// 성공하면 임시 비밀번호를 화면에 보여줍니다.
async function submitInitialOrgAdmin() {
  orgAdminCreateError.value = ''
  orgAdminCreateSuccess.value = ''

  if (!createdOrganizationPublicId.value) {
    orgAdminCreateError.value =
      preferences.language === 'ko'
        ? '먼저 조직을 생성해 주세요.'
        : 'Please create the organization first.'
    return
  }

  if (
    !initialOrgAdminForm.loginId ||
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

  try {
    isCreatingOrgAdmin.value = true

    const response = await createInitialOrgAdmin(
      createdOrganizationPublicId.value,
      {
        loginId: initialOrgAdminForm.loginId,
        firstName: initialOrgAdminForm.firstName,
        middleName: initialOrgAdminForm.middleName,
        lastName: initialOrgAdminForm.lastName,
        email: initialOrgAdminForm.email,
        phone: initialOrgAdminForm.phone,
        jobTitle: initialOrgAdminForm.jobTitle,
      },
    )

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
        <button class="page-button page-button--secondary" type="button">{{ content.resetLabel }}</button>
        <button class="page-button page-button--primary" type="button">{{ content.saveLabel }}</button>
      </div>
    </header>

    <nav class="settings-page__tabs" aria-label="settings tabs">
      <button
        v-for="tab in content.tabs"
        :key="tab"
        :class="['settings-page__tab', { 'is-active': activeTab === tab }]"
        type="button"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </nav>

<section v-if="activeTab === content.tabs[0]" class="settings-page__panel">
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
            <option value="BUYER">BUYER</option>
            <option value="SUPPLIER">SUPPLIER</option>
          </select>
        </label>

        <label>
          <span>{{ preferences.language === 'ko' ? '조직명' : 'Organization Name' }}</span>
          <input v-model="organizationForm.organizationName" type="text" />
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
          <span>{{ preferences.language === 'ko' ? '담당자 중간이름' : 'Contact Middle Name' }}</span>
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
          <input v-model="organizationForm.contactPhone" type="text" />
        </label>

        <label v-if="organizationForm.organizationType === 'SUPPLIER'">
          <span>{{ preferences.language === 'ko' ? '티어 레벨' : 'Tier Level' }}</span>
          <input v-model.number="organizationForm.tierLevel" type="number" min="1" />
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

    <article class="page-panel">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">ORG ADMIN</div>
          <h3>{{ preferences.language === 'ko' ? '최초 조직 관리자 생성' : 'Create Initial Org Admin' }}</h3>
        </div>
      </div>

      <div class="settings-form">
        <label>
          <span>{{ preferences.language === 'ko' ? '대상 조직 ID' : 'Target Organization ID' }}</span>
          <input :value="createdOrganizationPublicId" type="text" readonly />
        </label>

        <label>
          <span>{{ preferences.language === 'ko' ? '로그인 ID' : 'Login ID' }}</span>
          <input v-model="initialOrgAdminForm.loginId" type="text" />
        </label>

        <label>
          <span>{{ preferences.language === 'ko' ? '이름' : 'First Name' }}</span>
          <input v-model="initialOrgAdminForm.firstName" type="text" />
        </label>

        <label>
          <span>{{ preferences.language === 'ko' ? '중간이름' : 'Middle Name' }}</span>
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
          <input v-model="initialOrgAdminForm.phone" type="text" />
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

        <div v-if="createdOrgAdminTempPassword" class="page-feed">
          <div class="page-feed__item">
            <span class="page-feed__label">
              {{ preferences.language === 'ko' ? '임시 비밀번호' : 'Temporary Password' }}
            </span>
            <strong class="page-feed__text">{{ createdOrgAdminTempPassword }}</strong>
          </div>
        </div>

        <button
          class="page-button page-button--primary"
          type="button"
          :disabled="isCreatingOrgAdmin || !createdOrganizationPublicId"
          @click="submitInitialOrgAdmin"
        >
          {{
            isCreatingOrgAdmin
              ? (preferences.language === 'ko' ? '생성 중...' : 'Creating...')
              : (preferences.language === 'ko' ? '최초 관리자 생성' : 'Create Initial Org Admin')
          }}
        </button>
      </div>
    </article>
  </div>
</section>


    <section v-else-if="activeTab === content.tabs[1]" class="settings-page__panel">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">ALERTS</div><h3>{{ preferences.language === 'ko' ? '알림 채널' : 'Alert Channels' }}</h3></div>
        </div>
        <div class="settings-toggle-list">
          <div v-for="item in notifications" :key="item.labelEn" class="settings-toggle-row">
            <span>{{ preferences.language === 'ko' ? item.labelKo : item.labelEn }}</span>
            <button :class="['settings-toggle', { 'is-on': item.on }]" type="button" @click="item.on = !item.on">
              <span />
            </button>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === content.tabs[2]" class="settings-page__panel">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">USERS</div><h3>{{ preferences.language === 'ko' ? '운영 사용자' : 'User Directory' }}</h3></div>
          <button class="page-button page-button--primary" type="button">{{ content.inviteLabel }}</button>
        </div>
        <div class="page-table settings-page__table">
          <div class="page-table__row page-table__row--head">
            <span>{{ preferences.language === 'ko' ? '이름' : 'NAME' }}</span>
            <span>EMAIL</span>
            <span>{{ preferences.language === 'ko' ? '역할' : 'ROLE' }}</span>
            <span>{{ preferences.language === 'ko' ? '최근 활동' : 'LAST ACTIVE' }}</span>
            <span>{{ preferences.language === 'ko' ? '상태' : 'STATUS' }}</span>
          </div>
          <div v-for="row in users" :key="row[1]" class="page-table__row">
            <span v-for="cell in row" :key="cell">{{ cell }}</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else-if="activeTab === content.tabs[3]" class="settings-page__panel">
      <article class="page-panel">
        <div class="page-panel__head">
          <div><div class="page-panel__eyebrow">API</div><h3>{{ preferences.language === 'ko' ? 'API 키 관리' : 'API Key Management' }}</h3></div>
          <button class="page-button page-button--primary" type="button">{{ content.keyLabel }}</button>
        </div>
        <div class="page-table settings-page__table">
          <div class="page-table__row page-table__row--head">
            <span>{{ preferences.language === 'ko' ? '키 이름' : 'KEY NAME' }}</span>
            <span>{{ preferences.language === 'ko' ? '토큰' : 'TOKEN' }}</span>
            <span>{{ preferences.language === 'ko' ? '생성일' : 'CREATED' }}</span>
            <span>{{ preferences.language === 'ko' ? '권한' : 'PERMISSIONS' }}</span>
            <span>{{ preferences.language === 'ko' ? '상태' : 'STATUS' }}</span>
          </div>
          <div v-for="row in keys" :key="row[0]" class="page-table__row">
            <span v-for="cell in row" :key="cell">{{ cell }}</span>
          </div>
        </div>
      </article>
    </section>

    <section v-else class="settings-page__panel">
      <div class="settings-page__grid">
        <article class="page-panel">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">SYSTEM</div><h3>{{ preferences.language === 'ko' ? '고급 구성' : 'Advanced Configuration' }}</h3></div>
          </div>
          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ preferences.language === 'ko' ? '보존 기간' : 'RETENTION' }}</span>
              <strong class="page-feed__text">365 {{ preferences.language === 'ko' ? '일' : 'DAYS' }}</strong>
              <span>{{ preferences.language === 'ko' ? '감사 로그 장기 보관 기간' : 'Audit archive retention window' }}</span>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ preferences.language === 'ko' ? '세션 타임아웃' : 'SESSION TIMEOUT' }}</span>
              <strong class="page-feed__text">30 {{ preferences.language === 'ko' ? '분' : 'MINUTES' }}</strong>
              <span>{{ preferences.language === 'ko' ? '운영 콘솔 미사용 시 자동 종료' : 'Auto-expire inactive operator sessions' }}</span>
            </div>
          </div>
        </article>
        <article class="page-panel settings-page__danger">
          <div class="page-panel__head">
            <div><div class="page-panel__eyebrow">DANGER</div><h3>{{ preferences.language === 'ko' ? '위험 구역' : 'Danger Zone' }}</h3></div>
          </div>
          <div class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.exportLabel }}</span>
              <strong class="page-feed__text">{{ preferences.language === 'ko' ? '전 조직 데이터 JSON 번들' : 'Full organization JSON bundle' }}</strong>
              <button class="page-button page-button--secondary" type="button">{{ content.exportLabel }}</button>
            </div>
            <div class="page-feed__item">
              <span class="page-feed__label">{{ content.resetDangerLabel }}</span>
              <strong class="page-feed__text">{{ preferences.language === 'ko' ? '기본값으로 되돌리기' : 'Revert all settings to defaults' }}</strong>
              <button class="page-button page-button--danger" type="button">{{ content.resetDangerLabel }}</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
