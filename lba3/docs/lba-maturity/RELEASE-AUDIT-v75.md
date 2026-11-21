# Release audit of artifact v75 (WORKPLAN-2026-11-09 Wave D, cloud part), 10.11.2026

Auditor: lba-release-auditor (cloud), independent of the workers who built v75. Labels as in `PROJECT_CONTRACT.md`.
Nothing in the game's code was changed by this audit. Audit probes were added under `tests/audit/` (listed at the end).

## Verdict

**Ready for the user's own playtest, within the covered scope below. Not ready to call finished.**

- The whole story ran **by input from a new game to the end card and Keep Exploring**, through 13 real
  Save & quit → Continue hand-overs, on the frozen candidate: every segment passed (one fight finished by an ISO
  assist: chapter 5's condenser hall). Old saves from v70, made by playing v70, load in v75 and the story goes on from
  them by input (3 of 4; the fourth stopped at a real geometry trap, F-1).
- **No progression blocker was found on the main route.** One **near-blocker** was found off it by a few metres: a
  corner of Zeelich's project depot (chapter 3) where Twinsen can be walked in and then cannot walk, back-step or jump
  out; a save made there brings him back wedged (F-1, also in v70).
- The user's own reports P1–P10 that could be checked here behave as their status says, as far as an automated
  check can say (table below). P2, P5, P6 and P10 are looks: SwiftShader pictures only.
- Open majors (none stops a playtest): F-1 the depot trap; F-2 chapter 12 is far under the length band; F-3 no
  revisited place reaches the 85/100 resemblance target on the curator's own provisional scores; F-5 the
  camera-steadiness suite fails (15 checks; 11 also on v70) and is missing from the known-failing list; F-6 Citadel's
  Whispering Cliffs plateau still has bare, untextured "standing stones" and a plain pedestal (the class of thing P6
  complained about); F-7 IP: data reduced from the user's LBA1/LBA2 files is in the repository (disclosed; the user's
  call). Minors include chapter 5's condenser-hall fight (F-4, the bot needed an assist) and three suites broken by the
  test harness, not the game (F-14).
- Test suite: 99 of 111 pass on v75; of the 12 that fail, 2 are on the known-failing list, 7 fail the same on v70 and
  are missing from the list, 3 are test-harness faults (v70's own tests pass on the v75 game).
- Music crackle, voices, the mix, colours on a real GPU, frame rate on the Vega 8 and a person's first-play time are
  **not verified** here and cannot be in this environment (section "Only the user or the laptop can verify").

## The build and the environment

| | |
|---|---|
| Candidate | artifact v75 = `7347c74b` "Build stamp for artifact v75" on `ccr-c1c2c4b9-dep6ed` (merged into this worktree, fast-forward); `src/build-stamp.js` `BUILT = '2026-11-10T04:54:04Z'` (checked) |
| Comparison build | artifact v70 = `606cca4f` "Build stamp for artifact v70" (`BUILT = '2026-11-09T08:45:18Z'`), 49 commits earlier |
| Served from | snapshots in `/dev/shm/audit` (v75, port 9000) and `/dev/shm/audit70` (v70, port 9001), `python3 -m http.server`; snapshot as in `PLAYTHROUGH-REPORT.md` (soundfonts, node_modules and `C*.png` left out) |
| Browser | Playwright 1.63.0, Chrome for Testing 153.0.8010.12 headless, ANGLE on SwiftShader (`tests/lib/boot.mjs`) |
| Machine | cloud container, 4 vCPU Xeon @ 2.1 GHz, 15 GB RAM, Node 22.23.4; no GPU, no audio output |
| Settings | the tests' own: 960×540, Follow camera, Medium, Classic (tank) keys; fixed-step game time |
| Load | two to four of the audit's browsers at once for most of the audit (the chain beside one suite lane, later up to three suite lanes and a v70 lane), and from about 09:00 another agent's tests on the same machine (load average 11–19 on 4 cores; one page killed for lack of memory). The game steps on fixed time in these tests, so results do not depend on load (timeouts aside, noted where they hit); wall times are not measurements |

Evidence label for everything here: **Automated runtime only** (SwiftShader, headless). Pictures were looked at by the
auditor; that is a look at software-rendered frames, not a GPU look and not play by a person. No frame-rate claim is
made anywhere in this file. Nothing was listened to.

## What was covered

### The story (playthrough chain 01–14)
`tests/lib/seg.mjs` with `tests/playthrough/01–14`, from a new game (`?nocine`), each segment ending in the game's own
Save & quit and the next starting from the title's Continue (`ASSIST=1`, `STATS`, `SHOTS`, `TRACE`). 04:57–05:52 UTC.

| Ch | Segment(s) | Result | By input? | Bot free play (s) this run · 9.11 run 3 | First-play estimate (formula, 9.11) |
|---|---|---|---|---|---|
| 1 The Well | 01, 02 | pass | yes | 343 · 362 | 19.5 min |
| 2 The Joint Project | 03–05 | pass | yes | 697 · 655 | 33.5 min |
| 3 Zeelich | 06 | pass | **yes, the depot fight included** (9.11: ISO assist every run) | 297 · 259 | 17.5 min |
| 4 The Dig | 07 | pass | yes | 212 · 212 | 18.5 min |
| 5 Steam and Sand | 08 | pass | **no: the condenser hall fight ended by ISO assist** after a clover was spent (it entered with 6 of 12 health and went to 0; 9.11: by input) | 263 · 263 | 16.2 min |
| 6 The Pass | 09 | pass | yes | 242 · 236 | 14.0 min |
| 7 The Observatory | 10 | pass | yes | 222 · 222 | 13.3 min |
| 8 Evacuation | 11 | pass | yes (the fortress by input; 9.11: assist in runs 2–3) | 337 · 350 | 18.5 min |
| 9 The Council | 12 | pass | yes | 213 · 212 | 15.6 min |
| 10 Baldino's Network | 13 | pass | yes (the bore and the ridge by input; 9.11: assist) | 579 · 542 | 29.5 min |
| 11 The Shell | 14 (to Sendell) | pass | yes | 256 · 249 | 13.8 min |
| 12 The Core | 14 (the core) | pass | yes; Vesk's choice shows exactly two answers (PT-1) | 61 · 66 | 7.3 min |
| Epilogue | 14 (end) | pass | yes: dinner, The End, Keep Exploring | 0.6 · 1 | 0.9 min |

Totals of this run: free play 3,724 s (62 min), dialogue 187 s, scenes and films 193 s, scene changes 55 s; no
Game Over; no page error; the text-fit watch reported no overflow. Pictures after every step:
`scratchpad/audit/chain/shots/NN/`, contact sheets `scratchpad/audit/sheets/chNN*.png` (all looked at).

### Measured versus estimated duration
- **Measured** (Automated runtime only): the bot's free play above. The bot knows every answer and runs; it is a floor.
- **Estimated**: the first-play minutes are `chapter-balance.md`'s formula (1.8 × free play + per-puzzle and
  per-fight allowances + reading); this audit did not recompute or recalibrate them. **No person's time exists for
  any chapter.** The planned campaign (~10–15 h) against a formula total of about 3.7 h is unresolved; only a person's
  first play can calibrate it.

