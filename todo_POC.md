# POC: Medieval Fantasy City Generator + 3D City Viewer

## Goal
A single web app with two fully functional views:

1. **2D Map View** — 1:1 TypeScript port of Watabou's Medieval Fantasy City Generator (MFCG, source: TownGeneratorOS, GPL-3.0)
2. **3D City View** — Three.js city viewer reading the same JSON format as Watabou's City Viewer
3. **Modern UI shell** — clean unified interface; neither view has to look handmade

## Rules
- One **commit per task**, one **push per phase**
- Clean slate: `poc/watabou-port/` is deleted before work begins
- New project lives at `poc/city-gen/`
- Stack: Vite + React 19 + TypeScript strict + Three.js + Tailwind CSS
- GPL-3.0 notice on anything directly ported from TownGeneratorOS source
- The 3D viewer is an **original Three.js implementation** (City Viewer is not open-source)

---

## Phase 0 — Clean Slate & Scaffold
> **Push tag: `poc/phase-0`**

- [ ] 0.1 Delete `poc/watabou-port/` — commit `chore: remove old watabou-port`
- [ ] 0.2 Create `poc/city-gen/` with `npm create vite` (React + TS) — commit `init: scaffold city-gen project`
- [ ] 0.3 Install deps: Three.js, `@types/three`, Tailwind CSS, `@tailwindcss/vite` — commit `deps: add three + tailwind`
- [ ] 0.4 Configure tsconfig strict, path aliases (`@geom`, `@model`, `@wards`, `@r2d`, `@r3d`, `@ui`) — commit `config: tsconfig paths and strict mode`
- [ ] 0.5 Stub directory tree: `src/geom/`, `src/model/`, `src/wards/`, `src/render2d/`, `src/render3d/`, `src/ui/`, `src/export/` — commit `structure: stub folder tree`
- [ ] 0.6 Define `src/export/cityJsonTypes.ts` — TypeScript interfaces for the MFCG JSON export schema (buildings, streets, walls, gates) — commit `types: MFCG JSON schema interfaces`

---

## Phase 1 — Geometry Engine
> Port of `com.watabou.geom.*`
> **Push tag: `poc/phase-1`**

- [ ] 1.1 `src/geom/pt.ts` — Pt class replacing `openfl.geom.Point` + PointExtender (add, subtract, scale, norm, rotate90, rotate, addEq, scaleEq, offset, set, setTo, length, dot, Pt.distance, Pt.zero) — commit `feat(geom): Pt class`
- [ ] 1.2 `src/geom/geomUtils.ts` — GeomUtils port: `intersectLines`, `interpolate`, `scalar`, `cross`, `distance2line` — commit `feat(geom): GeomUtils`
- [ ] 1.3 `src/geom/polygon.ts` — `Polygon = Pt[]` + all standalone functions: `polyCut`, `polyShrink`, `polyBuffer`, `polySmoothVertexEq`, `polySquare`, `polyCenter`, `polyCentroid`, `polyCompactness`, `polyForEdge`, `polyFindEdge`, `polyBorders`, `polyNext`, `polyPrev`, `polyMin`, `polyMax`, `polyInterpolate`, `polyDistance`, `polyContains`, `polyIsConvex`, `polyVector` — commit `feat(geom): Polygon`
- [ ] 1.4 `src/geom/voronoi.ts` — Bowyer-Watson Delaunay triangulation; Triangle (circumcircle), Region (sorted vertices, borders), Voronoi (addPoint, relax, build, partioning) — commit `feat(geom): Voronoi`
- [ ] 1.5 `src/geom/graph.ts` — Node (links map), Graph (add, connect, aStar/Dijkstra) — commit `feat(geom): Graph + AStar`
- [ ] 1.6 `src/geom/segment.ts` — Segment interface `{ start: Pt, end: Pt }` — commit `feat(geom): Segment`

---

## Phase 2 — City Model
> Port of `com.watabou.towngenerator.building.*`
> **Push tag: `poc/phase-2`**

