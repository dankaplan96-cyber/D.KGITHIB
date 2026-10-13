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

## Session 5 (merging, reliability, performance, exploration)
- Saves: format version 2, `migrateSave()`, backup of older saves, safe recovery (missing room → outdoors,
  unreadable save kept aside + new game + notice). tests/save-migration.mjs.
- Chapter 1: the project's heat posts light up by every door and Pippa's stall once the water is back; Vesk,
  Zoé and the townsfolk talk about the free heat before the evacuation plan (S4).
- Epilogue: bunting over the square. Exploration: six singing crystals off the paths (+1 max health each;
  Sendell remarks on all six). The ball snaps back if Twinsen changes room while it is out.
- Soundtrack merged (squashed): 12 tracks + stealth mix, music manager; FLAC masters git-ignored (they rebuild
  bit for bit). Draft quality, not checked by ear. docs/MUSIC.md.
- Ambience: footsteps per surface, well water / station machinery by distance, surf only by the sea.
- README and asset manifest rewritten in English; the LBA2 screenshot half removed from
  docs/docs-reference-compare.png.

### Performance (headless Chromium + SwiftShader, 1280×720, so frame times are not meaningful; counts are)
| Spot | Draw calls before → after | Triangles per frame before → after |
|---|---|---|
| Village square | 1680 → 1049 | 9.99M → 2.52M |
| Harbour | 1493 → 920 | 9.92M → 2.10M |
| Station road | 1148 → 957 | 10.18M → 3.37M |
| House interior | 171 | 0.26M |
| Zeelich street | 396 | 0.55M |
Changes: instanced vegetation split into 36 m tiles (culling works), coarser tree/bush meshes (no visible
difference at game distance), each house merged into one mesh per material. Load to menu ≈ 22–27 s in
SwiftShader (CPU rendering); not measured on a real GPU.

### End of session 5: the game is complete
- Chapter 3 rooms merged (src/game/underground.js, built in parallel); core pylons get glowing throw plates
  measured by real bank shots. Chapter 2 leads into chapter 3; End of Demo screen and DEMO badge removed.
- All five headless suites pass: prologue, chapters 1, 2, 3 (to the end screen and free roam), save migration.
- Playable link republished (same URL) with the soundtrack.
- Not verified: real-GPU performance; music and ambience by ear; a human playthrough.

## Session: chapters 9–10 and the combat overhaul (headless Chromium + SwiftShader, deterministic stepping)
- Chapter 9 The Council (upper district: antechamber, council chamber, project archive with stealth and a borrowed
  coat) and Chapter 10 Baldino's Network (five relays at five stations, Hesk's glider between the islands, the
  valve room under the water office). tests/chapter9.mjs and tests/chapter10.mjs pass.
- Combat overhaul, all values in src/game/combat.js; design and rules in docs/COMBAT.md.
  - Dedicated attack, dodge, focus, swap and weapon-wheel actions, with mouse aim and a gamepad layout.
  - A 0.22 s input buffer.
  - Soft targeting and lock-on with line of sight.
  - The magic ball: explicit states, substepped collision (no tunnelling), rule-based ricochets, charged
    throw, recall, recovery limits.
  - The sword from Yorna in chapter 6: a 3-strike combo, a heavy strike, hits only in active frames along the
    swept arc.
  - Dodge with invulnerability frames.
  - Enemy roles: cautious mite, drone with an aim-line tell, shielded sentry automaton, crystal crawler with a
    slam ring.
  - An attack director that limits simultaneous attackers, plus grace periods.
  - Baldino's pulse tool in chapter 10.
  - Difficulty, aim-assist and lock-mode settings.
- Verified: tests/combat.mjs (developer arena `?arena`), 22/22 checks. Full story regression: prologue,
  chapters 1–10 and save migration all pass with no page errors.