### Old saves
| What | How | Result |
|---|---|---|
| `tests/save-migration.mjs` | suite | **pass (11/11)**: v1 saves upgraded and backed up, a missing room lands outdoors, a corrupt save set aside |
| v70 saves made by playing v70 | v70's own `seg.mjs` + segments 01–05 on the v70 build (all passed), each kept; a chapter-9 save inside Baldino's workshop made with `tests/chapter9.mjs`'s jump (supplement: `tests/audit/v70-council-save.js`) | kept in `scratchpad/audit/old/` |
| v75 Continue from them | the storage re-keyed from the v70 server's address to the v75 server's (what a player's browser holds when the same page updates), then v75's next segment by input | **mid-chapter 1 (cave) → chapter 1's end: pass**; **mid-chapter 2 (after the town's part) → the three valves: pass**; **chapter 3 start → stopped**: the bot's depot fight ended in the corner of F-1 and it could not walk out (a game fault, reproduced on a v75-made save and on v70: see F-1); **chapter 9 in the workshop → the whole council chapter: pass** |

### Regions: a fresh-eyes sweep (5 seeded spots each, Follow/Medium)
`tests/audit/sweep.mjs` (SEED 75; the underground and the rooms again with SEED 76 after the first pass placed three
pictures at the wrong room's coordinates, a fault of the probe): Citadel (chapter 2), Zeelich (3), Desert Island (4),
the isles (5), the Hamalayi (6), the underground (11), interiors (5). Pictures: `scratchpad/audit/shots/sweep/`,
`shots/sweep2/`; sheets `sheets/sweep-*.png`. Every spot had him standing on the ground (|y − ground| < 0.3 m).
Looked at: no floating props, no wrong-language text (the game forces English: `main.js` 226), no text overflow, no
empty room that looks broken; Zeelich's street busy with residents; the interiors cut away as LBA does. Faults: F-8.

### Chapters, regions, buildings, mechanics and audio by the suites
The whole suite, one test per lane at a time (results below). Buildings: `door-sweep`, `island-doors`,
`zeelich-doors`, `doors-lba2`, `transitions`, `house`; cut-aways: `room-cutaway`, `occluders`, `lba1rooms`;
people: `world-consistency`, `residents`, `cast-rounds`, `interior-life`, `walkers`; audio (signal only):
`audio`, `music`, `music-places`, `action-sound`, `voices`, `voice-phrase`.

## Claims checked

"How": Suite = the repository's own test, run here; Chain = the playthrough chain above; Probe = an audit probe in
`tests/audit/`; Picture = a frame looked at; Source = read in the code.

| # | Claim (where) | How | Result |
|---|---|---|---|
| P1 | No building fades outdoors; the camera rises over them; only the council porch fades (status.md) | Source (`zeelich.js` keeps a fader only for the porches), Chain pictures in Zeelich, Suite `occluders`, `camisles` | **holds** (pictures: houses solid; when he is behind something he is outlined, not the house faded) |
| P2 | The walk's gait and the hands fixed | Suite `npc-feet`, `anim-polish`; pictures | **pass** (`npc-feet` 25/25, `anim-polish` 55/55); the look is SwiftShader only (laptop) |
| P3 | Corla behind the spaceport kiosk; Citadel's structures answer | Suite `citadel-structures` | **pass (7/7)** |
| P4 | The sewer's links as LBA2's | Suite `doors-lba2`, `sewers`, `sewers-ways` | **pass** (25/25, 32/32, 34/34; the last two were on the known-failing list) |
| P5/P10 | The fort climb / asylum stair: level courses, one coping | Suite `camcitadel` (the climb's camera); the route's frames do not show the stair close | **not verified by picture here**; the masonry's look is the laptop's GPU look |
| P6 | The Whispering Cliffs' stepping stones no longer bare cylinders | Source (`world.js` STONES-31: rock columns), Chain pictures `04/04–06`, `05/01` | **the stepping stones: holds. But six untextured box "standing stones" and a plain 8-sided pedestal stand on the same plateau** (F-6) |
| P7 | Zoé's search keeps Discreet | **Probe** `tests/audit/p7-zoe-behaviour.mjs` from the chain's save: F1–F4, 1–4, the Ctrl menu with each arrow, a click on each HUD icon | **holds** (stays Discreet every time) |
| P8 | The camera at the fort's west station gate | Suite `camcitadel` | **pass (61/61)**; but `camsteady` fails (F-5) |
| P9 | The depot watch from chapter 1 to the valve | Suite `depot-watch`; Chain segment 04 (the depot fought by input, no assist) | **pass (11/11)**; chain: holds |
| W-A1 | The opening film's fixes (`opening-film.md`) | Suite `opening` | **pass (31/31)**; the film itself was skipped in the chain (`?nocine`) and not looked at frame by frame here; sound timing is not a listening test |
| W-A2 | The chain 01–14 passes by input (`PLAYTHROUGH-REPORT.md`) | Chain (rerun here) | **holds**; this run needed one assist (chapter 5), where 9.11's run 3 needed three others (chapters 3, 8, 10) |
| W-A2 | PT-1: Vesk's choice has two answers | Chain segment 14 | **holds** |
| W-B3 | UI: Back is one rule, Continue hidden with no save, Game Over says what Retry does (`ui-pass.md` #1, #4, #13) | Suite `uipass`, `menus`, `display`; Source (`i18n.js` gameover_sub) | **pass** (25/25, 39/39, 31/31); #13's text present; the title's Continue is hidden with no save (seen when a v70 save sat under the wrong address) |
| W-B4 | COMBAT-2: chapters 8 and 10 without ISO assist; the Zeelich depot by input sometimes | Chain | **holds in this run** (8, 10, and 3 by input); **chapter 5's hall needed an assist** (F-4) |
| W-C5 | The three rooms across the clouds: an honest "no way" | Source (`text/ihomes.js` `ih_far_*`), Suite `isles-bar` | lines present; `isles-bar` **pass (13/13)** |
| W-C5 | Otringal's banner over the hero | `isles-inventory.md` itself: 4.5 s → 3.0 s hidden, two headings left | **partly** (the doc says so) |
| W-C6 | Music by place: the School and others own pieces | Suite `music-places`, `music` | **pass** (21/21, 26/26: signal and loop points only); nobody listened |
| Z-1 | Zeelich: doors into four homes and the bakehouse, the workshop open chapters 3–8 (`zeelich-inventory.md`) | Suite `zeelich-doors`, `door-sweep`, `room-cutaway` | **pass** (22/22, 5/5, 4/4) |
| Z-2 | Zeelich lived in (residents with rounds) | Sweep pictures, Chain pictures, Suite `zeelich-life` | **holds** (pictures: 6–10 people in view on the street; `zeelich-life` 39/39) |
| Z-3 | Zeelich resembles LBA2 | `resemblance-zeelich.md` (the laptop's provisional scores) | **does not meet 85**: 54–68 per district, five critical landmark/architecture failures (F-3) |
| I-1 | Isles: 52 of 55 rooms reached on foot, people at home (`isles-inventory.md`) | Suite `isles-bar`, `island-doors`, `island-people`, `zislands` | **pass** (`isles-bar` 13/13, `island-doors` 89/89, `island-people` 65/65, `zislands` 13/13); pictures fine but F-8 |
| D-1 | Desert at the bar (`desert-inventory.md`) | Suite `desert-bar`, `desert-life`; Chain 07–08; sweep | **pass** (17/17, 30/30); F-9 |
| H-1 | Hamalayi at the bar (`hamalayi-inventory.md`) | Suite `hamalayi-life`, `overlaps` ONLY=hamalayi; Chain 09–10; sweep | **pass** (18/18; Lhar's overlaps 0); F-8 |
| U-1 | Underground at the bar (`underground-inventory.md`) | Suite `under-bar`, Chain 14, sweep pictures | **pass (15/15)**; pictures fine |
| C-1 | Citadel ch 3–10 after a load (status.md wave 2) | Suite `chapter2…10`, `resume`, `zoe-resume` | **pass** (all) |
| S-1 | Planets reached only by spaceship (STORY_BIBLE) | Suite `world-consistency` (journeys), `story-journeys`, `travel` | **holds**: the three crossings 2→3, 3→4, 8→9 by the ship's film; the one KNOWN region change without a film is on Twinsun (chapter 10's glider) |
| S-2 | Old saves load (every inventory) | v70 saves (above), Suite `save-migration`, `saveslots`, `resume` | **holds**: the four v70 saves (one then hit F-1); `save-migration` 11/11, `saveslots` 25/25, `resume` 2/2 |
| S-3 | Retry after Game Over → last autosave, full health (the user, 8.11) | Source (`main.js` RETRY_KEY), Suite `crosssystem` | **pass (10/10)** (a death set up by the suite); not met in the chain (no Game Over) |
| B-1 | Chapter balance: all chapters broadly comparable (`chapter-balance.md`) | Chain times | **does not hold for chapter 12** (61 s of free play, 7.3 min estimate against a 15–25 band); 6, 7, 11 just under (F-2) |
| A-1 | Music crackle fixed (contract) | `docs/MUSIC.md` MUSIC-CRACKLE | **not verified**: "Not reproduced" on the laptop; only the volume-slider step was fixed. Listening blocker |

## Test results

Every `tests/*.mjs` (111, `longsession` and the `drawcalls` diagnostic included), each run alone in its lane, on the v75
snapshot; every failure run again on v70 (`606cca4f`, its own tests) and, where v70 passed, again on v75 and with
v70's own test files against the v75 game (to tell the game from a change in the test harness). Up to three lanes ran
at once, plus another agent's browsers on the same machine; the kernel killed a page for lack of memory once
(`shops`, rerun: pass). Logs: `scratchpad/audit/suite/log-<tag>-<suite>.txt`, the table `suite/results.tsv`.

**Passed on v75 (99):** `action-sound`, `anim-combat`, `anim-polish`, `arsenal`, `asylum`, `audio`, `audit`, `autofit`,
`autoquality-game`, `autoquality`, `ball-close`, `bg-stuck`, `camcitadel`, `camclear`, `camera-doors`, `camfollow`,
`camisles`, `cast-rounds`, `chapter1`–`chapter10`, `citadel-structures`, `clarity`, `containers`, `crosssystem`,
`deaths`, `depot-watch`, `desert-bar`, `desert-life`, `display`, `door-sweep`, `doorcull`, `doors-lba2`, `drawcalls`,
`dynres`, `epilogue-home`, `equip2`, `equip2b`, `givers`, `hamalayi-life`, `holomap`, `house`, `island-doors`,
`island-people`, `isles-bar`, `items-ceremony`, `jumpreach`, `lamp-fade`, `lazyregions`, `lba1rooms`, `magic-levels`,
`menus`, `merge`, `music-places`, `music`, `npc-feet`, `occluders`, `opening`, `overlaps` (and `REGIONS=1
ONLY=hamalayi`: Lhar clean), `perfbudget`, `residents`, `resume`, `rocks`, `room-cutaway`, `save-migration` (11/11),
`saveslots` (25/25; see below), `sewers`, `sewers-ways` (both on status.md's known-failing list: **now pass**),
`shipfiles`, `shops` (rerun), `slidetraps`, `solidenemy`, `solidnpc`, `stability`, `story-journeys`, `timing`,
`transitions`, `travel`, `uipass`, `under-bar`, `verdicts`, `voice-phrase`, `voices`, `walkers`, `well-town`,
`wizards`, `workshop`, `world-consistency`, `zeelich-doors`, `zeelich-life`, `zislands`, `zoe-resume`.

**Failed on v75:**

| Suite | v75 | v70 | Reading |
|---|---|---|---|
| `combat` | 77/78: dodge distance at 30 vs 60 fps | — | on the known-failing list (expected) |
| `prologue` | 25/26: the well's mites 3 of 4 | — | on the known-failing list (random; expected) |
| `camsteady` | 95/110 | 99/110 | pre-existing, **not on the list**; v75's failing set differs (F-5) |
| `controls` | 89/92: camera lurch (acc p95 12.5–14.3 > 12) | 89/92, the same | pre-existing, not on the list (F-5) |
| `worldfit` | 2 visual | the same 2 | pre-existing, not on the list (F-11) |
| `weather` | 22/23: Zeelich's fog colour at phase 0.79 | the same | pre-existing, not on the list (F-12) |
| `jetpack` | 47/48: lit flames +8 draw calls (budget 6) | the same | pre-existing, not on the list (F-12) |
| `spaceport` | 26/28: the terminal gate's way out onto the deck (lands 1.77 m off, y 0); chapter 8's queue walk | the same | pre-existing, not on the list (F-12) |
| `longsession` | 4/5: geometries 1138 → 1162 over 30 cycles | the same | pre-existing, not on the list (F-12) |
| `purposes` | 16/23 twice: "Tibbo (TALK)" gets Brix's line, then the shop steps | 23/23 | **v70's test files against the v75 game: 23/23**: the harness's new `P.talk` (PLAYTHROUGH-11.9, `3c9fe0b9`, "other suites not rerun") presses E on a neighbour's prompt; a test fault (F-14) |
| `townlife` | 63/64 twice: the harbour gulls do not take off | 64/64 | **v70's test files against v75: 64/64**: the harness change; a test fault (F-14) |
| `interior-life` | 141/144 twice: three spaceport people "talked" but said nothing | 144/144 | **v70's test files against v75: 144/144**: the harness change; a test fault (F-14) |
| `saveslots` | aborted three times at a screenshot (Playwright's 30 s default, the machine loaded) after 10 checks | — | the same suite with a 300 s screenshot timeout (`/dev/shm/audit/tests/audit/saveslots-timeout.mjs`, not committed): **25/25** |

## Findings by severity

Owners are the pack's roles; nothing here was fixed by the audit (the brief: findings only). Paths under
`scratchpad/audit/` are the session scratchpad `/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/audit/`.

### Blocker (cannot go on)
None found on the main route (the chain from a new game to the end, three of four old saves).

### Major

**F-1 · Zeelich, chapter 3: a corner of the project depot traps Twinsen** — near-blocker; also in v70 (pre-existing).
- Where: inside the depot fence, by the locker, at (2411.6, 6, 24.7): between the north fence (collider box 20 × 0.2 m
  at (2414.0, 25.2)) and a crate (box 0.8 × 0.8 m at (2412.4, 24.1)). The locker the chapter sends him to is 3.6 m east,
  so walking along the inside of the north fence toward it is a natural way in.
- Steps (by input, Classic keys): Continue at the start of chapter 3 (`scratchpad/audit/chain/save-05.json`); stand at
  (2408.6, 24.7) facing east; hold Up 2.5 s. He stops at (2411.60, 24.70). Then: turn to any of 8 headings and hold Up
  0.8 s → 0.00 m moved every time; Down 1 s → 0; Athletic jump (F2, Space with Up) at 8 headings → 0. A dodge (X)
  sometimes moves him about 1 m, and a hit from the depot's watch (drones, guard, dog: they attack him there) sometimes
  knocks him out; otherwise he stays until killed. **Save & quit there → Continue puts him back in the corner, still
  unable to walk** (`trap-save.json`). Walked in from 2.5 m south the same; from the south-west he ends elsewhere and is
  free.
- Found by the chain: Continue from v70's own chapter-3 save, the bot's depot fight ended in that corner and it could
  not move for the rest of the step (`old/v75-from-v70-05-seg-06.log`).
- Evidence: probes `tests/audit/depot-corner.mjs`, `depot-trap.mjs`, `depot-trap-in.mjs`, `depot-trap-load.mjs`; logs
  `depot-corner.log`, `depot-trap*.log` (v75), `depot-trap-in-v70.log`, `depot-trap-load-v70.log` (v70, the same);
  picture `shots/depot-trap-load/02-walk-out.png`. Owner: world-polish / buildings (the depot's props and their
  colliders; a gap the hero fits into but cannot leave suggests the physics' corner resolution too).

**F-2 · Chapter 12 (The Core) is far under the length band; 6, 7 and 11 just under** — design. The bot's free play is
61 s (this run) and the formula's first-play estimate 7.3 min against the provisional 15–25 min band; chapters 6, 7
and 11 estimate 14.0, 13.3 and 13.8 min. The contract asks for all chapters broadly comparable and none extremely
short; the user's decision of 8.11 covers only the long chapters. Owner: chapter-balance / the user.

**F-3 · No revisited original place reaches the 85/100 resemblance target** — art/identity. On the curator's own
provisional scores: Citadel's districts 66–83 (the lighthouse and Bersimon's tent are critical landmark failures);
Zeelich's islands 54–68 with five critical failures (Otringal's palace, Knartas's huts and zeppelin port, Mosquibee's
nest, Celebration's figure, the Platform's lift tower); the terminal island 60–69 on the compatibility rubric; Desert
Island, the Hamalayi, the asylum and the temple are **unscored** (unverified). The user's own Chapter-3 report
("Zeelich … poorly matched to LBA2") therefore still stands on the evidence available. The scores are editorial, not
self-awarded 85s; the references are on the laptop and could not be inspected here. Owner: the laptop's curator and
world-art.

**F-5 · The camera-steadiness suite fails, and is missing from the known-failing list** — camera (presentation).
`tests/camsteady.mjs` (CAM-2, the user's "the camera moves a lot"): **v75 15 failed / 95 passed; v70 11 failed / 99
passed**. In v75, new against v70: the Follow arm jumps 2.2–4.4 m in a frame where it is kept out of a wall (street and
square, through a door, the harbour pier, Modern controls), more heading reversals than his own (15.4/min through a
door, 15.5/min on the pier), jitter on the pier; fixed against v70: the Medium street jitter, the door's jitter, the
Modern street's heading. Both builds: the view out of the house door is not behind him (turned 45°/30° standing). The
related `tests/controls.mjs` "camera … smooth — no lurch" fails 3 checks on both builds (acceleration p95 12.5–14.3 >
12). Likely in part the deliberate CAM-ROOFEDGE change ("the arm comes in sooner where a house hides his legs",
PLAYTHROUGH-REPORT); either the thresholds or the camera need a decision, and the known-failing list must say which.
Logs `suite/log-v75-camsteady.txt`, `suite/log-v70-camsteady.txt`. Owner: world-polish (camera); a GPU look by the laptop.

**F-6 · The Whispering Cliffs plateau (Citadel, chapters 1–2) still has bare primitives** — presentation, the class of
the user's P6. Six "standing stones" are plain untextured boxes (0.9 × 3–4 × 0.6 m, colour #8d8578, no map;
`src/game/world.js` ≈ 1388, "some standing stones up there") and the shard's pedestal is a plain 8-sided cylinder
(#cfc6b4, ≈ 1384), beside STONES-31's new rock columns. They stand round the third bypass valve on the main route.
Pictures: chain `shots/04/05-cliffs-up-the-stones.png`, `04/06-cliffs-the-valve.png`, `05/01-continue.png`,
`shots/slabs.png`; probe `probes/slabs.js`. Owner: world-art (laptop) / world-polish.

**F-7 · IP: data reduced from the user's LBA1/LBA2 files is in the repository** — the user's decision (see "Content
rules and IP"). Owner: the user, then the coordinator.

### Minor

**F-4 · Chapter 5's condenser-hall fight took the bot to 0 health** — balance, for a person to judge. The bot entered
with 6 of 12 health (it carries damage between chapters and does not heal), fought two drones, a guard and FunFrock's
old trooper, was saved by a clover and finished by an ISO assist (`chain/trace-08.txt` 63–87 s). `chapter-balance.csv`
rates chapter 5 "low (4 health)"; 9.11's run 3 needed no assist there. Owner: animation-combat (with COMBAT-2's notes).

**F-8 · The play camera leaves him behind near crowns and awnings while its own sight test says he is in view** —
camera. Standing still 1.5 s at Follow/Medium (placed; the sweep): Citadel by the hopscotch (−48.34, 2.23, 38.69, facing
2.79 rad, chapter 2): a tree crown covers him, outline showing; the Hamalayi at Lhar (4273.66, 12.1, 23.2, facing
0.96, chapter 6): a pine fills the frame; Zeelich by Oku's stall (2372.48, 6, 9.77, facing 4.99): the awning, 8 frames
"collider"; Kesh by the trader's stall (3348.69, 5, −4.47). In play (chain): the bay rocks (`01/19`, `01/22`), Ilka's
yacht sail (`07/09`), the monastery gate's lintel (`09/16`), the old mill's sails (`06/07`, known), and after Continue
on the cliff plateau (save-04: inside a tree crown, `shots/slabs.png`). CAM-CROWN says crowns count; these do not.
Pictures `shots/sweep/citadel-01…`, `hamalayi-05…`, `zeelich-05…`, `desert-01…`. Owner: world-polish (camera).

**F-9 · The research post's gate sign reads mirrored from behind** — "JOINT PROJECT · RESEARCH POST" drawn on both
faces of one plane: from the post's inside the letters are reversed (chain `shots/13/15-the-drones.png`, Desert
Island, chapter 10). Owner: world-polish.

**F-10 · Earth-style night words in four lines** (table in "Content rules and IP"). Owner: dialogue-editor.

**F-11 · `worldfit` fails two visual checks, on v70 too, and is not in the known-failing list**: a door over a window
on the neighbours' house (Citadel, (−31.1, 3.76, 75.3), by 0.19 m), a window running into the corner of Zeelich's
house 3 ((2387.8, 8.01, −13.1)), and 20 z-fighting patches ≥ 0.15 m² seen from the play camera (126 smaller). Logs
`suite/log-v75-worldfit.txt`, `log-v70-worldfit.txt`. Owner: world-polish.

**F-12 · Other suites failing on both builds and missing from the known list**: `weather` (Zeelich's fog loses its
violet at one light phase: blue under green at phase 0.79, every weather state), `jetpack` (cost: the lit flames add
8 draw calls, budget 6), `spaceport` (the terminal gate's walk out lands 1.77 m from the expected spot on the deck;
chapter 8's queue walk through the gate), `longsession` (30 cycles: GPU geometries 1138 → 1162, a slow growth; scene
objects, heap, voices bounded), `controls` (F-5). Identical results on v70. Owner: as named in each suite.

**F-13 · status.md's known-failing list is out of date.** It names combat, sewers, sewers-ways and overlaps' Lhar
spots; this run's failing set is in "Test results". Owner: the coordinator.

**F-14 · The playthrough harness change broke three other suites** — tests, not the game. `purposes` (16/23),
`townlife` (63/64) and `interior-life` (141/144) fail on v75 twice each and pass on v70; **v70's own test files run
against the v75 game pass all three** (23/23, 64/64, 144/144). The three suites are byte-identical in both builds; the only file they load that differs is `tests/lib/player.js`, changed by
PLAYTHROUGH-11.9 (`3c9fe0b9`: `P.talk` presses E on the first Talk prompt it can get, `P.settle` stops at menus), which
its report said was not rerun on "about 20" suites: at Tibbo's counter the prompt is Brix's (a walker), and two
spaceport travellers "talk" with no line. Whether a person standing at Tibbo's counter also gets Brix's prompt first
was not judged. Owner: player-experience (the harness), then rerun those suites.

### Cosmetic
- Chapter 2's pier: Doran's ear and another elephant still crowd the first view of Vesk's task (`chain/shots/03/05`,
  PT-8 not fully gone).
- The goal panel shows an empty dark box for a moment as it fades (words first, then the box, by design: ui-pass #25);
  it is caught in many pictures (`02/02`, `10/02`, `10/07`).
- The Hamalayi's glider is a few plain blocks (`09/01`, `08/20`).
- Shuttle hulls and lamp heads fill a third of the frame near the pads (`sweep/isles-05`, `chain/06/05`).

## Content rules and IP

**Earth-style night words** (grep of every quoted string in `src/` for night, tonight, evening, midnight, dusk, sunset,
sundown, nightfall, dawn, moon, stars; Source only). Player-facing lines that break or lean on the rule:

| Line | Text | Who says it | Severity |
|---|---|---|---|
| `text/ch2.js` `c2_radio_freq` | "…then what **keeps watch at night**." (the dials' riddle: the star) | Baldino on the radio, chapter 3, on the main route | minor (a direct use; the riddle could be "what keeps watch over the sea" or similar) |
| `text/hamlife.js` `hl_monk_mend_2` | "He says **the stars are back** where they belong." | a monk, the Hamalayi, chapter 8+ | minor (implies a night sky) |
| `text/life.js` (Zeelich street) | "The noise at **dawn shift** is not." | a resident | minor |
| `text/storylife.js` `rs_dg_cook_1` | "The crew eats at **sunset**. Well, when the sun dips a bit. It never quite goes." | the dig's cook | cosmetic (it says the suns never set; acceptable as a joke, listed for the user) |

The observatory's painted board ("the long night that never comes") and code-only names (`'night'` sky kind,
"night mode" in comments) are not in the player's text. "Morning" is used widely and is accepted by the bible
(`docs/CINEMATICS.md`: "morning under the two suns").

**FunFrock alive**: none. Every mention (≈ 40 lines) is past tense ("FunFrock's old pipeline", "after FunFrock's
fall"); no character, model or speaker named FunFrock. Holds.

**Planets reached other than by spaceship**: none found. `world-consistency` (journeys, static and runtime) PASS: the
three story crossings between the planets go through `crossByShip`; the one region change without a film is chapter
10's glider, on Twinsun. `travel.js` keeps the ferry and the glider to Twinsun's regions (`PLANETS`). Holds.

**Wrong-language text**: Hebrew strings exist in the text files (`STR.he`), but `main.js` 226 forces the language to
English and no Settings row offers another; no non-English text was seen in any picture. Holds.

**IP: nothing from LBA1/LBA2's files in the repository.** No binary assets that look extracted were found: no
`.HQR`/`.ILE`/`.OBL`/`.VOC`/`.XMI`/`.FLA`/`.SMK` file is tracked; the 20 MIDI files are the project's own renders of
`tools/music/tracks/*.py` (`docs/MUSIC.md`: original); the voices (`assets/voice/*.ogg`) and effects are synthesised;
the images checked (`captures/lba1-*.png`, `docs/docs-reference-compare.png`, the `ref`-named files) are renders of this
game. **But data reduced from the user's own original files is in the repository and loaded by the game**, and the
code names its sources (`ANIM.HQR`, `BODY.HQR`, `SCENE.HQR`, `SPRIRAW.HQR` in comments): `assets/lba1/asylum.json`
(127 KB) and `bumaze.json` are LBA1 room grids (64 × 25 × 63 cells with collision shapes, an averaged brick colour
palette, actor spots, zone boxes); `assets/lba2/islands/*.json` (7 islands) are LBA2 height grids and object boxes;
`src/game/desert-layout.js` carries DESERT.ILE's heights; `tools/worldscore/ref/*.json` (tool data only) Citadel's and
the desert's heights, objects and door zones. `ASSET_MANIFEST.md` discloses all of it as "numbers only". Under the
rule as worded ("nothing from LBA1/LBA2's files") this is a **major item for the user to decide** (keep as measured
numbers, or regenerate the layouts by hand); it is not a code defect and the audit does not judge the law.

## Only the user or the laptop can verify

- **Listening** (nobody here can hear anything): the music crackle on the user's laptop (`docs/MUSIC.md`
  MUSIC-CRACKLE: "Not reproduced"; only the slider step was fixed), the three new pieces of music-by-place, the
  voices' pleasantness and continuity (the suites check the phrase plan and the signal, not the sound), the action
  sounds' meaning and mix, the opening film's sound against its pictures.
- **The GPU look** (CLOUD_ORDERS 34): every picture here is SwiftShader. Colours, the fog, the red hurt vignette, the
  faded objective box, P2's hands, P5/P10's masonry, P6's stones, Otringal's spires, the camera's sight lines through
  crowns and awnings (F-8) on the real renderer.
- **Real hardware**: frame rate and loading time on the Ryzen 5 3500U / Vega 8 (no frame-rate claim is made here;
  `perfbudget`, `drawcalls`, `dynres`, `autoquality*` measure budgets and logic, not speed), the desktop app, a real
  gamepad (the pad paths are stubbed in `controls`, `menus`, `holomap`), a real phone.
- **First play**: a person's time per chapter (every first-play minute is a formula), whether a newcomer finds the
  hidden steps, whether the fights the bot needed help with (chapter 5's hall) and the depot by input are fair.
- **Resemblance**: the 85/100 rubric needs the user's original files (on the laptop): the scores in
  `resemblance-citadel.md` and `resemblance-zeelich.md` are the curator's provisional ones; the reference pictures
  they cite (`C:\Users\dan\lba-study\…`) are not in the repository and could not be inspected here.

## Not covered (untested or blocked)

- **Play by a person**: none of this. The bot knows every answer; first-time finding, fairness and length for a newcomer
  are unknown.
- **The opening film** was skipped in the chain (`?nocine`, as in PLAYTHROUGH-REPORT); only `tests/opening.mjs` (31/31)
  covers it. Its frames were not looked at by the auditor.
- **Optional content off the bot's route**: the shops, the sewers, the isles' homes, Kesh's Wind-Catcher, the
  arsenal, the wizards were covered by their own suites only (flags and input mixed), not played through in a chain.
- **A gamepad, a phone, the mouse in play, the desktop app**: not used (stubbed pads in the suites).
- **Old saves older than v70** other than `save-migration`'s synthetic v1 save: not tried. v70 saves were tried at four
  points only (mid-chapter 1, mid-chapter 2, the start of chapter 3, chapter 9 in the workshop).
- **The camera on a GPU, P2/P5/P6/P10 up close**: not looked at here beyond the route's own frames.
- **Every door, room and region picture**: the sweep sampled 5 spots per region (35 pictures, 3 of them discarded as
  the probe's own wrong-room placements and redone); door coverage is the suites'.
- **Resemblance**: no references available here (the laptop's).
- **Performance**: `perfbudget` (8/8), `dynres`, `autoquality*`, `drawcalls` pass as budget and logic checks on
  SwiftShader; no speed, loading-time or frame-rate claim is made. The target laptop was not available.
- **Listening**: everything audible (see above).

## Audit files

Added under `tests/audit/` (committed with this report; none is part of the regular suite):

| File | What it does |
|---|---|
| `sweep.mjs` | the fresh-eyes picture sweep: `REGION=… LOAD=<save> SEED=n N=5 OUT=dir node tests/audit/sweep.mjs` |
| `p7-zoe-behaviour.mjs` | P7: Zoé keeps Discreet through F1–F4, 1–4, the Ctrl menu and the HUD icons (`LOAD=<save at chapter 2's second half>`, via `tests/lib/seg.mjs`) |
| `depot-stuck.mjs`, `depot-corner.mjs`, `depot-trap.mjs`, `depot-trap-in.mjs`, `depot-trap-load.mjs` | F-1: the Zeelich depot corner, found, walked into by input, the ways out, a save there and the Continue (via `seg.mjs`, `LOAD=<chapter 3 start>`, `KEEP=` for the save) |
| `pocket.mjs` | is a spot where the bot stalled a trap? `PT=x,z` (the Citadel stall at (−46.6, −48.7): not a trap) |
| `v70-council-save.js` | for `tests/lib/try.mjs` on the v70 build: a chapter-9 save inside Baldino's workshop |

Kept in the session scratchpad (`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/audit/`):
`chain/` (the chain's saves `save-01…14.json`, logs, traces, stats, `shots/`), `old/` (the v70 saves and the v75
runs from them), `suite/` (every suite log, `results.tsv`, the lane scripts), `shots/` (sweep, sweep2, depot-trap,
p7 and the others), `sheets/` (contact sheets), `probes/`, `NOTES.txt`.

How to rerun the chain: `PLAYTHROUGH-REPORT.md` "How to rerun"; this audit's runner `scratchpad/audit/chain/run.sh`.
