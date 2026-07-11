/**
 * Polygon — port of com.watabou.geom.Polygon.hx
 *
 * A Polygon is just Pt[] (a plain array of Pt).
 * Object identity is preserved — the SAME Pt instances that were used to
 * build a Voronoi are the same objects stored in Patch.shape polygons and
 * Topology graph nodes.  Never copy points unnecessarily.
 */
import { Pt } from './pt'
import { cross, intersectLines } from './geomUtils'

export type Polygon = Pt[]

const DELTA = 1e-6

// ─── Factories ────────────────────────────────────────────────────────────────

export function polyRect(w = 1, h = 1): Polygon {
  return [
    new Pt(-w / 2, -h / 2), new Pt(w / 2, -h / 2),
    new Pt(w / 2,  h / 2),  new Pt(-w / 2, h / 2),
  ]
}

export function polyRegular(n = 8, r = 1): Polygon {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return new Pt(r * Math.cos(a), r * Math.sin(a))
  })
}

// ─── Properties ───────────────────────────────────────────────────────────────

/** Signed area (positive = CCW). */
export function polySquare(p: Polygon): number {
  let s = 0
  const n = p.length
  for (let i = 0; i < n; i++) {
    const v1 = p[i], v2 = p[(i + 1) % n]
    s += v1.x * v2.y - v2.x * v1.y
  }
  return s * 0.5
}

export function polyPerimeter(p: Polygon): number {
  let len = 0
  polyForEdge(p, (v0, v1) => { len += Pt.distance(v0, v1) })
  return len
}

/** Compactness ≈ 1 for circle, 0.79 for square, 0.60 for triangle. */
export function polyCompactness(p: Polygon): number {
  const perim = polyPerimeter(p)
  return 4 * Math.PI * polySquare(p) / (perim * perim)
}

/** Fast centroid approximation (average of vertices). */
export function polyCenter(p: Polygon): Pt {
  const c = new Pt()
  for (const v of p) c.addEq(v)
  return c.scaleEq(1 / p.length)
}

/** True centroid using shoelace formula. */
export function polyCentroid(p: Polygon): Pt {
  let x = 0, y = 0, a = 0
  polyForEdge(p, (v0, v1) => {
    const f = cross(v0.x, v0.y, v1.x, v1.y)
    a += f
    x += (v0.x + v1.x) * f
    y += (v0.y + v1.y) * f
  })
  const s6 = 1 / (3 * a)
  return new Pt(s6 * x, s6 * y)
}

// ─── Iteration helpers ────────────────────────────────────────────────────────

export function polyForEdge(p: Polygon, fn: (a: Pt, b: Pt) => void): void {
  const n = p.length
  for (let i = 0; i < n; i++) fn(p[i], p[(i + 1) % n])
}

// ─── Vertex access ────────────────────────────────────────────────────────────

export function polyNext(p: Polygon, v: Pt): Pt {
  const i = p.indexOf(v)
  return p[(i + 1) % p.length]
}

export function polyPrev(p: Polygon, v: Pt): Pt {
  const i = p.indexOf(v)
  return p[(i + p.length - 1) % p.length]
}

export function polyVector(p: Polygon, v: Pt): Pt {
  return polyNext(p, v).subtract(v)
}

export function polyVectori(p: Polygon, i: number): Pt {
  return p[i === p.length - 1 ? 0 : i + 1].subtract(p[i])
}

export function polyFindEdge(p: Polygon, a: Pt, b: Pt): number {
  const i = p.indexOf(a)
  return (i !== -1 && p[(i + 1) % p.length] === b) ? i : -1
}

export function polyLast(p: Polygon): Pt {
  return p[p.length - 1]
}

/** Minimum vertex by some scoring function (like min distance to a point). */
export function polyMin(p: Polygon, fn: (v: Pt) => number): Pt {
  let best = p[0], bestScore = fn(p[0])
  for (let i = 1; i < p.length; i++) {
    const s = fn(p[i])
    if (s < bestScore) { bestScore = s; best = p[i] }
  }
  return best
}

/** Max vertex by scoring function. */
export function polyMax(p: Polygon, fn: (v: Pt) => number): Pt {
  let best = p[0], bestScore = fn(p[0])
  for (let i = 1; i < p.length; i++) {
    const s = fn(p[i])
    if (s > bestScore) { bestScore = s; best = p[i] }
  }
  return best
}

// ─── Convexity ────────────────────────────────────────────────────────────────

