# FEET-66B (26–27.11): #66 part 2, the places FEET-66 handed on

Worktree of `ccr-c1c2c4b9-dep6ed` from `c3357e49`. Every result here is **automated runtime only (SwiftShader,
headless Chromium)**: nobody played it, no real GPU, no frame times measured. Suite: `tests/feet-on-surface.mjs`
(FEET-66.md has its rules). Picture: `captures/feet-66b/sheet-1.png` (1140 x 1830: before | after from the play camera,
3x crops at his feet; the square's steps first). Every suite ran with `SERVE=1`.

## Result

Discovery on the base (`c3357e49`, all areas): 109 Citadel candidates, 21 Zeelich, 78 Desert, 148 Hamalayi (mostly the
listed snow and water), 13 Ballastra, plus the isles. After (the last discovery, before the full run): **outside the
isles, one class-A candidate left (a roof eave, a true exception, below)**, one class B (the monastery wall's pillar,
listed). The Arch District's dais float (29 cm, first walked once the reach flood was seeded from every door and prop)
was the dais drawn inside out: fixed (below). Class C (76 rock colliders over domes): **0**. The final full run (on
`3ddb23df`): class A walked 39: FAIL 0, handed on 9 (the isles' and the roof eave), not reached 30 (all in the isles'
bounds: Knartas 25, Celebration 3, Otringal 1, Platform 1; 5 of them are `HANDED` entries, so `HANDED` 14 = 9 + 5);
water walked 4 (listed); soft snow 86 (listed). The other suites: the table at the end.

## The square's ring steps (FLAT-TOWN, protected): fixed, no look change

`island.js buildFlatTown`: the two rings had no colliders; `world.js plaza` keeps the incline through the treads'
outer edges, so on a tread his feet were up to 28 cm under it (20.5 cm in the picture, row 1). Each ring is now a stair
collider at its drawn tread: a **ring collider** (new in `physics.js`: a cylinder's `ri`, its hole; `_inside` only).
The lower ring runs 0.1 m under the upper (no seam); inside the inner ring the plaza is the ground's, as before (a
disc there held him 6–10 cm over the paving near its rim, where the terrain dips). Feet on the upper tread 2.53 → 2.735.
The terrain, the meshes and the walkers' planner (stairs are walked up) are unchanged.

## Fixed, by kind (game-wide for each kind)

| Kind | Where (file) | Before → after |
|---|---|---|
| A collider over less drawn (copings, rims, wall tops) | tulip beds' curbs and soil (`island.js tulipBed`, Citadel and harbour); the harbour's wall tops behind the coping (`lip`, two floors); the tunnel mouth's landing and its step (`tunnelMouth`); crates' lids (`buildDressing`, `crateStack`); dry-stone walls stood on over their top's width only, their batter a wall (`props-mountain.js dryWall`: the Hamalayi landing fold, Lhar's walls); Kesh's roof (`keshlife.js`); the Desert houses' parapets (`desert.js`); the Zeelich tile stacks (`zeelife.js`, block) | 9–114 cm → 0–3 cm |
| A drawn top with no floor (sink) | the station's walkway plates, the derrick's bottom girt, the beam pad's two brass rings (`island.js buildStation`); the pier and quay copings (`wallRun`); the water main's covers and the valve's plate; the cellar hatch; the sewer hatches' frames and shut lids (`sewers.js`, the lid's floor off while open); the lane gate's culvert grate; door steps of every Citadel house and the harbour shed (`architecture.js` returns `steps`, `town.js` places them) and every Zeelich Esmer house (`zeelich.js`); the Desert's stoops and door sills (`desertold.js adobe`), the horned pillars' plinths, the dock's last plank, the test stand's pad (`teststand.js`); Zeelich's plaza kerb ring (a ring collider); Ballastra's swing-bridge turntable and counterweight (the counterweight turns with the bridge) | 5–33 cm → 0 |
| A sloped or tilted top under one flat box | the Hamalayi waystone's two sloped stages (`props-lba1hamalayi.js`: nested boxes 5 cm apart, his feet within 2.5 cm of the slope; the turning puzzle's top step unchanged); the Desert's three fallen cubes (four strips across their tilt); Ballastra's tilting gangways (24 steps, not 9; `gardens.js`, `arches.js`) | 4–43 cm → ≤ 2.5 cm |
| Rocks (class C and the collider-less stones) | **obstacles** (`block`): every scattered stone and boulder (`world.js`, `desert.js` rocks, scree and yard stones, `hamalayi.js`, `zeelich.js` grass stones and the rim boulders over the walk); the cliff rocks' toes on walkable ground (`cliffs.js rockFootColliders`, read from the drawn mesh after the masonry's rocks go: cells of 0.33 m merged per row) | up to 0.57 m into rock / 0.56 m over a dome → stopped at the rock |
| Low solids walked through (`noStand` alone under a step's height) | made `block`: the Hamalayi's `put` props, Citadel's bushes, the Desert's shrubs, the plateau stair's cheeks, the asylum's pots, containers (chests, jars), Raph's seat, the lane gate's bench, the Desert's fire pits, the steam crack's slab, the drift and the hatch of the Gaze (`story/depth.js`) | walked through → stopped |
| A drawn top seen from below only (an inside-out lathe) | the Speaking Steps' dais (`ballastra/arches.js`: its profile ran down from the top, so its faces pointed in: the top was not drawn from above and his feet stood over the paving seen through it; the profile now runs up from the axis, the shape unchanged). Sweep: the suite over all 16 areas finds no other walked top like it; the literal lathe profiles that run the wrong way elsewhere are props nobody stands on, handed on below | 29 cm → 0 |
| Visible fixes (look) | the Desert bridge's barrel under its deck (it stood 0.35 m out of the deck as a hump); the Hamalayi arch's snow lip tapers to a sliver on both sides of the steps (where the rim ends, `hamalayi-finish.js snowLips` taper) | listed below |

The census that found the walked-through solids: every enabled `noStand` collider, not `block`, not a stair, whose top
stands 0.12–0.55 m over the ground at its middle (a scratch probe; after the fixes only the isles' 38 + 1 remain).

## Class C, the call by place

All 76 were the scattered rocks' cylinders (Citadel 18, Desert 32, Hamalayi 25, Zeelich 1) plus the asylum front's two
piers. A rock's dome cannot be followed by a flat collider within 3 cm, and none of them is a place the game means to
be stood on (they were placed off the paths and the walks), so every scattered rock is now an obstacle (`block`, which
`walknav` reads through `blockedAt`, so the residents route round them). **Behaviour change: he can no longer stand on a
boulder** (before, only from a bank or by a jump; then 10–56 cm over its dome). The asylum front's piers are the façade's
top, 5.9 m up: unreachable (below), no change. The two rocks the game does use are left as they are: the Gaze's drift
(now a block he digs from beside, within the prompt's 2.4 m) and the waystone (stepped, above).

## The suite (`tests/feet-on-surface.mjs`), what changed and why

- **Reach**: a flood over a 0.5 m grid from the walkable terrain, each area's arrival and safe spots, and every spot a
  door, an exit, a search, a giver, an interactable, a seat or a house's door puts him or asks him to stand that lies in
  the area (a deck reached only through a building's door), step by step as physics
  moves him (a step up to STEP_UP, any drop) and, generously, a hop-pack hop (2.4 m + 0.25). A drawn top over a floor no
  flood reaches is printed as UNREACHABLE per piece, never judged: house roofs over their walls' colliders, the tank's
  and the tech buildings' lids, the fortress wall's top, the Desert hall's merlons, Zeelich's roofs and gateway (FEET-66's
  walks reached them by placing him there).
- **His radius**: a spot within his radius of something that stops him is not one his middle can stand on (a stone's
  drawn edge outside its collider): counted.
- **Narrow tops**: a top 18 cm or less across (a rail, a bar, a pipe's crown) is stepped over: counted.
- **A foot's area**: a float is judged against the highest drawn top within 8 cm of his middle (a grating's bars).
- **Snow layers**: feet inside a soft-snow piece (a wall's snow cap) are in the snow, as on the drifts; `#f4f6fa` (the
  wave-5 tin stacks' snow pad) counts as snow.
- `HANDED` pruned from 122 to 14: the isles' 13 and one exception.

## Handed on (the isles, for after PATHS-140B lands; do not edit `zislands.js` until then)

Class A (in `HANDED`, depth from the last discovery): Otringal (1946.2, 1860.2) 48 cm, (1894.9, 1802.1) a collider
47.6 cm over less drawn, (1891.2, 1765.6) 39 cm, (1908.8, 1837.2) 8 cm, (1864.2, 1787.0) 6.7 cm; Knartas (Franco's dig
earth, `francosworld.js`) (2250.7, 1806.7) 23 cm, (2199.0, 1764.4) 5.5 cm; Celebration (2893.6, 1790.7) 49 cm, (2883.1,
1812.7) 8.5, (2886.2, 1810.4) 8.7, (2880.5, 1809.5) 8.6; Oldwatch (5196.2, 1807.3) 47, (5186.9, 1793.8) 24 cm.
Class B (walked through, missing colliders): Otringal's 19 low stones `#d8d2c8` (49 cm, round (1851–1901, 1801–1814),
`zislands.js:1508`'s `noStand` colliders, 38 of them under a step's height: make them `block`), Knartas (2235.0, 1825.0)
and Franco's field (2258.9, 1805.0, `francosworld.js:144`), Celebration (2889.0, 1813.3), (2891.9, 1811.7), Platform
(3846.1, 1777.0), Orchard (4869.7, 1815.3), Oldwatch 4 (5187–5201, 1782–1815). Knartas' 14 floats at x 3238–3840 and
the Platform's (5209.4, 1815.8) are other isles' colliders inside Knartas' bounds with nothing drawn (the isles are laid
side by side): a discovery bounds question, not a fault. The not-reached isle candidates of FEET-66 (54) mostly went:
the reach flood leaves out the unreachable ones; the final full run still reports 30 NOT REACHED, all within the isles'
bounds (Knartas 25, of which 24 are those other isles' floats; Celebration 3, Otringal 1, Platform 1).

Inside-out lathes elsewhere (**source only**: a static check of the literal profiles passed to `lathe(...)`, closed
through the axis; profiles built in code not checked; not viewed). None is walked on (the suite above covers that); each
may draw its outside culled. Largest first: Ballastra's islet north of the aqueduct (`ballastra/gardens.js:325`, 17 m
across), the Arch District's bell (`ballastra/arches.js:654`), a Zeelich drill bit (`zeelich.js:2142`); small shades
and caps (`ballastra/harbor.js:450, :467`,
`ballastra/look.js:242`, `ballastra/archrooms.js:112`, `ballastra/shed.js:70`, `franco.js:128`, `pharmacy.js:96`,
`offwall.js:144`). The thin two-walled shells (`props.js:833`, `pumproom.js:123`, `underground.js:158`) look the same
either way; the falling-water bells (`props-esmer.js:700-701`, `zeelich.js:1614`) are two-sided. To confirm each with a
picture before reversing it.

## True exceptions (in `HANDED`, printed, not failing)

- Citadel (-69.5, 12.5): a house's roof eave 7 cm over the walls' collider, reachable only with the hop-pack from the
  promenade 2.24 m below. A pitched roof is not a floor.

## Visible and behaviour changes (for the user's pick)

0. Arch District: the Speaking Steps' dais draws as a solid dais from above (it was inside out; automated measurement,
   not viewed).
1. Desert: the bridge by the old mask has no hump along its deck (the arch's barrel sits under the deck).
2. Hamalayi: the rim's snow lip either side of the arch steps tapers to a sliver (it ended in a cut face; sheet row 6).
3. Behaviour: rocks, stones, small bushes, shrubs, low props, pots, chests, fire pits are obstacles (were walked through
   or stood on); the drift at the Gaze is dug from beside; the waystone is climbed up its slopes, not in two jumps
   of 43 cm; dry-stone walls stood on only over their top.
4. Not visible: floors at drawn tops (the square's steps, beds, hatches, steps, plates, rings), the collider changes.

## Not covered

- Interiors (FLICKER-142's files): not touched. NPCs' feet: not measured. Moving pieces in general (the sewer lids' open state, the swing bridge mid-swing).
- The reach flood is generous (the hop-pack everywhere); it can only leave out what nothing reaches.

## Tests (each once, `SERVE=1`, on the commit named; automated runtime only, SwiftShader)

| Suite | Commit | Result |
|---|---|---|
| `walkers` | `c864fc13` | PASS, functional 37 passed, 0 failed (102 s). The run before `e3ee25cd` failed on "Kesh: bas_home not walkable"; Kesh's three residents now walk their rounds (Bashir 148 m, 4 stops) |
| `opening-tutorial` | `c864fc13` | PASS, functional 48 passed, 0 failed (1148 s) |
| `feet-on-surface` (all 16 areas) | `c864fc13` | FAIL, 1 passed, 1 failed: the Arch District's dais (collider 6736, (3008, -3800)), 29 cm over the drawn surface, 2/2 walks. A second full run after a first try (a flatter rim: no change, reverted) failed the same; the cause was the inside-out lathe |
| `feet-on-surface` (all 16 areas) | `3ddb23df` | PASS, functional 2 passed, 0 failed (186 s): class A walked 39, FAIL 0 (counts in Result) |
| `worldfit` | `3ddb23df` | PASS, functional 1 passed, 0 failed; visual 8 passed (164 s). It also passed on `0a05a7d0`+ |

`feet-on-surface` ran three times in all (not once) because the first full run failed. `walkers` and
`opening-tutorial` were not rerun after `3ddb23df` (the dais touches neither). The pictures the tests overwrite were
restored (`git checkout -- lba3/captures/`).
