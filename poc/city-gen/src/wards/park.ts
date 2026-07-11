// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Park
import { Ward, ALLEY } from './ward'
import { polyCompactness } from '../geom/polygon'
import { radial, semiRadial } from '../model/cutter'
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
    // Original: radial if compact, semiRadial if elongated
    this.geometry = polyCompactness(block) >= 0.7
      ? radial(block, null, ALLEY)
      : semiRadial(block, null, ALLEY)
  }

  override getLabel() { return 'Park' }
}
