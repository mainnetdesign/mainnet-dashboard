// Chart builder — shared types.
// A chart config is what the user builds in the overlay and we persist to
// localStorage. Data itself is fetched from /api/store/insta2figma/chart.

export type ChartType = 'bar' | 'line' | 'pie'

// Tile footprint on the fixed 4-column grid (colSpan x rowSpan).
export type TileSize = '1x1' | '2x1' | '2x2' | '1x2'

export const TILE_SPAN: Record<TileSize, { col: number; row: number }> = {
  '1x1': { col: 1, row: 1 },
  '2x1': { col: 2, row: 1 },
  '2x2': { col: 2, row: 2 },
  '1x2': { col: 1, row: 2 },
}

export type ChartSeries = {
  measure: string // catalog measure id
  color: string // manual hex color
}

export type ChartConfig = {
  id: string
  title: string
  type: ChartType
  size: TileSize
  dimension: string // catalog dimension id (e.g. 'time', 'platform')
  series: ChartSeries[] // 1..N measures, all same unit
}
