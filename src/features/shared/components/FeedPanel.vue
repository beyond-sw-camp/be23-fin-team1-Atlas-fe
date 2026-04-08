<script setup lang="ts">
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import { useAtlasPreferencesStore } from '../../../stores/preferences'
import type { FeedPanel } from '../types/page'

defineProps<{
  panel: FeedPanel
}>()

const preferences = useAtlasPreferencesStore()
</script>

<template>
  <div class="page-feed">
    <div v-for="item in panel.items" :key="item.label" class="page-feed__item">
      <span class="page-feed__label">{{ resolveDefaultCopy(item.label, preferences.language) }}</span>
      <strong class="page-feed__text">{{ resolveDefaultCopy(item.text, preferences.language) }}</strong>
    </div>
  </div>
</template>