- Found and fixed along the way:
  - Line of sight sampled every 0.8 m and skipped thin walls (now 0.25 m).
  - The ball used the character step-up rule against walls, so the top 0.55 m of a wall let it through.
  - Switches weren't auto-aimed after the stricter collision (the chapter 5 hatch).
- Not verified: feel with a real gamepad or touch screen, sound by ear, real-GPU frame rate.

## Session: visual remaster (headless Chromium + SwiftShader; log and captures in docs/VISUAL_REMASTER.md)
- Stages 1–4 cover:
  - **Image quality:** MSAA in the post chain, shadow texel snapping, shadow quality per setting.
  - **Characters:** Twinsen and the cast rebuilt (eyes, hands, cuffs, shoes, hair, folds); smooth face
    shading at close range.
  - **Materials:** warmer grass, softer cliff feet, single-hue plank and tile variation.
  - **Distance detail:** trees, rocks and pines at the Citadel and in the regions.
  - **Draw calls:** the harbour, fences and street dressing merged; small far props no longer cast shadows.
  - **Places:** Lhar's village square, the council chamber and Desert Island's dune colouring.
- Measured (software GL):
  - Citadel street: 3.63 M → 2.2 M triangles, 1,177 → 767 draw calls.
  - Harbour: 1,103 → 623 draw calls.
  - Hamalayi: 2.64 M → 0.52 M triangles.
  - Desert Island: 0.93 M → 0.30 M triangles.
- Verified after stages 3–4:
  - tests/prologue, chapter1, chapter3, chapter6, chapter7, chapter8, chapter9, chapter10 and combat (22/22)
    pass.
  - The baseline and region captures show no page errors.
- Not verified: real-GPU frame rate, close-up faces in motion (only stills), feel of the new lighting on a
  real display.

## Session: the opening scene (headless Chromium + SwiftShader; details in docs/CINEMATICS.md)
- New game now opens with an in-engine scene (~85 s, skippable) instead of the exposition card and Zoé's
  speech:
  - the harbour and the Joint Project's new cargo lift (with its one faint vibration);
  - home: the tap that coughs and runs warm;
  - "I'll check the well." / "I'll ask next door.";
  - the title, then control in the house with the objective "Check the well".
- Built for reuse:
  - `src/engine/cinematic.js`: a timeline of events, tracks, camera shots, a blend into the gameplay
    camera, subtitles, hold-to-skip on the real binding, pause and focus-loss pause, a single `finish` for
    skip and completion.
  - A `cinematic` game state; quiet room changes; new everyday character actions and gestures in the rig.
  - Synthesised sound loops and effects; an original music cue (`tools/music/tracks/opening.py`) written so
    each section starts on its shot.
- New props:
  - In the house: a sink with a working tap (stream, sputter, steam), Zoé's seedlings, Twinsen's lamp
    repair, Arthur's model boat.
  - At the harbour: the project cargo lift, its barge, a puddle and Doran's bow line.
- Verified:
  - `tests/opening.mjs`, 15 checks, covering:
    - playback and its end state;
    - skip at 3, 50 and 81 s, plus a short press not skipping;
    - pause and resume, and losing focus;
    - Continue (no replay) and a second new game (nothing duplicated);
    - the first objective playable.
  - Prologue and chapters 1 and 3 still pass (chapter tests start with `?nocine`).
- Not verified: real GPU and display, sound by ear, touch and gamepad skipping on real devices.

## Session: desktop app (docs/DESKTOP.md)
- `desktop/`: an Electron app around the same game code.
  - Its own window, fullscreen with F11 / Alt+Enter, saves on disk in the app-data folder.
  - The game is served from the package on `app://`; the font is bundled; Quit Game appears on the title screen.
  - `tools/game-files.mjs` lists exactly the files the game loads (it replaced `tools/publish-files.py`).
- `.github/workflows/desktop.yml` builds Windows (installer and zip), macOS (dmg) and Linux (AppImage) on
  GitHub's runners, and publishes them as a pre-release.
