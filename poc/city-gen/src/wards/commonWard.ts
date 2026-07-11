// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.CommonWard

import { Ward } from './ward'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

export abstract class CommonWard extends Ward {
  abstract minSq:      number
  abstract gridChaos:  number
  abstract sizeChaos:  number
  emptyProb = 0.04

  override createGeometry(): void {
    this.geometry = []
    let block = this.getCityBlock()
    if (block.length < 3) return

    if (!this.patch.withinCity) {
      const clipped = Ward.filterOutskirts(block, this.model.border.shape)
      if (clipped == null) return
      block = clipped
    }

    this.geometry = Ward.createAlleys(block, this.minSq, this.gridChaos, this.sizeChaos, this.emptyProb)
  }

  // Subclasses can call this to randomize params at construction time
  protected _randomize(
    minSqMin: number, minSqRange: number,
    chaosMin: number, chaosRange: number,
    sizeChaosFix: number,
  ): void {
    this.minSq     = minSqMin  + Math.random() * minSqRange
    this.gridChaos = chaosMin  + Math.random() * chaosRange
    this.sizeChaos = sizeChaosFix
  }
}

// Re-export for convenience
export type { Model, Patch }
