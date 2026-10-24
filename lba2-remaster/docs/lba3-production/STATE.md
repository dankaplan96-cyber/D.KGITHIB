# STATE (production checkpoint)

Update before a handoff or a session limit. Do not mark a task done twice after resuming: check BACKLOG.md first.

## Build
- Game version 0.30.0 (desktop/package.json; 0.30.0 = EQ-1 Baldino's hop-pack; 0.26.1 = TY-3-FIX, 0.27.0 = TY-4 Zeelich twelve years on, 0.28.0 = WPN-1 weapons and gadgets, 0.28.1 = TY-5-FIX; was 0.24.0 when this section was written) on branch `ccr-adf00ea7-37ebl3`: the stabilization pass (0.22.1,
  D1–D18, see QA.md), then Zeelich's islands and Citadel Spaceport.
- Milestone (PRODUCTION.md): 1 — Stabilize.

## Completed and tested (this pass)
- D1–D9 fixed with regression tests (QA.md "Defects"): house floor seam (blocker), refused-exit loop, waterline
  slide trap, death timer in game time, Zoé's save resume (blocker), cliff-brink death loop, menus at 640×360,
  unbounded music log, LBA1 room layouts missing from the desktop/published build.
- Automated: tests/menus, stability, zoe-resume, crosssystem, longsession, display, audio, transitions,
  shipfiles; opening; chapter LOGIC tests 2–10 (see QA.md for the last results and dates).
