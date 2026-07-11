import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useSceneStore } from '@/store/scene'
import { Building, StreetLamp, Tree, Road, RoadJunction, Park, Playground, PostBox, Ground } from './Assets'
import { Sky, SunLight, RainSystem } from './Atmosphere'
import type { BuildingType } from '@/store/scene'

// ── Isometric camera ────────────────────────────────────────────────────────

function IsometricCamera({ distance = 90 }: { distance?: number }) {
  const { camera } = useThree()
  const ELEV = Math.PI / 5.5
  const AZI  = Math.PI / 4

  useEffect(() => {
    camera.position.set(
      Math.cos(AZI) * Math.cos(ELEV) * distance,
      Math.sin(ELEV) * distance,
      Math.sin(AZI) * Math.cos(ELEV) * distance,
    )
    camera.lookAt(0, 0, 0)
  }, [camera, distance])

  return <OrbitControls enablePan enableZoom enableRotate={false} panSpeed={1.2} zoomSpeed={1.0} />
}

// ── Road layout ─────────────────────────────────────────────────────────────
//
//  All roads run parallel (horizontal).  The only north-south connectors are
//  at X = ±62, well outside the building cluster, so no road ever cuts through
//  a building row.
//
//   Z = −50  [church] ─────────────── back lane ─────────────────── [apt]
//   Z = −38            ← north connector (X = −62 → +62)
//   Z = −30  [───────────────── north residential lane ─────────────────]
//   Z = −14  [pub][shops]  HIGH STREET NORTH  [civic][shops]
//   Z =   0  [══════════════════ MAIN HIGH STREET ═══════════════════════]
//   Z = +14  [terraced][semi]  HIGH STREET SOUTH  [detached][bungalow]
//   Z = +30  [───────────────── south residential lane ─────────────────]
//   Z = +42  [detached][semi]  south residential back row
//   Z = +60  [park]                              [playground]

// High street north side (Z=−14, rot=0  → door faces +Z toward road)
const HS_NORTH: Array<{ type: BuildingType; x: number }> = [
  { type: 'pub',   x: -44 },   // W=13  edges [−50.5, −37.5]
  { type: 'shop',  x: -28 },   // W=8   edges [−32,   −24   ]
  { type: 'shop',  x: -18 },   // W=8   edges [−22,   −14   ]
  { type: 'civic', x:  -2 },   // W=16  edges [−10,    +6   ]
  { type: 'shop',  x:  14 },   // W=8   edges [ +10,   +18  ]
  { type: 'shop',  x:  25 },   // W=8   edges [ +21,   +29  ]
  { type: 'shop',  x:  36 },   // W=8   edges [ +32,   +40  ]
  { type: 'shop',  x:  47 },   // W=8   edges [ +43,   +51  ]
]

// High street south side (Z=+14, rot=PI → door faces −Z toward road)
const HS_SOUTH: Array<{ type: BuildingType; x: number }> = [
  { type: 'terraced', x: -52 },  // W=5  edges [−54.5, −49.5]
  { type: 'terraced', x: -45 },  // W=5  edges [−47.5, −42.5]
  { type: 'terraced', x: -37 },  // W=5  edges [−39.5, −34.5]
  { type: 'semi',     x: -27 },  // W=9  edges [−31.5, −22.5]
  { type: 'terraced', x: -14 },  // W=5  edges [−16.5, −11.5]
  { type: 'semi',     x:  -3 },  // W=9  edges [ −7.5,  +1.5]
  { type: 'detached', x:  12 },  // W=11 edges [ +6.5, +17.5]
  { type: 'semi',     x:  26 },  // W=9  edges [+21.5, +30.5]
  { type: 'bungalow', x:  40 },  // W=12 edges [ +34,   +46 ]
]

// Residential, north of north lane (Z=−40, rot=0)
const RES_NORTH: Array<{ type: BuildingType; x: number }> = [
  { type: 'cottage',  x: -50 },  // W=7  (church is at X=−52 Z=−62, no overlap)
  { type: 'terraced', x: -41 },
  { type: 'terraced', x: -33 },
  { type: 'terraced', x: -25 },
  { type: 'semi',     x: -14 },
  { type: 'cottage',  x:  -3 },
  { type: 'cottage',  x:   7 },
  { type: 'semi',     x:  18 },
  { type: 'cottage',  x:  30 },
  { type: 'terraced', x:  39 },
  { type: 'terraced', x:  47 },
]

// Residential, south of south lane (Z=+42, rot=PI)
// X = ±50 left free for park / playground zones (they are at Z=60, but leave the X zone clear)
const RES_SOUTH: Array<{ type: BuildingType; x: number }> = [
  { type: 'detached', x: -36 },  // W=11 edges [−41.5, −30.5]
  { type: 'semi',     x: -24 },
  { type: 'semi',     x: -13 },
  { type: 'bungalow', x:   0 },
  { type: 'detached', x:  13 },
  { type: 'bungalow', x:  27 },
  { type: 'semi',     x:  39 },  // W=9  edges [+34.5, +43.5]  — park/playground at ±52 Z=60 clear
]

