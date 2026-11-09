# Zeelich's isles as a player meets them: an inventory against Citadel's bar (9.11.2026)

Worker: world-campaign-finisher (cloud), the isles' own Citadel-bar pass. Base: `ccr-c1c2c4b9-dep6ed` at `a3e342f9`.
The bar is `citadel-bar.md`; the passes this follows are `desert-inventory.md` and `hamalayi-inventory.md`. Labels as in
`PROJECT_CONTRACT.md`. Evidence is **Automated runtime only** (SwiftShader, headless Chromium, 960×540, Follow camera at
Medium, Classic controls, fixed-step game time) unless marked **Source only**. Pictures were looked at, not played; no
frame-rate claims. Nobody has played any of this on a GPU. Probes (not suites) and pictures: the worker's scratchpad
`isles/` (`inv.mjs`, `flood.mjs`, `knartas.mjs`, `over.mjs`, `cam.mjs`, `new1.mjs`, `otrwalk.mjs`, `hoist.mjs`;
`before/`, `after/`, `flood/*.png`, `cam/`, `new1/`, `otrwalk/`, `hoist/`), deleted at the end of the pass.

**Resemblance.** Otringal, Knartas, Mosquibee, Celebration, Under Celebration, the Platform and the Lift Dock keep the
original's ground and objects (`zislands.js`, numbers from the user's files); the Nectar Orchard and the Old Watch are
ours. Every resemblance score is **Unverified** until the laptop's curator scores it. This pass changed no ground of the
original except where a way was missing: a flight of steps on Otringal's plaza bank (ours), the original's thin wall at
the end of the high town's ramp and one spire on a door not built, the high town's spires drawn slimmer, Knartas's
high-hung pieces left out, a honey hoist on Mosquibee (ours). The rooms are our own layouts (no original interior claimed).

## Where the isles come in the story

No chapter is set on the isles: they are open from chapter 4 (`dig`), reached by the Esmer shuttles from Zeelich's pad,
and stay open to the end. Their residents (`islandlife.js`) follow three states (`islePhase`: ord 4–7, crisis 8–9, after
10–12 and the epilogue) and five line states (`lineState`: ord, evac, council, net, home). Their side stories
(`story/islandpeople.js`, optional; flags `pp_*`): Knartas's quay light (Quill; the lens bought from Madam Orla from
chapter 9, cheaper with the Lift Dock's manifest), Mosquibee's beacon (Bzzra; the ball on the Orchard's cloud catcher),
the Platform's chapel bell (Father Umber; the clapper by the ore cart), the Old Watch's telescope and the Orchard's lost
crate, the Imperial Hotel's machines, Pello's cordial, Zella's lantern (for the Wannie mine's glove on Under Celebration,
`story/arsenal.js`). None is required; none becomes required.

## Before this pass (base `a3e342f9`; probes `inv.mjs`, `flood.mjs`, `knartas.mjs`, `cam.mjs`)

