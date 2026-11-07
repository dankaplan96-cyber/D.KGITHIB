# Zeelich as a player meets it: an inventory (wave 1, 7.11.2026)

Worker: world-campaign-finisher. Base: `ccr-c1c2c4b9-dep6ed` at `aba9e988`. The inventory is taken from the current
source and from automated runtime probes in SwiftShader (headless Chromium, 960×540, Follow camera at Medium). None of
it was played by a person. Labels as in `PROJECT_CONTRACT.md`. The doors are in `BUILDING_REGISTER.csv`, one row per
building. The bar every region is measured against is in `citadel-bar.md`.

**Resemblance.** The cloud holds no original LBA2 files. This file names the LBA2 location each area stands for and
describes it. Every resemblance score is **Unverified** until the laptop's reference curator scores it against the
originals (`WORLD_RESEMBLANCE_TEMPLATE.md`).

**The terminal island is a new city of Zeelich, with Zeelich's identity** (the user's decision of 7.11.2026, recorded
by the laptop in `tools/testlab/WORLD_ART_REQUESTS.md`, commit 92eb2615): "a new place on Zeelich, another city we were
not in in the previous game". It is not an unverified LBA2 place. It has no original to match for geography or
landmarks. What it must carry instead is Zeelich's identity as LBA2's own islands show it: the Esmer architecture's
shapes, the palette and materials, the cloud sea and the light, the vegetation, the inhabitants (Esmer, Quetch) and
the everyday interactions. It should read as one more town beside Otringal, Celebration and Knartas. The laptop scores
it with the rubric minus the geography and landmark parts, and sends art changes as requests. The layout, paths, doors
and story spots stay as they are. This wave's doors, rooms and people are additions inside that layout.

## Where Zeelich comes in the story

| Chapter (key) | On Zeelich | Areas built (`regions.js` CHAPTER_AREAS) |
|---|---|---|
| 3 `zeelich` (class Chapter2, `story/chapter2.js`) | the whole chapter: the plan is confiscated at the spaceport; Baldino; the depot locker; the cog on the old mill; the three mills braked; Zoé's broadcast (Citadel); the shield; Vesk leaves; the console | zeelich, workshop, lighttop |
| 4–8 | optional visits: the public spaceship, the island shuttles (from ch. 4), The Second Bake, The Test Pair | — |
| 9 `council` (`story/council.js`) | the council: the petition, the stamps, the mills' brakes, the hearings, the archive | zeelich, upper, workshop |
| 10 `network` (`story/network.js`) | Oku's mill relay (one leg of the network) | zeelich and the others |
| epilogue | Baldino at the radio | — |

## The terminal island (`zeelich.js`, `zeelife.js`): a new city of Zeelich, with Zeelich's identity

West to east: Zeelich Spaceport (a deck off the south shore with the pavilion of the terminal, `zterminal.js`), the sky
pier and its horseshoe gateway, the shuttle pad, the Esmer street with the plaza and its fountain, five houses, the
watch house, three windmills, the dog-training yard behind the north houses, the fenced project depot, and the drill
platform behind its shield.

