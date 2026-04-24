<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import PhoneField from '../../../components/forms/PhoneField.vue'
import { useActorScope } from '../../../composables/useActorScope'
import {
  getMyOrganizationDetail,
  getOrganizationDetail,
  getOrganizations,
  updateOrganization,
  type OrganizationDetailResponse,
  type OrganizationListItem,
} from '../../../services/organization'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

// 현재 언어 설정을 읽습니다.
const preferences = useAtlasPreferencesStore()

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

// 플랫폼 관리자가 보는 조직 목록입니다.
const organizationRows = ref<OrganizationListItem[]>([])

// 현재 선택한 조직의 내부 ID 입니다.
const selectedOrganizationId = ref<number | null>(null)

// 오른쪽 상세 패널에 보여줄 조직 상세 정보입니다.
const selectedOrganizationDetail = ref<OrganizationDetailResponse | null>(null)

// 목록 로딩 상태입니다.
const isLoadingOrganizations = ref(false)

// 상세 로딩 상태입니다.
const isLoadingOrganizationDetail = ref(false)

// 저장 버튼 로딩 상태입니다.
const isSavingOrganization = ref(false)

// 화면 에러 문구입니다.
const pageError = ref('')

// 화면 성공 문구입니다.
const pageSuccess = ref('')

// 연락처 유효성 상태입니다.
const organizationPhoneValid = ref(false)

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
})

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
        validationRequired:
          '조직명, 영문명, 조직 코드, 담당자 이름, 담당자 성, 연락처는 필수입니다.',
        validationAlias:
          '조직 코드는 영문 대문자/숫자만 가능하고 2~10자여야 합니다.',
        validationPhone: '담당자 연락처 형식이 올바르지 않습니다.',
        loadListFailed: '조직 목록을 불러오지 못했습니다.',
        loadDetailFailed: '조직 정보를 불러오지 못했습니다.',
        missingOrganizationId: '목록 응답에 organizationId가 없어 상세보기를 할 수 없습니다.',
        saveSuccess: '조직 정보가 수정되었습니다.',
        saveFailed: '조직 정보 수정에 실패했습니다.',
      }
    : {
        eyebrow: 'ORGANIZATION',
        title: 'Organization Management',
        listTitle: 'Organization List',
        listDescription:
          'Platform admins can review all organizations and view their details.',
        myOrganizationDescription:
          'Organization owners can edit only their own organization.',
        readOnlyDescription:
          'Platform admins can view organization information only.',
        detailTitle: 'Organization Detail',
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
      },
)

// 현재 선택된 조직 이름입니다.
const selectedOrganizationLabel = computed(() => {
  return selectedOrganizationDetail.value?.organizationName || '-'
})

// 목록 row 안에 organizationId가 실제로 있는지 확인합니다.
function hasOrganizationId(row: OrganizationListItem) {
  return typeof row.organizationId === 'number' && Number.isFinite(row.organizationId)
}

// 현재 row가 진짜 선택된 row인지 안전하게 확인합니다.
function isSelectedRow(row: OrganizationListItem) {
  return hasOrganizationId(row) && selectedOrganizationId.value === row.organizationId
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

// 화면 메시지를 비웁니다.
function resetMessages() {
  pageError.value = ''
  pageSuccess.value = ''
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

  // 기존 연락처가 있으면 처음에는 유효한 값으로 둡니다.
  organizationPhoneValid.value = Boolean(detail.contactPhone)
}

// 조직 코드는 영문 대문자/숫자만 남기고 길이도 자릅니다.
function normalizeOrganizationAlias() {
  organizationForm.organizationAlias = organizationForm.organizationAlias
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 10)
}

// 플랫폼 관리자가 보는 조직 목록을 읽습니다.
async function loadOrganizationList() {
  try {
    isLoadingOrganizations.value = true
    pageError.value = ''
    pageSuccess.value = ''

    const response = await getOrganizations({
      page: 0,
      size: 100,
    })

    organizationRows.value = response.content

    // 처음에는 아무 조직도 자동 선택하지 않습니다.
    selectedOrganizationId.value = null
    selectedOrganizationDetail.value = null
  } catch (error: any) {
    pageError.value = error?.payload?.message || copy.value.loadListFailed
  } finally {
    isLoadingOrganizations.value = false
  }
}

