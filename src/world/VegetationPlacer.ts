import {
  type AbstractMesh,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core'
import type { Heightmap } from './TerrainGenerator'
import { mulberry32 } from '@utils/Seeder'

export interface VegConfig {
  seed: number
  density: number   // 0–1: probability a candidate cell gets a tree
  maxTrees: number  // safety cap on instance count
}

export class VegetationPlacer {
  private _trunkTpl!: Mesh
  private _canopyTpl!: Mesh

  constructor(private scene: Scene) {
    this._buildTemplates()
  }

  private _buildTemplates(): void {
    const trunkMat = new StandardMaterial('trunkMat', this.scene)
    trunkMat.diffuseColor = new Color3(0.27, 0.19, 0.11)
    this._trunkTpl = MeshBuilder.CreateCylinder(
      'trunkTpl',
      { height: 1.6, diameterTop: 0.22, diameterBottom: 0.38, tessellation: 6 },
      this.scene,
    )
    this._trunkTpl.material = trunkMat
    this._trunkTpl.isVisible = false

    const canopyMat = new StandardMaterial('canopyMat', this.scene)
    canopyMat.diffuseColor = new Color3(0.16, 0.29, 0.13)
    this._canopyTpl = MeshBuilder.CreateCylinder(
      'canopyTpl',
      { height: 4.0, diameterTop: 0, diameterBottom: 3.2, tessellation: 7 },
      this.scene,
    )
    this._canopyTpl.material = canopyMat
    this._canopyTpl.isVisible = false
  }

  place(heightmap: Heightmap, cfg: VegConfig): AbstractMesh[] {
    const { data, width, depth, config } = heightmap
    const { worldWidth, worldDepth, maxHeight } = config
    const rng = mulberry32(cfg.seed ^ 0x76543210)
    const meshes: AbstractMesh[] = []
    let count = 0
    const step = 4  // sample every 4th cell

    outer:
    for (let gz = step; gz < depth - step; gz += step) {
      for (let gx = step; gx < width - step; gx += step) {
        if (count >= cfg.maxTrees) break outer

        const h = data[gz * width + gx] as number

        // Only place on hillside zones (not valley floor, not bare rock)
        if (h < 0.18 || h > 0.82) continue

        // Higher density at mid-slopes
        const boost = h < 0.55 ? 1.3 : 0.75
        if (rng() > cfg.density * boost) continue

        const wx = (gx / (width - 1)) * worldWidth - worldWidth / 2 + (rng() - 0.5) * (worldWidth / width) * 4
        const wz = (gz / (depth - 1)) * worldDepth - worldDepth / 2 + (rng() - 0.5) * (worldDepth / depth) * 4
        // Flat world: trees always at Y = 0; trunk pivot is at its centre so +0.8
        const rot = rng() * Math.PI * 2

        const trunk = this._trunkTpl.createInstance(`trunk_${count}`)
        trunk.position = new Vector3(wx, 0.8, wz)
        trunk.rotation.y = rot

        const canopy = this._canopyTpl.createInstance(`canopy_${count}`)
        canopy.position = new Vector3(wx, 2.9, wz)
        canopy.rotation.y = rot

        meshes.push(trunk, canopy)
        count++
      }
    }

    return meshes
  }

  dispose(): void {
    this._trunkTpl.dispose()
    this._canopyTpl.dispose()
  }
}
