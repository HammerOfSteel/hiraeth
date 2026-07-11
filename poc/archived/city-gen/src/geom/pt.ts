// SPDX-License-Identifier: GPL-3.0
// Port of openfl.geom.Point + com.watabou.utils.PointExtender

export class Pt {
  x: number
  y: number

  constructor(x = 0, y = 0) { this.x = x; this.y = y }

  // ── Immutable ops (return new Pt) ─────────────────────────────────────────

  add(p: Pt): Pt      { return new Pt(this.x + p.x, this.y + p.y) }
  subtract(p: Pt): Pt { return new Pt(this.x - p.x, this.y - p.y) }
  scale(s: number): Pt { return new Pt(this.x * s, this.y * s) }

  /** Return new Pt in the same direction but with magnitude `len`. */
  norm(len = 1): Pt {
    const l = this.length
    return l === 0 ? new Pt() : new Pt(this.x / l * len, this.y / l * len)
  }

  /** Rotate 90° CCW: (x, y) → (−y, x) */
  rotate90(): Pt { return new Pt(-this.y, this.x) }

  rotate(a: number): Pt {
    const c = Math.cos(a), s = Math.sin(a)
    return new Pt(this.x * c - this.y * s, this.y * c + this.x * s)
  }

  // ── Mutable ops (modify this, return this) ────────────────────────────────

  addEq(p: Pt): this   { this.x += p.x; this.y += p.y; return this }
  scaleEq(s: number): this { this.x *= s; this.y *= s; return this }
  offset(dx: number, dy: number): this { this.x += dx; this.y += dy; return this }
  set(p: Pt): this     { this.x = p.x; this.y = p.y; return this }
  setTo(x: number, y: number): this { this.x = x; this.y = y; return this }

  /** Normalize in-place to length `len`. */
  normalize(len = 1): this {
    const l = this.length
    if (l !== 0) { this.x = this.x / l * len; this.y = this.y / l * len }
    return this
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  get length(): number { return Math.sqrt(this.x * this.x + this.y * this.y) }
  dot(p: Pt): number   { return this.x * p.x + this.y * p.y }
  atan(): number        { return Math.atan2(this.y, this.x) }

  // ── Static ────────────────────────────────────────────────────────────────

  static distance(a: Pt, b: Pt): number {
    const dx = a.x - b.x, dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  static zero(): Pt { return new Pt(0, 0) }
}
