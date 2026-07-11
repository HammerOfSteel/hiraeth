import { useEffect, useRef, useState, useCallback, useTransition } from 'react'
import type { GenParams, GeneratedWorld } from './gen/types'
import { generateWorld }  from './gen/generator'
import { runTests }       from './gen/tests'
import type { TestResult } from './gen/tests'
import { renderWorld }   from './ui/renderer'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ViewState {
  zoom: number
  panX: number
  panY: number
}

// ─── Defaults ────────────────────────────────────────────────────────────────
const DEFAULT_PARAMS: GenParams = {
  seed:                42,
  mapSize:             300,
  waterAmount:         0.45,
  gridNoise:           0.35,
  arterialCount:       7,
  residentialDensity:  0.7,
  lotShrink:           0.15,
  majorSpacing:        26,
}

// ─── Slider config ───────────────────────────────────────────────────────────
interface SliderDef {
  key: keyof GenParams
  label: string
  min: number
  max: number
  step: number
  format?: (v: number) => string
}

const SLIDERS: SliderDef[] = [
  { key: 'seed',               label: 'Seed',                min: 1,   max: 9999, step: 1 },
  { key: 'mapSize',            label: 'Map Size',            min: 100, max: 500,  step: 10 },
  { key: 'waterAmount',        label: 'Water Amount',        min: 0,   max: 1,    step: 0.05, format: v => (v*100).toFixed(0)+'%' },
  { key: 'gridNoise',          label: 'Road Wander',         min: 0,   max: 1,    step: 0.05, format: v => (v*100).toFixed(0)+'%' },
  { key: 'arterialCount',      label: 'Arterial Roads',      min: 2,   max: 16,   step: 1 },
  { key: 'residentialDensity', label: 'Residential Density', min: 0,   max: 1,    step: 0.05, format: v => (v*100).toFixed(0)+'%' },
  { key: 'lotShrink',          label: 'Lot Setback',         min: 0,   max: 0.4,  step: 0.01, format: v => (v*100).toFixed(0)+'%' },
  { key: 'majorSpacing',       label: 'Road Spacing',        min: 10,  max: 80,   step: 2 },
]

