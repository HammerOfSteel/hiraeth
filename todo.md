# Hiraeth — Development Phases & Tasks

> This is a living document. Tasks move, split, and clarify as work progresses.
> Each phase should be independently playable/demonstrable.
> **Workflow:** one branch per phase (`phase/N-name`), commit per task, tests at end gate the merge to `main`.

---

## ✅ Phase 0 — Foundation *(complete)*
*Goal: A working canvas with a camera, a terrain, and a basic build pipeline.*

### Project Setup
- [x] Initialise Vite + TypeScript project
- [x] Install and configure Babylon.js 9
- [x] Set up Svelte 5 as UI overlay with vite-plugin-svelte
- [x] Configure `tsconfig.json` with strict mode
- [x] Set up path aliases (`@world`, `@sim`, `@ui`, etc.)
- [x] Add tweakpane for dev parameter controls
- [x] Set up basic `index.html` with canvas + Svelte mount point
- [x] Create `SceneManager.ts` — engine init, scene, WebGPU/WebGL2 selection

### Camera
- [x] Implement `IsometricCamera.ts` — arc-rotate with constrained angle
- [x] Mouse scroll zoom (smooth, clamped)
- [x] Middle-click drag pan
- [x] Q/E rotation snapping to 45° increments
- [x] Home key to reset view
- [x] Touch gesture support (pinch zoom, two-finger pan)

### Render Loop
- [x] `RenderLoop.ts` with RAF loop
- [x] Delta time tracking
- [x] Basic performance monitor overlay (FPS, draw calls)

### ✅ Phase 0 Tests — 16/16 passing

---

## ✅ Phase 1 — World Generation *(complete)*
*Goal: A generated terrain with roads, parcels, and placeholder buildings you can explore.*

> **Terrain design note (post-phase revision):** The initial Phase 1 implementation used a full
> heightmap with varying Y altitudes. This was revised in `fix/flat-terrain` — see below.
> The heightmap is **retained for zone logic** (road routing, river tracing, colour splat zones)
> but the visual mesh is **flat** (Y = 0). All buildings, roads, and trees sit on a flat plane.
> This suits the isometric camera and removes a whole class of alignment complexity.

### Core systems built
- [x] `TerrainGenerator.ts` — seeded FBM noise + domain warp + valley profile (heightmap for logic)
- [x] `TerrainMesh.ts` — flat ground mesh with height-zone vertex colour splat
- [x] `RiverSystem.ts` — valley floor trace; river path used for mesh + road avoidance
- [x] `WaterBodies.ts` — ribbon mesh along river, translucent blue-grey material
- [x] `RoadNetwork.ts` — binary heap Dijkstra A* on heightmap cost + side streets
- [x] `Parcel.ts` — building slot strips on both sides of every road edge
- [x] `BuildingPlacer.ts` — instanced colour-coded placeholder boxes
- [x] `VegetationPlacer.ts` — cone-tree instances by height zone
- [x] `WorldGenerator.ts` — orchestrator; tweakpane seed/valley/hilliness/trees/⟳ Regenerate
- [x] `Seeder.ts` — mulberry32 PRNG for reproducible generation

### ✅ Phase 1 Tests — 33/33 passing

---

## fix/flat-terrain — Terrain Visual Rework *(next)*
*Goal: Replace variable-height terrain mesh with a flat plane. Visual interest comes from
colour zones and objects, not altitude. Suits the isometric camera perfectly.*

### Why flat terrain?
- Variable altitude terrain does not translate well to isometric view at normal zoom levels
- Buildings sitting at different elevations cause alignment complexity
- Roads over hills require complex mesh work for minimal visual payoff
- The British village aesthetic is **gently rolling**, not mountainous — the sensation
  of landscape comes from textures, hedges, field boundaries, and light, not polygon height

### What changes
- [ ] `TerrainMesh.ts` — all Y vertices = 0; heightmap data used only for vertex colour zones
- [ ] `RiverSystem.ts` — river Y = 0 (tiny offset 0.02 to avoid z-fighting)
- [ ] `WorldGenerator.ts` — roads and buildings always placed at Y = 0
- [ ] `BuildingPlacer.ts` — remove terrain height sampling; all at Y = 0
- [ ] `VegetationPlacer.ts` — all trees at Y = 0

