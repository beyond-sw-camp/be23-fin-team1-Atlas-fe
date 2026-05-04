<script setup lang="ts">
/**
 * ChatMessage — 메시지 버블 단건 렌더링
 * 레퍼런스: 둥근 말풍선 + 보라-파랑 그라데이션(발신) + 좌측 아바타(수신)
 */
import { ref, onMounted } from 'vue'
import type { ChatMessageDto } from '../../types/chat'
import ChatReferenceCard from './ChatReferenceCard.vue'
import ChatAvatar from './ChatAvatar.vue'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { getAttachment, downloadFileFromUrl, triggerBlobDownload, triggerLinkDownload } from '../../services/file'
import { apiClient } from '../../services/http'

const props = defineProps<{
  message: ChatMessageDto
  currentUserPublicId: string
  senderName?: string
  senderAvatarUrl?: string
}>()

const emit = defineEmits<{
  delete: [messagePublicId: string]
  reply: [message: ChatMessageDto, senderDisplayName: string]
}>()

const preferences = useAtlasPreferencesStore()
const isMine = props.message.senderUserPublicId === props.currentUserPublicId
const isSystem =
  props.message.messageType === 'SYSTEM' ||
  props.message.messageType === 'SYSTEM_JOIN' ||
  props.message.messageType === 'SYSTEM_LEAVE'

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString(preferences.language === 'ko' ? 'ko-KR' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function handleDelete() {
  emit('delete', props.message.publicId)
}

function handleReply() {
  emit('reply', props.message, props.senderName || (preferences.language === 'ko' ? '알 수 없음' : 'Unknown'))
}

// 뷰어 관련 상태 및 함수
const viewerOpen = ref(false)
const viewerCurrentIndex = ref(0)

function openViewer(index: number) {
  viewerCurrentIndex.value = index
  viewerOpen.value = true
}
function closeViewer() {
  viewerOpen.value = false
}
function nextMedia() {
  if (viewerCurrentIndex.value < mediaItems.value.length - 1) {
    viewerCurrentIndex.value++
  }
}
function prevMedia() {
  if (viewerCurrentIndex.value > 0) {
    viewerCurrentIndex.value--
  }
}

async function handleDownloadFiles() {
  if (!props.message.attachmentPublicIds) return

  for (const attachmentId of props.message.attachmentPublicIds) {
    try {
      const attachment = await getAttachment(attachmentId)
      if (!attachment.files || attachment.files.length === 0) continue

      for (const fileInfo of attachment.files) {
        const cdnUrl = fileInfo.filePath || fileInfo.fileUrl
        if (!cdnUrl) continue

        try {
          // CDN URL → fetch → Blob → 원본 파일명으로 다운로드
          const blob = await downloadFileFromUrl(cdnUrl)
          triggerBlobDownload(blob, fileInfo.originalFileName || `file_${fileInfo.publicId}`)
        } catch {
          // CORS 실패 시 숨겨진 a태그로 조용히 다운로드 (새 탭 없음, 화면 번쩍임 없음)
          triggerLinkDownload(cdnUrl, fileInfo.originalFileName || `file_${fileInfo.publicId}`)
        }

        // 다중 다운로드 시 브라우저 부하 방지
        if (attachment.files.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }
    } catch (error) {
      console.error('Download failed', error)
      alert(preferences.language === 'ko' ? '파일 다운로드에 실패했습니다.' : 'Failed to download file.')
    }
  }
}

// 실제 파일 개수 (attachmentPublicIds는 그룹 수이므로 내부 files 배열의 합계를 구해야 함)
const totalFileCount = ref(0)

function replyLabel(name?: string | null) {
  const displayName = name || (preferences.language === 'ko' ? '알 수 없는 사용자' : 'Unknown user')
  return preferences.language === 'ko' ? `${displayName}에게 답장` : `Replying to ${displayName}`
}

interface MediaItem {
  url: string
  type: 'image' | 'video'
  name: string
}
const mediaItems = ref<MediaItem[]>([])

onMounted(async () => {
  if (props.message.attachmentPublicIds?.length) {
    let count = 0
    for (const id of props.message.attachmentPublicIds) {
      try {
        const attachment = await getAttachment(id)
        if (attachment.files) {
          count += attachment.files.length

          // 미디어(이미지/비디오) 렌더링
          if (props.message.messageType === 'IMAGE') {
            for (const file of attachment.files) {
              const ct = file.contentType || ''
              const fileName = file.originalFileName || ''
              const isVideo = ct.startsWith('video/') || !!fileName.match(/\.(mp4|webm|ogg|mov)$/i)
              const isImage = ct.startsWith('image/') || !!fileName.match(/\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i)

              let url = file.filePath || file.fileUrl || `/api/files/attachments/${id}/download`
              if (url.startsWith('/')) {
                url = (apiClient.defaults.baseURL || '') + url
              }

              if (url && (isImage || isVideo)) {
                mediaItems.value.push({ url, type: isVideo ? 'video' : 'image', name: fileName })
              }
            }
          }
        }
      } catch (e) {
        console.error('Failed to load attachment', e)
      }
    }
    totalFileCount.value = count
  }
})
</script>

<template>
  <!-- 시스템 메시지 -->
  <div v-if="isSystem" class="chat-msg chat-msg--system">
    <span class="chat-msg__system-text">{{ message.messageBody }}</span>
  </div>

  <!-- 삭제된 메시지 -->
  <div v-else-if="message.isDeleted" :class="['chat-msg', isMine ? 'chat-msg--mine' : 'chat-msg--other']">
    <div class="chat-msg__row">
      <!-- 상대방 아바타 -->
      <ChatAvatar
        v-if="!isMine"
        :image-url="senderAvatarUrl"
        :name="senderName"
        size="sm"
        class="chat-msg__avatar"
      />
      <div class="chat-msg__col">
        <div class="chat-msg__bubble chat-msg__bubble--deleted">
          <p class="chat-msg__body chat-msg__body--deleted">{{ message.messageBody }}</p>
        </div>
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </div>
    </div>
  </div>

  <!-- 일반 메시지 -->
  <div v-else :class="['chat-msg', isMine ? 'chat-msg--mine' : 'chat-msg--other']">
    <div class="chat-msg__row">
      <!-- 상대방 아바타 (좌측) -->
      <ChatAvatar
        v-if="!isMine"
        :image-url="senderAvatarUrl"
        :name="senderName"
        size="sm"
        class="chat-msg__avatar"
      />

      <div class="chat-msg__col">
        <!-- 발신자 이름 (상대방 메시지에만 표시) -->
        <span v-if="!isMine && senderName" class="chat-msg__sender-name">{{ senderName }}</span>

        <div class="chat-msg__bubble-row">
          <!--
            내 메시지 삭제 버튼 — hover 시만 보임
          -->
          <button
            v-if="isMine"
            class="chat-msg__delete"
            type="button"
            :title="preferences.language === 'ko' ? '메시지 삭제' : 'Delete message'"
            @click="handleDelete"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>

          <!-- 답장 버튼 (삭제 버튼과 같은 맥락, 모든 일반 메시지에 노출) -->
          <button
            v-if="!message.isDeleted"
            class="chat-msg__reply"
            type="button"
            :title="preferences.language === 'ko' ? '답장' : 'Reply'"
            @click="handleReply"
          >
            <span class="material-symbols-outlined">reply</span>
          </button>

          <!-- 내 메시지: 안읽음 수 (버블 왼쪽) -->
          <span v-if="isMine && message.unreadCount && message.unreadCount > 0" class="chat-msg__unread">
            {{ message.unreadCount }}
          </span>

          <!-- 버블 본체 -->
          <div :class="['chat-msg__bubble', { 'chat-msg__bubble--media': message.messageType === 'IMAGE' && !message.isDeleted }]">
            <!-- 답장 원본 메시지 미리보기 -->
            <div v-if="message.parentMessagePublicId" class="chat-msg__reply-preview">
              <span class="chat-msg__reply-icon material-symbols-outlined">reply</span>
              <div class="chat-msg__reply-content">
                <strong class="chat-msg__reply-sender">
                  {{ replyLabel(message.parentSenderDisplayName) }}
                </strong>
                <p class="chat-msg__reply-body">
                  {{ message.parentMessageBody || (preferences.language === 'ko' ? '내용을 불러올 수 없습니다.' : 'Could not load content.') }}
                </p>
              </div>
            </div>

            <!-- 미디어 (이미지/비디오) 카카오톡 스타일 그리드 -->
            <div v-if="mediaItems.length > 0" class="chat-msg__medias" :data-count="mediaItems.length">
              <div v-for="(media, i) in mediaItems" :key="i" class="chat-msg__media-item" @click="openViewer(i)">
                <img v-if="media.type === 'image'" :src="media.url" :alt="media.name" class="chat-msg__media-img" />
                <video v-else-if="media.type === 'video'" :src="media.url" class="chat-msg__media-video" preload="metadata"></video>
                <div v-if="media.type === 'video'" class="chat-msg__media-video-play">
                  <span class="material-symbols-outlined">play_circle</span>
                </div>
              </div>
            </div>

            <p v-if="message.messageBody && message.messageType !== 'IMAGE'" class="chat-msg__body">{{ message.messageBody }}</p>

            <ChatReferenceCard
              v-if="message.referenceType"
              :reference-type="message.referenceType"
              :reference-code="message.referenceCode"
              :reference-title="message.referenceTitle"
            />

            <button
              v-if="message.attachmentPublicIds?.length && message.messageType !== 'IMAGE'"
              class="chat-msg__attachments"
              type="button"
              @click="handleDownloadFiles"
            >
              <span class="material-symbols-outlined">download</span>
              <span>
                {{ preferences.language === 'ko'
                  ? `${totalFileCount || message.attachmentPublicIds.length}건 다운로드`
                  : `Download ${totalFileCount || message.attachmentPublicIds.length} file${(totalFileCount || message.attachmentPublicIds.length) === 1 ? '' : 's'}` }}
              </span>
            </button>

            <span v-if="message.editedAt" class="chat-msg__edited">
              {{ preferences.language === 'ko' ? '(수정됨)' : '(edited)' }}
            </span>
          </div>

          <!-- 상대 메시지: 안읽음 수 (버블 오른쪽) -->
          <span v-if="!isMine && message.unreadCount && message.unreadCount > 0" class="chat-msg__unread">
            {{ message.unreadCount }}
          </span>
        </div>

        <!-- 시간 표시 (버블 아래) -->
        <span class="chat-msg__time">{{ formatTime(message.sentAt) }}</span>
      </div>
    </div>
  </div>

  <!-- 이미지/동영상 전체화면 뷰어 -->
  <Teleport to="body">
    <div v-if="viewerOpen" class="chat-media-viewer" @click.self="closeViewer">
      <button class="chat-media-viewer__close" @click="closeViewer">
        <span class="material-symbols-outlined">close</span>
      </button>
      
      <button class="chat-media-viewer__nav chat-media-viewer__nav--prev" @click.stop="prevMedia" v-if="viewerCurrentIndex > 0">
        <span class="material-symbols-outlined">chevron_left</span>
      </button>

      <div class="chat-media-viewer__content">
        <img v-if="mediaItems[viewerCurrentIndex].type === 'image'" :src="mediaItems[viewerCurrentIndex].url" class="chat-media-viewer__img" />
        <video v-else-if="mediaItems[viewerCurrentIndex].type === 'video'" :src="mediaItems[viewerCurrentIndex].url" controls autoplay class="chat-media-viewer__video"></video>
        <div class="chat-media-viewer__info">
          {{ viewerCurrentIndex + 1 }} / {{ mediaItems.length }}
        </div>
      </div>

      <button class="chat-media-viewer__nav chat-media-viewer__nav--next" @click.stop="nextMedia" v-if="viewerCurrentIndex < mediaItems.length - 1">
        <span class="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  </Teleport>
</template>
