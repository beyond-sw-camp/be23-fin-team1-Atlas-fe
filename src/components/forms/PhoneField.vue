<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string
  language?: 'ko' | 'en'
}>(), {
  modelValue: '',
  language: 'ko',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:valid': [value: boolean]
}>()

const nationalNumber = ref('')
const touched = ref(false)

const isPhoneValid = computed(() => {
  const digits = digitsOnly(nationalNumber.value)
  return isValidKoreanPhoneDigits(digits)
})

const errorMessage = computed(() =>
  props.language === 'ko'
    ? '한국 전화번호 형식으로 입력해 주세요.'
    : 'Please enter a valid Korean phone number.',
)

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function normalizeKoreanPhoneDigits(value: string) {
  const digits = digitsOnly(value)

  if (digits.startsWith('82')) {
    return `0${digits.slice(2)}`.slice(0, 11)
  }

  return digits.slice(0, 11)
}

function formatKoreanPhoneNumber(value: string) {
  const digits = normalizeKoreanPhoneDigits(value)

  if (!digits) return ''

  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }

  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length === 10 ? 6 : 7)}-${digits.slice(digits.length === 10 ? 6 : 7)}`
}

function isValidKoreanPhoneDigits(digits: string) {
  if (digits.startsWith('02')) {
    return digits.length === 9 || digits.length === 10
  }

  if (!digits.startsWith('0')) return false
  return digits.length === 10 || digits.length === 11
}

function syncFromModel(value: string) {
  nationalNumber.value = formatKoreanPhoneNumber(value)
  emit('update:valid', isPhoneValid.value)
}

function handleNumberInput(event: Event) {
  const input = event.target as HTMLInputElement
  nationalNumber.value = formatKoreanPhoneNumber(input.value)
  touched.value = true
}

watch(
  () => props.modelValue,
  (value) => {
    syncFromModel(value)
  },
  { immediate: true },
)

watch(nationalNumber, (value) => {
  const nextValue = formatKoreanPhoneNumber(value)

  if (nextValue !== props.modelValue) {
    emit('update:modelValue', nextValue)
  }

  emit('update:valid', isPhoneValid.value)
})
</script>

<template>
  <div class="phone-field">
    <div class="phone-field__input-wrap">
      <input
        :value="nationalNumber"
        class="phone-field__number"
        type="tel"
        inputmode="tel"
        autocomplete="tel-national"
        :placeholder="language === 'ko' ? '010-0000-0000' : '010-0000-0000'"
        @input="handleNumberInput"
        @blur="touched = true"
      />
      <p v-if="touched && nationalNumber && !isPhoneValid" class="phone-field__error">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
