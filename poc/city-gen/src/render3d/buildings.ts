// src/render3d/buildings.ts — Extrude building footprints into 3D meshes
import * as THREE from 'three'
import { type RenderData } from '../export/deserialiser'

const BUILDING_HEIGHTS: Record<string, [number, number]> = {
  Castle:         [12, 20],
  Cathedral:      [10, 18],
  Patriciate:     [6,  10],
  Administration: [5,   9],
  Military:       [4,   7],
  Merchant:       [4,   8],
  Craftsmen:      [3,   6],
  Slum:           [2,   5],
  GateWard:       [3,   6],
  Gate:           [3,   6],
  Park:           [0,   0],
  Farm:           [1,   2],
  Market:         [0,   0],
}

const BUILDING_COLOURS: Record<string, number> = {
  Castle:         0x9a8a7a,
  Cathedral:      0xb0a090,
  Patriciate:     0xd4c0a0,
  Administration: 0xc8c0a8,
  Military:       0xa8b4b8,
  Merchant:       0xd0b890,
  Craftsmen:      0xc4a880,
  Slum:           0xb09878,
  Gate:           0xa89888,
  GateWard:       0xa89888,
  Park:           0x608840,
  Farm:           0xa8b870,
  Market:         0xe8d898,
}

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export function buildBuildings(data: RenderData, scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()

  data.wards.forEach((ward, wi) => {
    const buildings = data.buildingsByType.get(ward.type)
    if (!buildings) return

    const [hMin, hMax] = BUILDING_HEIGHTS[ward.type] ?? [3, 6]
    if (hMin === 0) return   // parks, markets — no buildings

    const colour = BUILDING_COLOURS[ward.type] ?? 0xc4a880

    buildings.forEach((poly, bi) => {
      if (poly.length < 3) return
      const h = hMin + seededRand(wi * 1000 + bi) * (hMax - hMin)

      const shape = new THREE.Shape()
      shape.moveTo(poly[0].x, poly[0].y)
      for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i].x, poly[i].y)
      shape.closePath()

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth:            h,
        bevelEnabled:     false,
      })
      // ExtrudeGeometry extrudes along Z; rotate so buildings stand up
      geo.rotateX(-Math.PI / 2)

      const mat  = new THREE.MeshLambertMaterial({ color: colour })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow    = true
      mesh.receiveShadow = true
      group.add(mesh)
    })
  })

  scene.add(group)
  return group
}
