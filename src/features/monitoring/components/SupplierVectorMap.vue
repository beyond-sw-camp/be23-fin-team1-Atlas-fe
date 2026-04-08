<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import jsVectorMap from 'jsvectormap'
import 'jsvectormap/dist/jsvectormap.css'
import type { AppLanguage } from '../../../types'
import { getLocalizedMapText, type MonitoringMapNode } from '../services/mapData'

const props = defineProps<{
  nodes: MonitoringMapNode[]
  language: AppLanguage
}>()

type MarkerLabel = {
  set: (value: Record<string, string>) => void
  setStyle: (value: Record<string, string | number>) => void
}

type JsVectorMarker = {
  config: MonitoringMapNode
  element: {
    label?: MarkerLabel
  }
}

type JsVectorMapInstance = {
  destroy?: () => void
  scale?: number
  _markers?: Record<string, JsVectorMarker>
  getMarkerPosition?: (config: MonitoringMapNode) => { x: number; y: number }
  clearSelectedMarkers?: () => void
}

const mapElement = ref<HTMLElement | null>(null)
let map: JsVectorMapInstance | null = null
const loadError = ref('')
const hoverIndex = ref<number | null>(null)
const selectedIndex = ref<number | null>(null)
const popupPosition = ref({ left: 0, top: 0 })

const squareMarkerImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Crect x='2' y='2' width='12' height='12' fill='%23111111' stroke='%23ffffff' stroke-width='2'/%3E%3C/svg%3E"
const glowMarkerImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Cdefs%3E%3Cfilter id='g' x='-80%25' y='-80%25' width='260%25' height='260%25'%3E%3CfeGaussianBlur stdDeviation='3.2' result='b'/%3E%3C/filter%3E%3C/defs%3E%3Crect x='8' y='8' width='12' height='12' fill='%23111111' fill-opacity='0.35' filter='url(%23g)'/%3E%3Crect x='8' y='8' width='12' height='12' fill='%23111111' stroke='%23ffffff' stroke-width='2'/%3E%3C/svg%3E"
const zoomLabelThreshold = 1.45

function labelFor(node: MonitoringMapNode) {
  return getLocalizedMapText(node.displayName, props.language)
}

function tooltipHtml(node: MonitoringMapNode) {
  return `
    <div class="atlas-map-tooltip">
      <strong>${labelFor(node)}</strong>
      <span>${node.value}</span>
      <p>${getLocalizedMapText(node.summary, props.language)}</p>
    </div>
  `
}

const visiblePopupIndex = computed(() => (selectedIndex.value ?? hoverIndex.value))
const visiblePopupNode = computed(() => (visiblePopupIndex.value == null ? null : props.nodes[visiblePopupIndex.value] ?? null))

function syncMarkerLabels(scale = map?.scale ?? 1) {
  if (!map?._markers) return

  const isZoomed = scale >= zoomLabelThreshold

  Object.values(map._markers).forEach(({ config, element }) => {
    if (!element.label) return

    element.label.set({
      text: isZoomed ? labelFor(config) : '',
    })
    element.label.setStyle({
      opacity: isZoomed ? 1 : 0,
    })
  })
}

function syncPopupPosition(index: number | null = visiblePopupIndex.value) {
  if (index == null || !map?.getMarkerPosition) return

  const node = props.nodes[index]
  if (!node) return

  const point = map.getMarkerPosition(node)
  popupPosition.value = {
    left: point.x + 18,
    top: point.y - 16,
  }
}

function closePopup() {
  selectedIndex.value = null
  hoverIndex.value = null
  map?.clearSelectedMarkers?.()
}

onMounted(async () => {
  if (!mapElement.value) return

  try {
    ;(globalThis as { jsVectorMap?: typeof jsVectorMap }).jsVectorMap = jsVectorMap
    await import('jsvectormap/dist/maps/world-merc.js')

    map = new jsVectorMap({
      selector: mapElement.value,
      map: 'world_merc',
      zoomButtons: true,
      zoomOnScroll: true,
      zoomOnScrollSpeed: 0.35,
      zoomMax: 80,
      zoomStep: 1.15,
      backgroundColor: 'transparent',
      regionStyle: {
        initial: {
          fill: '#f4f4f4',
          stroke: '#dedede',
          strokeWidth: 0.6,
        },
        hover: {
          fill: '#ececec',
        },
      },
      markersSelectable: true,
      markersSelectableOne: true,
      markers: props.nodes.map((node) => ({
        name: node.label,
        label: node.label,
        value: node.value,
        displayName: node.displayName,
        summary: node.summary,
        coords: node.latLng,
        style: {
          initial: {
            image: squareMarkerImage,
            width: 16,
            height: 16,
          },
          selected: {
            image: glowMarkerImage,
            width: 28,
            height: 28,
          },
          selectedHover: {
            image: glowMarkerImage,
            width: 28,
            height: 28,
          },
        },
      })),
      markerLabelStyle: {
        initial: {
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          fontWeight: 700,
          fill: '#121212',
        },
      },
      labels: {
        markers: {
          render(marker: MonitoringMapNode) {
            return labelFor(marker)
          },
        },
      },
      onLoaded(mapInstance: JsVectorMapInstance) {
        map = mapInstance
        syncMarkerLabels(mapInstance.scale)
      },
      onViewportChange(scale: number) {
        syncMarkerLabels(scale)
        syncPopupPosition()
      },
      onMarkerTooltipShow(event: Event, _tooltip: { text: (value: string, html?: boolean) => void }, index: string) {
        event.preventDefault()

        if (selectedIndex.value != null) return

        hoverIndex.value = Number(index)
        syncPopupPosition(Number(index))
      },
      onMarkerClick(_event: Event, index: string) {
        selectedIndex.value = Number(index)
        hoverIndex.value = null
        syncPopupPosition(Number(index))
      },
      onRegionTooltipShow(event: Event) {
        event.preventDefault()
      },
    })

    mapElement.value.addEventListener('mouseout', (event) => {
      const relatedTarget = event.relatedTarget
      if (!(relatedTarget instanceof Element) || !mapElement.value?.contains(relatedTarget)) {
        if (selectedIndex.value == null) {
          hoverIndex.value = null
        }
      }
    })
  } catch (error) {
    console.error('Failed to initialize jsVectorMap', error)
    loadError.value = '지도 로드에 실패했습니다.'
  }
})

watch(
  () => props.language,
  () => {
    syncMarkerLabels()
    syncPopupPosition()
  },
)

onBeforeUnmount(() => {
  map?.destroy?.()
  map = null
})
</script>

<template>
  <div class="supplier-map supplier-map--vector">
    <div ref="mapElement" class="supplier-map__canvas supplier-map__canvas--vector" />
    <div
      v-if="visiblePopupNode"
      class="supplier-map__overlay-card"
      :class="{ 'is-locked': selectedIndex != null }"
      :style="{ left: `${popupPosition.left}px`, top: `${popupPosition.top}px` }"
    >
      <button v-if="selectedIndex != null" class="supplier-map__overlay-close" type="button" @click="closePopup">×</button>
      <strong>{{ labelFor(visiblePopupNode) }}</strong>
      <span>{{ visiblePopupNode.value }}</span>
      <p>{{ getLocalizedMapText(visiblePopupNode.summary, language) }}</p>
    </div>
    <div v-if="loadError" class="supplier-map__fallback">{{ loadError }}</div>
  </div>
</template>