// ─── Component ───────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const [params, setParams]   = useState<GenParams>(DEFAULT_PARAMS)
  const [world,  setWorld]    = useState<GeneratedWorld | null>(null)
  const [tests,  setTests]    = useState<TestResult[]>([])
  const [view,   setView]     = useState<ViewState>({ zoom: 1, panX: 0, panY: 0 })
  const [showWater,   setShowWater]   = useState(true)
  const [showLots,    setShowLots]    = useState(true)
  const [showGrid,    setShowGrid]    = useState(false)
  const [showCostMap, setShowCostMap] = useState(false)
  const [generating,  startTransition] = useTransition()

  const dragging  = useRef(false)
  const lastMouse = useRef({ x: 0, y: 0 })

  // ── Generate world ─────────────────────────────────────────────────────────
  const generate = useCallback(() => {
    startTransition(() => {
      const w = generateWorld(params)
      setWorld(w)
      setTests(runTests(w))
    })
  }, [params])

  // Auto-generate on first load
  useEffect(() => { generate() }, []) // eslint-disable-line

  // ── Canvas resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width  * devicePixelRatio
      canvas.height = rect.height * devicePixelRatio
    })
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [])

  // ── Re-render when world/view/options change ───────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderWorld(canvas, world, {
      showWater, showLots, showGrid, showCostMap,
      zoom: view.zoom, panX: view.panX, panY: view.panY,
      tests,
    })
  }, [world, view, showWater, showLots, showGrid, showCostMap, tests])

  // ── Mouse pan ─────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current  = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    setView(v => ({ ...v, panX: v.panX + dx * devicePixelRatio, panY: v.panY + dy * devicePixelRatio }))
  }
  const onMouseUp = () => { dragging.current = false }

  // ── Scroll zoom ───────────────────────────────────────────────────────────
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 0.89
    setView(v => ({ ...v, zoom: Math.max(0.2, Math.min(10, v.zoom * factor)) }))
  }

  // ── Param change ──────────────────────────────────────────────────────────
  const setParam = (key: keyof GenParams, value: number) => {
    setParams(p => ({ ...p, [key]: value }))
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw',
      background: '#0a0c12', color: '#e2e8f0', fontFamily: "'Inter', system-ui, sans-serif",
      overflow: 'hidden',
    }}>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside style={{
        width: 280, minWidth: 280, background: '#10131d',
        borderRight: '1px solid #1e2436',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px', borderBottom: '1px solid #1e2436',
          background: '#0d1020',
        }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#5a6a8a', marginBottom: 4, textTransform: 'uppercase' }}>
            hiraeth
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#c8d8f0' }}>
            Road Generator
          </div>
          <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 2 }}>
            tensor field · A* pathfinding · lot subdivision
          </div>
        </div>

        {/* Params */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {SLIDERS.map(def => (
            <div key={def.key} style={{ padding: '8px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: 11, color: '#8899bb', letterSpacing: 0.5 }}>
                  {def.label}
                </label>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#c8d8f0', background: '#1a2030', padding: '1px 6px', borderRadius: 3 }}>
                  {def.format ? def.format(params[def.key] as number) : (params[def.key] as number)}
                </span>
              </div>
              <input
                type="range"
                min={def.min} max={def.max} step={def.step}
                value={params[def.key] as number}
                onChange={e => setParam(def.key, parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#4a7ccc', cursor: 'pointer' }}
              />
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: '#1e2436', margin: '8px 0' }} />

          {/* Toggles */}
          <div style={{ padding: '4px 20px' }}>
            <div style={{ fontSize: 11, color: '#5a6a8a', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              Display
            </div>
            {[
              { label: 'Water',    value: showWater,    set: setShowWater },
              { label: 'Lots',     value: showLots,     set: setShowLots },
              { label: 'Grid',     value: showGrid,     set: setShowGrid },
              { label: 'Cost Map', value: showCostMap,  set: setShowCostMap },
            ].map(t => (
              <button
                key={t.label}
                onClick={() => t.set(!t.value)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 10px', marginBottom: 4, borderRadius: 6,
                  border: '1px solid',
                  borderColor: t.value ? '#2a4a8a' : '#1e2436',
                  background:  t.value ? '#1a2d50' : '#131825',
                  color:       t.value ? '#8ab4e8' : '#4a5a7a',
                  fontSize: 12, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ marginRight: 8, fontSize: 9 }}>{t.value ? '◉' : '○'}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid #1e2436', background: '#0d1020' }}>
          <button
            onClick={generate}
            disabled={generating}
            style={{
              width: '100%', padding: '12px', borderRadius: 8,
              border: 'none', cursor: generating ? 'wait' : 'pointer',
              background: generating ? '#1a2040' : 'linear-gradient(135deg, #1a4080, #2a5faa)',
              color: generating ? '#4a5a7a' : '#c8d8f0',
              fontSize: 13, fontWeight: 600, letterSpacing: 0.5,
              transition: 'all 0.2s',
              boxShadow: generating ? 'none' : '0 2px 12px #1a40804a',
            }}
          >
            {generating ? '⟳  Generating…' : '⬡  Generate World'}
          </button>

          {/* Reset view */}
          <button
            onClick={() => setView({ zoom: 1, panX: 0, panY: 0 })}
            style={{
              width: '100%', marginTop: 8, padding: '8px',
              borderRadius: 6, border: '1px solid #1e2436',
              background: 'transparent', color: '#4a5a7a',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            Reset View
          </button>

          <div style={{ marginTop: 10, fontSize: 10, color: '#2a3448', textAlign: 'center' }}>
            scroll to zoom · drag to pan
          </div>
        </div>
      </aside>

      {/* ── Canvas ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          style={{
            display: 'block', width: '100%', height: '100%',
            cursor: dragging.current ? 'grabbing' : 'grab',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        />

        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 16, right: 16,
          background: 'rgba(10,12,18,0.85)', border: '1px solid #1e2436',
          borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(8px)',
        }}>
          {[
            { color: '#ff9944', label: 'Highway',          shape: 'road' },
            { color: '#f5c842', label: 'Arterial road',    shape: 'road' },
            { color: '#8ab4e8', label: 'Residential road', shape: 'road' },
            { color: '#3a6a3a', label: 'Residential lot',  shape: 'lot' },
            { color: '#7a4a18', label: 'Commercial lot',   shape: 'lot' },
            { color: '#2a4a7a', label: 'Civic lot',        shape: 'lot' },
            { color: '#2a7a2a', label: 'Green space',      shape: 'lot' },
            { color: '#1a2d4a', label: 'Water',            shape: 'road' },
          ].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: 11 }}>
              <div style={{
                width: l.shape === 'lot' ? 10 : 20,
                height: l.shape === 'lot' ? 10 : 3,
                background: l.color,
                borderRadius: l.shape === 'lot' ? 2 : 2,
              }} />
              <span style={{ color: '#8899bb' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
