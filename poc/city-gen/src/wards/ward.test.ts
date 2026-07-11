// ward.test.ts — unit tests for static Ward geometry helpers
import { describe, it, expect } from 'vitest'
import { Ward, MAIN_STREET } from './ward'
import { Pt } from '../geom/pt'
import { makePrng } from '../model/model'

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Simple axis-aligned rectangle as a polygon. */
function rect(x: number, y: number, w: number, h: number): Pt[] {
  return [
    new Pt(x,     y),
    new Pt(x + w, y),
    new Pt(x + w, y + h),
    new Pt(x,     y + h),
  ]
}

const rng = () => makePrng(42).float()

// ─── MAIN_STREET constant ─────────────────────────────────────────────────────

describe('MAIN_STREET', () => {
  it('is a positive number', () => {
    expect(MAIN_STREET).toBeGreaterThan(0)
  })
})

// ─── createOrthoBuilding ─────────────────────────────────────────────────────

describe('Ward.createOrthoBuilding', () => {
  it('returns an array of polygons for a large rect', () => {
    const poly = rect(0, 0, 60, 60)
    const result = Ward.createOrthoBuilding(poly, 20, 0.6, rng)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every returned polygon has ≥ 3 vertices', () => {
    const poly = rect(0, 0, 60, 60)
    const result = Ward.createOrthoBuilding(poly, 20, 0.6, rng)
    for (const p of result) expect(p.length).toBeGreaterThanOrEqual(3)
  })

  it('returns the input polygon when it is too small to subdivide', () => {
    // minBlockSq > area → single block returned
    const poly = rect(0, 0, 5, 5)
    const result = Ward.createOrthoBuilding(poly, 10000, 0.6, rng)
    expect(result.length).toBe(1)
  })

  it('is deterministic for same rng sequence', () => {
    const poly = rect(0, 0, 60, 60)
    const seedRng = () => makePrng(7).float()
    const a = Ward.createOrthoBuilding(poly, 20, 0.6, seedRng)
    const b = Ward.createOrthoBuilding(poly, 20, 0.6, () => makePrng(7).float())
    expect(a.length).toBe(b.length)
  })

  it('does not mutate the input polygon', () => {
    const poly = rect(0, 0, 60, 60)
    const before = poly.map(v => ({ x: v.x, y: v.y }))
    Ward.createOrthoBuilding(poly, 20, 0.6, rng)
    for (let i = 0; i < poly.length; i++) {
      expect(poly[i].x).toBeCloseTo(before[i].x, 6)
      expect(poly[i].y).toBeCloseTo(before[i].y, 6)
    }
  })
})

// ─── createAlleys ─────────────────────────────────────────────────────────────

describe('Ward.createAlleys', () => {
  it('returns polygons for a square block', () => {
    const poly = rect(0, 0, 50, 50)
    const result = Ward.createAlleys(poly, 15, 0.2, 0.2, 0.1, false, rng)
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)
  })

  it('every returned polygon has ≥ 3 vertices', () => {
    const poly = rect(0, 0, 50, 50)
    const result = Ward.createAlleys(poly, 10, 0.3, 0.3, 0.05, true, rng)
    for (const p of result) expect(p.length).toBeGreaterThanOrEqual(3)
  })

  it('respects emptyProb=1 by returning empty array', () => {
    // When the very first split has emptyProb=1 the block is vacant
    // (probabilistic — run a few times to confirm tendency)
    const poly = rect(0, 0, 50, 50)
    // With emptyProb=1 the result should almost always be empty
    const result = Ward.createAlleys(poly, 10, 0, 0, 1.0, false, () => 0.5)
    expect(result.length).toBe(0)
  })

  it('is deterministic for same rng', () => {
    const poly = rect(0, 0, 50, 50)
    const make = () => Ward.createAlleys(poly, 10, 0.2, 0.2, 0.1, false, () => makePrng(3).float())
    expect(make().length).toBe(make().length)
  })
})
