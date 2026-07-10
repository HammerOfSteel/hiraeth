import { createNoise2D } from 'simplex-noise'
import { mulberry32 } from '@utils/Seeder'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TerrainConfig {
  seed: number
  /** Grid samples per side — power of 2 recommended (64–256) */
  resolution: number
  worldWidth: number   // X extent in scene units
  worldDepth: number   // Z extent in scene units
  maxHeight: number    // maximum Y in scene units
  /** 0.1–0.9: fraction of X width that forms the valley floor */
  valleyWidth: number
  /** 0.0–1.0: hill amplitude multiplier */
  hilliness: number
  /** Drop the southern (high-Z) edge to near sea level */
  coastal: boolean
}

export interface Heightmap {
  /** Normalised [0, 1] heights, row-major: data[z * width + x] */
  data: Float32Array
  width: number
  depth: number
  config: TerrainConfig
}

// ── Private helpers ────────────────────────────────────────────────────────────

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  lacunarity = 2.0,
  gain = 0.5,
): number {
  let value = 0
  let amplitude = 1
  let frequency = 1
  let maxAmp = 0
  for (let i = 0; i < octaves; i++) {
    value += noise(x * frequency, y * frequency) * amplitude
    maxAmp += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return value / maxAmp  // normalised to [-1, 1]
}

// ── TerrainGenerator ──────────────────────────────────────────────────────────

export class TerrainGenerator {
  /**
   * Generate a seeded heightmap for a British-style valley landscape.
   * The valley runs along the Z axis, centred at x = 0.5 (normalised).
   * Output values are clamped to [0, 1].
   */
  static generate(config: TerrainConfig): Heightmap {
    const { seed, resolution, valleyWidth, hilliness, coastal } = config

    const rng = mulberry32(seed)
    const terrainNoise = createNoise2D(rng)
    const warpNoise = createNoise2D(rng)

    const data = new Float32Array(resolution * resolution)

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        // Normalised 0–1 grid coordinates
        const nx = x / (resolution - 1)
        const nz = z / (resolution - 1)

        // ── Domain warping: offset sample coordinates by a secondary noise ──
        const warpScale = 2.5
        const warpStr = 0.25
        const wx = fbm(warpNoise, nx * warpScale + 1.7, nz * warpScale + 9.2, 4) * warpStr
        const wz = fbm(warpNoise, nx * warpScale + 8.3, nz * warpScale + 2.8, 4) * warpStr

        // ── FBM base terrain ─────────────────────────────────────────────────
        const baseRaw = fbm(terrainNoise, (nx + wx) * 3.5, (nz + wz) * 3.5, 6)
        const base = (baseRaw + 1) * 0.5  // remap [-1,1] → [0,1]

        // ── Valley profile ────────────────────────────────────────────────────
        // Valley runs in Z direction; x=0.5 is the lowest point.
        const distFromCenter = Math.abs(nx - 0.5) * 2          // 0 at centre, 1 at edge
        const vw = Math.max(0.1, valleyWidth)
        const hillProfile = smoothstep(vw * 0.3, vw * 0.9, distFromCenter)

        // Valley floor: gentle noise undulation only
        // Hillsides: noise fully amplified by hilliness
        const valleyFloor = base * 0.07
        const hillside   = hillProfile * hilliness * (0.35 + base * 0.65)
        let height = valleyFloor + hillside

        // ── Coastal: fade southern edge to sea level ──────────────────────────
        if (coastal) {
          height *= 1 - smoothstep(0.65, 1.0, nz) * 0.95
        }

        data[z * resolution + x] = Math.max(0, Math.min(1, height))
      }
    }

    return { data, width: resolution, depth: resolution, config }
  }

  /**
   * Return the mean height of the column at normalised x position [0, 1].
   * Used by tests to verify valley vs hillside contrast.
   */
  static columnAverage(hm: Heightmap, xNorm: number): number {
    const x = Math.max(0, Math.min(hm.width - 1, Math.round(xNorm * (hm.width - 1))))
    let sum = 0
    for (let z = 0; z < hm.depth; z++) {
      sum += hm.data[z * hm.width + x] as number
    }
    return sum / hm.depth
  }

  /**
   * Sample bilinearly interpolated height at normalised (nx, nz) in [0,1]².
   */
  static sampleNorm(hm: Heightmap, nx: number, nz: number): number {
    const { data, width, depth } = hm
    const fx = nx * (width - 1)
    const fz = nz * (depth - 1)
    const x0 = Math.max(0, Math.min(width - 2, Math.floor(fx)))
    const z0 = Math.max(0, Math.min(depth - 2, Math.floor(fz)))
    const tx = fx - x0
    const tz = fz - z0
    const h00 = data[z0 * width + x0] as number
    const h10 = data[z0 * width + (x0 + 1)] as number
    const h01 = data[(z0 + 1) * width + x0] as number
    const h11 = data[(z0 + 1) * width + (x0 + 1)] as number
    return h00 * (1 - tx) * (1 - tz) +
           h10 * tx * (1 - tz) +
           h01 * (1 - tx) * tz +
           h11 * tx * tz
  }
}
