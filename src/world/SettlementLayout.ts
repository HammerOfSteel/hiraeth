/**
 * SettlementLayout — generates different urban morphologies.
 *
 * Types:
 *   'valley_town'        — A* road through valley + organic side streets + mixed use
 *   'linear_village'     — single ribbon road, houses pushed well back with gardens
 *   'hamlet'             — 5-12 small cottages in loose organic clusters, one lane
 *   'nucleated_village'  — cross-roads, genuine village green, church + pub anchors
 */

import type { Heightmap } from './TerrainGenerator'
import { RoadNetwork, type RoadGraph, type RoadNode, type RoadEdge } from './RoadNetwork'
import { ParcelGenerator, type Parcel, type ZoneType } from './Parcel'
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

// ── Shared helpers ────────────────────────────────────────────────────────────

function gridToWorld(gx: number, gz: number, hm: Heightmap): { wx: number; wz: number } {
  const { worldWidth, worldDepth } = hm.config
  return {
    wx: (gx / (hm.width  - 1)) * worldWidth  - worldWidth  / 2,
    wz: (gz / (hm.depth  - 1)) * worldDepth  - worldDepth  / 2,
  }
}

function worldToGrid(wx: number, wz: number, hm: Heightmap): { gx: number; gz: number } {
  const { worldWidth, worldDepth } = hm.config
  return {
    gx: Math.round(((wx + worldWidth  / 2) / worldWidth)  * (hm.width  - 1)),
    gz: Math.round(((wz + worldDepth  / 2) / worldDepth)  * (hm.depth  - 1)),
  }
}

/** Check if a candidate parcel centre is too close to any already placed. */
function overlaps(
  placed: Array<{ cx: number; cz: number }>,
  cx: number, cz: number, minDist: number,
): boolean {
  for (const p of placed) {
    const dx = p.cx - cx, dz = p.cz - cz
    if (dx * dx + dz * dz < minDist * minDist) return true
  }
  return false
}

// ── Settlement generators ─────────────────────────────────────────────────────

export class SettlementLayout {
  static generate(hm: Heightmap, seed: number, type: SettlementType): LayoutResult {
    switch (type) {
      case 'linear_village':    return SettlementLayout._linear(hm, seed)
      case 'hamlet':            return SettlementLayout._hamlet(hm, seed)
      case 'nucleated_village': return SettlementLayout._nucleated(hm, seed)
      default:                  return SettlementLayout._valleyTown(hm, seed)
    }
  }

  // ── Valley town ────────────────────────────────────────────────────────────
  // Pass seed through to ParcelGenerator for consistent zone rolls.
  private static _valleyTown(hm: Heightmap, seed: number): LayoutResult {
    const roadGraph = RoadNetwork.generate(hm, seed)
    const parcels   = ParcelGenerator.generate(roadGraph, seed)
    return { roadGraph, parcels }
  }

  // ── Linear village — ribbon road, generous gardens, no side streets ────────
  private static _linear(hm: Heightmap, seed: number): LayoutResult {
    const full = RoadNetwork.generate(hm, seed)

    // Strip all side streets — pure ribbon
    const mainIds = new Set(full.nodes.filter(n => n.isMainRoad).map(n => n.id))
    const roadGraph: RoadGraph = {
      nodes: full.nodes.filter(n => n.isMainRoad),
      edges: full.edges.filter(e => e.type === 'main' && mainIds.has(e.from) && mainIds.has(e.to)),
    }

    // ParcelGenerator already applies large setback + generous gaps.
    // Linear villages are even sparser: keep ~55 % of placements.
    const rng  = mulberry32(seed ^ 0xFEED1234)
    const all  = ParcelGenerator.generate(roadGraph, seed)
    const parcels = all.filter(() => rng() < 0.55)

    return { roadGraph, parcels }
  }

