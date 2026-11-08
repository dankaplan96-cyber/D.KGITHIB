# Blender asset work: progress

The tool is `tools/blender-bridge/`. The method is `docs/BLENDER_ASSET_WORKFLOW.md`. The agent is
`.claude/agents/lba-blender-character-and-prop-artist.md`.

States: **exported** / **loaded in game** / **visually inspected** / **performance verified** / **integrated**.

## Completed
### chest_honey: the pipeline proof (no artistic change, 7.11.2026)
- **Source:** `src/game/props.js chest`, honey, as at `interiors.js:501`. The same builder makes the chests at
  `homelife.js:115`, `interiors.js:540/622` and `nbrhouse.js:98`.
- **Baseline, taken from the running game:**
  - bbox 0.836 × 0.610 × 0.504 m;
  - 1104 triangles in 3 parts: wood:honey (268), brass (676), iron (160);
  - footprint hw 0.4, hd 0.23, top 0.606;
  - textures (the game's canvas, 3) wood_honey, brass, iron.
- **Blender 5.2.3:**
  - working copy `props/chest_honey/work/chest_honey.blend`;
  - inspect and validate: 14/14 pass;
  - previews `previews/work/` (front, side, back, three-quarter; neutral and textured), looked at: the lock is at the
    front, the handles at the sides, the back is plain;
  - candidate `export/chest_honey.candidate.polyprop.json` (+ `.glb`, for interchange only).
- **In the game** (SwiftShader, the developer yard; `reports/roundtrip.json`):
  - each part's size and position equal to within 1 mm (orientation kept);
  - the same 3 cached game materials;
  - draw calls 52 = 52 and triangles 22204 = 22204 in the game's frame;
  - pixels from the game camera: mean difference 0.004/255 (`previews/game/in-game-{orig,cand}.png`);
  - collision: he stops at z 0.63 (front) and x 0.8 (side) for both.
- **State:**
  - exported ✓
  - loaded in game ✓
  - visually inspected ✓ (Blender previews and the game frame)
  - performance: draw calls and triangles equal; frame time on the Vega 8 not measured (nothing changed to measure)
  - integrated: not needed (the same geometry)

### Twinsen (CUFF-HEM) and Zoé (NECKLACE-ZOE): CAST-POLISH-HEROES (7.11.2026)
Working copies under `art/blender/characters/{twinsen,zoe}/`: `source/` (the committed `assets/poly` JSON as
`*.baseline.json`; the unchanged script rebuilt through the bridge as `*.rebuilt.json/.blend`), `work/` (candidate .blend),
`export/` (candidate `assets/poly` JSON), `previews/` (Blender neutral views before/after), `reports/` (validate).
Jobs: `characters/jobs/*.json`.
- **Twinsen, CUFF-HEM** (`tools/blender/twinsen_poly.py`; `TW_CUFF_OLD=1` rebuilds the old cuff): the cuff ended in a
  bare cone edge (no thickness) with a flat dark lid inside; now a rolled hem (out, under and back in by 1.5 cm) over a
  dark inner wall and lid. Rebuild of the unchanged script = the committed file exactly (all arrays equal).
  Budget: body 2970 → 3166 triangles (+6.6 %), with eyes and mouth 3078 → 3274; the same 4 draws for the hero (body,
  silhouette pass, eyes, mouth), no new colour, the same bones, eyes and mouth entries, 4 weights.
- **Zoé, NECKLACE-ZOE** (`tools/blender/zoe_poly.py`; `ZOE_NECKLACE_OLD=1` rebuilds the old one): the necklace was laid
  without the neck in its ray casts, so its two back ends stood in the air behind her neck (open loop). Now one closed
  smooth cord round the neck's base (the measured V in front, behind on the neck just above the body's shell), laid on
  the nearest surface and smoothed. Budget: body 5386 → 5616 (+4.3 %), with eyes and mouth 5474 → 5704; same draws,
  colours, bones, eyes, mouth. Note: the unchanged script rebuilt with Blender
  5.2.3 differs from the committed file only in 180 necklace normals (smoothing ties), positions identical.
