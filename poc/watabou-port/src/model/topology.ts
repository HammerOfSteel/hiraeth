/**
 * Topology — port of com.watabou.citygenerator.Topology.hx
 *
 * Builds a graph from all Voronoi patch edges, then routes streets
 * with A* from each city gate to the central plaza.
 */
import { Pt } from '../geom/pt'
import { polyForEdge, polySmoothVertexEq } from '../geom/polygon'
import { Graph, Node } from '../geom/graph'
import type { Patch } from './patch'

export class Topology {
  graph:    Graph
  pt2node:  Map<Pt, Node>

  constructor() {
    this.graph   = new Graph()
    this.pt2node = new Map()
  }

  private getOrAdd(p: Pt): Node {
    let n = this.pt2node.get(p)
    if (!n) {
      n = this.graph.add(p)
      this.pt2node.set(p, n)
    }
    return n
  }

  /** Register all patch boundary edges as graph edges. */
  addPatch(patch: Patch): void {
    polyForEdge(patch.shape, (a, b) => {
      const na = this.getOrAdd(a)
      const nb = this.getOrAdd(b)
      if (!na.links.has(nb)) {
        const w = Pt.distance(a, b)
        na.connect(nb, w)
      }
    })
  }

  /**
   * Route a street (A*) from `from` to `to`.
   * blocked: set of Pt objects (wall/citadel) that may not be used.
   * Returns smoothed polyline (same Pt references + new interpolated ones).
   */
  buildPath(from: Pt, to: Pt, blocked: Set<Pt>): Pt[] {
    const startNode = this.pt2node.get(from)
    const goalNode  = this.pt2node.get(to)
    if (!startNode || !goalNode) return [from, to]

    const blockedNodes = new Set<Node>(
      [...blocked].flatMap(p => {
        const n = this.pt2node.get(p)
        return n ? [n] : []
      })
    )

    const path = this.graph.aStar(startNode, goalNode, blockedNodes)
    if (!path) return [from, to]

    // Extract Pt objects from nodes
    const pts: Pt[] = path.map(n => n.pt)

    // Smooth (smoothVertexEq with f=3, 2 passes)
    let smoothed = polySmoothVertexEq(pts, 3)
    smoothed     = polySmoothVertexEq(smoothed, 3)

    return smoothed
  }
}
