<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl'
import type { AppLanguage } from '../../../types'
import { getLocalizedMapText, type MonitoringMapNode } from '../services/mapData'
import { fetchProgressiveLogisticsStyle } from '../services/mapStyle'

const props = defineProps<{
  nodes: MonitoringMapNode[]
  language: AppLanguage
}>()

const mapElement = ref<HTMLElement | null>(null)
let map: MapLibreMap | null = null
const markers: MapLibreMarker[] = []
const loadError = ref('')
let activeMarkerElement: HTMLElement | null = null
const hoverIndex = ref<number | null>(null)
const selectedIndex = ref<number | null>(null)
const popupPosition = ref({ left: 0, top: 0 })

function nodeTitle(node: MonitoringMapNode) {
  return getLocalizedMapText(node.displayName, props.language)
}

function nodeSummary(node: MonitoringMapNode) {
  return getLocalizedMapText(node.summary, props.language)
}

const visiblePopupIndex = computed(() => selectedIndex.value ?? hoverIndex.value)
const visiblePopupNode = computed(() => (visiblePopupIndex.value == null ? null : props.nodes[visiblePopupIndex.value] ?? null))

function setActiveMarker(element: HTMLElement | null) {
  if (activeMarkerElement && activeMarkerElement !== element) {
    activeMarkerElement.classList.remove('is-active')
  }

  activeMarkerElement = element

  if (activeMarkerElement) {
    activeMarkerElement.classList.add('is-active')
  }
}

function syncPopupPosition(index: number | null = visiblePopupIndex.value) {
  if (index == null || !map) return

  const node = props.nodes[index]
  if (!node) return

  const point = map.project([node.latLng[1], node.latLng[0]])
  popupPosition.value = {
    left: point.x + 18,
    top: point.y - 16,
  }
}

function closePopup() {
  selectedIndex.value = null
  hoverIndex.value = null
  setActiveMarker(null)
}

function applyMapLanguage() {
  if (!map?.isStyleLoaded()) return

  const primaryField = props.language === 'ko' ? 'name:ko' : 'name:en'
  const fallbackField = props.language === 'ko' ? 'name:en' : 'name'
  const textField = ['coalesce', ['get', primaryField], ['get', 'name'], ['get', fallbackField]]

  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== 'symbol') continue

    const layout = map.getLayoutProperty(layer.id, 'text-field')
    if (layout == null) continue

    map.setLayoutProperty(layer.id, 'text-field', textField)
  }
}

onMounted(async () => {
  if (!mapElement.value) return

  try {
    const maplibregl = await import('maplibre-gl')
    const style = await fetchProgressiveLogisticsStyle()

    map = new maplibregl.Map({
      container: mapElement.value,
      style,
      center: [20, 25],
      zoom: 1.15,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })

    const mapInstance = map

    mapInstance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapInstance.on('load', applyMapLanguage)
    mapInstance.on('styledata', applyMapLanguage)
    mapInstance.on('move', () => syncPopupPosition())
    mapInstance.on('zoom', () => syncPopupPosition())

    props.nodes.forEach((node, index) => {
      const marker = document.createElement('div')
      marker.className = 'supplier-map__marker'
      marker.addEventListener('mouseenter', () => {
        if (selectedIndex.value != null) return
        hoverIndex.value = index
        setActiveMarker(marker)
        syncPopupPosition(index)
      })
      marker.addEventListener('mouseleave', () => {
        if (selectedIndex.value != null) return
        hoverIndex.value = null
        setActiveMarker(null)
      })
      marker.addEventListener('click', () => {
        selectedIndex.value = index
        hoverIndex.value = null
        setActiveMarker(marker)
        syncPopupPosition(index)
      })

      const mapMarker = new maplibregl.Marker({ element: marker, anchor: 'bottom-left' })
        .setLngLat([node.latLng[1], node.latLng[0]])
        .addTo(mapInstance)

      markers.push(mapMarker)
    })
  } catch (error) {
    console.error('Failed to initialize progressive MapLibre', error)
    loadError.value = '인터랙티브 지도 V2 로드에 실패했습니다.'
  }
})

watch(
  () => props.language,
  () => {
    applyMapLanguage()
    syncPopupPosition()
  },
)

onBeforeUnmount(() => {
  markers.forEach((marker) => marker.remove())
  map?.remove()
  map = null
  activeMarkerElement = null
})
</script>

<template>
  <div class="supplier-map supplier-map--raster supplier-map--progressive">
    <div ref="mapElement" class="supplier-map__canvas supplier-map__canvas--raster" />
    <div
      v-if="visiblePopupNode"
      class="supplier-map__overlay-card"
      :class="{ 'is-locked': selectedIndex != null }"
      :style="{ left: `${popupPosition.left}px`, top: `${popupPosition.top}px` }"
    >
      <button v-if="selectedIndex != null" class="supplier-map__overlay-close" type="button" @click="closePopup">×</button>
      <strong>{{ nodeTitle(visiblePopupNode) }}</strong>
      <span>{{ visiblePopupNode.value }}</span>
      <p>{{ nodeSummary(visiblePopupNode) }}</p>
    </div>
    <div v-if="loadError" class="supplier-map__fallback">{{ loadError }}</div>
  </div>
</template>