### What stays the same
- `TerrainGenerator.ts` — unchanged; heightmap still drives zone classification + road routing
- `RoadNetwork.ts` — unchanged; A* cost still uses height as a proxy for "valley preference"
- All tests — logic tests pass unchanged since heightmap logic is untouched

### Deliverable
A flat, colour-zoned world where the valley shape is expressed through colour gradients
and object placement rather than geometry altitude.

---

## Phase 2 — Atmosphere
*Goal: The world looks beautiful. Time of day and weather are working.*

### Day/Night Cycle
- [ ] Sun position calculation from time of day
- [ ] Babylon.js Physically Based Atmosphere integration
- [ ] Ambient light colour temperature shift (warm dawn → cool noon → golden afternoon → deep night)
- [ ] Directional light angle + intensity driven by sun position
- [ ] Fog density variation (morning mist, clear midday, evening haze)

### Weather
- [ ] Weather state machine (Clear → Cloudy → Rain → Heavy Rain → Storm)
- [ ] Season biases on weather transition probabilities
- [ ] Rain particle system (directional, density tied to state)
- [ ] Rain puddle accumulation on road material (shader blend)
- [ ] Fog state implementation (exponential fog density control)
- [ ] Snow particles + ground accumulation texture blend (winter only)
- [ ] Wind: particle direction, tree sway (simple bone animation)

### Lighting
- [ ] Window light emission at night (interior warm glow effect)
- [ ] Street lamp placement along roads + orange point lights
- [ ] Light clustering performance check (Babylon.js clustered lighting)
- [ ] Headlight simulation for vehicles (later — placeholder for now)
- [ ] Seasonal daylight hours (long summer days, short winter days)

### Seasonal Visual Changes
- [ ] Vegetation colour shader parameters for spring/summer/autumn/winter
- [ ] Leaf particle system (autumn shedding, spring bud burst)
- [ ] Snow coverage blending on terrain and roof geometry

### Deliverable: Walk through the world at different times and seasons — feels alive

### Phase 2 Tests
- [ ] `vitest` — Sun azimuth at hour=12 is within 5° of zenith
- [ ] `vitest` — `WeatherSystem` only transitions to valid next states per the state machine map
- [ ] `vitest` — Summer solstice daylight hours > 14h; winter solstice < 10h
- [ ] `vitest` — `WeatherSystem` never reaches Snow state when season is Summer
- [ ] Manual: step through 24 hours — sky, fog, and lighting shift correctly
- [ ] Manual: trigger rain — particles appear, road material darkens

---

## Phase 3 — Buildings
*Goal: Real procedural building geometry with interiors visible at night.*

### Building Mesh System
- [ ] Building spec data structure (footprint, storeys, style, period, type)
- [ ] Procedural facade geometry from spec:
  - Wall panels with window cutouts
  - Window frames, sills, lintels
  - Door geometry with distinct colours
  - Roof types: pitched, hipped, flat, slate/tile texture variation
- [ ] Style presets: Victorian terrace, semi-detached, bungalow, cottage, civic
- [ ] Instancing: identical specs share geometry

### Interior Glow
- [ ] Per-room window light state (on/off based on time of day + occupancy)
- [ ] Emissive material on window planes for interior glow effect
- [ ] Curtain variation (lace, drawn, blind)

### Building-Specific Details
- [ ] Church: tower/spire, arched windows, churchyard wall, graves
- [ ] Pub: hanging sign (procedural text), beer garden furniture
- [ ] School: fenced perimeter, playground, playing fields
- [ ] Shop fronts: awnings, signage geometry, display window
- [ ] Garage: forecourt, pump geometry, lit canopy at night

### Street Furniture
- [ ] Bus stop shelters
- [ ] Post boxes (red, Victorian or modern)
- [ ] Benches
- [ ] Phone boxes (where appropriate for era)
- [ ] Lamp posts (Victorian cast iron or modern concrete)
- [ ] Wheelie bins and hedges at residential properties

### Deliverable: A detailed, believable town that looks gorgeous at night

### Phase 3 Tests
- [ ] `vitest` — `BuildingSpec` 2-storey mesh is taller than 1-storey mesh
- [ ] `vitest` — Victorian terrace generates more windows per facade than bungalow
- [ ] `vitest` — Window lights are ON at hour=20, OFF at hour=03
- [ ] `vitest` — No two buildings in a parcel list have overlapping bounding boxes
- [ ] Manual: zoom in on high street at night — windows glow, lamp posts lit, pub sign visible

