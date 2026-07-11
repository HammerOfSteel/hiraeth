/**
 * Canvas-generated procedural textures.
 * Each canvas is created once, then wrapped in a new CanvasTexture per call
 * so each material can have its own repeat settings.
 */
import * as THREE from 'three'

// ── Cached canvas sources (created once) ─────────────────────────────────────

let _stoneCanvas: HTMLCanvasElement | null = null
let _brickCanvas: HTMLCanvasElement | null = null
let _renderCanvas: HTMLCanvasElement | null = null
let _slateCanvas: HTMLCanvasElement | null = null

function wrap(t: THREE.CanvasTexture, rx: number, ry: number): THREE.CanvasTexture {
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(rx, ry)
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  return t
}

// ── Stone (Welsh grey limestone / granite coursed) ────────────────────────────

function buildStoneCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!

  g.fillStyle = '#636058'
  g.fillRect(0, 0, 512, 512)

  const palette = ['#8c8880', '#96928a', '#7e7a74', '#a09c94', '#848280', '#929090']
  const mortar = 5

  let y = 0, row = 0
  while (y < 516) {
    const courseH = 30 + Math.floor(Math.random() * 10)
    let x = row % 2 === 0 ? 0 : -(25 + Math.random() * 20)
    while (x < 516) {
      const sw = 40 + Math.random() * 36
      const col = palette[Math.floor(Math.random() * palette.length)]!
      g.fillStyle = col
      g.fillRect(x + mortar, y + mortar, sw - mortar, courseH - mortar)
      // subtle top highlight
      g.fillStyle = 'rgba(255,255,255,0.07)'
      g.fillRect(x + mortar, y + mortar, sw - mortar, 2)
      // bottom shadow
      g.fillStyle = 'rgba(0,0,0,0.12)'
      g.fillRect(x + mortar, y + courseH - mortar - 2, sw - mortar, 2)
      x += sw
    }
    y += courseH
    row++
  }
  return c
}

// ── Brick (muted British red brick) ──────────────────────────────────────────

function buildBrickCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!

  g.fillStyle = '#888070'
  g.fillRect(0, 0, 512, 512)

  const palette = ['#a84030', '#b84840', '#b04038', '#c05040', '#a04028']
  const bH = 22, bW = 58, mortar = 4

  let y = 0, row = 0
  while (y < 516) {
    const offset = row % 2 === 0 ? 0 : bW / 2
    for (let xi = -1; xi < 512 / bW + 2; xi++) {
      const x = xi * bW + offset
      const col = palette[Math.floor(Math.random() * palette.length)]!
      // slight per-brick colour variation
      const v = (Math.random() - 0.5) * 12
      const hex = col
      g.fillStyle = hex
      g.fillRect(x + mortar, y + mortar, bW - mortar, bH - mortar)
      if (v > 0) {
        g.fillStyle = `rgba(255,255,255,${v / 80})`
        g.fillRect(x + mortar, y + mortar, bW - mortar, bH - mortar)
      }
      // top highlight
      g.fillStyle = 'rgba(255,255,255,0.05)'
      g.fillRect(x + mortar, y + mortar, bW - mortar, 2)
    }
    y += bH
    row++
  }
  return c
}

// ── Render (lime render / pebbledash — creamy smooth) ────────────────────────

function buildRenderCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!

  g.fillStyle = '#dedad0'
  g.fillRect(0, 0, 256, 256)

  const img = g.getImageData(0, 0, 256, 256)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18
    d[i]!   = Math.max(0, Math.min(255, d[i]!   + n))
    d[i+1]! = Math.max(0, Math.min(255, d[i+1]! + n))
    d[i+2]! = Math.max(0, Math.min(255, d[i+2]! + n * 0.7))
  }
  g.putImageData(img, 0, 0)

  // hairline cracks
  g.strokeStyle = 'rgba(90,85,75,0.2)'
  g.lineWidth = 0.6
  for (let i = 0; i < 12; i++) {
    g.beginPath()
    const sx = Math.random() * 256, sy = Math.random() * 256
    g.moveTo(sx, sy)
    g.lineTo(sx + (Math.random() - 0.5) * 40, sy + (Math.random() - 0.5) * 40)
    g.stroke()
  }
  return c
}

// ── Slate (dark blue-grey Welsh slate roof tiles) ────────────────────────────

function buildSlateCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!

  g.fillStyle = '#2e3640'
  g.fillRect(0, 0, 512, 512)

  const tH = 26, tW = 38
  for (let row = 0; row * tH < 512; row++) {
    const offset = row % 2 === 0 ? 0 : tW / 2
    for (let col = -1; col * tW - offset < 512; col++) {
      const x = col * tW + offset
      const y = row * tH
      const dark = Math.random() * 0.14
      g.fillStyle = `rgba(0,0,0,${dark})`
      g.fillRect(x + 1, y + 1, tW - 1, tH - 1)
      // subtle top-edge highlight
      g.fillStyle = 'rgba(255,255,255,0.035)'
      g.fillRect(x + 1, y + 1, tW - 1, 1)
    }
    // course shadow line
    g.fillStyle = 'rgba(0,0,0,0.22)'
    g.fillRect(0, row * tH, 512, 1)
  }
  return c
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Welsh coursed stone. repX/repY = how many times to tile on the surface. */
export function stoneTexture(repX: number, repY: number): THREE.CanvasTexture {
  if (!_stoneCanvas) _stoneCanvas = buildStoneCanvas()
  return wrap(new THREE.CanvasTexture(_stoneCanvas), repX, repY)
}

/** Muted English red brick. */
export function brickTexture(repX: number, repY: number): THREE.CanvasTexture {
  if (!_brickCanvas) _brickCanvas = buildBrickCanvas()
  return wrap(new THREE.CanvasTexture(_brickCanvas), repX, repY)
}

/** Lime render / smooth plaster. */
export function renderTexture(repX: number, repY: number): THREE.CanvasTexture {
  if (!_renderCanvas) _renderCanvas = buildRenderCanvas()
  return wrap(new THREE.CanvasTexture(_renderCanvas), repX, repY)
}

/** Welsh dark slate tiles. */
export function slateTexture(repX: number, repY: number): THREE.CanvasTexture {
  if (!_slateCanvas) _slateCanvas = buildSlateCanvas()
  return wrap(new THREE.CanvasTexture(_slateCanvas), repX, repY)
}