- In the game (SwiftShader, `gamecap.mjs`; the hero at a clear spot of the village square, Follow/Medium): exported ✓,
  loaded in game ✓ (the candidate served in place of `assets/poly/<look>.json`), visually inspected ✓ (Follow/Medium,
  the dialogue two-shot with Dot, close-ups front/¾/back at 1.9 m, 13 poses × 2 views in the developer yard: idle,
  walk, run, turn, jump, fall, throw, sword (heavy), talk, pickup, use, hurt, doze). Per frame the hero is 4 draws
  before and after; 6048 → 6440 (Twinsen) and 10860 → 11320 (Zoé) triangles (body twice: the silhouette pass).
  Pictures: `docs/future/characters/{twinsen,zoe}/`. Request: `tools/testlab/requests/CAST-POLISH-HEROES*`, note in
  `tools/testlab/WORLD_ART_REQUESTS.md`. `assets/poly/` was put back to the committed files after the tests.
- Tests (SwiftShader, both candidates in `assets/poly`): solidnpc 54/54, chapter1 23/23, story-journeys 30/30 PASS;
  cast-rounds 196/0 then its browser was closed from outside at the last case, which alone then passed 14/14.
  (Browsers were being closed from outside tonight; the passing chapter1/story-journeys runs used a renamed copy of the
  headless shell, `SHELL_EXE` in the scratch test copy's boot.mjs; chapter1's own 240 s boot limit was raised there.)
- Performance: draw calls unchanged (4 for the hero), triangles +6.4 % / +4.2 %; Vega 8 frame time NOT verified (two
  before/after pairs, medians 18–39 ms, means 26–82 ms in both: the load of the other sessions swamps it;
  `characters/reports/gpu-*.json`).
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: draws/triangles measured, frame time not
  claimed · integrated: no (request for the cloud).
- Left: the cuffs only show up close; Zoé's V narrower at the top than the original's, a small kink where the cord
  crosses the shell beside the neck; the game pictures' idle phase and passers-by not frozen between before and after.
- Bridge notes: `validate`'s skeleton check reads the keys of `skeletons.json[look]` (bones, armSpread, height,
  look) instead of its `bones`, so it cannot pass; bones checked separately. The `textured` preview of a character is
  white (its materials only set the viewport colour); the neutral views are the useful ones.

### Citadel batch 1: Gilbert (MOUSTACHE-1), Pippa and the aprons (APRON-EDGE): CAST-POLISH-CITADEL (8.11.2026; pushed a7d14466)
CAST-POLISH-HEROES was pushed (c2684be7, with the bridge fixes; `run_job.py` copied from the main repo).
Census (the game, chapters 1–2 on Citadel, `census.mjs`): the story people present in both chapters are Zoé, Arthur,
Gilbert, Mira, Pippa, Doran, Tim, Lulu, Joe, Bram, Odile, Nell, the guard, the Spheros, Dot (pim), and residents.
Surveyed in the review scene (arthur, pippa, mira, gilbert, bram, odile, nell); picked by visibility and weakness:
- **Gilbert, MOUSTACHE-1** (`cast_poly.py`, CAST `moustacheSwept`): his moustache was three balls a side (a string of
  beads up close); now one swept, tapered lobe a side over the same line, his hair hex #cfcfcf. 3872 → 3856 tris.
- **Pippa, APRON-EDGE** (`cast_poly.py` build(), every apron: pippa, farmerB ×7 people (hedda, tavi, farmer2, dg_cook,
  lh_mira, up_wait, maro), weaver ×2 (fenn, lomba); `APRON_EDGE_OLD=1` for the old one): the apron was one sheet
  1.2 cm off the tunic (paper from the side); its sides, foot and bib top now turn back 1 cm, in the exact apron hex.
  +32 tris each (pippa 2476 → 2508, farmerB/weaver 2396 → 2428).
- The baseline rebuilt from HEAD's script matches the committed files to 1e-5 m / 1e-4 normals.
- Working copies: `art/blender/characters/citadel/` (source = committed + rebuilt, export = candidates, work .blend).
- Done: game captures before/after (gamecap LOOKS=gilbert,pippa,farmerB; the hero swapped to each), DRESS check on
  farmerB (the apron recolours fully in variants 1–6), evidence `docs/future/characters/{gilbert,pippa,farmerB}/`,
  request `tools/testlab/requests/CAST-POLISH-CITADEL*` and its note in `WORLD_ART_REQUESTS.md`.
  `assets/poly/` was put back after the tests.