// 조직 내부 ID 기준으로 상세 API를 호출합니다.
async function loadOrganizationDetailById(organizationId: number) {
  if (!Number.isFinite(organizationId)) {
    selectedOrganizationId.value = null
    selectedOrganizationDetail.value = null
    pageError.value = copy.value.missingOrganizationId
    pageSuccess.value = ''
    return
  }

  try {
    // 어떤 조직을 눌렀는지 먼저 선택 상태로 표시합니다.
    selectedOrganizationId.value = organizationId

    // 이전 상세는 비우고 새로 읽습니다.
    selectedOrganizationDetail.value = null

    isLoadingOrganizationDetail.value = true
    resetMessages()

    const detail = await getOrganizationDetail(organizationId)

    selectedOrganizationDetail.value = detail
    syncOrganizationForm(detail)
  } catch (error: any) {
    // 상세 조회 실패 시 선택 상태를 다시 풀어 줍니다.
    selectedOrganizationId.value = null
    selectedOrganizationDetail.value = null
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
    isLoadingOrganizationDetail.value = true
    resetMessages()

    const detail = await getMyOrganizationDetail()

    selectedOrganizationId.value = detail.organizationId
    selectedOrganizationDetail.value = detail
    syncOrganizationForm(detail)
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

  // 필수값부터 확인합니다.
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

  // 조직 코드 규칙도 같이 확인합니다.
  if (!/^[A-Z0-9]{2,10}$/.test(organizationForm.organizationAlias)) {
    pageError.value = copy.value.validationAlias
    return
  }

  // 연락처 형식도 확인합니다.
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
        contactFirstName: organizationForm.contactFirstName.trim(),
        contactMiddleName: organizationForm.contactMiddleName.trim() || null,
        contactLastName: organizationForm.contactLastName.trim(),
        contactEmail: organizationForm.contactEmail.trim() || null,
        contactPhone: organizationForm.contactPhone,
      },
    )

    // 저장 후 오른쪽 상세도 최신값으로 맞춥니다.
    selectedOrganizationDetail.value = saved
    syncOrganizationForm(saved)

    // 조직 대표자 화면이면 목록은 없으므로 아래 코드는 관리자 화면 대비용입니다.
    organizationRows.value = organizationRows.value.map((row) =>
      hasOrganizationId(row) && row.organizationId === saved.organizationId
        ? {
            ...row,
            organizationName: saved.organizationName,
            organizationType: saved.organizationType,
            businessNo: saved.businessNo ?? '',
            contactEmail: saved.contactEmail ?? '',
            contactPhone: saved.contactPhone,
            status: saved.status,
          }
        : row,
    )

    pageSuccess.value = copy.value.saveSuccess
  } catch (error: any) {
    pageError.value = error?.payload?.message || copy.value.saveFailed
  } finally {
    isSavingOrganization.value = false
  }
}

// 페이지가 열리면 바로 데이터를 읽습니다.
onMounted(() => {
  void loadPage()
})
</script>

