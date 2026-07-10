import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { buildBuilding, BLUEPRINTS } from './BuildingFactory'
import { useSceneStore } from '@/store/scene'
import type { BuildingType } from '@/store/scene'

interface BuildingProps {
  type: BuildingType
  position?: [number, number, number]
  rotation?: number
}

export function Building({ type, position = [0, 0, 0], rotation = 0 }: BuildingProps) {
  const groupRef = useRef<THREE.Group>(null!)
  const t = useSceneStore((s) => s.timeOfDay)
  const windowsLit = t < 7 || t > 19

  const built = useMemo(() => {
    const bp = BLUEPRINTS[type]
    return buildBuilding(bp, windowsLit)
  }, [type, windowsLit])

  return (
    <primitive
      ref={groupRef}
      object={built}
      position={position}
      rotation={[0, rotation, 0]}
    />
  )
}

/** Street lamp with point light */
export function StreetLamp({ position = [0, 0, 0] as [number, number, number] }) {
  const t = useSceneStore((s) => s.timeOfDay)
  const isOn = t < 7 || t > 18
  const lightRef = useRef<THREE.PointLight>(null!)

  useFrame(() => {
    const tod = useSceneStore.getState().timeOfDay
    const on = tod < 7 || tod > 18
    if (lightRef.current) lightRef.current.intensity = on ? 2.5 : 0
  })

  return (
    <group position={position}>
      {/* Post */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.12, 5.5, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Arm */}
      <mesh castShadow position={[0.5, 2.6, 0]} rotation={[0, 0, -0.3]}>
        <cylinderGeometry args={[0.05, 0.05, 1.2, 6]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.6} metalness={0.5} />
      </mesh>
      {/* Lantern head */}
      <mesh position={[1.0, 2.35, 0]}>
        <boxGeometry args={[0.35, 0.45, 0.35]} />
        <meshStandardMaterial
          color={isOn ? '#f5c842' : '#1a1a1a'}
          emissive={isOn ? new THREE.Color(1.0, 0.75, 0.15) : new THREE.Color(0, 0, 0)}
          emissiveIntensity={isOn ? 2.0 : 0}
          roughness={0.3}
        />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[1.0, 2.35, 0]}
        color="#f5c066"
        intensity={isOn ? 2.5 : 0}
        distance={18}
        decay={2}
        castShadow={false}
      />
    </group>
  )
}

/** Simple tree */
export function Tree({ position = [0, 0, 0] as [number, number, number], variant = 0 }) {
  const trunkColor = '#4a3020'
  const foliageColors = ['#2d5a27', '#3a6b2e', '#4a7a3a', '#2a5020']
  const fc = foliageColors[variant % 4]
  const h = 3 + (variant % 3)
  const r = 1.2 + (variant % 2) * 0.4

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.2, 0.35, h * 0.45, 6]} />
        <meshStandardMaterial color={trunkColor} roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, h * 0.45 + r * 0.5, 0]}>
        <sphereGeometry args={[r, 8, 6]} />
        <meshStandardMaterial color={fc} roughness={0.95} />
      </mesh>
      {/* Second canopy layer for fullness */}
      <mesh castShadow position={[0.3, h * 0.45 + r * 0.8, 0.2]}>
        <sphereGeometry args={[r * 0.7, 7, 5]} />
        <meshStandardMaterial color={fc} roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Road segment */
