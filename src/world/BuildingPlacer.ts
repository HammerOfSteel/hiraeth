import {
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core'
import type { Parcel, ZoneType } from './Parcel'
import type { Heightmap } from './TerrainGenerator'
import { mulberry32 } from '@utils/Seeder'

// Colour palette per zone (muted, British-ish)
const ZONE_COLOR: Record<ZoneType, Color3> = {
  residential: new Color3(0.62, 0.48, 0.34),   // warm sandstone / brick
  commercial:  new Color3(0.44, 0.44, 0.58),    // cool slate
  civic:       new Color3(0.52, 0.58, 0.44),    // muted green-grey
  green:       new Color3(0.28, 0.52, 0.24),    // park
}

const ZONE_HEIGHT: Record<ZoneType, [number, number]> = {
  residential: [3.5, 7.0],
  commercial:  [5.0, 11.0],
  civic:       [6.0, 14.0],
  green:       [0.4, 0.8],
}

export class BuildingPlacer {
  private _templates = new Map<ZoneType, Mesh>()
  private _rng: () => number

  constructor(private scene: Scene, seed = 0) {
    this._rng = mulberry32(seed ^ 0xabcdef01)
    this._createTemplates()
  }

  private _createTemplates(): void {
    const zones: ZoneType[] = ['residential', 'commercial', 'civic', 'green']
    for (const zone of zones) {
      const mat = new StandardMaterial(`bldMat_${zone}`, this.scene)
      mat.diffuseColor = ZONE_COLOR[zone]
      mat.specularColor = new Color3(0.05, 0.05, 0.05)
      const t = MeshBuilder.CreateBox(`bldTpl_${zone}`, { size: 1 }, this.scene)
      t.material = mat
      t.isVisible = false
      this._templates.set(zone, t)
    }
  }

  place(parcels: Parcel[], heightmap: Heightmap): Mesh[] {
    const meshes: Mesh[] = []
    for (const p of parcels) {
      const tpl = this._templates.get(p.zone)
      if (!tpl) continue

      const [hMin, hMax] = ZONE_HEIGHT[p.zone]
      const h = hMin + this._rng() * (hMax - hMin)

      const inst = tpl.createInstance(`bld_${p.id}`)
      inst.scaling  = new Vector3(p.width * 0.72, h, p.depth * 0.72)
      const terrainY = BuildingPlacer._sampleY(heightmap, p.cx, p.cz)
      inst.position  = new Vector3(p.cx, terrainY + h / 2, p.cz)
      inst.rotation.y = p.angle
      meshes.push(inst)
    }
    return meshes
  }

  private static _sampleY(hm: Heightmap, wx: number, wz: number): number {
    const { data, width, depth, config } = hm
    const nx = Math.max(0, Math.min(1, (wx + config.worldWidth / 2) / config.worldWidth))
    const nz = Math.max(0, Math.min(1, (wz + config.worldDepth / 2) / config.worldDepth))
    const gx = Math.min(width - 1,  Math.round(nx * (width - 1)))
    const gz = Math.min(depth - 1,  Math.round(nz * (depth - 1)))
    return (data[gz * width + gx] as number) * config.maxHeight
  }

  dispose(): void {
    for (const t of this._templates.values()) t.dispose()
  }
}
