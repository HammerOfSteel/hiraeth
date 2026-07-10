import { mount } from 'svelte'
import App from '@ui/App.svelte'
import { SceneManager } from '@engine/SceneManager'
import { RenderLoop } from '@engine/RenderLoop'
import { IsometricCamera } from '@camera/IsometricCamera'
import { WorldGenerator, DEFAULT_WORLD_CONFIG, type WorldConfig, type WorldResult } from '@world/WorldGenerator'
import { HemisphericLight, Vector3 } from '@babylonjs/core'
import { Pane } from 'tweakpane'

// ── UI overlay ────────────────────────────────────────────────────────────────
mount(App, { target: document.getElementById('ui-root')! })

async function bootstrap(): Promise<void> {
  // ── 3D engine ──────────────────────────────────────────────────────────────
  const canvas = document.getElementById('render-canvas') as HTMLCanvasElement
  const sceneManager = await SceneManager.create(canvas)
  const { scene } = sceneManager

  // Overhead + fill light
  const sun = new HemisphericLight('sun', new Vector3(0.4, 1, 0.3), scene)
  sun.intensity = 1.1

  // ── Camera ──────────────────────────────────────────────────────────────────
  new IsometricCamera(scene, canvas, { radius: 160, maxRadius: 320 })

  // ── World ───────────────────────────────────────────────────────────────────
  const worldGen = new WorldGenerator(scene)
  const worldCfg: WorldConfig = { ...DEFAULT_WORLD_CONFIG }
  let currentWorld: WorldResult | null = null

  function regenerate(): void {
    currentWorld?.dispose()
    currentWorld = worldGen.generate(worldCfg)
  }

  regenerate()

  // ── Render loop ─────────────────────────────────────────────────────────────
  const renderLoop = new RenderLoop(sceneManager.engine, scene)
  renderLoop.start()

  // ── Dev controls ────────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    const pane = new Pane({ title: 'Hiraeth', expanded: true })

    // Performance stats
    const stats = { fps: 0, deltaMs: 0, drawCalls: 0 }
    const fpsBlade = pane.addBinding(stats, 'fps',       { readonly: true, label: 'FPS' })
    const dtBlade  = pane.addBinding(stats, 'deltaMs',   { readonly: true, label: 'δ ms' })
    const dcBlade  = pane.addBinding(stats, 'drawCalls', { readonly: true, label: 'Draw calls' })
    renderLoop.onStats(s => {
      stats.fps = s.fps; stats.deltaMs = s.deltaMs; stats.drawCalls = s.drawCalls
      fpsBlade.refresh(); dtBlade.refresh(); dcBlade.refresh()
    })

    // World parameters
    pane.addBinding(worldCfg, 'seed',        { label: 'Seed', step: 1 })
    pane.addBinding(worldCfg, 'valleyWidth', { label: 'Valley width', min: 0.1, max: 0.9, step: 0.01 })
    pane.addBinding(worldCfg, 'hilliness',   { label: 'Hilliness',    min: 0.1, max: 1.0, step: 0.01 })
    pane.addBinding(worldCfg, 'coastal',     { label: 'Coastal' })
    pane.addBinding(worldCfg, 'treeDensity', { label: 'Trees',        min: 0.0, max: 0.6, step: 0.01 })
    pane.addButton({ title: '⟳ Regenerate' }).on('click', regenerate)
  }

  window.addEventListener('resize', () => sceneManager.resize())
}

bootstrap().catch(console.error)
