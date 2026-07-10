import {
  Engine,
  WebGPUEngine,
  Scene,
  HemisphericLight,
  Vector3,
  Color3,
  Color4,
  type AbstractEngine,
} from '@babylonjs/core'

export interface SceneManagerOptions {
  /** Force WebGL2 even if WebGPU is available */
  forceWebGL?: boolean
  antialias?: boolean
}

/**
 * SceneManager bootstraps the Babylon.js engine (WebGPU preferred, WebGL2
 * fallback) and owns the root Scene. Everything else reads from this.
 */
export class SceneManager {
  readonly engine: AbstractEngine
  readonly scene: Scene
  private readonly _canvas: HTMLCanvasElement

  private constructor(engine: AbstractEngine, scene: Scene, canvas: HTMLCanvasElement) {
    this.engine = engine
    this.scene = scene
    this._canvas = canvas
  }

  /**
   * Async factory — tries WebGPU first, falls back to WebGL2.
   * Use `SceneManager.create(canvas)` in production code.
   */
  static async create(
    canvas: HTMLCanvasElement,
    options: SceneManagerOptions = {},
  ): Promise<SceneManager> {
    let engine: AbstractEngine

    if (!options.forceWebGL && typeof WebGPUEngine !== 'undefined') {
      try {
        const webGPU = new WebGPUEngine(canvas, {
          antialias: options.antialias ?? true,
        })
        await webGPU.initAsync()
        engine = webGPU
        console.info('[SceneManager] WebGPU engine initialised')
      } catch {
        engine = SceneManager._makeWebGL(canvas, options)
        console.info('[SceneManager] WebGPU unavailable — WebGL2 fallback')
      }
    } else {
      engine = SceneManager._makeWebGL(canvas, options)
      console.info('[SceneManager] WebGL2 engine initialised')
    }

    const scene = SceneManager._buildScene(engine)
    return new SceneManager(engine, scene, canvas)
  }

  /**
   * Synchronous factory for environments without WebGPU support
   * (tests, SSR, CI). Accepts an already-constructed engine.
   */
  static createWithEngine(engine: AbstractEngine, canvas: HTMLCanvasElement): SceneManager {
    const scene = SceneManager._buildScene(engine)
    return new SceneManager(engine, scene, canvas)
  }

  private static _makeWebGL(
    canvas: HTMLCanvasElement,
    options: SceneManagerOptions,
  ): Engine {
    return new Engine(canvas, options.antialias ?? true, {
      preserveDrawingBuffer: false,
      stencil: true,
      adaptToDeviceRatio: true,
    })
  }

  private static _buildScene(engine: AbstractEngine): Scene {
    const scene = new Scene(engine)

    // Overcast British sky — soft blue-grey, not navy
    scene.clearColor = new Color4(0.56, 0.70, 0.78, 1.0)

    // Ambient sky light: cool blue-white from above, warm reflected ground colour
    const ambient = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene)
    ambient.intensity    = 0.65
    ambient.diffuse      = new Color3(0.90, 0.93, 1.00)   // pale sky
    ambient.groundColor  = new Color3(0.38, 0.42, 0.30)   // warm ground bounce

    return scene
  }

  /** Handle canvas resize — call on window resize events */
  resize(): void {
    this.engine.resize()
  }

  dispose(): void {
    this.scene.dispose()
    this.engine.dispose()
  }
}
