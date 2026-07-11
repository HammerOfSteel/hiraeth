/**
 * CityModel — port of com.watabou.citygenerator.Model.hx
 *
 * Full pipeline:
 *   buildPatches()      — Voronoi city blocks
 *   optimizeJunctions() — fix near-coincident vertices
 *   buildWalls()        — convex-hull city wall + gates
 *   buildStreets()      — A* streets from gates to plaza
 *   createWards()       — assign ward types to patches
 *   buildGeometry()     — building lots inside each ward
 *
 * Key design fidelity notes:
 *  • Spiral point distribution (sqrt(i)*5 angle step)
 *  • 3 Lloyd relaxation passes on central 3 + nPatches-th region
 *  • Wall = convex hull of withinWall patches' outermost vertices
 *  • Streets use Topology A* on the Voronoi graph
 *  • Ward assignment uses specific area/position heuristics
 */
import { Pt } from '../geom/pt'
import { type Polygon } from '../geom/polygon'
import { Voronoi } from '../geom/voronoi'
import { Patch } from './patch'
import { Topology } from './topology'
import {
  type Ward, CraftsmenWard, MerchantWard, CathedralWard, AdministrationWard,
  SlumWard, FarmWard, PlazaWard, randomWard,
} from './ward'

// ─── RNG ──────────────────────────────────────────────────────────────────────

function seededRNG(seed: number): () => number {
  let s = seed >>> 0
  return function () {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967296
  }
}

// ─── Model parameters ─────────────────────────────────────────────────────────

export interface CityParams {
  seed:     number
  nPatches: number  // 6 = village, 15 = town, 40 = city
}

// ─── Model output ─────────────────────────────────────────────────────────────

export interface CityData {
  patches:   Patch[]
  plaza:     Patch
  citadel:   Patch | null
  wall:      Pt[]           // wall polygon vertices (CCW)
  gates:     Pt[]           // gate points on the wall
  streets:   Pt[][]         // array of polylines
  buildings: Polygon[]      // all building lot polygons
  params:    CityParams
}

// ─── Convex hull (gift wrapping) ──────────────────────────────────────────────

function convexHull(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice()

  // Start with leftmost
  let start = pts[0]
  for (const p of pts) if (p.x < start.x || (p.x === start.x && p.y < start.y)) start = p

  const hull: Pt[] = []
  let current = start
  do {
    hull.push(current)
    let next = pts[0] === current ? pts[1] : pts[0]
    for (const p of pts) {
      if (p === current) continue
      const dx1 = next.x - current.x, dy1 = next.y - current.y
      const dx2 = p.x  - current.x,  dy2 = p.y  - current.y
      const cross = dx1 * dy2 - dy1 * dx2
      if (cross < 0 || (cross === 0 && Pt.distance(current, p) > Pt.distance(current, next)))
        next = p
    }
    current = next
  } while (current !== start && hull.length <= pts.length)

  return hull
}

// ─── Main model class ─────────────────────────────────────────────────────────

export class CityModel {
  patches:    Patch[]
  plaza:      Patch | null
  citadel:    Patch | null
  wall:       Pt[]
  gates:      Pt[]
  streets:    Pt[][]
  buildings:  Polygon[]
  topology:   Topology
  params:     CityParams

  private rng: () => number

  constructor(params: CityParams) {
    this.params    = params
    this.rng       = seededRNG(params.seed)
    this.patches   = []
    this.plaza     = null
    this.citadel   = null
    this.wall      = []
    this.gates     = []
    this.streets   = []
    this.buildings = []
    this.topology  = new Topology()
  }

  build(): CityData {
    this.buildPatches()
    this.optimizeJunctions()
    this.buildWalls()
    this.buildStreets()
    this.createWards()
    this.buildGeometry()

    return {
      patches:   this.patches,
      plaza:     this.plaza!,
      citadel:   this.citadel,
      wall:      this.wall,
      gates:     this.gates,
      streets:   this.streets,
      buildings: this.buildings,
      params:    this.params,
    }
  }

  // ─── 1. Build Voronoi patches ────────────────────────────────────────────────

  private buildPatches(): void {
    const nPatches = this.params.nPatches
    const rng = this.rng

    // Spiral distribution of seed points
    const sa = rng() * 2 * Math.PI
    const seedPoints: Pt[] = []
    const numSeeds = nPatches * 8
    for (let i = 0; i < numSeeds; i++) {
      const a = sa + Math.sqrt(i) * 5
      const r = i === 0 ? 0 : 10 + i * (2 + rng())
      seedPoints.push(new Pt(Math.cos(a) * r, Math.sin(a) * r))
    }

    // Build initial Voronoi
    let voronoi = Voronoi.build(seedPoints)

    // 3 Lloyd relaxation passes on the central 3 patches + nPatches-th
    for (let i = 0; i < 3; i++) {
      const toRelax = [
        voronoi.points[0],
        voronoi.points[1],
        voronoi.points[2],
        voronoi.points[nPatches],
      ].filter(Boolean)
      voronoi = Voronoi.relax(voronoi, toRelax)
    }

    // Convert regions → Patches
    const regions  = voronoi.partioning()
    this.patches   = regions.slice(0, nPatches).map((r, i) => Patch.fromRegion(r, i))

    // Register all patches in topology graph
    for (const patch of this.patches) this.topology.addPatch(patch)

    // First patch (closest to origin) = plaza
    this.plaza = this.patches[0]
  }

