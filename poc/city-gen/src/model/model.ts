// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.building.Model

import { Pt } from '../geom/pt'
import { type Polygon, polyDistance, polyCompactness } from '../geom/polygon'
import { Voronoi } from '../geom/voronoi'
import { Patch } from './patch'
import { CurtainWall } from './curtainWall'
import { Topology, type Street } from './topology'
import { createWard } from '../wards/index'

// ─── Seeded PRNG ─────────────────────────────────────────────────────────────

export function makePrng(seed: number) {
  let s = seed >>> 0
  return {
    float(): number {
      s = (s + 0x6D2B79F5) >>> 0
      let t = Math.imul(s ^ s >>> 15, 1 | s)
      t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t
      return ((t ^ t >>> 14) >>> 0) / 4294967296
    },
    int(min: number, max: number): number {
      return Math.floor(this.float() * (max - min + 1)) + min
    },
    bool(prob = 0.5): boolean {
      return this.float() < prob
    },
    fuzzy(v: number): number {
      return this.float() * v
    },
  }
}

export type Prng = ReturnType<typeof makePrng>

// Ward rotation list matching Haxe Model.WARDS array
const WARD_ROTATION: string[] = [
  'Craftsmen','Craftsmen','Merchant',
  'Craftsmen','Craftsmen','Cathedral',
  'Craftsmen','Craftsmen','Craftsmen','Craftsmen','Craftsmen',
  'Craftsmen','Craftsmen','Craftsmen','Administration','Craftsmen',
  'Slum','Craftsmen','Slum','Patriciate','Market',
  'Slum','Craftsmen','Craftsmen','Craftsmen','Slum',
  'Craftsmen','Craftsmen','Craftsmen','Military','Slum',
  'Craftsmen','Park','Patriciate','Market','Merchant',
]

// ─── Model ────────────────────────────────────────────────────────────────────

export interface ModelParams {
  seed:     number
  nPatches: number
}

export class Model {
  params: ModelParams

  patches:  Patch[]
  inner:    Patch[]
  citadel:  Patch | null = null
  plaza:    Patch | null = null
  center:   Pt           = new Pt()

  border!:  CurtainWall
  wall:     CurtainWall | null = null

  cityRadius: number = 0
  gates:      Pt[]   = []
  arteries:   Street[] = []
  streets:    Street[] = []
  roads:      Street[] = []

  rng: Prng
  private _topology!: Topology

  private _plazaNeeded:   boolean
  private _citadelNeeded: boolean
  private _wallsNeeded:   boolean

  constructor(params: ModelParams) {
    this.params  = params
    this.rng     = makePrng(params.seed)
    this.patches = []
    this.inner   = []

    this._plazaNeeded   = this._rng.bool()
    this._citadelNeeded = this._rng.bool()
    this._wallsNeeded   = this._rng.bool()
  }

  build(): this {
    this.streets = []
    this.roads   = []

    this._buildPatches()
    this._optimizeJunctions()
    this._buildWalls()
    this._buildStreets()
    this._createWards()
    this._buildGeometry()
    return this
  }

  // ─── Pipeline steps ─────────────────────────────────────────────────────────

  private _buildPatches(): void {
    const rng = this.rng
    const sa  = rng.float() * 2 * Math.PI
    const points: Pt[] = []
    for (let i = 0; i < this.params.nPatches * 8; i++) {
      const a = sa + Math.sqrt(i) * 5
      const r = i === 0 ? 0 : 10 + i * (2 + rng.float())
      points.push(new Pt(Math.cos(a) * r, Math.sin(a) * r))
    }

    let voronoi = Voronoi.build(points)

    // Relax 3 innermost + nPatches-th point, 3 times
    for (let i = 0; i < 3; i++) {
      const toRelax = voronoi.points.slice(0, 3)
      if (voronoi.points.length > this.params.nPatches)
        toRelax.push(voronoi.points[this.params.nPatches])
      voronoi = Voronoi.relax(voronoi, toRelax)
    }

    // Sort Voronoi seed points by distance from origin
    voronoi.points.sort((a, b) => a.length - b.length)
    const regions = voronoi.partioning()

    this.patches = []
    this.inner   = []

    let count = 0
    for (const r of regions) {
      const patch = Patch.fromRegion(r)
      this.patches.push(patch)

      if (count === 0) {
        // Innermost vertex becomes the center
        let minLen = Infinity
        for (const v of patch.shape) if (v.length < minLen) { minLen = v.length; this.center = v }
        if (this._plazaNeeded) this.plaza = patch
      } else if (count === this.params.nPatches && this._citadelNeeded) {
        this.citadel = patch
        this.citadel.withinCity = true
      }

      if (count < this.params.nPatches) {
        patch.withinCity  = true
        patch.withinWalls = this._wallsNeeded
        this.inner.push(patch)
      }
      count++
    }
  }

