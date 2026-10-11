# PROGRESS

Test conditions so far: headless Chromium (Playwright) with SwiftShader software GL, 1280×720 / 960×540,
deterministic stepping via `game.step()`. Real-GPU frame rates are **not yet measured**.

## Implemented and verified
- Prologue (house → town → harbour → kids → well cave → Sendell). Verified by `scratchpad/pro.mjs` full playthrough
  (new game → prologue end → save) after the art pass (commit 1be1134).
- SDF sculpt pipeline with auto-skinning (engine/sculpt.js); 10 character designs (game/characters.js).
- Twinsen redesign after LBA2 reference (turnaround in docs/docs-twinsen-turnaround.png).
- House kit (architecture.js), town layout (town.js), sculpted trees/rocks/grass (vegetation.js), paving texture.
- LBA2 exterior camera; Twinsen ≈16% of screen height (docs/docs-reference-compare.png; the original reference frame is no longer stored in the repo).
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

## Session 3 (chapter 1 to release quality — gameplay and animation first)
- Full chapter-1 playthrough test (`scratchpad/ch1.mjs`, real systems: talk, doors, use, ball throws, save → reload →
  continue) passes end to end with no errors: new game → arrival → task → pipe map → 3 valves → save/load (flags
  identical) → water → tour → Zoe's stealth segment (plan found) → Vesk leaves → radio → ferry → end screen.
- Reachability check (BFS with the real physics: walking, steps, jumps ≤ 1.5 m): every valve, door, the pier, the
  station gate and the depot are reachable on foot from Twinsen's house.
- Bugs found and fixed: arrival cutscene could hang forever; `act()` overwrote the `actAt()` method (second "use"
  crashed); room search won ties over the pipe map; save between the third valve and the water scene softlocked;
  interaction picked a signpost over Zoe (now facing-weighted, people first); water scene used wall-clock time.
- Animation fixes from close-up recordings: sleeves tore the robe (arms are now a separate skinned surface on the
  same skeleton), run arms reached forward (now pump close to the body), heel poked through the robe when running.
- Island (station in the old fortress, depot, pipeline, 3 valves, harbour, ferry, signposts) and interiors (water
  office, project office, control room, upgraded well cave) built from the prop kit.

## Known problems
- Character geometry is sculpted at load (~1–2 s per character in SwiftShader).
- Dark crease on the tunic when the arm is raised.
- Chapter 1 ends on an end-of-chapter screen (chapters 2–3 not built yet).
- Zoe's stealth room is verified by script (teleporting between lockers), not yet by a human-like route.

## Session 4 (full game: visual standard, story to the end, soundtrack)
- English only; all player text rewritten; LTR; language picker removed (text tables kept).
- Characters: every look is a Blender low-poly model (tools/blender/lbapoly.py, cast_poly.py, twinsen_poly.py;
  sources art/characters/*.blend; skeletons art/characters/skeletons.json from tools/dump-skeletons.mjs) with
  LBA2-style ramp shading (LbaMaterial). Twinsen measured against the original; Zoé redesigned (interpretation);
  distinct hairstyles; fuller torsos/sleeves. Captures: captures/characters/.
- Citadel terrain: faceted rock faces on the terrace cliffs (src/game/cliffs.js), mossier grass, browner soil.
  Before/after from the game camera: captures/world/.
- Story: STORY_BIBLE.md, WORLD_MAP.md. Chapter 2 setback (plan confiscated, recovered, Oku/Nara react) —
  verified by the ch2 playthrough. Chapter 3 + epilogue written (src/game/story/chapter3.js, epilogue.js,
  text/ch3.js, Guardian boss in enemies.js); waiting for the underground rooms (parallel build) to test.
- Soundtrack: parallel build (FluidSynth + FluidR3 GM soundfont; draft orchestral quality; not verifiable by ear
  here — no audio device).

### Verified this session
- prologue, chapter 1, chapter 2 automated playthroughs (headless Chromium + SwiftShader) pass after each change.
### Not yet verified
- Chapter 3 / epilogue in game (rooms pending). Real-GPU performance. Music by ear.
