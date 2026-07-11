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

/** Signed shoelace area of a polygon (absolute value = area). */
function polyArea(poly: { x: number; y: number }[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length
    a += poly[i].x * poly[j].y - poly[j].x * poly[i].y
  }
  return Math.abs(a) * 0.5
}

/** Centroid of a polygon. */
function polyCentroid(poly: { x: number; y: number }[]): [number, number] {
  const cx = poly.reduce((s, v) => s + v.x, 0) / poly.length
  const cy = poly.reduce((s, v) => s + v.y, 0) / poly.length
  return [cx, cy]
}

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

/** Add a pyramid hip-roof cap above an extruded building.
 *  All polygon vertices at baseH rise to the centroid at baseH + rh. */
function addRoofCap(
  group: THREE.Group,
  poly: { x: number; y: number }[],
  baseH: number,
  roofMat: THREE.Material,
): void {
  if (poly.length < 3) return
  const rh = Math.max(0.8, baseH * 0.3)
  const [cx, cy] = polyCentroid(poly)

  const positions: number[] = []
  for (const v of poly) positions.push(v.x, baseH, v.y)
  const apex = poly.length
  positions.push(cx, baseH + rh, cy)

  const indices: number[] = []
  for (let i = 0; i < poly.length; i++) {
    indices.push(i, (i + 1) % poly.length, apex)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  group.add(new THREE.Mesh(geo, roofMat))
}

export function buildBuildings(data: RenderData, scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()

  data.wards.forEach((ward, wi) => {
    const buildings = data.buildingsByType.get(ward.type)
    if (!buildings) return

    const [hMin, hMax] = BUILDING_HEIGHTS[ward.type] ?? [3, 6]
    if (hMin === 0) return   // parks, markets — no buildings

    const colour    = BUILDING_COLOURS[ward.type] ?? 0xc4a880
    const mat       = new THREE.MeshLambertMaterial({ color: colour })
    const roofColour = Math.max(0, colour - 0x101010)
    const roofMat   = new THREE.MeshLambertMaterial({ color: roofColour })

    // Compute average footprint area for this ward (for height scaling)
    const areas     = buildings.map(polyArea)
    const avgArea   = areas.reduce((s, a) => s + a, 0) / (areas.length || 1)

    buildings.forEach((poly, bi) => {
      if (poly.length < 3) return

      // Area-weighted height: larger footprint → taller building (I2)
      const areaRatio = avgArea > 0 ? Math.sqrt(areas[bi] / avgArea) : 1
      const rnd = seededRand(wi * 1000 + bi)
      const h   = hMin + rnd * (hMax - hMin) * Math.min(2, Math.max(0.4, areaRatio))

      const shape = new THREE.Shape()
      shape.moveTo(poly[0].x, poly[0].y)
      for (let i = 1; i < poly.length; i++) shape.lineTo(poly[i].x, poly[i].y)
      shape.closePath()

      const geo = new THREE.ExtrudeGeometry(shape, {
        depth:        h,
        bevelEnabled: false,
      })
      // ExtrudeGeometry extrudes along Z; rotate so buildings stand up
      geo.rotateX(-Math.PI / 2)

      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow    = true
      mesh.receiveShadow = true
      group.add(mesh)

      // Pyramid rooftop cap (I3) — only for non-tiny buildings
      if (h > 1.5) addRoofCap(group, poly, h, roofMat)
    })
  })

  scene.add(group)
  return group
}
