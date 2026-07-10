import { describe, it, expect } from 'vitest'
import { TerrainGenerator, type TerrainConfig } from '@world/TerrainGenerator'
import { RoadNetwork } from '@world/RoadNetwork'
import { ParcelGenerator } from '@world/Parcel'

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

describe('RoadNetwork', () => {
  it('main road path is found and has nodes', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    const mainNodes = graph.nodes.filter(n => n.isMainRoad)
    expect(mainNodes.length).toBeGreaterThan(0)
  })

  it('graph is fully connected (all nodes reachable from node 0)', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    expect(graph.nodes.length).toBeGreaterThan(0)
    expect(RoadNetwork.isConnected(graph)).toBe(true)
  })

  it('has both main and side road edges', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    expect(graph.edges.some(e => e.type === 'main')).toBe(true)
    expect(graph.edges.some(e => e.type === 'side')).toBe(true)
  })

  it('all node world positions are within the world bounds', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    const halfW = BASE.worldWidth / 2
    const halfD = BASE.worldDepth / 2
    for (const n of graph.nodes) {
      expect(n.wx).toBeGreaterThanOrEqual(-halfW - 1)
      expect(n.wx).toBeLessThanOrEqual(halfW + 1)
      expect(n.wz).toBeGreaterThanOrEqual(-halfD - 1)
      expect(n.wz).toBeLessThanOrEqual(halfD + 1)
    }
  })
})

describe('ParcelGenerator', () => {
  it('produces parcels when given a valid graph', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    const parcels = ParcelGenerator.generate(graph)
    expect(parcels.length).toBeGreaterThan(0)
  })

  it('all parcels have positive width and depth', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    const parcels = ParcelGenerator.generate(graph)
    for (const p of parcels) {
      expect(p.width).toBeGreaterThan(0)
      expect(p.depth).toBeGreaterThan(0)
    }
  })

  it('parcels include both commercial and residential zones', () => {
    const hm = TerrainGenerator.generate(BASE)
    const graph = RoadNetwork.generate(hm, 42)
    const parcels = ParcelGenerator.generate(graph)
    const zones = new Set(parcels.map(p => p.zone))
    expect(zones.has('commercial')).toBe(true)
    expect(zones.has('residential')).toBe(true)
  })
})