---

## Phase 4 — Characters
*Goal: The town is populated with moving, procedurally generated people.*

### ECS Setup
- [ ] Install and configure bitECS
- [ ] Define component schema (Position, NavAgent, Needs, Personality, Lifecycle, Activity, Appearance, Relationships)
- [ ] Web Worker setup for simulation loop
- [ ] SharedArrayBuffer transfer of ECS data to main thread (with fallback)

### Character Generation
- [ ] Name generator (culturally grounded, age-cohort aware)
- [ ] Personality seed (Big Four + ambition)
- [ ] Appearance parameter generation
- [ ] Role assignment based on available jobs + traits
- [ ] Initial relationship seeding (families, households, friendships)

### Character Mesh
- [ ] Base character mesh (low-poly humanoid, ~500 tris)
- [ ] Body type variation via morph targets or bone scaling
- [ ] Clothing variation (geometry layers for different outfit types)
- [ ] Skin tone and hair colour as material parameters
- [ ] Age visual markers (greying hair shader, posture shift)
- [ ] LOD: simplified silhouette at distance, billboard at furthest

### Animation
- [ ] Skeleton rig (minimal: spine, arms, legs, head)
- [ ] Animations: idle, walk, run, sit, stand-talk, wave
- [ ] Animation blending (walk → idle transition, speed-based blend)
- [ ] Animation Retargeting (Babylon.js 9) across different body types
- [ ] Mood-expressive posture overlay (slumped vs. upright)

### Navigation
- [ ] Nav mesh baking from world geometry
- [ ] Agent pathfinding (Babylon.js nav mesh + Recast)
- [ ] Steering: arrival, obstacle avoidance
- [ ] Road-following for commute routes
- [ ] Character speed variation by age, mood, urgency

### Deliverable: 50–100 characters moving around the town with basic schedules

### Phase 4 Tests
- [ ] `vitest` — `NameGenerator` never returns empty string for any seed + age cohort
- [ ] `vitest` — `CharacterFactory` produces unique ECS entity IDs for 500 consecutive characters
- [ ] `vitest` — All personality trait values are clamped to `[0, 1]`
- [ ] `vitest` — `MovementSystem` tick updates `Position` component when agent has a target
- [ ] `vitest` — Nav mesh path query returns length > 0 between two reachable points
- [ ] Manual: 100 characters in scene, all moving, none stuck or clipping buildings

---

## Phase 5 — Simulation
*Goal: Characters have needs, schedules, and relationships. Stories begin to emerge.*

### Time System
- [ ] `TimeSystem.ts` — clock, day, month, season, year
- [ ] Speed multiplier control (pause, ×1, ×6, ×24, ×100)
- [ ] Day/season/year transition events
- [ ] Calendar: recurring community events seeded by month

### Needs System
- [ ] Needs component decay (delta-time, per-character personality rates)
- [ ] Need urgency thresholds → schedule interruption
- [ ] Mood derivation from weighted needs
- [ ] Mood visual expression (posture, pace)

### Schedule System
- [ ] Daily template generation from role + personality
- [ ] Time-block evaluation and goal assignment
- [ ] Schedule deviation probability (weather, mood, urgency)
- [ ] Activity types: work, eat_home, eat_out, socialize, leisure, sleep
- [ ] Location resolution for each activity type

### Relationship System
- [ ] Relationship graph data structure
- [ ] Interaction trigger (proximity + relationship check)
- [ ] Interaction types: greeting, chat, conversation, argument
- [ ] Warmth score update from interactions
- [ ] Warmth decay toward neutral over time without contact

### Gossip / Information Spread
- [ ] Information entity (fact about a character or event)
- [ ] Spread probability per conversation (weighted by warmth and extroversion)
- [ ] Distortion over hops (flag: original vs. rumour)
- [ ] Decay (information fades from active circulation over time)

### Economy
- [ ] Business entity with revenue/cost model
- [ ] Daily revenue calculation from customer visits
- [ ] Business health score + closure threshold
- [ ] Employment assignment and job-seeking behaviour
- [ ] Property rent/value system
- [ ] Economic event triggers (business closure, new opening)