export function polyIsConvexVertex(p: Polygon, v: Pt): boolean {
  const v0 = polyPrev(p, v), v2 = polyNext(p, v)
  return cross(v.x - v0.x, v.y - v0.y, v2.x - v.x, v2.y - v.y) > 0
}

export function polyIsConvex(p: Polygon): boolean {
  return p.every(v => polyIsConvexVertex(p, v))
}

// ─── Distance ─────────────────────────────────────────────────────────────────

/** Min distance from any vertex to point p. */
export function polyDistance(poly: Polygon, p: Pt): number {
  return Math.min(...poly.map(v => Pt.distance(v, p)))
}

// ─── Smoothing ────────────────────────────────────────────────────────────────

/**
 * Vertex smoothing pass (Chaikin-style weighted average).
 * Returns a NEW polygon with updated interior points.
 * Direct port of Polygon.smoothVertexEq(f).
 */
export function polySmoothVertexEq(p: Polygon, f = 1): Polygon {
  const n = p.length
  let v1 = p[n - 1], v2 = p[0]
  return Array.from({ length: n }, (_, i) => {
    const v0 = v1; v1 = v2; v2 = p[(i + 1) % n]
    return new Pt(
      (v0.x + v1.x * f + v2.x) / (2 + f),
      (v0.y + v1.y * f + v2.y) / (2 + f),
    )
  })
}

// ─── Polygon cutting ──────────────────────────────────────────────────────────

/**
 * Cut a polygon with an infinite line through p1–p2.
 * Returns two sub-polygons (or [copy] if line doesn't intersect twice).
 * gap > 0 peels a small strip along each cut edge.
 * Direct port of Polygon.cut().
 */
export function polyCut(poly: Polygon, p1: Pt, p2: Pt, gap = 0): Polygon[] {
  const x1 = p1.x, y1 = p1.y, dx1 = p2.x - x1, dy1 = p2.y - y1
  const n = poly.length
  let edge1 = 0, ratio1 = 0, edge2 = 0, ratio2 = 0, count = 0

  for (let i = 0; i < n; i++) {
    const v0 = poly[i], v1 = poly[(i + 1) % n]
    const t = intersectLines(x1, y1, dx1, dy1, v0.x, v0.y, v1.x - v0.x, v1.y - v0.y)
    if (t && t.y >= 0 && t.y <= 1) {
      if (count === 0) { edge1 = i; ratio1 = t.x }
      else             { edge2 = i; ratio2 = t.x }
      count++
    }
  }

  if (count === 2) {
    const interp = (r: number) => new Pt(x1 + dx1 * r, y1 + dy1 * r)
    const pt1 = interp(ratio1)
    const pt2 = interp(ratio2)

    let half1: Polygon = [...poly.slice(edge1 + 1, edge2 + 1)]
    half1.unshift(pt1)
    half1.push(pt2)

    let half2: Polygon = [...poly.slice(edge2 + 1), ...poly.slice(0, edge1 + 1)]
    half2.unshift(pt2)
    half2.push(pt1)

    if (gap > 0) {
      half1 = polyPeel(half1, pt2, gap / 2)
      half2 = polyPeel(half2, pt1, gap / 2)
    }

    const v = polyVectori(poly, edge1)
    return cross(dx1, dy1, v.x, v.y) > 0 ? [half1, half2] : [half2, half1]
  }

  return [[...poly]]
}

/**
 * Peel a strip along the edge starting at v1.
 * Port of Polygon.peel().
 */
export function polyPeel(poly: Polygon, v1: Pt, d: number): Polygon {
  const i1 = poly.indexOf(v1)
  const i2 = i1 === poly.length - 1 ? 0 : i1 + 1
  const v2 = poly[i2]
  const v = v2.subtract(v1)
  const n = v.rotate90().norm(d)
  return polyCut(poly, v1.add(n), v2.add(n), 0)[0]
}

/**
 * Shrink a convex polygon by an array of per-edge inset distances.
 * Port of Polygon.shrink().
 */
export function polyShrink(poly: Polygon, d: number[]): Polygon {
  let q: Polygon = [...poly]
  let i = 0
  polyForEdge(poly, (v1, v2) => {
    const dd = d[i++]
    if (dd > 0) {
      const v  = v2.subtract(v1)
      const nn = v.rotate90().norm(dd)
      q = polyCut(q, v1.add(nn), v2.add(nn), 0)[0]
    }
  })
  return q
}

export function polyShrinkEq(poly: Polygon, d: number): Polygon {
  return polyShrink(poly, poly.map(() => d))
}

