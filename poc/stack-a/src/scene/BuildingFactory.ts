import * as THREE from 'three'
import type { BuildingType } from '@/store/scene'
import { stoneTexture, brickTexture, renderTexture, slateTexture } from './TextureFactory'

export interface BuildingBlueprint {
  type: BuildingType
  floors: number
  width: number
  depth: number
  wallColor: string
  roofColor: string
  trimColor: string
  doorColor: string
  wallTex: 'stone' | 'brick' | 'render'
  roofStyle: 'pitched' | 'hipped' | 'flat'
  chimneys: number
  hasBayWindow: boolean
  label: string
}

export const BLUEPRINTS: Record<BuildingType, BuildingBlueprint> = {
  cottage: {
    type: 'cottage', floors: 1, width: 7, depth: 6,
    wallColor: '#d8d4c0', roofColor: '#2a3240', trimColor: '#f4f0e8', doorColor: '#2a4a2a',
    wallTex: 'render', roofStyle: 'pitched', chimneys: 2, hasBayWindow: false,
    label: 'Stone Cottage',
  },
  terraced: {
    type: 'terraced', floors: 2, width: 5, depth: 8,
    wallColor: '#c8c0b0', roofColor: '#283040', trimColor: '#f0ece0', doorColor: '#8b1a1a',
    wallTex: 'stone', roofStyle: 'pitched', chimneys: 2, hasBayWindow: false,
    label: 'Terraced House',
  },
  semi: {
    type: 'semi', floors: 2, width: 9, depth: 9,
    wallColor: '#d0c8b0', roofColor: '#2c3444', trimColor: '#f4f0e8', doorColor: '#1a3a6a',
    wallTex: 'render', roofStyle: 'hipped', chimneys: 1, hasBayWindow: true,
    label: 'Semi-Detached',
  },
  detached: {
    type: 'detached', floors: 2, width: 11, depth: 10,
    wallColor: '#d4ccb8', roofColor: '#2a3240', trimColor: '#f4f0e8', doorColor: '#3a2a14',
    wallTex: 'render', roofStyle: 'hipped', chimneys: 2, hasBayWindow: true,
    label: 'Detached House',
  },
  bungalow: {
    type: 'bungalow', floors: 1, width: 12, depth: 8,
    wallColor: '#d8d4c4', roofColor: '#303848', trimColor: '#f4f0e8', doorColor: '#2a4a2a',
    wallTex: 'render', roofStyle: 'pitched', chimneys: 1, hasBayWindow: false,
    label: 'Bungalow',
  },
  shop: {
    type: 'shop', floors: 2, width: 8, depth: 9,
    wallColor: '#c8c4b4', roofColor: '#383838', trimColor: '#e8e8c8', doorColor: '#2a1a0a',
    wallTex: 'render', roofStyle: 'flat', chimneys: 0, hasBayWindow: false,
    label: 'High Street Shop',
  },
  pub: {
    type: 'pub', floors: 2, width: 13, depth: 10,
    wallColor: '#e4e0d0', roofColor: '#283040', trimColor: '#1a2a4a', doorColor: '#1a1a0a',
    wallTex: 'render', roofStyle: 'pitched', chimneys: 2, hasBayWindow: false,
    label: 'The Crown (Pub)',
  },
  church: {
    type: 'church', floors: 3, width: 8, depth: 20,
    wallColor: '#8e8a7c', roofColor: '#1e2428', trimColor: '#b0a890', doorColor: '#2a2010',
    wallTex: 'stone', roofStyle: 'pitched', chimneys: 0, hasBayWindow: false,
    label: 'Parish Church',
  },
  civic: {
    type: 'civic', floors: 3, width: 16, depth: 12,
    wallColor: '#c8c4a8', roofColor: '#303830', trimColor: '#e8e4cc', doorColor: '#1a1a08',
    wallTex: 'stone', roofStyle: 'hipped', chimneys: 0, hasBayWindow: false,
    label: 'Civic Building',
  },
  apartment: {
    type: 'apartment', floors: 4, width: 15, depth: 12,
    wallColor: '#b8b4a8', roofColor: '#383838', trimColor: '#f0ece0', doorColor: '#1a1a18',
    wallTex: 'render', roofStyle: 'flat', chimneys: 0, hasBayWindow: false,
    label: 'Apartment Block',
  },
}

