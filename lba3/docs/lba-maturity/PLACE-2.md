# PLACE-2 — every item in a sensible place, outdoors (the user's P13, after PLACE-1)

PLACE-1 measured only what `props.js`'s Kit places. Outdoors that was Citadel's 86 Kit pieces and Hamalayi's 203;
Zeelich's street, the nine isles and most of Citadel's dressing were not measured. PLACE-2 measures what is built
outside the Kit too, judges it with outdoor rules, and fixes what it found.

Status: **Automated runtime only** (SwiftShader, a booted game, a new game's state; nobody has played these places for
this job). Build: branch `worktree-agent-adca22f9d57adb331` from `77813b9f` (artifact v82); commits `be403ad0`, `6ae3ef10`
and the report commit. Settings: the tests' default boot (`?nocine`, a new game, every area built with
`regions.ensureAll`), 960 × 540.

## How it is measured (`tests/place-scan.mjs`, rerunnable)

- **Recording** (`tests/lib/placerec.js`, installed before the game loads). Besides PLACE-1's Kit pieces it keeps:
  - each part a Batch draws (`kit.js`, `zeelich.js`, `island.js` `Batch.addM`: its box and its matrix);
  - each mesh `engine/merge.js` `mergeStatic` merges (its box and world matrix just before the merge);
  - where every mesh was added to the scene: three's `Object3D.add` is wrapped by the test (the test serves three's
    module with one line appended that hands the module to the recorder; the game's files are served as they are).
  In play the recorder is unset: each hook is one property read (`globalThis.__PLACE_REC`), nothing else.
- **Grouping** (`tests/lib/placeout.js`). A part's maker is the first function on its stack that only draws
  (`Batch.add`, `mesh()`, `instances()` ...) skipped: `island.js`'s `bench()` makes a bench, `props-esmer.js`'s `crate()`
  a crate. Parts of one maker called from one line that touch (boxes within 2 cm) are one piece; each instance of an
  InstancedMesh or BatchedMesh is a piece (joined with the same instance of the maker's other meshes: a crate's body and
  its bands). A builder that draws pieces inline names them with `src/engine/placetag.js` `placeTag(name)` (Zeelich's
  lamps, benches, planters, fountain, stall, bollards, barrels; each isle object by its shape). A group larger than 6 m
  (or 3.5 m both ways, or 7 m tall) is building, not a piece: its big parts are structure (tall thin ones are walls,
  flat ones floors), its small parts touching nothing big but from above or below are pieces (a crate on a quay).
  Actors, dogs, gulls, shuttles, the cat and the washing are not placed dressing and are left out by their files.
- **Judging** (`tests/lib/placejudge.mjs` `judgeOut`; each finding carries its measure):
  - **inside**: two pieces' drawn parts ≥ 4 cm into each other; a tree's trunk through a piece. Joints that are meant
    (rails, fences, lines and their poles) are not judged.
  - **wall**: ≥ 12 cm into a building's wall part or into a solid building collider.
  - **float / sunk** against the ground, not y = 0: the terrain or the highest standable brick no higher than 10 cm
    over the piece's foot (not its own collider; bricks grown 6 cm so floor seams hold), slabs and floors of the
    structures, other pieces' tops — at the piece's middle and at each corner of its footprint drawn 20 % in. Float: ≥ 5 cm
    over everywhere; or one side ≥ 15 cm over while another touches (a slope). Sunk: ≥ 8 cm under everywhere. Wall-hung
    things (≥ 0.4 m up beside a wall or a tall piece) and things buried whole by design are not judged; posts are planted.
  - **door**: ≥ 6 cm into the 0.9 m lane 1.6 m out from a house's door (Citadel), or into a door trigger's ring (r + 0.1 m)
    where its facing is not known; **stair**: into a stair's brick; **walk**: into the middle of a walkway or bridge (a
    long narrow brick with a drop on both sides); **path**: within 0.5 m of a path's centre line (Citadel's `pathDist`).
  - **bench**: a bench whose seat faces a wall, building or tall piece less than 0.8 m before it (facing: from its
    highest part, the back, to its middle). **sign**: a sign's painted face toward a wall within 0.6 m, or away from its
    path (Citadel). **wallaway**: a piece that belongs on a wall (shelf, rack, wall lamp, cabinet ...) ≥ 0.35 m from every
    wall.
  - Only dressing is judged (benches, crates, barrels, lamps, carts, stalls, planters, signs, fences, bins, posts, jars,
    hives ...: placejudge.mjs `OUT_DRESS`); a building's fixtures (its windows, valves, kerbs) are obstacles, not judged;
    trees and bushes ≥ 1.5 m only for floating.
