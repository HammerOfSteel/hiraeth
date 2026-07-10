/**
 * SettlementLayout — generates different urban morphologies.
 *
 * Each layout function produces a { roadGraph, parcels } pair that the
 * WorldGenerator can render without modification.
 *
 * Types:
 *   'valley_town'       — current default; A* road + terraced grid
 *   'linear_village'    — single main road ribbon, no side streets, wider plots
 *   'hamlet'            — 6–14 scattered buildings, one short lane
 *   'nucleated_village' — cross-road pattern around a central green
 */

import type { Heightmap } from './TerrainGenerator'
import { RoadNetwork, type RoadGraph, type RoadNode, type RoadEdge } from './RoadNetwork'
import { ParcelGenerator, type Parcel } from './Parcel'
import { mulberry32 } from '@utils/Seeder'

export type SettlementType =
  | 'valley_town'
  | 'linear_village'
  | 'hamlet'
  | 'nucleated_village'

export interface LayoutResult {
  roadGraph: RoadGraph
  parcels: Parcel[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function gridToWorld(
  gx: number, gz: number,
  hm: Heightmap,
): { wx: number; wz: number } {
  const { worldWidth, worldDepth } = hm.config
  return {
    wx: (gx / (hm.width  - 1)) * worldWidth  - worldWidth  / 2,
    wz: (gz / (hm.depth  - 1)) * worldDepth  - worldDepth  / 2,
  }
}

function worldToGrid(
  wx: number, wz: number,
  hm: Heightmap,
): { gx: number; gz: number } {
  const { worldWidth, worldDepth } = hm.config
  return {
    gx: Math.round(((wx + worldWidth  / 2) / worldWidth)  * (hm.width  - 1)),
    gz: Math.round(((wz + worldDepth  / 2) / worldDepth)  * (hm.depth  - 1)),
  }
}

// ── Settlement generators ─────────────────────────────────────────────────────

export class SettlementLayout {
  static generate(hm: Heightmap, seed: number, type: SettlementType): LayoutResult {
    switch (type) {
      case 'linear_village':   return SettlementLayout._linear(hm, seed)
      case 'hamlet':           return SettlementLayout._hamlet(hm, seed)
      case 'nucleated_village':return SettlementLayout._nucleated(hm, seed)
      default:                 return SettlementLayout._valleyTown(hm, seed)
    }
  }

  // ── Valley town — current default ─────────────────────────────────────────
  private static _valleyTown(hm: Heightmap, seed: number): LayoutResult {
    const roadGraph = RoadNetwork.generate(hm, seed)
    const parcels   = ParcelGenerator.generate(roadGraph)
    return { roadGraph, parcels }
  }

  // ── Linear village — ribbon development, one road ─────────────────────────
  private static _linear(hm: Heightmap, seed: number): LayoutResult {
    // Generate the full road graph, then discard all side streets.
    const full = RoadNetwork.generate(hm, seed)

    const mainNodeIds  = new Set(full.nodes.filter(n => n.isMainRoad).map(n => n.id))
    const roadGraph: RoadGraph = {
      nodes: full.nodes.filter(n => n.isMainRoad),
      edges: full.edges.filter(e => e.type === 'main' && mainNodeIds.has(e.from) && mainNodeIds.has(e.to)),
    }

    // Parcels are generated as normal but with a sparser interval
    const allParcels = ParcelGenerator.generate(roadGraph)

    // Keep ~60 % of parcels at random, using a seeded rng for reproducibility
    const rng = mulberry32(seed ^ 0x00BEEF11)
    const parcels = allParcels.filter(() => rng() < 0.62)

    return { roadGraph, parcels }
  }

  // ── Hamlet — scattered buildings, one short lane ───────────────────────────
  private static _hamlet(hm: Heightmap, seed: number): LayoutResult {
    const rng = mulberry32(seed ^ 0xDEAD4321)
    const { worldWidth, worldDepth } = hm.config

    // Find the valley centre X at mid-depth
    const midGz  = Math.floor(hm.depth / 2)
    const midGx  = RoadNetwork.findValleyX(hm, midGz)
    const centre = gridToWorld(midGx, midGz, hm)

    // One short lane (2 nodes, 1 edge)
    const laneHalf = 18 + rng() * 14
    const nodes: RoadNode[] = [
      { id: 0, gx: midGx, gz: midGz - 10, wx: centre.wx, wz: centre.wz - laneHalf, isMainRoad: true },
      { id: 1, gx: midGx, gz: midGz + 10, wx: centre.wx, wz: centre.wz + laneHalf, isMainRoad: true },
    ]
    const edges: RoadEdge[] = [{ from: 0, to: 1, type: 'main' }]
    const roadGraph: RoadGraph = { nodes, edges }

    // Scatter 6–14 buildings within ~55 units of the lane's midpoint
    const count    = 6 + Math.floor(rng() * 9)
    const radius   = 55
    const parcels: Parcel[] = []

    for (let i = 0; i < count; i++) {
      // Cluster loosely around the lane but with irregular placement
      const angle = rng() * Math.PI * 2
      const dist  = 8 + rng() * radius * 0.85

      const cx = centre.wx + Math.cos(angle) * dist
      const cz = centre.wz + Math.sin(angle) * dist

      // Clamp to world bounds
      const hw = worldWidth / 2 - 10
      const hd = worldDepth / 2 - 10
      if (Math.abs(cx) > hw || Math.abs(cz) > hd) continue

      const plotW  = 14 + rng() * 10
      const plotD  = 20 + rng() * 14
      const slight = (rng() - 0.5) * 0.25   // slight rotation (~±7°)

      parcels.push({
        id: i,
        cx,
        cz,
        width:  plotW,
        depth:  plotD,
        angle:  slight,
        zone:   rng() < 0.15 ? 'commercial' : rng() < 0.08 ? 'civic' : 'residential',
      })
    }

    return { roadGraph, parcels }
  }

  // ── Nucleated village — cross-roads around a central green ────────────────
  private static _nucleated(hm: Heightmap, seed: number): LayoutResult {
    const rng = mulberry32(seed ^ 0xC0FFEE99)

    // Centre of the village is the valley midpoint
    const midGz = Math.floor(hm.depth / 2)
    const midGx = RoadNetwork.findValleyX(hm, midGz)
    const centre = gridToWorld(midGx, midGz, hm)

    const { worldWidth, worldDepth } = hm.config

    // Four arms: N, S, E, W — variable lengths
    const arms = [
      { dx: 0,  dz: -1, worldLen: 35 + rng() * 25 },  // N
      { dx: 0,  dz:  1, worldLen: 35 + rng() * 25 },  // S
      { dx: -1, dz:  0, worldLen: 28 + rng() * 20 },  // W
      { dx:  1, dz:  0, worldLen: 28 + rng() * 20 },  // E
    ]

    const nodes: RoadNode[] = []
    const edges: RoadEdge[] = []
    let nextId = 0

    // Centre node
    const centreNode: RoadNode = {
      id: nextId++,
      gx: midGx, gz: midGz,
      wx: centre.wx, wz: centre.wz,
      isMainRoad: true,
    }
    nodes.push(centreNode)

    const nodesPerArm = 4
    for (const arm of arms) {
      let prevId = centreNode.id
      for (let s = 1; s <= nodesPerArm; s++) {
        const t      = s / nodesPerArm
        const wx     = centre.wx + arm.dx * arm.worldLen * t
        const wz     = centre.wz + arm.dz * arm.worldLen * t
        const { gx, gz } = worldToGrid(wx, wz, hm)
        if (Math.abs(wx) > worldWidth / 2 - 8 || Math.abs(wz) > worldDepth / 2 - 8) break

        const id = nextId++
        nodes.push({ id, gx, gz, wx, wz, isMainRoad: s <= 2 })
        edges.push({ from: prevId, to: id, type: s <= 2 ? 'main' : 'side' })
        prevId = id
      }
    }

    const roadGraph: RoadGraph = { nodes, edges }
    const allParcels = ParcelGenerator.generate(roadGraph)

    // Place a small civic building near the centre (a "green" parcel)
    const greenPlot: Parcel = {
      id: allParcels.length,
      cx: centre.wx,
      cz: centre.wz,
      width: 14,
      depth: 14,
      angle: 0,
      zone: 'green',
    }

    // Keep most parcels but give it an organic feel by randomly dropping a few
    const parcels = [
      greenPlot,
      ...allParcels.filter(() => rng() < 0.80),
    ]

    return { roadGraph, parcels }
  }
}
