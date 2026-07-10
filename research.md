# Hiraeth — Research & References

A living document. Add to this as the project develops.

---

## POC Tech Stack Evaluation

Two candidates. We build a POC for each, then pick one. No guessing.

The POC spec is the same for both stacks:
- 10 building types with proper geometry (no boxes)
- Isometric orthographic camera, smooth zoom
- Window emissive lighting — off by day, warm glow at night
- Street lamp point lights
- Day/night cycle (sun arc, light colour shift)
- Weather: rain particles + mist/fog
- Town assets: park, playground, roads with pavements
- Modern UI: asset picker panel + world view, built on a real component library

---

### Candidate A — Three.js + React Three Fiber

**The stack:**
```
Three.js r170+               — core WebGL/WebGPU renderer
@react-three/fiber           — declarative React renderer for Three.js
@react-three/drei            — camera, shadows, environment, helpers
@react-three/postprocessing  — SSAO, DOF, bloom, noise, vignette
zustand                      — lightweight scene state
React 19 + Vite 6
shadcn/ui + Tailwind v4      — UI component layer
```

**Why this is worth POCing:**

The "cozy isometric" aesthetic has been solved many times by the R3F community.
The reference games in this genre (Townscaper-likes, low-poly village scenes, cozy
3D) almost universally trace back to Three.js or R3F implementations. There is a
known recipe and a large body of working examples to reference.

Key capabilities relevant to Hiraeth:
- `<OrthographicCamera>` from drei — isometric view is trivial, zoom is a prop
- `<SoftShadows>` from drei — accumulation-based soft shadows, the single biggest
  visual upgrade possible; used in almost every "warm cozy" Three.js scene
- `<Environment>` — HDR environment map lighting, wraps the scene in ambient colour
- `<InstancedMesh>` — one draw call for hundreds of identical assets (trees, fences)
- `@react-three/postprocessing` ships SSAO, DepthOfField, Bloom, Noise, ChromaticAberration,
  TiltShift — all composable, all pre-written, just configure
- `MeshStandardMaterial` / `MeshPhysicalMaterial` — full PBR
- React component model: a `<Building type="cottage" />` component that owns its
  own geometry, materials, animations (window glow) is the natural way to build this

The UI story is unbeatable: React + shadcn/ui produces genuinely beautiful, modern,
accessible UI with near-zero effort. An asset picker with tabs, sliders for time-of-day,
a world/single-asset toggle — all done in one afternoon.

**Risks:**
- No built-in nav mesh (will need `recast-navigation-js` or similar in Phase 4+)
- No built-in skeletal animation retargeting (manageable, Three.js has AnimationMixer)
- Slightly more boilerplate for complex shadow setups vs Babylon's DefaultRenderingPipeline

---

### Candidate B — Babylon.js (direct TypeScript API)

**The stack:**
```
@babylonjs/core 9.x          — full-featured 3D engine
@babylonjs/materials         — PBR extensions, sky material
@babylonjs/post-processes    — DefaultRenderingPipeline (SSAO2, DOF, bloom)
React 19 + Vite 6            — UI layer (React overlay on canvas)
shadcn/ui + Tailwind v4      — UI component layer
```

**Why this is worth POCing:**

Babylon.js is more batteries-included: nav mesh (Recast.js built in), skeletal
animation retargeting, physically-based atmosphere, clustered lighting, WebGPU
first-class. For the full simulation (Phase 4+: hundreds of characters on nav mesh),
this matters.

Key capabilities:
- `DefaultRenderingPipeline` — SSAO2, DOF, bloom, image processing, vignette
- `ShadowGenerator` with PCF filtering
- `PBRMaterial` — metallic/roughness + clearcoat + subsurface
- `SkyMaterial` — procedural sky with sun position
- Clustered forward lighting — handles hundreds of point lights (street lamps at night)
- `HavokPlugin` or `CannonJSPlugin` for future physics

**Risks:**
- Previous POC using Babylon.js produced grey boxes — but that was misuse, not the engine
- Less community art direction for "cozy isometric" — fewer worked examples to reference
- React/Svelte overlay pattern for UI is more awkward than native R3F (canvas is opaque,
  UI lives on top, state sharing requires a separate event bus)
- API surface is large and verbose; easy to do the wrong thing

---

### Decision Matrix

