// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.geom.Polygon
// A Polygon is just Pt[] — vertices stored by reference (identity matters).

import { Pt } from './pt'
import { intersectLines, cross } from './geomUtils'

export type Polygon = Pt[]

const DELTA = 0.000001

// ─── Area / shape metrics ────────────────────────────────────────────────────

/** Signed area via shoelace formula. Positive = CCW. */
export function polySquare(p: Polygon): number {
  const n = p.length
  if (n < 3) return 0
  let v1 = p[n - 1], v2 = p[0]
  let s = v1.x * v2.y - v2.x * v1.y
  for (let i = 1; i < n; i++) { v1 = v2; v2 = p[i]; s += v1.x * v2.y - v2.x * v1.y }
  return s * 0.5
}

export function polyPerimeter(p: Polygon): number {
  let len = 0
  polyForEdge(p, (a, b) => { len += Pt.distance(a, b) })
  return len
}

/** 1 = circle, 0.79 = square, 0.60 = triangle */
export function polyCompactness(p: Polygon): number {
  const perim = polyPerimeter(p)
  return perim === 0 ? 0 : 4 * Math.PI * Math.abs(polySquare(p)) / (perim * perim)
}

/** Fast centroid = average of vertices. */
export function polyCenter(p: Polygon): Pt {
  const c = new Pt()
  for (const v of p) c.addEq(v)
  return c.scaleEq(1 / p.length)
}

/** True area-weighted centroid. */
export function polyCentroid(p: Polygon): Pt {
  let x = 0, y = 0, a = 0
  polyForEdge(p, (v0, v1) => {
    const f = cross(v0.x, v0.y, v1.x, v1.y)
    a += f; x += (v0.x + v1.x) * f; y += (v0.y + v1.y) * f
  })
  const s6 = 1 / (3 * a)
  return new Pt(s6 * x, s6 * y)
}

// ─── Vertex / edge iteration ──────────────────────────────────────────────────

export function polyForEdge(p: Polygon, f: (a: Pt, b: Pt) => void): void {
  const n = p.length
  for (let i = 0; i < n; i++) f(p[i], p[(i + 1) % n])
}

/** Like forEdge but skips the closing edge (last→first). */
export function polyForSegment(p: Polygon, f: (a: Pt, b: Pt) => void): void {
  for (let i = 0; i < p.length - 1; i++) f(p[i], p[i + 1])
}

// ─── Vertex lookup (by reference) ─────────────────────────────────────────────

export function polyContains(p: Polygon, v: Pt): boolean { return p.indexOf(v) !== -1 }

export function polyNext(p: Polygon, v: Pt): Pt { return p[(p.indexOf(v) + 1) % p.length] }
export function polyPrev(p: Polygon, v: Pt): Pt { return p[(p.indexOf(v) + p.length - 1) % p.length] }

export function polyVector(p: Polygon, v: Pt): Pt { return polyNext(p, v).subtract(v) }
export function polyVectori(p: Polygon, i: number): Pt {
  return p[i === p.length - 1 ? 0 : i + 1].subtract(p[i])
}

/** Returns index of edge (a→b) or -1. */
export function polyFindEdge(p: Polygon, a: Pt, b: Pt): number {
  const idx = p.indexOf(a)
  return idx !== -1 && p[(idx + 1) % p.length] === b ? idx : -1
}

/** Min distance from any vertex to point p (not true polygon distance). */
export function polyDistance(p: Polygon, pt: Pt): number {
  let d = Pt.distance(p[0], pt)
  for (let i = 1; i < p.length; i++) { const d1 = Pt.distance(p[i], pt); if (d1 < d) d = d1 }
  return d
}

/** Inverse-distance weighted interpolation weights for point pt against all vertices. */
export function polyInterpolate(p: Polygon, pt: Pt): number[] {
  let sum = 0
  const dd = p.map(v => { const d = 1 / Pt.distance(v, pt); sum += d; return d })
  return dd.map(d => d / sum)
}

// ─── Convexity ────────────────────────────────────────────────────────────────

export function polyIsConvexVertex(p: Polygon, v: Pt): boolean {
  const v0 = polyPrev(p, v), v2 = polyNext(p, v)
  return cross(v.x - v0.x, v.y - v0.y, v2.x - v.x, v2.y - v.y) > 0
}

export function polyIsConvex(p: Polygon): boolean {
  for (const v of p) if (!polyIsConvexVertex(p, v)) return false
  return true
}

// ─── Smoothing ───────────────────────────────────────────────────────────────

export function polySmoothVertexEq(p: Polygon, f = 1): Polygon {
  const n = p.length
  let v1 = p[n - 1], v2 = p[0]
  const result: Polygon = []
  for (let i = 0; i < n; i++) {
    const v0 = v1; v1 = v2; v2 = p[(i + 1) % n]
    result.push(new Pt((v0.x + v1.x * f + v2.x) / (2 + f), (v0.y + v1.y * f + v2.y) / (2 + f)))
  }
  return result
}

// ─── Splitting ───────────────────────────────────────────────────────────────

export function polySpliti(p: Polygon, i1: number, i2: number): Polygon[] {
  if (i1 > i2) { const t = i1; i1 = i2; i2 = t }
  return [
    [...p.slice(i1, i2 + 1)],
    [...p.slice(i2), ...p.slice(0, i1 + 1)],
  ]
}

/** Peel off a strip of width d along the edge starting at vertex v1. Returns remaining polygon. */
export function polyPeel(p: Polygon, v1: Pt, d: number): Polygon {
  const i1 = p.indexOf(v1)
  const i2 = i1 === p.length - 1 ? 0 : i1 + 1
  const v2 = p[i2]
  const v  = v2.subtract(v1)
  const n  = v.rotate90().norm(d)
  return polyCut(p, v1.add(n), v2.add(n), 0)[0]
}