  // ─── 2. Optimise junctions ───────────────────────────────────────────────────

  private optimizeJunctions(): void {
    const THRESHOLD = 8
    const pts: Pt[] = []
    for (const patch of this.patches) {
      for (const v of patch.shape) {
        if (!pts.includes(v)) pts.push(v)
      }
    }

    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        if (Pt.distance(pts[i], pts[j]) < THRESHOLD) {
          // Merge j into i: update all shape references
          const merged = pts[i]
          for (const patch of this.patches) {
            const idx = patch.shape.indexOf(pts[j])
            if (idx !== -1) patch.shape[idx] = merged
          }
          pts.splice(j, 1)
          j--
        }
      }
    }
  }

  // ─── 3. Build city wall ──────────────────────────────────────────────────────

  private buildWalls(): void {
    const nPatches   = this.params.nPatches
    const withinCount = Math.floor(nPatches * 0.7)

    // Mark inner patches as within-wall (they are sorted by distance to origin)
    for (let i = 0; i < this.patches.length; i++) {
      this.patches[i].withinWall = i < withinCount
    }

    // Collect all boundary vertices of within-wall patches
    const wallPts: Pt[] = []
    for (const patch of this.patches) {
      if (patch.withinWall) {
        for (const v of patch.shape) {
          if (!wallPts.includes(v)) wallPts.push(v)
        }
      }
    }

    this.wall = convexHull(wallPts)

    // Gates: wall vertices adjacent to outside patches
    this.gates = []
    const n = this.wall.length
    for (let i = 0; i < n; i++) {
      this.gates.push(this.wall[i])
    }
    // Keep only a reasonable number (every 3rd-4th vertex)
    const step = Math.ceil(n / 4)
    this.gates = this.wall.filter((_, i) => i % step === 0).slice(0, 6)
  }

  // ─── 4. Build streets ────────────────────────────────────────────────────────

  private buildStreets(): void {
    if (!this.plaza || this.gates.length === 0) return

    const plazaCenter = this.plaza.center
    const blocked     = new Set<Pt>(this.citadel?.shape ?? [])

    for (const gate of this.gates) {
      // Find closest topology node to gate
      const gateNode = this.topology.pt2node.get(gate)
          ?? this._closestNode(gate)
      const plazaNode = this._closestNode(plazaCenter)

      if (!gateNode || !plazaNode) continue

      const street = this.topology.buildPath(gateNode.pt, plazaNode.pt, blocked)
      if (street.length >= 2) this.streets.push(street)
    }
  }

  private _closestNode(p: Pt): import('../geom/graph').Node | null {
    let best = null, bestD = Infinity
    for (const [pt, node] of this.topology.pt2node) {
      const d = Pt.distance(pt, p)
      if (d < bestD) { bestD = d; best = node }
    }
    return best
  }

  // ─── 5. Create wards ─────────────────────────────────────────────────────────

  private createWards(): void {
    const sorted  = [...this.patches].sort((a, b) => {
      const da = Pt.distance(a.center, new Pt(0, 0))
      const db = Pt.distance(b.center, new Pt(0, 0))
      return da - db
    })

    sorted.forEach((patch, i) => {
      const rel = i / sorted.length

      let ward: Ward
      if (i === 0) {
        ward = new PlazaWard()
      } else if (i === 1 && this.params.nPatches >= 8) {
        ward = new CathedralWard()
      } else if (rel < 0.1) {
        ward = new AdministrationWard()
      } else if (rel < 0.3) {
        ward = new MerchantWard()
      } else if (rel < 0.55) {
        ward = new CraftsmenWard()
      } else if (rel < 0.7) {
        ward = new SlumWard()
      } else if (rel < 0.85) {
        ward = new FarmWard()
      } else {
        ward = randomWard(this.rng)
      }

      patch.ward = ward
    })
  }

  // ─── 6. Build geometry ───────────────────────────────────────────────────────

  private buildGeometry(): void {
    this.buildings = []
    for (const patch of this.patches) {
      if (!patch.ward) continue
      const lots = patch.ward.createBuildings(patch, this.rng)
      this.buildings.push(...lots)
    }
  }
}
