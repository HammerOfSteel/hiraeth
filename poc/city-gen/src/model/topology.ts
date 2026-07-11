// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.building.Topology

import { Pt } from '../geom/pt'
import { type Polygon, polySmoothVertexEq } from '../geom/polygon'
import { Graph, Node } from '../geom/graph'
import type { Model } from './model'

export type Street = Pt[]

export class Topology {
  inner: Set<Node>
  outer: Set<Node>

  private _graph:   Graph
  private _pt2node: Map<Pt, Node>

  constructor(model: Model) {
    this._graph   = new Graph()
    this._pt2node = new Map()
    this.inner    = new Set()
    this.outer    = new Set()

    // Blocked = citadel + wall vertices, minus gates
    const blocked = new Set<Pt>()
    if (model.citadel != null) for (const v of model.citadel.shape) blocked.add(v)
    if (model.wall    != null) for (const v of model.wall.shape)     blocked.add(v)
    for (const g of model.gates) blocked.delete(g)

    const border = model.border.shape

    for (const p of model.patches) {
      const withinCity = p.withinCity
      let v1 = p.shape[p.shape.length - 1]
      let n1 = this._processPoint(v1, blocked)

      for (let i = 0; i < p.shape.length; i++) {
        const v0 = v1, n0 = n1
        v1 = p.shape[i]
        n1 = this._processPoint(v1, blocked)

        if (n0 != null && !border.includes(v0)) {
          if (withinCity) this.inner.add(n0)
          else            this.outer.add(n0)
        }
        if (n1 != null && !border.includes(v1)) {
          if (withinCity) this.inner.add(n1)
          else            this.outer.add(n1)
        }

        if (n0 != null && n1 != null) n0.connect(n1, Pt.distance(v0, v1))
      }
    }
  }

  private _processPoint(v: Pt, blocked: Set<Pt>): Node | null {
    let n = this._pt2node.get(v)
    if (n == null) {
      n = this._graph.add(v)
      this._pt2node.set(v, n)
    }
    return blocked.has(v) ? null : n
  }

  buildPath(from: Pt, to: Pt, exclude?: Set<Node>): Street | null {
    const nFrom = this._pt2node.get(from)
    const nTo   = this._pt2node.get(to)
    if (nFrom == null || nTo == null) return null
    return this._graph.aStar(nFrom, nTo, exclude) ?? null
  }

  /** Iterate all (node, point) pairs in the topology. */
  allPoints(): IterableIterator<[Node, Pt]> {
    return this._pt2node.entries() as IterableIterator<[Node, Pt]>
  }

  /** Smooth a street path in-place (keep first + last points fixed). */
  static smooth(street: Street): void {
    const smoothed = polySmoothVertexEq(street, 3)
    for (let i = 1; i < street.length - 1; i++) street[i].set(smoothed[i])
  }
}

// Re-export for renderer use
export type { Polygon }