| Bar line | Before | Finding |
|---|---|---|
| 1. VP-10 camera | automatic volumes on every island (`roomocc.js`) | nothing fades outdoors. Camera walk below. |
| 2. Doors: every accessible building leads in | 55 isle rooms behind the doors (wave 3; with Kesh's and the post's, 63) | **A flood fill of where he walks from Otringal's pad reached 4565 m² and 9 of its 23 house doors**: the south terrace (6 m over the plaza, a bank 2 in 1) and the high town (28 m: its ramp ended against the original's thin wall at the terrace's garden; inside it the beige spires filled two lanes wall to wall, one stood on a door, and OTRINGAL-37's ground peaks closed others) had no way in: the school, Ulla's and Mr Tanek's houses, the market (Ossa), the clinic, the reading room, the lift office: 12 doors (two more stand on patches across the clouds). `island-doors` had passed by putting him 2.6 m before each door (ISO). **Mosquibee's two rooms** stand on a ledge 13 m under the meadow and on an islet across the clouds: neither reached. Every other island's doors are reached (planner from the pad, `knartas.mjs`). |
| 2. Otringal's bar | (REVIEW-ZEELICH-ART (b)) | the door opened behind the back-bar's shelf wall: he walked in hidden beside the barkeep. |
| 2. Zeelich's dog yard | (REVIEW-ZEELICH-ART (c)) | its gate gap opened 1.5 m behind the council house: 2 m before the gate was the house's roof. |
| 3. People with rounds | 39 residents (4–6 an island) + the bar's 2, the hotel's 2, 6 keepers | the same count in every chapter; **49 of the 55 isle rooms empty in every state** (only the 6 keepers' counters). |
| 3. Lines follow the story | each resident: a line for some states (`ip_<id>_<state>`) and 1–2 general ones | **Lines told of optional favours as done whether or not they were**: in chapter 10 on, Tem said "The light blinks!", the Old Watch's child saw it from the telescope, the hotel guest, the loaders, the carter and the dancers said the shuttles swing wide of the hives, a picker spoke of Bzzra's thank-you jar, Madam Orla of the lens gone home, even if the player never did those things. Pello's "the beacon has been dark for months" stayed after it was lit; Tem's "I've never seen it blink" after it blinked. **Mother Pudd said her door was too small for him** although it leads in since wave 3. **"Evening"** in Quill's, Tem's and Gorrin's lines (the world has no Earth night). |
| 3. Not emptied by another island's story | — | **Citadel's evacuation (chapter 8) took Zeelich's three street walkers** (Ilo, Aven, Kira) off Zeelich, by the rule Desert Island fixed for Kesh. |
| 4. Purposeful structures (R11) | the quay light, the beacon, the clapper, the crate, the telescope, the hotel's machines | **Read as usable and did nothing**: every island's shuttle departures board, 13 signposts and 8 warning signs, Otringal's fountain and its unattended stalls, Knartas's net racks and washing, Mosquibee's great hive, the gas works' holders and pumps, the Building Company's board, the Wannies' mine and chapel bell frame, the two lift towers, Mr Kett's crane, the Orchard's cloud catcher, the Old Watch's tower and fallen dome (probe: no interaction within 2.4 m of 72 such pieces). |
| 4. Grounded props | (mechanics-entry: Knartas list) | Knartas's original pieces that stood on arches and walls ours do not draw (bodies 26, 46, 52/53, 68/69, 72, 80) hung 1.5–3.4 m up (a wooden frame on the canteen's front). Celebration's plaza paving ran over the rock's slopes (REVIEW-ZEELICH-ART (e)). |
| 5. Music per place | the islands' rooms `zeelich_in`, the bar `zeelich` | kept (no change). |
| 6. Story and saves | no flags of its own besides `pp_*` | kept: nothing new is saved. |

## What changed (this pass), in the order a player meets it

