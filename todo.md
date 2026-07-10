# Hiraeth — Development Phases & Tasks

> This is a living document. Tasks move, split, and clarify as work progresses.
> Each phase should be independently playable/demonstrable.

---

## Phase 0 — Foundation
*Goal: A working canvas with a camera, a terrain, and a basic build pipeline.*

### Project Setup
- [ ] Initialise Vite + TypeScript project
- [ ] Install and configure Babylon.js 9
- [ ] Set up Svelte 5 as UI overlay with vite-plugin-svelte
- [ ] Configure `tsconfig.json` with strict mode
- [ ] Set up path aliases (`@world`, `@sim`, `@ui`, etc.)
- [ ] Add tweakpane for dev parameter controls
- [ ] Set up basic `index.html` with canvas + Svelte mount point
- [ ] Create `SceneManager.ts` — engine init, scene, WebGPU/WebGL2 selection

### Camera
- [ ] Implement `IsometricCamera.ts` — arc-rotate with constrained angle
- [ ] Mouse scroll zoom (smooth, clamped)
- [ ] Middle-click drag pan
- [ ] Q/E rotation snapping to 45° increments
- [ ] Home key to reset view
- [ ] Touch gesture support (pinch zoom, two-finger pan)

### Render Loop
- [ ] `RenderLoop.ts` with RAF loop
- [ ] Delta time tracking
- [ ] Basic performance monitor overlay (FPS, draw calls)

### Deliverable: A working camera that can orbit a placeholder scene

---

## Phase 1 — World Generation
*Goal: A generated terrain with roads, parcels, and placeholder buildings you can explore.*

### Terrain
- [ ] Simplex noise heightmap generation (simplex-noise library)
- [ ] Domain warping layer for organic variation
- [ ] Valley floor carving (low-point attraction)
- [ ] Mesh generation from heightmap using Babylon.js `VertexData`
- [ ] Material splat system (grass, rock, moorland zones by height/slope)
- [ ] Terrain parameter exposure via tweakpane (seed, valley width, hilliness)

### Water
- [ ] River channel carving from flow simulation
- [ ] River mesh generation (flat plane, follows carved channel)
- [ ] Animated water shader (normal map scroll + Fresnel reflection)
- [ ] Pond/lake generation in valley floor depressions
- [ ] Sea/coast plane (if coastal parameter enabled)

### Road Network
- [ ] Main road: optimal valley path generation (A* on heightmap cost)
- [ ] High street segment identification
- [ ] Side street branching (probabilistic, contour-following)
- [ ] Parcel generation from road graph (polygon subdivision)
- [ ] Road mesh generation (flat with markings texture)
- [ ] Pavement/kerb geometry

### Buildings (Placeholder)
- [ ] Parcel zoning assignment (residential, commercial, civic, green)
- [ ] Placeholder box meshes at parcel positions with type colour coding
- [ ] Basic instancing for repeated building mesh types

### Vegetation
- [ ] Instanced tree placement (density by terrain zone)
- [ ] Hedge/boundary geometry along parcel edges
- [ ] Grass tuft instancing on rough terrain

### World Parameters (tweakpane)
- [ ] Seed input + regenerate button
- [ ] Valley width, hilliness, coastal toggle
- [ ] Population target (affects building density)
- [ ] Regenerate updates scene in < 5 seconds

### Deliverable: A convincing procedural British valley with roads and rough building footprints

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
