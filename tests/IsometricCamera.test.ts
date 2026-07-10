import { describe, it, expect, afterEach } from 'vitest'
import { NullEngine, Scene } from '@babylonjs/core'
import { IsometricCamera } from '../src/camera/IsometricCamera'

function makeScene(): { engine: NullEngine; scene: Scene } {
  const engine = new NullEngine()
  const scene = new Scene(engine)
  return { engine, scene }
}

describe('IsometricCamera', () => {
  let engine: NullEngine

  afterEach(() => {
    engine?.dispose()
  })

  it('creates an ArcRotateCamera', () => {
    const s = makeScene()
    engine = s.engine
    const cam = new IsometricCamera(s.scene, {} as HTMLCanvasElement)
    expect(cam.camera).toBeDefined()
    cam.dispose()
  })

  it('beta stays within bounds after construction', () => {
    const s = makeScene()
    engine = s.engine
    const cam = new IsometricCamera(s.scene, {} as HTMLCanvasElement)
    const { lowerBetaLimit, upperBetaLimit, beta } = cam.camera

    expect(lowerBetaLimit).not.toBeNull()
    expect(upperBetaLimit).not.toBeNull()
    expect(beta).toBeGreaterThanOrEqual(lowerBetaLimit!)
    expect(beta).toBeLessThanOrEqual(upperBetaLimit!)
    cam.dispose()
  })

  it('radius stays within bounds after construction', () => {
    const s = makeScene()
    engine = s.engine
    const cam = new IsometricCamera(s.scene, {} as HTMLCanvasElement)
    const { lowerRadiusLimit, upperRadiusLimit, radius } = cam.camera

    expect(lowerRadiusLimit).not.toBeNull()
    expect(upperRadiusLimit).not.toBeNull()
    expect(radius).toBeGreaterThanOrEqual(lowerRadiusLimit!)
    expect(radius).toBeLessThanOrEqual(upperRadiusLimit!)
    cam.dispose()
  })

  it('clamp() pins an out-of-bounds beta to the limit', () => {
    const s = makeScene()
    engine = s.engine
    const cam = new IsometricCamera(s.scene, {} as HTMLCanvasElement)

    // Force beta out of range
    cam.camera.beta = 0.01  // below lowerBetaLimit
    cam.clamp()

    expect(cam.camera.beta).toBeGreaterThanOrEqual(cam.camera.lowerBetaLimit!)
    cam.dispose()
  })

  it('clamp() pins an out-of-bounds radius to the limit', () => {
    const s = makeScene()
    engine = s.engine
    const cam = new IsometricCamera(s.scene, {} as HTMLCanvasElement)

    // Force radius out of range
    cam.camera.radius = 9999
    cam.clamp()

    expect(cam.camera.radius).toBeLessThanOrEqual(cam.camera.upperRadiusLimit!)
    cam.dispose()
  })

  it('resetToDefault() restores radius to the configured default', () => {
    const s = makeScene()
    engine = s.engine
    const defaultRadius = 30
    const cam = new IsometricCamera(s.scene, {} as HTMLCanvasElement, { radius: defaultRadius })

    cam.camera.radius = 10
    cam.resetToDefault()

    expect(cam.camera.radius).toBe(defaultRadius)
    cam.dispose()
  })
})
