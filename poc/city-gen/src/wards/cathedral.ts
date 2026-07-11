// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Cathedral
import { Ward } from './ward'
import { ring } from '../model/cutter'
import { polySquare, polyDistance, polyCenter, polyBorders } from '../geom/polygon'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class Cathedral extends Ward {
  name = 'Cathedral'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const block = this.getCityBlock()
    if (block.length < 3) return
    const r = () => this.rng.float()
    // 40% ring of chapels; 60% orthogonal keep
    this.geometry = r() < 0.4
      ? ring(block, 2 + r() * 4)
      : Ward.createOrthoBuilding(block, 50, 0.8, r)
  }

  override getLabel() { return 'Cathedral' }

  static rateLocation(model: Model, patch: Patch): number {
    const plazaCenter = model.plaza != null ? polyCenter(model.plaza.shape) : model.center
    if (model.plaza != null && polyBorders(patch.shape, model.plaza.shape))
      return -1 / Math.abs(polySquare(patch.shape))
    return polyDistance(patch.shape, plazaCenter) * Math.abs(polySquare(patch.shape))
  }
}