/**
 * Cut polygon along the infinite line through p1→p2.
 * Returns two halves. If gap > 0, each half is peeled back by gap/2 along the cut edge.
 * Returns [original] if the line doesn't cross the polygon twice.
 */
export function polyCut(p: Polygon, p1: Pt, p2: Pt, gap = 0): Polygon[] {
  const x1 = p1.x, y1 = p1.y
  const dx1 = p2.x - x1, dy1 = p2.y - y1
  const n = p.length
  let edge1 = 0, ratio1 = 0, edge2 = 0, ratio2 = 0, count = 0

  for (let i = 0; i < n; i++) {
    const v0 = p[i], v1 = p[(i + 1) % n]
    const t = intersectLines(x1, y1, dx1, dy1, v0.x, v0.y, v1.x - v0.x, v1.y - v0.y)
    if (t && t.y >= 0 && t.y <= 1) {
      if (count === 0) { edge1 = i; ratio1 = t.x } else { edge2 = i; ratio2 = t.x }
      count++
    }
  }

  if (count >= 2) {
    const point1 = new Pt(x1 + dx1 * ratio1, y1 + dy1 * ratio1)
    const point2 = new Pt(x1 + dx1 * ratio2, y1 + dy1 * ratio2)

    let half1: Polygon = [...p.slice(edge1 + 1, edge2 + 1)]
    half1.unshift(point1); half1.push(point2)

    let half2: Polygon = [...p.slice(edge2 + 1), ...p.slice(0, edge1 + 1)]
    half2.unshift(point2); half2.push(point1)

    if (gap > 0) {
      half1 = polyPeel(half1, point2, gap / 2)
      half2 = polyPeel(half2, point1, gap / 2)
    }

    const v = polyVectori(p, edge1)
    return cross(dx1, dy1, v.x, v.y) > 0 ? [half1, half2] : [half2, half1]
  }
  return [[...p]]
}

// ─── Shrink (for convex polygons — reliable, changes vertex count) ─────────────

export function polyShrink(p: Polygon, d: number[]): Polygon {
  let q: Polygon = [...p]
  let i = 0
  polyForEdge(p, (v1, v2) => {
    const dd = d[i++]
    if (dd > 0) {
      const v  = v2.subtract(v1)
      const nn = v.rotate90().norm(dd)
      q = polyCut(q, v1.add(nn), v2.add(nn), 0)[0]
    }
  })
  return q
}

export function polyShrinkEq(p: Polygon, d: number): Polygon {
  return polyShrink(p, p.map(() => d))
}

// ─── Buffer (for concave polygons — more reliable, changes vertex count) ───────

export function polyBuffer(p: Polygon, d: number[]): Polygon {
  // Build a polygon with offset edges (may be self-intersecting)
  const q: Polygon = []
  let i = 0
  polyForEdge(p, (v0, v1) => {
    const dd = d[i++]
    if (dd === 0) { q.push(v0); q.push(v1) }
    else {
      const v  = v1.subtract(v0)
      const nn = v.rotate90().norm(dd)
      q.push(v0.add(nn)); q.push(v1.add(nn))
    }
  })

  // Resolve self-intersections by finding and inserting crossing points
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

  // Pick the largest sub-polygon (by area)
  const regular = q.map((_, idx) => idx)
  let bestPart: Polygon = []
  let bestSq = -Infinity

  while (regular.length > 0) {
    const indices: number[] = []
    const start = regular[0]
    let idx = start
    do {
      indices.push(idx)
      regular.splice(regular.indexOf(idx), 1)
      const next = (idx + 1) % q.length
      const v    = q[next]
      let next1  = q.indexOf(v)
      if (next1 === next) next1 = q.lastIndexOf(v)
      idx = next1 === -1 ? next : next1
    } while (idx !== start)

    const part: Polygon = indices.map(k => q[k])
    const s = Math.abs(polySquare(part))
    if (s > bestSq) { bestPart = part; bestSq = s }
  }
  return bestPart
}

export function polyBufferEq(p: Polygon, d: number): Polygon {
  return polyBuffer(p, p.map(() => d))
}

// ─── Borders ──────────────────────────────────────────────────────────────────

export function polyBorders(p: Polygon, other: Polygon): boolean {
  const n1 = p.length, n2 = other.length
  for (let i = 0; i < n1; i++) {
    const j = other.indexOf(p[i])
    if (j !== -1) {
      const next = p[(i + 1) % n1]
      if (next === other[(j + 1) % n2] || next === other[(j + n2 - 1) % n2]) return true
    }
  }
  return false
}

// ─── Bounding box ────────────────────────────────────────────────────────────

export function polyGetBounds(p: Polygon): { left: number; right: number; top: number; bottom: number } {
  let left = p[0].x, right = p[0].x, top = p[0].y, bottom = p[0].y
  for (const v of p) {
    left   = Math.min(left,   v.x)
    right  = Math.max(right,  v.x)
    top    = Math.min(top,    v.y)
    bottom = Math.max(bottom, v.y)
  }
  return { left, right, top, bottom }
}

// ─── Static constructors ─────────────────────────────────────────────────────

export function polyRect(w = 1, h = 1): Polygon {
  return [new Pt(-w / 2, -h / 2), new Pt(w / 2, -h / 2), new Pt(w / 2, h / 2), new Pt(-w / 2, h / 2)]
}

export function polyRegular(n = 8, r = 1): Polygon {
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2
    return new Pt(r * Math.cos(a), r * Math.sin(a))
  })
}
