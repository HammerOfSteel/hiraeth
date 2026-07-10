import { describe, it, expect } from 'vitest'
import { NullEngine } from '@babylonjs/core/Engines/nullEngine'
import { Scene } from '@babylonjs/core/scene'
import { WorldGenerator, DEFAULT_WORLD_CONFIG } from '@world/WorldGenerator'
import { RoadNetwork } from '@world/RoadNetwork'

// Use a low-resolution config so tests are fast and headless-safe
const FAST_CONFIG = {
  ...DEFAULT_WORLD_CONFIG,
  resolution: 64,    // 64×64 heightmap
  maxTrees: 100,     // minimal tree count
}

describe('WorldGenerator (integration)', () => {
  it('generates a world without throwing', () => {
    const engine = new NullEngine()
    const scene  = new Scene(engine)
    const gen    = new WorldGenerator(scene)
    expect(() => gen.generate(FAST_CONFIG)).not.toThrow()
    gen.dispose()
    engine.dispose()
  })

  it('returns a non-empty mesh list', () => {
    const engine = new NullEngine()
    const scene  = new Scene(engine)
    const gen    = new WorldGenerator(scene)
    const result = gen.generate(FAST_CONFIG)
    expect(result.meshes.length).toBeGreaterThan(0)
    result.dispose()
    gen.dispose()
    engine.dispose()
  })

  it('returns a connected road graph', () => {
    const engine = new NullEngine()
    const scene  = new Scene(engine)
    const gen    = new WorldGenerator(scene)
    const { roadGraph } = gen.generate(FAST_CONFIG)
    expect(RoadNetwork.isConnected(roadGraph)).toBe(true)
    gen.dispose()
    engine.dispose()
  })

  it('completes full generation in under 5 000 ms', () => {
    const engine = new NullEngine()
    const scene  = new Scene(engine)
    const gen    = new WorldGenerator(scene)
    const t0     = performance.now()
    const result = gen.generate(FAST_CONFIG)
    const elapsed = performance.now() - t0
    expect(elapsed).toBeLessThan(5000)
    result.dispose()
    gen.dispose()
    engine.dispose()
  })

  it('dispose() can be called twice without throwing', () => {
    const engine = new NullEngine()
    const scene  = new Scene(engine)
    const gen    = new WorldGenerator(scene)
    const result = gen.generate(FAST_CONFIG)
    expect(() => { result.dispose(); result.dispose() }).not.toThrow()
    gen.dispose()
    engine.dispose()
  })
})
