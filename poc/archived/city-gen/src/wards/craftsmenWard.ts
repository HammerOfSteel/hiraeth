// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.CraftsmenWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class CraftsmenWard extends CommonWard {
  minSq     = 0
  gridChaos = 0
  sizeChaos = 0.6
  name      = 'Craftsmen'
  constructor(model: Model, patch: Patch) {
    super(model, patch)
    const r = () => this.rng.float()
    this.minSq     = 10 + 80 * r() * r()   // squared → biased small
    this.gridChaos = 0.5 + 0.2 * r()
  }
  override getLabel() { return 'Craftsmen' }
}
