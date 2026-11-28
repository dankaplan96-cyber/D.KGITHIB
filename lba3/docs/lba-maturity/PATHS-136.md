# PATHS-136 (P136, the user, 26.11, after v173: "The paths are still not fixed")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **Automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it; nothing was checked on a real GPU.


## The user's spot
- The photo: Citadel, south edge of the square's ring, by the signpost `HARBOUR · SPACEPORT · LIGHTHOUSE`
  (`citydress.js`, at (−44.6, 6.6)). The camera looks south-east, over the ring.
- The kerbed strip that "ends square into the dirt beside the signpost" is the south lane (`town.js` STREETS[3]).
  It leaves the ring and stops at (−44.3, 9.8).
- "The street beyond" is the east street (`world.js` GRID_STREETS, x −35), which runs down toward the house with the
  laundry line and the pier.
- Between the two was 4–5 m of open dirt, with the tulip bed, a tree, bushes and a bin.
- **Why P135 missed it:**
  - Its scan pruned the lane's stub as a "twig" of the square's middle line. The half-width grows into the square
    behind it.
  - The tip also sat on a staircase in the thinned line (two neighbours), so it was never seen as an end.
  - The gap between the lane and the east street was found, but accepted as "the fork of the south lane and the east
    street (both go on)". The lane does not go on.

## The rule (strict, from the player's view): `tests/path-ends.mjs`, `tests/lib/pathends.js`
- **END.** A paved strip, or a stub off a square, whose end reaches none of these within 1.25 m is a fault:
  - a door
  - a wall: a building, a wall, a parapet, a fence or a stair's side (a non-prop box ≥ 1.5 m long, ≥ 0.5 m tall)
  - a face in the ground ≥ 0.3 m: a quay, a stair, a cliff
  - a deck (a bridge's or a pier's floor), ahead or beside the strip's last stretch
  - the sea
- **Props never count**, whatever stands there: a bin, a lamp, a post, a sign, a tree, a bush, a bench, a tub, a
  planter or a crate. Paving again a little way on is not a destination either: the two almost meet.
- **GAP.** A paving edge (≥ 1.5 m of it) faces other paving across 0.3–6 m of level bare ground, with no wall, face,
  water or deck between. Props in the gap do not excuse it. P135 asked 0.75–5 m, and let a bush or bin close a gap.
- **Areas.** Citadel, Zeelich, Desert Island with Kesh, the Hamalayi, the nine Zeelich isles, Ballastra (Float Harbor
  masses).
  - On the isles only their designed paving is judged: the square (`paveAt`) and the landing pad
    (`zislands.js terrain.paveKind`, read by the test only).
  - WA-11's bare patches, and the ground under the deck islands' decks (never seen), are left out and counted apart.
    P135 left out every isle finding.
- **Known list.** `tests/fixtures/paths-136-known.json`: true ends only, each with its reason.
  P135's eight "deliberate" cases were all re-judged (below).
- **Pictures.** A play-camera picture of every end, reached or not, and every gap. `ONLY=area` builds only that area.
- **Closed gaps.** Gaps closed by a wall or a deck are listed as `CLOSED GAP`, with what closed them (`closed.json`), so
  each closing is looked at, not trusted. A "wall" is any non-prop box, and a "deck" is any floor 2.5 cm over the
  ground.
- **This supersedes PATHS-135's question 1.** The test now reads `paths-136-known.json`, not `paths-135-known.json`.

