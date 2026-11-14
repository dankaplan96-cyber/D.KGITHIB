# PLACE-1 — every item in a sensible place (the user, 11.11, P13; work order 1e)

"An agent that makes sure every item stands in a sensible place and not in the middle of the room, that it is arranged
normally, and that no items are one on top of another."

Status: **Automated runtime only** (SwiftShader, a booted game; no person has played these rooms for this job).
Build: branch `worktree-agent-a9ab182a41825978a` from `e55bcfa5`; the fixes in `e4ef829e`. Settings: the tests' default
boot (`?nocine`, a new game, every area built with `regions.ensureAll`), 960 × 540.

## How it is measured (`tests/place-scan.mjs`, rerunnable)

- `tests/lib/placerec.js` is installed before the game loads. `props.js`'s Kit reports every placed piece (each `k.at`,
  each room builder's `put`, with the prop's name: chair, bed, bookcase ...) and every drawn part (`k.add`, `k.mesh`).
  With the recorder unset (in play) this costs one property read per call; nothing else changes.
- `tests/lib/placecollect.js` gathers, per area, each piece's drawn parts as turned boxes in the world, the parts drawn
  outside pieces (walls, floors, partitions, pilasters), the room's colliders, floor rectangles, exits and landing spot.
  The island homes' planned pieces get their names from `ihomes.js`'s `IH[room].placed`.
- `tests/lib/placejudge.mjs` judges (each finding carries the measure that found it):
  - **inside**: two pieces' drawn parts go ≥ 4 cm into each other (separating-axis test on the parts' turned
    footprints, and their heights). Rock is skipped: an irregular rock's box is far larger than the rock.
  - **wall**: a piece's parts go ≥ 10 cm into a wall part (≥ 1.5 m tall, ≤ 0.8 m thick).
  - **float / sunk**: a standing piece's lowest part ≥ 5 cm over what is under it (the floor, a piece's or a ledge's top,
    at its middle and halfway to its corners), or ≥ 6 cm under the floor. Wall-hung things are not standing pieces.
  - **back**: a piece that belongs against a wall (bookcase, wardrobe, dresser, locker, cabinet, shelves, stove, bed's
    head ...) with its back ≥ 0.35 m from a wall while another side is nearer one (turned), or every side ≥ 0.6 m
    (adrift). Distances are rays from each face to a wall part, a wall collider, a tall piece or the floor's edge.
  - **facing**: a chair within 0.9 m of a table, desk or counter turned ≥ 100° away from it.
  - **door**: a standing piece ≥ 6 cm into the 0.9 m lane from an exit 1.6 m into the room.
  - **adrift**: a storage piece (crate, barrel, chest, sacks) ≥ 1.4 m from every wall and every other piece.
- `SHOTS=dir` writes, per finding, the game camera's picture with Twinsen beside the piece and a nearer look with the
  piece outlined; `VIEWS=file.json` writes fixed before/after pictures (the same spot and camera both times).
- The verdict fails on any finding not on the LEFT list in the test (each with its reason and priority, below).

## Region-by-region coverage (the final run)

