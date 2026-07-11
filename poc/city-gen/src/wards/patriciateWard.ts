// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.PatriciateWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class PatriciateWard extends CommonWard {
  minSq     = 100 + Math.random() * 100  // 100 – 200
  gridChaos = 0.2 + Math.random() * 0.2  // 0.2 – 0.4
  sizeChaos = 0.3
  emptyProb = 0.1
  name      = 'Patriciate'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Patriciate' }
}
