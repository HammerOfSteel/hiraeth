# Hiraeth — Game Design

## Design Philosophy

Hiraeth is not a game you win. There is no failure state. It is a world you watch, and occasionally query. The design resists the urge to make the player feel powerful — instead, it asks them to feel *present*.

The game rewards patience, observation, and the willingness to care about small things.

---

## Core Loop

```
The world runs → something interesting happens → you notice → you follow it → it leads somewhere unexpected → you are now invested in these people → the world keeps running
```

There is no primary loop the *player* performs. The loop is the world's:

1. **Characters pursue their needs** — hunger, rest, company, purpose
2. **The day structures activity** — work, routine, leisure, sleep
3. **Systems create pressure** — weather, economy, politics, chance
4. **Pressure creates friction** — characters can't do what they want
5. **Friction creates story** — decisions, consequences, change

The player's role is **witness and explorer**, not actor. They can zoom, follow, read, and observe. Optionally, they can adjust parameters or nudge world conditions (trigger an event, adjust economic sliders). This is never *required*.

---

## Time System

### The Clock

Game time advances in **real ticks** (simulation steps). One in-game hour is configurable but defaults to 1 real minute at normal speed. Time can be accelerated.

| Speed | Real Time = Game Time |
|---|---|
| Paused | — |
| Normal (1×) | 1 min = 1 hr |
| Fast (6×) | 10 sec = 1 hr |
| Accelerated (24×) | ~2.5 min = 1 day |
| Time-lapse (100×) | ~14 min = 1 year |

### Day Structure

Days divide into time blocks that govern character scheduling:

| Block | Hours | Typical Activity |
|---|---|---|
| Early morning | 05:00–07:00 | Dog walks, the paper round, the very keen |
| Morning | 07:00–09:00 | Commuting, school run, opening up shops |
| Working hours | 09:00–17:00 | Work, school, errands |
| After-school | 15:00–18:00 | Kids free time, sports practice |
| Evening | 17:00–21:00 | Cooking, eating, pub, leisure |
| Late evening | 21:00–23:30 | Winding down, last orders |
| Night | 23:30–05:00 | Sleep, occasional insomnia, night shift workers |

### Seasons

Four seasons with ~13 in-game weeks each (52-week year). Seasons affect:
- **Daylight hours** (shortest day in winter, long summer evenings)
- **Temperature** → comfort need decay rate → how long people stay outside
- **Weather probability distributions** (snow in winter, storms in autumn)
- **Activities** (allotments in summer, Christmas market in December, rugby season in autumn/winter)
- **Vegetation appearance** (shader-driven colour shift, leaf particle shedding)

---

## Needs System

Every character has six needs on a 0–1 scale. They decay over time. When they fall below certain thresholds, the character seeks to satisfy them. This drives the schedule.

| Need | Decay rate | Satisfied by |
|---|---|---|
| **Hunger** | Medium | Eating at home, café, restaurant, pub food |
| **Fatigue** | Slow | Sleeping at home (8 hrs ideal) |
| **Social** | Varies (introvert/extrovert) | Conversation, pub, café, community events |
| **Bladder** | Fast | Home bathroom, pub toilet, public loos |
| **Comfort** | Slow | Shelter (low in rain/cold), sitting down, familiar spaces |
| **Purpose** | Very slow | Going to work, caring for someone, creative activity |

**Mood** is a derived value from the weighted average of needs, recent events, and personality. Mood affects how characters present — posture, pace, whether they greet others, facial expression.

Characters don't robotically interrupt whatever they're doing the moment a need ticks. They manage — they can push through mild hunger until lunchtime, delay a social visit if it's raining. This is gated by personality and thresholds.

---

## Schedule System

Each character has a **daily template** based on their role and personality, modified by their current state and world conditions.

### Schedule Resolution

1. Start of each in-game day: generate today's schedule template from role + personality
2. Each "time block" begins: system evaluates whether character will follow template
   - `P(follow_template) = base_prob × mood × weather_penalty × need_urgency_modifier`
