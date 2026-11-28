# CAVE-STAIR (P69): the plateau's stair and Tralu's cave

The user, 18.11.2026: "the cave and the stairs that lead to it don't work well, in Citadel up above"; then: "a rock at
the cave's entrance; the stairs are in the air and not connected properly; inside, everything is weird and not right".

Status: **Automated runtime only** (headless Chromium, SwiftShader, held keys through the game's input; pictures from
the play camera and fixed views, looked at). Not played by a person.

## What was wrong (evidence: build b06c41ab)

Outside (island.js `OLD_DOORS.plateau`, `PLATEAU_STAIR`, `plateauStair()`, `tunnelMouth()`; world.js):

1. **A rock in the doorway.** A cliff rock (`cliffRocks`, visual only, no collider) stood on the landing in front of
   the door, up to 2.2 m over it (vertices at lx −0.7…0.9, y 14.6–15.1 over a landing at 12.92). He walked through it,
   and came out of the cave inside it. `before-landing-close.jpg`, `before-low-ne.jpg`.
2. **The steps sunk in the bank.** The ground was over the treads' south third by up to 0.58 m (step 8) and over the
   landing's back by the door by 0.52 m: grass through the steps, and he walked on the slope over them (only 9 of 12
   treads touched walking up the south side). Cause: the island's own ground there is the sea cliff (6–9 m); what lay
   over the treads was the trap filler's fill (`fixTraps`, 0.79 m a point down from the bank).
3. **Not connected at the top.** Past the top tread the plateau dipped 0.5 m, and fell 0.6 m off the top's north half:
   walking from the plateau's north-west onto the flight he stuck at a 0.77 m ledge (219 frames, lx 5.9).
4. **The landing hung in the air.** Its two steps off the front led down into a 1–2 m drop to the slope; the landing's
   collider ran 0.45 m past its drawn slab (he stood 25 cm over the drawn step); its east edge was open over the sea
   cliff: walking east off it he fell 13 m into the sea (y −0.33); north off it, 7 m.
5. **Caught in the kerb.** Walking off the bank south of the flight he dropped through the (noStand) south kerb onto
   ground 1.4 m under the bank and stood inside the kerb for good (lx 2.98, lz −0.18).

Inside (tralucave.js):

6. **Into the stair's side.** The cave stair's colliders are `stair: true` (never push): from the lower floor he walked
   into the flight's open east side at floor level and stood inside the steps (x −3.27). `before-cave-stair-side-east.jpg`.
7. **Stretched textures.** The terrace's rock floor and the paved patches used `plane()`, which keeps 0..1 UVs: the
   terrace (16 m²) wore one copy of the rock texture (pebbles half a metre long), each paved patch had flags of its own
   size. `before-cave-terrace-front-edge.jpg`.
8. **Boulders as dark rings.** The boulders were spheres; the material's per-vertex projection broke round them and
   their tops read as rings on the floor from the room's camera.

Checked and fine: the door both ways (in: 0.77 m from the spawn, facing into the room; out: on the flight's axis facing
up it, standing), the cave stair up/down walking and running, the terrace and pool railings, the guard house door, the
camera on the flight (no frame inside anything, arm 8.75 m, never hidden).

## What changed

- island.js: `OLD_DOORS.plateau.y` (the sill fixed where the ground first set it, 12.94) and `PLATEAU_STAIR.top`
  (15.52): the flight is laid on its own line, so the ground change moves no step (12 even 0.217 m risers).
  `plateauStairGround()`: the ground under the landing and the flight 0.3 m under their line, behind the south kerb
  at most 0.1 m over it, and past the top an apron 2 cm under the top tread (1.5 m, easing out by 1.5 m).
  `plateauStairAt(x, z, m, y)`: also drops a rock standing up through the landing or over the north parapet.
  The plateau landing (`o.balcony`): no steps off its front; the slab its collider's full depth and down to the ground;
  parapets on its north edge (on the north cheek's line) and its east edge (over the sea cliff). The treads' colliders
  run 0.3 m on over the apron (the grid's slope between two points stopped him at the top tread's edge).
- world.js: the cut applied on the terrain grid after `fixTraps`; `scatterGround` keeps the old points (no random draw
  moves: tests/rocks.mjs still 509 placements); `dropRocks` passes a vertex's height.
- tralucave.js: a thin solid brick along each cave step's open side, its exact run and tread height; the terrace floor
  and paved patches tiled by the material's metres (`patch()`); the boulders faceted (dodecahedra).

Saves: an old save on the landing's east edge (now the parapet) loads standing on the landing (game.unwedge moves him
0.4 m clear); one inside the cave's stair loads on the step (0.9 m). Positions of doors, exits and spawns unchanged.
No new shipped files (508).

## Tests

`tests/cave-stair.mjs` (21 checks, ~6 min, one browser, two Continues):
- this build: **21 passed**, VERDICT PASS.
- the old build (b06c41ab, same test): **11 failed** (1 ground ×2, risers, rock, north-west top, south side, bank into
  the kerb, landing east and north falls, the cave stair's side, the old landing save) — each of the fixes above.
- tests/rocks.mjs: PASS (closed, budget 10 146 ≤ 10 587 triangles, 509 placements, deterministic).

## Pictures (`captures/cave-stair/`)

`before-*` / `after-*` pairs: `ov-north`, `ov-east`, `ov-top`, `low-ne`, `low-nw`, `landing-close` (fixed views);
`pc-out-of-door`, `pc-mid-going-down` (play camera); `cave-arrive`, `cave-terrace-front-edge`, `cave-stair-side-east`
(the room camera); `test-*` from the test's run. (`after-walk-*` and `after-cave-*` were taken on the work's first
pass, before the cut moved after the trap filler; the cave did not change after it.)

## What remains

- The cave's overall look ("everything is weird") is only partly addressed: the defects above are fixed, but the room
  is still a rectangular box of one dark rubble texture on floor, walls and terrace face, closer to a cellar than
  LBA2's cave. A look pass (rock wall shapes, lighter floor, the original's brick patches) is an art task for the room's
  owner; not started here.
- A tall cliff rock north of the north parapet, below the landing, still hides him from the slope below the cliff
  (a view the play camera does not take on the flight).
- The bank behind the south kerb is now a steep grass cutting (he slides down it onto the kerb and over it onto the
  steps: tested, not caught).
- Not run: tests/overlaps.mjs (z-fighting sweep of Citadel outdoors) over the new parapets and slab; the faces were
  offset 1–3 cm by construction.
