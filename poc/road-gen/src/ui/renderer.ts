import type { GeneratedWorld } from '../gen/types'

// Colour palette — dark map aesthetic
const COLORS = {
  bg:           '#0f1117',
  ground:       '#1a1e28',
  waterFill:    '#1a2d4a',
  waterEdge:    '#1e4060',
  arterial:     '#f5c842',
  residential:  '#8ab4e8',
  lotFill:      '#1e3020',
  lotEdge:      '#3a6a3a',
  grid:         '#ffffff08',
}

interface RenderOptions {
  showWater:   boolean
  showLots:    boolean
  showGrid:    boolean
  showCostMap: boolean
  zoom:        number
  panX:        number
  panY:        number
}

export function renderWorld(
  canvas: HTMLCanvasElement,
  world: GeneratedWorld | null,
  opts: RenderOptions,
) {
  const ctx = canvas.getContext('2d')!
  const w = canvas.width, h = canvas.height
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, w, h)
  if (!world) return

  const ms    = world.mapSize
  const scale = (Math.min(w, h) / ms) * opts.zoom
  const ox    = w / 2 + opts.panX
  const oy    = h / 2 + opts.panY
  const toScreen = (wx: number, wy: number): [number, number] => [ox + wx * scale, oy + wy * scale]

  // ── Cost map overlay ────────────────────────────────────────────────────────
  if (opts.showCostMap) {
    const g = 128
    const cellPx = (ms / g) * scale
    for (let row = 0; row < g; row++) {
      for (let col = 0; col < g; col++) {
        const cost = world.costMap[row * g + col]
        if (cost <= 1.1) continue
        const wx = (col/(g-1) - 0.5) * ms
        const wy = (row/(g-1) - 0.5) * ms
        const [sx, sy] = toScreen(wx, wy)
        const alpha = Math.min(1, (cost / 1000) * 0.8)
        ctx.fillStyle = cost > 500
          ? `rgba(26,45,74,${alpha})`
          : `rgba(60,80,50,${alpha * 0.5})`
        ctx.fillRect(sx - cellPx/2, sy - cellPx/2, cellPx+1, cellPx+1)
      }
    }
  }

  // ── Ground plate ────────────────────────────────────────────────────────────
  const [tlx, tly] = toScreen(-ms/2, -ms/2)
  const [brx, bry] = toScreen( ms/2,  ms/2)
  ctx.fillStyle = COLORS.ground
  ctx.fillRect(tlx, tly, brx-tlx, bry-tly)

  // ── Grid ────────────────────────────────────────────────────────────────────
  if (opts.showGrid) {
    ctx.strokeStyle = COLORS.grid
    ctx.lineWidth = 1
    const gridStep = ms / 16
    for (let gx = -ms/2; gx <= ms/2+1; gx += gridStep) {
      const [x1, y1] = toScreen(gx, -ms/2), [x2, y2] = toScreen(gx, ms/2)
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    }
    for (let gy = -ms/2; gy <= ms/2+1; gy += gridStep) {
      const [x1, y1] = toScreen(-ms/2, gy), [x2, y2] = toScreen(ms/2, gy)
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    }
  }

  // ── Water — smooth bezier paths ─────────────────────────────────────────────
  if (opts.showWater && world.rivers.length > 0) {
    for (const river of world.rivers) {
      if (river.pts.length < 2) continue
      const isLake = river.pts.length > 20 &&
        river.pts[0].x === river.pts[river.pts.length-1].x  // closed loop
      const lineW = river.width * scale

      if (isLake) {
        // Filled shape
        ctx.beginPath()
        const [x0, y0] = toScreen(river.pts[0].x, river.pts[0].y)
        ctx.moveTo(x0, y0)
        for (let i = 1; i < river.pts.length; i++) {
          const [xi, yi] = toScreen(river.pts[i].x, river.pts[i].y)
          ctx.lineTo(xi, yi)
        }
        ctx.closePath()
        ctx.fillStyle = COLORS.waterFill
        ctx.fill()
        ctx.strokeStyle = COLORS.waterEdge
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else {
        // Thick rounded stroke for river
        ctx.beginPath()
        const [x0, y0] = toScreen(river.pts[0].x, river.pts[0].y)
        ctx.moveTo(x0, y0)
        for (let i = 1; i < river.pts.length; i++) {
          const [xi, yi] = toScreen(river.pts[i].x, river.pts[i].y)
          ctx.lineTo(xi, yi)
        }
        ctx.strokeStyle = COLORS.waterFill
        ctx.lineWidth   = Math.max(2, lineW)
        ctx.lineCap     = 'round'
        ctx.lineJoin    = 'round'
        ctx.stroke()
        // Lighter edge
        ctx.strokeStyle = COLORS.waterEdge
        ctx.lineWidth   = Math.max(1, lineW * 0.25)
        ctx.stroke()
      }
    }
  }

  // ── Lots ────────────────────────────────────────────────────────────────────
  if (opts.showLots) {
    for (const lot of world.lots) {
      if (lot.polygon.length < 3) continue
      ctx.beginPath()
      const [sx0, sy0] = toScreen(lot.polygon[0].x, lot.polygon[0].y)
      ctx.moveTo(sx0, sy0)
      for (let i = 1; i < lot.polygon.length; i++) {
        const [sx, sy] = toScreen(lot.polygon[i].x, lot.polygon[i].y)
        ctx.lineTo(sx, sy)
      }
      ctx.closePath()
      ctx.fillStyle   = COLORS.lotFill
      ctx.fill()
      ctx.strokeStyle = COLORS.lotEdge
      ctx.lineWidth   = 0.5
      ctx.stroke()
    }
  }

  // ── Roads — casing then fill ─────────────────────────────────────────────
  for (const seg of world.segments) {
    const [ax, ay] = toScreen(seg.a.x, seg.a.y)
    const [bx, by] = toScreen(seg.b.x, seg.b.y)
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
    ctx.strokeStyle = '#00000070'
    ctx.lineWidth   = seg.type === 'arterial' ? scale * 6.5 : scale * 3.8
    ctx.lineCap     = 'round'
    ctx.stroke()
  }
  for (const seg of world.segments) {
    const [ax, ay] = toScreen(seg.a.x, seg.a.y)
    const [bx, by] = toScreen(seg.b.x, seg.b.y)
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by)
    ctx.strokeStyle = seg.type === 'arterial' ? COLORS.arterial : COLORS.residential
    ctx.lineWidth   = seg.type === 'arterial' ? scale * 4.5 : scale * 2.2
    ctx.lineCap     = 'round'
    ctx.stroke()
  }

  // ── Bridges — drawn on top of roads and rivers ───────────────────────────
  for (const bridge of world.bridges) {
    const [ax, ay] = toScreen(bridge.a.x, bridge.a.y)
    const [bx, by] = toScreen(bridge.b.x, bridge.b.y)
    const isArterial = bridge.type === 'arterial'
    const halfW = scale * (isArterial ? 3.5 : 2.2)

    // Direction perpendicular to bridge for deck width
    const len = Math.sqrt((bx-ax)**2 + (by-ay)**2) || 1
    const px = -(by-ay)/len, py = (bx-ax)/len  // perpendicular

    // Extend slightly beyond water edge
    const pad = 3
    const ex = (bx-ax)/len*pad, ey = (by-ay)/len*pad

    // Stone/concrete deck — slightly lighter than road
    ctx.beginPath()
    ctx.moveTo(ax-ex + px*halfW*1.3, ay-ey + py*halfW*1.3)
    ctx.lineTo(bx+ex + px*halfW*1.3, by+ey + py*halfW*1.3)
    ctx.lineTo(bx+ex - px*halfW*1.3, by+ey - py*halfW*1.3)
    ctx.lineTo(ax-ex - px*halfW*1.3, ay-ey - py*halfW*1.3)
    ctx.closePath()
    ctx.fillStyle = '#4a4030'
    ctx.fill()

    // Road surface on bridge
    ctx.beginPath(); ctx.moveTo(ax-ex, ay-ey); ctx.lineTo(bx+ex, by+ey)
    ctx.strokeStyle = isArterial ? COLORS.arterial : COLORS.residential
    ctx.lineWidth   = isArterial ? scale * 4.5 : scale * 2.2
    ctx.lineCap     = 'butt'
    ctx.stroke()

    // Railings — thin lines on each side
    for (const side of [1, -1]) {
      ctx.beginPath()
      ctx.moveTo(ax-ex + px*halfW*1.15*side, ay-ey + py*halfW*1.15*side)
      ctx.lineTo(bx+ex + px*halfW*1.15*side, by+ey + py*halfW*1.15*side)
      ctx.strokeStyle = '#8a7a60'
      ctx.lineWidth   = 1.5
      ctx.lineCap     = 'round'
      ctx.stroke()
    }
  }

  // ── Centre dot ──────────────────────────────────────────────────────────────
  const [cx, cy] = toScreen(0, 0)
  ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2)
  ctx.fillStyle = '#ff6b6b'; ctx.fill()

  // ── Stats overlay ───────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(8, 8, 200, 60)
  ctx.fillStyle = '#ffffff99'
  ctx.font = '11px monospace'
  ctx.fillText(`segments: ${world.segments.length}`, 16, 26)
  ctx.fillText(`arterial: ${world.segments.filter(s=>s.type==='arterial').length}`, 16, 40)
  ctx.fillText(`lots: ${world.lots.length}`, 16, 54)
}
