// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Slum
import { CommonWard } from './commonWard'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class Slum extends CommonWard {
  minSq     = 10 + Math.random() * 30    // 10 – 40
  gridChaos = 0.6 + Math.random() * 0.4  // 0.6 – 1.0
  sizeChaos = 0.6 + Math.random() * 0.4
  name      = 'Slum'
  constructor(model: Model, patch: Patch) { super(model, patch) }
  override getLabel() { return 'Slums' }
}