3. If they deviate: substitute goal (satisfy most urgent need instead)
4. Navigation target assigned → MovementSystem handles pathing

### Example: Margaret (67, retired, sociable)

| Time | Scheduled Activity | Conditions That Change It |
|---|---|---|
| 07:30 | Walk to post box + look at the sea | Stays in if heavy rain |
| 08:30 | Breakfast at home | — |
| 10:00 | Walk to Glenys's house for coffee | Cancelled if Glenys is ill or they've argued |
| 12:30 | Light lunch at home | — |
| 14:00 | Library or charity shop | Closed on Sunday |
| 16:00 | Home, garden if sunny | — |
| 17:30 | Cook dinner | — |
| 19:30 | TV / knitting at home | Goes to church quiz on Thursday |
| 22:00 | Sleep | |

### Spontaneous Behaviour

Characters also have a small random pool of **opportunistic actions** they might take if the conditions are right:
- Stop to chat with someone they have a positive relationship with
- Buy a newspaper if passing the newsagent
- Sit on a bench and watch the ducks
- Take an unusual route if in good mood
- Nip to the pub for "just one"

---

## Relationship System

Characters form and maintain relationships that affect their behaviour, schedules, and emotional state.

### Relationship Types

| Type | Mechanics |
|---|---|
| **Family** | Born into; affects household decisions, care, inheritance |
| **Partner / Spouse** | Romantic relationship; co-habitation, shared activities |
| **Close friend** | High-weight positive social node; regular visits |
| **Acquaintance** | Low-weight positive; pass pleasantries |
| **Colleague** | Work context; can become friendship |
| **Rival / Grudge** | Negative; avoidance, tension, gossip vector |
| **Neighbour** | Proximity-based; can be neutral, friendly, or fraught |

### Relationship Dynamics

Relationships have a **warmth score** (-1 to +1) and a **history** of recent interactions. Interactions are logged as events (positive: shared a meal, helped with something; negative: argument, embarrassment, betrayal).

Warmth decays slowly toward neutral if no interactions occur. Strong negative events can crater a relationship instantly. Strong positive events compound gradually.

### Gossip

Characters share information through conversation. A piece of gossip (a rumour, a fact about someone) spreads through the social graph with decay — it gets distorted, it fades, it travels faster through denser clusters. This enables emergent drama: an affair gets half the town talking; a family feud is common knowledge; a newcomer is the subject of speculation.

---

## Economy System

The economy is simple enough to be legible, complex enough to create pressure.

### Businesses

Each business has:
- **Revenue**: number of customers × average spend per day
- **Costs**: fixed (rent, utilities) + variable (wages)
- **Profit margin**: determines longevity
- **Health score**: declines if revenue < costs over time → closure

Businesses can **open, struggle, close, be taken over**. A new business can open if a premise becomes vacant and an entrepreneur character exists with capital and motivation.

### Employment

Characters are assigned jobs based on role, qualification, and available positions. Unemployment is a need-satisfaction problem (purpose need falls, which drops mood, which affects relationships). Characters can:
- Change jobs if a better opportunity arises
- Lose jobs if a business closes
- Retire at age ~65 (with personality variation)
- Work part-time (common for parents of young children, students)

### Housing

Properties have a notional value and rent/mortgage cost. Rents can rise if demand exceeds supply (population grows, new people move in). This creates pressure: characters on low incomes may be unable to afford rising rents → they leave the town → population composition changes.

### Economic Events

- A large employer closes → unemployment spike → knock-on to local businesses → possible population exodus
- Tourism season (if near coast/countryside) → temporary business boom
- New construction → jobs during build → then new residents → demand rises
- Flood or storm damage → repair costs → temporary closure of affected businesses

---

## Weather System

### State Machine

Weather transitions probabilistically based on season, time of day, and current state.

```
States: Clear → Cloudy → Overcast → Rain → Heavy Rain → Storm
        Clear → Fog (morning, especially valleys)
        Overcast → Snow (winter only)
```