### Lifecycle
- [ ] Age advancement (time × lifecycle rate)
- [ ] Birth events (partnered characters, probability-weighted)
- [ ] New child entity creation with heritable traits
- [ ] Death probability model (age + health)
- [ ] Death event consequences (mood hit, funeral event, house vacancy)
- [ ] Character emigration (young adults who leave town)

### Deliverable: A self-running simulation where following a character for 30 minutes tells a story

### Phase 5 Tests
- [ ] `vitest` — `NeedsSystem` hunger value decreases after N ticks without eating
- [ ] `vitest` — `NeedsSystem` hunger is capped at 1.0 and never goes below 0
- [ ] `vitest` — Mood derivation produces lower value when multiple needs are critical
- [ ] `vitest` — `ScheduleSystem` assigns a goal for every active character each day
- [ ] `vitest` — Relationship warmth between two characters increases after a positive interaction
- [ ] `vitest` — Gossip information reaches 3 hops after sufficient conversation events
- [ ] `vitest` — Business revenue = 0 when zero customers visit in a day
- [ ] Manual: follow one character for 10 sim-minutes — watch them eat, work, socialise

---

## Phase 6 — UI
*Goal: Clean, warm UI that reads the world back to you without getting in the way.*

### Core UI Framework
- [ ] Svelte 5 UI scaffold mounted over canvas
- [ ] EventBus (`EventBus.ts`) connecting Babylon.js simulation → Svelte reactivity
- [ ] Theme system (time-of-day tint, dark/light mode)

### Top Bar
- [ ] Clock display (day, date, time)
- [ ] Season + weather indicator
- [ ] Speed controls (pause, play, accelerate presets)
- [ ] World name display
- [ ] Settings gear icon

### Minimap
- [ ] Render terrain heightmap as greyscale relief
- [ ] Road overlay
- [ ] Camera frustum indicator
- [ ] Character dot (when following)
- [ ] Click-to-pan functionality

### Character Panel
- [ ] Name, role, age display
- [ ] Current activity status text
- [ ] Needs bar visualisation (5 bars)
- [ ] Mood indicator
- [ ] Relationships list (partner, family, friends, rivals)
- [ ] Today's schedule list
- [ ] Follow / History / Family buttons

### Character History View
- [ ] Timeline of notable life events
- [ ] Scrollable, minimal visual design

### Family Tree
- [ ] Reactive graph of family relationships
- [ ] Clickable nodes to jump to a character

### Event Log
- [ ] Scrolling ticker of world events
- [ ] Colour-coded by category (weather, character, economic, notable)
- [ ] Filter by category toggle

### Settings Panel
- [ ] Simulation settings (speed, population, seed)
- [ ] Visual settings (quality, DOF, motion blur, time lock)
- [ ] Audio settings (ambient, character sounds, music)
- [ ] Accessibility (UI scale, text size, colour blind mode)

### Camera Mode HUD
- [ ] Mode switcher icons
- [ ] Smooth transition animation between modes

### Deliverable: A complete, polished UI that feels like part of the world

### Phase 6 Tests
- [ ] `vitest` — `EventBus` delivers events to all registered Svelte subscribers
- [ ] `vitest` — `EventBus` does not deliver events to unsubscribed listeners
- [ ] `vitest` — Clock display formats `{ day: 1, hour: 9, minute: 5 }` as `"Mon 09:05am"`
- [ ] `vitest` — Minimap pixel at world origin maps to canvas centre
- [ ] Manual: open character panel, follow a character, watch their needs and schedule update live
- [ ] Manual: UI dims correctly at night; top bar readable in all weather states

---

## Phase 7 — World Events & Emergence
*Goal: The world surprises you. Events cascade. Stories reach conclusions.*

### Natural Events
- [ ] Flood trigger (rainfall threshold over low-lying area)
- [ ] Road damage system (flood closes bridge → road graph update)
- [ ] Emergency response characters (ambulance, fire, council workers)
- [ ] Weather event visual intensification (storm particles, flooding shader)
- [ ] Recovery: construction crew spawns on damaged infrastructure

### Community Events
- [ ] Calendar event system (rugby match, Christmas market, fête, etc.)
- [ ] Crowd gathering behaviour at event locations
- [ ] Event-specific props (market stalls, match programme vendor)
- [ ] Event audio (crowd sounds, brass band, fireworks)

