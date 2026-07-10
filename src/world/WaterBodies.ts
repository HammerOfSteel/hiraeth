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
    mat.diffuseColor  = new Color3(0.17, 0.27, 0.44)
    mat.specularColor = new Color3(0.55, 0.65, 0.80)
    mat.specularPower = 64
    mat.alpha = 0.82
    mesh.material = mat

    return mesh
  }
}
