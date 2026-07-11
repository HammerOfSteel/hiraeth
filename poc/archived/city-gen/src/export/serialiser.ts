// SPDX-License-Identifier: GPL-3.0
// Serialise a Model to CityJSON interchange format

import { type Model } from '../model/model'
import { type CityJSON, type JsonPt, type JsonWall } from './cityJsonTypes'
import { type CurtainWall } from '../model/curtainWall'

function toPt(v: { x: number; y: number }): JsonPt { return [v.x, v.y] }

function wallToJson(w: CurtainWall): JsonWall {
  return {
    shape:  w.shape.map(toPt),
    towers: w.towers.map(toPt),
    gates:  w.gates.map(toPt),
  }
}

export function modelToJson(model: Model): CityJSON {
  // Collect all buildings across all patches
  const buildings = model.patches.flatMap(p =>
    (p.ward?.geometry ?? []).map(poly => ({
      vertices: poly.map(toPt),
      type:     p.ward?.name,
    })),
  )

  // Get citadel wall from castle ward if present
  let citadel: CityJSON['citadel'] = null
  if (model.citadel?.ward && 'wall' in model.citadel.ward) {
    citadel = wallToJson((model.citadel.ward as { wall: CurtainWall }).wall)
  }

  return {
    version:    '1.0.0',
    buildings,
    streets:    model.arteries.map(a => a.map(toPt)),
    wall:       model.wall    ? wallToJson(model.wall)   : null,
    citadel,
    wards:      model.patches.map(p => ({
      type:        p.ward?.name ?? 'unknown',
      shape:       p.shape.map(toPt),
      withinWalls: p.withinWalls,
    })),
    cityRadius:  model.cityRadius,
    seed:        model.params.seed,
    nPatches:    model.params.nPatches,
  }
}