| # | Where | Before | Now | Code | Evidence |
|---|---|---|---|---|---|
| 1 | Every island's shuttle board | did nothing | reads the departures; chalked notes point at the open favours (QUAY LIGHT OUT by Knartas, KEEP HIGH OVER THE HIVES by Mosquibee, CHAPEL BELL SILENT by the Platform) until each is done; a strip in chapters 8–9 (PROJECT FLIGHTS HAVE PRIORITY), torn off after | `story/isleslife.js`, `zislands.js` R.items, `text/isleslife.js` | `isles-bar`, probe `new1` |
| 2 | Signposts, warning signs, the Building Company's board, the gas holders, the lift towers | did nothing | read (the board and the holders by the story's state: double shifts, the needle jumping, ordinary hours) | same | `new1` |
| 3 | Otringal's fountain | nothing | a drink gives back 2 life once in 20 s, a line by state | same | `isles-bar` |
| 4 | The unattended stalls, Knartas's racks and washing, the great hive (angry until the beacon is lit), the pump engines, the mine (the deep seam roped off in the crisis), the bell frame (silent, or rung once the clapper is back), the crane, the cloud catcher (its dark beacon high on a pole: the ball's clue), the Old Watch's tower and dome | nothing | a look each; a piece gives way to a person standing by it (their talk wins) | same | `new1` |
| 5 | **Otringal's south terrace** | no way up from the plaza | **a flight of steps** up the bank west of the Grand Hall, low cheek walls, the terrace's rail open over its head (two of the original's fence lengths not built) | `zislands.js` S.flights, S.open | `isles-bar` (INPUT), flood fill, `otrwalk/foot.jpg`, `mid.jpg`, `head.jpg` |
| 6 | **Otringal's high town** | its ramp ended at a thin wall; spires in the lanes | the wall (body 15) not built: the terrace garden leads up the ramp; the high town's spires (bodies 37, 42) drawn at half their width, the one on the big family's door not built; the laptop's **OTRINGAL-37** diff applied as delivered (it lowers the ground's peaks in the lanes) | `zislands.js` S.open, S.spireK, paveFlat (OTRINGAL-37) | flood fill 4565 → 6839 m²; planner from the pad: 24 of 26 doors (the two left are below), `isles-bar` (INPUT to the clinic) |
| 7 | **Mosquibee's ledge** | 13 m under the meadow, nothing reached it | a **honey hoist**: a lift tower against the cliff, *Ride* at its head and its foot (behind the black, out facing away) | `zislands.js` S.hoists, `story/isleslife.js` ride | `isles-bar` (INPUT), `hoist/` |
| 8 | **People at home** | 49 isle rooms empty in every state | seven residents at home in some states with the reason their lines give, their outdoor selves away then (one name, voice, dress): **Ulla** (council: nobody buys, she counts apples), **Mr Tanek** (evacuation and council: cutting scarves into blankets for Twinsun), **Mila** (by the radio for letters from Twinsun), **Mother Pudd** (her stove going all day; Nib says so), **Rudd** (the gauges while the needle jumps), **Obo** (the epilogue: his first warm room), **Nessa** (the epilogue: a day off); and five rooms' own people: **Miss Avra** (the terrace school), **Sister Ione** (the high town's clinic: she patches him up, all his life, once in 30 s), **Old Jaspa** (Knartas's gem-sorting room), **Zuzz** (the hive keepers' hall), **Zett** (the Orchard's press). Each works a round between two pieces of the room, with a line for each state | `story/isleslife.js`, `islandlife.js` ISLE_HOME/atHome, `engine/voice.js` (5 voices), `text/isleslife.js` | `isles-bar`, probe `new1` (all 12 placed and talking in their states) |
| 9 | Favour-bound lines | told as done whatever the player did | each such line waits for its flag (`pp_light`, `pp_beacon`, `pp_bzzraDone`), with its other line till then; Pello's and Tem's general lines change once the favour is done | `story/islandpeople.js` FAVOUR_LINE, `text/isleslife.js` | `isles-bar` |
| 10 | Words | Mother Pudd's too-small door; "evening" ×3 | "mind your head, Wannie doors are low"; fog "without warning", "every day since", "before the shift and after" | `text/islandpeople.js`, `text/ihomes.js` | Source only |
| 11 | Otringal's bar | the door behind the back-bar | the door at z 5.9 in front of the bar and its stools (the leaf plant moved to z 3.6) | `otrbar.js` | `isles-bar`, `new1/bar-in.jpg` |
| 12 | Zeelich's dog yard | the gate 1.5 m behind the council house | the gap 4 m west, at the head of the lane between Mr Pelleck's house and the council's; `R.dogYard.gate` with it (the conch's 9 m and `purposes` follow it); Marl by the fence just west of it | `zeelich.js`, `storylife.js` | `isles-bar` (INPUT from the street), `new1/yard-gate.jpg` |
| 13 | Zeelich in chapter 8 | Ilo, Aven, Kira taken off by Citadel's evacuation | they stay, with a line of the day each | `story/citizens.js` OFF_EVAC, `text/walkers.js` | `isles-bar` |
| 14 | Knartas | pieces hung 1.5–3.4 m up | not built (S.open at build: the planner keeps its numbers), as the lintels are left out | `zislands.js` knartas open | `before/knartas-b52.jpg` → `after/` |
| 15 | Celebration's plaza | paving over the slopes | paving only where the ground is near level (S.paveSlope 0.3) | `zislands.js` | `before/after celebration-*.jpg` (small change; a GPU look asked) |

## People on the isles per chapter

Outdoors before (probe `inv.mjs`): every chapter from 4: Otringal 4, Knartas 5, Mosquibee 4, Celebration 4, Under
Celebration 4, the Platform 6, the Lift Dock 4, the Orchard 4, the Old Watch 4 (39); indoors the bar's 2, the hotel's 2
and the 6 keepers in every state. Now outdoors the same in chapters 4–7 and 10–12; in chapters 8–9 Ulla (9), Mr Tanek,
Mila, Mother Pudd and Rudd are at home instead, in the epilogue Obo and Nessa. Indoors now, besides the keepers: Miss
Avra, Sister Ione, Old Jaspa, Zuzz and Zett in every state from chapter 4, and the seven at home in their states.

## The camera by keyboard (VP-10; probe `cam.mjs`)

Follow at Medium, Classic controls; the harness walks (the planner's path, Up held) from each island's pad through its
waypoints; per frame: Twinsen hidden (`camRig.hiddenBy`), the camera inside a solid, the shortest arm. Nothing fades
outdoors (VP-10 kept). Automated runtime only.

| Island · walk | frames | hidden | camera inside | min arm (m) |
|---|---|---|---|---|
| Otringal: pad → fountain | 364 | 0 | 0 | 8.2 |
| → the Grand Hall | 1398 | 159 | 0 | 6.2 |
| → the new flight's foot | 508 | 125 | 0 | 3.4 |
| → its head | 342 | 10 | 0 | 8.2 |
| → the terrace | 478 | 99 | 0 | 8.6 |
| → the garden, the ramp | 944 / 334 | 8 / 15 | 0 | 6.9 |
| → the high town, the clinic's lane | 2474 / 978 | 34 / 50 | 0 | 3.0 / 5.4 |
| Knartas: pad → harbour | 426 | 0 | 0 | 8.8 |
| → **the gatehouse arch** | 588 | 32 | **31** | 3.2 |
| → **the village lane** | 694 | 0 | **33** | 5.4 |
| → the canteen, the upper village | 426 / 3361 | 0 / 61 | 0 | 4.3 / 3.0 |
| Mosquibee: → the great hive, the hoist | 818 / 684 | 0 | 0 | 8.2 / 6.5 |
| the Platform: → yard, mine, village, chapel | 1150 / 752 / 578 / 1185 | 15 / 119 / 178 / 3 | 0 | 5.3 / 3.8 / 8.5 / 3.0 |
| Celebration → the figure; Under Celebration → the works; the Lift Dock → the lift | 200 / 588 / 324 | 19 / 0 / 0 | 0 | 3.5 / 8.2 / 4.7 |
| the Orchard → the catcher, the press; the Old Watch → the telescope | 472 / 810 / 1288 | 0 / 126 / 54 | 0 | 6.1 / 7.5 / 8.7 |

Hidden frames are where he stands behind something until the next shot rises (the rule); long counts (the Grand Hall's
portico, the flight's foot between its cheeks and the hall, Otringal's terrace houses, the Platform's mine and village,
the press house) are left for world-polish's camera pass, with the two spots where the camera stands **inside** a solid:
Knartas's gatehouse arch (it rides through the arch's top as he walks under it: `cam/knartas-gate.jpg`) and the lane
behind it. Not changed here (camera code is world-polish's).

## The bar, line by line, for the isles now

| Bar line (`citadel-bar.md`) | The isles | Evidence |
|---|---|---|
| 1 Nothing fades outdoors; tight shapes | met (automatic volumes); two camera-inside spots on Knartas and long hidden stretches listed above | `cam.mjs` |
| 2 Every accessible building enterable or shut with its own reason | 52 of the 55 isle rooms reached on foot from their pads (the planner and the flood fill); the three left stand on patches across the clouds (Otringal's barges' yard with the quay's cargo store, its west quay with the dock worker's house, Mosquibee's west islet with the honey room): **distant scenery**, never met at the door. The three shut doors keep their reason and sign | flood fill, `knartas.mjs`, `island-doors` |
| 2 Compact furnished lit interiors; music per place | the planner's rooms (wave 3), `zeelich_in`; the bar `zeelich` | `island-doors`, `interior-life` |
| 2 The way back out; a save inside comes back inside | yes (Ulla's room saved, Continue) | `isles-bar` |
| 3 Purposeful residents with rounds; memorable people whose lines change; own dress; rooms have their keeper | 39 residents + 12 indoor people now; lines by state; favour lines honest; 18 of the 55 isle rooms have someone in some state (the 6 keepers and the 12 above) | `isles-bar`, `island-people`, `residents`, `world-consistency` |
| 4 Grounded props, no slide traps, routes open, purposeful props | Knartas's high-hung pieces out; 72 usable-looking pieces now answer; routes on foot to the terrace, the high town and the ledge | `overlaps`, `slidetraps`, flood fill |
| 5 Identity | unscored (the curator) | — |
| 6 Story and saves | no new flag; `pp_*` unchanged in meaning; old saves load | `save-migration`, `isles-bar` |

## What is left (and for whom)

- **Resemblance scores**: Unverified (the laptop's curator). The new flight and the hoist are ours.
- **The three rooms across the clouds** (Otringal's quay cargo store and dock worker's house, Mosquibee's honey room):
  out of reach on foot; a gangway or a ferry would bring them in. Not added (no new crossing invented for two rooms).
- **The camera**: Knartas's gatehouse arch and lane (the camera inside a solid for ~1 s each walk), long hidden stretches
  by Otringal's Grand Hall and the Platform's mine and village: world-polish's camera pass; a GPU look asked.
- **Otringal's high town** reads busier with the spires slimmer; how it reads at Follow/Medium on a GPU is the laptop's
  (OTRINGAL-37 follow-up).
- **Rooms still empty in every state**: 37 of the 55 (homes, stores, offices). Not filled with idle extras (the brief: a few
  memorable people, not cloned crowds).
- **Celebration's plaza**: the paving change is small; the bench on the slope the laptop saw was not found in the probe's
  pictures. A GPU look asked.
- A player's own first time: none of this was played by a person.

## Evidence (9.11.2026, Automated runtime only)

Run against a snapshot of `lba3/` served locally (SwiftShader, headless Chromium), one suite at a time, on the final
code unless marked:

| Suite | Verdict | Notes |
|---|---|---|
| `isles-bar` (new) | PASS 13/13 | the flight, the terrace and the high town by input, the clinic and Sister Ione, the fountain, every board and its favour notes, the hoist and Zuzz, the bar's door, Ulla at home in chapter 9, a save in her room → Continue, a death → Retry with full health, chapter 8's Zeelich walkers, the dog yard's gate from the street, chapter 10's favour-bound line. The first runs failed on the test's own roof check (the street's floor bricks) and a comment that swallowed a line: fixed |
| `zislands` | PASS | first run FAIL 1: Knartas's high pieces left out by shape changed the planner's free ground and Nessa's round crossed the pad's approach; left out at build instead (S.open), rerun PASS |
| `island-doors` | PASS 89 | first run FAIL 1: Zett at the press took its look's prompt; the indoor people now work at pieces without a look |
| `island-people` | PASS | updated: Mila at home in chapters 8–9 (four outdoors), the islands' usable pieces where residents work are not "a stop on a prompt" |
| `purposes`, `zeelich-life`, `zeelich-doors` | PASS | the dog yard's new gate (purposes walks to gate + 2.2 z) |
| `interior-life` | PASS 144 | (an earlier run's 2 resource fails were the local server stopping at its time limit) |
| `camera-doors`, `save-migration`, `slidetraps` | PASS | |
| `overlaps` ONLY = the seven original isles, the bar, Zeelich | PASS | the flight's steps and cheeks |
| `cast-rounds`, `residents` | PASS | Marl's new gate stop |
| `world-consistency` | PASS 37 | the hoist's scene change added to the journeys' allow-list (the same island) |
| `door-sweep` CHAPTERS=5,8,9 | PASS | |
| `story-journeys` | PASS | |

Not run: the full playthrough chain (`tests/playthrough`; no chapter's route crosses the isles), `camfollow`/`camclear`
(Citadel's), `door-sweep` and `overlaps` over every chapter and region.
