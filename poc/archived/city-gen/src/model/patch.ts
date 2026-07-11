// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.building.Patch

import { Pt } from '../geom/pt'
import { type Polygon, polySquare, polyCenter, polyGetBounds } from '../geom/polygon'
import type { Region } from '../geom/voronoi'
import type { Ward } from '../wards/ward'

export class Patch {
  shape:       Polygon
  ward:        Ward | null = null
  withinWalls: boolean     = false
  withinCity:  boolean     = false

  constructor(vertices: Pt[]) {
    this.shape = [...vertices]
  }

  get area():   number { return Math.abs(polySquare(this.shape)) }
  get center(): Pt     { return polyCenter(this.shape) }
  get bounds()         { return polyGetBounds(this.shape) }

  /** Build a Patch from a Voronoi region (circumcenters become the polygon vertices). */
  static fromRegion(r: Region): Patch {
    return new Patch(r.triangles.map(t => t.c))
  }
}