- Verified: `desktop/test-desktop.mjs` against the packaged Linux build passes 6/6 checks (window and
  `app://`, Quit button and bundled font, new game with the opening and save, the save surviving a restart,
  Continue, Quit). The Windows zip was also built on Linux. Not verified: running the Windows and macOS builds.
- First Actions run: all three builds and the release job green; pre-release `desktop-build-1` carries
  `LBA3-The-Awakening-Setup-0.10.0.exe`, `-0.10.0-win.zip`, `-0.10.0-mac.dmg` and `-0.10.0-linux.AppImage`.

## Session: code review fixes (Astra's review) and the first Windows feedback
- Ball: a held press threw an uncharged ball at 0.16 s, before charging could start (reproduced at 30/60/120
  fps). Now the button that started the throw decides tap or hold; holding stops Twinsen, the direction keys
  (or the mouse) only turn the aim with the arc preview, and the release throws there.
- Prompts take their key label from one place (`Input.label`): A on a pad (it showed X, the attack button),
  the rebound key on a keyboard. Pad A talks/searches in every behaviour when something is in reach.
- NPC walk cycle follows the ground actually covered (a blocked walker stands).
- Loop: slow frames are simulated in steps of ≤ 1/30 s (up to 4), so the game keeps real time down to
  ~7.5 fps (before: slow motion below 20 fps). `engine/perf.js`: frame-time stats, F3 / `?perf` overlay with
  the GPU name and startup times. Settings apply only what changed (the volume slider cut the camera).
- Rendering: near trees and rocks cast shadows with their coarse models; island rocks got a far LOD.
  Triangles per frame −30…−39% in the village, the camp and Hamalayi; shadows compared side by side.
- Startup (user: "stuck on the spinner"): the first frame compiled all shaders (34 s on software GL) after
  the spinner had been hidden but before it repainted. Shaders and textures are now prepared behind the
  loading screen (`compileAsync`, parallel where the driver allows), with a status line. Room lamps go through
  a fixed pool of 8 lights (`engine/lightpool.js`): the light count no longer changes per room, so programs
  stay at 121 from the title through a new game, the house, outdoors and the regions (before: 227+ and a
  recompile on every door). Desktop: `ignore-gpu-blocklist` and `force_high_performance_gpu`.
- Zoé's hair is blonde (user: as in LBA2).
- Tests: tests/combat.mjs (tap/hold at three frame rates, aiming while held), tests/controls.mjs, tests/timing.mjs.
- Open (user feedback): character proportions do not match LBA2; animations do not feel like the original.

## Session: givers and Citadel on the original map
- Givers after LBA2 (zone giver): in Normal mode the action key with nothing in reach plays the original's hop
  (anim 17, 0.58 s); next to a giver it pops one bonus toward Twinsen (WhichBonus: what he needs most of the
  allowed kinds; a coin worth n for money), once per giver, gone after 20 s with a blink in the last 3. Givers
  sit by furniture indoors (5 in Twinsen's house, the offices, the control room, Baldino's workshop, the
  lighthouse top) and at a few barrels and the old stump outdoors; no kashes lie around outdoors. tests/givers.mjs.
- Citadel follows the original map: coast and four terrace levels from `citadel-layout.js` (coarse outlines
  traced from the original), our own terrain on top; the town and harbour kept their coordinates (the original
  sits at −76, +16 in our frame). The terrain grid is centred on the island (Terrain cx/cz).
