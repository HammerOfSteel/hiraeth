import { describe, it, expect } from 'vitest'
// Test that @engine alias resolves — if this import fails, the alias is broken
import { SceneManager } from '@engine/SceneManager'
import { IsometricCamera } from '@camera/IsometricCamera'
import { RenderLoop } from '@engine/RenderLoop'

describe('Path aliases', () => {
  it('@engine/SceneManager resolves and exports SceneManager class', () => {
    expect(SceneManager).toBeDefined()
    expect(typeof SceneManager.createWithEngine).toBe('function')
  })

  it('@camera/IsometricCamera resolves and exports IsometricCamera class', () => {
    expect(IsometricCamera).toBeDefined()
    expect(typeof IsometricCamera).toBe('function')
  })

  it('@engine/RenderLoop resolves and exports RenderLoop class', () => {
    expect(RenderLoop).toBeDefined()
    expect(typeof RenderLoop).toBe('function')
  })
})