- [ ] 2.1 `src/model/patch.ts` — Patch class: shape, withinWalls, withinCity, ward ref, area, center, bounds, compactness, fromRegion — commit `feat(model): Patch`
- [ ] 2.2 `src/model/cutter.ts` — Cutter: `bisect`, `radial`, `semiRadial`, `ring` — commit `feat(model): Cutter`
- [ ] 2.3 `src/model/curtainWall.ts` — CurtainWall: shape polygon from ward circumference, `buildTowers`, gates array, `getRadius`, `bordersBy` — commit `feat(model): CurtainWall`
- [ ] 2.4 `src/model/topology.ts` — Topology: node/edge graph from patches, `buildPath` (A* + smooth x2), inner/outer node sets — commit `feat(model): Topology`
- [ ] 2.5 `src/model/model.ts` — Model orchestrator: `buildPatches` (Voronoi spiral), `optimizeJunctions`, `buildWalls`, `buildStreets` (+ `tidyUpRoads`), `createWards`, `buildGeometry`; exposes patches, arteries, streets, roads, wall, citadel, plaza, gates, cityRadius, center — commit `feat(model): Model pipeline`

---

## Phase 3 — Ward System
> Port of `com.watabou.towngenerator.wards.*`
> **Push tag: `poc/phase-3`**

- [ ] 3.1 `src/wards/ward.ts` — Ward base: constants (MAIN_STREET=2, REGULAR_STREET=1, ALLEY=0.6), `getCityBlock` (per-edge inset logic checking arteries + wall), `createAlleys` (recursive bisection), `createOrthoBuilding`, `filterOutskirts`, `getLabel` — commit `feat(wards): Ward base`
- [ ] 3.2 `src/wards/commonWard.ts` — CommonWard: `createGeometry` calls getCityBlock → createAlleys, filterOutskirts if not enclosed — commit `feat(wards): CommonWard`
- [ ] 3.3 `src/wards/craftsmenWard.ts` — minSq 10–90, gridChaos 0.5–0.7, sizeChaos 0.6 — commit `feat(wards): CraftsmenWard`
- [ ] 3.4 `src/wards/merchantWard.ts` — minSq 50–110, sizeChaos 0.7, emptyProb 0.15, rateLocation: near center — commit `feat(wards): MerchantWard`
- [ ] 3.5 `src/wards/slum.ts` — minSq 10–40, high chaos (0.6–1.0), rateLocation: far from center — commit `feat(wards): Slum`
- [ ] 3.6 `src/wards/market.ts` — Market (plaza): open geometry (no buildings) — commit `feat(wards): Market`
- [ ] 3.7 `src/wards/castle.ts` — Castle: own CurtainWall, `buildTowers`, geometry from radial/semiRadial slices — commit `feat(wards): Castle`
- [ ] 3.8 `src/wards/cathedral.ts` — Cathedral: large single building, ortho layout — commit `feat(wards): Cathedral`
- [ ] 3.9 `src/wards/administrationWard.ts` — AdminWard — commit `feat(wards): AdministrationWard`
- [ ] 3.10 `src/wards/militaryWard.ts` — MilitaryWard — commit `feat(wards): MilitaryWard`
- [ ] 3.11 `src/wards/patriciateWard.ts` — PatriciateWard (wealthy, large buildings) — commit `feat(wards): PatriciateWard`
- [ ] 3.12 `src/wards/gateWard.ts` — GateWard (near city gates) — commit `feat(wards): GateWard`
- [ ] 3.13 `src/wards/park.ts` — Park: grove geometry (radial sectors, medium fill) — commit `feat(wards): Park`
- [ ] 3.14 `src/wards/farm.ts` — Farm (countryside, outside walls) — commit `feat(wards): Farm`
- [ ] 3.15 Wire WARDS rotation array into model.ts createWards — commit `feat(model): wire ward rotation array`

---

## Phase 4 — 2D Renderer (1:1 MFCG Visual)
> Port of `com.watabou.towngenerator.mapping.*`
> **Push tag: `poc/phase-4`**

