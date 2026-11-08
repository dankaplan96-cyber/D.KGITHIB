# Desert Island as a player meets it: an inventory against Citadel's bar (8.11.2026)

Worker: world-campaign-finisher (cloud), branch from `ccr-c1c2c4b9-dep6ed` at `f023e47e`. The bar is
`citadel-bar.md`; the Zeelich pass this follows is `zeelich-inventory.md`. Labels as in `PROJECT_CONTRACT.md`.
Evidence is **Automated runtime only** (SwiftShader, headless Chromium, 960×540, Follow camera at Medium, Classic
controls, fixed-step game time) unless marked **Source only**. Pictures were looked at, not played; no frame-rate claims.
Nobody has played any of this on a GPU. Probes (not suites) and pictures: the worker's scratchpad `desert/` (`before/`,
`after/`, `cam/`; `probes/inv.js`, `chap.js`, `talk.js`, `new1.js`, `new2.js`, `shots.mjs`, `camdesert.mjs`).

**Resemblance.** Desert Island keeps the original's coast, heights and landmark places (`desert-layout.js`,
`desertold.js`: the School's stone face, the great hall in its pool, S40, S28, the corral, the twin pillars, the gateway,
the standing figures). Every resemblance score is **Unverified** until the laptop's curator scores it
(`WORLD_RESEMBLANCE_TEMPLATE.md`). This pass changed no geography, nothing of the original's places' shapes; it added a
board on S28's wall and opened two of the original's doors into rooms of our own (no original interior is claimed).

## Where Desert Island comes in the story

| Chapter (key) | On Desert Island | Areas built (`regions.js` CHAPTER_AREAS) |
|---|---|---|
| 4 `dig` (`story/dig.js`) | the whole chapter: Kesh's trust (the wind-pump), Hesk's rope and yacht, Ilka at her camp, the notebook at the research post in a sandstorm, the dig's keypad, the warm discs, the Temple of Bù's carving | desert, butemple |
| 5 `steam` (`story/steam.js`) | the whole chapter: the bore, Brosk's jar and shovel, the buried condenser hall and its valves, the relief valve, the glider out of the hangar | desert, condA/condB |
| 6–9, 11 | optional visits: the ferry from Citadel's harbour, the glider from chapter 6 | — |
| 10 `network` | the bore relay (Ilka and Dallan hold the vent), Hesk's glider network | desert and the others |
| epilogue `home` | Kesh after the ending (Tarra, Dallan, Ilka, Hesk) | — |

