// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Park
import { Ward } from './ward'
import { polyCentroid, polyShrinkEq } from '../geom/polygon'
import { radial } from '../model/cutter'
import { ALLEY } from './ward'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

/** Green space — radial sectors, no buildings. */
export class Park extends Ward {
  name = 'Park'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const block = this.getCityBlock()
    if (block.length < 3) return
    // Radial sectors with gaps — filled with "greenery" (rendered as park by renderer)
    const center  = polyCentroid(block)
    const sectors = radial(block, center, ALLEY)
    // Keep only sectors with reasonable area (~1/4 of block)
    const fill = 0.5
    this.geometry = sectors.filter(() => Math.random() < fill).map(s => polyShrinkEq(s, ALLEY / 2))
  }

  override getLabel() { return 'Park' }
}
