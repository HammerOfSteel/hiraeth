// src/hiraeth/nameGenerator.ts — British Isles place name generator

const PREFIXES = [
  'Aber','Bal','Bally','Ben','Brae','Bur','Car','Carn','Cas','Clon',
  'Craig','Dal','Drum','Dun','Glen','Inch','Inver','Kil','Kil','Kirk',
  'Llan','Loch','Mach','Mon','Pen','Poll','Port','Rath','Ross','Strath',
  'Tor','Tre','Tyn','Uist','Wick',
]

const SUFFIXES = [
  'ach','aig','an','ard','as','aven','awe','ay','beck','borough',
  'breck','burn','by','caster','dale','don','ell','forth','glas','ham',
  'haven','head','holm','hull','ick','ings','ley','lin','mere','moor',
  'mouth','ness','pool','rith','row','shire','side','stead','stow','thorpe',
  'ton','wick','worth',
]

const WARD_DESCRIPTORS: Record<string, string[]> = {
  Craftsmen:      ['Quarter','Row','Lane','Close'],
  Merchant:       ['Market','Exchange','Quay','Wharf'],
  Slum:           ['Hole','Alley','End','Ditch'],
  Park:           ['Green','Common','Meadow','Garden'],
  Cathedral:      ['Close','Precinct','Yard','Mount'],
  Castle:         ['Keep','Bailey','Mount','Ward'],
  Administration: ['Hall','Court','Gate','Cross'],
  Military:       ['Barracks','Garrison','Fort','Ward'],
  Patriciate:     ['Square','Gardens','Terrace','Row'],
  Market:         ['Square','Market','Cross','Place'],
  Farm:           ['Field','Moor','Heath','Down'],
  Gate:           ['Gate','Bar','Entry','Portal'],
  Inn:            ['Yard','Close','Row','Lane'],
  Blacksmith:     ['Forge','Row','Alley','Close'],
  Docks:          ['Quay','Wharf','Strand','Shore'],
  Herbalist:      ['Lane','Close','Alley','Garden'],
}

function seededChoice<T>(arr: T[], seed: number): T {
  const x = Math.sin(seed) * 43758.5453
  const f = x - Math.floor(x)
  return arr[Math.floor(f * arr.length)]
}

export function generateCityName(seed: number): string {
  const pre = seededChoice(PREFIXES, seed * 3)
  const suf = seededChoice(SUFFIXES, seed * 7 + 1)
  return pre + suf
}

export function generateWardName(wardType: string, patchIndex: number, citySeed: number): string {
  const descriptors = WARD_DESCRIPTORS[wardType] ?? ['Ward','Quarter','Lane','Close']
  const desc = seededChoice(descriptors, citySeed + patchIndex * 31)
  const pre  = seededChoice(PREFIXES,   citySeed + patchIndex * 17)
  return `${pre} ${desc}`
}

export function generateRiverName(seed: number): string {
  const RIVER_NAMES = [
    'Avon','Tay','Dee','Exe','Wye','Usk','Doon','Earn','Teifi','Conwy',
    'Nith','Annan','Clyde','Forth','Tyne','Tweed','Eden','Lune','Ribble',
  ]
  return seededChoice(RIVER_NAMES, seed * 13)
}
