<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl'
import { fetchProgressiveLogisticsStyle } from '../../monitoring/services/mapStyle'
import type { ShipmentMapResponseDto } from '../../../services/shipment'
import type { AppLanguage } from '../../../types'

const props = defineProps<{
  shipments: ShipmentMapResponseDto[]
  selectedPublicId?: string | null
  language: AppLanguage
}>()

const emit = defineEmits<{
  select: [shipment: ShipmentMapResponseDto]
}>()

type MarkerRole = 'origin' | 'current' | 'destination'

interface MarkerPoint {
  key: string
  shipment: ShipmentMapResponseDto
  role: MarkerRole
  lngLat: [number, number]
  offset: [number, number]
}

const mapElement = ref<HTMLElement | null>(null)
const loadError = ref('')

let map: MapLibreMap | null = null
let maplibre: typeof import('maplibre-gl') | null = null
const markers = new Map<string, MapLibreMarker>()

function roleLabel(role: MarkerRole) {
  const labels: Record<MarkerRole, { ko: string; en: string }> = {
    origin: { ko: '출', en: 'O' },
    current: { ko: '현', en: 'C' },
    destination: { ko: '도', en: 'D' },
  }

  return labels[role].ko
}

function roleTitle(role: MarkerRole) {
  const labels: Record<MarkerRole, { ko: string; en: string }> = {
    origin: { ko: '출발 창고', en: 'Origin' },
    current: { ko: '현재 위치', en: 'Current' },
    destination: { ko: '도착 창고', en: 'Destination' },
  }

  return labels[role].ko
}

function shortShipmentNumber(value: string) {
  return value.replace(/^SHIP-/, '')
}

function isDelayedShipment(shipment: ShipmentMapResponseDto) {
  if (shipment.delayed || shipment.status === 'DELAYED') return true
  if (shipment.status !== 'IN_TRANSIT' || !shipment.arrivalEta) return false

  const arrivalTime = new Date(shipment.arrivalEta).getTime()
  return Number.isFinite(arrivalTime) && arrivalTime < Date.now()
}

function isValidCoordinate(latitude?: number | null, longitude?: number | null) {
  return Number.isFinite(latitude) && Number.isFinite(longitude)
}

function sameLngLat(a: [number, number] | null, b: [number, number] | null) {
  if (!a || !b) return false
  return Math.abs(a[0] - b[0]) < 0.00001 && Math.abs(a[1] - b[1]) < 0.00001
}

