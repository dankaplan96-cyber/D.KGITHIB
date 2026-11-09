# The underground as a player meets it: an inventory against Citadel's bar (9.11.2026)

Worker: world-campaign-finisher (cloud), the underground's own Citadel-bar pass. Base: `ccr-c1c2c4b9-dep6ed` at `a3e342f9`.
The bar is `citadel-bar.md`; the models are `desert-inventory.md` and `hamalayi-inventory.md`. Labels as in
`PROJECT_CONTRACT.md`. Runtime evidence is SwiftShader in headless Chromium (960×540, the rooms' fixed iso camera):
**Automated runtime only**. Pictures were looked at; nobody has played this. No frame-rate claims. Probes and pictures:
the worker's scratchpad `under/` (`before/`, `after/`; `probes/inv.mjs` the interaction sweep and head count,
`probes/cam.mjs` the camera survey, `probes/shots.mjs` the pictures), not in the repo.

**What the place is.** Five rooms under Citadel's station bore (`underground.js`, x 1800–2200, each built with the
interiors' RoomBuilder and seen by its fixed iso room camera): the shaft's bottom landing (`c3shaft`), the project's deep
installation (`c3deep`), the crystal galleries (`c3gallery`), Sendell's chamber (`c3sendell`) and the core (`c3core`).
A hostile place reached late in the story, and empty by design in chapters 11–12: the bore's crew went up when Vesk
closed the shaft at the end of chapter 3. **Resemblance**: our places; LBA2 has no counterpart. Unscored (the curator).

## Where the underground comes in the story

| Chapter (key) | Down there | Areas built (`regions.js`) |
|---|---|---|
| 3–10 | the collar in Citadel's station yard is shut (Vesk's blast doors, chapter 3; the network's code opens them at the end of 10) | — |
| 11 `shell` (`story/chapter3.js` Chapter3) | the lift down; the deep installation (the diagram, valves A and C, the ball switch for the stair, the drone); the galleries (three pillars, the stones, four mites, two supply crates); Sendell's words. The door from her chamber to the core ends the chapter | underground (all five rooms, one group) |
| 12 `core` (ChapterCore) | Vesk's scene, the guardian, three pylons from their plates, the bleed valve, the overload coil, Vesk's choice, shield mode (the final fight: `enemies.js` Guardian, unchanged) | underground |
| epilogue `home` | before this pass: not reachable (the collar's blast doors stood open with no prompt) | — |

## Before this pass (base `a3e342f9`; probe `inv.mjs`: every 0.7 m of standable floor on both levels, four headings)

| Room | Exits | What answered | People / enemies | Music | Against the bar |
|---|---|---|---|---|---|
| Citadel, the collar (ch 11–12) | down (`c3down`) | Baldino waits beside it (network.js) | Baldino said only **"Hello, Twinsen."** in chapters 11–12 (the generic fallback) | — | lines don't follow the phases |
| Citadel, the collar (epilogue) | — | **nothing**: the blast doors stand open over the shaft, no prompt, no reason | — | — | a usable-looking way that leads nowhere and says nothing |
| `c3shaft` | the lift pad (up), the tunnel (deep) | **nothing** (0 interactions in every phase): the lift's call post, the crew's tea corner with its thermos and papers, the generator, the toolbox all silent | none | `under` (the well) | silent machinery; the empty place never says why it is empty |
| `c3deep` | entrance; the heat shutter (to the galleries, after the cooling) | the diagram, valves A/B/C (chapter 11 until cooled); after the cooling only the diagram | the drone (ch 11) | `facility` | the bore's console (screen, levers) silent; the shut shutter silent (he walks into it); **how Vesk got ahead of him to the core is never shown** (the galleries' bridge is out and the stones were down) |
| `c3gallery` | tunnel (deep), the old arch (Sendell) | two optional finds (the singing fork's crystal wheel, the arsenal's nook), two supply crates (givers) | 4 mites (ch 11) | `under` | the DANGER · BRIDGE OUT board silent |
| `c3sendell` | arch (galleries), arch (core) | **nothing** after her words: her light hangs over the pool, the reliefs on the walls | Sendell's presence | `cave` (the well) | after the scene, the room's centre does nothing; no music of her own for the revelation |
| `c3core` | arch (Sendell; shut during the fight) | the fight's plates, the bleed valve; Vesk | Vesk, the guardian (ch 12) | `boss` | **Vesk, walked up to mid-fight, said "Hello, Twinsen."** |

