# WALL-NORMALS (CLOUD_ORDERS 67, the user 23.11: "let the local agent work the walls and make normal maps") — the desktop

**ON by default (the user's pick, 23.11: "everything")** for the fort's stone `fortStone` (the fort, the promenade's and
the harbour's walls), the houses' rubble `rubbleHouse` and the rubble `rubble` (the harbour shed, the lighthouse's foot,
Ballastra's piers: the same algorithm as the houses', looked at only briefly). `?wallnormals=0` shows the walls as before;
by name, `?wallnormals=fortStone` etc., only those. `?wnstr=` scales the relief (1 = the chosen look; 0.5 gentler, 2
heavier); `?wnao=0` drops the shade's ambient occlusion.

## How
- `src/engine/textures.js`: the wall generators record the layout they draw (`LAYOUT`: the rubble's stones, the fort's
  blocks and cracks — the same seeded draws, so the colour texture is unchanged byte for byte). `normalTexture(name)` draws
  a height map from that layout (each stone a low dome over its mortar, each block a flat face with a soft bevel into its
  joints, the cracks shallow grooves; blurred on a 3×3 tiling so the tile stays seamless) and derives the normals from its
  slopes: tangent space, OpenGL (+Y up the texture), 256 px like the colour, the same repeat. Made at load in code: **no
  image files** (the artifact's file limit). `withWallNormal(m)` puts it on a material whose map is one of the switched-on
  textures (a copy with the map's own repeat for architecture.js's per-house copies).
- Hooked where the builders make their materials: island.js `tm` and `wallMat`, kit.js `tm`, architecture.js `texMat`,
  zeelich.js `tm` (one line each). Nothing else changes when the switch is off.
- Blender was not needed: the generators are code, so the height map is drawn from them directly (the order's
  "render a height map from the generator itself").

## Draw calls (one frame, the play camera, Medium; a count, not a timing)
A material with a `normalMap` is not folded into the texture-array twins (drawbatch.js / merge.js), so its pieces are
merged per cell with their own material: a few draws more, not one per piece.

| View | off | on |
|---|---|---|
| inland wall by the flight | 271 | 276 |
| the sea wall | 245 | 252 |
| the station's walls (fort) | 214 | 215 |
| Twinsen's house | 382 | 392 |
| the neighbours' house | 425 | 435 |
| the neighbours' west wall | 251 | 253 |

## The look (`captures/wall-normals/`)
- Pairs off/on, morning and golden hour (the light cycle's colour; the sun's direction is fixed): `fortStone-close-…`,
  `rubbleHouse-close-…`, the play camera `play-all-…`; the textures beside their normal maps `…-colour-normal.png`.
- Relief shows where the sun reaches the face (the sea wall, the houses' west walls): joints deeper, stones domed,
  blocks bevelled. Faces turned from the sun (the inland wall by the flight, the houses' east fronts) change very little:
  a normal map only moves direct light. From the play camera (Follow, Far) the walls stay clean; walking past three walls
  (16 frames, 150 ms apart) showed no sparkle or shimmer.
- Brightness of a wall's face, off → on: sunlit −2 to −4 % (the joints darker), in shade +1 to +3 %; nothing darkens in shade.
- Strength: 1, 4 and 8 × the first try were compared; 4 is `wnstr=1`.

## Tests (the branch, switch off — the default)
overlap-sweep PASS, occluders PASS, citadel-structures PASS. worldfit: 1 visual FAIL, a door sill 0.24 m under the ground
at the shop house (−33.75, −1.5) — geometry this change does not touch (with the switch off no material changes).

## Ambient occlusion for the shade (the user, 23.11: "not too flat, not far from the game's look, not much effort")
- The faces away from the sun stayed flat with the normal map alone (it moves direct light only). From the same heights a
  small **ambient occlusion map**: 0.58 in the mortar, 1 on a stone's or block's face, smooth between — three applies it
  to the indirect light only (the sky's and the shade's), so joints and the gaps between stones darken a little in shade
  and the sunlit side is as before. On by default with the normal map; `?wnao=0` off, `?wnao=0.5` half.
- **No draw more** (the same material: 277/215/435/254 with or without it); one more 256 px texture per wall type, made
  in code. Shaded faces' mean brightness off → normals → normals + AO: the inland wall 44.8 → 45.6 → 43.9, the station
  22.8 → 23.6 → 21.9, the neighbours' front 46.9 → 46.7 → 45.2 (golden hour; morning alike): about 2–4 % below off.
- `captures/wall-normals/shade-off-normals-ao.jpg` (rows: the inland wall, the station, the neighbours' front; columns:
  off, normals, normals + AO; golden hour).
- Blender: not used — the textures are drawn in code, so drawing the heights from the same code matches them exactly
  with no image files; a Blender bake would add files to keep in step with the generator.

## On by default (the user, 23.11: "everything")
The three stone textures get the normal map and the shade's ambient occlusion by default; `?wallnormals=0` is the old
look. Tests with it on: overlap-sweep, occluders, citadel-structures PASS; worldfit the same one visual FAIL as with it
off (the shop house's door sill, −33.75, −1.5, 0.24 m under the ground: geometry, not this change).

## Zeelich (the user's pick, 24.11): the dressed stone and the corrugated sheet
- **`stone`** (textures.js, the dressed stone of plinths, quoins, sills, surrounds, stair bases — Zeelich's and Citadel's
  trims): its blocks recorded as the generator draws them (each row its own height), a flat face with a soft bevel into
  the joints. **`zrib`** (zeelich.js `ribTex`, Zeelich's corrugated sheds and the Grand Hall's flanks): eight rounded ribs
  to the tile, registered from zeelich.js (`registerWallTexture`, for textures drawn outside makeTextures). Both with the
  shade's ambient occlusion (the ribs' troughs only a shade darker). **Off by default** (order 70.2, 25.11: Zeelich and
  the islands weren't in the user's "everything" pick; the dressed stone is Citadel's trims too, so they stay flat with
  it): `?wallnormals=all` turns them on with the other three, or by name, e.g.
  `?wallnormals=fortStone,rubbleHouse,rubble,stone,zrib`. Before/after from the play camera in `captures/hw-70/`.
- Not given relief: Zeelich's stucco (`plasterWall`, smooth by design), the granite (the ground's and cliffs' strata),
  the paving and kerbs.
- Draw calls (one frame where the save stands, a count): Zeelich (base-05) 103 → 106; Citadel (base-03) 409 → 429 for all
  the wall types together (the stone ~10 of them: it is on many small trims).
- The look: the stone's bevels read clearly where light reaches (Zeelich's stair bases, the walkway's stone strip),
  softly on Citadel's kerbs, the well and the planters (`citadel-stone-before-after.jpg`); the corrugated sheet gains a
  little relief in sun, little in shade. Zeelich's pictures are on the desktop (past chapter 2). Tests not run again
  (materials only, as before).

## The islands (24.11)
- Desert Island's, the Hamalayi's and the isles' walls are built of `stone`, `fortStone` and stucco: they have the relief
  already. Looked at on Desert Island (base-06; pictures on the desktop): the dressed stone's joints read too dark and
  heavy against the desert's bright walls, so the dressed stone is now gentler — its relief 6.0 (was 8.0) and its joints'
  shade 0.7 (was 0.58) — close to the game's look; the mean brightness of a sunlit wall within −1 to −4 % of off. Draws on
  Desert Island the same (116 → 116). Citadel's stone picture redone with it.

## The weight in the material (the user, 24.11: "don't touch the normal map, it's good; just make it weigh more in the material")
The map is drawn exactly as before (`wnstr` stays 1). The material's `normalScale` is now **2.5** (was 1): the same map
moves the light 2.5× as much. `?wnscale=` compares (1 = the old weight). Nothing else changes: no draw more, no new texture.
