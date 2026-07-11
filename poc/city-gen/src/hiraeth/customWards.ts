// src/hiraeth/customWards.ts — Hiraeth-specific ward types
import { CommonWard } from '../wards/commonWard'
import { Ward, ALLEY } from '../wards/ward'
import { polyCentroid, polyShrinkEq, polySquare } from '../geom/polygon'
import { radial } from '../model/cutter'
import { createWard as baseCreateWard } from '../wards/index'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

// ── Inn ───────────────────────────────────────────────────────────────────────
export class InnWard extends CommonWard {
  minSq     = 30 + Math.random() * 40
  gridChaos = 0.3 + Math.random() * 0.2
  sizeChaos = 0.4
  name      = 'Inn'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Inn' }
}

// ── Blacksmith ────────────────────────────────────────────────────────────────
export class BlacksmithWard extends CommonWard {
  minSq     = 20 + Math.random() * 25
  gridChaos = 0.3 + Math.random() * 0.15
  sizeChaos = 0.4
  name      = 'Blacksmith'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Blacksmiths' }
}

// ── Docks ─────────────────────────────────────────────────────────────────────
export class DocksWard extends CommonWard {
  minSq     = 25 + Math.random() * 40
  gridChaos = 0.2 + Math.random() * 0.1
  sizeChaos = 0.3
  name      = 'Docks'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Docks' }
}

// ── Herbalist ─────────────────────────────────────────────────────────────────
export class HerbalistWard extends Ward {
  name = 'Herbalist'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const block = this.getCityBlock()
    if (block.length < 3) return

    // Mix of small buildings + garden sectors
    const c = polyCentroid(block)
    const sectors = radial(block, c, ALLEY)

    for (const s of sectors) {
      const sq = Math.abs(polySquare(s))
      if (Math.random() < 0.4 && sq > 10) {
        this.geometry.push(polyShrinkEq(s, ALLEY / 2))
      }
    }
  }

  override getLabel() { return 'Herbalist' }
}

// ── Extended createWard factory ───────────────────────────────────────────────
export function createWard(name: string, model: Model, patch: Patch): Ward {
  switch (name) {
    case 'Inn':        return new InnWard(model, patch)
    case 'Blacksmith': return new BlacksmithWard(model, patch)
    case 'Docks':      return new DocksWard(model, patch)
    case 'Herbalist':  return new HerbalistWard(model, patch)
    default:           return baseCreateWard(name, model, patch)
  }
}
