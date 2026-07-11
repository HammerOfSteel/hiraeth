// SPDX-License-Identifier: GPL-3.0
// Deserialise CityJSON into a flat RenderData structure consumed by renderers

import { Pt } from '../geom/pt'
import { type CityJSON, type JsonPt } from './cityJsonTypes'
import { type Polygon } from '../geom/polygon'
import { type Street } from '../model/topology'

/** Flat renderable data extracted from CityJSON. */
export interface RenderData {
  cityRadius: number
  seed:       number

  /** All building footprints grouped by ward type. */
  buildingsByType: Map<string, Polygon[]>

  /** All building footprints (flat). */
  buildings: Polygon[]

  /** All street/road polylines. */
  streets: Street[]

  /** Ward patch polygons with type label. */
  wards: Array<{ type: string; shape: Polygon; withinWalls: boolean }>

  wall:    { shape: Polygon; towers: Pt[]; gates: Pt[] } | null
  citadel: { shape: Polygon; towers: Pt[]; gates: Pt[] } | null
}

function fromPt([x, y]: JsonPt): Pt { return new Pt(x, y) }

export function jsonToRenderData(json: CityJSON): RenderData {
  const buildings: Polygon[]                  = []
  const buildingsByType: Map<string, Polygon[]> = new Map()

  for (const b of json.buildings) {
    const poly = b.vertices.map(fromPt)
    buildings.push(poly)
    const key = b.type ?? 'unknown'
    if (!buildingsByType.has(key)) buildingsByType.set(key, [])
    buildingsByType.get(key)!.push(poly)
  }

  const decodeWall = (w: typeof json.wall) => w ? {
    shape:  w.shape.map(fromPt),
    towers: w.towers.map(fromPt),
    gates:  w.gates.map(fromPt),
  } : null

  return {
    cityRadius:    json.cityRadius,
    seed:          json.seed,
    buildings,
    buildingsByType,
    streets:       json.streets.map(s => s.map(fromPt)),
    wards:         json.wards.map(w => ({
      type:        w.type,
      shape:       w.shape.map(fromPt),
      withinWalls: w.withinWalls,
    })),
    wall:    decodeWall(json.wall),
    citadel: decodeWall(json.citadel),
  }
}
