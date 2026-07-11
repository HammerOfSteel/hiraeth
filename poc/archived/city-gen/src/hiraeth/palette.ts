// src/hiraeth/palette.ts — Hiraeth palette: foggy, earthy, Celtic tones
import { type Palette, PALETTES } from '../render2d/palette'

export const HIRAETH_PALETTE: Palette = {
  name:   'Hiraeth',
  paper:  '#c8c0b0',   // muted warm stone
  light:  '#8a8070',   // earthy grey-brown
  medium: '#5a5448',   // foggy mid-tone
  dark:   '#1e1a14',   // near-black earth
}

// Register alongside the standard palettes (call this at app boot)
export function registerHiraethPalette(): void {
  PALETTES['Hiraeth'] = HIRAETH_PALETTE
}
