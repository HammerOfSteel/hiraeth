// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.CraftsmenWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class CraftsmenWard extends CommonWard {
  minSq     = 10 + Math.random() * 80   // 10 – 90
  gridChaos = 0.5 + Math.random() * 0.2  // 0.5 – 0.7
  sizeChaos = 0.6
  name      = 'Craftsmen'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Craftsmen' }
}