export function WorldScene() {
  const weather = useSceneStore((s) => s.weather)

  return (
    <>
      <Sky />
      <SunLight />
      <RainSystem />
      {weather !== 'clear' && <fog attach="fog" args={['#8a9fae', 55, 240]} />}

      <IsometricCamera distance={92} />
      <Ground />

      {/* ── Roads ─────────────────────────────────────────────────────────── */}
      {/* Three horizontal arteries */}
      <Road from={[-68, 0, 0]} to={[68, 0, 0]} />          {/* main high street */}
      <Road from={[-62, 0, -30]} to={[62, 0, -30]} />      {/* north residential lane */}
      <Road from={[-62, 0,  30]} to={[62, 0,  30]} />      {/* south residential lane */}

      {/* Perimeter north-south connectors — outside the building cluster */}
      <Road from={[-62, 0, -50]} to={[-62, 0,  50]} />     {/* far-left connector */}
      <Road from={[ 62, 0, -50]} to={[ 62, 0,  50]} />     {/* far-right connector */}

      {/* Back lane behind residential rows */}
      <Road from={[-62, 0, -50]} to={[62, 0, -50]} />      {/* back north lane */}
      <Road from={[-62, 0,  50]} to={[62, 0,  50]} />      {/* back south lane */}

      {/* ── Junction patches at every road crossing ──────────────────────── */}
      {([
        [-62, 0,   0], [ 62, 0,   0],   // connector ∩ main street
        [-62, 0, -30], [ 62, 0, -30],   // connector ∩ north lane
        [-62, 0,  30], [ 62, 0,  30],   // connector ∩ south lane
        [-62, 0, -50], [ 62, 0, -50],   // connector ∩ back north lane
        [-62, 0,  50], [ 62, 0,  50],   // connector ∩ back south lane
      ] as [number, number, number][]).map((p, i) => (
        <RoadJunction key={`jct-${i}`} position={p} />
      ))}

      {/* ── High street north  (Z=−14, doors face +Z → road) ───────────── */}
      {HS_NORTH.map(({ type, x }, i) => (
        <Building key={`hsn-${i}`} type={type} position={[x, 0, -14]} rotation={0} />
      ))}

      {/* ── High street south  (Z=+14, doors face −Z → road) ───────────── */}
      {HS_SOUTH.map(({ type, x }, i) => (
        <Building key={`hss-${i}`} type={type} position={[x, 0, 14]} rotation={Math.PI} />
      ))}

      {/* ── Residential north  (Z=−40, doors face south) ────────────────── */}
      {RES_NORTH.map(({ type, x }, i) => (
        <Building key={`rn-${i}`} type={type} position={[x, 0, -40]} rotation={0} />
      ))}

      {/* ── Residential south  (Z=+42, doors face north) ────────────────── */}
      {RES_SOUTH.map(({ type, x }, i) => (
        <Building key={`rs-${i}`} type={type} position={[x, 0, 42]} rotation={Math.PI} />
      ))}

      {/* ── Church — NW corner, clear of roads and residential ──────────── */}
      <Building type="church"    position={[-52, 0, -62]} rotation={0} />

      {/* ── Apartment block — NE corner ─────────────────────────────────── */}
      <Building type="apartment" position={[ 52, 0, -62]} rotation={0} />

      {/* ── Park — SW, behind south residential row ─────────────────────── */}
      <Park position={[-50, 0, 62]} />

      {/* ── Playground — SE, behind south residential row ───────────────── */}
      <Playground position={[50, 0, 62]} />

      {/* ── Street lamps: main street (pavement strip Z=±6) ─────────────── */}
      {([-55, -40, -24, -8, 8, 24, 40, 55] as number[]).map((x, i) => (
        <StreetLamp key={`lamp-${i}`} position={[x, 0, 6]} />
      ))}
      {/* North lane south side (Z=−24) */}
      {([-48, -32, -16, 0, 16, 32, 48] as number[]).map((x, i) => (
        <StreetLamp key={`lampN-${i}`} position={[x, 0, -24]} />
      ))}
      {/* South lane north side (Z=+24) */}
      {([-44, -28, -10, 8, 28, 44] as number[]).map((x, i) => (
        <StreetLamp key={`lampS-${i}`} position={[x, 0, 24]} />
      ))}

      {/* ── Post boxes ──────────────────────────────────────────────────── */}
      <PostBox position={[-20, 0, 7]} />
      <PostBox position={[ 20, 0, -7]} />
      <PostBox position={[-40, 0, -24]} />
      <PostBox position={[ 38, 0,  24]} />

      {/* ── Scattered corner trees ──────────────────────────────────────── */}
      {([
        [-58, 0, -55], [58, 0, -55], [-58, 0, 55], [58, 0, 55],
        [-42, 0, -54], [42, 0, -54], [-42, 0, 54], [42, 0, 54],
        [-58, 0, -14], [58, 0, -14], [-58, 0, 14], [58, 0, 14],
        [-10, 0, -54], [10, 0, -54],
      ] as [number, number, number][]).map((p, i) => (
        <Tree key={`tree-${i}`} position={p} variant={i % 4} />
      ))}
    </>
  )
}

// ── Asset Preview Scene ──────────────────────────────────────────────────────

export function AssetScene() {
  const selectedAsset = useSceneStore((s) => s.selectedAsset)

  return (
    <>
      <Sky />
      <SunLight />
      <OrbitControls enablePan={false} minDistance={8} maxDistance={70} />

      {/* Grass pad */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[32, 32]} />
        <meshStandardMaterial color="#3a6028" roughness={0.95} />
      </mesh>
      {/* Gravel path in front */}
      <mesh receiveShadow position={[0, 0.02, 10]}>
        <boxGeometry args={[3.5, 0.05, 10]} />
        <meshStandardMaterial color="#9a9080" roughness={0.9} />
      </mesh>

      <Building type={selectedAsset} position={[0, 0, 0]} />
      <StreetLamp position={[10, 0, 8]} />
      <StreetLamp position={[-10, 0, 8]} />
      <Tree position={[13, 0, -6]} variant={0} />
      <Tree position={[-13, 0, -6]} variant={2} />
      <PostBox position={[6, 0, 8]} />
    </>
  )
}
