# Clutter audit (CLUTTER-1, 3.11.2026)

The user (3.11, paraphrased): "I feel we grasped too much. I don't want too many unnecessary LBA1 and LBA2 things, no
cacophony of buildings. Check whether there is anything superfluous: something that doesn't contribute to the story and
can't be used in the game itself."

Audit only: nothing in the game was changed. Read at `b9bf660` (`ccr-adf00ea7-37ebl3`). Spoiler-light: a beat after
chapter 2 is named only by its chapter.

## Method and evidence
- **Inventory:** the builders (`town.js` HOUSES, `island.js` buildOldPlaces, `desert.js` HOUSES, `desertold.js`,
  `zeelich.js`, `zislands.js` ISLES, `zplaces.js` PLACES, `hamalayi.js` + `props-lba1hamalayi.js`, `lba1places.js`) and
  every interior in `regions.js`.
- **Use:** a grep of `src/game/story/*.js` for each place's id, room id or door id (doors, searches, quests, shops), plus
  `containers.js` (finds), `story/interiors.js` (residents), `story/shops.js`, `text/world.js` (locked-door lines).
  "No use" means no story file names it and nobody stands in it.
- **Cost:** no draw counts were measured for this audit. Cost is given as the build time the loader expects
  (`regions.js` REF, ms on the dev container; islands are built only when first visited) and file sizes. Most outdoor
  shells are merged into their region's material batches, so their real cost is **visual noise and false affordances**
  (a door that leads nowhere), not frame time.
- **Island house counts** are the original objects that our planner turns into houses (sy ≥ 1 m, footprint ≥ 1.3 m,
  before WORLD-FIX merges overlaps), from `assets/lba2/islands/*.json`.