Side stories here: The Wind-Catcher (`story/kesh.js`), the pupils' lamp and S28's sketch (`story/purposes.js`), the
arsenal's and EQUIP-2's pieces (the School, the corral's trough).

## The bar, line by line (before this pass)

Measured on the base (`f023e47e`): `probes/inv.js` swept every 1.5 m of the island's land in chapter 4 for an
interaction in reach, four headings each; `chap.js` counted who is on the island in chapters 4–12 and the epilogue;
`talk.js` spoke to everyone there in chapters 4, 5, 6, 8, 9, 10, 11 and the epilogue; `shots.mjs` took the pictures in
`before/`.

| Bar line | Before | Finding |
|---|---|---|
| 1. VP-10 camera | automatic (`roomocc.js`, 25 tight volumes) | Nothing fades outdoors. The camera pass by keyboard is below. |
| 2. Doors | Kesh's 5 houses and the post's 3 cabins lead in (wave 3); the School's chin door leads in | **The temple at the bottom of the dig and the dug-out condenser hall lead nowhere after their chapters**: their doors were the chapters' own (`Story.doors` asks only the chapter in progress), so from chapter 5 the temple's open gate, and from chapter 6 the hall's dug-out door, stood open, silent. **S28's door only read a board** (no way in, no reason). S40 and the dormitory are knocked on (each its own reason). The cool room's door is a look into a store (its own line; by design). |
| 2. Story door inside a door's trigger | — | **Chapter 4's notebook was taken 0.8 m before the post office's door**, inside the door's own way in (its trigger reaches 1.3 m out): walking up to it took him into the office, whose desk had nothing on it. |
| 2. Music per place | Kesh's homes played Twinsen's home theme (`home`); the post's cabins Citadel's square through the walls (`office`) | wrong place's music indoors |
| 3. People with rounds | Kesh: Safi, Tamu, Bashir walk rounds; the story's nine stand or walk their cast rounds; the dig crew (8) in 4–5; the School's plaza (5) and classroom (3) | **All eight Kesh and post rooms empty.** |
| 3. Lines follow the story | Kesh's cool room lines follow dry · wet · steam · after | **Tarra, Ilka, Dallan and Doran said only "Hello, Twinsen." in chapters 6–9 and 11** (Tarra in 10 too): the generic fallback. Safi, Tamu and Bashir said the same lines in every chapter. |
| 3. Not emptied by another island's story | — | **Citadel's evacuation (chapter 8) took Kesh's three walkers and the School's eight people off Desert Island**, which is not evacuated and which the ferry still reaches: 6 people left on the island. |
| 4. Purposeful structures (R11) | the cool room, the pump, the yacht, the keypad, the corral's trough (EQUIP-2), the study crystal | **Read as usable and did nothing**: the pier's KESH sign, the post's gate sign, Ilka's survey board, the School's signpost, Hesk's yacht stop; the oasis (no drink, no look). |
| 4. Grounded props, slide traps, routes | `overlaps`, `slidetraps` cover the desert band | rerun below |
| 6. Chapters | 4 and 5 have objective, obstacle, discovery, consequence (`chapter4`, `chapter5`, `chapter-balance.md`) | unchanged; their places now stay open as consequences |

## What changed (this pass)

| Where | Before | Now | Code | Evidence |
|---|---|---|---|---|
| The research post's office (ch. 4) | notebook taken 0.8 m before the door, inside its way in; walking up took him into an office with nothing on the desk | **the notebook is on the foreman's desk inside the office** (Search, as before); the map's star stands on the office door outside, on the desk inside; outside, nothing is offered | `story/dig.js` deskSpot, `ihomes.js` IH.front | `chapter4` (walk in by the door, Search, out), `playthrough/07-dig` |
| The post's bunk cabin (ch. 4) | led in during a storm too | **shut while a chapter-4 sandstorm blows**: "Voices inside: the gate guard and a mug of something" (Ilka says he hides in his cabin) | `story/ihomes.js` shutNow | `probes/new2.js` |
| Kesh's homes | empty | **their people**: Dela in Brosk's house (she counts the stock), Jorr in Mother Tarra's (the water tally), Nima in Safi's family's, Old Hanna in Hesk's lodging; each stands at their work, their own dress (DRESS-1), lines by Kesh's state (dry · wet · steam · after · evac · net · home) | `ihomes.js` KEEPERS stand, `story/ihomes.js`, `story/kesh.js` lifePhase | `island-doors` (keepers talk), `probes/new2.js` |
| S28 | the door read a board; no way in | **the dig crew's bunkhouse leads in**; Brann sleeps off his night shift there while the crew works here (ch. 4, ch. 5 until the ferry takes the crew; then the room is empty); the board is drawn on the wall beside the door and read there (Anko's sketch, as before) | `ihomes.js`, `desertold.js` s28board, `story/purposes.js` | `island-doors`, `purposes` |
| S40 (Bashir's home) | knocked on: his granddaughter at the shutters sends him to the loom | **leads in**: Kesh's mats and jars; Leya, Bashir's granddaughter, who keeps it (Bashir says so on his round) | `ihomes.js` keshhome, `story/purposes.js` | `purposes`, `island-doors` |
| The great hall (the pupils' dormitory) | knocked on in every state | **dark: knocked on** (as before); **once the pupils' crystal is awake it leads in**: bunks, spellbooks, Joss practising the wind spell; the School's signpost thanks him | `ihomes.js` shut 'lamp', `story/desertlife.js` | `probes/new2.js` |
| The Temple of Bù, the condenser hall | open doors leading nowhere after their chapters | **stay open**: the temple from chapter 5, the hall from chapter 6; inside, the carving and the hall's diagram are read again with Ilka's chalk on them; the glider is gone from the hangar after chapter 5 (it stood there still) | `story/desertlife.js` doors, `condenser.js` glider.gone, `story/steam.js` | `door-sweep` |
| Signs and boards | not readable | **read**: KESH at the pier; the post's gate (staff only · ferry requisitioned · closed, ask at the oasis · relay station · survey post); Ilka's survey board (ch. 4: "warm ground" by each crystal find: the dig's warm discs' clue); the School's signpost; Hesk's stop (the ferry chalked out in ch. 5, the glider later) | `story/desertlife.js`, `desert.js` R.reads | `probes/new1.js` |
| The oasis | nothing | dry: a look at the mud; with water: a drink gives back a little life (once in 20 s), warm and sour while the steam threatens it | `story/desertlife.js` | `probes/new1.js` |
| The story's people between chapters | "Hello, Twinsen." | Tarra, Ilka, Dallan, Doran have a line for each chapter they stand in (6–11): Dallan's road from stranded foreman to the council (ch. 9) is told by him in ch. 6–8 | `text/desertlife.js` idle_* | `probes/talk.js` rerun |
| Safi, Tamu, Bashir | the same lines in every chapter | their first line follows Kesh's state (the pump, the steam, the glider, Citadel's evacuation, the network, the ending) | `story/citizens.js`, `text/desertlife.js` | `probes/new1.js` |
| The evacuation (ch. 8) | Kesh's walkers and the School's people gone | they stay (Citadel's evacuation is Citadel's) | `story/citizens.js` OFF_CITADEL, `storylife.js` school | `world-consistency` |
| Music indoors | the home theme, Citadel's square | the island's pieces heard through the walls (`desert_in`, as `zeelich_in`) in Kesh's homes, the post's cabins and the two old houses | `engine/music.js`, `ihomes.js` | source; not listened to |

## People on Desert Island per chapter

Before (`probes/chap.js`, on the island outdoors, the base): chapter 4: 25 (the story's 9 with Doran and the guard, Kesh's
3 walkers, the dig crew's 8, the School's plaza 5); 5: 24; 6–7: 15; **8: 6** (Tarra, Ilka, Dallan, Sani, Brosk, Lumi);
9: 13; 10: 15; 11: 14; the epilogue: 15. Indoors: the School's classroom 3 (+ Hougo, Ker'aooc); Kesh's homes and the
post's cabins 0.

