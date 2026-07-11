import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore, getSunParams } from '@/store/scene'

export function Sky() {
  const t = useSceneStore((s) => s.timeOfDay)
  const { skyTop, skyBot } = getSunParams(t)

  return (
    <mesh scale={[-1, 1, 1]}>
      <sphereGeometry args={[400, 32, 16]} />
      <meshBasicMaterial
        color={new THREE.Color(...skyTop).lerp(new THREE.Color(...skyBot), 0.4)}
        side={THREE.BackSide}
        toneMapped={false}
      />
    </mesh>
  )
}

export function SunLight() {
  const lightRef  = useRef<THREE.DirectionalLight>(null!)
  const ambRef    = useRef<THREE.AmbientLight>(null!)

  useFrame(() => {
    const { sunColor, sunIntensity, ambientIntensity, elevation, azimuth } =
      getSunParams(useSceneStore.getState().timeOfDay)

    if (lightRef.current) {
      lightRef.current.color.setRGB(...sunColor)
      lightRef.current.intensity = sunIntensity
      lightRef.current.position.set(azimuth * 80, elevation * 80 + 40, -40)
    }
    if (ambRef.current) {
      ambRef.current.intensity = ambientIntensity
    }
  })

  return (
    <>
      <directionalLight
        ref={lightRef}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={1}
        shadow-camera-far={300}
        shadow-bias={-0.0005}
      />
      <ambientLight ref={ambRef} color="#c8d8f0" />
    </>
  )
}

export function RainSystem() {
  const count = 4000
  const posArr = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 120
      arr[i * 3 + 1] = Math.random() * 60
      arr[i * 3 + 2] = (Math.random() - 0.5) * 120
    }
    return arr
  }, [])

  const geoRef = useRef<THREE.BufferGeometry>(null!)
  const weather = useSceneStore((s) => s.weather)

  useFrame((_, delta) => {
    if (weather !== 'rain') return
    const pos = geoRef.current.attributes['position'] as THREE.BufferAttribute
    const arr  = pos.array as Float32Array
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= delta * 28
      if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 60
    }
    pos.needsUpdate = true
  })

  if (weather !== 'rain') return null

  return (
    <points>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" count={count} array={posArr} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#a8c4d8"
        size={0.08}
        transparent
        opacity={0.55}
        sizeAttenuation
      />
    </points>
  )
}
