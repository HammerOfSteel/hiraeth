import {
  type AbstractMesh,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core'
import type { Parcel, ZoneType } from './Parcel'
import { mulberry32 } from '@utils/Seeder'

// ── Colour palette ─────────────────────────────────────────────────────────────
// Each zone gets 3 colour variants so adjacent buildings look distinct.

type ColourVariants = [Color3, Color3, Color3]

const WALL_VARIANTS: Record<ZoneType, ColourVariants> = {
  residential: [
    new Color3(0.68, 0.42, 0.28),   // warm red brick
    new Color3(0.78, 0.72, 0.62),   // pale render / pebbledash
    new Color3(0.60, 0.55, 0.47),   // limestone / sandstone
  ],
  commercial: [
    new Color3(0.45, 0.38, 0.32),   // dark Victorian brick
    new Color3(0.72, 0.68, 0.62),   // light render / modern
    new Color3(0.55, 0.52, 0.50),   // slate-faced
  ],
  civic: [
    new Color3(0.72, 0.66, 0.48),   // honey limestone
    new Color3(0.62, 0.62, 0.65),   // Portland stone / concrete
    new Color3(0.58, 0.44, 0.34),   // red sandstone
  ],
  green: [
    new Color3(0.28, 0.52, 0.22),   // hedge / topiary green
    new Color3(0.38, 0.60, 0.28),   // lawn green
    new Color3(0.48, 0.68, 0.35),   // park grass
  ],
}

// Roof colours — darker than walls (slate, clay tile, lead flat)
const ROOF_VARIANTS: Record<ZoneType, ColourVariants> = {
  residential: [
    new Color3(0.22, 0.20, 0.22),   // Welsh slate
    new Color3(0.42, 0.28, 0.20),   // clay pantile
    new Color3(0.30, 0.25, 0.22),   // dark clay
  ],
  commercial: [
    new Color3(0.25, 0.25, 0.27),   // lead flat / felt
    new Color3(0.20, 0.20, 0.22),   // slate
    new Color3(0.35, 0.28, 0.22),   // tile
  ],
  civic: [
    new Color3(0.20, 0.20, 0.22),   // slate
    new Color3(0.38, 0.38, 0.40),   // zinc / copper aged
    new Color3(0.25, 0.22, 0.20),   // dark tile
  ],
  green: [
    new Color3(0.28, 0.52, 0.22),   // green = no visible roof
    new Color3(0.28, 0.52, 0.22),
    new Color3(0.28, 0.52, 0.22),
  ],
}

const ZONE_HEIGHT: Record<ZoneType, [number, number]> = {
  residential: [4.0, 7.5],
  commercial:  [5.0, 12.0],
  civic:       [7.0, 16.0],
  green:       [0.3, 0.6],
}

// Window material — single shared dark mesh
const WIN_COLOR = new Color3(0.14, 0.18, 0.22)

// ── BuildingPlacer ─────────────────────────────────────────────────────────────

export class BuildingPlacer {
  // 3 wall variants × 4 zones = 12 body templates
  private _wallTpls: Map<string, Mesh> = new Map()
  // 3 roof variants × 4 zones = 12 roof templates
  private _roofTpls: Map<string, Mesh> = new Map()
  // Single window template
  private _winTpl!: Mesh
  private _rng: () => number

  constructor(private scene: Scene, seed = 0) {
    this._rng = mulberry32(seed ^ 0xabcdef01)
    this._buildTemplates()
  }

  private _buildTemplates(): void {
    const zones: ZoneType[] = ['residential', 'commercial', 'civic', 'green']

    for (const zone of zones) {
      for (let v = 0; v < 3; v++) {
        const wallMat = new StandardMaterial(`wall_${zone}_${v}`, this.scene)
        wallMat.diffuseColor  = WALL_VARIANTS[zone][v]!
        wallMat.specularColor = new Color3(0.04, 0.04, 0.04)
        const wallTpl = MeshBuilder.CreateBox(`wallTpl_${zone}_${v}`, { size: 1 }, this.scene)
        wallTpl.material = wallMat
        wallTpl.isVisible = false
        this._wallTpls.set(`${zone}_${v}`, wallTpl)

        const roofMat = new StandardMaterial(`roof_${zone}_${v}`, this.scene)
        roofMat.diffuseColor  = ROOF_VARIANTS[zone][v]!
        roofMat.specularColor = new Color3(0.02, 0.02, 0.02)
        const roofTpl = MeshBuilder.CreateBox(`roofTpl_${zone}_${v}`, { size: 1 }, this.scene)
        roofTpl.material = roofMat
        roofTpl.isVisible = false
        this._roofTpls.set(`${zone}_${v}`, roofTpl)
      }
    }

    // Window pane template — small flat dark box
    const winMat = new StandardMaterial('winMat', this.scene)
    winMat.diffuseColor  = WIN_COLOR
    winMat.specularColor = new Color3(0.3, 0.3, 0.35)
    winMat.specularPower = 32
    this._winTpl = MeshBuilder.CreateBox('winTpl', { size: 1 }, this.scene)
    this._winTpl.material = winMat
    this._winTpl.isVisible = false
  }

  place(parcels: Parcel[]): AbstractMesh[] {
    const meshes: AbstractMesh[] = []

    for (const p of parcels) {
      const variant = Math.floor(this._rng() * 3) as 0 | 1 | 2
      const wallTpl = this._wallTpls.get(`${p.zone}_${variant}`)
      const roofTpl = this._roofTpls.get(`${p.zone}_${variant}`)
      if (!wallTpl || !roofTpl) continue

      const [hMin, hMax] = ZONE_HEIGHT[p.zone]
      const h = hMin + this._rng() * (hMax - hMin)

      // ── Body ──────────────────────────────────────────────────────────────
      // Buildings use a fraction of their parcel — the rest is garden/yard.
      // Residential: 0.60 (large front garden visible from road)
      // Commercial:  0.82 (street-front, denser)
      // Civic:       0.72 (some grounds)
      // Green:       0.90 (fills most of the plot as low vegetation)
      const FOOTPRINT: Record<string, number> = {
        residential: 0.60,
        commercial:  0.82,
        civic:       0.72,
        green:       0.90,
      }
      const fp = FOOTPRINT[p.zone] ?? 0.70

      const bw = p.width  * fp
      const bd = p.depth  * fp
      const ry = p.angle

      // "Law of Entropy" (Gemini): nothing in a real town is perfectly placed.
      // Add a tiny, seeded positional jitter and a slight extra rotation.
      const jx   = (this._rng() - 0.5) * 0.8
      const jz   = (this._rng() - 0.5) * 0.8
      const jRot = (this._rng() - 0.5) * 0.06   // ≈ ±3°

      // ── Body ──────────────────────────────────────────────────────────────
      const body = wallTpl.createInstance(`body_${p.id}`)
      body.scaling    = new Vector3(bw, h, bd)
      body.position   = new Vector3(p.cx + jx, h / 2, p.cz + jz)
      body.rotation.y = ry + jRot
      meshes.push(body)

      // ── Roof (slight overhang, flat for now) ──────────────────────────────
      if (p.zone !== 'green') {
        const roofH = 0.35 + this._rng() * 0.25
        const roof = roofTpl.createInstance(`roof_${p.id}`)
        roof.scaling    = new Vector3(bw + 0.6, roofH, bd + 0.6)
        roof.position   = new Vector3(p.cx + jx, h + roofH / 2, p.cz + jz)
        roof.rotation.y = ry + jRot
        meshes.push(roof)
      }

      // ── Windows (skip green / very small buildings) ───────────────────────
      if (p.zone !== 'green' && bw > 4 && h > 3) {
        this._addWindows(p.id, p.cx + jx, p.cz + jz, bw, bd, h, ry + jRot, meshes)
      }
    }

    return meshes
  }

  private _addWindows(
    id: number,
    cx: number, cz: number,
    bw: number, bd: number, bh: number,
    angle: number,
    meshes: AbstractMesh[],
  ): void {
    const floors  = Math.max(1, Math.round(bh / 3.2))
    const winsW   = Math.max(1, Math.floor(bw / 2.8))  // windows across width
    const winsD   = Math.max(1, Math.floor(bd / 2.8))  // windows across depth
    const winW    = 0.90
    const winH    = 1.10
    const winD    = 0.12   // thickness
    const floorH  = bh / floors

    // Pre-compute axis-aligned offsets then rotate with the building angle
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const addFace = (
      baseX: number, baseZ: number,   // centre of face in local space
      faceNx: number, faceNz: number, // outward normal
      across: number,                 // number of windows across this face
      acrossLocal: boolean,           // whether across goes in local X or local Z
    ) => {
      for (let f = 0; f < floors; f++) {
        const wy = floorH * (f + 0.58)  // slightly above mid-floor

        for (let i = 0; i < across; i++) {
          const t = across === 1 ? 0 : (i - (across - 1) / 2) / across
          const localX = acrossLocal ? t * bw * 0.6 : 0
          const localZ = acrossLocal ? 0 : t * bd * 0.6

          // Rotate local XZ offset by building angle
          const wx = cx + cos * (baseX + localX) - sin * (baseZ + localZ)
          const wz = cz + sin * (baseX + localX) + cos * (baseZ + localZ)

          const win = this._winTpl.createInstance(`win_${id}_${f}_${i}`)
          // Scale: if face normal is ±Z, window lies in X dimension; if ±X, in Z
          const sx = Math.abs(faceNz) > 0 ? winW : winD
          const sz = Math.abs(faceNx) > 0 ? winW : winD
          win.scaling   = new Vector3(sx, winH, sz)
          win.position  = new Vector3(wx, wy, wz)
          win.rotation.y = angle
          meshes.push(win)
        }
      }
    }

    // +Z face
    addFace(0, bd / 2 + 0.06, 0,  1, winsW, true)
    // -Z face
    addFace(0, -(bd / 2 + 0.06), 0, -1, winsW, true)
    // +X face (only if building is wide enough)
    if (bw > 5) addFace(bw / 2 + 0.06, 0,  1, 0, winsD, false)
    // -X face
    if (bw > 5) addFace(-(bw / 2 + 0.06), 0, -1, 0, winsD, false)
  }

  dispose(): void {
    for (const t of this._wallTpls.values()) t.dispose()
    for (const t of this._roofTpls.values()) t.dispose()
    this._winTpl.dispose()
  }
}

