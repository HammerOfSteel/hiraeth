// src/ui/MapView.tsx
import { useRef, useEffect, useState, useCallback } from 'react'
import { Model, type ModelParams } from '../model/model'
import { Renderer2D } from '../render2d/renderer2d'
import { PALETTES, type Palette } from '../render2d/palette'
import { Pt } from '../geom/pt'
import { polyHitTest } from '../geom/polygon'

// ─── Size presets ─────────────────────────────────────────────────────────────

interface SizePreset { label: string; min: number; max: number }

const SIZE_PRESETS: SizePreset[] = [
  { label: 'Small Town',  min: 6,  max: 10 },
  { label: 'Large Town',  min: 10, max: 15 },
  { label: 'Small City',  min: 15, max: 24 },
  { label: 'Large City',  min: 24, max: 40 },
]

function randomSeed(): number { return Math.floor(Math.random() * 0xFFFFFF) }

function patchesForPreset(preset: SizePreset): number {
  return Math.floor(preset.min + Math.random() * (preset.max - preset.min))
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MapView() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const modelRef     = useRef<Model | null>(null)
  const scaleRef     = useRef(1)

  const [seed,       setSeed]       = useState(randomSeed)
  const [preset,     setPreset]     = useState(1)           // default: Large Town
  const [palette,    setPalette]    = useState<Palette>(PALETTES.Default)
  const [colourMode, setColourMode] = useState(false)
  const [genMs,      setGenMs]      = useState(0)
  const [tooltip,    setTooltip]    = useState<{ text: string; x: number; y: number } | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  // ── Generate + render ─────────────────────────────────────────────────────

  const generate = useCallback((s: number, nPatches: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setError(null)
    const params: ModelParams = { seed: s, nPatches }
    let model: Model
    const t0 = performance.now()
    try {
      model = new Model(params).build()
    } catch (e) {
      setError(`Generation failed: ${e}. Try a different seed.`)
      return
    }
    const ms = Math.round(performance.now() - t0)
    modelRef.current = model
    setGenMs(ms)

    // Compute scale and store it for hit-testing
    const w = canvas.width, h = canvas.height
    scaleRef.current = Math.min(w, h) / (model.cityRadius * 2) * 0.9

    const renderer = new Renderer2D(ctx, { palette, colourMode })
    renderer.render(model)
  }, [palette, colourMode])

  // ── Resize handler ────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      if (modelRef.current) {
        const params = modelRef.current.params
        generate(params.seed, params.nPatches)
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Initial generation ────────────────────────────────────────────────────

  useEffect(() => {
    const n = patchesForPreset(SIZE_PRESETS[preset])
    generate(seed, n)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, preset, palette, colourMode])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== document.body && e.target !== document.documentElement) return
      if (e.key === 'Enter') {
        setSeed(randomSeed())
      } else if (e.key >= '1' && e.key <= '4') {
        setPreset(parseInt(e.key) - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Mouse tooltip ─────────────────────────────────────────────────────────

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const model  = modelRef.current
    if (!canvas || !model) return

    const rect  = canvas.getBoundingClientRect()
    const dpr   = window.devicePixelRatio
    const cx    = (e.clientX - rect.left) * dpr
    const cy    = (e.clientY - rect.top)  * dpr
    const scale = scaleRef.current
    const wx    = (cx - canvas.width  / 2) / scale
    const wy    = (cy - canvas.height / 2) / scale
    const pt    = new Pt(wx, wy)

    const hit = model.patches.find(p => polyHitTest(p.shape, pt))
    if (hit?.ward) {
      const label = hit.ward.getLabel() ?? hit.ward.name
      setTooltip({ text: label, x: e.clientX + 12, y: e.clientY - 8 })
    } else {
      setTooltip(null)
    }
  }, [])

  const onMouseLeave = () => setTooltip(null)

  // ── JSON Export ───────────────────────────────────────────────────────────

  const exportJson = () => {
    const model = modelRef.current
    if (!model) return
    const data = {
      seed:      model.params.seed,
      nPatches:  model.params.nPatches,
      cityRadius: model.cityRadius,
      wards: model.patches.map(p => ({
        type:    p.ward?.name ?? 'unknown',
        shape:   p.shape.map(v => [v.x, v.y]),
        buildings: p.ward?.geometry.map(b => b.map(v => [v.x, v.y])) ?? [],
      })),
      arteries: model.arteries.map(a => a.map(v => [v.x, v.y])),
      wall: model.wall ? {
        shape:   model.wall.shape.map(v => [v.x, v.y]),
        gates:   model.wall.gates.map(v => [v.x, v.y]),
        towers:  model.wall.towers.map(v => [v.x, v.y]),
      } : null,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `city-${model.params.seed}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const palNames = Object.keys(PALETTES)

  return (
    <div className="relative w-full h-full bg-stone-900 select-none">
      {/* Full-screen canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      />

      {/* Error message */}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 text-sm px-4 py-2 rounded shadow-lg z-20">
          {error}
        </div>
      )}

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-10">
        {/* Size presets */}
        <div className="flex flex-col gap-1">
          {SIZE_PRESETS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => { setPreset(i); setSeed(randomSeed()) }}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors
                ${preset === i
                  ? 'bg-stone-200 text-stone-900'
                  : 'bg-stone-800/70 text-stone-300 hover:bg-stone-700/70'
                }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Palette swatches */}
        <div className="flex gap-1 mt-1">
          {palNames.map(name => {
            const pal = PALETTES[name]
            return (
              <button
                key={name}
                title={pal.name}
                onClick={() => setPalette(pal)}
                style={{ background: pal.paper, borderColor: pal.dark }}
                className={`w-5 h-5 rounded-sm border-2 transition-transform
                  ${palette.name === pal.name ? 'scale-125 ring-1 ring-white/60' : 'hover:scale-110'}`}
              />
            )
          })}
        </div>

        {/* Colour-mode toggle */}
        <button
          onClick={() => setColourMode(c => !c)}
          className={`text-xs px-2 py-1 rounded transition-colors
            ${colourMode ? 'bg-amber-500 text-stone-900' : 'bg-stone-800/70 text-stone-400 hover:bg-stone-700/70'}`}
        >
          Colour
        </button>

        {/* Export */}
        <button
          onClick={exportJson}
          className="text-xs px-2 py-1 bg-stone-800/70 text-stone-300 hover:bg-stone-700/70 rounded transition-colors"
        >
          Export JSON
        </button>
      </div>

      {/* Bottom-right: seed + time */}
      <div className="absolute bottom-4 right-4 text-xs text-stone-400/80 text-right z-10 font-mono">
        <div>seed {seed.toString(16).padStart(6, '0').toUpperCase()}</div>
        {genMs > 0 && <div>{genMs} ms</div>}
        <div className="mt-1 text-stone-500/60">Enter = new seed · 1–4 = size</div>
      </div>

      {/* Regenerate button (bottom-left) */}
      <button
        onClick={() => setSeed(randomSeed())}
        className="absolute bottom-4 left-4 text-xs px-3 py-1.5 bg-stone-800/70 text-stone-300 hover:bg-stone-700 rounded transition-colors z-10"
      >
        New City
      </button>

      {/* Ward tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-20 bg-stone-900/90 text-stone-200 text-xs px-2 py-1 rounded shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
