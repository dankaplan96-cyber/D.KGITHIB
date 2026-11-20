# PLACE-3 — every item in a sensible place outdoors: Desert Island and the Hamalayi (after PLACE-2)

PLACE-2 measured the Desert (30 findings) and the Hamalayi (152) and left both for after campaign wave 3. Wave 3 is
merged (chapter 6's winch line and upper brake, chapter 7's telescope); PLACE-3 sweeps both places with PLACE-2's tool,
fixes what is really out of place and lists the rest with a reason.

Status: **Automated runtime only** (SwiftShader, a booted game, a new game's state; nobody has played these places for
this job; no fps claims). Build: branch `worktree-agent-a5e392baa92e8eb9e` from `24b3e51a` (`ccr-c1c2c4b9-dep6ed`);
commits `94caeff9` (the fixes and the tool) and the report's. Settings: the tests' default boot (`?nocine`, a new game,
every area built with `regions.ensureAll`), 960 × 540.

## The tool (`tests/place-scan.mjs`, PLACE-2's, three changes)

- **Names.** The Hamalayi's dressing is placed by one `put(area, name, …)` whose builder the recorder saw as
  `() => fn(k)`: every piece was named `fn`, its doors' and windows' frames `pv`, its walls' copings `custom`.
  `hamalayi.js` `put` now hands the name to the recorder as `interiors.js` does (one property read in play), and
  `placejudge.mjs` `nameOf` names a dry-stone wall's coping (`wallCoping`) and an inline snow drift (`drift`).
