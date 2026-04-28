<script setup lang="ts">
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { MapPanel } from '../types/page'

defineProps<{
  panel: MapPanel
}>()

const preferences = useAtlasPreferencesStore()
</script>

<template>
  <div class="page-map">
    <div class="page-map__canvas">
      <div
        v-for="node in panel.nodes"
        :key="`${node.label}-${node.value}`"
        :class="['page-map__node', `page-map__node--${node.tone ?? 'neutral'}`]"
        :style="{ left: node.x, top: node.y }"
      >
        <span class="page-map__dot" />
        <div class="page-map__label">
          <strong>{{ resolveDefaultCopy(node.label, preferences.language) }}</strong>
          <span>{{ resolveDefaultCopy(node.value, preferences.language) }}</span>
        </div>
      </div>

      <div v-for="route in panel.routes" :key="`${route.from}-${route.to}-${route.label}`" class="page-map__route">
        {{ resolveDefaultCopy(route.label, preferences.language) }}
      </div>
    </div>

    <div class="page-map__legend">
      <div v-for="node in panel.nodes" :key="`${node.label}-${node.value}-legend`" class="page-map__legend-item">
        <span :class="['page-map__legend-dot', `page-map__legend-dot--${node.tone ?? 'neutral'}`]" />
        <div>
          <strong>{{ resolveDefaultCopy(node.label, preferences.language) }}</strong>
          <p>{{ resolveDefaultCopy(node.meta, preferences.language) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>
