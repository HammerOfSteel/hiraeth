// CityScene.tsx — renders an MFCG GeoJSON export (FeatureCollection format v0.11+)
// Buildings extruded from MultiPolygon footprints, roads, districts, walls, trees.

import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useSceneStore } from '@/store/scene'
import { Sky, SunLight, RainSystem } from '@/scene/Atmosphere'
import { getFeature } from './types'
import type {
  MFCGJson, MFCGMultiPolygon, MFCGGeometryCollection,
  MFCGMultiPoint, MFCGValues, Pt2,
} from './types'
import { getSunParams } from '@/store/scene'

// ─── Coordinate mapping ──────────────────────────────────────────────────────
//
// MFCG: x right, y down (screen), origin at city centre.
// Three.js: x right, y up, z towards viewer.
// Strategy: draw ExtrudeGeometry shapes with MFCG (x, y) then rotateX(−π/2).
//   Shape (sx, sy) → world (sx, 0, −sy)   [rotation handles the y-flip]
// Manual world-space coords: worldZ = −y_mfcg

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seededRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280
  return x - Math.floor(x)
}

function buildingRadius(feat: MFCGMultiPolygon): number {
  let r = 0
  for (const poly of feat.coordinates)
    for (const ring of poly)
      for (const [x, y] of ring) {
        const d = Math.sqrt(x * x + y * y)
        if (d > r) r = d
      }
  return r
}

/** Shrink a polygon ring inward by `amount` units (centroid-based). Creates alley gaps. */
function insetRing(pts: Pt2[], amount: number): Pt2[] {
  if (pts.length < 3) return pts
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return pts.map(([x, y]) => {
    const dx = x - cx, dy = y - cy
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len <= amount) return [cx, cy] as Pt2
    return [cx + dx * (len - amount) / len, cy + dy * (len - amount) / len] as Pt2
  })
}

function extrudeRings(rings: Pt2[][], height: number, inset = 0): THREE.BufferGeometry | null {
  const rawOuter = rings[0]
  if (!rawOuter || rawOuter.length < 3) return null
  const outer = inset > 0 ? insetRing(rawOuter, inset) : rawOuter
  if (outer.length < 3) return null
  const shape = new THREE.Shape()
  shape.moveTo(outer[0][0], outer[0][1])
  for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i][0], outer[i][1])
  shape.closePath()
  for (let h = 1; h < rings.length; h++) {
    const hole = new THREE.Path()
    hole.moveTo(rings[h][0][0], rings[h][0][1])
    for (let i = 1; i < rings[h].length; i++) hole.lineTo(rings[h][i][0], rings[h][i][1])
    shape.holes.push(hole)
  }
  const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false })
  geo.rotateX(-Math.PI / 2)
  return geo
}

function roofCapGeo(ring: Pt2[], baseH: number): THREE.BufferGeometry {
  const cx = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const cy = ring.reduce((s, p) => s + p[1], 0) / ring.length
  const rh = Math.max(1.5, baseH * 0.28)
  const pos: number[] = []
  for (const [px, py] of ring) pos.push(px, baseH, -py)
  pos.push(cx, baseH + rh, -cy)
  const apex = ring.length
  const idx: number[] = []
  for (let i = 0; i < ring.length; i++) idx.push(i, (i + 1) % ring.length, apex)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (!geos.length) return null
  const positions: number[] = [], normals: number[] = [], indices: number[] = []
  let vi = 0
  for (const g of geos) {
    const pos = g.getAttribute('position') as THREE.BufferAttribute
    const nor = g.getAttribute('normal')   as THREE.BufferAttribute | undefined
    const idx = g.index
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (nor) normals.push(nor.getX(i), nor.getY(i), nor.getZ(i))
    }
    if (idx) for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + vi)
    vi += pos.count
  }
  const merged = new THREE.BufferGeometry()
  merged.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  if (normals.length) merged.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  if (indices.length) merged.setIndex(indices)
  return merged
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Ground({ radius }: { radius: number }) {
  const sz = radius * 3
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[sz, sz]} />
      <meshLambertMaterial color={0x8a8470} />
    </mesh>
  )
}

/** Large sky sphere that envelops the city-scale camera. */
function CitySky({ radius }: { radius: number }) {
  const timeOfDay = useSceneStore(s => s.timeOfDay)
  const { skyTop, skyBot } = getSunParams(timeOfDay)
  const color = new THREE.Color(...skyTop).lerp(new THREE.Color(...skyBot), 0.4)
  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[radius * 5, 32, 16]} />
      <meshBasicMaterial color={color} side={THREE.BackSide} toneMapped={false} />
    </mesh>
  )
}

const DISTRICT_COLORS: Record<string, number> = {
  'Old City':   0x70685a,
  'Craftsmen':  0x887060,
  'Market':     0x9a9060,
  'Slum':       0x7a6858,
  'Cathedral':  0x7a7868,
  'Patriciate': 0xbcb090,
  'Farm':       0x6a7a48,
  'Park':       0x4a6830,
  'Military':   0x6a7060,
}