- [ ] 4.1 `src/render2d/palette.ts` — 7 palettes with exact hex values from Palette.hx (Default, Blueprint, B&W, Ink, Night, Ancient, Colour) — commit `feat(r2d): palettes`
- [ ] 4.2 `src/render2d/brush.ts` — Brush constants: NORMAL_STROKE=0.3, THICK_STROKE=1.8, THIN_STROKE=0.15 — commit `feat(r2d): Brush constants`
- [ ] 4.3 `src/render2d/renderer2d.ts` — Canvas2D renderer matching CityMap.hx exactly: background fill, roads (two-pass: wide medium + narrow paper), buildings per ward type (light fill + dark NORMAL_STROKE outline), parks (medium fill), castle/cathedral (doubled stroke), wall (THICK_STROKE + towers + gate ticks) — commit `feat(r2d): CityMap renderer`
- [ ] 4.4 Scale formula: `min(W,H) / (cityRadius * 2) * 0.9` centred on city — commit `feat(r2d): scale + centre transform`
- [ ] 4.5 Visual comparison against real MFCG screenshots, fix any divergences — commit `fix(r2d): visual parity pass`

---

## Phase 5 — MFCG 2D UI (1:1 Interface)
> Port of TownScene.hx + CitySizeButton.hx UI
> **Push tag: `poc/phase-5`**

- [ ] 5.1 Full-screen canvas fills window; React root overlays UI on top — commit `feat(ui2d): full-screen canvas`
- [ ] 5.2 Top-right size buttons: Small Town (6–10), Large Town (10–15), Small City (15–24), Large City (24–40) matching original font + style — commit `feat(ui2d): size buttons`
- [ ] 5.3 Palette swatches row below size buttons (7 swatches) — commit `feat(ui2d): palette swatches`
- [ ] 5.4 Keyboard shortcuts: Enter = new random seed, 1–4 = size presets — commit `feat(ui2d): keyboard shortcuts`
- [ ] 5.5 Bottom-right: seed number + generation time display — commit `feat(ui2d): seed display`
- [ ] 5.6 Ward label tooltip on hover (reads `ward.getLabel()`) — commit `feat(ui2d): ward tooltips`
- [ ] 5.7 "Export JSON" button — downloads city as MFCG-format JSON — commit `feat(ui2d): JSON export button`

---

## Phase 6 — JSON Export/Import (MFCG Format)
> Bridge between 2D generator and 3D viewer
> **Push tag: `poc/phase-6`**

- [ ] 6.1 Reverse-engineer exact MFCG JSON schema from live tool exports — commit `docs: MFCG JSON schema notes`
- [ ] 6.2 `src/export/serialiser.ts` — `modelToJson(model): CityJSON` — commit `feat(export): serialiser`
- [ ] 6.3 `src/export/deserialiser.ts` — `jsonToRenderData(json): RenderData` consumable by 3D renderer — commit `feat(export): deserialiser`
- [ ] 6.4 Round-trip test: generate → serialise → deserialise → compare vertex counts — commit `test(export): round-trip validation`
- [ ] 6.5 Validate output loads in the real Watabou City Viewer at watabou.itch.io/city-viewer — commit `test(export): city-viewer compatibility`

---

## Phase 7 — 3D City Viewer (Three.js)
> Original Three.js implementation (not a port — City Viewer source is closed)
> **Push tag: `poc/phase-7`**

- [ ] 7.1 `src/render3d/scene.ts` — Three.js WebGLRenderer, scene, perspective camera, resize handler — commit `feat(r3d): Three.js scene setup`
- [ ] 7.2 `src/render3d/buildings.ts` — ExtrudeGeometry from building footprints; flat + gable roof variants; wall colour variation per building — commit `feat(r3d): building extrusion`
- [ ] 7.3 `src/render3d/wall.ts` — City wall + castle wall as extruded polygons; tower cylinders — commit `feat(r3d): wall geometry`
- [ ] 7.4 `src/render3d/ground.ts` — Ground plane with road/street/park/water colour patches — commit `feat(r3d): ground plane`
- [ ] 7.5 `src/render3d/trees.ts` — Procedural tree placement in park/farm patches (cone + sphere meshes) — commit `feat(r3d): trees`
- [ ] 7.6 `src/render3d/windows.ts` — Window geometry on building walls (lit/unlit toggle) — commit `feat(r3d): windows`
- [ ] 7.7 `src/render3d/lighting.ts` — 6 colour + lighting presets matching City Viewer styles (Day, Evening, Night, Desert, Winter, Overcast) — commit `feat(r3d): lighting presets`
- [ ] 7.8 `src/render3d/controls.ts` — Two modes: orbit overview (mouse drag) + fly-through (WASD + mouse look) — commit `feat(r3d): camera controls`
- [ ] 7.9 OBJ export of current 3D scene — commit `feat(r3d): OBJ export`
- [ ] 7.10 Keyboard parity with City Viewer: 1–4 view modes, 5–0 style presets, G (gables), W (windows), T (trees), X (export OBJ) — commit `feat(r3d): keyboard shortcuts`

