/**
 * Pt — replaces openfl.geom.Point + PointExtender.
 * Uses mutable object identity so Map<Pt,…> keys work by reference,
 * exactly matching Watabou's Haxe algorithm.
 *
 * Naming convention:
 *   Immutable ops (return new Pt): add, sub, scale, norm, rotate90, rotate
 *   Mutable ops (modify self):     addEq, scaleEq, offset, set, setTo
 */
export class Pt {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }

  // ── immutable ─────────────────────────────────────────────────────────────

  add(p: Pt): Pt         { return new Pt(this.x + p.x, this.y + p.y) }
  subtract(p: Pt): Pt    { return new Pt(this.x - p.x, this.y - p.y) }
  scale(s: number): Pt   { return new Pt(this.x * s, this.y * s) }
  rotate90(): Pt         { return new Pt(-this.y, this.x) }   // CCW 90°

  get length(): number   { return Math.sqrt(this.x * this.x + this.y * this.y) }

  /** Normalize to length `len` (default 1). Returns new Pt. */
  norm(len = 1): Pt {
    const l = this.length
    return l > 0 ? this.scale(len / l) : new Pt()
  }

  dot(p: Pt): number     { return this.x * p.x + this.y * p.y }

  /** Angle in radians (Math.atan2(y, x)) */
  atan(): number         { return Math.atan2(this.y, this.x) }

  rotate(a: number): Pt {
    const c = Math.cos(a), s = Math.sin(a)
    return new Pt(this.x * c - this.y * s, this.y * c + this.x * s)
  }

  clone(): Pt            { return new Pt(this.x, this.y) }

  // ── mutable ───────────────────────────────────────────────────────────────

  addEq(p: Pt): this     { this.x += p.x; this.y += p.y; return this }
  scaleEq(s: number): this { this.x *= s; this.y *= s; return this }
  offset(dx: number, dy: number): this { this.x += dx; this.y += dy; return this }

  set(p: Pt): this       { this.x = p.x; this.y = p.y; return this }
  setTo(x: number, y: number): this { this.x = x; this.y = y; return this }

  // ── static ────────────────────────────────────────────────────────────────

  static distance(a: Pt, b: Pt): number {
    const dx = a.x - b.x, dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  static zero(): Pt { return new Pt(0, 0) }
}
