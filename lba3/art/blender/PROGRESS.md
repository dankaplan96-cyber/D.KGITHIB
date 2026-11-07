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

## Current
- (next) Twinsen: `tools/blender/twinsen_poly.py` → `assets/poly/twinsen.json`.

## Queue
1. Twinsen
2. Zoé
3. Citadel's recurring people
4. CLOUD_ORDERS 28, by region: Zeelich and Otringal, the isles, Desert Island, the Hamalayi, the underground
5. The named cast
6. The most shared models' shape variants (`<look>_b`)
7. Equipment: the ball, the sword
8. Common props

## Next action
Start the agent on Twinsen: capture him in the game (Follow/Medium and the dialogue close-up), record his budget,
then run `twinsen_poly.py` through the bridge (`script` op) into `art/blender/characters/twinsen/`.
