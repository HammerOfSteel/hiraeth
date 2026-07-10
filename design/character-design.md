# Hiraeth — Character Design

## Design Intent

Every character in Hiraeth is a specific person, not a type. The generation system creates individuals who feel particular — their name fits them, their face matches their age, their daily routine makes sense for who they are. When you follow someone for a day, you should feel you know them a little.

The goal is **minimum viable depth**: enough data to produce the illusion of complexity. Not hundreds of variables — a handful of the right ones.

---

## Procedural Generation

### Name Generation

Names are culturally and historically grounded. The game ships with name lists by:
- **Cultural origin**: Welsh, English, Scottish, Irish, South Asian, Polish, West African, Eastern European (reflecting realistic UK demographic mix)
- **Age cohort**: names popular in the 1930s, 50s, 70s, 90s, 2010s map to characters born in those periods
- **Gender**: traditional and neutral names; gender expression is separate from assigned sex

Examples of what this produces: *Gareth*, *Margaret*, *Sioned*, *Priya*, *Callum*, *Amara*, *Wojciech*, *Ellie*, *Derek*, *Niamh*. The specificity is the point.

Surnames follow similar logic. Compound names (`Mrs Griffiths-Jones`, `Ravi Bhattacharya`) are supported.

### Personality (The Big Four + One)

Characters are seeded with five personality traits — simplified from Big Five:

| Trait | Low end | High end | Effect |
|---|---|---|---|
| **Warmth** | Guarded, private | Gregarious, open | Social need decay rate; how often they initiate conversation |
| **Conscientiousness** | Relaxed, spontaneous | Diligent, punctual | Schedule adherence probability |
| **Introversion ↔ Extroversion** | Recharges alone | Energised by people | Social need direction; pub vs. home evening |
| **Emotional stability** | Reactive, volatile | Steady, resilient | How much negative events affect mood; how long moods last |
| **Ambition** | Content, settled | Driven, striving | Job-seeking behaviour, risk appetite, economic decisions |

These are set at birth and don't change. Personality is expressed through *tendencies*, not absolutes — a highly introverted character will still go to the pub sometimes.

### Appearance

Appearance is generated from a seed and stored as a set of parameters:

- **Body type**: height (cm), build (ectomorph–endomorph), posture
- **Face**: skin tone (perceptually uniform scale), jaw structure, nose shape, eye spacing, brow weight
- **Age markers**: how much their age shows (some 60-year-olds look 70, some look 48)
- **Hair**: colour, style, length — changes realistically with age (greying, thinning)
- **Clothing**: reflects role, wealth, and personality. The retired teacher wears sensible walking gear. The pub landlord wears an old band t-shirt and jeans. The solicitor wears a coat.

All of this is generated procedurally in the vertex shader and character mesh system — no texture atlases required. Clothing is geometry variation on the base mesh (collar shapes, sleeve lengths, boots vs. shoes).

---

## Character Roles

Roles define what a character does for work, their economic position, and their daily template. Roles are assigned at adulthood (late teens/early 20s) based on available jobs and character traits.

### Working Age Roles

| Role | Location | Shift | Notes |
|---|---|---|---|
| **Teacher** | School | 08:00–16:30 | Higher conscientiousness bias |
| **Nurse / Doctor** | Surgery / Hospital | Shift-based | Works evenings/nights; different schedule template |
| **Publican** | Pub | 11:00–23:30 | High warmth; evening social hub character |
| **Shopkeeper** | Various shops | 09:00–17:30 | — |
| **Farmer / Smallholder** | Farm / allotment | Dawn–dusk, seasonal | Outdoor, early rising |
| **Builder / Tradesperson** | Construction sites / homes | 07:00–17:00 | Fluctuates with available work |
| **Office worker** | Council offices, insurance, etc. | 09:00–17:00 | Commute to nearby town if needed |
| **Bus / Taxi driver** | Roads | Shift-based | Node in transport simulation |
| **Priest / Vicar** | Church | Flexible + Sunday | Community touchpoint character |
| **Postman** | Streets | 06:00–10:00 then free | Knows everyone; high gossip connectivity |
| **Café owner** | Café | 07:00–16:00 | Social hub |
| **Librarian** | Library | 09:00–17:00 | Quiet; reads; knows everyone's business |
| **Unemployed** | — | — | Purposeful activity seeking; more pub time; risk of decline |
| **Student** | School/college | During term | Away from town during term if older |

### Life Stage Roles

| Stage | Age range | Activity |
|---|---|---|
| **Infant** | 0–4 | Home; follows parent schedule |
| **Child** | 5–10 | School; playground; home |
| **Teenager** | 11–17 | School; high autonomy in evenings; groups |
| **Young adult** | 18–25 | Establishing work, possibly leaving, possibly returning |
| **Adult** | 26–60 | Working; domestic; social |
| **Retired** | 60–75 | More leisure; community involvement; mobility still good |
| **Elderly** | 75+ | Reduced mobility; more home time; health events |

---

## Lifecycle

### Birth

Children are born to partnered characters. Probability is weighted by age and whether they're in a committed relationship. A new character entity is spawned:
- Parents' names inform surname
- Genes: appearance parameters interpolated between parents with variation
- Personality: partially heritable (30% parent blend, 70% independent randomisation)
- Family relationships immediately formed

### Childhood

