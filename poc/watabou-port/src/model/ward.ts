/**
 * Ward base class + all ward subclasses.
 * Port of com.watabou.citygenerator.Ward.hx and its subclasses.
 *
 * Street widths (world units) — from Ward.hx constants:
 *   MAIN_STREET    = 2.0
 *   REGULAR_STREET = 1.0
 *   ALLEY          = 0.6
 */
import { type Polygon, polySquare, polyShrinkEq } from '../geom/polygon'
import { createAlleys } from '../geom/cutter'
import type { Patch } from './patch'

export const MAIN_STREET    = 2.0
export const REGULAR_STREET = 1.0
export const ALLEY          = 0.6

// ─── Base Ward ────────────────────────────────────────────────────────────────

export abstract class Ward {
  readonly name:  string
  readonly color: string   // kept for legend display only — rendering uses palette

  constructor(name: string, color: string) {
    this.name  = name
    this.color = color
  }

  /**
   * Returns the inset "city block" polygon — space available for buildings
   * after accounting for street widths around the patch boundary.
   */
  getCityBlock(patch: Patch): Polygon {
    const inset = REGULAR_STREET / 2
    try {
      const insetPoly = polyShrinkEq(patch.shape, inset)
      // Reject degenerate results
      if (insetPoly.length >= 3 && Math.abs(polySquare(insetPoly)) > this.minArea * 0.5)
        return insetPoly
    } catch {}
    return patch.shape
  }

  /** Generate building lots inside the patch city block. */
  createBuildings(patch: Patch, rng: () => number): Polygon[] {
    const block = this.getCityBlock(patch)
    return createAlleys(block, this.minArea, this.gridChaos, this.sizeChaos, rng, ALLEY)
  }

  get minArea():   number { return 20 }
  get gridChaos(): number { return 0.5 }
  get sizeChaos(): number { return 0.5 }
}

// ─── Ward subclasses — minArea in world² units matching Watabou originals ─────

export class CraftsmenWard extends Ward {
  constructor() { super('Craftsmen', '#c09060') }
  override get minArea():   number { return 12 }
  override get gridChaos(): number { return 0.6 }
}

export class MerchantWard extends Ward {
  constructor() { super('Merchant', '#a08040') }
  override get minArea(): number { return 30 }
}

export class CathedralWard extends Ward {
  constructor() { super('Cathedral', '#8888cc') }
  override get minArea():   number { return 200 }
  override get gridChaos(): number { return 0.2 }
  override get sizeChaos(): number { return 0.2 }
}

export class AdministrationWard extends Ward {
  constructor() { super('Administration', '#a0a0c0') }
  override get minArea():   number { return 80 }
  override get gridChaos(): number { return 0.3 }
}

export class SlumWard extends Ward {
  constructor() { super('Slum', '#908060') }
  override get minArea():   number { return 8 }
  override get gridChaos(): number { return 0.9 }
  override get sizeChaos(): number { return 0.8 }
}

export class PatriciateWard extends Ward {
  constructor() { super('Patriciate', '#b8a080') }
  override get minArea():   number { return 60 }
  override get gridChaos(): number { return 0.3 }
}

export class MarketWard extends Ward {
  constructor() { super('Market', '#d0b040') }
  override get minArea():   number { return 25 }
  override get gridChaos(): number { return 0.4 }
}

export class MilitaryWard extends Ward {
  constructor() { super('Military', '#808080') }
  override get minArea():   number { return 50 }
  override get gridChaos(): number { return 0.3 }
  override get sizeChaos(): number { return 0.3 }
}

export class ParkWard extends Ward {
  constructor() { super('Park', '#4a7a4a') }
  override get minArea():   number { return 40 }
  override createBuildings(patch: Patch, rng: () => number): Polygon[] {
    // Parks: "groves" — use same algorithm but treat result as grove blobs
    return createAlleys(patch.shape, this.minArea, 0.8, 0.6, rng, 1.0)
  }
}

export class FarmWard extends Ward {
  constructor() { super('Farm', '#789060') }
  override get minArea():   number { return 50 }
  override get gridChaos(): number { return 0.5 }
}

export class GateWard extends Ward {
  constructor() { super('Gate', '#b06040') }
  override get minArea():   number { return 20 }
  override get gridChaos(): number { return 0.7 }
}

export class CastleWard extends Ward {
  constructor() { super('Castle', '#707070') }
  override get minArea():   number { return 300 }
  override get gridChaos(): number { return 0.1 }
  override get sizeChaos(): number { return 0.1 }
  override createBuildings(_patch: Patch, _rng: () => number): Polygon[] { return [] }
}

export class PlazaWard extends Ward {
  constructor() { super('Plaza', '#d0c080') }
  // Plaza = open space, no buildings drawn
  override createBuildings(_p: Patch, _rng: () => number): Polygon[] { return [] }
}

// ─── Ward factory ─────────────────────────────────────────────────────────────

const WARD_POOL: (new () => Ward)[] = [
  CraftsmenWard, MerchantWard, SlumWard, PatriciateWard, MarketWard,
  MilitaryWard, ParkWard, FarmWard, GateWard,
]
const WARD_WEIGHTS = [20, 15, 20, 8, 10, 5, 8, 12, 5]

export function randomWard(rng: () => number): Ward {
  const total = WARD_WEIGHTS.reduce((s, w) => s + w, 0)
  let r = rng() * total
  for (let i = 0; i < WARD_WEIGHTS.length; i++) {
    r -= WARD_WEIGHTS[i]
    if (r <= 0) return new WARD_POOL[i]()
  }
  return new WARD_POOL[0]()
}

