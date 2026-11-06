# EQUIP-2: LBA3's own weapons and gadgets (concepts; items 1–2 built as EQ2-a, items 3–5 as EQ2-b)

The user (2.11.2026): "Weapons and accessories that make the third game its own, not only copies of the first and
second." Weapons need not come earlier; there must be some through the game. Nothing here is built until the user
approves. The old favourites stay (the ball, the blowgun and Blowtron, the laser, the glove, the lightning, the
penguin, the ward, the conch, the lantern, Baldino's hop-pack).

What the old arsenal already does, so the new items do something else: bounce and hit (ball), shoot (blowgun,
Blowtron, laser), chain (lightning), punch and break boards (glove), lure (penguin), halve damage (ward), scare dogs
(conch), show the dark (lantern), climb a storey (hop-pack). Missing: **sense** what is hidden, **push** and
**cool**, **carry heat**, **resonate** with the crystals, **pull** from a distance. Each new item takes one of those.

The game's own themes they come from: the heat drawn out of the planet, the warm crystals, the shell, the twelve years
(Bram's pump, Arthur's radio), the Esmers' craft, Baldino's workshop.

## The five items

| # | Item | First chapter | From | Its job (puzzle) | Its job (fight) | Limit |
|---|---|---|---|---|---|---|
| 1 | **Arthur's pocket set** (the radio's little brother) | 2 | Arthur builds it from his radio's spare parts | Tuned in the world, it whistles louder near hidden things that hum: buried caches, a live pipe among dead ones, a relay behind a wall. A needle points the way within 12 m | A feedback squeal: project drones within 10 m lose their aim for 3 s (people and animals are not affected) | 8 s cooldown; machines only |
| 2 | **Bram's hand-pump lance** | 2 (after The Old Pump) | Bram's spare pump on a tank, his thanks | A jet of water: cools a too-hot valve so it can be turned, fills a basin that weighs a gate open, turns a small wheel, washes a crystal clean | Pushes an enemy 3 m back (off a ledge, out of a doorway); crystal mites freeze in place 2 s; no damage | The tank holds 8 jets; refilled at any water (well, trough, sea) |
| 3 | **The heat flask** | 6 | Baldino's design, built from a project heat post's cell | Takes heat from a source (a heat post, a steam vent) and gives it back elsewhere: thaws a frozen winch or ice, starts a dead machine, melts a path | Released, a short blast of heat in front of Twinsen: 2 damage within 2.5 m, ice creatures take double | One charge at a time; carried heat fades in 90 s |
| 4 | **The singing fork** | 4 | The dig's tool for finding crystals | Struck near warm crystals, it makes them ring: a crystal wall cracks open (new paths), an awake crystal glows as a lamp or a beacon, a stuck crystal mechanism turns | Crystal creatures within 6 m stagger 1.5 s; armour with crystal cells (project guards) drops its guard for one hit | 5 s cooldown; works on crystal only |
| 5 | **The Esmer line** | 3 (bought) or 9 | Esmer rope-makers' work: a sticky cord on a hand reel | Fires to a cord ring: pulls Twinsen across a gap or up to a ledge; pulls a lever, a key or a crate from far away | Pulls one light enemy toward Twinsen (into the ball's or glove's reach) or a guard's shield aside | 14 m; only to rings, levers, loose things and light enemies |

Each item: one safe place to learn it with nothing at stake (a short lesson where it is found), at least two later uses
on side paths and one optional use on the main path (nothing on the main path needs it, as with the old arsenal),
its own small model in Twinsen's hand, its sound, an inventory picture, saved with the hero (`hero.arms`), no paid
assets, inside the performance rules (no new lights; the effects reuse the pools that already exist).

Pairs they make on purpose: the pump lance (cold) and the heat flask (hot) answer the same puzzles in opposite ways;
the pocket set finds what the fork then opens.

## Where each fits (for the team; the user plays chapters 1–2)
- **Pocket set:** Arthur's toy corner, chapter 2, after the radio scene; its first lesson finds the cellar's hidden
  tin. Later: the dig's buried relay (4), the drones in the steam halls (5), the network's relays (10).
