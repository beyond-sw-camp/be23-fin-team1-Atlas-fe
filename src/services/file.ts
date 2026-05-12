import { apiClient } from './http'

export interface AttachmentFileDto {
  publicId: string
  attachmentPublicId?: string
  filePublicId?: string
  originalFileName: string
  fileName?: string
  fileSize: number
  size?: number
  contentType: string
  mimeType?: string
  fileUrl?: string
  fileThumbPath?: string | null
  filePath?: string | null
  sortOrder?: number
  uploadedByUserPublicId?: string | null
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
  const filesArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles]

  // 1. 기존 첨부파일 그룹이 있는지 먼저 확인 (409 에러 방지)
  try {
    const existing = await getAttachmentByRef(refType, refPublicId)
    // 기존 그룹이 존재하면 덮어쓰기/추가(append)로 진행
    if (existing && existing.attachmentPublicId) {
      return await appendFiles(existing.attachmentPublicId, filesArray)
    }
  } catch (error: any) {
    // 404 Not Found는 정상 (아직 프로필/첨부파일 그룹이 없는 상태)
    if (error?.response?.status !== 404) {
      console.warn('Failed to check existing attachment:', error)
    }
  }

  // 2. 기존 그룹이 없다면 새로 생성 (POST)
  const formData = new FormData()
  const requestDto = {
    refType,
    refPublicId
  }
  formData.append(
    'request',
    new Blob([JSON.stringify(requestDto)], { type: 'application/json' })
  )

  for (const f of filesArray) {
    formData.append('files', f)
  }

  const response = await apiClient.post<AttachmentUploadResponseDto>('/api/files/attachments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
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

export type AttachmentFileUpdateAction = 'KEEP' | 'DELETE' | 'ADD'

export interface UpdateAttachmentFileRequestDto {
  filePublicId?: string
  uploadIndex?: number
  sortOrder?: number
  action: AttachmentFileUpdateAction
}

export interface UpdateAttachmentRequestDto {
  files: UpdateAttachmentFileRequestDto[]
}

export async function updateAttachment(
  attachmentPublicId: string,
  data: UpdateAttachmentRequestDto,
  fileOrFiles: File[] = [],
): Promise<AttachmentUploadResponseDto> {
  const formData = new FormData()
  formData.append(
    'request',
    new Blob([JSON.stringify(data)], { type: 'application/json' }),
  )

  for (const file of fileOrFiles) {
    formData.append('files', file)
  }

  const response = await apiClient.patch<AttachmentUploadResponseDto>(
    `/api/files/attachments/${attachmentPublicId}`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  )
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
  // S3/CloudFront Pre-signed URL인 경우 (X-Amz-Signature 등 포함),
  // 임의의 쿼리 파라미터(예: ?_t=123)를 추가하면 서명이 깨져 AccessDenied 에러가 발생합니다.
  const isPresignedOrAbsolute = url.includes('X-Amz-Signature') || url.includes('Signature=') || url.startsWith('http')
  const fetchUrl = isPresignedOrAbsolute ? url : (url.includes('?') ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`)

  // 상대 경로이거나 API Base URL을 포함하는 경우 인증 헤더 추가
  const isApiRequest = fetchUrl.startsWith('/') || (apiClient.defaults.baseURL && fetchUrl.startsWith(apiClient.defaults.baseURL))
  
  if (isApiRequest) {
    const response = await apiClient.get(fetchUrl, { responseType: 'blob' })
    return response.data as Blob
  }

  const response = await fetch(fetchUrl)
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
