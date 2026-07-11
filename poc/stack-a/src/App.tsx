import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing'
import { useSceneStore } from '@/store/scene'
import { WorldScene, AssetScene } from '@/scene/Scenes'
import { CityScene } from '@/city/CityScene'
import { Sidebar } from '@/ui/Sidebar'

export default function App() {
  const viewMode = useSceneStore((s) => s.viewMode)

  return (
    <div className="flex w-full h-full">
      <Sidebar />

      <main className="flex-1 relative">
        <Canvas
          shadows
          camera={{ fov: 35, near: 0.5, far: 800, position: [80, 60, 80] }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
        >
          {viewMode === 'city'  ? <CityScene /> :
           viewMode === 'world' ? <WorldScene /> :
                                  <AssetScene />}

          <EffectComposer>
            <DepthOfField
              focusDistance={0.01}
              focalLength={0.04}
              bokehScale={1.8}
            />
            <Bloom
              luminanceThreshold={0.55}
              luminanceSmoothing={0.9}
              intensity={0.5}
              mipmapBlur
            />
            <Vignette offset={0.35} darkness={0.55} />
          </EffectComposer>
        </Canvas>

        <TimeBadge />
      </main>
    </div>
  )
}

function TimeBadge() {
  const t = useSceneStore((s) => s.timeOfDay)
  const w = useSceneStore((s) => s.weather)
  const h = Math.floor(t)
  const m = Math.floor((t - h) * 60)
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  const weatherIcon = w === 'clear' ? '☀' : w === 'overcast' ? '☁' : '🌧'

  return (
    <div className="
      absolute bottom-4 right-4
      flex items-center gap-2
      bg-[#0a0d14cc] backdrop-blur-sm
      border border-[#252d3a]
      rounded px-3 py-1.5
      pointer-events-none
    ">
      <span className="text-[18px] leading-none">{weatherIcon}</span>
      <span className="font-mono text-[13px] text-[#c8b888]">{timeStr}</span>
    </div>
  )
}