Children follow a dependent schedule — they go where their parents go when not in school. They form their first relationships at school. Their personality expresses through play style, trouble-making tendency, and social circle formation.

Children's needs are weighted differently: play and social are more important; purpose is met by school and exploration rather than work.

### Adolescence

Teenagers gain autonomy. They start making schedule decisions independently (sometimes against family wishes — a small friction modelled as a personality check). They form intense peer relationships. First romantic connections are seeded. Some begin part-time work. Some start getting into low-level trouble if purpose + social needs are badly met.

### Adulthood

Characters find work, form households, may leave and return. The young adult transition is modelled with some ambiguity: some move away to study or work and may return years later (returning as a new character with history attached). Some stay. The ones who stay have a density bonus to the social graph.

Partnering happens when two characters have sufficient warmth, spend enough time in proximity, and are in compatible life stages. Cohabitation follows (they're assigned to share a home). Children may follow.

### Ageing

Characters visibly age. Appearance parameters shift over time:
- Hair greys and thins
- Posture changes (slight forward lean with age)
- Movement speed reduces gently from ~60 onward
- Health events begin appearing (a cough in winter, a hospital visit)

### Death

Death occurs probabilistically based on age and health. It's not sudden (outside accidents or extreme weather) — a character's health slowly declines, their schedule contracts (more home time, less energy), and eventually they die. The event is felt:
- Family and close friends have mood hit for weeks
- Funeral event draws community
- The house becomes available; someone may move in
- The social graph has a hole; some characters whose primary social connection was the deceased become more isolated

---

## Daily Life in Detail

### Morning Routines

Characters have distinct morning types:
- **The early bird** (high conscientiousness, outdoor role): up at 6, brief outside activity, energetic
- **The steady riser** (average): 7–8am, breakfast at home, leaves for work on time
- **The slow starter** (low conscientiousness, late shift): 9–10am, leisurely
- **The insomniac**: awake at 3am, tired all day; personality trait with health impact

### Commuting

Characters travel to work using available transport:
- On foot (close home/work, or very low income)
- By bike (moderate distance, dry weather)
- By car (default for most)
- By bus (no car, town route exists)
- By train (commuters to larger town)

Commute time affects mood (long commute is a comfort/mood drain). Transport events (bus breakdown, road closure) create friction that spreads.

### Social Moments

Characters interact when they are in proximity and their relationship graph includes the other character (or when a spontaneous acquaintance is formed). Interactions are brief:
- **Greeting** (0.5s, neutral to warm; boosts social slightly)
- **Chat** (2–5 sim-minutes; better social fill; chance of information exchange)
- **Catch-up** (10+ min; high social fill; stronger for close friends)
- **Argument** (negative interaction; warmth hit; generated by overlapping negative events or high-stress characters)

### Evenings

Evening behaviour is where personality diverges most:
- **Pub** (social characters, especially post-30s men and groups): fills during evening period; conversations happen
- **Home with family**: the domestic nucleus; cooking, eating together is bonding activity
- **Solitary leisure** (introverts): reading, TV, garden, workshop
- **Community activity**: sport, choir, book group, volunteering (characters with high purpose + social)
- **Night-walking** (specific personality type — the insomniacs, the restless)

---

## Notable Character Archetypes

These are not fixed characters but recognisable types the generator produces. Every town will have a version of each.

**The Postman** — Knows everyone on the route. High social connectivity. Low salary but rich in information. Often in the pub by midday on his day off. First to know about a newcomer, a death, a house going up for sale.

**The Pub Landlord** — Hub of the social graph. Hears everything. High warmth by necessity. Home is behind the bar. The pub is their world; its closure would be an existential event.

**The Retired Headmistress** — Sharp, principled, slightly feared. Was here for everything. Has opinions on all planning applications. Still has purpose through community involvement. Probably chairs something.

**The Quiet Farmer** — Up before dawn. Doesn't come to town much. When he does, it matters. Knows the land, the weather, the seasons, in ways the others don't.

**The Young Teacher** — New to town, trying to figure out where they fit. High enthusiasm, slightly overwhelmed. Will either become rooted here or leave within two years.

**The Teenager Who Won't Leave** — Stayed when friends left. Has complicated feelings about this. Knows every corner of the place. May eventually become someone else important, or may stay in that role forever.

**The Newcomer** — Moved here recently (couple, or individual). The town hasn't decided about them yet. Integrating slowly. Their backstory is partially visible to the player but opaque to the townspeople.

---

## Character Information Panel

When the player selects a character, they see:

```
┌─────────────────────────────────────────────┐
│  Gareth Wyn Davies   │  Age 54              │
│  Bus Driver          │  Lives: Bryn Terrace │
├─────────────────────────────────────────────┤
│  "On his way to the depot"                  │
├─────────────────────────────────────────────┤
│  Mood: ████████░░  Good                     │
│  Needs: Hungry ██░░  Tired ████░░           │
├─────────────────────────────────────────────┤
│  Relationships:                             │
│  ♥ Mari (partner, 23 years)                │
│  👥 Tom, Phil, Brenda (friends)             │
│  ↑ Huw (colleague, warming)                 │
├─────────────────────────────────────────────┤
│  Today: Depot 06:30 → Route 2 → Lunch home  │
│         → Route 2 → Pub 18:30 → Home 21:00  │
├─────────────────────────────────────────────┤
│  [Follow]  [View History]  [Family Tree]    │
└─────────────────────────────────────────────┘
```