- `SHOTS`/`VIEWS` as PLACE-1 (the game camera with Twinsen by the piece, and a nearer look). The verdict fails on any
  finding not on the LEFT list (reasons below), and if any of the eleven outdoor areas has fewer than 20 pieces measured.

## Coverage (the final run, region by region)

| Area | Pieces judged (outside the Kit: dressing / plants) | Findings before | After | Original's things left out |
|---|---|---|---|---|
| Citadel (ch. 1–2) | 1142 (1056: 200 / 453) + 86 Kit | 38 | 32 (all LEFT) | — |
| Zeelich (ch. 2–3) | 477 (62 / 118) | 7 | 2 (LEFT) | — |
| Otringal | 663 (180 / 227) | 71 | 14 | 9 |
| Knartas | 761 (225 / 56) | 50 | 17 | 14 |
| Mosquibee | 297 (87 / 71) | 19 ¹ | 4 | 24 |
| Celebration | 89 (30 / 18) | 3 | 2 | 1 |
| Under-gas | 150 (91 / 17) | 19 | 16 ² | 3 |
| High Platform | 541 (115 / 43) | 14 | 6 | 17 |
| Lift Dock | 177 (47 / 0) | 9 | 9 | 2 |
| Nectar Orchard | 126 (63 / 9) | 20 | 15 | — |
| Old Watch | 24 (6 / 0) | 0 | 0 | — |
| Desert | 617 (85 / 281) + 13 Kit | 30 | 30 (not changed) | — |
| Hamalayi | 406 (2 / 102) + 203 Kit | 152 | 152 (not changed) | — |

