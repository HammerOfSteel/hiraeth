# MFCG Port — Deep Source Audit & Fix Plan

> Methodology: every Haxe source file was fetched from
> `raw.githubusercontent.com/watabou/TownGeneratorOS/master/…` and
> line-by-line compared to our TypeScript port.
>
> Severity key  
> 🔴 **BLOCKER** — causes no buildings / wrong shapes / identity breaks  
> 🟠 **MAJOR**   — visually obvious divergence  
> 🟡 **MINOR**   — small numeric difference, still noticeable  

---

## Table of Contents

1. [Geometry layer (polygon.ts / cutter.ts)](#1-geometry-layer)
2. [Ward base class (ward.ts)](#2-ward-base-class)
3. [Concrete wards](#3-concrete-wards)
4. [Model pipeline (model.ts)](#4-model-pipeline)
5. [Curtain wall (curtainWall.ts)](#5-curtain-wall)
6. [2-D renderer (renderer2d.ts)](#6-2d-renderer)
7. [3-D viewer (render3d/)](#7-3d-viewer)
8. [Phase-by-phase fix plan](#8-phase-by-phase-fix-plan)

---

## 1. Geometry layer

### BUG-G1 🔴 `getCityBlock` passes one scalar, not a per-edge array

**Original (Ward.hx)**
```haxe
return patch.shape.isConvex() ?
    patch.shape.shrink( insetDist ) :   // Array<Float>
    patch.shape.buffer( insetDist );    // Array<Float>
```

**Ours (ward.ts)**
```typescript
return polyIsConvex(this.patch.shape)
  ? polyShrinkEq(this.patch.shape, insetDist[0])   // ← scalar: FIRST edge only
  : polyBufferEq(this.patch.shape, insetDist[0])
```

`insetDist` is built edge-by-edge: wall-adjacent edges get `MAIN_STREET/2`,
artery-adjacent edges get `MAIN_STREET/2`, inner edges get `REGULAR_STREET/2`,
countryside edges get `ALLEY/2`.  Passing only `insetDist[0]` makes every edge
use the same inset, so street widths are wrong on every ward.

**Fix:** call `polyShrink(shape, insetDist)` and `polyBuffer(shape, insetDist)`.

---

### BUG-G2 🟠 Plaza-edge check is membership, not a directed-edge check

**Original**
```haxe
var onStreet = innerPatch && (model.plaza != null &&
    model.plaza.shape.findEdge( v1, v0 ) != -1);
```
`findEdge(v1, v0)` checks that `v1 → v0` is a directed edge (i.e. adjacent vertices
in the OPPOSITE winding from the patch edge `v0 → v1`, because shared edges are
traversed in opposite directions by neighbouring polygons).

**Ours**
```typescript
let onStreet = innerPatch && (
  this.model.plaza != null &&
  this.model.plaza.shape.indexOf(v1) !== -1 &&
  this.model.plaza.shape.indexOf(v0) !== -1
)
```
This is a set-membership check.  It will return `true` even when `v0` and `v1` are
on the plaza but are NOT adjacent, over-widening street insets on non-adjacent plaza
vertices.

**Fix:** replace with `polyFindEdge(plaza.shape, v1, v0) !== -1`.

---

## 2. Ward base class

### BUG-W1 🔴 `createOrthoBuilding` — `findLongestEdge` measures distance-to-centroid not edge length

**Original (Ward.hx)**
```haxe
private static function findLongestEdge( poly:Polygon ):Point
    return poly.min( function( v ) return -poly.vector( v ).length );
```
`poly.vector(v)` = `poly.next(v).subtract(v)` = the edge vector **from** vertex `v`.
So this returns the **start vertex of the longest edge**.

**Ours (ward.ts)**
```typescript
function findLongestEdge(pp: Polygon): Pt {
  let v = pp[0], maxLen = -1
  polyForEdge(pp, (p0, _) => {
    const len = Pt.distance(p0, polyCenter(pp))  // ← WRONG: distance to centroid
    if (len > maxLen) { maxLen = len; v = p0 }
  })
  return v
}
```
The comparison metric is completely different.  This finds the vertex **farthest from
the centroid** rather than the start of the longest edge.

**Fix:**
```typescript
function findLongestEdge(pp: Polygon): Pt {
  let v = pp[0], maxLen = -1
  polyForEdge(pp, (p0, p1) => {
    const len = Pt.distance(p0, p1)
    if (len > maxLen) { maxLen = len; v = p0 }
  })
  return v
}
```

---

### BUG-W2 🔴 `createOrthoBuilding` — the `polyCut` call is never made

**Ours (ward.ts)**
```typescript
const halves = (pp as Polygon & { cut: (a: Pt, b: Pt) => Polygon[] }).cut
  ? (pp as unknown as { cut: ... }).cut(p1, p1.add(c))
  : [pp]
```
`pp` is `Pt[]`.  A plain array never has a `.cut` method, so this **always** evaluates
the else branch and returns `[pp]` — the polygon is never subdivided.

**Fix:** replace with the actual function call:
```typescript
const halves = polyCut(pp, p1, p1.add(c))
```
Also: the `Random.normal()` call in the half-size comparison should be
`(Math.random() * 2 - 1)` — **not** `Math.random() * 2 - 1` used inside
`Math.pow(2, ...)`.  Original: `half.square < minBlockSq * Math.pow(2, Random.normal() * 2 - 1)`.

---

### BUG-W3 🔴 `filterOutskirts` is a bounding-box clip — original is a road-density filter

**Original (Ward.hx)**  
`filterOutskirts` works by:
1. Building a list of **populated edges** — edges of the patch that border roads or
   neighbouring city wards — each with a `d` (perpendicular depth) and direction.
2. For every building polygon in `geometry`:
   - Compute `minDist` = how far (as a fraction of `edge.d`) the building sits from
     any populated edge.
   - Compute a weighted density `p` using `patch.shape.interpolate(building.center)`
     against per-vertex density values (0 if vertex is countryside, 2×rng if gates
     are nearby, else 0).
   - Keep the building if `Random.fuzzy(1) > minDist / p`.
3. Result: buildings close to roads survive; buildings deep in open countryside are
   removed stochastically.

**Ours (ward.ts)**
```typescript
static filterOutskirts(polygon: Polygon, border: Polygon): Polygon | null {
  const bounds = polyGetBounds(border)
  const filtered = polygon.filter(v =>
    v.x >= bounds.left && v.x <= bounds.right && ...)
  return filtered.length >= 3 && filtered.length >= polygon.length * 0.5 ? filtered : null
}
```
This clips building vertices to the border's bounding box — a completely
different semantic that (a) operates on the inset block polygon, not individual
buildings, and (b) uses a simple rectangle test.

**Fix:** rewrite `filterOutskirts` as a post-`createAlleys` pass that matches the
original algorithm (see Phase 4 task list).

---

### BUG-W4 🔴 `createAlleys` and all wards use `Math.random()` — not the seeded PRNG

Every `Math.random()` call in `createAlleys`, all ward constructors, and
`createOrthoBuilding` must be replaced with calls to a seeded PRNG passed down
from `Model`.  Without this, the same seed produces different layouts on every
render.

The PRNG (`makePrng`) already exists in `model.ts` but is private.  It must be
made accessible to wards.

---

### BUG-W5 🟠 Ward constructor minSq uses uniform distribution — original uses squared

| Ward | Original | Ours |
|------|----------|------|
| Craftsmen | `10 + 80 * rng() * rng()` | `10 + Math.random() * 80` |
| Slum | `10 + 30 * rng() * rng()` | varies |
| Merchant | `50 + 60 * rng() * rng()` | `50 + Math.random() * 60` |
| Patriciate | `80 + 30 * rng() * rng()` | `80 + Math.random() * 30` |
| Administration | `80 + 30 * rng() * rng()` | `80 + Math.random() * 30` |
| GateWard | `10 + 50 * rng() * rng()` | `10 + Math.random() * 50` |

`rng() * rng()` is a **squared distribution** (β = 1/3), biased toward small values.
Uniform sampling produces buildings that are on average 30–40% larger, making the
city look sparse and blocky.

---

## 3. Concrete wards

### BUG-CW1 🔴 `Castle` ward — wrong geometry algorithm

**Original (Castle.hx)**
```haxe
override public function createGeometry() {
    var block = patch.shape.shrinkEq( Ward.MAIN_STREET * 2 );
    geometry = Ward.createOrthoBuilding( block, Math.sqrt( block.square ) * 4, 0.6 );
}
```
The wall is built in the **constructor**, not in `createGeometry`.

**Ours (castle.ts)**
Geometry uses `semiRadial` sectors — completely different visual result.
Also creates the CurtainWall inside `createGeometry` instead of the constructor.

**Fix:**
1. Move `CurtainWall` construction to `Castle` constructor.
2. `createGeometry`: `block = polyShrinkEq(shape, MAIN_STREET * 2)`, then
   `Ward.createOrthoBuilding(block, Math.sqrt(polySquare(block)) * 4, 0.6)`.

---

### BUG-CW2 🔴 `Market` ward — no geometry produced

**Original (Market.hx)**  
Creates a **fountain or statue** (60% statue = small rotated rect; 40% fountain =
small circle), offset toward a random point on the longest edge.  This small object
is the only `geometry` element — the market square itself is open space.

**Ours (market.ts)**
`createGeometry()` does nothing — empty array.

**Fix:** implement the fountain/statue logic from Market.hx.

---

### BUG-CW3 🔴 `Farm` ward — wrong algorithm

**Original (Farm.hx)**
```haxe
var housing = Polygon.rect( 4, 4 );
var pos = GeomUtils.interpolate( patch.shape.random(), patch.shape.centroid,
                                  0.3 + Random.float() * 0.4 );
housing.rotate( Random.float() * Math.PI );
housing.offset( pos );
geometry = Ward.createOrthoBuilding( housing, 8, 0.5 );
```
A small `4×4` house is placed at a random point between a random vertex and the
centroid.  Only the house is subdivided, not the whole farm patch.

**Ours (farm.ts)**
Bisects the entire farm patch into field strips — a completely different visual
(covers whole patch with strips vs. a single small building cluster).

**Fix:** implement the original Farm algorithm.

---

### BUG-CW4 🟠 `MilitaryWard` — wrong base class and wrong `minSq`

**Original (MilitaryWard.hx)**  
Extends `Ward` directly (not `CommonWard`) and calls:
```haxe
var block = getCityBlock();
geometry = Ward.createAlleys( block,
    Math.sqrt( block.square ) * (1 + Random.float()),
    0.1 + Random.float() * 0.3, 0.3,
    0.25 );
```
`minSq` is proportional to the block area (`sqrt(block.square)`).

**Ours (militaryWard.ts)**
Extends `CommonWard` with fixed `minSq = 40–80`.

**Fix:** extend `Ward`, compute `minSq` from `Math.sqrt(polySquare(block))` in
`createGeometry`.

---

### BUG-CW5 🟠 `Cathedral` — missing 40% `ring` mode

**Original (Cathedral.hx)**
```haxe
geometry = Random.bool( 0.4 ) ?
    Cutter.ring( getCityBlock(), 2 + Random.float() * 4 ) :
    Ward.createOrthoBuilding( getCityBlock(), 50, 0.8 );
```

Need to verify our Cathedral implements both `ring` (ring of rectangular chapels)
and `createOrthoBuilding` (orthogonal keep) modes with correct 40/60 probability.

---

### BUG-CW6 🟠 `Park` ward — verify `compactness >= 0.7` condition

**Original (Park.hx)**
```haxe
var block = getCityBlock();
geometry = block.compactness >= 0.7 ?
    Cutter.radial( block, null, Ward.ALLEY ) :
    Cutter.semiRadial( block, null, Ward.ALLEY );
```
The park geometry is ALL sectors from radial/semiRadial — no empty-probability
filtering.  Compare with our park.ts to ensure no extra filtering is applied.

---

### BUG-CW7 🟡 All `rateLocation` static methods missing

Every ward with a `rateLocation` static in the Haxe source:

| Ward | Preference |
|------|------------|
| Market | not adjacent to another Market; close to plaza |
| Cathedral | bordering plaza (returns –1/sq); else closest to plaza |
| Slum | farthest from center |
| Merchant | closest to center |
| Patriciate | borders Park (–), borders Slum (+) |
| Administration | borders plaza; else closest to plaza |
| Military | borders citadel (0), else borders wall (1), else ∞ if wall/citadel exist |

Our model just takes the first unassigned patch.  See BUG-M3 below.

---

## 4. Model pipeline

### BUG-M1 🔴 Ward placement never calls `rateLocation`

**Original (Model.hx)**
```haxe
var rateFunc = Reflect.field( wardClass, "rateLocation" );
if (rateFunc == null)
    do bestPatch = unassigned.random()
    while (bestPatch.ward != null);
else
    bestPatch = unassigned.min( function(patch)
        return Reflect.callMethod(null, rateFunc, [model, patch]) );
```
Each ward class is scored against every remaining unassigned patch.  The patch with
the **lowest** score wins.  If no `rateLocation` method exists, a random patch is
chosen.

**Ours (model.ts)**
```typescript
const bestPatch = unassigned.find(p => p.ward == null) ?? unassigned[0]
```
Always picks the first available patch — ward types end up in insertion order, not
in their preferred locations.

**Fix:** add `static rateLocation(model: Model, patch: Patch): number` to each
ward class, then sort unassigned patches by score in `_createWards`.

---

### BUG-M2 🟠 Citadel compactness threshold is too permissive

| | Value |
|--|--|
| Ours | `< 0.4` |
| Original | `< 0.75` |

The original throws `"Bad citadel shape!"` and retries generation when
`compactness < 0.75`.  Our threshold accepts very elongated citadel shapes.

**Fix:** use `0.75` and handle the retry by re-seeding.

---

### BUG-M3 🟠 Road start-point search scans only `outer` nodes — original scans ALL nodes

**Original (Model.hx)**
```haxe
for (p in topology.node2pt) {  // iterates ALL nodes (inner + outer)
    var d = Point.distance( p, dir );
    if (d < dist) { dist = d; start = p; }
}
```

**Ours (model.ts)**
```typescript
for (const node of this._topology.outer) {
    const d = Pt.distance(node.pt, dir)
```
Only outer nodes.  The "farthest outside" road start point might actually live in a
border node that is not in `outer`.

**Fix:** iterate `_topology.allPoints()` (all `node2pt` values).

---

### BUG-M4 🟡 Outskirts GateWard assignment differs from original

**Original**: iterates `wall.gates` (border-wall gates only, not citadel gates),
assigns `GateWard` to adjacent patches unless `Random.bool(1/(nPatches-5))`.

**Ours**: checks `border.gates` with probability `wall == null ? 0.2 : 0.5` — a
flat probability regardless of `nPatches`.

**Fix:** use `1 / (nPatches - 5)` probability.

---

### BUG-M5 🟡 `_buildPatches` Voronoi relaxation includes wrong set of points

**Original (Model.hx)**
```haxe
var toRelax = [for (i in 0...3) voronoi.points[i]];
if (voronoi.points.length > nPatches)
    toRelax.push( voronoi.points[nPatches] );
```
Points `[0, 1, 2]` (3 innermost) plus the `nPatches`-th point.  Relaxation
runs **3 times**.

Our code matches this.  ✅  (Document for completeness.)

---

## 5. Curtain wall

### BUG-C1 🔴 Shape smoothing creates new `Pt` objects — breaks reference identity

**Original (CurtainWall.hx)**
```haxe
shape.set( [for (v in shape)
    reserved.contains( v ) ? v : shape.smoothVertex( v, smoothFactor )
] );
```
`shape.set(...)` writes back into the **same array elements** (in-place copy of
coordinates), so every existing `Point` reference to a wall vertex retains its
identity.  After smoothing, `patch.shape[i] === wall.shape[j]` is still true for
shared vertices.

**Ours (curtainWall.ts)**  
Uses `polySmoothVertexEq(shape)` which returns a **new** `Pt[]` array with new
`Pt` instances.  The wall's `shape` is then replaced with this new array.  After
this, `patch.shape[i] !== wall.shape[j]` — the reference is broken.

**Consequence:** every check that depends on Pt reference identity (`bordersBy`,
`gates.contains(v)`, `topology.pt2node.get(v)`, street routing, etc.) silently
fails because the wall vertices are no longer the same objects as the patch vertices.
This is the **root cause** of most visual bugs in the 2D map.

**Fix:**
```typescript
// Smooth in-place: update x/y of each existing Pt, never replace the object
const smoothed = polySmoothVertexEq(this.shape, smoothFactor)
for (let i = 0; i < this.shape.length; i++) {
  if (!reserved.includes(this.shape[i])) {
    this.shape[i].x = smoothed[i].x
    this.shape[i].y = smoothed[i].y
  }
}
```

---

### BUG-C2 🟠 Gate smoothing must mutate gate `Pt` in-place, not replace it

**Original**
```haxe
for (gate in gates)
    gate.set( shape.smoothVertex( gate ) );
```
`gate.set(point)` updates `gate.x` and `gate.y` in-place — the gate Pt stays the
same object.

**Ours** likely assigns new points.

**Fix:** same as BUG-C1 — update `.x`/`.y` of existing `Pt`.

---

### BUG-C3 🟠 Outer-ward splitting on gate placement is missing

When a gate vertex has exactly one outer ward adjacent, the original splits that
outer ward along the gate direction to create a road corridor.

```haxe
if (outerWards.length == 1) {
    var outer:Patch = outerWards[0];
    if (outer.shape.length > 3) {
        // compute wall direction + outward normal
        var farthest = outer.shape.max( ... );
        var newPatches = [for (half in outer.shape.split(gate, farthest)) new Patch(half)];
        model.patches.replace( outer, newPatches );
    }
}
```

Our CurtainWall has no equivalent.  Without it some outer road routes are
impossible and `topology.buildPath` returns null, causing roads to be skipped.

---

## 6. 2-D renderer

### BUG-R1 🔴 Per-patch background fills reveal raw Voronoi cells

**Original (CityMap.hx)**  
The canvas background is set to `palette.paper` once.  Each `PatchView` draws
**only** its ward geometry (buildings, groves, statue) on top.  No per-patch fill
rectangles are drawn.  The "zone" appearance in the original comes from building
density, not colored fills.

**Ours (renderer2d.ts)**  
Before drawing buildings, we fill every patch with a ward-toned color:
```typescript
fill = mixHex(p.paper, p.medium, 0.08)   // city patches
// parks, farms, markets also get fills
```
This makes every Voronoi cell visible as a separate colored region — the
"raw triangulation" look in screenshots.

**Fix:** remove all per-patch fill calls.  Draw only the paper background, then
roads, then buildings.  The only spatial fill that belongs is the plaza polygon
(which is the Market ward and has a small statue inside it anyway).

---

### BUG-R2 🟠 Castle/Cathedral render is single-pass — original is two-pass

**Original (CityMap.hx)**
```haxe
case Castle:
    drawBuilding( g, patch.ward.geometry, palette.light, palette.dark,
                  Brush.NORMAL_STROKE * 2 );
```
`drawBuilding` does:
1. `setStroke(line, thickness * 2)` + draw all polygons (outline)
2. `noStroke()` + `setFill(fill)` + draw all polygons again (fill)

**Ours:** single `ctx.fill()` + `ctx.stroke()` pass.

**Fix:** replicate the two-pass pattern: draw all building outlines first with
`NORMAL_STROKE * 2` thickness, then fill without stroke.

---

### BUG-R3 🟡 Tower radius: should be `THICK_STROKE * scale` not a fixed constant

**Original**
```haxe
drawTower( g, t, Brush.THICK_STROKE * (large ? 1.5 : 1) );
// large = castle wall; normal = border wall
```
Normal towers: `1.8 * 1 = 1.8` world units.
Castle towers: `1.8 * 1.5 = 2.7` world units.

**Our brush.ts:** `TOWER_RADIUS = 1.5` (constant).

**Fix:** compute radius as `THICK_STROKE * (large ? 1.5 : 1)`.

---

### BUG-R4 🟡 Gate tick direction uses `wall.next(gate).subtract(wall.prev(gate))`

**Original**
```haxe
var dir = wall.next( gate ).subtract( wall.prev( gate ) );
dir.normalize( Brush.THICK_STROKE * 1.5 );
g.moveToPoint( gate.subtract( dir ) );
g.lineToPoint( gate.add( dir ) );
```
The gate line is perpendicular to the wall polygon edge at the gate vertex,
scaled to `THICK_STROKE * 1.5`.

Our renderer draws a fixed-length tick (`GATE_TICK = 2.0`) — check whether
direction is also computed correctly from the wall polygon.

---

### BUG-R5 🟡 Rendering order mismatch

| Step | Original | Ours |
|------|----------|------|
| 1 | Roads (medium → paper two-pass) | Canvas background |
| 2 | Ward geometry (buildings/groves) | **Per-patch fills** ← remove |
| 3 | Hot-area overlays | Roads |
| 4 | Walls | Buildings |
| 5 | — | Walls |

Roads should be drawn **before** buildings so that road lines sit behind
building polygons.  (Both versions do this correctly once per-patch fills are
removed.)

---

## 7. 3-D viewer

The City Viewer source is not publicly available on GitHub (404 at watabou/CityViewer).
The 3D view is therefore a best-effort interpretation.  Visual comparison against
screenshots reveals the following:

### BUG-3D-1 🟠 No road/street ground plane

The original City Viewer shows roads as a distinct ground-level material (dark
stripe) running between buildings.  Our ground plane is a single flat color.

**Fix (approximate):** after building the street `arteries` array, extrude them as
thin flat `PlaneGeometry` strips at `y = 0.01` above ground with a dark road
material, matching `MAIN_STREET` width.

### BUG-3D-2 🟠 Buildings lack height variation within a ward

Our height ranges are per-ward-type scalars.  The original shows clear
variation: tall thin spires next to wide low buildings within the same ward.

**Fix:** add per-building random height from the ward's range, weighted by
building area (larger footprint → taller is more likely).

### BUG-3D-3 🟡 No rooftop geometry

Original shows peaked/gabled rooftops.  Our buildings are flat-topped
`ExtrudeGeometry`.

**Fix (approximate):** add a `ConeGeometry` or a 4-vertex gabled
`BufferGeometry` cap on each building at the top face.

### BUG-3D-4 🟡 Trees placed on all `Park`/`Farm` patches including outer ones

Our tree placement iterates all patches with those ward names, including large
outer farm patches.  Trees should only appear inside the `cityRadius`.

---

## 8. Phase-by-phase fix plan

### Phase A — Reference identity (prerequisite for everything)

| # | Task | File | Details |
|---|------|------|---------|
| A1 | Fix CurtainWall in-place smoothing | `curtainWall.ts` | Mutate `.x`/`.y` of existing `Pt`; never create new points. Add a helper `smoothPtInPlace(pt, prev, next, f)`. |
| A2 | Fix gate in-place mutation | `curtainWall.ts` | `gate.x = smoothed.x; gate.y = smoothed.y` after smoothVertex. |
| A3 | Verify `Topology` pt2node | `topology.ts` | All lookups rely on `Pt` reference identity; confirm no new `Pt` objects are created after topology is built. |

**Expected result:** wall/gate/street routing stops silently failing.

---

### Phase B — Core geometry correctness

| # | Task | File | Details |
|---|------|------|---------|
| B1 | Fix `getCityBlock` per-edge inset | `ward.ts` | Call `polyShrink(shape, insetDist)` and `polyBuffer(shape, insetDist)`. |
| B2 | Fix `getCityBlock` plaza-edge check | `ward.ts` | Replace membership check with `polyFindEdge(plaza.shape, v1, v0) !== -1`. |
| B3 | Fix `findLongestEdge` in `createOrthoBuilding` | `ward.ts` | Measure `Pt.distance(p0, p1)` not distance to centroid. |
| B4 | Fix `polyCut` call in `createOrthoBuilding` | `ward.ts` | Replace prototype-cast hack with `polyCut(pp, p1, p1.add(c))`. |

**Expected result:** Castle/Cathedral buildings subdivide correctly; ward insets vary by street type.

---

### Phase C — Seeded PRNG threading

| # | Task | File | Details |
|---|------|------|---------|
| C1 | Expose PRNG from `Model` | `model.ts` | Make `_rng` public or add `model.rng` accessor. |
| C2 | Pass PRNG to ward constructors | `ward.ts` + all concrete wards | Change `Ward` constructor to accept `rng: Prng` as third arg; store as `this.rng`. |
| C3 | Replace all `Math.random()` in wards | all ward files | Use `this.rng.float()`, `this.rng.bool(p)` throughout constructors and `createGeometry`. |
| C4 | Replace `Math.random()` in `createAlleys` | `ward.ts` | Add `rng` param to `createAlleys` and `createOrthoBuilding` static methods. |

**Expected result:** same seed always produces identical city.

---

### Phase D — Ward constructor parameters

| # | Task | File | Details |
|---|------|------|---------|
| D1 | Fix minSq distributions (squared) | all CommonWard subclasses | `minSq = base + range * rng.float() * rng.float()`. |
| D2 | Fix CraftsmenWard, Slum, Merchant, Patriciate, Administration, GateWard | each file | See table in BUG-W5. |

---

### Phase E — Concrete ward algorithms

| # | Task | File | Details |
|---|------|------|---------|
| E1 | Rewrite `Castle.createGeometry` | `castle.ts` | `polyShrinkEq(shape, MAIN_STREET*2)` → `createOrthoBuilding(block, sqrt(sq)*4, 0.6)`. Move wall construction to constructor. |
| E2 | Implement `Market.createGeometry` | `market.ts` | Statue (1+rng × 1+rng rect, rotated along longest edge) or fountain (circle r=1+rng), offset toward longest-edge midpoint. |
| E3 | Rewrite `Farm.createGeometry` | `farm.ts` | Place 4×4 rect at random centroid-vertex interpolation; rotate randomly; `createOrthoBuilding(housing, 8, 0.5)`. |
| E4 | Rewrite `MilitaryWard.createGeometry` | `militaryWard.ts` | Extend `Ward` directly; `minSq = sqrt(polySquare(block)) * (1+rng.float())`; createAlleys with `(0.1+rng*0.3, 0.3, 0.25)`. |
| E5 | Fix `Cathedral` ring mode | `cathedral.ts` | `rng.bool(0.4) ? Cutter.ring(block, 2+rng*4) : createOrthoBuilding(block, 50, 0.8)`. |
| E6 | Rewrite `filterOutskirts` | `ward.ts` | Implement the road-proximity density filter from Ward.hx (populated-edges + interpolate + fuzzy test). |

---

### Phase F — Ward placement (rateLocation)

| # | Task | File | Details |
|---|------|------|---------|
| F1 | Add `static rateLocation` to each ward | all ward files | Implement scoring per spec in §3 BUG-CW7 table. |
| F2 | Fix `_createWards` placement loop | `model.ts` | For each ward in the queue: find the patch in `unassigned` with minimum `rateLocation` score. If ward has no `rateLocation`, pick random. |
| F3 | Fix GateWard outskirts probability | `model.ts` | Use `1 / (nPatches - 5)` probability. |

---

### Phase G — Curtain wall repairs

| # | Task | File | Details |
|---|------|------|---------|
| G1 | Implement outer-ward splitting | `curtainWall.ts` | On gate placement, when one outer ward is adjacent, split it along the gate outward direction to create a road corridor. |
| G2 | Fix citadel compactness threshold | `model.ts` | Change `< 0.4` to `< 0.75`. |
| G3 | Fix road start-point search | `model.ts` | Iterate `_topology.allPoints()` (all nodes), not just `outer`. |

---

### Phase H — 2-D renderer cleanup

| # | Task | File | Details |
|---|------|------|---------|
| H1 | Remove per-patch background fills | `renderer2d.ts` | Delete the ward-toned patch fill loop. Keep only canvas background = paper. |
| H2 | Two-pass Castle/Cathedral rendering | `renderer2d.ts` | Draw all building outlines first (`NORMAL_STROKE * 2`), then fill without stroke. |
| H3 | Fix tower radius | `renderer2d.ts` | `radius = THICK_STROKE * (isLargeWall ? 1.5 : 1.0)`. |
| H4 | Verify gate tick drawing | `renderer2d.ts` | Direction = `wallNext(gate).subtract(wallPrev(gate))`, normalized to `THICK_STROKE * 1.5`. |

---

### Phase I — 3-D improvements (best-effort, no source reference)

| # | Task | File | Details |
|---|------|------|---------|
| I1 | Add road ground strips | `ground.ts` | Extrude artery polylines as flat strips at y=0.01, `MAIN_STREET` width, road material. |
| I2 | Per-building height variation | `buildings.ts` | Height = ward range min + rng * range * (footprintArea / avgArea). |
| I3 | Gabled rooftop caps | `buildings.ts` | For each building, add a triangulated ridge cap. |
| I4 | Restrict trees to cityRadius | `trees.ts` | Skip any patch whose centroid is outside `model.cityRadius`. |

---

## Priority execution order

```
Phase A  (reference identity)  ← MUST GO FIRST — fixes silent failures in topology/routing
Phase B  (core geometry)       ← fixes getCityBlock, createOrthoBuilding
Phase C  (seeded PRNG)         ← makes results deterministic before further debugging
Phase D  (ward params)         ← fixes building size distribution
Phase E  (ward algorithms)     ← fixes castle, market, farm, military, cathedral
Phase F  (rateLocation)        ← fixes ward placement
Phase G  (curtain wall)        ← fixes wall/gate/road issues
Phase H  (renderer cleanup)    ← removes Voronoi-cell artifact, fixes drawing order
Phase I  (3D polish)           ← last, no source reference available
```

Each phase should be committed separately.  Phases A–C are the minimum to get a
recognisable city.  Phases D–H bring visual parity.  Phase I is an approximation.
