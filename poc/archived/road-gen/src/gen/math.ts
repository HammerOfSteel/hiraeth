// ─── Minimal seeded PRNG (mulberry32) ────────────────────────────────────────
export function seededRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s |= 0; s = s + 0x6d2b79f5 | 0
    let t = Math.imul(s ^ s >>> 15, 1 | s)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// ─── Vec2 helpers ────────────────────────────────────────────────────────────
export const v2 = {
  add:    (a: {x:number,y:number}, b: {x:number,y:number}) => ({ x: a.x+b.x, y: a.y+b.y }),
  sub:    (a: {x:number,y:number}, b: {x:number,y:number}) => ({ x: a.x-b.x, y: a.y-b.y }),
  scale:  (a: {x:number,y:number}, s: number)              => ({ x: a.x*s,   y: a.y*s }),
  len:    (a: {x:number,y:number})                         => Math.sqrt(a.x*a.x + a.y*a.y),
  norm:   (a: {x:number,y:number}) => {
    const l = Math.sqrt(a.x*a.x + a.y*a.y) || 1
    return { x: a.x/l, y: a.y/l }
  },
  dot:    (a: {x:number,y:number}, b: {x:number,y:number}) => a.x*b.x + a.y*b.y,
  perp:   (a: {x:number,y:number}) => ({ x: -a.y, y: a.x }),
  dist:   (a: {x:number,y:number}, b: {x:number,y:number}) => {
    const dx = a.x-b.x, dy = a.y-b.y; return Math.sqrt(dx*dx+dy*dy)
  },
  lerp:   (a: {x:number,y:number}, b: {x:number,y:number}, t: number) =>
          ({ x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t }),
  rot:    (a: {x:number,y:number}, angle: number) => ({
    x: a.x*Math.cos(angle) - a.y*Math.sin(angle),
    y: a.x*Math.sin(angle) + a.y*Math.cos(angle),
  }),
}

// ─── Tensor field ─────────────────────────────────────────────────────────────
// A tensor field stores major eigenvectors. We represent it as an angle θ so
// eigenvectors are (cos θ, sin θ) and (−sin θ, cos θ).
// We combine multiple basis fields by averaging their double-angle representation
// (standard trick for headless vectors / line fields).

export interface TensorField {
  sample(x: number, y: number): number // returns θ in radians
}

export type BasisKind = 'grid' | 'radial' | 'noise'

export interface BasisField {
  kind: BasisKind
  cx: number; cy: number   // centre
  strength: number         // 0-1 blend weight
  angle: number            // base angle for grid fields
  radius: number           // falloff radius
}

/** Simple Perlin-like noise via value noise + bilinear interpolation */
function valueNoise(x: number, y: number, _rng: () => number, scale: number): number {
  const ix = Math.floor(x / scale), iy = Math.floor(y / scale)
  const fx = (x / scale) - ix, fy = (y / scale) - iy
  const hash = (a: number, b: number) => {
    let h = (a * 92837111) ^ (b * 689287499)
    h = Math.imul(h ^ h >>> 15, 0x45d9f3b)
    return (h >>> 0) / 4294967296
  }
  const v00 = hash(ix,   iy)   * Math.PI * 2
  const v10 = hash(ix+1, iy)   * Math.PI * 2
  const v01 = hash(ix,   iy+1) * Math.PI * 2
  const v11 = hash(ix+1, iy+1) * Math.PI * 2
  const sx = fx*fx*(3-2*fx), sy = fy*fy*(3-2*fy)
  return v00*(1-sx)*(1-sy) + v10*sx*(1-sy) + v01*(1-sx)*sy + v11*sx*sy
}

export function buildTensorField(
  bases: BasisField[],
  mapSize: number,
  _seed: number
): TensorField {
  return {
    sample(x, y) {
      // Convert each basis to double-angle (2θ) representation, weight, sum, halve
      let cosSum = 0, sinSum = 0, wSum = 0
      for (const b of bases) {
        const dx = x - b.cx, dy = y - b.cy
        const dist = Math.sqrt(dx*dx + dy*dy)
        const falloff = Math.max(0, 1 - dist / b.radius)
        const w = b.strength * falloff

        let theta: number
        if (b.kind === 'grid') {
          theta = b.angle
        } else if (b.kind === 'radial') {
          theta = Math.atan2(dy, dx)
        } else {
          // noise — small wiggle around base angle
          const n = valueNoise(x, y, () => 0, mapSize * 0.15)
          theta = b.angle + (n - Math.PI) * 0.4
        }

        cosSum += w * Math.cos(2 * theta)
        sinSum += w * Math.sin(2 * theta)
        wSum   += w
      }
      if (wSum < 1e-6) return 0
      return Math.atan2(sinSum, cosSum) * 0.5
    }
  }
}
