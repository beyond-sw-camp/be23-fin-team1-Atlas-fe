<script setup lang="ts">
import { ref, onMounted, computed, watchEffect, onBeforeUnmount } from 'vue'
import { getReturnRequests, type ReturnRequestResponseDto } from '../../../services/return'
import { getOrganizations, type OrganizationListItem } from '../../../services/organization'
import ReturnCreateModal from '../components/ReturnCreateModal.vue'
import ReturnTimelineModal from '../components/ReturnTimelineModal.vue'

// Language & Theme state (mocking global store for now)
const currentLanguage = ref<'ko' | 'en'>('ko')

// Selected Tab: ALL, REQUESTED, IN_TRANSIT, COMPLETED
const activeTab = ref('ALL')

const returns = ref<ReturnRequestResponseDto[]>([])
const isLoading = ref(false)
const isCreateModalOpen = ref(false)

const isTimelineModalOpen = ref(false)
const selectedReturn = ref<ReturnRequestResponseDto | null>(null)

// 조직 publicId → 조직명 매핑용
const orgNameMap = ref<Record<string, string>>({})

// For formatting dates
const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString()
}

/** publicId로 조직명 조회 (없으면 publicId 앞 8글자로 표시) */
function getOrgName(publicId: string | undefined): string {
  if (!publicId) return '-'
  return orgNameMap.value[publicId] || publicId.slice(0, 8) + '...'
}

async function fetchOrganizations() {
  try {
    const res = await getOrganizations({ page: 0, size: 200 })
    const orgs = res.content || []
    const map: Record<string, string> = {}
    orgs.forEach((org: OrganizationListItem) => {
      map[org.organizationPublicId] = org.organizationName
    })
    orgNameMap.value = map
  } catch (e) {
    console.error('Failed to fetch organizations:', e)
  }
}

const content = computed(() => {
  return currentLanguage.value === 'ko'
    ? {
        title: '반품 (Returns)',
        desc: '발주 또는 출하된 품목에 대한 수거 및 반품 상태를 관리합니다.',
        all: '전체',
        requested: '요청됨',
        inTransit: '회수 중',
        completed: '완료됨',
        newReturn: '반품 생성',
        colNo: '반품 번호',
        colReqOrg: '요청 조직',
        colTargetOrg: '대상 조직',
        colType: '반품 유형',
        colStatus: '상태',
        colDate: '요청일시',
        colAction: '이력/관리',
        btnDetail: '상세 보기',
        empty: '반품 내역이 없습니다.',
      }
    : {
        title: 'Returns',
        desc: 'Manage return requests and shipments for items.',
        all: 'All',
        requested: 'Requested',
        inTransit: 'In Transit',
        completed: 'Completed',
        newReturn: 'New Return',
        colNo: 'Return No',
        colReqOrg: 'Req Org',
        colTargetOrg: 'Target Org',
        colType: 'Type',
        colStatus: 'Status',
        colDate: 'Req Date',
        colAction: 'Action',
        btnDetail: 'Details',
        empty: 'No Returns found.',
      }
})

const filteredReturns = computed(() => {
  if (activeTab.value === 'ALL') return returns.value
  if (activeTab.value === 'REQUESTED') {
    return returns.value.filter(r => r.returnStatus === 'REQUESTED' || r.returnStatus === 'APPROVED')
  }
  if (activeTab.value === 'IN_TRANSIT') {
    return returns.value.filter(r => r.returnStatus === 'IN_TRANSIT' || r.returnStatus === 'RECEIVED')
  }
  if (activeTab.value === 'COMPLETED') {
    return returns.value.filter(r => r.returnStatus === 'COMPLETED' || r.returnStatus === 'REJECTED')
  }
  return returns.value
})

