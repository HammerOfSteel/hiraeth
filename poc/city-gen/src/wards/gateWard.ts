// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.GateWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class GateWard extends CommonWard {
  minSq     = 15 + Math.random() * 40   // 15 – 55
  gridChaos = 0.4 + Math.random() * 0.3
  sizeChaos = 0.5
  name      = 'Gate'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Gate' }
}