| Criterion | Stack A (R3F) | Stack B (Babylon.js) |
|---|---|---|
| Cozy 3D aesthetic — community examples | ★★★★★ | ★★★ |
| Soft shadows quality / ease | ★★★★★ | ★★★★ |
| Post-processing (SSAO, bloom, DOF) | ★★★★★ | ★★★★ |
| Component-based building system | ★★★★★ (native) | ★★★ (manual) |
| UI integration (shadcn/ui) | ★★★★★ (same tree) | ★★★ (overlay) |
| Day/night cycle examples | ★★★★★ | ★★★★ |
| Weather (particles, fog) | ★★★★ | ★★★★ |
| Performance (instancing) | ★★★★★ | ★★★★★ |
| Nav mesh (Phase 4+) | ★★★ (addon needed) | ★★★★★ (built in) |
| Skeletal anim retargeting (Phase 3+) | ★★★ (addon) | ★★★★★ (built in) |
| TypeScript quality | ★★★★★ | ★★★★ |
| Dev ergonomics / iteration speed | ★★★★★ | ★★★ |

**POC-specific verdict (appearance + UI):** Stack A wins clearly.
**Full-game verdict (simulation depth):** Stack B wins on built-ins.

The bet: build the POC in Stack A. If visual quality and UI meet the bar, adopt R3F
for the main project and accept that nav mesh + retargeting need addons. Both addons
exist and are maintained. If Stack A POC fails to feel alive and warm, Stack B is there.

---

### Visual Reference: What "Cozy" Means Technically

**Townscaper** (Stålberg, 2021):
- Simple geometry + perfect **soft shadows** + warm palette = extremely cozy
- Key: every surface edge is beveled; soft directional light from one high angle; no specular
- Lesson: *it is the shadows and the bevel. Full stop.*

**Tiny Glade** (Pounce Light, 2024):
- Real-time mesh growth; stone/wood procedural materials; GI baked per-frame
- Lesson: *material quality — roughness variation across a surface — makes it feel physical*

**A Short Hike** (Robinson-Yu, 2019):
- Dithered rendering, warm palette, 3D but illustrated feel
- Lesson: *art direction is a decision, not an accident — commit to a specific filter*

**Mini Motorways** (Dinosaur Polo Club, 2021):
- Technically "flat" but strong directional shadow and warm ground colour
- Lesson: *even minimal design reads as place because of shadow depth*

**Concrete lessons for the POC:**
1. Soft shadows are the single highest-impact thing. Ship nothing without them.
2. A beveled/chamfered edge on every building reads as "crafted", not "debug box"
3. The emissive window glow at night is load-bearing for the "life" feeling — it's what makes you feel someone is home
4. Ground material (grass texture, path gravel, road tarmac) is what makes a scene read as a real place, not a grey plane
5. Weather (rain, overcast light, wet ground reflection) transforms mood completely
6. The UI must feel like the game — warm, slightly aged, unhurried

---

## The Name

**Hiraeth** (Welsh, noun): A deep homesickness or longing; a grief for the loss of something, or for something that may never have been. A sense of incompleteness or imperfection. It is distinct from nostalgia in that it contains within it an acknowledgement that the past — or the imagined past — cannot be returned to.

> *"Hiraeth is the word for a homesickness for a home to which you cannot return, a home which maybe never was; the nostalgia, the yearning, the grief for the lost places of your past."*

The name is not incidental. The game is *about* hiraeth — watching a world of ordinary warmth from the outside, unable to enter it fully, feeling the pull of it.

---

## Inspiration & Precedents

### Games

**Dwarf Fortress** (Bay 12 Games, 2006–)
- The gold standard for emergent simulation from simple rules
- Characters with procedural histories, relationships, skills, and mental states
- Systems interact in ways the designers didn't fully anticipate → stories emerge
- Reference specifically: the way DF generates histories retroactively at world creation
- Ref: https://www.bay12games.com/dwarves/

**The Sims** (Maxis, 2000–)
- The prototype for the needs-based character loop (Maxis called it "Motives")
- The voyeuristic pleasure of watching simulated people — even without control, there's drama
- Reference: original Sims AI design papers by Will Wright and team
- Ref: Wright, W. (1999). *The Sims: Game Design*

**RimWorld** (Ludeon Studios, 2018)
- Tynan Sylvester's "Storyteller" AI — difficulty tuned to maintain dramatic tension
- The idea that a simulation should generate *stories*, not just events
- Ref: Sylvester, T. (2013). *Designing Games: A Guide to Engineering Experiences*

**Cities: Skylines** (Colossal Order, 2015)
- Reference for traffic simulation, transport networks, city growth
- NOT what Hiraeth is trying to be — too macro, too managerial
- But useful as a contrast: what happens when you make it intimate rather than civic

