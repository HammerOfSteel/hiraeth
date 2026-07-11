// SPDX-License-Identifier: GPL-3.0
// Port of com.watabou.towngenerator.mapping.Palette

export interface Palette {
  name:   string
  paper:  string   // background / road surface
  light:  string   // building fill
  medium: string   // road outline, secondary features
  dark:   string   // building stroke, wall, text
}

export const PALETTES: Record<string, Palette> = {
  Default: {
    name:   'Default',
    paper:  '#ccc5b8',
    light:  '#99948a',
    medium: '#67635c',
    dark:   '#1a1917',
  },
  Blueprint: {
    name:   'Blueprint',
    paper:  '#2a3a6b',
    light:  '#6880b8',
    medium: '#98b0e0',
    dark:   '#e8f0ff',
  },
  BW: {
    name:   'B&W',
    paper:  '#eeeeee',
    light:  '#bbbbbb',
    medium: '#888888',
    dark:   '#111111',
  },
  Ink: {
    name:   'Ink',
    paper:  '#fff8e8',
    light:  '#aa9977',
    medium: '#776655',
    dark:   '#221100',
  },
  Night: {
    name:   'Night',
    paper:  '#0d0d1a',
    light:  '#1a1a33',
    medium: '#4d4d80',
    dark:   '#ccccff',
  },
  Ancient: {
    name:   'Ancient',
    paper:  '#d4bfa0',
    light:  '#9b7b50',
    medium: '#5e4030',
    dark:   '#1a0800',
  },
  Colour: {
    name:   'Colour',
    paper:  '#e8e4de',
    light:  '#c8b89a',
    medium: '#8a7060',
    dark:   '#2a1f14',
  },
}

export const DEFAULT_PALETTE = PALETTES.Default

/** Ward-type colour overrides for the Colour palette. */
export const WARD_COLOURS: Record<string, { fill: string; stroke: string }> = {
  Market:         { fill: '#f5e6a0', stroke: '#a08020' },
  Cathedral:      { fill: '#e0d0b0', stroke: '#604020' },
  Castle:         { fill: '#c0c0c0', stroke: '#404040' },
  Administration: { fill: '#d0e8c0', stroke: '#408040' },
  Military:       { fill: '#c8d8e0', stroke: '#204060' },
  Patriciate:     { fill: '#f0d8b0', stroke: '#805020' },
  Merchant:       { fill: '#f8e8c0', stroke: '#906030' },
  Park:           { fill: '#98c880', stroke: '#204010' },
  Farm:           { fill: '#c8d890', stroke: '#405010' },
  Slum:           { fill: '#b0a090', stroke: '#402010' },
}