/**
 * Buffer (outset) polygon edges — handles concave polygons by resolving
 * self-intersections. Port of Polygon.buffer().
 */
export function polyBuffer(poly: Polygon, d: number[]): Polygon {
  const q: Polygon = []
  let i = 0
  polyForEdge(poly, (v0, v1) => {
    const dd = d[i++]
    if (dd === 0) {
      q.push(v0); q.push(v1)
    } else {
      const v  = v1.subtract(v0)
      const nn = v.rotate90().norm(dd)
      q.push(v0.add(nn)); q.push(v1.add(nn))
    }
  })

  // Resolve self-intersections
  let wasCut = true
  let lastEdge = 0
  while (wasCut) {
    wasCut = false
    const len = q.length
    outer: for (let ii = lastEdge; ii < len - 2; ii++) {
      lastEdge = ii
      const p11 = q[ii], p12 = q[ii + 1]
      const x1 = p11.x, y1 = p11.y, dx1 = p12.x - x1, dy1 = p12.y - y1
      for (let jj = ii + 2; jj < (ii > 0 ? len : len - 1); jj++) {
        const p21 = q[jj], p22 = jj < len - 1 ? q[jj + 1] : q[0]
        const t = intersectLines(x1, y1, dx1, dy1, p21.x, p21.y, p22.x - p21.x, p22.y - p21.y)
        if (t && t.x > DELTA && t.x < 1 - DELTA && t.y > DELTA && t.y < 1 - DELTA) {
          const pn = new Pt(x1 + dx1 * t.x, y1 + dy1 * t.x)
          q.splice(jj + 1, 0, pn)
          q.splice(ii + 1, 0, pn)
          wasCut = true
          break outer
        }
      }
    }
  }

  // Pick the largest sub-polygon
  const regular = Array.from({ length: q.length }, (_, idx) => idx)
  let bestPart: Polygon = []
  let bestSq = -Infinity

  while (regular.length > 0) {
    const indices: number[] = []
    const start = regular[0]
    let idx = start
    do {
      indices.push(idx)
      regular.splice(regular.indexOf(idx), 1)
      const next  = (idx + 1) % q.length
      const v     = q[next]
      let next1   = q.indexOf(v)
      if (next1 === next) next1 = q.lastIndexOf(v)
      idx = next1 === -1 ? next : next1
    } while (idx !== start)

    const part: Polygon = indices.map(k => q[k])
    const sq = polySquare(part)
    if (sq > bestSq) { bestPart = part; bestSq = sq }
  }

  return bestPart
}

export function polyBufferEq(poly: Polygon, d: number): Polygon {
  return polyBuffer(poly, poly.map(() => d))
}

/**
 * Interpolation weights from polygon vertices to interior point p.
 * Used for building density calculations in Ward.filterOutskirts().
 */
export function polyInterpolate(poly: Polygon, p: Pt): number[] {
  let sum = 0
  const dd = poly.map(v => {
    const d = 1 / Pt.distance(v, p)
    sum += d
    return d
  })
  return dd.map(d => d / sum)
}

// ─── Polygon splitting ────────────────────────────────────────────────────────

export function polySpliti(poly: Polygon, i1: number, i2: number): Polygon[] {
  if (i1 > i2) [i1, i2] = [i2, i1]
  return [
    poly.slice(i1, i2 + 1),
    [...poly.slice(i2), ...poly.slice(0, i1 + 1)],
  ]
}

// ─── Bounding box ─────────────────────────────────────────────────────────────

export function polyBounds(poly: Polygon): { left: number; top: number; right: number; bottom: number } {
  let left = poly[0].x, right = left, top = poly[0].y, bottom = top
  for (const v of poly) {
    left   = Math.min(left,   v.x)
    right  = Math.max(right,  v.x)
    top    = Math.min(top,    v.y)
    bottom = Math.max(bottom, v.y)
  }
  return { left, top, right, bottom }
}

export function polyContains(poly: Polygon, v: Pt): boolean {
  return poly.includes(v)
}

export function polyBorders(a: Polygon, b: Polygon): boolean {
  const n1 = a.length, n2 = b.length
  for (let i = 0; i < n1; i++) {
    const j = b.indexOf(a[i])
    if (j !== -1) {
      const nextA = a[(i + 1) % n1]
      if (nextA === b[(j + 1) % n2] || nextA === b[(j + n2 - 1) % n2]) return true
    }
  }
  return false
}
