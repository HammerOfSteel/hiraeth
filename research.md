# Hiraeth — Research & References

A living document. Add to this as the project develops.

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
