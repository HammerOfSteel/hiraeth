// src/render3d/lighting.ts — 6 lighting presets
import * as THREE from 'three'

export interface LightPreset {
  name:       string
  skyColor:   number
  fogColor:   number
  ambient:    number
  ambientInt: number
  sun:        number
  sunInt:     number
  sunPos:     [number, number, number]
}

export const LIGHT_PRESETS: LightPreset[] = [
  {
    name: 'Day',
    skyColor:   0xd4cfc8, fogColor:   0xd4cfc8,
    ambient:    0xfff4e0, ambientInt: 0.6,
    sun:        0xffeedd, sunInt:     1.2,
    sunPos:     [100, 200, 80],
  },
  {
    name: 'Evening',
    skyColor:   0x3a2a1a, fogColor:   0x3a2a1a,
    ambient:    0xff8844, ambientInt: 0.5,
    sun:        0xff6622, sunInt:     0.9,
    sunPos:     [200, 40, 60],
  },
  {
    name: 'Night',
    skyColor:   0x0d0d1a, fogColor:   0x0d0d1a,
    ambient:    0x2a3a6a, ambientInt: 0.3,
    sun:        0x6688cc, sunInt:     0.4,
    sunPos:     [-100, 180, -60],
  },
  {
    name: 'Desert',
    skyColor:   0xf0d8a0, fogColor:   0xf0d8a0,
    ambient:    0xfff0c0, ambientInt: 0.8,
    sun:        0xffeeaa, sunInt:     1.4,
    sunPos:     [80, 220, 40],
  },
  {
    name: 'Winter',
    skyColor:   0xe0eaf4, fogColor:   0xe0eaf4,
    ambient:    0xd0e8ff, ambientInt: 0.7,
    sun:        0xe8f4ff, sunInt:     0.9,
    sunPos:     [120, 150, 100],
  },
  {
    name: 'Overcast',
    skyColor:   0x909090, fogColor:   0x909090,
    ambient:    0xaaaaaa, ambientInt: 0.9,
    sun:        0xcccccc, sunInt:     0.3,
    sunPos:     [0, 300, 0],
  },
]

export function applyLightPreset(scene: THREE.Scene, preset: LightPreset): THREE.DirectionalLight {
  // Remove existing lights
  scene.children.filter(c => c instanceof THREE.Light).forEach(l => scene.remove(l))

  scene.background = new THREE.Color(preset.skyColor)
  if (scene.fog instanceof THREE.Fog) {
    scene.fog.color.setHex(preset.fogColor)
  }

  const ambient = new THREE.AmbientLight(preset.ambient, preset.ambientInt)
  scene.add(ambient)

  const sun = new THREE.DirectionalLight(preset.sun, preset.sunInt)
  sun.position.set(...preset.sunPos)
  sun.castShadow             = true
  sun.shadow.mapSize.width   = 2048
  sun.shadow.mapSize.height  = 2048
  sun.shadow.camera.near     = 10
  sun.shadow.camera.far      = 800
  sun.shadow.camera.left     = -300
  sun.shadow.camera.right    = 300
  sun.shadow.camera.top      = 300
  sun.shadow.camera.bottom   = -300
  scene.add(sun)

  return sun
}
