// SPDX-License-Identifier: GPL-3.0
// Ward factory — imports all concrete wards so model.ts has no circular deps

import type { Model } from '../model/model'
import type { Patch } from '../model/patch'
import { Ward } from './ward'
import { CraftsmenWard } from './craftsmenWard'
import { MerchantWard } from './merchantWard'
import { Slum } from './slum'
import { Market } from './market'
import { Cathedral } from './cathedral'
import { AdministrationWard } from './administrationWard'
import { MilitaryWard } from './militaryWard'
import { PatriciateWard } from './patriciateWard'
import { GateWard } from './gateWard'
import { Park } from './park'
import { Farm } from './farm'
import { Castle } from './castle'

export {
  Ward, CraftsmenWard, MerchantWard, Slum, Market, Cathedral,
  AdministrationWard, MilitaryWard, PatriciateWard,
  GateWard, Park, Farm, Castle,
}

/** Create a ward instance by name. Falls back to CraftsmenWard. */
export function createWard(name: string, model: Model, patch: Patch): Ward {
  switch (name) {
    case 'Craftsmen':      return new CraftsmenWard(model, patch)
    case 'Merchant':       return new MerchantWard(model, patch)
    case 'Slum':           return new Slum(model, patch)
    case 'Market':         return new Market(model, patch)
    case 'Cathedral':      return new Cathedral(model, patch)
    case 'Administration': return new AdministrationWard(model, patch)
    case 'Military':       return new MilitaryWard(model, patch)
    case 'Patriciate':     return new PatriciateWard(model, patch)
    case 'Gate':           return new GateWard(model, patch)
    case 'Park':           return new Park(model, patch)
    case 'Farm':           return new Farm(model, patch)
    case 'Castle':         return new Castle(model, patch)
    case 'Ward':           return new CraftsmenWard(model, patch)  // generic outskirts
    default:               return new CraftsmenWard(model, patch)
  }
}
