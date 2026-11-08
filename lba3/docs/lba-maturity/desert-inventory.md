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
| The great hall (the pupils' dormitory) | knocked on in every state | **dark: knocked on** (as before); **once the pupils' crystal is awake it leads in**: bunks, spellbooks, Joss practising the wind spell; the School's signpost thanks him | `ihomes.js` shut 'lamp', `story/desertlife.js` | `probes/new2.js` |
| The Temple of Bù, the condenser hall | open doors leading nowhere after their chapters | **stay open**: the temple from chapter 5, the hall from chapter 6; inside, the carving and the hall's diagram are read again with Ilka's chalk on them; the glider is gone from the hangar after chapter 5 (it stood there still) | `story/desertlife.js` doors, `condenser.js` glider.gone, `story/steam.js` | `door-sweep` |
| Signs and boards | not readable | **read**: KESH at the pier; the post's gate (staff only · ferry requisitioned · closed, ask at the oasis · relay station · survey post); Ilka's survey board (ch. 4: "warm ground" by each crystal find: the dig's warm discs' clue); the School's signpost; Hesk's stop (the ferry chalked out in ch. 5, the glider later) | `story/desertlife.js`, `desert.js` R.reads | `probes/new1.js` |
| The oasis | nothing | dry: a look at the mud; with water: a drink gives back a little life (once in 20 s), warm and sour while the steam threatens it | `story/desertlife.js` | `probes/new1.js` |
| The story's people between chapters | "Hello, Twinsen." | Tarra, Ilka, Dallan, Doran have a line for each chapter they stand in (6–11): Dallan's road from stranded foreman to the council (ch. 9) is told by him in ch. 6–8 | `text/desertlife.js` idle_* | `probes/talk.js` rerun |
| Safi, Tamu, Bashir | the same lines in every chapter | their first line follows Kesh's state (the pump, the steam, the glider, Citadel's evacuation, the network, the ending) | `story/citizens.js`, `text/desertlife.js` | `probes/new1.js` |
| The evacuation (ch. 8) | Kesh's walkers and the School's people gone | they stay (Citadel's evacuation is Citadel's) | `story/citizens.js` OFF_CITADEL, `storylife.js` school | `world-consistency` |
| Music indoors | the home theme, Citadel's square | the island's pieces heard through the walls (`desert_in`, as `zeelich_in`) in Kesh's homes, the post's cabins and the two old houses | `engine/music.js`, `ihomes.js` | source; not listened to |

## People on Desert Island per chapter (after; `probes/chap.js`)

PEND

## The camera by keyboard at the main spots (`probes/camdesert.mjs`)

PEND

## What is left (and for whom)

PEND
