// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.MerchantWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class MerchantWard extends CommonWard {
  minSq     = 50 + Math.random() * 60   // 50 – 110
  gridChaos = 0.3 + Math.random() * 0.2  // 0.3 – 0.5
  sizeChaos = 0.7
  emptyProb = 0.15
  name      = 'Merchant'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Merchants' }
}
