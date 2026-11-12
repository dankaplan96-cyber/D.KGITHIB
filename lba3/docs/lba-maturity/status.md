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
| Zeelich's isles (zislands.js) | **own pass done (merged 9.11)**: Otringal on foot (14 doors were unreachable: a flight up the bank, the ramp's wall gone, slimmer spires; 24/26 doors now), Mosquibee's honey hoist, people at home (7 residents + 5 new), 72 usable pieces answer (shuttle boards' chalked favours), favour lines wait for their flags, the bar door, the dog yard gate, Knartas's floating pieces, Celebration's paving; OTRINGAL-37 applied; isles-bar.mjs 13/13; isles-inventory.md | done; camera pass 3 merged 9.11 (Knartas's gatehouse a walk-under roof: least arm 3.2 → 8.75 m; the hidden test ignores posts/trunks; camisles.mjs) |
| Desert Island (desert.js) | **own pass done (merged 8.11)**: the notebook bug, people at home, doors after their chapters, signs and the oasis, desert_in music, the School's camera volumes; desert-bar.mjs 17/17; desert-inventory.md | done; GPU look asked |
| The Hamalayi (hamalayi.js) | VP-10; rooms; **own pass done (merged 8.11)**: four village phases (moving day, camp, mending, home), owners at home, the monastery hall with Brother Tenpa, the observatory slate, the notice board/goat pen/prayer wheels; hamalayi-life.mjs 18/18; hamalayi-inventory.md | done; GPU look asked |
| The underground (underground.js) | room camera; **own pass done (merged 9.11)**: Baldino and Vesk in character, the shaft's call post and shift log, the bore console by phase, the shutter's reason, a service hoist showing how Vesk got ahead, Sendell's pool, the epilogue's shield crew (Guard Harl, Tolli, Sala); under-bar.mjs 15/15; underground-inventory.md | done; GPU look asked |
| Citadel | the reference; camera pass 3 in wave 1 | in progress |

v68 published 9.11 (1794197460-ceb9): Desert Island and the Hamalayi passes, DOORS-LBA2, the pink house turned, HANDS-36, STONES-31, ITEMS-1, the isles'/Desert/Hamalayi cast shapes.

## The user's decisions
- 8.11: long chapters are not shortened (chapters 2 and 10 stay as they are).
- 8.11: Retry after Game Over → the last autosave with full health (main.js RETRY_KEY).

- 8.11: the user listened to the voices and action-sound passes: "great" (kept as they are).

- 9.11: the wizard's tent stays where it is (LBA2's spot is our glider field; the tent is ~4 m off it). DOORS-LBA2 #10 closed as kept.