---

## Phase 8 — Unified App & Modern UI Shell
> Both views in one polished app
> **Push tag: `poc/phase-8`**

- [ ] 8.1 `src/ui/AppShell.tsx` — top navigation bar: "2D Map" | "3D View" tabs; app title — commit `feat(ui): app shell + tab nav`
- [ ] 8.2 Tailwind theme: neutral stone/slate palette that does not clash with map colours; clean sans-serif — commit `feat(ui): Tailwind theme`
- [ ] 8.3 City auto-flows: when a city is generated in 2D view, the same data is immediately available in 3D view (no manual export) — commit `feat(ui): shared city state`
- [ ] 8.4 Shared toolbar: regenerate button, size preset selector, palette (2D) / style (3D) switcher — commit `feat(ui): shared toolbar`
- [ ] 8.5 Right sidebar panel: ward list with colour swatches, city stats (patch count, wall toggle, citadel, plaza) — commit `feat(ui): stats sidebar`
- [ ] 8.6 Export panel: Download JSON / Download OBJ / Copy seed — commit `feat(ui): export panel`
- [ ] 8.7 Loading skeleton while city generates (generation can take 200–800 ms) — commit `feat(ui): loading state`
- [ ] 8.8 Error boundary + user-facing error messages — commit `feat(ui): error boundary`
- [ ] 8.9 Responsive layout: tablet-down collapses sidebar — commit `feat(ui): responsive`

---

## Phase 9 — Hiraeth Integration
> Connect to the game
> **Push tag: `poc/phase-9`**

- [ ] 9.1 British Isles place name generator for city/ward names — commit `feat(hiraeth): name generator`
- [ ] 9.2 Hiraeth palette variant: foggy, earthy, Celtic tones — commit `feat(hiraeth): palette`
- [ ] 9.3 Custom ward types: Inn, Blacksmith, Docks, Herbalist — commit `feat(hiraeth): custom wards`
- [ ] 9.4 River + coastline water body patches — commit `feat(hiraeth): water features`
- [ ] 9.5 `generateCity(seed, size): CityJSON` — clean public API callable from game engine — commit `feat(hiraeth): public API`
- [ ] 9.6 Integration demo: deep-link from POC_A world map → open city generator with matching seed — commit `feat(hiraeth): world-map integration`

---

## Status

| Phase | Description                  | Status  |
|-------|------------------------------|---------|
| 0     | Clean Slate & Scaffold       | ⬜ todo |
| 1     | Geometry Engine              | ⬜ todo |
| 2     | City Model                   | ⬜ todo |
| 3     | Ward System                  | ⬜ todo |
| 4     | 2D Renderer                  | ⬜ todo |
| 5     | MFCG 2D UI                   | ⬜ todo |
| 6     | JSON Export/Import           | ⬜ todo |
| 7     | 3D City Viewer               | ⬜ todo |
| 8     | Unified App + Modern UI      | ⬜ todo |
| 9     | Hiraeth Integration          | ⬜ todo |

---

## Key Reference URLs
- MFCG source: https://github.com/watabou/TownGeneratorOS (GPL-3.0)
- Live MFCG: https://watabou.itch.io/medieval-fantasy-city-generator
- Live City Viewer: https://watabou.itch.io/city-viewer
- City Viewer JSON format: reverse-engineer from live tool (no public spec)
