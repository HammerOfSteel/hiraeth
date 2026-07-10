import { Mesh, MeshBuilder, Scene, StandardMaterial, Color3, Vector3 } from '@babylonjs/core'
import type { RiverPath } from './RiverSystem'

export class WaterBodies {
  /**
   * Build a ribbon mesh that follows a river centre line.
   * The ribbon is offset left/right by half the river width using the
   * path tangent to stay perpendicular at each sample point.
   */
  static createRiver(river: RiverPath, scene: Scene): Mesh {
    const { points, width } = river
    if (points.length < 2) return new Mesh('emptyRiver', scene)

    const half = width / 2
    const left: Vector3[]  = []
    const right: Vector3[] = []

    for (let i = 0; i < points.length; i++) {
      const p = points[i]!
      const prev = points[Math.max(0, i - 1)]!
      const next = points[Math.min(points.length - 1, i + 1)]!

      // Tangent in XZ
      const tx = next.x - prev.x
      const tz = next.z - prev.z
      const len = Math.sqrt(tx * tx + tz * tz) || 1

      // XZ perpendicular
      const perpX = -tz / len
      const perpZ =  tx / len

      left.push(new Vector3(p.x + perpX * half, p.y, p.z + perpZ * half))
      right.push(new Vector3(p.x - perpX * half, p.y, p.z - perpZ * half))
    }

    const mesh = MeshBuilder.CreateRibbon('river', {
      pathArray: [left, right],
      sideOrientation: Mesh.DOUBLESIDE,
    }, scene)

    const mat = new StandardMaterial('riverMat', scene)
    mat.diffuseColor   = new Color3(0.19, 0.33, 0.55)   // deeper, richer blue
    mat.specularColor  = new Color3(0.60, 0.75, 0.90)
    mat.specularPower  = 80
    mat.alpha = 0.88
    // Ensure the river always renders before roads; the road mesh sits at Y=0.18
    // (top), river at Y=0.02 — depth test handles occlusion correctly once
    // z-fighting against the flat terrain is avoided with a small zOffset.
    mat.zOffset = -1
    mesh.material = mat

    return mesh
  }
}
