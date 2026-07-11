// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Cathedral
import { Ward } from './ward'
import { ring } from '../model/cutter'
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
}