Transitions have:
- **Probability per tick** (very low — weather changes slowly)
- **Season bias** (more rain in autumn, more fog in spring mornings)
- **Persistence** (bad weather tends to linger; clearing can happen quickly)

### Behavioural Effects

| Weather | Effect on characters |
|---|---|
| Clear | More outdoor activity, longer routes, sitting outside |
| Rain | Seek cover, shorter routes, cancel optional outings |
| Heavy rain | Almost everyone indoors except necessity |
| Snow | Delight for children; inconvenience for commuters; roads slower |
| Fog | Slower movement, slightly eerie quality, no outdoor social |
| Storm | Emergency behaviour; some infrastructure impact |

### Visual Effects

Weather is rendered via Babylon.js particle systems + shader uniforms:
- Rain: particle system with directional bias (wind), puddle accumulation on road material
- Snow: slower particles, ground accumulation (texture blend on terrain shader)
- Fog: exponential distance fog, density-controlled
- Storm: rapid cloud movement, lightning flashes (light strobe), sound

---

## World Events

Occasional large-scale events that ripple through all systems. These are not scripted — they trigger from system state crossing thresholds.

### Natural Events

| Event | Trigger | Consequence |
|---|---|---|
| **Flood** | Extended heavy rain in a low-lying area | Road closures, property damage, emergency services active, temporary displacement |
| **Harsh winter** | Temperature and snow accumulation threshold | School closures, elderly characters at risk, heating cost spike |
| **Drought** | Extended dry season | Reservoir concern, garden/allotment failure, hosepipe restrictions |
| **Heat wave** | Summer + clear weather prolonged | Pub garden thriving, elderly caution, cricket on the green |

### Community Events

Community events recur on the calendar and draw characters together:
- **The rugby match** (home game): crowds at the pitch, pub afterwards
- **Christmas market**: stalls, lights, mulled wine, carol singing
- **Summer fête**: village green, bunting, tombola, awkward raffle
- **Bonfire night**: fireworks, gathering at the park
- **Harvest festival / remembrance Sunday**: church fills up
- **School play / sports day**: families in attendance

### Political Events

- **Council election**: candidates from among the characters, issues drawn from current world problems (flooding, new development plans)
- **Planning application**: a developer wants to build; community response varies based on character opinions
- **Local referendum**: rare, high-stakes (pub closing? new road?)

### Personal-Scale Events That Ripple Out

- A death in the family affects multiple characters' mood for weeks; the funeral draws the community
- A wedding brings distant relatives into town temporarily; the pub does well
- A birth changes a household's schedule fundamentally
- Someone moving away is felt as a gap in the social graph

---

## Emergence Mechanics

Emergence in Hiraeth is the product of:

1. **Cascading needs** — one thing leads to another
2. **Social contagion** — mood and information spread through the relationship graph
3. **Systemic pressure** — weather, economy, politics create external constraints that force adaptation
4. **Coincidence** — two characters in the same place at a sensitive moment

### Emergence Examples

**"The Divorce"**: A couple's warmth score has been declining for months. One goes to the pub more; they start talking to someone else. The warmth with the new person rises. The gossip system starts carrying fragments. The spouse's mood plummets. They argue (negative interaction event). One of them moves to a relative's house. Their kids' schedules fragment. A close friend starts visiting more to check on the affected character.

**"The Factory Closes"**: The economic model determines the plant is unprofitable. It closes. Twelve characters are suddenly unemployed. Purpose need falls; mood falls across that cluster. Pub takings spike briefly (social need relief). Three families begin struggling to pay rent. One leaves town. Two find other work. One becomes isolated and increasingly low-mood over months. Eventually a community event draws them back out.

**"The Great Storm"**: A threshold storm event. The bridge over the river is damaged — the road graph updates. Morning commuters can't get to the station. The school closes. Kids are home; parents can't get to work. Local shops do an unusual weekday trade. The council character has to respond. Repair works begin — a construction site appears on the bridge. For weeks, there's an alternate route that adds ten minutes to everyone's commute.
