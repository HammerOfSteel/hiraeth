import { create } from 'zustand'

export type WeatherState = 'clear' | 'overcast' | 'rain'
export type ViewMode = 'world' | 'asset'

export type BuildingType =
  | 'cottage'
  | 'terraced'
  | 'semi'
  | 'detached'
  | 'bungalow'
  | 'shop'
  | 'pub'
  | 'church'
  | 'civic'
  | 'apartment'

export interface SceneStore {
  timeOfDay: number          // 0–24
  weather: WeatherState
  viewMode: ViewMode
  selectedAsset: BuildingType
  setTime: (t: number) => void
  setWeather: (w: WeatherState) => void
  setViewMode: (v: ViewMode) => void
  setSelectedAsset: (a: BuildingType) => void
}

export const useSceneStore = create<SceneStore>((set) => ({
  timeOfDay: 14,
  weather: 'clear',
  viewMode: 'world',
  selectedAsset: 'cottage',
  setTime: (t) => set({ timeOfDay: t }),
  setWeather: (w) => set({ weather: w }),
  setViewMode: (v) => set({ viewMode: v }),
  setSelectedAsset: (a) => set({ selectedAsset: a }),
}))

/** Derived helpers — call outside React for Three.js use */
export function getSunParams(t: number) {
  // t: 0–24h
  // Returns directional light angle + colour temperature
  const norm = t / 24
  const angle = norm * Math.PI * 2 - Math.PI / 2  // sun arc

  // Sky colour lerp points
  const isNight  = t < 5 || t > 21
  const isDawn   = t >= 5  && t < 7
  const isMorn   = t >= 7  && t < 10
  const isDay    = t >= 10 && t < 17
  const isGolden = t >= 17 && t < 19
  const isDusk   = t >= 19 && t < 21

  let skyTop: [number, number, number]
  let skyBot: [number, number, number]
  let sunColor: [number, number, number]
  let sunIntensity: number
  let ambientIntensity: number

  if (isNight)       { skyTop = [0.03, 0.04, 0.10]; skyBot = [0.05, 0.06, 0.14]; sunColor = [0.3, 0.35, 0.5];  sunIntensity = 0.05; ambientIntensity = 0.08 }
  else if (isDawn)   { skyTop = [0.55, 0.30, 0.20]; skyBot = [0.90, 0.55, 0.30]; sunColor = [1.0, 0.65, 0.35]; sunIntensity = 0.6;  ambientIntensity = 0.35 }
  else if (isMorn)   { skyTop = [0.48, 0.62, 0.82]; skyBot = [0.72, 0.82, 0.95]; sunColor = [1.0, 0.95, 0.80]; sunIntensity = 1.0;  ambientIntensity = 0.50 }
  else if (isDay)    { skyTop = [0.40, 0.58, 0.80]; skyBot = [0.65, 0.78, 0.92]; sunColor = [1.0, 0.98, 0.92]; sunIntensity = 1.2;  ambientIntensity = 0.55 }
  else if (isGolden) { skyTop = [0.60, 0.35, 0.18]; skyBot = [0.90, 0.62, 0.30]; sunColor = [1.0, 0.70, 0.30]; sunIntensity = 0.9;  ambientIntensity = 0.40 }
  else if (isDusk)   { skyTop = [0.18, 0.14, 0.28]; skyBot = [0.50, 0.28, 0.18]; sunColor = [0.8, 0.45, 0.25]; sunIntensity = 0.4;  ambientIntensity = 0.25 }
  else               { skyTop = [0.03, 0.04, 0.10]; skyBot = [0.05, 0.06, 0.14]; sunColor = [0.3, 0.35, 0.5];  sunIntensity = 0.05; ambientIntensity = 0.08 }

  const elevation = Math.sin(angle)
  const azimuth   = Math.cos(angle)

  return { skyTop, skyBot, sunColor, sunIntensity, ambientIntensity, elevation, azimuth, angle }
}