- Packaged app: Linux unpacked build from desktop/ (`node copy-game.mjs && npx electron-builder --linux dir`),
  `xvfb-run -a node desktop/test-desktop.mjs release/linux-unpacked/lba3-the-awakening` ALL PASSED (window,
  app://, bundled font, new game + opening + save, relaunch → Continue, Quit) after D9; no 404s.
- Player-input playthrough (tests/playthrough/, tests/lib/seg.mjs): prologue (01–02), chapter 2 (03–05) and
  chapter 3 (06, to chapter 4) pass by input, each segment continuing from the previous one's real save.
  One exception, logged: the Zeelich depot fight (2 drones, an armour-2 Grobo guard, a dog, entered with 6/10 HP)
  — the bot can't win it; below 3 HP it stops and an ISO assist beats the rest (QA.md).

## Unfinished
- Playthrough chapters 4–12 + epilogue (07–14): running/next (see QA.md "Story and progression").
- Final run of the whole automated suite on the final state; QA.md results table refresh.
- PROGRESS.md / TASKS.md / NEXT_ACTION.md entries for the pass.

## Blockers (need the user or hardware)
- GPU frame rate / 60 FPS gate: no GPU here (software rendering only). Needs the in-game benchmark from the
  user's PC (pause → Benchmark).
- Audio by ear, gamepad and touch feel: human checks.
- Combat balance of the Zeelich depot fight at low HP: a human playtest (the bot's combat is weaker than a
  player's; not changed).
- Windows/Mac installers: built by the GitHub Actions workflow on push; not run here.

## Tools
- `python3 -m http.server 8123` in lba2-remaster (run detached: `setsid nohup ... &`).
- Playwright + SwiftShader from /opt/node-tools; xvfb-run + electron for the desktop test.
- tests/lib/player.js (input harness), tests/lib/seg.mjs (segment runner; LOAD/KEEP/NORETRY/SHOT env),
  tests/lib/try.mjs (scratch page scripts).

## Open from the stabilization pass
- Final end-to-end rerun on the last code reached chapter 2's last segment (05) and stopped: Zoé died after finding the
  plan (cause not identified) and, after the game-over Retry, talking to Zoé at the gate gave a 2-line reply instead of
  restarting her segment. Not reproduced or diagnosed yet (the user moved the work to the Zeelich islands). The same
  resume through Esc → Save & quit → Continue passes (tests/zoe-resume.mjs).

## Done after the pass (0.23.0)
- Zeelich's seven islands as new regions (src/game/zislands.js; assets/lba2/islands, numbers only) and Citadel
  Spaceport (src/game/spaceport.js, the user's request); Esmer shuttle flights from chapter 4
  (src/game/story/islands.js). tests/zislands.mjs and tests/spaceport.mjs pass; regression set rerun (QA.md).

## Done after the pass (0.24.0–0.27.0)
- Twelve years on (docs/TWELVE_YEARS.md): the first set (house, The Old Pump, the harbour; 0.24.0), Baldino's workshop
  (0.25.0), the reviews' fixes (0.25.1), Desert Island's Kesh and The Wind-Catcher (0.26.0, TY-3: tests/desert-life.mjs,
  captures/desert-ty/; status REVIEW), Zeelich's street and The Second Bake (0.27.0, TY-4: tests/zeelich-life.mjs,
  captures/zeelich-ty/; status REVIEW).

## Done after the pass (0.28.0)
- WPN-1 weapons and gadgets (the user's request): blowgun → Blowtron, the Esmer laser pistol, the Wannie glove, the
  lightning spell; the meca-penguin, the protection ward, Arthur's conch, the lantern; earned at Pippa's stall, Nara's
  case on Zeelich, from Arthur, the School of Magic and Bersimon, in the old Wannie mine on Under Celebration and in
  the house cellar (src/game/weapons.js, gadgets.js, story/arsenal.js). Save format 4 (hero.arms; format 3 migrates).
  tests/arsenal.mjs; QA.md "Weapons and gadgets (WPN-1)"; status REVIEW. No jetpack (no flight in the story bible).
## Done after (ZL-ALL + CONNECT; status REVIEW)
- All of Zeelich: the original's remaining island files identified from numbers (tools/lba2-islands.py: ASCENCE → the
  Lift Dock, a new deck region; CELEBRA2 → Celebration's risen figure; CITABAU = Citadel again; EMERAUDE/MOON = the
  Emerald Moon, not wanted); three places of our own (src/game/zplaces.js: Tralu Rock, the Nectar Orchard, the Old
  Watch), each with a landmark, dressing and a giver.
- Travel (src/game/travel.js): Zeelich separate — Citadel Spaceport ⇄ Zeelich Spaceport (ours) by spaceship only;
  Esmer shuttles between Zeelich's 12 places only; on Twinsun the ferry and three glider fields; gates by chapter.
  The Holomap per planet with his dot (VP-9). tests/travel.mjs, tests/zislands.mjs, tests/spaceport.mjs.
## Done after (PLANET-1, 0.29.2; status REVIEW)
- The story's crossings to Zeelich are spaceship flights (the user's decision): chapter 2 → 3 the project's ship from
  Citadel Spaceport (Doran, Baldino's start code; arrival on Zeelich Spaceport's deck), chapter 3 → 4 home by ship
  then the ferry south, chapter 8 → 9 the project ships board at the spaceport, chapter 10 the spaceship between the
  planets and Hesk's glider on Twinsun only. The harbour's timetable and sign: Twinsun sailings only. Vesk's beam lifts
  him to his ship. tests/travel.mjs PLANET-1 checks; evidence docs/lba3-visual/evidence/PLANET-1/.

## Done after the pass (0.28.1)
- TY-5-FIX (REV-TY-5's items): the ball way keeps street lines (also after a Continue from a mid-fall save); Snuff is
  not offered from her roof (a generic talk limit: nobody more than 1.8 m below Twinsen, src/main.js TALK_ABOVE);
  asked again, Snuff and Bzizz follow the phase; a room search under his feet no longer takes the prompt from
  a person he faces (the lighthouse dial vs Zoé), and chapter10.mjs no longer depends on Zoé's facing (DONE ×3, forced
  ASSISTED exit 2). N2 (the pump's camera) left open: no camera zones exist. QA.md "REV-TY-5 fixes"; status REVIEW.

## PERF-IGPU (status REVIEW, branch worktree-agent-a079faebfb0eeef59)
- Black frames from the automatic resolution fixed (fixed canvas and targets; tests/dynres.mjs). Precompile into the
  composer's target, shadow depth programs warmed, preset changes wait for their shaders; Low preset reworked and
  auto-picked on Vega/Intel HD-UHD; trees/rocks batched, static shadow casters batched per cell, Kit colour merge.
  Numbers: QA.md "Performance"; VISUAL_REMASTER "Performance on integrated GPUs".
- Open: town.js/island.js merges (VP-10's files; VISUAL_REMASTER "Remaining" 3) for Medium street ≤ 300; the
  user's benchmark on the laptop (GPU frame rate, startup on D3D11) is the judge.

## PERF-2 (status REVIEW; worktree commit on 533d0b5)
- Why the laptop's bench said 542 calls where perfbudget said ~290: the user plays with the free camera, and the
  0.31.0 street route turned only the free orbit — a different view per camera setting (reproduced here: Low 478 /
  Medium 527 calls, 693k / 1086k triangles vs the laptop's 477 / 542, 697k / 1091k). The bench now uses the free orbit
  from a fixed heading on every route (the player's camera is restored) and reports p95 calls, shadow-pass calls and
  GPU-level draws (multi-draw sub-draws).
- Street calls Low/Medium/High 478/527/602 → 292/350/438 (p95 640/732/837 → 347/444/550); triangles +5–7 %.
  World matrices only for shown objects (7 000 of 9 500 sat under hidden rooms/regions), actors of other areas and
  sub-pixel actor parts out of the frame, blob shadows instanced, the town merged across houses with colours,
  textures and roughness/metalness folded into vertex attributes (merge.js retex), harbour/original props/heat posts/
  city dressing folded, terrain tiles 70 cells, buried rising stones hidden until they rise.
- Transitions: Game.warmScene compiled the whole scene at every door (70–130 ms main thread); once per scene/light state now.
- Door parts: nothing within 16 m of Twinsen is culled for size (a brass part by his own door was, at Low/Medium);
  tests/doorcull.mjs.
- Open: Low ≤ 200 / Medium ≤ 250 not reached (left: grass/flower tiles, the harbour's instanced props, NPC bodies and
  eyes — one draw per distinct texture or instanced kind). GPU time and real stalls: the user's benchmark.
- For the frame-pacing engineer (block 6): Renderer.render() now runs `pre` (FarCull + BlobBatch hide), the
  shown-only world-matrix update (engine/drawcull.js updateShownWorld; `renderer.shownOnly = false` turns it off for
  A/B), the composer, then `post` (restore). The bench's per-frame counters live in Perf (renderBufferDirect is
  wrapped once). warmScene's cache key: room, quality, visual, shadow type, visible lights by type; it re-warms when
  any new program was compiled since. The transition route's outdoor view is now heavier (free orbit over the town).

## Done after (0.30.0, EQ-1; status REVIEW)
- Baldino's hop-pack (src/game/jetpack.js): from chapter 10 on its peg by his workshop door; Athletic, jump and hold;
  one storey (2.4 m over the take-off ground and the ground under him), 2.2 s of thrust refilled on firm ground, needs
  ground within ~3 m under it (never over a drop or the sea), open sky only, feet must clear a fence, no rising into
  anything overhead, doors wait until he lands, a soft-landing cushion. Baldino's test step behind his workshop (a tin:
  a clover and 10 kashes); the old mill's stones two at a time (its relay still needs the brake). Saves never hold a
  position in the air; a save over the sea or inside something loads at the region's spawn. tests/jetpack.mjs; QA.md
  "Baldino's hop-pack (EQ-1)"; STORY_BIBLE.md "Baldino's hop-pack".

## Done after (MAP-1; status REVIEW)
- The Holomap and the minimap drawn from the built world (src/game/mapdraw.js; the user: "the map isn't detailed enough and it's
  hard to find your way with it"): terrain look and heights, coast, cliffs, paths and streets from the splats, every brick as floor or
  building, trees, place names from each region's own fields, Twinsen's facing, objective stars, doors used (flags.mapDoors), travel
  points, compass and scale; zoom/pan by mouse, keys, pad and touch; indoors the room's name and plan; a minimap setting (north-up /
  turns with camera). tests/holomap.mjs; evidence docs/lba3-production/reviews/MAP-1/. The map follows WORLD-SHAPE's changes by itself.
- Hooks for others: chapters 2–12 give no objective markers (story/*.js markers()), so the map can mark an objective only in the prologue
  and chapter 1; invisible blockers are not flagged on colliders, so a long invisible wall reads as a wall/floor on the map.

## Done after (VP-10; status REVIEW, branch worktree-agent-a9f2b2a9c69e4dcf2)
- Scenery between the camera and Twinsen as in LBA2 (the user: "like the original game"): nothing fades; the houses, the
  fortress, the project buildings, the spaceport terminal/dome and Nell's lean-to give the camera their shapes
  (src/engine/occlude.js) and LBA2's SearchCameraPos lifts the view over them (1997 look: on each cut; remaster: on top
  of CTRL-1's follow, eased). The silhouette now reads over every roof (sky cyan at 0.5). tests/occluders.mjs: a house
  he stands at never vanishes; behind one he is always in view or drawn by the silhouette. PERF-IGPU's open item done:
  town.js/island.js merges, Medium street 324 → 274. Evidence docs/lba3-visual/evidence/VP-10/.

## Done after (VOICE-1; status REVIEW)
- Character voices (the user: "the voices are too similar, and the gibberish isn't pleasant"): src/engine/voice.js rewritten. Each race has
  its own colour and each of the 56 named speakers a fixed seed and own pitch, range, formants, roll-off, breath, nasality, rate, legato,
  swing, contour and vibrato; a soft harmonic source through three vowel formants with soft attacks and releases, no saw/square; the same
  line always gets the same melody. Two filter chains pooled per audio context (4 nodes a line after the first, was 108); the text skip
  (hud.js) and a cinematic pause (cinematic.js) hush the voice. tests/voices.mjs (offline renders + in-game analyser), tools/voice-render.mjs
  (WAV A/B and measurements), evidence docs/lba3-production/reviews/VOICE-1/, QA.md "Character voices (VOICE-1)".
- Open: the voices by ear (pleasantness, recognisability) — nobody can listen here. With OPEN-2 merged, the opening's subtitle voices use
  the same Babble API (start/chars/stop), unchanged. Baldino's voice already has a Grobo colour (PRODUCTION.md block 4: Baldino as a Grobo).
## Done after (WORLD-SHAPE; status REVIEW)
- The user: "the map still doesn't look like the original game (LBA2) in structure and size". A measured audit of
  every region against the original islands (docs/lba3-production/reviews/WORLD-SHAPE/AUDIT.md): Citadel's coast and
  houses are the original's (land IoU 0.92) but its terraces stand 1–2 m low; Zeelich's islands are faithful
  (0.89–0.95); Desert Island was an invented round island (IoU 0.52, 71 % of the original's land) and the Hamalayi a
  square box (93 % of its cliff edge axis-aligned).
- Fixed: Desert Island's coast and high ground now follow the original (src/game/desert-layout.js, numbers only;
  IoU 0.93, 33,057 of 34,394 m²; places and tracks unmoved; soft-lock flood fill); the Hamalayi's ring of peaks,
  terraces and gorge made organic (38 % of the cliff edge axis-aligned, was 93 %), its levels and story spots unchanged.
- Open (AUDIT.md): Citadel's terraces to the original's shelves — built and measured in block 3 (plateau-top IoU
  0.21 → 0.71) but reverted: tests/travel.mjs (chapter 10, the walk to Hesk) and tests/occluders.mjs (b) failed with
  it; the exact change is in AUDIT.md. The harbour basin's straight cut. Walking speed is LBA2's since CTRL-1; MAP-1's
  map follows the new Desert outline by itself.
## Done after (SRC-2; status REVIEW)
- **Baldino as in LBA2 (the user).** He is identified in the user's files with certainty: body 139, File3D 93.
  - Its scene objects give Twinsen the car part, the portable radio and the Proto-Pack news, and ask for gazogem for
    "our vessel".
  - Measured (character-review §16): a short, broad Grobo, 1.78 m. A big grey-violet head carried low, a trunk curling
    out to the belt, great flat ears, goggles over the eyes, a white chevron collar, an olive pear-shaped smock over a
    grey chest, brown trousers on square legs set wide apart, thin arms with round grey hands.
- **Rebuilt as Zoé was** (`tools/blender/baldino_poly.py` → `assets/poly/baldino.json`), on his own skeleton (LOOKS.baldino:
  the original's joints, ear and trunk bones).
  - rig.js uses his walk's cycle length (1.3 m), his idle's 1.6 s and a talk loop keyed to ANIM 718: fists on the hips,
    arms wide, arms forward with a nod.
  - The ears waft, flap and swing, and the trunk sways.
  - His soft-contact radius is 0.6 m.
  - Twelve years on: no change (STORY_BIBLE names none).
  - `cast_poly.py` no longer rebuilds him.
- **Every scene he is in was checked from the play camera, before and after, with the Talk/Take prompts:** chapter 3's
  workshop, chapter 9's council, chapter 10's workshop and EQ-1's peg. Chapter 1 has only his radio voice; the opening
  has no Baldino.
- **The Dino-Fly (REV-V-1 D1/D2 again):**
  - The wings fold along the flanks (each membrane panel in the flank's slope, the forearm's turned over).
  - He looks at Twinsen with one eye and the head bowed, so the play camera sees the head's length, not a tube.
  - The muzzle's grey is subtler and its tip rounder.
- **Zoé (the user's extra item):** no longer pregnant. LBA2's body 26 is expecting. `zoe_poly.py` now builds her without
  the belly and with a natural waist (the measured figure kept as `ZOE_BODY_LBA2`, `ZOE_LBA2=1`). She was checked in
  the opening, at home and as the player.
- **Evidence:** docs/lba3-visual/evidence/SRC-2/.
- **Regressions** (on the tree merged with a1ff730; one browser at a time, its own server): workshop, chapter1,
  chapter2, chapter10 (CHAPTER 10 DONE), jetpack, house, stability and opening ALL PASSED.
  - zoe-resume failed once (Zoé caught while sneaking out, under a machine load average of ~20), then passed on a
    rerun. It also passes on the same tree with the old Zoé, so the failure was a timing flake, not the new mesh.
- **Open:**
  - An independent visual review of SRC-2.
  - His own clips could replace the keyed talk/idle if the animator wants exact curves.
  - The trunk can brush Twinsen's front when he presses straight into him.
  - Next candidates for SRC: Bersimon (body 111) and the School of Magic master (123), moderate gaps; Joe the Elf (110?)
    needs identification first.

## Done after (ANIM-DEATH; status REVIEW)
- The user: "when a character dies the animation doesn't work well." Every enemy's knock-out now runs through one controller
  (src/game/death.js; humanoid keys KO_HUMAN in src/engine/rig.js; rules and timings in docs/COMBAT.md "Knock-outs"): a hit
  reaction, a fall with weight (gravity in the air, on slopes and stairs), impact and a small bounce, a short rest, LBA's blink and a
  puff of stars, then out of the scene; the bonus leaves the body at the impact and lands on the ground; the enemy leaves every target
  list on the blow (CTRL-1's auto-aim unchanged). Before: guards lay with arms and rifle sticking up and vanished in a frame, mites
  flipped through the floor, drones and the guardian sank half into it, a sentry dropped 20 cm in a frame, a dog's legs snapped,
  nothing fell when killed in the air (it floated), and the bonus popped out before the fall.
- tests/deaths.mjs (160 checks): per type pose continuity, ground contact, removal, the bonus, listeners; 30/60/20 fps; mid-air; slope;
  stairs; walls; pause, dialogue, scene change, cast change, reload; a real auto-aimed ball kill. Evidence:
  docs/lba3-visual/evidence/ANIM-DEATH/. Open for the character artist: the long-coat guard's hem stays flared when he lies down
  (his feet ~0.35 m off the ground; CHAR-OPEN: the coat now lies on the legs; the lift is the back fall's keys, see below)
  and the fat trooper's standing pose sinks 0.2 m into the ground.

## Done after (CHAR-OPEN, block 6; status REVIEW)
- OPEN-3's model leftovers, each fixed, re-captured and committed on its own (character artist; evidence and capture
  scripts in docs/lba3-production/reviews/CHAR-OPEN/, QA.md "CHAR-OPEN", character-review §17):
  - #11 Zoé's bun seated on the skull and carried by the head bone (it rode tail0..2 and floated in profile).
  - #28a Twinsen's tunic: a body with flat shoulders and two wide sleeves of its own instead of LBA2's one-shell cape;
    his arms and the opening's shrug (53.0) read, the windup/charge no longer tear the cloth. Blue tunic, ponytail,
    medallion, robe kept; armSpread 0.3 unchanged.
  - #28b Zoé's arms shaped and slim (were 6 → 4 cm tubes); armSpread 0.3 → 0.08 (they hang at her sides); opening.js's
    three bends on her arms brought in by the same 0.22 (her hand at the tap and in the stream within 1 cm of before).
  - #4 the guard's (vguard) coat stays on his legs when knocked out: half its skirt rides the thighs toward the hem
    (cast_poly.py `coatLegs`), and rig.js's knock-out cloth lays the top panel and the sides on the legs.
- Counts: Twinsen 2372 → 2572 triangles, Zoé 4434 → 4646, the guard 1954; one material each, no textures. Skeletons,
  bone names, hierarchy, bind transforms and sockets unchanged.
- Tests (own server, one browser at a time): opening ALL PASSED (24), deaths ALL PASSED (160), stability ALL PASSED (16), prologue to its end into chapter 1 (no errors), house ALL PASSED, jetpack ALL PASSED (48; Twinsen with the pack on the new tunic), combat ALL PASSED (59), zoe-resume ALL PASSED (5; Zoé as the player); reviews/CHAR-OPEN/tests.log.
- Open:
  - Independent visual review of CHAR-OPEN; a look by hand on a real GPU.
  - For the animator: KO_HUMAN.back (rig.js) holds a lying body 0.36 m off the floor on its heels (legR −0.25 with kneeR
    0.75 puts the right shin into the floor, so death.js rests it on the heel): a straighter right leg or a deeper hip
    flexion would let the back lie on the floor. The shrug (rig.js doGesture) has no shoulder lift (no clavicle bone):
    armOut + elbows + head tilt only; it now reads, a shoulder raise would be the animator's addition.
  - The fat trooper's standing pose sinking 0.2 m (ANIM-DEATH) was not in this block.

## Done after (ADV-2; status REVIEW)
- Chapter 4's first half (docs/lba3-team/ADVENTURE_DESIGN.md "ADV-2"): the wind-pump's fault is found, not told. Brosk blames
  the test bore's tremors; Sani hears two gears clack and one grind; at the tower each gust (3.4 s, Listen brings one at once)
  shows the jammed gear holding, shuddering and spitting sand while the sound ones rock. The ball frees it (a sound gear only
  rings; Sani's hint grows), then the water sprays from a pipe joint the tremors shook apart: push it home. Any order (the
  pump before Tarra asks). The dig's gate code is entered by the player on the keypad (1, 4, 7 worn; the notebook's order).
- Layout (desert.js, chapter 4's pump only): the gears are a gearbox across the tower's west face at 1.7 m (a thrown ball
  reaches ~2 m there: the old 3.6/5 m gears were out of reach), the tank moved south-east, one palm in the line left out.
- Small changes outside the owned files: story/kesh.js (Brosk and Sani take the pump lines from dig.js keshLines), engine/
  audio.js (two sounds: gearClack, grind), tests/playthrough/07-dig.mjs (the pump and keypad steps).
- Saves: same format; c4_gear1 keeps meaning the jammed gear; new flags c4_joint, c4_gearMiss, c4_brosk, c4_sani,
  c4_listened, c4_worn, c4_codeTries. Old format-3 saves from REV-TY-4 load and complete (tests/chapter4.mjs).
- Open: a first-time player's read of the gust and the keypad; sounds by ear; an independent review. Next adaptation: the
  research post's storm wait (ADVENTURE_DESIGN.md).

## Done after (FRAME-1, block 6; status REVIEW)
- Frame delivery measured per frame (CPU proxy on SwiftShader, loaded machine; uploads/garbage exact): QA.md "FRAME-1",
  evidence docs/lba3-visual/evidence/FRAME-1/ (framelog.mjs and the other probes are re-runnable).
- The door fade: #fade's stylesheet 0.6 s transition eased every per-frame write, so at 60 fps the screen was ~14 % dark
  when the room swapped; now drawn frame by frame and black at the swap (t clamped to 0.35). BUG-WALL-T fixed by the same.
- Geometry goes to the GPU behind the loading screen (Citadel) and in each scene's first black swap frame
  (Game.uploadGeometry: a render with the draw step off; nothing compiles); Doran's mooring line no longer makes a new
  geometry 30×/s. Settings → Frame rate limit (Off/60/30). Benchmark: stalls behind black, > 33 ms, longest frames.
- For others: per-frame garbage 200–630 KB (island.js materials shared by instanced + plain meshes make three switch
  programs every frame — no measured CPU gain from splitting; camera clearance, shadowcull, rig, physics); shadowcull
  rebuilds a 24 m cell when a batched piece first moves (shuttle, dogs).
- Not verifiable here: the laptop's GPU frame rate, real hitch sizes, input feel, the 30 fps limit's feel, fullscreen.
  The user's benchmark (pause → Benchmark → Copy) is the judge; what to send: the FRAME-1 report.

## Done after (RENDER-INV, block 7a; status REVIEW)
- The user's hypothesis checked: only the current area is drawn (main and shadow pass; every situation measured, three's
  source); every area is built at startup and kept in memory (not changed; plan R1 in the audit). The laptop (build
  122, plugged in) is GPU-bound: Medium street 18.6 ms GPU, High 25–36 ms.
- Fixed, look unchanged (pixel-exact in one-page checks): the map's background build in short slices once per displayed
  frame (F1/F2: no stutter after arriving somewhere); draw batches for every area (F8, src/engine/drawbatch.js:
  static pieces merged per 48 m cell and material, watched every frame); lamps skip their lighting where they give no
  light (F9); the MSAA target resolves colour only (F10). Folding colours into the batches is kept switchable, off
  (it would save another 20–40 calls on Citadel but changes up to 0.3 % of pixels).
- Laptop build 127 (interim): MSAA 2× is ~10 ms of Medium's 19 ms GPU on the street. Build 127 still resolved depth
  and stencil every frame (F10 came after); Settings → Edges (Smooth = MSAA default / Fast = FXAA) lets the user choose.
- The benchmark reports GPU time per pass, lamps lit, an arrival route and a breakdown that prices every option
  (shadow map kept, no MSAA, 8-bit target, depth resolve on, draw batches off, shadow filter basic, shadow map 512,
  FXAA instead of MSAA).
- Evidence: docs/lba3-performance/PERFORMANCE_AUDIT.md (RENDERING_AUDIT.md points to it), docs/lba3-visual/evidence/
  RENDER-INV/ (probes, results, suite logs). QA.md "RENDER-INV".
- Not verified: the laptop's GPU saving and whether Medium now holds 60 on the street (the next benchmark: pause →
  Benchmark → Copy, plugged in).

## Done after (CLAR-2 + HINTS-LESS, block 7a; status REVIEW)
- The stopped CLAR-2 WIP patch applied (its i18n conflicts resolved for R3's key-free hints), reviewed and finished.
  The objective panel shows the goal line only, ~5 s of play when the goal changes, in both HUDs; its steps (the
  "where"/"who" nudges) live in the pause menu, the Holomap and the journal. 28 toast call sites gone (110 → 82): every
  toast that restated a line, the objective or the world; "Game saved" at checkpoints; the place name after travel.
  Key hints follow the player's bindings. Prompts are verbs. Settings options 1–3 words (RENDER-INV's Edges row kept).
- HINTS-LESS: objectives and lines point to where/whom; methods come from a character, the world or asking again
  (ch1 bars/target, ch2 Baldino → Oku, the lighthouse dials and ch10's channel as riddles with the plain answer after a
  wrong try / when asked again, ch8 Gilbert's shelters); the core fight's instructions are a nudge after 40 s stuck
  (ChapterBase.nudge). No puzzle logic changed; ADV-2's chapter 4 kept.
- Evidence: tests/clarity.mjs (5 routes, base vs build: 91/1119 → 85/915 texts/chars put up, toasts 12/317 → 6/148),
  reviews/CLAR-2/ jpgs, json, logs; QA.md "CLAR-2 + HINTS-LESS". Tests that read #objective now read
  #pause-objective (the full objective).
- Note for the coordinator: port 8175 was held by another agent's server (a copy of the base in the shared scratchpad);
  this work was served on :8191 (build) and :8192 (base copy).
- Open (UI): inventory.js prints fixed keys ("I / J to close", "E: use"); needs input.label like the toasts.

## Next exact task
Independent review of EQ-1 (tests/jetpack.mjs, the feel by hand with a pad and touch); then: Independent reviews of TY-3 (Desert Island) and TY-4 (Zeelich's street); then twelve years on for the Hamalayi.

## Resume
Saves made through the game's own Save & quit live in the session scratchpad (not in the repo; regenerate by
running the segments in order from a new game: 01 → 14, each with KEEP=<file> and the next with LOAD=<file>).
