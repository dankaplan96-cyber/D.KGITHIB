# Release audit of artifact v96 (= desktop-build-689), 17.11.2026

Auditor: lba-release-auditor (cloud), independent of the workers who built v96. Nothing in the game's code or assets was
changed by this audit; probes were added under `tests/audit/` (listed at the end). **Automated runtime only**: headless
Chromium on SwiftShader, driven by the input bot; nobody played, nobody listened, no frame rate is claimed anywhere.

## Verdict

**Ready with known issues — for the user's own playtest of build 689 only. Not ready to call finished or to release.**
(The audit's scale: READY FOR USER PLAYTEST, with verification incomplete in the places listed under "What could not be
tested"; not "release criteria met".)

- **No blocker found.** The whole story ran **by input from a new game to The End and Keep Exploring** on the frozen
  candidate, through 14 real Save & quits and 13 Continues: no crash, no page error, no soft-lock, no lost save, no
  text overflow. Saves made by playing v75 continue in v96 (5/5). The five side quests, the yard tutorial, the
  inventory/journal, the spaceport terminal, Hebrew and the three text sizes pass their own tests.
- But **three segments stopped first**, each on a **test-harness** fault, not the game's (A-3): they were diagnosed,
  corrected in labelled copies, and the chain went on from the same saves. Four fights were finished by an ISO assist
  (the bot never heals and arrives weak). So the progression proof is "by input, with three harness corrections and
  four assisted fights", not an unaided run.
- **Two majors to fix before the user's play is worth judging, each with a one-line fix proposed:**
  **A-1** a hard landing that empties his life spends a clover and never gives the life back (he walks on at 0; the next
  knock eats the next clover; Game Over says he had none); **A-2** the desktop package has no `assets/voice2/`, so the
  installed build 689 — the one the user is about to play — speaks the Classic voices while Settings says Expressive.
- Carried from v75 and still open: F-3 resemblance below 85 everywhere, F-7 the note on LBA1/LBA2-derived data (and the
  disclaimer's "original" wording) before any public release.
- What no automated run here can give: the GPU look and frame rate, anything audible, the installed app running, a
  person's first play and time (the 15-hour target).

**Counts.** Findings: **0 blockers, 5 majors** (A-1, A-2, A-3, F-3 carried, F-7 carried), **9 minors** (A-4 Hebrew,
A-6 camera inside things, A-7 worldfit worse, A-8 two camera routes, F-4 assisted fights, A-9 a giver by a door, A-12
packaging nits, A-13 the known-failing list stale, A-14 file headroom), **5 cosmetic**. v75's 14 findings: **5 fixed**
(F-1, F-6, F-9, F-10, F-14), **1 mostly fixed** (F-12: longsession, jetpack, spaceport pass; weather still fails),
**3 improved** (F-2, F-5, F-13 written but stale), **4 open** (F-3, F-4, F-7, F-8), **1 worse** (F-11). Tests: the chain **14/14 segments to the end** (3
with harness corrections); **34 suites run: 26 pass, 8 fail** — every failure on the known list or explained (section 7);
`dialogue-check` (Static) pass; the audit's probes: text sizes 12/12, old saves 5/5, 36 sweep spots on the ground, the
voices without `voice2` (A-2), the clover rule (A-1).

## The candidate and the environment

| | |
|---|---|
| Candidate | artifact **v96** = commit `39d1a538` "Build stamp for artifact v96 (Hebrew packed + CITADEL-ORIG-2) [build]"; `src/build-stamp.js` `BUILT = '2026-11-16T21:40:47Z'`. The worktree's tip `fb4443e7` adds only two documents (WORKPLAN, CLOUD_ORDERS): the game is byte-identical |
| The published artifact | slug `6f31d0d2-…`, version `1794865304-e761`: **486 files** (limit 512; 26 to spare), 118.4 MB. Every file but `index.html` compared by SHA-256 with the commit: **0 differences**; 449 are `tools/game-files.mjs`'s list, 36 are `assets/voice2/` (the Expressive voices), 1 is the page |
| The desktop build | GitHub pre-release `desktop-build-689`, target commit `39d1a538`, created 2026-11-16T21:40:47Z; Windows zip (197 MB), Setup .exe, macOS .dmg (universal), Linux AppImage; version 0.49.0. The Windows zip's `resources/app.asar` read here: 451 game files, all 449 of the game list **identical to the commit** (CRLF line ends aside), `index.html` with `window.LBA_BUILD = '689'`; **no `assets/voice2/`** (A-2) |
| Served from | snapshot `/dev/shm/t986` (lba3 without tools/music/soundfonts, node_modules, captures; `src/game/text/he/*.js` except `i18n.js` removed, as the artifact has them packed into `he-text.js`), `python3 -m http.server 8986` |
| Browser | Playwright (`/opt/node-tools`), Chrome for Testing headless, `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`; `BOOT_TIMEOUT=900000`, `TMPDIR=/dev/shm` |
| Machine | cloud container, 4 vCPU, 15 GB, no GPU, no audio out; **one browser at a time** for the whole audit (load 1–2 at first; from about 07:00 UTC another agent's browser on the same machine, load 4–7) |
| Settings | the tests' own (960×540 unless named, Follow camera, Medium, Classic keys, English); the game steps on fixed time |

Labels: everything below is **Automated runtime only** unless it says "Source" (read in the code) or "Static" (a
script over files). Pictures were looked at by the auditor: SwiftShader frames, not a GPU look.

## 1. A new game to the end, by input (tests/playthrough 01–14)

`tests/lib/seg.mjs` with the fourteen segments in order, from a new game (`?nocine`), each ending in the game's own
Save & quit and the next starting from the title's Continue on that save (`ASSIST=1`, `STATS`, `SHOTS`, `TRACE`;
runner `tests/audit/v96-tools/chain-run.sh`). 04:25–05:47 UTC. The yard's errand (OPENING-TUT-2) is played in 01 by
`P.openingYard()`.

**Result: the end was reached by input** (The End, Keep Exploring: `chain/shots/14/22`, `14/23`), through 14 Save &
quits and 13 Continues. Three segments needed a harness correction first; each was diagnosed as a harness fault
before it was corrected, the correction is a separate labelled file, and the segment's other steps are its own:

| Seg | Chapter | Result | Free play (s) | Dialogue / scenes (s) | Life lost | ISO assists | Notes |
|---|---|---|---|---|---|---|---|
| 01 | 1 The Well (surface, the yard) | PASS | 277 | 24 / 21 | 0 | 0 | the yard's errand by input; 12 "stuck: replan" round the bay rocks |
| 02 | 1 (the cave) | PASS | 82 | 4 / 6 | 0 | 0 | |
| 03 | 2 The Joint Project (the ferry) | PASS | 81 | 5 / 20 | 0 | 0 | |
| 04 | 2 (the valves, the depot) | PASS | 232 | 2 / 3 | 7 | 0 | the depot fought by input; ends on the cliff plateau with 3 life |
| 05 | 2 (pump room, Zoé, Vesk, the ship) | **FAIL ×3, then PASS with `tests/audit/05-project-b-tol.mjs`** | 404 | 31 / 15 | 2 | 0 | see A-3 (two harness faults) and A-1 (the clover rule they exposed) |
| 06 | 3 Zeelich | PASS | 435 | 25 / 29 | 14 | **1** (the depot: 3 enemies at 1 life) | the depot corner (F-1) not met |
| 07 | 4 The Dig | PASS | 220 | 23 / 31 | 2 | 0 | |
| 08 | 5 Steam and Sand | PASS | 281 | 15 / 11 | 7 | **1** (the condenser hall: the trooper) | F-4 again |
| 09 | 6 The Pass | PASS | 249 | 14 / 48 | 1 | 0 | |
| 10 | 7 The Observatory | PASS | 196 | 18 / 19 | 0 | 0 | |
| 11 | 8 Evacuation | **FAIL ×2, then PASS with `tests/audit/11-evacuation-door.mjs`** | 504 | 20 / 29 | 5 | **1** (the fortress: 4 enemies, entered at 2 life) | A-3 (a door beside Hedda and Tobin) |
| 12 | 9 The Council | PASS | 333 | 33 / 22 | 0 | 0 | |
| 13 | 10 Baldino's Network | PASS | 685 | 28 / 11 | 6 | 0 | |
| 14 | 11 The Shell → 12 The Core → epilogue | PASS | 173 + 427 | 36 / 8 | 9 | **1** (the third pylon, after 300 s and 164 throws) | Vesk's choice: two answers; The End; Keep Exploring |

Totals: free play **4,578 s (76 min)** (v75: 3,724 s), dialogue 276 s, scenes and films 272 s, scene changes 70 s; life
lost 53; no page error in any segment; the text-fit watch (`P.fits`, OVERFLOW) reported **0 overflows** in all 14.
Health is carried between chapters (the bot never buys or seeks hearts): it entered chapter 2's second half with 4
life, the evacuation with 2.

**Per chapter against v75's run** (bot free play, s; a floor, not a person's time): ch1 358 (343), ch2 718 (697), ch3
435 (297), ch4 220 (212), ch5 281 (263), ch6 249 (242), ch7 196 (222), ch8 504 (337), ch9 332 (213), ch10 685 (579),
ch11 173 (256), **ch12 427 (61)**, epilogue 1 (1). Chapter 12 is no longer the outlier v75 found (F-2): campaign wave 7's
last act is in it; 360 s of its 427 are the pylons' bank shots, where the bot needed 164 throws and an assist for the
third — whether that is fair to a person is for a person to say. Chapters 7 and 11 are now the shortest by the bot.
**No person's time exists**; the 15-hour target cannot be judged from this.

**Where the segments stopped, and why (all harness):**
1. **05, "behind the pier: the bypass"** (`chain/seg-05.run1.log`): the bot walks to the upper cock's front with a 0.5 m
   tolerance and expects `ct_seen`, which the game sets once he is east of the alcove line (`pumproom.js` `alcoveX + 0.2`
   = 9703.65; the cock's front is 9704.04). The bot stopped at 9703.60, 5 cm short (`tests/audit/seg05-diag.mjs`,
   reproduced twice). A player who walks to the handwheel crosses the line; the flag only gives his remark, and the right
   cock sets it too. PLAYTEST-15 moved the pier (P37/P39) after this step was written. **Harness.**
2. **05, "Zoé: out"**: after her sneak the step calls `P.through(office exit)` even when her part has ended and the scene
   has put Twinsen outdoors, so the bot walked toward the office's coordinates (x 1304) across Citadel and off the east
   cliff by the beam pad (11 m drop) four times (`chain/trace-05-dmg.txt`). **Harness**; but it exposed A-1.
   After the Game Over, the segment's Retry path replays "Zoé at the gate", which no longer applies after the autosave
   (`seg-05.attempt1.log`: `Cannot read properties of null (reading 'exits')`): also harness.
3. **11, "Zoé: to the landing → Twinsen"**: after "Hedda and Tobin" Zoé stands 0.37 m from the neighbours' front door
   (−29.5, 75.0); the walk to the landing starts through it and she ends inside the neighbours' house, where the hand-over
   never comes (`seg-11.run1.log`, `trace` [446.9]). **Harness** (a player walks out again); the giver spot beside a door
   is a minor layout point (A-9).

Not seen in this run: a Game Over in the main chain (the one Game Over was in the diagnosis of 05), a soft-lock, a
stuck camera. "Stuck: replan" lines (the bot pressing into something for 5 s) per segment: 12, 6, 0, 12, 5, 8, 1, 5, 7,
7, 2, 5, 14, 6 — all recovered; none was a trap (they are round the bay rocks, the cliff path, the pump room's pier,
the stations' stairs).

**Objectives seen in the logs:** every step's objective line is in `seg-NN.log` (the text after `|`). About 150
distinct lines were read (the list: `grep -h '^\[' seg-*.log`): none was empty, none named a thing the step did not then
find, the counters ("Brake the three mills (0/3)", "Open the temple door's seals (0/3)") counted up. Whether a newcomer
finds "the alcove behind the brick pier" or "the culvert's pipe" from the words alone only a first play can say.

## 2. Every feature added since v75

Each by its own suite on the snapshot (one browser at a time; logs `/dev/shm/t986-audit/suite/log-<suite>.txt`,
table `suite/results.tsv`), plus the chain and the audit's probes where named.

| Feature (doc) | How | Result |
|---|---|---|
| The yard tutorial, Zoé's errand (OPENING-TUT, OPENING-TUT-2; P22, P31) | `opening-tutorial` (input; experienced and new-player paths, out of order, three failed jumps, leaving early); chain 01 | **PASS 45/45**; chain 01 played it by input. A person's first play (8–12 min wanted) not measured |
| Inventory and journal (INVENTORY-CALM; P27) | `inventory-calm` (1200×700 … 1920×1080, Large text, More); `hebrew` (RTL); audit probe `textsize-v96` (below) | **PASS 23/23**; no scroll bars, nothing spills; the HUD's life/clover/kash strip stays drawn over the window's top left while it is open (INVENTORY-CALM.md's own note; "the inventory's HUD overlap" is still open in WORKPLAN) |
| U-1 The Last Ferry | `last-ferry` (input where it says INPUT: the winch house, the ball through the port, the telegraph, the sailings, Save & quit while she sails) | **PASS 29/29** |
| U-2 One More Place | `one-more-place` | **PASS 28/28** |
| U-3 Off the Wall | `off-the-wall` | **PASS 24/24** |
| U-4 Twelve Years Late | `twelve-years-late` | **PASS 21/21** |
| U-5 The Quiet Channel | `quiet-channel` | **PASS 20/20** |
| The spaceport terminal (SPACEPORT-2; P26) | `spaceport-2`; chain 05 (the ship to Zeelich), 11, 13 | **PASS 21/21**. The older `spaceport` suite: see section 7 |
| The camera (CAM-STEADY) | `camsteady`, `controls`, `camcover` (section 7); chain pictures | see section 7; in the chain pictures the camera still stands inside a plant, a tree crown, a sail or a lintel at moments (A-6) |
| Hebrew (HE-TEXT; P44) | `hebrew` (the switch by clicks, RTL, the yard, Zoé's box at 1280×720 and 1920×1080, the voice from the English, the objective, pause, inventory/journal, back to English); `dialogue-check` (Static: 4,731 of 4,731 keys, placeholders, no night words, the packed `he-text.js` up to date); a reading of chapters 1, 4, 8, 12 (below) | **PASS 17/17**; dialogue-check **PASS**. What reads wrong: A-4 |
| Text sizes (P45) | audit probe `tests/audit/textsize-v96.mjs`: Normal / Large / Extra large × 1280×720 / 1920×1080 × English / Hebrew; the three longest spoken lines in each language in a dialogue box, the HUD objective, the pause menu, the inventory with More, the journal | **PASS 12/12 combinations**: 23 boxes each, the three longest lines typed out whole (English 292/276/243 characters, Hebrew 245/232/209), nothing wider or taller than its box, every box inside the screen (`probe/textsize2.log`; pictures `team-only-shots2-textsize-*-xl-1920-*.jpg`). Subtitle Size scales the dialogue box only; the journal's text stays small at Extra large (by design: "Subtitle Size"). A first run measured half-typed lines and was discarded (the probe now sets Instant text) |
| The new Citadel (CITADEL-ORIG-2, MAP-ORIG; P42): the turquoise sea, Twinsen's plank roof, the L pier, the ferry's arrival, the east street | chain 01–05 pictures (`captures/audit-v96/ch1-2-*.jpg`), `playtest-15` (P33/P34: the arrival film, Vesk in sight at every sample, the narrator's line as a subtitle), the Citadel sweep (section 4) | **PASS** (P33/P34 checks 7/7). The sea reads turquoise, the L pier stands off the quay with the ferry along its leg (`ch1-2-03-04-harbour-the-ferry-docks.jpg`); one lone stone post stands in the water west of the pier (cosmetic, A-11) |
| The School at S28 (P41) | Source (`grep SCHOOL-S28 src/` : none), status.md P41 | **Not in v96.** Approved by the user through the desktop, "held for U-3's court"; the School stands at the mask as before. Nothing to test |
| The half flasks (P29) | Source: `main.js` 2588 (a found flask +30 % of the bar), `main.js` 2444 and `story/shops.js` 93 (a bought one +50 %, both shop paths) | **holds by Source**; not exercised in play here |
| The louder effects (P24, 16.11) | Source: `audio.js` `SFX_MAKEUP = 1.5` (+3.5 dB) on the effects bus and a DynamicsCompressor limiter after it; `audio`, `action-sound-2` (section 7) | `audio` 6/6, `action-sound-2` 40/40 (each effect's peak under −12 dBFS, at least 8 dB under a voice line, no start click). Whether the +3.5 dB makeup and the limiter sound right is the user's ear. Nobody listened |
| P28 the dog inside Twinsen | `dog-apart` (four sides, every frame) | **PASS 6/6** |
| P32 the bathroom's rug, P36 people in slow motion, P37/P39 the pump room | `playtest-15` | **PASS 20/20** (rugs ≥ 6 mm over the floor; the square's people 1.1–1.4 m/s at 1.5–2.4 steps a second; the gathering at the well; each cock's own prompt and wheel in sight) |

### Hebrew read for sense (chapters 1, 4, 8, 12; Source: the English and Hebrew of every third to sixth key)

About 90 pairs read (`node tests/audit/v96-tools/hepairs.mjs <file> <every> <max>`: opening.js, well.js, ch4.js, ch8.js,
ch3.js). The Hebrew is natural, consistent in its names (טווינסן, זואי, קסיל, פאנפרוק, אי סיטדל) and genders (Sendell
feminine), and keeps every placeholder. What reads wrong:

| Key | English | Hebrew now | The problem | Severity |
|---|---|---|---|---|
| `c4_kid_pump`, `c4_kid_pump2` (ch 4, the wind-pump's clue) | "Two gears clack. One grinds." / "Not a clacky one!" | "שני גלגלי שיניים **מקלקלים**" / "לא אחד **מהמקלקלים**!" | מקלקלים means "spoiling, breaking", not "clacking": the kid's clue now calls the two working gears broken ("not one of the broken ones!"), so a player looking for the broken gear is pointed at the wrong ones (the grinding one is the stuck one). Suggest "מקישים" / "עושים קלאק" and "לא אחד מאלה שמקישים!" | **minor, first to fix** (a puzzle clue; the second line's "the grinding one doesn't turn" still points at the right gear) |
| `c3_toast_coil` (ch 12, the final fight's instruction) | "Hit the glowing coil over Vesk's console with the ball" | "לפגוע **בכדור** בסליל הזוהר…" | reads first as "hit the ball"; suggest "לפגוע עם הכדור בסליל הזוהר שמעל הקונסולה של וסק" | minor |
| `pr_barrel_hit_ar` (ch 1) | "(Still got it. Somebody tell Tim.)" | "(עוד יש לי את זה…)" | a calque: in Hebrew "I still have it (the object)"; suggest "(עוד לא שכחתי. שמישהו יספר לטים.)" | minor |
| `c4_ilka_down` (ch 4) | "My knees did those ramps for two years." | "הברכיים שלי עשו את הרמפות האלה שנתיים." | literal; suggest "הברכיים שלי טיפסו ברמפות האלה שנתיים." | cosmetic |
| `pr_j_deep` (ch 1, journal) | "The well is too deep to jump." | "הבאר עמוקה מדי לקפוץ." | grammar: "עמוקה מדי בשביל לקפוץ" / "עמוקה מכדי לקפוץ" | cosmetic |
| `t2_zoe_close` (ch 1) | "Close enough. Go on, the well." | "כמעט. קדימה, הבאר." | "כמעט" = "almost": she seems to say he failed, where the English lets it count; suggest "מספיק טוב. קדימה, לבאר." | minor |

HE-TEXT.md's own open points stand (Ker'aooc's gender: the text "she", the voice list a man; קאשים, אי סיטדל). A native
reading in play remains the open review: this audit read text, not scenes.

## 3. Saves

| What | How | Result |
|---|---|---|
| Save & quit → Continue | the chain: 13 hand-overs (01→02 … 13→14) and the last segment's own save, each a real Esc → Save & quit, a new browser, the title's Continue; plus the diagnostic reruns of 05 and 11 from the same saves | **13/13 + 7 reruns**: every Continue landed in play where the save was (the cave, the house, the cliff plateau, Zeelich's pad, Desert Island's pier, the Hamalayi, the observatory, Citadel, Baldino's workshop, the bore's shaft), with the objective of that moment |
| Saves made by playing v75 (RELEASE-AUDIT-v75's own chain saves), continued in v96 | probe `tests/audit/oldsaves-v96.mjs` (the storage re-keyed to this server, as a browser holds it when the page updates): chapter 2 start (save-02), chapter 3 Zeelich (05), chapter 6 the Hamalayi (08), chapter 9 Zeelich (11), chapter 11 the shaft (13) | **5/5 PASS**: Continue offered, play, an objective, on the ground, walks (`probe/oldsaves.log`). The chapters 2 and 3 saves keep their v75 objective line ("Find Baldino's workshop"); the threads added since treat them as past, as save-migration says |
| `save-migration` (synthetic v1/v4/v5 saves, a missing room, a corrupt save, the campaign fixtures from before waves 3–7: `tests/fixtures/campaign`) | suite | **PASS 27/27** (v75: 11/11; the new checks are the waves' old saves) |
| Slots (Save Game, Load Game, Continue = newest, Delete, New Game keeps the slots, a full storage) | `saveslots` | **PASS 25/25** |
| A save in the old depot corner (F-1) | `depot-corner` check 4 (an old save at the trap spot: Continue puts him clear within 3 m) | **PASS** |
| Retry after a Game Over | the 05 diagnosis (`chain/seg-05.attempt1.log`): "Twinsen is down … Retry returns to the last autosave with full health"; Retry loaded the autosave made at the end of Zoé's part, in play | holds; but see A-1 for how he got there |

## 4. Visuals and animation (pictures from the play camera)

Pictures: every chain step (`/dev/shm/t986-audit/chain/shots/NN/`, 300+ frames, contact sheets `sheets/ch*.jpg`, all looked
at) and a fresh-eyes sweep, five or six seeded spots per region at Follow / Medium (`tests/audit/sweep-v96.mjs`, SEED 96;
`probe/sweep/`). A selection is committed in `lba3/captures/audit-v96/`: **`ch1-2-*.jpg` are chapters 1–2 (may be shown to
the user); `team-only-*.jpg` are later chapters (team only).** Every sweep spot had him standing on the ground
(|y − ground| < 0.3 m: 36/36).

What was seen:
- **Nothing floating, sunk or walking in place was seen on the main route's people.** The square's residents stroll at
  1.1–1.4 m/s with 1.5–2.4 steps a second (`playtest-15` P36); no T-pose, no frozen loop in any frame. Animation was
  judged only from stills and the suites' measurements (`npc-feet`, `walkers` were not rerun in this audit), not watched
  in motion.
- **A-6 · The play camera still stands inside things at moments (F-8 family, minor).** Chapter 1, Tim and Lulu by the
  square (≈ (−50, 2.2, 5.5)): a long green leaf crosses the whole frame (`ch1-2-01-18-Tim-and-Lulu.jpg`); chapter 2's
  start on the cliff plateau: a tree crown fills half the frame (`chain/shots/05/01`); Zeelich, the old mill's striped
  sail fills the frame at its cog (`team-only-06-15…`, v75's known one); Desert Island, Ilka's yacht sail
  (`team-only-07-09-Ilka.jpg`, as v75); Kesh's striped awnings fill the lower half of the frame in chapter 5
  (`probe/shots/textsize-*`, `chain/shots/08/02`); the Hamalayi's monastery gate lintel (`09/17`, as v75); chapter 8,
  Zoé by the lighthouse board: a tree on the right third (`11/11`). `camcover` (section 7) measures the crowns.
- **A-11 · Cosmetic, Citadel's harbour:** a single stone post stands in open water just west of the new L pier (the left
  edge of `ch1-2-03-04-harbour-the-ferry-docks.jpg`), apart from any wall; it reads as a leftover of the pier that moved
  (CITADEL-ORIG-2). Not located in the scene here. Owner: world-polish.
- **Cosmetic, Desert Island, the dig rod's hollow** (`team-only-desert-05-desert-npc_dg_rod.jpg`): a flat blue water sheet
  with straight polygon edges cut into the dune, grey plates standing at its rim. If it is the leak's water, it reads as a
  hole in the sand rather than a puddle. Owner: world-art.
- **The Zeelich close-up by a wall** (`team-only-zeelich-01-…`): the camera looks almost straight down at his head beside
  a house (the over-his-head view CAM-STEADY keeps by design; legs hidden). Noted, not a fault by the camera's own rules.
- v75's F-6 (bare standing stones on the Whispering Cliffs) is **fixed**: rough slabs in the cliff material by the third
  valve (`ch1-2-04-06-cliffs-the-valve.jpg`). F-9 (the research post's sign mirrored) is **fixed** from outside the gate
  (`team-only-desert-03-…`: "JOINT PROJECT · RESEARCH POST" reads right); the inside view was not framed.
- Interiors (the house, the bazaar, the asylum, the School, both terminals, the bore's shaft, deep and gallery) read
  cleanly cut away; the room camera's own sight test read him as not seen at two of 11 room spots (Zeelich's terminal
  by the porter; the deep machinery by its exit) just after placement — `room-cutaway` was not rerun here.
- Draw calls and triangles at each sweep spot: section 5.

## 5. Performance (SwiftShader only: counts and budgets, no frame rate, no speed claim)

**Draw calls and triangles on the benchmark routes, against v75's audit** (`perfbudget`, the same routes and
qualities; v75's log `scratchpad/audit/suite/log-v75-perfbudget.txt`). Calls are the mean per frame (p95), triangles
the mean (max):

| Route | Quality | v75 calls | **v96 calls** | v75 triangles | **v96 triangles** |
|---|---|---|---|---|---|
| street (Citadel) | low | 121 (131) | 125 (130) | 388k (496k) | 410k (508k) |
| street | medium | 151 (174) | 154 (182) | 508k (889k) | **563k (873k)** +11 % |
| street | high | 179 (189) | 181 (188) | 801k (935k) | 840k (935k) +5 % |
| interior | low / medium / high | 52 / 55 / 70 | 58 / 61 / 77 | 215k / 252k / 417k | 225k / 262k / 434k |
| combat | low / medium / high | 96 / 151 / 152 | 96 / 151 / 152 | 127k / 233k / 234k | 129k / 235k / 236k |
| transition | low / medium / high | 71 / 103 / 125 | 76 / 112 / 135 | 284k / 364k / 527k | 322k / 399k / 565k |

All within the suite's budgets (street ≤ 260/300/450, interior ≤ 150): **perfbudget PASS 8/8**, no shader compiled
after loading, no per-frame geometry rebuilds. The growth is most likely CITADEL-ORIG-2's walls, paving, fence and pier (its own
doc measured +1 % to +7 % draws, up to +60 k triangles in Citadel views) and, indoors, the house's new cellar and bathroom (not separated here). `drawcalls`
(street, Medium, one frame by source): **213** (146 main + 69 shadow) against v75's 214.

**Per region, at the sweep's spots** (one frame from the play camera, Follow, the tests' quality; `probe/sweep-*.log`;
v75 has no per-region numbers to compare with): Citadel 134–346 calls, 0.71–1.35 M triangles (the most: by Bug Street's
door, 346 / 1.35 M); Zeelich 107–257, 0.28–0.53 M; Desert Island 54–230, 0.19–0.57 M; the isles 94–171, 0.13–0.81 M;
the Hamalayi 66–102, 0.26–0.42 M; the underground 81–190, 0.10–0.27 M; interiors 79–235 (the asylum's 235), 0.07–0.30 M.
Citadel is the heaviest region by triangles; whether 1.35 M is a problem on the Vega 8 only the laptop can say.

**Loading** (SwiftShader, this container, another agent's browser running on the machine at the time): page load to the
title **84.7 s**, of which shader programs 70.8 s; the world build 7.0 s, Citadel 7.8 s, the start room 8.2 s; the longest
single step 44.8 s (`log-perfbudget.txt` startup line). v75's audit logged 231 s on a heavily loaded machine; the two are
not comparable as speed. Continue → play was not timed as wall time (the tests step game time).

**Memory over a session** (`longsession`: 30 cycles of a short route — through the house door and out, three throws, a
conversation — by input; growth judged from cycle 5): **PASS 5/5**. Scene objects 8,382 → 8,387; GPU geometries
1,171 → 1,174 (flat from cycle 9; v75 failed here with 1,138 → 1,162, F-12's longsession part: **fixed**); textures 381
flat; programs 86 flat; music voices ≤ 2; JS heap after GC 556.5 → 560.0 MB (+3.5 MB in 28 cycles). The route is short
(119 s of wall time); **a single unbroken session of 30 minutes or more was not run** — the chain's 76 minutes of play
were spread over 14 pages, each a fresh load — so slow growth over a long evening of play is not excluded.

## 6. Packaging

| Item | How | Result |
|---|---|---|
| The artifact's file count | `list_files` on the live artifact (version `1794865304-e761`) | **486 of 512** (26 to spare). 449 game files + 36 `assets/voice2/` + the page. Any new module or asset now eats into 26; HE-TEXT already packed 51 Hebrew modules into one to get under the limit |
| The artifact is the commit | SHA-256 of all 485 files against `39d1a538` | **identical** (0 differences) |
| The desktop build 689 is the commit | `resources/app.asar` of `LBA3-The-Awakening-0.49.0-win.zip` (downloaded from the release, sha256 `89f71d55…`), each file's integrity hash against the commit | **449 of 449 identical** (CRLF on the Windows runner); `game/index.html` sets `window.LBA_BUILD = '689'`; `build-stamp.js` 2026-11-16T21:40:47Z |
| **The desktop build lacks the Expressive voices** | the asar's file list; `desktop/copy-game.mjs` copies `tools/game-files.mjs`'s list, which has `assets/voice` but not `assets/voice2`; `src/engine/voice.js` 479 fetches `assets/voice2/manifest.json` and, without it, `exprBankOf` returns null and `planVoiceLine` falls back to the classic plan; probe `tests/audit/voice2-missing.mjs` (BLOCK=1 answers voice2 with 404 as the package would) | **A-2**: served as the artifact, Zoé's voice has its Expressive bank (`["zoe",1]`); with `assets/voice2` missing, the setting still says Expressive, `exprBankOf` is null and her line is planned as Classic (1.78 s against 1.61 s), and the page logs a failed request for `assets/voice2/manifest.json` (`probe/voice2-served.log`, `voice2-blocked.log`) |
| The title's build number | Source (`main.js` 382, 1222: `v<version> (build N) · Updated <date>`, and the pause menu's "Updated …"); the asar's `LBA_BUILD` | the desktop title shows "(build 689)"; the artifact shows the stamp's date. Not looked at on the installed app (no Windows/macOS here) |
| The fan-project disclaimer | Source (`index.html` 92, `i18n.js` 139; Hebrew `he/i18n.js` 77) | present on the title in both languages: "Non-commercial fan project, not affiliated with Adeline Software or [2.21]. The characters and world belong to their owners. Story, models, sound and music are original." The voice credit (Piper, LibriTTS-R, CC BY 4.0) beside it. **It does not mention the layout data derived from the originals** (F-7) |
| LBA1/LBA2-derived data shipped | Static: the artifact and the asar | **shipped in both**: `assets/lba1/asylum.json` (127 KB) and `bumaze.json` (11 KB): LBA1 room grids reduced to numbers (cell heights, collision shapes, an averaged brick colour index, actor spots, zones); `assets/lba2/islands/*.json` (7 files, 169 KB): LBA2 island height grids and object boxes; and `src/game/desert-layout.js` (DESERT.ILE's heights, base64). No graphics, sounds or text; disclosed in `ASSET_MANIFEST.md` as "numbers only, measured from the user's own copy". `tools/worldscore/ref/*.json` is tool data, not shipped. Unchanged since v75 (last touched by DECLUTTER). **F-7 is still open**: WORKPLAN's "the note on data derived from the originals (audit F-7) before any public release" has not been written, and the disclaimer's "original" claim is wider than true for these files. The user's decision; not a code defect |
| Unsigned builds | `.github/workflows/desktop.yml` (`CSC_IDENTITY_AUTO_DISCOVERY: 'false'`), `package.json` mac `identity: null`; the release text | unsigned on all three; the release text says so. Its macOS line ("right-click the app and choose Open") is out of date for current macOS, which needs System Settings → Privacy & Security → Open Anyway for an unsigned app (minor, A-12) |
| Package metadata | `desktop/package.json` `repository.url` and the zip's `resources/app-update.yml` | both name another repository (`…/geriatrics-course`); no auto-updater is wired in `main.js`, so it does nothing today, but it is the wrong owner/repo should one ever be (cosmetic, A-12) |
| Not tested | — | the installed app was not started (no Windows/macOS/display here; `desktop/test-desktop.mjs` needs xvfb and a built app); the macOS and Linux packages were not opened; SmartScreen/Gatekeeper behaviour not seen |

## 7. The known-failing list, rerun

`KNOWN-FAILING.md` (11.11) and v75's failures, each rerun once on v96 (a rerun only on a run with no verdict).

| Suite | v75 | **v96** | Reading |
|---|---|---|---|
| `camsteady` | 95/110 | **105/110** | 3 of the 5 are CAM-STEADY's own "left" list (the harbour pier's heading 12.1 vs his 8.6/min; Follow street Modern heading 103.4 vs 101.7; the free orbit's one 1,749 m/s² jolt). 2 differ from CAM-STEADY's final run: **LBA view near the cliffs (bay → lighthouse): height reversals 10.8/min > 8**, and **Follow Medium, street, Modern: height jitter 10 > 3** (CAM-STEADY: 3, PASS). CAM-STEADY itself measured these routes as variable run to run; CITADEL-ORIG-2 (the bay's ground, the L pier) merged after it, so a regression on the cliffs route is not excluded. Owner: camera (world-polish). KNOWN-FAILING.md still says 15/110 (stale) |
| `controls` | 89/92 | **89/92** | the same three "camera … smooth — no lurch" (acceleration p95 12.5 / 14.3 / 12.8 > 12): unchanged; the threshold-or-camera decision is still open (F-5) |
| `worldfit` | 2 visual | **3 visual** | **worse**: (1) **new**: Doran's harbour shed floats 0.21 m over the ground at its back (−115.1, 1.49, 53.5); (2) openings: 5 (v75: 2), among them the neighbours' door over a window (−31.1, 3.76, 75.3; v75's), Zeelich house 3's window into its corner (v75's), and **new** Zeelich houses 1 and 4's doors overlapping their lamps by 0.05 m; (3) z-fighting patches ≥ 0.15 m² seen from the play camera: **38** (v75: 20), the largest on the new harbour platform's paving (0.65 m² and 0.27 m² at (−90.3, 2.12, 50.4), both "harbour:merged"). The new ones line up with CITADEL-ORIG-2's harbour work. Owner: world-polish (A-7) |
| `weather` | 22/23 | **22/23** | the same: Zeelich's fog loses its pink-violet at light phase 0.79 (F-12); pre-existing |
| `longsession` | 4/5 | **5/5** | **fixed** (geometries flat; section 5) |
| `perfbudget` | 8/8 | 8/8 | — |
| `saveslots` | 25/25 (with a raised screenshot timeout) | **25/25** as committed | the slot-picture timeout did not recur |
| `jetpack` | 47/48 (lit flames +8 draws) | **48/48** | **fixed** |
| `spaceport` | 26/28 (the gate's walk out; the evacuation queue) | **29/29** | **fixed** (SPACEPORT-2 rebuilt the terminal's way) |
| `combat` | 77/78 | **77/78** | the same intermittent check: "dodge distance consistent at 30 and 60 fps" (d30 0, d60 1.56): the 30 fps dodge did not move him at all this run. On the list as intermittent; a dodge that sometimes does nothing at 30 fps is worth a look by animation-combat before it is filed as noise |
| `prologue` | 25/26 | **FAIL, then crashed** | "the well's mites beaten with the ball" [4, 4, null]: all four beaten, but the test's placements (it sets his position round each mite) had put him out of the well (room null), and the next check crashed on `G.room.nodes`. Rerun once: the same (2 of 2; `log-prologue.run1.txt`, `log-prologue.txt`). The chain's segment 02 fought the same mites by input and stayed in the well, so this is read as a test fault (its placements), a new form of the listed intermittent one; the cause was not isolated. Owner: the test's author (prologue) |
| `overlaps` | pass | **PASS** | Lhar's roof spots not reproduced |
| `sewers`, `sewers-ways` | pass (listed intermittent) | **32/32, 34/34** | — |
| `interior-life` | 141/144 (F-14) | **143/144** | one: Zeelich terminal, chapter 9, Velo at his till "faces 1.48 rad (stop 0)" read 0.8 s into his dwell; KNOWN-FAILING.md found the same kind of reading (Ama) was the test looking before STOP-TURN's 1.2 s turn ends. Likely the test's timing; not confirmed |
| `purposes` | 16/23 (F-14) | **23/23** | **fixed** (`74b893b6`) |
| `townlife` | 63/64 (F-14) | **64/64** | **fixed** |
| `camcover` | — (CAM-STEADY: 2 of 16 spots) | **11/12** | 1 of 16 seeded crown spots: (−158.4, 9.8, −24.5), CAM-STEADY's known one (the drawn crown 0.3 m wider than its sight cylinder) |
| `audio`, `action-sound-2` | pass | **6/6, 40/40** | signal checks only (50 effects: peaks under −12 dBFS, at least 8 dB under a voice line, no click at the start); nothing listened to |

## Findings

Owners are the pack's roles. Nothing was fixed by the audit; the two one-line fixes are proposed as diffs, not applied.

### Blocker
**None found.** No crash, no page error, no save lost, no soft-lock and no progression stop on the main route or in the
five side quests' own tests. (A-1 and A-2 below must still be fixed before anyone outside the project plays.)

### Major

**A-1 · A hard landing that empties his life spends a clover but never refills it** — game rule, chapters everywhere.
- What happens: a landing faster than 13 m/s (a fall of about 8.6 m or more) costs 2 life and starts a knockdown
  (`src/game/actors.js` 386). When those 2 life take him to 0 and he has a clover, `damage()` spends the clover and starts
  its own knockdown whose get-up refills his life (actors.js 866–876); the landing code then calls `act('knockdown', …)`
  again, **replacing the clover's knockdown and its get-up**, so the refill never runs. He gets up at **0 life with one
  clover fewer**, and the next knock of any size spends the next clover the same way; with none left he is down.
- Evidence: probe `tests/audit/clover-fall.js` (try.mjs, from the chain's save after segment 04; ISO placement on the
  cliff top east of the beam pad, (3.4, 11.2, −65.8), Up held east): with 2 life → at the landing **life 0, clovers
  3 → 2; 6 s later still life 0, clovers 2, alive** (expected: full life); with 6 life → 4, as designed
  (`/dev/shm/t986-audit/clover-fall.log`). In the chain's diagnosis (`chain/trace-05-dmg.txt` lines 60–65): four
  landings in 16 s, clovers 3 → 2 → 1 → 0 at life 0, then "Twinsen is down — No clover leaves left" though he started
  the minute with three (`captures/audit-v96/ch1-2-05-zoedeath-19-Zo-out.jpg`).
- Who meets it: anyone who drops off a cliff or ledge with 2 life or less while holding clovers — Citadel's cliffs,
  the Hamalayi, the isles. A player sees a clover "used" and no life back, and a Game Over that says they had none.
- Proposed fix (one line, not applied):
  ```diff
  -      if (v > 13) { this.damage(2, null); this.act('knockdown', 0.45, null, 0, ['getup', 0.8]); }
  +      if (v > 13) { this.damage(2, null); if (this.hp > 0) this.act('knockdown', 0.45, null, 0, ['getup', 0.8]); }
  ```
  (at 0 life `damage()` has already started the clover's knockdown, or death). It is the only call site that knocks
  him down after `damage()` (grep). Recheck with `clover-fall.js` and `deaths`, `crosssystem`.
- Owner: hero / animation-combat.

**A-2 · The desktop build ships without the Expressive voices** — packaging, desktop-build-689 and every build.
- `desktop/copy-game.mjs` copies exactly `tools/game-files.mjs`'s list, which names `assets/voice` but not
  `assets/voice2` (VOICE-2's banks, 36 files). The artifact has them (the publish adds them); the installer does not:
  the asar of build 689 has 0 files under `assets/voice2/`. In the game, Settings still says Voice Style: Expressive (the
  default since 14.11, the user's A/B choice), `assets/voice2/manifest.json` fails to load, and every speaker falls back
  to the Classic plan (`probe/voice2-blocked.log`: Zoé's Expressive bank null, her line timed as Classic). The user is
  about to play the installed build (WORKPLAN 17.11, CLOUD_ORDERS 52): their ear would judge the wrong voices.
- Proposed fix (one line in `tools/game-files.mjs` `gameFiles()`'s list, after `...list('assets/voice', …)`):
  ```diff
  -… 'assets/music/manifest.json', ...list('assets/voice', /\.(ogg|json)$/), 'assets/ui-loading.jpg', …
  +… 'assets/music/manifest.json', ...list('assets/voice', /\.(ogg|json)$/), ...list('assets/voice2', /\.(ogg|json)$/), 'assets/ui-loading.jpg', …
  ```
  The artifact's count stays 486 (those 36 files are already published). Then a new `[build]`.
- Owner: the coordinator (packaging), with the character-voices worker to confirm the list.

**A-3 · The playthrough chain no longer runs 01 → 14 by itself** — test harness (no game fault), but it is the release's
progression gate and CHAIN-V96 on the desktop (CLOUD_ORDERS 52.1) runs the same files.
- 05 "behind the pier": 0.5 m walk tolerance against a trigger line 0.39 m before the target (deterministic: stops 5 cm
  short every run). 05 "Zoé: out": `P.through` to the office's coordinates after the scene has moved Twinsen outdoors
  (walks him off the east cliff). 05's Retry path replays "Zoé at the gate" after an autosave past it, then crashes on
  `G.room.exits`. 11 "Zoé: to the landing": the walk starts through the neighbours' door beside Hedda and Tobin. Details in
  section 1; the corrected copies are `tests/audit/05-project-b-tol.mjs` and `tests/audit/11-evacuation-door.mjs`.
- Owner: player-experience (the harness): fold the three corrections into `tests/playthrough/05`, `11` (and make
  `retryFrom` steps safe after a later autosave), then rerun the chain from 01.

**F-3 (v75, carried) · No revisited original place reaches 85/100 resemblance.** No new scores since v75 except
CITADEL-ORIG-2's harbour (76 → 80); Zeelich 54–68, the lighthouse fixed (84). Owner: curator / world-art.

**F-7 (v75, carried) · The note on data derived from LBA1/LBA2 is still not written**, and the title's disclaimer says
"Story, models, sound and music are original" while the game ships LBA1 room grids, LBA2 island heights/boxes and
DESERT.ILE's heights as numbers (section 6). The user's decision before any public release. Owner: the user, then the
coordinator.

### Minor

**A-4 · Hebrew lines that read wrong** (section 2's table): the chapter 4 wind-pump clue ("מקלקלים" = breaking, not
clacking) first; chapter 12's coil instruction; Zoé's "Close enough" read as "almost"; three smaller wordings. Owner: dialogue-editor / HE-TEXT.

**A-6 · The play camera still stands inside things at moments** (F-8 family; section 4): a leaf by Tim and Lulu in
chapter 1, a tree crown on the cliff plateau, the old mill's sail, Ilka's sail, Kesh's awnings, the monastery lintel,
a tree by the lighthouse board. `camcover` 11/12 (one seeded crown spot, CAM-STEADY's known one). Owner: camera (world-polish), world-art for the crowns' sight sizes.

**A-7 · `worldfit` is worse than v75** (section 7): Doran's harbour shed floats 0.21 m at its back; two Zeelich doors
overlap their lamps; z-fighting patches seen from the play camera 20 → 38, the largest on the new harbour platform.
Owner: world-polish.

**A-8 · Two camera routes fail that passed in CAM-STEADY's final run** (the LBA view by the cliffs, the Follow Medium
Modern street's height jitter); run-to-run noise or a regression from CITADEL-ORIG-2 — not separated here. Owner: camera.

**F-4 (v75, carried) and four ISO assists in the chain** — fights where the bot ran low and was helped: the Zeelich
depot (chapter 3, at 1 life), the condenser hall's trooper (chapter 5, as v75), the evacuation's fortress (chapter 8,
four enemies, entered at 2 life), the third pylon in the core (chapter 12, after 300 s and 164 bank shots). The bot never
heals between chapters, so it arrives weak; whether these are fair to a person is a playtest question. Owner:
animation-combat / chapter-balance.

**A-9 · Hedda and Tobin's talk spot is 0.37 m from the neighbours' front door** (chapter 8, Zoé's run): a walk away from
them goes through the door (section 1, cause 3). The door-clear rule keeps givers off door approaches elsewhere. Owner:
cast / interior-life.

**A-12 · Packaging nits**: the release text's macOS advice ("right-click → Open") is out of date for an unsigned app on
current macOS (System Settings → Privacy & Security → Open Anyway); `desktop/package.json`'s `repository` (and the
package's `app-update.yml`) name another repository. Owner: the coordinator.

**A-13 · `KNOWN-FAILING.md` is stale again** (F-13): it gives camsteady as 15/110 failing and lists neither worldfit's
new failures nor the playthrough harness's. Owner: the coordinator.

**A-14 · Headroom: the artifact holds 486 of 512 files.** Each new module or asset takes one of the last 26. Owner: the
coordinator (pack more, as HE-TEXT did, before the next big wave).

### Cosmetic
- A-11 a lone stone post in the water west of Citadel's new L pier (section 4).
- Desert Island, the dig rod's hollow: a flat water sheet with straight edges cut into the dune (section 4).
- Zoé stands in the tulips beside the neighbours' door while Hedda talks (`team-only-11-run1-13-…`).
- v75's cosmetics: Doran's ear still crowds the first view of Vesk's task (`chain/shots/03/05`); the Hamalayi's glider is
  still plain planks (`08/23`).

## v75's findings, rechecked on v96

| v75 | What it was | Fixed by | **v96** |
|---|---|---|---|
| F-1 | Zeelich depot corner trap | `6aa04dd8` (DEPOT-CORNER, `Game.unwedge`) | **fixed**: `depot-corner` 5/5 (input from 5 sides into the old slots, Save & quit there, an old save at the trap spot); the chain's depot fight did not trap him |
| F-2 | chapter 12 far under the length band | campaign wave 7 | **improved**: bot free play 61 → 427 s; the shortest chapters by the bot are now 7 (196 s) and 11 (173 s; v75 256 s). Still no person's time |
| F-3 | no place at 85/100 resemblance | partly (lighthouse, tent, harbour) | **open** (major, carried) |
| F-4 | chapter 5's condenser hall needed an assist | — | **open**: assisted again (the trooper), plus three other assisted fights (minor, carried) |
| F-5 | camsteady 15 failing, controls 3 | CAM-STEADY | **improved**: camsteady 5 failing (3 known, 2 A-8); controls the same 3 |
| F-6 | bare standing stones on the cliff plateau | `6aa04dd8` (STONES-PLATEAU) | **fixed** (picture) |
| F-7 | LBA1/LBA2-derived data in the repository | — | **open** (the user's decision; the note not written) |
| F-8 | the camera behind crowns and awnings | partly (CAM-CROWN, CAM-STEADY) | **open** (A-6) |
| F-9 | the research post's sign mirrored | `6aa04dd8` (SIGN-BACK) | **fixed** from outside (picture); inside not framed |
| F-10 | four Earth-style night words | `6aa04dd8`; `dialogue-check` now fails on night words in English and Hebrew | **fixed** (dialogue-check PASS) |
| F-11 | worldfit 2 visual | — | **worse** (A-7) |
| F-12 | weather, jetpack, spaceport, longsession failing | — | weather **open**; longsession, jetpack and spaceport **fixed** |
| F-13 | the known-failing list out of date | `61c375d8` (KNOWN-FAILING.md) | written 11.11, **stale again** (A-13) |
| F-14 | the harness's Talk broke purposes, townlife, interior-life | `74b893b6` | **fixed**: purposes 23/23, townlife 64/64, interior-life 143/144 (the one left is another reading, above) |
| cosmetic | Doran's ear; the goal panel's empty box while fading; the glider's blocks; shuttle hulls by the pads | — | the ear and the glider: unchanged; the goal box and the hulls were not framed this time |

## The playtest inbox (status.md P1–P45), as far as an automated check can say

Checked here: **P26** (spaceport-2 21/21), **P27** (inventory-calm 23/23, textsize), **P28** (dog-apart 6/6), **P29**
(Source), **P31** (opening-tutorial 45/45, chain 01), **P32/P33/P34/P36/P37/P39** (playtest-15 20/20), **P40** (the
square's globes blue in the chain's pictures `01/09`–`01/12`), **P42** (pictures; CITADEL-ORIG-2's "left" items stand),
**P43** (no tulips seen on paving in 26 Citadel frames; Zoé stands in a bed by a door, cosmetic), **P44** (hebrew 17/17,
dialogue-check, the read above), **P45** (textsize 12/12), **P9/P17** (the depot: chain 04 by input). Earlier rows (P1–P8,
P10–P16, P18–P23) were not re-examined beyond the chain's pictures. **Not checkable here:** P21/P24 (voices and effects,
by ear: and on the desktop the voices are not the Expressive ones, A-2), P30 (pixelation on the user's screen), P35
(closed), P41 (not in v96), P25's and P42's open questions (the user's decisions).

## What could not be tested, and why

- **A person's play**: no first-time play, no fairness or clarity judgement beyond reading the objective lines; no
  person's time per chapter, so the **15-hour target** (WORKPLAN: ~4.6 h of main path estimated plus side quests) cannot
  be judged; the bot's 76 minutes of free play is a floor.
- **Listening**: the louder effects (+3.5 dB, limiter), the Expressive voices, the music: nothing was heard (no audio
  device).
- **The GPU look and frame rate**: every picture is SwiftShader; colours, the turquoise sea, the fog, the hurt vignette,
  the camera's sight lines and the 1.35 M-triangle Citadel views on the Vega 8 / GTX 1050 are the desktop's (CLOUD_ORDERS
  52.2, V96-GPU).
- **The installed desktop app**: not launched (no Windows/macOS/display here); its content was verified from the asar.
  The macOS and Linux packages were not opened.
- **A gamepad, a phone, the mouse in play**: not used.
- **A 30-minute single-session soak**: not run (section 5).
- **The opening film**: skipped in the chain (`?nocine`); only `playtest-15`'s ferry-arrival checks touched films.
- **Optional content off the bot's route** (the shops, the sewers, the isles' homes, Kesh's Wind-Catcher, the arsenal,
  the wizards): only by their own suites where rerun here (sewers, purposes); the rest not rerun on v96.
- **The rest of the suite** (about 90 suites v75 ran, e.g. `chapter1`–`10`, `door-sweep`, `place-scan`, `room-cutaway`,
  `npc-feet`, `walkers`, `wizards`, `shops`): not rerun — one browser at a time on a shared machine; the chain and the
  feature suites were put first.
- **DIALOGUE-EDIT's three flagged story issues and its resume list**: not judged here.
- **Hebrew beyond the sampled lines**: a native reading in play is still the open review.

## Audit files

Committed under `tests/audit/` (none is part of the regular suite):

| File | What it does |
|---|---|
| `05-project-b-tol.mjs` | segment 05 with the two labelled harness corrections (the pier's walk tolerance; no walk to the office exit once outdoors) |
| `11-evacuation-door.mjs` | segment 11 with the labelled correction (out again if a door took Zoé in, the transition awaited) |
| `seg05-diag.mjs` | why 05 stopped: the alcove line against where he stands |
| `05-damage-log.mjs` | segment 05 with every `hero.damage` and clover change in the trace (found A-1) |
| `shore-loop.js`, `clover-fall.js` | for `tests/lib/try.mjs`: the east cliff's 11 m drop; the clover rule after a hard landing (A-1) |
| `textsize-v96.mjs` | the three subtitle sizes × two resolutions × two languages, the longest lines typed out |
| `voice2-missing.mjs` | the voices with and without `assets/voice2` (A-2) |
| `oldsaves-v96.mjs` | saves made by playing v75, continued in v96 |
| `sweep-v96.mjs` | v75's picture sweep plus each picture's draw calls and triangles, jpg |

Kept outside the repository (`/dev/shm/t986-audit/`, a tmpfs: gone at the next restart): `chain/` (saves `save-01…14.json`,
logs `seg-NN.log` and the failed runs `*.run1.log`, `*.attempt1.log`, traces, stats, `shots/`), `suite/` (every suite log
and `results.tsv`), `probe/` (the probes' logs, the sweep's and the text-size pictures), `sheets/` (contact sheets),
and the desktop zip in `/dev/shm/t986-dl/`. The helper scripts are committed in `tests/audit/v96-tools/`
(`chain-run.sh`, `suite-run.sh`, `artcmp.py`, `asarlist.py`, `asarcmp.py`, `hepairs.mjs`, `chainsum.py`; their paths
point at the `/dev/shm/t986` snapshot).

How to rerun: snapshot as in "The candidate and the environment"; `FROM=1 TO=14 OV_05=tests/audit/05-project-b-tol.mjs
OV_11=tests/audit/11-evacuation-door.mjs tests/audit/v96-tools/chain-run.sh` (the runner: `seg.mjs` per segment with
`LOAD` = the previous segment's `KEEP`).
