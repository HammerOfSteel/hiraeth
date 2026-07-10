import type { Heightmap } from './TerrainGenerator'

export interface RiverPoint {
  x: number  // world X
  z: number  // world Z
  y: number  // world Y (terrain surface + small offset)
}

export interface RiverPath {
  points: RiverPoint[]
  width: number  // world units
}

export class RiverSystem {
  /**
   * Trace the main river through the valley by following the lowest cell
   * row by row from north (z=0) to south (z=depth-1).
   * Returns one RiverPath (or empty array if the map is too small).
   */
  static generate(heightmap: Heightmap): RiverPath[] {
    const { data, width, depth, config } = heightmap
    const { worldWidth, worldDepth, maxHeight } = config

    if (depth < 4) return []

    // Find the lowest point in the top few rows near the valley centre
    let cx = RiverSystem._lowestInBand(data, width, 2, 0.25, 0.75)

    const points: RiverPoint[] = []
    const step = 2  // sample every N rows for a smoother path

    for (let gz = 0; gz < depth; gz += step) {
      const gzClamped = Math.min(gz, depth - 1)
      const worldX = (cx / (width - 1)) * worldWidth - worldWidth / 2
      const worldZ = (gzClamped / (depth - 1)) * worldDepth - worldDepth / 2
      const worldY = (data[gzClamped * width + cx] as number) * maxHeight + 0.08

      points.push({ x: worldX, z: worldZ, y: worldY })

      // Advance cx toward the lowest neighbour ±3 cells in the next row
      if (gz + step < depth) {
        const nextZ = Math.min(gz + step, depth - 1)
        let nextX = cx
        let minH = data[nextZ * width + cx] as number
        for (let dx = -3; dx <= 3; dx++) {
          const nx = cx + dx
          if (nx < 1 || nx >= width - 1) continue
          const h = data[nextZ * width + nx] as number
          if (h < minH - 0.001) { minH = h; nextX = nx }
        }
        // Constrain movement: max 1 cell per step so the river doesn't teleport
        if (nextX > cx) cx = Math.min(cx + 1, nextX)
        else if (nextX < cx) cx = Math.max(cx - 1, nextX)
      }
    }

    return points.length >= 2 ? [{ points, width: 3.5 }] : []
  }

  /** Find the lowest x index in a row within [loFrac, hiFrac] of the width. */
  private static _lowestInBand(
    data: Float32Array, width: number, z: number,
    loFrac: number, hiFrac: number,
  ): number {
    const lo = Math.max(1, Math.floor(width * loFrac))
    const hi = Math.min(width - 2, Math.floor(width * hiFrac))
    let minH = data[z * width + lo] as number
    let minX = lo
    for (let x = lo + 1; x <= hi; x++) {
      const h = data[z * width + x] as number
      if (h < minH) { minH = h; minX = x }
    }
    return minX
  }
}
