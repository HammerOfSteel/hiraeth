/**
 * Ward base class + all ward subclasses.
 * Port of com.watabou.citygenerator.Ward.hx and its subclasses.
 *
 * In Watabou's generator, each Patch has a Ward that governs:
 *  - Display colour
 *  - Building geometry (createAlleys / createOrthoBuilding)
 *  - Optional streets/alleys inside the block
 */
import { type Polygon } from '../geom/polygon'
import { createAlleys } from '../geom/cutter'
import type { Patch } from './patch'

// ─── Base Ward ────────────────────────────────────────────────────────────────

export abstract class Ward {
  readonly name:  string
  readonly color: string

  constructor(name: string, color: string) {
    this.name  = name
    this.color = color
  }

  /** Generate building lots inside `patch`. */
  createBuildings(patch: Patch, rng: () => number): Polygon[] {
    return createAlleys(patch.shape, this.minArea, this.gridChaos, this.sizeChaos, rng)
  }

  get minArea():   number { return 50 }
  get gridChaos(): number { return 0.5 }
  get sizeChaos(): number { return 0.5 }
}

// ─── Ward subclasses ──────────────────────────────────────────────────────────

export class CraftsmenWard extends Ward {
  constructor() { super('Craftsmen', '#c09060') }
  override get minArea():   number { return 40 }
  override get gridChaos(): number { return 0.6 }
}

export class MerchantWard extends Ward {
  constructor() { super('Merchant', '#a08040') }
  override get minArea(): number { return 80 }
}

export class CathedralWard extends Ward {
  constructor() { super('Cathedral', '#8888cc') }
  override get minArea():   number { return 600 }
  override get gridChaos(): number { return 0.2 }
  override get sizeChaos(): number { return 0.2 }
}

export class AdministrationWard extends Ward {
  constructor() { super('Administration', '#a0a0c0') }
  override get minArea():   number { return 300 }
  override get gridChaos(): number { return 0.2 }
}

export class SlumWard extends Ward {
  constructor() { super('Slum', '#908060') }
  override get minArea():   number { return 20 }
  override get gridChaos(): number { return 0.8 }
  override get sizeChaos(): number { return 0.8 }
}

export class PatriciateWard extends Ward {
  constructor() { super('Patriciate', '#b8a080') }
  override get minArea():   number { return 200 }
  override get gridChaos(): number { return 0.3 }
}

export class MarketWard extends Ward {
  constructor() { super('Market', '#d0b040') }
  override get minArea():   number { return 100 }
  override get gridChaos(): number { return 0.4 }
}

export class MilitaryWard extends Ward {
  constructor() { super('Military', '#808080') }
  override get minArea():   number { return 150 }
  override get gridChaos(): number { return 0.3 }
  override get sizeChaos(): number { return 0.3 }
}

export class ParkWard extends Ward {
  constructor() { super('Park', '#4a7a4a') }
  override get minArea():   number { return 500 }
  override createBuildings(_p: Patch, _rng: () => number): Polygon[] { return [] }
}

export class FarmWard extends Ward {
  constructor() { super('Farm', '#789060') }
  override get minArea():   number { return 150 }
  override get gridChaos(): number { return 0.5 }
}

export class GateWard extends Ward {
  constructor() { super('Gate', '#b06040') }
  override get minArea():   number { return 60 }
  override get gridChaos(): number { return 0.6 }
}

export class CastleWard extends Ward {
  constructor() { super('Castle', '#707070') }
  override get minArea():   number { return 1000 }
  override get gridChaos(): number { return 0.1 }
  override get sizeChaos(): number { return 0.1 }
  override createBuildings(_p: Patch, _rng: () => number): Polygon[] { return [] }
}

export class PlazaWard extends Ward {
  constructor() { super('Plaza', '#d0c080') }
  override createBuildings(_p: Patch, _rng: () => number): Polygon[] { return [] }
}

// ─── Ward factory ─────────────────────────────────────────────────────────────

const WARD_TYPES = [
  CraftsmenWard,
  MerchantWard,
  CathedralWard,
  AdministrationWard,
  SlumWard,
  PatriciateWard,
  MarketWard,
  MilitaryWard,
  ParkWard,
  FarmWard,
  GateWard,
  CastleWard,
  PlazaWard,
] as const

export function randomWard(rng: () => number): Ward {
  const weights = [20, 15, 5, 5, 20, 8, 8, 5, 5, 10, 5, 2, 0]
  const total   = weights.reduce((s, w) => s + w, 0)
  let r = rng() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return new WARD_TYPES[i]()
  }
  return new WARD_TYPES[0]()
}