  private _optimizeJunctions(): void {
    const THRESHOLD = 8
    const toOptimize = this.citadel ? [...this.inner, this.citadel] : [...this.inner]
    const toClear: Patch[] = []

    for (const w of toOptimize) {
      let index = 0
      while (index < w.shape.length) {
        const v0 = w.shape[index]
        const v1 = w.shape[(index + 1) % w.shape.length]
        if (v0 !== v1 && Pt.distance(v0, v1) < THRESHOLD) {
          for (const w1 of this._patchByVertex(v1)) {
            if (w1 !== w) {
              w1.shape[w1.shape.indexOf(v1)] = v0
              toClear.push(w1)
            }
          }
          v0.addEq(v1).scaleEq(0.5)
          w.shape.splice(w.shape.indexOf(v1), 1)
        }
        index++
      }
    }

    // Remove duplicate vertices
    for (const w of toClear) {
      for (let i = 0; i < w.shape.length; i++) {
        const v = w.shape[i]
        let dupIdx: number
        while ((dupIdx = w.shape.indexOf(v, i + 1)) !== -1) w.shape.splice(dupIdx, 1)
      }
    }
  }

  private _buildWalls(): void {
    const reserved: Pt[] = this.citadel ? [...this.citadel.shape] : []

    this.border = new CurtainWall(this._wallsNeeded, this, this.inner, reserved)
    if (this._wallsNeeded) {
      this.wall = this.border
      this.wall.buildTowers()
    }

    const radius  = this.border.getRadius()
    this.patches  = this.patches.filter(p => polyDistance(p.shape, this.center) < radius * 3)
    this.gates    = [...this.border.gates]

    if (this.citadel != null) {
      // Castle ward + inner wall
      const castle = createWard('Castle', this, this.citadel)
      this.citadel.ward = castle

      if (polyCompactness(this.citadel.shape) < 0.4) {
        // Bad citadel shape — skip citadel
        this.citadel = null
      } else {
        // Castle creates its own CurtainWall internally
        // For now just add placeholder gates on each citadel vertex
        const citGates = this.citadel.shape.filter((_, i) => i % 2 === 0).slice(0, 2)
        this.gates = this.gates.concat(citGates)
      }
    }
  }

  private _buildStreets(): void {
    this._topology = new Topology(this)

    for (const gate of this.gates) {
      let end: Pt
      if (this.plaza != null) {
        let minD = Infinity
        end = this.plaza.shape[0]
        for (const v of this.plaza.shape) {
          const d = Pt.distance(v, gate)
          if (d < minD) { minD = d; end = v }
        }
      } else {
        end = this.center
      }

      const street = this._topology.buildPath(gate, end, this._topology.outer)
      if (street != null) {
        this.streets.push(street)

        if (this.border.gates.includes(gate)) {
          // Route road from outside to gate
          const dir   = gate.norm(1000)
          let start: Pt | null = null
          let minDist = Infinity
          // Find outermost topology point
          for (const node of this._topology.outer) {
            const d = Pt.distance(node.pt, dir)
            if (d < minDist) { minDist = d; start = node.pt }
          }
          if (start != null) {
            const road = this._topology.buildPath(start, gate, this._topology.inner)
            if (road != null) this.roads.push(road)
          }
        }
      }
    }

    this._tidyUpRoads()

    for (const a of this.arteries) Topology.smooth(a)
  }

