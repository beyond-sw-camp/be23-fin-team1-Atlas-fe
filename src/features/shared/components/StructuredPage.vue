<script setup lang="ts">
import { computed, onBeforeUnmount, watchEffect } from 'vue'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import FeedPanel from './FeedPanel.vue'
import GridPanel from './GridPanel.vue'
import HeatmapPanel from './HeatmapPanel.vue'
import MapPanel from './MapPanel.vue'
import TablePanel from './TablePanel.vue'
import TimelinePanel from './TimelinePanel.vue'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { PagePanel, StructuredPageDefinition } from '../types/page'

const props = defineProps<{
  page: StructuredPageDefinition
  onAction?: (label: string) => void
  hiddenPanelKinds?: PagePanel['kind'][]
}>()

const visiblePanels = computed(() => props.page.panels.filter((item) => !props.hiddenPanelKinds?.includes(item.kind)))
const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

function handleAction(label: string) {
  props.onAction?.(label)
}

watchEffect(() => {
  header.setActions(
    props.page.actions.map((action) => ({
      key: action.label,
      label: resolveDefaultCopy(action.label, preferences.language),
      tone: action.tone,
      onClick: () => handleAction(action.label),
    })),
  )
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen structured-page">
    <section v-if="page.metrics?.length" class="page-metrics">
      <article v-for="metric in page.metrics" :key="metric.label" class="page-metric">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="page-panels">
      <div v-if="$slots['panels-prefix']" class="page-panels__prefix">
        <slot name="panels-prefix" />
      </div>

      <article v-for="panel in visiblePanels" :key="`${panel.kind}-${panel.title}`" class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">{{ resolveDefaultCopy(panel.eyebrow, preferences.language) }}</div>
            <h3>{{ resolveDefaultCopy(panel.title, preferences.language) }}</h3>
          </div>
          <span class="page-panel__chip">{{ resolveDefaultCopy(panel.chip, preferences.language) }}</span>
        </div>

        <GridPanel v-if="panel.kind === 'grid'" :panel="panel" />
        <TablePanel v-else-if="panel.kind === 'table'" :panel="panel" />
        <FeedPanel v-else-if="panel.kind === 'feed'" :panel="panel" />
        <MapPanel v-else-if="panel.kind === 'map'" :panel="panel" />
        <HeatmapPanel v-else-if="panel.kind === 'heatmap'" :panel="panel" />
        <TimelinePanel v-else :panel="panel" />
      </article>
    </section>
  </section>
</template>