const FLOOR_H = 3.2

function hexCol(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

function wallMat(bp: BuildingBlueprint): THREE.MeshStandardMaterial {
  const wallH = bp.floors * FLOOR_H
  const repX  = Math.max(1, bp.width  / (bp.wallTex === 'stone' ? 2.5 : bp.wallTex === 'brick' ? 2.0 : 3.5))
  const repY  = Math.max(1, wallH     / (bp.wallTex === 'stone' ? 2.5 : bp.wallTex === 'brick' ? 1.6 : 3.5))
  const map   = bp.wallTex === 'stone'  ? stoneTexture(repX, repY)
              : bp.wallTex === 'brick'  ? brickTexture(repX, repY)
              : renderTexture(repX, repY)
  return new THREE.MeshStandardMaterial({
    color: hexCol(bp.wallColor),
    map,
    roughness: 0.92,
    metalness: 0.0,
  })
}

function roofMat(bp: BuildingBlueprint): THREE.MeshStandardMaterial {
  if (bp.roofStyle === 'flat') {
    return new THREE.MeshStandardMaterial({ color: hexCol(bp.roofColor), roughness: 0.95 })
  }
  const roofW = bp.width;   const roofD = bp.depth
  const ridgeH = roofW * 0.55
  const slopeLen = Math.sqrt((roofW / 2) ** 2 + ridgeH ** 2)
  const repX = Math.max(1, roofD  / 1.8)
  const repY = Math.max(1, slopeLen / 1.4)
  return new THREE.MeshStandardMaterial({
    color: hexCol(bp.roofColor),
    map: slateTexture(repX, repY),
    roughness: 0.94,
    metalness: 0.0,
    side: THREE.DoubleSide,   // prevents transparent faces from winding-order issues
  })
}

function trimMat(bp: BuildingBlueprint): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: hexCol(bp.trimColor), roughness: 0.75 })
}

function winMat(lit: boolean): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: lit ? new THREE.Color(0.35, 0.25, 0.08) : new THREE.Color(0.06, 0.08, 0.12),
    roughness: lit ? 0.4 : 0.05,
    metalness: lit ? 0.0 : 0.45,
  })
  if (lit) {
    mat.emissive    = new THREE.Color(0.85, 0.50, 0.08)
    mat.emissiveIntensity = 1.6
  }
  return mat
}

