import { apiClient } from './http'
import type { PageResponse } from './lot'

export interface CreateSupplierCertificateRequestDto {
  certificateTypePublicId: string
  certificateNo: string
  issuedAt: string
  expiredAt: string
  issuerName: string
  attachmentPublicId?: string
}

export interface CertificateTypeResponseDto {
  publicId: string
  name: string
  description?: string
}

export interface SupplierCertificateResponseDto {
  publicId: string
  supplierPublicId: string
  supplierName: string
  certificateType: CertificateTypeResponseDto
  certificateNo: string
  issuedAt: string
  expiredAt: string
  certificateStatus: 'REVIEW_REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED'
  issuerName: string
  attachmentPublicId?: string
  rejectReason?: string
}

export interface CertificateHistoryResponseDto {
  publicId: string
  preStatus: string
  status: string
  reason?: string
  changedByUserPublicId?: string
  createdAt: string
}

/* ── 전체 인증서 페이징 조회 (신규 추가된 API) ── */
export async function getAllCertificates(): Promise<PageResponse<SupplierCertificateResponseDto>> {
  const response = await apiClient.get<PageResponse<SupplierCertificateResponseDto>>('/api/supply/certificates')
  return response.data
}

/* ── 인증서 등록 ── */
export async function createSupplierCertificate(supplierPublicId: string, data: CreateSupplierCertificateRequestDto): Promise<SupplierCertificateResponseDto> {
  const response = await apiClient.post<SupplierCertificateResponseDto>(`/api/supply/suppliers/${supplierPublicId}/certificates`, data)
  return response.data
}

/* ── 특정 협력사 인증서 목록 ── */
export async function getSupplierCertificates(supplierPublicId: string): Promise<SupplierCertificateResponseDto[]> {
  const response = await apiClient.get<SupplierCertificateResponseDto[]>(`/api/supply/suppliers/${supplierPublicId}/certificates`)
  return response.data
}

/* ── 단건 상세 조회 ── */
export async function getCertificate(publicId: string): Promise<SupplierCertificateResponseDto> {
  const response = await apiClient.get<SupplierCertificateResponseDto>(`/api/supply/certificates/${publicId}`)
  return response.data
}

/* ── 인증서 수정 (REVIEW_REQUESTED 상태로 재전환) ── */
export async function updateCertificate(publicId: string, data: CreateSupplierCertificateRequestDto): Promise<SupplierCertificateResponseDto> {
  const response = await apiClient.put<SupplierCertificateResponseDto>(`/api/supply/certificates/${publicId}`, data)
  return response.data
}

/* ── 인증서 삭제 (Hard Delete) ── */
export async function deleteCertificate(publicId: string): Promise<void> {
  await apiClient.delete(`/api/supply/certificates/${publicId}`)
}

/* ── 관리자: 승인 ── */
export async function approveCertificate(publicId: string): Promise<void> {
  await apiClient.patch(`/api/supply/certificates/${publicId}/approve`)
}

/* ── 관리자: 반려 ── */
export async function rejectCertificate(publicId: string, rejectReason: string): Promise<void> {
  await apiClient.patch(`/api/supply/certificates/${publicId}/reject`, { rejectReason })
}

/* ── 만료 임박 인증서 조회 ── */
export async function getExpiringCertificates(): Promise<SupplierCertificateResponseDto[]> {
  const response = await apiClient.get<SupplierCertificateResponseDto[]>('/api/supply/certificates/expiring')
  return response.data
}

/* ── 인증서 상태 변경 이력(Audit Trail) 조회 ── */
export async function getCertificateHistories(publicId: string): Promise<CertificateHistoryResponseDto[]> {
  const response = await apiClient.get<CertificateHistoryResponseDto[]>(`/api/supply/certificates/${publicId}/histories`)
  return response.data
}

/* ── 인증 유형 마스터 전체 조회 (셀렉트박스용) ── */
export async function getCertificateTypes(): Promise<CertificateTypeResponseDto[]> {
  const response = await apiClient.get<CertificateTypeResponseDto[]>('/api/supply/certificate-types')
  return response.data
}
