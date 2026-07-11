// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Castle
import { Ward, MAIN_STREET } from './ward'
import { polyShrinkEq, polySquare } from '../geom/polygon'
import { CurtainWall } from '../model/curtainWall'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class Castle extends Ward {
  wall!: CurtainWall
  name  = 'Castle'

  constructor(model: Model, patch: Patch) {
    super(model, patch)
    // Build the castle's own inner curtain wall.
    // Reserved = vertices that border non-city patches (open to fields)
    const reserved = patch.shape.filter(v =>
      model.patchByVertex(v).some(p => !p.withinCity)
    )
    this.wall = new CurtainWall(true, model, [patch], reserved)
    this.wall.buildTowers()
  }

  override createGeometry(): void {
    this.geometry = []
    const block = polyShrinkEq(this.patch.shape, MAIN_STREET * 2)
    if (block.length < 3) return
    const sq = Math.abs(polySquare(block))
    this.geometry = Ward.createOrthoBuilding(block, Math.sqrt(sq) * 4, 0.6, () => this.rng.float())
  }

  override getLabel() { return 'Castle' }
}