| Area | Zeelich identity it draws on (no original counterpart: a new city) | Before this wave | Now (this wave) | Evidence |
|---|---|---|---|---|
| Spaceport deck + terminal | Otringal's astroport: a landing field with shuttles and the departure and arrival halls (scenes 78 and 82). Our terminal hall follows them | pavilion door → `zterminal` (hall with clerk, guard, porter) | unchanged | `zeelich-doors` (door in/out) |
| Sky pier, gateway, shuttle pad | (ours) an LBA2-style horseshoe gate; the original has cab ranks | shuttle pad from ch. 4 | **Rezz the shuttle pilot**: grounded in ch. 3 and 9, waiting at his shuttle and the gate; away flying in ch. 4–8 and 10+ | Automated runtime only |
| Esmer street and plaza | Otringal's downtown look (taupe stucco, glass-block bands, faceted caps). LBA2's plaza is busier: police, a newspaper seller | 3 walking residents (Ilo, Aven, Kira) + street folk | **Fennick** the project's heat fitter (lit and dark heat posts, the bakery's heat box, the feed); **Oma**, who keeps the council's notices (the door, the petition box, the dark posts' tags) | Automated runtime only |
| House 0: Mr Pelleck's (minaret; dome under scaffold) | (ours) | door said "Locked." | **door → `zh_pelleck`**: his ledgers, Form 7-B, the radiator that is not connected yet, tile samples, crates of blue tiles, his bed | `zeelich-doors` |
| House 1: the council house (arcade) | (ours) the council's antechamber, chamber and archive (`upper.js`, ch. 9) | ch. 9: door → `upper`; other chapters "Locked." | ch. 9 unchanged; otherwise **visibly closed**: a notice on the door, HEARINGS BY PETITION ONLY, and its own line | `zeelich-doors` |
| House 2: Nara's flower house | (ours) | "Locked." | **door → `zh_nara`**: benches of cloud flowers, the potting table, the order slate for Xil; crates for Citadel stacked HELD in ch. 3, mostly gone from ch. 4; **Lissa**, Nara's niece | `zeelich-doors` |
| House 3: Oku's house (dark heat post) | (ours) | "Locked." (Ilo knocks at it on her round) | **door → `zh_oku`**: charcoal stove (no project heat at this end), quern and flour, a sail on its mending frame, the family table, bunks; **Wenna**, Oku's wife, whose lines follow the mills' brakes, the council and the network | `zeelich-doors` |
| House 4: Baldino's workshop | (ours; LBA2's Baldino has no workshop on Zeelich) | door in ch. 3, 9, 10 and the epilogue; **"Locked." in ch. 4–8** although The Test Pair and his fee tin are meant to be there | **door in every chapter from 3** | `zeelich-doors` (ch. 5) |
| The watch house: Snuff's bakery | (ours, twelve years on) | the door had no prompt (the hatch and the roof are The Second Bake) | **door → `zh_bakery`**, opened by its prompt rather than walked into (Snuff's counter is 1.2 m from it): the oven on the project's heat (cold, or glowing after The Second Bake), bread racks (empty or full), kneading table, sacks, Tavo's baskets | `zeelich-doors` |
| Three windmills (old north, east, south) | (ours) LBA2's Zeelich has no mills; they are ch. 3's brake puzzle | doors drawn on the towers, no prompt | **visibly closed** with a reason: the old mill's door is nailed shut (its stair goes round the outside); Oku's padlock on the others | `zeelich-doors` |
| Dog-training yard | after LBA2's dog yard (the palisade, the track, the block tower, the tunnel) | yard, no building | unchanged | — |
| Project depot (fenced) | (ours) | its shed's door had no prompt | **visibly closed**: PROJECT STORES. STAFF ONLY | source only (inside the drones' patrol) |
| Drill platform | (ours) | the control hut's door had no prompt | **visibly closed**: the control hut, locked | source only (behind the shield in ch. 3) |

The new people belong to the new city's Zeelich identity: Esmer (Lissa, Wenna, Rezz) and Quetch (Fennick, the project's
fitter; Oma at the council), beside the street's Mosquibees, Wannies and triangle-headed townsfolk. Each has a trade,
a round, and lines that change with the story's phase. People who share a model get their own dress (DRESS-1).

### The camera on the street (the user's report of 7.11: "all the buildings disappear when you get close")

Before: every house, the mills and the watch house faded to 15 % whenever the camera's line to Twinsen crossed their
box. That is 9 to 37 materials see-through on a walk down the street (probe `route-z`, base). Now the street follows
Citadel's VP-10 rule. Nothing fades. The houses, domes, minarets, mills and the watch house give the camera tight
shapes (`R.occ`), and every other tall solid is added by `roomocc.js` occAuto. The next shot rises over a building
instead of the building vanishing. The one fade left is the council house's porch, while he stands under its roof.
Pictures (base / new): `shots-base/route-z`, `shots-new/route-z` in the worker's scratchpad.

## Zeelich's islands (`zislands.js`; from chapter 4, no main story)

