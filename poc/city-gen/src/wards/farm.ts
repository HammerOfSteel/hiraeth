// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Farm
import { Ward } from './ward'
import { polySquare, polyCentroid } from '../geom/polygon'
import { bisect } from '../model/cutter'
import { ALLEY } from './ward'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

/** Countryside farm — iterative bisect strips. */
export class Farm extends Ward {
  name = 'Farm'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    let block = this.getCityBlock()
    if (block.length < 3) return

    // Iteratively bisect into field strips
    const MIN_FIELD_SQ = 30
    const r = () => this.rng.float()
    const strips: typeof block[] = [block]
    let remaining = strips.slice()

    for (let _i = 0; _i < 6 && remaining.length > 0; _i++) {
      const next: typeof block[] = []
      for (const strip of remaining) {
        const sq = Math.abs(polySquare(strip))
        if (sq > MIN_FIELD_SQ * 4) {
          const halves = bisect(strip, strip[0], 0.4 + r() * 0.2, 0, ALLEY / 2)
          for (const h of halves) {
            if (Math.abs(polySquare(h)) > MIN_FIELD_SQ) next.push(h)
            else this.geometry.push(h)
          }
        } else {
          this.geometry.push(strip)
        }
      }
      remaining = next
    }
    this.geometry.push(...remaining)
  }

  override getLabel() { return 'Farm' }
}