Head count (people a player can meet down there): chapter 11: **0** (the drone, four mites); chapter 12: **Vesk** (the
guardian); the epilogue: unreachable.

Camera (`cam.mjs`, every 0.6 m on every level, two rays from the room camera to chest and head): **0 hidden spots** in all
five rooms (555, 856, 1243, 414, 1103 spots), including the floor under the deep installation's catwalk that REVIEW-UNDER
left "for the cloud". `room-cutaway` with the five rooms: PASS (0 hidden). The pictures (`before/*.jpg`) read: the room
camera frames each room, the cut-down near walls show the floor, the lamps light the work areas.

Routes: no dead end found. The gallery's chasm has the rough ledges back up; the stones rise only after the pillars, and
the playthrough crosses them by input; the core's door is shut only during the fight (a line says why).

## What this pass did (UNDER-BAR), in the order a player meets it

Nothing new is saved and no flag changes meaning: what shows is read from the chapter's key and chapters 11–12's own flags
(`story/deeplife.js` phase(): `shell`, `core`, `home`).

| # | Where | Before | After | Files | Evidence |
|---|---|---|---|---|---|
| 1 | Baldino at the collar (ch 11–12) | "Hello, Twinsen." | a word for each step: back up before the cooling ("I'll mind the lift"), after it (the bore's heat dropped on his meter), after Sendell (the plans are ready, everyone at their station), chapter 12 | `story/deeplife.js`, `text/deeplife.js` | `under-bar` |
| 2 | The shaft: the call post | silent | says the pad is the way back up to the station's yard | `underground.js` R.looks, deeplife | `under-bar` |
| 3 | The shaft: the crew's tea corner | silent | the shift log's last page: all crews up, the shaft closed, signed V. (why the place is empty); after the ending, fresh tea | as 2 | `under-bar` |
| 4 | The deep installation: the bore's console | silent | BORE 1 at 140 %, cooling failing (Baldino's radio said Vesk would push the drill); after the cooling, still flat out; after the ending, SHIELD, a note under the speed dial | as 2 | `under-bar` |
| 5 | The deep installation: the heat shutter | silent while shut (he walked into it) | says why: OPENS AT COOLING, too hot to touch (only while shut) | as 2 | `under-bar` |
| 6 | **The service hoist** (new, the back wall behind the exchanger: a caged well, a SERVICE HOIST · CORE LEVEL sign, a call box with a lamp) | Vesk's way ahead to the core was nowhere | the cage is down at the core and the call locked from below: how Vesk got ahead; red lamp in chapters 11–12, green after the ending | `underground.js` buildDeep, deeplife | `under-bar`, pictures `after/ch11-deep-hoist.jpg` |
| 7 | The galleries: the crew's warning board | silent | DANGER: BRIDGE OUT, the bridge torn loose from the far side; read from the shelf only (not from the chasm floor) | as 2 | `under-bar` |
| 8 | Sendell's chamber | silent after her words; her scene played over the well's piece | her pool points on (the core through the warm arch); in chapter 12 her light flickers; after the ending she sleeps. The first relief of the two suns reads. Her words now start the revelation's music (as the well's Sendell scene) | as 2, `story/chapter3.js` | `under-bar` |
| 9 | The core: Vesk mid-fight | "Hello, Twinsen." | "Talk to my guardian, Twinsen. I'm busy." (overload: "Get away from my console!") | deeplife | `under-bar` |
| 10 | **The epilogue: the way down** | the open collar said nothing | after dinner the collar leads down again ("Descend"): the bore runs as a shield "run by both worlds" (the end card) | deeplife (`dp_down`) | `under-bar` |
| 11 | The epilogue: the shield crew | nobody | **Guard Harl**, a council guard, keeps the lift (Vesk rode it up in chains); **Tolli** of the project's crew walks a round in the deep installation (the console, valve A, the exchanger's sight glasses) and checks the second coolant loop (Vesk's note from his cell when he was pulled clear, VESK-CHOICE; his own reason otherwise); **Sala**, Zeelich's half of the crew, reads the field at Vesk's patched console in the core. Each has two lines and a voice of their own (`engine/voice.js`), own dress (DRESS-1) | deeplife, `text/deeplife.js`, `engine/voice.js` | `under-bar` |
| 12 | The epilogue's rooms | — | the hoist lamp green; the diagram's chalked SHIELD LOOP; the board's USE THE STONES; Sendell's light low (0.25); the core plays the cave's piece, not the boss's; Vesk's console reads burnt black, two dials patched | deeplife apply | `under-bar` |

The fights, the puzzles, the guardian (chapter 12's dive phase), the flags and the chapters' order are unchanged.

## People per chapter (after)

Chapter 11: Baldino at the collar (with lines that follow the chapter); nobody below (by design: the shift log says why).
Chapter 12: Vesk (answers mid-fight). Epilogue: Harl (shaft), Tolli (deep installation, on a round), Sala (core).

## The bar, line by line, for the underground now

| Bar line (`citadel-bar.md`) | The underground | Evidence |
|---|---|---|
| 1 Camera reads the space | fixed room cameras; 0 hidden spots on every level of all five rooms | `cam.mjs`, `room-cutaway` |
| 2 Every way that looks usable leads somewhere or says why not | the lift, the tunnel, the shutter (says why while shut), the hoist (says why: locked from below), the arches; the epilogue's collar leads down | `under-bar` |
| 2 Machinery that looks usable responds, with a state that follows the story | the call post, the tea corner's log, the console (hot · cool · shield), the hoist (red · green), the board, the pool (holding · flickering · asleep), Vesk's console (after) | `under-bar` |
| 3 Purposeful presence where the story puts people | chapter 11 empty by design (the log), Baldino above; chapter 12 Vesk; the epilogue's shield crew of three (a guard, a maintenance engineer, a reader of the field) | `under-bar` |
| 4 Music and ambience per space | shaft and galleries the well's piece, the deep installation the facility, Sendell's words the revelation, the core the finale in the fight and the cave's piece after | source (not listened to) |
| 4 Grounded props, no slide traps or dead ends | the hoist stands on the floor against the back wall | `overlaps`, `slidetraps` (below) |
| 6 Story and saves | no flag added; a death in the deep installation → Retry there with full life; a save there in the epilogue → Continue | `under-bar`, `resume`, `save-migration` |

## Chapter balance (chapters 11–12)

No step was added to either chapter's main route. The new things are optional reads (about 1 minute of reading if all are
read: estimate). Chapter 11 stays at about 0.70 T, chapter 12 at about 0.36 T (`chapter-balance.md`, estimates). A further
beat for chapter 12 needs the boss itself, which this pass was told to keep unchanged; nothing in the place gives a
meaningful step that is not padding (the core is one arena; the way to it is chapter 11's).

## Left (concrete)

- **Chapter 12 is still short** (0.36 T, estimate): the fight is kept as it is.
- **The epilogue's hoist** is a line, not a ride: the crew "rides it down"; Twinsen walks the rooms (the stones are up).
  A ride would need a landing in the core.
- **Resemblance**: unscored (our places).
- **GPU look** (the laptop): the hoist in the deep installation's back wall, the crew in the epilogue.
- The bore's drive corner, the generator, the toolbox, the tug and the lockers stay silent: they read as plant, not as
  things to use; the console, the log and the hoist carry the room's story.

## Evidence (Automated runtime only; a snapshot of `lba3/` served locally, one suite at a time)

_(filled in from the runs)_
