# QUIET-ROCK — the quiet granite on every terrain's flat rock (the user, 26.11)

Status: **Implemented, on by default.** **`?quietrock=old`** gives the cliff tile on the flat as before. Automated
runtime only (SwiftShader, headless Chromium). No one has looked at it on a real GPU or played it.

The user approved Knartas's quieter rock (KNARTAS-PALETTE.md, "A quieter rock") and asked to apply it game-wide:
every island's flat bare-rock patches, each in its own colour.

## How (one mechanism for every terrain)

The cliff tile's light facets and dark cracks read as crazy paving on flat ground. The terrain shader reads the rock
triplanar: two reads from the sides (the faces) and one from above (the flat ground).

- **The read from above takes the granite.** This is Otringal's pale granite tile (`graniteTex`, now in
  `src/game/quietrock.js`). The sides keep the cliff tile, so the steep faces keep their carved look.
  - `terrain.js`: a sampler `tRockTop` and a tint `uRockTop`. By default they are the rock tile itself, times 1.
  - It is the same shader text for every terrain, so the program is the same and nothing is recompiled.
- **The tint keeps each place's colour.** The granite is tinted, per channel in linear light, to the cliff tile's mean:
  `tileTint(cliff, granite)`, read once from the two canvases.
  - Measured in the page: (0.590, 0.552, 0.764). That matches the tiles' means from KNARTAS-PALETTE.md
    ((0.291, 0.263, 0.329) ÷ (0.494, 0.476, 0.430)).
  - **× 0.9 for the screen** (`quietrock.js` SCREEN), so the tint in use is (0.531, 0.497, 0.688). At the same linear
    mean, the quieter tile read 3–10 levels brighter on screen: Citadel's box (112, 108, 120) → (115, 111, 123), and
    the desert's (138, 130, 129) → (148, 140, 138). The likely cause is that the tone curve and the sRGB encoding are
    concave, so less contrast gives a higher mean. The 0.9 brings the boxes back to within a few levels (table below).
  - The vertex colours and splat weights are untouched. So every island keeps its own rock tint, and the in-game map
    (it reads them) is unchanged.
  - The rock's edge wobble reads the tile's brightness (`dot(rock, 1/3)`). With the 0.9 its mean is 0.03 lower on the
    flat. That moves the edge by about 0.009 of splat weight, toward less rock (an estimate). No splat correction was
    made. Knartas needed × 0.81 because its granite stayed pale: a shift of +0.052.
  - Measured on the captures, the turf-green share per frame (G over R and B by 12, and by 4) moved by 0.1 point at
    most: Citadel 7.42 → 7.43 %, Mosquibee 3.00 → 3.02 %, Under Celebration 11.96 → 12.06 %, the Old Watch 51.92 →
    52.09 %, Celebration 7.84 → 7.92 % (at 4).