- 12 years on: the lighthouse, the depot, the orchard and the station (Funfrock's fort) stand on the northern
  plateau; the Whispering Cliffs are a rock stack on its rim reached by the stepping stones; the water main runs
  along the plateau and down the west shore to the meter. The station and depot builders keep their first
  coordinates and run in a shifted frame (island.js siteW / SHIFT). Paths, signposts, crates, crystals, the
  chapter 8 landing, fort door, depot bunker and farmers moved with them (WORLD_MAP.md).
- Fix: the orchard valve's wheel sat only ~0.2 m above the cage, so the lob over the bars hit it by luck; it
  stands 0.3 m higher now.

- Twinsen's house stands at its original place in the south fields (door S0, −45.6, 80), the lighthouse on the
  south-west headland "at the end of the island" (−107.5, 90.5) as the original's signpost says. The opening,
  prologue and chapter scenes at the house moved with it.
- The house inside follows the original's plan in our style: the family room, Arthur's room (blue star
  wallpaper), a reading room, the hall with armchairs and the stairs down to the cellar (a training room with the
  target, a dummy, bookcases and the radio). Givers by the furniture.
- Village houses by the original's doors: S37, S5, S3, S17, S15, S9, the baggage-claim building and its wing
  (S7/S8), S14 (the museum).
- Street furniture after the original (citadel-layout.js PROPS): the square's four corner lamps, the plaza's lamps
  and benches, lanterns, bollard runs, railings, picket fences, tulip rows; 48 pieces fit, 23 are left out where
  our ground is lower (the quay basin) or something of ours stands.
- Gibberish voices (engine/voice.js): each speaker babbles while a line types out, the vowels taken from the
  text; Twinsen and Zoé pitched after the original's English voices. tests/voices.mjs.
- The original's trees and palms where they fit (a palm model: sculpted trunk, folded frond strips).
- The harbour moved to the west end of the original's pier (island.js SHIFT.harbour: built in its first frame and
  shifted whole). The opening's harbour shots, chapter 1's ferry, chapter 8's quay crowd and the prologue's
  Doran and Xil came with it; a path leads there from the fields past the baggage-claim building. The old quay
  is the original's promenade again (lanterns, railings), reached by a ramp from the square's west street.
- The magic ball after LBA2: a throw costs 1 magic; with magic 4 bounces and home on the 5th contact, without
  magic home at the first; the arc restarts on each bounce; ~10 m/s return; colour by magic level (yellow, green,
  red, fire); it brings back a bonus it touches. Fix: indoors a floor at height 0 counted as sea.
- Open: the old citadel ruins and the Woodbridge cliffs (east) are not placed yet.

## Session: review fixes, aiming, animation continuity, performance (0.11.0)
- Review fixes (tests/audit.mjs): a bonus carried by the ball is credited once on a scene change and let go on a
  load; shadows and bloom follow quality and visual mode together (also on a start with saved Low); the
  frame-time overlay moved to F9 (F3 picks a behaviour) and ignores key repeat.
- Twinsen's house: real stairs down into a stairwell; the cellar stairs climb the west wall to the exit; the
  front door is an opening in the near wall; Zoé's "next door" is the neighbours' house by Twinsen's.
- Aiming (tests/combat.mjs §18): a still cursor stays the aim; walking never redirects a mouse-aimed throw; a
  right drag never toggles the lock; Aim Assist Off corrects nothing; the chevron shows the throw's target.
- Animation: an upper-body layer on the rig (throws and charges over walking legs, strafing and backward steps
  while aiming); the follow-through blends out to ~0.62 s; charging allows a slow walk; the ball's return
  speeds up (10 m/s + 22 m/s²).
- Performance: in-game benchmark (pause menu), automatic resolution, canvas MSAA off, 2× MSAA at pixel ratio
  1.5+, Medium on a first start with an integrated GPU, terrain in culled tiles, lighter tulips (hidden far
  off), coarser curtains and quilts. Measured headless (software GL, so counts only, not frame rates): visible
  triangles street 1037k → 825k, Twinsen's house 285k → 201k. Frame rates on real GPUs are not measured here.

