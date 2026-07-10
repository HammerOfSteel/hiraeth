# Hiraeth — UI Design

## Design Philosophy

The UI should feel like a **quiet instrument panel** — present when needed, absent when not. The world is the thing. The UI exists to help you understand it, not to perform its own importance.

Key principles:
- **Non-intrusive by default**: nothing covers the world when you just want to watch
- **Revealed on demand**: more information is always accessible but never pushed
- **Warm, typographic, unfussy**: no game-y chrome; feels closer to a documentary than a dashboard
- **Responsive to state**: the UI reads differently when it's 3am and raining vs. a sunny Sunday morning — it shouldn't feel the same in both

---

## Layout

```
┌──────────────────────────────────────────────────┐
│ [Clock / Date]                  [Speed Controls] │ ← top bar (thin, minimal)
│                                                  │
│                                                  │
│                                                  │
│             THE WORLD                            │
│                                                  │
│                                                  │
│                                                  │
│  [Minimap]          [Character Panel — docked]   │ ← bottom left / right
│  [Camera Mode]  [Event Log]                      │
└──────────────────────────────────────────────────┘
```

All panels can be hidden individually. The top bar and minimap are default-visible. The character panel appears only when a character is selected or followed.

---

## Top Bar

Minimal strip at the top — ideally translucent with slight blur.

```
  Mon 14 Nov  09:47am  |  Autumn   ☁ Overcast  |  ▶▶ 6×  |  Aber-y-fro  |  ⚙
```

| Element | Detail |
|---|---|
| Day, date, time | Typeset cleanly; time uses 12hr with am/pm |
| Season + weather icon | Small SVG icon + one-word summary |
| Speed indicator | Pause / Play / ×1 / ×6 / ×24 / ×100 — clickable |
| World name | The generated (or imported) name of the place |
| Settings | Gear icon; opens settings panel |

---

## Clock / Time Display

The in-game clock is the most continuously visible element. It should feel like:
- A clock in a café, not a game timer
- The time passing feels like time, not a score

When time is accelerated, a subtle visual cue — a slight motion blur on the time digits or a pulsing indicator — communicates acceleration without being distracting.

---

## Minimap

Bottom-left corner. Small, circular or softly rectangular. Shows:
- Terrain footprint (heightmap as tinted relief)
- Roads as thin white lines
- Building locations as small dots (grey default, warm amber when lit at night)
- The camera's current view frustum as a translucent rectangle
- If following a character: their position as a small moving dot
- Click to pan the main camera to that location

The minimap dims at night, matching the world.

---

## Camera Controls

**Default mode: Isometric**

Controls (keyboard/mouse):
- **Scroll wheel / pinch**: zoom in/out
- **Middle click drag** or **right click drag**: pan
- **Q/E** or rotate gesture: rotate view (snap to 45° increments)
- **Home**: reset to default zoom and orientation

Zoom levels:
- **Town view** (far): see the whole settlement, roads, fields, miniature characters
- **Street level** (mid): individual buildings readable, character movement visible
- **Intimate** (close): can see faces, read expressions, hear audio snippets

Zoom affects LOD — buildings simplify at distance, characters become silhouettes, vegetation merges.

**Smooth zoom** — no snapping between levels. The zoom is continuous and eased.

---

## Camera Modes

Accessible via a small icon cluster bottom-left or keyboard shortcut.

| Mode | Key | Description |
|---|---|---|
| **Isometric** | `1` | Default top-down angled view |
| **Follow — Third Person** | `2` | Camera trails behind selected character |
| **Follow — First Person** | `3` | Camera is behind the character's eyes |
| **Cinematic** | `4` | Automated camera seeks interesting moments |
| **Free Orbit** | `5` | Unconstrained orbit camera for exploration |

When entering follow modes, a smooth camera transition animates to the new position rather than cutting.

### Cinematic Mode

The cinematic camera is a passive mode that:
- Finds characters with high drama (strong emotion, important event)
- Composes a shot: distance-based on activity type (intimate for conversations, pulled back for crowds)
- Holds for 10–30 seconds, then cuts to another
- Applies subtle depth of field (character sharp, foreground/background bokeh)
- Can be used as a "screensaver" mode when you step away

