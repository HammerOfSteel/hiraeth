// src/ui/CityContext.tsx — shared city state between 2D and 3D views
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Model } from '../model/model'
import { PALETTES, type Palette } from '../render2d/palette'
import { seedFromUrl, sizeFromUrl } from '../hiraeth/api'

export interface SizePreset { label: string; min: number; max: number }

export const SIZE_PRESETS: SizePreset[] = [
  { label: 'Small Town',  min: 6,  max: 10 },
  { label: 'Large Town',  min: 10, max: 15 },
  { label: 'Small City',  min: 15, max: 24 },
  { label: 'Large City',  min: 24, max: 40 },
]

function randomSeed(): number {
  return seedFromUrl() ?? Math.floor(Math.random() * 0xFFFFFF)
}

function initialPreset(): number {
  const s = sizeFromUrl()
  if (s === 'small-town')  return 0
  if (s === 'large-town')  return 1
  if (s === 'small-city')  return 2
  if (s === 'large-city')  return 3
  return 1
}

function patchesForPreset(p: SizePreset): number {
  return Math.floor(p.min + Math.random() * (p.max - p.min))
}

interface CityContextValue {
  model:      Model | null
  generating: boolean
  error:      string | null
  seed:       number
  presetIdx:  number
  palette:    Palette
  colourMode: boolean
  genMs:      number

  setSeed:       (s: number) => void
  setPresetIdx:  (i: number) => void
  setPalette:    (p: Palette) => void
  setColourMode: (v: boolean) => void
  regenerate:    (s?: number, presetIdx?: number) => void
}

const Ctx = createContext<CityContextValue | null>(null)

export function CityProvider({ children }: { children: ReactNode }) {
  const [model,      setModel]      = useState<Model | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [seed,       setSeedState]  = useState(randomSeed)
  const [presetIdx,  setPresetIdx]  = useState(initialPreset)
  const [palette,    setPalette]    = useState<Palette>(PALETTES.Default)
  const [colourMode, setColourMode] = useState(false)
  const [genMs,      setGenMs]      = useState(0)

  const regenerate = useCallback((s?: number, pi?: number) => {
    const finalSeed   = s  ?? seed
    const finalPreset = pi ?? presetIdx
    const n = patchesForPreset(SIZE_PRESETS[finalPreset])

    setGenerating(true)
    setError(null)

    // Use setTimeout to let React render the loading state before blocking
    setTimeout(() => {
      const t0 = performance.now()
      try {
        const m = new Model({ seed: finalSeed, nPatches: n }).build()
        setModel(m)
        setGenMs(Math.round(performance.now() - t0))
      } catch (e) {
        setError(`Generation failed (seed ${finalSeed}): ${e}`)
      } finally {
        setGenerating(false)
      }
    }, 0)
  }, [seed, presetIdx])

  const setSeed = useCallback((s: number) => {
    setSeedState(s)
    regenerate(s, presetIdx)
  }, [presetIdx, regenerate])

  const handleSetPreset = useCallback((i: number) => {
    setPresetIdx(i)
    regenerate(seed, i)
  }, [seed, regenerate])

  return (
    <Ctx.Provider value={{
      model, generating, error, seed, presetIdx, palette, colourMode, genMs,
      setSeed, setPresetIdx: handleSetPreset, setPalette, setColourMode, regenerate,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCityContext(): CityContextValue {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCityContext must be used inside CityProvider')
  return ctx
}

export { randomSeed, patchesForPreset }