| Areas | Rooms | Pieces judged | Findings left | Notes |
|---|---|---|---|---|
| Citadel's rooms (house, well, cellar, office, project office, control, pump room, workshop, lighthouse top, tavern and cellar, Bazoo's, ticket office, pharmacy, neighbour's, Nell's, baggage, terminal, Tralu's cave), the School of Magic, the wizard's tent, the asylum, Zeelich's terminal, Otringal's bar and hotel, Celebration's temple | 27 | 815 | 19 | 17 of the 19 by design or low (LEFT); the asylum's LBA1 floors are cells, not recorded parts (its floats are not measurable) |
| Zeelich street homes (Pelleck, Nara, Oku, Snuff's bakery) | 4 | 55 | 0 | 5 fixed |
| Island homes: Otringal 23, Knartas 20, Mosquibee/Celebration/Undergas/Platform/Orchard and Desert's old houses 15 | 58 | 511 | 0 | 26 fixed (one cause: the pilasters) |
| Kesh's homes and the post's cabins (Desert) | 8 | 63 | 0 | not changed (the campaign wave's area) |
| Hamalayi rooms (Lhar's five houses, the landing, the observatory keeper's, the hall) | 8 | 66 | 0 | 5 fixed |
| Late-chapter rooms (the shaft, the deep installation, galleries, Sendell's chamber, the core, condensers, temple, observatory, upper town, council, archive, valves, arena) | 14 | 233 | 6 | 2 fixed; the 6 left by design or low |
| Sewers | 3 | 12 | 0 | |
| Citadel outdoors | 1 | 86 | 1 | only what Kit places is known (Nell's shop, the spaceport's dressing, ...): **most outdoor props are not recorded** |
| Regions outdoors (Zeelich, Desert, Hamalayi, the nine isles) | 12 | 218 | 8 | Hamalayi's market and camps 203; **Zeelich's street and the isles: 0 pieces recorded — not scanned** |

Outdoors only *inside / float / sunk* are judged (no walls or door lanes there), and only for pieces Kit places. The
outdoor props built otherwise (instanced dressing, the town's own builders) are **not covered** by this sweep.
The scan is a new game's state. Room furniture does not change with the chapters; the quest-state sets that do (Lhar's
moving-day pack, Nara's HELD crates) are recorded hidden or shown alike.

## The measured list

Before the fixes 76 findings (today's measure on the pre-fix build); after them 34, all on the LEFT list (by design or
low), and none new. Coordinates are the room's frame (its centre; Citadel's and the regions' are the world's).

### Fixed (42 findings, 14 changes)

| Room / place | Item | Where (x, z) | What was wrong | Measure | Change |
|---|---|---|---|---|---|
| Zeelich, Pelleck's house (ch. 2) | bed | 2.6, 1.94 | turned: foot to the right wall, head out in the room | back 3 m, front 0.05 m | `zhomes.js`: head to the wall (ry −π/2), along the near rim |
| Zeelich, Pelleck's house | armchair | 2.45, 0.9 | its back 15 cm into the bed's foot | parts overlap 15 cm | (the bed moved off it) |
| Zeelich, Pelleck's house | chest | 1.1, 2.7 | at the bed's head, against it | — | at the bed's foot, 5 cm clear |
| Zeelich, Pelleck's house | desk | 0.7, −2.65 | 10 cm into the back wall's middle pilaster | wall 10 cm | 0.25 m right, its lamp, ledger, papers, chair and look spot with it |
| Zeelich, Pelleck's house | potted plant | −3.24, −2.76 | 16 cm into the corner pilaster | wall 16 cm | out of the corner |
| Zeelich, Nara's house (ch. 2) | bed | 2.96, 2.1 | turned: foot in the corner, head out in the room | back 3 m, front 0.1 m | `zhomes.js`: turned round, head in the near corner |
| Citadel, Twinsen's house (ch. 1) | firewood basket | −4.05, −2.94 | 19 cm into the range (the lying logs) | parts overlap 19 cm | `interiors.js`: a narrow basket, the logs standing, between the divider and the range (collider and giver with it) |
| Citadel, Twinsen's house | plush Dino-Fly | 3.42, 2.94 | 11 cm into Arthur's toy chest | parts overlap 11 cm | 11 cm out, still sitting against it |
| Citadel, pharmacy (ch. 1) | potted plant | −0.65, −3.56 | 13 cm into the back shelf | parts overlap 13 cm | `pharmacy.js`: in the gap between two shelves (berries, collider with it) |
| Lighthouse top (ch. 2) | crate | −0.85, 2.35 | 9 cm into the second barrel | parts overlap 9 cm | `interiors.js`: −15° round the wall, not −20° (giver with it) |
| Citadel outdoors, Nell's repair shop (ch. 1) | landing leg, gears on the bench | −102.8, 33.2 | the leg 8 cm into the bench top, the gears 2 cm over it | parts overlap 8 cm | `townlife.js`: lying on the top |
| Island homes (16 of Otringal's, Celebration's, the Orchard's, the School's dormitory; ch. 5–6) | stoves, shelves, chests, desks, a bed, a bookcase, filing cabinet, wash tubs, linen, cargo crates, a barrel (26) | the back walls | 10–25 cm into the back wall's rounded pilasters | wall 10–25 cm | `ihomes.js` planner: a slot clear of the pilasters first, else the piece stands in front of them (`zhomes.js` esmerRoom says where they stand); 25 homes' layouts changed |
| Hamalayi, Lhar's five houses (ch. 6, moving day) | the corded crate | by the counter | 12 cm into the tied bundles | parts overlap 12 cm | `hamrooms.js`: side by side (the set's space and collider 0.1 m wider) |
| Zeelich's upper town, the archive (ch. 9, a stealth room) | cargo crate | 4.6, 3.9 | 28 cm into the next crate | parts overlap 28 cm | `upper.js`: 0.4 m along |
| Zeelich's upper town, the archive | technicians' locker | −6.99, 1.6 | 0.7 m out from the wall, its back to nothing | back 0.7 m, the rest 3 m | `upper.js`: back to the wall; the coat's prompt spot with it |
| Desert, the School of Magic (ch. 6) | remedies cabinet | 12, 6.93 | the long table's end 10 cm into it | parts overlap 10 cm | `wizards.js`: 0.3 m along the wall |

### Left, with a priority (34 findings; in the test's LEFT list)

| Room / place | Item | Where | Finding | Priority / why |
|---|---|---|---|---|
| Citadel, tavern | jukebox | 3.4, −1.35 | back: its side to the wall, 1.95 m out | by design: LBA2's Chez Luc has it at the stair's foot; Kip's stop is at its front |
| Otringal's bar | aquarium | 4.6, 1.6 | back: 2.45 m from every wall | by design: LBA2's bar has it in the middle by the booths |
| Citadel, control room | consoles (2) | −3.15 / −0.05, −2.42 | inside 13 cm | by design: three consoles joined into one curved bank |
| Citadel, tavern; Otringal's bar | counters | −4, 0.68; −3.12, 5.65 | inside 19 / 6 cm | by design: L-shaped bars, two counters meeting |
| The core (ch. 12) | receivers' cages (3), a pylon | | float 76 cm; sunk 30 cm | by design: cages round floating crystals on their arms; a pylon in the floor's ring channel |
| The shaft (ch. 11) | the rock wall | 9.05, −5.36 | float | not a piece: the shaft's wall rising from 6 m down |
| Asylum (LBA1) | boiler, a grate | | float | not measurable: LBA1's floors are cells, not recorded parts |
| Otringal's bar | gallery railing | −8.23, −2.95 | float 60 cm | not measurable: on the gallery's edge |
| Lighthouse top (ch. 2) | transmitter cabinet | −0.82, −2.24 | wall 29 cm | not measurable: the round room's glazing parts are arcs whose boxes reach into the room (its back 2.68 m from the middle, the glass 2.9–3.0 m); looked at, it stands before the glazing |
| Citadel, Nell's shop | the landing leg | −102.8, 33.17 | inside 6 cm | low: its thick end touching the bench top |
| Citadel, project office (stealth) | potted plant | 3.6, −3.07 | inside 6 cm | low: behind the open door's leaf; a stealth room, left alone |
| Zeelich, Baldino's workshop | drafting table | −3.43, 2.45 | inside 6 cm | low: the helix model on its edge |
| Citadel, pharmacy | basket | 1.64, 0.08 | inside 5 cm | low: under the bauble tree's branches |
| Otringal's bar | booths' rail, the till | −3.05, −4.82; −3.2, 5.4 | inside 5–6 cm | low |
| Otringal's hotel | coin machines (2) | 4.2 / 3.2, −7.53 | inside 4 cm | low: their tops under the tier lamp's shade |
| The shaft (ch. 11) | barrel | 7.8, −4.7 | inside 6 cm | low: against the column at the tunnel |
| Hamalayi outdoors (ch. 6) | market and camp goods (8) | 4289.8, 78.7 … 4340.55, −33.11 | inside 4–11 cm | low: stacked goods touching |

### Measured and not a defect (the measure refined, not the game)

Round stools have no front (their facing is not judged); crystals, boulders, stalagmites and eggs grow out of the
floor (18 "sunk" in the first run); wall hangings and lamps on a wall are not standing pieces (most of the first
run's 62 "float"); a basket bridging two folded
cloths rests on both (Bazoo's); bookcases back to back in the archive's stacks; an irregular rock's box is not the rock
(the shaft's barrels by the rock wall).

## Not in this job

- **After the campaign wave**: the Desert dig and its test stand (`src/game/teststand.js`, `text/digtest.js`) and
  chapters 4–5's Kesh pump and heat-line places. Their pieces were scanned with the rest and none was found out of
  place (the Desert outdoors: 13 pieces; Kesh's five homes and the post's three cabins: 63 pieces, 0 findings); nothing
  there was changed. To be swept again once the wave lands.
- Not the expansion. No new assets.
- Outdoors not covered (see the table): Zeelich's street, the nine isles, most of Citadel's dressing. A follow-up would
  record the outdoor builders' placements the same way (their own `put`/instancing helpers).

## Pictures (looked at)

`lba3/captures/place-1/`: per fixed place, `<place>-before-game.jpg` / `-after-game.jpg` (the game camera, Twinsen
at a fixed spot) and `-before-close.jpg` / `-after-close.jpg` (a nearer look from the camera's side). Chapters 1–2
places (may be shown): Pelleck's bed and desk, Nara's bed, the house's kitchen and toy corner, the pharmacy, the
lighthouse top, Nell's shop. Others are named `x-*` (the archive, the School of Magic, three island homes).

Looked at: Pelleck's bed (head now at the right wall, the chest at its foot), his desk (clear of the middle pilaster),
Nara's bed (head in the near corner), the pharmacy's plant (in the gap), the toy corner (the Dino-Fly beside the chest),
Nell's bench (the leg lying on the top), the archive (crates apart, locker at the wall), three island homes (stove,
shelf and chest off the pilasters; the layouts changed). Weak evidence: the kitchen's basket is mostly behind the
wardrobe from the room camera; the lighthouse crate is hard to see in its picture (the measure is the evidence there).

## Suites (Automated runtime only; one at a time, SwiftShader, a shared machine; each with its own server)

| Suite | Result | Notes |
|---|---|---|
| place-scan | PASS 2/2 | 135 areas, 2059 pieces, 34 findings all on the LEFT list |
| interior-life | 142/144 | the same 2 fail on the pre-fix build (run there too): the terminal's evacuation talk picks a sign for Old Ressa; Zeelich terminal's chapter-9 guard faces −2.36 at `ztg2_door` |
| no-air | 1 offender; 6 states lost to memory | the full sweep: states 1–15 measured, Garrick at Citadel's flower bed (`gar_tend`, left hand 5.7 cm; untouched area) — not reproduced in state 1 alone (105 cases, 0 offenders); states 16–21 died (the page out of memory, twice each, shared machine), rerun with `AREAS=` the changed rooms: 0 hands in the air, 0 feet off the ground |
| work-step | PASS 10/10 | |
| overlaps | PASS 26/26 | and `ONLY=zh_pelleck,zh_nara,archive`: PASS, 0 failing |
| door-sweep | PASS 5/5 | |
| chapter1 | PASS 32/32 | |
| island-doors | PASS 89/89 | the 25 island homes whose layouts changed |
| zeelich-doors | PASS 22/22 | Pelleck's and Nara's houses |
| chapter9 | PASS 18/18 | the archive (stealth room): its watcher, the worker's coat at the moved locker, the cabinets |
| hamalayi-life | PASS 18/18 | Lhar's moving day |

## Next

- (Done in PLACE-2, `PLACE-2.md`: the outdoor builders' placements recorded and judged — Citadel's dressing, Zeelich's
  street, the nine isles.)
- Round rooms (the lighthouse top): judge walls by their triangles, not their parts' boxes.
- Record the outdoor builders' placements (citydress, townbits, zeelich, zislands) so the sweep covers them.
- Sweep the Desert dig/test stand and Kesh's pump and heat-line places after the campaign wave.
