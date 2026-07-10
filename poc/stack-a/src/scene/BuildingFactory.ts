import * as THREE from 'three'
import type { BuildingType } from '@/store/scene'

export interface BuildingBlueprint {
  type: BuildingType
  floors: number
  width: number
  depth: number
  wallColor: string
  roofColor: string
  trimColor: string
  roofStyle: 'pitched' | 'hipped' | 'flat'
  chimneys: number
  hasBayWindow: boolean
  hasDormer: boolean
  label: string
}

export const BLUEPRINTS: Record<BuildingType, BuildingBlueprint> = {
  cottage: {
    type: 'cottage', floors: 1, width: 6, depth: 7,
    wallColor: '#c8bfb0', roofColor: '#4a3728', trimColor: '#6b5240',
    roofStyle: 'pitched', chimneys: 2, hasBayWindow: false, hasDormer: false,
    label: 'Stone Cottage',
  },
  terraced: {
    type: 'terraced', floors: 2, width: 5, depth: 8,
    wallColor: '#b85c38', roofColor: '#2c1f14', trimColor: '#f0ebe0',
    roofStyle: 'pitched', chimneys: 2, hasBayWindow: false, hasDormer: false,
    label: 'Terraced House',
  },
  semi: {
    type: 'semi', floors: 2, width: 8, depth: 9,
    wallColor: '#c4a882', roofColor: '#3a2c1e', trimColor: '#f0ebe0',
    roofStyle: 'pitched', chimneys: 1, hasBayWindow: true, hasDormer: false,
    label: 'Semi-Detached',
  },
  detached: {
    type: 'detached', floors: 2, width: 10, depth: 10,
    wallColor: '#d4c9b0', roofColor: '#44332a', trimColor: '#f0ebe0',
    roofStyle: 'hipped', chimneys: 2, hasBayWindow: true, hasDormer: false,
    label: 'Detached House',
  },
  bungalow: {
    type: 'bungalow', floors: 1, width: 11, depth: 9,
    wallColor: '#d8d0c0', roofColor: '#5c4030', trimColor: '#f0ebe0',
    roofStyle: 'pitched', chimneys: 1, hasBayWindow: false, hasDormer: true,
    label: 'Bungalow',
  },
  shop: {
    type: 'shop', floors: 2, width: 8, depth: 9,
    wallColor: '#c8c0b0', roofColor: '#303030', trimColor: '#e8d890',
    roofStyle: 'flat', chimneys: 0, hasBayWindow: false, hasDormer: false,
    label: 'High Street Shop',
  },
  pub: {
    type: 'pub', floors: 2, width: 12, depth: 10,
    wallColor: '#8b6914', roofColor: '#2c1f0e', trimColor: '#f5e880',
    roofStyle: 'pitched', chimneys: 2, hasBayWindow: false, hasDormer: false,
    label: 'The Crown (Pub)',
  },
  church: {
    type: 'church', floors: 3, width: 9, depth: 18,
    wallColor: '#9e9480', roofColor: '#2a2828', trimColor: '#c8c0a8',
    roofStyle: 'pitched', chimneys: 0, hasBayWindow: false, hasDormer: false,
    label: 'Parish Church',
  },
  civic: {
    type: 'civic', floors: 3, width: 14, depth: 12,
    wallColor: '#c0b898', roofColor: '#484038', trimColor: '#e8e0c8',
    roofStyle: 'hipped', chimneys: 0, hasBayWindow: false, hasDormer: false,
    label: 'Civic Building',
  },
  apartment: {
    type: 'apartment', floors: 4, width: 14, depth: 11,
    wallColor: '#b8b0a4', roofColor: '#383838', trimColor: '#f0ebe0',
    roofStyle: 'flat', chimneys: 0, hasBayWindow: false, hasDormer: false,
    label: 'Apartment Block',
  },
}

const FLOOR_H = 3.0
const ROOF_PITCH = 0.55  // roof height as fraction of width

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex)
}

function makeMat(hex: string, roughness = 0.88, metalness = 0.0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: hexToRgb(hex),
    roughness,
    metalness,
  })
}

function makeWindowMat(emissive: boolean): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: emissive ? new THREE.Color(0.4, 0.28, 0.10) : new THREE.Color(0.08, 0.10, 0.14),
    roughness: 0.1,
    metalness: 0.3,
  })
  if (emissive) {
    mat.emissive = new THREE.Color(0.9, 0.55, 0.10)
    mat.emissiveIntensity = 1.8
  }
  return mat
}