export function Road({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const dir = new THREE.Vector3(...to).sub(new THREE.Vector3(...from))
  const len = dir.length()
  const mid: [number, number, number] = [
    (from[0] + to[0]) / 2,
    0.02,
    (from[2] + to[2]) / 2,
  ]
  const angle = Math.atan2(dir.x, dir.z)

  return (
    <group position={mid} rotation={[0, angle, 0]}>
      {/* Tarmac */}
      <mesh receiveShadow>
        <boxGeometry args={[7, 0.05, len]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.98} />
      </mesh>
      {/* Pavements */}
      <mesh receiveShadow position={[4.2, 0.03, 0]}>
        <boxGeometry args={[1.8, 0.06, len]} />
        <meshStandardMaterial color="#8a8070" roughness={0.92} />
      </mesh>
      <mesh receiveShadow position={[-4.2, 0.03, 0]}>
        <boxGeometry args={[1.8, 0.06, len]} />
        <meshStandardMaterial color="#8a8070" roughness={0.92} />
      </mesh>
      {/* Centre line */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[0.12, 0.01, len * 0.95]} />
        <meshStandardMaterial color="#d0c040" roughness={0.8} />
      </mesh>
    </group>
  )
}

/** Bench */
export function Bench({ position = [0, 0, 0] as [number, number, number], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat planks */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[1.8, 0.1, 0.5]} />
        <meshStandardMaterial color="#6b4a20" roughness={0.85} />
      </mesh>
      {/* Back */}
      <mesh castShadow position={[0, 0.9, -0.22]}>
        <boxGeometry args={[1.8, 0.5, 0.08]} />
        <meshStandardMaterial color="#6b4a20" roughness={0.85} />
      </mesh>
      {/* Legs */}
      {([-0.7, 0.7] as number[]).map((x) => (
        <mesh key={x} castShadow position={[x, 0.25, 0]}>
          <boxGeometry args={[0.1, 0.5, 0.55]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.7} metalness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Park area */
export function Park({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Grass */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[28, 22]} />
        <meshStandardMaterial color="#3a6030" roughness={0.95} />
      </mesh>
      {/* Gravel path */}
      <mesh receiveShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[2.0, 0.04, 22]} />
        <meshStandardMaterial color="#a09080" roughness={0.92} />
      </mesh>
      <mesh receiveShadow position={[0, 0.03, 0]}>
        <boxGeometry args={[28, 0.04, 2.0]} />
        <meshStandardMaterial color="#a09080" roughness={0.92} />
      </mesh>
      {/* Benches */}
      <Bench position={[4, 0, 2]} rotation={Math.PI * 0.25} />
      <Bench position={[-4, 0, -2]} rotation={Math.PI * 0.75} />
      {/* Trees */}
      <Tree position={[-9, 0, -7]} variant={0} />
      <Tree position={[-8, 0,  6]} variant={1} />
      <Tree position={[ 9, 0, -6]} variant={2} />
      <Tree position={[ 8, 0,  7]} variant={3} />
      {/* Flower beds */}
      <mesh receiveShadow position={[5, 0.04, -6]}>
        <boxGeometry args={[3, 0.06, 2]} />
        <meshStandardMaterial color="#8b4040" roughness={0.95} />
      </mesh>
      <mesh receiveShadow position={[-5, 0.04, 6]}>
        <boxGeometry args={[3, 0.06, 2]} />
        <meshStandardMaterial color="#6b4080" roughness={0.95} />
      </mesh>
    </group>
  )
}

/** Playground */
export function Playground({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rubber surface */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[14, 10]} />
        <meshStandardMaterial color="#8b3a20" roughness={0.98} />
      </mesh>
      {/* Swings A-frame */}
      {([-2, 2] as number[]).map((x) => (
        <group key={x}>
          <mesh castShadow position={[x, 2.0, -3.5]} rotation={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 4.5, 6]} />
            <meshStandardMaterial color="#666" roughness={0.5} metalness={0.6} />
          </mesh>
          <mesh castShadow position={[x, 2.0, 3.5]} rotation={[-0.3, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 4.5, 6]} />
            <meshStandardMaterial color="#666" roughness={0.5} metalness={0.6} />
          </mesh>
        </group>
      ))}
      {/* Swing crossbar */}
      <mesh castShadow position={[0, 4.0, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 6, 6]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#666" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Slide */}
      <mesh castShadow position={[5, 1.5, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[3.5, 0.12, 1.4]} />
        <meshStandardMaterial color="#d44020" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh castShadow position={[4.5, 3.1, 0]}>
        <boxGeometry args={[1.0, 3.0, 1.0]} />
        <meshStandardMaterial color="#c84020" roughness={0.7} />
      </mesh>
    </group>
  )
}

/** Post box */
export function PostBox({ position = [0, 0, 0] as [number, number, number] }) {
  return (
    <group position={position}>
      {/* Post */}
      <mesh castShadow>
        <cylinderGeometry args={[0.08, 0.08, 0.9, 8]} />
        <meshStandardMaterial color="#8b0000" roughness={0.6} />
      </mesh>
      {/* Box body */}
      <mesh castShadow position={[0, 0.75, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.6, 12]} />
        <meshStandardMaterial color="#cc0000" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Domed top */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.26, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#cc0000" roughness={0.5} metalness={0.1} />
      </mesh>
    </group>
  )
}

/** Ground plane */
export function Ground() {
  return (
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[400, 400, 1, 1]} />
      <meshStandardMaterial color="#3d5228" roughness={0.95} />
    </mesh>
  )
}