function Districts({ city }: { city: MFCGJson }) {
  const dists = getFeature<MFCGGeometryCollection>(city, 'districts')
  const meshes = useMemo(() => {
    if (!dists) return []
    return dists.geometries.flatMap((g, i) => {
      if (g.type !== 'Polygon') return []
      const pg = g as { type: 'Polygon'; coordinates: Pt2[][]; name?: string }
      const col  = DISTRICT_COLORS[pg.name ?? ''] ?? 0x706858
      const ring = pg.coordinates[0]
      const shape = new THREE.Shape()
      shape.moveTo(ring[0][0], ring[0][1])
      for (let j = 1; j < ring.length; j++) shape.lineTo(ring[j][0], ring[j][1])
      shape.closePath()
      const geo = new THREE.ShapeGeometry(shape)
      geo.rotateX(-Math.PI / 2)
      return [{ geo, col, key: i }]
    })
  }, [dists])
  return <>
    {meshes.map(({ geo, col, key }) => (
      <mesh key={key} geometry={geo} receiveShadow>
        <meshLambertMaterial color={col} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />
      </mesh>
    ))}
  </>
}

function Greens({ city }: { city: MFCGJson }) {
  const greensFeat  = getFeature<MFCGMultiPolygon>(city, 'greens')
  const squaresFeat = getFeature<MFCGMultiPolygon>(city, 'squares')
  const fieldsFeat  = getFeature<MFCGMultiPolygon>(city, 'fields')
  const geos = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; col: number; key: string }[] = []
    for (const [feat, col] of [
      [greensFeat,  0x4a6830],
      [squaresFeat, 0x9a9060],
      [fieldsFeat,  0x6a7a48],
    ] as Array<[MFCGMultiPolygon | undefined, number]>) {
      feat?.coordinates.forEach((rings, i) => {
        const ring = rings[0]
        if (!ring?.length) return
        const shape = new THREE.Shape()
        shape.moveTo(ring[0][0], ring[0][1])
        for (let j = 1; j < ring.length; j++) shape.lineTo(ring[j][0], ring[j][1])
        shape.closePath()
        const geo = new THREE.ShapeGeometry(shape)
        geo.rotateX(-Math.PI / 2)
        out.push({ geo, col, key: `${feat!.id}-${i}` })
      })
    }
    return out
  }, [greensFeat, squaresFeat, fieldsFeat])
  return <>
    {geos.map(({ geo, col, key }) => (
      <mesh key={key} geometry={geo} receiveShadow>
        <meshLambertMaterial color={col} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
    ))}
  </>
}

function Rivers({ city }: { city: MFCGJson }) {
  const riversFeat = getFeature<MFCGGeometryCollection>(city, 'rivers')
  const valuesFeat = getFeature<MFCGValues>(city, 'values')
  const RW = (valuesFeat?.riverWidth ?? 20) * 0.5
  const geo = useMemo(() => {
    if (!riversFeat) return null
    const positions: number[] = [], indices: number[] = []
    let vi = 0
    for (const g of riversFeat.geometries) {
      if (g.type !== 'LineString') continue
      const pts = g.coordinates
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
        const dx = bx - ax, dy = by - ay
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 0.1) continue
        const nx = -dy / len * RW / 2, ny = dx / len * RW / 2
        positions.push(
          ax + nx, 0.03, -(ay + ny),
          ax - nx, 0.03, -(ay - ny),
          bx - nx, 0.03, -(by - ny),
          bx + nx, 0.03, -(by + ny),
        )
        indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3)
        vi += 4
      }
    }
    if (!positions.length) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [riversFeat, RW])
  if (!geo) return null
  return <mesh geometry={geo} receiveShadow><meshLambertMaterial color={0x3a6090} polygonOffset polygonOffsetFactor={-3} polygonOffsetUnits={-3} /></mesh>
}

function Roads({ city }: { city: MFCGJson }) {
  const roadsFeat  = getFeature<MFCGGeometryCollection>(city, 'roads')
  const valuesFeat = getFeature<MFCGValues>(city, 'values')
  const ROAD_W = (valuesFeat?.roadWidth ?? 8) * 0.55
  const geo = useMemo(() => {
    if (!roadsFeat) return null
    const positions: number[] = [], indices: number[] = []
    let vi = 0
    for (const g of roadsFeat.geometries) {
      if (g.type !== 'LineString') continue
      const pts = g.coordinates
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1]
        const dx = bx - ax, dy = by - ay
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len < 0.1) continue
        const nx = -dy / len * ROAD_W / 2, ny = dx / len * ROAD_W / 2
        positions.push(
          ax + nx, 0.05, -(ay + ny),
          ax - nx, 0.05, -(ay - ny),
          bx - nx, 0.05, -(by - ny),
          bx + nx, 0.05, -(by + ny),
        )
        indices.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3)
        vi += 4
      }
    }
    if (!positions.length) return null
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
    g.setIndex(indices)
    g.computeVertexNormals()
    return g
  }, [roadsFeat, ROAD_W])
  if (!geo) return null
  return <mesh geometry={geo} receiveShadow><meshLambertMaterial color={0x5a5040} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} /></mesh>
}

