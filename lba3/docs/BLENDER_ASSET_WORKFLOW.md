# Blender asset workflow (LBA3)

The tool is `tools/blender-bridge/` (README there). It runs the installed Blender from job files, one job at a time,
and writes only under `art/blender/`. This page is the working method for improving assets with it. The agent that
follows it is `.claude/agents/lba-blender-character-and-prop-artist.md`.

## Rules for every asset
1. **Find where it is used first.** Grep the builder or the look (`props.js` function, `characters.js` look,
   `story/*.js` ids), the rooms that place it, its collider (`B.put` makes one from the footprint the builder returns),
   interactions (searches, givers, pickups, `R.cover`), and for characters every person who uses the model
   (`game.npcs.map(n => [n.def.id, n.def.char])`).
2. **Capture the original in the game** at a fixed camera. Record its budget: triangles, material slots (in-game draw
   calls), textures with their sizes and memory, bones and weights per vertex.
3. **Work on a copy** under `art/blender/<kind>/<name>/`, with these folders:
   - `source/` (baseline)
   - `work/` (.blend)
   - `export/` (candidates)
   - `previews/`
   - `reports/`

   Never write `assets/`, `art/characters/` or `src/` from a job.
4. **One focused change, then the whole loop:**
   1. preview (front, side, back, three-quarter; neutral and textured);
   2. look at the images;
   3. export in the game's format;
   4. load in the game;
   5. compare before/after at the same camera, light and state;
   6. test the interactions, animation and collision;
   7. measure.
5. **Integration is a base-game change.** The cloud applies it, from a request diff in
   `tools/testlab/requests/<ID>.diff` with a note in `tools/testlab/WORLD_ART_REQUESTS.md`. Report each step's state
   separately: *exported*, *loaded in game*, *visually inspected*, *performance verified*, *integrated*.
6. **Reject a candidate** if:
   - it is less recognisable, or its silhouette is weaker at gameplay distance;
   - its materials are flat, muddy or glossy;
   - it floats, clips or slides, or its scale is wrong;
   - an animation or attachment breaks;
   - it costs more without a reason the user accepted;
   - it only looks right in Blender.

## A. Characters
- **The source is the script** `tools/blender/<name>_poly.py` (helpers in `lbapoly.py`). Change shapes there, then run
  it through the bridge:
  `{"op":"script","script":"tools/blender/zoe_poly.py","args":["art/characters/skeletons.json","art/blender/characters/zoe/export/zoe.json","art/blender/characters/zoe/work/zoe_poly.blend"]}`.
  The candidate JSON goes under `art/blender/`. `assets/poly/<name>.json` changes only on integration.
- **The skeleton is a contract.** The bone names and rests in `art/characters/skeletons.json` come from the game's rig
  (`tools/dump-skeletons.mjs`), and `src/engine/rig.js` animates them procedurally. Never rename or move a bone.
  Check `validate` with `"skeleton": "art/characters/skeletons.json", "skeletonKey": "<look>"` and ≤ 4 weights.
- **What to judge:** silhouette at gameplay distance first, then head, face, hair, clothing volume and hems, hands,
  feet, accessories. Twinsen reads by his blue tunic, his hair tuft and his ponytail; Zoé has her own proportions and
  her bun (never a recoloured Twinsen).
  - The measured references are `docs/LBA2_MEASUREMENTS.md`, `docs/character-review.md` and
    `art/characters/<name>/manifest.json` (from the user's own LBA files, numbers only).
  - A fan render is not a reference.
- **In the game,** check these poses: idle, walk, run, turn, jump and land, ball throw, sword, talk, pickup, hurt.
  Look at shoulders, elbows, hips, knees, hands, the tunic, foot contact and weapon alignment. DRESS-1 recolours
  shared models at load, so check a shared model in two of its people.

## B. Buildings and interiors
- These are code (`architecture.js`, `interiors.js`, `lba1room.js` and others). Use Blender to block out and judge
  proportions:
  - export the built group as polyprop with `extractProp`-style code (any `Kit` group works);
  - import, preview and measure;
  - then carry the decided numbers back into the builder code.
- Things to judge:
  - door recesses, roof and eave thickness, readable details;
  - furnished interiors that say who lives there;
  - the cutaway: the camera-side walls and roofs hide by object, so keep a hiding wall a separate object from what
    must stay. Visibility never removes a collider.

## C. Props and equipment
- Use `roundtrip.mjs` as the pattern. A prop keeps:
  - its origin on the floor at the footprint centre;
  - its front at +z;
  - its footprint (the collider);
  - its interaction point (searches and givers are placed by the room, not the mesh);
  - its material recipes (shared cached materials batch together, while a new material is a new draw call).
- Hand-held items attach to the hand bones: check the grip in the hold poses in the game, not in Blender.

## D. Animation
- Clips are procedural (`rig.js`), so an asset edit changes deformation, not clips.
- Inspect the armature (`inspect` lists the bones) before touching weights.
- In the game, check:
  - foot contact and sliding at walk and run speeds;
  - turning in place;
  - transitions;
  - the ball's release frame against the hand;
  - the sword in the hand during the swing.

## Performance (Ryzen 5 3500U / Vega 8)
- Improve in this order, before adding runtime cost: proportion, silhouette, UVs, painted texture, vertex colours,
  baked detail.
- Measure candidate against original:
  - triangles;
  - material slots and the resulting in-game draw calls (`renderer.info`);
  - texture size and memory (w·h·4·4/3);
  - bones and weights;
  - frame time in a representative scene, on the real GPU (`roundtrip.mjs --gpu`, or the Test Lab).
- A smaller file is not a cheaper GPU. Do not subdivide everything, add big textures or stack transparent layers.
- Without a measurement there is no claim. If the GPU was not available, say so.
