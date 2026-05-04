<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl'
import { fetchProgressiveLogisticsStyle } from '../../monitoring/services/mapStyle'
import type { ShipmentMapResponseDto, ShipmentStatus } from '../../../services/shipment'
import type { AppLanguage } from '../../../types'

const props = defineProps<{
  shipments: ShipmentMapResponseDto[]
  selectedPublicId?: string | null
  language: AppLanguage
}>()

const emit = defineEmits<{
  select: [shipment: ShipmentMapResponseDto]
}>()

const mapElement = ref<HTMLElement | null>(null)
const loadError = ref('')

let map: MapLibreMap | null = null
let maplibre: typeof import('maplibre-gl') | null = null
const markers = new Map<string, MapLibreMarker>()

const routeSourceId = 'shipment-route-source'
const routeLayerId = 'shipment-route-line'

function statusColor(status: ShipmentStatus) {
  if (status === 'READY') return '#b7791f'
  if (status === 'IN_TRANSIT') return '#047857'
  if (status === 'DELAYED') return '#dc2626'
  return '#334155'
}

function shortShipmentNumber(value: string) {
  const normalized = value.replace(/^SHIP-/, '')
  const parts = normalized.split('-')

  if (parts.length >= 2) {
    return parts.slice(-2).join('-')
  }

  return normalized.slice(-12)
}

function isValidCoordinate(latitude?: number | null, longitude?: number | null) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
}

function currentLngLat(shipment: ShipmentMapResponseDto): [number, number] | null {
  const latitude = shipment.currentLatitude ?? shipment.originLatitude
  const longitude = shipment.currentLongitude ?? shipment.originLongitude

  if (!isValidCoordinate(latitude, longitude)) return null

  return [Number(longitude), Number(latitude)]
}

function originLngLat(shipment: ShipmentMapResponseDto): [number, number] | null {
  if (!isValidCoordinate(shipment.originLatitude, shipment.originLongitude)) return null

  return [Number(shipment.originLongitude), Number(shipment.originLatitude)]
}

function destinationLngLat(shipment: ShipmentMapResponseDto): [number, number] | null {
  if (!isValidCoordinate(shipment.destinationLatitude, shipment.destinationLongitude)) return null

  return [Number(shipment.destinationLongitude), Number(shipment.destinationLatitude)]
}

function clearMarkers() {
  markers.forEach((marker) => marker.remove())
  markers.clear()
}

function renderMarkers() {
  if (!map || !maplibre) return

  const mapInstance = map
  const maplibreInstance = maplibre

  clearMarkers()

  props.shipments.forEach((shipment) => {
    const point = currentLngLat(shipment)
    if (!point) return

    const markerElement = document.createElement('button')
    markerElement.type = 'button'
    markerElement.className = 'shipment-korea-map__marker'
    markerElement.classList.toggle('is-selected', shipment.publicId === props.selectedPublicId)
    markerElement.style.setProperty('--marker-color', statusColor(shipment.status))
    markerElement.textContent = shortShipmentNumber(shipment.shipmentNumber)
    markerElement.title = shipment.shipmentNumber
    markerElement.addEventListener('click', () => emit('select', shipment))

    const marker = new maplibreInstance.Marker({ element: markerElement, anchor: 'center' })
      .setLngLat(point)
      .addTo(mapInstance)

    markers.set(shipment.publicId, marker)
  })
}

function syncSelectedMarker() {
  markers.forEach((marker, publicId) => {
    marker.getElement().classList.toggle('is-selected', publicId === props.selectedPublicId)
  })
}

function buildRouteData(): any {
  return {
    type: 'FeatureCollection',
    features: props.shipments
      .map((shipment) => {
        const origin = originLngLat(shipment)
        const current = currentLngLat(shipment)
        const destination = destinationLngLat(shipment)

        if (!origin || !current || !destination) return null

        return {
          type: 'Feature',
          properties: {
            publicId: shipment.publicId,
            color: statusColor(shipment.status),
          },
          geometry: {
            type: 'LineString',
            coordinates: [origin, current, destination],
          },
        }
      })
      .filter(Boolean),
  }
}

