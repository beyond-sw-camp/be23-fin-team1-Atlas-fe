<script setup lang="ts">
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { TablePanel } from '../types/page'

defineProps<{
  panel: TablePanel
}>()

const preferences = useAtlasPreferencesStore()
</script>

<template>
  <div class="page-table">
    <div class="page-table__row page-table__row--head">
      <span v-for="column in panel.columns" :key="column">{{ resolveDefaultCopy(column, preferences.language) }}</span>
    </div>
    <div v-for="(row, rowIndex) in panel.rows" :key="`${panel.title}-${rowIndex}`" class="page-table__row">
      <span v-for="(cell, cellIndex) in row" :key="`${panel.title}-${rowIndex}-${cellIndex}`">{{ resolveDefaultCopy(cell, preferences.language) }}</span>
    </div>
  </div>
</template>
