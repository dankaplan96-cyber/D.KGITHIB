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

## Session: Vesk's guards (0.16.0)
- The user asked who Twinsen fights and asked for Vesk's guards now. New enemy (src/game/guards.js, looks vguard /
  vguardG): Quetch and Grobo guards in Vesk's uniform with stun rifles and batons. Rules taken from LBA1's engine
  source (github.com/2point21/lba1-classic: OBJECT.C HitObj, PERSO.C, EXTRA.C GiveExtraBonus): armour (a hit
  weaker than it is braced against), two random hit reactions, a bonus left where a guard falls. Placed beside
  the drones in chapters 1, 2, 4, 5, 8 and 10 and in the arena; tests/combat.mjs §20.
- LBA1's repository holds the engine's source only, no game data: its characters, maps and buildings need the
  user's LBA1 data files (the user will add them).

## Session: the Temple of Bù, Joe the Elf, the Esmers' shuttles (0.17.0)
- The user: "where are the wizards, the Temple of Bù; where is Joe the Elf, the Esmers' shuttles (very
  important), the dogs — the game is a love song to the first two games". Chosen: the temple at the heart of
  chapter 4. The dig reaches the Temple of Bù's gate; inside (src/game/temple.js) the great relief replaces the
  open-air carving. Joe the Elf (build_elf, after body 110) stands by the square with his own lines. The Esmers'
  shuttles (src/game/shuttle.js, after bodies 70–78): one landed on a pad by Zeelich's dock, others circling over
  Citadel, Zeelich and Bald Mountain.
- The dogs (the user: "the dog's model is 51, 52 and 53"): Zeelich's big-mouthed dogs (src/game/dogs.js, after
  bodies 51–53 in their three coats) and LBA2's poodle (body 371). A dog-training yard on Zeelich after the
  original's (behind the north houses: a palisade, a bed of fallen leaves, a pale track round a block tower on a
  red crate, a blue tunnel, two hurdles, a hay bale, an A-frame) where two dogs run the course and a third noses
  about; another trots along the Esmer street; the poodle wanders Citadel's square. They come up to Twinsen, pant,
  and bark (the jaw drops open; a synthesized bark).
- The user: "the dog is from the second game; it is a guard dog — 51 52 53". So they are enemies now
  (src/game/guarddog.js): beside Vesk's guards at the ch. 1, 2, 4 and 8 sites and in the arena; they notice
  Twinsen, bark (alerting the group), run at him, crouch with the jaw wide (the tell), spring and bite; three hits
  knock one out (a bonus). The yard's dogs bark from behind the palisade; the street dog is gone. combat §21.

## Session: guard dogs and Twinsun's wizards (0.18.0)
- Guard dogs (above) as enemies.
- The wizards (src/game/wizards.js): Bersimon's tent at the original's S21 on Citadel's plateau, inside a stone
  room after the user's reference #63 (cauldron, table, candle stands, star plaques); the School of Magic on Desert
  Island behind the original's stone face (reference #09), inside after #26/#57 (pentagram slabs, star windows,
  blackboard, long tables). Looks after the original bodies (numbers only): Bersimon 111, Rector Hougo 123,
  Ker'aooc after 188 (a guess; asked). Bersimon tops up magic, Ker'aooc heals. Doors open in every chapter
  (story/index.js). tests/wizards.mjs.

## Session: LBA1's files (0.19.0)
- The user uploaded LBA1's data (and its TEXT). Read in the scratchpad only. The body layout from the engine source;
  all 133 bodies parse; docs/LBA1_CATALOGUE.md lists what each one is (numbers and descriptions only).
- The user chose the Spheros first: build_sphero (tools/blender/cast_poly.py) after bodies 69/70 (828 of 1240
  units; a star body, the face in its middle, an orange crest, arms from the shoulder points, ball hands, ball
  knees); race 'sphero' proportions in characters.js. Pom and Madam Rondo (with the poodle) on Citadel's square.
