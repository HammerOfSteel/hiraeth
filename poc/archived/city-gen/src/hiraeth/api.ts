// src/hiraeth/api.ts — clean public API callable from the game engine
import { Model } from '../model/model'
import { modelToJson } from '../export/serialiser'
import { type CityJSON } from '../export/cityJsonTypes'
import { generateCityName, generateWardName } from './nameGenerator'

export type CitySize = 'small-town' | 'large-town' | 'small-city' | 'large-city'

const SIZE_TO_PATCHES: Record<CitySize, [number, number]> = {
  'small-town':  [6,  10],
  'large-town':  [10, 15],
  'small-city':  [15, 24],
  'large-city':  [24, 40],
}

function patchesForSize(size: CitySize, seed: number): number {
  const [min, max] = SIZE_TO_PATCHES[size]
  const x = Math.sin(seed * 0.001) * 43758.5453
  const f = x - Math.floor(x)
  return Math.floor(min + f * (max - min))
}

export interface GenerateCityResult {
  json:      CityJSON
  cityName:  string
  wardNames: Record<string, string>  // patchIndex → ward name
}

/**
 * Generate a city and return its JSON + Celtic names.
 * This is the main entry point for the Hiraeth game engine.
 *
 * @param seed    - Deterministic seed (use world-map tile seed)
 * @param size    - City size preset
 */
export function generateCity(seed: number, size: CitySize = 'large-town'): GenerateCityResult {
  const nPatches = patchesForSize(size, seed)
  const model    = new Model({ seed, nPatches }).build()
  const json     = modelToJson(model)

  const cityName  = generateCityName(seed)
  const wardNames: Record<string, string> = {}
  model.patches.forEach((p, i) => {
    if (p.ward) {
      wardNames[String(i)] = generateWardName(p.ward.name, i, seed)
    }
  })

  return { json, cityName, wardNames }
}

/** Parse a deep-link seed from the URL hash (#seed=AABBCC) */
export function seedFromUrl(): number | null {
  const hash = window.location.hash
  const m    = hash.match(/[#&]seed=([0-9a-fA-F]+)/)
  if (!m) return null
  const v = parseInt(m[1], 16)
  return isNaN(v) ? null : v
}

/** Parse size from URL (#size=small-town) */
export function sizeFromUrl(): CitySize | null {
  const hash  = window.location.hash
  const m     = hash.match(/[#&]size=(small-town|large-town|small-city|large-city)/)
  return m ? (m[1] as CitySize) : null
}
