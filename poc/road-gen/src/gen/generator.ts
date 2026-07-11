/**
 * Road generator — the full pipeline:
 *   1. Build water cost map (rivers + lake); store river paths for smooth rendering
 *   2. Build tensor field (grid + radial + noise basis)
 *   3. Trace spine roads through centre, then arterials, then residential branches
 *   4. Generate building lots ALONGSIDE road segments (not via grid scan)
 */

import { seededRng, v2, buildTensorField } from './math'
import { astar } from './astar'
import type { Vec2, Segment, Lot, LotType, Bridge, RiverPath, GeneratedWorld, GenParams } from './types'

// ─── Constants ────────────────────────────────────────────────────────────────
const ROAD_SNAP_DIST  = 16   // snap to nearby road endpoint
const MIN_SEG_LEN     = 6
const ASTAR_GRID      = 128

// ─── Helpers ──────────────────────────────────────────────────────────────────
function worldToGrid(v: Vec2, mapSize: number): { col: number; row: number } {
  return {
    col: Math.max(0, Math.min(ASTAR_GRID-1, Math.round((v.x/mapSize+0.5)*(ASTAR_GRID-1)))),
    row: Math.max(0, Math.min(ASTAR_GRID-1, Math.round((v.y/mapSize+0.5)*(ASTAR_GRID-1)))),
  }
}

function gridToWorld(col: number, row: number, mapSize: number): Vec2 {
  return {
    x: (col/(ASTAR_GRID-1) - 0.5) * mapSize,
    y: (row/(ASTAR_GRID-1) - 0.5) * mapSize,
  }
}

function costAt(pt: Vec2, costMap: Float32Array, mapSize: number): number {
  const { col, row } = worldToGrid(pt, mapSize)
  return costMap[row * ASTAR_GRID + col] ?? 1
}

/** Nearest point on segment AB to point P, plus distance */
function nearestOnSegment(p: Vec2, a: Vec2, b: Vec2): { pt: Vec2; dist: number } {
  const ab = v2.sub(b, a)
  const len2 = v2.dot(ab, ab)
  if (len2 < 0.001) return { pt: a, dist: v2.dist(p, a) }
  const t = Math.max(0, Math.min(1, v2.dot(v2.sub(p, a), ab) / len2))
  const pt = v2.add(a, v2.scale(ab, t))
  return { pt, dist: v2.dist(p, pt) }
}

function buildWaterMap(
  rng: () => number,
  mapSize: number,
  waterAmount: number,
): { costMap: Float32Array; rivers: RiverPath[] } {
  const g    = ASTAR_GRID
  const map  = new Float32Array(g * g).fill(1)
  const half = mapSize / 2
  const rivers: RiverPath[] = []

  const riverCount = Math.floor(rng() * 2) + 1
  for (let r = 0; r < riverCount; r++) {
    const startSide = Math.floor(rng() * 4)
    let sx: number, sy: number, ex: number, ey: number
    if (startSide === 0)      { sx = rng()*mapSize-half; sy = -half; ex = rng()*mapSize-half; ey = half }
    else if (startSide === 1) { sx = half; sy = rng()*mapSize-half; ex = -half; ey = rng()*mapSize-half }
    else if (startSide === 2) { sx = rng()*mapSize-half; sy = half;  ex = rng()*mapSize-half; ey = -half }
    else                      { sx = -half; sy = rng()*mapSize-half; ex = half; ey = rng()*mapSize-half }

    const cx1 = (rng()-0.5)*mapSize*0.55, cy1 = (rng()-0.5)*mapSize*0.55
    const cx2 = (rng()-0.5)*mapSize*0.55, cy2 = (rng()-0.5)*mapSize*0.55
    const width = (4 + rng() * 8) * waterAmount

    const riverPts: Vec2[] = []
    for (let i = 0; i < 200; i++) {
      const t  = i / 199
      const mt = 1 - t
      const bx = mt*mt*mt*sx + 3*mt*mt*t*cx1 + 3*mt*t*t*cx2 + t*t*t*ex
      const by = mt*mt*mt*sy + 3*mt*mt*t*cy1 + 3*mt*t*t*cy2 + t*t*t*ey
      if (i % 3 === 0) riverPts.push({ x: bx, y: by })

      const col = Math.round((bx/mapSize + 0.5) * (g-1))
      const row = Math.round((by/mapSize + 0.5) * (g-1))
      const r2  = Math.ceil(width)
      for (let dr = -r2; dr <= r2; dr++) {
        for (let dc = -r2; dc <= r2; dc++) {
          const nc = col+dc, nr = row+dr
          if (nc < 0 || nc >= g || nr < 0 || nr >= g) continue
          const d = Math.sqrt(dc*dc + dr*dr)
          if (d <= width) {
            map[nr*g+nc] = Math.max(map[nr*g+nc], d < width * 0.6 ? 1000 : 6)
          }
        }
      }
    }
    rivers.push({ pts: riverPts, width })
  }

  // Optional lake
  if (rng() > 0.5) {
    const lx    = ((rng()*0.5+0.1) - 0.5) * mapSize
    const ly    = ((rng()*0.5+0.1) - 0.5) * mapSize
    const lr    = (8 + rng() * 18) * waterAmount
    const lc    = Math.round((lx/mapSize+0.5)*(g-1))
    const lrow  = Math.round((ly/mapSize+0.5)*(g-1))
    const cellR = Math.round(lr / mapSize * g)

    const lakePts: Vec2[] = []
    const nPts = 36
    for (let i = 0; i <= nPts; i++) {
      const a  = (i / nPts) * Math.PI * 2
      const pr = lr * (0.75 + rng() * 0.5)
      lakePts.push({ x: lx + Math.cos(a) * pr, y: ly + Math.sin(a) * pr })
    }

    for (let dr = -cellR-2; dr <= cellR+2; dr++) {
      for (let dc = -cellR-2; dc <= cellR+2; dc++) {
        const nc = lc+dc, nr = lrow+dr
        if (nc<0||nc>=g||nr<0||nr>=g) continue
        const d = Math.sqrt(dc*dc+dr*dr)
        if (d <= cellR) map[nr*g+nc] = 1000
        else if (d <= cellR+2) map[nr*g+nc] = Math.max(map[nr*g+nc], 6)
      }
    }
    rivers.push({ pts: lakePts, width: lr })
  }

  return { costMap: map, rivers }
}

