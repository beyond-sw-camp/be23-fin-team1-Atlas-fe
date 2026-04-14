import { apiClient } from './http'

export interface CreateSupplierCertificateRequestDto {
  certificateTypePublicId: string
  certificateNo: string
  issuedAt: string
  expiredAt: string
  issuerName: string
  attachmentPublicId: string
}

export interface CertificateTypeResponseDto {
  publicId: string
  name: string
  description?: string
}

export interface SupplierCertificateResponseDto {
  publicId: string
  supplierPublicId: string
  certificateType: CertificateTypeResponseDto
  certificateNo: string
  issuedAt: string
  expiredAt: string
  certificateStatus: 'REVIEW_REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'REVOKED'
  issuerName: string
  attachmentPublicId: string
  rejectReason?: string
}

export async function createSupplierCertificate(supplierPublicId: string, data: CreateSupplierCertificateRequestDto): Promise<SupplierCertificateResponseDto> {
  const response = await apiClient.post<SupplierCertificateResponseDto>(`/api/supply/suppliers/${supplierPublicId}/certificates`, data)
  return response.data
}

export async function getSupplierCertificates(supplierPublicId: string): Promise<SupplierCertificateResponseDto[]> {
  const response = await apiClient.get<SupplierCertificateResponseDto[]>(`/api/supply/suppliers/${supplierPublicId}/certificates`)
  return response.data
}

export async function getCertificate(publicId: string): Promise<SupplierCertificateResponseDto> {
  const response = await apiClient.get<SupplierCertificateResponseDto>(`/api/supply/certificates/${publicId}`)
  return response.data
}

export async function approveCertificate(publicId: string): Promise<void> {
  await apiClient.patch(`/api/supply/certificates/${publicId}/approve`)
}

export async function rejectCertificate(publicId: string, rejectReason: string): Promise<void> {
  await apiClient.patch(`/api/supply/certificates/${publicId}/reject`, { rejectReason })
}

export async function getExpiringCertificates(): Promise<SupplierCertificateResponseDto[]> {
  const response = await apiClient.get<SupplierCertificateResponseDto[]>('/api/supply/certificates/expiring')
  return response.data
}
