import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { useSceneStore } from '@/store/scene'
import { BLUEPRINTS } from '@/scene/BuildingFactory'
import type { BuildingType, WeatherState } from '@/store/scene'
import type { CityJSON } from '@/city/types'
import { isMFCGJson } from '@/city/types'
import { Sun, Cloud, CloudRain, Globe, Box, Map, Upload, X } from 'lucide-react'

const BUILDING_TYPES = Object.keys(BLUEPRINTS) as BuildingType[]

const WEATHER_OPTIONS: { id: WeatherState; label: string; Icon: typeof Sun }[] = [
  { id: 'clear',    label: 'Clear',    Icon: Sun },
  { id: 'overcast', label: 'Overcast', Icon: Cloud },
  { id: 'rain',     label: 'Rain',     Icon: CloudRain },
]

function formatTime(t: number): string {
  const h = Math.floor(t)
  const m = Math.floor((t - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function getTimeLabel(t: number): string {
  if (t < 5)  return 'Night'
  if (t < 7)  return 'Dawn'
  if (t < 10) return 'Morning'
  if (t < 17) return 'Day'
  if (t < 19) return 'Golden hour'
  if (t < 21) return 'Dusk'
  return 'Night'
}

export function Sidebar() {
  const { timeOfDay, weather, viewMode, selectedAsset, cityData, setTime, setWeather, setViewMode, setSelectedAsset, setCityData } =
    useSceneStore()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleCityFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string)
        if (!isMFCGJson(raw)) throw new Error('Not a valid MFCG export — expected a FeatureCollection with a buildings feature')
        setCityData(raw)
      } catch (err) {
        alert(`Could not load city: ${err}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <aside className="
      flex flex-col gap-5 w-72 h-full
      bg-[#0f1219] border-r border-[#252d3a]
      overflow-y-auto
    ">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-[#252d3a]">
        <h1 className="text-[22px] italic tracking-wide text-[#e8d8b8]" style={{ fontFamily: 'Palatino Linotype, Georgia, serif' }}>
          hiraeth
        </h1>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#5a6a7a] mt-0.5">
          POC A · Three.js + R3F
        </p>
      </div>

      {/* City import panel */}
      <div className="px-4">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#5a6a7a] mb-2">City Map</p>
        {cityData ? (
          <div className="rounded border border-[#2a4a3a] bg-[#0d1f18] p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#60c080]">City loaded ✓</span>
              <button
                onClick={() => setCityData(null)}
                className="text-[#5a6a7a] hover:text-[#c05050] transition-colors"
                title="Unload city"
              >
                <X size={13} />
              </button>
            </div>
            <p className="text-[10px] text-[#4a6a5a]">
              {(cityData.features.find(f => f.id === 'buildings') as {coordinates?: unknown[]})?.coordinates?.length ?? '?'} buildings · v{(cityData.features.find(f => f.id === 'values') as {version?: string})?.version ?? '?'}
            </p>
            <button
              onClick={() => setViewMode('city')}
              className={cn(
                'text-xs py-1 px-2 rounded border transition-all',
                viewMode === 'city'
                  ? 'bg-[#1a3a28] text-[#80e0a0] border-[#2a6040]'
                  : 'text-[#60a070] border-[#2a4a38] hover:bg-[#1a3028]'
              )}
            >
              <Map size={11} className="inline mr-1" />
              View City
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="
              rounded border-2 border-dashed border-[#252d3a] hover:border-[#3a5060]
              p-4 flex flex-col items-center gap-2 cursor-pointer
              text-[#3a4a5a] hover:text-[#6a8a9a] transition-all
            "
          >
            <Upload size={18} />
            <span className="text-[11px] text-center leading-tight">
              Drop MFCG JSON here<br />
              <span className="text-[9px] text-[#2a3a4a]">
                or click to browse
              </span>
            </span>
          </div>
        )}
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleCityFile} />
        <p className="text-[9px] text-[#2a3a48] mt-1.5 leading-tight">
          Generate at <span className="text-[#3a5a6a]">watabou.itch.io/mfcg</span>
          {' '}→ right-click → Save
        </p>
      </div>

      {/* View mode toggle */}
      <div className="px-4 flex gap-2 flex-wrap">
        <button
          onClick={() => setViewMode('world')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all',
            viewMode === 'world'
              ? 'bg-[#2a3a4a] text-[#c8d8e8] border border-[#3a5060]'
              : 'text-[#6a7a8a] hover:text-[#a0b0c0] border border-transparent'
          )}
        >
          <Globe size={13} /> World
        </button>
        <button
          onClick={() => setViewMode('asset')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all',
            viewMode === 'asset'
              ? 'bg-[#2a3a4a] text-[#c8d8e8] border border-[#3a5060]'
              : 'text-[#6a7a8a] hover:text-[#a0b0c0] border border-transparent'
          )}
        >
          <Box size={13} /> Asset View
        </button>
        {cityData && (
          <button
            onClick={() => setViewMode('city')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all',
              viewMode === 'city'
                ? 'bg-[#1a3a28] text-[#80e0a0] border border-[#2a6040]'
                : 'text-[#4a7a5a] hover:text-[#80b890] border border-transparent'
            )}
          >
            <Map size={13} /> City
          </button>
        )}
      </div>

      {/* Time of day */}
      <div className="px-4">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-[11px] uppercase tracking-[0.15em] text-[#5a6a7a]">Time</span>
          <span className="text-[13px] text-[#b8a880] font-mono">
            {formatTime(timeOfDay)} · {getTimeLabel(timeOfDay)}
          </span>
        </div>
        <input
          type="range" min={0} max={24} step={0.25}
          value={timeOfDay}
          onChange={(e) => setTime(Number(e.target.value))}
          className="w-full accent-[#c87a28] h-1 rounded"
        />
        <div className="flex justify-between text-[9px] text-[#3a4a5a] mt-1">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
        </div>
      </div>

      {/* Weather */}
      <div className="px-4">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#5a6a7a] mb-2">Weather</p>
        <div className="flex gap-2">
          {WEATHER_OPTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setWeather(id)}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded flex-1 text-[10px] transition-all',
                weather === id
                  ? 'bg-[#1e3040] text-[#90c0e0] border border-[#2a5070]'
                  : 'text-[#5a6a7a] hover:text-[#8090a0] border border-[#1a2230]'
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Building picker (only in asset view) */}
      <div className="px-4 flex-1">
        <p className="text-[11px] uppercase tracking-[0.15em] text-[#5a6a7a] mb-2">Buildings</p>
        <div className="flex flex-col gap-1">
          {BUILDING_TYPES.map((type) => {
            const bp = BLUEPRINTS[type]
            const isSelected = viewMode === 'asset' && selectedAsset === type
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedAsset(type)
                  if (viewMode !== 'asset') setViewMode('asset')
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded text-left transition-all w-full',
                  isSelected
                    ? 'bg-[#1e3040] border border-[#2a5070]'
                    : 'hover:bg-[#151e2a] border border-transparent'
                )}
              >
                {/* Colour swatch */}
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: bp.wallColor, boxShadow: `0 0 0 1px ${bp.roofColor}` }}
                />
                <span className={cn(
                  'text-[12px] leading-tight',
                  isSelected ? 'text-[#c8d8e8]' : 'text-[#7a8a9a]'
                )}>
                  {bp.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-[#1a2230]">
        <p className="text-[9px] text-[#2a3a4a] uppercase tracking-widest">
          POC evaluation · Stack A
        </p>
      </div>
    </aside>
  )
}
