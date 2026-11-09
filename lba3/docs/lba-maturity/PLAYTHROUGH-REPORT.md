# The whole story played by input: playthrough report (9.11.2026, WORKPLAN-2026-11-09 Wave A item 2)

Worker: lba3-player-experience (cloud), worktree from `ccr-c1c2c4b9-dep6ed` at `8a09c5c2` (artifact v71's tree plus
the work plan). Labels as in `PROJECT_CONTRACT.md`. Spoilers are not hidden here.

**Evidence.** Everything below is **Automated runtime only**: the player-input bot (`tests/playthrough/01–14`,
`tests/lib/seg.mjs`, `tests/lib/player.js`) on SwiftShader in headless Chromium, 960×540, Classic (tank) controls on the
keyboard, the Follow camera at Medium (the keyboard's default), fixed-step game time. The 14 segments were chained
through **real saves**: each segment ends with Esc → pause → Quit to title (the game saves), the browser's storage is
kept, and the next segment starts from the title's Continue. New game (`?nocine`: the opening film skipped; it is the
other Wave A worker's) to the end card and Keep Exploring. No person played any of it; no frame-rate claims; nothing
was listened to. The bot knows every answer and is told where things are (the story's own coordinates): it tests that
each step **can be done by input** and what the player **sees** at each step, not whether a first-time player would
find it. Its fights are weak (no dodging of melee), so its health losses overstate fights against biters.

**Runs.**
- **Run 1** (the base `8a09c5c2`; the bot only gained its picture and text-fit watch): 01–14 chained, 13:50–14:44 UTC,
  **every segment passed**. Segment 14 was played again from run 1's own save 13 after the chapter-12 fix (`14b`,
  14:55–14:58): passed, the choice shows its two answers.
- **Run 2** (commit `3c9fe0b9`: the chapter-12 fix and the first two bot fixes): 01–14 from a new game, 15:00–15:55
  UTC: **every segment passed**.
- **Run 3** (this pass's final state: run 2's plus the bot's Talk-prompt fix): 01–14 from a new game, 15:58–16:50 UTC:
  **every segment passed**. Run 3 is the one in `chapter-balance.csv`. (Runs 2 and 3 shared the machine with the other
  Wave A worker's browser: wall time is not a measure of anything.)
- One isolated probe per question (chapter 4's office exit, chapter 8's first view of Zoé, chapter 6's walk to Yorna),
  each Continuing from the chain's own save at the chapter's start and then played by input (scratch scripts
  `probe-*.mjs` in the scratchpad): labelled **probe**, never counted as the route.

Pictures (kept): the session scratchpad `playthrough/shots/<segment>/NN-<step>.png` (one after every step, from the play
camera, HUD included; runs 2 and 3 in `<segment>r2/`, `<segment>r3/`), contact sheets in `playthrough/sheets/`, logs and traces in
`playthrough/logs/`, the per-step numbers in `playthrough/stats/`. Scratchpad root:
`/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/playthrough/`.

## Per chapter

| Ch | Segments | Played by input? | Free play s, runs 1 · 2 · 3 | Est. first play (run 3) | Faults here (see below) | Key pictures (`shots/`) |
|---|---|---|---|---|---|---|
| 1 The Well | 01, 02 | **yes**, every step | 373 · 390 · 362 | 19.5 min, in band | PT-6 (cosmetic) | `01/04`, `01/09`, `01/19`, `02/02` |
| 2 The Joint Project | 03–05 | **yes**, every step (the depot by fighting; a clover each run) | 662 · 656 · 655 | 33.5 min, HIGH (kept long by the user) | PT-7, PT-8 (cosmetic) | `03/05`, `04/03`, `04/04`, `05/04` |
| 3 Zeelich | 06 | **yes except** the depot fight's end: ISO assist (2 enemies) in every run | 323 · 333 · 259 | 17.5 min, in band | PT-5 (confusing), PT-7, PT-9 | `06/03`, `06/07`, `06/11`, `06/12` |
| 4 The Dig | 07 | **yes**, every step (the storm's gate guard took a clover each run) | 216 · 204 · 212 | 18.5 min, in band | PT-2, PT-6 (cosmetic) | `07/02`, `07/10`, `07/13`; probe `probe-notebook/12–17` |
| 5 Steam and Sand | 08 | **yes**, every step | 256 · 263 · 263 | 16.2 min, in band | PT-3 (cosmetic) | `08/09`, `08/13`, `08/20` |
| 6 The Pass | 09 | **yes**, every step | 466 · 457 · **236** (runs 1–2: B-1) | 14.0 min, just under | PT-6, PT-7 (cosmetic); B-1 (bot, fixed) | `09/02`, `09/05`, `09/12`, `09/15` |
| 7 The Observatory | 10 | **yes**, every step | 222 · 222 · 222 | 13.3 min, low | PT-7 (cosmetic) | `10/05`, `10/07`, `10/09` |
| 8 Evacuation | 11 | **yes** in run 1; runs 2–3: the fortress fight's end by ISO assist | 401 · 349 · 350 | 18.5 min, in band | PT-4 (cosmetic, a little confusing), PT-7; B-4 (bot) | `11/05`, `11/08`, `11/10`; probe `probe-zoe/09–13` |
| 9 The Council | 12 | **yes**, every step | 210 · 212 · 212 | 15.6 min, in band | none found | `12/08`, `12/11`, `12/13` |
| 10 Baldino's Network | 13 | **yes except** the bore's fight (ISO assist every run) and, in run 2, the ridge's crawler and mites | 556 · 563 · 542 | 29.5 min, HIGH (kept long by the user) | PT-7, PT-9 | `13/04`, `13/12`, `13/15`, `13/17`, `13/19` |
| 11 The Shell | 14 (to Sendell) | **yes**, every step (the stepping stones by input in all four plays) | 245 · 277 · 249 | 13.8 min, just under | none found | `14/06`, `14/09`, `14/12` |
| 12 The Core | 14 (the core) | **yes**, every step | 70 · 70 · 66 | 7.3 min, LOW | PT-1 (fixed) | `14/14`, `14/15`, `14/16` → `14b/16` |
| Epilogue | 14 (end) | **yes**: dinner, the end card, Keep Exploring | 1 | 0.9 min (aftermath) | none | `14/17`, `14/18` |

No **blocker** was found: nothing stopped the route in any of the three runs, every objective changed when its step was
done, every chapter's last step led into the next, and 13 save → quit → Continue hand-overs per run all resumed in the
right place with the right objective. The text-fit watch (each dialogue line as it opened, the objective and the
prompt, measured against their boxes and the screen) found **no overflow** on the route (dialogue lines are measured
as they start typing; the box grows with its text).

Reading the table: "by input" means every main-route step was done by keys and time passing, with the exceptions named;
an **ISO assist** (the bot's fight finished by the harness below 3 health, logged) is never input evidence. Times are
game seconds of free play on the bot's route (bot stalls subtracted where named) and the chapter-balance first-play
**estimate** (formula unchanged; not a measurement). Severity: **blocker** (cannot go on), **confusing** (a player could
lose the thread or the way), **cosmetic** (looks wrong, nothing stops).

## Faults found

Each: where, what the player is told and sees, what happens, what is missing, severity, status, evidence. Picture
paths are under the scratchpad's `playthrough/shots/` (run 1 unless named).

### Fixed in this pass

**PT-1 · Chapter 12, the core: Vesk's choice offered a Cancel that did nothing** — confusing (cosmetic in effect).
After the third coil hit the menu "The console sparks over Vesk" opens with *Pull him clear*, *Leave him for the
council's guards* and **Cancel**. The choice must be made (the story's comment says the menu can't be closed), so the
shared menu's Cancel shut it and opened it again at once: a button that blinks and does nothing, at the story's one
moral decision. Cause: `hud.openMenu` always adds Cancel; `chapter3.js veskChoice` reopens on close. **Fix**
(`src/game/story/chapter3.js`): the forced choice removes the Cancel button after opening (Esc or a pad's Back still
just reopens it, as before). `tests/playthrough/14-shell.mjs` now fails unless the choice shows exactly two answers.
Evidence: before `14/16-Vesk-s-overload-coil.png` (three buttons); after `14b/16`, `14r2/16`, `14r3/16` (two);
segment 14 passed in `14b`, run 2 and run 3. Shared menu code (`hud.js`) not touched: a general "no Cancel" option for
forced choices belongs to Wave B's menus pass.

### Bot faults (the test, not the game), fixed

- **B-1 · Chapter 6: four minutes circling Yorna at her winch.** After the heat comes on Yorna walks from Lhar to the
  winch; the bot walked to where she had stood, then tried to get within 1.0 m of her centre (closer than her body
  lets anyone) with 240 s allowed, circling the whole time (runs 1–2: 250 s, 390 m in that one step: the "223 s stuck
  behind Yorna" of 8.11 was the same thing). A player would press E as soon as the Talk prompt is hers. `P.talk` now
  does exactly that, and its "step closer" walks stop on her prompt, no closer than her body, 20 s at most
  (`tests/lib/player.js`). Probe `probe-yorna2` and run 3: the talk took 28 s. Chapter 6's measured free play falls
  from ~460 s to 236 s; the 8.11 numbers had subtracted this stall by hand.
- **B-2 · Every menu: 120 s of idle game time.** `P.settle` stepped the game while a menu (Hesk's destinations, the dig's
  keypad, the core's choice) waited for a pick: 140 s per flight in chapter 10. It now stops at a menu and the caller
  picks. Runs 2–3: 0.1–0.3 s in each menu. (Menu time was never in the balance numbers.)
- **B-3 · The text-fit watch measured the toast stack's container** (false "overflow" whenever two toasts stacked); it
  now measures the dialogue line, the objective and the prompt only.
- **B-4 · Chapter 8, run 1: 45 s round the evacuation barriers at Pippa's stall** (stuck at (-46, 1.3)). Her stall's
  front is open (`11/07`); run 3 reached her at once after B-1's change. Not a game fault.

### Open (for the owners named)

**PT-2 · Chapter 4, stepping out of the research post's office: the camera parks over the office's flat roof** —
cosmetic. Goal shown: "Open the dig and reach the bottom". With the notebook in hand he comes out of the office's door
and the Follow camera stays behind him on the office's side: the flat white roof fills the lower half of the picture
and he is an x-ray silhouette through it, unchanged for at least 4 s standing; it clears once he has walked about 4 m
toward the yard. Probe (input from the chain's save at the chapter's start): camera at (3436.6, 6.1, -30.9), him at
(3436.6, 1.6, -25.8), still the same 4 s later. Evidence `07/10-the-notebook-in-a-sandstorm-.png`,
`probe-notebook/12-out-0-s-.png` … `16--4-s.png`, `17-walk-on-2-s-Up-.png`. Owner: world-polish (camera; VP-10's "the
shot rises over buildings" does not happen on this exit).

**PT-3 · Chapter 5, out of the dug-out condenser hall: the same, over the hall's concrete roof** — cosmetic. `08/13`.
World-polish, with PT-2.

**PT-4 · Chapter 8, Zoé's run: the first view of her** — cosmetic, slightly confusing. Told "Zoé: bring the hill
families to the lighthouse (0/3)", the player gets control of Zoé at Twinsen's door with the camera *in front of* her,
over the house's roof edge, Zoé cut by the frame's bottom (`11/08`, `probe-zoe/09`). The camera swings round over about
2 s and settles behind the house's roof and wall (`probe-zoe/11`); walking on, the wall and a signpost cover her
(`probe-zoe/13`). With tank controls the first Up walks her toward the camera. Owner: world-polish (the camera's
hand-over on a change of body; Zoé's other turn, chapter 2's office, is an interior and looked fine, `05/03`).

**PT-5 · Every outdoor region: the objective box fades to a faint outline and cannot be read on bright ground** —
confusing. The box shows each new goal brightly, then fades; faded, its text is unreadable over Zeelich's white cloud
sea ("Check the bore's channel at the platform console", two lines, `06/12`; "Stop Vesk on the platform", `06/11`), over
the desert's sky and sand (`07/02`, `07/05`, `07/06`) and the Hamalayi's snow (`09/09`, `09/14`, `10/07`). The pause menu shows the
goal in full, and the fade is by design (no clutter); the issue is the faded state's contrast on light scenes, not its
wording. Owner: Wave B (HUD). Preference: a darker backing that survives the fade, not more text and not a permanent
arrow.

**PT-6 · After a talk, the person is hidden behind Twinsen** — cosmetic (preference). The Follow camera stands behind
him and the person he just spoke to stands in front of him, so in the free-play frame they are behind his back: Doran at
the harbour (`01/11`), Mother Tarra (`07/02`, `07/05`), Hesk (`07/06`), Yorna and Pim in Lhar (`09/04`, `09/06`, `09/08`),
Xil on the pier (`01/14`). The talk itself frames both (CAM-CLEAR-2); the "Talk" prompt stays. For world-polish to
weigh; nothing is missed by a player.

**PT-7 · The camera behind a near prop** — cosmetic. Each time he shows as an x-ray silhouette, so play goes on: the
old mill's sails at the cog (`06/07`; chapter 10 `13/04`, `13/05`), the Whispering Cliffs' rock face filling half the
view at the target (`04/04`), the snow lip in front of the heating station (`09/05`), the observatory's exit with him at
the frame's bottom on a white slope (`10/07`), a tree between camera and him at the depot bunker's wheel (`11/05`), the
monastery yard's golden shrine roof (`13/17`), a pine at the glider field (`13/19`), the Water Office's blue roof on its
exit (`03/06`, `13/10`). Owner: world-polish (camera volumes for those props).

**PT-8 · Chapter 2, Vesk's task on the pier: a crowded first look** — cosmetic. Doran's hat and head fill a third of the
frame in the foreground, another elephant cuts the right edge, the objective faded over the ship (`03/05`). Camera,
world-polish.

**PT-9 · Fights the bot could not win alone** (balance, for animation-combat; the bot does not dodge melee, so this
overstates the difficulty): chapter 3's depot (drone + guard: ISO assist in all runs, 8 health), chapter 8's fortress
(runs 2–3: ISO assist, 7–9 health), chapter 10's bore (every run; run 1 spent both clovers there) and, in run 2, the
ridge's crawler and the dome's mites. A clover went in chapter 2's depot and chapter 4's storm gate in every run. The
8.11 spike (chapter 2's depot, 27 health and both clovers) is gone: 15 health and one clover. The bot also never heals:
it reached chapter 10's bore with **1 health** in run 1 (chapter 8's fortress, then two 2-health falls on the old mill's
stones in chapter 10, nothing eaten since); a player would likely have used a potion or a heart. No Game Over in any
run.
*Update (COMBAT-2, Wave B item 4):* measured by source and addressed in docs/COMBAT.md "Fair fights": the Zeelich depot's
drones shot through the fence (fixed), no recovery before the bore (Ilka's canteen), chapter 8's fortress and chapter
10's ridge fair once the bot reads the telegraphs (the bot now dodges, sidesteps bolts and picks up hearts); chapter 6's
ice mites have a frost slide. By the new bot: chapters 8 and 10 with no ISO assist; chapter 3's depot by input to the end in 2 of 8 runs (still 9–10 health lost each time).

### Looked at and fine (by picture)

Objectives at every step named the place and the person (the chapter's first goal included), prompts sat on the thing
or person meant, nothing floated or stood in a wall in the pictures, interiors cut away as in LBA (the house, the water
office, the projoffice, the control room, the lighthouse, the condenser halls, the observatory, the council house, the
archive, the bore rooms), the well's kicked lid stands open behind the well (`01/09`, looked at closely), tutorial lines
appear where the thing is first needed (Athletic at the bay rocks `01/19`, the sword at Yorna's winch `09/10`, the Pulse
Tool in Baldino's workshop `12/14`), the end card and Keep Exploring (`14/17`, `14/18`).

## Left for others

| Owner | Item |
|---|---|
| world-polish (camera) | PT-2, PT-3 (exits under a flat roof), PT-4 (the body switch to Zoé), PT-6 (people behind him after a talk; preference), PT-7 (props in front), PT-8 |
| Wave B (menus, HUD) | PT-5 (the faded objective's contrast on light scenes); a general "no Cancel" for forced choices in `hud.openMenu` (PT-1 was fixed locally in the story) |
| animation-combat (Wave B item 4) | PT-9: the fights the bot needed an ISO assist for (chapter 3 depot, chapter 8 fortress, chapter 10 bore); with a person playing, whether they are fair |
| chapter balance / the user | chapters 2 and 10 stay long (the user's decision); 12 is still the shortest (0.36 T); 6, 7 and 11 sit just under the band |
| the laptop | the GPU look of the pictures named here; a person's first play of chapters 1–2 to calibrate the estimate |

## What the bot could not judge, and unknowns

- **First-time finding**: the bot walks to the story's coordinates. Whether a newcomer finds the depot valve's sneaking
  line, the pump's west face, the notebook on the office desk, the archivist's key ring, the bleed valve, is not tested
  here; the objective lines at those moments were read in the pictures and name the place each time.
- **A pad**: not played (the bot drives the keyboard). `tests/controls.mjs`, `menus.mjs`, `holomap.mjs` stub a pad;
  the whole story with one is unverified.
- **Mouse**: menus were clicked (title Continue/New, the pause menu's Quit, the end card's Keep Exploring); play itself
  is keyboard only.
- **Retry with full life**: no Game Over happened in either run (the clovers caught every death), so the Retry rule
  was not exercised by this chain. `tests/crosssystem.mjs` was run once on the same snapshot after run 3: PASS, its
  "Retry: back in play from the last autosave, his life full" included (a death set up by the suite, not by the
  route; also pause while charging, focus loss, quality ×10 through the menus).
- **Optional quests, shops, sewers, the isles' homes, Kesh's Wind-Catcher, the arsenal**: off the bot's route; this
  pass did not play them (their own suites cover them by input or by flags).
- **The opening film**: skipped (`?nocine`); the other Wave A worker owns it.
- **The GPU look**: every picture is SwiftShader. Colours, the red hurt vignette's strength and the objective's fade
  should be looked at on the laptop.
- **No human timing**: the estimates' factors are still uncalibrated.

## Files changed (this pass)

Commits on the worktree's branch: `3c9fe0b9` (the chapter-12 fix, the bot's pictures, text-fit watch, first two bot
fixes), `0ce1e93e` (the Talk-prompt fix, the numbers, this report) and a last one adding the suites below.

- `src/game/story/chapter3.js` (veskChoice: the forced choice without the menu's Cancel)
- `tests/lib/seg.mjs` (SHOTS=<dir>: a picture after each step; OVERFLOW lines)
- `tests/lib/player.js` (P.fits: text-fit watch; P.talk presses E on the person's Talk prompt; P.settle stops at a menu)
- `tests/playthrough/14-shell.mjs` (checks the choice has two answers)
- `docs/lba-maturity/chapter-balance.csv` (measured columns refreshed, marked), `chapter-balance.md` (a pointer)
- this file

## Other suites run (same snapshot, after run 3, one at a time)

`crosssystem` PASS (10 checks, the Retry rule included); `shops` PASS (31: menus and talks with the changed `P.settle` and
`P.talk`); `hamalayi-life` PASS (18: talks with walking people). Every other suite that uses `P.talk` (about 20) was not
rerun: the change only shortens a walk that ends on the person's own prompt.

## How to rerun

From `lba3/`, a snapshot served on a free port (`tar --exclude=./tools/music/soundfonts --exclude=./node_modules
--exclude='./C*.png' -cf - . | tar -xf - -C /dev/shm/pt`; `python3 -m http.server <port> --bind 127.0.0.1 --directory
/dev/shm/pt`), each segment in order (no LOAD for 01):
`BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:<port>/ ASSIST=1 STATS=st-NN.json KEEP=save-NN.json
LOAD=save-(NN-1).json SHOTS=shots/NN TRACE=trace-NN.txt node tests/lib/seg.mjs tests/playthrough/NN-*.mjs`.
Chained wall time here: about 55 minutes for 01–14 on a quiet machine, about 80 with another worker's browser running.