- **Fixtures.** Outside the Kit PLACE-2 already judged a building's fixtures (windows, valves, kerbs) as obstacles, not
  dressing. Inside the Kit every piece was dressing, so the Hamalayi's houses were judged against themselves: a door
  frame "in the way of its own door", window frames "in the wall" of their own house. Now a Kit piece inside a building
  (`house`, `hall`, `observatory`, the monastery's `gate`), a wall's coping and a snow drift are fixtures: obstacles for
  the dressing round them, not judged themselves (`placejudge.mjs` `OUT_BUILDING`). Checked, not assumed: every one of
  the seven Hamalayi doors has its sill within 6 cm of the snow outside (a probe of the terrain at the sill, 0.5, 1 and
  2 m out), the copings' "sunk" was their own wall's collider top, and the pictures of a coping, a window and a drift
  were looked at.
- **Pictures.** `SHOTS` now draws pieces built outside the Kit (it stopped at the first one); `VIEWS` works in a region
  (the region's centre from `regions.js`); `DRAWS=1` prints a frame's draw calls and triangles at each view (counts only).
- The LEFT list's two blanket entries (`desert *`, `hamalayi *`) are gone; the coverage check now asks ≥ 20 pieces of the
  Desert and the Hamalayi too.

## Coverage (the final run)

| Area | Pieces judged (Kit / built outside it) | Findings: PLACE-2's tool, base | PLACE-3's tool, base | After | Fixed |
|---|---|---|---|---|---|
| Desert Island (ch. 4–5; the dig, the post, Kesh, the corral, the old places, the yacht) | 613 (13 / 600) | 30 | 30 | 15 (all LEFT) | 15 |
| The Hamalayi (ch. 6–7; the landing, Lhar, the lift, the monastery, the observatory) | 412 (203 / 209) | 152 | 22 ¹ | 15 (all LEFT) | 7 |

¹ 152 → 146 with the pieces named (six signposts are signs, judged as hung things, as everywhere else) → 22 with the
Kit's buildings as fixtures (124: house frames 33; copings, the observatory's windows and telescope barrel and two inline
drifts 71; put drifts 18; the monastery gate 2). None of the 124 is a placement fault (above).

Doors: 11 on the Desert, 7 on the Hamalayi; no dressing in any door's lane or ring. The Hamalayi's `put` log (its
dressing against the story's spots and the walking routes) is empty. Walkways: 5 and 15; nothing in their middle.
Benches and signs: none faces a wall. Paths are known on Citadel only (as PLACE-2); the walkers suite checks the routes.

Not covered: the story's chapter props placed later (Lhar's moving-day packs, the evacuation's goods); other chapter
states than a new game's for the dressing (people are swept in every state by no-air, below).

## Fixed (measured, changed, looked at)

| Place | Item | Where (world x, z) | What was wrong | Measure | Change |
|---|---|---|---|---|---|
| Desert, S40 (the old house) | a sack of two | 3366.7, −35.4 | in the house's side wall | 23 cm into its collider | `desertold.js`: 0.3 m out |
| Desert, Kesh's south houses | a water jar | 3352.6, 18.6 | half in house 2's back wall | 41 cm | 0.6 m out, beside the other |
| Desert, the s28 tower's court | a jar | 3344.3, −73.9 | in the seedling planter's box | 9 cm | 0.25 m east |
| Desert, the corral | two troughs | 3448.1, −54.8; 3459, −53.7 | across a ridge: one end's legs 0.8–1 m over the slope | float, one side 78–101 cm | along the ridge, each leg on the ground under it (the box level over the highest leg less 0.15 m); `R.troughs` (Bram's lance) follows |
| Desert, the old places | jars, crates, barrels, sacks (8) | the corral, S40's yard, Hesk's berth | on slopes at the ground under their middle: one side 16–65 cm in the air | float (side) | `desertold.js` `gLow`: each on the lowest ground under its footprint (PLACE-2's rule: rather a little sunk in the sand than floating) |
| Desert, Hesk's berth | the spare gear (2 crates, 2 barrels, a sack) | 3386–3388, 1.6–4.3 | on the ridge's crest, a crate 65 cm over one side | float (side) | about 2.8 m along, to the ridge's gentle foot (≥ 3 m from the yacht's routes); the rolled sail stays |
| Desert, the post | the cable drum | 3428, −10.4 | its lower flange 14 cm over the pad, nothing under it | float 14 cm | `desertdress.js` `spool`: on its flange |
| Desert, the yacht stop | Hesk's sand-yacht (a vehicle) | 3375.1, 9.5 | a rear wheel 26 cm in the sand slope | sunk 26 cm | `desert.js`: parked on its three wheels (pitch and roll to the ground under them, set where it stops: at the build, `placeAt`, a ride's end; not while it rides) |
| Hamalayi, Lhar, house 2 | the barrels' crate | 4304, −0.7 | in the house's front corner | 51 cm into its collider, its quoins through it | `hamalayi.js`: on the barrels' other side, the three 0.2 m off the wall, clear of the door's ring |
| Hamalayi, the landing hut | its woodpile | 4290.3, 78.7 | its lid through the gable window's shutters | 19 cm; the frame 11 cm into it | 0.2 m off the gable |
| Hamalayi, the observatory | the supplies (crates, a barrel) | 4280.6, −69.1 | the lower crate in the plinth's batter | 28 cm into a wall part | 0.3 m out |
| Hamalayi, the lift's top | the old crank stand | 4327, −29.5 | 20 cm over the terrace's snow (built at L3) | float 20 cm | on the ground there (Yorna's crank spot is `R.lift.crank`, unchanged) |

Saves: no container moved, no list reordered (`containers.js` untouched); the yacht's parked place is still saved by
name and placed by `placeAt`. People's work stops: Hesk's two at the yacht's hull (the hull now tilts to the slope:
checked by no-air below); no stop was at the moved goods.

## Left (on the test's LEFT list, with a reason)