The whole scan: 135 rooms and areas, 7225 pieces (PLACE-1's interiors included), 5166 of them outdoors outside the Kit.
Citadel, Zeelich and the nine isles: **250 findings before, 117 after, every one on the LEFT list**; 70 of the
original's small things on the isles are no longer drawn (below). "Before" is the pre-fix build measured with the
final rules (¹ less Mosquibee's giant flowers, which the first collector named "pole"; ² Under-gas's 18 floating
crates are now seated, and its rows of the original's crates touch, 6–8 cm, 9 findings).

Not covered: what is not built when the areas are (the story's chapter props placed later, the evacuation's goods);
other chapters' states (the scan is a new game's); Citadel's paths are known (`pathDist`), Zeelich's and the isles'
are not, so the path rule runs on Citadel only; the walkers suite checks the routes everywhere.

## Fixed (measured, changed, looked at)

| Place | Item | Where (world x, z) | What was wrong | Measure | Change |
|---|---|---|---|---|---|
| Citadel, the square's shop (ch. 1) | two breakable crates (`W.crates` 0 and 1) | −30, 0; −31, 1.3 | inside the shop's walls: out of reach, their pickups unobtainable | a building's collider 99 cm into them | `island.js` CRATES: by the shop's north wall outside (−30.4, 4.9; −28.8, 4.9); their places in the list kept (saves store broken ones by index) |
| Citadel, the shop | barrel | −32.6, −2.9 | half inside the shop's front wall at its corner | 60 cm into the wall | `town.js`: out by the corner beside the other (the shop-barrels search spot unchanged) |
| Citadel, the harbour | lying barrel | −115.5, 52.8 | its end in the harbour master's shed | 21 cm into the wall | `island.js`: 0.5 m off the shed |
| Citadel, the pumping station | three barrels | −39, −60.4 | the downpipe through them, one in the station's corner | 62–65 cm into the walls, 15–16 cm into each other | `island.js`: out of the corner, 1 m apart (4 cm left between two: low) |
| Zeelich, the street | planter | 2408, −5.2 | the lamp post at 8.5 through its pot's rim | 51 cm | `zeelich.js`: 1.2 m west in the same row |
| Zeelich, the plaza's rim | planter | 2381.6, −5.2 | half in the plaza's planter | 34 cm | `zeelich.js`: 2.2 m west in the row |
| Zeelich, the plaza | the shuttle departures board | 2374.5, 10.4 | its roof through the market stall's canopy corner | 19 cm | `travel.js`: round to the open ground west of the pad (2.9 m from the stall), its collider with it |
| Zeelich, the pier | rope coil; the middle lamp | 2344.6, −1.4; 2344, −1.9 | the coil against the lamp's foot; the lamp on a railing post | 7 cm; 20 cm | `zeelich.js`: the coil 0.6 m off; the lamp between two posts |
| The nine isles (ch. 4–5) | the original's crates, jars, fences, posts, poles, planks, poster stands | everywhere | at the original's heights over our smoothed ground: floating 8–96 cm over banks and quays, sunk into them | float/sunk at the middle and corners | `zislands.js`: each seated on what is under it (terrain, a deck, slab, wall or roof of the plan, or a seated crate under it); on another object at its own height it stays |
| The isles | 70 of those things | (`R.leftOut`) | on cliff faces (a drop over 1 m across a crate's or jar's footprint, 0.6 m for posts, 1.2 m for fences: Otringal's banks), buried whole (3), or on a home's doorstep (Knartas, 1) | as above | left out (`zislands.js` `R.leftOut` lists each with its reason) |
| Otringal (the bank below the quay) | the dressing's crate stack | 1940.6, 1837.2 | on a bank: one crate 41 cm in it, another 33 cm over it | float/sunk | `zislands.js`: the plan's goods are not set on banks with more than a metre's drop under their footprint (2 left out) |
| Otringal, High Platform | a container barrel; a container crate | 1854.2, 1795.3; 3888.1, 1815 | put through the original's jar at the original's search zone | 65 / 69 cm | `containers.js` takes the isle's jar or crate there as the container (`R.smallThings`) and puts no new piece through one |
| Nectar Orchard, Mosquibee | honey jars beside their crate | 4876, 1817 (six) | the two jars 12 cm into the crate | 11–12 cm | `zislands.js` `honey`: 12 cm out |

## Left, with a priority (on the test's LEFT list)

- **After the campaign wave** (measured, not changed): the Desert (the dig, the test stand, Kesh's pump and heat-line
  places; 30 findings: tents on slopes, a wheel, lanterns) and the Hamalayi (Lhar, the pass, the observatory: "after
  campaign wave 3"; 152 findings, most of them its Kit dressing against the new wall and ground measures). To be swept
  once the waves land.
- **By design** (looked at): Nell's lean-to and its bench (one structure, two builders); the depot's staff yard behind
  the painted line (its goods along the fence, its breakable crates there to be broken; `pathDist` still runs through
  it); the square's well on the paths' meeting; the pot beside the tavern's door; Twinsen's home barrels (a search
  spot); the well's and the crates' lids (chapter 1); the glider field's sock on its mast; the depot gate's hinge post;
  cargo by the quay's crane; Baldino's cart wheel leaning on his wall; the isles' rails meeting a stall's post; jars at
  the Lift Dock's deck edge.
- **Not measurable**: the sewer hatch lever's quadrant on its post; the original's fitted pieces on the isles (a brass
  finial on a wall pier, a bush on the quay's paving, trees on bank edges: those tops are not recorded as ground; looked
  at: they stand); a Mosquibee jar on the bank's lip.
- **Low** (4–40 cm, seen only up close): stacked crates touching (Citadel's depot, every isle's stacks, Under-gas's rows),
  the station's lying barrel (4 cm), a window box (6 cm), the isles' goods and jars seated on the lowest ground under them
  on slopes (rather sunk than floating: 9–40 cm, the plan's own rule), a fence along a slope with level rails, washing
  poles and banner poles on slope edges, jars beside two Knartas homes' doors (in the trigger's ring; the way in clear).

## Pictures (looked at)

`lba3/captures/place-2/`: per fixed place, `-before-game.jpg` / `-after-game.jpg` (the game camera, Twinsen at the same
spot both times) and `-before-close.jpg` / `-after-close.jpg` (a nearer look from the camera's side). Chapters 1–2
(Citadel): the shop's crates and barrel, the harbour barrel, the station barrels. Others, `x-*`: Zeelich's lamp and
planter, the plaza's planters, the board and the stall, the pier's coil and lamp; Otringal's fence and crates on the bank
(gone), Knartas's quay fence (seated), its jars and washing poles, Mosquibee's crate on the cliff (gone); and after-only
views of places where the original's things were left out (`x-*-leftout-*`).

Looked at: every picture above. Weak evidence: the station's game view is behind the pipe frame (the close view shows
the barrels clear of the pipe); the shop barrel's game view is behind the corner (the close view shows it); the
container fixes (Otringal, High Platform) have no pictures: the measure is the evidence there.

## Suites (Automated runtime only; one at a time, SwiftShader, a shared machine)

| Suite | Result | Notes |
|---|---|---|

## Next

- Paths for Zeelich and the isles (their walkways from the walk planner) so the path rule runs there.
- Sweep the Desert and the Hamalayi after the campaign waves; the Hamalayi's Kit dressing against the new outdoor rules.
- Wall tops and pavings drawn without a brick (the isles' fitted pieces) as ground for the measure.
