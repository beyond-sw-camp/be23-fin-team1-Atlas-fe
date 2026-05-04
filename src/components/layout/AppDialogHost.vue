<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BaseModal from '../../features/shared/components/BaseModal.vue'
import { useAtlasDialogStore } from '../../stores/dialog'
import { useAtlasPreferencesStore } from '../../stores/preferences'

const dialog = useAtlasDialogStore()
const preferences = useAtlasPreferencesStore()
const promptValue = ref('')

const current = computed(() => dialog.current)
const title = computed(() => {
  if (current.value?.title) return current.value.title
  return preferences.language === 'ko' ? '알림' : 'Notice'
})

const confirmLabel = computed(() => current.value?.confirmLabel ?? (preferences.language === 'ko' ? '확인' : 'OK'))
const cancelLabel = computed(() => current.value?.cancelLabel ?? (preferences.language === 'ko' ? '취소' : 'Cancel'))

watch(
  () => current.value?.id,
  () => {
    promptValue.value = current.value?.defaultValue ?? ''
  },
)

function close() {
  if (!current.value) return
  dialog.resolve(current.value.kind === 'alert' ? undefined : current.value.kind === 'prompt' ? null : false)
}

function confirm() {
  if (!current.value) return
  if (current.value.kind === 'alert') {
    dialog.resolve(undefined)
    return
  }
  if (current.value.kind === 'prompt') {
    dialog.resolve(promptValue.value)
    return
  }
  dialog.resolve(true)
}
</script>

<template>
  <BaseModal
    :model-value="dialog.isOpen"
    :title="title"
    :description="current?.message"
    size="sm"
    hide-eyebrow
    @update:model-value="(value) => { if (!value) close() }"
    @close="close"
  >
    <label v-if="current?.kind === 'prompt'" class="dialog-prompt">
      <span class="sr-only">{{ current.message }}</span>
      <input
        v-model="promptValue"
        class="dialog-prompt__input"
        type="text"
        :placeholder="current.placeholder"
        @keydown.enter.prevent="confirm"
      />
    </label>

    <template #footer>
      <button
        v-if="current?.kind !== 'alert'"
        class="page-button page-button--secondary"
        type="button"
        @click="close"
      >
        {{ cancelLabel }}
      </button>
      <button
        :class="['page-button', current?.tone === 'danger' ? 'page-button--danger' : 'page-button--primary']"
        type="button"
        @click="confirm"
      >
        {{ confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>
