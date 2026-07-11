// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.geom.Voronoi (Bowyer-Watson Delaunay + Voronoi dual)

import { Pt } from './pt'

// ─── Triangle ────────────────────────────────────────────────────────────────

export class Triangle {
  p1: Pt; p2: Pt; p3: Pt
  c: Pt   // circumcenter
  r: number  // circumradius

  constructor(p1: Pt, p2: Pt, p3: Pt) {
    // Ensure CCW winding
    const s = (p2.x - p1.x) * (p2.y + p1.y) +
              (p3.x - p2.x) * (p3.y + p2.y) +
              (p1.x - p3.x) * (p1.y + p3.y)
    this.p1 = p1
    this.p2 = s > 0 ? p2 : p3
    this.p3 = s > 0 ? p3 : p2

    // Circumcenter via perpendicular bisectors
    const x1 = (p1.x + p2.x) / 2, y1 = (p1.y + p2.y) / 2
    const x2 = (p2.x + p3.x) / 2, y2 = (p2.y + p3.y) / 2
    const dx1 = p1.y - p2.y, dy1 = p2.x - p1.x
    const dx2 = p2.y - p3.y, dy2 = p3.x - p2.x
    const tg1 = dy1 / dx1
    const t2  = ((y1 - y2) - (x1 - x2) * tg1) / (dy2 - dx2 * tg1)

    this.c = new Pt(x2 + dx2 * t2, y2 + dy2 * t2)
    this.r = Pt.distance(this.c, p1)
  }

  hasEdge(a: Pt, b: Pt): boolean {
    return (this.p1 === a && this.p2 === b) ||
           (this.p2 === a && this.p3 === b) ||
           (this.p3 === a && this.p1 === b)
  }
}

// ─── Region (Voronoi cell) ────────────────────────────────────────────────────

export class Region {
  seed: Pt
  triangles: Triangle[]  // sorted CCW by angle from seed

  constructor(seed: Pt) {
    this.seed = seed
    this.triangles = []
  }

  sortVertices(): this {
    this.triangles.sort((v1, v2) => {
      const x1 = v1.c.x - this.seed.x, y1 = v1.c.y - this.seed.y
      const x2 = v2.c.x - this.seed.x, y2 = v2.c.y - this.seed.y
      if (x1 >= 0 && x2 < 0) return 1
      if (x2 >= 0 && x1 < 0) return -1
      if (x1 === 0 && x2 === 0) return y2 > y1 ? 1 : -1
      return Math.sign(x2 * y1 - x1 * y2)
    })
    return this
  }

  /** Centroid of circumcenters = Voronoi cell center. */
  center(): Pt {
    const c = new Pt()
    for (const t of this.triangles) c.addEq(t.c)
    return c.scaleEq(1 / this.triangles.length)
  }

  borders(r: Region): boolean {
    const n1 = this.triangles.length, n2 = r.triangles.length
    for (let i = 0; i < n1; i++) {
      const j = r.triangles.indexOf(this.triangles[i])
      if (j !== -1)
        return this.triangles[(i + 1) % n1] === r.triangles[(j + n2 - 1) % n2]
    }
    return false
  }
}

// ─── Voronoi ──────────────────────────────────────────────────────────────────

export class Voronoi {
  triangles: Triangle[]
  points: Pt[]
  frame: Pt[]

  private _regions:      Map<Pt, Region>
  private _regionsDirty: boolean

  constructor(minx: number, miny: number, maxx: number, maxy: number) {
    const c1 = new Pt(minx, miny), c2 = new Pt(minx, maxy)
    const c3 = new Pt(maxx, miny), c4 = new Pt(maxx, maxy)
    this.frame     = [c1, c2, c3, c4]
    this.points    = [c1, c2, c3, c4]
    this.triangles = [new Triangle(c1, c2, c3), new Triangle(c2, c3, c4)]
    this._regions  = new Map(this.points.map(p => [p, this._buildRegion(p)]))
    this._regionsDirty = false
  }

  addPoint(p: Pt): void {
    const toSplit = this.triangles.filter(t => Pt.distance(p, t.c) < t.r)
    if (toSplit.length === 0) return

    this.points.push(p)

    // Collect boundary edges (edges not shared between two triangles-to-split)
    const a: Pt[] = [], b: Pt[] = []
    for (const t1 of toSplit) {
      let e1 = true, e2 = true, e3 = true
      for (const t2 of toSplit) {
        if (t2 === t1) continue
        if (e1 && t2.hasEdge(t1.p2, t1.p1)) e1 = false
        if (e2 && t2.hasEdge(t1.p3, t1.p2)) e2 = false
        if (e3 && t2.hasEdge(t1.p1, t1.p3)) e3 = false
        if (!e1 && !e2 && !e3) break
      }
      if (e1) { a.push(t1.p1); b.push(t1.p2) }
      if (e2) { a.push(t1.p2); b.push(t1.p3) }
      if (e3) { a.push(t1.p3); b.push(t1.p1) }
    }

    // Fan new triangles — guard against malformed boundary (index=-1 or safety cap)
    let index = 0
    let safety = a.length + 1
    do {
      this.triangles.push(new Triangle(p, a[index], b[index]))
      index = a.indexOf(b[index])
    } while (index !== 0 && index !== -1 && --safety > 0)

    for (const t of toSplit) {
      const i = this.triangles.indexOf(t)
      if (i !== -1) this.triangles.splice(i, 1)
    }

    this._regionsDirty = true
  }

  private _buildRegion(p: Pt): Region {
    const r = new Region(p)
    for (const t of this.triangles)
      if (t.p1 === p || t.p2 === p || t.p3 === p) r.triangles.push(t)
    return r.sortVertices()
  }

  get regions(): Map<Pt, Region> {
    if (this._regionsDirty) {
      this._regions = new Map()
      this._regionsDirty = false
      for (const p of this.points) this._regions.set(p, this._buildRegion(p))
    }
    return this._regions
  }

  private _isReal(t: Triangle): boolean {
    return !this.frame.includes(t.p1) && !this.frame.includes(t.p2) && !this.frame.includes(t.p3)
  }

  triangulation(): Triangle[] { return this.triangles.filter(t => this._isReal(t)) }

  /** Returns only regions whose triangles are all "real" (no frame vertices). */
  partioning(): Region[] {
    const result: Region[] = []
    for (const p of this.points) {
      const r = this.regions.get(p)!
      if (r.triangles.every(t => this._isReal(t))) result.push(r)
    }
    return result
  }

  static relax(voronoi: Voronoi, toRelax: Pt[] | null = null): Voronoi {
    const regions = voronoi.partioning()
    const points  = voronoi.points.filter(p => !voronoi.frame.includes(p))
    const relaxSet = toRelax ?? voronoi.points

    for (const r of regions) {
      if (relaxSet.includes(r.seed)) {
        const idx = points.indexOf(r.seed)
        if (idx !== -1) points[idx] = r.center()
      }
    }
    return Voronoi.build(points)
  }

  static build(vertices: Pt[]): Voronoi {
    let minx = 1e10, miny = 1e10, maxx = -1e9, maxy = -1e9
    for (const v of vertices) {
      if (v.x < minx) minx = v.x; if (v.y < miny) miny = v.y
      if (v.x > maxx) maxx = v.x; if (v.y > maxy) maxy = v.y
    }
    const dx = (maxx - minx) * 0.5, dy = (maxy - miny) * 0.5
    const vor = new Voronoi(minx - dx / 2, miny - dy / 2, maxx + dx / 2, maxy + dy / 2)
    for (const v of vertices) vor.addPoint(v)
    return vor
  }
}
