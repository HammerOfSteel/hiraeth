export interface Vec2 {
  x: number
  y: number
}

export interface Segment {
  a: Vec2
  b: Vec2
  type: 'highway' | 'arterial' | 'residential'
}

export interface Intersection {
  pos: Vec2
  segments: number[] // indices into segment array
}

export interface Lot {
  polygon: Vec2[]
  blockId: number
  type: LotType
}

export type LotType = 'residential' | 'commercial' | 'civic' | 'green'

export interface RiverPath {
  pts: Vec2[]
  width: number
}

export interface Bridge {
  a: Vec2
  b: Vec2
  type: 'highway' | 'arterial' | 'residential'
}

export interface GeneratedWorld {
  segments: Segment[]
  intersections: Intersection[]
  lots: Lot[]
  rivers: RiverPath[]
  bridges: Bridge[]
  costMap: Float32Array
  mapSize: number
  townCenter: Vec2   // "hub" — where roads converge, dense core forms around it
}

export interface GenParams {
  seed: number
  mapSize: number           // world units (map is mapSize × mapSize)
  waterAmount: number       // 0-1: how much of the map is water/rivers
  gridNoise: number         // 0-1: how much residential roads wander
  arterialCount: number     // major road seeds
  residentialDensity: number // 0-1
  lotShrink: number         // 0-1: lot setback fraction
  majorSpacing: number      // min distance between arterial roads
}
