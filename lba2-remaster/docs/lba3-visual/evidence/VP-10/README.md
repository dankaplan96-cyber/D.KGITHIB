# VP-10: buildings and large objects between the camera and Twinsen, handled as in LBA2

The user's decision was "like the original game". Before this change, a town house between the camera and Twinsen
faded until it was drawn as nothing (colorWrite off), but it kept casting its shadow. On re-centre, a stacked
translucent veil showed for about 0.4 s (REV-V-1 D4). island.js's fortress, towers, gatehouse and project buildings
faded only to a 0.12 veil. Nell's lean-to roof at the customs post and the spaceport's terminal dome never faded
(D8).

## 1. What LBA2 does

### Primary source

The source is LBA2's own engine code: 2point21/lba2-classic, GPL-2.0, read for behaviour only, with no code copied.
The citations below are file:line at commit a256b0c.

**Exterior (the 3D island camera)**

- Nothing is faded, made see-through, outlined or cut away. Scenery is drawn with a Z-buffer, and Twinsen is
  depth-tested against it (`DrawRecover` → `ZBufBoxOverWrite2`, SOURCES/INTEXT.CPP:73-104).
- A scenery object is skipped only through `DEC_INVISIBLE`. That flag is set from a story variable, never from
  the camera (3DEXT/DECORS.CPP:125-153, 285-305; 3DEXT/LBA_EXT.H:118).
- LBA2 draws no silhouette or x-ray of Twinsen.
- The camera is still within a shot. It re-centres in these cases:
  - Twinsen's projected point leaves the box x 80–539, y 80…(bottom−50) (PERSO.CPP:1700).
  - The player presses Enter, which puts the camera behind him (PERSO.CPP:1438-1460).
  - Camera keys are used (PERSO.CPP:1679).
  - A scene starts or a game loads (OBJECT.CPP:1457; SAVEGAME.CPP:688-692).
  - A level designer's camera zone or a script forces a fixed camera (`SetZoneCamera`, OBJECT.CPP:6800-6852;
    `LM_CAMERA_CENTER`, GERELIFE.CPP:2335).
- Every automatic re-centre (`CameraCenter`, INTEXT.CPP:384-487) calls `SearchCameraPos`
  (3DEXT/MAPTOOLS.CPP:257-391). This function is LBA2's whole answer to occlusion:
  - It walks the sight line from Twinsen, starting 512 units above his feet, back toward the camera. It steps
    512 units at a time from 1000 units out to `VueDistance`.
  - If a step is under the terrain, the step is lifted to terrain + 200.
  - If a step is inside a scenery object's box (its ZV, via `TestZVDecors`), it is lifted to the box top + 200.
    A scripted object's box does the same (`TestCameraPosObjets`, EXTFUNC.CPP:434-468).
  - After a lift, `AlphaCam` (the pitch) is re-aimed from Twinsen through the lifted point, and later steps follow
    the steeper line.
  - The camera keeps its heading and its distance, so it rises over the obstacle.
  - When it has been lifted, the look-at point (`DISTANCE_VISEE` ahead) slides along the view. It shrinks with the
    sine of the pitch and reaches nothing when looking straight down.
  - `FlagCameraForcee` keeps that pitch until the next re-centre. The next re-centre restores the default pitch
    and distance first (PERSO.CPP:1726-1733), so a later shot can come back down.
- Between re-centres, nothing reacts if Twinsen walks behind something. He stays hidden until he reaches the edge
  of the screen. The level design and the camera zones keep this rare.

**Interiors (the isometric rooms)**

- These are true masking with no cutaway. After an actor is drawn, `DrawOverBrick` / `DrawOverBrick3` /
  `DrawOverBrickCage` redraw over him every grid brick that stands in front of him, using brick masks
  (GRILLE.CPP:563-730; INTEXT.CPP:79-125).
- A wall or column in front of Twinsen therefore hides him.
- The rooms are built so that the camera side has no tall walls. Grid swaps (GRM: `IncrustGrm`/`DesIncrustGrm`,
  GRILLE.CPP:1058-1150) come only from scripts (`LM_SET_GRM`, GERELIFE.CPP:1720) or saved state. They never come
  from the camera.

