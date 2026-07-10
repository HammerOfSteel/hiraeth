import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { useSceneStore } from '@/store/scene'
import { Building, StreetLamp, Tree, Road, Park, Playground, PostBox, Ground } from './Assets'
import { Sky, SunLight, RainSystem } from './Atmosphere'
import type { BuildingType } from '@/store/scene'

const ISO_ANGLE = Math.PI / 5.5  // ~32° elevation
const ISO_AZI   = Math.PI / 4    // 45° azimuth

function IsometricCamera({ target = [0, 0, 0] as [number,number,number], distance = 80 }) {
  const controlsRef = useRef<OrbitControlsImpl>(null!)
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(
      target[0] + Math.cos(ISO_AZI) * Math.cos(ISO_ANGLE) * distance,
      target[1] + Math.sin(ISO_ANGLE) * distance,
      target[2] + Math.sin(ISO_AZI) * Math.cos(ISO_ANGLE) * distance,
    )
    camera.lookAt(target[0], target[1], target[2])
  }, [camera, target, distance])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate={false}
      minZoom={0.3}
      maxZoom={3}
      panSpeed={1.2}
      zoomSpeed={1.0}
      mouseButtons={{ LEFT: 2, MIDDLE: 1, RIGHT: 2 }}  // right-drag to pan
    />
  )
}

/** Full world scene — the "town" layout */
export function WorldScene() {
  const weather = useSceneStore((s) => s.weather)

  return (
    <>
      <Sky />
      <SunLight />
      <RainSystem />
      {weather !== 'clear' && <fog attach="fog" args={['#9aafbe', 60, 260]} />}

      <IsometricCamera target={[0, 0, 0]} distance={90} />
      <Ground />

      {/* Main road spine */}
      <Road from={[-60, 0, 0]} to={[60, 0, 0]} />
      {/* Cross streets */}
      <Road from={[-20, 0, -40]} to={[-20, 0, 40]} />
      <Road from={[ 20, 0, -40]} to={[ 20, 0, 40]} />

      {/* North residential row — terraced */}
      {([-45, -30, -15, 0, 15, 30, 45] as number[]).map((x, i) => (
        <Building key={`tn${i}`} type="terraced" position={[x, 0, -16]} rotation={0} />
      ))}

      {/* South residential row — mix */}
      {(['cottage', 'semi', 'cottage', 'detached', 'cottage', 'semi', 'bungalow'] as BuildingType[]).map((t, i) => (
        <Building key={`ts${i}`} type={t} position={[i * 14 - 42, 0, 16]} />
      ))}

      {/* High street block */}
      <Building type="shop"   position={[-30, 0, 0]} rotation={Math.PI / 2} />
      <Building type="pub"    position={[-8,  0, 0]} rotation={Math.PI / 2} />
      <Building type="shop"   position={[14,  0, 0]} rotation={Math.PI / 2} />
      <Building type="civic"  position={[38,  0, 0]} rotation={Math.PI / 2} />

      {/* Church + civic on outer blocks */}
      <Building type="church" position={[-48, 0, -32]} />
      <Building type="apartment" position={[44, 0, -28]} />

      {/* Park */}
      <Park position={[-48, 0, 28]} />
      <Playground position={[44, 0, 28]} />

      {/* Street lamps along main road */}
      {([-50, -35, -20, -5, 10, 25, 40, 55] as number[]).map((x, i) => (
        <StreetLamp key={`lamp${i}`} position={[x, 0, 5]} />
      ))}

      {/* Scattered trees */}
      {([[-56,0,-22],[56,0,-22],[-56,0,22],[56,0,22],[-40,0,38],[40,0,38],[-38,0,-42],[38,0,-42]] as [number,number,number][]).map((p, i) => (
        <Tree key={`tr${i}`} position={p} variant={i} />
      ))}

      {/* Post boxes */}
      <PostBox position={[-18, 0, 6]} />
      <PostBox position={[22, 0, -6]} />
    </>
  )
}

/** Isolated single-asset preview */
export function AssetScene() {
  const selectedAsset = useSceneStore((s) => s.selectedAsset)
  const t = useSceneStore((s) => s.timeOfDay)
  const windowsLit = t < 7 || t > 19

  return (
    <>
      <Sky />
      <SunLight />

      <OrbitControls enablePan={false} minDistance={8} maxDistance={60} />

      {/* Neutral ground */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[30, 32]} />
        <meshStandardMaterial color="#3d5228" roughness={0.95} />
      </mesh>

      {/* The selected building, centred */}
      <Building type={selectedAsset} position={[0, 0, 0]} />

      {/* Couple of lamps for context */}
      <StreetLamp position={[9, 0, 9]} />
      <StreetLamp position={[-9, 0, 9]} />
      <Tree position={[12, 0, -8]} variant={0} />
      <Tree position={[-12, 0, -8]} variant={2} />
    </>
  )
}
