# #17 Knartas first (the user's pick, 26.11) — the Francos' huts and the moored zeppelin

Status: **Implemented, automated runtime only** (SwiftShader, headless Chromium in the cloud). Behind the URL switch
**`?knartas=new`**, default off: without it Knartas is exactly as before (checked: the same draw calls and triangles at
every capture spot as before the change). No one has looked at it on a real GPU or played it.

Why: the resemblance review (docs/lba-maturity/resemblance-zeelich.md §C, docs/lba3-audit/world.md §5, §9 D3) scored
Knartas 58 in both districts. LBA2's Knartas has round brown dome huts with porthole windows and a moored zeppelin at
its own port; ours drew the houses as square Esmer boxes with blue domes and had no zeppelin.

## What changed (with `?knartas=new`)

- **The Francos' huts** (`src/game/franco.js` `francoHut`, new file). Every Knartas house with a footprint of at least
  2.5 m and at most 2.2 : 1 is a hut: 25 huts (20 with doors, 5 low store huts with none). Each is:
  - a squat round drum (a circle on a square footprint, a stadium on a long one), slightly bulged, darker at its foot;
  - a dome with a thick lip over the eaves (the roof's thickness reads; the underside is in baked shade, the crown
    lighter);
  - round porthole windows (a brass ring, dark glass) round the drum: none beside the door, none on a side banked into
    the slope;
  - a low round-arched door, recessed 0.4–0.6 m in a deep portal of the hut's plaster, with a stone frame and sill; the
    roof's lip is its hood;
  - a clay chimney pot with a brass cap on the crown.
  The browns are vertex colours on the game's own plaster texture (four wall tones, four dome tones, by position). No
  LBA2 asset, model or texture was used; only the idea.
- **One gold dome**: the dig foreman's hut (`knartas-22-15`), the house in the Francos' rhyme ("Below the gold dome lies
  the Waker", story/francos.js). Before, six houses had gold-coloured domes; now this is the only one, so the clue points
  at one house.
- **The zeppelin port** (`zeppelinMast`): a timber mooring mast (four legs, braces, a platform with a rail, a brass
  mooring cup) at the west end of the harbour's south arm, and a zeppelin nosed into its cup, lying out west over the
  clouds: a grey hull with brass bands, four red tail fins, a timber gondola with dark windows and a red roof, two engines
  with still propellers, two mooring lines down to the quay. Scenery only.
  - It is moored low, beside the quay, on purpose: the play camera looks down on the island, so anything above its own
    height is never in frame. A first version on a 12 m mast was visible only from overhead.
  - The hull has a collider in the air, over the clouds, out of reach on foot. It keeps the camera out of the hull when
    Twinsen stands at the arm's end facing inland.

## Doors, rooms, routes and saves

- **The same doors.** zislands.js asks `esmerBuilding` where the house's door would be, using a batch that draws nothing,
  and builds the hut with that door. The door ids, places, sills, room sizes and `domed` flags in `R.shutDoors` are the
  same 20 as before, so every interior (ihomes.js), NPC, quest and save is untouched.
- **Colliders.** A hut's collider follows the hut: a circle, or a box and two circles for a stadium, plus the portal. All
  of them lie inside the old box, so the only change is that a hut's corners can now be walked round. Quill's office
  keeps its steps down from its ledge (`doorStairs`).
- **worldfit and door-levels.** Each hut is registered as before (the same box footprint, plinth and sill heights), with
  its door opening.
- **Nothing new is saved.** The switch is read once from the URL.

## Cost (automated runtime only: SwiftShader, 1280×720, the default quality, play camera Far; renderer.info for one frame, main + shadow passes)

| Spot (island-local) | draw calls before → after | triangles before → after |
|---|---:|---:|
| village (20.6, 23.2) | 60 → 53 | 653,483 → 486,825 |
| dig slope / gold dome (20.5, 9.5) | 54 → 50 | 513,597 → 387,367 |
| south lanes (22.3, −16.2) | 63 → 58 | 678,537 → 549,421 |
| harbour (−12.0, −26.1) | 72 → 71 | 530,944 → 502,168 |
| landing (shuttle spawn) | 87 → 81 | 824,993 → 658,352 |
| quay by the pad (−18.9, −36.6) | 67 → 66 | 455,496 → 429,084 |
| arm's west end, by the hull (−34.5, −35.9) | 93 → 88 | 821,600 → 682,033 |
| quay south (−20, −44) | 71 → 70 | 332,776 → 328,915 |

The island's own group, measured once when it is built:
- triangles 322,349 → 235,336;
- vertex and index buffers 23.9 MB → 15.8 MB;
- materials 69 → 65, meshes 151 → 147;
- colliders 548 → 612 (a stadium hut has three);
- build time 17.4 s → 16.6 s (one run each on a loaded SwiftShader machine: noise, not a measured gain).

Nothing is added per frame: no light, no update, no new texture. The huts' walls and domes share one vertex-coloured
plaster material, and the zeppelin uses the island's existing materials (planks, brass, stone, the vertex-colour
material). No hardware figures; frame times and GPU cost on a real GPU are unmeasured.

