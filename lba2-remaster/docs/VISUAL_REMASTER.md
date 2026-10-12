# Visual remaster — log

Captures: `captures/remaster/` (our own renders: before on the left, after on the right). Conditions: headless
Chromium with SwiftShader software GL, 1280×720, the real game cameras (capture script kept in the session
scratchpad as `vis.mjs`: street, square, harbour, hill, Twinsen and Zoé close, house interior, arena).

## Diagnosis of the baseline (ranked by how much the player sees it)
1. Characters didn't read at game distance. Twinsen's upper body was one block, his hands were bare spheres, the
   neck a thin cylinder, the hair a sphere and the eyes flat diamonds; the head (0.157 H) was smaller than the
   references (≈0.19 H). Zoé was a red tube with capsule arms, sphere hands and an antenna-like ponytail.
2. No anti-aliasing: the post-processing chain rendered into a single-sample target, so the canvas's
   `antialias` never applied.
3. Shadow edges crawled as Twinsen walked: the shadow camera followed him continuously.
4. Cliff feet had a dark halo (vertex-colour darkening down to 0.62), and a blurred purple band of rock
   colour spread around every cliff (rock splat on a ~0.93 m grid).
5. Grass read as neon (a cool pure green under a strong sun).
6. Heavy frames: ≈1,000–1,200 draw calls and 2–3.6 M triangles per outdoor frame (shadow pass included).
   Not yet addressed.
7. Interior floor planks tinted in random hues (busy). Not yet addressed.

Not a defect: the "Twinsen on a roof" frame in the first baseline came from stale capture coordinates (he
really stood on the shop roof).

## Stage 1 (this commit)
- Renderer: 4× MSAA (2× on Medium, none on Low and Retro) in a half-float multisampled target.
- Shadows: 4096 map over ±48 m on High (2.3 cm texels), and the shadow camera moves in whole texels.
- Twinsen (tools/blender/twinsen_poly.py), same silhouette as the original:
  - head +12% and smoother (11 points per section, blended in-between sections);
  - almond eyes with iris, pupil and lid;
  - a hair shell over the back of the skull, and a bun with a tie;
  - cuffs with a dark inside, mitten hands with a thumb, slippers on soles;
  - a round medallion with a rim on a red cord;
  - the belt's knot;
  - a hem lip (cloth thickness) and soft folds in the robe.
- The cast (tools/blender/cast_poly.py, every other character):
  - the same eyes and hands;
  - smoother Quetch heads with a hair shell;
  - rounded shoulder caps, shaped shoes;
  - folds and a hem lip on long garments;
  - Zoé's ponytail tied at the back of the crown and falling down her back.
- Terrain: cliff-foot darkening limited to 0.86; rock splat only on truly steep ground; warmer grass and
  grass tufts.
- Verified: no page errors in the captures. tests/combat.mjs 22/22, prologue and chapter 8 pass after the
  change.

## Stage 2
- Performance:
  - Distance detail per vegetation tile: tree and bush tiles beyond 40 m from Twinsen swap to the same
    sculpt on a 2.6× coarser grid (about 1/6 of the triangles), with 4 m hysteresis.
  - Grass and flower tiles beyond 58 m are hidden.
  - Measured at the Citadel street (software GL, same frame): 3.63 M → 1.98 M triangles, 1,177 → 1,053 draw
    calls. No visible change at the game camera (captures R4/R5).
  - The bake was regenerated, so load time is unchanged (world ≈1.36 s in the headless browser).
- Textures:
  - Planks, tiles, stone and rubble textures multiplied each colour channel by its own random factor, which
    shifted the hue block by block (green, pink and orange planks on the house floor). Now one brightness
    factor per plank or block (capture 06).
- Verified: tests/chapter1.mjs and tests/combat.mjs pass.

## Remaining (ranked)
1. Draw calls (~1,050 outdoors, half from the shadow pass): merge small static props, trim shadow casters.
2. Faces: heads are still faceted at close range (fine at game distance).
3. Interior lighting variety per room.
4. Cliff bases still slightly soft; shoreline and water edge.
5. Animation polish (idle variations, talk gestures) — see the character guide's checklist.
