import type { RoadGraph } from './RoadNetwork'
import { mulberry32 } from '@utils/Seeder'

export type ZoneType = 'residential' | 'commercial' | 'civic' | 'green'

export interface Parcel {
  id: number
  cx: number      // world X centre
  cz: number      // world Z centre
  width: number   // along-road dimension
  depth: number   // perpendicular depth from road
  angle: number   // Y-axis rotation (radians)
  zone: ZoneType
}

// ── Overlap detection ─────────────────────────────────────────────────────────

interface PlacedCentre { cx: number; cz: number; r: number }

function wouldOverlap(
  placed: PlacedCentre[],
  cx: number, cz: number, r: number,
  minGap = 3.0,
): boolean {
  for (const p of placed) {
    const dx = p.cx - cx, dz = p.cz - cz
    if (dx * dx + dz * dz < (p.r + r + minGap) * (p.r + r + minGap)) return true
  }
  return false
}

// ── ParcelGenerator ───────────────────────────────────────────────────────────

export class ParcelGenerator {
  /**
   * Generate building parcels along road edges with generous spacing and
   * zone variety.  Pass a `seed` for reproducible zone rolls.
   *
   * Key differences from the dense original:
   *   - Spacing along road:  parcelW + 8-10 units (was +1.5)
   *   - Residential setback: 9 units from road centre (was 3.5)
   *   - Commercial setback:  5 units from road centre (was 3.5)
   *   - Overlap rejection:   circle AABB on placed centres
   *   - Zone variety:        civic, commercial, green mixed into residential
   *   - Fill rate:           ~60-70 % chance per slot (breathing room)
   */
  static generate(graph: RoadGraph, seed = 42): Parcel[] {
    if (graph.nodes.length === 0) return []

    const rng  = mulberry32(seed ^ 0xB00B1E55)
    const placed: PlacedCentre[] = []
    const parcels: Parcel[] = []
    let pid = 0

    // ── Zone context ──────────────────────────────────────────────────────────
    const mainNodes = graph.nodes.filter(n => n.isMainRoad)
    const zVals     = mainNodes.map(n => n.wz)
    const minZ      = zVals.length ? Math.min(...zVals) : 0
    const maxZ      = zVals.length ? Math.max(...zVals) : 0
    const rangeZ    = maxZ - minZ

    // High-street zone: middle ~30 % of main road length
    const hsLo = minZ + rangeZ * 0.35
    const hsHi = minZ + rangeZ * 0.65
    // Church/civic anchor: first quarter of main road
    const civicHi = minZ + rangeZ * 0.25

    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))

    for (const edge of graph.edges) {
      const from = nodeMap.get(edge.from)
      const to   = nodeMap.get(edge.to)
      if (!from || !to) continue

      const rdx = to.wx - from.wx
      const rdz = to.wz - from.wz
      const len = Math.sqrt(rdx * rdx + rdz * rdz)
      if (len < 5) continue

      // Road direction and perpendicular
      const ux = rdx / len, uz = rdz / len
      const px = -uz,       pz =  ux   // left perp
      const angle = Math.atan2(ux, uz)

      const avgZ     = (from.wz + to.wz) / 2
      const isHS     = edge.type === 'main' && avgZ >= hsLo && avgZ <= hsHi
      const isCivic  = edge.type === 'main' && avgZ <= civicHi

      // ── Parcel sizing ──────────────────────────────────────────────────────
      // Smaller footprints than before so buildings don't dominate the view
      const pW = isHS ? 7 : 9           // parcel width along road
      const pD = isHS ? 11 : 14         // parcel depth into plot

      // Radius used for overlap detection (bounding circle of the parcel rectangle)
      const r  = Math.sqrt(pW * pW + pD * pD) / 2

      // ── Spacing along road ─────────────────────────────────────────────────
      // Generous gap so buildings breathe; Gemini: "no wall-to-wall"
      const gap  = edge.type === 'main' ? 9 : 11
      const step = pW + gap
      const count = Math.max(1, Math.floor(len / step))

      // ── Road setback ───────────────────────────────────────────────────────
      // Residential: ~9 units from road centre = proper front garden
      // Commercial:  ~5 units = street-front façade
      const setback = isHS ? 5.0 : 9.0
      const offset  = setback + pD / 2   // centre of parcel from road centre

      for (let i = 0; i < count; i++) {
        // Random fill-rate: ~65 % of slots get a building
        // (gives natural gaps in the street scene)
        if (rng() > 0.65) continue

        const t  = (i + 0.5) / count
        const ox = from.wx + rdx * t
        const oz = from.wz + rdz * t

        // ── Zone selection ─────────────────────────────────────────────────
        let zone: ZoneType
        if (isHS) {
          const r2 = rng()
          zone = r2 < 0.55 ? 'commercial' : r2 < 0.80 ? 'residential' : 'civic'
        } else if (isCivic && i === 0) {
          zone = 'civic'      // church / chapel at the approach end
        } else {
          const r2 = rng()
          zone = r2 < 0.06 ? 'civic'
               : r2 < 0.14 ? 'commercial'
               : r2 < 0.18 ? 'green'
               : 'residential'
        }

        for (const side of [-1, 1] as const) {
          // Individual side roll so each side of the road breathes independently
          if (rng() > 0.72) continue

          const cx = ox + px * offset * side
          const cz = oz + pz * offset * side

          if (wouldOverlap(placed, cx, cz, r)) continue

          placed.push({ cx, cz, r })
          parcels.push({ id: pid++, cx, cz, width: pW, depth: pD, angle, zone })
        }
      }
    }

    return parcels
  }
}

