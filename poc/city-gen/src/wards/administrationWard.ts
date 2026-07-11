// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.AdministrationWard
import { CommonWard } from './commonWard'
import { polyDistance, polyCenter, polyBorders } from '../geom/polygon'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class AdministrationWard extends CommonWard {
  minSq     = 0
  gridChaos = 0
  sizeChaos = 0.3
  emptyProb = 0.1
  name      = 'Administration'
  constructor(model: Model, patch: Patch) {
    super(model, patch)
    const r = () => this.rng.float()
    this.minSq     = 80 + 30 * r() * r()
    this.gridChaos = 0.1 + 0.3 * r()
  }
  override getLabel() { return 'Administration' }

  static rateLocation(model: Model, patch: Patch): number {
    if (model.plaza != null) {
      if (polyBorders(patch.shape, model.plaza.shape)) return 0
      return polyDistance(patch.shape, polyCenter(model.plaza.shape))
    }
    return polyDistance(patch.shape, model.center)
  }
}
