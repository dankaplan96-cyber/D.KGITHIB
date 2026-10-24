# Art kit & working guide (for anyone adding art to LBA3)

Read PROJECT_BRIEF.md first. LBA2 is the benchmark; the "Roblox look" (visible primitive boxes/cones/
cylinders as final art, flat untextured colours, toy proportions) is not acceptable.

## Tools in the codebase
- `src/engine/sculpt.js` — SDF sculpting. `sculptRigid({key, prims, groups, joinK, colors, paint, bounds, cell})`
  returns a cached BufferGeometry with vertex colours (use `new THREE.MeshStandardMaterial({vertexColors:true})`).
  Prims: `ell` (c, r[3]), `cone` (a, b, r1, r2, sz), `ccone` (c, h, rt, rb, round, sz), `torus` (c, R, r, sz),
  `box` (c, h[3], round); options `sub:true` (carve), `wobble(x,y,z)` (surface noise), `clip(x,y,z)`.
  Smooth union per `group` with radius `groups[name]`, `joinK` between groups. Cell 0.02–0.08 m; keep each
  sculpt under ~0.5 s (bounds × cell). Cache by `key` and reuse geometry for repeated props.
- `src/game/architecture.js` — `buildHouse(opts)`: walls with thickness and real recessed openings, plinth,
  quoins, thick roof with overhang/ridge/gutters, chimney, shutters, flower boxes, awning.
- `src/game/town.js` — street furniture: `lamp` (blue-globe Citadel lamp), `bench`, `barrel`, `fence`,
  `stoneWall`, `laundry`, `tools`, `radio`, `pot`, `sign`, `globeSign`, `well`, `curbs`. Copy their style.
- `src/game/vegetation.js` — `treeGeometry(kind, seed)`, `rockGeometry(seed)`, `grassClumpGeometry`, `flowerGeometry`.
- `src/engine/textures.js` — canvas-painted tileable textures: grass, sand, rock, dirt, cobble (paving),
  plaster, plasterWall, stone (ashlar), brick, roof, roofBlue, wood, sea, clouds. Add new ones there
  (metal plates, rivets, canvas…) in the same painterly style. Use world-scaled UVs (see architecture.js `scaleUV`).
- Materials: MeshStandardMaterial, roughness 0.6–0.95, metalness only for real metal; no flat pure colours
  on large surfaces — use a texture or vertex-colour variation.

## Rules of thumb
- Silhouette first: every prop should read at the gameplay camera (≈13 m away, 38° down, FOV 43.6°).
- Thickness and bevels: no paper-thin planes for walls/roofs/doors; frames around openings; a plinth or base
  where things meet the ground; small irregularity (rotation/scale jitter) for hand-made feel.
- Scale: Twinsen ≈ 1.94 m. Doors ≈ 2.15 m, walls ≈ 3 m, trees 3.5–5 m, lamps 3.5 m.
- Physics: `physics.add({type:'box', x, z, hw, hd, rot, top, bottom?, seeThrough?, noStand?})` or
  `{type:'cyl', x, z, r, top}`. Every solid prop needs a collider; `seeThrough:true` for low props the camera may look over.
- Palette: Citadel = warm plaster, terracotta, grey stone, blue accents. The Joint Project = brushed brass,
  teal-painted steel, glowing cyan emblem (Zeelich tech), rivets, pipes. Funfrock legacy = grey-blue stone, dark iron.

## Verifying (mandatory for visual work)
- Static server: `cd lba2-remaster && python3 -m http.server 8123` (may already be running; check with curl).
- Gameplay-camera screenshots: `node <scratchpad>/tour.mjs 8123 <prefix> '<json list>'` where each item is
  `{"name":"x","x":..,"z":..,"a":angle,"view":0|1,"room":"id?"}` (room = interior id; x/z then are room coords).
- Characters: `lookdev.html?c=name1,name2&yaw=0&dist=4.6&cy=1.0&ly=0.95` via `node <scratchpad>/ld.mjs "<query>" out.png`.
- Rendering is SwiftShader (software): slow (~1–2 fps), so keep test scenes short. Look at every screenshot
  you make and fix what looks primitive before reporting.
- Never run `git commit/push/reset/checkout`; the lead integrates.
