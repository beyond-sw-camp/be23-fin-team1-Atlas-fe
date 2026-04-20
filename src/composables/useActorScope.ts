import { computed } from 'vue'
import { useAtlasSessionStore } from '../stores/session'

type BackendOrganizationType = 'BUYER' | 'SUPPLIER' | 'ADMIN' | ''
type UserRole = 'USER' | 'ORG_ADMIN' | 'ADMIN' | ''

export function useActorScope() {
  const session = useAtlasSessionStore()

  // 세션에 저장된 사용자/조직 식별 정보를 그대로 노출합니다.
  const userPublicId = computed(() => session.userPublicId ?? '')
  const organizationPublicId = computed(() => session.organizationPublicId ?? '')
  const organizationType = computed<BackendOrganizationType>(
    () => (session.organizationType as BackendOrganizationType) || '',
  )
  const userRole = computed<UserRole>(() => (session.userRole as UserRole) || '')

  // 역할/조직 타입별 공통 분기입니다.
  const isAdminRole = computed(() => userRole.value === 'ADMIN')
  const isOrgAdminRole = computed(() => userRole.value === 'ORG_ADMIN')
  const isUserRole = computed(() => userRole.value === 'USER')

  const isBuyerOrganization = computed(() => organizationType.value === 'BUYER')
  const isSupplierOrganization = computed(() => organizationType.value === 'SUPPLIER')
  const isPlatformOrganization = computed(() => organizationType.value === 'ADMIN')

  // 협력사 목록 전체 조회는 백엔드 SupplierService 기준으로
  // ADMIN role 또는 BUYER organization 에서만 허용됩니다.
  const canViewAllSupplierDirectory = computed(
    () => isAdminRole.value || isBuyerOrganization.value,
  )

  // 협력사 신규 등록은 ADMIN role 만 가능합니다.
  const canCreateSupplier = computed(() => isAdminRole.value)

  // 품목 CRUD 는 supplier 조직만 가능합니다.
  const canManageItems = computed(() => isSupplierOrganization.value)

  // 발주 생성/수정은 buyer 조직 기준입니다.
  const canCreatePurchaseOrder = computed(() => isBuyerOrganization.value)
  const canManagePurchaseOrdersAsBuyer = computed(() => isBuyerOrganization.value)

  // 공급사 포털에서는 supplier 시점으로 발주를 조회해야 합니다.
  const ordersViewType = computed<'BUYER' | 'SUPPLIER'>(() =>
    isSupplierOrganization.value ? 'SUPPLIER' : 'BUYER',
  )

  return {
    userPublicId,
    organizationPublicId,
    organizationType,
    userRole,
    isAdminRole,
    isOrgAdminRole,
    isUserRole,
    isBuyerOrganization,
    isSupplierOrganization,
    isPlatformOrganization,
    canViewAllSupplierDirectory,
    canCreateSupplier,
    canManageItems,
    canCreatePurchaseOrder,
    canManagePurchaseOrdersAsBuyer,
    ordersViewType,
  }
}