function traceRoad(
  start: Vec2,
  theta: number,
  stepLen: number,
  steps: number,
  costMap: Float32Array,
  mapSize: number,
  field: ReturnType<typeof buildTensorField>,
  existingSegs: Segment[],
  rng: () => number,
  noise: number,
  _type: 'arterial' | 'residential',
): Vec2[] {
  const pts: Vec2[] = [{ ...start }]
  let cur   = { ...start }
  let angle = theta
  const half = mapSize / 2 - 5

  for (let i = 0; i < steps; i++) {
    const ft   = field.sample(cur.x, cur.y)
    const diff = ((ft - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI
    angle += Math.min(0.25, Math.abs(diff)) * Math.sign(diff)
    angle += (rng() - 0.5) * noise * 0.35

    const next: Vec2 = {
      x: cur.x + Math.cos(angle) * stepLen,
      y: cur.y + Math.sin(angle) * stepLen,
    }

    if (Math.abs(next.x) > half || Math.abs(next.y) > half) break
    if (costAt(next, costMap, mapSize) > 100) break

    // Snap to nearby road — endpoints OR body of segment
    let snapped = false
    let bestDist = ROAD_SNAP_DIST
    let bestPt: Vec2 | null = null
    for (const seg of existingSegs) {
      // endpoint snap (larger radius)
      for (const ep of [seg.a, seg.b]) {
        const d = v2.dist(next, ep)
        if (d < bestDist) { bestDist = d; bestPt = ep }
      }
      // body snap (smaller radius — avoid snapping to our own parent road)
      const { pt, dist } = nearestOnSegment(next, seg.a, seg.b)
      if (dist < ROAD_SNAP_DIST * 0.55 && dist < bestDist) {
        bestDist = dist; bestPt = pt
      }
    }
    if (bestPt) { pts.push({ ...bestPt }); snapped = true }
    if (snapped) break

    pts.push(next)
    cur = next
  }
  return pts
}

// ─── Union-Find for connectivity repair ───────────────────────────────────────
class UnionFind {
  private p: number[]
  private rank: number[]
  constructor(n: number) {
    this.p    = Array.from({ length: n }, (_, i) => i)
    this.rank = new Array(n).fill(0)
  }
  find(x: number): number {
    if (this.p[x] !== x) this.p[x] = this.find(this.p[x])
    return this.p[x]
  }
  union(x: number, y: number): void {
    const px = this.find(x), py = this.find(y)
    if (px === py) return
    if (this.rank[px] < this.rank[py]) this.p[px] = py
    else if (this.rank[px] > this.rank[py]) this.p[py] = px
    else { this.p[py] = px; this.rank[px]++ }
  }
}

/**
 * Post-process connectivity repair.
 * Finds segments not reachable from the highway and stitches them back
 * with a short organic connector road.  Up to 5 orphaned components bridged.
 */
function ensureConnectivity(segments: Segment[], mapSize: number, rng: () => number): Segment[] {
  if (segments.length === 0) return []
  const hwSeg = segments.find(s => s.type === 'highway')
  if (!hwSeg) return []

  const SNAP = 8
  const keyToId = new Map<string, number>()
  const nodePos: Vec2[] = []

  const getNode = (v: Vec2): number => {
    const k = `${Math.round(v.x/SNAP)},${Math.round(v.y/SNAP)}`
    if (!keyToId.has(k)) { keyToId.set(k, nodePos.length); nodePos.push(v) }
    return keyToId.get(k)!
  }

  const buildUF = (allSegs: Segment[]) => {
    for (const s of allSegs) { getNode(s.a); getNode(s.b) }
    const uf = new UnionFind(nodePos.length)
    for (const s of allSegs) uf.union(getNode(s.a), getNode(s.b))
    return uf
  }

  const added: Segment[] = []

  for (let pass = 0; pass < 6; pass++) {
    const allSegs = [...segments, ...added]
    const uf      = buildUF(allSegs)
    const hwRoot  = uf.find(getNode(hwSeg.a))

    // Find the orphan endpoint closest to any connected segment
    let bestDist    = Infinity
    let orphanPt:  Vec2 | null = null
    let targetPt:  Vec2 | null = null

    for (const seg of allSegs) {
      if (uf.find(getNode(seg.a)) === hwRoot) continue     // already connected
      for (const ep of [seg.a, seg.b]) {
        for (const cSeg of allSegs) {
          if (uf.find(getNode(cSeg.a)) !== hwRoot) continue // skip disconnected
          const { pt, dist } = nearestOnSegment(ep, cSeg.a, cSeg.b)
          if (dist < bestDist) { bestDist = dist; orphanPt = ep; targetPt = pt }
        }
      }
    }

    if (!orphanPt || !targetPt || bestDist > mapSize * 0.8) break

    // Organic connector: add a noisy midpoint for longer bridges
    if (bestDist > 20) {
      const mid: Vec2 = {
        x: (orphanPt.x + targetPt.x) / 2 + (rng()-0.5) * bestDist * 0.28,
        y: (orphanPt.y + targetPt.y) / 2 + (rng()-0.5) * bestDist * 0.28,
      }
      added.push({ a: orphanPt, b: mid, type: 'arterial' })
      added.push({ a: mid, b: targetPt, type: 'arterial' })
    } else {
      added.push({ a: orphanPt, b: targetPt, type: 'arterial' })
    }
  }

  return added
}

function polylineToSegments(pts: Vec2[], type: Segment['type']): Segment[] {
  const segs: Segment[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    if (v2.dist(pts[i], pts[i+1]) >= MIN_SEG_LEN) {
      segs.push({ a: pts[i], b: pts[i+1], type })
    }
  }
  return segs
}

/**
 * Watabou technique: Chaikin-style 3-tap weighted vertex averaging.
 * Removes jagged 8-directional A* stepping and smooths traced roads.
 * End-points are pinned so roads still meet their source/destination exactly.
 *   weight: centre vertex gets 2×, neighbours get 1× each  → w=(1,2,1)/4
 */
function smoothPolyline(pts: Vec2[], passes = 2): Vec2[] {
  if (pts.length < 3) return pts
  let cur = [...pts]
  for (let p = 0; p < passes; p++) {
    const next: Vec2[] = [cur[0]]
    for (let i = 1; i < cur.length - 1; i++) {
      next.push({
        x: (cur[i-1].x + 2 * cur[i].x + cur[i+1].x) / 4,
        y: (cur[i-1].y + 2 * cur[i].y + cur[i+1].y) / 4,
      })
    }
    next.push(cur[cur.length - 1])
    cur = next
  }
  return cur
}

// ─── Lots alongside road segments ────────────────────────────────────────────
function shrinkPolygon(poly: Vec2[], amount: number): Vec2[] {
  const cx = poly.reduce((s,p) => s+p.x, 0) / poly.length
  const cy = poly.reduce((s,p) => s+p.y, 0) / poly.length
  return poly.map(p => ({
    x: p.x + (cx - p.x) * amount,
    y: p.y + (cy - p.y) * amount,
  }))
}

function generateRoadLots(
  seg: Segment,
  costMap: Float32Array,
  mapSize: number,
  lotShrink: number,
): Lot[] {
  const lots: Lot[] = []
  // Highways generate wider lots (shops/commercial strips) on both sides
  const isHighway      = seg.type === 'highway'
  const isArterial     = seg.type === 'arterial' || isHighway
  const spacing        = isHighway ? 16 : isArterial ? 14 : 11
  const depth          = isHighway ? 20 : isArterial ? 18 : 13
  const roadHalfWidth  = isHighway ? 7  : isArterial ? 5  : 3.5

  const dir  = v2.norm(v2.sub(seg.b, seg.a))
  const perp = v2.perp(dir)
  const len  = v2.dist(seg.a, seg.b)
  const n    = Math.floor(len / spacing)
  if (n < 1) return lots

  for (let i = 0; i < n; i++) {
    const t   = (i + 0.5) / n
    const mid = v2.lerp(seg.a, seg.b, t)
    const hw  = spacing * 0.43

    for (const side of [1, -1]) {
      const inner = v2.add(mid, v2.scale(perp, side * (roadHalfWidth + 0.5)))
      const outer = v2.add(mid, v2.scale(perp, side * (roadHalfWidth + depth)))
      const lotCentre = v2.lerp(inner, outer, 0.5)

      if (costAt(lotCentre, costMap, mapSize) > 20) continue
      const halfMap = mapSize / 2 - 4
      if (Math.abs(lotCentre.x) > halfMap || Math.abs(lotCentre.y) > halfMap) continue

      const poly: Vec2[] = [
        v2.add(inner, v2.scale(dir, -hw)),
        v2.add(inner, v2.scale(dir,  hw)),
        v2.add(outer, v2.scale(dir,  hw)),
        v2.add(outer, v2.scale(dir, -hw)),
      ]
      lots.push({ polygon: shrinkPolygon(poly, lotShrink), blockId: -1, type: 'residential' })
    }
  }
  return lots
}

// ─── Town Core ────────────────────────────────────────────────────────────────

/**
 * Non-uniform grid line positions (Watabou spiral inspiration):
 * Returns (2n+1) sorted positions centred at 0.
 * Inner spacings are ~70% of base; outer spacings are ~130%.
 * This replicates Watabou's sqrt(i) spiral: dense urban core, sparser outskirts.
 */
function coreGridPositions(n: number, baseSpacing: number): number[] {
  const pos = new Array<number>(2 * n + 1)
  pos[n] = 0
  for (let i = 1; i <= n; i++) {
    const scale = 0.70 + (i / n) * 0.60   // 0.70 → 1.30 as we move outward
    const step  = baseSpacing * scale
    pos[n + i] = pos[n + i - 1] + step
    pos[n - i] = pos[n - i + 1] - step
  }
  return pos
}

/**
 * Find the point on the highway closest to the map centre.
 * This becomes the "hub" — the town centre seed all arterials converge on.
 */
function findTownCenter(hwSegs: Segment[]): Vec2 {
  let best: Vec2 = { x: 0, y: 0 }
  let bestDist   = Infinity
  for (const seg of hwSegs) {
    for (let t = 0; t <= 1; t += 0.05) {
      const pt = v2.lerp(seg.a, seg.b, t)
      const d  = Math.sqrt(pt.x*pt.x + pt.y*pt.y)
      if (d < bestDist) { bestDist = d; best = { ...pt } }
    }
  }
  return best
}

/**
 * Generate a regular grid of "collector" streets around the town centre.
 * Rotated to align with the highway and jittered for an organic feel.
 * Gemini Phase B: The Subdivider.
 */
function generateCoreGrid(
  center:  Vec2,
  spacing: number,
  n:       number,
  hwAngle: number,    // rotate grid to align streets with the main road
  costMap: Float32Array,
  ms:      number,
  rng:     () => number,
): Segment[] {
  const segs    = [] as Segment[]
  const halfMap = ms / 2 - 6
  const JITTER  = spacing * 0.22   // up to 22% of spacing — makes it feel hand-drawn

  const bx = { x: Math.cos(hwAngle), y: Math.sin(hwAngle) }    // along highway
  const by = { x: -Math.sin(hwAngle), y: Math.cos(hwAngle) }   // perpendicular

  // Variable grid-line positions: denser at centre, sparser at edges.
  const xPos = coreGridPositions(n, spacing)
  const yPos = coreGridPositions(n, spacing)

  // Build a grid of slightly jittered intersection nodes in the rotated frame.
  // Edge nodes stay fixed so the block boundary is clean.
  const dim = 2*n + 1
  const nodes: Vec2[] = []
  for (let r = 0; r <= 2*n; r++) {
    for (let c = 0; c <= 2*n; c++) {
      const isEdge = r === 0 || r === 2*n || c === 0 || c === 2*n
      const jx = isEdge ? 0 : (rng()-0.5) * JITTER
      const jy = isEdge ? 0 : (rng()-0.5) * JITTER
      const lx = xPos[c] + jx, ly = yPos[r] + jy
      nodes[r*dim + c] = {
        x: center.x + lx * bx.x + ly * by.x,
        y: center.y + lx * bx.y + ly * by.y,
      }
    }
  }

  const at = (r: number, c: number) => nodes[r*dim + c]

  for (let r = 0; r <= 2*n; r++) {
    for (let c = 0; c < 2*n; c++) {
      const a = at(r, c), b = at(r, c+1)
      if (Math.abs(a.x) > halfMap || Math.abs(b.x) > halfMap) continue
      if (Math.abs(a.y) > halfMap || Math.abs(b.y) > halfMap) continue
      if (costAt(a, costMap, ms) > 50 || costAt(b, costMap, ms) > 50) continue
      segs.push({ a, b, type: 'arterial' })
    }
  }

  for (let c = 0; c <= 2*n; c++) {
    for (let r = 0; r < 2*n; r++) {
      const a = at(r, c), b = at(r+1, c)
      if (Math.abs(a.x) > halfMap || Math.abs(b.x) > halfMap) continue
      if (Math.abs(a.y) > halfMap || Math.abs(b.y) > halfMap) continue
      if (costAt(a, costMap, ms) > 50 || costAt(b, costMap, ms) > 50) continue
      segs.push({ a, b, type: 'arterial' })
    }
  }

  return segs
}

/**
 * Watabou's `createAlleys` translated to axis-aligned rectangles.
 *
 * Recursively bisects a rectangle into lots:
 *  - Cuts are along the LONGEST axis (like finding the longest edge in the Haxe code)
 *  - `chaos` ∈ [0,1] controls how off-centre the cut falls (0 = near 50%, 1 = wild)
 *  - Returns array of [x0, y0, x1, y1] quads in local grid space
 */
function subdivideRect(
  x0: number, y0: number, x1: number, y1: number,
  minArea: number, chaos: number, rng: () => number,
  depth = 0,
): [number, number, number, number][] {
  const w = x1 - x0, h = y1 - y0
  if (w * h <= minArea || depth > 5) return [[x0, y0, x1, y1]]

  const spread = 0.75 * chaos
  const ratio  = (1 - spread) / 2 + rng() * spread   // near 0.5 when ordered, wilder when chaotic
  const splitH = h >= w                                // split along longest dimension

  if (splitH) {
    const ys = y0 + h * ratio
    return [
      ...subdivideRect(x0, y0, x1, ys, minArea, chaos, rng, depth + 1),
      ...subdivideRect(x0, ys, x1, y1, minArea, chaos, rng, depth + 1),
    ]
  } else {
    const xs = x0 + w * ratio
    return [
      ...subdivideRect(x0, y0, xs, y1, minArea, chaos, rng, depth + 1),
      ...subdivideRect(xs, y0, x1, y1, minArea, chaos, rng, depth + 1),
    ]
  }
}

/**
 * Fill each grid block with recursively subdivided lots.
 * Replaces the old fixed 2×2 grid.
 * chaos grows with distance from town centre → core is orderly, outskirts organic.
 */
function coreBlockLots(
  center:    Vec2,
  spacing:   number,
  n:         number,
  hwAngle:   number,    // rotate lots to align with the highway grid
  lotShrink: number,
  costMap:   Float32Array,
  ms:        number,
  rng:       () => number,
): Lot[] {
  const lots    = [] as Lot[]
  const halfMap = ms / 2 - 4
  const inset   = 5.5

  const bx = { x: Math.cos(hwAngle), y: Math.sin(hwAngle) }
  const by = { x: -Math.sin(hwAngle), y: Math.cos(hwAngle) }
  const toWorld = (lx: number, ly: number): Vec2 => ({
    x: center.x + lx * bx.x + ly * by.x,
    y: center.y + lx * bx.y + ly * by.y,
  })

  // Use the same non-uniform grid positions as generateCoreGrid so lots fit their blocks.
  const xPos = coreGridPositions(n, spacing)
  const yPos = coreGridPositions(n, spacing)

  for (let bi = 0; bi < 2*n; bi++) {      // row index in 0-based grid
    for (let bj = 0; bj < 2*n; bj++) {   // col index
      const gx0 = xPos[bj],   gx1 = xPos[bj + 1]
      const gy0 = yPos[bi],   gy1 = yPos[bi + 1]
      const blockW = gx1 - gx0, blockH = gy1 - gy0
      const inner  = Math.min(blockW, blockH) - 2 * inset
      if (inner < 6) continue

      const x0 = gx0 + inset, y0 = gy0 + inset
      const x1 = gx0 + blockW - inset, y1 = gy0 + blockH - inset

      const bCW = toWorld((gx0+gx1)/2, (gy0+gy1)/2)
      if (costAt(bCW, costMap, ms) > 50) continue

      // chaos: ordered civic core → organic suburban edge
      const br = bi - n, bc = bj - n
      const blockDist = Math.sqrt(br*br + bc*bc) / Math.max(1, n)
      const chaos     = Math.min(1, 0.15 + blockDist * 0.75)

      const minLotArea = Math.pow(Math.min(blockW, blockH) * 0.28, 2)
      const rects = subdivideRect(x0, y0, x1, y1, minLotArea, chaos, rng)

      for (const [rx0, ry0, rx1, ry1] of rects) {
        const rw = rx1 - rx0, rh = ry1 - ry0
        const m  = Math.min(rw, rh) * Math.max(0.02, lotShrink * 0.5)
        const cW = toWorld((rx0+rx1)/2, (ry0+ry1)/2)

        if (Math.abs(cW.x) > halfMap || Math.abs(cW.y) > halfMap) continue
        if (costAt(cW, costMap, ms) > 20) continue

        lots.push({
          polygon: [
            toWorld(rx0+m, ry0+m),
            toWorld(rx1-m, ry0+m),
            toWorld(rx1-m, ry1-m),
            toWorld(rx0+m, ry1-m),
          ],
          blockId: bi * (2*n) + bj,
          type:    'residential',
        })
      }
    }
  }

  return lots
}

// ─── Lot type classification via influence ────────────────────────────────────
function classifyLot(
  c: Vec2,
  segments: Segment[],
  mapSize: number,
  rng: () => number,
): LotType {
  let minHighwayDist   = Infinity
  let minArterialDist  = Infinity  // highway or arterial
  let minAnyRoadDist   = Infinity

  for (const seg of segments) {
    const { dist } = nearestOnSegment(c, seg.a, seg.b)
    if (dist < minAnyRoadDist) minAnyRoadDist = dist
    if (seg.type === 'highway' && dist < minHighwayDist) minHighwayDist = dist
    if ((seg.type === 'highway' || seg.type === 'arterial') && dist < minArterialDist) minArterialDist = dist
  }

  const distFromCenter = Math.sqrt(c.x*c.x + c.y*c.y) / mapSize

  // ── Civic first — town centre buildings (church, school, pub, town hall)
  //    Civic lots are near the map centre, don't need to be on an arterial.
  if (distFromCenter < 0.22 && rng() < 0.09) return 'civic'

  // ── Green space — away from the major road network (parks, allotments, gardens)
  //    We compare to MAJOR roads only because every lot is near *some* road.
  //    Residential-only areas away from arterials and the highway qualify.
  if (minHighwayDist > 30 && minArterialDist > 22 && rng() < 0.22) return 'green'

  // ── Commercial — highway-strip shops, petrol stations, drive-throughs
  if (minHighwayDist < 24 && rng() < 0.55) return 'commercial'

  // ── Commercial — arterial frontage (local shops, takeaways)
  if (minArterialDist < 12 && rng() < 0.28) return 'commercial'

  return 'residential'
}

// ─── Main generation ─────────────────────────────────────────────────────────
export function generateWorld(params: GenParams): GeneratedWorld {
  const rng  = seededRng(params.seed)
  const ms   = params.mapSize
  const half = ms / 2

  // 1. Cost map + river paths
  const { costMap, rivers } = buildWaterMap(rng, ms, params.waterAmount)

  // 2. Tensor field
  const field = buildTensorField(
    [
      { kind: 'radial', cx: 0, cy: 0, strength: 0.25, angle: 0,           radius: ms * 0.35 },
      { kind: 'grid',   cx: 0, cy: 0, strength: 0.75, angle: rng() * 0.25, radius: ms },
      { kind: 'noise',  cx: 0, cy: 0, strength: params.gridNoise, angle: 0, radius: ms },
    ],
    ms,
    params.seed,
  )

  const segments: Segment[] = []

  // 3. Highway — A* from one map edge to the opposite, routing around water.
  //    This is the "main road" that connects the settlement to the outside world.
  {
    // Pick two opposing edge midpoints with slight random offset
    const axis = rng() < 0.5 ? 'h' : 'v'  // horizontal or vertical highway
    const offset = (rng() - 0.5) * ms * 0.35
    const entryPt: Vec2 = axis === 'h'
      ? { x: -half, y: offset }
      : { x: offset, y: -half }
    const exitPt: Vec2  = axis === 'h'
      ? { x:  half, y: offset + (rng()-0.5)*ms*0.25 }
      : { x: offset + (rng()-0.5)*ms*0.25, y: half }

    // Lower highway cost map (roads prefer to go along existing low-cost paths)
    const hwPath = astar(
      entryPt, exitPt,
      costMap, ms,
      (v) => worldToGrid(v, ms),
      (c, r) => gridToWorld(c, r, ms),
      ASTAR_GRID,
    )
    // Smooth 3 passes — removes the 8-directional A* staircase without
    // losing the natural curve imposed by water-cost routing.
    segments.push(...polylineToSegments(smoothPolyline(hwPath, 3), 'highway'))
  }

  // 4. Town centre — the "hub" where roads will converge.
  //    Placed at the point on the highway closest to the map origin.
  const townCenter = findTownCenter(segments.filter(s => s.type === 'highway'))

  // Compute the highway's overall bearing so the core grid aligns with the road.
  const hwSegsAll = segments.filter(s => s.type === 'highway')
  const hwAngle   = hwSegsAll.length >= 2
    ? Math.atan2(
        hwSegsAll[hwSegsAll.length-1].b.y - hwSegsAll[0].a.y,
        hwSegsAll[hwSegsAll.length-1].b.x - hwSegsAll[0].a.x,
      )
    : 0

  // 4b. Core grid — regular block streets around the town centre,
  //     aligned with the highway and organically jittered.
  const gridSpacing = params.majorSpacing * 1.15
  const gridN       = Math.max(2, Math.round(ms / 110))
  segments.push(...generateCoreGrid(townCenter, gridSpacing, gridN, hwAngle, costMap, ms, rng))

  // 5. Spine roads — two roads that converge on the town centre, creating the
  //    main "high street" crossroads typical of British market towns.
  const spineAngle = field.sample(0, 0)
  for (const dir of [spineAngle, spineAngle + Math.PI * 0.5]) {
    const from: Vec2 = {
      x: Math.cos(dir + Math.PI) * half * 0.82,
      y: Math.sin(dir + Math.PI) * half * 0.82,
    }
    // Point toward the town centre with more organic noise — roads should curve
    const toward = Math.atan2(townCenter.y - from.y, townCenter.x - from.x) + (rng()-0.5) * 0.5
    const pts = traceRoad(from, toward, params.majorSpacing * 0.45, 60, costMap, ms, field, segments, rng, 0.15, 'arterial')
    segments.push(...polylineToSegments(smoothPolyline(pts, 2), 'arterial'))
  }

  // 6. Arterial roads — MIXED strategy:
  //    60% from highway → aim toward town centre (convergent, guaranteed connected)
  //    40% from perimeter → aim toward town centre (coverage, DSU repairs any gap)
  //    All arterials CONVERGE on the town centre — Gemini's "Hub-First" paradigm.
  {
    const hwSegs = segments.filter(s => s.type === 'highway')
    const scale  = Math.max(1, ms / 300)
    const total  = Math.round(params.arterialCount * scale)
    const hwCount  = Math.ceil(total * 0.6)
    const rimCount = total - hwCount

    for (let i = 0; i < hwCount; i++) {
      if (hwSegs.length === 0) break
      const hwSeg  = hwSegs[Math.floor(rng() * hwSegs.length)]
      const origin = v2.lerp(hwSeg.a, hwSeg.b, rng())
      // Aim toward town centre with enough noise to stay organic
      const toward = Math.atan2(townCenter.y - origin.y, townCenter.x - origin.x) + (rng()-0.5) * 0.8
      const pts = traceRoad(
        origin, toward,
        params.majorSpacing * 0.42,
        Math.floor(ms / (params.majorSpacing * 0.42)) + 6,
        costMap, ms, field, segments, rng, 0.12, 'arterial',
      )
      segments.push(...polylineToSegments(smoothPolyline(pts, 1), 'arterial'))
    }

    for (let i = 0; i < rimCount; i++) {
      const angle  = (i / rimCount) * Math.PI * 2
      const dist   = half * (0.65 + rng() * 0.25)
      const start: Vec2 = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist }
      // Aim toward town centre (not just generic centre)
      const toward = Math.atan2(townCenter.y - start.y, townCenter.x - start.x) + (rng()-0.5) * 0.6
      const pts = traceRoad(
        start, toward,
        params.majorSpacing * 0.42,
        Math.floor(ms / (params.majorSpacing * 0.42)) + 6,
        costMap, ms, field, segments, rng, 0.12, 'arterial',
      )
      segments.push(...polylineToSegments(smoothPolyline(pts, 1), 'arterial'))
    }
  }

  // 7. Residential roads — branch perpendicular off arterials.
  //    Count scales with map area so bigger maps stay dense.
  const artSegs  = segments.filter(s => s.type === 'arterial')
  const resScale = Math.sqrt(ms / 250)   // √(area ratio) — avoids explosion on huge maps
  const resCount = Math.floor(params.arterialCount * 4 * params.residentialDensity * resScale)

  for (let i = 0; i < resCount; i++) {
    if (artSegs.length === 0) break
    const refSeg  = artSegs[Math.floor(rng() * artSegs.length)]
    const refPt   = rng() < 0.5 ? refSeg.a : refSeg.b
    const artAngle = Math.atan2(refSeg.b.y - refSeg.a.y, refSeg.b.x - refSeg.a.x)
    const branchAngle = artAngle + Math.PI * (rng() < 0.5 ? 0.5 : -0.5) + (rng()-0.5) * 0.5

    const start: Vec2 = {
      x: refPt.x + Math.cos(branchAngle) * params.majorSpacing * 0.5,
      y: refPt.y + Math.sin(branchAngle) * params.majorSpacing * 0.5,
    }
    if (costAt(start, costMap, ms) > 50) continue

    const pts = traceRoad(
      start, branchAngle,
      params.majorSpacing * 0.32,
      Math.floor(8 + rng() * 14),
      costMap, ms, field, segments, rng, params.gridNoise, 'residential',
    )
    segments.push(...polylineToSegments(pts, 'residential'))
  }

  // 8. Connectivity repair (unchanged).
  //    Any component not reachable from the highway gets a short connector road.
  //    Safety net for spine roads or any edge-case orphans.
  segments.push(...ensureConnectivity(segments, ms, rng))

  // 9. Lots alongside every road segment — with occupancy-grid overlap prevention.
  //    CELL = half the residential road half-width so lots on OPPOSITE sides of the
  //    same road never collide, while genuinely overlapping lots from two parallel
  //    roads are still rejected.  Only the centroid cell + direct neighbours (not
  //    the 3×3 box used before) are checked — this keeps density high.
  const lots: Lot[] = []
  const CELL = 4
  const occupied = new Set<string>()
  const lotKey = (p: Vec2) => `${Math.round(p.x/CELL)},${Math.round(p.y/CELL)}`
  const centroid = (poly: Vec2[]) => ({
    x: poly.reduce((s,p)=>s+p.x,0)/poly.length,
    y: poly.reduce((s,p)=>s+p.y,0)/poly.length,
  })

  // 9a. Core block lots (Gemini Phase B: fill blocks between grid roads)
  //     Added first so they claim the occupancy grid before suburban lots.
  for (const lot of coreBlockLots(townCenter, gridSpacing, gridN, hwAngle, params.lotShrink, costMap, ms, rng)) {
    const c    = centroid(lot.polygon)
    const keys = [lotKey(c), lotKey({x:c.x+CELL,y:c.y}), lotKey({x:c.x-CELL,y:c.y}), lotKey({x:c.x,y:c.y+CELL}), lotKey({x:c.x,y:c.y-CELL})]
    if (keys.some(k => occupied.has(k))) continue
    lots.push(lot)
    const xs = lot.polygon.map(p=>p.x), ys = lot.polygon.map(p=>p.y)
    for (let x = Math.min(...xs); x <= Math.max(...xs)+CELL; x += CELL)
      for (let y = Math.min(...ys); y <= Math.max(...ys)+CELL; y += CELL)
        occupied.add(lotKey({x, y}))
  }

  // 9b. Alongside-road lots for suburban / organic roads
  for (const seg of segments) {
    for (const lot of generateRoadLots(seg, costMap, ms, params.lotShrink)) {
      const c = centroid(lot.polygon)
      // Check centroid cell + its 4 cardinal neighbours (not 3×3 — too aggressive)
      const keys = [lotKey(c), lotKey({x:c.x+CELL,y:c.y}), lotKey({x:c.x-CELL,y:c.y}), lotKey({x:c.x,y:c.y+CELL}), lotKey({x:c.x,y:c.y-CELL})]
      if (keys.some(k => occupied.has(k))) continue
      lots.push(lot)
      // Mark the lot footprint in the occupancy grid
      const xs = lot.polygon.map(p=>p.x), ys = lot.polygon.map(p=>p.y)
      for (let x = Math.min(...xs); x <= Math.max(...xs)+CELL; x += CELL) {
        for (let y = Math.min(...ys); y <= Math.max(...ys)+CELL; y += CELL) {
          occupied.add(lotKey({x, y}))
        }
      }
    }
  }

  // 9c. Classify each lot by influence (commercial / civic / green / residential)
  for (const lot of lots) {
    const c = centroid(lot.polygon)
    lot.type = classifyLot(c, segments, ms, rng)
  }

  // 9d. Guaranteed green space (Gemini Phase C: Land-Use Pass).
  //     Ensures at least 10% of lots are green space regardless of road layout.
  //     Picks residential lots furthest from the town centre to convert.
  {
    const greenTarget = Math.max(2, Math.floor(lots.length * 0.10))
    const currentGreen = lots.filter(l => l.type === 'green').length
    const toConvert    = greenTarget - currentGreen
    if (toConvert > 0) {
      const candidates = lots
        .filter(l => l.type === 'residential')
        .sort((a, b) => {
          const ca = centroid(a.polygon), cb = centroid(b.polygon)
          return v2.dist(cb, townCenter) - v2.dist(ca, townCenter)  // furthest first
        })
      for (let i = 0; i < toConvert && i < candidates.length; i++) {
        candidates[i].type = 'green'
      }
    }
  }

  // 10. Detect bridge crossings (road segments that pass through water)
  const bridges: Bridge[] = []
  const BRIDGE_STEPS = 20
  for (const seg of segments) {
    let inWater = false
    let bridgeStart: Vec2 | null = null
    for (let i = 0; i <= BRIDGE_STEPS; i++) {
      const t  = i / BRIDGE_STEPS
      const pt = v2.lerp(seg.a, seg.b, t)
      const c  = costAt(pt, costMap, ms)
      if (c > 200 && !inWater) { inWater = true; bridgeStart = pt }
      if (c <= 200 && inWater) {
        inWater = false
        if (bridgeStart) {
          bridges.push({ a: bridgeStart, b: pt, type: seg.type })
          bridgeStart = null
        }
      }
    }
    // Segment ends inside water
    if (inWater && bridgeStart) bridges.push({ a: bridgeStart, b: seg.b, type: seg.type })
  }

  return { segments, intersections: [], lots, rivers, bridges, costMap, mapSize: ms, townCenter }
}

