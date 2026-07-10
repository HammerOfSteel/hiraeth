import { mount } from 'svelte'
import App from '@ui/App.svelte'
import { SceneManager } from '@engine/SceneManager'
import { RenderLoop } from '@engine/RenderLoop'
import { IsometricCamera } from '@camera/IsometricCamera'
import { MeshBuilder, StandardMaterial, Color3 } from '@babylonjs/core'
import { Pane } from 'tweakpane'

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

  // ── Dev performance monitor (only in development) ──────────────────────────
  if (import.meta.env.DEV) {
    const pane = new Pane({ title: 'Hiraeth Dev', expanded: true })
    const stats = { fps: 0, deltaMs: 0, drawCalls: 0 }
    const fpsBlades = pane.addBinding(stats, 'fps', { readonly: true, label: 'FPS' })
    const dtBlade = pane.addBinding(stats, 'deltaMs', { readonly: true, label: 'δ ms' })
    const dcBlade = pane.addBinding(stats, 'drawCalls', { readonly: true, label: 'Draw calls' })

    renderLoop.onStats(s => {
      stats.fps = s.fps
      stats.deltaMs = s.deltaMs
      stats.drawCalls = s.drawCalls
      fpsBlades.refresh()
      dtBlade.refresh()
      dcBlade.refresh()
    })
  }

  // Resize engine when window resizes
  window.addEventListener('resize', () => sceneManager.resize())
}

bootstrap().catch(console.error)
