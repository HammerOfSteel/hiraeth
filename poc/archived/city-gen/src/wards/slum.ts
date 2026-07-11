// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Slum
import { CommonWard } from './commonWard'
import { polyDistance, polyCenter } from '../geom/polygon'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class Slum extends CommonWard {
  minSq     = 0
  gridChaos = 0
  sizeChaos = 0
  name      = 'Slum'
  constructor(model: Model, patch: Patch) {
    super(model, patch)
    const r = () => this.rng.float()
    this.minSq     = 10 + 30 * r() * r()
    this.gridChaos = 0.6 + 0.4 * r()
    this.sizeChaos = 0.6 + 0.4 * r()
  }
  override getLabel() { return 'Slums' }

  static rateLocation(model: Model, patch: Patch): number {
    const c = model.plaza != null ? polyCenter(model.plaza.shape) : model.center
    return -polyDistance(patch.shape, c)  // farthest from center
  }
}
