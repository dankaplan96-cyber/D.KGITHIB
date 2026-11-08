# The Hamalayi as a player meets it: an inventory against Citadel's bar (8.11.2026)

Worker: world-campaign-finisher (cloud), the Hamalayi's own Citadel-bar pass. Base: `ccr-c1c2c4b9-dep6ed` at `f023e47e`.
The bar is `citadel-bar.md`. Evidence labels as in `PROJECT_CONTRACT.md`. Runtime evidence is SwiftShader in headless
Chromium (960×540, Follow camera, Medium): **Automated runtime only**. Pictures were looked at; nobody has played this.
No frame-rate claims. Probes and pictures: the worker's scratchpad `hamalayi/` (`base/`, `rooms-base/` before; `ph/`,
`cam/` after), not in the repo.

**Resemblance.** Lhar, the landing, the monastery and the observatory are our places (LBA1's Hamalayi gave the old gate
and the waystone only: `props-lba1hamalayi.js`). They carry the world's identity, not an invented original. Unscored:
the laptop's curator scores them.

## Where the Hamalayi comes in the story

| Chapter (key) | On the Hamalayi | Areas built (`regions.js` CHAPTER_AREAS) |
|---|---|---|
| 6 `pass` (`story/pass.js`) | the whole chapter: the glider down; the tree over the gorge (ball); Lhar; Yorna; the heat station's fuse for Pim's kite (ball); the winch thawed; the mooring rope (sword); two trips and the ice mites; the ride up; the monastery | hamalayi |
| 7 `observatory` (`story/observatory.js`) | the whole chapter: the ridge; Sefa; the mirrors and the second sun's ice; Sendell; the telescope melts the vent's cap; the heavy drone; the seal's three warm discs; the glider off the monks' slope | hamalayi, obsv |
| 8 `evacuation`, 9 `council` | optional: the glider field links Citadel, Desert Island and the Hamalayi from chapter 8 (`travel.js`) | — |
| 10 `network` (`story/network.js`) | Sefa's dome relay: Yorna and Pim at the monastery, the ridge's crawler and mites, Pim at the big mirror | hamalayi, obsv (and the others) |
| epilogue `home` (`story/epilogue.js`) | optional: Lhar lived in again (Yorna, Pim and the three on the square) | — |

## Before this pass (base `f023e47e`; probe `base.mjs`, `rooms.mjs`)

| Area | What is there | Against the bar | Evidence |
|---|---|---|---|
| Camera | VP-10 since wave 1: nothing fades; 25 camera volumes (`roomocc.js`) | met; REVIEW-HAMALAYI left 6 camera spots "for the cloud" (the gorge's south bank, the bridge's north end, Lhar by the falls, the observatory door, the heat station, the trail's bend) | probe `cam.mjs` (below) |
| The landing | Hesk and his glider (chapter 6), the shepherd's hut (door → `ih_ham_landing0`: harnesses, a logbook), the fold, the windsock | the hut's line named a field keeper nobody has | `rooms-base/pass-ih_ham_landing0.jpg` |
| Lhar's five houses | doors → `ih_ham_lhar0…4` (wave 3, original-mechanics), the planner's furniture | **empty in every chapter**; the same in every phase (no packing on moving day, a lit hearth in an abandoned village, chimneys smoking all through); the rooms' owners did not match the residents' rounds (Bero carried his sacks out of house 3, which was "Sana's loom"; Sana took her washing into house 4, "Lhamo's kitchen") | `rooms-base/*.jpg`, `base/inv.json` |
| Lhar's people | the story's five (Yorna, Pim, Tashi, Dawa, Old Norbu) and 8 residents (`storylife.js`): packing in Lhar, then the monastery's camp | lines only for two phases (Lhar, the camp); nobody ever goes home; in a save with only a later chapter's key (chapters 7–10) Yorna, Pim and the three stood in Lhar's square while their neighbours camped by the monastery | `base/council-square.jpg` |
| Lhar's things | notice board, trough, fire, carts, sledges, a goat pen, woodpiles | the notice board and the pen look usable and did nothing; the pen is empty with no reason | source (`hamalayi.js`) |
| The heat station and the lift | the story's (chapter 6) | met (REV-HAM-ART moved the shed) | — |
| The monastery | the hall (two golden roofs, a porch, **a red double door**), the yard, the prayer wheels, the camp east of the walls | **the hall's door did nothing** (no prompt, no line): the biggest building of the region, the village's refuge; nobody of the monastery anywhere though the story says "the monks have opened the gates"; the prayer wheels did nothing | `base/pass1-yard.jpg`, probe: `hallDoor: null` in every phase |
| The observatory | the drum, the dome, the door (chapter 7, 10, the epilogue → `obsv`), Sefa's house next door (→ `ih_ham_obs0`) | **the dome's door was silent in chapters 6, 8 and 9**; Sefa's house empty in every chapter | probe: `obsDoor: null` |
| Music | the region `hamalayi` (Prayer Flags), the rooms `home` | the hall needs its own | — |

## What this pass did (HAMALAYI-LIFE), in the order a player meets it

The region's phases are read from the chapter and chapter 6's own flags (`story/hamlife.js` phase()); nothing new is
saved and no flag changes meaning:

| Phase | When | Lhar | The monastery | Who is home |
|---|---|---|---|---|
| pack | chapter 6 until a house's trip goes up (`c6_trip1`/`c6_trip2`) | bundles tied by each door, hearths lit, every chimney smoking | the bedrolls laid out from the first trip | the packers come and go by their doors (residents' rounds) |
| camp | chapter 6 once up, chapter 7 | no smoke, dark windows, cold hearths; each house's own look says it stands empty | the old and small of Lhar sleep in the hall | nobody in Lhar |
| mend | chapters 8–10 (the vent breathes, the ground is still) | smoke from the houses being mended, windows lit; Bero's mortar and slates, Sana's new flags across her room, Lhamo's stacked bowls | the camp stays; bedrolls in the hall | Bero, Sana, Lhamo (their outdoor selves away); Yorna in her house and Sefa in his in chapters 8–9 |
| home | the epilogue | lived in again, every chimney | the hall empty of guests | Old Dorje in his corner; the rest outdoors on their rounds |

