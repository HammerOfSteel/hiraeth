// src/ui/MapView.tsx — 2D canvas renderer (props-driven from AppShell)
import { useRef, useEffect, useCallback, useState } from 'react'
import { type Model } from '../model/model'
import { Renderer2D } from '../render2d/renderer2d'
import { type Palette } from '../render2d/palette'
import { Pt } from '../geom/pt'
import { polyHitTest } from '../geom/polygon'

export interface MapViewProps {
  model:      Model | null
  palette:    Palette
  colourMode: boolean
}

export function MapView({ model, palette, colourMode }: MapViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scaleRef  = useRef(1)
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !model) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio
    const cssW = canvas.width / dpr, cssH = canvas.height / dpr
    scaleRef.current = Math.min(cssW, cssH) / (model.cityRadius * 2) * 0.9
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
    new Renderer2D(ctx, { palette, colourMode }).render(model)
  }, [model, palette, colourMode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
      render()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { render() }, [render])

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !model) return
    const rect  = canvas.getBoundingClientRect()
    const dpr   = window.devicePixelRatio
    const cssW  = canvas.width / dpr, cssH = canvas.height / dpr
    const scale = scaleRef.current
    const wx    = (e.clientX - rect.left - cssW / 2) / scale
    const wy    = (e.clientY - rect.top  - cssH / 2) / scale
    const hit   = model.patches.find(p => polyHitTest(p.shape, new Pt(wx, wy)))
    if (hit?.ward) {
      setTooltip({ text: hit.ward.getLabel() ?? hit.ward.name, x: e.clientX + 12, y: e.clientY - 8 })
    } else {
      setTooltip(null)
    }
  }, [model])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {!model && (
        <div className="absolute inset-0 flex items-center justify-center text-stone-500 text-sm pointer-events-none">
          Generating…
        </div>
      )}
      {tooltip && (
        <div
          className="fixed pointer-events-none z-50 bg-stone-900/90 text-stone-200 text-xs px-2 py-1 rounded shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
