// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.MilitaryWard
import { Ward } from './ward'
import { polySquare } from '../geom/polygon'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class MilitaryWard extends Ward {
  name = 'Military'

  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const block = this.getCityBlock()
    if (block.length < 3) return
    const r     = () => this.rng.float()
    const minSq = Math.sqrt(Math.abs(polySquare(block))) * (1 + r())
    const chaos = 0.1 + 0.3 * r()
    this.geometry = Ward.createAlleys(block, minSq, chaos, 0.3, 0.25, true, r)
  }

  override getLabel() { return 'Military' }
}
