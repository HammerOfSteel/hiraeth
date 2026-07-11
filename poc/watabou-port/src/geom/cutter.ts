/**
 * Cutter — port of com.watabou.geom.Cutter.hx
 *
 * Recursive polygon splitting used by Ward.createAlleys() to subdivide
 * city blocks into individual building lots.
 */
import { Pt } from '../geom/pt'
import { type Polygon, polyCut, polyMax, polySquare } from '../geom/polygon'
import { interpolate } from '../geom/geomUtils'

// ─── bisect ───────────────────────────────────────────────────────────────────

/**
 * Cut the polygon once, at `ratio` along the edge starting at `vertex`,
 * rotated by `angle` (radians) from the edge direction, with `gap` strip.
 *
 * Returns two halves (or one if no cut could be made).
 */
export function bisect(
  poly: Polygon,
  vertex: Pt,
  ratio: number,
  angle: number,
  gap: number,
): Polygon[] {
  const next = poly[(poly.indexOf(vertex) + 1) % poly.length]
  const p = interpolate(vertex, next, ratio)

  const d = next.subtract(vertex)
  const cosB = Math.cos(angle), sinB = Math.sin(angle)
  const c1 = new Pt(d.x * cosB - d.y * sinB, d.y * cosB + d.x * sinB)

  return polyCut(poly, p.subtract(c1), p.add(c1), gap)
}

// ─── radial ───────────────────────────────────────────────────────────────────

/**
 * Fan-cut from `center` to every vertex of `poly`, with `gap` strips.
 * Produces n triangular/wedge sectors.
 */
export function radial(poly: Polygon, center: Pt, gap: number): Polygon[] {
  const result: Polygon[] = []
  const n = poly.length

  for (let i = 0; i < n; i++) {
    const v1 = poly[i], v2 = poly[(i + 1) % n]
    if (gap > 0) {
      const half = polyCut(poly, v1, center, gap)
      if (half.length === 2) result.push(half[0])
      else result.push([v1, v2, center.clone()])
    } else {
      result.push([v1, v2, center.clone()])
    }
  }
  return result
}

// ─── semiRadial ───────────────────────────────────────────────────────────────

/**
 * Half fan: cut from center to each vertex only on one side.
 */
export function semiRadial(poly: Polygon, center: Pt, gap: number): Polygon[] {
  return radial(poly, center, gap).slice(0, Math.ceil(poly.length / 2))
}

// ─── ring ─────────────────────────────────────────────────────────────────────

/**
 * Ring of polygons along the perimeter of `poly`.
 * `thickness` = approximate inward depth of each ring cell.
 */
export function ring(poly: Polygon, thickness: number): Polygon[] {
  const cells: Polygon[] = []
  const n = poly.length

  for (let i = 0; i < n; i++) {
    const a0 = poly[i], b0 = poly[(i + 1) % n]
    const v  = b0.subtract(a0).rotate90().norm(thickness)
    const a1 = a0.add(v), b1 = b0.add(v)
    cells.push([a0, b0, b1, a1])
  }
  return cells
}

// ─── createAlleys ─────────────────────────────────────────────────────────────

/**
 * Recursive polygon splitting for building lots.
 * Direct port of Ward.createAlleys() from Watabou/TownGeneratorOS.
 *
 * @param poly      polygon to subdivide (should be pre-inset from patch boundary)
 * @param minSq     minimum lot area before stopping
 * @param gridChaos [0..1] variance in split position
 * @param sizeChaos [0..1] variance in lot size
 * @param gap       alley gap width between buildings (default 0.6 = Ward.ALLEY)
 * @param rng       random function [0..1)
 * @returns         array of leaf polygons (lots)
 */
export function createAlleys(
  poly: Polygon,
  minSq: number,
  gridChaos: number,
  sizeChaos: number,
  rng: () => number,
  gap = 0.6,
): Polygon[] {
  const sq = Math.abs(polySquare(poly))

  // Stopping condition: too small to split further
  const sizeVariance = Math.pow(2, 4 * sizeChaos * (rng() - 0.5))
  if (sq < minSq * sizeVariance) {
    return [poly]
  }

  // Find the longest edge
  let longestLen = 0, longestIdx = 0
  const n = poly.length
  for (let i = 0; i < n; i++) {
    const len = Pt.distance(poly[i], poly[(i + 1) % n])
    if (len > longestLen) { longestLen = len; longestIdx = i }
  }

  // Choose a split ratio biased toward 0.5
  const spread = 0.8 * gridChaos
  const ratio  = (1 - spread) / 2 + rng() * spread

  // Small angular jitter (kept small on near-minimum-size polys)
  const angleSpread = (Math.PI / 6) * gridChaos * (sq < minSq * 4 ? 0 : 1)
  const angle = (rng() - 0.5) * angleSpread

  const halves = bisect(poly, poly[longestIdx], ratio, angle, gap)
  if (halves.length < 2) return [poly]

  return [
    ...createAlleys(halves[0], minSq, gridChaos, sizeChaos, rng, gap),
    ...createAlleys(halves[1], minSq, gridChaos, sizeChaos, rng, gap),
  ]
}

// ─── buildingGrid ─────────────────────────────────────────────────────────────

/**
 * Subdivide a convex polygon into building-sized rectangles aligned to its
 * longest side.  Port of Ward.createOrthoBuilding().
 *
 * @param poly        lot polygon
 * @param minBlockSq  minimum sub-lot area
 * @param rng         random [0..1)
 * @returns           array of sub-polygons
 */
export function buildingGrid(
  poly: Polygon,
  minBlockSq: number,
): Polygon[] {
  // Find the best "axis" vertex (most convex, on longest wall)
  const longestEdgeVtx = polyMax(poly, v => {
    const next = poly[(poly.indexOf(v) + 1) % poly.length]
    return Pt.distance(v, next)
  })

  // Repeatedly bisect
  let parts: Polygon[] = [poly]
  for (let i = 0; i < 4; i++) {
    const next: Polygon[] = []
    for (const p of parts) {
      if (Math.abs(polySquare(p)) < 2 * minBlockSq) { next.push(p); continue }
      const halves = bisect(p, polyMax(p, (v: Pt) => Pt.distance(v, longestEdgeVtx)), 0.5, 0, 0)
      next.push(...halves)
    }
    if (next.length === parts.length) break
    parts = next
  }

  return parts
}
