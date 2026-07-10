import { describe, it, expect } from 'vitest'
import { TerrainGenerator, type TerrainConfig } from '@world/TerrainGenerator'

const BASE: TerrainConfig = {
  seed: 42,
  resolution: 64,
  worldWidth: 200,
  worldDepth: 200,
  maxHeight: 30,
  valleyWidth: 0.35,
  hilliness: 0.75,
  coastal: false,
}

describe('TerrainGenerator', () => {
  it('all heightmap values are within [0, 1]', () => {
    const hm = TerrainGenerator.generate(BASE)
    for (let i = 0; i < hm.data.length; i++) {
      const v = hm.data[i] as number
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('valley centre column is lower on average than hillside columns', () => {
    const hm = TerrainGenerator.generate(BASE)
    const centreAvg = TerrainGenerator.columnAverage(hm, 0.5)
    const leftAvg   = TerrainGenerator.columnAverage(hm, 0.05)
    const rightAvg  = TerrainGenerator.columnAverage(hm, 0.95)
    const hillAvg   = (leftAvg + rightAvg) / 2
    expect(centreAvg).toBeLessThan(hillAvg)
  })

  it('different seeds produce different heightmaps', () => {
    const hm1 = TerrainGenerator.generate({ ...BASE, seed: 1, resolution: 32 })
    const hm2 = TerrainGenerator.generate({ ...BASE, seed: 99, resolution: 32 })
    let diff = 0
    for (let i = 0; i < hm1.data.length; i++) {
      diff += Math.abs((hm1.data[i] as number) - (hm2.data[i] as number))
    }
    expect(diff).toBeGreaterThan(0.5)
  })

  it('coastal flag lowers the southern edge', () => {
    const inland  = TerrainGenerator.generate(BASE)
    const coastal = TerrainGenerator.generate({ ...BASE, coastal: true })
    // Average of bottom 8 rows should be lower with coastal enabled
    let sumIn = 0, sumCo = 0
    const w = BASE.resolution
    const d = BASE.resolution
    for (let z = d - 8; z < d; z++) {
      for (let x = 0; x < w; x++) {
        sumIn += inland.data[z * w + x]  as number
        sumCo += coastal.data[z * w + x] as number
      }
    }
    expect(sumCo).toBeLessThan(sumIn)
  })

  it('sampleNorm returns a value within [0, 1]', () => {
    const hm = TerrainGenerator.generate(BASE)
    for (const [nx, nz] of [[0, 0], [0.5, 0.5], [1, 1], [0.3, 0.7]] as [number, number][]) {
      const v = TerrainGenerator.sampleNorm(hm, nx, nz)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
