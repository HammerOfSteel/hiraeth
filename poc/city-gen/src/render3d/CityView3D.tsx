// src/render3d/CityView3D.tsx — Three.js 3D city viewer React component
import { useRef, useEffect, useState, useCallback } from 'react'
import type { Model } from '../model/model'
import { modelToJson } from '../export/serialiser'
import { jsonToRenderData, type RenderData } from '../export/deserialiser'
import { createScene } from './scene'
import { buildGround } from './ground'
import { buildBuildings } from './buildings'
import { buildWalls } from './wall'
import { buildTrees } from './trees'
import { LIGHT_PRESETS, applyLightPreset, type LightPreset } from './lighting'
import * as THREE from 'three'

export interface CityView3DProps {
  model: Model | null
}

export function CityView3D({ model }: CityView3DProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const sceneRef       = useRef<ReturnType<typeof createScene> | null>(null)
  const groupsRef      = useRef<THREE.Group[]>([])
  const [preset, setPreset]   = useState(0)
  const [showTrees, setShowTrees] = useState(true)
  const [renderData, setRenderData] = useState<RenderData | null>(null)

  // ── Scene lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setup = createScene(canvas)
    sceneRef.current = setup
    applyLightPreset(setup.scene, LIGHT_PRESETS[preset])
    return () => setup.dispose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Rebuild 3D city when model changes ──────────────────────────────────
  useEffect(() => {
    const setup = sceneRef.current
    if (!setup || !model) return

    // Remove old geometry groups
    for (const g of groupsRef.current) setup.scene.remove(g)
    groupsRef.current = []

    const json = modelToJson(model)
    const data = jsonToRenderData(json)
    setRenderData(data)

    const groups = [
      buildGround(data, setup.scene),
      buildBuildings(data, setup.scene),
      buildWalls(data, setup.scene),
      ...(showTrees ? [buildTrees(data, setup.scene)] : []),
    ]
    groupsRef.current = groups

    // Frame the city
    const r = data.cityRadius
    setup.camera.position.set(0, r * 1.4, r * 1.8)
    setup.camera.lookAt(0, 0, 0)
    setup.controls.target.set(0, 0, 0)
    setup.controls.update()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model])

  // ── Re-apply lighting preset ─────────────────────────────────────────────
  useEffect(() => {
    if (sceneRef.current) applyLightPreset(sceneRef.current.scene, LIGHT_PRESETS[preset])
  }, [preset])

  // ── Rebuild trees when toggle changes ────────────────────────────────────
  const toggleTrees = useCallback(() => setShowTrees(t => !t), [])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== document.body && e.target !== document.documentElement) return
      if (e.key >= '5' && e.key <= '0'.padStart(1,'0')) {
        const idx = parseInt(e.key) - 5
        if (idx >= 0 && idx < LIGHT_PRESETS.length) setPreset(idx)
      }
      if (e.key.toLowerCase() === 't') toggleTrees()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleTrees])

  return (
    <div className="relative w-full h-full bg-stone-800">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {!model && (
        <div className="absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
          Generate a city in the 2D view first
        </div>
      )}

      {/* Lighting presets */}
      <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
        {LIGHT_PRESETS.map((lp: LightPreset, i) => (
          <button
            key={lp.name}
            onClick={() => setPreset(i)}
            className={`px-3 py-1 text-xs rounded transition-colors
              ${preset === i
                ? 'bg-stone-200 text-stone-900'
                : 'bg-stone-800/70 text-stone-300 hover:bg-stone-700/70'
              }`}
          >
            {lp.name}
          </button>
        ))}

        <button
          onClick={toggleTrees}
          className={`mt-1 text-xs px-2 py-1 rounded transition-colors
            ${showTrees ? 'bg-green-700 text-green-100' : 'bg-stone-800/70 text-stone-400'}`}
        >
          Trees
        </button>
      </div>

      {/* Bottom info */}
      {renderData && (
        <div className="absolute bottom-4 right-4 text-xs text-stone-400/70 font-mono z-10 text-right">
          <div>{renderData.buildings.length} buildings</div>
          <div>{renderData.wards.length} wards</div>
          <div className="mt-1 text-stone-500/50">5–0 = style · T = trees</div>
        </div>
      )}
    </div>
  )
}
