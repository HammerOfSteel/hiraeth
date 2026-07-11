import React, { useEffect, useRef, useState, useCallback } from 'react'
import { CityModel, type CityData } from '../model/model'
import { renderCity } from './renderer'

const CANVAS_SIZE = 800

interface Params {
  seed:     number
  nPatches: number
}

function buildCity(params: Params): CityData {
  const model = new CityModel(params)
  return model.build()
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [params, setParams] = useState<Params>({ seed: 42, nPatches: 15 })
  const [error,  setError]  = useState<string | null>(null)
  const [timing, setTiming] = useState<number>(0)

  const generate = useCallback((p: Params) => {
    setError(null)
    const t0 = performance.now()
    try {
      const city = buildCity(p)
      setTiming(Math.round(performance.now() - t0))
      if (canvasRef.current) renderCity(canvasRef.current, city)
    } catch (e) {
      setError(String(e))
      console.error(e)
    }
  }, [])

  useEffect(() => { generate(params) }, [])

  const handleSeed = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = { ...params, seed: Number(e.target.value) }
    setParams(v); generate(v)
  }

  const handlePatches = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = { ...params, nPatches: Number(e.target.value) }
    setParams(v); generate(v)
  }

  const handleRandomSeed = () => {
    const v = { ...params, seed: Math.floor(Math.random() * 99999) }
    setParams(v); generate(v)
  }

  return (
    <div style={{ display: 'flex', gap: 24, padding: 24, background: '#0f0f18', minHeight: '100vh', color: '#d0c090', fontFamily: 'monospace' }}>

      {/* Controls */}
      <div style={{ width: 220, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: '#f0d070' }}>Hiraeth — City Gen</h2>
        <p style={{ margin: 0, fontSize: 11, color: '#807050' }}>Port of Watabou's Medieval Fantasy City Generator</p>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12 }}>Seed: {params.seed}</span>
          <input type="range" min={0} max={99999} value={params.seed} onChange={handleSeed}
            style={{ accentColor: '#c0a040' }} />
          <button onClick={handleRandomSeed}
            style={{ padding: '4px 8px', background: '#302010', border: '1px solid #605030', color: '#d0b060', cursor: 'pointer', borderRadius: 3 }}>
            Random
          </button>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12 }}>Patches: {params.nPatches}</span>
          <input type="range" min={4} max={40} value={params.nPatches} onChange={handlePatches}
            style={{ accentColor: '#c0a040' }} />
          <div style={{ fontSize: 10, color: '#807050' }}>4=hamlet · 15=town · 40=city</div>
        </label>

        <div style={{ fontSize: 12, color: '#806040' }}>Generate: {timing}ms</div>

        {error && (
          <div style={{ fontSize: 11, color: '#e06060', background: '#300', padding: 8, borderRadius: 4, wordBreak: 'break-all' }}>
            {error}
          </div>
        )}

        <div style={{ fontSize: 11, color: '#504030', marginTop: 'auto' }}>
          Based on Watabou's TownGeneratorOS (GPL-3.0)
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ border: '1px solid #302010', borderRadius: 4 }}
      />
    </div>
  )
}
