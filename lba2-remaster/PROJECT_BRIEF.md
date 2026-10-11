# LBA3: The Awakening — ההתעוררות · Project brief

Unofficial, non-commercial fan sequel to Little Big Adventure 1 & 2, playable in the browser
(Three.js, no build step). LBA2 is the artistic and gameplay benchmark.

## Story (fixed by the author)

12 years after LBA2. Twinsen lives with Zoe and their son Arthur on Citadel Island.
A joint Twinsun–Zeelich energy project, led by **Vesk** (Zeelich engineer, ally who becomes the
antagonist), is drilling into the shell around the entity that **Sendell** guards. Zoe discovers that
Vesk's evacuation plan only covers part of the population. The solution is not a fight to the death but
repurposing the project's own facilities to protect the entity, together with **Baldino** and allies from
both worlds.

Rules: Twinsen is the hero · Zoe is active and has short playable parts · Arthur is curious, not a
"chosen one" · Funfrock stays dead (his legacy is in the world: the old fortress the project took over) ·
Sendell is not a secret villain · earlier achievements are not undone · solutions are built from clues and
systems the player already knows · two suns, no Earth day/night cycle.

## Chapters (final scope)

| # | Title | Region | Goal | World change |
|---|---|---|---|---|
| P | הבאר (The Well) | Citadel: house, town, harbour, well cave | Find why the well stopped; three crystals; Sendell: "Someone has reached her." | Well opened, crystal wall broken |
| 1 | המיזם המשותף (The Joint Project) | Citadel: town, harbour, Funfrock's old fortress = project station, Water Office, station control room | Vesk arrives; restore the town's water through three bypass valves; **Zoe** sneaks into the project office and finds the selective evacuation list; Vesk leaves for Zeelich and seals the station; Arthur's radio picks up Baldino | Station open, well steams, NPCs talk about evacuation, ferry to Zeelich |
| 2 | זיליך (Zeelich) | Zeelich terminal island above the clouds: Esmer street, Baldino's workshop, wind-mills, drill platform | Baldino explains the shell; build the override key (two parts); disable the platform shield; confront Vesk; **Zoe** (on Citadel) broadcasts the warning from the lighthouse | Platform open, Vesk descends, the drill shaft opens |
| 3 | הקליפה (The Shell) | Under the planet: shaft, crystal galleries, Sendell's chamber, conversion pylons, the core | Sendell explains the entity is waking too early; Baldino's grid conversion: switch three pylons; boss: Vesk's Bore Guardian; Vesk realises and helps make the final switch | Shell reinforced, drill turned into a shield generator |
| E | אפילוג | Citadel well | The well bursts; Sendell: "טוב שהגעת. עכשיו הלחץ קצת חזק מדי." Credits | — |

Scope rule: shrink map size and repetition before cutting character, animation, quest or ending quality.

## Art direction (top priority: no "Roblox" look)

LBA2's language: caricatured proportions, readable silhouettes, colourful intimate places, odd and
friendly architecture, magic mixed with machinery.

- Characters: SDF-sculpted single-surface bodies (src/engine/sculpt.js), skinned to a skeleton, with
  faces (eyes/lids/brows/mouth), garments with thickness and hems, sculpted hands and shoes. Distinct
  silhouettes per character (not recolours).
- Twinsen: knee-length straight blue tunic, broad shoulders, ball nose, big eyes, hair combed back,
  hooked ponytail, medallion on a red cord, light trousers, brown shoes.
- Buildings: real wall thickness, recessed openings in frames, sills/lintels, thick overhanging roofs
  with ridge/gutters, plinths, chimneys, asymmetry (src/game/architecture.js).
- Ground: Citadel paving (grey running-bond setts), brown soil with lawns, blue-globe street lamps,
  red benches. Painted canvas textures generated in code.
- Camera: LBA2 exterior camera (PERSO.CPP values), Twinsen ≈16% of screen height; iso camera indoors.
- Effects never hide geometry problems; bloom is subtle.

## Gameplay pillars

Four behaviours (normal/athletic/aggressive/discreet), magic ball with bounces and aim assist,
exploration with talk/search/use, readable enemies (telegraphed attacks, hit reactions), compact HUD,
holomap, inventory and journal, autosave + manual save, Hebrew (RTL) and English.
