import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NullEngine, Scene } from '@babylonjs/core'
import { SceneManager } from '../src/engine/SceneManager'

describe('SceneManager', () => {
  it('createWithEngine — creates engine and scene without throwing', () => {
    const engine = new NullEngine()
    const canvas = {} as HTMLCanvasElement   // NullEngine ignores the canvas
    const manager = SceneManager.createWithEngine(engine, canvas)

    expect(manager.engine).toBeDefined()
    expect(manager.scene).toBeInstanceOf(Scene)

    manager.dispose()
  })

  it('scene contains a default hemispheric light after creation', () => {
    const engine = new NullEngine()
    const manager = SceneManager.createWithEngine(engine, {} as HTMLCanvasElement)

    const lights = manager.scene.lights
    expect(lights.length).toBeGreaterThan(0)

    manager.dispose()
  })

  it('dispose() does not throw', () => {
    const engine = new NullEngine()
    const manager = SceneManager.createWithEngine(engine, {} as HTMLCanvasElement)
    expect(() => manager.dispose()).not.toThrow()
  })
})
