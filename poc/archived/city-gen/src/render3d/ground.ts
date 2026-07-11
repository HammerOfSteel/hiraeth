// src/render3d/ground.ts — Ground plane with ward-coloured patches
import * as THREE from 'three'
import { type RenderData } from '../export/deserialiser'

const WARD_GROUND_COLOURS: Record<string, number> = {
  Park:           0x5a8040,
  Farm:           0x8a9858,
  Market:         0xd8cc88,
  Castle:         0x786858,
  Cathedral:      0xa09078,
  default:        0xc0b898,
}

export function buildGround(data: RenderData, scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()
  const size  = data.cityRadius * 4

  // Base ground plane
  const planeGeo = new THREE.PlaneGeometry(size, size)
  planeGeo.rotateX(-Math.PI / 2)
  const planeMat = new THREE.MeshLambertMaterial({ color: 0xb8b098 })
  const plane    = new THREE.Mesh(planeGeo, planeMat)
  plane.receiveShadow = true
  plane.position.y    = -0.05
  group.add(plane)

  // Ward patch polygons as flat shapes just above the ground
  for (const ward of data.wards) {
    if (ward.shape.length < 3) continue
    const colour = WARD_GROUND_COLOURS[ward.type] ?? WARD_GROUND_COLOURS.default

    const shape = new THREE.Shape()
    shape.moveTo(ward.shape[0].x, ward.shape[0].y)
    for (let i = 1; i < ward.shape.length; i++) shape.lineTo(ward.shape[i].x, ward.shape[i].y)
    shape.closePath()

    const geo  = new THREE.ShapeGeometry(shape)
    geo.rotateX(-Math.PI / 2)
    const mat  = new THREE.MeshLambertMaterial({ color: colour, side: THREE.DoubleSide })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.receiveShadow = true
    mesh.position.y    = 0
    group.add(mesh)
  }

  // Road strips — flat quads at y = 0.01 for each artery segment
  const ROAD_WIDTH  = 6   // ~MAIN_STREET in world units
  const roadMat     = new THREE.MeshLambertMaterial({ color: 0x988878 })

  for (const street of data.streets) {
    for (let i = 0; i < street.length - 1; i++) {
      const a = street[i], b = street[i + 1]
      const dx = b.x - a.x, dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 0.01) continue

      // Build a rect centred on the segment midpoint
      const nx = -dy / len, ny = dx / len   // perpendicular
      const hw = ROAD_WIDTH / 2

      const verts = new Float32Array([
        a.x + nx * hw, 0.01, a.y + ny * hw,
        a.x - nx * hw, 0.01, a.y - ny * hw,
        b.x - nx * hw, 0.01, b.y - ny * hw,
        b.x + nx * hw, 0.01, b.y + ny * hw,
      ])
      const idx = new Uint16Array([0, 1, 2, 0, 2, 3])
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
      geo.setIndex(new THREE.BufferAttribute(idx, 1))
      geo.computeVertexNormals()
      group.add(new THREE.Mesh(geo, roadMat))
    }
  }

  scene.add(group)
  return group
}
