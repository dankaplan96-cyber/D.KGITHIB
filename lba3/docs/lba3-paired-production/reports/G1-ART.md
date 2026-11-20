# G1-ART — character art, Group 1 (Citadel, chapters 1–2), Round 1

Role: character art (round-1 partner: camera, which starts later). Baseline: `7d446f6` (the PERF-HIGH merge).
Batch: AUDIT-CH12 items 6 and 16 (docs/lba3-production/reviews/AUDIT-CH12/FINDINGS.md), checked on the current build first,
plus close-ups of Twinsen, Zoé and Arthur. Art direction D1 "A" (faithful refined LBA: soft forms, silhouettes first,
geometry before effects).

Evidence is in the session scratchpad, `g1-art/` (not in the repository). "Before" is the baseline served from an
untouched copy, "after" the worktree; the same scene, camera, light and deterministic stepping for both
(`g1-art/ig.mjs` in game, `g1-art/lk.mjs` on lookdev.html). Sheets: `g1-art/ev/G1-ART-*.png`.
Kinds of evidence: staged captures (scripted camera and stepping) and automated tests. No normal-input play-through and
no target-hardware run were made.

## Changed files

- `tools/blender/twinsen_poly.py`, `assets/poly/twinsen.json` (item 1)
- `src/game/statue.js` (item 2)
- `tools/blender/cast_poly.py`, `assets/poly/gilbert.json` (item 3)
- `src/game/characters.js`: the `LOOKS.twinsen` comment only (it said "no hair on the skull")

No other model changed. A full rebuild of the cast (`cast_poly.py`, all 52 of its models) matches the baseline JSON for
every character except Gilbert (`g1-art/cmpcast.py`). No `.blend` was written into the repository.

## Item 1 — Twinsen from behind (AUDIT-CH12 #6)

- **Verified: yes.** Follow camera at Far on the square (11.5 m from him): the back of the head reads as a pale bulb with
  a dark strip down its middle and skin all round it, over the domed cape (`before/b-follow-far-*-crop.png`).
- **Cause.** VP-1b made the hair faithful to the three flat discs LBA2 draws: a tuft on the back of the crown, skin on
  the rest of the skull. LBA2's discs always face the camera, so from above they cover the crown. Our round tuft does
  not, and the Follow camera looks down at about 30°, so the bare top and sides of the skull show as a ring.
- **Change.** A thin shell of hair now covers the crown and the back of the skull and runs into the knot.
  - The hairline starts at the top of the forehead, runs past the temples, and reaches the nape at 0.87 H.
  - The shell thins to nothing at the hairline, so its edge does not stand off the skin.
  - It uses the knot's flat dark shade (normals pointing down), so the two read as one mass.
  - From the front he still has LBA2's tall bare forehead under a dark dome.
- **Result.** From behind at Far he now reads as dark hair with the bun. The skin ring is gone.
- **Rig contract kept.**
  - The shell is on the `head` bone only.
  - The bone list and order, the `eyes` and `mouths` entries and the bones that carry weights are identical.
  - All 2,992 old triangles are byte-identical and in the same order (`g1-art/contract.py`).
- **Triangles:** 2,992 → 3,230 (+238). Still one mesh, one material and one draw.
- **Evidence:**
  - `ev/G1-ART-twinsen-follow-far.png`: in game, Follow at Far (idle, walk, run), plus the lookdev stand-in for that camera.
  - `ev/G1-ART-twinsen-heads.png`: front, ¾, side and back.
  - `ev/G1-ART-twinsen-body.png`: the whole figure.
- **Not changed: the "mushroom".** The cape's domed outline over the narrower robe is the measured LBA2 cape
  (§11–12 of docs/character-review.md). The reference board's back view (#23) has the same shape. With the hair dark,
  the head no longer reads as part of a mushroom cap. Reshaping the cape is a separate decision and needs the user.

## Item 2 — the square's statue (AUDIT-CH12 #16, first half)

- **Verified: yes.** Every face of the bronze was flat-shaded, so the heads read as faceted lumps. The faces were blank:
  the eyes and mouth were left out of the bake. The bronze was dark (`ev/G1-ART-statue.png`, top row).
