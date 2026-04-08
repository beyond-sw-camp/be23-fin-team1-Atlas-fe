<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, watchEffect, ref } from 'vue'
import { resolveDefaultCopy } from '../../../config/defaultCopy'
import SupplierVectorMap from '../components/SupplierVectorMap.vue'
import { supplierNetworkNodes, supplierRegistryRows, type MonitoringMapTab } from '../services/mapData'
import { useAtlasHeaderStore } from '../../../stores/header'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const SupplierRasterMap = defineAsyncComponent(() => import('../components/SupplierRasterMap.vue'))
const header = useAtlasHeaderStore()
const preferences = useAtlasPreferencesStore()

const activeTab = ref<MonitoringMapTab>('vector')
const search = ref('')

const filteredRegistryRows = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  if (!keyword) return supplierRegistryRows
  return supplierRegistryRows.filter((row) => row.join(' ').toLowerCase().includes(keyword))
})

watchEffect(() => {
  header.setActions([
    {
      key: 'supplier-network-vector',
      label: resolveDefaultCopy('Blueprint Map', preferences.language),
      tone: activeTab.value === 'vector' ? 'primary' : 'secondary',
      onClick: () => {
        activeTab.value = 'vector'
      },
    },
    {
      key: 'supplier-network-raster',
      label: resolveDefaultCopy('Interactive Map', preferences.language),
      tone: activeTab.value === 'raster' ? 'primary' : 'secondary',
      onClick: () => {
        activeTab.value = 'raster'
      },
    },
  ])
})

onBeforeUnmount(() => {
  header.clearActions()
})
</script>

<template>
  <section class="app-screen supplier-network-page">
    <section class="supplier-network-shell">
      <article class="supplier-network-map-card">
        <div class="supplier-network-map-card__density">
          <span>{{ resolveDefaultCopy('NETWORK DENSITY', preferences.language) }}</span>
          <strong>1,204.8</strong>
          <em>nodes/sqk</em>
        </div>

        <SupplierVectorMap v-if="activeTab === 'vector'" :nodes="supplierNetworkNodes" :language="preferences.language" />
        <SupplierRasterMap v-else :nodes="supplierNetworkNodes" :language="preferences.language" />
      </article>

      <aside class="supplier-network-side">
        <article class="supplier-network-side__panel supplier-network-side__panel--risk">
          <div class="supplier-network-side__label">{{ resolveDefaultCopy('RISK INDEX (AGGREGATE)', preferences.language) }}</div>
          <div class="supplier-network-side__risk-head">
            <strong>42.8</strong>
            <span class="material-symbols-outlined">warning</span>
          </div>
          <p>{{ resolveDefaultCopy('CRITICAL VARIANCE DETECTED', preferences.language) }}</p>

          <div class="supplier-network-side__meter">
            <div>
              <span>{{ resolveDefaultCopy('GEOPOLITICAL STABILITY', preferences.language) }}</span>
              <strong>72%</strong>
            </div>
            <div class="supplier-network-side__bar"><span style="width: 72%" /></div>
          </div>

          <div class="supplier-network-side__meter">
            <div>
              <span>{{ resolveDefaultCopy('LOGISTICS LATENCY', preferences.language) }}</span>
              <strong>14%</strong>
            </div>
            <div class="supplier-network-side__bar"><span style="width: 14%" /></div>
          </div>
        </article>

        <article class="supplier-network-side__panel">
          <div class="supplier-network-side__label">{{ resolveDefaultCopy('ANOMALIES DETECTED', preferences.language) }}</div>
          <div class="supplier-network-side__alert-list">
            <div class="supplier-network-side__alert"><span class="material-symbols-outlined">error</span> {{ resolveDefaultCopy('SHANGHAI PORT CONGESTION [+12H]', preferences.language) }}</div>
            <div class="supplier-network-side__alert"><span class="material-symbols-outlined">error</span> {{ resolveDefaultCopy('SUEZ CANAL CLEARANCE LATENCY', preferences.language) }}</div>
          </div>
        </article>
      </aside>
    </section>

    <section class="supplier-network-registry">
      <div class="supplier-network-registry__head">
        <h3>{{ resolveDefaultCopy('ACTIVE SUPPLIER REGISTRY', preferences.language) }}</h3>
        <label class="supplier-network-registry__search">
          <input v-model="search" type="text" :placeholder="resolveDefaultCopy('SEARCH NODES...', preferences.language)" />
          <span class="material-symbols-outlined">search</span>
        </label>
      </div>

      <div class="page-table">
        <div class="page-table__row page-table__row--head">
          <span>{{ resolveDefaultCopy('Partner ID', preferences.language) }}</span>
          <span>{{ resolveDefaultCopy('Entity', preferences.language) }}</span>
          <span>{{ resolveDefaultCopy('Region', preferences.language) }}</span>
          <span>{{ resolveDefaultCopy('Status', preferences.language) }}</span>
          <span>{{ resolveDefaultCopy('Risk', preferences.language) }}</span>
        </div>
        <div v-for="(row, rowIndex) in filteredRegistryRows" :key="`registry-${rowIndex}`" class="page-table__row">
          <span v-for="(cell, cellIndex) in row" :key="`registry-${rowIndex}-${cellIndex}`">{{ resolveDefaultCopy(cell, preferences.language) }}</span>
        </div>
      </div>
    </section>
  </section>
</template>
