// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.building.Cutter

import { Pt } from '../geom/pt'
import { type Polygon, polyNext, polyCut, polyForEdge, polyShrink, polyCentroid } from '../geom/polygon'

/**
 * Cut a polygon in half along a line through a point on the longest edge at `ratio`,
 * rotated by `angle` radians. Gap creates an alley between the halves.
 */
export function bisect(poly: Polygon, vertex: Pt, ratio = 0.5, angle = 0, gap = 0): Polygon[] {
  const next = polyNext(poly, vertex)
  const p1   = new Pt(vertex.x + (next.x - vertex.x) * ratio, vertex.y + (next.y - vertex.y) * ratio)
  const d    = next.subtract(vertex)
  const cosB = Math.cos(angle), sinB = Math.sin(angle)
  const vx   = d.x * cosB - d.y * sinB
  const vy   = d.y * cosB + d.x * sinB
  const p2   = new Pt(p1.x - vy, p1.y + vx)
  return polyCut(poly, p1, p2, gap)
}

/** Divide a polygon into triangular sectors radiating from a center point. */
export function radial(poly: Polygon, center: Pt | null = null, gap = 0): Polygon[] {
  const c = center ?? polyCentroid(poly)
  const sectors: Polygon[] = []
  polyForEdge(poly, (v0, v1) => {
    let sector: Polygon = [c, v0, v1]
    if (gap > 0) sector = polyShrink(sector, [gap / 2, 0, gap / 2])
    sectors.push(sector)
  })
  return sectors
}

/** Like radial but from the nearest vertex to the centroid (semi-radial). */
export function semiRadial(poly: Polygon, center: Pt | null = null, gap = 0): Polygon[] {
  let c: Pt
  if (center == null) {
    const centroid = polyCentroid(poly)
    let minD = Infinity
    c = poly[0]
    for (const v of poly) { const d = Pt.distance(v, centroid); if (d < minD) { minD = d; c = v } }
  } else {
    c = center
  }

  const halfGap = gap / 2
  const sectors: Polygon[] = []
  polyForEdge(poly, (v0, v1) => {
    if (v0 !== c && v1 !== c) {
      let sector: Polygon = [c, v0, v1]
      if (gap > 0) {
        const d: number[] = [
          poly.findIndex((_, i) => poly[i] === c && poly[(i + 1) % poly.length] === v0) === -1 ? halfGap : 0,
          0,
          poly.findIndex((_, i) => poly[i] === v1 && poly[(i + 1) % poly.length] === c) === -1 ? halfGap : 0,
        ]
        sector = polyShrink(sector, d)
      }
      sectors.push(sector)
    }
  })
  return sectors
}

/** Slice a ring of given thickness off each edge (shortest edges first). */
export function ring(poly: Polygon, thickness: number): Polygon[] {
  const slices: Array<{ p1: Pt; p2: Pt; len: number }> = []
  polyForEdge(poly, (v1, v2) => {
    const v  = v2.subtract(v1)
    const nn = v.rotate90().norm(thickness)
    slices.push({ p1: v1.add(nn), p2: v2.add(nn), len: v.length })
  })
  slices.sort((a, b) => a.len - b.len)

  const peel: Polygon[] = []
  let p: Polygon = [...poly]
  for (const sl of slices) {
    const halves = polyCut(p, sl.p1, sl.p2)
    p = halves[0]
    if (halves.length === 2) peel.push(halves[1])
  }
  return peel
}


