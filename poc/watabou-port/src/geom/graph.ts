/**
 * Graph — port of com.watabou.utils.Graph.hx
 *
 * Simple undirected weighted graph + A* (actually Dijkstra since Haxe version
 * has no heuristic — but we keep the name for fidelity).
 */
import { Pt } from '../geom/pt'

// ─── Node ─────────────────────────────────────────────────────────────────────

export class Node {
  pt: Pt
  links: Map<Node, number>  // neighbor → edge weight

  constructor(pt: Pt) {
    this.pt    = pt
    this.links = new Map()
  }

  connect(other: Node, weight: number): void {
    this.links.set(other, weight)
    other.links.set(this, weight)
  }
}

// ─── Graph ────────────────────────────────────────────────────────────────────

export class Graph {
  nodes: Set<Node>

  constructor() { this.nodes = new Set() }

  add(pt: Pt): Node {
    const n = new Node(pt)
    this.nodes.add(n)
    return n
  }

  remove(n: Node): void {
    for (const [nb] of n.links) nb.links.delete(n)
    this.nodes.delete(n)
  }

  /**
   * A* (Dijkstra) from start to goal.
   * exclude: a set of nodes that may not be traversed.
   * Returns ordered path including start and goal, or null if unreachable.
   */
  aStar(start: Node, goal: Node, exclude?: Set<Node>): Node[] | null {
    const dist: Map<Node, number>   = new Map()
    const prev: Map<Node, Node|null> = new Map()
    const open: Set<Node>           = new Set()

    for (const n of this.nodes) {
      dist.set(n, Infinity)
      prev.set(n, null)
    }
    dist.set(start, 0)
    open.add(start)

    while (open.size > 0) {
      // Pick node in open with smallest dist
      let u: Node | null = null
      let uDist = Infinity
      for (const n of open) {
        const d = dist.get(n)!
        if (d < uDist) { uDist = d; u = n }
      }
      if (!u) break

      if (u === goal) {
        // Reconstruct path
        const path: Node[] = []
        let cur: Node | null = goal
        while (cur) { path.unshift(cur); cur = prev.get(cur)! }
        return path
      }

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

    return null
  }
}
