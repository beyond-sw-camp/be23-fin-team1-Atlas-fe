<script setup lang="ts">
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { HeatmapPanel } from '../types/page'

defineProps<{
  panel: HeatmapPanel
}>()

const preferences = useAtlasPreferencesStore()
</script>

<template>
  <div class="page-heatmap">
    <div class="page-heatmap__header">
      <span />
      <span v-for="column in panel.columns" :key="column">{{ resolveDefaultCopy(column, preferences.language) }}</span>
    </div>
    <div v-for="row in panel.rows" :key="row.label" class="page-heatmap__row">
      <strong class="page-heatmap__row-label">{{ resolveDefaultCopy(row.label, preferences.language) }}</strong>
      <span
        v-for="(cell, cellIndex) in row.cells"
        :key="`${row.label}-${cellIndex}`"
        :class="['page-heatmap__cell', `page-heatmap__cell--${cell.tone}`]"
      >
        {{ resolveDefaultCopy(cell.value, preferences.language) }}
      </span>
    </div>
  </div>
</template>