- **Knartas and Otringal are unchanged.** Their rock is already the granite on every face (Knartas's approved recipe).
  For them the top read is that same tile, times 1.

## Sweep: every terrain in the game (`new Terrain(` has four callers)

| Place | Rock before | What changed |
|---|---|---|
| Citadel (`world.js`) | cliff tile; WA-12's wild ground puts broad flat rock patches outside the town | **changed**: the flat rock quiet; the cliff meshes (`cliffs.js`) and steep terrain keep the carved tile |
| Mosquibee | cliff tile, `BARE` rock 0.4 | **changed** |
| Celebration | cliff tile, `BARE` rock 0.65 | **changed** |
| Under Celebration (undergas) | cliff tile, `BARE` rock 0.65 | **changed** (the busiest before: dark crazy paving across the yard) |
| The Platform | cliff tile, `BARE` rock 0.4 | **changed** |
| The Old Watch, Nectar Orchard | cliff tile, no `BARE` (rock on slopes only) | **changed** by the same switch: only where a slope's rock faces up (the Old Watch's patch by the spawn). The Orchard shows no rock at its spawn (4,292 pixels differ, all faint) |
| Desert Island (`desert.js`) | cliff tile; `rockAt`'s outcrops lie on the flat high ground | **changed** |
| Hamalayi (`hamalayi.js`) | cliff tile; the blurred rock band at the cliffs' feet and tops | **changed**: the tops of the rock walls. The walls keep the carved tile |
| Knartas | granite on every face (#17b, approved) | unchanged (its read from above is the same granite, × 1). Its capture differs only round Twinsen's idle pose |
| Otringal | granite on every face (`turfRock`) | unchanged (same as Knartas) |
| The Lift Dock | decks; a probe of its group found no splat mesh | not applicable (the code path would apply if it drew one) |
| Zeelich (the spaceport, `zeelich.js`) | its own granite meshes, no `Terrain` | not applicable |

Other uses of the cliff tile are not flat ground, and were left alone:
- Citadel's cliff blocks (`cliffs.js`);
- the old School's rock walls in `desertold.js` (vertical boxes);
- `zeelich.js`'s cliff UVs (a ring wall).

### Visible changes (for the user's pick)
- Every place above marked "changed": the flat rock is the speckled granite in the place's own rock colour, where it was the
  faceted cliff tile. The faces keep the carved tile. **This differs from Knartas**, where the faces became granite too
  (the approved recipe, kept). If the user wants one look, say so: either Knartas's faces go back to the carved tile, or
  every other place's faces take the granite too. Each is one line.
- Mid slopes (about 45°) show both tiles blended by the triplanar weights. On the desert's outcrop flanks and the Old
  Watch's patch this reads as faint strata under the speckle. Inspected on the captures; not tuned.

## Measured on the captures (1280×720, play camera Far, the same spots and settings)

Before = the branch at `768cb2a2` (served from an export of that commit); after = this change. "Fine" is the standard
deviation of luminance after a 6 px Gaussian high-pass (how busy the pattern reads), as in KNARTAS-PALETTE.md.

| Box (x0, y0, x1, y1) | mean RGB before → after | luminance SD | fine SD |
|---|---|---:|---:|
| Citadel, flat rock (200, 450, 560, 650) | (112, 108, 120) → (110, 106, 117) | 39.7 → 29.6 | 24.7 → 14.2 |
| Mosquibee, the patch at his feet (340, 600, 740, 710) | (80, 62, 44) → (83, 65, 46) | 21.1 → 9.2 | 13.5 → 5.9 |
| Under Celebration, the yard's rock (860, 420, 1270, 680) | (40, 25, 32) → (41, 26, 32) | 14.6 → 8.5 | 9.6 → 3.7 |
| Desert, the outcrop (80, 420, 560, 700) | (138, 130, 129) → (142, 134, 132) | 33.5 → 17.2 | 24.2 → 11.8 |
| Platform, the lip (300, 640, 900, 710) | (99, 64, 41) → (93, 59, 37) | 16.2 → 13.2 | 9.6 → 7.9 |
| Old Watch, the patch (700, 500, 940, 620) | (60, 64, 40) → (60, 64, 39) | 12.2 → 10.1 | 6.8 → 4.5 |
| Celebration, lower left (0, 600, 220, 720) | (61, 46, 29) → (56, 43, 26) | 14.5 → 13.0 | 5.8 → 3.3 |

Over all the pixels that changed (dilated 4 px), the means are:
- Hamalayi (the walls' tops): (139, 130, 134) → (136, 129, 132);
- Citadel: (112, 111, 122) → (108, 106, 115);
- desert: (139, 132, 130) → (140, 133, 130);
- Mosquibee: (89, 70, 50) → (86, 68, 48).

Where the rock is flat, the fine pattern drops to 40–60 % (to 38 % in Under Celebration's yard, now the flattest
result: the user may judge it too plain). On slopes it drops less.

The bright places keep their colour within about 4 levels per channel. The × 0.9 was fitted to them (Citadel, the
desert, Mosquibee). The dark ones end up darker:
- the Platform's lip is −6 levels;
- Celebration's corner is −5;
- Citadel's blue is −7 over all its changed pixels (−3 in its box).

A per-place screen factor would fix that, but was not done.

## Cost (automated runtime only: SwiftShader)

renderer.info for one frame (main and shadow passes), one page, the spots in this order, before → after:

| Spot | calls | triangles | geometries | textures | programs |
|---|---:|---:|---:|---:|---:|
| Citadel (−154, −17) | 200 → 200 | 421,393 → 421,393 | 1338 → 1338 | 450 → **451** | 92 → 92 |
| Mosquibee (2582.3, 1778.4) | 73 → 73 | 506,930 → 506,930 | 1385 → 1385 | 467 → **468** | 95 → 95 |
| Celebration (spawn) | 51 → 51 | 227,988 → 227,988 | 1408 → 1408 | 486 → **487** | 95 → 95 |
| Under Celebration (3242.3, 1803.3) | 41 → 41 | 144,225 → 144,225 | 1424 → 1424 | 491 → **492** | 96 → 96 |
| Platform (spawn) | 80 → 80 | 494,452 → 494,452 | 1473 → 1473 | 518 → **519** | 96 → 96 |
| Old Watch (spawn) | 33 → 33 | 32,240 → 32,240 | 1483 → 1483 | 520 → **521** | 96 → 96 |
| Orchard (spawn) | 45 → 45 | 284,283 → 284,283 | 1504 → 1504 | 523 → **524** | 96 → 96 |
| Knartas (spawn) | 81 → 81 | 655,118 → 655,118 | 1556 → 1556 | 540 → 540 | 97 → 97 |
| Desert (3449.6, 62.5) | 30 → 30 | 84,452 → 84,452 | 1565 → 1565 | 555 → 555 | 99 → 99 |
| Hamalayi (4245.5, 30.5) | 65 → 65 | 375,191 → 375,191 | 1601 → 1601 | 574 → 574 | 101 → 101 |

A second page (Under Celebration (3185.3, 1763), Hamalayi (4327, 14), (4310, 40)) gave textures 461 → 462, 480 → 481 and
483 → 484. Everything else was the same.

- **+1 texture: the granite tile** (512², mipmapped: about 1.4 MB of GPU memory, an estimate 512 × 512 × 4 × 4/3). It is
  now made with Citadel at startup, where before it came with Otringal or Knartas. From Knartas on, the counts are equal
  because the before run had the same tile by then.
- **No new program**: the shader text is the same for every terrain, and only the uniforms differ.
- Per terrain pixel: no new texture read. The read from above moves to another sampler, and one vec3 multiply is added.
  One more sampler is bound per terrain draw (6 instead of 5).
- Build: `tileTint` reads the two 512² canvases once per page (about half a million pixels), at Citadel's build. Not
  timed separately. The region builds in the table (`buildMs`) are within noise: for example, the desert took 846 ms →
  921 ms, and Hamalayi 895 ms → 881 ms.
- Not measured: GPU time and frame time on a real GPU. renderer.info cannot see fragment cost.

## Tests (each run once, SERVE=1, automated runtime only (SwiftShader))

Final code, with the branch head (P135) merged:
- `tests/worldfit.mjs` (whole): **PASS**, functional 1/1, visual 8/8.
  - (3) z-fighting: 0 judged. Before, Knartas had 12 clusters on the huts' door sills: stone against the plaster of the
    portal's floor at the sill's height. The fix is the next section.
  - Knartas's scan now lists one small cluster (0.07 m², stone against stone, at (2193.8, 2.9, 1779.3)). It is under
    the 0.15 m² bar, so it is not judged.
- `tests/island-doors.mjs` (all regions): **FAIL, 86 passed, 3 failed.** All three fail the same way on the base. This
  change touches only terrain textures and the huts' 1 cm sill: no collider, door or text.
  - "isle_otringal: each door kept shut gives its own reason" and "the shut doors' lines are their own": the pump
    house's door (`otringal-16-6`) is now the KEYS-CLOVER lock (`kc_lock`, keysclover.js), where the suite wants
    `ihx_pump`. **The same two fail on the base** (`768cb2a2`, `REGIONS=isle_otringal`, served from an export of that
    commit). It is a suite/story disagreement and is handed to the coordinator.
  - "the keepers stand in their rooms and talk": **it also fails on the base.** With `REGIONS=desert`, the base export
    and the final code give the same result, 12 passed and 2 failed: this check, plus "Knartas … reached on foot",
    which a `REGIONS` run always fails (no Knartas walk). Every keeper listed is present, in their room and talked.
    The logged detail is cut off, so the part that fails is not shown: the count of lines said, or an entry past the
    cut-off. Not in KNOWN-FAILING.md. Handed to the coordinator.
  - Every island's doors otherwise passed: no generic "Locked.", every room entered, saves inside / Continue.

- `?quietrock=old` (captured on the final code, Citadel and Mosquibee): the rock boxes are identical to the before
  captures: (112, 108, 120) and (80, 62, 44), the same SDs. The textures are 450 and 467, as before. Mosquibee differs
  only round Twinsen (1,114 pixels). Citadel also differs in the paths P135 changed and in the tutorial prompt.

## The huts' door sills (the coordinator's item, 26.11)
`worldfit` (3) failed on Knartas with 12 clusters, one per hut door. The cause is `franco.js` `francoHut`: the portal's
plaster panel has its arched opening at its foot, so `ExtrudeGeometry` gives the opening a plaster floor facing up at
the sill's height. The stone sill's top was at the same height. The sill's top is now 1 cm higher, so the stone covers
the plaster. This is one line in `francoHut`, which every hut uses (only Knartas builds huts). It is visual only: the
colliders are unchanged.

## Files
- `src/engine/terrain.js`: `tRockTop`, `uRockTop` and `tileTint`. This is a shared engine file.
- `src/game/quietrock.js` (new): `graniteTex` (moved from `zislands.js`, byte-identical), `quietRock`, `?quietrock=old`.
- `src/game/zislands.js`, `world.js`, `desert.js`, `hamalayi.js`: each terrain's textures take `...quietRock(TX.cliff)`.
- `captures/quiet-rock/sheet.png`: before/after pairs at the play camera (Far), one per place changed (not the Orchard,
  which shows no flat rock at its spawn). Scripts are not committed: `<session scratchpad>/quietrock/cap.mjs`, `meas.py`,
  `find.mjs` (spots from the splat data).

## Untested
- `?knartaspal=old`: Knartas then skips the quiet rock, so it keeps the old ground whole (one line in `zislands.js`).
  This is not run.
- Chapter or lighting states other than the new game's, the in-game map (unchanged by construction: vertex colours and
  splat are untouched), and any real GPU.
