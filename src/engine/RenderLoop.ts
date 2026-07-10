import type { AbstractEngine } from '@babylonjs/core'
import { Scene } from '@babylonjs/core'

export interface PerformanceStats {
  fps: number
  deltaMs: number
  drawCalls: number
  frameCount: number
}

type StatsListener = (stats: PerformanceStats) => void

/**
 * RenderLoop owns the RAF-driven render loop and tracks frame performance.
 * It exposes per-frame stats so the UI overlay can display them.
 */
export class RenderLoop {
  private readonly _engine: AbstractEngine
  private readonly _scene: Scene
  private _running = false
  private _frameCount = 0
  private _lastTimestamp = 0
  private _deltaMs = 0
  private _statsListeners: StatsListener[] = []

  constructor(engine: AbstractEngine, scene: Scene) {
    this._engine = engine
    this._scene = scene
  }

  /** Start the render loop */
  start(): void {
    if (this._running) return
    this._running = true
    this._lastTimestamp = performance.now()

    this._engine.runRenderLoop(() => {
      this._tick()
    })
  }

  /** Pause the loop (keeps the engine alive) */
  stop(): void {
    this._running = false
    this._engine.stopRenderLoop()
  }

  /** Current frames-per-second */
  get fps(): number {
    return this._engine.getFps()
  }

  /** Milliseconds elapsed since last frame */
  get deltaMs(): number {
    return this._deltaMs
  }

  /** Total frames rendered since start() */
  get frameCount(): number {
    return this._frameCount
  }

  /**
   * Register a listener that receives per-frame stats.
   * Returns an unsubscribe function.
   */
  onStats(listener: StatsListener): () => void {
    this._statsListeners.push(listener)
    return () => {
      this._statsListeners = this._statsListeners.filter(l => l !== listener)
    }
  }

  dispose(): void {
    this.stop()
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _tick(): void {
    const now = performance.now()
    this._deltaMs = now - this._lastTimestamp
    this._lastTimestamp = now
    this._frameCount++

    this._scene.render()

    if (this._statsListeners.length > 0) {
      const stats: PerformanceStats = {
        fps: Math.round(this.fps),
        deltaMs: Math.round(this._deltaMs * 10) / 10,
        drawCalls: this._scene.getActiveMeshes().length,
        frameCount: this._frameCount,
      }
      for (const fn of this._statsListeners) fn(stats)
    }
  }
}
