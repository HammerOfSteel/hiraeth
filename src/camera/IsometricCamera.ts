import {
  ArcRotateCamera,
  Scene,
  Vector3,
  Tools,
  type Nullable,
} from '@babylonjs/core'

/** Degrees to radians helper */
const DEG = Math.PI / 180

export interface IsometricCameraOptions {
  /** Starting elevation angle in degrees (default 45) */
  betaDeg?: number
  /** Starting horizontal angle in degrees (default 315 — NW-ish) */
  alphaDeg?: number
  /** Starting zoom radius (default 30) */
  radius?: number
  /** Minimum zoom radius (default 5) */
  minRadius?: number
  /** Maximum zoom radius (default 120) */
  maxRadius?: number
  /** Scroll wheel zoom sensitivity (default 5) */
  wheelSensitivity?: number
  /** Snap angle in degrees for Q/E rotation (default 45) */
  snapAngleDeg?: number
}

/**
 * IsometricCamera wraps Babylon's ArcRotateCamera with:
 * - Constrained elevation (beta) so the view stays isometric-ish
 * - Smooth clamped zoom via scroll / pinch
 * - Middle-click / right-click drag to pan
 * - Q / E keys to rotate in 45° snaps with easing
 * - Home key resets to default view
 * - Touch: pinch to zoom, two-finger pan
 */
export class IsometricCamera {
  readonly camera: ArcRotateCamera

  private readonly _snapAngle: number
  private readonly _defaultAlpha: number
  private readonly _defaultBeta: number
  private readonly _defaultRadius: number

  // For Q/E snap easing
  private _snapTarget: Nullable<number> = null
  private _snapObserver: Nullable<ReturnType<Scene['onBeforeRenderObservable']['add']>> = null

  constructor(
    scene: Scene,
    canvas: HTMLCanvasElement,
    options: IsometricCameraOptions = {},
  ) {
    const betaDeg = options.betaDeg ?? 45
    const alphaDeg = options.alphaDeg ?? 315
    const radius = options.radius ?? 30
    const minRadius = options.minRadius ?? 5
    const maxRadius = options.maxRadius ?? 120
    const wheelSensitivity = options.wheelSensitivity ?? 5
    this._snapAngle = (options.snapAngleDeg ?? 45) * DEG

    this._defaultAlpha = alphaDeg * DEG
    this._defaultBeta = betaDeg * DEG
    this._defaultRadius = radius

    // ── Create camera ─────────────────────────────────────────────────────────
    this.camera = new ArcRotateCamera(
      'isoCamera',
      this._defaultAlpha,
      this._defaultBeta,
      this._defaultRadius,
      Vector3.Zero(),
      scene,
    )

    // Attach standard pointer controls (drag = rotate/pan, wheel = zoom)
    this.camera.attachControl(canvas, true)

    // ── Elevation constraints (keep it isometric) ─────────────────────────────
    this.camera.lowerBetaLimit = 20 * DEG   // never flat on the ground
    this.camera.upperBetaLimit = 80 * DEG   // never fully overhead

    // ── Zoom constraints ──────────────────────────────────────────────────────
    this.camera.lowerRadiusLimit = minRadius
    this.camera.upperRadiusLimit = maxRadius

    // ── Panning (middle-click / right-click) ──────────────────────────────────
    this.camera.panningSensibility = 100  // higher = slower pan, adjust to taste
    this.camera.panningAxis = new Vector3(1, 0, 1)  // pan on the XZ plane only

    // ── Zoom sensitivity ──────────────────────────────────────────────────────
    this.camera.wheelPrecision = wheelSensitivity
    this.camera.pinchPrecision = 80        // touch pinch zoom

    // ── Inertia (smooth glide after drag) ─────────────────────────────────────
    this.camera.inertia = 0.6
    this.camera.panningInertia = 0.6

    // ── Keyboard bindings ─────────────────────────────────────────────────────
    this._bindKeys(scene)
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Smoothly reset camera to default isometric position */
  resetToDefault(): void {
    this._snapTargetAlpha(this._defaultAlpha)
    this.camera.beta = this._defaultBeta
    this.camera.radius = this._defaultRadius
    this.camera.target = Vector3.Zero()
  }

  /**
   * Constrain-check the current angles; call if you programmatically set alpha.
   * Clamps beta and radius to their limits.
   */
  clamp(): void {
    const cam = this.camera
    if (cam.lowerBetaLimit !== null) cam.beta = Math.max(cam.beta, cam.lowerBetaLimit)
    if (cam.upperBetaLimit !== null) cam.beta = Math.min(cam.beta, cam.upperBetaLimit)
    if (cam.lowerRadiusLimit !== null) cam.radius = Math.max(cam.radius, cam.lowerRadiusLimit)
    if (cam.upperRadiusLimit !== null) cam.radius = Math.min(cam.radius, cam.upperRadiusLimit)
  }

  dispose(): void {
    if (this._snapObserver) {
      this.camera.getScene().onBeforeRenderObservable.remove(this._snapObserver)
    }
    this.camera.dispose()
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private _bindKeys(scene: Scene): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.key) {
        case 'q':
        case 'Q':
          this._snapTargetAlpha(this.camera.alpha - this._snapAngle)
          break
        case 'e':
        case 'E':
          this._snapTargetAlpha(this.camera.alpha + this._snapAngle)
          break
        case 'Home':
          e.preventDefault()
          this.resetToDefault()
          break
      }
    })
  }

  /** Animate alpha toward `target` using an eased lerp on the render loop. */
  private _snapTargetAlpha(target: number): void {
    // Normalise to [-π, π]
    this._snapTarget = this._normaliseAngle(target)

    if (this._snapObserver) return // already running

    this._snapObserver = this.camera.getScene().onBeforeRenderObservable.add(() => {
      if (this._snapTarget === null) return
      const diff = this._normaliseAngle(this._snapTarget - this.camera.alpha)
      if (Math.abs(diff) < 0.001) {
        this.camera.alpha = this._snapTarget
        this._snapTarget = null
        this.camera.getScene().onBeforeRenderObservable.remove(this._snapObserver!)
        this._snapObserver = null
        return
      }
      // Ease: lerp at 15% per frame (smooth but responsive)
      this.camera.alpha = this._normaliseAngle(this.camera.alpha + diff * 0.15)
    })
  }

  private _normaliseAngle(angle: number): number {
    // Wrap to [-π, π]
    return angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI))
  }
}

// Suppress unused import warning — Tools is used via side-effect (DEG alias for
// clarity); keep explicit so the import is removable if needed.
void Tools
