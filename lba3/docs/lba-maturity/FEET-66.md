# FEET-66 (26.11): his feet on the drawn surface he stands on, game-wide (#66)

Branch `feet-66` from `a68358be` (ccr-c1c2c4b9-dep6ed). Every result here is **automated runtime only (SwiftShader,
headless Chromium)**: nobody played it, there was no real GPU, and no frame times were measured. Pictures:
`captures/feet-66/sheet.png` (1294 px wide; before | after from the play camera at Far, each with a 3x crop round his
feet, the Hamalayi first). Every suite ran with `SERVE=1` (this checkout's files by request routing; port 8123 belongs
to another checkout's server).

## The Hamalayi stream: what it is (read this first)

The "frozen stream" at the arch is **the gorge river itself**: `hriver` (a flat sheet at 0.700) and `hchannel` (0.715),
`hamalayi-finish.js gorgeRiver`. The source calls it meltwater with drifting ripples and foam, and it reads as water
from the play camera (sheet row h2). There is no separate ice sheet there. The "about 10 cm" of SMALLFIX was the
**lowest of the #64 steps**: its top at 0.596, 10 cm under the water's 0.700. Past it he wades, 33–44 cm deep (the bed
at 0.26–0.37). By the brief's rule (water stays water) **the river was not made walkable and the steps' foot was not
changed**. If the coordinator means the river to read as ice, that is a look change (its colour and ripples), not a
floor: a question below.

What *was* wrong at the arch: **the rim's snow lip lay over the steps' top tread**, 19–39 cm of drawn snow over his feet
as he walked up (sheet row h1). Fixed (below).

## What the suite found (before), and the rule

`tests/feet-on-surface.mjs` (new): for every outdoor area (Citadel, Zeelich, the Desert, the Hamalayi, Ballastra and its
two districts, the nine isles; `?allregions&nobatch`), discovery from the drawn static geometry (the overlap sweep's
store, `tests/lib/sweep.js`, read raw: `SW.raw`, `opt.buildOnly`, additive and off by default) nominates every
near-flat, up-facing drawn top 3 cm – 0.6 m over the floor physics gives him there, and every standable collider with
nothing drawn within 5 cm of its top. Twinsen is then placed 3 m off each piece and **walked across it by input**
(ArrowUp held); each frame on the ground over it, his feet (`hero.pos.y`) against its drawn top.
**FAIL: feet more than 3 cm under it, or more than 5 cm over the drawn surface under him.**

Classes (counted, never dropped):

- **A, judged**: a piece whose top lies on average no more than 30 cm over his floor (a sheet, a slab, a pad, a step,
  snow over a step, a low stone), or a floor with nothing drawn at its top.
