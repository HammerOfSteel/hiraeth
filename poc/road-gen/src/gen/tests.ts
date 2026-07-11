/**
 * Validation tests — run after world generation.
 * Each test returns a pass/fail result with a measured value and threshold.
 * Based on Gemini's recommended city-planner unit tests.
 */

import type { GeneratedWorld, Vec2, Segment } from './types'

export interface TestResult {
  name:      string
  passed:    boolean
  value:     number   // actual measured value
  threshold: number
  unit:      string
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function nearestSegDist(p: Vec2, segs: Segment[]): number {
  let min = Infinity
  for (const s of segs) {
    const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y
    const len2 = dx*dx + dy*dy
    if (len2 < 0.001) { min = Math.min(min, Math.sqrt((p.x-s.a.x)**2+(p.y-s.a.y)**2)); continue }
    const t  = Math.max(0, Math.min(1, ((p.x-s.a.x)*dx + (p.y-s.a.y)*dy) / len2))
    const cx = s.a.x + t*dx, cy = s.a.y + t*dy
    min = Math.min(min, Math.sqrt((p.x-cx)**2 + (p.y-cy)**2))
  }
  return min
}

function centroid(poly: Vec2[]): Vec2 {
  return {
    x: poly.reduce((s, p) => s + p.x, 0) / poly.length,
    y: poly.reduce((s, p) => s + p.y, 0) / poly.length,
  }
}

function eucl(a: Vec2, b: Vec2) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2) }

// ─── Tests ───────────────────────────────────────────────────────────────────

/**
 * Graph connectivity (BFS from highway).
 * Pass threshold: ≥ 90% of road nodes reachable from the highway.
 * "If you see multiple colours, your connectivity is failing." — Gemini
 */
export function testConnectivity(world: GeneratedWorld): TestResult {
  const SNAP = 8
  const nodeKey = (v: Vec2) => `${Math.round(v.x/SNAP)},${Math.round(v.y/SNAP)}`
  const adj = new Map<string, Set<string>>()

  for (const s of world.segments) {
    const ka = nodeKey(s.a), kb = nodeKey(s.b)
    if (!adj.has(ka)) adj.set(ka, new Set())
    if (!adj.has(kb)) adj.set(kb, new Set())
    adj.get(ka)!.add(kb)
    adj.get(kb)!.add(ka)
  }

  const hwSeg = world.segments.find(s => s.type === 'highway')
  if (!hwSeg || adj.size === 0) {
    return { name: 'Connectivity', passed: true, value: 100, threshold: 90, unit: '%' }
  }

  const visited = new Set<string>([nodeKey(hwSeg.a)])
  const queue   = [nodeKey(hwSeg.a)]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of adj.get(cur) ?? []) {
      if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
    }
  }

  const pct = Math.round(visited.size / adj.size * 100)
  return { name: 'Connectivity', passed: pct >= 90, value: pct, threshold: 90, unit: '%' }
}

/**
 * Walking distance — ≥ 70% of residential lots within 80 world-units of a park or civic lot.
 * Ensures neighbourhoods aren't deserts of identical houses.
 */
export function testWalkingDistance(world: GeneratedWorld, maxDist = 80): TestResult {
  const residential = world.lots.filter(l => l.type === 'residential')
  const amenities   = world.lots
    .filter(l => l.type === 'green' || l.type === 'civic')
    .map(l => centroid(l.polygon))

  if (residential.length === 0) {
    return { name: 'Walk Dist', passed: true,  value: 100, threshold: 70, unit: '%' }
  }
  if (amenities.length === 0) {
    return { name: 'Walk Dist', passed: false, value: 0,   threshold: 70, unit: '%' }
  }

  let passing = 0
  for (const lot of residential) {
    const c       = centroid(lot.polygon)
    const nearest = amenities.reduce((mn, a) => Math.min(mn, eucl(c, a)), Infinity)
    if (nearest <= maxDist) passing++
  }

  const pct = Math.round(passing / residential.length * 100)
  return { name: 'Walk Dist', passed: pct >= 70, value: pct, threshold: 70, unit: '%' }
}

/**
 * Civic accessibility — ≥ 90% of civic lots within 25 units of an arterial or highway.
 * "Civic buildings must have at least one neighbour, or end at a junction." — Gemini
 */
export function testAccessibility(world: GeneratedWorld): TestResult {
  const civicLots  = world.lots.filter(l => l.type === 'civic')
  if (civicLots.length === 0) {
    return { name: 'Accessibility', passed: true, value: 100, threshold: 90, unit: '%' }
  }

  const majorRoads = world.segments.filter(s => s.type === 'highway' || s.type === 'arterial')
  let passing = 0
  for (const lot of civicLots) {
    if (nearestSegDist(centroid(lot.polygon), majorRoads) <= 25) passing++
  }

  const pct = Math.round(passing / civicLots.length * 100)
  return { name: 'Accessibility', passed: pct >= 90, value: pct, threshold: 90, unit: '%' }
}

/**
 * Land-use diversity — ≥ 10% of built lots are commercial.
 * Prevents an entirely residential settlement with no services.
 */
export function testDiversity(world: GeneratedWorld): TestResult {
  const commercial  = world.lots.filter(l => l.type === 'commercial').length
  const residential = world.lots.filter(l => l.type === 'residential').length
  const total = commercial + residential
  if (total === 0) return { name: 'Diversity', passed: false, value: 0, threshold: 10, unit: '%' }

  const pct = Math.round(commercial / total * 100)
  return { name: 'Diversity', passed: pct >= 10, value: pct, threshold: 10, unit: '%' }
}

// ─── Runner ──────────────────────────────────────────────────────────────────

export function runTests(world: GeneratedWorld): TestResult[] {
  return [
    testConnectivity(world),
    testWalkingDistance(world),
    testAccessibility(world),
    testDiversity(world),
  ]
}
