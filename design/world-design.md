# Hiraeth — World Design

## The Shape of a Place

Hiraeth worlds feel like somewhere in the **upland fringes of Britain** — a town in a valley, or tucked into a coastal headland, or spread along a river that bends at the bottom of a hill. Not flat. Not uniform. Specific.

The visual reference points are the **Welsh Marches**, the **Scottish Borders**, the **North Yorkshire moors**, the **Pembrokeshire coast** — places with character, elevation, weather, and a built environment that accrued over centuries rather than being planned at once.

---

## Terrain Generation

### Heightmap

Generated with layered **simplex noise + domain warping** to produce organic, non-repeating terrain. Default parameters create:

- A central **valley floor** (river corridor, lowest point)
- **Hillsides** on either flank, steeper on one side than the other
- **Uplands** beyond — rough pasture, rocky outcrops
- A **ridgeline** at the edge of the map — the horizon

Parameters exposed to the player:
- `valleyWidth` — narrow gorge vs. broad agricultural valley
- `hillSteepness` — gentle rolling vs. dramatic escarpment
- `peakElevation` — max height above valley floor
- `coastline` — boolean; adds a cliff/beach edge at map boundary
- `riverCount` — 1 main river, optionally secondary tributaries

### Rivers

Rivers are carved via a simple **flow simulation**: water flows downhill from heightmap until it reaches the map edge or a defined sink. Rivers carve shallow channels into the terrain mesh. They are rendered as a **shader-effect surface** (animated normal map, reflective) rather than simulated fluid.

Rivers affect:
- Road routing (bridges, fords)
- Building placement (flood plain exclusion zones)
- Visual character (light reflection, mist near water in mornings)
- Economic life (fishing, the pub near the bridge)

### Terrain Texture

Terrain is blended between material zones using a **splat map** derived from height and slope:

| Zone | Height / Slope | Visual |
|---|---|---|
| River channel | Lowest, flat | Dark mud, pebble, shallow water |
| Valley floor | Low, gentle | Grass, some pavement/tarmac near roads |
| Farmland | Mid, gentle | Divided fields (fence lines, hedges) |
| Hillside | Mid, steeper | Rough grass, bracken, heather |
| Rocky outcrop | High slope | Stone, sparse vegetation |
| Upland | High, flatter | Moorland, peat, tussock grass |
| Coastal cliff | Steep edge | Rock face, chalk or sandstone |

Vegetation is scattered as **instanced geometry** (no billboards) — grass tufts, gorse, bracken, oak, ash, hawthorn hedges. Density varies by zone.

---

## Settlement Structure

### How Towns Grow (in generation terms)

1. **The spine**: the main road follows the valley floor or the best route between two points. This is the first thing generated.
2. **The core**: at the valley junction, river crossing, or highest-density area — this is where the church, pub, and market square sit.
3. **The terraces**: residential streets branch from the spine, following the contour lines. Older terraces are stone; newer estates are brick; bungalows fill interstitial gaps.
4. **The edges**: allotments, a small industrial unit, a petrol station, the school with its playing fields.
5. **Outliers**: a farmhouse on the hillside, a cottage at the end of a track, a renovated barn.

### Parcellation

The land is divided into **parcels** using a road-network-guided algorithm:
1. Main roads defined
2. Side streets added (probabilistic branching, contour-following)
3. Parcels are the polygons between road edges
4. Parcel type assigned by zoning rules (proximity to centre, size, existing neighbours)

---

## Building Types

### Residential

| Type | Character | Detail |
|---|---|---|
| **Victorian terrace** | 2–3 storey, narrow, stone or brick, bay window, small front yard | Most common housing stock; forms the backbone of residential streets |
| **Semi-detached** | 1930s–50s; more space; garden front and back | Mid-century suburban expansion |
| **Bungalow** | Single storey; post-war; often occupied by elderly characters | Fills gaps on estate edges |
| **New-build estate** | Modern detached/semi; brick; cul-de-sac layout | On the outskirts; young families |
| **Stone cottage** | Pre-Victorian; irregular shape; low ceilings; rural fringe | Character richness; often isolated |
| **Converted barn** | Large; rural; occupied by wealthier or artistic types | Single building, notable presence |
| **Flat above shop** | In the high street core | Some characters live above their place of work |

