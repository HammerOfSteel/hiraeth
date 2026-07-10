import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore, getSunParams } from '@/store/scene'

export function Sky() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const matRef  = useRef<THREE.ShaderMaterial>(null!)
  const t = useSceneStore((s) => s.timeOfDay)

  const { skyTop, skyBot } = getSunParams(t)

  const uniforms = useMemo(() => ({
    uTop: { value: new THREE.Color(...skyTop) },
    uBot: { value: new THREE.Color(...skyBot) },
  }), [])  // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const p = getSunParams(useSceneStore.getState().timeOfDay)
    uniforms.uTop.value.setRGB(...p.skyTop)
    uniforms.uBot.value.setRGB(...p.skyBot)
  })

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[400, 32, 16]} />
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vWorldPos;
          void main() {
            vWorldPos = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uTop;
          uniform vec3 uBot;
          varying vec3 vWorldPos;
          void main() {
            float t = clamp(vWorldPos.y / 300.0, 0.0, 1.0);
            gl_FragColor = vec4(mix(uBot, uTop, t), 1.0);
          }
        `}
        side={THREE.BackSide}
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
        <bufferAttribute attach="attributes-position" args={[posArr, 3]} />
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