---

## Character Panel

Appears when a character is selected (click or follow). Docked to the right side, slides in.

```
┌─────────────────────────────────┐
│  ○  Sioned Rhys                 │
│     Primary School Teacher, 34  │
│     "Walking to school"         │
├─────────────────────────────────┤
│  Mood  ████████░░  Content      │
├─────────────────────────────────┤
│  Hungry  ██████░░░              │
│  Tired   ████░░░░░              │
│  Social  ██████████ (satisfied) │
├─────────────────────────────────┤
│  ❤ Dafydd (partner)            │
│  👧 Llinos (daughter, 6)       │
│  👥 Beth, Carys, Ruth          │
├─────────────────────────────────┤
│  Today's plans:                 │
│  → 08:15 School (teaching)     │
│  → 12:30 Staff room (lunch)    │
│  → 15:30 Home                  │
│  → 18:00 Beth's house          │
├─────────────────────────────────┤
│  [Follow]  [History]  [Family]  │
└─────────────────────────────────┘
```

### Character History

A thin scrollable timeline showing notable events:
- Moved to town
- Met Dafydd
- Married
- Llinos born
- Argument with Carys (resolved)
- Got the teaching job
- ...

This timeline gives the player a sense of this person's story without it being overwhelming.

### Family Tree

A small interactive graph of their family relationships. Clickable to navigate to relatives.

---

## Event Log

Bottom-left, near the minimap. An optional small ticker showing recent events in the world:

```
09:23  The Swan opens for the day
09:31  Gareth started his shift at the depot  
09:45  ☁ Rain expected this afternoon
10:01  Thomas Evans (87) taken ill — district nurse called
```

Events are coloured subtly by type (weather: grey-blue, character: warm, notable: amber). Can be filtered. Auto-hides when empty.

The tone of event text is gentle — written as if by a local historian rather than a game system log.

---

## Settings Panel

Accessible from the gear icon. Sections:

### Simulation
- Game speed presets + custom
- Pause on event (option to pause when a significant event occurs)
- Population size (for new game)
- World seed / generate new

### World
- Toggle real-world map import
- Search for a place name
- Parameter sliders: valley width, hilliness, coastal, climate

### Visuals
- Rendering quality (shadow resolution, particle density, SSAO toggle)
- Depth of field (on/off, strength)
- Motion blur (on/off)
- Time of day override (lock the lighting to a specific hour for photography)
- Hide UI (screenshot mode)

### Audio
- Ambient volume (wind, rain, birdsong, distant traffic)
- Character sounds volume (footsteps, chatter murmur, vehicles)
- Music volume (optional atmospheric score — folk/ambient)
- Spatial audio toggle

### Accessibility
- UI scale
- Colour blind assist mode
- Text size
- Reduce motion

---

## Typography

One typeface family throughout: a humanist sans-serif with a slight warmth. Candidates: **Inter**, **DM Sans**, **Nunito** (for the softer quality it brings to readability).

Weight hierarchy:
- **Character names**: medium weight, slightly larger
- **Role/status**: light weight, smaller
- **UI labels**: regular, small
- **Event log**: light, monospace feel for the ticker quality

Text colour: near-white (`#f0ede8`) on dark surfaces; near-black (`#1a1814`) on light. A cream-warm tint rather than pure white/black.

---

## Sound Design Notes (UI layer)

UI interactions have soft, ambient sound cues:
- Panel open/close: a soft page-turn quality
- Character selected: subtle tone, like a hand-bell
- Time speed change: a slight mechanical click
- Event notification: warm chime at low volume

The UI should never feel digital or techno. It should feel like turning pages in a book.

---

## Responsive to World State

The UI colour temperature shifts subtly with time of day:
- Daytime: neutral warm light
- Golden hour: interface gains an amber tint
- Night: interface darkens; text goes softer; minimap dims

In heavy rain, the panel backgrounds take on a very subtle cool-grey quality. These are micro-changes — felt more than noticed.