- **By design**: the yacht's wheels in their forks (one vehicle); a lantern on its post's arm (5 cm); the glider fields'
  windsocks on their masts (Desert and Hamalayi, as Citadel's); the frozen winch in its ice (chapter 6); the mooring
  rope's post by the winch, the rope tied to it (`pass.js`); the prayer wheels' roof against the monastery hall's front;
  LBA1's old gate set on the lowest ground under its posts.
- **Not a standing piece / not measurable**: the Desert tents' guy lines (8: from the eaves to the tops of their pegs, 17 cm
  up the peg); the prayer wheels on the yard's paving (the paving is not recorded as ground; looked at); the observatory's
  barrel against its round wall (an arc's box; it stands 0.5 m off the plinth).
- **Low**: two barrels touching by house 2 (5 cm); the freight's and the yard's crate against their barrels (4–5 cm); a
  stack's top crate turned on the one under it, a corner past its edge (Lhar's west crates, the observatory's supplies);
  the fold's hay rack 9 cm in the snow.
- **Reported, not moved (wave 3)**: the lift winch's sled stands 12 cm over the snow (`hamalayi.js` builds it at the
  platform's ground, `liftY0`, not at its own). Wave 3's crank sits on its drum at that height (`winchline.js`, the same
  `y`), so lowering the winch would move the crank: left for its owner. The gauge, the lamps, the brake and the telescope's
  yoke and lever: no finding.

## Pictures (looked at)

`lba3/captures/place-3/` (chapters 4–7: for the coordinator). Per fixed place `x-<place>-before-game.jpg` /
`-after-game.jpg` (the game camera, Twinsen at the same spot both times) and `-before-close.jpg` / `-after-close.jpg`
(a nearer look from the camera's side): the Desert's sacks, Kesh's jar, the planter's jar, S40's jar, both troughs,
Hesk's gear (`-hesk-old` before, `-hesk-new` after), the corral's barrels and crates, the drum, the yacht; the
Hamalayi's crate by house 2, the hut's woodpile, the observatory's supplies, the top crank, and the winch (unchanged).
Weak evidence: the sacks' game view has Twinsen in front of them (the close view shows the wall clear).

Draw calls (`DRAWS=1`, one frame at each of the 17 views, all passes; SwiftShader, counts only): unchanged at every
view (192–567); triangles −472 on the Desert (the old places' batch), unchanged on the Hamalayi. No mesh, material or
light was added.

## Suites (Automated runtime only; one at a time, SwiftShader, a shared machine)

| Suite | Result | Notes |
|---|---|---|
| place-scan | PASS 3/3 | 135 areas and rooms, 7227 pieces (5168 outdoors outside the Kit), 172 findings, all on the LEFT list; every other area's count as PLACE-2 left it (Citadel 32, Zeelich 2, the isles 83) |
| desert-life | PASS 30/30 | |
| hamalayi-life | PASS 18/18 | |
| chapter4 | PASS 59/59 | the yacht's rides and stops (Desert) |
| chapter5 | PASS 23/23 | |
| chapter6 | PASS 24/24 | the first run 23/24: an ice mite did not skitter from a ball thrown from 5 m (combat timing); rerun alone: PASS |
| chapter7 | PASS 20/20 | the observatory, the telescope |
| no-air `AREAS=desert` | 0 offenders; 2/3 | every chapter state (24): 1229 cases, 0 hands in the air, 0 feet off the ground; the failed check is the case count meant for the whole sweep (149 here, > 150 asked), not a placement |
| no-air `AREAS=hamalayi` | 1 offender, not ours; 1/3 | 1152 cases: 0 on the Hamalayi; the one offender is PLACE-2's Garrick at Citadel's flower bed (5.7 cm, built with every sweep); the case count as above (109) |
| walkers | PASS 37/37 | |
| work-step | PASS 10/10 | |
| containers | 40/41 | the first run's page crashed (out of memory, a shared machine); rerun alone: the one failure ("the house keeps its givers … refill", Twinsen's house) fails the same on the base build (run there too, the four changed files put back) |
| campaign-hands | PASS 3/3 | the winch's crank 0.9 cm, the brake 0.1 cm, the telescope's setting lever 0.1 cm |
| chapter1 | PASS 32/32 | |

## Next

- The winch's 12 cm (above): for the owner of `winchline.js` / the lift, with its crank.
- A sweep of the Desert and the Hamalayi in the later chapters' states (the evacuation's goods, the epilogue's Lhar).
- Pavings and wall tops drawn without a brick as ground for the measure (PLACE-2's item, still open).
