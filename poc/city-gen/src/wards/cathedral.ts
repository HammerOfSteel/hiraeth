// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Cathedral
import { Ward, ALLEY, MAIN_STREET } from './ward'
import { polyCentroid, polyShrinkEq, polySquare } from '../geom/polygon'
import { radial } from '../model/cutter'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export class Cathedral extends Ward {
  name = 'Cathedral'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const block = this.getCityBlock()
    if (block.length < 3) return

    const center  = polyCentroid(block)
    const sectors = radial(block, center, ALLEY)

    // Largest sector = main body; rest = outbuildings / chapels
    let maxSq = -1, mainIdx = 0
    for (let i = 0; i < sectors.length; i++) {
      const sq = Math.abs(polySquare(sectors[i]))
      if (sq > maxSq) { maxSq = sq; mainIdx = i }
    }

    for (let i = 0; i < sectors.length; i++) {
      const s  = sectors[i]
      const sq = Math.abs(polySquare(s))
      if (i === mainIdx) {
        this.geometry.push(polyShrinkEq(s, MAIN_STREET / 4))
      } else if (sq > maxSq * 0.25) {
        this.geometry.push(polyShrinkEq(s, ALLEY / 2))
      }
    }
  }

  override getLabel() { return 'Cathedral' }
}
