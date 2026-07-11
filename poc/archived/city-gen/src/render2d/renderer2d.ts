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
} from './brush'
import { MAIN_STREET } from '../wards/ward'

export interface Renderer2DOptions {
  palette:      Palette
  colourMode?:  boolean   // use WARD_COLOURS instead of palette.light for buildings
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

    // ── Background (paper only — no per-patch fills) ──────────────────────
    ctx.fillStyle = p.paper
    ctx.fillRect(-w / scale / 2, -h / scale / 2, w / scale, h / scale)

    // ── Roads (two-pass: wide medium, narrow paper) ───────────────────────
    for (const a of model.arteries) this._drawRoad(a, MAIN_STREET + NORMAL_STROKE, p.medium)
    for (const a of model.arteries) this._drawRoad(a, MAIN_STREET - NORMAL_STROKE, p.paper)

    // ── Ward geometry ─────────────────────────────────────────────────────
    for (const patch of model.patches) {
      const ward = patch.ward
      if (ward == null || ward.geometry.length === 0) continue
      const wardName = ward.name

      const fill   = (this._opts.colourMode && WARD_COLOURS[wardName]) ? WARD_COLOURS[wardName].fill   : p.light
      const stroke = (this._opts.colourMode && WARD_COLOURS[wardName]) ? WARD_COLOURS[wardName].stroke : p.dark

      if (wardName === 'Castle') {
        // Two-pass: thick outline all buildings, then fill all
        this._drawBuildingGroup(ward.geometry, fill, stroke, NORMAL_STROKE * 2)
      } else if (wardName === 'Cathedral') {
        // Two-pass: outline then fill
        this._drawBuildingGroup(ward.geometry, fill, stroke, NORMAL_STROKE)
      } else if (wardName === 'Park') {
        // Groves: medium fill, no stroke
        for (const g of ward.geometry) this._fillPolygon(g, p.medium)
      } else {
        // Craftsmen, Merchant, Slum, Gate, Admin, Military, Patriciate,
        // Farm, Market — single-pass fill + stroke
        for (const g of ward.geometry) this._drawBuilding(g, fill, stroke, NORMAL_STROKE)
      }
    }

    // ── Castle curtain wall ───────────────────────────────────────────────
    if (model.citadel != null) {
      const castle = model.citadel.ward
      if (castle != null && 'wall' in castle) {
        const cwall = (castle as { wall: CurtainWall }).wall
        this._drawWallLine(cwall, THICK_STROKE, p.dark)
        for (const t of cwall.towers) this._drawCircle(t, THICK_STROKE * 1.5, p.dark)
        for (const g of cwall.gates)  this._drawGateTick(g, cwall, p.dark)
      }
    }

    // ── City wall ─────────────────────────────────────────────────────────
    if (model.wall != null) {
      this._drawWallLine(model.wall, THICK_STROKE, p.dark)
      for (const t of model.wall.towers) this._drawCircle(t, THICK_STROKE, p.dark)
      for (const g of model.wall.gates)  this._drawGateTick(g, model.wall, p.dark)
    }

    // ── Border outline (dashed, thin) when no wall ────────────────────────
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

  /** Two-pass building group: outline all, then fill all (Castle/Cathedral style). */
  private _drawBuildingGroup(polys: Polygon[], fill: string, stroke: string, lw: number): void {
    for (const poly of polys) this._strokePolygon(poly, lw * 2, stroke)
    for (const poly of polys) this._fillPolygon(poly, fill)
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

  /** Draw a gate tick: a short line ALONG the wall direction at the gate vertex. */
  private _drawGateTick(gate: Pt, wall: CurtainWall, color: string): void {
    const shape = wall.shape
    const idx   = shape.indexOf(gate)
    if (idx === -1) return
    const next = shape[(idx + 1) % shape.length]
    const prev = shape[(idx + shape.length - 1) % shape.length]
    // Tangent direction along the wall at the gate
    const dx = next.x - prev.x, dy = next.y - prev.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const tl  = THICK_STROKE * 1.5
    const tx  = dx / len * tl, ty = dy / len * tl
    const ctx = this._ctx
    ctx.beginPath()
    ctx.moveTo(gate.x - tx, gate.y - ty)
    ctx.lineTo(gate.x + tx, gate.y + ty)
    ctx.strokeStyle = color
    ctx.lineWidth   = THICK_STROKE * 2
    ctx.lineCap     = 'butt'
    ctx.stroke()
  }
}
