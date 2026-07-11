// src/render3d/wall.ts — City wall + castle wall as extruded polygons; tower cylinders
import * as THREE from 'three'
import { type RenderData } from '../export/deserialiser'

const WALL_HEIGHT   = 6
const WALL_WIDTH    = 1.2
const TOWER_HEIGHT  = 8
const TOWER_RADIUS  = 2

export function buildWalls(data: RenderData, scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()
  const mat   = new THREE.MeshLambertMaterial({ color: 0x908070 })

  const addWall = (w: NonNullable<RenderData['wall']>) => {
    if (w.shape.length < 2) return

    // Wall as a tube/strip along the shape polygon
    const pts = [...w.shape, w.shape[0]].map(v => new THREE.Vector3(v.x, 0, v.y))
    const curve = new THREE.CatmullRomCurve3(pts, false)
    const geo   = new THREE.TubeGeometry(curve, pts.length * 4, WALL_WIDTH / 2, 4, false)
    const mesh  = new THREE.Mesh(geo, mat)
    mesh.position.y = WALL_HEIGHT / 2
    mesh.castShadow = true
    group.add(mesh)

    // Wall top slab
    const topGeo = geo.clone()
    topGeo.translate(0, WALL_HEIGHT / 2, 0)
    group.add(new THREE.Mesh(topGeo, mat))

    // Towers
    const towerMat = new THREE.MeshLambertMaterial({ color: 0x786858 })
    for (const t of w.towers) {
      const geo  = new THREE.CylinderGeometry(TOWER_RADIUS, TOWER_RADIUS * 1.1, TOWER_HEIGHT, 8)
      const mesh = new THREE.Mesh(geo, towerMat)
      mesh.position.set(t.x, TOWER_HEIGHT / 2, t.y)
      mesh.castShadow = true
      group.add(mesh)
    }
  }

  if (data.wall)    addWall(data.wall)
  if (data.citadel) addWall(data.citadel)

  scene.add(group)
  return group
}