- No screenshots were taken; the density notes below come from footprints and coordinates, not pictures.
- Sources sit in three groups: **LBA1**, **LBA2** (rebuilt from the originals' numbers), **ours** (this sequel).

**Classes.** **A** essential (the story or a quest needs it) · **B** earns its place (side use, life, shop, or a
recognisable landmark for the 80 % likeness) · **C** decor to cut or merge (a shell, a duplicate, an empty room, a dead
end) · **D** give it a purpose cheaply (one line or one find would do it).

## Citadel (chapters 1–2, 8, 10, after the ending; visits in 4–7 and 9)
| Place | From | Enter / use | What uses it | Chapters | Cost | Class |
|---|---|---|---|---|---|---|
| Twinsen's house, cellar, garden | LBA2 | yes | main story, family, cellar finds (WPN-1) | all | house 450 ms | A |
| Town square, well, well cave | LBA2 + ours | yes | prologue climax, the well | 1, after | well 80 ms | A |
| Water Office + valve room | ours (on LBA2's museum spot) | yes | valve map, a later chapter's valves | 1–2, 8, 10 | 100 + 20 ms | A |
| Whispering Cliffs, orchard, depot | ours | yes | chapter 1's three valves | 1, 3, 8 | in island.js | A |
| Old fort = project station (control, office, the bore) | LBA2 + ours | yes | tour, infiltration, later chapters | 1–2, 8, 10–12 | 90–110 ms per room | A |
| Harbour, Doran's boat, bell, ferry stop | LBA2 + ours | yes | prologue bell, chapter 2 crossing, ferry from 4 | 1–2, 4 on | in island.js | A |
| Lighthouse + lamp room | LBA2 | chapter 3 scene, chapter 10 | two later beats | 3, 10 | 140 ms | A |
| Citadel Spaceport, terminal, tower | ours | yes | the only link to Zeelich | 2 on | spaceport.js 18 KB, terminal 90 ms | A |
| Glider field | ours | yes | travel | 8 on | small | A |
| Tavern + cellar | LBA2 | yes | Luc and regulars, leads; sewer drop | all | 120 + 60 ms | B |
| Mr Bazoo's | LBA2 | yes | shop | all | 60 ms | B |
| Pharmacy | LBA2 | yes | shop (potion, honey) | all | 60 ms | B |
| Baggage claim (Osk) | LBA2 | yes | Sefa's parcel errand | all | 90 ms | B |
| Ticket office (Ines, Rollo) | LBA2 | yes | sells a cabin ticket for a ferry that is free (a heal on boarding) | all | 50 ms | C (merge) |
| Nell's home (interior) | LBA2 (Paul's house) | yes | Wim at a bench; the coupler quest runs at her stall outside | all | 80 ms | C (merge) |
| Neighbours' house (Hedda) | LBA2 | from ch. 1's end | a resident; the prologue's kettle and taps | 1 on | 80 ms | B |
| Esmer trading house (Sefa) | ours | at its door | shop + parcel errand | 2 on | 4 KB | B (style note below) |
| Customs booth, Nell's stall, harbour master's shed | ours | yes | The Mislabelled Shipment; Doran | 2 on | small | B |
| Project barge + slewing lift, project ferry model | ours | no | decor (the project's traffic) | 1–2 | in island.js | C (trim) |
| Bersimon's tent | LBA2 | yes | magic top-up, the sewer trapdoor | all | 20 ms | B |
| Sewers: hall, vault, globe room, 5 ways in | LBA2 + ours | yes | Under the Street (optional) | 1 on | 160 ms, sewers.js 62 KB | B (five ways in is many) |
| Pink house (Sewer Works door), terrace porch | LBA2 | yes since SEWERS-1 | sewer ways | 1 on | in town.js | B |
| Tralu's cave | LBA2 | yes | one cache, Raph's guitar case (C-2) | 1 on | 120 ms, 15 KB | B (thin) |
| FunFrock's asylum | LBA1 | yes | a register (a clover), Twinsen's cell (coins); guards; no story beat, nobody points there | 1 on | 150 ms, 127 KB data | D |
| Statue of Twinsen and Zoé | LBA2 | no | a landmark only (the plaque cannot be read) | all | statue.js 13 KB | B → D |
| Bay rocks, pump lane, garden | ours | yes | chapter 1 warm stones; The Old Pump | 1 on | small | B |
| Stone house (`stone`) | LBA2 | locked, a note | nothing | all | in town.js | C |
| Shop house (`shop`) | ours | locked, a card | nothing; its awning and globe sign promise a shop beside Pippa's stall | all | in town.js | C |
| Passage ends: fort-yard hatch, north tunnel mouth | LBA2 | locked forever | nothing (C-1 never built) | all | in island.js | C |
| West islet dome + figure | LBA2 | out of reach, a door prompt in code | skyline only | all | in island.js | C (keep as skyline, drop the door) |

## Desert Island (chapters 4–5; visits later)
| Place | From | Enter / use | What uses it | Chapters | Cost | Class |
|---|---|---|---|---|---|---|
| Pier, ferry stop, glider field, Hesk's yacht | ours | yes | travel | 4 on | in desert.js | A |
| The dig, Temple of Bù (our temple) | LBA2 + ours | yes | chapter 4 | 4 on | 30 ms | A |
| Oasis wind-pump | ours | yes | ADV-2 puzzle | 4 | in desert.js | A |
| Ilka's camp, research post | ours | yes | chapters 4–5 | 4–5 | in desert.js | A |
| Condenser hall (two rooms) | ours | yes | chapter 5 | 5 on | 30 ms | A |
| Kesh: Tarra's house + 4 houses (locked) | LBA2 village, ours | Tarra's by story | residents, finds by the walls | 4 on | in desert.js | B |
| Kesh's cool room + loom + screens | ours | yes | The Wind-Catcher (side story) | 4 on | keshlife.js 39 KB | B |
| School of Magic: the mask, its door, the interior | LBA2 | yes | Ker'aooc (healing, a ward), the Rector | 4 on | 30 ms | B |
| School's great-hall block in the pool | LBA2 | locked | nothing: a second School building beside the real door | — | desertold.js | C |
| Gateway over the dig track (body 64) | LBA2 | walk through | frames the way to the dig | 4 on | small | B |
| House S40 (stoop, garden wall, palm, pillar) | LBA2 | locked | nothing | — | desertold.js | C |
| Tower S28 in its hollow | LBA2 | locked | nothing | — | desertold.js | C |
| House B49 | LBA2 | locked | nothing | — | desertold.js | C |
| Two 5.2 m figures west of Kesh | LBA2 | no | nothing | — | desertold.js | C |
| Twin pillars, old corral (fences, gate, troughs, tank, lean-to) | LBA2 | no | nothing | — | desertold.js | C |
| North-east compound S24 (2 houses, walls, well, palms) | LBA2 | locked | nothing | — | desertold.js | C |
| Hut S113 on the north-west plateau | LBA2 | locked, not reached on foot | nothing | — | desertold.js | C |
| Islet door + 4.6 m figure + pillar | LBA2 | locked, not reached on foot | nothing | — | desertold.js | C |
| Bù's spiked maze (`bumaze`) | LBA1 room 57 | yes, from the temple | optional; leads to the halls | 4 on | 170 ms, 11 KB data | B (keep one) |
| Bù's dark halls (`buhalls`) | LBA1 room 40 | yes | optional loop: mites, one chest, the way back up | 4 on | 112 KB data | C (merge into the maze) |

desertold.js is 44 KB; the shells above are nine locked doors (CONNECTIONS_AUDIT §5) and none has a reason line in
`text/world.js` (they answer the bare "Locked.").

## The Hamalayi (chapters 6–7; visit later)
| Place | From | Enter / use | What uses it | Chapters | Cost | Class |
|---|---|---|---|---|---|---|
| Foothills landing, shepherd's hut | ours | yes | arrival | 6 on | 600 ms region | A |
| The gorge and the dead tree | ours | yes | the ball bridge | 6 | hamalayi-tree.js | A |
| Lhar village | ours | yes | residents, chapter 6 | 6 | in hamalayi.js | A |
| The lift and heating station | ours | yes | the winch | 6 | in hamalayi.js | A |
| Monastery | ours | yes | refuge, the ridge path | 6–7 | in hamalayi.js | A |
| Observatory, glacier basin | ours | yes | chapter 7, a later chapter | 7, 10 | 15 ms | A |
| Old gate (scene 69) | LBA1 | walk through | frames the walk to the gorge | 6 on | one kit | B (the one to keep) |
| Gantry: causeway and arcade (scene 65) | LBA1 | climbable | nothing; leads to a lantern | — | one kit | C |
| Rebels' camp: tents on a platform (scene 9) | LBA1 | walk on | nothing; empty tents of a war twelve years over | — | own kit | C |
| Waystone with a lit niche | LBA1 | no | nothing | — | one kit | D (a find in the niche) or C |

props-lba1hamalayi.js is 28 KB.

## Zeelich: the hub (chapter 3; visits from 4; chapters 9–10)
| Place | From | Enter / use | What uses it | Chapters | Cost | Class |
|---|---|---|---|---|---|---|
| Zeelich Spaceport deck + terminal | ours | yes | arrival by spaceship | 3 on | 90 ms | A |
| Esmer street, Nara's case | LBA2 + ours | yes | residents, shop | 3 on | 800 ms region | A |
| Baldino's workshop, test step | LBA2 + ours | yes | main story | 3, 9, 10 | 180 ms | A |
| Three windmills + old mill | LBA2 | yes | chapter 3 brakes and cog | 3, later | in zeelich.js | A |
| Project depot, drill platform | ours | yes | chapter 3 | 3 | in zeelich.js | A |
| Council house (upper, council, archive) | ours | yes | chapter 9 | 9 | 350 ms | A |
| Snuff's bakery (old watch house) | LBA2 + ours | roof, hatch | The Second Bake (side story) | 3 on | zeelife.js 34 KB | B |
| Sky pier, horseshoe gateway, shuttle pad | LBA2 | yes | the islands' shuttle | 4 on | in zeelich.js | B |
| Dog-training yard (palisade, track, three dogs) | LBA2 | no | nothing; dogs bark from behind the fence | 3 on | dogs.js 22 KB (shared with the guard dogs) | C |

## Zeelich: the 11 islands (`zislands.js`, shuttle from chapter 4)
No island has a resident ("none stand here yet", `zislands.js` PEOPLE-1). No story file names any island except
Under Celebration (the glove) and, through their rooms' doors only, Otringal and Celebration.

| Island | From | Enter / use | What uses it | Cost (build ms; house shells) | Class |
|---|---|---|---|---|---|
| Otringal | LBA2 | outdoors; the harbour bar, its office and the Imperial Hotel lobby open | nothing: the three rooms are empty, no person, no interaction (the coin machines are drawn only); finds in crates | 600 ms; 55 shells; 65 KB data; otrbar 19 KB, otrhotel 14 KB | D (OP-7) / C (the office) |
| Celebration Island | LBA2 | outdoors; the Temple of the Dark Monk opens | nothing: the temple is empty, no lectern read; one find | 160 ms; 3; celtemple.js 12 KB | D |
| Under Celebration | LBA2 | outdoors; the Wannie mine adit | the Wannie glove (WPN-1), which opens the cellar's coal chute | 320 ms; 1 | B |
| The Platform (Wannies' island) | LBA2 | outdoors; mine village, chapel | nothing yet; OP-7 is its purpose; the name clashes with the drill platform | 180 ms; 15 | D (OP-7) |
| The Lift Dock (ASCENCE) | LBA2 | outdoors | nothing: its lift goes nowhere; one find | 120 ms; 9 | D (OP-7) |
| Knartas Island | LBA2 | outdoors | crate finds only | 300 ms; 31; 28 KB data | C |
| Mosquibee Island | LBA2 | outdoors (town on ledges, small walkable area) | a find only | 260 ms; 5; 24 KB data | C |
| The CX Islet | LBA2 | outdoors | crate finds only | 80 ms; 8 | C |
| Tralu Rock | ours | outdoors | a find; name clashes with Citadel's Tralu's cave | 290 ms | C |
| The Nectar Orchard | ours | outdoors | a find; name clashes with Citadel's orchard (chapter 1) | 230 ms | C |
| The Old Watch | ours | outdoors | a find; name clashes with Zeelich's old watch house (the bakery) | 90 ms | C |

zislands.js is 140 KB and zplaces.js 12 KB; the island data is 174 KB.

## Top 10 cut or merge candidates
1. **Knartas, Mosquibee Island and the CX Islet.** Original islands with nobody on them, no story, only crates of
   kashes; Knartas alone is 31 empty house shells. Cut them from the shuttle (or keep one as "the market island").
   Saves ~640 ms of building on first visit, 57 KB of data, three menu entries, ~45 shells.
2. **Tralu Rock, the Nectar Orchard and the Old Watch.** Our own inventions with one find each, and each name repeats
   a place the player already knows (Citadel's Tralu cave and orchard, Zeelich's old watch house). Cut. Saves ~610 ms,
   zplaces.js and their STYLE blocks, three more menu entries; removes the name confusion.
3. **Desert Island's original-only buildings:** house S40, tower S28, house B49, the north-east compound, the hut S113,
   the islet door, the two figures, the twin pillars and the corral. Nine locked doors and no use; they crowd Kesh's
   outskirts with a second set of adobe that is not the village. Cut, or leave two as roofless ruins. Saves most of
   desertold.js (44 KB) and nine "Locked." dead ends.
4. **The School's second block in the pool.** A locked "great hall" right beside the mask whose door is the real School.
   Two School buildings read as one too many. Cut the block, keep the mask, plaza and bridge.
5. **The Hamalayi's LBA1 pieces.** Keep the old gate (it frames a walk the player takes); cut the rebels' camp (empty
   tents of FunFrock's war, twelve years on) and the gantry (a causeway to a lantern). Saves two kits and their colliders.
6. **Bù's dark halls into the maze.** Two LBA1 rooms in a row for one optional chest. Keep the spiked maze, put the
   chest and the way back up at its end, drop the halls. Saves 112 KB of data and one load.
7. **Citadel's sealed doors that open in no chapter:** the fort-yard hatch and the north tunnel mouth (FunFrock's
   passage), the islet dome's door. Remove the doors (the dome stays as skyline) or build C-1; a locked door that never
   opens is clutter. Saves three dead-end prompts.
8. **Citadel's two shell houses.** The `shop` house has an awning and a globe sign that promise a shop beside Pippa's
   stall, and it never opens; the `stone` house is locked forever. Strip the shop's sign and awning (a plain house), and
   let the stone house be a plain house with no door prompt. Saves two false leads in chapters 1–2.
9. **The ticket office and Nell's home.** The ferry is free, so the cabin ticket is a second way to heal; Nell's quest
   runs at her stall, not inside. Merge the ticket into the baggage claim's counter and close Nell's interior (or put
   the coupler's bench inside). Saves two interiors (130 ms) in the busiest corner of the town.
10. **Otringal's office and the Zeelich dog-training yard.** The bar's office is an empty second room; the dog yard is a
    fenced course with three dogs and no use, crowding the north houses by the old mill. Merge the office into the bar
    (the boss at the bar's back); cut the yard (the guard dogs stay at the depots). Saves 40 ms and one room; one less
    fenced block on the street.

## Top 5 cheap "give it a purpose" items
1. **The Imperial Hotel's coin machines** (Otringal): make the two machines sell life and magic through the game's one
   shop (story/shops.js), as Sefa does. One interaction; the empty lobby becomes a stop worth the shuttle.
2. **The Dark Monk's lectern** (Celebration): one read at the lectern, a line about the murals showing the shell. A
   reason to go down the stair now; it pays OP-7 step 6 later.
3. **The Lift Dock's lever**: a read on the lift's lever, the project's plate LIFT RESERVED, one line. It explains
   the lift that goes nowhere and is OP-7 step 2 already.
4. **The statue's plaque** (Citadel square, chapters 1–2): let Twinsen read it, with one line of his own. The square's
   biggest landmark gets an interaction where the user plays now.
5. **The asylum's pointer**: one line from a tavern regular about the project's guards at the old asylum, so the player
   has a reason to look; the register's clover and the cell's coins then reward the visit.

OP-7 "The Lift Below" (EXPANSION_PLAN.md) is the full purpose for items 1–3 and the Wannies' island; it is designed
and not built. If it stays unbuilt, items 1–3 alone keep those rooms from being empty, otherwise lock them with a
one-line reason.

## Clusters that read as a cacophony
- **Citadel's harbour wing (x −110…−65, z 20…50).** In ~45 m: the ticket office (15 m long), Nell's home, Mr Bazoo's,
  the Esmer trading house (an Otringal dome), the customs booth, the harbour master's shed, Nell's stall, the ferry
  stop, the project barge with its teal slewing lift and the project ferry. Four building languages side by side
  (Citadel stone and plaster, an Esmer dome, the project's teal modules, plank sheds). Merging the ticket office and
  Nell's interior (cut 9) and dropping the barge's lift would leave one Esmer building as the only foreign note.
- **Otringal.** About 55 original house positions turned into the same domed Esmer piece, two of them open, nobody in
  any. WORLD-FIX already had to merge overlapping ones. It reads as a field of identical shells. Keep the harbour pier,
  the plaza and the two doors; thin the rest to the silhouette.
- **Kesh's outskirts.** The village's five adobe houses, FunFrock's concrete cool room, the oasis tower, and, within
  40 m, three more original buildings (S40, S28, B49) and two 5 m figures that belong to nothing. The village loses its
  edge; cut 3 restores it.
- **Zeelich's north side.** The north houses, the dog-training yard, the bakery's tower, Pelleck's
  scaffold, three windmills and the old mill share one stretch of the island. The yard (cut 10) is the piece to drop.

## Keep as they are (for the 80 % likeness)
Twinsen's house, the square and well, the tavern, Mr Bazoo's, the pharmacy, Bersimon's tent, the lighthouse, the old
fort; Kesh, the School's mask, the Temple of Bù; the old gate in the Hamalayi; the Esmer street, the windmills,
Baldino's workshop. These frame the world and each has a use.

## If cuts are taken: tests and saves to check
`tests/zislands.mjs` (the island list and shuttle menu), `tests/lba1rooms.mjs` (bumaze, buhalls), `tests/asylum.mjs`,
`tests/containers.mjs` (ISLES_AT, the desert finds), `tools/worldscore` (desertold's landmarks), the holomap. Saves keep
an island by its index in ISLES: cut islands must leave their slot (or a save on a cut island must land on Zeelich).