### Political Events
- [ ] Council election trigger (calendar-based)
- [ ] Candidate generation from among characters
- [ ] Issue generation from current world problems
- [ ] Vote simulation across population (personality + issue salience)
- [ ] Election result affects world (e.g. planning decision, tax level)

### Economic Events
- [ ] Business closure event (health drops to zero)
- [ ] New business opening (entrepreneur + vacant premise + capital)
- [ ] Property market pressure (rising rents → displacement)
- [ ] Economic downturn trigger (cascade from closure)

### Personal Events
- [ ] Wedding event (partners + community gathering)
- [ ] Funeral event (death + mourning + community gathering)
- [ ] Birth announcement (new baby, community congratulations)
- [ ] Newcomer arrival (new character with external backstory moves in)

### Deliverable: Watch the world for an hour and be surprised at least once

---

## Phase 8 — Real Map Import
*Goal: Type in a place name, generate that place.*

### OSM Pipeline
- [ ] Overpass API query builder (bounding box from place name)
- [ ] Parse road network from OSM `highway=*` tags
- [ ] Parse building footprints from OSM `building=*`
- [ ] Parse landuse, natural, and amenity data
- [ ] Normalise to internal world format

### Elevation Data
- [ ] SRTM elevation tile fetching and caching
- [ ] Heightmap sampling from DEM at world coordinates
- [ ] Terrain mesh generation from real elevation data

### World Fitting
- [ ] Detect main road + high street from OSM data
- [ ] Assign building types from OSM amenity tags
- [ ] Fallback: generate buildings where OSM footprint data is absent
- [ ] Population scaling from residential area

### UI
- [ ] Place name search input in settings
- [ ] Loading progress indicator during OSM fetch + world generation
- [ ] Fallback to procedural if query fails / offline

### Deliverable: Type "Hay-on-Wye" and watch it come to life

---

## Phase 9 — Polish & Depth
*Goal: The game is good enough to share.*

### Audio
- [ ] Ambient soundscape system (wind, rain, birdsong, distant traffic)
- [ ] Spatial audio for character footsteps near camera
- [ ] Vehicle pass-by sounds
- [ ] Weather sound transitions (rain intensity matched to visual)
- [ ] Optional ambient score (folk/ambient music tracks)
- [ ] UI sound effects (soft, page-turn quality)

### Cinematic Camera
- [ ] `CinematicCamera.ts` — seeks interesting moments
- [ ] Drama scoring (character mood extremes, interactions, events)
- [ ] Shot composition (framing rules, depth of field)
- [ ] Hold duration and cut logic
- [ ] Smooth cut animation

### Screenshot Mode
- [ ] Hide UI toggle
- [ ] Time lock (pause clock at a specific hour for golden hour shots)
- [ ] DOF control for photography framing

### Performance
- [ ] Profile and optimise simulation worker performance
- [ ] Instance batching audit (reduce draw calls to target)
- [ ] LOD tuning for character and building meshes
- [ ] Nav mesh optimisation (agent pool, tick rate scaling)
- [ ] Memory profiling — no leaks in long sessions

### Save / Load
- [ ] Serialise full ECS state to MessagePack
- [ ] Save to IndexedDB
- [ ] Load + restore scene from save
- [ ] Multiple save slots
- [ ] World seed preserved (deterministic replay possible)

### Accessibility
- [ ] Screen reader labels on all UI elements
- [ ] Keyboard navigation for all UI panels
- [ ] Reduced motion mode (disable camera animations, weather particles)
- [ ] Colour blind assist palette

### Deliverable: A complete, shippable experience — share a link, watch someone play for 2 hours

---

## Stretch Goals (Post-Ship)

- [ ] **Mobile port** — touch controls, reduced simulation budget, simplified rendering
- [ ] **Welsh language localisation** — character names, UI, event text in Welsh
- [ ] **Historical mode** — generate a town in 1960, 1980, 2000 with appropriate buildings, vehicles, and character names
- [ ] **Photograph album** — auto-captures beautiful cinematic moments to an in-game album
- [ ] **Custom events** — player can define a custom calendar event and watch the town respond
- [ ] **Time capsule** — save a moment, return to it years later (real time), see what changed
- [ ] **Multi-town** — a valley with two towns; characters can travel between them; relationships across towns
- [ ] **The outside world** — characters who leave town still exist; occasionally they return; the player can glimpse what happened to them
