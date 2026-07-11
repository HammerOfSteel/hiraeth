// src/ui/AppShell.tsx — unified tabbed app shell
import { useState, useEffect, useCallback, useRef } from 'react'
import { useCityContext, SIZE_PRESETS, randomSeed } from './CityContext'
import { PALETTES } from '../render2d/palette'
import { MapView } from './MapView'
import { CityView3D } from '../render3d/CityView3D'
import { modelToJson } from '../export/serialiser'

type Tab = '2d' | '3d'

const WARD_COLOURS: Record<string, string> = {
  Castle:         '#9a8a7a',
  Cathedral:      '#b0a090',
  Patriciate:     '#d4c0a0',
  Administration: '#c8c0a8',
  Military:       '#a8b4b8',
  Merchant:       '#d0b890',
  Craftsmen:      '#c4a880',
  Slum:           '#b09878',
  Gate:           '#a89888',
  GateWard:       '#a89888',
  Park:           '#608840',
  Farm:           '#a8b870',
  Market:         '#e8d898',
}

export function AppShell() {
  const [tab, setTab] = useState<Tab>('2d')
  const {
    model, generating, error, seed,
    presetIdx, setPresetIdx, palette, setPalette, colourMode, setColourMode,
    genMs, regenerate, setSeed,
  } = useCityContext()

  // ── Initial generation ────────────────────────────────────────────────────
  const didInit = useRef(false)
  useEffect(() => {
    if (!didInit.current) { didInit.current = true; regenerate() }
  }, [regenerate])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== document.body && e.target !== document.documentElement) return
      if (e.key === 'Enter')                       setSeed(randomSeed())
      else if (e.key >= '1' && e.key <= '4')       setPresetIdx(parseInt(e.key) - 1)
      else if (e.key.toLowerCase() === 'm')        setTab('2d')
      else if (e.key.toLowerCase() === 'v')        setTab('3d')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSeed, setPresetIdx])

  // ── Export JSON ───────────────────────────────────────────────────────────
  const exportJson = useCallback(() => {
    if (!model) return
    const json = modelToJson(model)
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `city-${model.params.seed.toString(16)}.json`; a.click()
    URL.revokeObjectURL(url)
  }, [model])

  // ── Copy seed ─────────────────────────────────────────────────────────────
  const copySeed = useCallback(() => {
    navigator.clipboard.writeText(seed.toString(16).padStart(6, '0').toUpperCase())
  }, [seed])

  // ── Ward stats ────────────────────────────────────────────────────────────
  const wardCounts = model
    ? model.patches.reduce((acc, p) => {
        const n = p.ward?.name ?? 'unknown'
        acc[n] = (acc[n] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)
    : null

  const palNames = Object.keys(PALETTES)

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-stone-950 text-stone-200">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 px-4 h-12 bg-stone-900 border-b border-stone-800 shrink-0 z-20">
        {/* Title */}
        <span className="font-semibold text-stone-300 text-sm tracking-wide mr-2">
          City Gen
        </span>

        {/* Tab buttons */}
        <div className="flex rounded overflow-hidden border border-stone-700">
          {(['2d','3d'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-medium transition-colors
                ${tab === t ? 'bg-stone-600 text-white' : 'text-stone-400 hover:bg-stone-800'}`}
            >
              {t === '2d' ? '2D Map' : '3D View'}
            </button>
          ))}
        </div>

        {/* Size presets */}
        <div className="flex gap-1 ml-2">
          {SIZE_PRESETS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => { setPresetIdx(i); setSeed(randomSeed()) }}
              className={`px-2 py-1 text-xs rounded transition-colors
                ${presetIdx === i
                  ? 'bg-stone-500 text-white'
                  : 'text-stone-400 hover:bg-stone-800'}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* 2D-only: palette swatches + colour toggle */}
        {tab === '2d' && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {palNames.map(name => {
                const pal = PALETTES[name]
                return (
                  <button
                    key={name}
                    title={pal.name}
                    onClick={() => setPalette(pal)}
                    style={{ background: pal.paper, borderColor: pal.dark }}
                    className={`w-4 h-4 rounded-sm border-2 transition-transform
                      ${palette.name === pal.name ? 'scale-125' : 'hover:scale-110'}`}
                  />
                )
              })}
            </div>
            <button
              onClick={() => setColourMode(!colourMode)}
              className={`text-xs px-2 py-1 rounded transition-colors
                ${colourMode ? 'bg-amber-500 text-stone-900' : 'text-stone-400 hover:bg-stone-800'}`}
            >
              Colour
            </button>
          </div>
        )}

        {/* Regenerate */}
        <button
          onClick={() => setSeed(randomSeed())}
          disabled={generating}
          className="text-xs px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded transition-colors disabled:opacity-40"
        >
          {generating ? 'Generating…' : 'New City'}
        </button>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* View area */}
        <div className="flex-1 relative overflow-hidden">
          {/* Loading overlay */}
          {generating && (
            <div className="absolute inset-0 bg-stone-950/70 z-10 flex items-center justify-center">
              <div className="text-stone-300 text-sm animate-pulse">Generating city…</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 text-xs px-4 py-2 rounded shadow z-20">
              {error}
            </div>
          )}

          {tab === '2d'
            ? <MapView model={model} palette={palette} colourMode={colourMode} />
            : <CityView3D model={model} />
          }
        </div>

        {/* ── Right sidebar ───────────────────────────────────────────────── */}
        <aside className="w-52 shrink-0 bg-stone-900 border-l border-stone-800 flex flex-col overflow-y-auto">

          {/* City stats */}
          <div className="p-3 border-b border-stone-800">
            <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">City</div>
            <div className="text-xs text-stone-300 font-mono">
              <div className="flex justify-between">
                <span>Seed</span>
                <span>{seed.toString(16).padStart(6,'0').toUpperCase()}</span>
              </div>
              {model && (
                <>
                  <div className="flex justify-between mt-1">
                    <span>Patches</span>
                    <span>{model.patches.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Radius</span>
                    <span>{model.cityRadius.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Walls</span>
                    <span>{model.wall ? 'yes' : 'no'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Citadel</span>
                    <span>{model.citadel ? 'yes' : 'no'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Plaza</span>
                    <span>{model.plaza ? 'yes' : 'no'}</span>
                  </div>
                </>
              )}
            </div>
            {genMs > 0 && <div className="text-xs text-stone-600 mt-1">{genMs} ms</div>}
          </div>

          {/* Ward breakdown */}
          {wardCounts && (
            <div className="p-3 border-b border-stone-800">
              <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">Wards</div>
              <div className="flex flex-col gap-0.5">
                {Object.entries(wardCounts).sort((a,b) => b[1]-a[1]).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2 text-xs">
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ background: WARD_COLOURS[name] ?? '#888' }}
                    />
                    <span className="text-stone-300 flex-1 truncate">{name}</span>
                    <span className="text-stone-500 font-mono">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="p-3">
            <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">Export</div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={exportJson}
                disabled={!model}
                className="w-full text-xs px-2 py-1.5 bg-stone-800 hover:bg-stone-700 rounded transition-colors disabled:opacity-40"
              >
                Download JSON
              </button>
              <button
                onClick={copySeed}
                className="w-full text-xs px-2 py-1.5 bg-stone-800 hover:bg-stone-700 rounded transition-colors"
              >
                Copy Seed
              </button>
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="mt-auto p-3 text-xs text-stone-600 border-t border-stone-800">
            <div>Enter = new seed</div>
            <div>1–4 = size preset</div>
            <div>M = 2D · V = 3D</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
