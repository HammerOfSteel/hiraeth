// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.AdministrationWard
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class AdministrationWard extends CommonWard {
  minSq     = 80 + Math.random() * 60   // 80 – 140
  gridChaos = 0.1 + Math.random() * 0.15
  sizeChaos = 0.4
  emptyProb = 0.1
  name      = 'Administration'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Administration' }
}
