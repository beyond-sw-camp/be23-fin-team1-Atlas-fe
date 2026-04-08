<script setup lang="ts">
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { GridPanel } from '../types/page'

defineProps<{
  panel: GridPanel
}>()

const preferences = useAtlasPreferencesStore()
</script>

<template>
  <div class="page-grid">
    <div v-for="item in panel.items" :key="item.label" class="page-grid__cell">
      <span class="page-grid__label">{{ resolveDefaultCopy(item.label, preferences.language) }}</span>
      <strong class="page-grid__value">{{ resolveDefaultCopy(item.value, preferences.language) }}</strong>
      <span class="page-grid__meta">{{ resolveDefaultCopy(item.meta, preferences.language) }}</span>
    </div>
  </div>
</template>