| # | Where | Before | After | Files | Evidence |
|---|---|---|---|---|---|
| 1 | The landing's hut | its line named a field keeper nobody has | Hesk's waystation (his name on every page of the logbook) | `text/ihomes.js` | Source only |
| 2 | Lhar's houses: who owns which | the room owners crossed the residents' rounds | Lhamo's kitchen (house 0), Yorna's (1), Old Dorje's (2), Bero's (3: he carries his sacks out of it), Sana's loom (4: she takes her washing in) | `ihomes.js` (the five kinds), `text/ihomes.js` | `rooms-base/` → `ph/` |
| 3 | Lhar's houses by phase | the same in every chapter, empty | the table above: their things (`hamrooms.js` dressLharRoom, placed on free floor against the room's own pieces), the hearth light (×0.3 while empty), the chimney (`hamalayi.js` R.chimney), the windows (one glow for Lhar's houses: R.lharWindows), their own look per phase (`ih_ham_lharN_pack/_empty/_mend`) | `hamrooms.js`, `story/hamlife.js`, `hamalayi.js`, `props-mountain.js` (mountainHouse `glow`), `text/hamlife.js` | `hamalayi-life` |
| 4 | The owners at home | nobody, ever | indoor selves of Bero, Sana, Lhamo (mend) and Old Dorje (home): the outdoor resident's phase is null then (`storylife.js` homeAt), one dress (index.js `dressOf`), one name and voice (they speak as `n_lh_*`), a round between two of the room's pieces at work (the work pose held, so the round goes on with Twinsen in the room). Yorna (chapters 8–9) and Sefa (chapters 8–9) are placed at home by their chapters (`pass.js`, `observatory.js` ask hamlife.home()) | `story/hamlife.js`, `storylife.js`, `story/pass.js`, `story/observatory.js`, `story/index.js` | `hamalayi-life` |
| 5 | Lhar's residents' lines | two phases | + a camp-while-mending line (`rs_*_mend`: Tam, the children, Bodo, Old Dorje) and a home line (`rs_*_home`) | `storylife.js` (rounds.mend = rounds.mon), `text/hamlife.js` | Source only (lines), `residents` |
| 6 | Lhar's things | the notice board and the goat pen did nothing | the notice board reads per phase (moving day; LHAR IS AT THE MONASTERY; the mending rota; WELCOME HOME); the pen says where the goats went; the shrine reads; the heat station's shed reads once it runs | `story/hamlife.js`, `text/hamlife.js` | `hamalayi-life` (the board) |
| 7 | Old saves | a save with only chapter 7–10's key put Yorna, Pim and the three in Lhar's square while their neighbours camped up at the monastery | past chapter 6 the village is up whatever the save holds (`pass.js` place: `past`) | `story/pass.js` | `hamalayi-life` |
| 8 | **The monastery's hall** | a red double door that did nothing | it leads in (`hamrooms.js` ham_hall: the monks' prayer hall, LBA's cut-away shell, its own music `mountain`, two lights and the blue stone's): the altar with the blue stone that came down from the dome when it was Sendell's shrine and seven butter lamps; the big prayer wheel turns (`R.wheel.spin`); the tea stove gives 2 life every 20 s (a recovery point before the ridge, chapters 7 and 10); cushions; the villagers' bedrolls from the first trip until Lhar goes home. **Brother Tenpa** keeps it on a round (stove, lamps, wheel), with a line per phase | `hamrooms.js`, `story/hamlife.js`, `regions.js` (one group), `travel.js` (regionOf), `engine/voice.js` (his voice), `text/hamlife.js` | `hamalayi-life` |
| 9 | The monastery's prayer wheels | did nothing | they turn with a line | `story/hamlife.js` | Source only |
| 10 | The observatory's door outside its chapters | silent in chapters 6, 8, 9 | chapter 6: bolted from inside, Sefa at work; chapters 8–9: locked, a slate on the door SEFA / NEXT DOOR, and he is there | `story/hamlife.js` | `hamalayi-life` |
| 11 | Sefa's house | empty | Sefa at home in chapters 8–9 | as 4 | `hamalayi-life` |
| 11b | The story villagers' rounds in Lhar (`castrounds.js`, chapter 6) | since the doors lead in (8.11), Tashi's and Old Norbu's stops by the doors stood inside a door's reach (1.80 m and 1.75 m from the triggers; StoryRounds leaves such a stop out) and they walked no round (the coordinator's report: cast-rounds, 4 checks); Dawa's stood on the rim of Yorna's door's reach | each stop off every door's way in (2.2 m out, ±0.7 m) and ≥ 2.8 m from the triggers: Tashi by the sledge's side of the square, Old Norbu and Dawa a step aside, still watching their doors | `castrounds.js` | `cast-rounds` |
| 12 | An island room's region | inside any of the islands' or Kesh's or the Hamalayi's house rooms the HUD's region (`travel.js` regionOf) read Citadel | the door's region | `travel.js` | Source only |

## The camera by keyboard at the main spots (VP-10; probe `cam.mjs`, `hallcam.mjs`)

Chapter 7 by its flags (chapter 6 done). At each spot he is put 1.5 m before it and walks onto it with Up held (0.6 s), then
2.5 s of play; Follow camera, Medium. Pictures in the scratchpad `cam/`, `cam2/`, `hallcam/`. Automated runtime only.

| Spot (world x, z) | REVIEW-HAMALAYI (6.11, before VP-10) | Now | Arm (m) |
|---|---|---|---|
| the landing (4304, 84) | — | the glider field, the hut; clear | 8.95 |
| the old gate, the gorge's south bank (4294, 60) | camera in the gate's lintel | clear, the gate framed ahead | 8.90 |
| the tree bridge's north end (4294, 34.5) | camera against the cliff | a high shot over the gorge, clear | 10.91 |
| the trail's switchback (4329.5, 24) | camera inside the bend's rock, he x-rayed | out of the rock; the snow lip of the terrace above crosses the frame's lower right and touches his right side (minor; left) | 10.74 |
| Lhar's square (4292, 10) | — | clear | 8.94 |
| Lhar by the falls, turned south (4291.5, −7) | camera on his shoulder against the balcony house | clear, the house beside him | 7.40 |
| the heat station (4320, −17) | camera behind the cabinet | clear (REV-HAM-ART moved the shed) | 8.93 |
| the lift's top (4324, −30) | — | clear | 8.95 |
| the monastery gate → the yard (4334, −38) | — | the gate's beam and roofs frame him; clear | 8.91 |
| the hall's porch (4334, −42.4) | — | the door ahead, clear; walking on he goes in (the door by input) | 8.89 |
| out of the hall, facing the yard (4334, −41.9) | — (no door then) | **was**: the camera stood in the lower roof's overhang, gold tiles over the frame's bottom half, Twinsen x-rayed (arm 6.81, 7.2 m up). **Now** (the hall's own shapes, `hamalayi.js`): landing out of the door, the camera close over his shoulder under the porch, the yard clear (arm 4.45); standing 2 s it settles beside him, a porch pillar large on the left of the frame (arm 4.8; he and the yard clear); walking 2 m out, a wide shot (arm 9); turned to the hall, the hall and the porch framed (arm 9) | `hallcam/1…4` |
| the camp (4350, −38) | — | clear | 8.93 |
| the ridge (4312, −50) | — | clear | 8.81 |
| the observatory's door (4286, −64.8), and turned to the descent | the door canopy fills the frame | clear both ways | 8.90 |
| the glacier's vent (4258, −44) | — | clear | 8.91 |

## The bar, line by line, for the Hamalayi now

| Bar line (`citadel-bar.md`) | The Hamalayi | Evidence |
|---|---|---|
| 1 Nothing fades outdoors; tight shapes; the only fade a roof he stands under | met: VP-10 since wave 1 (25 auto volumes) + the hall's own shapes (walls, lower roof, upper hall, the porch as `walkUnder`) | probes `cam`, `hallcam` |
| 2 Every accessible building enterable or shut with its own reason | the landing's hut, Lhar's five houses, Sefa's house, **the monastery's hall** lead in; the observatory leads in in its chapters and is shut with its own reason in the others; the heat station's shed is a cabinet (read); nothing answers the generic "Locked." | `hamalayi-life`, `island-doors`, `door-sweep` |
| 2 A compact, furnished, lit interior that fits the owner; music per place | the planner's rooms (ihomes.js, whitewashed stone and dark timber, `home` music) + each phase's things; the hall built by hand (`mountain` music) | pictures `ph/`, `ph2/` |
| 2 The way back out; a save inside comes back inside | out 1.45 m before the door facing away (DOOR-CLEAR); Bero's house saved and continued | `hamalayi-life`, `door-sweep` |
| 3 Purposeful residents with rounds; memorable recurring people whose lines change; own dress; rooms have their keeper | Lhar's 8 residents (packing / the camp / mending / home) + Bodo carrying slates from the lift to Bero's house while Lhar is mended; Bero, Sana, Lhamo, Old Dorje, Yorna and Sefa at home at their phases; Brother Tenpa in the hall; DRESS-1 for all (the indoor selves share their outdoor dress) | `hamalayi-life`, `world-consistency`, `residents` |
| 4 Grounded props, no slide traps, routes open, purposeful props | the new things stand on the rooms' floors, solid while shown; no terrain changed | `overlaps`, `slidetraps` (see the runs) |
| 5 Identity | our places with the world's identity (prayer flags, slate roofs, a Rabbibunny monk, Sendell's shrine remembered); unscored | — |
| 6 Story and saves | no flag added or changed in meaning; a key-only save is consistent now | `hamalayi-life`, `save-migration` |

## Left (concrete)

- **Resemblance**: unscored (the curator). Lhar, the monastery and the observatory have no LBA original to match.
- **The trail's switchback** (4329.5, 24): the terrace's snow lip above the bend crosses the frame's lower right and
  touches his right side as he walks the bend uphill (cam probe `trailBend`). Not a camera-inside-rock fault any more;
  a GPU look asked.
- **Lhar in the epilogue**: the owners are outdoors on their rounds (the square, the trough, the fire); their houses
  are lit and smoke, but only Old Dorje is inside. Kept: the epilogue's image is the square full of people.
- **The landing's hut** stays without a keeper: it is Hesk's waystation; Hesk stays by his glider.
- **Tashi, Lhar's smith** (story's `lhar1`, the heat flask) has no forge: a smithy would need a building Lhar does not
  have. Not added (no new building to mask nothing).
- **Windows**: one glow for all five houses (dark only while nobody is home anywhere in Lhar); Old Dorje's windows stay
  lit while the menders are down in chapters 8–10 (one draw call kept, not five).
- **GPU look** (the laptop): the hall, the five rooms by phase, the observatory's slate, Lhar's dark windows.
- Not this pass: chapter 6's mites (chapter-balance: low challenge; animation-combat's proposal).
