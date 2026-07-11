// Visual style per MFCG ward type — maps to stack-a's palette

export interface WardStyle {
  wallHex:   number   // building wall color
  roofHex:   number   // roof / top color
  hMin:      number   // min extrusion height
  hMax:      number   // max extrusion height
  hasRoof:   boolean  // add pyramid roof cap
}

export const WARD_STYLES: Record<string, WardStyle> = {
  Castle:         { wallHex: 0x7a7060, roofHex: 0x3a3028, hMin:  8, hMax: 16, hasRoof: false },
  Cathedral:      { wallHex: 0x9a9078, roofHex: 0x302820, hMin: 10, hMax: 18, hasRoof: true  },
  Patriciate:     { wallHex: 0xd0c8a8, roofHex: 0x302820, hMin:  5, hMax:  8, hasRoof: true  },
  Administration: { wallHex: 0xb8b090, roofHex: 0x383020, hMin:  4, hMax:  7, hasRoof: true  },
  Military:       { wallHex: 0x888070, roofHex: 0x303030, hMin:  3, hMax:  6, hasRoof: false },
  Merchant:       { wallHex: 0xc8b888, roofHex: 0x382820, hMin:  3, hMax:  6, hasRoof: true  },
  Craftsmen:      { wallHex: 0xb09870, roofHex: 0x382818, hMin:  2, hMax:  5, hasRoof: true  },
  Slum:           { wallHex: 0x906858, roofHex: 0x302018, hMin:  1, hMax:  3, hasRoof: true  },
  GateWard:       { wallHex: 0x888070, roofHex: 0x303028, hMin:  3, hMax:  6, hasRoof: false },
  Gate:           { wallHex: 0x888070, roofHex: 0x303028, hMin:  3, hMax:  6, hasRoof: false },
  Farm:           { wallHex: 0xa89860, roofHex: 0x382010, hMin:  1, hMax:  2, hasRoof: true  },
  Park:           { wallHex: 0x507838, roofHex: 0x304020, hMin:  0, hMax:  0, hasRoof: false },
  Market:         { wallHex: 0xb0a880, roofHex: 0x383020, hMin:  1, hMax:  2, hasRoof: false },
}

export const FALLBACK_STYLE: WardStyle = {
  wallHex: 0xa8a090, roofHex: 0x382818, hMin: 2, hMax: 5, hasRoof: true,
}

export function getStyle(wardType: string | undefined): WardStyle {
  return WARD_STYLES[wardType ?? ''] ?? FALLBACK_STYLE
}