Counted at runtime in chapter 5 (probe `zinv.mjs`: each island built and entered; `inventory.json` and a picture per
island in the worker's scratchpad `shots-new/zinv/`). "Shut" means a house door that answers with the generic
"Locked."; "live" means a door that leads in. People are the island's residents (PEOPLE-1, `islandlife.js`), four to six
each, with rounds and lines. Camera: every island's tall solids are camera volumes now (automatic).

| Island | LBA2 counterpart (for the curator) | Buildings (worldfit) | Doors that lead in | Shut ("Locked.") | People | Camera volumes |
|---|---|---|---|---|---|---|
| Otringal | OTRINGAL: the Esmers' capital (harbour, downtown, upper city with lifts, astroport, palace) | 31 | 2: Kingo's harbour bar (after scene 136), the Imperial Hotel lobby (after scene 81) | 24 | 4 | 65 |
| Knartas | KNARTAS: the Francos' island (diggers' village, gazogem refinery, harbour) | 32 | 0 | 20 | 5 | 35 |
| Mosquibee Island | MOSQUIBE: the Mosquibees' cocoon village (lower world in LBA2) | 4 | 0 | 4 | 4 | 7 |
| Celebration | CELEBRAT / CELEBRA2: the volcano, the risen figure, the Temple of the Dark Monk | 1 | 1: the temple (after scene 93), down from the plaza | 1 | 4 | 3 |
| Under Celebration | SOUSCELB: under the volcano (waterfall cave, ferry landing) | 1 | 0 (the Wannie mine adit is a dark entrance with a find, not a room) | 1 | 4 | 10 |
| The Platform | PLATFORM.ILE: the Wannies' island (gem mine, Building Company, village) | 13 | 0 | 7 | 6 | 14 |
| The Lift Dock | ASCENCE: the Francos' platform, the lift to the lower world | 0 | 0 | 0 | 4 | 16 |
| The Nectar Orchard | ours (no counterpart) | 2 | 0 | 1 (the press house) | 4 | 3 |
| The Old Watch | ours (no counterpart) | 0 | 0 | 0 | 4 | 2 |

**Wave 3 (buildings-interiors, 7.11.2026): the 58 island house doors that answered "Locked." now lead in, except
three that stay shut with a reason and a sign.** That is 55 compact rooms (`src/game/ihomes.js`, one lazy group each),
each fitted to who lives or works there: Otringal 23 (homes, a school, the market, the tea room, the post office, the
trading post, a clinic, a reading room, offices, a laundry, a meeting hall, a glazier, two stores), Knartas 20 (the
harbourmaster's office, the diggers' canteen, a bunkhouse, the gem-sorting room, homes, stores, a smokehouse,
workshops, the village hall), the Platform 7 (homes, the Building Company's office, the ore store, the chapel, a lamp
mender), Mosquibee 2 (the honey room, the hive keepers' hall), Celebration (the lantern makers' store), Under
Celebration (the gas works' gauge room) and the Orchard (the press house). Six have a keeper (Ossa, Liwa, Dobb, Brem,
Gorrin, Clerk Tesk). The exceptions are Otringal's fountain pump house (2.5 m wide, PUMP HOUSE) and Mosquibee's two
1.9 m curing cells (sealed, HONEY). Each has its own line, and a board and a plank across the door show it. Kesh's
five houses and the project post's three cabins on Desert Island lead in too. The rooms are our own layouts, not LBA2's
(none of these doors had an original interior in our reference). Their resemblance is unscored. Evidence:
`tests/island-doors.mjs`, Automated runtime only. Per door: `BUILDING_REGISTER.csv`.

## What is still missing (and for whom)

- **Island houses**: done in wave 3 (above). Left: the rooms follow no LBA2 interior (the curator may send references
  for the ones that stand for original rooms); nobody has played them on a GPU.
- **Resemblance scores**: Unverified everywhere (the laptop's curator).
- **The lower world under the gas, the cab drivers, Zlitos, the casino**: see `docs/future/ZEELICH_GAP.md`. Not this
  wave's scope (no new layers or lore).
- **Kesh's houses on Desert Island**: done in wave 3 (Brosk's, Lumi's, Mother Tarra's, Safi's, Hesk's lodging, and the
  post's office, bunks and stores).