**Stardew Valley** (ConcernedApe, 2016)
- Visual warmth and tonal register — how a small world can feel emotionally significant
- The named NPC with routines model — even without full simulation, specificity matters
- Reference aesthetic: warm interiors, seasonal transitions, community calendar

**A Short Hike** (Adam Robinson-Yu, 2019)
- Tiny game. Huge feeling. Characters who feel complete in their smallness.
- Reference for character dialogue tone — unpretentious, honest, quietly funny

**Curious Expedition** (Maschinen-Mensch, 2016)
- Procedural character generation and narrative emergence at small scale
- Good reference for how to make generated characters feel authored

**SimCity 4** (Maxis, 2003) / **SimCity 2000**
- The earlier, more human-scaled versions. The feeling of a real place.
- SimCity 2000's isometric projection and intimate scale is a reference

**Townscaper** (Oskar Stålberg, 2021)
- Pure aesthetic reference. The way a simple grid produces complex organic-feeling forms.
- Not a simulation — but a feeling. Architecture that looks lived-in.

**Endling** (Herobeat Studios, 2022)
- Reference for emotional register: a world you can't save, but you bear witness to
- The intimacy of following one thread through a larger world

---

### Films & Television

**Twin Peaks** (Lynch, 1990)
- The small town where everyone knows everyone, and underneath the ordinary is the extraordinary
- The value of specificity — real diner, real coffee, real drapes — as grounding

**Local Hero** (Forsyth, 1983)
- A small Scottish coastal village. The pull of it. The warmth of it. The strangeness of encountering a whole world that exists entirely independently of you.
- "What's keeping you here?" — the question at the heart of hiraeth

**Whisky Galore!** (Mackendrick, 1949)
- Community as protagonist. The ensemble cast of a small place.

**The Detectorists** (Inman, 2014–2022)
- The quiet dignity of small lives. The richness of ordinary people paying attention to ordinary things.
- Tonal reference for Hiraeth — what the *feeling* of it should be

**Broadchurch** (Chibnall, 2013)
- A small coastal town under pressure. The community as a system of relationships that a single event can rupture.

**Last of the Summer Wine** (Clarke, 1973–2010)
- Long observation of small-town routines. The way the same roads get walked every day by the same people.

---

### Literature

**Under Milk Wood** — Dylan Thomas (1954)
- A Welsh town. One day. Everyone's inner life visible. The extraordinary in the ordinary.
- *"It is spring, moonless night in the small town, starless and bible-black"*
- Direct tonal reference.

**H is for Hawk** — Helen Macdonald (2014)
- Not about a town, but about grief, observation, and the particular quality of the British landscape
- Reference for how to write about watching something small with great seriousness

**Akenfield** — Ronald Blythe (1969)
- An oral history of a Suffolk village. Generations of ordinary lives recorded with care.
- The model for why small lives deserve documentation.

**The Old Ways** — Robert Macfarlane (2012)
- British landscape writing. The idea of landscape as memory and longing.

---

## Technical References

### Simulation & AI

**Procedural Content Generation in Games** — Shaker, Togelius, Nelson (2016)
- Comprehensive textbook. Free online: http://pcgbook.com/
- Especially: Chapter 3 (Random generators), Chapter 5 (Grammar-based), Chapter 9 (Population simulation)

**Simulating Social Structures** — various
- **Believable Agents** — Mateas & Stern (2003): drama management in character simulation
- **Generating Fictional Characters with Realistic Social Behaviors** — academic work on social simulation for games
- Ref: Millington, I. & Funge, J. (2009). *AI for Games*. Morgan Kaufmann.