Now: outdoors the same in every chapter but 8, where Kesh's three walkers and the School's plaza and classroom stay
(17 on the island; `desert-bar` checks them there). Indoors, from chapter 4: Dela, Jorr, Nima, Old Hanna, Leya in
Kesh's homes and S40; Brann in the bunkhouse in chapter 4 and early 5; Joss in the dormitory once the crystal is awake.
Every one of them, and Tarra, Ilka, Dallan and Doran between chapters, has a line for the state of the story they are
heard in (`text/desertlife.js`): the bar's "lines change with the story's phases".

## The camera by keyboard at the main spots (`probes/camdesert.mjs`)

Follow at Medium, Classic controls, ArrowUp held through Playwright's keyboard from 6–14 m before each spot, 30 frames
a second; per frame: Twinsen hidden (`camRig.hiddenBy`: his middle and head cut off), the camera inside a solid (a
collider or the ground), the shortest arm. Pictures: `cam-before/`, `cam-after/` in the worker's scratchpad.

| Spot | Before: hidden / inside / frames | After | Note |
|---|---|---|---|
| the pier to Kesh | 0 / 0 / 180 | 0 / 0 / 180 | |
| Kesh's plaza | 0 / 0 / 150 | 0 / 0 / 150 | |
| Brosk's door | (approach mis-set in the first run) | 0 / 0 / 84 | |
| the cool room's door | (mis-set) | 0 / 0 / 94 | |
| the oasis | 0 / 0 / 120 | 0 / 0 / 120 | |
| the pump | 1 / 0 / 120 | 1 / 0 / 120 | one frame behind the tower, the next shot rises |
| Hesk's stop | 0 / 0 / 109 | 0 / 0 / 109 | |
| the post's gate | 0 / 0 / 120 | 0 / 0 / 120 | |
| the dig's gate | 0 / 0 / 120 | 0 / 0 / 120 | |
| Ilka's camp | 0 / 0 / 120 | 0 / 0 / 120 | |
| S40's door | (mis-set) | 0 / 0 / 93 | |
| S28's door | (mis-set) | 3 / 0 / 120 | three frames behind the ridge in the hollow; the shot rises |
| the School's bridge | (mis-set) | 0 / 0 / 120 | |
| the rim walk to the dormitory | (mis-set) | 0 / 0 / 93 | |
| **up to the dormitory's door from the face's side** | 0 / **9** / 19 | 0 / **0** / 19 | before: the camera stood inside the stone face, Twinsen drawn as an outline (`cam-before/cam-dormdoor.png`); now behind him outside it, close (2.7 m arm) between the face and the hall |
| the condenser hall's door | 0 / 0 / 120 | 0 / 0 / 78 | |
| the post's yard | 0 / 0 / 120 | 0 / 0 / 117 | |

