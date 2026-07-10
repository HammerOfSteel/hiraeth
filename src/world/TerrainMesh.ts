import { Mesh, Scene, VertexData, StandardMaterial, Color3 } from '@babylonjs/core'
import type { Heightmap } from './TerrainGenerator'

// Colour bands mapped to normalised height
interface RGB { r: number; g: number; b: number }
const SPLAT_BANDS: Array<{ maxH: number; color: RGB }> = [
  { maxH: 0.10, color: { r: 0.28, g: 0.20, b: 0.12 } }, // river mud
  { maxH: 0.20, color: { r: 0.20, g: 0.30, b: 0.16 } }, // valley floor grass
  { maxH: 0.45, color: { r: 0.24, g: 0.36, b: 0.19 } }, // gentle hillside
  { maxH: 0.65, color: { r: 0.30, g: 0.33, b: 0.20 } }, // rough upland
  { maxH: 0.82, color: { r: 0.37, g: 0.33, b: 0.25 } }, // moorland / heather
  { maxH: 1.00, color: { r: 0.44, g: 0.40, b: 0.36 } }, // rock / outcrop
]

export class TerrainMesh {
  /**
   * Build a Babylon.js mesh from a Heightmap using VertexData.
   * Vertex colours provide a height-based splat without a texture.
   */
  static create(heightmap: Heightmap, scene: Scene): Mesh {
    const { data, width, depth, config } = heightmap
    const { worldWidth, worldDepth, maxHeight } = config

    const dx = worldWidth / (width - 1)
    const dz = worldDepth / (depth - 1)
    const ox = -worldWidth / 2
    const oz = -worldDepth / 2

    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    // ── Vertices ──────────────────────────────────────────────────────────────
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        const h = (data[z * width + x] as number) * maxHeight
        positions.push(ox + x * dx, h, oz + z * dz)
        uvs.push(x / (width - 1), z / (depth - 1))
        const { r, g, b } = TerrainMesh.splatColor(data[z * width + x] as number)
        colors.push(r, g, b, 1)
      }
    }

    // ── Indices (two CCW triangles per quad) ──────────────────────────────────
    for (let z = 0; z < depth - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        const tl = z * width + x
        const tr = z * width + (x + 1)
        const bl = (z + 1) * width + x
        const br = (z + 1) * width + (x + 1)
        indices.push(tl, bl, tr, tr, bl, br)
      }
    }

    // ── Normals (computed from geometry) ─────────────────────────────────────
    const normsArr = new Float32Array(positions.length)
    VertexData.ComputeNormals(positions, indices, normsArr)

    const vd = new VertexData()
    vd.positions = positions
    vd.indices   = indices
    vd.normals   = Array.from(normsArr)
    vd.uvs       = uvs
    vd.colors    = colors

    const mesh = new Mesh('terrain', scene)
    vd.applyToMesh(mesh)

    const mat = new StandardMaterial('terrainMat', scene)
    // vertexColorsEnabled is handled automatically by Babylon.js 9 when colors
    // are present in the VertexData — no explicit opt-in needed.
    mat.specularColor = new Color3(0.04, 0.04, 0.04)
    mesh.material = mat

    return mesh
  }

  /** Map a normalised height value to a vertex colour. */
  static splatColor(h: number): RGB {
    for (const band of SPLAT_BANDS) {
      if (h <= band.maxH) return band.color
    }
    return SPLAT_BANDS[SPLAT_BANDS.length - 1]!.color
  }
}
