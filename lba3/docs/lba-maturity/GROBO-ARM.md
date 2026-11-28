# GROBO-ARM (P111, 23.11): a Grobo's hand inside his body, and every other body

The user (23.11, a close picture of Bram by the tulips in Citadel, mid-conversation): "his hand is inside the body,
swallowed". The standing rule from the same day: every fix holds across the whole game. Automated runtime only
(SwiftShader, headless Chromium, a loaded shared machine). No person has played it.

## The cause

The arms are posed by angles alone (`src/engine/rig.js`): the same shoulder swing, spread and elbow angles for every
body, plus a rest spread `armSpread` (0.03 rad for everyone, since `j.skirt` is always an object). No body's width is
asked anywhere. The Grobo's polygon body (`tools/blender/cast_poly.py`, the LBA2 "one great round body", ±0.5 m at the
hips) is far wider than his shoulder joints (±0.33 m, `characters.js` `shX`). So from the elbow down his arm hung
**inside** the body in every pose: 15–19 cm deep for all 13 Grobo looks. From outside you saw no arms at all, or a
hand sticking out of the coat when a talk gesture raised it (the user's picture). Baldino was set apart with
`armSpread: 0.3` and was still 9 cm in. Smaller bodies did the same by 1–12 cm: a flared tunic hem (Arthur, Vesk, the
farmers), a round abdomen (the Zeelich bees' variants) or a robe (Keraooc).

What was **not** the cause: JOINTS-BLENDER 8 (22.11). Its shoulder change (`f39a18a9`) touched 31 models and no Grobo.
Its only Grobo change was Baldino's knees (`b977c44a`). No other commit in `assets/poly` touched a Grobo's arm since
JOINTS-BLENDER 2 (20.11). The bind pose of the Grobo models already has the hands inside the body (measured on
`assets/poly/bram.json`: the hand spans x 0.32–0.48 m at the height where the coat is 0.48–0.50 m wide).

## The fix: one rule in the rig, for every body

`Rig._armClear` runs after the arms are posed (`src/engine/rig.js`, the ARM-CLEAR block at the end, and one call in
`update`). For each body, once and cached on its geometry, it builds the body's surface from its own mesh: the
greatest radius round its middle per 2 cm of height and 1/32 of a turn, below the shoulders. It keeps two copies: the
part that moves with the chest (torso) and the part that moves with the pelvis (hips, robe). Cloth tied to an arm,
such as Twinsen's cape, is left out. It also takes about 72 points over each forearm and hand: the skinned vertices
whose main bone is the elbow or the hand, plus a sculpted body's rigid hands.

Each frame (each side worked out every third frame and held in between), if a point is inside the surface or within
1.4 cm of it, the shoulder turns the arm out (spread) and/or forward. It picks whichever mix clears the arm with the
least turn, and turns only as far as needed to clear it (halving search, at most 1.1 rad). The turn eases in at 20/s
and out at 6/s, or 30/s going into a strike or a throw.

An arm that is already clear is not touched. These keep their own arms: strikes and throws (`FAST`), the upper-body
throw layer, knock-out (eased out, never added), `dead`, `sleep` and `jet`. The forward turn is taken off again before
the next frame eases the joint, unless game code set the arm itself after the update (`harbourlife.js`,
`townplay.js`).

The fix leaves alone: the models, bind poses, skeletons and sockets, cooldowns, damage, the pose keys, and the
`armSpread` values.

How much the arms turn in idle (rad, out/forward): Grobos 0.53–0.60 out (Pim, a child Grobo, 0.86), Baldino 0.33,
Zeelich bee variants 0.18–0.27, most humans 0.05–0.15, Twinsen and Zoé 0. The Grobos' arms now hang angled out from
the round body, as LBA2's Grobos do and as Baldino's own `armSpread` meant. **This is a visible change to every Grobo**,
listed for the user's pick (P107). It is the least turn that clears the body; no new pose was designed.

## The sweep (tests/arm-clear.mjs): every look × 26 poses

The probe: 79 looks (every `LOOKS` entry: the polygon models of `assets/poly`, their variants, the sculpted fallback,
and the expansion's on-demand models). Each is made by the game's `createCharacter` and posed by the rig through idle,
the scratch and stretch fidgets, walk, run, talk's five gestures, listen, nod, shrug, sigh, start, sit, doze, tinker,
potting, wipe, reach, tapTurn, touchWater, setDown, reachHigh and kneelWork. Each pose is sampled over its cycle and
the worst frame kept.

For every forearm and hand vertex (skinned on the CPU from the posed skeleton), it casts a ray from the body's posed
axis out through the point. Where the body's own surface lies beyond the point, the point is inside by that much. The
probe is independent of the rig's own estimate (exact triangles, posed axis). `OFF=1` turns the rig's clearance off,
which gives the numbers from before.

Poses are carried as walking: "carry" is the walk with the thing in the right hand (`walkers.js placeCarry`).

Cells (look × pose) with a hand or forearm inside by more than 0.5 cm: **before 448, after 26**. Worst: **19.0 cm
(Hesk, idle) → 2.6 cm (vguardG, setDown)**. Every Grobo in idle, talk, listen, walk, run, the gestures and sitting:
15–19 cm → 0.

| body | race | before: worst cm (pose) · poses inside | after: worst cm (pose) · poses inside | idle turn out/fwd (rad) |
|---|---|---|---|---|
| twinsen | quetch | 0.7 (fidget-stretch) · 1 | 0.7 (fidget-stretch) · 1 | 0.00/0.00 |
| arthur | quetch | 2.5 (walk) · 6 | 0.0 · 0 | 0.12/0.02 |
| gilbert | quetch | 1.1 (run) · 2 | 0.0 · 0 | 0.08/0.01 |
| pippa | bunny | 0.9 (run) · 6 | 0.2 · 0 | 0.10/0.00 |
| doran | grobo | 18.8 (talk0) · 25 | 1.9 (potting) · 2 | 0.53/0.13 |
| vesk | quetch | 2.8 (walk) · 10 | 0.5 · 0 | 0.12/0.01 |
| worker_b | quetch | 2.4 (listen) · 7 | 1.6 (run) · 3 | 0.14/0.01 |
| guard | grobo | 18.8 (fidget-scratch) · 25 | 1.5 (setDown) · 2 | 0.53/0.00 |
| baldino | grobo | 8.9 (walk) · 14 | 0.0 · 0 | 0.33/0.00 |
| zbee1_b | bee | 12.5 (doze) · 5 | 0.0 · 0 | 0.27/0.05 |
| zbee2_b | bee | 8.0 (idle) · 5 | 0.0 · 0 | 0.18/0.04 |
| ztri1 | tri | 1.6 (walk) · 12 | 0.0 · 0 | 0.12/0.00 |
| ztri2 | tri | 2.4 (walk) · 14 | 0.0 · 0 | 0.16/0.01 |
| fclone | fclone | 0.8 (run) · 6 | 0.0 · 0 | 0.04/0.00 |
| keraooc | elf | 5.2 (idle) · 12 | 0.0 · 0 | 0.13/0.03 |
| vguardG | grobo | 18.7 (idle) · 25 | 2.6 (setDown) · 1 | 0.57/0.13 |
| councilC | grobo | 18.7 (setDown) · 25 | 0.1 · 0 | 0.53/0.00 |
| farmerA | quetch | 1.9 (fidget-scratch) · 8 | 1.1 (run) · 3 | 0.12/0.01 |
| farmerA_b | quetch | 2.3 (run) · 14 | 0.2 · 0 | 0.12/0.00 |
| farmerC | grobo | 18.7 (setDown) · 25 | 0.0 · 0 | 0.60/0.12 |
| farmerC_b | grobo | 18.7 (idle) · 25 | 1.9 (potting) · 3 | 0.58/0.12 |
| yorna | grobo | 17.9 (idle) · 25 | 0.0 · 0 | 0.59/0.12 |
| pim | grobo | 15.2 (idle) · 25 | 0.0 · 0 | 0.86/0.19 |
| lharMan_b | quetch | 2.0 (run) · 14 | 0.0 · 0 | 0.12/0.00 |
| hesk | grobo | 19.0 (idle) · 25 | 0.0 · 0 | 0.54/0.00 |
| desertTrader | grobo | 18.3 (setDown) · 25 | 0.0 · 0 | 0.53/0.00 |
| bram | grobo | 17.7 (setDown) · 25 | 0.2 · 0 | 0.56/0.03 |
| blTrader | grobo | 18.3 (setDown) · 25 | 0.0 · 0 | 0.59/0.11 |
| twinsenSculpt | quetch | 3.0 (walk) · 12 | 1.9 (walk) · 11 | 0.05/0.01 |

These were clear before and after (50): zoe, tim, lulu, mira, worker, nara, nara_c, nara_b, oku, oku_b, xil, zbee1,
zbee2, zmole1, zmole1_b, zmole2, zmole2_b, joe, sphero1, sphero2, bersimon, magus, vguard, councilChair, councilB,
clerk, clerk_b, archivist, archivist_b, farmerB_b, farmerB, lharMan, lharWoman, kira, lharWoman_b, lharElder, keeper,
keeper_b, ilka, tarra, dallan, desertkid, desertkid_b, weaver, odile, nell, tessa, docker1, docker2, docker3.

### What is left (0.5–2.6 cm), and why

- **Grobo work clips** (potting, setDown, touchWater, kneelWork: Doran, the guard, vguardG, farmerC_b; 0.7–2.6 cm):
  the hands reach low in front of the belly at a table. In the game, `workhands.js` puts the hands on the thing after
  the rig (an IK on top), so these probe poses are the clip without its target.
- **A run's fastest swing** (worker_b 1.6, farmerA 1.1 cm): the forearm passes the tunic's front between two of the
  rig's every-third-frame looks.
- **twinsenSculpt** (≤ 1.9 cm): the sculpted fallback, used only when Twinsen's polygon model fails to load. The
  rig's surface estimate and the probe's exact triangles differ by about a centimetre on its bell tunic.
- **Twinsen's stretch fidget** (0.7 cm, unchanged): the hands behind the head, above the shoulders, where the rig does
  not look. Round the shoulders the body is not one surface round its middle, and the shoulder cap read as covering a
  forearm passing in front of it during his run.

The probe's check fails only on a hand buried deeper than 3 cm (`BURIED`). It lists everything over 0.5 cm (`TOL`).

## Pictures (captures/grobo-arm/, before | after)

- `bram-game-before-after.jpg`: the user's scene, by the game's own cameras. Bram at his pump by the tulips: the play
  camera with his Talk prompt, then two moments of the talk camera after E. Before, he has no arms. After, his arm and
  hand are outside the coat.
- `bram-before-after.jpg`: Bram on the quay by Gate 1, at dialogue distance (idle, talk gesture 4, walk) and at play
  distance (idle, walk).
- `grobos-pim-baldino-before-after.jpg`: Pim (a child Grobo, the largest turn) and Baldino (idle, talk, walk).
- `others-before-after.jpg`: the worst non-Grobos: a Zeelich bee variant (12.5 cm before), Keraooc (5.2 cm), Arthur
  (2.5 cm). The change is slight for them.

Made by `tests/arm-clear-shots.mjs` (`OFF=1 TAG=before`, then `TAG=after`, `BRAM=1`). The quay shots use a fixed
camera at the play camera's distance and at dialogue distance. The Bram shots are the game's own cameras, reached by
input. Screenshots do not prove the motion. The probe samples every pose over its cycle at 60 Hz steps.

## Interruptions and frame rates

- **Into a strike or a throw**: the turn is let go at 30/s (about 0.1 s). A throw's release reads the hand bone where it
  is, so the ball still leaves from the visible hand.
- **Knock-out**: the turn is dropped. The KO keys ease the spread from where it was, so nothing pops.
- **Story poses set after the update**: these are respected (the forward turn is not undone over them).
- **LOD**: far rigs are not posed at all on skipped frames, as before.
- The answer is held between looks and eased by `damp` per `dt`, so it is the same at 30/60/120. Not run at 30/120
  here (the coordinator's reduced test list).
- **Untested by input**: pause, dialogue cut-ins, weapon changes and scene changes during a gesture. The code path does
  not depend on them.

## Cost

Per rig update, headless SwiftShader page on a shared machine at load 13–21, CPU only. These numbers are noisy:

| look | talk off | talk on | walk off | walk on |
|---|---|---|---|---|
| Bram | 16 µs | 92 µs | 43 µs | 170 µs |
| farmerA | 9 µs | 62 µs | 13 µs | 74 µs |
| Zoé | 15 µs | 37 µs | 30 µs | 29 µs |

- A Grobo costs about 0.1 ms a frame more while in view; a human costs about 0.02–0.06 ms.
- No GPU cost and no new draw calls.
- Memory: two small float tables per body model (about 2–4 KB) and about 150 points per rig.
- The tables are built the first time each model is posed: one pass over its triangles, a few ms, once.
- No real-GPU or real-CPU numbers.

## Tests (the user, 23.11: fewer tests)

- `tests/arm-clear.mjs` (new): the sweep above. `OFF=1` gives before, the default gives after, `PERF=1` gives the
  cost.
- `tests/anim-polish.mjs`: run once after the fix: 55/55 PASS (automated).
- `char-form`, `faces` and `campaign-hands` were skipped on the coordinator's instruction. The change does not touch
  what they check: models, bones, eyes and mouth, or the hands on things.

## Decisions for the user

1. **The Grobos' arms now show, angled out from the round body** (idle about 30° from hanging straight). This is the
   least turn that clears the body. The alternative is to rebuild the Grobo models with the arms outside the body at
   rest, a character-artist job in `cast_poly.py`. That would keep the same look but cost a remesh of 13 models.
   Recommendation: keep the rig fix, since it also covers every other body.

## Files

- `src/engine/rig.js`: the ARM-CLEAR block at the end of the file; in `update`, the forward turn is taken off before
  the shoulders ease, and `_armClear` is called after the spread is set.
- `tests/arm-clear.mjs` (new): the probe.
- `tests/arm-clear-shots.mjs` (new): the pictures.
- `captures/grobo-arm/*.jpg`: four before/after sheets.
- `docs/lba-maturity/GROBO-ARM.md`: this file.
- `docs/lba-maturity/status.md`: the P111 row.
