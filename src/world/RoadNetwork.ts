import type { Heightmap } from './TerrainGenerator'
import { mulberry32 } from '@utils/Seeder'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoadNode {
  id: number
  gx: number        // grid X
  gz: number        // grid Z
  wx: number        // world X
  wz: number        // world Z
  isMainRoad: boolean
}

export interface RoadEdge {
  from: number   // node id
  to: number     // node id
  type: 'main' | 'side'
}

export interface RoadGraph {
  nodes: RoadNode[]
  edges: RoadEdge[]
}

type Coord = [number, number]  // [gx, gz]

// ── Binary min-heap ───────────────────────────────────────────────────────────

class MinHeap {
  private _d: Array<[number, number]> = []  // [nodeKey, priority]

  push(k: number, p: number): void {
    this._d.push([k, p])
    this._up(this._d.length - 1)
  }

  pop(): [number, number] | undefined {
    if (!this._d.length) return undefined
    const top = this._d[0]!
    const last = this._d.pop()!
    if (this._d.length) { this._d[0] = last; this._down(0) }
    return top
  }

  get size(): number { return this._d.length }

  private _up(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this._d[p]![1] <= this._d[i]![1]) break
      ;[this._d[p], this._d[i]] = [this._d[i]!, this._d[p]!]
      i = p
    }
  }

  private _down(i: number): void {
    const n = this._d.length
    while (true) {
      let s = i
      const l = 2 * i + 1, r = 2 * i + 2
      if (l < n && this._d[l]![1] < this._d[s]![1]) s = l
      if (r < n && this._d[r]![1] < this._d[s]![1]) s = r
      if (s === i) break
      ;[this._d[s], this._d[i]] = [this._d[i]!, this._d[s]!]
      i = s
    }
  }
}

// ── A* / Dijkstra ─────────────────────────────────────────────────────────────

function cellKey(x: number, z: number, w: number): number {
  return z * w + x
}

function moveCost(hm: Heightmap, x0: number, z0: number, x1: number, z1: number): number {
  const h0 = hm.data[z0 * hm.width + x0] as number
  const h1 = hm.data[z1 * hm.width + x1] as number
  const gradient = Math.abs(h1 - h0)
  // Prefer flat, low terrain
  return 1 + gradient * 10 + h1 * 2.5
}

/** Dijkstra with binary heap. Returns grid path or null. */
function findPath(
  hm: Heightmap,
  sx: number, sz: number,
  ex: number, ez: number,
): Coord[] | null {
  const { width, depth } = hm
  const dist    = new Float32Array(width * depth).fill(Infinity)
  const parent  = new Int32Array(width * depth).fill(-1)
  const visited = new Uint8Array(width * depth)

  const startKey = cellKey(sx, sz, width)
  dist[startKey] = 0
  const heap = new MinHeap()
  heap.push(startKey, 0)

  const DIRS: Coord[] = [[1, 0], [-1, 0], [0, 1], [0, -1]]

  while (heap.size > 0) {
    const [key] = heap.pop()!
    if (visited[key]) continue
    visited[key] = 1

    const cx = key % width
    const cz = Math.floor(key / width)

    if (cx === ex && cz === ez) break

    for (const [dx, dz] of DIRS) {
      const nx = cx + dx, nz = cz + dz
      if (nx < 0 || nx >= width || nz < 0 || nz >= depth) continue
      const nKey = cellKey(nx, nz, width)
      if (visited[nKey]) continue
      const nd = (dist[key] as number) + moveCost(hm, cx, cz, nx, nz)
      if (nd < (dist[nKey] as number)) {
        dist[nKey] = nd
        parent[nKey] = key
        heap.push(nKey, nd)
      }
    }
  }

  const endKey = cellKey(ex, ez, width)
  if (dist[endKey] === Infinity) return null

  // Reconstruct
  const path: Coord[] = []
  let k = endKey
  while (k !== startKey) {
    path.push([k % width, Math.floor(k / width)])
    const p = parent[k]
    if (p === undefined || p < 0) return null
    k = p
  }
  path.push([sx, sz])
  return path.reverse()
}

// ── RoadNetwork ───────────────────────────────────────────────────────────────