  // ── Hamlet — small cottages in loose organic clusters, one short lane ──────
  private static _hamlet(hm: Heightmap, seed: number): LayoutResult {
    const rng = mulberry32(seed ^ 0xDEAD4321)
    const { worldWidth, worldDepth } = hm.config

    const midGz = Math.floor(hm.depth / 2)
    const midGx = RoadNetwork.findValleyX(hm, midGz)
    const centre = gridToWorld(midGx, midGz, hm)

    // ── One short lane ─────────────────────────────────────────────────────
    // Slightly angled for a more organic feel
    const laneHalf  = 18 + rng() * 12
    const laneAngle = (rng() - 0.5) * 0.3   // ±~17°
    const ca = Math.cos(laneAngle), sa = Math.sin(laneAngle)

    const nodes: RoadNode[] = [
      {
        id: 0, gx: midGx, gz: midGz - 6,
        wx: centre.wx - sa * laneHalf,
        wz: centre.wz - ca * laneHalf,
        isMainRoad: true,
      },
      {
        id: 1, gx: midGx, gz: midGz + 6,
        wx: centre.wx + sa * laneHalf,
        wz: centre.wz + ca * laneHalf,
        isMainRoad: true,
      },
    ]
    const edges: RoadEdge[] = [{ from: 0, to: 1, type: 'main' }]
    const roadGraph: RoadGraph = { nodes, edges }

    // ── Cottage clusters ────────────────────────────────────────────────────
    // Arrange buildings in 3-4 loose clusters, each with 2-4 cottages.
    // This prevents the "random scatter across the whole map" problem while
    // keeping an organic, unplanned feel.
    const clusterSeeds: Array<{ ox: number; oz: number }> = [
      { ox: -18 + rng() * 6, oz: -12 + rng() * 8 },
      { ox:  16 + rng() * 6, oz:  10 + rng() * 8 },
      { ox:  -8 + rng() * 8, oz:  20 + rng() * 6 },
      { ox:  22 + rng() * 8, oz: -18 + rng() * 6 },
    ]

    const totalBuildings = 5 + Math.floor(rng() * 7)   // 5 – 12
    const parcels: Parcel[] = []
    const placed: Array<{ cx: number; cz: number }> = []
    let pid = 0

    // Explicitly place one pub (commercial) and one chapel (civic)
    const specialZones: ZoneType[] = ['commercial', 'civic']
    let specialIdx = 0

    for (let i = 0; i < totalBuildings; i++) {
      const cluster = clusterSeeds[Math.floor(rng() * clusterSeeds.length)]!

      // Cottage scatter within ±8 units of cluster centre
      const tx = centre.wx + cluster.ox + (rng() - 0.5) * 16
      const tz = centre.wz + cluster.oz + (rng() - 0.5) * 16

      // World bounds check
      const hw = worldWidth  / 2 - 15
      const hd = worldDepth  / 2 - 15
      if (Math.abs(tx) > hw || Math.abs(tz) > hd) continue

      // Overlap: cottages need at least 10 units apart (centre to centre)
      if (overlaps(placed, tx, tz, 10)) continue

      placed.push({ cx: tx, cz: tz })

      // Cottage proportions — small, not apartment-block sized
      const plotW = 6  + rng() * 3.5   // 6 – 9.5 units
      const plotD = 9  + rng() * 5     // 9 – 14 units
      // Slight angle variation — cottages face slightly different directions
      const plotAngle = (rng() - 0.5) * 0.5   // ±~14°

      // First two specials get pub / chapel; rest are residential
      const zone: ZoneType = specialIdx < specialZones.length
        ? specialZones[specialIdx++]!
        : 'residential'

      parcels.push({
        id:    pid++,
        cx:    tx,
        cz:    tz,
        width: plotW,
        depth: plotD,
        angle: plotAngle,
        zone,
      })
    }

    return { roadGraph, parcels }
  }

