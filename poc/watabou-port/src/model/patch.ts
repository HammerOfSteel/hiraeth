/**
 * Patch — port of com.watabou.citygenerator.Patch.hx
 *
 * A Patch is a single Voronoi cell that becomes one city block.
 * It holds:
 *  - shape    : the polygon (circumcenters of the cell's Delaunay triangles)
 *  - withinWall: whether it is inside the city wall
 *  - ward     : the type of urban district assigned to it
 */
import { Pt } from '../geom/pt'
import { type Polygon, polyBounds, polyCenter, polySquare } from '../geom/polygon'
import type { Region } from '../geom/voronoi'
import type { Ward } from './ward'

export class Patch {
  shape:      Polygon
  withinWall: boolean
  ward:       Ward | null
  _npatch:    number  // city-generator internal id

  constructor(shape: Polygon) {
    this.shape      = shape
    this.withinWall = false
    this.ward       = null
    this._npatch    = 0
  }

  get area(): number {
    return Math.abs(polySquare(this.shape))
  }

  get center(): Pt {
    return polyCenter(this.shape)
  }

  get bounds(): { left: number; top: number; right: number; bottom: number } {
    return polyBounds(this.shape)
  }

  /** Build a Patch from a Voronoi Region (circumcenters become vertices). */
  static fromRegion(region: Region, _npatches?: number): Patch {
    const shape: Polygon = region.triangles.map(t => t.c)
    const patch = new Patch(shape)
    patch._npatch = _npatches ?? 0
    return patch
  }
}
