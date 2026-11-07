# LBA3 maturity — status, ownership and waves

Coordinator: the cloud session (branch `ccr-c1c2c4b9-dep6ed`, merged into the laptop's `ccr-adf00ea7-37ebl3`).
Pack: the user's LBA3 Maturity Agent Pack (7.11.2026), installed as `.claude/agents/lba-*.md` and this folder.
Contract: `PROJECT_CONTRACT.md` (here). Baseline: commit `c838d476` = artifact v55 (published 7.11.2026 15:12 UTC).
Evidence labels: Verified in play / Automated runtime only / Source-reviewed only / Implemented unverified / Blocked / Not implemented.
All cloud evidence is SwiftShader in headless Chromium: no frame-rate claims, no listening. Pictures are looked at, not "played".

## Who does what

The cloud and the laptop each run their own workers. The cloud keeps to **two editing workers at a time** (the pack's limit;
the coordinator does not edit in parallel with them beyond merges, stamps and docs).

| Role (pack agent) | Owner | Why there |
|---|---|---|
| maturity-coordinator | **cloud** | integration, merges, publishing, this table |
| world-campaign-finisher (Zeelich first) | **cloud** | quests, placements, doors, residents: code and tests |
| chapter-balance | **cloud** | scripted route timings per chapter (automated runtime); first-play estimates labelled as such |
| campaign-director | **cloud** | story causality, saves, flags |
| dialogue-editor | **cloud** | text files |
| buildings-interiors | **cloud** builds, **laptop** gives the references | doors/interiors are code; original layouts come from the curator |
| original-mechanics (entry, roof/wall cutaways) | **cloud** | renderer/room code |
| animation-combat | **cloud** | rig/actors/combat code |
| action-sound | **cloud** | sound events and synthesis; listening by the user |
| character-voices | **cloud** | voice pipeline; A/B files for the user to listen to (neither machine can listen) |
| world-polish (camera, grounding, slides) | **cloud** | continues CAM-WALKSWING/RECOVER, SLIDE-RESCUE |
| world-reference-curator (85/100 rubric) | **laptop** | it holds the user's LBA1/LBA2 files (read-only; numbers and descriptions only, nothing redistributed) |
| world-art | **laptop** | Blender models, baked colours, the cast's shapes (DRESS-2) |
| music-director (crackle) | **laptop** first, cloud renders | the crackle is on the user's computer: reproduce it there; scores rendered where the soundfont is |
| performance-lab | **laptop** | the target hardware (Ryzen 5 3500U / Vega 8); the cloud cannot measure it |
| release-auditor | **cloud**, after the last wave | independent of the workers |

## The bar: Citadel's level everywhere (the user, 7.11.2026)
"It's not only Zeelich — the whole game must be at Citadel's level." Every region is measured against what Citadel has
(`citadel-bar.md`, written by the wave-1 finisher): the VP-10 camera (nothing fades; the shot rises over buildings), every
accessible building enterable with a fitting interior, purposeful residents in their own dress, music per place, interior
light, grounded props, no slide traps, a camera pass by keyboard. The regions in order, each done by the finisher with a
world-polish pass after it:

| Region (outdoor room) | Citadel bar | Status |
|---|---|---|
| Zeelich (zeelich.js, zeelife.js) + Otringal | wave 1 done (street) | VP-10 camera; the street's doors into four Esmer homes + the bakehouse; Baldino's workshop open ch 3–8; 3 new residents; zeelich-doors.mjs. Left: 58 island doors + Kesh → wave 3 |
| Zeelich's isles (zislands.js) | wave 1 (VP-10 camera), then its own pass | pending |
| Desert Island (desert.js) | VP-10 in wave 1; its own pass next | pending (REVIEW-DESERT done 6.11) |
| The Hamalayi (hamalayi.js) | VP-10 in wave 1; its own pass next | pending (REV-HAM done 6.11) |
| The underground (underground.js) | room camera; own pass | pending (REVIEW-UNDER done 6.11) |
| Citadel | the reference; camera pass 3 in wave 1 | in progress |

## Playtest inbox (the user's reports, newest last; each goes to a worker and gets a status)

| # | Date | Where | Report | Owner | Status |
|---|---|---|---|---|---|
| P1 | 7.11 | Zeelich | "all the buildings disappear when you get close" (whole-house fades, zeelich.js makeFader; VP-10 missing in rooms) | wave-1 finisher | **fixed** (merged 7.11): no building fades in any outdoor room; the camera rises over tight shapes (roomocc.js: Zeelich street 34, Desert 25, Hamalayi 25, all 9 isles); only the council porch fades while he stands under it — Automated runtime only |
| P2 | 7.11 | Citadel harbour (residents) | "the characters walk in slow motion, a problem with the legs" (photo: an Esmer resident's leg stretched back) | animation-combat (urgent, a third worker) → laptop (hands) | **walk fixed** (GAIT-CADENCE, rig.js, merged 7.11): shorter strides when slow, the stance foot waits for the other, the held foot within 1.15 leg lengths; Sefa 0.76 → 1.22 steps/s, stance spread 0.42–0.49 H → 0.31–0.41 H (Automated runtime only; pictures looked at). **Hands: in the models** (cast_poly.py finger_hand, mirrored fan) → laptop order 36 HANDS-36 |
| P3 | 7.11 | Citadel spaceport deck | "another structure that's just there": the TICKETS · INFO kiosk | buildings-interiors worker (wave 3) | **fixed** (merged 7.11): Corla the clerk behind the counter every chapter (lines by chapter; the spaceship menu from chapter 4); the sweep gave prompts and lines to the notice boards, map stands, fountains, carts and two sheds (citadel-structures.md, tests/citadel-structures.mjs) — Automated runtime only |
| P4 | 7.11 | Citadel sewer, all doors | "the sewer isn't laid out as in the second game: check every door, where it led and where it should connect" | laptop curator (LBA2 links, order 29) → cloud buildings-interiors | door-map.md generated from the game (18 outdoor doors, 23 rooms); waiting for DOORS-LBA2 |
| P5 | 7.11 | Citadel, the fort climb's foot (CLIMB-17) | "very strange" (photo): stacked copings on a slotted pier, two parapets with a trench between, rails in mid-air, a jagged seam to the plaza, the pipeline over the landing | laptop (order 30, CLIMB-30) | queued |
| P6 | 7.11 | Citadel, the Whispering Cliffs' rising stepping stones | "the cylinders look really weird" (photo): bare 9-sided brown cylinders with flat green discs | laptop world-art (order 31, STONES-31) | queued |
| P7 | 7.11 | Chapter 1, Zoé's search | "in Zoé's part you can switch to running now": the Ctrl behaviour menu and the HUD icons ignored the story's hold (noBehaviours) | coordinator | **fixed** (actors.js setBehaviour, main.js Ctrl menu); probe: discreet held through setBehaviour, the Ctrl menu and HUD clicks (Automated runtime only) |
| P8 | 7.11 | Citadel, a narrow paved passage between tall stone walls | "the camera still zooms in super close" (photo, running) | world-polish camera worker (pass 3) | **fixed** (CAM-KEYWALK, merged 7.11): it was the fort's west station gate: run out 0.95 m → 3.2 m least arm, walk out 0.95 → 6.77 m; plus 13 Citadel spots (camcitadel.mjs, 50/51) — Automated runtime only; a GPU look asked of the laptop (order 34) |
| P9 | 7.11 | Chapter 1, the project depot by the pipeline valve | "enemies only when you need to work the pipe: why are there enemies, what do they want, what did I do wrong? They don't exist before the water valve is needed and vanish after, even if I didn't kill them" (chapter1.js enemyDefs: drones, guard, dog `when: reached && !c1_valve_depot`) | campaign-director (wave 2) | **fixed** (story/depotwatch.js; island.js: a yellow line across the yard, two "Staff only past the yellow line" signs): the watch is there from chapter 1 (the well) until the valve; the path through the depot is public; seen in the yard, the guard warns and turns him out at a gate (saved: c1_depotWarned); caught again, at the valve, or striking one: a fight; the depot valve opened, the station radios the guard ("that's Twinsen: let it run", "all of you up to the station gate") and the watch walks off toward the fortress, gone only out of view; after a load and in later chapters it is not at the depot. tests/depot-watch.mjs 11/11 (Automated runtime, input where it says INPUT); no person has played it |

## Waves (cloud)

| Wave | Workers | Status |
|---|---|---|
| 0 | in-flight work before the pack: camera pass 3 (Citadel spots by keyboard), Citadel chapters 3–9 + real saves, SLIDE-RESCUE review | paused by the usage limit; camera pass 3 resumes as part of wave 1 (world-polish), the other two fold into waves 2 and 7 |
| 1 | world-campaign-finisher (Zeelich: entrances, identity, life) + world-polish (camera pass 3, resumed) | done: v57 (camera pass 3), v59 (Zeelich, 1794082922-cfd5) |
| 2 | chapter-balance (all chapters) + campaign-director (incl. the paused Citadel 3–9/saves review) | campaign-director done (below) |
| 3 | buildings-interiors + original-mechanics (serialize shared transition code) | buildings part 1 done (merged 7.11): P3 + Citadel sweep; 63 rooms behind the isles' 55 doors + Kesh's 5 houses + the post's 3 cabins (ihomes.js, island-doors.mjs 78/78); 3 doors nailed shut with a reason. Waiting: DOORS-LBA2 (laptop 29). Knartas ledge door → world-polish |
| 4 | animation-combat (+ laptop world-art in parallel) | pending |
| 5 | dialogue-editor + character-voices | pending |
| 6 | action-sound (+ laptop music-director) | pending |
| 7 | world-polish remainder (SLIDE-RESCUE keyboard review) | started early 7.11 night: camfollow's LBA2-view regression + its 4, camcitadel's 3, the Knartas ledge door, camclear; laptop performance-lab in parallel |
| 8 | release-auditor | after all others |

### Wave 2, campaign-director: Citadel in chapters 3–10 after a real save (Automated runtime only)
Each chapter set by its key (ISO; once with only the key, as an old save; once with chapter 2's flags and the chapter's
`_started`), the game's own save written at Citadel's quay, the page reloaded, Continue. Probe:
scratchpad `probes/survey.mjs` (not in the repo). Found and fixed:
- the depot's watch stood at the depot in every chapter of a save without `c1_valve_depot` (chapters 3–10 with the
  key only): now never after chapter 2 (P9's `on`).
- chapter 9: played on from chapter 8, the fences, the dark heat posts and the open shelters were there; a load in
  chapter 9 removed them (and lit the heat posts), chapter 10 put them back. Now a load keeps them (evacuation.js).
- no map star on Citadel while the objective was in another region (chapters 4, 6, 7, 9): a star now stands on the stop
  that leads there ("To Desert Island", "To The Hamalayi", "To Zeelich Spaceport"); none in chapter 3 (no route open).
Seen and left: Citadel's ferry shows at the quay after a load in chapters 3 and 5 (hidden in play), but neither chapter
can reach Citadel (no route), so no player sees it. Doran is nowhere in chapters 8–10 (absent, not misplaced). Zoé and
Arthur are at home in 3–9 and in the lamp room in 10; Gilbert, Tim, Lulu and Xil keep their chapter-8 places in 9–10.
Not covered: the chapters' own saves made by playing (the playthrough chain was not run in this wave).

## Laptop orders
CLOUD_ORDERS 27 (this pack): curator, world-art, music crackle, performance-lab. Earlier open: 24 (DRESS-2 shapes), 25
(Hamalayi art), 26 (Citadel art).

## Done before the pack (for the auditor; all Automated runtime only unless marked)
- v53–v55: music by place and the asylum's own piece; REVIEW-DESERT/ZEELICH/HAMALAYI/UNDER/CITADEL fixes; DRESS-1 (147
  people on 51 models get their own clothes and hair; pictures looked at); CLIMB-17/21 (the climb's foot straight, no slide
  trap on the east flight); CAM-WALKSWING/RECOVER; SLIDE-RESCUE (78 steep spots: 10 respawns/lives lost → 0).
- Known failing checks, failing the same on the base: (travel.mjs "Doran goes ahead to the spaceport" fixed in wave 2:
  the check ran while Doran was still walking up the quay, STAGING-1; a hero who ran ahead now finds him by the ship);
  combat.mjs "dodge distance consistent at 30 and 60 fps"; prologue.mjs "the well's mites beaten" (3 of 4, random,
  passed on the rerun); saveslots.mjs's slot picture (passed on the rerun); camfollow's 4 (Modern then Up, backing up, full turn, Far) + since v56 a 5th, "LBA2 view (the default) unchanged: a run across the view never turns it" (world-polish on it, 7.11 night); camcitadel's water meter (2) and stepping-stones whole turn (1); npc-feet Oda's 5-step stop; camclear's pipeline 0.149 m; overlaps' two Lhar roof spots.