<template>
  <section class="app-screen">
    <!-- 권한이 없으면 안내만 보여줍니다. -->
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

    <!-- 권한이 있으면 실제 조직관리 화면을 보여줍니다. -->
    <template v-else>
      <div
        style="
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 20px;
        "
      >
        <!-- 플랫폼 관리자일 때만 왼쪽 조직 목록을 보여줍니다. -->
        <article v-if="isAdminManager" class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.eyebrow }}</div>
              <h3>{{ copy.listTitle }}</h3>
              <p class="settings-page__copy">{{ copy.listDescription }}</p>
            </div>
          </div>

          <!-- 목록 로딩 중 문구입니다. -->
          <div v-if="isLoadingOrganizations" class="login-hint">
            {{ copy.loadingList }}
          </div>

          <!-- 목록이 없을 때 문구입니다. -->
          <div v-else-if="organizationRows.length === 0" class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.listTitle }}</span>
              <strong class="page-feed__text">{{ copy.emptyList }}</strong>
            </div>
          </div>

          <!-- 조직 목록입니다. -->
          <div v-else class="page-feed">
            <div
              v-for="row in organizationRows"
              :key="row.organizationPublicId || row.organizationName"
              class="page-feed__item"
              :style="{
                borderColor: isSelectedRow(row) ? '#111827' : undefined,
                backgroundColor: isSelectedRow(row) ? 'rgba(17, 24, 39, 0.04)' : undefined,
              }"
            >
              <!-- 첫 줄은 조직 유형과 상태를 보여줍니다. -->
              <span class="page-feed__label">
                {{ formatOrganizationType(row.organizationType) }} ·
                {{ formatOrganizationStatus(row.status) }}
              </span>

              <!-- 둘째 줄은 조직 이름입니다. -->
              <strong class="page-feed__text">
                {{ row.organizationName }}
              </strong>

              <!-- 셋째 줄은 연락처와 이메일입니다. -->
              <span class="page-feed__label">
                {{ copy.listPhone }}: {{ row.contactPhone || '-' }}
              </span>

              <span class="page-feed__label">
                {{ copy.listEmail }}: {{ row.contactEmail || '-' }}
              </span>

              <!-- 목록 행에서 organizationId가 있을 때만 상세보기 가능합니다. -->
              <button
                class="page-button page-button--secondary"
                type="button"
                style="margin-top: 12px;"
                :disabled="!hasOrganizationId(row) || isSelectedRow(row)"
                @click="selectOrganization(row)"
              >
                {{
                  !hasOrganizationId(row)
                    ? copy.unavailableButton
                    : isSelectedRow(row)
                      ? copy.selectedButton
                      : copy.selectButton
                }}
              </button>
            </div>
          </div>
        </article>

        <!-- 오른쪽 상세/조회 영역입니다. -->
        <article class="page-panel">
          <div class="page-panel__head">
            <div>
              <div class="page-panel__eyebrow">{{ copy.eyebrow }}</div>
              <h3>{{ copy.detailTitle }}</h3>
              <p class="settings-page__copy">
                {{
                  isAdminManager
                    ? copy.readOnlyDescription
                    : copy.myOrganizationDescription
                }}
              </p>
            </div>

            <!-- 현재 보고 있는 조직의 상태와 유형을 칩으로 보여줍니다. -->
            <div
              v-if="selectedOrganizationDetail"
              style="display: flex; gap: 8px; flex-wrap: wrap;"
            >
              <span class="page-panel__chip">
                {{ formatOrganizationType(selectedOrganizationDetail.organizationType) }}
              </span>
              <span class="page-panel__chip">
                {{ formatOrganizationStatus(selectedOrganizationDetail.status) }}
              </span>
            </div>
          </div>

          <!-- 에러/성공 메시지는 상세 데이터가 없어도 먼저 보여줍니다. -->
          <div v-if="pageError" class="login-error" style="margin-bottom: 12px;">
            {{ pageError }}
          </div>

          <div v-if="pageSuccess" class="login-hint" style="margin-bottom: 12px;">
            {{ pageSuccess }}
          </div>

          <!-- 상세 로딩 중 문구입니다. -->
          <div v-if="isLoadingOrganizationDetail" class="login-hint">
            {{ copy.loadingDetail }}
          </div>

          <!-- 선택된 조직이 아직 없을 때 문구입니다. -->
          <div v-else-if="!selectedOrganizationDetail" class="page-feed">
            <div class="page-feed__item">
              <span class="page-feed__label">{{ copy.detailTitle }}</span>
              <strong class="page-feed__text">{{ copy.chooseOrganization }}</strong>
            </div>
          </div>

          <!-- 실제 상세 영역입니다. -->
          <template v-else>
            <!-- 공통 요약 정보입니다. -->
            <div class="page-feed" style="margin-bottom: 16px;">
              <div class="page-feed__item">
                <span class="page-feed__label">{{ copy.organizationName }}</span>
                <strong class="page-feed__text">{{ selectedOrganizationLabel }}</strong>
              </div>

              <div class="page-feed__item">
                <span class="page-feed__label">{{ copy.organizationType }}</span>
                <strong class="page-feed__text">
                  {{ formatOrganizationType(selectedOrganizationDetail.organizationType) }}
                </strong>
              </div>

              <div class="page-feed__item">
                <span class="page-feed__label">{{ copy.organizationStatus }}</span>
                <strong class="page-feed__text">
                  {{ formatOrganizationStatus(selectedOrganizationDetail.status) }}
                </strong>
              </div>
            </div>

            <!-- 플랫폼 관리자는 읽기 전용으로만 봅니다. -->
            <div v-if="!canEditOrganization" class="profile-kv">
              <div class="profile-kv__row">
                <span>{{ copy.organizationEnglishName }}</span>
                <strong>{{ selectedOrganizationDetail.organizationEnglishName || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.organizationAlias }}</span>
                <strong>{{ selectedOrganizationDetail.organizationAlias || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.businessNo }}</span>
                <strong>{{ selectedOrganizationDetail.businessNo || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.contactFirstName }}</span>
                <strong>{{ selectedOrganizationDetail.contactFirstName || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.contactMiddleName }}</span>
                <strong>{{ selectedOrganizationDetail.contactMiddleName || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.contactLastName }}</span>
                <strong>{{ selectedOrganizationDetail.contactLastName || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.contactEmail }}</span>
                <strong>{{ selectedOrganizationDetail.contactEmail || '-' }}</strong>
              </div>

              <div class="profile-kv__row">
                <span>{{ copy.contactPhone }}</span>
                <strong>{{ selectedOrganizationDetail.contactPhone || '-' }}</strong>
              </div>
            </div>

            <!-- 조직 대표자만 수정 폼을 봅니다. -->
            <div v-else class="settings-form">
              <label>
                <span>{{ copy.organizationName }}</span>
                <input v-model="organizationForm.organizationName" type="text" />
              </label>

              <label>
                <span>{{ copy.organizationEnglishName }}</span>
                <input v-model="organizationForm.organizationEnglishName" type="text" />
              </label>

              <label>
                <span>{{ copy.organizationAlias }}</span>
                <input
                  v-model="organizationForm.organizationAlias"
                  type="text"
                  maxlength="10"
                  placeholder="ATLAS1"
                  @input="normalizeOrganizationAlias"
                />
              </label>

              <label>
                <span>{{ copy.businessNo }}</span>
                <input v-model="organizationForm.businessNo" type="text" />
              </label>

              <label>
                <span>{{ copy.contactFirstName }}</span>
                <input v-model="organizationForm.contactFirstName" type="text" />
              </label>

              <label>
                <span>{{ copy.contactMiddleName }}</span>
                <input v-model="organizationForm.contactMiddleName" type="text" />
              </label>

              <label>
                <span>{{ copy.contactLastName }}</span>
                <input v-model="organizationForm.contactLastName" type="text" />
              </label>

              <label>
                <span>{{ copy.contactEmail }}</span>
                <input v-model="organizationForm.contactEmail" type="email" />
              </label>

              <label>
                <span>{{ copy.contactPhone }}</span>
                <PhoneField
                  v-model="organizationForm.contactPhone"
                  v-model:valid="organizationPhoneValid"
                  :language="preferences.language"
                />
              </label>

              <button
                class="page-button page-button--primary"
                type="button"
                :disabled="isSavingOrganization"
                @click="submitOrganizationUpdate"
              >
                {{ isSavingOrganization ? copy.savingButton : copy.saveButton }}
              </button>
            </div>
          </template>
        </article>
      </div>
    </template>
  </section>
</template>