function renderRoutes() {
  if (!map) return

  const routeData = buildRouteData()
  const source = map.getSource(routeSourceId) as { setData?: (data: unknown) => void } | undefined

  if (source?.setData) {
    source.setData(routeData)
    return
  }

  map.addSource(routeSourceId, {
    type: 'geojson',
    data: routeData,
  })

  map.addLayer({
    id: routeLayerId,
    type: 'line',
    source: routeSourceId,
    paint: {
      'line-color': ['get', 'color'],
      'line-width': 2.5,
      'line-opacity': 0.55,
      'line-dasharray': [1.5, 1.2],
    },
  })
}

function fitKoreaOrShipments() {
  if (!map || !maplibre) return

  const points = props.shipments.flatMap((shipment) => {
    return [originLngLat(shipment), currentLngLat(shipment), destinationLngLat(shipment)].filter(
      (point): point is [number, number] => Boolean(point),
    )
  })

  if (points.length === 0) {
    map.jumpTo({ center: [127.8, 36.4], zoom: 6.1 })
    return
  }

  const bounds = new maplibre.LngLatBounds(points[0], points[0])
  points.forEach((point) => bounds.extend(point))

  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: 8,
    duration: 0,
  })
}

function renderMapData() {
  if (!map?.isStyleLoaded()) return

  renderRoutes()
  renderMarkers()
  fitKoreaOrShipments()
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
    console.error('Failed to initialize shipment Korea map:', error)
    loadError.value = props.language === 'ko' ? '지도를 불러오지 못했습니다.' : 'Failed to load map.'
  }
})

watch(
  () => props.shipments,
  () => renderMapData(),
  { deep: true },
)

watch(
  () => props.selectedPublicId,
  () => syncSelectedMarker(),
)

onBeforeUnmount(() => {
  clearMarkers()
  map?.remove()
  map = null
  maplibre = null
})
</script>

<template>
  <div class="shipment-korea-map">
    <div ref="mapElement" class="shipment-korea-map__canvas" />
    <div class="shipment-korea-map__legend">
      <span><i class="is-ready" /> 상품 준비</span>
      <span><i class="is-transit" /> 배송 중</span>
      <span><i class="is-delayed" /> 지연</span>
    </div>
    <div v-if="loadError" class="shipment-korea-map__fallback">
      {{ loadError }}
    </div>
  </div>
</template>

<style scoped>
.shipment-korea-map {
  position: relative;
  min-height: 560px;
  overflow: hidden;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.24);
  border-radius: 0;
  background: rgb(var(--surface-container-low-rgb, 245 245 245) / 0.9);
  box-shadow: none;
}

.shipment-korea-map__canvas {
  position: absolute;
  inset: 0;
}

.shipment-korea-map__legend {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border: 1px solid rgb(var(--outline-variant-rgb, 172 179 180) / 0.28);
  border-radius: 0;
  padding: 8px 12px;
  background: rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.92);
  color: var(--on-surface-variant, #474747);
  font-size: 0.75rem;
  font-weight: 800;
  box-shadow: none;
}

.shipment-korea-map__legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.shipment-korea-map__legend i {
  width: 8px;
  height: 8px;
  border-radius: 0;
}

.shipment-korea-map__legend .is-ready {
  background: #b7791f;
}

.shipment-korea-map__legend .is-transit {
  background: #047857;
}

.shipment-korea-map__legend .is-delayed {
  background: #dc2626;
}

.shipment-korea-map__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: #fff;
  color: #98a2b3;
  font-weight: 800;
}

:global(.shipment-korea-map__marker) {
  border: 1px solid rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.92);
  border-radius: 0;
  padding: 6px 9px;
  background: var(--marker-color, #334155);
  color: #fff;
  font-family: Pretendard, "Segoe UI", sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: none;
  transition: background 50ms ease;
}

:global(.shipment-korea-map__marker:hover),
:global(.shipment-korea-map__marker.is-selected) {
  outline: 2px solid var(--on-surface, #121212);
  outline-offset: 2px;
}
</style>