- Tests (SwiftShader, the four files in place, a renamed headless shell): solidnpc 54/54, chapter1 23/23, cast-rounds
  209/209, story-journeys 30/30 PASS. Blender views of Gilbert and Pippa (neutral and colour) looked at.
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: triangles/draws measured (−16/+32, no draw),
  frame time not run · integrated: no (request for the cloud).
- Seen, not changed: in the throw and the sword the bib sinks behind the tunic (already so before); the Rabbibunnies'
  necks are plain long tubes; Gilbert's side fringe is still balls.

### Citadel batch 2: Mira, Bram, Odile, Nell: CAST-POLISH-CITADEL-2 (8.11.2026; pushed cca490df, applies after CITADEL)
Edits in `tools/blender/cast_poly.py` (helpers `cord`, `visor`; one CAST flag each, the old shape when it is off):
- Mira, GLASSES-MIRA (`glassesRim`): flat wire rings off the face → round rims laid on the face, bridge, arms. 2330 → 2650 (+13.7 %).
- Bram, PEAK-BRAM (`peakCurved`): the flat cap's plank peak → a curved, sloping visor under the crown. 3630 → 3670.
- Odile, PEAK-ODILE (`peakCurved`): the uniform cap's plank peak → a curved visor from under the band. 2436 → 2476.
- Nell, GOGGLES-NELL (`gogglesGlass`): gold drums with flat faces → brass cups, rolled rims, dark glass (#382b14 =
  0.28 × the brass), a bridge. 2768 → 3126 (+12.9 %, incl. +32 of batch 1's apron edge, which her file had not had).
Candidates: `characters/citadel2/export/`; request `tools/testlab/requests/CAST-POLISH-CITADEL-2.diff` (on top of
CAST-POLISH-CITADEL.diff; checked with `git apply --check`) + `CAST-POLISH-CITADEL-2/*.json`. Looked at in the review
scene (faces front/¾/side), in the game (Follow/Medium, dialogue, close-ups, 13 poses × 2), Blender views of Mira and Nell.
Tests: solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30 PASS. `assets/poly` put back.
States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: triangles/draws measured, frame time not
run · integrated: no (request). Pictures `docs/future/characters/{mira,bram,odile,nell}/`.

### Citadel batch 3: the guard (VISOR-GUARD): CAST-POLISH-CITADEL-3 (8.11.2026)
Surveyed in the review scene (scratch `blend/survey3.png`): Tim, Lulu, Doran, Joe, the guard, Dot (pim); Arthur earlier.
Only the guard has a clear weakness: his visor was a flat box (two black bricks either side of the trunk).
- Guard, VISOR-GUARD (`visorCurved`, his CAST entry; vguardG keeps the box): a band of the helmet's curve round the
  front, 1–1.6 cm proud, the same dark glass. 3578 → 3718 tris (+3.9 %). Export `characters/citadel3/export/guard.json`,
  views `citadel3/previews/guard-after`, validate 0 fails (2 warnings as before: feet −1.2 cm, loose vertices).
- The others read well at Follow/Medium and in close-up (no change proposed): Tim, Lulu, Doran, Joe, Dot, Arthur.
- In the game (Follow/Medium, dialogue, close-ups, 13 poses) and Blender views looked at. Tests: solidnpc 54/54,
  chapter1 23/23, cast-rounds 209/209, story-journeys 30/30 PASS; `assets/poly` put back. Pictures
  `docs/future/characters/guard/`; request `requests/CAST-POLISH-CITADEL-3*` (on top of CITADEL and CITADEL-2).

### Zeelich batch 1: the Esmers (ROBE-EDGE-ESMER, BOOTS-ESMER, ARMS-ESMER): CAST-POLISH-ZEELICH (8.11.2026)
Census (`jobs/census-z.mjs`, all 147 people at load; `zeelich/reports/census-all.json`): the six Esmer looks dress 28 people
(keeper ×8: keeper, ilo, marl, zc_guard, zt_guard, zt_guard2, up_guard, esren; clerk ×6: clerk, aven, zc_clerk, up_clerk,
ot_keep, ot_clerk; oku ×5: oku, pask, up_esmer, ennu, hs_worker4; xil ×4: xil, zc_courier, up_courier, oshra; councilChair ×3:
chair, velo, ot_boss; nara ×2: nara, sefa) plus ~20 of the isles (islandlife.js, lazy). Surveyed in lookdev (keeper, clerk,
oku, xil, councilChair, nara, councilB): the Esmers read worst of the region (paint robe, slipper feet under shins that end in
the air, stick arms). LBA2 measured read-only (`tools/lba-source/measure.py`, bodies 80 and 186, numbers only): the capsule is
the original's and stays; feet 0.2 H x 0.09 H x 0.06 H (ours 0.15 x 0.04 x 0.03), arms +-0.021-0.027 H (ours 0.014-0.017).
- Edit (`cast_poly.py` build_esmer + `esmer_boot`, `limb_legs(foot=)`; `ESMER_OLD=1` = the old build, which equals the
  committed six files exactly): robe 0.8 cm off the body with rolled hem and collar in the trim hex; boots 0.19 x 0.06 x 0.06 H
  with a shaft (foot below, shin above); arms 0.017-0.020 H.
- Budget: body +18.1 % (keeper/xil/nara 1504 -> 1776), +17.7 % (clerk), +14.4 % (oku/councilChair 1884 -> 2156); bones, order,
  eyes, mouths, weights, colours unchanged; DRESS-1 variants 1-6 recolour everything (keeper, oku, clerk); validate 0 fails.
- In the game: hero 4 draws before and after; Zeelich street (chapter 3) 797 = 797 calls (SwiftShader), 760 = 760 (Vega 8),
  +1360 tris; Vega 8 20 s x 2 pairs: median 17.7/17.7 -> 17.6/17.6 ms, p95 18.4/18.5 -> 18.2/18.3 (no measurable regression,
  at the 60 Hz cap).
- Tests (the six in assets/poly, renamed shell `SHELL_EXE`): solidnpc 54/54, chapter1 23/23, cast-rounds 209/209,
  story-journeys 30/30 PASS; assets/poly put back.
- Files: `characters/zeelich/{source,export,work,previews,reports}`; jobs `zeelich-*.json`; new tools `zeecap.mjs` (Zeelich's
  street in chapter 3; GPU=1 frame times), `posecap.mjs` (13 poses whole-body in lookdev; `views=` turns the body),
  `census-z.mjs`; lookcap.mjs takes SHELL_EXE. Pictures `docs/future/characters/{keeper,oku,xil,nara,clerk,councilChair}/`
  (chapter 3+: never to the user). Request `tools/testlab/requests/CAST-POLISH-ZEELICH*` (+ note in WORLD_ART_REQUESTS.md).
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance verified ✓ (draws/triangles; Vega 8 frame time
  in Zeelich's street, light check) · integrated: no (request for the cloud).
- Left: in doze the Esmers' feet lie apart from the shins (rig pose, before and after); cone hands; keeper x8 / oku x5 one
  body each; Otringal's Quetch (councilB x4, lharWoman's zc_petit) untouched.

## Current
- CAST-POLISH-ZEELICH ready for the cloud (applies on origin + HEROES, CITADEL, CITADEL-2, CITADEL-3).

## Queue
1. ~~Twinsen~~ (CUFF-HEM, request sent)
2. ~~Zoé~~ (NECKLACE-ZOE, request sent)
3. ~~Citadel's recurring people~~ (CITADEL, -2, -3)
4. CLOUD_ORDERS 28, by region: Zeelich and Otringal (batch 1, the Esmers: CAST-POLISH-ZEELICH), the isles, Desert
   Island, the Hamalayi, the underground
5. The named cast
6. The most shared models' shape variants (`<look>_b`)
7. Equipment: the ball, the sword
8. Common props

## Next action
Zeelich batch 2: the keeper shape variant `keeper_b` (order 24: a new LOOKS entry + JSON, the people by id; e.g. the guards
zc_guard, zt_guard, zt_guard2, up_guard as a helmeted, heavier Esmer, Ilo/Marl/Esren keep keeper), then `oku_b`; then
Otringal's Quetch (councilB on kira/sanna/ama). Diffs go on top of CAST-POLISH-ZEELICH (base: origin + HEROES, CITADEL, -2,
-3, ZEELICH applied in a scratch git repo). Browsers with `SHELL_EXE` (a renamed copy of the headless shell); server 8257.
