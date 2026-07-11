// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Farm
import { Ward } from './ward'
import { polyCentroid, polyRect } from '../geom/polygon'
import { Pt } from '../geom/pt'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

/** Countryside farm — a small house placed at a random location within the patch. */
export class Farm extends Ward {
  name = 'Farm'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const r = () => this.rng.float()

    // Pick a random vertex and interpolate toward the centroid
    const shape    = this.patch.shape
    const randomV  = shape[Math.floor(r() * shape.length)]
    const centroid = polyCentroid(shape)
    const t        = 0.3 + r() * 0.4
    const pos      = new Pt(
      randomV.x + (centroid.x - randomV.x) * t,
      randomV.y + (centroid.y - randomV.y) * t,
    )

    // Small 4×4 house, randomly rotated, placed at pos
    const housing  = polyRect(4, 4)
    const angle    = r() * Math.PI
    const ca = Math.cos(angle), sa = Math.sin(angle)
    for (const v of housing) {
      const nx = v.x * ca - v.y * sa
      const ny = v.y * ca + v.x * sa
      v.x = nx + pos.x
      v.y = ny + pos.y
    }

    this.geometry = Ward.createOrthoBuilding(housing, 8, 0.5, r)
  }

  override getLabel() { return 'Farm' }
}
