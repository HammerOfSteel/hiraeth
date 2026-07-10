import {
  type Scene,
  type AbstractMesh,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
} from '@babylonjs/core'
import { TerrainGenerator, type TerrainConfig, type Heightmap } from './TerrainGenerator'
import { TerrainMesh } from './TerrainMesh'
import { RiverSystem } from './RiverSystem'
import { WaterBodies } from './WaterBodies'
import { RoadNetwork, type RoadGraph } from './RoadNetwork'
import { ParcelGenerator, type Parcel } from './Parcel'
import { BuildingPlacer } from './BuildingPlacer'
import { VegetationPlacer } from './VegetationPlacer'

// ── Public types ──────────────────────────────────────────────────────────────

export interface WorldConfig extends TerrainConfig {
  populationDensity: number  // 0.1–1.0
  treeDensity: number        // 0.0–1.0
  maxTrees: number           // hard cap on tree instances
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  seed: 12345,
  resolution: 128,
  worldWidth: 200,
  worldDepth: 200,
  maxHeight: 30,
  valleyWidth: 0.35,
  hilliness: 0.75,
  coastal: false,
  populationDensity: 0.6,
  treeDensity: 0.28,
  maxTrees: 800,
}

export interface WorldResult {
  heightmap: Heightmap
  roadGraph: RoadGraph
  parcels: Parcel[]
  /** Every Babylon.js mesh created during generation */
  meshes: AbstractMesh[]
  /** Dispose all meshes and free GPU resources */
  dispose(): void
}

// ── WorldGenerator ────────────────────────────────────────────────────────────

export class WorldGenerator {
  private _buildingPlacer: BuildingPlacer
  private _vegPlacer: VegetationPlacer
  private _roadMat: StandardMaterial

  constructor(private scene: Scene) {
    this._buildingPlacer = new BuildingPlacer(scene)
    this._vegPlacer      = new VegetationPlacer(scene)
    this._roadMat        = new StandardMaterial('roadMat', scene)
    this._roadMat.diffuseColor  = new Color3(0.22, 0.22, 0.24)
    this._roadMat.specularColor = new Color3(0.02, 0.02, 0.02)
  }

  generate(config: WorldConfig): WorldResult {
    const meshes: AbstractMesh[] = []

    // 1 ── Heightmap ─────────────────────────────────────────────────────────
    const heightmap = TerrainGenerator.generate(config)

    // 2 ── Terrain mesh ───────────────────────────────────────────────────────
    meshes.push(TerrainMesh.create(heightmap, this.scene))

    // 3 ── River ─────────────────────────────────────────────────────────────
    for (const river of RiverSystem.generate(heightmap)) {
      meshes.push(WaterBodies.createRiver(river, this.scene))
    }

    // 4 ── Road graph ─────────────────────────────────────────────────────────
    const roadGraph = RoadNetwork.generate(heightmap, config.seed)

    // 5 ── Road meshes (flat boxes per edge) ──────────────────────────────────
    const nodeMap = new Map(roadGraph.nodes.map(n => [n.id, n]))
    for (const edge of roadGraph.edges) {
      const from = nodeMap.get(edge.from)
      const to   = nodeMap.get(edge.to)
      if (!from || !to) continue
      const dx  = to.wx - from.wx
      const dz  = to.wz - from.wz
      const len = Math.sqrt(dx * dx + dz * dz)
      if (len < 0.5) continue
      const midX = (from.wx + to.wx) / 2
      const midZ = (from.wz + to.wz) / 2
      // Flat world — no terrain height sampling needed
      const roadW = edge.type === 'main' ? 4.5 : 3.2
      const seg: AbstractMesh = MeshBuilder.CreateBox(`road_${edge.from}_${edge.to}`, { width: roadW, height: 0.12, depth: len }, this.scene)
      // Flat world: roads at Y = 0 + half-height offset so top face sits flush
      seg.position  = new Vector3(midX, 0.06, midZ)
      seg.rotation.y = Math.atan2(dx, dz)
      seg.material  = this._roadMat
      meshes.push(seg)
    }

    // 6 ── Parcels + buildings ─────────────────────────────────────────────────
    const parcels = ParcelGenerator.generate(roadGraph)
    const bldMeshes = this._buildingPlacer.place(parcels)
    meshes.push(...bldMeshes)

    // 7 ── Vegetation ──────────────────────────────────────────────────────────
    const vegMeshes = this._vegPlacer.place(heightmap, {
      seed: config.seed,
      density: config.treeDensity,
      maxTrees: config.maxTrees,
    })
    meshes.push(...vegMeshes)

    return {
      heightmap,
      roadGraph,
      parcels,
      meshes,
      dispose: () => { for (const m of meshes) m.dispose() },
    }
  }

  /** Dispose placers and shared materials (call when tearing down the generator). */
  dispose(): void {
    this._buildingPlacer.dispose()
    this._vegPlacer.dispose()
    this._roadMat.dispose()
  }
}
