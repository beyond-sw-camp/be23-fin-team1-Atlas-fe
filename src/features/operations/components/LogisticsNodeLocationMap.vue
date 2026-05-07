<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl'
import { fetchProgressiveLogisticsStyle } from '../../monitoring/services/mapStyle'

const props = defineProps<{
  latitude?: number | null
  longitude?: number | null
  nodeName: string
  nodeCode: string
  address?: string | null
}>()

const mapElement = ref<HTMLElement | null>(null)
const loadError = ref('')

let map: MapLibreMap | null = null
let marker: MapLibreMarker | null = null
let maplibre: typeof import('maplibre-gl') | null = null

function isValidCoordinate(latitude?: number | null, longitude?: number | null) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
}

function currentLngLat(): [number, number] | null {
  if (!isValidCoordinate(props.latitude, props.longitude)) return null
  return [Number(props.longitude), Number(props.latitude)]
}

function clearMarker() {
  marker?.remove()
  marker = null
}

function renderMarker() {
  if (!map || !maplibre) return

  clearMarker()

  const point = currentLngLat()
  if (!point) {
    map.jumpTo({ center: [127.8, 36.4], zoom: 6.1 })
    return
  }

  const markerElement = document.createElement('div')
  markerElement.className = 'logistics-node-location-map__marker'
  const markerLabel = document.createElement('strong')
  markerLabel.textContent = props.nodeName || props.nodeCode
  markerElement.append(markerLabel)

  marker = new maplibre.Marker({ element: markerElement, anchor: 'bottom' })
    .setLngLat(point)
    .addTo(map)

  map.easeTo({ center: point, zoom: 14, duration: 0 })
}

function renderMapData() {
  if (!map?.isStyleLoaded()) return
  renderMarker()
}

onMounted(async () => {
  if (!mapElement.value) return

  try {
    maplibre = await import('maplibre-gl')
    const style = await fetchProgressiveLogisticsStyle()

    map = new maplibre.Map({
      container: mapElement.value,
      style,
      center: [127.8, 36.4],
      zoom: 6.1,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    })

    map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', renderMapData)
    map.on('styledata', renderMapData)
  } catch (error) {
    console.error('Failed to initialize logistics node location map:', error)
    loadError.value = '지도를 불러오지 못했습니다.'
  }
})

watch(
  () => [props.latitude, props.longitude, props.nodeName, props.nodeCode],
  () => renderMapData(),
)

onBeforeUnmount(() => {
  clearMarker()
  map?.remove()
  map = null
  maplibre = null
})
</script>

<template>
  <div class="logistics-node-location-map">
    <div ref="mapElement" class="logistics-node-location-map__canvas" />
    <div class="logistics-node-location-map__info">
      <strong>{{ nodeName }}</strong>
      <span>{{ address || nodeCode }}</span>
    </div>
    <div v-if="!isValidCoordinate(latitude, longitude)" class="logistics-node-location-map__fallback">
      좌표 정보가 없습니다.
    </div>
    <div v-else-if="loadError" class="logistics-node-location-map__fallback">
      {{ loadError }}
    </div>
  </div>
</template>

<style scoped>
.logistics-node-location-map {
  position: relative;
  min-height: 220px;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  border-radius: 0;
  background: rgb(var(--surface-container-low-rgb, 245 245 245) / 0.92);
}

.logistics-node-location-map__canvas {
  position: absolute;
  inset: 0;
}

.logistics-node-location-map__info {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 2;
  display: grid;
  max-width: min(420px, calc(100% - 28px));
  gap: 4px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  padding: 9px 11px;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.94);
  color: var(--on-surface, #2d3435);
  box-shadow: none;
}

.logistics-node-location-map__info strong {
  font-size: 0.82rem;
  font-weight: 900;
}

.logistics-node-location-map__info span {
  overflow: hidden;
  color: var(--on-surface-variant, #474747);
  font-size: 0.74rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logistics-node-location-map__fallback {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: grid;
  place-items: center;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.92);
  color: var(--on-surface-variant, #667085);
  font-size: 0.82rem;
  font-weight: 900;
}

:global(.logistics-node-location-map__marker) {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  border: 1px solid rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.92);
  border-left: 4px solid #047857;
  border-radius: 0;
  padding: 8px 10px;
  background: #1f2933;
  color: #fff;
  font-family: Pretendard, "Segoe UI", sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 8px 18px rgb(15 23 42 / 0.16);
}

:global(.logistics-node-location-map__marker strong) {
  max-width: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logistics-node-location-map :global(.maplibregl-ctrl-group),
.logistics-node-location-map :global(.maplibregl-ctrl-group button) {
  border-radius: 0;
}
</style>
