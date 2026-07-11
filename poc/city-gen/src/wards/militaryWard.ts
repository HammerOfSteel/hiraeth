// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.MilitaryWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class MilitaryWard extends CommonWard {
  minSq     = 40 + Math.random() * 40   // 40 – 80
  gridChaos = 0.0 + Math.random() * 0.1  // 0.0 – 0.1  (very regular)
  sizeChaos = 0.1
  name      = 'Military'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Military' }
}