/** Build a full building group from a blueprint */
export function buildBuilding(bp: BuildingBlueprint, windowsLit: boolean): THREE.Group {
  const group = new THREE.Group()
  const wallH = bp.floors * FLOOR_H
  const w = bp.width
  const d = bp.depth

  const wallMat = makeMat(bp.wallColor)
  const roofMat = makeMat(bp.roofColor, 0.95)
  const trimMat = makeMat(bp.trimColor, 0.70)
  const winMat  = makeWindowMat(windowsLit)
  const glassMat = makeWindowMat(false)

  // ── Foundation plinth ──────────────────────────────────────────────
  const plinthGeo = new THREE.BoxGeometry(w + 0.4, 0.4, d + 0.4)
  const plinth = new THREE.Mesh(plinthGeo, makeMat('#7a7060', 0.95))
  plinth.position.set(0, 0.2, 0)
  plinth.castShadow = true
  plinth.receiveShadow = true
  group.add(plinth)

  // ── Main walls ─────────────────────────────────────────────────────
  const bodyGeo = new THREE.BoxGeometry(w, wallH, d)
  const body = new THREE.Mesh(bodyGeo, wallMat)
  body.position.set(0, 0.4 + wallH / 2, 0)
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)

  // ── Roof ───────────────────────────────────────────────────────────
  const roofY = 0.4 + wallH
  if (bp.roofStyle === 'pitched' || bp.roofStyle === 'hipped') {
    const ridgeH = w * ROOF_PITCH
    const roofGeo = new THREE.BufferGeometry()

    if (bp.roofStyle === 'pitched') {
      // Simple gabled pitched roof
      const hw = w / 2; const hd = d / 2; const rh = ridgeH
      const verts = new Float32Array([
        // Front face
        -hw, 0, -hd,   hw, 0, -hd,   0, rh, -hd,
        // Back face
        hw, 0, hd,  -hw, 0, hd,   0, rh, hd,
        // Left slope
        -hw, 0, -hd,  0, rh, -hd,  0, rh, hd,  -hw, 0, hd,
        // Right slope
        hw, 0, -hd,  hw, 0, hd,   0, rh, hd,   0, rh, -hd,
        // Gable left
        -hw, 0, -hd, -hw, 0, hd,  0, rh, hd,   0, rh, -hd,
        // Gable right
        hw, 0, -hd,   0, rh, -hd, 0, rh, hd,   hw, 0, hd,
      ])
      const idx = new Uint16Array([
        0,1,2,   3,4,5,
        6,7,8,  6,8,9,
        10,11,12,  10,12,13,
        14,15,16,  14,16,17,
        18,19,20,  18,20,21,
      ])
      roofGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
      roofGeo.setIndex(new THREE.BufferAttribute(idx, 1))
      roofGeo.computeVertexNormals()
    } else {
      // Hipped roof
      const hw = w / 2; const hd = d / 2; const rh = ridgeH; const rl = d * 0.3
      const verts = new Float32Array([
        // Front hip
        -hw, 0, -hd,  hw, 0, -hd,  rl, rh, -hd * 0.3,  -rl, rh, -hd * 0.3,
        // Back hip
        hw, 0, hd,   -hw, 0, hd,  -rl, rh, hd * 0.3,    rl, rh, hd * 0.3,
        // Left slope
        -hw, 0, -hd, -hw, 0, hd,  -rl, rh, hd * 0.3,   -rl, rh, -hd * 0.3,
        // Right slope
        hw, 0, -hd,  rl, rh, -hd * 0.3, rl, rh, hd * 0.3,  hw, 0, hd,
        // Ridge top
        -rl, rh, -hd * 0.3,  rl, rh, -hd * 0.3,  rl, rh, hd * 0.3,  -rl, rh, hd * 0.3,
      ])
      const idx = new Uint16Array([
        0,1,2,  0,2,3,
        4,5,6,  4,6,7,
        8,9,10,  8,10,11,
        12,13,14,  12,14,15,
        16,17,18,  16,18,19,
      ])
      roofGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
      roofGeo.setIndex(new THREE.BufferAttribute(idx, 1))
      roofGeo.computeVertexNormals()
    }

    const roofMesh = new THREE.Mesh(roofGeo, roofMat)
    roofMesh.position.set(0, roofY, 0)
    roofMesh.castShadow = true
    group.add(roofMesh)

    // Roof overhang trim
    const overhangGeo = new THREE.BoxGeometry(w + 0.5, 0.25, d + 0.5)
    const overhang = new THREE.Mesh(overhangGeo, trimMat)
    overhang.position.set(0, roofY + 0.1, 0)
    overhang.castShadow = true
    group.add(overhang)
  } else {
    // Flat roof with parapet
    const parapetGeo = new THREE.BoxGeometry(w + 0.3, 0.6, d + 0.3)
    const parapet = new THREE.Mesh(parapetGeo, makeMat(bp.wallColor, 0.9))
    parapet.position.set(0, roofY + 0.3, 0)
    parapet.castShadow = true
    group.add(parapet)
  }

  // ── Chimneys ───────────────────────────────────────────────────────
  for (let i = 0; i < bp.chimneys; i++) {
    const cx = (i === 0 ? -1 : 1) * (w * 0.28)
    const chiGeo = new THREE.BoxGeometry(0.8, FLOOR_H * 0.6, 0.8)
    const chi = new THREE.Mesh(chiGeo, makeMat('#5a4030', 0.92))
    chi.position.set(cx, roofY + FLOOR_H * 0.3, 0)
    chi.castShadow = true
    group.add(chi)
    // Chimney pot
    const potGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.5, 6)
    const pot = new THREE.Mesh(potGeo, makeMat('#3a2820', 0.95))
    pot.position.set(cx, roofY + FLOOR_H * 0.6 + 0.25, 0)
    group.add(pot)
  }

  // ── Windows ────────────────────────────────────────────────────────
  const winW = bp.type === 'shop' ? 2.4 : 1.0
  const winH = bp.type === 'shop' ? 2.0 : (bp.type === 'church' ? 1.6 : 1.1)
  const frameT = 0.08
  const inset  = 0.05

  const addWindow = (x: number, y: number, face: 'front' | 'back' | 'left' | 'right') => {
    const frameGeo = new THREE.BoxGeometry(winW + frameT*2, winH + frameT*2, frameT)
    const frame = new THREE.Mesh(frameGeo, trimMat)
    const glassGeo = new THREE.BoxGeometry(winW, winH, frameT * 0.5)
    const glass = new THREE.Mesh(glassGeo, windowsLit && Math.random() > 0.3 ? winMat : glassMat)
    glass.castShadow = false

    if (face === 'front') {
      frame.position.set(x, y, d / 2 + inset)
      glass.position.set(x, y, d / 2 + inset + frameT * 0.3)
    } else if (face === 'back') {
      frame.position.set(x, y, -d / 2 - inset)
      glass.position.set(x, y, -d / 2 - inset - frameT * 0.3)
    } else if (face === 'left') {
      frame.rotation.y = Math.PI / 2
      frame.position.set(-w / 2 - inset, y, x)
      glass.rotation.y = Math.PI / 2
      glass.position.set(-w / 2 - inset - frameT * 0.3, y, x)
    } else {
      frame.rotation.y = Math.PI / 2
      frame.position.set(w / 2 + inset, y, x)
      glass.rotation.y = Math.PI / 2
      glass.position.set(w / 2 + inset + frameT * 0.3, y, x)
    }
    group.add(frame, glass)
  }

  // Place windows per floor per face
  const windowsPerFloor = Math.max(1, Math.floor((w - 2) / 3))
  for (let fl = 0; fl < bp.floors; fl++) {
    const wy = 0.4 + fl * FLOOR_H + FLOOR_H * 0.6
    for (let wi = 0; wi < windowsPerFloor; wi++) {
      const wx = (wi - (windowsPerFloor - 1) / 2) * 2.5
      addWindow(wx, wy, 'front')
      addWindow(wx, wy, 'back')
    }
  }

  // ── Front door ─────────────────────────────────────────────────────
  const doorW = 1.0; const doorH = 2.2
  const doorGeo = new THREE.BoxGeometry(doorW, doorH, frameT)
  const doorOffsetX = bp.type === 'cottage' ? -w * 0.22 : 0
  const door = new THREE.Mesh(doorGeo, makeMat(bp.trimColor, 0.7))
  door.position.set(doorOffsetX, 0.4 + doorH / 2, d / 2 + inset)
  group.add(door)

  // Door surround
  const surroundGeo = new THREE.BoxGeometry(doorW + 0.25, doorH + 0.3, frameT * 0.5)
  const surround = new THREE.Mesh(surroundGeo, trimMat)
  surround.position.set(doorOffsetX, 0.4 + doorH / 2 + 0.05, d / 2 + inset + frameT * 0.2)
  group.add(surround)

  // ── Bay window (if applicable) ─────────────────────────────────────
  if (bp.hasBayWindow) {
    const bayGeo = new THREE.BoxGeometry(2.2, FLOOR_H * 0.85, 1.0)
    const bay = new THREE.Mesh(bayGeo, wallMat)
    bay.position.set(-w * 0.2, 0.4 + FLOOR_H * 0.45, d / 2 + 0.5)
    bay.castShadow = true
    bay.receiveShadow = true
    group.add(bay)
    // Bay window glass
    const bayGlassGeo = new THREE.BoxGeometry(1.6, FLOOR_H * 0.5, frameT)
    const bayGlass = new THREE.Mesh(bayGlassGeo, windowsLit ? winMat : glassMat)
    bayGlass.position.set(-w * 0.2, 0.4 + FLOOR_H * 0.5, d / 2 + 1.0 + inset)
    group.add(bayGlass)
  }

  return group
}
