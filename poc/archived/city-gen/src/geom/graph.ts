// SPDX-License-Identifier: GPL-3.0
// Graph with Dijkstra shortest path — port of com.watabou.towngenerator.building.Topology graph

import { Pt } from './pt'

export class Node {
  pt: Pt
  links: Map<Node, number>  // neighbour → edge weight

  constructor(pt: Pt) { this.pt = pt; this.links = new Map() }

  connect(other: Node, weight: number): void {
    this.links.set(other, weight)
    other.links.set(this, weight)
  }
}

export class Graph {
  nodes: Set<Node>

  constructor() { this.nodes = new Set() }

  add(pt: Pt): Node {
    const n = new Node(pt)
    this.nodes.add(n)
    return n
  }

  /** Dijkstra from `start` to `goal`. Returns ordered list of Pt or null if unreachable. */
  aStar(start: Node, goal: Node, exclude?: Set<Node>): Pt[] | null {
    const dist = new Map<Node, number>()
    const prev = new Map<Node, Node | null>()
    for (const n of this.nodes) { dist.set(n, Infinity); prev.set(n, null) }
    dist.set(start, 0)

    const open = new Set<Node>([start])

    while (open.size > 0) {
      // Pick node with smallest distance
      let u: Node | null = null
      let best = Infinity
      for (const n of open) {
        const d = dist.get(n) ?? Infinity
        if (d < best) { best = d; u = n }
      }
      if (u === null) break
      if (u === goal) break
      open.delete(u)

      for (const [v, w] of u.links) {
        if (exclude?.has(v) && v !== goal) continue
        const alt = (dist.get(u) ?? Infinity) + w
        if (alt < (dist.get(v) ?? Infinity)) {
          dist.set(v, alt)
          prev.set(v, u)
          open.add(v)
        }
      }
    }

    if ((dist.get(goal) ?? Infinity) === Infinity) return null

    // Reconstruct path
    const path: Pt[] = []
    let cur: Node | null = goal
    while (cur !== null) { path.unshift(cur.pt); cur = prev.get(cur) ?? null }
    return path
  }
}
