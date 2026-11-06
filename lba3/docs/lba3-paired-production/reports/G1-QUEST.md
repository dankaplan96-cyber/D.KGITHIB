# G1-QUEST — quest/puzzle, Group 1 (Citadel, chapters 1–2), Round 2

Role: quest designer, also covering the text of these items (the narrative partner runs later). Batch: the open STORY
items of `docs/lba3-production/reviews/AUDIT-CH12/FINDINGS.md` (#3, #4, #5, #7, #8, #11, #17, #18, #19, #20, #21).
Naming: the player's chapter 1 is `well` (`story/prologue.js`), chapter 2 is `project` (`story/chapter1.js`).

Baseline: `d5eb091` (branch `ccr-adf00ea7-37ebl3`). Commits (worktree, not pushed): `e59b5ee`, `7eb4f39`, `80a02df`,
`2625326`, plus the commit that adds this report.

Evidence lives in the session scratchpad, `g1-quest/` (not in the repository). Kinds of evidence, kept apart:
- **automated tests** (Playwright, headless SwiftShader, deterministic stepping): the chapter tests, clarity, voices,
  and the player-input bot chain 01→05 (`tests/lib/seg.mjs`, KEEP/LOAD);
- **staged probes** (flags and placement set by script, then the real systems stepped; screenshots at 1366×768):
  `g1-quest/probe/*.js`, run with `g1-quest/p.sh` against the worktree (port 8209), the untouched baseline tree (8210)
  and the worktree plus the patches proposed below for others' files (8211);
- **code reading**.
No normal-input play by a person, no target-hardware (Vega 8) run, no listening test of the new sounds.

## Changed files (all in my allocation)

- `src/game/story/chapter1.js` — journal, the water's return shot, valve and rising-stone sounds, the guard's sight,
  Mira after the water, no Fists pill for Zoé, short valve names on the Holomap
- `src/game/text/ch1.js` — 6 new English lines/labels, one shortened narration line (English only; the old Hebrew block untouched)
- `src/game/interiors.js` — the house door's daylight, the well cave's steam, the project office's `R.bounds`, the
  control room's framing
- `src/game/town.js` — Pippa's canopy
- `src/game/world.js` — the unrisen stepping stones (#20 only)
- `tests/chapter1.mjs` — 4 new checks (water shot, journal, Mira/pipe map, the guard's sight + the weapon pill)

Not edited: `src/main.js`, `src/game/hud.js`, `src/engine/**`, `css/**`, `src/game/enemies.js`. Exact patches for those are
at the end (P1–P4), each applied to a scratch copy and checked there.

## Items

### #3 — the chapter-2 journal listed the next step as done
- **Verified: yes** (code: `journal()` kept the first not-done line, `filter((l, i, a) => i === 0 || a[i-1].done)`, and
  every line is written in the past tense; probe `water.js`: before the change the list after Vesk's task ended with
  `c1_j_valves` "The water is back in the well…" while no valve was open).
- **Change:** the journal keeps only what happened (`filter((l) => l.done)`); the step ahead is the objective, already at
  the top of the same screen. A first line `c1_j_morning` so the chapter's section is not empty before Vesk.
- **Evidence:** chapter1.mjs "the journal lists only steps that happened" → `["c1_j_morning+","c1_j_vesk+","c1_j_valves+"]`.

### #4 — the third valve: the water's return was only narration
- **Verified: yes** (code: `waterReturns()` only rumbled and ran two lines over whatever view the last valve had).
- **Change:** a short cut to the square (≈2.6 s, E skips after 0.9 s; no timing gate): pipe knocks, the well gurgles and
  steams, the heat posts are switched on during the shot (they warm up over the next seconds, so they are seen
  lighting), Gilbert at the well; the narration (shortened to one sentence) is read over that shot, then the camera cuts
  back to Twinsen for his line. The camera is placed by a small search: off the well→stall line to the side away from
  Gilbert, and the first spot with nothing standing up into the near view (the square's lamps); none clear → the
  narration plays over the play camera as before. Uses the camera's `override` + `snap()` (the same as the ferry
  arrival), a world updater for the steam (removed when done), audio.js sounds. Flags, saves and the gate are unchanged.
- **State card:** valve 3 opens → (save, as before) → 0.9 s of play → `c1_water`, gate open, cast refreshed → shot
  (cutscene) → narration (dialog, camera still on the square) → cut back → Twinsen's line → objective + save.
  Room / no clear spot: no shot, lines as before. Continue from the save between valve 3 and the scene: `applyFlags`
  sets the water as before (no shot, unchanged behaviour).
- **Evidence:** `g1-quest/water-new/water-3-narration.png` (the well full and steaming, the stall's heat post lit,
  Gilbert at the side, the box below), `water-4-back.png`; chapter1.mjs "the water's return is shown at the square…"
  → one scripted shot 5.6 m from the well, override released, 0 leftover updaters, state play.

### #5 — valves played the treasure-chest chime; the target hit only rumbled
- **Verified: yes** (code: `openValve` → `audio.play('chest')`, the wheel turn → `'door'`; `hitTarget` → `'rumble'`).
- **Change:** turning a wheel plays `grind`; a valve giving plays `valveCue()`: clunk + pipe knock + a 1.25 s high-passed
  hiss + a rush down the pipe + a short gurgle (audio.js `play`, `_burst`, `_tone`; no new audio code). The stepping
  stones are heard rising: `stonesCue()` (chapter 2's update) plays a grind as every other stone starts and a thump as
  they settle; stones already risen at load stay silent. No main.js change needed for this.
- **Evidence:** code; the valve/target steps of chapter1.mjs and bot segment 04 run through it without errors.
  **Not verified by ear** (headless; no listening test).

### #7 — project office stealth: the guard's vision cone drawn outside the room
- **Verified: yes, and the cause is worse than reported.** Probe `zoe.js` on the baseline: in 6/6 samples the drawn
  sector pointed exactly opposite the guard's facing (`facing [1.00, 0.06]` → `coneDir [-1.00, -0.06]`), and 4–25 of its
  25 vertices lay outside the office. `enemies.js` builds it with `rotateY(+π/2)`, which puts the arc behind him; the
  sight check itself (angleDiff) is right. So the cone showed where he does not look, through the wall behind him.
- **Change (in chapter1.js, my file):** `updateCone()` replaces the Watcher's sector with a fan of 21 rays at his eye
  height, each stopped at the office's inside (`R.bounds`, added in interiors.js; the door gap included) and by anything
  taller than 1.2 m (lockers, shelves; desks are lower — he sees over them, as his check does), redrawn every frame as he
  turns; opacity raised from 0.14 to 0.26 (+suspicion) so it reads on the pale tiles. The Watcher's detection is untouched.
- **Evidence:** `g1-quest/zoe-base/zoe-office.png` vs `zoe-new/zoe-office.png`; probe after: 14/14 samples point the
  way he faces, 0 vertices outside; chapter1.mjs check → `dirs [1,1,1,1,1,1,0.99,0.98], outside 0`.
- **Patch for the owner of enemies.js:** P4 (the same backwards sector is used by chapter 9's archivist, `council.js`).

### #8 — well cave: ~90 hard white squares
- **Verified: yes** (code: untextured `PointsMaterial` size 0.35; a point's size is in pixels per metre of distance, so
  under the room's 9.5° lens they drew as 1–2 px white squares that also popped back to the floor at full strength).
- **Change:** 44 soft round wisps (radial-gradient texture), per-point alpha (in over the water, thinning as they rise,
  so the loop back is invisible), slower and spreading, and a size set per lens (`onBeforeRender`: ~1.1 m across in
  whatever camera the room is seen through).
- **Evidence:** `g1-quest/cave-base/crop.png` vs `cave-new/crop.png` (1366×768, cropped).

### #11 — Pippa's canopy a flat yellow plane
- **Verified: yes** (code: one plain `#e9c43a` material, the comment said "striped").
- **Change:** a 6-stripe yellow/cream canvas texture across the folds and a scalloped valance along the low edge (11
  half-discs). The stall is still merged (`mergeStatic`); one more textured material.
- **Evidence:** `g1-quest/town-new/stall.png` (and the stall in `water-new/water-3-narration.png`).

### #17 — the house exit hard to find; "Talk" with nobody in reach
- **Exit, verified: yes** (`house-base/house-*.png`: the door is a gap in the low near wall onto black, its daylight patch
  at 0.18 opacity under the rug).
- **Change:** low sun through the door: an additive warm patch on the hall floor reaching 4 m in from the threshold (over
  the rug), on the threshold and the outside step, and a haze in the doorway (interiors.js). Diegetic, no marker.
- **Evidence:** `house-base/house-mid.png` vs `house-new/house-mid.png`, `house-hall.png`.
- **"Talk", verified: yes** (probe `patches.js`, the start of chapter 1, Arthur kneeling at his boat: of 478 spots/facings
  that show "Talk", 159 have Arthur **behind** Twinsen, up to 2.0 m away — `findInteractable` lets someone at his back win
  at full reach with only the facing penalty). Fix is in main.js: **P1**. Checked on the scratch copy: 159 → 67 such
  spots, the farthest 2.01 → 1.43 m; people in front unchanged.

### #18 — the Chapter 2 card's text tiny and low contrast
- **Verified: yes** (`g1-quest/card/card-before.png`: "CHAPTER 2" in a thin 1.1 rem line over the bright square).
- **Change:** none in my files (hud.js / css). **P3** (css/style.css): a soft dark band behind the card, a larger, bolder
  small line and stronger shadows. Checked by injecting the same CSS: `card/card-after.png`.

### #19 — Mira still asked for the valves after they were open
- **Verified: yes** (code: `f.c1_map ? 'c1_mira_after'` regardless of the water; the pipe map read after the water made
  Mira say she had marked the valves).
- **Change:** Mira: water back → `c1_mira_water`; Vesk gone → `c1_mira_gone` (the town's "evacuation" talk, which Zoé
  and Pippa already raise; nothing from later chapters). The pipe map after the water: Twinsen only (`c1_map_after`).
- **Evidence:** chapter1.mjs "after the water: Mira talks about the water, the pipe map says the valves are open" (exact
  lines compared).

### #20 — flat green plates on the cliff path (the stones before they rise)
- **Verified: yes** (baseline probe `stones.js`: 9 of 14 unrisen stones were drawn — only the wholly buried ones were
  hidden; their moss caps showed through sloping dirt: `town-base/stones-top.png`).
- **Change:** no stone is drawn until `raiseStones` (which already shows them, from just under the ground). Collision
  was already off until then. Also saves ~9 draws on that street.
- **Evidence:** `town-new/stones-top.png`; probe: 0 of 14 drawn before the target.

### #21 — minor list
Done:
- **"Fists" pill as Zoé goes in** — verified (probe: `#weapon` class `show`, "Fists"); fixed in `startZoe` (the pill is
  updated at the swap and not flashed). chapter1.mjs: `pill false`.
- **Small control-room framing** — verified (`control-base/control.png`: the whole 12 m room small in the middle);
  `R.view` 13.6 → 11.8, `R.follow` 0.3 → 0.5 (`control-new/control.png`). Camera partner may want to review.
- **Crowded Holomap labels** (chapter 2's part) — the three valve stars carried the objective's long hints ("The depot at
  the old camp (drones)"); now "Depot valve" / "Orchard valve" / "Cliff valve" (`holo-base` vs `holo-new/holomap.png`).
  The objective bar under the map keeps the hints.
- **Jump hint ignores pause** — verified (probe: shown while paused); main.js: **P2** (game-time timer). Checked on the
  scratch copy: nothing while paused 2 s real time; shown 1.2 s of play after resuming.

Listed, not done (not my files, or not reproduced):
- **Dim valve toasts** — not reproduced as a contrast problem (`.toast`: 0.92 dark background, white 500 text). The 3rd
  valve's toast now sits under the water shot. Owner of hud.js/css to judge with the user's screenshot.
- **Tall Controls screen** — menu layout (index.html / css / main.js settings), AUTO-QUALITY's area. Not touched.
- Holomap label placement in general (hud.js `_placeLabels` places star labels even when they overlap) — hud.js owner.

## Tests (final tree unless noted)

- Baseline (`d5eb091`): chapter1 19/19, clarity 10/10, voices 24/24, well-town 29/29 — all PASS.
- After (commit `7eb4f39` + the new test checks): chapter1 **23/23**, prologue 26/26, well-town 29/29, chapter2 18/18,
  clarity 10/10, voices 24/24 — all PASS, no console errors, no missing files.
- Bot chain 01→05 (player input, `seg.mjs`, KEEP/LOAD) on the final source tree: **all five segments PASS**, 0 deaths,
  0 ISO assists. Segment 04 opened the cliff valve by input and the water scene ran through (`water: true`, back in play,
  objective "Visit Vesk at the old fortress"); segment 05 played Zoé's office by input (plan found, out, Vesk gone, to
  Zeelich).
- Final re-run after the last small changes (control-room framing, Holomap names, hall light): chapter1 23/23, clarity
  10/10, well-town 29/29 — PASS.
Logs: `g1-quest/baseline/`, `g1-quest/after1/`, `g1-quest/chain1/`, `g1-quest/final/`.
Performance: not measured (SwiftShader container). Cost added: the guard's 21-ray fan (only during Zoé's segment), 44
points instead of 90 in the cave, one textured material at the stall; nine fewer stone draws on the cliff street until
the target is hit.
Saves: no new flags, no schema change; `R.bounds` is build-time data.

## Checkpoint

Done and committed in the worktree (not pushed): all items above; report included. Next for the coordinator: review /
merge `e59b5ee..HEAD`; hand P1–P3 to the main.js / css owner (AUTO-QUALITY's area) and P4 to the enemies.js owner;
narrative partner reviews the new lines listed below. Nothing left running from this task (servers stopped).

## Patches for files I do not own (each applied to a scratch copy by `g1-quest/patch_others.py` and checked there)

**P1 — src/main.js, findInteractable (#17, "Talk" from behind):**
```diff
-      consider(dist(n.pos.x, n.pos.z) + (n.ambient ? 0.45 : 0), 2.6, o);   // (a walking resident gives way to the story's people on a tie: WORLD-LIFE)
+      // (G1-QUEST #17: someone at his back gets the prompt only at arm's length: 1.5 m behind him, "Talk" showed with
+      //  nobody in front of him)
+      consider(dist(n.pos.x, n.pos.z) + (n.ambient ? 0.45 : 0) + (o.behind ? 0.6 : 0), 2.6, o);   // (a walking resident gives way to the story's people on a tie: WORLD-LIFE)
```

**P2 — src/main.js, hitTarget and updatePlay (#21, the jump hint in game time):**
```diff
-      setTimeout(() => this.hud.toast('hint_jump', { b: this.hud.key('b2'), k: this.hud.key('action') }), 1200);
+      this._jumpHintT = 1.2;   // (game time: a pause holds it, updatePlay shows it — G1-QUEST #21)
```
```diff
     this.story.update(dt);
+    if (this._jumpHintT > 0 && (this._jumpHintT -= dt) <= 0) this.hud.toast('hint_jump', { b: this.hud.key('b2'), k: this.hud.key('action') });
     if (this.state !== 'play') return;
```

**P3 — css/style.css, chapter card (#18):**
```diff
-#chapter small { font-size: 1.1rem; letter-spacing: 0.3em; color: #ffd890; text-transform: uppercase; }
-#chapter h2 { font-size: clamp(2rem, 5vw, 3.6rem); margin: 0.3em 0 0; font-weight: 700; }
+#chapter::before { content: ''; position: absolute; left: 0; right: 0; top: 50%; height: 16em; transform: translateY(-50%); z-index: -1;
+  background: radial-gradient(ellipse 60% 50% at 50% 50%, rgba(4, 10, 18, 0.82) 0%, rgba(4, 10, 18, 0.6) 50%, rgba(4, 10, 18, 0) 100%); }
+#chapter small { font-size: clamp(1.15rem, 2.2vw, 1.6rem); font-weight: 700; letter-spacing: 0.3em; color: #ffe2a6; text-transform: uppercase; text-shadow: 0 2px 4px #000, 0 0 14px rgba(0, 0, 0, 0.9); }
+#chapter h2 { font-size: clamp(2.6rem, 6vw, 4.4rem); margin: 0.3em 0 0; font-weight: 700; text-shadow: 0 2px 4px #000, 0 4px 18px rgba(0, 0, 0, 0.9); }
```
(hud.js needs no change.)

**P4 — src/game/enemies.js, Watcher (the sector drawn behind the guard; also chapter 9's archivist):**
```diff
-    geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 2);
+    geo.rotateX(-Math.PI / 2); geo.rotateY(-Math.PI / 2);   // (the arc's middle on local +z: where the guard faces once turned by his angle)
```
Chapter 2 no longer depends on it (it draws its own clipped fan); chapter 9's cone is fixed only by P4 and still runs
through walls there (not in this group; not verified in play).

## Open issues / risks

- The same "next step in the past tense" journal filter is in chapter2.js, chapter3.js, council.js, evacuation.js,
  network.js, observatory.js, pass.js, steam.js (chapters 3–12; not in this group). Same one-line fix, but each
  chapter's lines need reading for tense first.
- A Continue from the autosave taken between the third valve and the water scene (a 0.9 s window) skips the shot and
  the narration, as before.
- New sounds and the water shot's timing are unheard / unseen by a person; the steam is subtle by design.
- The control-room framing change is a camera-adjacent setting: camera partner review.
- Partner review (narrative editor): `c1_mira_water`, `c1_mira_gone`, `c1_map_after`, `c1_j_morning`, the shortened
  `c1_water_1`, the Holomap names `c1_mk_*`.
