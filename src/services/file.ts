import { apiClient } from './http'

export interface AttachmentUploadResponseDto {
  attachmentPublicId: string
  refType: string
  refPublicId: string
  files: Array<{
    publicId: string
    originalFileName: string
    fileSize: number
    contentType: string
    fileUrl: string
  }>
}

/**
 * 전용 첨부파일 업로드 (Multipart/form-data)
 * Step 1: 파일 서비스에 업로드하여 attachmentPublicId 획득
 */
export async function uploadAttachment(file: File, refType: string, refPublicId: string): Promise<AttachmentUploadResponseDto> {
  const formData = new FormData()

  // 1. 요청 메타데이터 (JSON Blob)
  const requestDto = {
    refType,
    refPublicId
  }
  formData.append(
    'request',
    new Blob([JSON.stringify(requestDto)], { type: 'application/json' })
  )

  // 2. 실제 파일 (files 파트)
  formData.append('files', file)

  const response = await apiClient.post<AttachmentUploadResponseDto>('/api/files/attachments', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * 첨부파일 상세 정보 조회 (파일 URL 등 획득)
 */
export async function getAttachment(publicId: string): Promise<AttachmentUploadResponseDto> {
  const response = await apiClient.get<AttachmentUploadResponseDto>(`/api/files/attachments/${publicId}`)
  return response.data
}

// 구버전 호환용 (필요시 제거 가능)
export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<any>('/api/files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}
