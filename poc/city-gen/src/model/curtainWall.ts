// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.building.CurtainWall

import { Pt } from '../geom/pt'
import { type Polygon, polyForEdge, polyFindEdge, polyNext, polyPrev, polySmoothVertexEq } from '../geom/polygon'
import type { Patch } from './patch'
import type { Model } from './model'

export class CurtainWall {
  shape:    Polygon
  segments: boolean[]   // true = wall segment, false = gate passage
  gates:    Pt[]
  towers:   Pt[]

  private _real:    boolean
  private _patches: Patch[]

  constructor(real: boolean, model: Model, patches: Patch[], reserved: Pt[]) {
    this._real    = real
    this._patches = patches

    // Build the outer boundary polygon
    if (patches.length === 1) {
      this.shape = [...patches[0].shape]
    } else {
      this.shape = CurtainWall.findCircumference(patches)

      if (real) {
        const smoothFactor = Math.min(1, 40 / patches.length)
        // Smooth non-reserved vertices
        const smoothed = polySmoothVertexEq(this.shape, smoothFactor)
        for (let i = 0; i < this.shape.length; i++) {
          if (!reserved.includes(this.shape[i])) {
            this.shape[i] = smoothed[i]
          }
        }
      }
    }

    this.segments = this.shape.map(() => true)
    this.gates    = []
    this.towers   = []

    this._buildGates(real, model, reserved)
  }

  private _buildGates(real: boolean, _model: Model, reserved: Pt[]): void {
    // Entrances: wall vertices shared by more than one inner patch (or any non-reserved for single-patch)
    let entrances: Pt[]
    if (this._patches.length > 1) {
      entrances = this.shape.filter(v =>
        !reserved.includes(v) &&
        this._patches.filter(p => p.shape.includes(v)).length > 1,
      )
    } else {
      entrances = this.shape.filter(v => !reserved.includes(v))
    }

    if (entrances.length === 0) {
      // Fallback: pick any non-reserved vertex
      entrances = this.shape.filter(v => !reserved.includes(v))
    }
    if (entrances.length === 0) {
      // Last resort: use first vertex
      entrances = [this.shape[0]]
    }

    // Pick gates, spaced so no two are adjacent
    while (entrances.length >= 3) {
      const index = Math.floor(Math.random() * entrances.length)
      const gate  = entrances[index]
      this.gates.push(gate)

      // Smooth gate position
      if (real) {
        const smoothed = new Pt(
          (polyPrev(this.shape, gate).x + gate.x + polyNext(this.shape, gate).x) / 3,
          (polyPrev(this.shape, gate).y + gate.y + polyNext(this.shape, gate).y) / 3,
        )
        gate.set(smoothed)
      }

      // Remove this and adjacent entrances
      if (index === 0) {
        entrances.splice(0, 2)
        if (entrances.length > 0) entrances.pop()
      } else if (index === entrances.length - 1) {
        entrances.splice(index - 1, 2)
        if (entrances.length > 0) entrances.shift()
      } else {
        entrances.splice(index - 1, 3)
      }
    }

    if (this.gates.length === 0 && entrances.length > 0) {
      this.gates.push(entrances[0])
    }
  }

  buildTowers(): void {
    this.towers = []
    if (!this._real) return
    const len = this.shape.length
    for (let i = 0; i < len; i++) {
      const t = this.shape[i]
      if (!this.gates.includes(t) && (this.segments[(i + len - 1) % len] || this.segments[i])) {
        this.towers.push(t)
      }
    }
  }

  getRadius(): number {
    let radius = 0
    for (const v of this.shape) radius = Math.max(radius, v.length)
    return radius
  }

  /** Does edge (v0→v1) of patch p lie along an active wall segment? */
  bordersBy(p: Patch, v0: Pt, v1: Pt): boolean {
    const withinWalls = this._patches.includes(p)
    const index = withinWalls
      ? polyFindEdge(this.shape, v0, v1)
      : polyFindEdge(this.shape, v1, v0)
    return index !== -1 && this.segments[index]
  }

  /** Does this wall border patch p at all? */
  borders(p: Patch): boolean {
    const withinWalls = this._patches.includes(p)
    const len = this.shape.length
    for (let i = 0; i < len; i++) {
      if (!this.segments[i]) continue
      const v0 = this.shape[i], v1 = this.shape[(i + 1) % len]
      const idx = withinWalls
        ? polyFindEdge(p.shape, v0, v1)
        : polyFindEdge(p.shape, v1, v0)
      if (idx !== -1) return true
    }
    return false
  }

  /**
   * Find the outer circumference polygon of a set of patches.
   * Port of Model.findCircumference.
   */
  static findCircumference(patches: Patch[]): Polygon {
    const A: Pt[] = [], B: Pt[] = []
    for (const w1 of patches) {
      polyForEdge(w1.shape, (a, b) => {
        let outerEdge = true
        for (const w2 of patches) {
          if (polyFindEdge(w2.shape, b, a) !== -1) { outerEdge = false; break }
        }
        if (outerEdge) { A.push(a); B.push(b) }
      })
    }

    const result: Polygon = []
    let index = 0
    let safety = A.length + 1
    do {
      result.push(A[index])
      index = A.indexOf(B[index])
    } while (index !== 0 && index !== -1 && --safety > 0)

    return result
  }

  // polyNext/polyPrev are module-level functions, re-export for convenience
  static shapeNext = polyNext
  static shapePrev = polyPrev
}
