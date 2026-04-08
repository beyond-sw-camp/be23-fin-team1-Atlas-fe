<script setup lang="ts">
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { TimelinePanel } from '../types/page'

defineProps<{
  panel: TimelinePanel
}>()

const preferences = useAtlasPreferencesStore()
</script>

<template>
  <div class="page-timeline">
    <div v-for="item in panel.items" :key="item.step" class="page-timeline__item">
      <span class="page-timeline__stage">{{ resolveDefaultCopy(item.step, preferences.language) }}</span>
      <div class="page-timeline__body">
        <strong>{{ resolveDefaultCopy(item.title, preferences.language) }}</strong>
        <p>{{ resolveDefaultCopy(item.text, preferences.language) }}</p>
      </div>
      <em>{{ resolveDefaultCopy(item.meta, preferences.language) }}</em>
    </div>
  </div>
</template>