The fix: the School's rock wall, stone face and great hall had camSkip colliders and no camera volume, so the camera
went through them (`desertold.js` camVol; the island's other tall solids were already volumes). Nothing fades
outdoors (VP-10 kept). Automated runtime only; a GPU look at the School's rim walk is asked of the laptop.

## What is left (and for whom)

- **Resemblance scores**: Unverified (the laptop's curator). The two rooms opened in the original's buildings (S28,
  the great hall) are our own layouts.
- **Lumi's weaving room** has no one in it: Lumi works at her loom outside, ten metres away (as Nell keeps her stall
  outside Citadel's house; Nell has Wim inside, Lumi has nobody). The post's office, bunk cabin and stores are empty
  in chapters 4–5 by design (the notebook's stealth; the guard during storms) and empty after chapter 5 by the story
  (the crew left with the ferry, Dallan stayed in Kesh).
- **The School's own music**: its hall now plays the island through the walls (`desert_in`) instead of Twinsen's home
  theme; a piece of its own is the music-director's (laptop). Nothing here was listened to.
- **The cool room** is a store looked into, not a room (its lines are the side story's). A room behind its curtain
  (the jars, the sand, the dates) would show the side story's states; not done.
- **Zeelich's street walkers** (Ilo, Aven, Kira) are taken off Zeelich in Citadel's evacuation by the same rule that
  took Kesh's (story/citizens.js `gone`): left for the Zeelich pass (not this region).
- **A player's own first time**: none of this was played by a person; the chapter-balance numbers for chapters 4–5
  are unchanged (the notebook's walk is a few metres longer: in through the office door).

## Evidence (8.11.2026, Automated runtime only)

Run against a snapshot of `lba3/` served locally (SwiftShader, headless Chromium), one suite at a time, on the final
code unless marked: `desert-bar` (new, 17/17: the reads, the oasis, Dela, S28 and its board, the dormitory dark and
lit, the bunk cabin in a storm, chapter 5 with the ferry taken, chapter 6's lines, the temple and the condenser hall
after their chapters, a save in the dormitory then Continue, a death then Retry with full health, chapter 8's people,
chapter 10 and the epilogue), `chapter4` 55/55 (the notebook in the office by input; run before the keepers' spot
rule), `chapter5` 20/20, `purposes` 23/23 (S40 into Leya's room, S28's board), `island-doors` 89/89 (72 rooms, the
keepers), `desert-life` 30/30, `door-sweep` (CHAPTERS=4,5,6, the Desert doors: in, out, walk-in ±0.3 m),
`world-consistency` (ONLY=dig|steam|evacuation|network|home) 19/19, `save-migration` 11/11, `wizards` 6/6, `overlaps`
(ONLY=desert,condA,condB,butemple) PASS, `slidetraps` PASS (desert: 6 spots, 0 respawns, 0 lives lost),
`story-journeys` (ONLY=ch5) PASS, `interior-life` 144/144. Failures met on the way and fixed: `desert-bar`'s storm
check (no storm blows unless Ilka's errand is on: the test sets it), `island-doors` (a keeper standing where a look's
prompt went to them; Nima with no spot left: the keepers' spot rule).
Not run: the full playthrough chain (`tests/playthrough`; only segment 07's notebook step changed), `camfollow` and
`camclear` (Citadel's), the full `door-sweep` and `world-consistency` over every chapter.