export class RoadNetwork {
  static generate(heightmap: Heightmap, seed: number): RoadGraph {
    const { width, depth, config } = heightmap
    const { worldWidth, worldDepth } = config

    const rng = mulberry32(seed ^ 0xdeadbeef)

    function toWorld(gx: number, gz: number): { wx: number; wz: number } {
      return {
        wx: (gx / (width - 1)) * worldWidth - worldWidth / 2,
        wz: (gz / (depth - 1)) * worldDepth - worldDepth / 2,
      }
    }

    const nodes: RoadNode[] = []
    const edges: RoadEdge[] = []
    let nextId = 0

    // ── Main road: valley floor north → south ─────────────────────────────────
    const topX = RoadNetwork.findValleyX(heightmap, 3)
    const botX = RoadNetwork.findValleyX(heightmap, depth - 4)

    const rawPath = findPath(heightmap, topX, 3, botX, depth - 4)
    if (!rawPath || rawPath.length < 2) return { nodes, edges }

    // Sub-sample: keep one node per ~8 grid cells
    const stride = Math.max(4, Math.floor(rawPath.length / 20))
    const mainIds: number[] = []

    for (let i = 0; i < rawPath.length; i += stride) {
      const [gx, gz] = rawPath[i]!
      const { wx, wz } = toWorld(gx, gz)
      const id = nextId++
      nodes.push({ id, gx, gz, wx, wz, isMainRoad: true })
      mainIds.push(id)
    }
    // Always include the final point
    const [lgx, lgz] = rawPath[rawPath.length - 1]!
    const lastW = toWorld(lgx, lgz)
    if (nodes[nodes.length - 1]!.gz !== lgz) {
      const id = nextId++
      nodes.push({ id, gx: lgx, gz: lgz, wx: lastW.wx, wz: lastW.wz, isMainRoad: true })
      mainIds.push(id)
    }

    // Connect main road in sequence
    for (let i = 0; i < mainIds.length - 1; i++) {
      edges.push({ from: mainIds[i]!, to: mainIds[i + 1]!, type: 'main' })
    }

    // ── Side streets: perpendicular branches at intervals ─────────────────────
    const branchEvery  = 3   // every Nth main-road node
    const sideLen      = Math.floor(width * 0.18)  // how far the side street goes

    for (let i = 1; i < mainIds.length - 1; i += branchEvery) {
      const mainNode = nodes[mainIds[i]!]!

      for (const dir of [-1, 1]) {
        const len = sideLen + Math.floor((rng() - 0.5) * 6)
        const streetIds: number[] = [mainIds[i]!]
        let curX = mainNode.gx

        for (let s = 1; s <= len; s++) {
          const nx = curX + dir
          if (nx < 2 || nx >= width - 2) break
          const { wx, wz } = toWorld(nx, mainNode.gz)
          const id = nextId++
          nodes.push({ id, gx: nx, gz: mainNode.gz, wx, wz, isMainRoad: false })
          streetIds.push(id)
          curX = nx
        }

        for (let j = 0; j < streetIds.length - 1; j++) {
          edges.push({ from: streetIds[j]!, to: streetIds[j + 1]!, type: 'side' })
        }
      }
    }

    return { nodes, edges }
  }

  /** Return the x index with the lowest elevation in a given grid row,
   *  constrained to the central 60% of the width. */
  static findValleyX(hm: Heightmap, gz: number): number {
    const lo = Math.floor(hm.width * 0.2)
    const hi = Math.floor(hm.width * 0.8)
    let minH = hm.data[gz * hm.width + lo] as number
    let minX = lo
    for (let x = lo + 1; x <= hi; x++) {
      const h = hm.data[gz * hm.width + x] as number
      if (h < minH) { minH = h; minX = x }
    }
    return minX
  }

  /**
   * BFS connectivity check: true if every node is reachable from node[0].
   */
  static isConnected(graph: RoadGraph): boolean {
    if (graph.nodes.length === 0) return true
    const adj = new Map<number, number[]>()
    for (const n of graph.nodes) adj.set(n.id, [])
    for (const e of graph.edges) {
      adj.get(e.from)!.push(e.to)
      adj.get(e.to)!.push(e.from)
    }
    const visited = new Set<number>()
    const queue = [graph.nodes[0]!.id]
    visited.add(queue[0]!)
    while (queue.length) {
      for (const nb of adj.get(queue.shift()!)!) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
      }
    }
    return visited.size === graph.nodes.length
  }
}