async function fetchReturns() {
  isLoading.value = true
  try {
    const res = await getReturnRequests({ page: 0, size: 50 })
    returns.value = res.content
  } catch (error) {
    console.error('Failed to load returns:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchOrganizations()
  fetchReturns()
})

function openTimeline(ret: ReturnRequestResponseDto) {
  selectedReturn.value = ret
  isTimelineModalOpen.value = true
}

function handleCreateSuccess() {
  isCreateModalOpen.value = false
  fetchReturns()
}
</script>

<template>
  <div class="terminal-page lots-page">
    <header class="terminal-page__header">
      <div>
        <div class="terminal-page__eyebrow">Supply Chain Ops / Returns</div>
        <h2 class="terminal-page__title">{{ content.title }}</h2>
        <p class="terminal-page__subtitle">{{ content.desc }}</p>
      </div>
      <div class="design-trigger-row">
        <button class="page-button page-button--primary" @click="isCreateModalOpen = true">
          {{ content.newReturn }}
        </button>
      </div>
    </header>

    <!-- Action Bar -->
    <div class="action-bar" style="margin-top: 24px;">
      <div class="tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'ALL' }]" 
          @click="activeTab = 'ALL'">
          {{ content.all }}
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'REQUESTED' }]" 
          @click="activeTab = 'REQUESTED'">
          {{ content.requested }}
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'IN_TRANSIT' }]" 
          @click="activeTab = 'IN_TRANSIT'">
          {{ content.inTransit }}
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'COMPLETED' }]" 
          @click="activeTab = 'COMPLETED'">
          {{ content.completed }}
        </button>
      </div>
    </div>

    <!-- Data Table -->
    <div class="table-container">
      <table class="terminal-table">
        <thead>
          <tr>
            <th>{{ content.colNo }}</th>
            <th>{{ content.colReqOrg }}</th>
            <th>{{ content.colTargetOrg }}</th>
            <th>{{ content.colType }}</th>
            <th>{{ content.colStatus }}</th>
            <th>{{ content.colDate }}</th>
            <th class="col-action">{{ content.colAction }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="7" class="text-center loading-cell">Loading Returns...</td>
          </tr>
          <tr v-else-if="filteredReturns.length === 0">
            <td colspan="7" class="text-center empty-cell">{{ content.empty }}</td>
          </tr>
          <tr v-else v-for="item in filteredReturns" :key="item.publicId">
            <td class="font-mono">{{ item.returnNumber }}</td>
            <td>{{ item.requestOrganizationName || getOrgName(item.requestOrganizationPublicId) }}</td>
            <td>{{ item.targetOrganizationName || getOrgName(item.targetOrganizationPublicId) }}</td>
            <td>{{ item.returnType }}</td>
            <td>
              <span class="status-indicator" :class="item.returnStatus.toLowerCase()">
                {{ item.returnStatus }}
              </span>
            </td>
            <td>{{ formatDate(item.requestedAt) }}</td>
            <td class="col-action">
              <button class="btn-detail" @click="openTimeline(item)">{{ content.btnDetail }} &rarr;</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modals -->
    <ReturnCreateModal
      :is-open="isCreateModalOpen"
      :language="currentLanguage"
      @close="isCreateModalOpen = false"
      @success="handleCreateSuccess"
    />

    <ReturnTimelineModal
      :is-open="isTimelineModalOpen"
      :language="currentLanguage"
      :target-return="selectedReturn"
      @close="isTimelineModalOpen = false"
      @status-changed="fetchReturns"
    />
  </div>
</template>

<style scoped>
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.tabs {
  display: flex;
  gap: 16px;
  border-bottom: 1px solid var(--color-surface-container-high);
}

.tab-btn {
  background: none;
  border: none;
  color: var(--color-on-surface-variant);
  font-size: 0.875rem;
  font-weight: 600;
  padding: 8px 0;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--color-on-surface);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.table-container {
  overflow-x: auto;
  border: 1px solid var(--color-surface-container-highest);
  background: var(--color-surface-container-lowest);
}

.status-indicator {
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
}

.status-indicator.requested { color: var(--color-on-surface); background: var(--color-surface-container-high); }
.status-indicator.approved { color: #10B981; background: rgba(16, 185, 129, 0.1); }
.status-indicator.in_transit { color: #3B82F6; background: rgba(59, 130, 246, 0.1); }
.status-indicator.received { color: #8B5CF6; background: rgba(139, 92, 246, 0.1); }
.status-indicator.completed { color: #6366F1; background: rgba(99, 102, 241, 0.1); }
.status-indicator.rejected { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

.btn-detail {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-detail:hover {
  text-decoration: underline;
}

.loading-cell, .empty-cell {
  padding: 32px !important;
  color: var(--color-on-surface-variant);
  font-style: italic;
}
</style>