/** Correct pitched gabled roof — ridge runs along X axis */
function pitchedRoof(w: number, d: number): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2, rh = w * 0.55
  // Vertices
  const pos = new Float32Array([
    -hw, 0, -hd,  // 0 front-left
     hw, 0, -hd,  // 1 front-right
     hw, 0,  hd,  // 2 back-right
    -hw, 0,  hd,  // 3 back-left
    -hw, rh, 0,   // 4 left ridge (gable)
     hw, rh, 0,   // 5 right ridge (gable)
  ])
  // CCW winding viewed from outside
  const idx = new Uint16Array([
    // Front slope (0,1,5,4) — faces -Z+Y
    0, 1, 5,  0, 5, 4,
    // Back slope (3,4,5,2) — faces +Z+Y
    3, 5, 4,  3, 2, 5,
    // Left gable (0,3,4) — faces -X
    0, 3, 4,
    // Right gable (1,5,2) — faces +X
    1, 5, 2,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(new THREE.BufferAttribute(idx, 1))
  geo.computeVertexNormals()
  return geo
}

/** Hipped roof — ridge shorter than depth, runs along X */
function hippedRoof(w: number, d: number): THREE.BufferGeometry {
  const hw = w / 2, hd = d / 2
  const rh  = w * 0.50              // ridge height
  const hip = d * 0.30              // hip inset from ends
  const rl  = hd - hip              // half-ridge length

  const pos = new Float32Array([
    -hw, 0, -hd,   // 0 front-left
     hw, 0, -hd,   // 1 front-right
     hw, 0,  hd,   // 2 back-right
    -hw, 0,  hd,   // 3 back-left
    -hw, rh,-rl,   // 4 left-front ridge
     hw, rh,-rl,   // 5 right-front ridge
     hw, rh, rl,   // 6 right-back ridge
    -hw, rh, rl,   // 7 left-back ridge
  ])
  const idx = new Uint16Array([
    // Front hip: 0,1,5,4
    0,1,5,  0,5,4,
    // Back hip: 3,7,6,2
    3,7,6,  3,6,2,
    // Left hip triangle: 0,4,7,3
    0,4,7,  0,7,3,
    // Right hip triangle: 1,2,6,5
    1,2,6,  1,6,5,
    // Ridge top: 4,5,6,7
    4,5,6,  4,6,7,
  ])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(new THREE.BufferAttribute(idx, 1))
  geo.computeVertexNormals()
  return geo
}

/**
 * Place a window centred at (x, y, z), rotated rotY around Y.
 * rotY=0 → window faces +Z (front wall).
 * rotY=Math.PI → window faces -Z (back wall).
 */
function addWindow(
  group: THREE.Group,
  x: number, y: number, z: number,
  rotY: number,
  lit: boolean,
  tMat: THREE.MeshStandardMaterial,
  winW: number, winH: number,
) {
  const depth = 0.12
  // Frame (slightly larger than opening)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(winW + 0.18, winH + 0.18, depth),
    tMat,
  )
  // Glass pane
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(winW, winH, depth * 0.55),
    lit ? winMat(true) : winMat(false),
  )
  // Horizontal glazing bar at midpoint
  const hBar = new THREE.Mesh(
    new THREE.BoxGeometry(winW + 0.04, 0.08, depth * 0.7),
    tMat,
  )

  for (const m of [frame, glass, hBar]) {
    m.position.set(x, y, z)
    m.rotation.y = rotY
    m.castShadow = false
  }

  group.add(frame, glass, hBar)
}

