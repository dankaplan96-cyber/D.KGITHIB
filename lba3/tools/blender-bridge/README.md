# LBA3 Blender bridge

Runs the **installed** Blender on project-owned Python scripts from a job file: inspect, preview, validate, export and
open assets, and prove an asset in the actual game. It is a command line. There is no server, no network port and no
MCP. Commands run from the game folder `lba3/`.

## What the game actually loads (read this first)
- **Characters** are `assets/poly/<name>.json`: the game's own format, read by `src/game/characters.js` `POLY`. It
  holds unindexed triangles, normals, sRGB vertex colours, 4 bone weights per vertex by bone name, and the eyes as
  separate meshes.
  - They are *generated* by `tools/blender/<name>_poly.py` on the skeletons in `art/characters/skeletons.json`. Those
    skeletons are dumped from the game's rig by `tools/dump-skeletons.mjs`.
  - The `.blend` files in `art/characters/` are by-products the scripts rewrite. The script is the source.
  - Animation is procedural (`src/engine/rig.js`), so there are no clips in the files. A rig contract means bone names
    and rest positions.
- **Props, buildings and interiors** are built in code (`src/game/props.js`, `architecture.js`, `interiors.js` and
  others) and merged per material by `Kit.flush`, so one material is one draw call.
  - The bridge adds **lba3-polyprop**: a prop as data, with game axes, one part per material, and a `recipe` naming
    the game's cached material (`MAT.wood('honey')`), so a round trip keeps the shared material.
  - The game itself does not load polyprop files yet. `tools/blender-bridge/game/polyprop.mjs` loads them into the
    running game for the checks. A game-side loader would be a base-game change, which goes through the cloud.
- **glTF/GLB:** Blender exports it (`"format": "glb"`), but the game has no glTF loader (`vendor/three` ships without
  `GLTFLoader`). GLB is for interchange only.

Axes: in the game (three.js), +y is up, a prop's front is +z, and units are metres. Blender has +z up and the front at
−y. So `blender (x, y, z) = game (x, −z, y)`, and Blender's Front view shows the game front.

## Commands that work on this machine (Windows 11, Blender 5.2.3 LTS, 7.11.2026)
```
node tools/blender-bridge/bridge.mjs discover
node tools/blender-bridge/bridge.mjs run tools/blender-bridge/jobs/chest-roundtrip.json
node tools/blender-bridge/bridge.mjs open art/blender/props/chest_honey/work/chest_honey.blend
node tools/blender-bridge/smoke.mjs
node tools/blender-bridge/roundtrip.mjs            # (--gpu: this machine's GPU through installed Chrome)
```
- `discover` looks for Blender in this order:
  1. `--blender <exe>`;
  2. `LBA3_BLENDER`;
  3. `config.local.json` (copy `config.example.json`; git-ignored);
  4. `Program Files\Blender Foundation\*`, newest first;
  5. Steam, then `%LOCALAPPDATA%\Programs`;
  6. `PATH`.

  Machine paths never go in committed files.
- `run` takes one job or an array, runs them in order and stops at the first failure.
  - Options: `--timeout <s>`, `--no-wait` (fail instead of waiting for another job), `--json` (full results).
  - Each job gets `tools/blender-bridge/.work/jobs/<id>/` with `job.json`, `blender.log` and `result.json`.
- `open` starts Blender's GUI on a `.blend`, detached. The bridge never times out or kills it.

## Jobs (`job.schema.json`)
```json
{ "op": "export", "name": "chest candidate", "input": "art/blender/props/chest_honey/work/chest_honey.blend",
  "output": "art/blender/props/chest_honey/export/chest_honey.candidate.polyprop.json", "options": { "format": "polyprop" } }
```
| op | input → output | what it does |
|---|---|---|
| `import` | polyprop / .glb → `blend` | builds the scene (materials with the game recipe, the textures referenced, not copied) and saves the working copy |
| `inspect` | .blend / polyprop / .glb → .json | hierarchy, transforms, dimensions (game axes), vertices / faces / triangles, materials, images and estimated texture memory, armatures and bones, actions |
| `validate` | → .json | missing textures, texture size, plausible scale, expected size, origin on the floor, NaN / zero-area / loose geometry, unapplied transforms, material count (draw calls), game recipes, triangle budget, rig references, ≤ 4 weights, skeleton bones, clip names |
| `preview` | → folder | front, side (game +x), back and three-quarter views: `neutral-*` (Workbench, one grey, cavity) and `textured-*` (EEVEE, the materials), a 0.25 m checker floor for scale, a fixed sun and world, orthographic, plus `sheet.png`. The same `orthoScale` gives two assets the same framing. |
| `export` | .blend → polyprop / .glb | polyprop: world transforms applied, triangulated, one part per material, re-indexed, recipes kept |
| `script` | a `.py` under `tools/` (+ `args`) | runs a project script in Blender's Python, e.g. `tools/blender/zoe_poly.py` with output arguments under `art/blender/` |

**Safety**
- Inputs must be inside the project. Outputs are allowed only under `art/blender/` or `tools/blender-bridge/.work/`,
  never onto an input, so originals (`assets/`, `art/characters/`, `src/`) cannot be written by a job.
- A `script` job's own writes follow its arguments: give it candidate paths under `art/blender/`.
- One Blender job runs at a time, enforced by a lock file in `.work/`; a dead holder's lock is cleared.
- A timeout kills the Blender the bridge started (by PID, with its children) and nothing else.
- Arguments go as an array with no shell. Paths travel in the UTF-8 job file, so spaces and Hebrew are fine; the
  smoke test runs in `.work/smoke/תיקייה עם רווח/`.

## Proving an asset in the game
`roundtrip.mjs` does the full loop for one prop: the chest (`props.js chest`, honey, as at `interiors.js:501`).
1. The running game builds it and writes the baseline polyprop and its textures to
   `art/blender/props/chest_honey/source/`.
2. The jobs in `jobs/chest-roundtrip.json` run: the working `.blend`, reports, previews, the candidate polyprop and a
   GLB.
3. The game loads the candidate next to its own chest, in the developer test yard, and checks:
   - per-part size and position (orientation), within 1 mm;
   - that each part uses the same cached game material;
   - draw calls and triangles, with `renderer.info` in the game's real frame;
   - the pixel difference from the game camera;
   - a walk into its collider from the front and from the side.
4. Results go to `reports/roundtrip.json` and `previews/game/in-game-{orig,cand}.png`.

## Asset workflow (characters, buildings, props, animation)
See `docs/BLENDER_ASSET_WORKFLOW.md`, and the agent `.claude/agents/lba-blender-character-and-prop-artist.md`.
