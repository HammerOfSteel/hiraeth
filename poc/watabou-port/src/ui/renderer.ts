/**
 * Renderer — port of com.watabou.citygenerator.CityMap.hx
 *
 * Draws the city to a Canvas 2D context.
 * Coordinate system: model uses centred coordinates (origin = plaza).
 * We translate to canvas centre.
 */
import { Pt } from '../geom/pt'
import { type Polygon } from '../geom/polygon'
import { type CityData } from '../model/model'

const SCALE = 2.2   // world units → pixels per unit

function worldToCanvas(p: Pt, cx: number, cy: number): [number, number] {
  return [cx + p.x * SCALE, cy + p.y * SCALE]
}

function polyPath(ctx: CanvasRenderingContext2D, poly: Polygon, cx: number, cy: number): void {
  ctx.beginPath()
  const [x0, y0] = worldToCanvas(poly[0], cx, cy)
  ctx.moveTo(x0, y0)
  for (let i = 1; i < poly.length; i++) {
    const [x, y] = worldToCanvas(poly[i], cx, cy)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

function linePath(ctx: CanvasRenderingContext2D, pts: Pt[], cx: number, cy: number): void {
  ctx.beginPath()
  const [x0, y0] = worldToCanvas(pts[0], cx, cy)
  ctx.moveTo(x0, y0)
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = worldToCanvas(pts[i], cx, cy)
    ctx.lineTo(x, y)
  }
}

export function renderCity(canvas: HTMLCanvasElement, city: CityData): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width, H = canvas.height
  const cx = W / 2, cy = H / 2

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#1a1a24'
  ctx.fillRect(0, 0, W, H)

  // ── 1. Patches (ward colours) ─────────────────────────────────────────────

  for (const patch of city.patches) {
    const color = patch.ward?.color ?? (patch.withinWall ? '#3a3530' : '#2a2520')
    polyPath(ctx, patch.shape, cx, cy)
    ctx.fillStyle = color + '55'
    ctx.fill()
    ctx.strokeStyle = '#50504040'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }

  // ── 2. City wall ─────────────────────────────────────────────────────────

  if (city.wall.length > 2) {
    polyPath(ctx, city.wall, cx, cy)
    ctx.strokeStyle = '#a09060'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.fillStyle = '#a0906010'
    ctx.fill()
  }

  // ── 3. Streets (double line) ──────────────────────────────────────────────

  for (const street of city.streets) {
    if (street.length < 2) continue
    // Road fill (wide, dark dirt)
    linePath(ctx, street, cx, cy)
    ctx.strokeStyle = '#604830'
    ctx.lineWidth = 7
    ctx.lineJoin  = 'round'
    ctx.lineCap   = 'round'
    ctx.stroke()
    // Road surface (thinner, lighter)
    linePath(ctx, street, cx, cy)
    ctx.strokeStyle = '#9a8060'
    ctx.lineWidth = 4
    ctx.stroke()
  }

  // ── 4. Buildings ──────────────────────────────────────────────────────────

  for (const bld of city.buildings) {
    if (bld.length < 3) continue
    polyPath(ctx, bld, cx, cy)
    ctx.fillStyle = '#c8b88880'
    ctx.fill()
    ctx.strokeStyle = '#80603040'
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // ── 5. Gates ─────────────────────────────────────────────────────────────

  for (const gate of city.gates) {
    const [gx, gy] = worldToCanvas(gate, cx, cy)
    ctx.beginPath()
    ctx.arc(gx, gy, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#f0c040'
    ctx.fill()
    ctx.strokeStyle = '#a08020'
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // ── 6. Plaza dot ──────────────────────────────────────────────────────────

  if (city.plaza) {
    const c = city.plaza.center
    const [px, py] = worldToCanvas(c, cx, cy)
    ctx.beginPath()
    ctx.arc(px, py, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#f8e880'
    ctx.fill()
    ctx.strokeStyle = '#c0a020'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}
