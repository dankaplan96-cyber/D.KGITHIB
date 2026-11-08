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

### Zeelich batch 2: keeper_b, oku_b, GLASSES-CLERK, GLASSES-SELA: CAST-POLISH-ZEELICH-2 (8.11.2026)
CAST-POLISH-ZEELICH was pushed (7b34fc50, requests only; the base for this diff = origin + HEROES, CITADEL, -2, -3, ZEELICH
in the scratch repo `scratchpad/z28/base`).
- keeper_b (council guard, after LBA2 body 80's helmeted Esmer): not slim, helmet (role `helmet` #4a6a5a) with peak and neck
  guard, belt #6a4a2a + buckle. People: zc_guard, up_guard, zt_guard, zt_guard2. 2224 tris (+20.7 % on keeper).
- oku_b (working Esmer): upright, long flared robe, headcloth (oku's hat hex), dark brows, height 0.97. People: pask, ennu,
  hs_worker4. 2128 tris.
- GLASSES-CLERK (clerk x6, cheap cords: 1808 -> 1950 body, +27 % on the shipped 1536 over both batches) and GLASSES-SELA
  (councilB x4: 2662 -> 2982); CAST `glassesRim` (Quetch branch new, Esmer branch new).
- Code: characters.js 2 LOOKS entries; chars in storylife.js, roomlife.js, story/hostel.js; skeletons.json + 2 looks
  (`dump-skeletons.mjs`, a copy in scratch with SHELL_EXE); assets/poly/index.json + 2 names.
- Checks: contracts and DRESS-1 variants 1-6 clean; validate 0 fails; census keeper x4 / keeper_b x4 / oku x2 / oku_b x3;
  chapter 9 street 709 = 709 calls (SwiftShader), 643 = 643 (Vega 8), Vega 8 median 17.3/17.4 -> 17.4/17.4 ms.
- Tests (both batches' files in assets/poly): solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30,
  interior-life 144/144 PASS; assets/poly put back (keeper_b/oku_b removed, index restored).
- Tools: zeecap.mjs takes KEY/FLAGS (a chapter by its flags), IDS, ROUTES (serve old code files for a before run);
  lookcap.mjs takes FY (face height). Files `characters/zeelich2/`; pictures `docs/future/characters/{keeper_b,oku_b,clerk,
  councilB}/` (chapter 3+: never to the user); request `tools/testlab/requests/CAST-POLISH-ZEELICH-2*`.
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance verified ✓ (light) · integrated: no (request).
- Left: doze feet (rig); helmet facets up close; Kira still Sela's shape (a councilB_b later); lharWoman unchanged (reads fine).

### Isles batch 1: zmole1_b (the Wannies at work): CAST-POLISH-ISLES (8.11.2026, worktree `C:\Users\dan\lba3-cast2`)
ZEELICH-2 pushed (b8d3d9ae); the cloud applied HEROES, CITADEL 1-3 and ZEELICH. New worktree `lba3-cast2` at local HEAD
803efcd1 (origin b8d3d9ae + ZEELICH-2 applied, its JSONs in assets/poly); the old `lba3-blend` worktree is stale.
- Survey: the isles' people (islandlife.js) are the Esmers (done) and Zeelich's other races (moles, bees, tri-heads), all
  reading as designed; the tri-heads' flat feet are LBA2 body 84's (a flat plate ~0.11 H), left. zmole1 is the most shared
  (x8 with Grumm and hs_worker3).
- zmole1_b: miner's cap (role hat #d8a838) with band, peak and lamp; leather apron (role apron #7a5a3a, zmole2's apron
  code). People: pf_miner1 (Burr), pf_miner2 (Delve), ug_fitter (Dunt). Body 2578 -> 3010 (+16.8 %); 3 draws as zmole1.
- Code: characters.js +1 LOOKS; islandlife.js 3 chars; skeletons.json + zmole1_b (bones = zmole1's); index.json.
- Checks: contracts, DRESS-1 1-6 clean, validate 0 fails; the Platform in chapter 4 before/after (ROUTES: old islandlife.js).
- Tests: solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, island-people 65/65 PASS.
- The worktree keeps the batch applied, uncommitted: zmole1_b.json and the index in assets/poly (the code needs them).
- Files `characters/isles/`; pictures `docs/future/characters/zmole1_b/` (chapter 4+: never to the user); request
  `tools/testlab/requests/CAST-POLISH-ISLES*`. zeecap.mjs takes ROOM (an isle room, with KEY).
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: draws/triangles measured, Vega 8 frame time
  not run (no draw added) · integrated: no (request).
- Left: the Esmer children (xil x0.72); zmole2, zbee1, zbee2 (x6 each) one body each; doze feet.

### Desert batch 1: desertkid_b, farmerC_b, GLASSES-ARCHIVIST: CAST-POLISH-DESERT (8.11.2026, `lba3-cast2`)
ISLES pushed (f4f66ab7) and committed locally as HEAD 59dab6e3 ("local base: + CAST-POLISH-ISLES"); this diff is against it.
- Census (`desert/reports/census-all.json`): the dig x8, the School x5 (+3 inside), Kesh x3, the story people. Order 24's
  models there: desertkid x6, farmerC x5, archivist x5 (also wearing the flat glasses).
- desertkid_b: straw sun hat (role hat #d8b860) + tail of hair; people pico, sc_pupc; body 2444 -> 2928 (+19.8 %).
- farmerC_b: bare-headed, belly 0.05; people dg_haul (Gorrum), lh_grum (Bodo); 3538 -> 3234.
- GLASSES-ARCHIVIST (CAST glassesRim): 2414 -> 2734 (+13.3 %).
- Code: characters.js +2 LOOKS; storylife.js 3 chars, walkrounds.js 1 (pico); skeletons.json +2; index.json +2.
- Checks: contracts, validate 0 fails, DRESS-1 clean on farmerC_b/archivist (desertkid_b = shipped desertkid's own result);
  hero 4 draws; School 145 = 145 calls, dig 180 = 180.
- Tests: solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, walkers 37/37 PASS. desert-life NOT
  finished: a reload did not boot in 20 min after 21 PASS / 0 FAIL; the same on a clean HEAD export (after 12 PASS).
  An environment limit on this laptop; asked the cloud to run it.
- The worktree keeps the batch applied, uncommitted (the three JSONs and the index in assets/poly).
- Tools: zeecap.mjs with IDS no longer limits people to 80 m of the hero.
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: draws/triangles measured, frame time not run ·
  integrated: no (request).
- Left: farmerC_b's lighter belly hardly shows; desertkid's 96 base-hair vertices (pre-existing); worker x4 one body.


### Items batch 1: the bonuses (heart, clover leaf, magic flask, Kash): ITEMS-1 (8.11.2026, worktree `C:\Users\dan\lba3-items`)
The user (8.11): the clover, the heart, the magic and the coins "don't look really good". Detached at e3876e05.
- **Where:** `src/game/actors.js` PICK (world bonuses: givers, containers, crates, beaten enemies, the prologue's coins,
  the cliff clover) and the interface through `pickupModel` (itemlook.js: inventory slots kashes/clovers, the shop's
  potion/flask/clover rows and price coins). Bonuses never show in the found box (found.js). Behaviour untouched (spin,
  bob, radii, the coin's pull, blinking, flight, every type name).
- **References** (the user's LBA2 SPRIRAW.HQR, decoded to a scratch folder, looked at, deleted): the bonuses are 2D
  sprites of 12-14 px: a plump red heart with a white spot; a round light-blue flask with a neck and a flared lip; a
  four-leaf clover in an X; a gold Kash with a rim and a raised mark; the clover box. Nothing kept.
- **New:** `src/game/bonuslook.js` (shapes made once, shared): heart = one cushion from the heart curve (30 points, 3
  rings); clover = four heart-shaped leaflets (notch out), cupped, a knot and a curved stem; flask = one 14-sided lathe
  (belly, neck, lip, stopper); coin = rim/field lathe in bands (crisp edges) + a K raised 8 mm on both faces; crystal =
  its three spikes merged. Materials one per kind, cached, the same program as before (86 = 86 programs), emissive
  0.55-0.7 (was 1.1-1.5), the flask opaque (was transparent). The shard's parts cached too (look unchanged).
  HUD: the clover counter's SVG and the behaviour menu's clover boxes drawn as four leaves (index.html, style.css).
- **Blender** (5.2.3, `props/items/jobs/items-1.json`, 32 jobs OK): baseline and candidate polyprops imported, inspected,
  validated (12/12 pass each, no zero-area faces), previewed (four views, neutral and coloured; `previews/`), and the
  candidate exported back (round trip, same triangle counts).
- **In the game** (SwiftShader, `scratchpad/items/itemcap.mjs`; before = HEAD's actors.js/itemlook.js/index.html/style.css
  served in place): per bonus 1 mesh (was 2-3), 2 draw calls with its shadow (was 4-6); triangles heart 300 = 300,
  clover 420 -> 700, flask 248 -> 420, coin 224 -> 318, crystal 24 = 24. 20 coins: 80 -> 40 draw calls, 8960 -> 12720
  triangles, GPU geometries +40 never freed -> 0. Pictures: `docs/future/items/` (chapter 1, may go to the user).
- **Tests:** chapter1 23/23, givers 16/16, items-ceremony 20/20, prologue 26/26, shops 31/31 PASS; containers 32 checks passed, its Zeelich round trip unfinished (machine load); details in WORLD_ART_REQUESTS.md ITEMS-1.
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: draws/triangles/memory measured
  (SwiftShader), Vega 8 frame time not run · integrated: no (request `tools/testlab/requests/ITEMS-1.diff`).
- Left: the heart potion and the other item looks unchanged (they read); the K is lost below ~40 px; no LOD.


### Hamalayi batch 1: lharMan_b, lharWoman_b, MOUSTACHE-LHAR, GLASSES-ELDER: CAST-POLISH-HAMALAYI (8.11.2026, `lba3-cast3`)
DESERT pushed; the cloud rebuilt ISLES + DESERT on origin df60ad21 (the single-line skeletons.json / index.json conflicted).
New rule: new skeleton and index entries go as `skeletons.add.json` / `index.add.json` in the request folder, never in the
.diff. New worktree `lba3-cast3`, HEAD fb0c0ef0 (origin + ISLES + DESERT, their JSONs).
- MOUSTACHE-LHAR (lharMan x6, CAST moustacheSwept): 2908 -> 2892. GLASSES-ELDER (lharElder x3, glassesRim): 2154 -> 2474.
- lharMan_b: bald, heavier (belly 0.14), longer coat (hem 0.45); people dg_mech, ollo, dov; body 2720.
- lharWoman_b: bun, fuller (belly 0.06); people pell, pell_q, zc_petit; body 2612.
- Request: diff (cast_poly.py, characters.js, storylife.js, roomlife.js) + skeletons.add.json + index.add.json + 4 JSONs.
- Tests: solidnpc 54/54, chapter1 23/23, story-journeys 30/30, interior-life 144/144 PASS; cast-rounds 203/209: the six
  FAILs (chapter 6 Lhar, lhar1/lhar3: a stop without ground) are the same on a clean export of fb0c0ef0: pre-existing.
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: draws measured, frame time not run ·
  integrated: no (request).
- The worktree keeps the batch applied, uncommitted (the four JSONs, the index and skeletons.json in place for the game).

### HANDS-36: the Esmer and tri-head hands as hands hang (order 36, 8.11.2026, `lba3-cast3`)
- `cast_poly.py`: `hand_axes`, `esmer_hand`, `finger_hand` rebuilt (`HANDS_OLD=1` = as before; it rebuilds the shipped
  files). Palm toward the thigh, fingers front to back in two joints curling in, thumb forward; the rig untouched.
- Re-exported: keeper, oku, xil, nara, clerk, councilChair, keeper_b, oku_b (+152 tris, +6.8 to +8.2 %), ztri1, ztri2
  (+120, +7.3 / +7.6 %); colours, bones, eyes, mouths unchanged; hero draws 4 = 4. The Quetch/Grobo/Rabbibunny ball hands
  (`hand_detail`) already had the thumb forward and the knuckles curled in: checked (farmerA, farmerC, desertkid), unchanged.
- Looked at: lookdev hand front/behind/outside, Blender back/side, game Follow + close-ups from behind and 3/4 (keeper,
  oku_b, ztri1 and the three ball-hand looks), 13 poses x 2 (no detached hand, no clipping at the swing). GPU walk: Oda
  0.71 m/s, alternating stride, not slow motion (the camera lost her after 6 frames).
- Tests: solidnpc 54/54, chapter1 23/23, story-journeys 30/30 (rerun after a load timeout) PASS; cast-rounds 203/209 = the
  six pre-existing chapter-6 Lhar FAILs.
- Request `tools/testlab/requests/HANDS-36.diff` (on top of HAMALAYI) + 10 JSONs; pictures
  `docs/future/characters/hands-36/` (`ch3plus-*` not for the user, `citadel-*` may go to the user).
- States: exported ✓ · loaded in game ✓ · visually inspected ✓ · performance: draws/triangles measured · integrated: no.

## Current
- CAST-POLISH-HAMALAYI and HANDS-36 sent 8.11 (both code diffs rebased on origin b4f1763e; apply HAMALAYI, then HANDS-36). ITEMS-1, DESERT, ISLES applied by the cloud.

## Queue
1. ~~Twinsen~~ (CUFF-HEM, request sent)
2. ~~Zoé~~ (NECKLACE-ZOE, request sent)
3. ~~Citadel's recurring people~~ (CITADEL, -2, -3)
4. CLOUD_ORDERS 28, by region: ~~Zeelich and Otringal~~, ~~the isles~~, ~~Desert Island~~, ~~the Hamalayi~~, the underground
5. ~~HANDS-36~~ (order 36: request sent)
6. The named cast
7. The most shared models' shape variants (`<look>_b`): ~~keeper, oku, zmole1, desertkid, farmerC, lharMan, lharWoman~~;
   farmerA, farmerB, clerk, worker (and councilB for Kira; zmole2, zbee1, zbee2)
8. Equipment: ~~the bonuses~~ (ITEMS-1); the ball, the sword
9. Common props

## Next action
Back to the queue after HANDS-36: region 5, the underground (the sewers' and the underground's people), or what the cloud
orders next (CLOUD_ORDERS.md). The moles' claws could take the hands' front-to-back turn too (not asked). Worktree
`C:\Users\dan\lba3-cast3` holds HAMALAYI + HANDS-36 applied, uncommitted (their JSONs, the index and skeletons.json in
place). Browsers with `SHELL_EXE` (scratch `z28/hs/z28shell.exe`), server 8257 (`z28/serve.py <root> 8257`), a test copy of
tests/ with lib/boot.mjs patched (SHELL_EXE, the testlab playwright import).
