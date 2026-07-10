# Hiraeth — Technology & Architecture

## Stack Decision

No editor. No engine GUI. Everything is code.

### Rendering: Babylon.js 9 + TypeScript *(confirmed)*

See `research.md` → *Tech Stack Research* for the full evaluation.

**[Babylon.js](https://babylonjs.com)** is the primary rendering engine. It's TypeScript-native, has no required GUI editor, runs in-browser via WebGL/WebGPU, and ships with exactly what Hiraeth needs:

- Physically Based Atmosphere (day/night, sunrise/sunset — built in)
- Clustered lighting (hundreds of window lights at night, street lamps — performant)
- Nav Mesh + pathfinding (character movement through streets)
- Skeletal animation + Animation Retargeting (one skeleton, many characters)
- Volumetric lighting (fog, rain light shafts, street lamp halos)
- Shadow maps, SSAO, depth of field
- Large World Rendering (no floating point jitter at scale)
- Instances for geometry (trees, windows, fence posts — one draw call)

**WebGPU** is targeted as the primary rendering backend where available, with WebGL2 fallback.

### Phase 0.5 Rendering Pipeline *(to be implemented)*

The render pipeline must be established before building assets on top of it:

```
DefaultRenderingPipeline
  ├── SSAO2            — ambient occlusion for depth and crevice darkening
  ├── Depth of Field   — tilt-shift miniature effect (focused mid-scene)
  ├── Bloom            — window glow, street lamps, emissive materials
  ├── Chromatic Aberr. — subtle lens character
  └── Vignette         — already active; refine strength

ShadowGenerator (DirectionalLight: sun)
  ├── Type: PCF (Percentage Closer Filtering) for soft shadows
  ├── Map size: 2048
  └── All building, vehicle, character, tree meshes: cast + receive

PBRMaterial (replaces StandardMaterial for all world objects)
  ├── albedo texture: procedural canvas (brick, stone, render, tarmac)
  ├── bumpTexture: canvas normal-ish effect
  ├── roughness: 0.85–0.95 (matte — no mirror reflections)
  └── metallic: 0.0 (non-metallic: brick, stone, wood, glass is separate)
```

### Language: TypeScript

Strict TypeScript throughout. The simulation logic is complex and benefits enormously from type safety. No JavaScript files.

### Build: Vite

Fast HMR for development, clean ESM output. No Webpack complexity.

### UI: Svelte 5

The UI layer (info panels, character cards, settings, minimap) is a **Svelte 5** overlay sitting atop the canvas. Svelte compiles to minimal vanilla JS with no virtual DOM overhead — ideal for a long-running simulation where GC pressure matters. The boundary between Svelte and Babylon.js is a reactive event bus.

### Simulation Core: bitECS *(Phase 4+)*

**[bitECS](https://github.com/NateTheGreatt/bitECS)** is an archetype-based Entity Component System. It operates on TypedArrays — cache-friendly, no GC, capable of simulating thousands of characters' state at 60fps in a single JS thread.

All simulation state (position, schedule, needs, relationships, mood) lives in ECS components. Babylon.js reads this state to position and animate meshes.

### Terrain: Simplex Noise + Flat Mesh

**[simplex-noise](https://www.npmjs.com/package/simplex-noise)** for seeded terrain heightmap generation. Layered octaves with domain warping produce an organic valley landscape. The heightmap is used as a **logic layer only** — for zone classification, river tracing, and road routing cost. The visual mesh is **flat (Y = 0)** across the entire world.

Visual landscape character comes from procedural ground textures (grass, tarmac, soil), vegetation placement, field boundary hedges, and lighting — not polygon height.

### Physics: Minimal / Custom

No heavy physics engine. Characters use nav mesh pathfinding + smooth steering. Vehicles follow road splines. Water is a shader effect with no physics simulation.

### Persistence: IndexedDB *(Phase 9)*

World state saved to IndexedDB via **[idb](https://www.npmjs.com/package/idb)**. Serialization uses MessagePack for compact binary saves.

### Real Map Data: Overpass API *(Phase 8)*

Queries the **OpenStreetMap Overpass API** for road networks, building footprints, landuse, and waterways when generating from a real location.

---

## Building Component Architecture *(Phase 0.5)*

Buildings are assembled from typed mesh components, not scaled boxes.

```
BuildingBlueprint {
  type:        'cottage' | 'terrace' | 'semi' | 'detached' | 'bungalow'
             | 'shop' | 'pub' | 'church' | 'civic' | 'apartment'
  floors:      number          // 1–5
  width:       number          // metres
  depth:       number          // metres
  roofStyle:   'pitched' | 'hipped' | 'mansard' | 'flat' | 'gabled'
  wallMat:     'brick' | 'stone' | 'render' | 'pebbledash'
  age:         number          // 0–1 → new to derelict
  hasChimney:  boolean
  hasBayWindow:boolean
  hasDormer:   boolean
}

BuildingComponent
  ├── WallPanel       — flat quad + procedural UV texture
  ├── WindowUnit      — frame mesh + glass + emissive night state
  ├── DoorUnit        — frame + door leaf + colour
  ├── RoofMesh        — geometry from blueprint roof style
  ├── ChimneyStack    — cylinder + pot detail
  └── FoundationBase  — wide low plinth, stone material

BuildingFactory.assemble(blueprint) → MergedMesh
```

---

## Road Architecture *(Phase 0.5)*

Roads use spline-based generation, not straight box segments.

```
RoadSpline
  ├── Waypoints: RoadNode[] from RoadNetwork A* path
  ├── Curve3.CreateCatmullRomSpline(waypoints, 10) → smooth path
  ├── RoadMesh: ribbon along spline, width per road type
  ├── PavementMesh: thinner ribbon, offset left + right
  └── JunctionMesh: intersection fill at road crossings
```

---

## Project Structure

```
hiraeth/
├── src/
│   ├── main.ts                  # Entry point, canvas + engine bootstrap
│   ├── engine/
│   │   ├── SceneManager.ts      # Babylon scene, camera, renderer config
│   │   ├── AssetLoader.ts       # Procedural mesh builders + texture gen
│   │   └── RenderLoop.ts        # Frame loop, interpolation, LOD management
│   │
│   ├── world/
│   │   ├── TerrainGenerator.ts  # Heightmap + mesh from simplex noise
│   │   ├── RoadNetwork.ts       # Road graph, spline mesh, path resolution
│   │   ├── BuildingPlacer.ts    # Constraint-based building placement
│   │   ├── BuildingMeshes.ts    # Procedural building geometry
│   │   ├── VegetationPlacer.ts  # Trees, hedges, gardens
│   │   ├── WaterBodies.ts       # Rivers, ponds, coast (shader-based)
│   │   └── WorldLoader.ts       # OSM import pipeline
│   │
│   ├── simulation/
│   │   ├── World.ts             # Top-level simulation, tick orchestration
│   │   ├── ecs/
│   │   │   ├── components.ts    # bitECS component definitions
│   │   │   └── systems/
│   │   │       ├── NeedsSystem.ts       # Hunger, rest, social, mood decay
│   │   │       ├── ScheduleSystem.ts    # Daily schedule + goal assignment
│   │   │       ├── MovementSystem.ts    # Nav mesh traversal + steering
│   │   │       ├── RelationshipSystem.ts# Social graph updates
│   │   │       ├── WorkSystem.ts        # Job logic, opening hours
│   │   │       ├── LifecycleSystem.ts   # Birth, aging, death
│   │   │       └── EventSystem.ts       # World events, emergent triggers
│   │   │
│   │   ├── CharacterFactory.ts  # Procedural character generation
│   │   ├── TimeSystem.ts        # Game clock, day/season/year
│   │   ├── WeatherSystem.ts     # Weather state machine
│   │   └── EconomySystem.ts     # Business health, employment, rent
│   │
│   ├── characters/
│   │   ├── CharacterMesh.ts     # Procedural character geometry + skinning
│   │   ├── AnimationController.ts# State machine for walk/idle/sit/etc.
│   │   └── NameGenerator.ts     # Culturally-grounded name generation
│   │
│   ├── atmosphere/
│   │   ├── DayNightCycle.ts     # Sun position, ambient colour, fog
│   │   ├── WeatherRenderer.ts   # Rain particles, snow, fog density
│   │   └── LightingSystem.ts    # Street lamps, window lights, headlights
│   │
│   ├── camera/
│   │   ├── IsometricCamera.ts   # Default view, zoom, pan
│   │   ├── FollowCamera.ts      # Character-locked third/first person
│   │   └── CinematicCamera.ts   # Auto-camera for interesting moments
│   │
│   ├── ui/                      # Svelte components
│   │   ├── App.svelte
│   │   ├── HUD.svelte
│   │   ├── CharacterPanel.svelte
│   │   ├── Minimap.svelte
│   │   ├── Timeline.svelte
│   │   └── Settings.svelte
│   │
│   └── utils/
│       ├── EventBus.ts          # Engine ↔ UI communication
│       ├── Seeder.ts            # Deterministic RNG (mulberry32)
│       └── Serializer.ts        # Save/load via IndexedDB
│
├── public/
│   └── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Architecture

### Two Loops, One World

```
Simulation Loop (fixed timestep, Web Worker)
  └── ECS systems tick at 1/60s sim time
  └── Time advances: seconds, hours, days, seasons, years
  └── Characters decide, move (logical positions), change state
  └── Events fire, relationships update, economy ticks

Render Loop (RAF, main thread)
  └── Reads ECS state, interpolates positions
  └── Updates Babylon.js mesh transforms
  └── Drives atmosphere (sun, weather, lighting)
  └── Runs character animations
  └── Renders frame
```

The simulation runs in a **Web Worker** so heavy AI/schedule computation never blocks rendering. ECS arrays are transferred via `SharedArrayBuffer` where supported, with a message-based fallback.

### ECS Component Design

Each character is an ECS entity with components:

```typescript
// Position in world space (read by renderer)
Position: { x, y, z }

// Navigation state
NavAgent: { targetX, targetZ, speed, pathIndex }

// Needs (0–1 scale, decay over time)
Needs: { hunger, fatigue, social, bladder, comfort }

// Personality traits (seeded, immutable)
Personality: { introversion, conscientiousness, warmth, ambition, temper }

// Life state
Lifecycle: { age, stage, health, isAlive }

// Current activity
Activity: { type, locationId, duration, startTime }

// Social
Relationships: { friendIds[], familyIds[], romanceId, rivalIds[] }

// Rendering hints (read by mesh system)
Appearance: { bodyScale, skinTone, hairStyle, clothingId }
```

### Rendering Approach

**Instanced meshes** for everything repeated: fence posts, trees, parked cars, bus stop poles. One draw call per mesh type regardless of count.

**Buildings** are procedurally generated from a spec (footprint, storeys, style, period). The geometry is created once per unique spec and instanced. Windows, doors, and roof details are generated in the vertex shader.

**Characters** share a single base skeleton. Animation Retargeting (Babylon.js 9) means all characters run the same animation library regardless of their body proportions.

**LOD**: At wide zoom, characters become simplified meshes or billboard sprites. Buildings shed detail. Vegetation becomes a flat colour. This is managed by Babylon.js's built-in LOD system.

**Render pipeline**:
1. Depth pre-pass
2. Opaque geometry (terrain, roads, buildings)
3. Transparent (water, windows with interior light)
4. Characters (skinned, with shadow casting)
5. Particles (rain, snow, smoke, dust)
6. Post-process: SSAO, depth of field, colour grade, vignette

### Time & Simulation Scale

Game time runs at a configurable ratio (default: 1 real minute = 1 game hour). The simulation supports:

- **Real-time**: immersive street-level watching
- **Accelerated** (up to 24× speed): watch a full day in an hour
- **Time-lapse** (100×+): watch seasons change, children grow up

All ECS systems use delta-time and are deterministic. Fast-forward is achieved by ticking the simulation loop more frequently, not skipping frames.

### World Generation Pipeline

```
1. Seed → noise parameters
2. Generate heightmap (simplex, domain warped)
3. Flow simulation → river channels
4. Road network from valley floor + cost graph
5. Parcel subdivision along roads
6. Building type assignment (zoning rules)
7. Building geometry generation
8. Vegetation, props, street furniture
9. Character seeding (population size, age distribution)
10. Initial relationship seeding (families, friendships, colleagues)
11. Economic bootstrap (who works where, opening stock)
```

OSM import replaces steps 2–6 with parsed real-world geometry, then continues from step 7.

---

## Performance Targets

| Metric | Target |
|---|---|
| Population | 300–800 active characters |
| Draw calls | < 300 per frame |
| 60fps | At 1080p on mid-range hardware (integrated GPU) |
| Save/load | < 2s for full world state |
| Generation | < 5s for full world from seed |

---

## Dependencies (package.json sketch)

```json
{
  "dependencies": {
    "@babylonjs/core": "^9.x",
    "@babylonjs/gui": "^9.x",
    "@babylonjs/havok": "^1.x",
    "bitecs": "^0.3.x",
    "simplex-noise": "^4.x",
    "idb": "^8.x",
    "svelte": "^5.x",
    "@msgpack/msgpack": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@sveltejs/vite-plugin-svelte": "^3.x",
    "typescript": "^5.x",
    "tweakpane": "^4.x"
  }
}
```
