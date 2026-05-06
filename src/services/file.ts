import { apiClient } from './http'

export interface AttachmentFileDto {
  publicId: string
  originalFileName: string
  fileSize: number
  contentType: string
  fileUrl?: string
  fileThumbPath?: string | null
  filePath?: string | null
}

export interface AttachmentUploadResponseDto {
  attachmentPublicId: string
  refType: string
  refPublicId: string
  files: AttachmentFileDto[]
}

/**
 * 전용 첨부파일 업로드 (Multipart/form-data)
 * Step 1: 파일 서비스에 업로드하여 attachmentPublicId 획득
 */
export async function uploadAttachment(fileOrFiles: File | File[], refType: string, refPublicId: string): Promise<AttachmentUploadResponseDto> {
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

  // 2. 실제 파일 (files 파트) 다중 파일 지원
  const filesArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles]
  for (const f of filesArray) {
    formData.append('files', f)
  }

  try {
    const response = await apiClient.post<AttachmentUploadResponseDto>('/api/files/attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  } catch (error: any) {
    if (error?.response?.status === 409) {
      const existing = await getAttachmentByRef(refType, refPublicId)
      return appendFiles(existing.attachmentPublicId, filesArray)
    }
    throw error
  }
}

export async function getAttachmentByRef(refType: string, refPublicId: string): Promise<AttachmentUploadResponseDto> {
  const response = await apiClient.get<AttachmentUploadResponseDto>('/api/files/attachments/by-ref', {
    params: { refType, refPublicId }
  })
  return response.data
}

export async function appendFiles(attachmentPublicId: string, fileOrFiles: File | File[]): Promise<AttachmentUploadResponseDto> {
  const formData = new FormData()
  const filesArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles]
  for (const f of filesArray) {
    formData.append('files', f)
  }
  const response = await apiClient.post<AttachmentUploadResponseDto>(`/api/files/attachments/${attachmentPublicId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function uploadUserProfileImage(
  file: File,
  userPublicId: string,
): Promise<AttachmentUploadResponseDto> {
  return uploadAttachment(file, 'USER_ACCOUNT', userPublicId)
}

/**
 * 첨부파일 상세 정보 조회 (파일 URL 등 획득)
 */
export async function getAttachment(publicId: string): Promise<AttachmentUploadResponseDto> {
  const response = await apiClient.get<AttachmentUploadResponseDto>(`/api/files/attachments/${publicId}`)
  return response.data
}

export async function getAttachmentOriginalImagePath(publicId: string): Promise<string | null> {
  const response = await getAttachment(publicId)
  return response.files[0]?.filePath ?? null
}

/**
 * CDN/S3 URL에서 파일을 Blob으로 다운로드합니다.
 * cross-origin이더라도 fetch → blob 변환 → same-origin blob URL을 만들면
 * download 속성으로 원본 파일명을 강제할 수 있습니다.
 */
export async function downloadFileFromUrl(url: string): Promise<Blob> {
  // 브라우저나 CDN(CloudFront 등)에 이전 CORS 에러 상태가 캐싱되어 있을 수 있으므로
  // 타임스탬프를 붙여서 항상 최신 상태의 응답(CORS 적용된 상태)을 받아오도록 강제합니다.
  const cacheBustedUrl = url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`
  
  const response = await fetch(cacheBustedUrl)
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`)
  }
  return response.blob()
}

/**
 * 개별 파일 상세 정보 조회
 * GET /api/files/attachments/{attachmentPublicId}/files/{filePublicId}
 */
export async function getFileDetail(attachmentPublicId: string, filePublicId: string) {
  const response = await apiClient.get(
    `/api/files/attachments/${attachmentPublicId}/files/${filePublicId}`
  )
  return response.data as AttachmentFileDto & { filePath: string }
}

/**
 * 브라우저에서 Blob을 지정된 파일명으로 강제 다운로드
 */
export function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 숨겨진 a태그로 URL 다운로드 (새 탭 열지 않음, 화면 번쩍임 없음)
 * cross-origin이면 파일명이 원본과 다를 수 있지만 화면이 번쩍이지 않음
 */
export function triggerLinkDownload(url: string, fileName: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
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
