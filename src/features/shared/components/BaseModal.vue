<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    description?: string
    closeOnBackdrop?: boolean
    closeOnEscape?: boolean
    size?: 'sm' | 'md' | 'lg'
  }>(),
  {
    description: undefined,
    closeOnBackdrop: true,
    closeOnEscape: true,
    size: 'md',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const preferences = useAtlasPreferencesStore()

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function handleBackdropClick() {
  if (props.closeOnBackdrop) {
    close()
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue && props.closeOnEscape) {
    close()
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  },
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="base-modal" role="dialog" aria-modal="true" :aria-label="title">
      <div class="base-modal__backdrop" @click="handleBackdropClick" />

      <section :class="['base-modal__surface', `base-modal__surface--${size}`]">
        <header class="base-modal__header">
          <div class="base-modal__heading">
            <span class="base-modal__eyebrow">{{ resolveDefaultCopy('Modal', preferences.language) }}</span>
            <h2>{{ resolveDefaultCopy(title, preferences.language) }}</h2>
            <p v-if="description">{{ resolveDefaultCopy(description, preferences.language) }}</p>
          </div>

          <div class="base-modal__header-actions">
            <slot name="header-actions" />

            <button
              class="page-button page-button--secondary base-modal__close"
              type="button"
              :aria-label="resolveDefaultCopy('Close modal', preferences.language)"
              @click="close"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        <div class="base-modal__body">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="base-modal__footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Teleport>
</template>
