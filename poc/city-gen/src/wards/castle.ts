// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Castle
import { Ward, ALLEY, MAIN_STREET } from './ward'
import { polyCentroid, polyShrinkEq, polySquare } from '../geom/polygon'
import { semiRadial } from '../model/cutter'
import { CurtainWall } from '../model/curtainWall'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

const KEEP_MIN_SQ = 50

export class Castle extends Ward {
  wall!: CurtainWall
  name  = 'Castle'

  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const shape = this.patch.shape

    // Inner curtain wall around citadel
    this.wall = new CurtainWall(true, this.model, [this.patch], [])
    this.wall.buildTowers()

    const center    = polyCentroid(shape)
    const courtyard = semiRadial(shape, center, ALLEY)

    let maxSq = -1, keepIdx = -1
    for (let i = 0; i < courtyard.length; i++) {
      const sq = Math.abs(polySquare(courtyard[i]))
      if (sq > maxSq) { maxSq = sq; keepIdx = i }
    }

    for (let i = 0; i < courtyard.length; i++) {
      const s  = courtyard[i]
      const sq = Math.abs(polySquare(s))
      if (i === keepIdx && sq >= KEEP_MIN_SQ) {
        this.geometry.push(polyShrinkEq(s, MAIN_STREET / 2))
      } else if (sq >= KEEP_MIN_SQ / 4) {
        this.geometry.push(polyShrinkEq(s, ALLEY / 2))
      }
    }
  }

  override getLabel() { return 'Castle' }
}
