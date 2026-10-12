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

## Stage 3
- Region performance: the regions place their rocks and pines through `lodInstances` (kit.js), using
  per-tile near and far geometry like the Citadel's vegetation. The 2.6× coarser `-lo` sculpts of rocks and
  trees are in the bake. Measured at the game camera (software GL):
  - Hamalayi (Lhar): 2.64 M → 0.52 M triangles.
  - Desert Island (plaza): 0.93 M → 0.30 M triangles.
- Lhar village square (Hamalayi): the bare paved circle now holds:
  - a stepped stone shrine with a flag pole and four prayer-flag lines;
  - a ring of boundary stones with gaps for the paths;
  - two lanterns, a woodpile and a sledge.
  Colliders keep the NPC paths clear (capture 07).
- Council chamber (Zeelich, chapter 9). The room was a flat, evenly lit box. It now has:
  - Esmer columns along the side wall and flanking the window (none on the near side, where they would hide
    the hearing);
  - the planet-in-its-shell emblem above the window, and cushions on the seats;
  - a brass edge on the dais, two lamps beside it and wall sconces;
  - a clerk's table by the door, and plants under the banners;
  - a soft shaft of pink light from the cloud window over the dais. The even overhead light is dimmed, so the
    room has warm lamp light against the cool window light (capture 08).
- Desert Island ground: the colour now follows the dune crests:
  - pale crests and a warmer lee side;
  - broad patches of redder sand, so open ground no longer reads as one flat orange plane. The levelled plaza
    barely changes.
- Verified: chapters 6, 7, 9 and 10 and combat (22/22) pass after these changes; no page errors in the region
  captures.

## Stage 4
- Draw calls at the Citadel. These are counted per object in the main pass and the sun's shadow pass;
  the shadow pass was the larger.
  - The harbour (quay, shed, rack, lamps, beds, barrels, crates, bitts) is merged per material. Parts that
    move or toggle are marked `userData.keep`, which `mergeStatic` now honours on ancestors: the fishing boat
    and the ferry each bob as a whole and are merged within their own groups, and the story toggles the
    Esmer cargo. The harbour went from ≈335 calls to ≈117.
  - Picket fences were one mesh per picket and per tip (≈100 calls). Each run is now merged (2–3 calls).
  - The town's street dressing is one merged group: lamps, benches, pots, barrels, signs, tools, the radio,
    low walls and curbs. The laundry line stays separate.
  - Small props (under 2 m across) stop casting into the shadow map beyond 24 m from Twinsen, with 2 m of
    hysteresis. Positions are read live, so moving props are handled. Their shadows there are a few texels
    wide.
  - Measured (software GL, same frames as the baseline captures), no visible change (R6 vs R9):

    | View | Before | After |
    |---|---|---|
    | Street | 1,053 | 767 |
    | Square | 773 (after the shadow step only; no earlier measurement) | 618 |
    | Harbour | 1,103 | 623 |
- Faces at close range: the head shells' smoothing angle is raised (Twinsen 60° → 85°, the cast 50–55° → 80°).
  The shading no longer breaks into flat planes across the cheeks and jaw. The silhouette is unchanged,
  including LBA2's wedge-shaped head and short snout (captures 09, 10). The Grobos' heads use another path
  and are unchanged.
- Verified: see the test list in PROGRESS.md for this stage.

## Stage 5
- Coast check: shoreline captures were taken at six compass points (found from the terrain, not guessed).
  - The coves have sand and foam.
  - The cliff coast drops below the camera's line of sight, so the waterline rarely shows. No change made.
  - The captures showed a real readability problem instead: trees, lamp posts and terrace edges hid Twinsen
    completely from the exterior camera.
- Occlusion silhouette: where something hides the player's character, a faint flat blue silhouette shows
  through. Houses still fade as before.
  - How it works: the body (and the eyes, the sword and the ball) writes 1 into the stencil where it is seen.
    The silhouette, a second skinned mesh on the same skeleton, draws only where the depth test fails and the
    stencil isn't 1, so the body never ghosts through itself or through what Twinsen holds.
  - The composer's target now has a stencil buffer.
  - It applies to Zoé's and the worker's bodies during their segments too (capture 11).
- Idle: two more fidgets (a stretch, a glance at the sky), so a long idle repeats less. The existing ones are
  look-around, weight shift and scratch head. Talk keeps its five gestures.
- Verified: combat (22/22), chapters 1 and 5 pass. Standard captures (R11) show no change apart from the
  silhouette where Twinsen is hidden; no page errors.

## Remaining (ranked)
1. Cliff bases still slightly soft; shoreline and water edge.
2. Animation polish beyond idle: turn-in-place steps, landing variety, NPC-specific idles.
3. Draw calls: vegetation tiles (≈140 instanced calls in view, ≈110 in the shadow pass) could use larger
   tiles; the remaining loose props in island.js (station, depot, pipeline) could be merged like the harbour.
4. Head outlines are still 7–11-sided at close-up range (shading is smooth; the outline is geometry).
