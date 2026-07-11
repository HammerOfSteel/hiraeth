// serialiser.test.ts — round-trip: Model → JSON → RenderData
import { describe, it, expect } from 'vitest'
import { Model } from '../model/model'
import { modelToJson } from './serialiser'
import { jsonToRenderData } from './deserialiser'

const SEEDS  = [1, 42, 4013864]
const N      = 10

function buildAndExport(seed: number) {
  const model = new Model({ seed, nPatches: N }).build()
  const json  = modelToJson(model)
  const data  = jsonToRenderData(json)
  return { model, json, data }
}

describe('modelToJson', () => {
  it('does not throw for multiple seeds', () => {
    for (const seed of SEEDS) {
      expect(() => buildAndExport(seed)).not.toThrow()
    }
  })

  it('cityRadius matches model', () => {
    for (const seed of SEEDS) {
      const { model, json } = buildAndExport(seed)
      expect(json.cityRadius).toBeCloseTo(model.cityRadius, 4)
    }
  })

  it('seed is preserved', () => {
    for (const seed of SEEDS) {
      const { json } = buildAndExport(seed)
      expect(json.seed).toBe(seed)
    }
  })

  it('wards array is non-empty', () => {
    const { json } = buildAndExport(42)
    expect(json.wards.length).toBeGreaterThan(0)
  })

  it('every ward has a non-empty shape', () => {
    const { json } = buildAndExport(42)
    for (const w of json.wards) {
      expect(w.shape.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('streets is an array', () => {
    const { json } = buildAndExport(42)
    expect(Array.isArray(json.streets)).toBe(true)
    expect(json.streets.length).toBeGreaterThan(0)
  })
})

describe('jsonToRenderData', () => {
  it('cityRadius is positive', () => {
    const { data } = buildAndExport(42)
    expect(data.cityRadius).toBeGreaterThan(0)
  })

  it('wards array matches json wards count', () => {
    const { json, data } = buildAndExport(42)
    expect(data.wards.length).toBe(json.wards.length)
  })

  it('streets is array of Pt arrays', () => {
    const { data } = buildAndExport(42)
    for (const s of data.streets) {
      expect(Array.isArray(s)).toBe(true)
      expect(s.length).toBeGreaterThanOrEqual(2)
      expect(typeof s[0].x).toBe('number')
      expect(typeof s[0].y).toBe('number')
    }
  })

  it('buildingsByType keys match ward types', () => {
    const { data } = buildAndExport(42)
    const wardTypes = new Set(data.wards.map(w => w.type))
    for (const key of data.buildingsByType.keys()) {
      expect(wardTypes.has(key)).toBe(true)
    }
  })
})
