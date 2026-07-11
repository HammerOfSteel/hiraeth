// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Ward
// This file contains the base class + static helpers.
// Concrete subclasses live in src/wards/*.ts (Phase 3).

import { Pt } from '../geom/pt'
import { type Polygon, polyForEdge, polyShrink, polyBuffer, polySquare, polyIsConvex, polyCut, polyFindEdge, polyGetBounds } from '../geom/polygon'
import { cross } from '../geom/geomUtils'
import { bisect } from '../model/cutter'
import type { Patch } from '../model/patch'
import type { Model } from '../model/model'
import type { Prng } from '../model/model'

export const MAIN_STREET    = 2.0
export const REGULAR_STREET = 1.0
export const ALLEY          = 0.6

export abstract class Ward {
  model:    Model
  patch:    Patch
  geometry: Polygon[] = []
  name:     string    = 'Ward'
  rng:      Prng

  constructor(model: Model, patch: Patch) {
    this.model = model
    this.patch = patch
    this.rng   = model.rng
  }

  createGeometry(): void { this.geometry = [] }

  getLabel(): string | null { return null }

  /**
   * Returns the city block polygon — the patch inset by street width on each edge.
   * Edges on arteries or the wall get a larger inset (MAIN_STREET/2),
   * inner edges get REGULAR_STREET/2, countryside edges get ALLEY/2.
   */
  getCityBlock(): Polygon {
    const insetDist: number[] = []
    const innerPatch = this.model.wall == null || this.patch.withinWalls

    polyForEdge(this.patch.shape, (v0, v1) => {
      if (this.model.wall != null && this.model.wall.bordersBy(this.patch, v0, v1)) {
        insetDist.push(MAIN_STREET / 2)
      } else {
        let onStreet = innerPatch && (
          this.model.plaza != null &&
          polyFindEdge(this.model.plaza.shape, v1, v0) !== -1
        )
        if (!onStreet) {
          for (const street of this.model.arteries) {
            if (street.indexOf(v0) !== -1 && street.indexOf(v1) !== -1) {
              onStreet = true; break
            }
          }
        }
        insetDist.push((onStreet ? MAIN_STREET : (innerPatch ? REGULAR_STREET : ALLEY)) / 2)
      }
    })

    try {
      return polyIsConvex(this.patch.shape)
        ? polyShrink(this.patch.shape, insetDist)
        : polyBuffer(this.patch.shape, insetDist)
    } catch {
      return [...this.patch.shape]
    }
  }

  // ── Static building subdivision ──────────────────────────────────────────────

  /**
   * Recursively subdivide a city block into individual building lots.
   * Exact port of Ward.createAlleys — see Ward.hx.
   */
  static createAlleys(
    p:          Polygon,
    minSq:      number,
    gridChaos:  number,
    sizeChaos:  number,
    emptyProb = 0.04,
    split      = true,
    rng:        () => number = Math.random,
    _depth     = 0,
  ): Polygon[] {
    if (p.length < 3 || _depth > 24) return p.length >= 3 ? [p] : []

    // Find the longest edge
    let v: Pt = p[0]
    let longest = -1
    polyForEdge(p, (p0, p1) => {
      const len = Pt.distance(p0, p1)
      if (len > longest) { longest = len; v = p0 }
    })

    const spread = 0.8 * gridChaos
    const ratio  = (1 - spread) / 2 + rng() * spread
    const angleSpread = Math.PI / 6 * gridChaos * (Math.abs(polySquare(p)) < minSq * 4 ? 0 : 1)
    const angle  = (rng() - 0.5) * angleSpread

    const halves = bisect(p, v, ratio, angle, split ? ALLEY : 0)

    const buildings: Polygon[] = []
    for (const half of halves) {
      const sq = Math.abs(polySquare(half))
      if (sq < minSq * Math.pow(2, 4 * sizeChaos * (rng() - 0.5))) {
        if (rng() >= emptyProb) buildings.push(half)
      } else {
        const subSplit = sq > minSq / (rng() * rng())
        buildings.push(...Ward.createAlleys(half, minSq, gridChaos, sizeChaos, emptyProb, subSplit, rng, _depth + 1))
      }
    }
    return buildings
  }

  /** Clip a polygon to only the vertices inside the border shape; return null if too small. */
  static filterOutskirts(polygon: Polygon, border: Polygon): Polygon | null {
    if (polygon.length < 3) return null
    const bounds = polyGetBounds(border)
    const filtered = polygon.filter(v =>
      v.x >= bounds.left && v.x <= bounds.right &&
      v.y >= bounds.top  && v.y <= bounds.bottom,
    )
    return filtered.length >= 3 && filtered.length >= polygon.length * 0.5 ? filtered : null
  }

  /**
   * Recursively create orthogonal buildings from a block.
   * Port of Ward.createOrthoBuilding — used by Castle/Cathedral.
   */
  static createOrthoBuilding(poly: Polygon, minBlockSq: number, fill: number, rng: () => number = Math.random): Polygon[] {
    // Returns the start vertex of the longest edge
    function findLongestEdge(pp: Polygon): Pt {
      let v = pp[0], maxLen = -1
      polyForEdge(pp, (p0, p1) => {
        const len = Pt.distance(p0, p1)
        if (len > maxLen) { maxLen = len; v = p0 }
      })
      return v
    }

    function slice(pp: Polygon, c1: Pt, c2: Pt, depth = 0): Polygon[] {
      if (depth > 20) return rng() < fill ? [pp] : []

      const v0 = findLongestEdge(pp)
      const v1 = pp[(pp.indexOf(v0) + 1) % pp.length]
      const ev = v1.subtract(v0)
      const ratio = 0.4 + rng() * 0.2
      const p1 = v0.add(ev.scale(ratio))
      const c  = Math.abs(cross(ev.x, ev.y, c1.x, c1.y)) < Math.abs(cross(ev.x, ev.y, c2.x, c2.y)) ? c1 : c2
      const halves = polyCut(pp, p1, p1.add(c))

      // polyCut returns [[...pp]] when the cut line misses the polygon.
      // Treat a failed cut as a terminal building block.
      if (halves.length < 2) return rng() < fill ? [pp] : []

      const result: Polygon[] = []
      for (const h of halves) {
        const sq = Math.abs(polySquare(h))
        if (sq < minBlockSq * Math.pow(2, rng() * 2 - 1)) {
          if (rng() < fill) result.push(h)
        } else {
          result.push(...slice(h, c1, c2, depth + 1))
        }
      }
      return result
    }

    if (Math.abs(polySquare(poly)) < minBlockSq) return [poly]
    const v0 = findLongestEdge(poly)
    const c1 = poly[(poly.indexOf(v0) + 1) % poly.length].subtract(v0)
    const c2 = c1.rotate90()
    for (let attempt = 0; attempt < 20; attempt++) {
      const blocks = slice(poly, c1, c2, 0)
      if (blocks.length > 0) return blocks
    }
    return [poly]
  }
}
