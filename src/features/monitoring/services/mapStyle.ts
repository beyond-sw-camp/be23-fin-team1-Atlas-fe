import type { StyleSpecification } from 'maplibre-gl'

type StyleLayer = {
  id: string
  type: string
  source?: string
  'source-layer'?: string
  minzoom?: number
  maxzoom?: number
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'

function isRoadLayer(layer: StyleLayer) {
  return layer['source-layer'] === 'transportation' || layer['source-layer'] === 'transportation_name'
}

function isPlaceLayer(layer: StyleLayer) {
  return layer['source-layer'] === 'place'
}

function isBoundaryLayer(layer: StyleLayer) {
  return layer['source-layer'] === 'boundary'
}

function isWaterLayer(layer: StyleLayer) {
  return layer['source-layer'] === 'water' || layer['source-layer'] === 'waterway' || layer.id === 'water'
}

function isAerowayLayer(layer: StyleLayer) {
  return layer['source-layer'] === 'aeroway' || layer['source-layer'] === 'aerodrome_label'
}

function shouldKeepLayer(layer: StyleLayer) {
  if (layer.id === 'background' || layer.id === 'natural_earth') return true
  if (isWaterLayer(layer) || isBoundaryLayer(layer) || isRoadLayer(layer) || isPlaceLayer(layer) || isAerowayLayer(layer)) return true

  return false
}

function withZoomWindow(layer: StyleLayer, minzoom?: number, maxzoom?: number): StyleLayer {
  return {
    ...layer,
    minzoom: Math.max(layer.minzoom ?? 0, minzoom ?? 0),
    maxzoom: Math.min(layer.maxzoom ?? 24, maxzoom ?? 24),
  }
}

function tuneRoadLayer(layer: StyleLayer) {
  const id = layer.id

  if (/(path|pedestrian|track|service)/.test(id)) return withZoomWindow(layer, 8)
  if (/(street|minor)/.test(id)) return withZoomWindow(layer, 7)
  if (/(secondary|tertiary)/.test(id)) return withZoomWindow(layer, 5)
  if (/(primary|trunk|motorway|link|shield)/.test(id)) return withZoomWindow(layer, 2)

  if (layer['source-layer'] === 'transportation_name') return withZoomWindow(layer, 6)

  return withZoomWindow(layer, 4)
}

function tunePlaceLayer(layer: StyleLayer) {
  const id = layer.id

  if (/country/.test(id)) return withZoomWindow(layer, 1, 9)
  if (/city/.test(id)) return withZoomWindow(layer, 2)
  if (/state|other/.test(id)) return withZoomWindow(layer, 4)
  if (/town/.test(id)) return withZoomWindow(layer, 5)
  if (/village/.test(id)) return withZoomWindow(layer, 7)

  return withZoomWindow(layer, 5)
}

function tuneAerowayLayer(layer: StyleLayer) {
  if (layer['source-layer'] === 'aerodrome_label') return withZoomWindow(layer, 5)
  return withZoomWindow(layer, 6)
}

function tuneLayer(layer: StyleLayer) {
  if (isRoadLayer(layer)) return tuneRoadLayer(layer)
  if (isPlaceLayer(layer)) return tunePlaceLayer(layer)
  if (isAerowayLayer(layer)) return tuneAerowayLayer(layer)
  if (isBoundaryLayer(layer)) return withZoomWindow(layer, 1)
  if (isWaterLayer(layer)) return withZoomWindow(layer, 0)

  return layer
}

export async function fetchProgressiveLogisticsStyle() {
  const response = await fetch(MAP_STYLE_URL)
  if (!response.ok) {
    throw new Error(`Failed to fetch logistics map style: ${response.status}`)
  }

  const baseStyle = (await response.json()) as StyleSpecification
  const layers = baseStyle.layers.filter(shouldKeepLayer).map(tuneLayer)

  return {
    ...baseStyle,
    layers,
  } as StyleSpecification
}
