<script setup lang="ts">
import BaseModal from './BaseModal.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    confirmTone?: 'primary' | 'danger'
    loading?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    description: undefined,
    confirmLabel: '확인',
    cancelLabel: '취소',
    confirmTone: 'primary',
    loading: false,
    size: 'sm',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  cancel: []
  confirm: []
  close: []
}>()

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleCancel() {
  emit('cancel')
  close()
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    :description="description"
    :size="size"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <slot />

    <template #footer>
      <button class="page-button page-button--secondary" type="button" :disabled="loading" @click="handleCancel">
        {{ cancelLabel }}
      </button>
      <button
        :class="['page-button', confirmTone === 'danger' ? 'page-button--danger' : 'page-button--primary']"
        type="button"
        :disabled="loading"
        @click="handleConfirm"
      >
        {{ loading ? '처리 중...' : confirmLabel }}
      </button>
    </template>
  </BaseModal>
</template>
