// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Market
import { Ward } from './ward'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

/** Open marketplace — empty square with a thin inset border. */
export class Market extends Ward {
  name = 'Market'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    // Just the open square outline; no buildings
  }

  override getLabel() { return 'Market' }
}