**Confidence**

- High for the mechanism. It is read directly from the shipped engine's source: the exterior search, the absence
  of any fade or x-ray, and interior brick masking.
- Medium for how often the original shows a raised camera in Citadel's actual scenes. We have not watched the
  original run for this task, and camera zones placed by hand in the scene data can override the automatic rule
  at particular spots.

### Secondary and community sources

These were searched on 2026-10-15/17 and add nothing beyond the code:

- Wikipedia's [Little Big Adventure 2](https://en.wikipedia.org/wiki/Little_Big_Adventure_2) confirms that LBA2
  has a 3D outdoor view and an isometric indoor view, and that the engine source was released under the GPL in
  October 2021.
- [lba-classic-doc](https://lba-classic-doc.readthedocs.io/) is the community engine documentation. It was not
  reachable from this container (DNS failure), so it is not used.
- [lba2remake](https://github.com/agrande/lba2remake) is a reimplementation and was not consulted for this rule.

Source files:

- https://github.com/2point21/lba2-classic/blob/main/SOURCES/3DEXT/MAPTOOLS.CPP
- https://github.com/2point21/lba2-classic/blob/main/SOURCES/INTEXT.CPP
- https://github.com/2point21/lba2-classic/blob/main/SOURCES/PERSO.CPP
- https://github.com/2point21/lba2-classic/blob/main/SOURCES/EXTFUNC.CPP
- https://github.com/2point21/lba2-classic/blob/main/SOURCES/3DEXT/DECORS.CPP
- https://github.com/2point21/lba2-classic/blob/main/SOURCES/GRILLE.CPP

The user's original data in the scratchpad was not needed. No numbers or bytes from it are used.

## 2. What we do now

`src/engine/occlude.js` is new. It ports `SearchCameraPos` over a registry of scenery volumes plus the terrain.
Each volume is one of two kinds:

- An oriented box, optionally with a roof slope across its local x.
- A solid of revolution, described by a radius → height profile.

`src/engine/camera.js` changes:

- Every new shot runs the search: start of a scene, Enter, Twinsen nearing the screen edge, or a change of view.
- The search keeps the heading and distance, and lifts the pitch until the sight line clears.
- The look-at point slides and shrinks as in LBA2's forced camera.
- The pitch holds until the next re-centre, which starts again from the view's own pitch.

The builders register their shapes:

| Builder | Volumes registered |
|---|---|
| town.js | Each house's walls up to the eaves, its roof as a slab sloping from the ridge to the gutters (overhang included), and its chimney |
| island.js | The curtain walls (to the merlon tops); the four towers (body and slate cone, as profiles); the gatehouse's two solid sides and the masonry over the arch; the project buildings (walls and barrel roof) |
| spaceport.js | The terminal block and its dome (lathe profile) |
| townlife.js | Nell's lean-to roof (with its board) and its back wall |

The faders are removed. Houses and the fortress are always drawn solid and cast their normal shadows, so there is
no shadow of an invisible house and no veil on re-centre or at a door. The colliders these volumes replace for the
camera are marked `camSkip`.

### Where we differ from LBA2, and why

1. **Tighter volumes.** LBA2 tests one bounding box per object. A house is therefore a solid box up to its ridge,
   which can tip the camera almost straight down beside a house. Our volumes follow the walls and the roof line,
   and the rule is unchanged. The camera rises only as far as the real silhouette needs.
   - The steps are 0.25 m; LBA2's 512 units are about 0.5–0.7 m.
   - The shot is then checked against our rig's real geometry. Our camera hangs off the look-at point, while
     LBA2's forced camera hangs off Twinsen. The check uses an exact segment-against-box clip, and the pitch is
     tipped further in 2° steps while the line is still cut.
   - The pitch is capped at 80°.
2. **Re-centre when hidden mid-shot.** LBA2 waits for Twinsen to reach the screen edge. If scenery hides both his
   middle and his head for 0.35 s, we start a new LBA2 shot that keeps the heading.
   - Trees, the lighthouse and other solid props without a scenery volume keep the existing behaviour: the camera
     swings round behind him after 0.35 s.
   - The same happens if no pitch up to the cap clears the view.
3. **Silhouette kept.** The remaster already shows a flat blue silhouette through scenery (VISUAL_REMASTER.md,
   Stage 5). LBA2 has none. It is kept as a gameplay aid, and it covers the moments before the new shot.
4. **Shots glide instead of cutting.** As before, the remaster glides between shots. The pitch glides with them
   at the same rate. The 1997 visual setting still cuts.
5. **Roofs he stands under.** No camera height can show Twinsen under a roof he is standing beneath. In LBA2 he
   can't stand inside a scenery box, because ZVs are solid. Volumes over his head are left out of the search and
   of the hidden test:
   - the gatehouse arch;
   - Nell's roof, which keeps townlife.js's own fade while he is under it or while the coupler is on the bench;
     that fade is not this task's file and is left as it was.
6. **Rooms are unchanged.** Interiors already mask the way LBA2 does: the room's camera side is open and nothing
   fades. Task #73, the wall cutaway, is a separate decision.
   - The other outdoor regions are separate rooms and keep their own code. Zeelich's houses still fade
     (zeelich.js), outside this task's files.

### Changed files

| File | Change |
|---|---|
| `src/engine/occlude.js` | New: the volume registry, the `SearchCameraPos` port and an exact segment test |
| `src/engine/camera.js` | Each new shot uses the search; the hidden test re-centres (scenery) or swings behind him (other colliders) |
| `src/game/town.js` | House faders removed; house volumes registered; house colliders `camSkip` |
| `src/game/island.js` | Fader code only: `addFader` → `addOccluder` for the walls, towers, gatehouse and project buildings |
| `src/game/spaceport.js` | Two added volume lines (terminal, dome) and `camSkip` on the terminal collider; no placement changed |
| `src/game/townlife.js` | Two added volume lines (Nell's roof, back wall); its own fade left as it was |
| `src/main.js` | Occluder code: `camRig.occ` wiring; `Game.occluders` comment |
| `src/game/characters.js` | The silhouette's colour and opacity (see above) |
| `tests/occluders.mjs` | New: the (a)/(b) checks |

spaceport.js, townlife.js and characters.js were not in the assigned file list. The D8 objects and the silhouette
live there, and only these lines were added or changed.

## 3. Evidence

Scripts are in `scripts/` and are run with the repo's runner copy:

```bash
GAME_URL=http://127.0.0.1:8185/ TAG=after PART=A node run.mjs vp10.mjs 960 540
```

Captures were made with SwiftShader, one browser at a time, on port 8185. "Before" is commit 7d38299, served from a
`git archive` copy. "After" is this branch before the merge.

Each motion-sheet frame carries a label with these measures:

- **seen %**: Twinsen's pixels actually in view, with the silhouette switched off for the measure, divided by his
  pixels with nothing else drawn.
- **pitch**: the camera's pitch from his feet.
- **veil**: meshes drawn see-through with depth writes off (alpha-faded). The baseline of 9 is water and effects,
  not buildings.
- **gone**: meshes drawn as nothing that still cast a shadow.

### Before and after, by input

All runs were at 960×540, a new game, the same route and the same steps. Twinsen was driven by key presses, with
the camera behind him wherever he was placed. The motion sheets are in `motion/` and the single frames in `shots/`.
`compare-before-after.jpg` puts four of the static cases side by side. "Seen" is the share of Twinsen's pixels
in view.

| Case | Before (7d38299) | After (VP-10) |
|---|---|---|
| A1 Out of his front door (VP-3's repro, 15 frames at 1/20 s) | House faded: veil 36 (27 house meshes above the baseline of 9); 15 meshes drawn as nothing but still casting a shadow; pitch 33–40°; seen ≥ 99% | Veil 9 (baseline), nothing drawn-as-nothing; the camera stands over the roof, pitch 65–70°; seen 87–100% |
| A5 Enter (re-centre) 3 s from the door | Same veil/shadow state throughout | Glides down to 51° over the roof; no veil; seen ≥ 98% |
| A7 Back toward the door | Faded house; seen ≥ 98% | Two frames (about 0.6 s) under the roof edge drawn by the silhouette (seen 0–46%); then a new shot at 72°; seen 79–89% |
| B Round the Bug St. house | Fades; seen min 83% | No fade; seen min 39%, mean 84% (partly behind a corner, which the silhouette covers) |
| B Round the stone house | Fades; seen min 93% | No fade; seen min 61%, mean 94% |
| B Round the south house | Fades (veil 35, 15 drawn as nothing); seen min 57%, mean 94% (`logs/vp10-Bsouth-before.log`; rerun alone after the first run timed out under load) | No fade; hidden 3 frames (0.9 s, silhouette shown); the shot then rises (62.7°); seen mean 73% |
| C Lane to customs (walk) | Seen ≥ 93% | Seen ≥ 93% (the walk never puts Nell's roof in the way) |
| C Customs spot (`shots.mjs` 04, D8) | **Seen 34%**: Nell's lean-to roof covers him | **Seen 97%**: the camera rises to 48° over the roof |
| D Benches by the terminal, Enter (camera behind him, north, D8) | **Seen min 0%, mean 12%; 14 of 16 frames under 20%**: the terminal and its purple dome cover him | **Seen 79–100%, mean 88%**; the camera rises to 62.8° |
| D `deck-wait-n` spot | **Seen 0%** | **Seen 85%** |
| E Gate approach and walk outside the south wall | Seen min 45/42/75% | Identical. The gate was closed (portcullis down in the chapter reached), so the yard walk did not happen; no fortress piece came between |
| E Behind a corner tower, a fresh shot | **Seen 3%**: the tower faded to its 0.12 veil (veil 19), and a hill also hid him | **Seen 100%**: the camera rises over the cone (70.8°) |

Static spots, a fresh shot behind him (`logs/explore-*.log`, 1280×720, placed without settling, so the hero may
still have been dropping onto the ground):

- **Customs:** seen 36% → 96%.
- **`deck-wait-n`:** seen 0% → 83%.
- **Behind five houses, 1.6 m from their back walls:** before, seen 95–100% because the house faded out. After,
  seen 35–80% of his pixels with no fade, at a pitch of 75–80°. The sight line to his middle (LBA2's 512-unit
  point) is clear; what is cut is mostly his feet behind the eaves, which the silhouette covers.

### The user's two requirements (coordinator, VP-10 feedback on 0.29.1)

**(a) A house he stands next to or in front of never vanishes.**

- No fader is left. Houses, the fortress and the props are always drawn whole and opaque, with their own shadows.
- The laptop photos showed a whole house going to 0 beside him. That was the old corridor test in
  `fadeOccluders`: k = 1/16 samples, a +0.6 m margin and ±3 m side lines. That code is deleted.
- `tests/occluders.mjs` places Twinsen at every Citadel house's door, facing out (the camera over the house) and
  facing in (the camera in front). It checks that none of the house's meshes is hidden or see-through.
- `F.f` no longer exists. The check reads the meshes themselves, so it also guards against a fader coming back.

**(b) When a house is between the camera and him, he is never hidden.**

The treatment is LBA2's: the camera rises over the house. While the house is in the way, his body is drawn by the
existing flat-blue silhouette pass.

Why this reads best:

- The house stays one solid, lit, shadow-casting object, so there is no veil, no partial cutaway and no pop.
- He is in view directly within about 0.35 s (the hidden test) plus the glide.
- During those moments, and under a roof he stands beneath, the silhouette shows where he is.

Cutting walls away was rejected:

- It would be new to LBA2 outdoors.
- It brings back exactly the shapes the user objected to: half a house, foundations left floating.

Checks in `tests/occluders.mjs`:

- **Fresh shot behind six houses.** His head (1.6 m), chest (1.0 m) and feet (0.15 m) must each be either:
  - unoccluded: no opaque mesh on the ray from the camera; or
  - drawn by the silhouette: the frame with the silhouette differs from the frame without it at that pixel.
- **Walking round behind three houses in a still shot.** The same check for all three points, every 0.2 s.

Screenshots of both cases: `shots/test-b-behind-south-fresh-shot.jpg` (in view directly),
`shots/test-b-walk-*-silhouette.jpg` (covered, drawn by the silhouette) and `shots/test-b-walk-*-after-new-shot.jpg`
(the new shot 1.5 s later).

**The silhouette changed after the first test run (characters.js `addSilhouette`).** The first run failed one
point: walking round the Bug St. house, his chest was behind the blue-slate roof, and the old silhouette (a mid
blue `#3a6ab0` at opacity 0.38) did not change that pixel by more than 24 levels, so he was effectively invisible
there. It is now a bright sky cyan (`#40c8ff`) at 0.5, which shows over blue and orange roofs, white plaster,
grey stone and grass.

- This is a shared material: the character artist should confirm the colour.
- The motion sheets in `motion/` were captured before this change and show the old, fainter silhouette. The
  `test-*` screenshots show the new one.


## 4. Cost

These were measured with `scripts/perf.mjs` at 1280×720 on the default quality, in a fresh profile, under
SwiftShader (CPU-only WebGL). The browser was headless Chromium. Each spot was placed and settled, given a fresh
shot behind him and 3 warm-up renders, then measured over 9 renders with `renderer.info` reset before each.

| Spot | Draw calls before → after | Triangles before → after | Note |
|---|---|---|---|
| square | 946 → 946 | 1 364 477 → 1 364 477 | no occluder in the way: identical shot |
| lane | 928 → 928 | 1 553 320 → 1 553 320 | identical |
| harbour-lane | 749 → 749 | 1 256 002 → 1 256 002 | identical |
| customs | 565 → 514 | 809 559 → 773 601 | the shot rises to 48°; less of the island in frame |
| deck-wait-n | 428 → 334 | 771 911 → 704 198 | rises to 62.8° |
| fort-yard | 451 → 451 | 862 894 → 862 894 | identical |

- **Programs and textures:** 123–127 programs and 499 textures in both builds.
- **Geometries:** 7 fewer after (1364 vs 1371 at the last spot). The per-house material clones and the
  per-fader clones are gone.
- **Frame time:** render wall times are listed in `logs/perf-*.log` but are **not usable**. Another agent's test
  runner shared the CPU throughout, and medians swing from 17 ms to 4.6 s at the same spot in the same build.
  No frame-time or GPU claim is made.
- **CPU per frame**, from the same route by input through the town (600 calls, µs; `performance.now`
  granularity here is 100 µs):

  | Call | Before | After |
  |---|---|---|
  | `camRig.update`, mean (p95) | 28.8 (100) | 82.8 (200) |
  | `Game.occluders`, mean (p95) | 38 (100) | 3.3 (0) |
  | camera + occluders together | ≈ 67 | ≈ 86 |
  | `game.step` mean (the whole simulated frame) | 2.21 ms | 2.47 ms |

  The search and the hidden test cost about 50 µs a frame more than the old house faders did. That difference is
  within the noise of the step mean on this loaded machine.
- **The `door` spot is invalid.** The script's door lookup put him at x 1001, inside a room's space, in both
  builds. It is ignored.


### Static merges (the coordinator's PERF-IGPU follow-up, applied after merging 8819e38)

These use `mergeStatic`'s `{ recolor, cell }` options from PERF-IGPU's merge.js:

- **town.js:**
  - Pippa's stall: `mergeStatic(st, { recolor: true })`.
  - The heat posts now sit in one group with `{ cell: 24 }`. The crystal's shared material is kept, so its glow
    still animates.
  - The well: `{ recolor: true }`.
- **island.js:**
  - `buildOriginalProps`: `{ recolor: true, cell: 24 }`.
  - `buildDressing`: the crates are marked `userData.keep` (they break one by one), then `{ cell: 24 }`.
  - `buildPipeline`: the valve wheels' pivots are marked `keep` (they turn), then `{ cell: 24 }`. Each valve lamp
    keeps its own material, whose colour changes.

The houses stay merged one house at a time, as separate objects. Nothing fades any more, so no house needs its own
material.

`tests/perfbudget.mjs` at Medium, SwiftShader, with `PERF_BUDGET=0` (same build except these lines):

| Route | Before | After |
|---|---|---|
| **street** | **324 calls (max 333)** | **274 calls (max 283)** |
| interior | 121 | 121 |
| combat | 214 | 214 |
| transition | 206 | 203 |

- Triangles are unchanged (889k on the street).
- No new shader programs.

Logs: `logs/perfbudget-medium-*-merges.log`. Frames after the merges: `merges/after-*.jpg` (the square with the
stall, the well and the heat posts; the pump; the harbour customs).

With one preset per run, saved before loading as PERF-IGPU measures (`logs/perfbudget-final-*.log`), the street
draw calls are:

| Preset | PERF-IGPU's figure | Now | Budget |
|---|---|---|---|
| Low | 277 | 228 | ≤ 260 |
| Medium | 325 | 274 | ≤ 300 |
| High | 365 | 316 | ≤ 450 |

- Interiors are 117/121/135, against a budget of ≤ 150.
- **0 new shader programs** on any route at any preset.
- A single run that switches presets mid-session compiles new programs on the first route of each preset. The
  same happens without these merges; it is the method, not a regression.

## Tests (final, on the merged branch: 7ba4227, a9c1ec8 and PERF-IGPU 8819e38 included)

All runs were on SwiftShader, port 8185, one browser at a time.

- **`tests/occluders.mjs`: ALL PASSED (31 checks)**
  - The door check covers 11 houses × 2 facings.
  - The fresh-shot check covers 6 houses.
  - The walk round behind 3 houses: Bug St. 56 points in view / 19 by silhouette; stone 62/10; south 63/21.
  - The first run on the merged build flagged PERF-IGPU's shadow-caster proxies (`userData.shadowProxy`,
    colorWrite off by design) as "hidden" house meshes. The test now skips them.
- **transitions, house, townlife, stability, spaceport: ALL PASSED.**
- **`tests/perfbudget.mjs`, one preset per run: ALL PASSED;** the numbers are above.

## 5. Not verified / remaining

- **Not watched on the original.** The rule is read from LBA2's source, but how often the original's Citadel
  actually shows a raised camera has not been compared with the shipped game running. Hand-placed camera zones in
  its scene data are not reproduced: the remaster has no such zones on Citadel.
- **Very steep shots.** With Twinsen 1–2 m behind a house and the camera directly behind him (Enter, a door exit),
  the camera rises to 65–80°. That is LBA2's rule, and the original's whole-object boxes would go steeper, but the
  roof then fills the lower part of the frame (A1/A2). Whether that reads well on the user's screen needs their
  eye.
- **Short hidden moments.** Mid-shot, Twinsen can be hidden for about 0.35–0.9 s before the new shot rises
  (silhouette shown). LBA2 itself would leave him hidden until the screen edge.
- **Under a roof.** Under the gatehouse arch or Nell's lean-to he is drawn only by the silhouette. Nell's roof
  keeps townlife.js's own 0.25 fade, which is not this task's file.
- **Not converted:** trees, the lighthouse and other props without a scenery volume keep the existing rule (the
  camera swings behind him). Zeelich's houses (zeelich.js) still fade. The awning on the shop and the
  spaceport's departures-board roof have no volume.
- **Fortress yard not walked.** The gate was shut in the state reached, so the yard was reached only by placing
  him (the perf spot). The south-wall Enter case (E3) ran outside the wall.
- **Renderer frame time:** not measured reliably (shared CPU); no GPU claim.
- **Interiors** are unchanged. Task #73 (wall cutaway) is a separate decision; LBA2's rooms mask, they don't cut.

