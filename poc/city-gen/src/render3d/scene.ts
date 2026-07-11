// src/render3d/scene.ts — Three.js scene + camera + renderer setup
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export interface SceneSetup {
  renderer:  THREE.WebGLRenderer
  scene:     THREE.Scene
  camera:    THREE.PerspectiveCamera
  controls:  OrbitControls
  dispose:   () => void
}

export function createScene(canvas: HTMLCanvasElement): SceneSetup {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type    = THREE.PCFSoftShadowMap

  const scene  = new THREE.Scene()
  scene.background = new THREE.Color(0xd4cfc8)
  scene.fog        = new THREE.Fog(0xd4cfc8, 100, 600)

  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 2000)
  camera.position.set(0, 120, 180)
  camera.lookAt(0, 0, 0)

  const controls         = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.maxPolarAngle = Math.PI / 2.2
  controls.minDistance   = 20
  controls.maxDistance   = 600

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)

  let animId = 0
  const loop = () => {
    animId = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  loop()

  return {
    renderer, scene, camera, controls,
    dispose: () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
    },
  }
}