## Tests (each run once, with the switch on: `QUERY=knartas=new`, SERVE=1)

- `tests/island-doors.mjs` with `REGIONS=isle_knartas`:
  - all **20 Knartas doors** PASS: walked to on foot from the shuttle pad, entered (on the room's floor, furnished, lit),
    the room's own look read, out facing away, in again;
  - the region's shut-doors check PASS; the save-inside / Continue check PASS.
  - One FAIL, caused by the new region filter and not by the game: the keepers check asked keepers whose regions the
    filtered run never built ("room not built"). The test now skips those under `REGIONS`. It was not re-run.
- `tests/francos.mjs` (H-15, from the campaign's format-6 chapter-4 save): **PASS**, every step A–H. This covers:
  - the old save loads;
  - Gubb at the gold dome's wall;
  - the Pocket Set and the dig;
  - Game Over and Retry;
  - Save & quit → Continue twice.
- `tests/island-people.mjs` (residents' stops and routes on every isle, three chapter states): **PASS 65/65**.
- Not run with the switch on: `wave4.mjs` (Mila's sack on Knartas talks to her by the harness; her place is not a
  house), `door-sweep.mjs`, `worldfit.mjs`, `door-levels.mjs`, `overlap-sweep.mjs`.
- Test changes:
  - `tests/lib/boot.mjs` `open()` adds `QUERY=<k=v>` to a suite's own query, so any suite can run with a switch on;
  - `tests/island-doors.mjs` takes `REGIONS=a,b`.

## Captures

`captures/knartas-17/sheet.png`: before and after pairs from the play camera (Far), plus one overview from a free
camera. Automated runtime only (SwiftShader). Spots: the south lanes, the dig slope with the gold dome, the harbour
(the zeppelin seen past the basin), the village, and the overview. Capture script:
`<session scratchpad>/knartas-17/cap.mjs` (not committed).

## Unresolved gaps toward 85 (estimates, not re-scored)

The review's own estimate for "a Franco hut kit" is village +10. For the zeppelin it is harbour +6. Both districts would
then be about 68 and 64. Still open:
- **Palette** (review: 6–7/15). LBA2's Knartas has pale grey-white rock with green moss and an orange-brown earth square.
  Ours is still dark purple rock and bright green. This is the next largest gain, but it is a terrain change.
- **Environment.** LBA2's twisted dead branches by the huts are not built.
- **Interiors** (buildings-interiors). The rooms behind the hut doors are still the rectangular Esmer rooms. A round
  room would match the outside.
- **The village shot.** In the village shot (sheet row 4) the camera stands close to a dome, which fills the left of the
  frame. It does not hide Twinsen.
- **By the zeppelin.** At the arm's west end, facing inland, the hull fills a third of the frame (beside the camera, not
  between it and Twinsen).
- **Refinery.** The refinery is still a flat walled yard (the review asks for its machinery block).
- **Gatehouses.** The two gatehouses over the causeway and the thin solid walls stay Esmer: their passage logic is not
  touched.

## Questions for the user

1. Keep the huts' look? The options to choose between:
   - the domes' colour (darker brown or lighter);
   - their shape (acorn-like now; flatter is possible);
   - a single gold dome (the foreman's) instead of the six gold ones before.
2. The zeppelin is moored low beside the quay so that the play camera sees it. Do you want it higher, as a skyline
   landmark seen only from far off or from overhead, or kept low?
3. Next for Knartas: the pale rock and earth palette (the biggest remaining gap), or a round room behind the hut doors?
