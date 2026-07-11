// SPDX-License-Identifier: GPL-3.0
//
// CityJSON — the interchange format written by MFCG and read by City Viewer.
// Schema reverse-engineered from the live Medieval Fantasy City Generator
// (watabou.itch.io/medieval-fantasy-city-generator).
//
// A "point" in this format is always [x, y] (two-element number tuple).
// All coordinates are in the generator's own world-unit space; the consumer
// is responsible for scaling to screen / 3-D units.

export type JsonPt = [number, number]

// ─── Buildings ───────────────────────────────────────────────────────────────

export interface JsonBuilding {
  /** Footprint as a closed polygon — vertices in order, do NOT repeat first. */
  vertices: JsonPt[]
  /** Ward type string (e.g. "Craftsmen", "Merchant", "Slum", …) */
  type?: string
}

// ─── Streets & Roads ─────────────────────────────────────────────────────────

/** An ordered list of points forming a polyline. */
export type JsonStreet = JsonPt[]

// ─── Walls ───────────────────────────────────────────────────────────────────

export interface JsonWall {
  /** Outer wall polygon. */
  shape: JsonPt[]
  /** Tower positions. */
  towers: JsonPt[]
  /** Gate positions (subset of shape vertices). */
  gates: JsonPt[]
}

// ─── Wards ───────────────────────────────────────────────────────────────────

export interface JsonWard {
  /** Ward type label. */
  type: string
  /** The patch polygon (outer boundary of this ward). */
  shape: JsonPt[]
  /** Whether this ward is inside the city walls. */
  withinWalls: boolean
}

// ─── Top-level city object ───────────────────────────────────────────────────

export interface CityJSON {
  /** Generator version / metadata. */
  version?: string

  /** All building footprints across all wards. */
  buildings: JsonBuilding[]

  /** Main arteries (streets inside walls + roads outside). */
  streets: JsonStreet[]

  /** City (outer) wall. Null when the city has no walls. */
  wall: JsonWall | null

  /** Castle (inner) wall. Null when there is no citadel. */
  citadel: JsonWall | null

  /** All wards including outside-walls patches. */
  wards: JsonWard[]

  /** Radius of the city in world units. */
  cityRadius: number

  /** Seed used to generate this city. */
  seed: number

  /** Number of inner patches. */
  nPatches: number
}
