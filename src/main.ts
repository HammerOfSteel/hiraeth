import { mount } from 'svelte'
import App from '@ui/App.svelte'
import { SceneManager } from '@engine/SceneManager'
import { RenderLoop } from '@engine/RenderLoop'
import { IsometricCamera } from '@camera/IsometricCamera'
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core'

// ── UI overlay ────────────────────────────────────────────────────────────────
mount(App, { target: document.getElementById('ui-root')! })

async function bootstrap(): Promise<void> {
  // ── 3D engine ──────────────────────────────────────────────────────────────
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement
  const sceneManager = await SceneManager.create(canvas)
  const { scene } = sceneManager

  // Placeholder: a simple ground + box so Phase 0 is visually confirmable
  const ground = MeshBuilder.CreateGround('ground', { width: 50, height: 50 }, scene)
  const groundMat = new StandardMaterial('groundMat', scene)
  groundMat.diffuseColor = new Color3(0.22, 0.3, 0.18)
  ground.material = groundMat

  const box = MeshBuilder.CreateBox('placeholder', { size: 2 }, scene)
  box.position.y = 1
  const boxMat = new StandardMaterial('boxMat', scene)
  boxMat.diffuseColor = new Color3(0.7, 0.5, 0.3)
  box.material = boxMat

  // ── Camera ──────────────────────────────────────────────────────────────────
  new IsometricCamera(scene, canvas)

  // ── Render loop ─────────────────────────────────────────────────────────────
  const renderLoop = new RenderLoop(sceneManager.engine, scene)
  renderLoop.start()

  // Resize engine when window resizes
  window.addEventListener('resize', () => sceneManager.resize())
}

bootstrap().catch(console.error)