function coordinateKey(point: [number, number]) {
  return `${point[0].toFixed(5)},${point[1].toFixed(5)}`
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

function buildMarkerPoints() {
  const rawPoints = props.shipments.flatMap((shipment) => {
    const origin = originLngLat(shipment)
    const current = currentLngLat(shipment)
    const destination = destinationLngLat(shipment)
    const points: Array<Omit<MarkerPoint, 'offset'>> = []

    if (origin) {
      points.push({
        key: `${shipment.publicId}-origin`,
        shipment,
        role: 'origin',
        lngLat: origin,
      })
    }

    if (current && !sameLngLat(current, origin) && !sameLngLat(current, destination)) {
      points.push({
        key: `${shipment.publicId}-current`,
        shipment,
        role: 'current',
        lngLat: current,
      })
    }

    if (destination && !sameLngLat(destination, origin)) {
      points.push({
        key: `${shipment.publicId}-destination`,
        shipment,
        role: 'destination',
        lngLat: destination,
      })
    }

    return points
  })

  const groups = rawPoints.reduce((acc, point) => {
    const key = coordinateKey(point.lngLat)
    const group = acc.get(key) ?? []
    group.push(point)
    acc.set(key, group)
    return acc
  }, new Map<string, Array<Omit<MarkerPoint, 'offset'>>>())

  return Array.from(groups.values()).flatMap((group) => {
    const columns = group.length <= 2 ? group.length : 2
    const rows = Math.ceil(group.length / columns)
    const horizontalGap = 42
    const verticalGap = 32

    return group.map((point, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      const x = (column - (columns - 1) / 2) * horizontalGap
      const y = (row - (rows - 1) / 2) * verticalGap

      return {
        ...point,
        offset: [x, y] as [number, number],
      }
    })
  })
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

  buildMarkerPoints().forEach((point) => {
    const isDelayed = isDelayedShipment(point.shipment)
    const markerElement = document.createElement('button')
    markerElement.type = 'button'
    markerElement.className = 'shipment-korea-map__marker'
    markerElement.classList.toggle('is-selected', point.shipment.publicId === props.selectedPublicId)
    markerElement.classList.add(`is-${point.role}`)
    markerElement.classList.toggle('is-delayed', isDelayed)
    markerElement.dataset.shipmentPublicId = point.shipment.publicId
    markerElement.title = `${roleTitle(point.role)} / ${point.shipment.shipmentNumber}${isDelayed ? ' / 지연' : ''}`
    markerElement.innerHTML = `
      <span>${roleLabel(point.role)}</span>
      <strong>${shortShipmentNumber(point.shipment.shipmentNumber)}</strong>
    `
    markerElement.addEventListener('click', () => emit('select', point.shipment))

    const marker = new maplibreInstance.Marker({
      element: markerElement,
      anchor: 'center',
      offset: point.offset,
    })
      .setLngLat(point.lngLat)
      .addTo(mapInstance)

    markers.set(point.key, marker)
  })
}

function syncSelectedMarker() {
  markers.forEach((marker) => {
    const shipmentPublicId = marker.getElement().dataset.shipmentPublicId
    marker.getElement().classList.toggle('is-selected', shipmentPublicId === props.selectedPublicId)
  })

  if (!props.selectedPublicId || !map) return

  const selected = props.shipments.find((shipment) => shipment.publicId === props.selectedPublicId)
  const point = selected ? currentLngLat(selected) ?? originLngLat(selected) ?? destinationLngLat(selected) : null

  if (point) {
    map.easeTo({ center: point, zoom: Math.max(map.getZoom(), 7), duration: 250 })
  }
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
    padding: 86,
    maxZoom: 8.4,
    duration: 0,
  })
}

function renderMapData() {
  if (!map?.isStyleLoaded()) return

  renderMarkers()
  fitKoreaOrShipments()
  syncSelectedMarker()
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
    loadError.value = '지도를 불러오지 못했습니다.'
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
      <span><i class="is-origin" /> {{ '출발' }}</span>
      <span><i class="is-current" /> {{ '현재' }}</span>
      <span><i class="is-destination" /> {{ '도착' }}</span>
      <span><i class="is-delayed" /> {{ '지연' }}</span>
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

.shipment-korea-map__legend .is-origin {
  background: #1d4ed8;
}

.shipment-korea-map__legend .is-current {
  background: #047857;
}

.shipment-korea-map__legend .is-destination {
  background: #7c3aed;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 142px;
  border: 1px solid rgb(var(--surface-container-lowest-rgb, 255 255 255) / 0.92);
  border-radius: 0;
  padding: 7px 10px 7px 6px;
  background: #1f2933;
  color: #fff;
  font-family: Pretendard, "Segoe UI", sans-serif;
  font-size: 0.7rem;
  font-weight: 900;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 8px 18px rgb(15 23 42 / 0.16);
  transition: background 50ms ease, transform 50ms ease;
}

:global(.shipment-korea-map__marker span) {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  min-height: 20px;
  background: rgb(255 255 255 / 0.18);
  color: #fff;
  font-size: 0.68rem;
}

:global(.shipment-korea-map__marker strong) {
  max-width: 104px;
  overflow: hidden;
  text-overflow: ellipsis;
}

:global(.shipment-korea-map__marker.is-origin) {
  border-left: 4px solid #1d4ed8;
}

:global(.shipment-korea-map__marker.is-current) {
  transform: scale(1.04);
}

:global(.shipment-korea-map__marker.is-destination) {
  border-left: 4px solid #7c3aed;
}

:global(.shipment-korea-map__marker.is-delayed) {
  border-left-color: #991b1b;
  background: #dc2626;
}

:global(.shipment-korea-map__marker:hover),
:global(.shipment-korea-map__marker.is-selected) {
  outline: 2px solid var(--on-surface, #121212);
  outline-offset: 2px;
}
</style>
