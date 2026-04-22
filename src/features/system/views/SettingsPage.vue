<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watchEffect } from 'vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import { createOrganization } from '../../../services/organization'
import { createInitialOrgAdmin } from '../../../services/user'
import PhoneField from '../../../components/forms/PhoneField.vue'

const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    eyebrow: '플랫폼 / 관리',
    title: '플랫폼관리',
    tabs: ['조직', '사용자'],
    resetLabel: '초기화',
    saveLabel: '저장',
    inviteLabel: '조직 관리자 생성',
    keyLabel: '키 생성',
    exportLabel: '전체 데이터 내보내기',
    resetDangerLabel: '설정 초기화',
  },
  en: {
    eyebrow: 'Platform / Management',
    title: 'Platform Management',
    tabs: ['Organization', 'Users'],
    resetLabel: 'RESET',
    saveLabel: 'SAVE CHANGES',
    inviteLabel: 'CREATE ORG ADMIN',
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
  // 한글 조직명입니다.
  organizationName: '',
  // 영문 조직명입니다.
  organizationEnglishName: '',
  businessNo: '',
  contactFirstName: '',
  contactMiddleName: '',
  contactLastName: '',
  contactEmail: '',
  contactPhone: '',
})


// 최초 ORG_ADMIN 생성 폼 값입니다.
// 로그인 ID는 서버가 자동 생성하므로 프론트에서는 입력받지 않습니다.
const initialOrgAdminForm = reactive({
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

// 최초 ORG_ADMIN 생성 후 서버가 자동 생성한 로그인 ID입니다.
const createdOrgAdminLoginId = ref('')

// 최초 ORG_ADMIN 생성 후 받은 임시 비밀번호입니다.
const createdOrgAdminTempPassword = ref('')

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

// 조직 담당자 연락처 유효성 여부입니다.
const organizationContactPhoneValid = ref(false)

// 최초 ORG_ADMIN 연락처 유효성 여부입니다.
const initialOrgAdminPhoneValid = ref(false)

// 새 조직을 생성합니다.
// 성공하면 organizationPublicId 를 저장해서 다음 단계인 ORG_ADMIN 생성에 씁니다.
async function submitOrganization() {
  organizationCreateError.value = ''
  organizationCreateSuccess.value = ''

if (
  !organizationForm.organizationName ||
  !organizationForm.organizationEnglishName ||
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

  // 연락처 형식이 올바른지 먼저 검사합니다.
  if (!organizationContactPhoneValid.value) {
    organizationCreateError.value =
      preferences.language === 'ko'
        ? '담당자 연락처 형식이 올바르지 않습니다.'
        : 'The contact phone number format is invalid.'
    return
  }

  try {
    isCreatingOrganization.value = true

const response = await createOrganization({
  organizationType: organizationForm.organizationType,
  // 한글 조직명을 보냅니다.
  organizationName: organizationForm.organizationName,
  // 영문 조직명도 같이 보내야 백엔드 검증을 통과합니다.
  organizationEnglishName: organizationForm.organizationEnglishName,
  businessNo: organizationForm.businessNo,
  contactFirstName: organizationForm.contactFirstName,
  contactMiddleName: organizationForm.contactMiddleName,
  contactLastName: organizationForm.contactLastName,
  contactEmail: organizationForm.contactEmail,
  contactPhone: organizationForm.contactPhone,
})


    createdOrganizationPublicId.value = response.organizationPublicId

    organizationCreateSuccess.value =
      preferences.language === 'ko'
        ? `조직이 생성되었습니다. 조직 ID: ${response.organizationPublicId}`
        : `Organization created. ID: ${response.organizationPublicId}`

    // 조직이 새로 만들어지면 이전 대표자 생성 결과는 비웁니다.
    orgAdminCreateError.value = ''
    orgAdminCreateSuccess.value = ''
    createdOrgAdminLoginId.value = ''
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
// 성공하면 자동 생성된 로그인 ID와 임시 비밀번호를 화면에 보여줍니다.
async function submitInitialOrgAdmin() {
  orgAdminCreateError.value = ''
  orgAdminCreateSuccess.value = ''

  // 새 결과를 보여주기 전에 이전 결과를 먼저 비웁니다.
  createdOrgAdminLoginId.value = ''
  createdOrgAdminTempPassword.value = ''

  if (!createdOrganizationPublicId.value) {
    orgAdminCreateError.value =
      preferences.language === 'ko'
        ? '먼저 조직을 생성해 주세요.'
        : 'Please create the organization first.'
    return
  }

  // 로그인 ID는 서버가 자동 생성하므로 이름/이메일/연락처만 검사합니다.
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

  // 연락처 형식이 올바른지 먼저 검사합니다.
  if (!initialOrgAdminPhoneValid.value) {
    orgAdminCreateError.value =
      preferences.language === 'ko'
        ? '연락처 형식이 올바르지 않습니다.'
        : 'The phone number format is invalid.'
    return
  }

  try {
    isCreatingOrgAdmin.value = true

    const response = await createInitialOrgAdmin(
      createdOrganizationPublicId.value,
      {
        // 로그인 ID는 서버가 자동 생성하므로 이름/연락처 정보만 보냅니다.
        firstName: initialOrgAdminForm.firstName,
        middleName: initialOrgAdminForm.middleName,
        lastName: initialOrgAdminForm.lastName,
        email: initialOrgAdminForm.email,
        phone: initialOrgAdminForm.phone,
        jobTitle: initialOrgAdminForm.jobTitle,
      },
    )

    // 서버가 자동 생성한 로그인 ID를 저장합니다.
    createdOrgAdminLoginId.value = response.loginId

    // 서버가 생성한 임시 비밀번호를 저장합니다.
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
                <option value="BUYER">
                  {{ preferences.language === 'ko' ? '발주사' : 'BUYER' }}
                </option>
                <option value="SUPPLIER">
                  {{ preferences.language === 'ko' ? '협력사' : 'SUPPLIER' }}
                </option>
              </select>
            </label>

            <label>
  <span>{{ preferences.language === 'ko' ? '조직명' : 'Organization Name' }}</span>
  <input v-model="organizationForm.organizationName" type="text" />
</label>

<!-- 조직 영문명 입력칸입니다. -->
<label>
  <span>{{ preferences.language === 'ko' ? '조직 영문명' : 'Organization English Name' }}</span>
  <input v-model="organizationForm.organizationEnglishName" type="text" />
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

    <section v-else-if="activeTab === content.tabs[1]" class="settings-page__panel">
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
              <span>{{ preferences.language === 'ko' ? '대상 조직 ID' : 'Target Organization ID' }}</span>
              <input :value="createdOrganizationPublicId" type="text" readonly />
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
              :disabled="isCreatingOrgAdmin || !createdOrganizationPublicId"
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
  </section>
</template>
