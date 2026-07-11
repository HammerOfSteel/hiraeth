// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.mapping.CityMap

import { type Pt } from '../geom/pt'
import { type Polygon } from '../geom/polygon'
import { type Model } from '../model/model'
import { type CurtainWall } from '../model/curtainWall'
import { type Street } from '../model/topology'
import { type Palette, WARD_COLOURS } from './palette'
import {
  NORMAL_STROKE, THICK_STROKE, THIN_STROKE,
  TOWER_RADIUS, GATE_TICK,
} from './brush'
import { MAIN_STREET } from '../wards/ward'

export interface Renderer2DOptions {
  palette:      Palette
  colourMode?:  boolean   // use WARD_COLOURS instead of palette.light for buildings
}

/** Mix two CSS hex colours by `t` (0 = a, 1 = b). */
function mixHex(a: string, b: string, t: number): string {
  const pr = (h: string) => parseInt(h.slice(1), 16)
  const ca = pr(a), cb = pr(b)
  const ra = (ca >> 16) & 0xff, ga = (ca >> 8) & 0xff, ba = ca & 0xff
  const rb = (cb >> 16) & 0xff, gb = (cb >> 8) & 0xff, bb = cb & 0xff
  const r = Math.round(ra + (rb - ra) * t)
  const g = Math.round(ga + (gb - ga) * t)
  const bl = Math.round(ba + (bb - ba) * t)
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${bl.toString(16).padStart(2,'0')}`
}

// ─────────────────────────────────────────────────────────────────────────────

export class Renderer2D {
  private _ctx:  CanvasRenderingContext2D
  private _w:    number
  private _h:    number
  private _opts: Renderer2DOptions

  constructor(ctx: CanvasRenderingContext2D, opts: Renderer2DOptions) {
    this._ctx  = ctx
    this._w    = ctx.canvas.width
    this._h    = ctx.canvas.height
    this._opts = opts
  }

  render(model: Model): void {
    const { _ctx: ctx, _w: w, _h: h } = this
    const p = this._opts.palette

    // ── Transform: world → canvas ──────────────────────────────────────────
    const scale = Math.min(w, h) / (model.cityRadius * 2) * 0.9
    ctx.save()
    ctx.translate(w / 2, h / 2)
    ctx.scale(scale, scale)

    // ── Background ─────────────────────────────────────────────────────────
    ctx.fillStyle = p.paper
    ctx.fillRect(-w / scale / 2, -h / scale / 2, w / scale, h / scale)

    // ── Patch backgrounds ──────────────────────────────────────────────────
    for (const patch of model.patches) {
      const wardName = patch.ward?.name ?? ''
      let fill = p.paper
      if (wardName === 'Park')   fill = p.medium
      else if (wardName === 'Farm')   fill = mixHex(p.paper, p.medium, 0.05)
      else if (wardName === 'Market') fill = mixHex(p.paper, p.medium, 0.2)
      else if (patch.withinCity)      fill = mixHex(p.paper, p.medium, 0.08)
      this._fillPolygon(patch.shape, fill)
    }

    // ── Roads (two-pass: wide + narrow) ───────────────────────────────────
    for (const a of model.arteries) {
      this._drawRoad(a, MAIN_STREET + NORMAL_STROKE, p.medium)
    }
    for (const a of model.arteries) {
      this._drawRoad(a, MAIN_STREET - NORMAL_STROKE, p.paper)
    }

    // ── Plaza / market open square ─────────────────────────────────────────
    if (model.plaza != null) {
      this._fillPolygon(model.plaza.shape, mixHex(p.paper, p.medium, 0.25))
    }

    // ── Buildings ──────────────────────────────────────────────────────────
    for (const patch of model.patches) {
      const ward = patch.ward
      if (ward == null) continue

      const wardName = ward.name
      if (wardName === 'Park' || wardName === 'Market' || wardName === 'Farm') continue

      let fill   = p.light
      let stroke = p.dark
      let lw     = NORMAL_STROKE

      if (this._opts.colourMode && WARD_COLOURS[wardName]) {
        fill   = WARD_COLOURS[wardName].fill
        stroke = WARD_COLOURS[wardName].stroke
      }

      if (wardName === 'Castle' || wardName === 'Cathedral') lw = NORMAL_STROKE * 2

      for (const building of ward.geometry) {
        this._drawBuilding(building, fill, stroke, lw)
      }
    }

    // ── Castle wall ────────────────────────────────────────────────────────
    if (model.citadel != null) {
      const castle = model.citadel.ward
      if (castle != null && 'wall' in castle) {
        const cwall = (castle as { wall: CurtainWall }).wall
        this._drawWallLine(cwall, THICK_STROKE * 0.6, p.dark)
        for (const t of cwall.towers) this._drawCircle(t, TOWER_RADIUS * 0.8, p.dark)
        for (const g of cwall.gates)  this._drawGateTick(g, cwall, p.dark)
      }
    }

    // ── City wall ──────────────────────────────────────────────────────────
    if (model.wall != null) {
      this._drawWallLine(model.wall, THICK_STROKE, p.dark)
      for (const t of model.wall.towers) this._drawCircle(t, TOWER_RADIUS, p.dark)
      for (const g of model.wall.gates)  this._drawGateTick(g, model.wall, p.dark)
    }

    // ── Border outline (dashed, thin) ──────────────────────────────────────
    if (model.wall == null) {
      ctx.save()
      ctx.setLineDash([1, 2])
      this._strokePolygon(model.border.shape, THIN_STROKE, p.medium)
      ctx.restore()
    }

    ctx.restore()
  }

  // ─── Drawing primitives ──────────────────────────────────────────────────

  private _fillPolygon(poly: Polygon, color: string): void {
    if (poly.length < 3) return
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(poly[0].x, poly[0].y)
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y)
    ctx.closePath()
    ctx.fillStyle = color
    ctx.fill()
  }

  private _strokePolygon(poly: Polygon, lw: number, color: string): void {
    if (poly.length < 2) return
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(poly[0].x, poly[0].y)
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y)
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.lineWidth   = lw
    ctx.stroke()
  }

  private _drawBuilding(poly: Polygon, fill: string, stroke: string, lw: number): void {
    if (poly.length < 3) return
    this._fillPolygon(poly, fill)
    this._strokePolygon(poly, lw, stroke)
  }

  private _drawRoad(pts: Street, lw: number, color: string): void {
    if (pts.length < 2) return
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = color
    ctx.lineWidth   = lw
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
  }

  private _drawWallLine(wall: CurtainWall, lw: number, color: string): void {
    const shape = wall.shape
    const segs  = wall.segments
    if (shape.length < 2) return
    const ctx = this._ctx
    ctx.strokeStyle = color
    ctx.lineWidth   = lw
    ctx.lineCap     = 'butt'
    ctx.lineJoin    = 'miter'
    for (let i = 0; i < shape.length; i++) {
      if (!segs[i]) continue
      const v0 = shape[i], v1 = shape[(i + 1) % shape.length]
      ctx.beginPath()
      ctx.moveTo(v0.x, v0.y)
      ctx.lineTo(v1.x, v1.y)
      ctx.stroke()
    }
  }

  private _drawCircle(pt: Pt, r: number, color: string): void {
    const ctx = this._ctx
    ctx.beginPath()
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  /** Draw a small perpendicular tick mark at a gate position. */
  private _drawGateTick(gate: Pt, wall: CurtainWall, color: string): void {
    const shape = wall.shape
    const idx   = shape.indexOf(gate)
    if (idx === -1) return
    const prev = shape[(idx + shape.length - 1) % shape.length]
    const next = shape[(idx + 1) % shape.length]
    // Direction along the wall at the gate
    const dx = next.x - prev.x, dy = next.y - prev.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Perpendicular
    const px = -dy / len * GATE_TICK, py = dx / len * GATE_TICK
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(gate.x - px, gate.y - py)
    ctx.lineTo(gate.x + px, gate.y + py)
    ctx.strokeStyle = color
    ctx.lineWidth   = NORMAL_STROKE * 2
    ctx.stroke()
  }
}
