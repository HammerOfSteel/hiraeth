// SPDX-License-Identifier: GPL-3.0
// Segment type — a directed edge between two points (by reference)

import type { Pt } from './pt'

export interface Segment {
  start: Pt
  end: Pt
}
