// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.MerchantWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class MerchantWard extends CommonWard {
  minSq     = 0
  gridChaos = 0
  sizeChaos = 0.7
  emptyProb = 0.15
  name      = 'Merchant'
  constructor(model: Model, patch: Patch) {
    super(model, patch)
    const r = () => this.rng.float()
    this.minSq     = 50 + 60 * r() * r()
    this.gridChaos = 0.5 + 0.3 * r()
  }
  override getLabel() { return 'Merchants' }
}
