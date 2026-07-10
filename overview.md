# Hiraeth — Overview

## Vision

Hiraeth is a simulation of ordinary life — a small Welsh-valley town, or a Scottish fishing village, or a market town in the English midlands — made vivid through code. It's not a game you play so much as a world you observe, inhabit, and occasionally nudge.

The core promise: **a living place, full of specific people, where interesting things happen whether you're watching or not.**

---

## Pillars

### 1. Specificity Over Abstraction
Characters are not "Villager A." They're *Gareth the retired teacher*, who walks his dog at 7am, drinks at The Crown on Thursdays, and hasn't spoken to his sister in three years after an argument at their mother's funeral. The data that generates them is simple; the feeling it creates is not.

### 2. Emergence Over Scripting
No events are hand-authored. Narrative emerges from the collision of systems — a flood damages the bridge, the morning bus can't run, the school closes, kids hang around the park, two of them get into trouble, a parent complains at the council meeting. None of that was written.

### 3. Atmosphere as Mechanics
The day/night cycle, weather, seasons, and lighting are not cosmetic features. They change how the world behaves. People stay in when it rains. The pub gets rowdier in winter. The rugby field draws a crowd on Sunday mornings in autumn.

### 4. Code-First, No Editor
The entire world — geometry, characters, behaviours, UI — is generated and managed in code. There's no asset pipeline requiring an external editor. All visual content is procedural or instanced geometry. The game *is* the code.

---

## Feature Overview

### World
- Procedurally generated terrain with coherent valleys, hills, rivers, and coastlines
- Noise-layered heightmap with biome-like variation
- Optional: generate world from real OpenStreetMap data for a named place
- Road network generated from terrain; infrastructure placed along it
- Day/night cycle with sun position, ambient shifting, volumetric light shafts
- Dynamic weather system: rain, fog, snow, sunshine, wind
- Seasons with visual and behavioural consequences

### Town
- Organic building placement: residential streets, a high street, civic buildings, green spaces
- Buildings: homes, terraced houses, a pub, a café, a school, kindergarten, church, library, surgery, sports facilities (rugby pitch, park), shops and services
- Over time: construction sites, repair works, new buildings rising
- Economy simulation: businesses open and close, properties change hands
- Infrastructure: roads, pavements, bus stops, a train station, a small harbour if near water
- Transport: pedestrians, cyclists, cars, buses, trains, boats — each with their own schedules

### Characters
- Hundreds of procedurally generated residents with unique names, faces, roles, and histories
- Full lifecycle: birth, childhood, school, work, relationships, family, old age, death
- Daily schedule driven by needs (rest, hunger, social, work, leisure) and personality
- Relationships graph: friends, family, romantic partners, rivals, colleagues
- Mood and mental state visible through behaviour and posture
- Visible aging over time
- Social dynamics: gossip, rumour, community events, feuds, romances

### Camera & View
- Default: isometric top-down, smooth zoom from town overview to street level
- Follow mode: lock to any character, watch their day unfold
- Third-person mode: walk behind a character through the streets
- First-person mode: see through their eyes
- Cinematic mode: auto-follow interesting moments, time-lapse

### World Events
- Weather events: floods, storms, droughts, harsh winters
- Economic events: a new business opening, a factory closing, rising rents
- Political events: council elections, planning disputes, protests
- Community events: summer fête, Christmas market, rugby match day, funeral
- Personal events: births, weddings, deaths, moving away, returning home

### Generation & Parameters
- Seed-based generation: same seed = same world
- Exposed parameters: population size, wealth distribution, age distribution, rurality, climate
- Map import: provide a place name or bounding box, generate a world shaped by real geography

---

## What Makes Hiraeth Different

Most life simulators require you to *control* characters. Hiraeth asks you to *witness* them. The game is about observation, discovery, and the particular pleasure of watching a small world spin without your intervention.

It draws on:
- The **procedural depth** of Dwarf Fortress — characters with histories, relationships, and emergent stories
- The **visual warmth** of Stardew Valley and A Short Hike
- The **systemic complexity** of Cities Skylines, but intimate and human-scaled
- The **voyeuristic pleasure** of watching The Sims — but without the God-game power fantasy

The Welsh name matters. *Hiraeth* — a longing for the familiar. You'll spend time watching people in a place that feels like somewhere you've been but haven't. That's the intended feeling.

---

## Design Documentation

| Doc | Content |
|---|---|
| [design/game-design.md](design/game-design.md) | Core systems: time, needs, economy, events, emergence |
| [design/character-design.md](design/character-design.md) | Character archetypes, lifecycle, relationships, schedules |
| [design/world-design.md](design/world-design.md) | Terrain, buildings, infrastructure, procedural placement |
| [design/ui-design.md](design/ui-design.md) | Camera system, HUD, info panels, settings |
