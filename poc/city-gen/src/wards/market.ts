// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.wards.Market
import { Ward } from './ward'
import { Pt } from '../geom/pt'
import { type Polygon, polyForEdge, polyCentroid, polyRect, polyRegular } from '../geom/polygon'
import type { Model } from '../model/model'
import type { Patch } from '../model/patch'

/** Open marketplace with a central fountain or statue. */
export class Market extends Ward {
  name = 'Market'
  constructor(model: Model, patch: Patch) { super(model, patch) }

  override createGeometry(): void {
    this.geometry = []
    const r = () => this.rng.float()
    const statue = r() < 0.6   // 60% statue, 40% fountain
    const offset = statue || r() < 0.3

    // Find the longest edge
    let v0: Pt | null = null, v1: Pt | null = null
    if (statue || offset) {
      let maxLen = -1
      polyForEdge(this.patch.shape, (a, b) => {
        const len = Pt.distance(a, b)
        if (len > maxLen) { maxLen = len; v0 = a; v1 = b }
      })
    }

    // Create object polygon
    let object: Polygon
    if (statue && v0 && v1) {
      object = polyRect(1 + r(), 1 + r())
      const angle = Math.atan2((v1 as Pt).y - (v0 as Pt).y, (v1 as Pt).x - (v0 as Pt).x)
      for (const v of object) {
        const c = Math.cos(angle), s = Math.sin(angle)
        const nx = v.x * c - v.y * s
        const ny = v.y * c + v.x * s
        v.x = nx; v.y = ny
      }
    } else {
      object = polyRegular(16, 1 + r())
    }

    // Position the object
    const centroid = polyCentroid(this.patch.shape)
    let cx: number, cy: number
    if (offset && v0 && v1) {
      const gravity = { x: ((v0 as Pt).x + (v1 as Pt).x) / 2, y: ((v0 as Pt).y + (v1 as Pt).y) / 2 }
      const t = 0.2 + r() * 0.4
      cx = centroid.x + (gravity.x - centroid.x) * t
      cy = centroid.y + (gravity.y - centroid.y) * t
    } else {
      cx = centroid.x; cy = centroid.y
    }

    for (const v of object) { v.x += cx; v.y += cy }
    this.geometry = [object]
  }

  override getLabel() { return 'Market' }
}
