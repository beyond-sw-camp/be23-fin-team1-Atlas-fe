import {
  getAttachmentByRef,
  uploadAttachment,
  type AttachmentFileDto,
  type AttachmentUploadResponseDto,
} from './file'
import type { ItemResponseDto } from './item'

export type ItemMediaKind = 'image' | 'video' | 'file'

export interface ItemMediaFile extends AttachmentFileDto {
  kind: ItemMediaKind
}

const ITEM_MEDIA_REF_TYPE = 'ITEM'
export const ITEM_MEDIA_MAX_UPLOAD_COUNT = 5

export function isItemMediaFile(file: File) {
  return file.type.startsWith('image/') || file.type.startsWith('video/')
}

export function itemMediaPublicId(file: Pick<AttachmentFileDto, 'publicId' | 'filePublicId'> | null | undefined) {
  return file?.filePublicId || file?.publicId || ''
}

export function mediaKindOf(file: Pick<AttachmentFileDto, 'contentType' | 'mimeType' | 'originalFileName'>): ItemMediaKind {
  const contentType = file.contentType || file.mimeType || ''
  const fileName = file.originalFileName || ''

  if (contentType.startsWith('image/') || /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(fileName)) {
    return 'image'
  }

  if (contentType.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(fileName)) {
    return 'video'
  }

  return 'file'
}

export function normalizeItemMediaFiles(files: AttachmentFileDto[] | undefined | null): ItemMediaFile[] {
  return (files ?? [])
    .map((file) => {
      const normalized = {
        ...file,
        publicId: itemMediaPublicId(file),
        filePublicId: itemMediaPublicId(file),
        fileSize: file.fileSize ?? file.size ?? 0,
        contentType: file.contentType || file.mimeType || '',
      }

      return {
        ...normalized,
        kind: mediaKindOf(normalized),
      }
    })
    .filter((file) => file.kind === 'image' || file.kind === 'video')
}

export function itemMediaFilesFromItem(item: ItemResponseDto | null | undefined): ItemMediaFile[] {
  if (!item) return []

  const files = normalizeItemMediaFiles(
    item.mediaFiles ??
      item.itemMediaFiles ??
      item.files ??
      item.attachments ??
      [],
  )

  if (!item.primaryMediaFilePublicId) return files

  return [...files].sort((a, b) => {
    if (itemMediaPublicId(a) === item.primaryMediaFilePublicId) return -1
    if (itemMediaPublicId(b) === item.primaryMediaFilePublicId) return 1
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
}

export function resolveItemMediaUrl(file: AttachmentFileDto | null | undefined) {
  return file?.fileThumbPath || file?.fileUrl || file?.filePath || ''
}

export function resolveItemOriginalMediaUrl(file: AttachmentFileDto | null | undefined) {
  return file?.filePath || file?.fileUrl || file?.fileThumbPath || ''
}

export function resolveItemThumbnailUrl(item: ItemResponseDto | null | undefined, mediaFiles: ItemMediaFile[] = []) {
  return (
    item?.thumbnailUrl ||
    item?.itemThumbnailUrl ||
    item?.representativeImageUrl ||
    item?.representativeImageThumbPath ||
    item?.mediaThumbPath ||
    resolveItemMediaUrl(mediaFiles.find((file) => file.kind === 'image') ?? mediaFiles[0])
  )
}

export async function getItemMedia(itemPublicId: string): Promise<ItemMediaFile[]> {
  const attachment = await getItemMediaAttachment(itemPublicId)
  return attachment ? normalizeItemMediaFiles(attachment.files) : []
}

export async function getItemMediaAttachment(itemPublicId: string): Promise<AttachmentUploadResponseDto | null> {
  try {
    return await getAttachmentByRef(ITEM_MEDIA_REF_TYPE, itemPublicId)
  } catch {
    return null
  }
}

export async function uploadItemMedia(itemPublicId: string, files: File[]) {
  const mediaFiles = files.filter(isItemMediaFile)
  if (!mediaFiles.length) return null
  return uploadAttachment(mediaFiles, ITEM_MEDIA_REF_TYPE, itemPublicId)
}