## Session: the user's benchmark, original controls (0.12.0)
- The user's benchmark (0.11.0, Intel UHD Graphics, 1042×634 at devicePixelRatio 1.475): Medium 20–25 fps,
  High 16–24 fps; simulation 2–4 ms and render submission 4–13 ms per frame against 33–66 ms frames, so the GPU
  is the limit (pixels and lighting, not geometry). Changes for it: the room-lamp light pool by quality (8 / 4 / 2
  point lights: every lit pixel paid for 8), bloom on High only, a 1024 shadow map with plain PCF on Medium, no
  MSAA on Medium at pixel ratio above 1.05, Low at 0.75. The benchmark adds a breakdown at Medium (street and
  house: as is, no shadows, no lamps, resolution ×0.6) so the next report shows what each costs there.
- Stairs (tests/house.mjs): the hall stairwell's floor collider is cut and the treads are steps to walk down; the
  cellar stairs climb; stairs never push Twinsen back (the tread under his feet decides the height); a floor
  below sea level indoors is not sea.
- Controls: Classic is LBA2's own keyboard and the default (also for saved settings, once): arrows walk and turn
  at 90°/s, Space action, W talk/search, Alt the ball (hold: feet planted, ←/→ aim, release throws the way he
  faces), X dodge, Ctrl + F1–F4 behaviours, Shift inventory, H holomap, Enter camera, Esc menu. Classic never aims
  with the mouse (the resting cursor had been aiming every throw). Modern keeps WASD, mouse aim and the slow
  aimed walk. tests/combat.mjs §19.

## Session: the characters after the original, one design language (0.13.0); Zeelich's peoples (0.14.0)
- The user: the characters still don't look like the original, and the rest of the cast should share their
  design language. Blender now runs here as a Python module (`pip install bpy`), so the model scripts were
  changed and every model rebuilt (docs/character-review.md §12, docs/LBA2_MEASUREMENTS.md).
- Twinsen: the head at the original's size (it was drawn 1.24×), no hair on the skull (only the bun's three
  balls), ball hands, small pale eyes, a pale medallion without the cord.
- Zoé: rebuilt from the original's sections. Narrow shoulders, slim waist, wide hips, a V neckline with bare
  shoulders, tapering trousers, long pointed green shoes, a narrow head with red lips, the three-ball bun.
- The cast: ball hands, flush shoulders, small plain eyes, no gold hem bands. Grobos get the original's great
  round body, a wide head with a trunk and huge flat ears; Rabbibunnies a snout.
- Checked: the original's polygons are Gouraud, so no flat shading (an earlier impression came from a flat study
  render). Skeletons unchanged: every animation drives the new models (captures/characters/cast-pass8-*.png).
- Zeelich's peoples after the original (the user: "where are the Zeelich characters — the bees, the aliens
  that look like capsules, the moles"): the Esmers are now LBA2's capsules (salmon, the face high on the capsule,
  thin arms with cone hands); new Mosquibees, moles (from the user's screenshot of a mole home: robed, a long pale snout) and
  triangle-headed townsfolk stand on the Esmer street with lines and voices of their own (Bzizz, Madam Zuzzara,
  Old Grumm, Mother Snuff, Mr Pelleck, Tavo).
  tests/chapter9.mjs checks they stand on the street and talk.

## Session: Vesk the villain (0.15.0)
- The user asked who the heroes and the main enemy are, wanted the enemy built as a figure of his own (like
  FunFrock), and chose: Vesk becomes the villain (no redemption). Story: he wants the waking entity's power for
  the project; in the core, after the three pylons, he overloads the guardian and raises a coil over his console;
  three ball hits break it, the console bursts, Twinsen switches the bore to shield mode, the council's guards
  come for Vesk; the epilogue and journal follow. tests/chapter3.mjs drives the coil (three real throws).
- Vesk's model (build_vesk): greatcoat to the floor carried by the legs, a tall collar, brass pauldrons, the
  violet emblem, a crest and a monocle, a brass gauntlet. captures/characters/vesk-villain.png.
- The user will upload LBA1's files: its characters are to be measured the same way (numbers only).
