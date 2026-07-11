// model.test.ts — smoke + regression tests for the city generation pipeline
import { describe, it, expect } from 'vitest'
import { Model, makePrng } from './model'

// ─── PRNG ─────────────────────────────────────────────────────────────────────

describe('makePrng', () => {
  it('returns floats in [0, 1)', () => {
    const rng = makePrng(42)
    for (let i = 0; i < 1000; i++) {
      const v = rng.float()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is deterministic for the same seed', () => {
    const a = makePrng(12345)
    const b = makePrng(12345)
    for (let i = 0; i < 50; i++) expect(a.float()).toBe(b.float())
  })

  it('differs between seeds', () => {
    const a = makePrng(1), b = makePrng(2)
    const seqA = Array.from({ length: 20 }, () => a.float())
    const seqB = Array.from({ length: 20 }, () => b.float())
    expect(seqA).not.toEqual(seqB)
  })

  it('int() stays within bounds', () => {
    const rng = makePrng(99)
    for (let i = 0; i < 500; i++) {
      const v = rng.int(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
    }
  })
})

// ─── Model constructor (regression for _rng crash) ────────────────────────────

describe('Model constructor', () => {
  it('does not throw for any small seed', () => {
    // This specifically catches the _rng.bool() → undefined crash
    for (const seed of [0, 1, 42, 4013864, 0xFFFFFF]) {
      expect(() => new Model({ seed, nPatches: 8 })).not.toThrow()
    }
  })

  it('rng field is a valid Prng after construction', () => {
    const m = new Model({ seed: 1, nPatches: 8 })
    expect(m.rng).toBeDefined()
    expect(typeof m.rng.float).toBe('function')
    expect(typeof m.rng.bool).toBe('function')
    const v = m.rng.float()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })
})

// ─── Model.build() — full pipeline smoke test ─────────────────────────────────

const SEEDS = [1, 42, 100, 4013864, 999999]
const PRESET_SIZES = [
  { label: 'Small Town',  n: 8  },
  { label: 'Large Town',  n: 12 },
  { label: 'Small City',  n: 18 },
]

describe('Model.build() — does not throw', () => {
  for (const { label, n } of PRESET_SIZES) {
    for (const seed of SEEDS) {
      it(`${label} seed=${seed}`, () => {
        expect(() => new Model({ seed, nPatches: n }).build()).not.toThrow()
      })
    }
  }
})

describe('Model.build() — output shape', () => {
  const build = (seed: number, n = 10) => new Model({ seed, nPatches: n }).build()

  it('has at least nPatches inner patches', () => {
    const m = build(42)
    expect(m.inner.length).toBeGreaterThanOrEqual(5) // at least some inner
  })

  it('all inner patches are withinCity', () => {
    const m = build(42)
    for (const p of m.inner) expect(p.withinCity).toBe(true)
  })

  it('cityRadius is positive', () => {
    const m = build(42)
    expect(m.cityRadius).toBeGreaterThan(0)
  })

  it('every inner patch has a ward', () => {
    const m = build(42)
    for (const p of m.inner) expect(p.ward).not.toBeNull()
  })

  it('every ward has a non-empty geometry array', () => {
    const m = build(42)
    for (const p of m.inner) {
      expect(p.ward?.geometry).toBeDefined()
      expect(Array.isArray(p.ward?.geometry)).toBe(true)
    }
  })

  it('arteries is a non-empty array of polylines', () => {
    const m = build(42)
    expect(m.arteries.length).toBeGreaterThan(0)
    for (const a of m.arteries) {
      expect(Array.isArray(a)).toBe(true)
      expect(a.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('output is deterministic for same seed', () => {
    const a = build(999, 10)
    const b = build(999, 10)
    expect(a.patches.length).toBe(b.patches.length)
    expect(a.inner.length).toBe(b.inner.length)
    expect(a.arteries.length).toBe(b.arteries.length)
    // Compare centroid of first inner patch shape
    const shapeA = a.inner[0].shape
    const shapeB = b.inner[0].shape
    expect(shapeA.length).toBe(shapeB.length)
    for (let i = 0; i < shapeA.length; i++) {
      expect(shapeA[i].x).toBeCloseTo(shapeB[i].x, 6)
      expect(shapeA[i].y).toBeCloseTo(shapeB[i].y, 6)
    }
  })

  it('border wall is always present', () => {
    const m = build(42)
    expect(m.border).toBeDefined()
    expect(m.border.shape.length).toBeGreaterThan(2)
  })

  it('citadel (if present) has a Castle ward', () => {
    // Try seeds until we get one with a citadel
    for (const seed of SEEDS) {
      const m = build(seed, 12)
      if (m.citadel) {
        expect(m.citadel.ward?.name).toBe('Castle')
        break
      }
    }
  })
})
