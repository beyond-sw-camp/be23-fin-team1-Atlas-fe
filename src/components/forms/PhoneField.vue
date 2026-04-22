<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

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

type PhoneCountryOption = {
  code: CountryCode
  name: string
  dialCode: string
  flag: string
}

const DEFAULT_COUNTRY: CountryCode = 'KR'
const rootElement = ref<HTMLElement | null>(null)
const isCountryListOpen = ref(false)
const openUpward = ref(false)
const selectedCountry = ref<CountryCode>(DEFAULT_COUNTRY)
const nationalNumber = ref('')
const touched = ref(false)
const displayNames =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

function countryCodeToFlag(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const countryOptions = computed<PhoneCountryOption[]>(() => {
  const language = props.language === 'ko' ? 'ko-KR' : 'en-US'
  const names =
    typeof Intl !== 'undefined' && typeof Intl.DisplayNames !== 'undefined'
      ? new Intl.DisplayNames([language], { type: 'region' })
      : displayNames

  return getCountries()
    .map((code) => ({
      code,
      name: names?.of(code) ?? displayNames?.of(code) ?? code,
      dialCode: `+${getCountryCallingCode(code)}`,
      flag: countryCodeToFlag(code),
    }))
    .sort((left, right) => {
      if (left.code === DEFAULT_COUNTRY) return -1
      if (right.code === DEFAULT_COUNTRY) return 1
      return left.name.localeCompare(right.name, language)
    })
})

const selectedOption = computed(
  () => countryOptions.value.find((option) => option.code === selectedCountry.value) ?? countryOptions.value[0],
)

const isPhoneValid = computed(() => {
  const digits = digitsOnly(nationalNumber.value)
  if (!digits) return false

  const parsed = parsePhoneNumberFromString(digits, selectedCountry.value)
  return parsed?.isValid() ?? false
})

const errorMessage = computed(() =>
  props.language === 'ko'
    ? '국가 형식에 맞는 전화번호를 입력해 주세요.'
    : 'Please enter a valid phone number for the selected country.',
)

function digitsOnly(value: string) {
  return value.replace(/\D/g, '')
}

function formatNationalNumber(value: string, country: CountryCode) {
  const digits = digitsOnly(value)
  if (!digits) return ''
  return new AsYouType(country).input(digits)
}

function buildPhoneValue(country: CountryCode, value: string) {
  const digits = digitsOnly(value)
  if (!digits) return ''

  const parsed = parsePhoneNumberFromString(digits, country)

  if (parsed) {
    return parsed.number
  }

  return `+${getCountryCallingCode(country)}${digits}`
}

function guessCountryFromPhone(value: string) {
  const normalized = value.trim()
  if (!normalized.startsWith('+')) return null

  const digits = digitsOnly(normalized)
  const matched = countryOptions.value
    .filter((option) => {
      const dialDigits = option.dialCode.slice(1)
      return digits === dialDigits || digits.startsWith(dialDigits)
    })
    .sort((left, right) => right.dialCode.length - left.dialCode.length)[0]

  return matched?.code ?? null
}

function syncFromModel(value: string) {
  if (!value) {
    nationalNumber.value = ''
    emit('update:valid', false)
    return
  }

  const parsed = parsePhoneNumberFromString(value)

  if (parsed?.country) {
    selectedCountry.value = parsed.country
    nationalNumber.value = parsed.formatNational()
    emit('update:valid', parsed.isValid())
    return
  }

  const guessedCountry = guessCountryFromPhone(value)

  if (guessedCountry) {
    selectedCountry.value = guessedCountry
    nationalNumber.value = formatNationalNumber(
      digitsOnly(value).slice(getCountryCallingCode(guessedCountry).length),
      guessedCountry,
    )
    emit('update:valid', isPhoneValid.value)
    return
  }

  nationalNumber.value = formatNationalNumber(value, selectedCountry.value)
  emit('update:valid', isPhoneValid.value)
}

function handleNumberInput(event: Event) {
  const input = event.target as HTMLInputElement
  nationalNumber.value = formatNationalNumber(input.value, selectedCountry.value)
  touched.value = true
}

function handleOutsidePointerDown(event: PointerEvent) {
  if (!rootElement.value?.contains(event.target as Node)) {
    isCountryListOpen.value = false
  }
}

function updateMenuDirection() {
  const rect = rootElement.value?.getBoundingClientRect()
  if (!rect) return

  const estimatedMenuHeight = Math.min(countryOptions.value.length * 45, 280)
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top

  openUpward.value = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow
}

function toggleCountryList() {
  const nextOpenState = !isCountryListOpen.value

  if (nextOpenState) {
    updateMenuDirection()
  }

  isCountryListOpen.value = nextOpenState
}

function selectCountry(country: CountryCode) {
  selectedCountry.value = country
  isCountryListOpen.value = false
  openUpward.value = false
  touched.value = true
}

watch(
  () => props.modelValue,
  (value) => {
    syncFromModel(value)
  },
  { immediate: true },
)

watch(selectedCountry, () => {
  const parsed = parsePhoneNumberFromString(digitsOnly(nationalNumber.value), selectedCountry.value)
  nationalNumber.value = parsed?.formatNational() ?? formatNationalNumber(nationalNumber.value, selectedCountry.value)
})

watch([selectedCountry, nationalNumber], ([country, value]) => {
  const nextValue = buildPhoneValue(country, value)

  if (nextValue !== props.modelValue) {
    emit('update:modelValue', nextValue)
  }

  emit('update:valid', isPhoneValid.value)
})

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsidePointerDown)
  window.addEventListener('resize', updateMenuDirection)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsidePointerDown)
  window.removeEventListener('resize', updateMenuDirection)
})
</script>

<template>
  <div ref="rootElement" class="phone-field">
    <div class="phone-field__country-wrap" :class="{ 'is-open-upward': openUpward && isCountryListOpen }">
      <button
        class="phone-field__selector"
        type="button"
        :aria-expanded="isCountryListOpen"
        :aria-label="language === 'ko' ? '국가번호 선택' : 'Select country code'"
        @click="toggleCountryList"
      >
        <span class="phone-field__selector-value">
          <span class="phone-field__flag">{{ selectedOption?.flag }}</span>
          <span>{{ selectedOption?.dialCode }}</span>
        </span>
        <span class="phone-field__chevron" aria-hidden="true"></span>
      </button>

      <div v-if="isCountryListOpen" class="phone-field__menu">
        <button
          v-for="option in countryOptions"
          :key="option.code"
          class="phone-field__option"
          type="button"
          @pointerdown.prevent.stop="selectCountry(option.code)"
        >
          <span class="phone-field__option-main">
            <span class="phone-field__flag">{{ option.flag }}</span>
            <span>{{ option.dialCode }}</span>
          </span>
          <span class="phone-field__option-name">{{ option.name }}</span>
        </button>
      </div>
    </div>

    <div class="phone-field__input-wrap">
      <input
        :value="nationalNumber"
        class="phone-field__number"
        type="tel"
        inputmode="tel"
        autocomplete="tel-national"
        :placeholder="language === 'ko' ? '전화번호를 입력하세요' : 'Enter phone number'"
        @input="handleNumberInput"
        @blur="touched = true"
      />
      <p v-if="touched && nationalNumber && !isPhoneValid" class="phone-field__error">
        {{ errorMessage }}
      </p>
    </div>
  </div>
</template>
