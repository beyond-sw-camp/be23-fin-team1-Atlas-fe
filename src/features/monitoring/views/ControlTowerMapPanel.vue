<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import SupplierVectorMap from '../components/SupplierVectorMap.vue'
import { controlTowerAlerts, controlTowerNodes, type MonitoringMapTab } from '../services/mapData'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const SupplierRasterMap = defineAsyncComponent(() => import('../components/SupplierRasterMap.vue'))
const preferences = useAtlasPreferencesStore()
const activeTab = ref<MonitoringMapTab>('vector')
</script>

<template>
  <section class="supplier-network-shell control-tower-map-shell">
    <article class="supplier-network-map-card">
      <div class="supplier-network-map-card__density">
        <span>{{ resolveDefaultCopy('ACTIVE EXPOSURE', preferences.language) }}</span>
        <strong>12.4k</strong>
        <em>{{ resolveDefaultCopy('mt in risk lanes', preferences.language) }}</em>
      </div>

      <div class="control-tower-map-shell__tabs">
        <button
          type="button"
          :class="['page-button', activeTab === 'vector' ? 'page-button--primary' : 'page-button--secondary']"
          @click="activeTab = 'vector'"
        >
          {{ resolveDefaultCopy('Blueprint Map', preferences.language) }}
        </button>
        <button
          type="button"
          :class="['page-button', activeTab === 'raster' ? 'page-button--primary' : 'page-button--secondary']"
          @click="activeTab = 'raster'"
        >
          {{ resolveDefaultCopy('Interactive Map', preferences.language) }}
        </button>
      </div>

      <SupplierVectorMap v-if="activeTab === 'vector'" :nodes="controlTowerNodes" :language="preferences.language" />
      <SupplierRasterMap v-else :nodes="controlTowerNodes" :language="preferences.language" />
    </article>

    <aside class="supplier-network-side">
      <article class="supplier-network-side__panel supplier-network-side__panel--risk">
        <div class="supplier-network-side__label">{{ resolveDefaultCopy('RECOVERY ETA', preferences.language) }}</div>
        <div class="supplier-network-side__risk-head">
          <strong>18h</strong>
          <span class="material-symbols-outlined">schedule</span>
        </div>
        <p>{{ resolveDefaultCopy('BEST-CASE MEDIAN', preferences.language) }}</p>

        <div class="supplier-network-side__meter">
          <div>
              <span>{{ resolveDefaultCopy('WAREHOUSE CAPACITY', preferences.language) }}</span>
            <strong>96%</strong>
          </div>
          <div class="supplier-network-side__bar"><span style="width: 96%" /></div>
        </div>

        <div class="supplier-network-side__meter">
          <div>
              <span>{{ resolveDefaultCopy('REROUTE READINESS', preferences.language) }}</span>
            <strong>61%</strong>
          </div>
          <div class="supplier-network-side__bar"><span style="width: 61%" /></div>
        </div>
      </article>

      <article class="supplier-network-side__panel">
        <div class="supplier-network-side__label">{{ resolveDefaultCopy('CRITICAL EVENTS', preferences.language) }}</div>
        <div class="supplier-network-side__alert-list">
          <div v-for="alert in controlTowerAlerts" :key="alert" class="supplier-network-side__alert">
            <span class="material-symbols-outlined">warning</span> {{ resolveDefaultCopy(alert, preferences.language) }}
          </div>
        </div>
      </article>
    </aside>
  </section>
</template>