Each house has:
- A **front door** (distinct colour, generated)
- **Windows** with curtains or blinds (light visible at night)
- A **back garden** (accessible by character)
- A **car** parked on street or driveway (matches character's income)

### Civic

| Building | Notes |
|---|---|
| **Church** | Stone; tower or spire; churchyard with graves; central position |
| **School** | Functional brick building; playing fields attached; fenced |
| **Kindergarten / Nursery** | Colourful; smaller; near residential |
| **Library** | Civic red-brick or 1960s concrete; small car park |
| **Surgery / Health centre** | 1970s–80s; adjacent car park; functional |
| **Post office** | Often combined with small general store |
| **Council offices** | If large enough — otherwise just a council chamber |
| **Police station** | Small; often combined with community space in smaller towns |
| **Village hall / Community centre** | Multi-purpose; used for events |

### Commercial

| Building | Notes |
|---|---|
| **Pub** | Stone or brick; hanging sign; beer garden if space; central |
| **Café** | Ground floor of older building; small exterior seating |
| **Restaurant** | Converted shopfront; evenings only or lunch service |
| **Chip shop / Takeaway** | Often near the school end of high street |
| **Newsagent** | Small; often older building; cluttered window |
| **Pharmacy** | Clean shopfront; green cross sign |
| **Butcher / Baker / Greengrocer** | Traditional high street trade; may be combined |
| **Supermarket** | Only in larger towns — a Co-op or Spar; otherwise absent |
| **Hairdresser / Barber** | Narrow shopfront; usually a converted house |
| **Garage / Petrol station** | On main road exit; forecourt |

### Sports & Recreation

| Space | Notes |
|---|---|
| **Rugby pitch** | Marked field; posts; small stand or touchline rail |
| **Cricket ground** | Flatter land; pavilion; white boundary fence |
| **Football pitch** | Often school-adjacent or park-edge |
| **Park / Green** | Central open space; benches, paths, duck pond if valley |
| **Allotments** | On the fringe; fenced off; individual plots visible |
| **Playground** | Near school or park; slide, swings, climbing frame |

### Infrastructure

| Feature | Notes |
|---|---|
| **Roads** | Main road (tarmac, lane markings); side streets; unmade tracks |
| **Pavements** | Flagstone in older areas; concrete in newer |
| **Bus stops** | Shelter or post-and-sign; timetable visible |
| **Train station** | If applicable — platform, small waiting room, car park |
| **Bridge** | Over river — stone arch for older; modern concrete for post-war |
| **Car park** | Behind high street; gravel or marked tarmac |
| **Street lighting** | Lamp posts; warm amber (older style) or LED white (new) |

---

## Roads & Transport

### Road Network

The road network is a **weighted graph** generated alongside the terrain:

1. Main road: optimal path through the valley, connecting the town to the edge of the map (the outside world)
2. High street: densest road segment; commercial frontage
3. Residential streets: branch from main road; follow contours
4. Back lanes and tracks: unofficial paths, alleyways, footpaths

Cars, bikes, buses, and pedestrians use the same network but at different speeds and on different sub-paths (pavement vs. road).

### Transport Simulation

| Vehicle | Notes |
|---|---|
| **Cars** | Most characters who own one; follow road graph; park at destination |
| **Bus** | Fixed route, fixed timetable; characters wait at stops |
| **Bicycle** | Characters with no car or green/health preference; slower |
| **On foot** | Default for short trips, children, elderly |
| **Train** | For towns with a station; departs on schedule; commuters use it |
| **Boat** | Coastal towns; fishing boats, occasional ferry |

Vehicles are instanced meshes following road splines. No physics — just spline tracking with speed variation and stopping behaviour.

---

## Visual Aesthetic

### Colour Palette

The world should feel like being outside on an overcast day in the British Isles — not dreary, but honest. Warm where warmth is earned.

- **Sky**: Pale grey-blue default; warm amber at golden hour; deep purple-navy at night
- **Stone buildings**: Grey limestone, warm sandstone, rendered white — varies by region
- **Brick**: Warm terracotta to dark Victorian red
- **Roofs**: Grey slate, red tile, lead flat
- **Vegetation**: British greens — dark hedgerow, bright new growth, ochre autumn bracken
- **Roads**: Weathered tarmac grey; wet = darker, reflective
- **Night**: Warm amber windows, cool blue moonlight, orange lamp glow on wet pavements

### Lighting Moods

| Time | Mood |
|---|---|
| Dawn | Cold blue fading to pale gold; mist in the valley |
| Morning | Warm directional light; long shadows; crisp |
| Midday | High, soft, even; Britain is rarely harsh overhead |
| Afternoon | Golden-warm, side-lit |
| Dusk | Orange-pink, silhouettes, windows starting to glow |
| Night | Deep blue-black sky; warm lamp pools; interior light in windows |
| Overcast | Diffuse, even, grey-green quality — distinctly British |
| Rain | Darker, every surface wet and reflective; air has a grey veil |
| Snow | Everything quieter; white rooftops; reduced contrast |

---

## World Scale

| Parameter | Default | Adjustable |
|---|---|---|
| Map size | ~1km × 1km | Yes |
| Population | 300–600 | Yes (100–1000) |
| Number of buildings | 80–200 | Derived from pop |
| Street network | 8–20 named streets | — |
| Timeline start | 1995 | Yes (1960–2020) |
| Season start | Autumn | Yes |

---

## OSM Import Pipeline

When a real place is provided (place name or bounding box), the game:

1. Queries **Overpass API** for:
   - Roads and paths (`highway=*`)
   - Building footprints (`building=*`)
   - Landuse (`landuse=residential`, `farmland`, `recreation_ground`, etc.)
   - Natural features (`natural=water`, `wood`, `cliff`)
   - Amenities (`amenity=pub`, `school`, `place_of_worship`, etc.)

2. Parses and normalises into internal format

3. Generates terrain heightmap from elevation data (SRTM or similar public DEM)

4. Places building meshes at footprint positions (footprint → procedural mesh)

5. Assigns character population proportional to residential area

6. Seeds relationships, jobs, and schedules

The result is a recognisable place — you can find the pub you actually know, see where the school is, watch the bus go up the main road. But it's populated with fictional people, living fictional lives in your real geography.
