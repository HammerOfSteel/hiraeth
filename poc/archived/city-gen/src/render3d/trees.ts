// src/render3d/trees.ts — Procedural trees in park / farm patches
import * as THREE from 'three'
import { type RenderData } from '../export/deserialiser'
import { polyHitTest } from '../geom/polygon'
import { Pt } from '../geom/pt'

const TREE_WARDS = new Set(['Park', 'Farm'])

function seededRand2(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export function buildTrees(data: RenderData, scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group()

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3c1a })
  const leafMats = [
    new THREE.MeshLambertMaterial({ color: 0x3a6a28 }),
    new THREE.MeshLambertMaterial({ color: 0x4a7a30 }),
    new THREE.MeshLambertMaterial({ color: 0x2e5820 }),
  ]

  const wards = data.wards.filter(w => TREE_WARDS.has(w.type))

  for (const ward of wards) {
    // Skip patches whose centroid lies outside the city radius
    const cx = ward.shape.reduce((s, v) => s + v.x, 0) / ward.shape.length
    const cy = ward.shape.reduce((s, v) => s + v.y, 0) / ward.shape.length
    if (cx * cx + cy * cy > data.cityRadius * data.cityRadius) continue

    const density = ward.type === 'Park' ? 0.4 : 0.15
    const bounds  = ward.shape.reduce(
      (b, v) => ({
        minX: Math.min(b.minX, v.x), maxX: Math.max(b.maxX, v.x),
        minY: Math.min(b.minY, v.y), maxY: Math.max(b.maxY, v.y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    )

    const area    = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY)
    const nTrees  = Math.floor(area * density * 0.05)
    const wardIdx = data.wards.indexOf(ward)

    for (let i = 0; i < nTrees; i++) {
      const rx = seededRand2(wardIdx, i * 2)
      const ry = seededRand2(wardIdx, i * 2 + 1)
      const wx = bounds.minX + rx * (bounds.maxX - bounds.minX)
      const wy = bounds.minY + ry * (bounds.maxY - bounds.minY)

      if (!polyHitTest(ward.shape, new Pt(wx, wy))) continue

      const h        = 3 + seededRand2(wardIdx, i) * 4
      const leafR    = 1.2 + seededRand2(wardIdx, i + 100) * 1.5
      const matIdx   = Math.floor(seededRand2(wardIdx, i + 200) * leafMats.length)

      // Trunk
      const trunk  = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, h * 0.5, 5), trunkMat)
      trunk.position.set(wx, h * 0.25, wy)
      group.add(trunk)

      // Canopy (cone for conifers, sphere for deciduous)
      const useCone = seededRand2(wardIdx, i + 300) > 0.4
      const leafGeo = useCone
        ? new THREE.ConeGeometry(leafR, h * 0.7, 6)
        : new THREE.SphereGeometry(leafR, 6, 4)
      const leaves  = new THREE.Mesh(leafGeo, leafMats[matIdx])
      leaves.position.set(wx, h * 0.65, wy)
      leaves.castShadow = true
      group.add(leaves)
    }
  }

  scene.add(group)
  return group
}