- The user: "I want the fat soldiers from there, as enemies too". LBA1's FunFrock trooper (bodies 18–20): build_fclone
  (a bell of a greatcoat to the ankles, straps, belt, a red pack and blue bedroll, a small pointed face under a
  round helmet, long arms, red boots); the Guard class's kind 'fclone' (armour 2, 5 HP, the rifle with the aim
  line). In ch. 5 (FunFrock's hall), ch. 8, ch. 10 and the arena. combat §22. (0.20.0)
- Open: Ker'aooc is slimmer than body 188's star-shaped body.

## Session: LBA1's rooms (0.21.0)
- The user: "rooms and maps from LBA1", chose FunFrock's asylum and the Temple of Bù maze. The grid format from the
  LBA1 engine source (docs/LBA1_CATALOGUE.md); a scratch converter reduces a room to numbers: for each column the
  runs of cells (height, collision shape, a colour index into the room's averaged brick colours), the hero start,
  the actors' spots (with their body) and the zones (assets/lba1/*.json). No brick graphics.
- src/game/lba1room.js builds a room from that in our style: stone sides and plaster tops tinted by the cell
  colour, slopes as ramps, colliders merged from the column runs, the near walls cut low so the iso camera sees in,
  lamps. src/game/lba1places.js places three rooms: the asylum (room 0) behind a block-house door outside the old
  fort's east wall on Citadel; the guards where the original's nurses (bodies 9, 11) and clone (13) stood, two
  guard dogs (after the prologue); the old register (a search) and a giver in the office; out by the stair-well.
  The Temple of Bù's maze (room 57) down a stair from our temple (ch. 4's interior, open in every chapter), and
  the dark halls (room 40) past it with crystal mites where the original's creatures stood (body 59), back up at
  the far end. tests/lba1rooms.mjs.

## Session: the engine, transitions and animation (0.22.0)
- The user: enough LBA1 for now; on with the engine, the animations, the transitions, the rooms.
- Transitions (src/main.js startTransition): through a door the hero walks on into it while the screen fades
  out and walks in on the other side while it fades back in (a story cut doesn't walk; never off a ledge). The
  first frame of a new room used to compile its shaders in the middle of the fade (measured here in software
  GL: up to 1–11 s on the first visit to some rooms and regions, mostly shader programs and buffer uploads); the
  new scene's shaders now compile (in parallel where the driver allows) behind the black screen, nothing is drawn
  until they're ready, and the fade advances at most 0.1 s per real frame so a slow first frame can't skip it.
  tests/transitions.mjs.
- The room camera's focus follows the floor under the hero (rooms on several levels: the asylum, the Temple of
  Bù's halls, the shell's gallery), not his jumps; and it keeps him inside the middle of the picture in the big
  rooms (the partial follow left him at the frame's edge in the asylum and the halls; LBA1's rooms now follow
  at 0.7).
- Animation (src/engine/rig.js), from frame strips of Twinsen (side and game views, scratch tool): leaving an
  action (a strike, a throw, a hop) or stopping from a walk or run now settles over ~0.2–0.3 s instead of snapping
  into the idle in one frame; the jab draws the fist back, snaps it out straight with the shoulder turned in, and
  returns to a guard; the sword's sweeps and overhead strike ease back toward a low guard through their recovery
  instead of holding the end pose. Contact frames unchanged (combat §§ pass).

## Session: REV-TY-3's open items (0.26.1; TY-3-FIX)
- Nell's coupler reads from the normal camera: Twinsen sets it down from the bench's west end (he walks there, the
  camera comes round behind him), the lean-to's roof rises to a tall front, and from the far view the roof and its
  sign fade while they hide the coupler or him. Four heat looks: brass, dull red, bright orange with a halo and a
  light on the bench, yellow-white flickering with steam and sparks.
- The pump: asked from any side once the pin is out, he walks round to the handle at walking pace (Hero.walkTo:
  the game's own physics, the stick takes over), takes hold and strokes it: lifted, pushed down, let back up. The
  'pump' pose is keyed by the handle's angle (fitted at runtime) and the handle follows his hands: hands within
  5 cm of the grip in every frame (was 0.41 m on the first frame and 0.20 m at the end).
- Chapter 10: Baldino's briefing now matches the stations (relays talk through each station's old machine; no
  masts; a friend at each station keeps the power steady). Text only.
- tests/chapter10.mjs ends "CHAPTER 10 ASSISTED" with exit code 2 when a ball target was not hit by a throw;
  townlife has 35 checks (was 30), workshop 32 (was 31). Evidence: QA.md "REV-TY-3 fixes", captures/townlife/.
- Not verified: GPU look; the feel by hand. Open: near the pump the camera's occlusion check swings it behind him,
  so the stroke is often seen from behind-left.
## Session: twelve years on, fourth set — Zeelich's street (0.27.0; TY-4)
- The user's brief for Zeelich: civilian life after its former rulers, communities rebuilding, independent
  businesses, disagreements over investment, real reasons to support Vesk's project; not one city, one opinion or one
  industrial landscape (docs/TWELVE_YEARS.md, fourth set; all proposed developments of this sequel; no claim about
  LBA2's rulers, whom the reference notes don't name).
- Places (src/game/zeelife.js, built by zeelich.js on the existing island; no new region, no new character model):
  the old watch house (older than the council, crest chiselled off) as Mother Snuff's bakery, with the guards' stair
  to its roof (Bzizz's landing stage), its oven on the project's heat (a copper feed from the depot under fresh
  cobbles, a heat box with a lamp); heat posts lit at the bakery, the council house and the depot gate, dark with
  CONNECTION NEXT QUARTER at the west end and over the moles' new burrow hatch; Mr Pelleck's dome half re-tiled under
  scaffold; Nara's flowers crated for Citadel by the shuttle pad (chapter 3 only). Snuff, Bzizz, Old Grumm and
  Mr Pelleck stand by their places now. The island's scatter keeps out of them without moving anything else.
- The Second Bake (src/game/story/zeelife.js, a layer like kesh.js): Bzizz's crate on the flue trips Snuff's heat
  box; shove it off on the roof, or knock it off with the ball from the street (it breaks: nectar on the grass);
  Snuff pays five kashes (owed until picked up); a roll heals; Tavo carries rolls to the depot. Lines change with the
  shield (ch. 3), chapters 4–8, the council (ch. 9) and the network (ch. 10); Nara and Oku get lines only where no
  chapter needs them (chapters 4–8 and later).
- tests/zeelich-life.mjs (see QA.md for the run): both ways by input, Save & quit → Continue twice. Regression:
  chapter2 (chapter 3), chapter9, workshop, zislands, spaceport, stability, resume (QA.md). Render counts measured,
  meshes merged onto shared vertex-coloured materials.
- Not verified: the look on a GPU and the feel by hand.
## Session: REV-TY-4 fixes — Desert Island (0.26.2; TY-3b-FIX)
- The door's hint and Brosk now follow how the cowl stands (D1): into the wind with sand in, they point to the
  missing screen; with the screen on but turned wrong, to the turning. Brosk first mentions Lumi's torn screen (N4).
- Hesk's poles keep clear of all four yacht lines, out and back (D2): the routes are shared (keshlife.js
  YACHT_ROUTES); dig-route poles now on the north side; the return ride passes 2.58 m from the nearest pole (was 1.00 m).
- The yacht stop's chalk strikes only the ferry; NO FERRY / ask Hesk on a slate under the board (D3).
- Readable from the roof whichever way the camera looks (D4): Lumi's screen shows on the lid and down the cowl's back;
  sand streams into a bare mouth facing the wind and out of the door past the awning; motes drift out once it draws.
- The wind at the cool room (D5): a windsock on the roof's north-west corner, a rag on the porch.
- Lines: jars "on the shelf" (N2); docs/TWELVE_YEARS.md labels Brosk's "to keep us out" as his opinion (N1).
- tests/desert-life.mjs 30 checks (was 25), incl. Save & Continue with the screen fitted but not turned.
  Regression: desert-life, chapter4, chapter5, stability, resume all rc 0, no page errors. Evidence: captures/desert-ty/fix-*.jpg, QA.md.
- Not verified: the look on a GPU; whether players read the windsock and lashings unaided.

## Session: twelve years on, third set — Desert Island, Kesh (0.26.0; TY-3)
- The user's brief, step 5: reused buildings, altered transport routes, excavation work, practical adaptations to
  local conditions (docs/TWELVE_YEARS.md, third set; all proposed developments of this sequel).
- Places (src/game/keshlife.js, built by desert.js): Kesh's cool room in one of FunFrock's concrete blockhouses by the
  shore, half under a dune, its door dug out (spoil heaps, a shovel), a wind-catcher on the roof (turning cowl,
  crank), a stair up the east wall, jars under an awning; Lumi's loom under a striped sail (her spot moved there);
  reed sand screens on the windward side with sand banked on them; Hesk's flag poles along the yacht routes, a drift
  across the dig route, his yacht stop (NO FERRY chalked on it once the ferry is taken). The ground is shaped there
  (flat round the cool room, the dune bank, the drift); the island's scatter keeps out without moving anything else.
- The Wind-Catcher (src/game/story/kesh.js, a layer the director asks after the chapter, like life.js): turn the
  cowl into the wind with Lumi's screen; without it sand pours in; Lumi trusts him with her work only after the pump;
  Brosk pays five kashes (owed until picked up); a drink at the door heals; Sani moves into the doorway. Lines follow
  the pump, the steam and the vent; chapter 5's jar-and-shovel errand with Brosk comes first.
- tests/desert-life.mjs (24 checks, ALL PASSED): both orders by input (the stair walked by the planner), Save & quit →
  Continue twice, chapter 4/5 lines, the main path's people unchanged. Regression: chapter4, chapter5, townlife,
  workshop, stability, resume, shipfiles rc 0. Evidence: captures/desert-ty/, QA.md.
- Not verified: the look on a GPU and the feel by hand.

## Session: the reviews' fixes for both twelve-years-on sets (0.25.1; TY-1-FIX)
- REV-TY-1 (0.24.0) and REV-TY-2 (0.25.0) found readability, collision, save and story-logic defects; all fixed and
  checked by input where the harness can (QA.md "REV-TY-1/REV-TY-2 fixes"; captures/townlife/).
- Places: Nell's shop moved off the harbour path, open toward it (the bench, Nell and the coupler's glow in view from
  the path and the quay); the garden's beds off the lane; Arthur's bench to the west wall of his room (in the house
  camera's view). The island's scatter keeps out of these places (townlife.js lifeClear) without changing the rest
  of the island.
- The pump: the handle points to the lane with a crossbar grip, the pipe dives under the pump's footpath, and a new
  two-handed 'pump' pose (rig.js) meets the grip (hands within 0.15 m through the stroke); the pipe, posts, valve box
  are solid, the trough and the beds not standable.
- Story state shows: Zoé's board (all waiting → Bug Street green, harbour red → her chalk ring after the plan) and the
  meter's needle and note; the boat box waits for chapter 2; the coupler is Nell's (ordered through Xil) and Odile
  clears its papers.
- Rewards tossed as pickups are owed until picked up (ChapterBase.reward/settleOwed; Game.collect): Bram's clover,
  Nell's payment, Baldino's coin survive a save made before pickup.
- The Test Pair: no state change after success from a late press; it syncs only with the drip open; it waits for
  Baldino's hello; the cradle and the hoist's bars are solid; Ilo's crate gives its bonus after its look; chapter 10's
  Baldino lines agree with what the pair taught (text only).
- Tests: townlife 30 checks (was 18; the clover check is real now), workshop 31 (was 25; QA said 26), chapter10's
  drone step made robust (3/3 runs done, no assist), tests honour GAME_URL. Regression: townlife, workshop, chapter2,
  chapter8, chapter10 ×3, stability, resume, house, opening all rc 0.
- Not verified: GPU look; the feel of the step to the pump's grip by hand.

## Session: twelve years on, second set — Baldino's workshop (0.25.0)
- The user's brief, step 4: show years of invention, maintenance and unfinished experiments in Baldino's workshop;
  introduce the network's technology early with its limits; no unexplained gadgets (docs/TWELVE_YEARS.md).
- The room (src/game/workshoplife.js): the relay table (two bench relays of the chapter-10 model, a coupler under a
  drip can, a lever, a SYNC strip, trays in rows, a drawing in two hands), the old hoist by the flying machine's
  nose, the stove fan with brass, wood and tin blades, the tea experiment (lid in the vault, tea up the wall, "TEA:
  BY HAND"), the thunder box stopping a toy mill (the chapter-10 pulse tool before it was ready), Ilo's perch and a
  shuttle-yard crate. Ilo (an Esmer engineer) is mentioned, not seen.
- The Test Pair (src/game/story/workshop.js, a layer the director asks after the chapter, like life.js): optional
  in chapter 3; relays talk by sight (crank the hoist), couplers overheat (open the drip); ten seconds together →
  the pair keeps talking, Baldino pays a coin worth 5. Baldino's idle lines show his years, one at a time. Chapter
  10 recalls the rules (one conditional line in network.js); the thunder box leaves the shelf once Twinsen has the
  pulse tool.
- tests/workshop.mjs (ALL PASSED, 26 checks): by input, both failures, recovery, saves in each state, the main
  path unchanged, chapter 10. Regression: chapter2 (log identical to 0.24.0's), townlife, stability, resume,
  shipfiles, zoe-resume pass; chapter10 passed once, then its bore-drone step failed 3 times, as it did on the
  unchanged 0.24.0 build at the same time (unseeded enemy randomness; QA.md). Evidence: captures/workshop/, QA.md.
- Not verified: the look on a GPU and the feel by hand. Chapter 10's stations still don't make line of sight or
  overheating playable (taught and remembered only).

## Session: twelve years on, first set (0.24.0)
- The user's brief: make the world feel twelve years older than LBA2, separating the originals' history from the
  sequel's inventions (docs/TWELVE_YEARS.md), starting with the home, the neighbourhood and the harbour.
- The house (src/game/homelife.js): Zoé's work corner (she keeps the Water Office's connection register; her
  board of green and red pins), Arthur's workbench (a paddle boat to beat Lulu's), the old travel trunk, the mend
  box, the heat meter with Zoé's note, a mended chair, an Esmer lamp. Short looks that change with the story.
- Outdoors (src/game/townlife.js) and their people (src/game/story/life.js, a layer the director asks after the
  chapter): The Old Pump (Bram, new; Arthur borrowed the pliers) and the harbour's trade with The Mislabelled
  Shipment (Officer Odile and Nell, new; Xil's "soup pot" is a heat coupler: it overheats and needs water, the
  limit Baldino's network has later). Three new characters built in Blender (cast_poly.py).
- tests/townlife.mjs (ALL PASSED): both stories by input in both orders, a trip and restart, save & Continue
  mid-story (heating coupler comes back cold), lines before/after story events (prologue, chapter 2, after the
  plan, the evacuation), walking to every new place. Regression: see QA.md.
- Not verified: the look on a GPU and the feel by hand.

## Session: Zeelich's islands and Citadel Spaceport (0.23.0)
- The user: rebuild Zeelich's maps — in addition to the current Zeelich (at most rename). Seven islands after the
  original's (Otringal, Knartas, Mosquibee, Celebration, Under Celebration, the CX islet, the Platform) are new
  outdoor regions (src/game/zislands.js) built from numbers measured from the user's files (assets/lba2/islands,
  ASSET_MANIFEST.md): the ground heights and where each object stood with its size; our pieces drawn there.
- The user (mid-session): a spaceport on Twinsun for flights to Zeelich, twelve years after LBA2. Citadel Spaceport
  (src/game/spaceport.js): a platform on stilts in the bay east of the town, a footbridge, terminal, tower, board,
  shuttle. Flights (src/game/story/islands.js) from chapter 4: any shuttle (spaceport, Zeelich's pad, each island)
  to any of the others; grounded before (a note; the story's ferry is unchanged).
- Found by the tests and fixed before commit: the islands' coast was a cliff face down to the waterline (he slid
  there, was held, respawned with damage until dead) → a low shore ring at −0.5 and blocks at high brinks; objects
  on steep slopes held him in a slide → no blocks there; the bot's paths through slopes too steep to climb → the
  walkable-area analysis skips steep ground; Mosquibee's shuttle landed on a bare plateau → the main area counts the
  objects near it.
- Tests: tests/zislands.mjs (all built; shuttle by input from Zeelich in chapter 4, none before; walking Otringal; 8
  directions at the sea from every spawn; a trap audit from every sample point of each island; island → island →
  Zeelich; save & quit → Continue on an island; holomap), tests/spaceport.mjs (town → bridge → shuttle by input;
  grounded before chapter 4; the board; the railings; spaceport → Zeelich → spaceport → Otringal).
- Not verified: how it looks on a GPU and plays by hand; only software-rendered screenshots were checked.

## Session: stabilization and regression pass (0.22.1)
- The user asked for a complete stabilization pass on the current build: every system checked, defects reproduced,
  root-caused, fixed with a regression test, and the whole main story played through with player inputs (no
  teleports or flags as proof). Records: docs/lba3-production/QA.md (defects D1–D17 with reproduction, cause, fix,
  retest; the feature checklist; the story table), STATE.md, BACKLOG.md, STORY_MAP.md.
- A player-input harness (tests/lib/player.js: A* over the game's own collision, Classic tank steering, E/F/Space/
  X/K, fighting, stealth, jumps with air braking, the old mill's climb) and a segment runner (tests/lib/seg.mjs:
  one step per evaluate, the game-over Retry as a player does it, saves through Esc → Save & quit). Segments
  tests/playthrough/01–14 play new game → The End → Keep Exploring.
- Blockers found by playing and fixed (the LOGIC chapter tests teleport or set flags and missed them all): the
  house's floor seam (D1), Zoé's save resume (D5), the Desert Island pier's end (D10), the hangar door's NaN position
  (D11), the Hamalayi lift's top (D12), chapter 8's lever inside a tank (D13), Zoé's run starting inside the barrier
  ring (D14), the control room's missing door (D15), Continue cutting a scene the load began (D16, D17). Also: the
  refused-exit loop (D2), the waterline slide trap (D3), the death timer in game time (D4), the cliff-brink fall
  loop (D6), menus at 640×360 (D7), the music log (D8), LBA1's room layouts missing from the desktop build (D9).
- New regression tests: tests/stability.mjs (D1–D4, D6, D10–D15), tests/zoe-resume.mjs, tests/resume.mjs (D16–D17),
  tests/shipfiles.mjs (D9), tests/menus.mjs, crosssystem.mjs, display.mjs, audio.mjs, longsession.mjs.
- The packaged Linux app passes desktop/test-desktop.mjs (window, app://, new game, save, relaunch → Continue, Quit).
- Not verified here: GPU frame rate, sound by ear, gamepad/touch, Windows/Mac installers (CI). Fights the bot
  couldn't win were finished by logged ISO assists (QA.md: human-playtest items).

## Session: weapons and gadgets (0.28.0, WPN-1)
- The user asked for weapons and items/gadgets. LBA2's, in our style (models in code, synthesised sounds, LBA2's
  numbers and descriptions where it had them): the blowgun and its Blowtron upgrade, the Esmer laser pistol, the
  Wannie glove and the lightning spell on the weapon wheel's diagonals; the Nitro-Meca-Penguin, the protection ward,
  Arthur's conch and a brass lantern used from the inventory (E). src/game/weapons.js, gadgets.js, story/arsenal.js,
  text/arsenal.js; small hooks in combat.js, hud.js, inventory.js, main.js, story/index.js and one line in
  actors.js (Hero.damage: the ward). docs/COMBAT.md "The arsenal" has every number and where each is earned.
- Earned in the world: Pippa's stall (ch. 2), Nara's case on Zeelich's street (ch. 3, the Blowtron from ch. 6),
  Arthur lends his conch, Rector Hougo's pearl of incandescence → Bersimon's lightning (ch. 4), Ker'aooc's ward
  (20 kashes), the old Wannie mine on Under Celebration (the glove; the lantern shows it), a gap in the house
  cellar's foundations (the lantern) and its boarded coal chute (the glove), a hollow boulder in the crystal
  galleries (ch. 11).
- Save format 4: hero.arms; a format-3 save continues with an empty arsenal (its backup kept).
- No jetpack: the story bible keeps flight out of this game; a confined jetpack would be a tool no chapter uses.
- Tests: tests/arsenal.mjs; regression set rerun (QA.md). Not verified: feel by hand, sounds by ear, GPU.
## Session: all of Zeelich and the travel network (ZL-ALL + CONNECT; after SD-1/SD-2)
- The original's remaining island files identified from their numbers (tools/lba2-islands.py, numbers only):
  SCENE.HQR's scenes name an island and a start point, and each start fits one file's ground or decks. ASCENCE is a
  Zeelich place of its own (scene 121, numbered among the Platform's): a cargo lift dock on stilts → **the Lift Dock**,
  a new region built on its decks (our landing deck, stairs, rails, the lift's working cage). CELEBRA2 is Celebration
  later (a pit and a 21 m figure) → Celebration keeps CELEBRAT's ground and gains the figure (ours: a robed stone
  figure), the festival round its feet. CITABAU = Citadel again; EMERAUDE/MOON = the Emerald Moon (not wanted).
- Three places of our own (src/game/zplaces.js; generated layouts in the same numbers form): Tralu Rock (an Esmer
  trading post: weigh-beam market on the crown, crane over the quay shelf, skiffs, a ramp round the south face), the
  Nectar Orchard (blossom trees in contour rows, hives, press house, the cloud-catcher on the crown), the Old Watch
  (a crescent ridge: the broken watchtower and its fallen dome, columns, a telescope). Each: a landmark the arrival
  faces, dressing by the planner, a giver.
- Travel (src/game/travel.js, story/islands.js): Zeelich is a separate planet — Citadel Spaceport ⇄ Zeelich Spaceport
  (ours: a deck off the terminal island's south shore) by spaceship only; Esmer shuttles between Zeelich's 12 places
  only; on Twinsun the ferry (harbour ⇄ Desert Island's pier) and gliders (fields on Citadel's plateau, Desert
  Island's beach, the Hamalayi foothills). Routes open with their chapters; all after the story. Boards at every
  point name its destinations (Citadel's departures board: ZEELICH SPACEPORT only).
- The Holomap per planet (VP-9): the region's own map with his dot and the travel points; an inset of the planet with
  its places and the open links.
- Tests: tests/travel.mjs (new: gates, the travel matrix by input, menus, holomap), tests/zislands.mjs (11 places,
  landmarks walked, givers), tests/spaceport.mjs (menus). Evidence: docs/lba3-visual/evidence/ZL-ALL/.
- Not verified: the look on a GPU, the feel by hand; draw counts are SwiftShader CPU-side counts.

## Session: REV-TY-5 fixes (0.28.1, TY-5-FIX)
- The Second Bake: the ball way plays street lines (Twinsen sees the heat box's lamp turn green; Snuff, never asked,
  asks about his ball, not her roof, also after a Continue from a save made while the crate fell); asked again
  before the bake is done, Snuff and Bzizz give the phase's news first (new short lines for Bzizz by phase).
- The talk prompt (src/main.js findInteractable): no Talk for a person more than 1.8 m below Twinsen (Snuff from her
  roof); a room search under his feet or less squarely in front of him gives way to a person he faces within
  2.2 m (Zoé at the lighthouse dials).
- tests/chapter10.mjs: talks from the first free spot round a person whose prompt is theirs, and checks the dial vs
  Zoé case; tests/zeelich-life.mjs: 7 new checks (all fail on 31deb6c).
- N2 (the pump's camera from the south) not changed: the camera has no per-place zones.
- Tests: zeelich-life 38/38, chapter10 DONE ×3 + forced ASSISTED (exit 2), townlife, workshop, stability, chapter2,
  chapter9, prologue, chapter1, chapter3, chapter4, desert-life (QA.md). Not verified: chapters 5–8 and 11+ after
  the talk change, feel by hand, GPU.