- **Pump lance:** Bram's thanks after The Old Pump. First lesson: the lane's trough and the warm valve by the heat post.
  Later: the condensers (5), the meltwater (6), the evacuation's tunnels (8), the cooling valves (11).
- **Heat flask:** from Baldino by radio plans and Lhar's smith, chapter 6: the frozen winch is its lesson (the heat
  post's heat carried to it, an alternative to the current way). Later: the observatory's frozen mirror (7), the
  valve room (8), the deep installation (11).
- **Singing fork:** Ilka's, chapter 4, when she trusts Twinsen. Lesson: a cracked crystal by the trench. Later: the
  galleries (11), the core's pylons as an optional help (12).
- **Esmer line:** Nara's case, chapter 3 (if bought) or a gift in chapter 9. Lesson: Zeelich's street, a ring over the
  canal. Later: the cloud lifts (9), the pass's ice bridges (6), the mill (10).

## Build order (after approval)
EQ2-a pocket set + pump lance (chapter 2: the user will see them), EQ2-b heat flask + fork, EQ2-c the Esmer line.
Agent: `lba3-equipment-designer`, one item pair per card, `tests/equip2.mjs` per item (found, taught, used, saved,
reloaded, no main-path dependency).

## EQ2-a: built (the pocket set and the pump lance)
Code: `src/game/tools.js` (rules, models, sounds), `src/game/story/kit2.js` (where they come from, lessons, puzzles),
`src/game/text/kit2.js`; test `tests/equip2.mjs`. Both are held tools: the weapon wheel (two small slots either side
of the pulse tool; the stick between down and a lower diagonal) or E in the inventory puts one in Twinsen's right hand;
the attack key works it. Saved with the hero (`hero.arms.pocketset`, `lance`, `water`); an older save has neither.
No new lights; effects from the soft particle pool; synth sounds that end by themselves.

- **Pocket set.** Rug in Arthur's toy corner, chapter 2 on (Arthur calls out to it once when Twinsen comes home;
  his explanation, or his note). Held: pips quicken and rise in pitch toward the nearest hum within 12 m; a small
  arrow at his feet points to it. Lesson: the cellar's loose tile (south-east corner) hides Twinsen's old tin: a
  clover (10 kashes with nine), once; without the set in hand the tile shows no prompt. Squeal: drones within 10 m
  lose aim 3 s (no wind-up, the head wanders; `Drone.squeal`); people, animals and the bore's guardian unaffected;
  8 s cooldown; no damage. First fight use: chapter 2's depot drones.
- **Pump lance.** Bram, after his clover for The Old Pump (or on the next talk for a save that already had the
  thanks). 8 jets, given full; filled (E) at Bram's trough, his basin, the square's well, Nell's barrel, the sea's
  edge. Jet: 6.5 m, stopped by walls; pushes the first enemy 3 m (stepped through collision; the guardian 0.8 m);
  crystal mites freeze 2 s (`Mite.freeze`); no damage. Lesson: Bram's old stop-cock beside the heat pipe is too hot
  to touch; a jet cools it for 25 s; turned, it fills his basin (5 kashes from Bram, once). Second chapter-2 use:
  Nell's coupler glowing on her bench settles under one jet (the barrel's dip still works).

### Later uses (notes only; not built)
- Pocket set: the dig's buried relay (4) as a hum; a live pipe among dead ones in the steam halls (5) and their
  drones; the network's relays behind walls (10); the Wannie mine's hidden seam (optional). `kit2.hums()` is where a
  chapter adds a hum ({ id, room, x, y, z }).
- Pump lance: the condensers' overheated valves (5), the meltwater basin that weighs a gate open (6), the evacuation's
  tunnels (8: a jammed wheel turned by a jet; dust), the core's cooling valves (11, optional help). A chapter takes a
  jet through its own `jetHit(o)` (story/index.js asks the chapter first, then kit2).

