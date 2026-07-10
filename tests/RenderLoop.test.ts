import { describe, it, expect, afterEach } from 'vitest'
import { NullEngine, Scene } from '@babylonjs/core'
import { RenderLoop } from '../src/engine/RenderLoop'

describe('RenderLoop', () => {
  let engine: NullEngine

  afterEach(() => {
    engine?.dispose()
  })

  it('constructs without throwing', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    expect(() => new RenderLoop(engine, scene)).not.toThrow()
  })

  it('start() does not throw and frameCount is a non-negative integer', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const loop = new RenderLoop(engine, scene)

    expect(() => loop.start()).not.toThrow()
    expect(loop.frameCount).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(loop.frameCount)).toBe(true)
    loop.dispose()
  })

  it('deltaMs is a number (may be 0 in headless env)', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const loop = new RenderLoop(engine, scene)
    loop.start()
    expect(typeof loop.deltaMs).toBe('number')
    loop.dispose()
  })

  it('onStats returns an unsubscribe function', () => {
    engine = new NullEngine()
    const scene = new Scene(engine)
    const loop = new RenderLoop(engine, scene)
    const unsub = loop.onStats(() => undefined)
    expect(typeof unsub).toBe('function')
    expect(() => unsub()).not.toThrow()
    loop.dispose()
  })
})
