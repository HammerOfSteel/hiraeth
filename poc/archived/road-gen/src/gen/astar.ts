/** A* pathfinding on a grid cost map.
 *  costMap: Float32Array of size×size, cost per cell.
 *  Returns array of world-space Vec2 points, or [] if no path.
 */

import type { Vec2 } from './types'

interface Node {
  g: number
  f: number
  parent: number | null
}

export function astar(
  from: Vec2,
  to: Vec2,
  costMap: Float32Array,
  _mapSize: number,
  worldToGrid: (v: Vec2) => { col: number; row: number },
  gridToWorld: (col: number, row: number) => Vec2,
  gridSize: number,
): Vec2[] {
  const { col: sc, row: sr } = worldToGrid(from)
  const { col: ec, row: er } = worldToGrid(to)

  const idx = (c: number, r: number) => r * gridSize + c
  const inBounds = (c: number, r: number) => c >= 0 && c < gridSize && r >= 0 && r < gridSize

  const open = new Set<number>()
  const closed = new Set<number>()
  const nodes = new Map<number, Node>()

  const h = (c: number, r: number) => Math.abs(c - ec) + Math.abs(r - er)

  const startIdx = idx(sc, sr)
  nodes.set(startIdx, { g: 0, f: h(sc, sr), parent: null })
  open.add(startIdx)

  const DIRS = [
    [1,0],[0,1],[-1,0],[0,-1],
    [1,1],[1,-1],[-1,1],[-1,-1],
  ]

  let iterations = 0
  const MAX_ITER = gridSize * gridSize

  while (open.size > 0 && iterations++ < MAX_ITER) {
    // Pick lowest f in open
    let cur = -1, bestF = Infinity
    for (const i of open) {
      const n = nodes.get(i)!
      if (n.f < bestF) { bestF = n.f; cur = i }
    }
    if (cur === -1) break

    const curC = cur % gridSize, curR = Math.floor(cur / gridSize)

    if (cur === idx(ec, er)) {
      // Reconstruct path
      const path: Vec2[] = []
      let n: number | null = cur
      while (n !== null) {
        const c = n % gridSize, r = Math.floor(n / gridSize)
        path.unshift(gridToWorld(c, r))
        n = nodes.get(n)!.parent
      }
      // Simplify: keep only every 4th point + endpoints
      const simplified: Vec2[] = [path[0]]
      for (let i = 4; i < path.length - 1; i += 4) simplified.push(path[i])
      simplified.push(path[path.length - 1])
      return simplified
    }

    open.delete(cur)
    closed.add(cur)

    for (const [dc, dr] of DIRS) {
      const nc = curC + dc, nr = curR + dr
      if (!inBounds(nc, nr)) continue
      const ni = idx(nc, nr)
      if (closed.has(ni)) continue
      const moveCost = (Math.abs(dc) + Math.abs(dr) > 1) ? 1.414 : 1
      const cellCost = costMap[ni] ?? 1
      const newG = nodes.get(cur)!.g + moveCost * cellCost

      const existing = nodes.get(ni)
      if (!existing || newG < existing.g) {
        nodes.set(ni, { g: newG, f: newG + h(nc, nr), parent: cur })
        open.add(ni)
      }
    }
  }

  // Fallback: straight line if A* fails
  return [from, to]
}
