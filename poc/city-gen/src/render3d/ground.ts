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

  scene.add(group)
  return group
}
