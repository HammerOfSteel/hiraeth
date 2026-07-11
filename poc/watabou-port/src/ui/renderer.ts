/**
 * Renderer — near-exact port of Watabou's CityMap.hx visual output.
 *
 * All stroke/fill values match the original Palette + Brush constants:
 *   NORMAL_STROKE = 0.300 world units
 *   THICK_STROKE  = 1.800 world units
 *   MAIN_STREET   = 2.000 world units
 *   ALLEY         = 0.600 world units
 *
 * Each palette is { paper, light, medium, dark } as hex strings,
 * matching Palette.hx exactly.
 */
import { Pt } from '../geom/pt'
import { type Polygon } from '../geom/polygon'
import { type CityData } from '../model/model'
import { MAIN_STREET } from '../model/ward'

// ─── Palettes (exact Palette.hx values) ──────────────────────────────────────

export interface Palette {
  paper:  string
  light:  string
  medium: string
  dark:   string
}

export const PALETTES: Record<string, Palette> = {
  Default:   { paper: '#ccc5b8', light: '#99948a', medium: '#67635c', dark: '#1a1917' },
  Blueprint: { paper: '#455b8d', light: '#7383aa', medium: '#a1abc6', dark: '#fcfbff' },
  'B&W':     { paper: '#ffffff', light: '#cccccc', medium: '#888888', dark: '#000000' },
  Ink:       { paper: '#cccac2', light: '#9a979b', medium: '#6c6974', dark: '#130f26' },
  Night:     { paper: '#000000', light: '#402306', medium: '#674b14', dark: '#99913d' },
  Ancient:   { paper: '#ccc5a3', light: '#a69974', medium: '#806f4d', dark: '#342414' },
  Colour:    { paper: '#fff2c8', light: '#d6a36e', medium: '#869a81', dark: '#4c5950' },
}

// ─── Brush stroke constants (world units) ────────────────────────────────────

const NORMAL_STROKE = 0.300
const THICK_STROKE  = 1.800

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ToCanvas = (p: Pt) => [number, number]

function polyPath(ctx: CanvasRenderingContext2D, poly: Polygon, toC: ToCanvas): void {
  if (poly.length < 2) return
  ctx.beginPath()
  const [x0, y0] = toC(poly[0]); ctx.moveTo(x0, y0)
  for (let i = 1; i < poly.length; i++) { const [x, y] = toC(poly[i]); ctx.lineTo(x, y) }
  ctx.closePath()
}

function linePath(ctx: CanvasRenderingContext2D, pts: Pt[], toC: ToCanvas): void {
  if (pts.length < 2) return
  ctx.beginPath()
  const [x0, y0] = toC(pts[0]); ctx.moveTo(x0, y0)
  for (let i = 1; i < pts.length; i++) { const [x, y] = toC(pts[i]); ctx.lineTo(x, y) }
}


// ─── Main render ──────────────────────────────────────────────────────────────

export function renderCity(
  canvas: HTMLCanvasElement,
  city:   CityData,
  pal:    Palette = PALETTES.Default,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width, H = canvas.height

  // Auto-fit scale matching TownScene.layout():
  //   scale = min(W,H) / (cityRadius * 2) * 0.85
  const scale = city.cityRadius > 0
    ? Math.min(W, H) / (city.cityRadius * 2) * 0.82
    : 4

  const cx = W / 2, cy = H / 2
  const toC: ToCanvas = p => [cx + p.x * scale, cy + p.y * scale]
  const sw = (worldW: number) => worldW * scale   // world → pixel stroke width

  // ── 0. Background = paper ────────────────────────────────────────────────
  ctx.fillStyle = pal.paper
  ctx.fillRect(0, 0, W, H)

  // ── 1. Roads (drawn first, under buildings) ──────────────────────────────
  // Exact port of CityMap.drawRoad():
  //   wide:   MAIN_STREET + NORMAL_STROKE in palette.medium
  //   narrow: MAIN_STREET - NORMAL_STROKE in palette.paper
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'

  for (const street of city.streets) {
    if (street.length < 2) continue
    linePath(ctx, street, toC)
    ctx.strokeStyle = pal.medium
    ctx.lineWidth   = sw(MAIN_STREET + NORMAL_STROKE)
    ctx.stroke()

    linePath(ctx, street, toC)
    ctx.strokeStyle = pal.paper
    ctx.lineWidth   = sw(MAIN_STREET - NORMAL_STROKE)
    ctx.stroke()
  }

  // ── 2. Buildings ─────────────────────────────────────────────────────────
  // All building types use light fill + dark stroke (NORMAL_STROKE).
  // Parks use medium fill, no stroke.
  // Plaza = open (no buildings).
  // Castle = light fill + dark stroke at NORMAL_STROKE * 2.
  for (const lot of city.buildings) {
    if (lot.poly.length < 3) continue

    const isPark    = lot.wardName === 'Park'
    const isCastle  = lot.wardName === 'Castle'

    polyPath(ctx, lot.poly, toC)

    if (isPark) {
      ctx.fillStyle   = pal.medium
      ctx.lineWidth   = 0
      ctx.fill()
    } else {
      ctx.fillStyle   = pal.light
      ctx.fill()
      ctx.strokeStyle = pal.dark
      ctx.lineWidth   = sw(isCastle ? NORMAL_STROKE * 2 : NORMAL_STROKE)
      ctx.stroke()
    }
  }

  // ── 3. City wall ─────────────────────────────────────────────────────────
  // Exact port of CityMap.drawWall():
  //   stroke THICK_STROKE in dark
  //   towers = circles in dark
  //   gates = thick tick lines in dark
  if (city.wall.length > 2) {
    polyPath(ctx, city.wall, toC)
    ctx.strokeStyle = pal.dark
    ctx.lineWidth   = sw(THICK_STROKE)
    ctx.lineJoin    = 'miter'
    ctx.stroke()
  }

  // Wall towers at each vertex
  const towerR = sw(THICK_STROKE)
  for (const v of city.wall) {
    const [vx, vy] = toC(v)
    ctx.beginPath(); ctx.arc(vx, vy, towerR, 0, Math.PI * 2)
    ctx.fillStyle = pal.dark
    ctx.fill()
  }

  // Gate tick marks — cross-line at each gate point
  const gateTickLen = sw(THICK_STROKE * 1.5)
  for (const gate of city.gates) {
    const idx = city.wall.indexOf(gate)
    if (idx === -1) continue

    // Direction along wall at gate vertex
    const prev = city.wall[(idx + city.wall.length - 1) % city.wall.length]
    const next = city.wall[(idx + 1) % city.wall.length]
    const dir  = new Pt(next.x - prev.x, next.y - prev.y)
    const len  = Math.sqrt(dir.x * dir.x + dir.y * dir.y)
    if (len === 0) continue
    const dx = (dir.x / len) * gateTickLen, dy = (dir.y / len) * gateTickLen

    const [gx, gy] = toC(gate)
    ctx.beginPath()
    ctx.moveTo(gx - dx, gy - dy)
    ctx.lineTo(gx + dx, gy + dy)
    ctx.strokeStyle = pal.dark
    ctx.lineWidth   = sw(THICK_STROKE * 2)
    ctx.lineCap     = 'square'
    ctx.stroke()
    ctx.lineCap     = 'round'
  }
}