  private _tidyUpRoads(): void {
    interface Seg { start: Pt; end: Pt }
    const segments: Seg[] = []

    const cut2segments = (street: Street) => {
      for (let i = 1; i < street.length; i++) {
        const v0 = street[i - 1], v1 = street[i]
        // Skip segments inside the plaza
        if (this.plaza && this.plaza.shape.includes(v0) && this.plaza.shape.includes(v1)) continue
        if (!segments.some(s => s.start === v0 && s.end === v1))
          segments.push({ start: v0, end: v1 })
      }
    }

    for (const s of this.streets) cut2segments(s)
    for (const r of this.roads)   cut2segments(r)

    this.arteries = []
    while (segments.length > 0) {
      const seg = segments.pop()!
      let attached = false
      for (const a of this.arteries) {
        if (a[0] === seg.end)       { a.unshift(seg.start); attached = true; break }
        else if (a[a.length - 1] === seg.start) { a.push(seg.end); attached = true; break }
      }
      if (!attached) this.arteries.push([seg.start, seg.end])
    }
  }

  private _createWards(): void {
    const rng = this.rng
    const unassigned = [...this.inner]

    // Assign plaza
    if (this.plaza != null) {
      this.plaza.ward = createWard('Market', this, this.plaza)
      unassigned.splice(unassigned.indexOf(this.plaza), 1)
    }

    // Assign gate wards
    for (const gate of this.border.gates) {
      for (const patch of this._patchByVertex(gate)) {
        if (patch.withinCity && patch.ward == null && rng.bool(this.wall == null ? 0.2 : 0.5)) {
          patch.ward = createWard('Gate', this, patch)
          unassigned.splice(unassigned.indexOf(patch), 1)
        }
      }
    }

    // Assign inner wards from rotation list
    const wardQueue = [...WARD_ROTATION]
    // Shuffle slightly (1/10th of list)
    for (let i = 0; i < Math.floor(wardQueue.length / 10); i++) {
      const idx = rng.int(0, wardQueue.length - 2)
      const tmp = wardQueue[idx]; wardQueue[idx] = wardQueue[idx + 1]; wardQueue[idx + 1] = tmp
    }

    while (unassigned.length > 0) {
      const wardName  = wardQueue.length > 0 ? wardQueue.shift()! : 'Slum'
      const bestPatch = unassigned.find(p => p.ward == null) ?? unassigned[0]
      bestPatch.ward  = createWard(wardName, this, bestPatch)
      unassigned.splice(unassigned.indexOf(bestPatch), 1)
    }

    // Outskirts + countryside
    for (const patch of this.patches) {
      if (patch.ward != null) continue
      if (this.wall != null && this.border.gates.some(g => patch.shape.includes(g))) {
        patch.withinCity = true
        patch.ward = createWard('Gate', this, patch)
      } else {
        patch.ward = (rng.bool(0.2) && polyCompactness(patch.shape) >= 0.7)
          ? createWard('Farm', this, patch)
          : createWard('Ward', this, patch)
      }
    }

    // Update cityRadius
    this.cityRadius = 0
    for (const patch of this.patches) {
      if (patch.withinCity)
        for (const v of patch.shape)
          this.cityRadius = Math.max(this.cityRadius, v.length)
    }
  }

  private _buildGeometry(): void {
    for (const patch of this.patches) patch.ward?.createGeometry()
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _patchByVertex(v: Pt): Patch[] {
    return this.patches.filter(p => p.shape.includes(v))
  }

  getNeighbours(patch: Patch): Patch[] {
    return this.patches.filter(p => p !== patch && p.shape.some(v => patch.shape.includes(v)))
  }

  isEnclosed(patch: Patch): boolean {
    return patch.withinCity && (
      patch.withinWalls ||
      this.getNeighbours(patch).every(p => p.withinCity)
    )
  }

  /** Find the circumference of a set of patches (static, re-exported). */
  static findCircumference(patches: Patch[]): Polygon {
    return CurtainWall.findCircumference(patches)
  }
}