  // ── Nucleated village — genuine village green, church, pub, ring housing ───
  private static _nucleated(hm: Heightmap, seed: number): LayoutResult {
    const rng = mulberry32(seed ^ 0xC0FFEE99)
    const { worldWidth, worldDepth } = hm.config

    const midGz = Math.floor(hm.depth / 2)
    const midGx = RoadNetwork.findValleyX(hm, midGz)
    const centre = gridToWorld(midGx, midGz, hm)

    // ── Cross-road arms ────────────────────────────────────────────────────
    // Vary arm lengths so the plan is organic, not perfectly symmetrical
    const armN = 40 + rng() * 25
    const armS = 35 + rng() * 25
    const armW = 28 + rng() * 20
    const armE = 30 + rng() * 20

    const arms = [
      { dx: 0,  dz: -1, worldLen: armN, label: 'N' },
      { dx: 0,  dz:  1, worldLen: armS, label: 'S' },
      { dx: -1, dz:  0, worldLen: armW, label: 'W' },
      { dx:  1, dz:  0, worldLen: armE, label: 'E' },
    ] as const

    const nodes: RoadNode[] = []
    const edges: RoadEdge[] = []
    let nextId = 0

    const centreNode: RoadNode = {
      id: nextId++, gx: midGx, gz: midGz,
      wx: centre.wx, wz: centre.wz, isMainRoad: true,
    }
    nodes.push(centreNode)

    // 4 nodes per arm (more spacing = more road = more parcel slots per arm)
    const nodesPerArm = 4
    for (const arm of arms) {
      let prevId = centreNode.id
      for (let s = 1; s <= nodesPerArm; s++) {
        const t  = s / nodesPerArm
        const wx = centre.wx + arm.dx * arm.worldLen * t
        const wz = centre.wz + arm.dz * arm.worldLen * t
        if (Math.abs(wx) > worldWidth / 2 - 10 || Math.abs(wz) > worldDepth / 2 - 10) break
        const { gx, gz } = worldToGrid(wx, wz, hm)
        const id = nextId++
        nodes.push({ id, gx, gz, wx, wz, isMainRoad: true })
        edges.push({ from: prevId, to: id, type: 'main' })
        prevId = id
      }
    }

    const roadGraph: RoadGraph = { nodes, edges }

    // ── Parcels from road graph (already well-spaced by new ParcelGenerator) ─
    const roadParcels = ParcelGenerator.generate(roadGraph, seed)

    // Remove any parcels that fall within the central green zone
    const GREEN_EXCLUSION = 18   // nothing placed inside this radius of centre
    const houseParcels = roadParcels.filter(p => {
      const dx = p.cx - centre.wx, dz = p.cz - centre.wz
      return dx * dx + dz * dz > GREEN_EXCLUSION * GREEN_EXCLUSION
    })

    // ── Anchor buildings — explicitly placed, not generated from road graph ──
    // They go on the pavement between the road edge and the green.
    const anchorOffset = GREEN_EXCLUSION + 5   // just outside the green

    // Church on the N arm
    const church: Parcel = {
      id: 9000, zone: 'civic',
      cx: centre.wx + 9,
      cz: centre.wz - anchorOffset - 4,
      width: 11, depth: 18, angle: 0,
    }

    // Pub on the S arm
    const pub: Parcel = {
      id: 9001, zone: 'commercial',
      cx: centre.wx - 7,
      cz: centre.wz + anchorOffset + 2,
      width: 9, depth: 12, angle: 0,
    }

    // Village green itself (a 'green' zone parcel — BuildingPlacer will
    // render as low shrubs / lawn, not a building)
    const green: Parcel = {
      id: 9002, zone: 'green',
      cx: centre.wx,
      cz: centre.wz,
      width: 22, depth: 22, angle: 0,
    }

    // Keep roughly 70 % of road parcels for a relaxed feel
    const sparseHouses = houseParcels.filter(() => rng() < 0.72)

    const parcels = [green, church, pub, ...sparseHouses]

    return { roadGraph, parcels }
  }
}

