# PROGRESS

Test conditions so far: headless Chromium (Playwright) with SwiftShader software GL, 1280×720 / 960×540,
deterministic stepping via `game.step()`. Real-GPU frame rates are **not yet measured**.

## Implemented and verified
- Prologue (house → town → harbour → kids → well cave → Sendell). Verified by `scratchpad/pro.mjs` full playthrough
  (new game → prologue end → save) after the art pass (commit 1be1134).
- SDF sculpt pipeline with auto-skinning (engine/sculpt.js); 10 character designs (game/characters.js).
- Twinsen redesign after LBA2 reference (turnaround in docs/docs-twinsen-turnaround.png).
- House kit (architecture.js), town layout (town.js), sculpted trees/rocks/grass (vegetation.js), paving texture.
- LBA2 exterior camera; Twinsen ≈16% of screen height (docs/docs-reference-compare.png).
- House cutaway when a house hides Twinsen.
- Fix: negative first-frame dt made NPC rigs diverge.
- Walk and ball throw animation frames verified (docs/docs-walk-throw.png).

## Session 2 (chapter 1 focus)
- Story director (src/game/story/index.js) with chapter modules; the prologue flows into chapter 1 with a title card.
- Chapter 1 written (src/game/story/chapter1.js, texts src/game/text/ch1.js): arrival cutscene, Vesk's task, pipe map,
  3 valves, water returns, station tour, Zoe's stealth segment (Watcher with vision cone), confrontation and
  Vesk leaving through the beam, Arthur's radio (Baldino), Doran's ferry → end-of-chapter screen.
- Enemies (src/game/enemies.js): sculpted crystal mite with telegraphed rear-up/lunge; Warden drone (patrol,
  vision cone, alert, 0.7 s charge then zap, stagger, wreck); Watcher for stealth.
- Hero: inertia, coyote time, jump buffer + anticipation crouch, landing squash, fall damage/knockdown, ball held in
  the hand during wind-up and released on an event, one-shot actions (use/pick-up/door/search), knockdown/get-up,
  clover revive, body swap for Zoe. Rig: new poses, stride = 4·L·sin(amp), run lean by speed, sneak lingering,
  turn coordination, directional hurt, 5 talk gestures, listeners face the speaker.
- Twinsen rebuilt after LBA2 screenshots (robe2, egg head, topknot, belt, slippers) — docs/character-review.md.
- New characters: Vesk, worker, guard; Arthur re-designed.
- Inventory + journal screen (I/J), painted item icons.
- Composed music (src/engine/music.js): 9 themes, switched by room/area. Not audible in headless tests (no audio
  device) — **unverified by ear**.
- Houses fade along a view corridor; the camera no longer swings away because of houses.

## Known problems
- Outer island areas (lighthouse, camp, fortress, harbour shed) still use primitive geometry.
- Interiors furniture is box-based.
- Character geometry is sculpted at load (~1–2 s per character in SwiftShader).
- Dark crease on the tunic when the arm is raised.
- Prologue ends on a "to be continued" screen (chapters 1–3 not built yet).
