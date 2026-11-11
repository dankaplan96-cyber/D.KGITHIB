# CAST-POLISH-NAMED · the named cast, first batch: Baldino, Hesk, Yorna, Councillor Brum (order 28 part 2) · the laptop, 10.11.2026

Base: the local tmp commit `ed24df2b` (origin `db3707df` + CAST-POLISH-UNDERGROUND applied; never pushed), detached worktree
`lba3-items`. Nothing committed. Apply **after** CAST-POLISH-UNDERGROUND.

## Files
- `CAST-POLISH-NAMED.diff` (code only, `git diff ed24df2b`; `git apply --cached --check` clean on a scratch index read from
  `ed24df2b`; `py_compile` passes):
  - `tools/blender/baldino_poly.py`: BALDINO-EARS, -STRAP, -GOGGLES, -COLLAR (`BALDINO_OLD=1` builds the old parts; that
    build equals HEAD's rebuild exactly);
  - `tools/blender/cast_poly.py`: GOGGLES-HESK (CAST `gogglesUp`), GROBO-COAT (CAST `coatLong`, env `GCOAT_SKIRT`), CAST
    entries hesk, yorna, councilC. Every other look of the cast rebuilds byte-identical to HEAD's script (all 60 files compared).
- `CAST-POLISH-NAMED/` for `assets/poly/` (each replaces the shipped file): `baldino.json`, `hesk.json`, `yorna.json`,
  `councilC.json`. No new look: no skeleton, index or `characters.js` change (`.add.json` files not needed).
- Pictures (all four are chapter 3+ people: **not for the user**): `docs/future/characters/{baldino,hesk,yorna,councilC}/ch3plus-named-*.jpg`.

## The named cast (who, builder, where; what earlier batches did)
| Id | Who | Builder | Chapters and places | Before this batch | This batch |
|---|---|---|---|---|---|
| `baldino` | Baldino | own script `baldino_poly.py` | ch 3 (Zeelich), 9-12 (council, workshop, network, collar) | SRC-2 rebuild, TRUNK-1 | **BALDINO-EARS/-STRAP/-GOGGLES/-COLLAR** |
| `doran` | Doran | `cast_poly.py` | ch 1-2 Citadel harbour, 3 Zeelich, 4 dig, 8, 10 | surveyed in CITADEL-3: reads well | unchanged (now unlike Brum) |
| `vesk` | Vesk | `cast_poly.py` build_vesk | ch 2 Citadel station, 3, 9, 12 | VESK-COLLAR (UNDERGROUND) | unchanged (just done) |
| `hesk` | Hesk (also Gurt, Citadel port; Hobb, the tavern) | `cast_poly.py` | ch 4-5 Desert, 6-7, 8, 10 | — | **GOGGLES-HESK** |
| `yorna` | Yorna (also Marda, Citadel harbour walker) | `cast_poly.py` | ch 6-7 Hamalayi, 10 | — | **GROBO-COAT** |
| `councilChair` | Councillor Amaru (+ velo, ot_boss) | `cast_poly.py` build_esmer | ch 9 | ZEELICH (robe, boots, arms), HANDS-36 | unchanged |
| `councilB` | Councillor Sela (also Sanna, the tavern) | `cast_poly.py` | ch 9; Otringal | GLASSES-SELA | unchanged |
| `councilC` | Councillor Brum (also Mr Bazoo, Citadel shop; Gunda, Citadel port) | `cast_poly.py` | ch 9 | — | **GROBO-COAT** |
| `kira` | Kira | shares `lharWoman` | Zeelich's street (the planters), ch 3+ | lharWoman_b made for others (HAMALAYI) | unchanged |
| `oni` | Oni | shares `desertkid` | the School (Desert) | desertkid_b made for others | unchanged |
| `xil` | Xil | `cast_poly.py` build_esmer | ch 1-2 Citadel harbour, 3 | ZEELICH, HANDS-36 | unchanged (reads well) |
| `oku`, `nara` | Oku, Nara | `cast_poly.py` build_esmer | ch 3 Zeelich, 9 | ZEELICH, HANDS-36 | unchanged |

Surveyed in lookdev (turnaround, back, face 3/4, the game camera at 8.8 m): Baldino, Doran, Hesk, Yorna, Brum, Xil. Picked by
visibility and weakness: Baldino's three paper parts (the "left" item of UNDERGROUND), Hesk's coin goggles, and the four cast
Grobos sharing one silhouette (Doran, Hesk, Yorna and Brum differed only by colour and hat).

## What changed
- **BALDINO-EARS:** the ears were flat five-sided boards 2.2 cm thick with square edges, their root 2.6 cm off the side of the
  head. The same measured kite (corners cut a little, the tips kept: the top 1.1 cm lower) is now a cushion: 1.6 cm at a
  rounded rim, 3.6 cm through the middle, about 5 cm at the root, the root sunk into the head, a very shallow dish on the
  front a shade darker than the skin (#726b79 = 0.9 × the skin). Still on the ear bones; rig.js swings them as before.
- **BALDINO-STRAP:** the goggles' strap was one sheet 1 cm off the brow, cut off at the sides of the head, its edge zigzagging
  over the faceted face. Now a band 1.2 cm proud of the head's own sections, closed top and bottom, all the way round (under
  the ears' roots): it reads from the side and from behind (the Follow camera).
- **BALDINO-GOGGLES:** the lenses were bare blue hexagonal blocks. Each glass now sits in a dark teal frame (the strap's
  colour, LBA2's byte 160) 1.8 cm wide and 0.9 cm proud of it; the eyes still show through the glass and blink.
- **BALDINO-COLLAR:** the white stand-up collar was one sheet (a line edge-on). Now 2.2 cm thick: the same outside, an inside a
  shade darker (#7d7d7b = 0.8 × the collar), the top edge and front ends closed; still drawn flat, as the original's solid polygon.
- **GOGGLES-HESK:** his goggles were two flat gold drums facing forward, the "strap round the head" a stick between them poking
  out at the sides. Now brass cups pushed up on the dome of his head and turned up with it, a rolled rim round dark glass
  (#382b14, Nell's: 0.28 × the brass), a bridge, and a leather band from the cups' outer sides round the back of his head.
- **GROBO-COAT (Yorna, Brum):** every Grobo was built on the same body with the coat cut at the hips over round trousers, so the
  looks written as a long coat or robe (`outfit: 'robe'`; "a thick felt coat in red and ochre", "a slate-blue robe" in
  `characters.js`) had Doran's shape. The coat now goes on from under the belt as a skirt, flaring a little in soft folds to
  just below the knee (Yorna 0.28 m, Brum 0.30 m), finished with a rolled hem band in the look's trim hex (Yorna's ochre
  #e8b84a, Brum's #e8e0d0). It moves with the hips; toward the hem 35 % follows the skirt bones (more kicked the back hem up in
  the walk and folded the front into the body when seated). The round body stays inside. This is a silhouette change taken
  from the looks' own descriptions, not from LBA2 (whose Grobos wear tunics): the user may prefer the old cut (remove
  `coatLong` from the two CAST entries).

## LBA2 check (read-only, numbers printed to the terminal, nothing written)
`tools/lba-source/measure.py` on the user's LBA2 body 139 (Baldino): the ears (groups 17-20) are single flat polygons at
z 0.053 H; the goggles' byte 160 spans y 0.70-0.79 H, ±0.134-0.162 H, round the transparent lenses (byte 192), i.e. a frame,
not only a strap. The Grobo proportions (body 99, `docs/LBA2_MEASUREMENTS.md`) are unchanged: no section of the body, head,
trunk or ears moved except where described above.

## Numbers
| Model | Triangles (with eyes and mouth) | Change | Hero in the game frame (body twice) | Hero draw calls |
|---|---|---|---|---|
| baldino | 5781 -> 6173 | +6.8 % | 11518 -> 12302 | 4 = 4 |
| hesk | 3426 -> 3728 | +8.8 % | 6756 -> 7360 | 4 = 4 |
| yorna | 3602 -> 3802 | +5.6 % | 7108 -> 7508 | 4 = 4 |
| councilC | 3466 -> 3666 | +5.8 % | 6836 -> 7236 | 4 = 4 |

Each model is still 3 meshes (body, eyes, mouth) and 4 materials with the silhouette pass; no texture. Measured with
`renderer.info` in the real game (Citadel, chapter 1, Follow/Medium, SwiftShader).

## Checks
- HEAD's scripts rebuilt through the bridge: hesk, yorna, councilC equal the shipped files but for 20 weight values at 1e-4
  (rounding); baldino differs from the shipped file by up to 2.7 mm on the goggle lenses' back edge and 0.3 mm on the mouth
  pivot (the face ray casts in this Blender, 5.2.3): the candidate is built on the same rebuild, `BALDINO_OLD=1` equals it.
- polycheck: bones in the skeleton (yorna and councilC now also list the skirt bones, already in their skeletons), 4 weights
  summing to 1, no bad index, eyes and mouths unchanged, feet as before (−1.2 cm on the cast Grobos, 0 on Baldino).
- Blender `validate`: baldino 60 pass / 1 warn, hesk 65 / 2, yorna 71 / 2, councilC 67 / 2; 0 fails (the warnings as in the
  earlier batches: loose vertices, the Grobos' feet −1.2 cm). Four views neutral and coloured looked at.
- DRESS-1 variants 1-6 (`dresscheck.mjs`): yorna and hesk leave no role at its base hex, before and after; councilC leaves the
  same 48 shoe vertices before and after (pre-existing).
- Looked at: lookdev turnaround, back, faces (front, 3/4, side), the game camera at 8.8 m; 13 poses × 2 views for all four
  (walk, run, pickup, doze and the seat: the coat follows the body, no hem through it); the game (Citadel, chapter 1, the hero
  as each look, before and after): Follow/Medium, the dialogue two-shot, close-ups.

## Tests (SwiftShader, the four files in `assets/poly`, the code in place)
TESTS

Evidence labels: **Automated runtime only** (SwiftShader). Nobody played it.

## Not verified
- The people in their own places by eye: Baldino in the workshop and the council, Hesk at the dig, Yorna on the pass, Brum in
  the council; the pictures are of the hero wearing each model in Citadel (chapter 1).
- Marda (yorna), Gurt and Hobb (hesk), Mr Bazoo and Gunda (councilC) wear the changed models in Citadel; not looked at in
  their own spots (Hobb on his bar stool, Gunda on the port bench: the seat pose was checked in lookdev only).
- No Vega 8 frame time (no draw call added; triangles above).

## Left (next)
- Doran: reads well and is no longer Brum's twin; his brim hat and tunic are left as they are.
- Yorna's fur-hat flaps read as small brown horns beside the head in the close shot.
- The cast Grobos' brows are flat strips on the face (all Grobo looks: a wider change).
- Kira (lharWoman) and Oni (desertkid) share their models with many people; a `_b` each is queue 7's work.
- Vesk, Xil, Oku, Nara, Amaru, Sela: already polished in earlier batches; no new weakness seen.
