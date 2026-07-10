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
   * Build a flat ground mesh from a Heightmap using VertexData.
   *
   * The mesh is FLAT — all Y coordinates are 0. The heightmap data is used
   * only to determine vertex colour zones (valley floor, hillside, moorland,
   * etc.). This suits the isometric camera: altitude variation doesn't read
   * well at normal zoom; landscape character comes from colour and objects.
   */
  static create(heightmap: Heightmap, scene: Scene): Mesh {
    const { data, width, depth, config } = heightmap
    const { worldWidth, worldDepth } = config  // maxHeight intentionally unused

    const dx = worldWidth / (width - 1)
    const dz = worldDepth / (depth - 1)
    const ox = -worldWidth / 2
    const oz = -worldDepth / 2

    const positions: number[] = []
    const uvs: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    // ── Vertices (Y = 0 always) ───────────────────────────────────────────────
    for (let z = 0; z < depth; z++) {
      for (let x = 0; x < width; x++) {
        positions.push(ox + x * dx, 0, oz + z * dz)   // flat Y = 0
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

    // ── Normals (all pointing straight up for a flat mesh) ────────────────────
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
    // StandardMaterial inherits vertexColorsEnabled from Material base class.
    // The TypeScript declarations for BJS 9 don't surface it on the derived type,
    // but it exists at runtime and is required for the colours buffer to be used.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(mat as any).vertexColorsEnabled = true
    mat.specularColor = new Color3(0.03, 0.03, 0.03)   // near-matte ground
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
