import type { RoadGraph } from './RoadNetwork'

export type ZoneType = 'residential' | 'commercial' | 'civic' | 'green'

export interface Parcel {
  id: number
  cx: number      // world X centre
  cz: number      // world Z centre
  width: number   // along-road dimension
  depth: number   // perpendicular depth from road
  angle: number   // Y-axis rotation (radians)
  zone: ZoneType
}

export class ParcelGenerator {
  /**
   * Generate building parcels along every road edge.
   * Commercial parcels are placed along the centre of the main road
   * (the "high street"); residential elsewhere.
   */
  static generate(graph: RoadGraph): Parcel[] {
    if (graph.nodes.length === 0) return []

    const parcels: Parcel[] = []
    let id = 0

    // High-street zone: middle 40% of the main road Z range
    const mainNodes = graph.nodes.filter(n => n.isMainRoad)
    const minZ = Math.min(...mainNodes.map(n => n.wz))
    const maxZ = Math.max(...mainNodes.map(n => n.wz))
    const rangeZ = maxZ - minZ
    const hsLo = minZ + rangeZ * 0.30
    const hsHi = minZ + rangeZ * 0.70

    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]))

    for (const edge of graph.edges) {
      const from = nodeMap.get(edge.from)
      const to   = nodeMap.get(edge.to)
      if (!from || !to) continue

      const rdx = to.wx - from.wx
      const rdz = to.wz - from.wz
      const len = Math.sqrt(rdx * rdx + rdz * rdz)
      if (len < 3) continue

      const nx = rdx / len   // unit road direction
      const nz = rdz / len
      const px = -nz         // left perpendicular
      const pz =  nx

      const avgZ = (from.wz + to.wz) / 2
      const isHighStreet = edge.type === 'main' && avgZ >= hsLo && avgZ <= hsHi

      const zone: ZoneType = isHighStreet ? 'commercial' : 'residential'
      const parcelW = edge.type === 'main' ? 9  : 11
      const parcelD = edge.type === 'main' ? 13 : 17
      const roadGap = 3.5   // gap from road centre to parcel near-edge

      const count = Math.max(1, Math.floor(len / (parcelW + 1.5)))
      const angle = Math.atan2(nx, nz)

      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count
        const ox = from.wx + rdx * t
        const oz = from.wz + rdz * t
        const offset = roadGap + parcelD / 2

        // Both sides of the road
        for (const side of [1, -1]) {
          parcels.push({
            id: id++,
            cx: ox + px * offset * side,
            cz: oz + pz * offset * side,
            width: parcelW,
            depth: parcelD,
            angle,
            zone,
          })
        }
      }
    }

    return parcels
  }
}
