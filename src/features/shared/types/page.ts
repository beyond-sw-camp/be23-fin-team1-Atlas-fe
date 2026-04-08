export interface ActionButton {
  label: string
  tone?: 'primary' | 'secondary'
}

export interface MetricCard {
  label: string
  value: string
  meta: string
}

export interface TablePanel {
  kind: 'table'
  eyebrow: string
  title: string
  chip: string
  columns: string[]
  rows: string[][]
}

export interface FeedPanel {
  kind: 'feed'
  eyebrow: string
  title: string
  chip: string
  items: Array<{ label: string; text: string }>
}

export interface GridPanel {
  kind: 'grid'
  eyebrow: string
  title: string
  chip: string
  items: Array<{ label: string; value: string; meta: string }>
}

export interface MapPanel {
  kind: 'map'
  eyebrow: string
  title: string
  chip: string
  nodes: Array<{
    label: string
    value: string
    meta: string
    x: string
    y: string
    tone?: 'neutral' | 'accent' | 'warning' | 'danger'
  }>
  routes: Array<{
    from: string
    to: string
    label: string
  }>
}

export interface HeatmapPanel {
  kind: 'heatmap'
  eyebrow: string
  title: string
  chip: string
  columns: string[]
  rows: Array<{
    label: string
    cells: Array<{
      value: string
      tone: 'low' | 'medium' | 'high' | 'critical'
    }>
  }>
}

export interface TimelinePanel {
  kind: 'timeline'
  eyebrow: string
  title: string
  chip: string
  items: Array<{ step: string; title: string; text: string; meta: string }>
}

export type PagePanel = TablePanel | FeedPanel | GridPanel | MapPanel | HeatmapPanel | TimelinePanel

export interface StructuredPageDefinition {
  eyebrow: string
  title: string
  subtitle: string
  actions: ActionButton[]
  metrics?: MetricCard[]
  panels: PagePanel[]
}