## Found and done
| # | Area, at | Kind | Before | Decision / done (visible changes, for the user's pick) |
|---|---|---|---|---|
| 1 | Citadel (−44.8, 10.9) + (−36.4, 6.7) | END + GAP 4.9 m | **the user's spot**: the south lane's stub ends in dirt by the signpost, 4–5 m of dirt to the east street | **Paved**: a forecourt between the ring, the lane and the east street (x −45.6…−35, z 3.6…11.25), its west and south edges straight and kerbed, its east end flush in the east street. The tulip bed and the gardener's stops stand on it. The signpost's three arrows now point across it to the east street (they pointed south into the block's lawn). |
| 1b | Citadel (−49, 4) | (notch) | the west street's foot ended rounded 2 m short of the ring's south curve: a dirt notch between | The foot runs on into the ring (x1 −51.4 → −45). |
| 2 | Citadel (−46.9, −14.4), (−41.9, −14.2) | GAP 2.2 m, 0.8 m | P135 "deliberate": dirt between the north street and the ring, west of the climb's ramp | **Paved** (flush between the block's west street and the ring). |
| 3 | Citadel (−36.0, −14.4), (−33.9, −11.9), (−35.7, −10.9) | GAP 2.3–3.6 m | P135 "deliberate": dirt with a tree between the ramp, the north street, the east street and the ring | **Paved**. The tree there and a bush are taken off by the existing "nothing on the paving" filter. |
| 4 | Citadel (−58.9, 58.3) | END | the west street ran 4 m past the south cross street, square into the dirt (P112's free end, the user's pick of 23.11) | **Own commit `c1a59f78`**: it ends flush in the cross street (one corner). If you say no, revert it and add the end to the known list. |
| 5 | Citadel (−32.7, 41.8) | END | the link to the spaceport footbridge ends flush with the bridge's south edge; the bridge leaves from its side | **True end** (the bridge). The scan now sees a deck beside a strip's last stretch (the deck lands 3 cm over the ground). |
| 6 | Desert, the School (3337.4, −75.4), (3337.4, −70) | GAP 2 m | P135 "deliberate": "the walks either side of the water channel" | The channel had **no water**: AUDIT-FIX (17.11) lifted every small inland hollow below the water line to damp sand, this one too, so a dry sand strip lay between the forecourt and the plaza under the arched bridge. **The channel holds water again** (`desert.js`: the rill is kept out of that lift). The bridge is its crossing. |
| 7 | Desert, Kesh (3355.2, −7.6) | GAP 2 m | the track's dirt and the oasis's wet ring crossed Kesh's paved plaza (a bare tongue by the palms, a dirt band across it) | **Paving wins** inside Kesh's paving (as P135 did on the Hamalayi): the track and the wet ring start at its edge. |
| 8 | Zeelich (2374.5, −8.6) | GAP 0.2–2.4 m | P135 "noted, not changed": the council house's arcade floor stopped short of the plaza's kerb ring, bare granite in the two corners | **Paved**: the arcade's flags run on to the ring (`zeelich.js`), the arcade's width. |
| 9 | isle_liftdock (4192, 1810), (4193, 1819) | END | the terrain's landing pad under the deck island, far under the clouds (never seen) | Not a way: left out (deck island). |
| 10 | isle_undergas (3214.7, 1781.6) | END | the gas works' round concrete yard meets the rock ridge that rises inside its circle | **True end** (known list): the yard's rim at a rock slope, no way on. Laying the concrete only on level ground (`paveSlope 0.35`) was tried: no visible difference from above or from the play camera (pixel diff: seams and shadows only), so it was not kept. |
| 11 | Zeelich (2371.7, −6.8) | GAP 0.4 m | (after #8) the scan saw the new arcade flags stop 0.1 m outside the plaza's own paving, under the kerb ring | The flags now reach 4 cm inside the ring's inner edge, 1 cm under the plaza's paving. It was never visible. |
| 12 | Desert, the School's bridge (3338–3340, −72.7) | broken stair | found when #6's water made the bridge the only crossing. **Probe on the base build:** from the forecourt down to the plaza he crosses; from the plaza up he stops at x 3339.0. The two steps stood 1 m apart, 0.52 m deep, with ground between them; he climbed the first, dropped into the gap and met the second 0.68 m up. | **Fixed** (`desertold.js`): five touching steps, six rises of about 0.17 m from the plaza to the deck. Their colliders overlap 0.14 m: the ground is read 5 cm inside a brick's edge, so bricks that only touch left a crack he fell into (a first try with two 1 m steps failed on that crack). |

Not changed:
- The harbour, Twinsen's hair, NPC routes (`town.js` STREETS, `world.js` PATHS: untouched).
- Terrain heights in Citadel and Zeelich.

## Reached ends, reviewed by eye (play-camera picture each)
| Area, at | Reaches | Decision |
|---|---|---|
| Citadel (−31.6, −49.3) | the station's door and walls | ok |
| Citadel (−23.8, −43.4) | the station's forecourt: its parapet and rail; its east side on the lawn | ok (an area before a door, not a way) |
| Citadel (−32.7, −35.2) | the climb's stone stair | ok |
| Citadel (−32.7, 41.8) | the spaceport footbridge, leaving from its side (#5) | ok |
| Citadel (−73.7, −28.4) | the promenade's north end at the rock and the pipe | ok |
| Citadel (−67.4, −4.2) | the promenade's 20-step flight | ok |
| Citadel (−73.7, 18.8) | the promenade's south end, closed by its rail at the wall's end | ok (a viewpoint on the wall) |
| Citadel (−109.7, 53.6) | the quay's end at the harbour wall's drop | ok |
| Desert (3306.6, 4.4) | the pier | ok |
| Desert (3334.3, −76.4) | the School's walls and now the channel's water | ok |
| Otringal (1872, 1823), (1887, 1825) | the square's edge at the rock's drop (a 0.34 m face) | ok |
| Zeelich (2350.5, −0.1) | the street's west end at the cliff over the clouds | ok |
| Zeelich (2436.0, −0.1) | the drill platform's gate | ok |
| Zeelich (2412.3, 9.1) | the depot's gate | ok |
| Ballastra (2996.4, −2990.6), (3004.7, −2988.1) | piers and a stair over the water | ok |

## Counts (same scan, same build except the fixes)
| Run | Strip ends | Gap rays (open) | Faults | Accepted as true ends | Isle WA-11 / deck ground left out (grid points) |
|---|---|---|---|---|---|
| before (`4deddff5`'s world, strict scan) | 24 | 753 (342) | **16**: 6 END, 10 GAP. FAIL | 0 | 1250 |
| after (this branch) | 18 | 452 (63) | **0**: PASS | 1 (Under Celebration's yard rim, #10) | 1282 |

- Under P135's own rules the same build showed 8 findings, and all 8 were accepted.
- The strict rule found 16. Of these:
  - 12 were fixed: #1 (one END and one GAP), #2–#3 (5 GAPs), #4, #6 (2 GAPs), #7 and #8.
  - 2 were true ends: #5, which the scan now recognises (the bridge's deck), and #10, which is on the known list.
  - 2 were a pad under a deck island, never seen (#9).
- The fix for #8 led to #11, which was also fixed.
- Of the 18 ends that remain:
  - 17 reach a door, a wall, a stair, a face, a deck or the water.
  - The 18th is #10.
  - Each one was looked at in its play-camera picture (table above).

## What the scan cannot see, and was looked at by eye instead
- **Ballastra's Arch District and Water Gardens.** Stone masses over water; the `stone` texture is shared with walls.
  Inspected from above (`captures/paths-136/plans.png` has the Float Harbor only). Every walk is masonry over water
  (quays, piers, stairs, terraces); none ends in open ground.
- **The Hamalayi's trodden ways.** Earth, not paving. The only paving there is Lhar's square and the monastery yard
  (P135 #4, #5); both are whole.
- **Paving built from other textures.** Citadel's spaceport is a plank deck on the water, reached by the footbridge.
  Also looked at from above: the fort's yard (inside its walls), the lighthouse islet, and the isles' stone plinths
  and steps. None of this paving ends in open ground.
- **Citadel outside the town.** The lighthouse path, Twinsen's house and the cliffs have no paving, only trodden
  earth.
- **Not checked:** the expansion's other districts and rooms, and every interior. These are not outdoor paving.
- **Rounded street ends near other paving** (the kind of #1b). The scan's gap rays fan out from a rounded end and do
  not cluster, so the scan misses these. Every street that meets the square's ring was checked from above
  (`ends.png`). The others in the town meet at T-junctions, flush (`world.js` GRID_RECTS).
- **Gaps closed by a wall or a deck** (final scan, `CLOSED GAP`). All three were looked at from above (`ends.png`):
  - (−27.3, −52.2) and (−27.2, −50.1): the station's wall, between its forecourt and the fort's yard. True.
  - (−72.4, −4.2): the promenade's 20-step flight. True.
- **The isles' WA-11 bare patches. Not judged; a question for the user** (`captures/paths-136/isle-patches.png`).
  - On Otringal and the Platform these patches are drawn with the island's paving: lavender flags, grey concrete.
  - They are noise blobs on the rock and turf. From the play camera some read as paving that ends raggedly in the
    grass or the rock.
  - Grid points left out: Otringal 909, the Platform 267, Under Celebration 74, the Lift Dock 25 (under its decks),
    Celebration 7.
  - Changing them is a big visual decision for every isle, so it was not made here.
  - **The isles are covered for their designed paving only.**

## Visible changes (for the user's pick)
1. Citadel: the paved forecourt south of the square, with kerbs on its west and south edges. The signpost's arrows
   are turned toward the east street.
2. Citadel: the west street's foot reaches the ring.
3. Citadel: the dirt north of the square is paved.
   - One tree is gone: the collider dump before and after differs by one trunk, at (−38, −12).
   - The kerbs changed: 660 → 616 stones, following the new edges.
4. Citadel: the west street's 4 m stub past the south cross street is gone. **Own commit `c1a59f78`** (P112's free end).
5. Desert Island: water in the School's channel under the arched bridge. It is crossed on the bridge, as built.
   **Probe** (Automated runtime): walking into it from the plaza, he stops at its edge (x 3337.2, feet 0.34 m under
   the waterline, as on a beach), and his life is unchanged (10 → 10).
5b. Desert Island: the bridge's stair has five steps instead of two (#12). **Probe:** plaza → forecourt over the
    bridge, and forecourt → plaza, both pass.
6. Kesh: its plaza's paving runs whole. No dirt band or bare tongue crosses it.
7. Zeelich: the council house's arcade flags reach the plaza's ring.

Unchanged:
- The colliders and instanced placements in Citadel, Desert Island, Zeelich and Under Celebration, apart from the
  tree and the kerbs above. Each was dumped and compared before and after.
- Hidden scatter (bushes, grass) is filtered by scale, which the dump does not record. The before and after pictures
  show no other plant gone or come back.
- The harbour.
- NPC routes: `town.js` STREETS and `world.js` PATHS are untouched.
- Twinsen's hair.

## Tests (automated runtime only, SwiftShader, SERVE=1, once each)
- `tests/path-ends.mjs` (strict), every area:
  - before: FAIL (16).
  - after: **PASS**, 0 open, run with Under Celebration's trial change in place.
  - When that change was reverted, Under Celebration was run again alone (`ONLY=isle_undergas`): **PASS**, its end on
    the known list.
- `tests/path-ends.mjs`: a last full run with the closed-gap listing, `SHOTS=0`. **PASS**, 1 accepted (#10), 3 closed
  gaps listed (above).
- `tests/walkers.mjs`: **PASS 37/37**.
- `tests/worldfit.mjs` with `AREAS=desert`, after #12's stair: **PASS**. The desert's z-fight scan finds 29 visible
  candidates (27 before), all under 0.15 m².
  - Of the new ones, two are the stair's side faces, coplanar with its side walls' outer faces at z ±1.30 m, about
    0.1 m² each.
  - They are listed, not judged, and were not changed.
- `tests/worldfit.mjs`: **PASS**, functional 1/1, visual 8/8.
  - (3) z-fighting: 0 visible; 112 small ones are listed, unjudged.
  - The desert's fit notes (the pool mask, Kesh's cabins and others) are listed by the test as before; none FAILs.
  - The kernel reported a process killed for memory during this run. The verdict printed in full.

## Pictures
- `captures/paths-136/sheet.png`: before and after. The user's spot comes first.
- `captures/paths-136/plans.png`: the final plan of each area.
- `captures/paths-136/ends.png`: every remaining end from the play camera, the closed gaps, the ring's junctions, and
  the School's new stair.
- `captures/paths-136/isle-patches.png`: question 5.
- The play-camera picture of every end and gap, before and after, is in the session's scratchpad
  (`paths136/{before,after,final}`). Those are not committed.

## Revert handles (each change on its own)
| Change | Where | To revert | Then add to `paths-136-known.json` |
|---|---|---|---|
| #1 forecourt | `world.js` GRID_STREETS `[-41.75, 7.4, -35.0, 7.4, 7.7, { ea: 'square' }]` | delete the line | (−44.8, 10.9) and (−36.4, 6.7) |
| #1 the arrows | `citydress.js` `TO.forecourt` in the square's `post(...)` | back to `TO.lane` | — |
| #1b foot | `world.js` GRID_STREETS[1] x1 −45.0 | back to −51.4 | — (not flagged by the scan) |
| #2–#3 pockets | `world.js` the two lines after the north street | delete them | the five GAPs in #2–#3 |
| #4 west street | commit `c1a59f78` | `git revert c1a59f78` | (−58.9, 58.3) |
| #6 water | `desert.js` the `rillAt` term in the pit lift | delete the term | (3337.4, −75.4), (3337.4, −70) |
| #7 Kesh | `desert.js` splatFn, the two `(1 - pv)` factors | delete them | (3355.2, −7.6) |
| #8 Zeelich | `zeelich.js` the `for (const h of HOUSES)` apron loop in buildPaths | delete it | (2374.5, −8.6) |
| #12 stair | `desertold.js` the five-step loop | back to the two steps | — (a broken stair, not a path end) |

## Questions for the user
1. Keep the forecourt by the signpost (#1), with the arrows turned to the east street? Or should the lane instead go
   on south through the block to the cross street? The south house stands in its old line, so it would have to pass
   east of the house, beside the east street.
2. Keep the west street's corner (#4, commit `c1a59f78`)? It changes P112's free end.
3. Water in the School's channel (#6): yes? It had been dry since AUDIT-FIX on 17.11, probably by accident.
4. Under Celebration (#10): is the yard's rim against the rock ridge a true end, or a fault? P135 got this kind of
   call wrong. A level-ground cut made no visible difference; a real fix would redraw the yard's edge.
5. The isles' WA-11 bare patches (`isle-patches.png`): should those drawn as paving (Otringal, the Platform) become
   bare rock or earth, or have clean edges? Not changed.