- **B, listed**: a higher piece walked through (a bench, a boulder, a table): a missing collider, its owner's.
- **C, listed**: a standable collider over a rock's domed top (he stands up to 1.5 m over the rock's edge).
- Water (`hriver`, `hchannel`, the vent's pool, the Desert's sea plane): walked for depth, listed. Soft snow (the rim
  lips, drifts, snow caps): listed, except snow over steps (judged: that is the arch's case).
- A step's last 5 cm (physics reads a brick 5 cm in from its edges, so he is on the step below for a frame) is not a
  missing floor.

**Before (base `a68358be`, the same suite): class A walked 386, ok 13, FAIL 296, not reached 77; class B 108, class C 76,
soft snow 97 listed; water walked 4. VERDICT FAIL.** By area: Hamalayi 125 FAIL, Citadel 70, Zeelich 40, Desert 24,
Ballastra 27, the isles 10.

## Fixed (173 of the 296), the cause each time, game-wide for its kind

| Where | Cause | Fix | Before → after (feet vs drawn top) |
|---|---|---|---|
| Hamalayi, the arch steps' top tread | the rim's snow lip (`snowLips`) ran over it: the #64 steps came after the lip's rule "no lip where a walk crosses the rim" | the arch's place is shared (`wave8world.js ARCH_AT`, `archLane()`; `story/wave8.js SPOT.arch` uses it) and the lip keeps off the steps' lane as off the trails | 19.4 cm under snow → 0 (row h1) |
| Hamalayi gorge, 46 ice shelves | drawn boxes (top 0.805) with no collider: he stood on the bank or river bed under them | a floor at each shelf's top (box, its yaw) | 16.9 cm → 0 (row h3) |
| Hamalayi gorge, 12 floes | drawn in the water, walked through | a low block to the drawn edge, top 1.3 (a block within 12 cm of his feet is stepped over: from a shelf the floe's 0.85 would be), the ball passes | 15 cm into it → stopped at its edge (row h4) |
| Hamalayi glacier, crevasse lines (20) | three ribbons at 3 / 6 / 9 cm over the ice | 1.2 / 1.8 / 2.4 cm (6 mm apart); the wide ones keep their low collider | up to 9.3 cm → under 3 (suite) |
| Hamalayi vent, fractures (6), wet rim | ribbons 5 cm, ring 3.5 cm over the ice | 2 cm | 5.1 / 3.7 cm → 2 |
| Hamalayi vent seal, 40 groove strips (`ventseal.js`, the default ch7 stage) | flat boxes 1.5 cm over the ice at their middle; on the vent's slope their top stood 5–9 cm over his feet | laid on the ice, tilted with it, top 1.2 cm over it | 6.1 → 1.3 cm (row h6) |
| Hamalayi, the lift's top ramp | a collider (top L3) with nothing drawn on it: he stood up to 0.8 m over the cliff's edge | its planks drawn at the collider's top, on two bearers | nothing drawn → 0 (row h7) |
| Hamalayi gorge, the rock stack's snow (`story/depth.js`) | snow disc 4.5 cm over the stone he stands on | 1.5 cm | 4.5 → 1.5 cm |
| Zeelich, all the paving (`buildPaths`): street, plaza, kerbs, star, arcade flags, depot spur, gravel tracks, the plaza's kerb ring; the depot's concrete yard; the crossing and its covers (`zeelife.js`) | slabs 3.5–10 cm thick laid *on* the island's slab, which is his floor | the tops 0.8–3.0 cm over the slab in the same order, 4 mm apart (gravel 0.8, yard 0.8, street 1.2, arcade 1.6, kerbs 2.0, plaza 2.4, crossing 2.5, covers 2.8, star 2.8, ring 3.0); the slabs' bodies sunk into the island | street 5 → 1.2 cm (row z1); plaza 6.5, star 7.5, ring 10 → under 3 |
| Zeelich, the dog yard's leaf bed and track | boxes 5 and 8 cm over the ground | 0.8 and 1.6 cm | 5 → 0.8 cm (row z3) |
| Pads: Zeelich's shuttle pad, the Zeelich port's (`travel.js`), the Citadel spaceport's | drawn discs 12–24.5 cm tall with no floor; their yellow rings 8–9 cm over the disc | a floor at each disc's top (to its cap's edge), the rings 1.5 cm over the disc | Zeelich 24.5 → 0 (row z2); spaceport 12 → 0 (row c1) |
| Ballastra, the pad's glazed ring | 5 cm over the pad | 2.2 cm | 5 → 2.2 |
| Ballastra, every floating deck (`look.js deckSlab`, 'floats') | the pontoons (and the floats' crowns) reached up through a low deck: on the Water Gardens' walkways 5 cm over the boards along both sides | a pontoon's top and a float's crown 1 cm under the deck's underside at most | 5 → 0 cm (row b2) |
| Desert, the camp rugs | the rug 3.5 cm over the sand | 1.7 cm (its backing 1.2) | 3.5 → 1.7 |

**After (this branch, the same suite): class A walked 210, ok 13, FAIL 1, handed on 122, not reached 74** (the 173
fixed pieces are no longer nominated: nothing drawn stands 3 cm over his floor there). The one FAIL was the spaceport
pad's bevelled edge (its slope 6.5 cm over his feet as he stepped off the floor); the pad's side is upright now and the
Citadel re-run passes (below).

## Handed on (122 class-A pieces; the suite prints each as HANDED ON with its depth)

The list is in the test (`HANDED`, `OWNERS`), each piece by the discovery's middle of it (0.5 m): a fix shows as `ok`,
a new fault elsewhere still fails. By owner (pieces, depth measured by the walk):

- Citadel: the project's station yard (`island.js buildStation`), plates and pieces 3–25 cm (15); low stones and beds
  (`world.js`, `citydress.js`) 15–32 cm (12); the town's merged pieces (door steps, kerbs; `town.js`, `townbits.js`)
  7–29 cm (8); the cliff rocks walked into, 15–70 cm (4); the harbour's quay pieces 7–10 cm (4); the sewer hatch on the
  terrace 7–11 cm (4); the asylum's front (`lba1places.js`) 26–46 cm (3); the old cellar hatch 8–9 cm (3); the water main
  lying on the ground (a pipe) 8–10 cm (3); the lane gate 5 cm (1). **The square's ring steps (FLAT-TOWN, protected):
  26 cm (1)**, a question below.
- Standable colliders over less drawn, every area (copings, planters' rims, a wall top, the Arch District's stair drum):
  he floats 8–48 cm (18).
- Zeelich: a porch, a step, low stones 6–62 cm (7). Desert: low rocks and a slab 6–47 cm (20).
- The Hamalayi: the landing's dry-stone fold walls and the LBA1 place's platform (standable tops over the drawn edge,
  10–114 cm; 6); low rocks, the gorge's shore stones, the dead tree's root plate 13–38 cm (3).
- Ballastra: the swing bridge 8–10 cm, a gangway 4 cm, a bed's edge 18 cm (4).
- The isles (`zislands.js`, another worker's now; Franco's dig) 7–58 cm (6).

Class B (108 before, 95 after) and C (76) are listed in the run's report (REPORT=), not judged.

## Visible changes (for the user's pick)

1. The Hamalayi: a gap in the rim's snow lip where the arch's steps go down (h1); planks on the lift's top ramp (h7);
   the crevasse lines and the vent's cracks lower on the ice; the seal ring's groove strips lie with the ice.
2. Zeelich: the paving, kerbs, star and the plaza's kerb ring sit 2–7 cm lower (flush with the ground), the depot's
   yard and the dog yard's bed and track too.
3. The yellow rings on the three pads lie on the pad (no raised tube).
4. Ballastra: the floating walkways' pontoons and floats no longer show through the boards.
5. Not visible: floors under the shelves and pads, the floes' block.

## Not covered

- Interiors (rooms): not run (floors are colliders; rugs are 1.2 cm). Moving meshes, see-through decals and foliage
  cards are not in the store (counted per area in the run). Candidates the walk could not reach (77 before) are listed
  as NOT REACHED, not judged: on the isles most of them (their starts are inside the isles' colliders or off the edge).
- Character feet against the drawn surface (the rig's soles, `tests/lib/contact.js CT.feet`): the suite measures
  `hero.pos.y` (the physics' feet), not the animated soles.
- NPCs and residents: not measured here.

## Tests (each once, `SERVE=1`)

| Suite | Result |
|---|---|
| `tests/feet-on-surface.mjs` on the base (`a68358be`, the same test copied in) | **FAIL**: class A 296 FAIL (above) |
| `tests/feet-on-surface.mjs` on this branch (`077d7a5c`..`ae3c18d7`, all areas) | FAIL 1 (the spaceport pad's bevel), 122 handed on, 74 not reached; water: the river 37.7 cm deep at the deepest walk, the channel 18.5, the vent's pool 7.1, the Desert's sea 14.9 |
| the same, `ONLY=citadel`, after the pad's fix (`d1db477e`) | **PASS** (class A 85: ok 4, handed on 68, not reached 13) |
| `tests/walkers.mjs` | (below) |
| `tests/worldfit.mjs` | (below) |
| `tests/feet-shots.mjs` (pictures and numbers, before on the base, after here) | the table's before → after |

## Questions

1. The gorge river: water (as built, wading kept), or should it read as ice? If ice, it is a look change and then a
   floor at 0.700 over the gorge (the tree-bridge puzzle crosses it: the coordinator's call).
2. The Citadel square's ring steps (FLAT-TOWN, protected; `island.js` says the incline under them is deliberate): his
   feet go up to 26 cm under a tread. Stair colliders per ring would fix it without changing the look. Allowed?
3. Class C (standable rock colliders over domed rocks, 76): make the rocks' colliders `noStand`, lower them, or leave?
4. The gap in the Hamalayi's snow lip at the arch's steps: fine, or should the lip end in a taper there?
