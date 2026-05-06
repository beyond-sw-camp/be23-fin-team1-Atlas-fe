<script setup lang="ts">
/**
 * AppToastContainer — 전역 토스트 알림 렌더러
 *
 * Sovereign Architecture 디자인 준수:
 * - 0px border-radius
 * - 4px Status Ribbon (좌측 컬러 바)
 * - Inter 기본 폰트 상속
 * - Tonal layering (box-shadow 금지)
 * - 한국어 dismiss 버튼
 */
import { useAtlasToastStore } from '../../stores/toast'

const toast = useAtlasToastStore()
</script>

<template>
  <Teleport to="body">
    <div class="atlas-toast-container" aria-live="polite">
      <TransitionGroup name="atlas-toast">
        <div
          v-for="item in toast.toasts"
          :key="item.id"
          :class="['atlas-toast', `atlas-toast--${item.tone}`]"
          role="alert"
        >
          <!-- Status Ribbon (4px 좌측 컬러 바) -->
          <div class="atlas-toast__ribbon" />

          <div class="atlas-toast__body">
            <div class="atlas-toast__icon">
              <span class="material-symbols-outlined">
                {{
                  item.tone === 'critical' ? 'error'
                  : item.tone === 'warning' ? 'warning'
                  : item.tone === 'nominal' ? 'check_circle'
                  : 'info'
                }}
              </span>
            </div>
            <div class="atlas-toast__content">
              <strong class="atlas-toast__title">{{ item.title }}</strong>
              <span class="atlas-toast__message">{{ item.message }}</span>
            </div>
            <button
              class="atlas-toast__dismiss"
              type="button"
              aria-label="닫기"
              @click="toast.dismiss(item.id)"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