export function buildBuilding(bp: BuildingBlueprint, windowsLit: boolean): THREE.Group {
  const group = new THREE.Group()
  const wMat  = wallMat(bp)
  const rMat  = roofMat(bp)
  const tMat  = trimMat(bp)
  const wallH = bp.floors * FLOOR_H
  const w = bp.width, d = bp.depth
  const plinthH = 0.35

  // ── Plinth ────────────────────────────────────────────────────────
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.5, plinthH, d + 0.5),
    new THREE.MeshStandardMaterial({ color: new THREE.Color('#6a6458'), roughness: 0.95 })
  )
  plinth.position.set(0, plinthH / 2, 0)
  plinth.receiveShadow = true
  group.add(plinth)

  // ── Walls ─────────────────────────────────────────────────────────
  // Build as 4 separate panels so each has its own UV space → texture scales correctly
  const yMid = plinthH + wallH / 2

  // Front panel
  const front = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.28), wMat)
  front.position.set(0, yMid, d / 2 - 0.14)
  front.castShadow = true; front.receiveShadow = true
  group.add(front)

  // Back panel
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, 0.28), wMat.clone())
  back.position.set(0, yMid, -d / 2 + 0.14)
  back.castShadow = true; back.receiveShadow = true
  group.add(back)

  // Left panel
  const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH, d - 0.28), wMat.clone())
  leftW.position.set(-w / 2 + 0.14, yMid, 0)
  leftW.castShadow = true; leftW.receiveShadow = true
  group.add(leftW)

  // Right panel
  const rightW = new THREE.Mesh(new THREE.BoxGeometry(0.28, wallH, d - 0.28), wMat.clone())
  rightW.position.set(w / 2 - 0.14, yMid, 0)
  rightW.castShadow = true; rightW.receiveShadow = true
  group.add(rightW)

  // Solid interior fill (for casting shadow volume)
  const core = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.5, wallH, d - 0.5),
    new THREE.MeshStandardMaterial({ color: hexCol(bp.wallColor), roughness: 0.95 })
  )
  core.position.set(0, yMid, 0)
  core.castShadow = true; core.receiveShadow = true
  group.add(core)

  // ── Roof ──────────────────────────────────────────────────────────
  const roofY = plinthH + wallH
  if (bp.roofStyle !== 'flat') {
    const rGeo  = bp.roofStyle === 'pitched' ? pitchedRoof(w, d) : hippedRoof(w, d)
    const rMesh = new THREE.Mesh(rGeo, rMat)
    rMesh.position.set(0, roofY, 0)
    rMesh.castShadow = true
    group.add(rMesh)

    // Eave trim
    const eave = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.5, 0.22, d + 0.5),
      tMat
    )
    eave.position.set(0, roofY + 0.1, 0)
    eave.castShadow = true
    group.add(eave)
  } else {
    // Parapet for flat roof
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.25, 0.55, d + 0.25),
      new THREE.MeshStandardMaterial({ color: hexCol(bp.wallColor), roughness: 0.9 })
    )
    parapet.position.set(0, roofY + 0.28, 0)
    parapet.castShadow = true
    group.add(parapet)
  }

  // ── Chimneys ──────────────────────────────────────────────────────
  const ridgeH = w * 0.55
  const chimsY = roofY + ridgeH * 0.4
  const chimMat = new THREE.MeshStandardMaterial({ color: new THREE.Color('#4a3828'), roughness: 0.92 })
  const potMat  = new THREE.MeshStandardMaterial({ color: new THREE.Color('#3a2818'), roughness: 0.95 })

  for (let i = 0; i < bp.chimneys; i++) {
    const cx = (i === 0 ? -1 : 1) * (w * 0.26)
    const chiH = FLOOR_H * 0.55
    const chi = new THREE.Mesh(new THREE.BoxGeometry(0.75, chiH, 0.75), chimMat)
    chi.position.set(cx, chimsY + chiH / 2, 0)
    chi.castShadow = true
    group.add(chi)
    // Pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 0.45, 6), potMat)
    pot.position.set(cx, chimsY + chiH + 0.22, 0)
    group.add(pot)
    // Corbels (decorative ledge at top of chimney)
    const corbel = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), chimMat)
    corbel.position.set(cx, chimsY + chiH - 0.07, 0)
    group.add(corbel)
  }

  // ── Windows ────────────────────────────────────────────────────────
  const isShop   = bp.type === 'shop'
  const isChurch = bp.type === 'church'
  // Position windows just proud of the outer wall face (wall outer face = ±d/2)
  const frontZ = d / 2 + 0.04
  const backZ  = -(d / 2 + 0.04)

  if (isShop) {
    // ── Shop: large display windows flanking the door, no centre overlap ──
    const dispW  = (w - 3.8) / 2   // each window fills half the frontage minus door gap
    const dispH  = FLOOR_H * 0.72
    const dispY  = plinthH + FLOOR_H * 0.48
    const dispX  = w * 0.26         // offset from centreline
    // Left display window
    addWindow(group, -dispX, dispY, frontZ, 0, windowsLit && Math.random() > 0.2, tMat, Math.max(1.2, dispW), dispH)
    // Right display window
    addWindow(group, +dispX, dispY, frontZ, 0, windowsLit && Math.random() > 0.2, tMat, Math.max(1.2, dispW), dispH)
    // Upper floor: normal windows
    for (let fl = 1; fl < bp.floors; fl++) {
      const wy = plinthH + fl * FLOOR_H + FLOOR_H * 0.60
      const n  = Math.max(1, Math.floor((w - 2.0) / 3.0))
      for (let wi = 0; wi < n; wi++) {
        const wx = (wi - (n - 1) / 2) * 3.0
        addWindow(group, wx, wy, frontZ,  0,          windowsLit && Math.random() > 0.4, tMat, 1.0, 1.1)
        addWindow(group, wx, wy, backZ,   Math.PI,    windowsLit && Math.random() > 0.4, tMat, 1.0, 1.1)
      }
    }
  } else {
    // ── All other buildings ──────────────────────────────────────────
    const winW  = isChurch ? 0.85 : 1.05
    const winH  = isChurch ? 1.85 : 1.15
    const pitch = isChurch ? 3.5 : 3.0
    const n     = Math.max(1, Math.floor((w - 2.0) / pitch))

    for (let fl = 0; fl < bp.floors; fl++) {
      const wy = plinthH + fl * FLOOR_H + FLOOR_H * 0.60
      for (let wi = 0; wi < n; wi++) {
        const wx = (wi - (n - 1) / 2) * pitch
        // Leave gap at centreline on ground floor for door
        if (fl === 0 && Math.abs(wx) < 0.9) continue
        const lit = windowsLit && Math.random() > 0.35
        addWindow(group, wx, wy, frontZ,  0,        lit, tMat, winW, winH)
        addWindow(group, wx, wy, backZ,   Math.PI,  lit, tMat, winW, winH)
      }
    }
  }

  // ── Front door ────────────────────────────────────────────────────
  const doorW = bp.type === 'pub' ? 1.4 : 1.0
  const doorH = bp.type === 'pub' ? 2.4 : 2.2
  const doorOffX = bp.type === 'cottage' ? -w * 0.18 : 0

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.12),
    new THREE.MeshStandardMaterial({ color: hexCol(bp.doorColor), roughness: 0.7 })
  )
  door.position.set(doorOffX, plinthH + doorH / 2, d / 2 + 0.16)
  group.add(door)

  const surround = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.22, doorH + 0.26, 0.08),
    tMat
  )
  surround.position.set(doorOffX, plinthH + doorH / 2 + 0.06, d / 2 + 0.18)
  group.add(surround)

  // ── Bay window ────────────────────────────────────────────────────
  if (bp.hasBayWindow) {
    const bayW = 2.4, bayD = 0.9, bayH = FLOOR_H * 0.85
    const bayY = plinthH + FLOOR_H * 0.08
    const bayX = -w * 0.22

    const bayBody = new THREE.Mesh(
      new THREE.BoxGeometry(bayW, bayH, bayD),
      wMat.clone()
    )
    bayBody.position.set(bayX, bayY + bayH / 2, d / 2 + bayD / 2)
    bayBody.castShadow = true
    group.add(bayBody)

    // Bay glass
    const bayGlass = new THREE.Mesh(
      new THREE.BoxGeometry(bayW - 0.3, bayH * 0.62, 0.07),
      winMat(windowsLit && Math.random() > 0.3)
    )
    bayGlass.position.set(bayX, bayY + bayH * 0.52, d / 2 + bayD + 0.04)
    group.add(bayGlass)

    // Bay roof cap
    const bayCap = new THREE.Mesh(
      new THREE.BoxGeometry(bayW + 0.2, 0.2, bayD + 0.2),
      tMat
    )
    bayCap.position.set(bayX, bayY + bayH + 0.1, d / 2 + bayD / 2)
    group.add(bayCap)
  }

  // ── Church tower (special) ────────────────────────────────────────
  if (bp.type === 'church') {
    const towerW = 4.5, towerD = 4.5, towerH = wallH * 1.6
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(towerW, towerH, towerD),
      wMat.clone()
    )
    tower.position.set(-w / 2 + towerW / 2, plinthH + towerH / 2, 0)
    tower.castShadow = true; tower.receiveShadow = true
    group.add(tower)

    // Tower battlements
    for (let i = 0; i < 4; i++) {
      const bx = (i % 2 === 0 ? -1 : 1) * (towerW * 0.3)
      const bm = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.8, towerD + 0.3),
        new THREE.MeshStandardMaterial({ color: hexCol(bp.wallColor), roughness: 0.95 })
      )
      bm.position.set(-w / 2 + towerW / 2 + bx, plinthH + towerH + 0.4, 0)
      group.add(bm)
    }
  }

  return group
}
