/**
 * Mulberry32 — fast, good-quality seeded 32-bit PRNG.
 * Returns a zero-argument function producing floats in [0, 1).
 * Suitable as the `random` argument to simplex-noise's createNoise2D(rng).
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return (): number => {
    s = Math.imul((s ^= s + 0x6d2b79f5), s | 1)
    let t = s ^ (s >>> 15)
    t = Math.imul(t, t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