function CityWalls({ city }: { city: MFCGJson }) {
  const wallsFeat = getFeature<MFCGGeometryCollection>(city, 'walls')
  const geos = useMemo(() => {
    if (!wallsFeat?.geometries.length) return []
    return wallsFeat.geometries.flatMap((g, i) => {
      if (g.type !== 'Polygon') return []
      const geo = extrudeRings(g.coordinates, 9)
      return geo ? [{ geo, key: i }] : []
    })
  }, [wallsFeat])
  if (!geos.length) return null
  return <>
    {geos.map(({ geo, key }) => (
      <mesh key={key} geometry={geo} castShadow receiveShadow>
        <meshLambertMaterial color={0x706050} />
      </mesh>
    ))}
  </>
}

function Buildings({ city }: { city: MFCGJson }) {
  const bldgFeat  = getFeature<MFCGMultiPolygon>(city, 'buildings')
  const prismFeat = getFeature<MFCGMultiPolygon>(city, 'prisms')
  const { wallGeo, roofGeo, prismGeo } = useMemo(() => {
    const walls: THREE.BufferGeometry[] = []
    const roofs: THREE.BufferGeometry[] = []
    bldgFeat?.coordinates.forEach((rings, i) => {
      const h = 3 + seededRand(i * 17 + 3) * 4
      const g = extrudeRings(rings, h, 1.5)   // 1.5-unit inset creates alley gaps
      if (g) walls.push(g)
      if (h > 4) roofs.push(roofCapGeo(insetRing(rings[0], 1.5), h))
    })
    const prisms: THREE.BufferGeometry[] = []
    prismFeat?.coordinates.forEach((rings, i) => {
      const h = 10 + seededRand(i * 31 + 7) * 8
      const g = extrudeRings(rings, h, 1.0)
      if (g) prisms.push(g)
    })
    return { wallGeo: mergeGeos(walls), roofGeo: mergeGeos(roofs), prismGeo: mergeGeos(prisms) }
  }, [bldgFeat, prismFeat])
  return <>
    {wallGeo  && <mesh geometry={wallGeo}  castShadow receiveShadow><meshLambertMaterial color={0xb0a080} /></mesh>}
    {roofGeo  && <mesh geometry={roofGeo}  castShadow><meshLambertMaterial color={0x3a2818} /></mesh>}
    {prismGeo && <mesh geometry={prismGeo} castShadow receiveShadow><meshLambertMaterial color={0x706050} /></mesh>}
  </>
}

function Trees({ city }: { city: MFCGJson }) {
  const treesFeat = getFeature<MFCGMultiPoint>(city, 'trees')
  const pts = useMemo(() => treesFeat?.coordinates.slice(0, 400) ?? [], [treesFeat])
  if (!pts.length) return null
  return <>
    {pts.map(([tx, ty], i) => (
      <mesh key={i} position={[tx, 0, -ty]} castShadow>
        <coneGeometry args={[3.5, 9, 6]} />
        <meshLambertMaterial color={0x3a6030} />
      </mesh>
    ))}
  </>
}

function CityCamera({ radius }: { radius: number }) {
  const { camera } = useThree()
  useEffect(() => {
    const d = radius * 1.25
    // Expand clipping planes to fit the city (default far=800 is too small)
    const perspCam = camera as THREE.PerspectiveCamera
    perspCam.near = 1
    perspCam.far  = radius * 8
    perspCam.updateProjectionMatrix()
    camera.position.set(d, d * 0.7, d)
    camera.lookAt(0, 0, 0)
  }, [camera, radius])
  return <OrbitControls enablePan enableZoom maxPolarAngle={Math.PI / 2.05} />
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function CityScene() {
  const weather  = useSceneStore(s => s.weather)
  const cityData = useSceneStore(s => s.cityData)!

  const radius = useMemo(() => {
    const b = getFeature<MFCGMultiPolygon>(cityData, 'buildings')
    return b ? buildingRadius(b) : 500
  }, [cityData])

  return (
    <>
      <CitySky radius={radius} />
      <SunLight />
      {weather === 'rain' && <RainSystem />}
      <CityCamera radius={radius} />
      <Ground radius={radius} />
      <Districts city={cityData} />
      <Greens city={cityData} />
      <Rivers city={cityData} />
      <Roads city={cityData} />
      <CityWalls city={cityData} />
      <Buildings city={cityData} />
      <Trees city={cityData} />
    </>
  )
}