**Agent-Based Modelling**
- NetLogo (https://ccl.northwestern.edu/netlogo/) — for prototyping social simulation rules
- Mesa (https://mesa.readthedocs.io) — Python agent-based modelling; good for testing schedule/needs systems offline
- Schelling segregation model — relevant to how economic pressure creates residential change
- Axelrod's culture model — relevant to how cultural traits spread through social networks

**Narrative Emergence**
- James Lester, et al. — computational narrative research
- Hartswood, M. (2020). *Generative Narrative Systems*
- Kreminski, M. & Martens, C. (2018). *Generators for Emergent Stories*. ICIDS

### Terrain Generation

**The Book of Shaders** — Vivo & Lowe: https://thebookofshaders.com/
- GLSL shader fundamentals including noise and fractal brownian motion
- Reference for terrain shader development

**Procedural Terrain Generation** — Sebastian Lague (YouTube):
https://www.youtube.com/playlist?list=PLFt_AvWsXl0eBW2EiBtl_sxmDtSgZBxB3
- Excellent practical reference for mesh heightmap generation, erosion, biomes

**Domain Warping** — Inigo Quilez:
https://iquilezles.org/articles/warp/
- The technique for non-repeating, organic noise — critical for terrain authenticity

**Hydraulic Erosion Simulation** — Hans Theobald Beyer (2016)
- https://www.firespark.de/resources/downloads/implementation%20of%20a%20methode%20for%20hydraulic%20erosion.pdf
- For river channel carving and natural slope formation

### Navigation & Pathfinding

**Recast & Detour** — Mikko Mononen
- The nav mesh library most engines build on
- Babylon.js 9 ships with nav mesh based on this approach
- Ref: https://github.com/recastnavigation/recastnavigation

**Steering Behaviours** — Reynolds (1987)
- Arrival, seek, flee, separation, flocking — the primitives of believable character movement
- Ref: Reynolds, C. W. (1987). *Flocks, Herds, and Schools: A Distributed Behavioral Model*

### Rendering & Visual Design

**Physically Based Rendering** — Pharr, Jakob, Humphreys (4th ed., 2023)
- Full PBR theory — free online at https://www.pbr-book.org/
- Reference for understanding what Babylon.js's PBR materials are doing

**Real-time Rendering** — Akenine-Möller et al. (4th ed.)
- Industry reference for rendering techniques

**Babylon.js 9.0 Documentation**
- Physically Based Atmosphere: https://aka.ms/babylon9ATMDoc
- Nav Mesh: https://aka.ms/babylon9NMDoc
- Animation Retargeting: https://aka.ms/babylon9ARDoc
- Clustered Lighting: https://aka.ms/babylon9CLDoc

### Data Sources

**OpenStreetMap / Overpass API**
- https://overpass-turbo.eu/ — query builder
- https://wiki.openstreetmap.org/wiki/Overpass_API
- Rate limits apply; cache aggressively for world generation

**SRTM / Copernicus DEM**
- Elevation data for real-world terrain
- SRTM: 30m resolution, global, free: https://earthexplorer.usgs.gov/
- Copernicus GLO-30: better resolution in Europe

**UK Ordnance Survey Open Data**
- Open Roads, Open Greenspace, Open Names datasets
- Better UK road and settlement data than OSM in some areas
- https://www.ordnancesurvey.co.uk/products/os-open-data

---

## Cozy / British Aesthetic References

**Photography**
- Martin Parr: British social documentary — the particular mundanity of everyday life
- Fay Godwin: British landscape photography, the emptiness and drama of upland Britain
- Tony Ray-Jones: 1960s England; beach scenes; community; cheerful sadness

**Music**
- The Decemberists — narrative folk, small lives
- Richard Thompson — English folk-rock, the texture of ordinary British life
- Elbow — northern English warmth, urban but tender
- Boards of Canada — nostalgic ambient, the feeling of looking at old photographs
- Ólafur Arnalds — contemporary ambient composition, seasons
- John Surman — British jazz, pastoral, reflective

**Visual Art**
- L.S. Lowry: industrial British townscapes; the ant-colony quality of people going about their days
- Eric Ravilious: English pastoral, watercolour, clarity and calm
- David Gentleman: illustration style — clear line, warm colour, the specific detail of a specific place

---

## ECS & Performance

**bitECS documentation**: https://github.com/NateTheGreatt/bitECS
- Why TypedArrays: CPU cache efficiency, no GC pressure
- Reference for component design and system scheduling

**ECS FAQ** — Sander Mertens: https://github.com/SanderMertens/ecs-faq
- Comprehensive overview of ECS approaches, tradeoffs, patterns

**"Building an ECS"** — Michele Caini (entt author):
https://skypjack.github.io/2019-02-14-ecs-baf-part-1/
- Deep theory; useful for understanding what the library is doing

---

## Notes & Open Questions

- [ ] What's the right population cap before simulation becomes too expensive? Need to profile.
- [ ] How do we handle characters who leave town — they need to not be fully simulated but still tracked in the relationship graph
- [ ] Real map import: what do we do with places that don't have a recognisable small-town structure? (e.g. urban suburbs)
- [ ] Cultural setting: while the default is British Isles, could the generation be parameterised for other European town types (Dutch, Portuguese, Norwegian)?
- [ ] The gossip/information spread model needs research — look at epidemiological SIR model as structural analogy
- [ ] For the OSM import: need to decide on fallback behaviour when building footprints are absent (most rural areas have no footprint data)
- [ ] Investigation needed: Babylon.js nav mesh baking at load time vs. precomputed — performance implications for world generation
