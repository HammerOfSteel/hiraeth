/**
 * App — full-screen city generator matching Watabou's UI layout.
 *
 * Layout:
 *   - Map canvas fills the entire window (like the original)
 *   - 4 size preset buttons float top-right
 *   - Palette swatches float below size buttons
 *   - Bottom-right: seed display
 *   - Keyboard: Enter = new random seed, 1-4 = size presets
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { CityModel, type CityData } from '../model/model'
import { renderCity, PALETTES, type Palette } from './renderer'

// ─── City size presets (matching CitySizeButton.hx) ───────────────────────────

const SIZES = [
  { label: 'Small Town', min: 6,  max: 10 },
  { label: 'Large Town', min: 10, max: 15 },
  { label: 'Small City', min: 15, max: 24 },
  { label: 'Large City', min: 24, max: 40 },
]

function pickSize(preset: typeof SIZES[0], rng = Math.random): number {
  return preset.min + Math.floor(rng() * (preset.max - preset.min))
}

// ─── State ────────────────────────────────────────────────────────────────────

interface GenState {
  seed:      number
  nPatches:  number
  sizeLabel: string
}

function initialState(): GenState {
  const preset = SIZES[1]  // Large Town default (like the original)
  return { seed: 682063530, nPatches: pickSize(preset), sizeLabel: preset.label }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state,   setState]   = useState<GenState>(initialState)
  const [palette, setPalette] = useState<Palette>(PALETTES.Default)
  const [timing,  setTiming]  = useState(0)
  const [error,   setError]   = useState<string | null>(null)

  // Resize canvas to window
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current
      if (!c) return
      c.width  = window.innerWidth
      c.height = window.innerHeight
      // Re-render after resize using last city data (stored in ref below)
      doGenerate(state, palette, false)
    }
    window.addEventListener('resize', resize)
    resize()
    return () => window.removeEventListener('resize', resize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, palette])

  // Ref to hold latest city for re-render without regeneration
  const cityRef = useRef<CityData | null>(null)

  const doGenerate = useCallback((s: GenState, pal: Palette, rebuild = true) => {
    setError(null)
    try {
      const t0   = performance.now()
      const city = rebuild ? new CityModel(s).build() : (cityRef.current ?? new CityModel(s).build())
      cityRef.current = city
      setTiming(Math.round(performance.now() - t0))
      const c = canvasRef.current
      if (c) renderCity(c, city, pal)
    } catch (e) {
      setError(String(e))
      console.error(e)
    }
  }, [])

  // First load
  useEffect(() => { doGenerate(state, palette) }, [])  // eslint-disable-line

  // Re-render on palette change (no rebuild)
  useEffect(() => {
    if (cityRef.current && canvasRef.current)
      renderCity(canvasRef.current, cityRef.current, palette)
  }, [palette])

  // Keyboard shortcuts: Enter = new seed, 1-4 = size presets
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const seed = Math.floor(Math.random() * 999999999)
        const ns   = { ...state, seed }
        setState(ns); doGenerate(ns, palette)
      }
      const idx = parseInt(e.key) - 1
      if (idx >= 0 && idx < SIZES.length) {
        const preset = SIZES[idx]
        const ns = { seed: Math.floor(Math.random() * 999999999), nPatches: pickSize(preset), sizeLabel: preset.label }
        setState(ns); doGenerate(ns, palette)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state, palette, doGenerate])

  // Button handlers
  const onSizeClick = (preset: typeof SIZES[0]) => {
    const ns = {
      seed:      Math.floor(Math.random() * 999999999),
      nPatches:  pickSize(preset),
      sizeLabel: preset.label,
    }
    setState(ns); doGenerate(ns, palette)
  }

  // ── UI ──────────────────────────────────────────────────────────────────────
  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding:       '5px 10px',
    background:    active ? palette.dark : palette.medium + 'cc',
    color:         active ? palette.paper : palette.paper,
    border:        `1px solid ${palette.dark}60`,
    cursor:        'pointer',
    fontFamily:    'Georgia, "Times New Roman", serif',
    fontSize:      11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    whiteSpace:    'nowrap' as const,
  })

  const swatchStyle = (name: string): React.CSSProperties => ({
    width:       18,
    height:      18,
    background:  PALETTES[name].dark,
    border:      `2px solid ${palette === PALETTES[name] ? PALETTES[name].dark : 'transparent'}`,
    outline:     palette === PALETTES[name] ? `2px solid ${PALETTES[name].paper}` : 'none',
    cursor:      'pointer',
    boxShadow:   `inset 0 0 0 3px ${PALETTES[name].light}`,
  })

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: palette.paper }}>

      {/* Full-screen canvas */}
      <canvas ref={canvasRef} style={{ display: 'block', position: 'absolute', inset: 0 }} />

      {/* Size buttons — top right (matching original CitySizeButton layout) */}
      <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {SIZES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => onSizeClick(s)}
            style={btnStyle(state.sizeLabel === s.label)}
            title={`Keyboard: ${i + 1}`}
          >
            {s.label}
          </button>
        ))}

        {/* Palette swatches */}
        <div style={{ display: 'flex', gap: 2, marginTop: 8, justifyContent: 'flex-end' }}>
          {Object.keys(PALETTES).map(name => (
            <button
              key={name}
              onClick={() => setPalette(PALETTES[name])}
              style={swatchStyle(name)}
              title={name}
            />
          ))}
        </div>

        {/* Seed display */}
        <div style={{
          marginTop:   6,
          fontSize:    9,
          color:       palette.dark + 'aa',
          fontFamily:  'monospace',
          textAlign:   'right',
          userSelect:  'text',
        }}>
          seed: {state.seed} · {timing}ms
        </div>
      </div>

      {/* Error overlay */}
      {error && (
        <div style={{
          position:     'absolute',
          bottom:       20,
          left:         '50%',
          transform:    'translateX(-50%)',
          background:   '#fff0f0',
          border:       '1px solid #c04040',
          padding:      '8px 14px',
          fontSize:     12,
          color:        '#802020',
          maxWidth:     500,
          borderRadius: 4,
        }}>
          {error}
        </div>
      )}

      {/* Keyboard hint — bottom left, very subtle */}
      <div style={{
        position:   'absolute',
        bottom:     8,
        left:       8,
        fontSize:   9,
        color:      palette.dark + '60',
        fontFamily: 'Georgia, serif',
        letterSpacing: 0.5,
      }}>
        Enter: new map · 1–4: size presets
      </div>
    </div>
  )
}