- 10.11: **no actions in the air, anywhere in the game** (the user, after the opening film): every hand action (tinker, mend, dig, wipe, lift, pickup, sweep, carry, pump, a lever, a tap, a screwdriver) touches a real object at the hand, and the object answers where it should; feet on the ground. Applies to the films, the scenes and every resident's routine.
- 10.11: the user approved DEPTH-PLAN.md's **first wave** (12 proposals: COL-1, HAM-1, ISL-1, UND-1, ISL-3, ZEE-1, DES-1, DES-2, HAM-2, HAM-3, C11-1, C12-1), built two or three at a time, each with its test. New people (HAM-3's brother) and the core-fight change (C12-1) checked by the narrative and combat owners when built.
- 11.11: **side quests reward something new to do in the world**, not only a clover; the test for every one: "if I come back here in three chapters, what can I see, hear or do that wasn't here before?"; no quota per chapter; a short main chapter is fixed on its main path, not with side quests. The user's five quests (DEPTH-PLAN.md's last section) lead the order, The Last Ferry first. Everything the user adds goes into the work order.
- 11.11: **the main campaign is strengthened by the user's treatment** (CAMPAIGN-TREATMENT-2026-11-11.md), chapters 2 and 3 first, then every chapter to a playable aftermath, without waiting for "continue"; existing stronger scenes, characters, travel order and saves kept; no duplicate villain; optional content stays optional; hours never claimed unmeasured (the ~15 h goal is separate from the measured main route).
- 11.11: **tokens: two workers at a time, small jobs first** (the user: "2 agents, but let's run small agents first"): when a slot frees, the next worker is a short, bounded job (closing the audit follow-ups, F-13's known-failing list, one leftover at a time) before a long one; a lighter model for well-bounded checks and merges. The two running long jobs (the campaign's wave 1, NO-AIR 2) finish.
- 11.11: **publish the artifact less often** (the user: "no need to publish every minute"): a new artifact version after a broad batch of fixes, when the coordinator is unsure of something and wants the user's eye on it, or when the user asks. Merges and pushes go on as usual between publishes.
- 11.11: **the target is about 15 hours to win, without making the game boring or lifeless** (the user). Every added minute is something to do, find or understand (a puzzle, a place that changed, a person with a reason, a skill used a new way), never walking, waiting, repeated fights or backtracking for its own sake. Time is never claimed unmeasured: the bot's route time is measured, a first player's is only estimated until the user plays it.
- 11.11: **the camera felt chaotic only at the hostel door, not elsewhere** (the user, answering the desktop agent's CAM-34 question). The portico's camOnly box stays withdrawn; the camera elsewhere stays as it is; no general camera rework.
- 11.11 (late): **night mode** (the user). Work on without asking, at most two workers, small bounded jobs first: finish campaign wave 1 and NO-AIR 2, merge, test, publish once as a broad batch; then the audit follow-ups, then campaign wave 2 onward. Nothing that needs the user's eyes or ears is claimed done.
- 10.11: the user bought a new desktop with a GTX 1050 graphics card: it becomes the **work and test machine** (the local agent, Blender, the test lab, the GPU looks). The Vega 8 laptop stays the **minimum target** for performance.

## Playtest inbox (the user's reports, newest last; each goes to a worker and gets a status)

| # | Date | Where | Report | Owner | Status |
|---|---|---|---|---|---|
| P1 | 7.11 | Zeelich | "all the buildings disappear when you get close" (whole-house fades, zeelich.js makeFader; VP-10 missing in rooms) | wave-1 finisher | **fixed** (merged 7.11): no building fades in any outdoor room; the camera rises over tight shapes (roomocc.js: Zeelich street 34, Desert 25, Hamalayi 25, all 9 isles); only the council porch fades while he stands under it — Automated runtime only |
| P2 | 7.11 | Citadel harbour (residents) | "the characters walk in slow motion, a problem with the legs" (photo: an Esmer resident's leg stretched back) | animation-combat (urgent, a third worker) → laptop (hands) | **fixed**: the walk (GAIT-CADENCE, v60) and the hands (HANDS-36, laptop, v68: the Esmer and tri-head hands built as hands hang; the other races' were already a closed hand) |
| P3 | 7.11 | Citadel spaceport deck | "another structure that's just there": the TICKETS · INFO kiosk | buildings-interiors worker (wave 3) | **fixed** (merged 7.11): Corla the clerk behind the counter every chapter (lines by chapter; the spaceship menu from chapter 4); the sweep gave prompts and lines to the notice boards, map stands, fountains, carts and two sheds (citadel-structures.md, tests/citadel-structures.mjs) — Automated runtime only |
| P4 | 7.11 | Citadel sewer, all doors | "the sewer isn't laid out as in the second game: check every door, where it led and where it should connect" | laptop curator (LBA2 links, order 29) → cloud buildings-interiors | **fixed** (DOORS-LBA2, merged 8.11): the lower-town street hatch at LBA2's spot (−28.5, 27.6) down to the hall's NE corner (the Bug Street grate gone; the pink house 3 m north, Fosse's office), the terrace hatch replacing the porch house down to the NW corner, the well-house = the globe room's door, the treasure room's gate in the west wall, the tavern drop on the central platform, the tent passage at z 10; kept: the wizard's tent (the glider field stands at LBA2's spot), Tralu's cave (no bank at LBA2's spot); doors-lba2.mjs — Automated runtime only |
| P5 | 7.11 | Citadel, the fort climb's foot (CLIMB-17) | "very strange" (photo): stacked copings on a slotted pier, two parapets with a trench between, rails in mid-air, a jagged seam to the plaza, the pipeline over the landing | cloud world-polish (moved from the laptop's order 30, 8.11) | **fixed** (CLIMB-31, merged 8.11): level brick courses on every cheek/wall (onRun: masonry in its run's frame, sheared not tilted), one coping height at the landing post, the post's shaft to the ground (no dark notch), one corner post at the foot, rails end on newels on the coping, the threshold's black seam shaded; left: the reservoir branch pipe 2.4 m over the landing's NW corner — Automated runtime only; a GPU look asked |
| P6 | 7.11 | Citadel, the Whispering Cliffs' rising stepping stones | "the cylinders look really weird" (photo): bare 9-sided brown cylinders with flat green discs | laptop world-art (order 31, STONES-31) | **fixed** (STONES-31, laptop, merged 8.11): faceted stratified rock columns in the cliff material with moss caps; colliders unchanged |
| P7 | 7.11 | Chapter 1, Zoé's search | "in Zoé's part you can switch to running now": the Ctrl behaviour menu and the HUD icons ignored the story's hold (noBehaviours) | coordinator | **fixed** (actors.js setBehaviour, main.js Ctrl menu); probe: discreet held through setBehaviour, the Ctrl menu and HUD clicks (Automated runtime only) |
| P8 | 7.11 | Citadel, a narrow paved passage between tall stone walls | "the camera still zooms in super close" (photo, running) | world-polish camera worker (pass 3) | **fixed** (CAM-KEYWALK, merged 7.11): it was the fort's west station gate: run out 0.95 m → 3.2 m least arm, walk out 0.95 → 6.77 m; plus 13 Citadel spots (camcitadel.mjs, 50/51) — Automated runtime only; a GPU look asked of the laptop (order 34) |
| P9 | 7.11 | Chapter 1, the project depot by the pipeline valve | "enemies only when you need to work the pipe: why are there enemies, what do they want, what did I do wrong? They don't exist before the water valve is needed and vanish after, even if I didn't kill them" (chapter1.js enemyDefs: drones, guard, dog `when: reached && !c1_valve_depot`) | campaign-director (wave 2) | **fixed** (story/depotwatch.js; island.js: a yellow line across the yard, two "Staff only past the yellow line" signs): the watch is there from chapter 1 (the well) until the valve; the path through the depot is public; seen in the yard, the guard warns and turns him out at a gate (saved: c1_depotWarned); caught again, at the valve, or striking one: a fight; the depot valve opened, the station radios the guard ("that's Twinsen: let it run", "all of you up to the station gate") and the watch walks off toward the fortress, gone only out of view; after a load and in later chapters it is not at the depot. tests/depot-watch.mjs 11/11 (Automated runtime, input where it says INPUT); no person has played it |
| P10 | 8.11 | Citadel, the stair up to the asylum | photo: the cheek wall tilted to the slope so its brick courses run diagonal, its coping running into a capped post below the cap, a dark notch in the post, a second coping at another height; the teal railing beside the coping | cloud world-polish (with P5) | **fixed** (CLIMB-31, merged 8.11): level brick courses on every cheek/wall (onRun: masonry in its run's frame, sheared not tilted), one coping height at the landing post, the post's shaft to the ground (no dark notch), one corner post at the foot, rails end on newels on the coping, the threshold's black seam shaded; left: the reservoir branch pipe 2.4 m over the landing's NW corner — Automated runtime only; a GPU look asked |
| P11 | 10.11 | The opening film | "the opening film isn't polished enough: the people at the harbour, Arthur and Twinsen — the actions they do in the air" (hands working on nothing: the harbour worker and resident on the pier, Twinsen's tinkering and screwdriver, Arthur at his boat) | animation worker (NO-AIR, running 11.11) | **fixed in the film; in work in the world** (NO-AIR, merged 11.11): the film's eight hand beats on real things (the lift's control, the crate, the lamp's screw, Arthur's boat on a stand, Zoé's pots; worst gap 1.4 cm); in the world 0 hands in the air in 21 chapter states, but 147 of 266 work stops now stand idle → NO-AIR 2 (running: the Hamalayi, Desert Island, the isles; Citadel and Zeelich after the campaign's wave 1) — Automated runtime only |
| P12 | 11.11 | Chapter 2, Zoé's search of the project office | "the elephant in Zoé's part doesn't hold a torch": the guard's yellow sight cone on the floor reads as a torch beam, and his hands are empty | NO-AIR 2 worker (added the same day, asked to do it first as its own commit) | **fixed** (v81, 11.11): a hand torch in his right fist with a faint beam to the floor patch, held forward as he walks and glances, lifted at her when he suspects; the patch starts at the torch's throw; his sight unchanged (docs/lba-maturity/watcher-torch.md); zoe-resume, chapter1, depot-watch PASS — Automated runtime only |
| P13 | 11.11 | Every room and place | "later: an agent that makes sure every item stands in a sensible place and not in the middle of the room, that it is arranged normally, and that no items are one on top of another" | world-polish worker (work order 1e) | **done 12.11** (8c47602e): `tests/place-scan.mjs` measures 135 areas / 2059 pieces; 76 found, 42 fixed (Zeelich homes, Twinsen's house, island homes' pilasters ×25, Lhar's packs, archive, pharmacy, lighthouse, Nell's shop, School of Magic), 34 left with reasons in `PLACE-1.md`; outdoor dressing outside the Kit not scanned; Automated runtime only |
| P14 | 11.11 | The whole cast (told to the desktop's local agent) | "the ears are in the air", then "every limb should be connected" | the desktop: CAST-CONNECT-1 with a new check (`art/blender/characters/jobs/floating.py`): 51 of 61 models had a loose part, 3 left under 1.3 cm (Arthur's hair, Vesk's brows, a false report on a bee); Twinsen, Zoé and Baldino have their own scripts (Twinsen after the queue) | **applied 11.11** (with CAST-POLISH-NAMED) |
| P15 | 11.11 | Citadel's village and the pharmacy (told to the desktop's local agent) | "why are there green elephants, it makes no sense" | the desktop: GROBO-GREY in CAST-VARIANTS-1 (the trader model's sage skin made grey; Brix's and Gunda's green tints made grey-lilac) | **applied 11.11** |
| P16 | 12.11 | Twinsen and Arthur (told to the desktop's local agent) | Twinsen's look in Zoé's finish ("the band must sit tight on the scalp"; the eyes "far too big, strange spots"); "Arthur is really not at the level of Twinsen and Zoé", "the shoulders are strange" | the desktop: TWINSEN-LOOK-38, ARTHUR-LOOK-38 | **applied 12.11** by the cloud with CAST-VARIANTS-2 (solidnpc, chapter1, cast-rounds, prologue, opening, interior-life PASS; Automated runtime only); in the next publish |

## Waves (cloud)

| Wave | Workers | Status |
|---|---|---|
| 0 | in-flight work before the pack: camera pass 3 (Citadel spots by keyboard), Citadel chapters 3–9 + real saves, SLIDE-RESCUE review | paused by the usage limit; camera pass 3 resumes as part of wave 1 (world-polish), the other two fold into waves 2 and 7 |
| 1 | world-campaign-finisher (Zeelich: entrances, identity, life) + world-polish (camera pass 3, resumed) | done: v57 (camera pass 3), v59 (Zeelich, 1794082922-cfd5) |
| 2 | chapter-balance (all chapters) + campaign-director (incl. the paused Citadel 3–9/saves review) | campaign-director done (below); chapter-balance done (merged 8.11): chapter-balance.md — 14 segments chained through real saves; ch 7, 9, 12 got real steps (ice slit, warm discs, the archivist's key, the bleed valve), ch 10 Yorna's broth; ch 2 and 10 long by design (the user's call), ch 12 still short (needs the boss fight: animation-combat), ch 2's depot spike (bot) → animation-combat. First-play minutes are estimates |
| 3 | buildings-interiors + original-mechanics (serialize shared transition code) | buildings part 1 done (merged 7.11): P3 + Citadel sweep; 63 rooms behind the isles' 55 doors + Kesh's 5 houses + the post's 3 cabins (ihomes.js, island-doors.mjs 78/78); 3 doors nailed shut with a reason. Waiting: DOORS-LBA2 (laptop 29). Knartas ledge door → world-polish Original-mechanics done (merged 8.11): every door lands him 0.47 m clear of its trigger facing away (main.js clearOfDoors; the terminal/Otringal re-entry fixed), door approaches kept clear, the Hamalayi's 7 doors into rooms, the asylum lids and the council porch reset on arrival; room cut-away surveyed in 110 rooms (no fault); door-sweep.mjs, room-cutaway.mjs (mechanics-entry.md) |
| 4 | animation-combat (+ laptop world-art in parallel) | done (merged 8.11): point-blank throws (the ball leaves before anything solid, close throws cross in their fall time; the valve corner 44/44, ball-close.mjs), chapter 12's guardian a dive phase (a telegraphed ring, glances while overloaded; the bot's time unchanged ~68 s: a person must time it), Oda's 5-step stop → 2 (the turn after the stop). Hands → laptop HANDS-36 |
| 5 | dialogue-editor + character-voices | done (merged 8.11): dialogue pass 1 (50 lines: story facts, repeated jokes, hints; dialogue-pass-1.md); voices: 13 new speakers + the hostel's 7 each their own voice (they all fell back to Quetch before), neighbours differ (voices.mjs), clause pauses trimmed (comma 270 → 125 ms, stop 475 → 300 ms: clip-edges in the manifest), a 20 ms fade before a scene's suspend. Listening pairs sent to the user (nobody here can listen) |
| 6 | action-sound (+ laptop music-director) | done (merged 8.11): action-sound.md — one sound per event, positioned enemy/impact sounds, small variation, effects ducked 4 dB under dialogue, highs tamed (≤ 10 % over 5 kHz), new cues (ball wall/ground, pickups apart, search found/empty, doors in/locked, valve, lever, radio, the guardian's dive); action-sound.mjs 21/21. Listening pairs for the user |
| 7 | world-polish remainder (SLIDE-RESCUE keyboard review) | part done (merged 8.11): camfollow 31/31 (the 5th failure was the test's run off Citadel's south cliff, not a camera turn; CAM-OVERSIGHT fixed a real fault by walls), camcitadel 61/61 (CAM-ALLEY), the Knartas ledge door's steps, the hostel landing's parapet. Left: camclear 0.149 m, Oda's stop, the SLIDE-RESCUE keyboard review; laptop performance-lab in parallel Pass 2 (merged 8.11): crosssystem's focus check was its setup (against a fence), Knartas's gatehouse arch opened (the village reachable by walking: flood fill 1774 → 11813 cells), Oma off the council door, platform-35-15's fence, camclear's orchard pipe volumes (0 of 532) |
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
  passed on the rerun); saveslots.mjs's slot picture (passed on the rerun); (camfollow and camcitadel fixed 8.11) (Oda's stop and camclear fixed 8.11); overlaps' two Lhar roof spots; sewers.mjs 3 well-house lift checks; sewers-ways 2 out-of-door spots.