## EQ2-b: built (the singing fork, the Esmer line, the heat flask)
Code: `src/game/tools.js` (rules, models, sounds; `FORK`, `LINE`, `FLASK`), `src/game/story/kit2b.js` (where they come
from, lessons, puzzles), `src/game/text/kit2b.js`; hooks in `enemies.js` (`Mite.forkRing`/`shudder`, `Sentry.forkRing`/
`yank`) and `actors.js` (the line's reel takes the body: `Tools.zipStep`); test `tests/equip2b.mjs`. Held tools as EQ2-a:
small wheel slots (the line between the blowgun and the sword, the fork between the sword and the laser, the flask
between the glove and the fists; the ball keeps the top) or E in the inventory; the attack key works them. Saved with
the hero: `hero.arms.fork`, `line`, `heatflask` (the id `flask` is the shop's magic flask) and `heat` (seconds left);
older saves have none. No new lights; the soft particle pool; synth sounds that end by themselves.

- **Singing fork.** Ilka gives it on the next talk once her notebook is back (chapter 4), then says what the chapter has
  her say; an older save past that: any later talk with her. Lesson: her old sample niche beside the dig's warm crack:
  a strike cracks its crystal crust, a second (5 s later) wakes the sleeping crystal as a lamp (the lantern also shows
  it), her tin: a clover or 10 kashes, once. Fights: mites and crawlers within 6 m shudder 1.5 s (a bite or slam cut
  short); a sentry's guard drops for one hit (or 2.5 s). Later: the crystal galleries (chapter 11): a slab with a stuck
  crystal wheel turns and sinks (20 kashes, once).
- **Esmer line.** Nara's case from chapter 3 (25 kashes; she then tells where to try it); chapter 9 on, her gift after
  her stamp if never bought. 14 m; only rings, loose things, light enemies (mites, guard dogs, drones but not the
  hauler). A ring reels him along a route checked for clearance before he leaves and stepped at most 0.2 m at a time
  (never through anything solid at 10 fps; a blocked route: the cord holds and it says so; interrupted: he falls and the
  fall's recovery catches him; a save mid-reel keeps the ground he left). Lesson: the old cloud canal at the island's
  edge nearest her case (found, not fixed: open shore, nothing over the cloud): a mooring rock across a gap of cloud
  nobody walks, jumps or hops over, a ring on an arch each side; from the rock a cargo crate on a further rock comes to
  his feet (a clover and 12 kashes, once). Later: a ring on a davit at the old mill's gallery (one pull up; the
  stair-stones stay). On the rock without the line (an odd save) he is put back on the shore. Fights: a light enemy
  hauled to 1.5 m; a sentry's shield yanked aside; anything heavier only twangs the cord.
- **Heat flask.** Tashi, Lhar's smith, once Yorna has told of the frozen winch (chapters 6–7): Baldino radioed the
  drawing to the monastery; a project heat cell inside. E draws heat at the steam crack by Lhar's falls, the project
  heat post once it runs, the monks' brazier, the glacier vent once open; one charge, fading in 90 s (the HUD counts it,
  the cell window glows). Lesson: let out at the frozen winch's ice, it thaws it (the chapter's own thaw follows; no
  fuse or kite needed; the old way stays). Later: a chest frozen into the ice by the monastery yard (a clover and 10
  kashes, once). Fights: 2 damage within 2.5 m in front, ice creatures (the Hamalayi's mites) 4; cold, it only clicks.

### Later uses still open (notes)
- Fork: the core's pylons (12) as an optional help; an awake crystal as a beacon on the network's relays (10).
- Line: the cloud lifts (9), the pass's ice bridges (6). `kit2b.lineTargets()` is where a place adds a ring
  ({ kind: 'ring', x, y, z, route(from) → points, arrived() }) or a loose thing ({ kind: 'thing', x, y, z, pull() }).
- Flask: the observatory's mirror (7), the valve room (8), the deep installation (11). A chapter takes the heat (or the
  fork's note) through its own `heatHit(o)` / `forkHit(o)` (story/index.js asks the chapter first, then kit2b).