- **Cause.** `bake()` writes unindexed triangles and then calls `computeVertexNormals()`. On unindexed geometry that gives
  each triangle its own flat normal.
- **Change (`statue.js`).**
  - `creasedNormals()` smooths each corner over the triangles that meet at its position within 60°, as the models'
    exporter does. Round forms turn smoothly and real edges (hem, cape rim, soles) stay crisp.
  - The eyes and mouth are baked in: the whites as low relief, the irises, pupils, lids and lips darkened like incised
    lines.
  - The bronze is a shade lighter and less metallic (0.35 → 0.2). The scene has no environment map, so metalness only
    darkened it.
  - The figures, pose, plinth, plaque, colliders and occluders are unchanged. The figures pick up Twinsen's new hair.
- **Finish standard (CAST-UNIFORM).** The figures are the game's own models, which already meet it. The flat normals were
  the only reason the statue fell below it.
- **Cost.**
  - Triangles: about 8.57k → 8.96k (+386: Twinsen's new hair 238, the two pairs of eyes and the mouths 148).
  - Still four draws.
  - Building the normals takes about 10–35 ms once, at world build, measured in Node on this machine
    (`g1-art/bench-normals.mjs`). The old `computeVertexNormals` took about 10 ms. Nothing changes per frame.
- **Evidence:**
  - `ev/G1-ART-statue.png`: front, ¾, side and heads.
  - `ev/G1-ART-statue-play.png`: the statue from Follow at Far.

## Item 3 — Gilbert at the first talk (AUDIT-CH12 #16, second half)

- **Verified: yes**, on the first talk at the well (`ev/G1-ART-gilbert-talk.png`, top). Concrete weaknesses:
  - His bald crown closed on a flat polygonal lid. A bald head shows it from every side.
  - His white hair was a flat grey band round the back, which reads as a bandage or headband.
  - The shoulder balls stood above the tunic's slope like posts at the corners.
- **Changes (`cast_poly.py`, all behind CAST options set for Gilbert only: `dome`, `fluff`, `shoulderDrop`).**
  - Dome: three rings round the crown over the top section.
  - Fluff: eight overlapping white tufts along the fringe, the same round lobes as his moustache. They are bigger over
    the ears.
  - Shoulder drop: the sleeve top and the shoulder ball are lowered 1.5–2.2 cm onto the slope.
  - The crown is 2.4 cm higher. The collider is not changed.
- **Rig contract kept.** The bones, their order, the weighted bones, `eyes` and `mouths` are identical. The tufts and the
  crown are on `head`, the shoulders on `shL`/`shR` as before.
- **Triangles:** 2,792 → 3,872 (+1,080). The tufts follow the finish standard's minimum for balls of their size. Gilbert
  is one character, on screen in a few scenes.
- **Evidence:**
  - `ev/G1-ART-gilbert-heads.png` and `ev/G1-ART-gilbert-body.png`: front, ¾, side and back.
  - `ev/G1-ART-gilbert-talk.png`: the dialogue frame.
  - `ev/G1-ART-poses-twinsen-gilbert.png`: skinning.

## Item 4 — Twinsen, Zoé and Arthur close-ups: faces, necks, hands

Measured on the models, with the on-screen size at the Far Follow camera (11.5 m, 50° fov, 720 rows, about 67 px per m):

| | neck width | head width | neck/head | narrowest limb at Far |
|---|---|---|---|---|
| Twinsen | 0.13 m (±0.031 H, LBA2's measured value) | 0.33 m | 0.40 | sleeves wide; hands 10×7 balls |
| Zoé | 0.08 m | 0.21 m | 0.39 | bare forearm ≈ 4 px |
| Arthur | 0.09 m | 0.24 m | 0.38 | bare forearm 4–5.5 px |
| (Gilbert) | 0.10 m | 0.28 m | 0.37 | |

- **No change.** All four sit at the ratio measured on LBA2's own Twinsen (0.40), which NECK-TW kept on purpose.
  - Every neck and limb is at least 4 px wide at Far on 720p (about 6% more at 1366×768). None of them breaks up or
    vanishes in the captures.
  - Thickening them would move away from the measured silhouette, which D1 "A" puts first.
- **Faces.** Twinsen's head is the measured LBA2 sections (22 points round, 13 rings). Its outline is polygonal close up,
  by design. Zoé's and Arthur's heads read cleanly in close-up.
- **Hands.** The ball hand with a thumb peg is the cast standard. At Far the thumb is about 1 px.
- **Proposal, not done.** A finer Quetch head (about 15 points per half-section, more rings over the cranium) would soften
  every close-up. It changes the shared head of every Quetch, so it is a cast-wide batch and needs the user's view first.
  No skeleton change is needed for any of this, now or for the proposal.

## Skinning, collision, shadows, LOD

- **Lookdev at the clips' extremes.** Twinsen and Gilbert, ¾ and back, in walk, run, throw, talk, hurt (damage),
  reachHigh (shoulder), kick (hip) and sit (hip). No new gap, stretch or clipping
  (`ev/G1-ART-poses-twinsen-gilbert.png`: before left, after right).
- **Rigid on the head.** Twinsen's shell moves with the skull. The neck blend (0.785–0.855 H) ends below the hairline.
- **Collision.** Unchanged: radius and capsule come from the looks, not the mesh.
- **Shadows.** The new parts belong to the same skinned mesh and cast shadows with it.
- **LOD.** The characters have no mesh LODs. The far walkers' coarse stepping is an animation LOD and is not affected.

## Tests (worktree served on 8206, `g1-art/tests.sh`)

- `tests/voices.mjs`: VERDICT: PASS (24 functional checks, 0 failed). Log: `g1-art/t-voices.log`.
- `tests/walkers.mjs`: VERDICT: PASS (37 functional checks, 0 failed). Log: `g1-art/t-walkers.log`.
- `tests/perfbudget.mjs ROUTES=street QUALITIES=medium`: VERDICT: PASS. Log: `g1-art/t-perf.log`. The same run on the
  baseline copy also passes (`g1-art/t-perf-base.log`). Baseline → after:

  | | baseline | after |
  |---|---|---|
  | draw calls (mean) | 190 | 197 |
  | draw calls (p95) | 228 | 221 |
  | draw calls (max) | 247 | 245 |
  | triangles (mean) | 444k | 446k |
  | triangles (max) | 924k | 845k |
  | submit | 11.1 ms | 9.3 ms |
  | new programs | 0 | 0 |
  | statue world-build step | 122 ms | 113 ms |

  - The draw-call differences are run-to-run variation on the route: this batch adds no mesh, material or draw.
  - About +2k triangles on the street, as expected.

Software GL (SwiftShader) in a container. These are not target-hardware frame rates.

## Risks and partner review

- **A decision for the user.** Twinsen's hair is less literal than VP-1b's (which matched the three discs). The front
  view is close to the original; from the side and back the hair is now combed back. Please show the user
  `ev/G1-ART-twinsen-heads.png` and `ev/G1-ART-twinsen-follow-far.png`.
- **Gilbert's count.** +39% triangles, 3,872 in all. This is within the cast's range: up to 4,920 for the Spheros.
- **The `.blend` sources are stale.** `art/characters/twinsen/twinsen_poly.blend` and `cast_poly.blend` predate this pass,
  as after CAST-UNIFORM. The scripts are the source.
- **Camera partner.** No camera contract is touched. If the Follow camera's Far pitch or arm changes, recheck the back of
  Twinsen's head with `g1-art/ig.mjs`.
- **The opening cinematic was not re-captured.** It shows Twinsen in close-ups (CHAR-2 angles); the front is nearly
  unchanged.

## Checkpoint

- **Commit:** in the worktree branch (see git log). Not pushed.
- **To resume:**
  1. Serve the worktree's `lba3` on its own port.
  2. Run `bash g1-art/bt.sh twinsen` or `bash g1-art/bt.sh cast gilbert` to rebuild (bpy env in the scratchpad).
  3. Run `GAME_URL=… node g1-art/ig.mjs <dir> <prefix>` for the in-game captures and `node g1-art/lk.mjs <url> <out> '<query>'`
     for lookdev.
- **Next for the art role:** the user's verdict on the Twinsen hair, then the cast-wide head proposal if wanted.
